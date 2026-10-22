import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';

export interface SahaayeLocation {
  city: string;
  state: string;
  area: string | null;
  lat: number;
  lng: number;
  geohash: string;
  radiusKm: number; // 2, 5, 10, 25, or 0 (0 = Whole city)
}

export const DEFAULT_LOCATION: SahaayeLocation = {
  city: 'Indore',
  state: 'Madhya Pradesh',
  area: null,
  lat: 22.7196,
  lng: 75.8577,
  geohash: 'tsjem52',
  radiusKm: 10,
};

/**
 * Calculates geohash for a given latitude and longitude
 */
export function computeGeohash(lat: number, lng: number): string {
  try {
    return geohashForLocation([lat, lng]);
  } catch (err) {
    console.warn('Geohash generation note:', err);
    return 'tsjem52';
  }
}

/**
 * Generates geohash query bounding boxes for a given center and radius (in meters)
 * Essential for Firestore range queries.
 */
export function getGeohashBounds(lat: number, lng: number, radiusKm: number) {
  const radiusInMeters = radiusKm <= 0 ? 50000 : radiusKm * 1000;
  return geohashQueryBounds([lat, lng], radiusInMeters);
}

/**
 * Calculate distance in Kilometers between two points
 */
export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  try {
    return Math.round(distanceBetween([lat1, lng1], [lat2, lng2]) * 10) / 10;
  } catch {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }
}

/**
 * Helper to shorten common state names for compact header display
 */
export function getShortState(stateName: string): string {
  const map: Record<string, string> = {
    'Madhya Pradesh': 'MP',
    'Uttar Pradesh': 'UP',
    'Delhi': 'DL',
    'Maharashtra': 'MH',
    'Rajasthan': 'RJ',
    'Gujarat': 'GJ',
    'Karnataka': 'KA',
    'Tamil Nadu': 'TN',
    'West Bengal': 'WB',
    'Punjab': 'PB',
    'Haryana': 'HR',
    'Bihar': 'BR',
    'Telangana': 'TS',
    'Andhra Pradesh': 'AP',
    'Kerala': 'KL',
    'Goa': 'GA',
  };
  return map[stateName] || stateName;
}
