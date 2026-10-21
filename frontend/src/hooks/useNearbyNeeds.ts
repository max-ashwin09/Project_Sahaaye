import { useState, useEffect, useMemo } from 'react';
import { useSelectedLocation } from './useSelectedLocation';
import { getDistanceKm, getGeohashBounds } from '../utils/geohash';
import { API_BASE } from '../services/api';

export interface NeedItemData {
  id: string;
  title: string;
  category: string;
  urgency: string;
  location: string;
  city?: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  timeAgo: string;
  emoji: string;
  tagLabel: string;
  tagColor: string;
  tagBorder: string;
  tagBg: string;
}

// Fallback baseline needs dataset across key cities for immediate offline/dev preview
const BASE_NEEDS_CATALOG: NeedItemData[] = [
  // Indore needs
  {
    id: 'ind-1',
    title: 'Food Support for 5 Families',
    category: 'Food & Ration',
    urgency: 'High',
    location: 'Vijay Nagar, Indore',
    city: 'Indore',
    latitude: 22.7533,
    longitude: 75.8937,
    timeAgo: '15 mins ago',
    emoji: '🍚',
    tagLabel: 'Food',
    tagColor: '#2563eb',
    tagBorder: '#bfdbfe',
    tagBg: '#eff6ff',
  },
  {
    id: 'ind-2',
    title: 'Urgent Insulin & BP Medicines',
    category: 'Medical Aid',
    urgency: 'Critical',
    location: 'Palasia, Indore',
    city: 'Indore',
    latitude: 22.7244,
    longitude: 75.8839,
    timeAgo: '28 mins ago',
    emoji: '💊',
    tagLabel: 'Medical',
    tagColor: '#e11d48',
    tagBorder: '#fecdd3',
    tagBg: '#fff1f2',
  },
  {
    id: 'ind-3',
    title: 'Notebooks & Stationery for 20 Kids',
    category: 'Education',
    urgency: 'Normal',
    location: 'Scheme 54, Indore',
    city: 'Indore',
    latitude: 22.7588,
    longitude: 75.8893,
    timeAgo: '1 hour ago',
    emoji: '📚',
    tagLabel: 'Education',
    tagColor: '#0d9488',
    tagBorder: '#99f6e4',
    tagBg: '#f0fdfa',
  },
  {
    id: 'ind-4',
    title: 'Warm Blankets & Care Assistance',
    category: 'Elderly Care',
    urgency: 'Normal',
    location: 'Annapurna Road, Indore',
    city: 'Indore',
    latitude: 22.6974,
    longitude: 75.8398,
    timeAgo: '2 hours ago',
    emoji: '👴',
    tagLabel: 'Elderly',
    tagColor: '#7c3aed',
    tagBorder: '#ddd6fe',
    tagBg: '#f5f3ff',
  },
  {
    id: 'ind-5',
    title: 'Clean Drinking Water Tank Support',
    category: 'Clean Water',
    urgency: 'High',
    location: 'Rajwada, Indore',
    city: 'Indore',
    latitude: 22.7186,
    longitude: 75.8553,
    timeAgo: '3 hours ago',
    emoji: '💧',
    tagLabel: 'Water',
    tagColor: '#0284c7',
    tagBorder: '#bae6fd',
    tagBg: '#f0f9ff',
  },
  // Bhopal needs
  {
    id: 'bhp-1',
    title: 'Ration Kits for Daily Wage Workers',
    category: 'Food & Ration',
    urgency: 'High',
    location: 'MP Nagar, Bhopal',
    city: 'Bhopal',
    latitude: 23.2332,
    longitude: 77.4343,
    timeAgo: '35 mins ago',
    emoji: '🍚',
    tagLabel: 'Food',
    tagColor: '#2563eb',
    tagBorder: '#bfdbfe',
    tagBg: '#eff6ff',
  },
  {
    id: 'bhp-2',
    title: 'Emergency Ambulance Assistance',
    category: 'Medical Aid',
    urgency: 'Critical',
    location: 'Arera Colony, Bhopal',
    city: 'Bhopal',
    latitude: 23.2132,
    longitude: 77.4332,
    timeAgo: '50 mins ago',
    emoji: '💊',
    tagLabel: 'Medical',
    tagColor: '#e11d48',
    tagBorder: '#fecdd3',
    tagBg: '#fff1f2',
  },
  // Delhi needs
  {
    id: 'del-1',
    title: 'Winter Clothes Distribution Support',
    category: 'Clothes',
    urgency: 'Normal',
    location: 'Connaught Place, Delhi',
    city: 'Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
    timeAgo: '40 mins ago',
    emoji: '👕',
    tagLabel: 'Clothes',
    tagColor: '#10b981',
    tagBorder: '#a7f3d0',
    tagBg: '#ecfdf5',
  },
  {
    id: 'del-2',
    title: 'Community Kitchen Meal Prep',
    category: 'Food & Ration',
    urgency: 'High',
    location: 'South Extension, Delhi',
    city: 'Delhi',
    latitude: 28.5714,
    longitude: 77.2212,
    timeAgo: '1 hour ago',
    emoji: '🍚',
    tagLabel: 'Food',
    tagColor: '#2563eb',
    tagBorder: '#bfdbfe',
    tagBg: '#eff6ff',
  },
  // Mumbai needs
  {
    id: 'mum-1',
    title: 'Elderly Medicine Home Delivery',
    category: 'Elderly Care',
    urgency: 'Normal',
    location: 'Andheri West, Mumbai',
    city: 'Mumbai',
    latitude: 19.1363,
    longitude: 72.8277,
    timeAgo: '20 mins ago',
    emoji: '👴',
    tagLabel: 'Elderly',
    tagColor: '#7c3aed',
    tagBorder: '#ddd6fe',
    tagBg: '#f5f3ff',
  },
  {
    id: 'mum-2',
    title: 'Monsoon Tarpaulin Shelter Kits',
    category: 'Shelter',
    urgency: 'Critical',
    location: 'Bandra, Mumbai',
    city: 'Mumbai',
    latitude: 19.0596,
    longitude: 72.8295,
    timeAgo: '45 mins ago',
    emoji: '🏠',
    tagLabel: 'Shelter',
    tagColor: '#f59e0b',
    tagBorder: '#fde68a',
    tagBg: '#fffbeb',
  },
];

