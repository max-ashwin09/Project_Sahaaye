/**
 * Firebase Cloud Functions for Sahaaye Community Relief Platform
 * 
 * Features:
 * 1. analyzeNeedPhoto - AI Vision auto-fill using Gemini 1.5 Flash
 * 2. onNeedCreated - Firestore trigger: 5km geohash query + FCM push notifications + in-app notification doc
 * 3. onNeedStatusChanged - Firestore trigger: Notification to reporter on status progress
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const geofire = require('geofire-common');

admin.initializeApp();
const db = admin.firestore();

// ─── 1. AI Photo Auto-Fill Cloud Function (Callable) ───────────────────────────
exports.analyzeNeedPhoto = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to analyze need photos.');
  }

  const { base64Image, mimeType = 'image/jpeg' } = data;
  if (!base64Image) {
    throw new functions.https.HttpsError('invalid-argument', 'Image data is required.');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key;
  if (!geminiApiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured in Cloud Functions environment.');
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a humanitarian seva assistant for the SAHAAYE emergency community relief platform.
Analyze this photo showing a community need or disaster relief situation.

CRITICAL SAFETY & PRIVACY RULES:
1. Do NOT identify, name, or describe the personal appearance of any individuals in the photo.
2. Focus exclusively on the humanitarian condition, required supplies, and community need.
3. Return STRICTLY valid JSON with no markdown formatting and no code fences, matching this schema exactly:
{
  "title": "Clear concise summary of the need (max 60 characters)",
  "category": "Food" | "Medical" | "Education" | "Shelter" | "Elderly" | "Water" | "Others",
  "urgency": "Normal" | "Urgent" | "Critical",
  "description": "Factual description of the situation, specific items or aid required, and recommendations for volunteers",
  "peopleAffected": 1
}`;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      success: true,
      suggestion: parsed,
    };
  } catch (err) {
    console.error('AI Photo analysis error:', err);
    throw new functions.https.HttpsError('internal', err.message || 'Error executing AI vision analysis');
  }
});

// ─── 2. On New Need Created -> Notify Volunteers within 5km + FCM ──────────────
exports.onNeedCreated = functions.firestore
  .document('needs/{needId}')
  .onCreate(async (snap, context) => {
    const need = snap.data();
    const needId = context.params.needId;

    if (!need.exactLocation || typeof need.exactLocation.lat !== 'number') {
      return null;
    }

    const center = [need.exactLocation.lat, need.exactLocation.lng];
    const radiusInM = 5 * 1000; // 5 km radius

    // Each query requires a geohash range
    const bounds = geofire.geohashQueryBounds(center, radiusInM);
    const promises = [];

    for (const b of bounds) {
      const q = db
        .collection('users')
        .orderBy('savedLocation.geohash')
        .startAt(b[0])
        .endAt(b[1]);
      promises.push(q.get());
    }

    const snapshots = await Promise.all(promises);
    const nearbyTokens = new Set();
    const inAppBatch = db.batch();

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const user = doc.data();
        if (user.savedLocation) {
          const lat = user.savedLocation.lat;
          const lng = user.savedLocation.lng;
          const distanceInKm = geofire.distanceBetween([lat, lng], center);

          if (distanceInKm <= 5 && doc.id !== need.reporterId) {
            if (user.fcmToken) {
              nearbyTokens.add(user.fcmToken);
            }

            // Create in-app notification document (feeds the notification badge)
            const notifRef = db.collection('notifications').doc();
            inAppBatch.set(notifRef, {
              userId: doc.id,
              needId: needId,
              type: 'NEW_NEARBY_NEED',
              title: `New ${need.urgency} Need: ${need.category}`,
              message: `${need.title} was reported ~${distanceInKm.toFixed(1)} km from your location.`,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }
    }

    await inAppBatch.commit();

    // Send FCM Push Notifications to nearby volunteers
    if (nearbyTokens.size > 0) {
      const tokenList = Array.from(nearbyTokens);
      const payload = {
        notification: {
          title: `🚨 ${need.urgency === 'Critical' ? 'Critical Emergency' : 'New Need Near You'}: ${need.category}`,
          body: `${need.title} reported near your area. Tap to view & offer help.`,
        },
        data: {
          needId: needId,
          type: 'NEW_NEED',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      };

      try {
        await admin.messaging().sendToDevice(tokenList, payload);
      } catch (fcmErr) {
        console.warn('FCM delivery note:', fcmErr);
      }
    }

    return null;
  });

// ─── 3. On Need Status Change -> Notify Reporter ──────────────────────────────
exports.onNeedStatusChanged = functions.firestore
  .document('needs/{needId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const needId = context.params.needId;

    if (before.status === after.status) return null;

    // Append to statusHistory if not already updated
    const now = new Date().toISOString();
    const newHistoryEntry = {
      status: after.status,
      timestamp: now,
      note: `Status updated to ${after.status}`,
    };

    // If reporter exists and is not anonymous, notify them
    if (after.reporterId && !after.isAnonymous) {
      await db.collection('notifications').add({
        userId: after.reporterId,
        needId: needId,
        type: 'NEED_STATUS_CHANGED',
        title: `Seva Status Update: ${after.status}`,
        message: `Your reported need "${after.title}" has moved to status: ${after.status}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send FCM to reporter if token is available
      const reporterDoc = await db.collection('users').doc(after.reporterId).get();
      const reporterData = reporterDoc.data();
      if (reporterData?.fcmToken) {
        try {
          await admin.messaging().sendToDevice(reporterData.fcmToken, {
            notification: {
              title: `Seva Progress: ${after.status}`,
              body: `Your reported need "${after.title}" is now: ${after.status}`,
            },
            data: { needId },
          });
        } catch (err) {
          console.warn('FCM to reporter error:', err);
        }
      }
    }

    return null;
  });
