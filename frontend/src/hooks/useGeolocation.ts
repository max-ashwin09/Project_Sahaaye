import { useState, useEffect, useCallback } from 'react';
import { detectCurrentLocation } from '../services/geocoding';

export interface LocationState {
  exactLat: number | null;
  exactLng: number | null;
  accuracyMeters: number | null;
  publicLat: number | null;
  publicLng: number | null;
  address: string;
  isLoading: boolean;
  error: string | null;
  isLowAccuracy: boolean;
  source: 'gps' | 'manual' | 'default';
}

/**
 * Computes randomized offset within ~250-300 meters for public map privacy
 */
export function generateApproximateLocation(
  lat: number,
  lng: number,
  radiusMeters: number = 280
): { lat: number; lng: number } {
  // 1 degree latitude ~ 111,320 meters
  const earthRadius = 6371000;
  // Random angle 0 to 2pi
  const angle = Math.random() * Math.PI * 2;
  // Random distance 100m to radiusMeters
  const distance = 100 + Math.random() * (radiusMeters - 100);

  const deltaLat = (distance * Math.cos(angle)) / 111320;
  const deltaLng = (distance * Math.sin(angle)) / (earthRadius * Math.cos((lat * Math.PI) / 180) * (Math.PI / 180));

  return {
    lat: Math.round((lat + deltaLat) * 10000) / 10000,
    lng: Math.round((lng + deltaLng) * 10000) / 10000,
  };
}

export function useGeolocation() {
  const [state, setState] = useState<LocationState>({
    exactLat: null,
    exactLng: null,
    accuracyMeters: null,
    publicLat: null,
    publicLng: null,
    address: 'Detecting GPS location…',
    isLoading: false,
    error: null,
    isLowAccuracy: false,
    source: 'gps',
  });

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en,hi',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          // Format a clean, human-readable address string
          const addr = data.address || {};
          const road = addr.road || addr.suburb || addr.neighbourhood || '';
          const city = addr.city || addr.town || addr.county || 'Indore';
          const state = addr.state || 'Madhya Pradesh';
          return road ? `${road}, ${city}, ${state}` : data.display_name.split(',').slice(0, 3).join(',');
        }
      }
    } catch (err) {
      console.warn('Reverse geocode fallback:', err);
    }
    return `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
  };

  const fetchGps = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const pos = await detectCurrentLocation();
      const lat = pos.latitude;
      const lng = pos.longitude;
      const acc = pos.accuracy;
      const approx = generateApproximateLocation(lat, lng);
      const readableAddress = await reverseGeocode(lat, lng);

      setState({
        exactLat: lat,
        exactLng: lng,
        accuracyMeters: acc,
        publicLat: approx.lat,
        publicLng: approx.lng,
        address: readableAddress,
        isLoading: false,
        error: null,
        isLowAccuracy: acc > 100,
        source: pos.source === 'gps_high' ? 'gps' : 'default',
      });
    } catch {
      const fallbackLat = 22.7533;
      const fallbackLng = 75.8937;
      const approx = generateApproximateLocation(fallbackLat, fallbackLng);
      setState({
        exactLat: fallbackLat,
        exactLng: fallbackLng,
        accuracyMeters: null,
        publicLat: approx.lat,
        publicLng: approx.lng,
        address: 'Vijay Nagar, Indore, Madhya Pradesh',
        isLoading: false,
        error: 'Unable to connect to GPS or network location.',
        isLowAccuracy: true,
        source: 'default',
      });
    }
  }, []);

  // Set manual coordinates when user picks a point on fallback Leaflet map
  const setManualLocation = useCallback(async (lat: number, lng: number) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    const approx = generateApproximateLocation(lat, lng);
    const readableAddress = await reverseGeocode(lat, lng);

    setState({
      exactLat: lat,
      exactLng: lng,
      accuracyMeters: 5, // manual pin precision
      publicLat: approx.lat,
      publicLng: approx.lng,
      address: readableAddress,
      isLoading: false,
      error: null,
      isLowAccuracy: false,
      source: 'manual',
    });
  }, []);

  useEffect(() => {
    fetchGps();
  }, [fetchGps]);

  return {
    ...state,
    refreshGps: fetchGps,
    setManualLocation,
  };
}