function mapSubmittedNeedToItem(n: any): NeedItemData {
  const cat = n.cat || n.category || 'Other';
  const urg = n.urg || n.urgency || 'Medium';
  const city = n.loc?.city || n.city || 'Indore';
  const locStr = n.land
    ? `${n.land}, ${city}`
    : n.loc?.address || `${city}, MP`;

  return {
    id: n.id,
    title: n.title,
    category: cat,
    urgency: urg,
    location: locStr,
    city: city,
    latitude: Number(n.loc?.lat) || Number(n.latitude) || 22.7196,
    longitude: Number(n.loc?.lng) || Number(n.longitude) || 75.8577,
    timeAgo: 'Just now',
    emoji: cat.includes('Food')
      ? '🍚'
      : cat.includes('Med')
      ? '💊'
      : cat.includes('Water')
      ? '💧'
      : cat.includes('Cloth')
      ? '👕'
      : cat.includes('Edu')
      ? '📚'
      : cat.includes('Shelt')
      ? '🏠'
      : '🤝',
    tagLabel: cat.split(' ')[0] || 'Seva',
    tagColor: urg === 'High' ? '#dc2626' : urg === 'Medium' ? '#f59e0b' : '#10b981',
    tagBorder: urg === 'High' ? '#fecaca' : urg === 'Medium' ? '#fde68a' : '#a7f3d0',
    tagBg: urg === 'High' ? '#fef2f2' : urg === 'Medium' ? '#fffbeb' : '#ecfdf5',
  };
}

/**
 * Reusable Hook: useNearbyNeeds()
 * Consumes the global selected location and performs geo-filtering
 * using geohash queries & Haversine distance calculations.
 */
