import { create } from 'zustand';
import {
  SahaayeLocation,
  DEFAULT_LOCATION,
  computeGeohash,
} from '../utils/geohash';
import { API_BASE } from '../services/api';

export interface CityDoc {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  geohash: string;
  active: boolean;
  openNeedsCount: number;
}

export interface SavedLocationItem {
  id: string;
  label: string; // e.g. "Home", "Office", "Parents' house"
  city: string;
  state: string;
  area: string | null;
  lat: number;
  lng: number;
  geohash: string;
  radiusKm: number;
  isNotificationArea: boolean;
}

interface LocationStoreState {
  location: SahaayeLocation;
  recentLocations: SahaayeLocation[];
  savedLocations: SavedLocationItem[];
  cities: CityDoc[];
  isLoadingCities: boolean;
  isAppFiltering: boolean;
  filterToast: string | null;
  
  // Non-blocking location detection prompt
  detectedPrompt: {
    show: boolean;
    city: string;
    state: string;
    lat: number;
    lng: number;
  } | null;

  // Language recommendation based on state (e.g. Hindi for MP, UP, RJ)
  languageSuggestion: {
    show: boolean;
    suggestedLang: 'hi' | 'en';
    stateName: string;
  } | null;

  // Actions
  setLocation: (loc: Partial<SahaayeLocation>) => void;
  setRadius: (radiusKm: number) => void;
  setArea: (area: string | null, lat?: number, lng?: number) => void;
  fetchCities: () => Promise<void>;
  fetchSavedLocations: () => Promise<void>;
  addSavedLocation: (label: string, isNotificationArea?: boolean) => Promise<void>;
  removeSavedLocation: (id: string) => Promise<void>;
  toggleNotificationArea: (id: string) => Promise<void>;
  setDetectedPrompt: (prompt: LocationStoreState['detectedPrompt']) => void;
  confirmDetectedLocation: () => void;
  dismissDetectedPrompt: () => void;
  dismissLanguageSuggestion: () => void;
  clearFilterToast: () => void;
}

const STORAGE_KEY = 'sahaaye_selected_location';
const RECENT_KEY = 'sahaaye_recent_locations';
const SAVED_KEY = 'sahaaye_saved_locations';

// Seed default popular cities
const FALLBACK_CITIES: CityDoc[] = [
  { id: 'indore', name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, geohash: 'tsjem52', active: true, openNeedsCount: 28 },
  { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, geohash: 'tsphq6q', active: true, openNeedsCount: 14 },
  { id: 'delhi', name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, geohash: 'ttnfv2u', active: true, openNeedsCount: 42 },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, geohash: 'te7u818', active: true, openNeedsCount: 36 },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, geohash: 'tsv5910', active: true, openNeedsCount: 19 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, geohash: 'tek3y7q', active: true, openNeedsCount: 21 },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, geohash: 'ts5enec', active: true, openNeedsCount: 16 },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, geohash: 'tu9d151', active: false, openNeedsCount: 0 },
];

function getInitialLocation(): SahaayeLocation {
  try {
    // 1. Check URL param ?city=
    const params = new URLSearchParams(window.location.search);
    const urlCity = params.get('city');
    if (urlCity) {
      const match = FALLBACK_CITIES.find(
        (c) => c.name.toLowerCase() === urlCity.toLowerCase()
      );
      if (match) {
        return {
          city: match.name,
          state: match.state,
          area: null,
          lat: match.lat,
          lng: match.lng,
          geohash: match.geohash,
          radiusKm: 10,
        };
      }
    }

    // 2. Check localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.city && parsed.lat && parsed.lng) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Location initialization note:', err);
  }
  return DEFAULT_LOCATION;
}

function getInitialRecents(): SahaayeLocation[] {
  try {
    const saved = localStorage.getItem(RECENT_KEY);
    return saved ? JSON.parse(saved) : [DEFAULT_LOCATION];
  } catch {
    return [DEFAULT_LOCATION];
  }
}

function getInitialSavedLocs(): SavedLocationItem[] {
  try {
    const saved = localStorage.getItem(SAVED_KEY);
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'sl-1',
            label: 'Home',
            city: 'Indore',
            state: 'Madhya Pradesh',
            area: 'Vijay Nagar',
            lat: 22.7533,
            lng: 75.8937,
            geohash: 'tsjemr3',
            radiusKm: 5,
            isNotificationArea: true,
          },
        ];
  } catch {
    return [];
  }
}

