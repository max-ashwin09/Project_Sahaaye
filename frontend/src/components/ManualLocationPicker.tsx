import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, Check } from 'lucide-react';

interface ManualLocationPickerProps {
  initialLat: number;
  initialLng: number;
  onConfirm: (lat: number, lng: number) => void;
  onCancel: () => void;
}

export const ManualLocationPicker: React.FC<ManualLocationPickerProps> = ({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
}) => {
  const [selectedCoords, setSelectedCoords] = useState<[number, number]>([initialLat, initialLng]);
  const [addressPreview, setAddressPreview] = useState<string>('Resolving address…');
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Reverse geocode preview
  const fetchAddress = async (lat: number, lng: number) => {
    setIsResolving(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
      );
      if (res.ok) {
        const data = await res.json();
        setAddressPreview(data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`);
      }
    } catch {
      setAddressPreview(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: selectedCoords,
      zoom: 15,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'manual-pin-icon-wrap',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #2563eb;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 14px rgba(37,99,235,0.45);
          border: 3px solid #ffffff;
          cursor: grab;
        ">
          📍
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const marker = L.marker(selectedCoords, {
      draggable: true,
      icon: pinIcon,
    }).addTo(map);

    marker.bindTooltip('<b>Drag me</b> or tap anywhere on map', {
      direction: 'top',
      offset: [0, -16],
    }).openTooltip();

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      setSelectedCoords([pos.lat, pos.lng]);
      fetchAddress(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setSelectedCoords([lat, lng]);
      fetchAddress(lat, lng);
    });

    fetchAddress(selectedCoords[0], selectedCoords[1]);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16,
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 580,
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #cbd5e1',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              🗺️ Pick Need Location on Map
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Tap map or drag pin to pinpoint exact location
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Map Container */}
        <div style={{ position: 'relative', width: '100%', height: 320, background: '#f8fafc' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Address & Coords Footer */}
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
            📍 {isResolving ? 'Resolving address…' : addressPreview}
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 14 }}>
            Coordinates: {selectedCoords[0].toFixed(5)}° N, {selectedCoords[1].toFixed(5)}° E
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedCoords[0], selectedCoords[1])}
              style={{
                background: '#2563eb',
                border: 'none',
                borderRadius: 10,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Check size={16} />
              Set this Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
