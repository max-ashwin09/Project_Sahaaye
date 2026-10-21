import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { dbPool } from '../../config/database';
import { uploadMiddleware } from '../../middleware/upload';

export const needsRouter = Router();

// In-memory fallback cache for development/offline mode when PostgreSQL is initializing
export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface ReportedNeed {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  publicLatitude?: number;
  publicLongitude?: number;
  location: string;
  imageUrl?: string | null;
  status: string;
  statusHistory: StatusHistoryEntry[];
  supporters: string[];
  reporterId?: string;
  isAnonymous?: boolean;
  peopleAffected?: number;
  aiGenerated?: boolean;
  locationMismatch?: boolean;
  isMinorInvolved: boolean;
  createdAt: string;
}

const DB_FILE_PATH = path.join(path.resolve(process.env.STORAGE_LOCAL_PATH || './storage'), 'needs_database.json');

const loadNeedsFromDisk = (): ReportedNeed[] => {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading needs_database.json:', err);
  }
  return [];
};

const saveNeedsToDisk = (needs: ReportedNeed[]) => {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(needs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving needs_database.json:', err);
  }
};

const INITIAL_SEEDS: ReportedNeed[] = [
  {
    id: 'n1',
    title: 'Food Support for Family',
    description: 'Family of 4 needs basic ration assistance (flour, rice, pulses) for this week.',
    category: 'Food',
    urgency: 'High',
    latitude: 22.7533,
    longitude: 75.8937,
    accuracy: 12,
    location: 'Vijay Nagar, Indore',
    status: 'Reported',
    statusHistory: [{ status: 'Reported', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), note: 'Initial report submitted' }],
    supporters: [],
    isMinorInvolved: false,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'n2',
    title: 'Medical Help Required',
    description: 'Urgent prescription medicines required for elderly patient with diabetes.',
    category: 'Medical',
    urgency: 'Critical',
    latitude: 22.7244,
    longitude: 75.8839,
    accuracy: 15,
    location: 'Palasia, Indore',
    status: 'Verified',
    statusHistory: [
      { status: 'Reported', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
      { status: 'Verified', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), note: 'Verified by local seva volunteer' },
    ],
    supporters: [],
    isMinorInvolved: false,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'n3',
    title: 'School Supplies Needed',
    description: 'Notebooks, stationery, and backpacks needed for 12 underprivileged primary school students.',
    category: 'Education',
    urgency: 'Normal',
    latitude: 22.7570,
    longitude: 75.8880,
    accuracy: 8,
    location: 'Scheme 54, Indore',
    status: 'Volunteer Assigned',
    statusHistory: [
      { status: 'Reported', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      { status: 'Volunteer Assigned', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), note: 'Volunteer assigned for distribution' },
    ],
    supporters: [],
    isMinorInvolved: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n4',
    title: 'Elderly Care Support',
    description: 'Volunteer companionship and grocery delivery assistance needed for senior citizen living alone.',
    category: 'Elderly',
    urgency: 'Normal',
    latitude: 22.6980,
    longitude: 75.8350,
    accuracy: 20,
    location: 'Annapurna Road, Indore',
    status: 'In Progress',
    statusHistory: [
      { status: 'Reported', timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString() },
      { status: 'In Progress', timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(), note: 'Volunteer on the way' },
    ],
    supporters: [],
    isMinorInvolved: false,
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
  {
    id: 'n5',
    title: 'Blankets & Warm Clothes',
    description: 'Warm blankets and sweaters needed for winter night shelter distribution.',
    category: 'Shelter',
    urgency: 'Normal',
    latitude: 22.7196,
    longitude: 75.8577,
    accuracy: 10,
    location: 'Rajwada, Indore',
    status: 'Fulfilled',
    statusHistory: [
      { status: 'Reported', timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString() },
      { status: 'Fulfilled', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), note: 'Distributed 20 blankets' },
    ],
    supporters: [],
    isMinorInvolved: false,
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  }
];

// Initialize store from disk or seed data
const loaded = loadNeedsFromDisk();
const inMemoryNeedsStore: ReportedNeed[] = loaded.length > 0 ? loaded : [...INITIAL_SEEDS];
if (loaded.length === 0) {
  saveNeedsToDisk(inMemoryNeedsStore);
}

// In-memory rate limiting map: userId/ip -> array of submit timestamps
const submissionRateLimits = new Map<string, number[]>();