export const useLocationStore = create<LocationStoreState>((set, get) => ({
  location: getInitialLocation(),
  recentLocations: getInitialRecents(),
  savedLocations: getInitialSavedLocs(),
  cities: FALLBACK_CITIES,
  isLoadingCities: false,
  isAppFiltering: false,
  filterToast: null,
  detectedPrompt: null,
  languageSuggestion: null,

  setLocation: (newPartial) => {
    const current = get().location;
    const lat = newPartial.lat ?? current.lat;
    const lng = newPartial.lng ?? current.lng;
    const geohash =
      newPartial.geohash ||
      (newPartial.lat || newPartial.lng ? computeGeohash(lat, lng) : current.geohash);

    const updated: SahaayeLocation = {
      city: newPartial.city ?? current.city,
      state: newPartial.state ?? current.state,
      area: newPartial.area !== undefined ? newPartial.area : current.area,
      lat,
      lng,
      geohash,
      radiusKm: newPartial.radiusKm ?? current.radiusKm,
    };

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Update URL query ?city= without reload
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('city', updated.city.toLowerCase());
      window.history.replaceState({}, '', url.toString());
    } catch {}

    // Add to recents (max 5, unique by city + area)
    const currentRecents = get().recentLocations.filter(
      (r) => !(r.city === updated.city && r.area === updated.area)
    );
    const newRecents = [updated, ...currentRecents].slice(0, 5);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(newRecents));
    } catch {}

    // Language suggestion based on state
    const hindiStates = ['Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Bihar', 'Haryana', 'Delhi'];
    const suggestLang = hindiStates.includes(updated.state) ? 'hi' : null;

    // Toast message for filtering feedback
    const areaSuffix = updated.area ? ` (${updated.area})` : '';
    const radiusLabel = updated.radiusKm === 0 ? 'Whole city' : `${updated.radiusKm} km`;
    const toastMsg = `Showing needs in ${updated.city}${areaSuffix} · ${radiusLabel}`;

    set({
      location: updated,
      recentLocations: newRecents,
      isAppFiltering: true,
      filterToast: toastMsg,
      languageSuggestion:
        suggestLang && localStorage.getItem('sahaaye_lang') !== 'hi'
          ? { show: true, suggestedLang: 'hi', stateName: updated.state }
          : null,
    });

    // End filtering shimmer animation after 400ms
    setTimeout(() => {
      set({ isAppFiltering: false });
    }, 450);

    // Sync to backend / Firestore if logged in
    try {
      fetch(`${API_BASE}/location/sync-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastLocation: updated }),
        credentials: 'include',
      }).catch(() => {});
    } catch {}
  },

  setRadius: (radiusKm) => {
    get().setLocation({ radiusKm });
  },

  setArea: (area, lat, lng) => {
    get().setLocation({
      area,
      ...(lat && lng ? { lat, lng } : {}),
    });
  },

  fetchCities: async () => {
    set({ isLoadingCities: true });
    try {
      const res = await fetch(`${API_BASE}/location/cities`);
      if (res.ok) {
        const data = await res.json();
        if (data.cities && Array.isArray(data.cities)) {
          set({ cities: data.cities });
        }
      }
    } catch (err) {
      console.warn('Cities fetch note: using cached list', err);
    } finally {
      set({ isLoadingCities: false });
    }
  },

  fetchSavedLocations: async () => {
    try {
      const res = await fetch(`${API_BASE}/location/saved`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.savedLocations) {
          set({ savedLocations: data.savedLocations });
          try {
            localStorage.setItem(SAVED_KEY, JSON.stringify(data.savedLocations));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Saved locations fetch note:', err);
    }
  },

  addSavedLocation: async (label, isNotificationArea = false) => {
    const loc = get().location;
    const newItem: SavedLocationItem = {
      id: `sl-${Date.now()}`,
      label: label.trim() || 'Saved Spot',
      city: loc.city,
      state: loc.state,
      area: loc.area,
      lat: loc.lat,
      lng: loc.lng,
      geohash: loc.geohash,
      radiusKm: loc.radiusKm,
      isNotificationArea,
    };

    const updated = [newItem, ...get().savedLocations.filter((s) => s.id !== newItem.id)].slice(0, 5);
    set({ savedLocations: updated });
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`${API_BASE}/location/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
        credentials: 'include',
      });
    } catch {}
  },

  removeSavedLocation: async (id) => {
    const updated = get().savedLocations.filter((s) => s.id !== id);
    set({ savedLocations: updated });
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    } catch {}

    try {
      await fetch(`${API_BASE}/location/saved/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {}
  },

  toggleNotificationArea: async (id) => {
    const current = get().savedLocations;
    const updated = current.map((item) =>
      item.id === id ? { ...item, isNotificationArea: !item.isNotificationArea } : item
    );
    set({ savedLocations: updated });
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    } catch {}

    try {
      const target = updated.find((i) => i.id === id);
      await fetch(`${API_BASE}/location/saved/${id}/notify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isNotificationArea: target?.isNotificationArea }),
        credentials: 'include',
      });
    } catch {}
  },

  setDetectedPrompt: (prompt) => {
    set({ detectedPrompt: prompt });
  },

  confirmDetectedLocation: () => {
    const p = get().detectedPrompt;
    if (p) {
      get().setLocation({
        city: p.city,
        state: p.state,
        area: null,
        lat: p.lat,
        lng: p.lng,
      });
    }
    set({ detectedPrompt: null });
  },

  dismissDetectedPrompt: () => {
    set({ detectedPrompt: null });
  },

  dismissLanguageSuggestion: () => {
    set({ languageSuggestion: null });
  },

  clearFilterToast: () => {
    set({ filterToast: null });
  },
}));
