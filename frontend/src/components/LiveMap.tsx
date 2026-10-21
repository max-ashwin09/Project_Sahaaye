import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LiveMap.css';
import {
  MapPin,
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  Sliders,
  Compass,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  ExternalLink,
  Navigation,
  X,
  Route,
  Globe,
  Map,
} from 'lucide-react';
import { useSelectedLocation } from '../hooks/useSelectedLocation';

export interface NeedItem {
  id: string;
  title: string;
  category: 'Food' | 'Medical' | 'Shelter' | 'Education' | 'Elderly' | 'Water' | 'Clothes' | 'Other';
  urgency: 'Critical' | 'High' | 'Moderate';
  location: string;
  lat: number;
  lng: number;
  description?: string;
  reportedAgo?: string;
  emoji: string;
  color: string;
}

// ─── Category Items for Filter List ─────────────────────────────────────────────
const CATEGORY_ITEMS = [
  { label: 'All', color: '#64748b', emoji: '🌐' },
  { label: 'Food', color: '#2563eb', emoji: '🍚' },
  { label: 'Medical', color: '#e11d48', emoji: '💊' },
  { label: 'Education', color: '#0d9488', emoji: '📚' },
  { label: 'Shelter', color: '#f59e0b', emoji: '🏠' },
  { label: 'Water', color: '#0284c7', emoji: '💧' },
  { label: 'Elderly', color: '#7c3aed', emoji: '👴' },
  { label: 'Clothes', color: '#10b981', emoji: '👕' },
];

// ─── Default Community Needs in Indore ──────────────────────────────────────────
const INDORE_NEEDS: NeedItem[] = [
  {
    id: 'ind-1',
    title: 'Food Support for 5 Families',
    category: 'Food',
    urgency: 'High',
    location: 'Vijay Nagar, Indore',
    lat: 22.7533,
    lng: 75.8937,
    description: 'Dry ration packs and cooked meals needed for displaced daily-wage workers.',
    reportedAgo: '12m ago',
    emoji: '🍚',
    color: '#2563eb',
  },
  {
    id: 'ind-2',
    title: 'Emergency Medicines & Insulin',
    category: 'Medical',
    urgency: 'Critical',
    location: 'Old Palasia, Indore',
    lat: 22.7244,
    lng: 75.8839,
    description: 'Urgent insulin vials and BP medication for senior citizens.',
    reportedAgo: '28m ago',
    emoji: '💊',
    color: '#e11d48',
  },
  {
    id: 'ind-3',
    title: 'School Notebooks & Stationery',
    category: 'Education',
    urgency: 'Moderate',
    location: 'Scheme 54, Indore',
    lat: 22.7584,
    lng: 75.8890,
    description: 'Books, geometry boxes and school bags for 20 primary school students.',
    reportedAgo: '45m ago',
    emoji: '📚',
    color: '#0d9488',
  },
  {
    id: 'ind-4',
    title: 'Temporary Rain Shelter & Tarpaulins',
    category: 'Shelter',
    urgency: 'High',
    location: 'Rajwada Market area, Indore',
    lat: 22.7196,
    lng: 75.8577,
    description: 'Tarpaulin sheets and sturdy temporary shelter kits needed urgently.',
    reportedAgo: '1h ago',
    emoji: '🏠',
    color: '#f59e0b',
  },
  {
    id: 'ind-5',
    title: 'Clean Drinking Water Supply',
    category: 'Water',
    urgency: 'High',
    location: 'Bhanwarkua Square, Indore',
    lat: 22.6891,
    lng: 75.8647,
    description: 'Clean drinking water cans needed for community slum cluster.',
    reportedAgo: '1h ago',
    emoji: '💧',
    color: '#0284c7',
  },
  {
    id: 'ind-6',
    title: 'Elderly Mobility & Walker Assistance',
    category: 'Elderly',
    urgency: 'Moderate',
    location: 'Annapurna Road, Indore',
    lat: 22.7012,
    lng: 75.8362,
    description: 'Walking support stick and basic medical monitoring checkup.',
    reportedAgo: '2h ago',
    emoji: '👴',
    color: '#7c3aed',
  },
  {
    id: 'ind-7',
    title: 'Warm Clothes & Blankets',
    category: 'Clothes',
    urgency: 'Moderate',
    location: 'Khajrana, Indore',
    lat: 22.7303,
    lng: 75.9080,
    description: 'Blankets and winter clothes for children and homeless night shelter.',
    reportedAgo: '2h ago',
    emoji: '👕',
    color: '#10b981',
  },
  {
    id: 'ind-8',
    title: 'Cooked Food Packets Distribution',
    category: 'Food',
    urgency: 'High',
    location: 'Chappan Dukan area, New Palasia',
    lat: 22.7239,
    lng: 75.8788,
    description: '50 evening meal boxes requested for shelter inmates.',
    reportedAgo: '3h ago',
    emoji: '🍚',
    color: '#2563eb',
  },
  {
    id: 'ind-9',
    title: 'Emergency Dialysis Transport Assistance',
    category: 'Medical',
    urgency: 'Critical',
    location: 'MY Hospital vicinity, Indore',
    lat: 22.7150,
    lng: 75.8750,
    description: 'Patient requires emergency wheeling and ambulance transit assistance.',
    reportedAgo: '3h ago',
    emoji: '💊',
    color: '#e11d48',
  },
  {
    id: 'ind-10',
    title: 'Labor Community Ration Support',
    category: 'Food',
    urgency: 'Moderate',
    location: 'Super Corridor, Indore',
    lat: 22.7750,
    lng: 75.8300,
    description: 'Food ration kits for 12 migrant construction families.',
    reportedAgo: '4h ago',
    emoji: '🍚',
    color: '#2563eb',
  },
  {
    id: 'ind-11',
    title: 'Primary Education Volunteer Needed',
    category: 'Education',
    urgency: 'Moderate',
    location: 'Bengali Square, Indore',
    lat: 22.7118,
    lng: 75.9048,
    description: 'Weekend math and reading support for underprivileged children.',
    reportedAgo: '5h ago',
    emoji: '📚',
    color: '#0d9488',
  },
  {
    id: 'ind-12',
    title: 'Disability Wheelchair Support',
    category: 'Medical',
    urgency: 'Moderate',
    location: 'Rau, Indore',
    lat: 22.6450,
    lng: 75.8190,
    description: 'Manual wheelchair requested for injured youth.',
    reportedAgo: '6h ago',
    emoji: '💊',
    color: '#e11d48',
  },
];