// In-memory notifications store
export interface InAppNotification {
  id: string;
  userId?: string;
  needId: string;
  type: 'NEW_NEARBY_NEED' | 'NEED_STATUS_CHANGED' | 'NEED_SUPPORTED';
  title: string;
  message: string;
  distanceKm?: number;
  read: boolean;
  createdAt: string;
}
export const inAppNotifications: InAppNotification[] = [];

// Ensure local storage directory exists
const getStorageDir = (): string => {
  const baseStorage = path.resolve(process.env.STORAGE_LOCAL_PATH || './storage');
  const needsDir = path.join(baseStorage, 'needs');
  if (!fs.existsSync(needsDir)) {
    fs.mkdirSync(needsDir, { recursive: true });
  }
  return needsDir;
};

// Calculate Haversine distance in meters
const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * POST /api/v1/needs/ai-analyze
 * Calls Gemini Vision LLM to analyze uploaded photo and suggest form fields.
 */
needsRouter.post(
  '/ai-analyze',
  uploadMiddleware.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const uploadedFile = files?.photo?.[0] || files?.image?.[0] || (req.file as Express.Multer.File | undefined);

      if (!uploadedFile || !uploadedFile.buffer) {
        return res.status(400).json({ error: 'Please upload an image file for AI analysis' });
      }

      const mimeType = uploadedFile.mimetype || 'image/jpeg';
      const base64Data = uploadedFile.buffer.toString('base64');
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (geminiApiKey) {
        try {
          const prompt = `You are a humanitarian seva assistant for the SAHAAYE emergency community relief platform.
Analyze this photo showing a community need or relief situation.
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

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 600,
              },
            }),
          });

          if (response.ok) {
            const resultData: any = await response.json();
            const rawText = resultData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            return res.status(200).json({
              success: true,
              suggestion: {
                title: parsed.title || 'Community Need Observed',
                category: parsed.category || 'Food',
                urgency: parsed.urgency || 'Normal',
                description: parsed.description || '',
                peopleAffected: parsed.peopleAffected || 1,
              },
              source: 'gemini-vision',
            });
          }
        } catch (apiErr: any) {
          console.warn('Gemini vision API call error, falling back to smart heuristic:', apiErr.message);
        }
      }

      // Smart heuristic fallback if API key is not configured or offline
      const filename = (uploadedFile.originalname || '').toLowerCase();
      let detectedCategory = 'Food';
      let detectedUrgency = 'Urgent';
      let detectedTitle = 'Essential Food & Ration Support Needed';
      let detectedDesc = 'Dry ration packs, cooking supplies, and clean drinking water urgently required for local family.';
      let peopleAffected = 4;

      if (filename.includes('medic') || filename.includes('health') || filename.includes('pharma') || filename.includes('injury')) {
        detectedCategory = 'Medical';
        detectedUrgency = 'Critical';
        detectedTitle = 'Urgent First Aid & Prescription Medicines Needed';
        detectedDesc = 'Medical supplies and healthcare support needed for patient with urgent care requirement.';
        peopleAffected = 1;
      } else if (filename.includes('book') || filename.includes('school') || filename.includes('child')) {
        detectedCategory = 'Education';
        detectedUrgency = 'Normal';
        detectedTitle = 'Stationery & Study Materials for Primary Students';
        detectedDesc = 'Textbooks, notebooks, and writing materials needed for underprivileged school students.';
        peopleAffected = 8;
      } else if (filename.includes('shelter') || filename.includes('blanket') || filename.includes('cloth')) {
        detectedCategory = 'Shelter';
        detectedUrgency = 'Normal';
        detectedTitle = 'Warm Blankets and Emergency Shelter Kits';
        detectedDesc = 'Weather protection materials and clean blankets needed for temporary shelter residents.';
        peopleAffected = 5;
      } else if (filename.includes('water') || filename.includes('flood')) {
        detectedCategory = 'Water';
        detectedUrgency = 'Urgent';
        detectedTitle = 'Clean Drinking Water Cans Required';
        detectedDesc = 'Potable drinking water supply interrupted; safe water containers needed immediately.';
        peopleAffected = 12;
      }

      return res.status(200).json({
        success: true,
        suggestion: {
          title: detectedTitle,
          category: detectedCategory,
          urgency: detectedUrgency,
          description: detectedDesc,
          peopleAffected,
        },
        source: 'smart-heuristic',
        note: 'To use live Gemini Vision, set GEMINI_API_KEY in your .env file.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error processing AI vision analysis' });
    }
  }
);

/**
 * GET /api/v1/needs/duplicates
 * Query for open needs within 200m in same category created in last 7 days.
 */
needsRouter.get('/duplicates', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const category = (req.query.category as string || '').trim();
    const radiusMeters = parseFloat(req.query.radiusMeters as string) || 200;
    const days = parseInt(req.query.days as string, 10) || 7;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters required' });
    }

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const duplicates = inMemoryNeedsStore
      .filter((n) => {
        if (n.status === 'Fulfilled' || n.status === 'FLAGGED') return false;
        if (category && n.category.toLowerCase() !== category.toLowerCase()) return false;
        const createdTs = new Date(n.createdAt).getTime();
        if (createdTs < cutoffTime) return false;

        const distanceM = calculateDistanceMeters(lat, lng, n.latitude, n.longitude);
        return distanceM <= radiusMeters;
      })
      .map((n) => ({
        ...n,
        distanceMeters: calculateDistanceMeters(lat, lng, n.latitude, n.longitude),
      }));

    return res.status(200).json({
      success: true,
      count: duplicates.length,
      duplicates,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error querying duplicate needs' });
  }
});

/**
 * POST /api/v1/needs/:id/support
 * Add user as a supporter to an existing need instead of duplicating.
 */
needsRouter.post('/:id/support', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.body.userId || req.ip || 'anonymous_seva_user').toString();

    const need = inMemoryNeedsStore.find((n) => n.id === id);
    if (!need) {
      return res.status(404).json({ error: 'Need not found' });
    }

    if (!need.supporters) need.supporters = [];
    if (!need.supporters.includes(userId)) {
      need.supporters.push(userId);
      saveNeedsToDisk(inMemoryNeedsStore);
    }

    // Add in-app notification
    inAppNotifications.unshift({
      id: crypto.randomUUID(),
      needId: need.id,
      type: 'NEED_SUPPORTED',
      title: 'New Community Supporter!',
      message: `A nearby neighbor joined as a supporter for "${need.title}"`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: 'You have joined as a supporter for this need.',
      need,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error supporting need' });
  }
});

/**
 * POST /api/v1/needs
 * Submit / report a community need with geo-stamped photo, GPS, and full metadata.
 */
needsRouter.post(
  '/',
  uploadMiddleware.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rateLimitKey = (req.body.reporterId || req.ip || 'default').toString();
      const now = Date.now();
      const windowMs = 24 * 60 * 60 * 1000; // 24 hours

      const userSubmissions = (submissionRateLimits.get(rateLimitKey) || []).filter((ts) => now - ts < windowMs);
      if (userSubmissions.length >= 5) {
        return res.status(429).json({
          error: 'Rate limit reached: You can submit a maximum of 5 community reports per 24 hours. Thank you for your seva!',
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const uploadedFile =
        files?.photo?.[0] || files?.image?.[0] || files?.file?.[0] || (req.file as Express.Multer.File | undefined);

      const title = (req.body.title || '').trim();
      const description = (req.body.description || '').trim();
      const category = (req.body.category || 'Food').trim();
      const urgency = (req.body.urgency || 'Normal').trim();
      const location = (req.body.location || 'Indore, Madhya Pradesh').trim();

      const latitude = parseFloat(req.body.latitude);
      const longitude = parseFloat(req.body.longitude);
      const accuracy = req.body.accuracy ? parseFloat(req.body.accuracy) : 10;
      const publicLatitude = req.body.publicLatitude ? parseFloat(req.body.publicLatitude) : latitude;
      const publicLongitude = req.body.publicLongitude ? parseFloat(req.body.publicLongitude) : longitude;
      const peopleAffected = req.body.peopleAffected ? parseInt(req.body.peopleAffected, 10) : 1;
      const isAnonymous = req.body.isAnonymous === 'true' || req.body.isAnonymous === true;
      const aiGenerated = req.body.aiGenerated === 'true' || req.body.aiGenerated === true;
      const locationMismatch = req.body.locationMismatch === 'true' || req.body.locationMismatch === true;
      const reporterId = (req.body.reporterId || 'user_' + crypto.randomUUID().slice(0, 8)).toString();

      if (!title || title.length < 3) {
        return res.status(400).json({ error: 'Title is required (minimum 3 characters)' });
      }

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Valid GPS latitude and longitude coordinates are required' });
      }

      let imageUrl: string | null = req.body.imageUrl || null;

      // Save photo to storage directory
      if (uploadedFile && uploadedFile.buffer) {
        const needsDir = getStorageDir();
        const ext = path.extname(uploadedFile.originalname) || '.jpg';
        const uniqueFileName = `need_${crypto.randomUUID()}_${Date.now()}${ext}`;
        const targetPath = path.join(needsDir, uniqueFileName);

        fs.writeFileSync(targetPath, uploadedFile.buffer);
        imageUrl = `/storage/needs/${uniqueFileName}`;
      }

      const needId = 'SHY-' + Math.floor(10000 + Math.random() * 90000);
      const createdAt = new Date().toISOString();

      const newNeed: ReportedNeed = {
        id: needId,
        title,
        description,
        category,
        urgency,
        latitude,
        longitude,
        accuracy,
        publicLatitude,
        publicLongitude,
        location,
        imageUrl,
        status: 'Reported',
        statusHistory: [
          {
            status: 'Reported',
            timestamp: createdAt,
            note: 'Need geo-verified and published to Sahaaye network',
            updatedBy: isAnonymous ? 'Anonymous Citizen' : reporterId,
          },
        ],
        supporters: [],
        reporterId: isAnonymous ? undefined : reporterId,
        isAnonymous,
        peopleAffected,
        aiGenerated,
        locationMismatch,
        isMinorInvolved: false,
        createdAt,
      };

      // Record rate limit
      userSubmissions.push(now);
      submissionRateLimits.set(rateLimitKey, userSubmissions);

      // Attempt PostgreSQL insert
      try {
        await dbPool.query(
          `INSERT INTO needs (
            id, title, description, category, urgency,
            latitude, longitude, location, image_url,
            status, is_minor_involved, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
          RETURNING *`,
          [
            needId,
            title,
            description,
            category,
            urgency,
            latitude,
            longitude,
            location,
            imageUrl,
            'Reported',
            false,
          ]
        );
      } catch (dbErr: any) {
        console.warn('PostgreSQL insert note (running with fallback store):', dbErr.message);
      }

      // Save to memory store and disk
      inMemoryNeedsStore.unshift(newNeed);
      saveNeedsToDisk(inMemoryNeedsStore);

      // Dispatch simulated in-app push notification for volunteers within 5km
      inAppNotifications.unshift({
        id: crypto.randomUUID(),
        needId: newNeed.id,
        type: 'NEW_NEARBY_NEED',
        title: `New ${newNeed.urgency} Need: ${newNeed.category}`,
        message: `${newNeed.title} reported near ${newNeed.location}.`,
        distanceKm: 1.2,
        read: false,
        createdAt: createdAt,
      });

      return res.status(201).json({
        success: true,
        message: 'Community need reported successfully',
        need: newNeed,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/needs
 * Fetch reported needs with optional distance / radius filtering
 */
needsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 50;
    const category = req.query.category as string | undefined;

    let allNeeds: ReportedNeed[] = [...inMemoryNeedsStore];

    // Filter by category if specified
    if (category && category !== 'All') {
      allNeeds = allNeeds.filter((n) => n.category.toLowerCase() === category.toLowerCase());
    }

    // Calculate distance and filter by radius if lat/lng are provided
    const formattedNeeds = allNeeds.map((need) => {
      let distanceKm = 0;
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        distanceKm = calculateDistanceMeters(lat, lng, need.latitude, need.longitude) / 1000;
        distanceKm = Math.round(distanceKm * 10) / 10;
      }
      return {
        ...need,
        distanceKm,
      };
    });

    const filtered =
      lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)
        ? formattedNeeds.filter((n) => n.distanceKm <= radiusKm)
        : formattedNeeds;

    return res.status(200).json({
      success: true,
      count: filtered.length,
      needs: filtered,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/needs/:id
 * Retrieve a specific need by ID
 */
needsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const memoryItem = inMemoryNeedsStore.find((n) => n.id === id);
    if (memoryItem) {
      return res.status(200).json({
        success: true,
        need: memoryItem,
      });
    }

    return res.status(404).json({ error: 'Need not found' });
  } catch (err) {
    next(err);
  }
});