export function useNearbyNeeds() {
  const { location, isAppFiltering } = useSelectedLocation();
  const [allNeeds, setAllNeeds] = useState<NeedItemData[]>(BASE_NEEDS_CATALOG);
  const [localSubmittedNeeds, setLocalSubmittedNeeds] = useState<NeedItemData[]>(() => {
    try {
      const raw = localStorage.getItem('sahaaye_needs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(mapSubmittedNeedToItem);
        }
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Listen for local submissions
  useEffect(() => {
    const handleSubmitted = (e: any) => {
      const need = e.detail;
      if (need) {
        const mapped = mapSubmittedNeedToItem(need);
        setLocalSubmittedNeeds((prev) => [mapped, ...prev]);
      }
    };
    window.addEventListener('sahaaye:need-submitted', handleSubmitted);
    return () => window.removeEventListener('sahaaye:need-submitted', handleSubmitted);
  }, []);

  // Fetch newly reported needs from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchApiNeeds = async () => {
      try {
        const res = await fetch(`${API_BASE}/needs`);
        if (res.ok) {
          const data = await res.json();
          if (data.needs && Array.isArray(data.needs)) {
            const formatted: NeedItemData[] = data.needs.map((n: any) => ({
              id: n.id,
              title: n.title,
              category: n.category || 'Other',
              urgency: n.urgency || 'Normal',
              location: n.location || 'Local Area',
              city: n.location?.split(',')?.pop()?.trim() || 'Indore',
              latitude: Number(n.latitude) || 22.7196,
              longitude: Number(n.longitude) || 75.8577,
              timeAgo: 'Just now',
              emoji: n.category?.includes('Food') ? '🍚' : n.category?.includes('Med') ? '💊' : '🤝',
              tagLabel: n.category?.split(' ')[0] || 'Seva',
              tagColor: '#0d9488',
              tagBorder: '#99f6e4',
              tagBg: '#f0fdfa',
            }));

            if (isMounted) {
              setAllNeeds([...formatted, ...BASE_NEEDS_CATALOG]);
            }
          }
        }
      } catch (err) {
        // Fallback to static catalog
      }
    };

    fetchApiNeeds();
    return () => {
      isMounted = false;
    };
  }, []);

  // Combine local newly submitted needs with catalogue
  const combinedNeeds = useMemo(() => {
    const ids = new Set<string>();
    const list: NeedItemData[] = [];
    for (const item of [...localSubmittedNeeds, ...allNeeds]) {
      if (!ids.has(item.id)) {
        ids.add(item.id);
        list.push(item);
      }
    }
    return list;
  }, [localSubmittedNeeds, allNeeds]);

  // Filter & sort needs relative to current selected location
  const filteredNeeds = useMemo(() => {
    const { lat, lng, radiusKm, city, area } = location;

    // 1. Calculate real-time distance for each need
    const withDistance = combinedNeeds.map((need) => {
      const dist = getDistanceKm(lat, lng, need.latitude, need.longitude);
      return {
        ...need,
        distanceKm: dist,
      };
    });

    // 2. Filter by radius or whole city
    const filtered = withDistance.filter((need) => {
      // If "Whole city" selected (radiusKm === 0)
      if (radiusKm === 0) {
        const cityMatch =
          need.location.toLowerCase().includes(city.toLowerCase()) ||
          (need.city && need.city.toLowerCase() === city.toLowerCase());
        return cityMatch || (need.distanceKm !== undefined && need.distanceKm <= 35);
      }

      // If specific radius selected (e.g. 2, 5, 10, 25 km)
      if (need.distanceKm !== undefined && need.distanceKm <= radiusKm) {
        return true;
      }

      // Check if location string explicitly matches area
      if (area && need.location.toLowerCase().includes(area.toLowerCase())) {
        return true;
      }

      return false;
    });

    // 3. Sort by closest distance first
    return filtered.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }, [combinedNeeds, location]);

  return {
    needs: filteredNeeds,
    count: filteredNeeds.length,
    isLoading: isLoading || isAppFiltering,
    selectedLocation: location,
  };
}
