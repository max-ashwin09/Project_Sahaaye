import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const locationRouter = Router();

const storageDir = path.resolve(process.env.STORAGE_LOCAL_PATH || './storage');
const needsDbPath = path.join(storageDir, 'needs_database.json');
const waitlistDbPath = path.join(storageDir, 'city_waitlist.json');
const savedLocsDbPath = path.join(storageDir, 'saved_locations.json');

// Ensure db files exist
function ensureJsonFile(filePath: string, defaultData: any) {
  if (!fs.existsSync(filePath)) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    } catch {}
  }
}

ensureJsonFile(waitlistDbPath, []);
ensureJsonFile(savedLocsDbPath, {});

// Helper to count needs per city
function countOpenNeedsInCity(cityName: string): number {
  try {
    if (fs.existsSync(needsDbPath)) {
      const raw = fs.readFileSync(needsDbPath, 'utf-8');
      const needs = JSON.parse(raw);
      return needs.filter((n: any) =>
        (n.location && n.location.toLowerCase().includes(cityName.toLowerCase())) ||
        (n.city && n.city.toLowerCase() === cityName.toLowerCase())
      ).length;
    }
  } catch {}
  return 0;
}

// Initial Cities Catalog
const POPULAR_CITIES = [
  { id: 'indore', name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, geohash: 'tsjem52', active: true, baseCount: 28 },
  { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, geohash: 'tsphq6q', active: true, baseCount: 14 },
  { id: 'delhi', name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, geohash: 'ttnfv2u', active: true, baseCount: 42 },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, geohash: 'te7u818', active: true, baseCount: 36 },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, geohash: 'tsv5910', active: true, baseCount: 19 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, geohash: 'tek3y7q', active: true, baseCount: 21 },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, geohash: 'ts5enec', active: true, baseCount: 16 },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, geohash: 'tu9d151', active: false, baseCount: 0 },
];

/**
 * GET /api/v1/location/cities
 * Returns popular cities with live open needs count
 */
locationRouter.get('/cities', (_req: Request, res: Response) => {
  const cities = POPULAR_CITIES.map((c) => {
    const liveCount = countOpenNeedsInCity(c.name);
    return {
      ...c,
      openNeedsCount: c.active ? Math.max(c.baseCount, liveCount) : 0,
    };
  });

  return res.json({ success: true, cities });
});

/**
 * POST /api/v1/location/waitlist
 * Saves email for upcoming cities
 */
locationRouter.post('/waitlist', (req: Request, res: Response) => {
  const { city, state, email } = req.body;
  if (!email || !city) {
    return res.status(400).json({ error: 'City and email are required' });
  }

  try {
    const raw = fs.readFileSync(waitlistDbPath, 'utf-8');
    const waitlist = JSON.parse(raw);
    waitlist.push({
      id: `wl-${Date.now()}`,
      city,
      state,
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
    });
    fs.writeFileSync(waitlistDbPath, JSON.stringify(waitlist, null, 2), 'utf-8');
    return res.status(201).json({ success: true, message: 'Added to city launch waitlist' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Could not record waitlist entry' });
  }
});

/**
 * GET /api/v1/location/saved
 * Get saved locations
 */
locationRouter.get('/saved', (req: Request, res: Response) => {
  try {
    const raw = fs.readFileSync(savedLocsDbPath, 'utf-8');
    const data = JSON.parse(raw);
    const userId = (req as any).user?.id || 'guest_default';
    const saved = data[userId] || [];
    return res.json({ success: true, savedLocations: saved });
  } catch {
    return res.json({ success: true, savedLocations: [] });
  }
});

/**
 * POST /api/v1/location/saved
 * Add a saved location (max 5)
 */
locationRouter.post('/saved', (req: Request, res: Response) => {
  const item = req.body;
  if (!item || !item.label || !item.city) {
    return res.status(400).json({ error: 'Valid location item required' });
  }

  try {
    const raw = fs.readFileSync(savedLocsDbPath, 'utf-8');
    const data = JSON.parse(raw);
    const userId = (req as any).user?.id || 'guest_default';
    const userList = data[userId] || [];

    const updated = [item, ...userList.filter((x: any) => x.id !== item.id)].slice(0, 5);
    data[userId] = updated;
    fs.writeFileSync(savedLocsDbPath, JSON.stringify(data, null, 2), 'utf-8');

    return res.status(201).json({ success: true, savedLocations: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save location' });
  }
});

/**
 * DELETE /api/v1/location/saved/:id
 */
locationRouter.delete('/saved/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const raw = fs.readFileSync(savedLocsDbPath, 'utf-8');
    const data = JSON.parse(raw);
    const userId = (req as any).user?.id || 'guest_default';
    const userList = data[userId] || [];

    data[userId] = userList.filter((x: any) => x.id !== id);
    fs.writeFileSync(savedLocsDbPath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({ success: true, message: 'Deleted saved location' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete' });
  }
});

/**
 * PATCH /api/v1/location/saved/:id/notify
 */
locationRouter.patch('/saved/:id/notify', (req: Request, res: Response) => {
  const { id } = req.params;
  const { isNotificationArea } = req.body;
  try {
    const raw = fs.readFileSync(savedLocsDbPath, 'utf-8');
    const data = JSON.parse(raw);
    const userId = (req as any).user?.id || 'guest_default';
    const userList = data[userId] || [];

    data[userId] = userList.map((x: any) =>
      x.id === id ? { ...x, isNotificationArea: !!isNotificationArea } : x
    );
    fs.writeFileSync(savedLocsDbPath, JSON.stringify(data, null, 2), 'utf-8');

    return res.json({ success: true, message: 'Notification area updated' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update notification area' });
  }
});

/**
 * POST /api/v1/location/sync-user
 */
locationRouter.post('/sync-user', (req: Request, res: Response) => {
  // Can be used to sync users/{uid}.lastLocation
  return res.json({ success: true });
});
