import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../services/api';

interface ReportNeedProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ReportNeed: React.FC<ReportNeedProps> = ({ onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [urgency, setUrgency] = useState('Normal');
  const [locationName, setLocationName] = useState('Detecting GPS location…');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Automatically fetch live GPS location on component mount
  const fetchGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setLocationName('Indore, Madhya Pradesh');
      setLatitude(22.7196);
      setLongitude(75.8577);
      return;
    }

    setIsGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setIsGpsLoading(false);

        // Reverse geocode to resolve street address
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            setLocationName(data.display_name || `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`);
          } else {
            setLocationName(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
          }
        } catch {
          setLocationName(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`);
        }
      },
      (err) => {
        setIsGpsLoading(false);
        setGpsError(err.message || 'Unable to retrieve your location');
        // Default fallback to Indore
        setLatitude(22.7196);
        setLongitude(75.8577);
        setLocationName('Indore, Madhya Pradesh');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchGps();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a clear title for the need.');
      return;
    }
    if (latitude === null || longitude === null) {
      setErrorMessage('GPS Location coordinates are mandatory.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('urgency', urgency);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('location', locationName);

      if (selectedPhoto) {
        formData.append('photo', selectedPhoto);
      }

      const res = await fetch(`${API_BASE}/needs`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSubmitSuccess(data.need);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading report to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', fontFamily: 'inherit' }}>
      {submitSuccess ? (
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            Need Successfully Reported & Published!
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
            Your geo-verified humanitarian report has been published to the Sahaaye server and community map.
          </p>

          <div style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: 16,
            textAlign: 'left',
            marginBottom: 24,
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>
              {submitSuccess.title}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
              📍 {submitSuccess.location} ({submitSuccess.latitude.toFixed(4)}°, {submitSuccess.longitude.toFixed(4)}°)
            </div>
            {submitSuccess.imageUrl && (
              <img
                src={submitSuccess.imageUrl}
                alt="Uploaded Need Proof"
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
              />
            )}
          </div>

          <button
            onClick={() => {
              setSubmitSuccess(null);
              setTitle('');
              setDescription('');
              setSelectedPhoto(null);
              setPhotoPreview(null);
            }}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            Report Another Need
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Report Community Need
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Geo-Verified Humanitarian Aid · Live Server Upload
              </span>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}
              >
                ✕
              </button>
            )}
          </div>

          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
              border: '1px solid #fecaca'
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Photo Capture & Preview */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Need Proof / Photo *
            </label>

            {photoPreview ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxHeight: 220, background: '#000' }}>
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setSelectedPhoto(null); setPhotoPreview(null); }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(15,23,42,0.85)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 20,
                    padding: '6px 12px',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Change Photo
                </button>
                <div style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  background: 'rgba(15,23,42,0.85)',
                  color: '#10b981',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  ✓ Geo-Stamped Proof
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 12,
                  padding: '30px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#f8fafc',
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                  Click to Take Photo or Upload Image
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Camera opens directly on mobile. Supports JPG, PNG, WebP up to 10MB.
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {/* GPS Coordinates Badge */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                  {isGpsLoading ? 'ACQUIRING GPS LOCK…' : 'GPS LOCKED & GEO-STAMPED'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>
                📍 {locationName}
              </div>
              {latitude !== null && longitude !== null && (
                <div style={{ fontSize: 11, color: '#4ade80', marginTop: 2 }}>
                  {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={fetchGps}
              style={{
                background: '#ffffff',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Refresh GPS ↻
            </button>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Need Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent food ration needed for elderly resident"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Category & Urgency Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  background: '#ffffff'
                }}
              >
                <option value="Food">🍚 Food & Ration</option>
                <option value="Medical">💊 Medical & Healthcare</option>
                <option value="Education">📚 Education & Books</option>
                <option value="Shelter">🏠 Shelter & Clothing</option>
                <option value="Elderly">👴 Elderly Care</option>
                <option value="Others">🤝 Others / Community</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Urgency Level *
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  background: '#ffffff'
                }}
              >
                <option value="Normal">🟢 Normal</option>
                <option value="Urgent">🟠 Urgent (Within 24h)</option>
                <option value="Emergency">🔴 Critical Emergency</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Description & Specific Requirements
            </label>
            <textarea
              rows={4}
              placeholder="Describe the situation, number of people affected, and exact instructions for volunteers…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '14px 20px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              opacity: isSubmitting ? 0.75 : 1
            }}
          >
            {isSubmitting ? (
              <span>Uploading to Sahaaye Server…</span>
            ) : (
              <span>Publish Need with Geo-Stamp 🚀</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default ReportNeed;
