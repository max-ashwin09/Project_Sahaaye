import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Crosshair,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Compass,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

// ─── TYPES ───────────────────────────────────────────────────────────────────
export interface MapAidNeed {
  id: string;
  title: string;
  category: 'Food' | 'Medical' | 'Education' | 'Shelter' | 'Elderly' | 'Others';
  lat: number;
  lng: number;
  locationName: string;
  timeAgo: string;
  urgency: 'high' | 'medium' | 'low';
  beneficiary: string;
  contactMasked: string;
  description: string;
  emoji: string;
}

export const INDORE_NEEDS: MapAidNeed[] = [
  {
    id: 'n1',
    title: 'Food Ration for 4 Families',
    category: 'Food',
    lat: 22.7533,
    lng: 75.8937,
    locationName: 'Vijay Nagar, Scheme 54',
    timeAgo: '15 mins ago',
    urgency: 'high',
    beneficiary: 'Daily wage worker families',
    contactMasked: '+91 98*** ***12',
    description: 'Requires dry ration kit (flour, rice, dal) for 4 stranded families.',
    emoji: '🍚',
  },
  {
    id: 'n2',
    title: 'Urgent Insulin & BP Medicine',
    category: 'Medical',
    lat: 22.7244,
    lng: 75.8839,
    locationName: 'Old Palasia, near Geeta Bhawan',
    timeAgo: '35 mins ago',
    urgency: 'high',
    beneficiary: 'Senior citizen couple',
    contactMasked: '+91 97*** ***44',
    description: 'Elderly patient needs urgent prescription refill delivered.',
    emoji: '💊',
  },
  {
    id: 'n3',
    title: 'School Notebooks & Uniform',
    category: 'Education',
    lat: 22.7610,
    lng: 75.8890,
    locationName: 'Bhamori, Vijay Nagar',
    timeAgo: '1 hour ago',
    urgency: 'medium',
    beneficiary: 'Primary school student',
    contactMasked: '+91 91*** ***99',
    description: 'Class 4 child unable to attend school due to missing books.',
    emoji: '📚',
  },
  {
    id: 'n4',
    title: 'Night Shelter & Blankets',
    category: 'Shelter',
    lat: 22.7188,
    lng: 75.8576,
    locationName: 'Near Rajwada, Sarafa',
    timeAgo: '2 hours ago',
    urgency: 'high',
    beneficiary: '2 homeless individuals',
    contactMasked: '+91 94*** ***01',
    description: 'Temporary night shelter and clean blankets needed.',
    emoji: '🏠',
  },
  {
    id: 'n5',
    title: 'Elderly Mobility Assistance',
    category: 'Elderly',
    lat: 22.6950,
    lng: 75.8450,
    locationName: 'Annapurna Road, Sector B',
    timeAgo: '3 hours ago',
    urgency: 'medium',
    beneficiary: 'Retired teacher (82 yrs)',
    contactMasked: '+91 93*** ***67',
    description: 'Assistance needed to visit hospital for checkup.',
    emoji: '👴',
  },
  {
    id: 'n6',
    title: 'Student Hostel Food Aid',
    category: 'Food',
    lat: 22.6890,
    lng: 75.8670,
    locationName: 'Bhanwarkua, Tower Chouraha',
    timeAgo: '4 hours ago',
    urgency: 'low',
    beneficiary: 'Coaching student group',
    contactMasked: '+91 96*** ***23',
    description: 'Prepared meals needed for 6 competitive exam aspirants.',
    emoji: '🍱',
  },
  {
    id: 'n7',
    title: 'Dry Ration Pack',
    category: 'Food',
    lat: 22.7300,
    lng: 75.9100,
    locationName: 'Khajrana Ring Road',
    timeAgo: '5 hours ago',
    urgency: 'medium',
    beneficiary: 'Widow mother with 2 children',
    contactMasked: '+91 99*** ***55',
    description: 'Immediate grocery provisions required for single-mother household.',
    emoji: '🍲',
  },
  {
    id: 'n8',
    title: 'Emergency First Aid Kit',
    category: 'Medical',
    lat: 22.7310,
    lng: 75.8150,
    locationName: 'Airport Road, Kalani Nagar',
    timeAgo: '6 hours ago',
    urgency: 'medium',
    beneficiary: 'Local community volunteer',
    contactMasked: '+91 90*** ***78',
    description: 'Bandages, antiseptic and burn ointments for rescue unit.',
    emoji: '🩹',
  },
];

