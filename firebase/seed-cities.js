/**
 * SAHAAYE - Firestore Cities Seed Script
 * 
 * Seeds the initial popular Indian cities with geographical coordinates,
 * geohashes (geofire-common), launch statuses, and initial open needs counts.
 * 
 * Usage:
 *   node firebase/seed-cities.js
 */

const admin = require('firebase-admin');
const { geohashForLocation } = require('geofire-common');

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS or default credentials)
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log('✅ Firebase Admin initialized with application default credentials.');
  } catch (err) {
    console.warn('⚠️ Default credentials not found. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.');
  }
}

const db = admin.firestore();

const SEED_CITIES = [
  {
    id: 'indore',
    name: 'Indore',
    state: 'Madhya Pradesh',
    lat: 22.7196,
    lng: 75.8577,
    active: true,
    openNeedsCount: 28,
  },
  {
    id: 'bhopal',
    name: 'Bhopal',
    state: 'Madhya Pradesh',
    lat: 23.2599,
    lng: 77.4126,
    active: true,
    openNeedsCount: 14,
  },
  {
    id: 'delhi',
    name: 'Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lng: 77.209,
    active: true,
    openNeedsCount: 42,
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.076,
    lng: 72.8777,
    active: true,
    openNeedsCount: 36,
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9124,
    lng: 75.7873,
    active: true,
    openNeedsCount: 19,
  },
  {
    id: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    lat: 18.5204,
    lng: 73.8567,
    active: true,
    openNeedsCount: 21,
  },
  {
    id: 'ahmedabad',
    name: 'Ahmedabad',
    state: 'Gujarat',
    lat: 23.0225,
    lng: 72.5714,
    active: true,
    openNeedsCount: 16,
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.8467,
    lng: 80.9462,
    active: false, // "Coming soon" city demo
    openNeedsCount: 0,
  },
];

async function seedCities() {
  console.log('🌱 Starting cities collection seed in Firestore...');
  const batch = db.batch();

  for (const city of SEED_CITIES) {
    const docRef = db.collection('cities').doc(city.id);
    const geohash = geohashForLocation([city.lat, city.lng]);

    batch.set(
      docRef,
      {
        name: city.name,
        state: city.state,
        lat: city.lat,
        lng: city.lng,
        geohash,
        active: city.active,
        openNeedsCount: city.openNeedsCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`  📍 Prepared: ${city.name}, ${city.state} (geohash: ${geohash}, active: ${city.active})`);
  }

  await batch.commit();
  console.log('✅ All cities seeded successfully into Firestore collection "cities"!');
  process.exit(0);
}

if (require.main === module) {
  seedCities().catch((err) => {
    console.error('❌ Failed to seed cities:', err);
    process.exit(1);
  });
}

module.exports = { seedCities, SEED_CITIES };