const PRESET_DISTANCES = [1, 2, 3, 5, 10, 15, 25];

// Haversine distance in Kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
}

interface LiveMapProps {
  onVolunteer?: (need: NeedItem) => void;
  onToast?: (msg: string) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({ onVolunteer, onToast }) => {
  // State
  const [mapType, setMapType] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [centerCoords, setCenterCoords] = useState<[number, number]>([22.7533, 75.8937]); // Default: Vijay Nagar, Indore
  const [centerName, setCenterName] = useState<string>('Vijay Nagar, Indore');
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [manualInput, setManualInput] = useState<string>('3');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [autoFitBounds, setAutoFitBounds] = useState<boolean>(true);
  const [activeNeed, setActiveNeed] = useState<NeedItem | null>(null);
  const [showCustomise, setShowCustomise] = useState<boolean>(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState<boolean>(false);

  const { location: globalLocation } = useSelectedLocation();

  // Sync LiveMap when global location changes in the header
  useEffect(() => {
    if (globalLocation) {
      const newLat = globalLocation.lat;
      const newLng = globalLocation.lng;
      setCenterCoords([newLat, newLng]);
      setCenterName(`${globalLocation.area ? `${globalLocation.area}, ` : ''}${globalLocation.city}`);
      if (globalLocation.radiusKm > 0) {
        setRadiusKm(globalLocation.radiusKm);
        setManualInput(String(globalLocation.radiusKm));
      }
      if (mapRef.current) {
        mapRef.current.flyTo([newLat, newLng], Math.max(mapRef.current.getZoom(), 13), {
          duration: 0.8,
          easeLinearity: 0.25,
        });
      }
    }
  }, [globalLocation.city, globalLocation.area, globalLocation.lat, globalLocation.lng, globalLocation.radiusKm]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportWrapperRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteBaseLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLabelsLayerRef = useRef<L.TileLayer | null>(null);
  const terrainLayerRef = useRef<L.TileLayer | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const needMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Floating controls auto-hide popup state & timer refs
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringControlsRef = useRef<boolean>(false);

  // Show floating controls and auto-hide after 3 seconds of inactivity
  const showControlsTemporarily = useCallback((durationMs = 3000) => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
    if (!isHoveringControlsRef.current) {
      hideControlsTimerRef.current = setTimeout(() => {
        if (!isHoveringControlsRef.current) {
          setControlsVisible(false);
        }
      }, durationMs);
    }
  }, []);

  const handleControlsMouseEnter = useCallback(() => {
    isHoveringControlsRef.current = true;
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
    setControlsVisible(true);
  }, []);

  const handleControlsMouseLeave = useCallback(() => {
    isHoveringControlsRef.current = false;
    showControlsTemporarily(3000);
  }, [showControlsTemporarily]);

  // Setup global volunteer bridge for Leaflet popup buttons
  useEffect(() => {
    (window as any).sahaayeVolunteerBridge = (id: string) => {
      const need = INDORE_NEEDS.find((n) => n.id === id);
      if (need) {
        if (onVolunteer) onVolunteer(need);
        if (onToast) onToast(`🤝 Thank you! You offered help for: "${need.title}"`);
      }
    };
    (window as any).sahaayeSelectNeed = (id: string) => {
      const need = INDORE_NEEDS.find((n) => n.id === id);
      if (need) setActiveNeed(need);
    };
    (window as any).sahaayeMoveCenter = (lat: number, lng: number) => {
      if (mapRef.current) {
        mapRef.current.closePopup();
        mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 14), {
          duration: 0.8,
          easeLinearity: 0.25,
        });
      }
      setCenterCoords([lat, lng]);
      setCenterName(`Custom Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      if (onToast) onToast(`📍 Search center moved to: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    };
    return () => {
      delete (window as any).sahaayeVolunteerBridge;
      delete (window as any).sahaayeSelectNeed;
      delete (window as any).sahaayeMoveCenter;
    };
  }, [onVolunteer, onToast]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setShowCategoryMenu(false);
      }
    };
    if (showCategoryMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryMenu]);

  // Compute needs with distance relative to current center
  const needsWithDistance = useMemo(() => {
    return INDORE_NEEDS.map((need) => {
      const dist = calculateDistanceKm(centerCoords[0], centerCoords[1], need.lat, need.lng);
      return {
        ...need,
        distanceKm: dist,
        isInRange: dist <= radiusKm,
      };
    });
  }, [centerCoords, radiusKm]);

  // Filtered needs by category and search
  const filteredNeeds = useMemo(() => {
    return needsWithDistance.filter((n) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        n.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.location.toLowerCase().includes(q) ||
        (n.description && n.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [needsWithDistance, selectedCategory, searchQuery]);

  // ─── Initialize Leaflet Map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create Map
    const map = L.map(containerRef.current, {
      center: centerCoords,
      zoom: 13,
      minZoom: 5,
      maxZoom: 19,
      zoomControl: false, // Google Maps style zoom buttons
      attributionControl: false,
      touchZoom: true,
      dragging: true,
      tapTolerance: 15,
    });

    mapRef.current = map;

    // Map movement / zoom / drag triggers floating controls auto-hide popup
    const handleMapInteraction = () => {
      showControlsTemporarily(3000);
    };
    map.on('movestart move moveend zoomstart zoom zoomend dragstart drag dragend', handleMapInteraction);

    // 1. OpenStreetMap Standard Streets Layer (100% Free, Zero Watermark, Crisp Highways & Buildings)
    const streetLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }
    );
    streetLayerRef.current = streetLayer;

    // 2. ESRI World Imagery Satellite Base Layer (Real satellite rooftops, houses, fields - No API Key Needed)
    const satelliteBaseLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
      }
    );
    satelliteBaseLayerRef.current = satelliteBaseLayer;

    // 3. ESRI Boundaries & Transportation Overlay Layer (Superimposes named roads & highways onto satellite!)
    const satelliteLabelsLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        pane: 'overlayPane',
      }
    );
    satelliteLabelsLayerRef.current = satelliteLabelsLayer;

    // 4. ESRI World Street Map (Alternative Clean City Map)
    const terrainLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri',
      }
    );
    terrainLayerRef.current = terrainLayer;

    // Default layer: streets
    streetLayer.addTo(map);

    // Dynamic Distance Circle
    const circle = L.circle(centerCoords, {
      radius: radiusKm * 1000,
      color: '#2563eb',
      weight: 2.5,
      opacity: 0.9,
      fillColor: '#3b82f6',
      fillOpacity: 0.16,
      dashArray: '8, 6',
    }).addTo(map);
    circleRef.current = circle;

    // Center Pin Marker with radar pulse halo (Google GPS Blue Target)
    const centerIcon = L.divIcon({
      className: 'custom-center-marker-wrap',
      html: `
        <div class="center-radar-marker">
          <div class="center-radar-pulse"></div>
          <div class="center-radar-core">📍</div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const centerMarker = L.marker(centerCoords, {
      icon: centerIcon,
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(map);

    // Update center when user drags marker
    centerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      const newCoords: [number, number] = [pos.lat, pos.lng];
      setCenterCoords(newCoords);
      setCenterName(`Custom Point (${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)})`);
      if (onToast) onToast(`📍 Center moved to: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
    });

    centerMarkerRef.current = centerMarker;

    // Click/tap on map: show sleek micro-pill popup (< 1 sec) and smoothly move map
    map.on('click', (e) => {
      showControlsTemporarily(3000);
      const origEvent = e.originalEvent as any;
      if (origEvent?.target?.closest?.('.leaflet-marker-icon, .leaflet-popup, .livemap-maptype-switcher')) return;

      const { lat, lng } = e.latlng;

      // 1. Sleek micro-popup pill at tap point
      const microPopup = L.popup({
        className: 'livemap-micro-tap-popup',
        closeButton: false,
        autoClose: true,
        closeOnClick: true,
        offset: [0, -8],
      })
        .setLatLng([lat, lng])
        .setContent(`
          <div class="micro-tap-pill">
            <span class="micro-pulse-dot"></span>
            <span>📍 Moving here…</span>
          </div>
        `)
        .openOn(map);

      // 2. Trigger center reposition & smooth map fly movement
      setCenterCoords([lat, lng]);
      setCenterName(`Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      map.flyTo([lat, lng], map.getZoom(), {
        duration: 0.55,
        easeLinearity: 0.25,
      });

      // 3. Automatically dismiss the micro-popup in exactly 1 second (1000ms)
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.closePopup(microPopup);
        }
      }, 1000);
    });

    // Needs Layer Group
    const needsGroup = L.layerGroup().addTo(map);
    needMarkersLayerRef.current = needsGroup;

    // Ensure Leaflet dimensions adjust smoothly
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [showControlsTemporarily]); // Run once on mount

  // Viewport DOM events (mousemove, touchstart, pointerdown, wheel) to smoothly reveal controls
  useEffect(() => {
    const wrapper = viewportWrapperRef.current;
    if (!wrapper) return;

    const handleWrapperPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('.livemap-map-floating-layers, .livemap-floating-overlay')) {
        return;
      }
      showControlsTemporarily(3000);
    };

    wrapper.addEventListener('mousemove', handleWrapperPointer, { passive: true });
    wrapper.addEventListener('touchstart', handleWrapperPointer, { passive: true });
    wrapper.addEventListener('pointerdown', handleWrapperPointer, { passive: true });
    wrapper.addEventListener('wheel', handleWrapperPointer, { passive: true });

    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      wrapper.removeEventListener('mousemove', handleWrapperPointer);
      wrapper.removeEventListener('touchstart', handleWrapperPointer);
      wrapper.removeEventListener('pointerdown', handleWrapperPointer);
      wrapper.removeEventListener('wheel', handleWrapperPointer);
    };
  }, [showControlsTemporarily]);

  // ─── Switch Map Tiles (Streets vs Satellite Hybrid vs Terrain) ────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove existing tile layers
    if (streetLayerRef.current && map.hasLayer(streetLayerRef.current)) map.removeLayer(streetLayerRef.current);
    if (satelliteBaseLayerRef.current && map.hasLayer(satelliteBaseLayerRef.current)) map.removeLayer(satelliteBaseLayerRef.current);
    if (satelliteLabelsLayerRef.current && map.hasLayer(satelliteLabelsLayerRef.current)) map.removeLayer(satelliteLabelsLayerRef.current);
    if (terrainLayerRef.current && map.hasLayer(terrainLayerRef.current)) map.removeLayer(terrainLayerRef.current);

    if (mapType === 'streets') {
      if (streetLayerRef.current) streetLayerRef.current.addTo(map);
    } else if (mapType === 'satellite') {
      // Add Satellite base + Road & Place Names on top (Hybrid mode)
      if (satelliteBaseLayerRef.current) satelliteBaseLayerRef.current.addTo(map);
      if (satelliteLabelsLayerRef.current) satelliteLabelsLayerRef.current.addTo(map);
    } else if (mapType === 'terrain') {
      if (terrainLayerRef.current) terrainLayerRef.current.addTo(map);
    }
  }, [mapType]);

  // ─── Update Circle & Center Marker Position ──────────────────────────────────
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setLatLng(centerCoords);
      circleRef.current.setRadius(radiusKm * 1000);
    }
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng(centerCoords);
    }

    if (autoFitBounds && mapRef.current && circleRef.current) {
      const bounds = circleRef.current.getBounds();
      mapRef.current.flyToBounds(bounds.pad(0.14), {
        duration: 0.7,
        maxZoom: 16,
      });
    }
  }, [centerCoords, radiusKm, autoFitBounds]);

  // ─── Render Need Markers on Map ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !needMarkersLayerRef.current) return;
    const layer = needMarkersLayerRef.current;
    layer.clearLayers();

    filteredNeeds.forEach((need) => {
      const inRange = need.isInRange;
      const isSelected = activeNeed?.id === need.id;

      const markerHtml = `
        <div class="custom-live-marker ${inRange ? 'marker-in-range' : 'marker-out-of-range'} ${isSelected ? 'marker-selected' : ''}" style="--marker-color: ${need.color};">
          <div class="marker-pin-body">
            <span class="marker-emoji">${need.emoji}</span>
          </div>
          <div class="marker-pin-tip"></div>
          ${inRange ? '<div class="marker-beacon-wave"></div>' : ''}
          <div class="marker-dist-chip">${need.distanceKm}km</div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-need-marker-wrapper',
        html: markerHtml,
        iconSize: [40, 52],
        iconAnchor: [20, 52],
        popupAnchor: [0, -48],
      });

      const popupContent = `
        <div class="livemap-popup-card">
          <div class="popup-top-row">
            <span class="popup-badge" style="background: ${need.color}15; color: ${need.color}; border: 1px solid ${need.color}35;">
              ${need.emoji} ${need.category}
            </span>
            <span class="popup-range-tag ${inRange ? 'tag-inside' : 'tag-outside'}">
              ${inRange ? '● Inside ' + radiusKm + 'km' : '○ ' + (need.distanceKm - radiusKm).toFixed(1) + 'km beyond circle'}
            </span>
          </div>
          <h4 class="popup-heading">${need.title}</h4>
          <p class="popup-loc">📍 ${need.location} <span class="popup-dist-num">(${need.distanceKm} km away)</span></p>
          ${need.description ? `<p class="popup-desc">${need.description}</p>` : ''}
          <div class="popup-meta">
            <span class="popup-urgency popup-urgency--${need.urgency.toLowerCase()}">⚡ ${need.urgency} Urgency</span>
            <span class="popup-time">🕒 ${need.reportedAgo || 'Active'}</span>
          </div>
          <div class="popup-actions">
            <button class="popup-btn-volunteer" onclick="window.sahaayeVolunteerBridge('${need.id}')">
              🤝 Offer Help
            </button>
            <a class="popup-btn-gmaps" href="https://www.google.com/maps/dir/?api=1&destination=${need.lat},${need.lng}" target="_blank" rel="noopener noreferrer" title="Get GPS directions in Google Maps">
              🧭 Directions
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([need.lat, need.lng], { icon });
      marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'sahaaye-leaflet-popup',
      });

      marker.on('click', () => {
        setActiveNeed(need);
      });

      marker.addTo(layer);
    });
  }, [filteredNeeds, activeNeed, radiusKm]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleDistancePreset = (val: number) => {
    setRadiusKm(val);
    setManualInput(String(val));
    if (onToast) onToast(`🎯 Distance radius set to ${val} km. Circle updated!`);
  };

  const handleManualInputApply = () => {
    const parsed = parseFloat(manualInput);
    if (!isNaN(parsed) && parsed >= 0.2 && parsed <= 100) {
      const rounded = Math.round(parsed * 10) / 10;
      setRadiusKm(rounded);
      if (onToast) onToast(`⭕ Radius circle updated to ${rounded} km!`);
    } else {
      if (onToast) onToast('⚠️ Please enter a valid distance between 0.5 km and 100 km');
      setManualInput(String(radiusKm));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setRadiusKm(val);
    setManualInput(String(val));
  };

  const handleLocateMe = () => {
    showControlsTemporarily(3000);
    if (!navigator.geolocation) {
      if (onToast) onToast('Geolocation is not supported by your browser');
      return;
    }
    if (onToast) onToast('📡 Detecting your current location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCenterCoords([latitude, longitude]);
        setCenterName('Your Live Location');
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 14, { duration: 1 });
        }
        if (onToast) onToast('📍 Map centered at your live location!');
      },
      () => {
        // Fallback to Indore center
        setCenterCoords([22.7533, 75.8937]);
        setCenterName('Vijay Nagar, Indore');
        if (onToast) onToast('Could not access GPS. Defaulted to Indore Hub.');
      },
      { timeout: 7000 }
    );
  };

  const handleResetToIndore = () => {
    showControlsTemporarily(3000);
    setCenterCoords([22.7533, 75.8937]);
    setCenterName('Vijay Nagar, Indore');
    setRadiusKm(3);
    setManualInput('3');
    setSelectedCategory('All');
    setSearchQuery('');
    setActiveNeed(null);
    if (mapRef.current) {
      mapRef.current.flyTo([22.7533, 75.8937], 13, { duration: 0.8 });
    }
    if (onToast) onToast('📍 Reset center to Vijay Nagar, Indore (3 km radius)');
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 200);
  };

  const zoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
    showControlsTemporarily(3000);
  };

  const zoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
    showControlsTemporarily(3000);
  };

  return (
    <div className={`livemap-card-container ${isFullscreen ? 'livemap-fullscreen-mode' : ''}`}>
      {/* ─── Header Toolbar ───────────────────────────────────────────────────── */}
      <div className="livemap-header-bar">
        <div className="livemap-title-group">
          <div className="livemap-indicator-pill">
            <span className="livemap-pulse-dot"></span>
            <span className="livemap-pulse-text">LIVE</span>
          </div>
          <div>
            <h3 className="livemap-main-title">Live Map</h3>
            <p className="livemap-sub-title">
              Interactive highways, street names & satellite houses with real-time distance circle
            </p>
          </div>
        </div>

        {/* View mode toggle & actions */}
        <div className="livemap-header-actions">
          {/* Quick Search */}
          <div className="livemap-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search needs / areas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="livemap-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="livemap-cat-filter">
            <Filter size={14} className="filter-icon" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="livemap-cat-select"
            >
              <option value="All">All Categories ({needsWithDistance.length})</option>
              <option value="Food">Food 🍚</option>
              <option value="Medical">Medical 💊</option>
              <option value="Education">Education 📚</option>
              <option value="Shelter">Shelter 🏠</option>
              <option value="Water">Water 💧</option>
              <option value="Elderly">Elderly 👴</option>
              <option value="Clothes">Clothes 👕</option>
            </select>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="livemap-tool-icon-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* ─── Compact Distance Bar: 1km, 3km, 5km + Customise Option ───────── */}
      <div className="livemap-compact-distance-bar">
        <div className="compact-dist-left">
          <span className="compact-dist-label">
            <span className="compact-radar-icon">⭕</span>
            <strong>Distance:</strong>
          </span>

          {/* Direct 1km, 3km, 5km presets only */}
          <div className="compact-preset-group">
            {[1, 3, 5].map((km) => (
              <button
                key={km}
                type="button"
                className={`compact-preset-pill ${radiusKm === km && !showCustomise ? 'active' : ''}`}
                onClick={() => {
                  setShowCustomise(false);
                  handleDistancePreset(km);
                }}
              >
                {km} km {radiusKm === km && !showCustomise && <Check size={11} className="compact-check-icon" />}
              </button>
            ))}

            {/* Customise Option Button */}
            <button
              type="button"
              className={`compact-preset-pill compact-customise-pill ${showCustomise || ![1, 3, 5].includes(radiusKm) ? 'active' : ''}`}
              onClick={() => setShowCustomise((prev) => !prev)}
              title="Click to open custom distance options"
            >
              <Sliders size={12} className="compact-customise-icon" />
              <span>Customise</span>
              {![1, 3, 5].includes(radiusKm) && (
                <span className="compact-custom-val">({radiusKm} km)</span>
              )}
            </button>
          </div>

          {/* Customise Panel (2km, 10km, & Manual Input Stepper) */}
          {showCustomise && (
            <div className="compact-customise-tray">
              {/* Additional presets placed inside Customise */}
              <div className="customise-sub-presets">
                {[2, 10].map((km) => (
                  <button
                    key={km}
                    type="button"
                    className={`customise-mini-pill ${radiusKm === km ? 'active' : ''}`}
                    onClick={() => handleDistancePreset(km)}
                  >
                    {km} km {radiusKm === km && '✓'}
                  </button>
                ))}
              </div>

              {/* Manual Stepper & Custom Value */}
              <div className="compact-manual-stepper">
                <button
                  type="button"
                  className="compact-step-btn"
                  title="Decrease by 0.5 km"
                  onClick={() => {
                    const next = Math.max(0.5, Math.round((radiusKm - 0.5) * 10) / 10);
                    setRadiusKm(next);
                    setManualInput(String(next));
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="100"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onBlur={handleManualInputApply}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualInputApply();
                  }}
                  className="compact-manual-input"
                  placeholder="km"
                  title="Enter custom km"
                />
                <span className="compact-unit-label">km</span>
                <button
                  type="button"
                  className="compact-step-btn"
                  title="Increase by 0.5 km"
                  onClick={() => {
                    const next = Math.min(100, Math.round((radiusKm + 0.5) * 10) / 10);
                    setRadiusKm(next);
                    setManualInput(String(next));
                  }}
                >
                  +
                </button>
                <button
                  type="button"
                  className="compact-btn-set"
                  onClick={handleManualInputApply}
                  title="Apply custom distance"
                >
                  Set
                </button>
              </div>

              {/* Close Customise Tray */}
              <button
                type="button"
                className="customise-done-btn"
                onClick={() => setShowCustomise(false)}
                title="Close Customise"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Leaflet Map Canvas ───────────────────────────────────────────────── */}
      <div ref={viewportWrapperRef} className="livemap-viewport-wrapper">
        <div ref={containerRef} className="livemap-canvas-element" />

        {/* Floating Highlighted Layer Switcher (Streets / Satellite / Standard) */}
        <div
          className={`livemap-map-floating-layers ${controlsVisible ? 'controls-popup-visible' : 'controls-popup-hidden'}`}
          role="group"
          aria-label="Map Tile Layers"
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
          onTouchStart={handleControlsMouseEnter}
          onTouchEnd={handleControlsMouseLeave}
          onPointerDown={handleControlsMouseEnter}
          onPointerUp={handleControlsMouseLeave}
        >
          <button
            type="button"
            className={`floating-layer-btn ${mapType === 'streets' ? 'active' : ''}`}
            onClick={() => {
              setMapType('streets');
              showControlsTemporarily(3000);
            }}
            title="Streets & highways view"
          >
            <span className="layer-icon">
              <Route size={16} strokeWidth={1.8} />
            </span>
            <span className="layer-name">Streets</span>
          </button>
          <button
            type="button"
            className={`floating-layer-btn ${mapType === 'satellite' ? 'active' : ''}`}
            onClick={() => {
              setMapType('satellite');
              showControlsTemporarily(3000);
            }}
            title="Satellite view with actual houses & road names"
          >
            <span className="layer-icon">
              <Globe size={16} strokeWidth={1.8} />
            </span>
            <span className="layer-name">Satellite</span>
          </button>
          <button
            type="button"
            className={`floating-layer-btn ${mapType === 'terrain' ? 'active' : ''}`}
            onClick={() => {
              setMapType('terrain');
              showControlsTemporarily(3000);
            }}
            title="Standard topographic view"
          >
            <span className="layer-icon">
              <MapPin size={16} strokeWidth={1.8} />
            </span>
            <span className="layer-name">Standard</span>
          </button>
        </div>

        {/* Floating Google-style Map Controls Overlay */}
        <div
          className={`livemap-floating-overlay ${controlsVisible ? 'controls-popup-visible' : 'controls-popup-hidden'}`}
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
          onTouchStart={handleControlsMouseEnter}
          onTouchEnd={handleControlsMouseLeave}
          onPointerDown={handleControlsMouseEnter}
          onPointerUp={handleControlsMouseLeave}
        >
          {/* Zoom Controls */}
          <div className="floating-ctrl-group">
            <button
              type="button"
              className="floating-btn"
              onClick={zoomIn}
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              className="floating-btn"
              onClick={zoomOut}
              title="Zoom Out (−)"
              aria-label="Zoom Out"
            >
              −
            </button>
          </div>

          {/* Location & Reset Controls */}
          <div className="floating-ctrl-group">
            <button
              type="button"
              className="floating-btn"
              onClick={handleLocateMe}
              title="Center on My Live Location (GPS)"
              aria-label="My Location"
            >
              <Crosshair size={16} />
            </button>
            <button
              type="button"
              className="floating-btn"
              onClick={handleResetToIndore}
              title="Reset center to Indore Hub"
              aria-label="Reset Center"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Active Need Floating Card (If selected) */}
        {activeNeed && (
          <div className="livemap-need-drawer">
            <div className="drawer-header">
              <div className="drawer-title-row">
                <span className="drawer-emoji">{activeNeed.emoji}</span>
                <div>
                  <h4 className="drawer-title">{activeNeed.title}</h4>
                  <span className="drawer-sub">
                    📍 {activeNeed.location} •{' '}
                    <strong className="dist-accent">
                      {calculateDistanceKm(centerCoords[0], centerCoords[1], activeNeed.lat, activeNeed.lng)} km away
                    </strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setActiveNeed(null)}
                title="Close preview"
              >
                <X size={15} />
              </button>
            </div>

            {activeNeed.description && <p className="drawer-desc">{activeNeed.description}</p>}

            <div className="drawer-actions">
              <button
                type="button"
                className="drawer-btn-volunteer"
                onClick={() => {
                  if (onVolunteer) onVolunteer(activeNeed);
                  if (onToast) onToast(`🤝 Thank you for offering help for "${activeNeed.title}"!`);
                }}
              >
                🤝 Offer Help
              </button>
              <a
                className="drawer-btn-gmaps"
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeNeed.lat},${activeNeed.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={13} />
                Open Directions
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer Legend & Info ─────────────────────────────────────────────── */}
      <div className="livemap-footer-bar">
        {/* Compact Click-to-Open Category List Dropdown */}
        <div className="footer-category-dropdown-wrap" ref={categoryMenuRef}>
          <button
            type="button"
            className={`footer-category-trigger-btn ${selectedCategory !== 'All' ? 'active-filter' : ''}`}
            onClick={() => setShowCategoryMenu((prev) => !prev)}
            aria-expanded={showCategoryMenu}
            title="Click to view and filter categories"
          >
            <span className="trigger-icon">🏷️</span>
            <span className="trigger-label">
              <strong>Categories:</strong>{' '}
              {selectedCategory === 'All'
                ? 'All Categories (7)'
                : `${CATEGORY_ITEMS.find((c) => c.label === selectedCategory)?.emoji || ''} ${selectedCategory}`}
            </span>
            <ChevronDown size={14} className={`trigger-chevron ${showCategoryMenu ? 'open' : ''}`} />
          </button>

          {/* Floating Dropdown List of Categories */}
          {showCategoryMenu && (
            <div className="footer-category-menu">
              <div className="category-menu-header">
                <span>Filter by Category</span>
                <button
                  type="button"
                  className="category-menu-close"
                  onClick={() => setShowCategoryMenu(false)}
                  title="Close Menu"
                >
                  ✕
                </button>
              </div>
              <div className="category-menu-list">
                {CATEGORY_ITEMS.map((cat) => {
                  const isSelected = selectedCategory === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      className={`category-menu-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedCategory(cat.label);
                        setShowCategoryMenu(false);
                        if (onToast) {
                          onToast(cat.label === 'All' ? '🌐 Showing all categories' : `🏷️ Filtered by ${cat.emoji} ${cat.label}`);
                        }
                      }}
                    >
                      <span className="cat-item-left">
                        <span className="cat-color-dot" style={{ background: cat.color }} />
                        <span className="cat-emoji">{cat.emoji}</span>
                        <span className="cat-name">{cat.label === 'All' ? 'All Categories (7)' : cat.label}</span>
                      </span>
                      {isSelected && <Check size={14} className="cat-check" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="footer-autofit-toggle">
          <label className="autofit-label">
            <input
              type="checkbox"
              checked={autoFitBounds}
              onChange={(e) => setAutoFitBounds(e.target.checked)}
            />
            <span>Auto-fit circle on distance change</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