// Helper: Haversine distance in km
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
  return R * c;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#2563eb',
  Medical: '#e11d48',
  Education: '#0d9488',
  Shelter: '#f59e0b',
  Elderly: '#7c3aed',
  Others: '#64748b',
};

const TILE_LAYERS = {
  streets: {
    name: 'Google Streets Style',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  osm: {
    name: 'Detailed Road Network (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satellite View (Real Houses & Roofs)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
  },
};

interface LiveMapProps {
  onSelectNeed?: (need: MapAidNeed) => void;
  onToast?: (msg: string) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({ onSelectNeed, onToast }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  // Center location (Default: Indore center)
  const [center, setCenter] = useState<[number, number]>([22.7196, 75.8577]);
  const [centerName, setCenterName] = useState('Indore Center (Rajwada Area)');

  // Distance / Radius in KM
  const [distanceKm, setDistanceKm] = useState<number>(5);
  const [inputDistance, setInputDistance] = useState<string>('5');

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Map tile style
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'osm'>('streets');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Selected need popup
  const [activeNeed, setActiveNeed] = useState<MapAidNeed | null>(null);

  // Preset distance options
  const PRESET_DISTANCES = [1, 2, 3, 5, 10, 15];

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Tile Layer
    const tileConfig = TILE_LAYERS[mapStyle];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // Radius Circle
    const radiusMeters = distanceKm * 1000;
    const circle = L.circle(center, {
      radius: radiusMeters,
      color: '#0d9488',
      fillColor: '#0d9488',
      fillOpacity: 0.14,
      weight: 2.5,
      dashArray: '6, 8',
    }).addTo(map);
    circleRef.current = circle;

    // Center "You are here / Center" Marker
    const centerIcon = L.divIcon({
      className: 'livemap-center-pin',
      html: `
        <div class="center-marker-container">
          <div class="center-pulse-ring"></div>
          <div class="center-core-dot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="5" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const centerMarker = L.marker(center, {
      icon: centerIcon,
      draggable: true,
      title: 'Drag me to change search center!',
    }).addTo(map);

    centerMarker.on('dragend', () => {
      const newPos = centerMarker.getLatLng();
      setCenter([newPos.lat, newPos.lng]);
      setCenterName(`Custom Location (${newPos.lat.toFixed(3)}, ${newPos.lng.toFixed(3)})`);
      onToast?.(`Search center updated to ${newPos.lat.toFixed(3)}, ${newPos.lng.toFixed(3)}`);
    });

    centerMarkerRef.current = centerMarker;

    // Markers layer group
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Click anywhere on map to reposition center
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickedLat = e.latlng.lat;
      const clickedLng = e.latlng.lng;
      setCenter([clickedLat, clickedLng]);
      setCenterName(`Selected Point (${clickedLat.toFixed(3)}, ${clickedLng.toFixed(3)})`);
      onToast?.(`📍 Search center moved! Radius: ${distanceKm} km`);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Handle Tile Layer Switch
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }
    const tileConfig = TILE_LAYERS[mapStyle];
    const newLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
    currentTileLayerRef.current = newLayer;
  }, [mapStyle]);

  // 3. Update Radius Circle when center or distance changes
  useEffect(() => {
    if (!circleRef.current || !mapInstanceRef.current) return;
    const radiusMeters = distanceKm * 1000;
    circleRef.current.setLatLng(center);
    circleRef.current.setRadius(radiusMeters);

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng(center);
    }

    // Smoothly fly map to fit the circle
    try {
      mapInstanceRef.current.flyToBounds(circleRef.current.getBounds(), {
        padding: [35, 35],
        maxZoom: 16,
        duration: 0.7,
      });
    } catch {
      // Ignore if container is transitioning
    }
  }, [distanceKm, center]);

  // 4. Update Need Markers on the Map
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    // Filter by category
    const filteredNeeds = INDORE_NEEDS.filter((need) => {
      if (selectedCategory !== 'All' && need.category !== selectedCategory) {
        return false;
      }
      return true;
    });

    filteredNeeds.forEach((need) => {
      const dist = calculateDistanceKm(center[0], center[1], need.lat, need.lng);
      const isInside = dist <= distanceKm;
      const color = CATEGORY_COLORS[need.category] || '#2563eb';

      const markerHtml = `
        <div class="custom-need-marker ${isInside ? 'in-range' : 'out-range'}" style="--marker-color: ${color};">
          <div class="marker-pin" style="background: ${color};">
            <span class="marker-emoji">${need.emoji}</span>
          </div>
          <div class="marker-dist-tag">${dist.toFixed(1)} km</div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'need-div-icon',
        html: markerHtml,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -48],
      });

      const marker = L.marker([need.lat, need.lng], { icon: markerIcon });

      // Custom Leaflet Popup
      const popupHtml = `
        <div class="need-map-popup">
          <div class="popup-header" style="background: ${color}15; border-bottom: 2px solid ${color};">
            <span class="popup-category" style="color: ${color}; font-weight: 700;">
              ${need.emoji} ${need.category}
            </span>
            <span class="popup-dist" style="background: ${color}; color: white;">
              ${dist.toFixed(1)} km away
            </span>
          </div>
          <div class="popup-body">
            <h4 class="popup-title">${need.title}</h4>
            <p class="popup-loc">📍 ${need.locationName}</p>
            <p class="popup-desc">${need.description}</p>
            <div class="popup-footer">
              <span class="popup-urgency ${need.urgency}">● ${need.urgency.toUpperCase()} PRIORITY</span>
              <span class="popup-time">${need.timeAgo}</span>
            </div>
            <button class="popup-action-btn" id="popup-btn-${need.id}" style="background: ${color};">
              Help This Beneficiary →
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'sahaaye-custom-leaflet-popup',
        maxWidth: 280,
      });

      marker.on('popupopen', () => {
        setActiveNeed(need);
        const btn = document.getElementById(`popup-btn-${need.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectNeed?.(need);
            onToast?.(`You pledged to help: ${need.title}! 🙏`);
          };
        }
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [distanceKm, center, selectedCategory, onSelectNeed, onToast]);

  // Manual Distance Submit
  const handleManualDistanceApply = (valStr: string) => {
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      setDistanceKm(parsed);
      setInputDistance(valStr);
      onToast?.(`Radius set to ${parsed} km ⭕`);
    } else {
      onToast?.('Please enter a valid distance between 0.5 km and 100 km');
    }
  };

  // Re-center on Indore default
  const handleRecenter = () => {
    setCenter([22.7196, 75.8577]);
    setCenterName('Indore Center (Rajwada Area)');
    onToast?.('Re-centered to Indore City Center 🎯');
  };

  // Map controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Needs count inside current radius
  const needsInsideCount = INDORE_NEEDS.filter((n) => {
    if (selectedCategory !== 'All' && n.category !== selectedCategory) return false;
    return calculateDistanceKm(center[0], center[1], n.lat, n.lng) <= distanceKm;
  }).length;

  return (
    <div className={`livemap-card-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Header & Controls Bar */}
      <div className="livemap-header">
        <div className="livemap-title-group">
          <div className="livemap-badge">
            <span className="live-dot"></span>
            LIVE RADAR
          </div>
          <div>
            <h3 className="livemap-title">Interactive Live Map</h3>
            <p className="livemap-subtitle">
              Highways, roads & buildings view with distance-wise search circle
            </p>
          </div>
        </div>

        {/* Category & Layer Selectors */}
        <div className="livemap-top-actions">
          {/* Map Layer Switcher */}
          <div className="layer-switcher-pills">
            <button
              className={`layer-pill ${mapStyle === 'streets' ? 'active' : ''}`}
              onClick={() => setMapStyle('streets')}
              title="Google style streets & roads"
            >
              <Compass size={13} />
              <span>Streets</span>
            </button>
            <button
              className={`layer-pill ${mapStyle === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapStyle('satellite')}
              title="Real satellite imagery of houses & buildings"
            >
              <Layers size={13} />
              <span>Satellite</span>
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            className="livemap-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Needs ({INDORE_NEEDS.length})</option>
            <option value="Food">🍚 Food</option>
            <option value="Medical">💊 Medical</option>
            <option value="Education">📚 Education</option>
            <option value="Shelter">🏠 Shelter</option>
            <option value="Elderly">👴 Elderly Care</option>
          </select>
        </div>
      </div>

      {/* ── DISTANCE / RADIUS CONTROLS ── */}
      <div className="livemap-distance-bar">
        <div className="distance-label-wrap">
          <MapPin size={15} color="#0d9488" />
          <span className="distance-title">Distance Radius:</span>
          <span className="distance-highlight">{distanceKm} km</span>
        </div>

        {/* Preset Chips */}
        <div className="distance-presets">
          {PRESET_DISTANCES.map((km) => (
            <button
              key={km}
              className={`preset-btn ${distanceKm === km ? 'active' : ''}`}
              onClick={() => {
                setDistanceKm(km);
                setInputDistance(String(km));
                onToast?.(`Distance set to ${km} km`);
              }}
            >
              {km} km
            </button>
          ))}
        </div>

        {/* Manual Distance Input */}
        <div className="manual-distance-form">
          <label htmlFor="manual-dist-input" className="manual-dist-label">
            Custom:
          </label>
          <div className="manual-input-box">
            <input
              id="manual-dist-input"
              type="number"
              step="0.5"
              min="0.5"
              max="50"
              value={inputDistance}
              onChange={(e) => setInputDistance(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualDistanceApply(inputDistance);
                }
              }}
              placeholder="e.g. 7"
              className="dist-number-input"
            />
            <span className="dist-unit">km</span>
            <button
              type="button"
              className="apply-dist-btn"
              onClick={() => handleManualDistanceApply(inputDistance)}
              title="Apply custom distance"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Range Slider for Smooth Resizing */}
        <div className="dist-slider-wrap">
          <input
            type="range"
            min="0.5"
            max="25"
            step="0.5"
            value={distanceKm}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setDistanceKm(val);
              setInputDistance(String(val));
            }}
            className="dist-range-slider"
            title="Slide to dynamically expand/contract map circle"
          />
        </div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <div className="livemap-viewport-box">
        <div ref={mapContainerRef} className="leaflet-map-element" />

        {/* Floating Live Radar HUD */}
        <div className="map-hud-pill">
          <span className="hud-radar-dot"></span>
          <span className="hud-text">
            <strong>{needsInsideCount} Needs</strong> inside <strong>{distanceKm} km</strong> circle
          </span>
          <span className="hud-divider">•</span>
          <span className="hud-sub">Click map to move center</span>
        </div>

        {/* On-Map Action Controls */}
        <div className="map-floating-controls">
          <button
            className="map-float-btn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus size={16} />
          </button>
          <button
            className="map-float-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus size={16} />
          </button>
          <button
            className="map-float-btn"
            onClick={handleRecenter}
            title="Re-center to Indore"
            aria-label="Re-center"
          >
            <Crosshair size={16} />
          </button>
          <button
            className="map-float-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Mini Tip at bottom */}
        <div className="map-touch-helper-tip">
          <span>🖐️ Touchable & Draggable • Drag center pin or click anywhere to change location</span>
        </div>
      </div>

      {/* ── CATEGORY LEGEND BAR ── */}
      <div className="livemap-legend-bar">
        <div className="legend-items-list">
          {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
            <button
              key={cat}
              className={`legend-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? 'All' : cat)}
            >
              <span className="legend-circle-color" style={{ background: col }} />
              <span>{cat}</span>
            </button>
          ))}
        </div>
        <div className="legend-current-center">
          <MapPin size={12} color="#0d9488" />
          <span>{centerName}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
