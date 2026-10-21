import { SahaayeLocation, computeGeohash } from '../utils/geohash';

export interface AutocompleteResult {
  placeId: string;
  displayName: string;
  city: string;
  state: string;
  area: string | null;
  lat: number;
  lng: number;
}

// Popular areas lookup for key cities to provide instant neighbourhood selection
export const CITY_AREAS: Record<string, { name: string; lat: number; lng: number }[]> = {
  Indore: [
    { name: 'Vijay Nagar', lat: 22.7533, lng: 75.8937 },
    { name: 'Palasia', lat: 22.7244, lng: 75.8839 },
    { name: 'Rajwada', lat: 22.7186, lng: 75.8553 },
    { name: 'Bhawarkua', lat: 22.6926, lng: 75.8676 },
    { name: 'Annapurna Road', lat: 22.6974, lng: 75.8398 },
    { name: 'Scheme 54 / Meghdoot', lat: 22.7588, lng: 75.8893 },
    { name: 'Chappan Dukan', lat: 22.7238, lng: 75.8791 },
    { name: 'Rau', lat: 22.6318, lng: 75.8052 },
  ],
  Bhopal: [
    { name: 'MP Nagar', lat: 23.2332, lng: 77.4343 },
    { name: 'Arera Colony', lat: 23.2132, lng: 77.4332 },
    { name: 'Kolar Road', lat: 23.1843, lng: 77.4198 },
    { name: 'New Market', lat: 23.2384, lng: 77.4028 },
  ],
  Delhi: [
    { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
    { name: 'South Extension', lat: 28.5714, lng: 77.2212 },
    { name: 'Dwarka', lat: 28.5921, lng: 77.046 },
    { name: 'Rohini', lat: 28.7166, lng: 77.1189 },
  ],
  Mumbai: [
    { name: 'Andheri West', lat: 19.1363, lng: 72.8277 },
    { name: 'Bandra', lat: 19.0596, lng: 72.8295 },
    { name: 'Dadar', lat: 19.0178, lng: 72.8478 },
    { name: 'Borivali', lat: 19.2307, lng: 72.8567 },
  ],
  Jaipur: [
    { name: 'Malviya Nagar', lat: 26.8533, lng: 75.8053 },
    { name: 'Vaishali Nagar', lat: 26.9075, lng: 75.7396 },
    { name: 'Mansarovar', lat: 26.8644, lng: 75.7645 },
  ],
  Pune: [
    { name: 'Kothrud', lat: 18.5074, lng: 73.8077 },
    { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
    { name: 'Hinjawadi', lat: 18.5913, lng: 73.7389 },
  ],
  Ahmedabad: [
    { name: 'Navrangpura', lat: 23.0365, lng: 72.5611 },
    { name: 'Satellite', lat: 23.0305, lng: 72.5176 },
    { name: 'Bodakdev', lat: 23.0416, lng: 72.5085 },
  ],
};

/**
 * Autocomplete search for Indian cities and areas using OpenStreetMap Nominatim
 * Restricted to India (countrycodes=in)
 */
export async function searchLocationsNominatim(query: string): Promise<AutocompleteResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      cleanQuery
    )}&countrycodes=in&addressdetails=1&limit=6`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en,hi',
        'User-Agent': 'Sahaaye-Social-Seva-Platform/1.0',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.map((item: any) => {
      const addr = item.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        addr.state_district ||
        item.name;
      const state = addr.state || 'India';
      const area =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.road ||
        null;

      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      return {
        placeId: String(item.place_id || `${lat}_${lng}`),
        displayName: `${area ? `${area}, ` : ''}${city}, ${state}`,
        city: city || 'Unknown City',
        state,
        area,
        lat,
        lng,
      };
    });
  } catch (err) {
    console.warn('Nominatim search note:', err);
    return [];
  }
}

/**
 * Reverse geocode latitude and longitude to SahaayeLocation object
 */
export async function reverseGeocodeToLocation(
  lat: number,
  lng: number,
  radiusKm = 10
): Promise<SahaayeLocation> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en,hi',
        'User-Agent': 'Sahaaye-Social-Seva-Platform/1.0',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        addr.state_district ||
        'Indore';
      const state = addr.state || 'Madhya Pradesh';
      const area =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.road ||
        null;

      return {
        city,
        state,
        area,
        lat,
        lng,
        geohash: computeGeohash(lat, lng),
        radiusKm,
      };
    }
  } catch (err) {
    console.warn('Reverse geocode fallback applied:', err);
  }

  // Graceful fallback
  return {
    city: 'Indore',
    state: 'Madhya Pradesh',
    area: null,
    lat,
    lng,
    geohash: computeGeohash(lat, lng),
    radiusKm,
  };
}

export interface ResolvedGPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  state?: string;
  area?: string | null;
  source: 'gps_high' | 'gps_low' | 'ip_network';
}

/**
 * Robust Multi-tier Geolocation Resolver:
 * Tier 1: Hardware-accelerated Browser GPS (high accuracy, 4s timeout)
 * Tier 2: Low-accuracy Cellular / WiFi Browser Geolocation (5s timeout)
 * Tier 3: Fast IP-network Geolocation (geojs.io / ipwho.is) - guarantees connection even if browser GPS is blocked/unsupported!
 */
export async function detectCurrentLocation(): Promise<ResolvedGPSLocation> {
  // Tier 1: High accuracy browser geolocation
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: 0,
        });
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy) || 10,
        source: 'gps_high',
      };
    } catch {
      // Tier 2: Low-accuracy browser geolocation
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 60000,
          });
        });
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy) || 30,
          source: 'gps_low',
        };
      } catch {
        // Proceed to Tier 3 IP Geolocation
      }
    }
  }

  // Tier 3: IP-network Geolocation Fallback
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          latitude: lat,
          longitude: lng,
          accuracy: data.accuracy ? parseInt(data.accuracy, 10) : 50,
          city: data.city || undefined,
          state: data.region || undefined,
          source: 'ip_network',
        };
      }
    }
  } catch {}

  try {
    const res2 = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.success !== false && data2.latitude && data2.longitude) {
        return {
          latitude: parseFloat(data2.latitude),
          longitude: parseFloat(data2.longitude),
          accuracy: 50,
          city: data2.city || undefined,
          state: data2.region || undefined,
          source: 'ip_network',
        };
      }
    }
  } catch {}

  throw new Error('All GPS and IP location providers were unreachable.');
}
