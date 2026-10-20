import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { dbPool } from '../../config/database';
import { uploadMiddleware, validateMagicBytes } from '../../middleware/upload';

export const needsRouter = Router();

// In-memory fallback cache for development/offline mode when PostgreSQL is initializing
interface ReportedNeed {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  latitude: number;
  longitude: number;
  location: string;
  imageUrl?: string | null;
  status: string;
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
    location: 'Vijay Nagar, Indore',
    status: 'OPEN',
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
    location: 'Palasia, Indore',
    status: 'OPEN',
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
    location: 'Scheme 54, Indore',
    status: 'OPEN',
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
    location: 'Annapurna Road, Indore',
    status: 'OPEN',
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
    location: 'Rajwada, Indore',
    status: 'OPEN',
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

// Ensure local storage directory exists
const getStorageDir = (): string => {
  const baseStorage = path.resolve(process.env.STORAGE_LOCAL_PATH || './storage');
  const needsDir = path.join(baseStorage, 'needs');
  if (!fs.existsSync(needsDir)) {
    fs.mkdirSync(needsDir, { recursive: true });
  }
  return needsDir;
};

// Calculate Haversine distance in kilometers
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * POST /api/v1/needs
 * Submit / report a community need with geo-stamped photo and GPS coordinates.
 * Accepts multipart/form-data (photo file + fields) or JSON.
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
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const uploadedFile =
        files?.photo?.[0] || files?.image?.[0] || files?.file?.[0] || (req.file as Express.Multer.File | undefined);

      const title = (req.body.title || '').trim();
      const description = (req.body.description || '').trim();
      const category = (req.body.category || 'General').trim();
      const urgency = (req.body.urgency || 'Normal').trim();
      const location = (req.body.location || 'Unknown Location').trim();

      const latitude = parseFloat(req.body.latitude);
      const longitude = parseFloat(req.body.longitude);
      const isMinorInvolved =
        req.body.isMinorInvolved === true ||
        req.body.isMinorInvolved === 'true' ||
        req.body.isMinorInvolved === '1';

      if (!title || title.length < 3) {
        return res.status(400).json({ error: 'Title is required (minimum 3 characters)' });
      }

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Valid GPS latitude and longitude coordinates are required' });
      }

      let imageUrl: string | null = req.body.imageUrl || null;

      // If a file was uploaded, save it into the storage directory
      if (uploadedFile && uploadedFile.buffer) {
        const needsDir = getStorageDir();
        const ext = path.extname(uploadedFile.originalname) || '.jpg';
        const uniqueFileName = `need_${crypto.randomUUID()}_${Date.now()}${ext}`;
        const targetPath = path.join(needsDir, uniqueFileName);

        fs.writeFileSync(targetPath, uploadedFile.buffer);
        imageUrl = `/storage/needs/${uniqueFileName}`;
      }

      const needId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const newNeed: ReportedNeed = {
        id: needId,
        title,
        description,
        category,
        urgency,
        latitude,
        longitude,
        location,
        imageUrl,
        status: 'OPEN',
        isMinorInvolved,
        createdAt,
      };

      // Attempt to save to PostgreSQL database
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
            'OPEN',
            isMinorInvolved,
          ]
        );
      } catch (dbErr: any) {
        console.warn('PostgreSQL insert note (running with fallback store):', dbErr.message);
      }

      // Always save to fallback memory store & disk
      inMemoryNeedsStore.unshift(newNeed);
      saveNeedsToDisk(inMemoryNeedsStore);

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

    let allNeeds: ReportedNeed[] = [];

    // Try reading from PostgreSQL
    try {
      const result = await dbPool.query(
        `SELECT id, title, description, category, urgency,
                latitude, longitude, location, image_url as "imageUrl",
                status, is_minor_involved as "isMinorInvolved", created_at as "createdAt"
         FROM needs
         WHERE status != 'FLAGGED'
         ORDER BY created_at DESC
         LIMIT 100`
      );
      if (result && result.rows.length > 0) {
        allNeeds = result.rows.map((row) => ({
          ...row,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
        }));
      }
    } catch {
      // Fallback to in-memory store
      allNeeds = [...inMemoryNeedsStore];
    }

    // Merge in-memory store if DB had fewer or none
    if (allNeeds.length === 0) {
      allNeeds = [...inMemoryNeedsStore];
    } else {
      // Ensure recently created in-memory items are included if DB didn't have them
      for (const item of inMemoryNeedsStore) {
        if (!allNeeds.some((n) => n.id === item.id)) {
          allNeeds.unshift(item);
        }
      }
    }

    // Filter by category if specified
    if (category && category !== 'All') {
      allNeeds = allNeeds.filter((n) => n.category.toLowerCase() === category.toLowerCase());
    }

    // Calculate distance and filter by radius if lat/lng are provided
    const formattedNeeds = allNeeds.map((need) => {
      let distanceKm = 0;
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        distanceKm = calculateDistanceKm(lat, lng, need.latitude, need.longitude);
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

    // Try database first
    try {
      const result = await dbPool.query(
        `SELECT id, title, description, category, urgency,
                latitude, longitude, location, image_url as "imageUrl",
                status, is_minor_involved as "isMinorInvolved", created_at as "createdAt"
         FROM needs
         WHERE id = $1`,
        [id]
      );
      if (result.rows.length > 0) {
        return res.status(200).json({
          success: true,
          need: result.rows[0],
        });
      }
    } catch {
      // Proceed to fallback store
    }

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
