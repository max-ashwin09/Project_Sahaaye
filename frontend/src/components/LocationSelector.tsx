import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  ChevronDown,
  Search,
  Crosshair,
  Loader2,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { useLocationStore, CityDoc, SavedLocationItem } from '../stores/useLocationStore';
import { getShortState } from '../utils/geohash';
import {
  searchLocationsNominatim,
  reverseGeocodeToLocation,
  CITY_AREAS,
  AutocompleteResult,
} from '../services/geocoding';
import { SavedLocations } from './SavedLocations';
import { CityWaitlistModal } from './CityWaitlistModal';

interface LocationSelectorProps {
  onToast?: (msg: string) => void;
}

const RADIUS_OPTIONS = [
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: 'Whole city', value: 0 },
];

export const LocationSelector: React.FC<LocationSelectorProps> = ({ onToast }) => {
  const location = useLocationStore((s) => s.location);
  const setLocation = useLocationStore((s) => s.setLocation);
  const setRadius = useLocationStore((s) => s.setRadius);
  const setArea = useLocationStore((s) => s.setArea);
  const cities = useLocationStore((s) => s.cities);
  const recentLocations = useLocationStore((s) => s.recentLocations);
  const fetchCities = useLocationStore((s) => s.fetchCities);
  const setDetectedPrompt = useLocationStore((s) => s.setDetectedPrompt);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AutocompleteResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [waitlistCity, setWaitlistCity] = useState<CityDoc | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch live cities list on mount
  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  // Initial detection: if user hasn't explicitly set location and no prompt dismissed yet
  useEffect(() => {
    const hasPrompted = sessionStorage.getItem('sahaaye_geo_prompted');
    if (!hasPrompted && navigator.geolocation) {
      sessionStorage.setItem('sahaaye_geo_prompted', 'true');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const detected = await reverseGeocodeToLocation(
              pos.coords.latitude,
              pos.coords.longitude
            );
            if (
              detected.city.toLowerCase() !== location.city.toLowerCase() ||
              detected.state.toLowerCase() !== location.state.toLowerCase()
            ) {
              setDetectedPrompt({
                show: true,
                city: detected.city,
                state: detected.state,
                lat: detected.lat,
                lng: detected.lng,
              });
            }
          } catch {}
        },
        () => {},
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [location.city, location.state, setDetectedPrompt]);

  // Close panel on outside click or Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Debounced search (300 ms)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setErrorMessage(null);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!val.trim() || val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocationsNominatim(val);
        setSearchResults(results);
      } catch {
        setErrorMessage('Failed to search locations. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // "Use my current location" handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingUser(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const loc = await reverseGeocodeToLocation(latitude, longitude, location.radiusKm);
          setLocation(loc);
          if (onToast) onToast(`📍 Location updated to ${loc.city}, ${getShortState(loc.state)}`);
          setIsOpen(false);
        } catch {
          setErrorMessage('Could not resolve current address. Using GPS coordinates.');
        } finally {
          setIsLocatingUser(false);
        }
      },
      (err) => {
        setIsLocatingUser(false);
        if (err.code === 1) {
          setErrorMessage('Location permission denied. Please allow GPS access or search above.');
        } else if (err.code === 3) {
          setErrorMessage('Location request timed out. Please try searching your city.');
        } else {
          setErrorMessage('Unable to retrieve current location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Select a search result
  const handleSelectSearchResult = (result: AutocompleteResult) => {
    setLocation({
      city: result.city,
      state: result.state,
      area: result.area,
      lat: result.lat,
      lng: result.lng,
      radiusKm: location.radiusKm,
    });
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    if (onToast) onToast(`📍 Switched to ${result.displayName}`);
  };

  // Select a popular city
  const handleSelectCity = (city: CityDoc) => {
    if (!city.active) {
      setWaitlistCity(city);
      return;
    }

    setLocation({
      city: city.name,
      state: city.state,
      area: null,
      lat: city.lat,
      lng: city.lng,
      geohash: city.geohash,
      radiusKm: location.radiusKm,
    });
    setIsOpen(false);
    if (onToast) onToast(`📍 Showing needs in ${city.name}, ${getShortState(city.state)}`);
  };

  // Select an area inside current city
  const handleSelectArea = (areaName: string | null, lat?: number, lng?: number) => {
    setArea(areaName, lat, lng);
    setIsOpen(false);
    if (onToast) {
      onToast(
        areaName
          ? `📍 Focused on ${areaName}, ${location.city}`
          : `📍 Showing all ${location.city}`
      );
    }
  };

  // Select a saved location
  const handleSelectSaved = (saved: SavedLocationItem) => {
    setLocation({
      city: saved.city,
      state: saved.state,
      area: saved.area,
      lat: saved.lat,
      lng: saved.lng,
      geohash: saved.geohash,
      radiusKm: saved.radiusKm,
    });
    setIsOpen(false);
    if (onToast) onToast(`📍 Switched to ${saved.label} (${saved.city})`);
  };

  const availableAreas = CITY_AREAS[location.city] || [];
  const displayLabel = `${location.area ? `${location.area}, ` : ''}${location.city}, ${getShortState(
    location.state
  )}`;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* ─── HEADER PILL TRIGGER BUTTON (Original UI Style) ─────────────────── */}
      <button
        type="button"
        className="location-btn ripple-container"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setTimeout(() => searchInputRef.current?.focus(), 80);
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={`Change location (Currently: ${displayLabel})`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 50,
          background: 'var(--primary-light, #f0fdfa)',
          border: '1px solid rgba(13, 148, 136, 0.2)',
          color: 'var(--primary, #0d9488)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <svg
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* ─── DROPDOWN PANEL / MOBILE BOTTOM SHEET ──────────────────────────── */}
      {isOpen && (
        <>
          {/* Universal Backdrop (Closes panel and intercepts background clicks) */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: isMobile ? 'rgba(15, 23, 42, 0.45)' : 'transparent',
              backdropFilter: isMobile ? 'blur(2px)' : 'none',
              zIndex: 9998,
            }}
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-label="Location Selector"
            style={
              isMobile
                ? {
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
                    zIndex: 9999,
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    padding: '20px 18px',
                    animation: 'slideUp 0.25s ease-out',
                  }
                : {
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 'min(380px, calc(100vw - 24px))',
                    maxWidth: 'min(380px, calc(100vw - 24px))',
                    background: '#ffffff',
                    borderRadius: 16,
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 16px 40px -6px rgba(0, 0, 0, 0.2), 0 6px 16px rgba(0, 0, 0, 0.08)',
                    zIndex: 9999,
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: 16,
                    animation: 'fadeIn 0.15s ease-out',
                  }
            }
          >
            {/* Header with Title and Close button on Mobile */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} color="#0d9488" />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Choose Your Seva Area
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* 1. Search Bar */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search city, district, or area in India..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
              {isSearching && (
                <Loader2
                  size={15}
                  color="#0d9488"
                  className="spin-animation"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
              )}
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecdd3',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 12,
                  color: '#991b1b',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Search Results Display */}
            {searchQuery.trim().length >= 2 && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 6,
                  marginBottom: 14,
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {searchResults.length === 0 && !isSearching ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: 12.5, color: '#64748b' }}>
                    No matching cities or areas found in India.
                  </div>
                ) : (
                  searchResults.map((res) => (
                    <div
                      key={res.placeId}
                      onClick={() => handleSelectSearchResult(res)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        fontSize: 12.5,
                        color: '#1e293b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <MapPin size={14} color="#0d9488" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 500 }}>{res.displayName}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. "Use my current location" Action */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocatingUser}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 10,
                background: '#f0fdfa',
                border: '1.5px solid #99f6e4',
                color: '#0d9488',
                fontSize: 13,
                fontWeight: 600,
                cursor: isLocatingUser ? 'wait' : 'pointer',
                marginBottom: 14,
                transition: 'all 0.15s ease',
              }}
            >
              {isLocatingUser ? (
                <>
                  <Loader2 size={16} className="spin-animation" />
                  <span>Detecting GPS Location...</span>
                </>
              ) : (
                <>
                  <Crosshair size={16} />
                  <span>Use My Current Location</span>
                </>
              )}
            </button>

            {/* 3. Saved Locations (Home, Office, etc.) */}
            <SavedLocations onSelect={handleSelectSaved} />

            {/* 4. Radius Selector */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  marginBottom: 6,
                }}
              >
                Search Radius
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RADIUS_OPTIONS.map((opt) => {
                  const isSelected = location.radiusKm === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setRadius(opt.value)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                        background: isSelected ? '#f0fdfa' : '#ffffff',
                        color: isSelected ? '#0f766e' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Areas / Localities (if available for selected city) */}
            {availableAreas.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                    marginBottom: 6,
                  }}
                >
                  Localities in {location.city}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectArea(null)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 7,
                      fontSize: 11.5,
                      fontWeight: !location.area ? 700 : 500,
                      border: !location.area ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                      background: !location.area ? '#f0fdfa' : '#f8fafc',
                      color: !location.area ? '#0f766e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    All {location.city}
                  </button>

                  {availableAreas.map((area) => {
                    const isSelected = location.area === area.name;
                    return (
                      <button
                        key={area.name}
                        type="button"
                        onClick={() => handleSelectArea(area.name, area.lat, area.lng)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 7,
                          fontSize: 11.5,
                          fontWeight: isSelected ? 700 : 500,
                          border: isSelected ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                          background: isSelected ? '#f0fdfa' : '#f8fafc',
                          color: isSelected ? '#0f766e' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {area.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Popular Cities Chips */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  marginBottom: 6,
                }}
              >
                Popular Cities
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {cities.map((c) => {
                  const isSelected = location.city.toLowerCase() === c.name.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected
                          ? '1.5px solid #0d9488'
                          : c.active
                          ? '1px solid #e2e8f0'
                          : '1px dashed #cbd5e1',
                        background: isSelected
                          ? '#f0fdfa'
                          : c.active
                          ? '#ffffff'
                          : '#f8fafc',
                        color: isSelected
                          ? '#0f766e'
                          : c.active
                          ? '#1e293b'
                          : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>{c.name}</span>
                      {c.active ? (
                        <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
                          · {c.openNeedsCount} needs
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 9.5,
                            background: '#f1f5f9',
                            color: '#64748b',
                            padding: '1px 4px',
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7. Recent Locations */}
            {recentLocations.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Clock size={11} /> Recent Locations
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {recentLocations.map((r, i) => (
                    <button
                      key={`${r.city}_${r.area || ''}_${i}`}
                      type="button"
                      onClick={() => {
                        setLocation(r);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {r.area ? `${r.area}, ` : ''}{r.city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── CITY WAITLIST MODAL ────────────────────────────────────────────── */}
      {waitlistCity && (
        <CityWaitlistModal
          cityName={waitlistCity.name}
          stateName={waitlistCity.state}
          onClose={() => setWaitlistCity(null)}
          onSuccessToast={onToast}
        />
      )}
    </div>
  );
};
