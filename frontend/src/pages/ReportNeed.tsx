import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  Video,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  MapPin,
  RefreshCw,
  AlertCircle,
  FileText,
  Layers,
  Sparkles,
  Play,
  Trash2,
  ShieldCheck,
  Building,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { TRANSLATIONS } from '../utils/i18n';
import { useLanguageStore } from '../stores/useLanguageStore';
import { useSelectedLocation } from '../hooks/useSelectedLocation';
import { LiveCameraModal, CameraMediaItem } from '../components/LiveCameraModal';
import { reverseGeocodeToLocation } from '../services/geocoding';

interface ReportNeedProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onViewOnMap?: (lat: number, lng: number) => void;
}

const DRAFT_STORAGE_KEY = 'sahaaye_draft';
const NEEDS_STORAGE_KEY = 'sahaaye_needs';

export const ReportNeed: React.FC<ReportNeedProps> = ({ onSuccess, onCancel, onViewOnMap }) => {
  const { lang } = useLanguageStore();
  const t = TRANSLATIONS[lang];
  const { city: headerCity } = useSelectedLocation();

  // ─── Wizard Step: 1 (Photo) -> 2 (Details) -> 3 (Location) -> 4 (Review) ──
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // ─── Step 1: Media Captures (Live Camera Only) ────────────────────────────
  const [mediaItems, setMediaItems] = useState<CameraMediaItem[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // ─── Step 2: Need Details ─────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);

  const [category, setCategory] = useState<string>('Food');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const [description, setDescription] = useState('');
  const [descError, setDescError] = useState<string | null>(null);

  // ─── Step 3: Location ─────────────────────────────────────────────────────
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    acc: number;
    address?: string;
  } | null>(null);
  const [landmark, setLandmark] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);

  // ─── Draft Restore Banner ─────────────────────────────────────────────────
  const [draftRestored, setDraftRestored] = useState(false);

  // ─── Submission & Success State ───────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedNeed, setSubmittedNeed] = useState<any | null>(null);

  // Categories list
  const CATEGORIES = useMemo(
    () => [
      { id: 'Food', label: t.catFood, icon: '🍚' },
      { id: 'Water', label: t.catWater, icon: '💧' },
      { id: 'Clothes and blankets', label: t.catClothes, icon: '👕' },
      { id: 'Medical', label: t.catMedical, icon: '💊' },
      { id: 'Shelter', label: t.catShelter, icon: '🏠' },
      { id: 'Education', label: t.catEducation, icon: '📚' },
      { id: 'Other', label: t.catOther, icon: '🤝' },
    ],
    [t]
  );

  // ─── 1. Load Draft on Mount ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title || parsed.desc || parsed.land || parsed.loc) {
          if (parsed.title) setTitle(parsed.title);
          if (parsed.cat) setCategory(parsed.cat);
          if (parsed.urg) setUrgency(parsed.urg);
          if (parsed.desc) setDescription(parsed.desc);
          if (parsed.land) setLandmark(parsed.land);
          if (parsed.loc) setLocation(parsed.loc);
          setDraftRestored(true);
        }
      }
    } catch {}
  }, []);

  // ─── 2. Auto-save Draft on Changes ────────────────────────────────────────
  useEffect(() => {
    if (submittedNeed) return;
    try {
      if (title || description || landmark || location) {
        const draftData = {
          title,
          cat: category,
          urg: urgency,
          desc: description,
          land: landmark,
          loc: location,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      }
    } catch {}
  }, [title, category, urgency, description, landmark, location, submittedNeed]);

  // Clear draft
  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setTitle('');
    setCategory('Food');
    setUrgency('Medium');
    setDescription('');
    setLandmark('');
    setLocation(null);
    setMediaItems([]);
    setDraftRestored(false);
    setCurrentStep(1);
    setTitleError(null);
    setDescError(null);
    setLocationError(null);
    setMediaError(null);
  };

  // ─── 3. Sync First Capture's Location to Step 3 ───────────────────────────
  useEffect(() => {
    if (mediaItems.length > 0 && !location) {
      const first = mediaItems[0];
      const initialLoc = {
        lat: first.lat,
        lng: first.lng,
        acc: first.acc,
        address: `${headerCity || 'Indore'}, MP`,
      };
      setLocation(initialLoc);

      // Attempt reverse geocode to human-friendly street / locality address
      reverseGeocodeToLocation(first.lat, first.lng)
        .then((res) => {
          if (res?.city) {
            const formatted = res.area ? `${res.area}, ${res.city}, ${res.state}` : `${res.city}, ${res.state}`;
            setLocation((prev) => (prev ? { ...prev, address: formatted } : prev));
          }
        })
        .catch(() => {});
    }
  }, [mediaItems, location, headerCity]);

  // ─── 4. Refresh Location Action ───────────────────────────────────────────
  const handleRefreshLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationError(t.gpsRequiredNotice);
      return;
    }

    setIsRefreshingGps(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsRefreshingGps(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const newLoc = {
          lat: latitude,
          lng: longitude,
          acc: Math.round(accuracy),
          address: `${headerCity || 'Indore'}, MP`,
        };
        setLocation(newLoc);

        try {
          const res = await reverseGeocodeToLocation(latitude, longitude);
          if (res?.city) {
            const formatted = res.area ? `${res.area}, ${res.city}, ${res.state}` : `${res.city}, ${res.state}`;
            setLocation((prev) => (prev ? { ...prev, address: formatted } : prev));
          }
        } catch {}
      },
      (err) => {
        setIsRefreshingGps(false);
        console.warn('Refresh location error:', err);
        setLocationError(t.gpsRequiredNotice);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 6000 }
    );
  }, [headerCity, t.gpsRequiredNotice]);

  // ─── 5. Step Validation & Navigation ──────────────────────────────────────
  const handleNext = () => {
    // Step 1 Validation: At least one photo/video required
    if (currentStep === 1) {
      if (mediaItems.length === 0) {
        setMediaError(t.noMediaError);
        return;
      }
      setMediaError(null);
      setCurrentStep(2);
      return;
    }

    // Step 2 Validation: Title min 3 chars, Desc max 500 chars
    if (currentStep === 2) {
      let hasError = false;
      if (!title || title.trim().length < 3) {
        setTitleError(t.titleMinError);
        hasError = true;
      } else {
        setTitleError(null);
      }

      if (description.length > 500) {
        setDescError(t.descMaxError);
        hasError = true;
      } else {
        setDescError(null);
      }

      if (hasError) return;
      setCurrentStep(3);
      return;
    }

    // Step 3 Validation: Location is required
    if (currentStep === 3) {
      if (!location || !location.lat || !location.lng) {
        setLocationError(t.locationRequiredError);
        return;
      }
      setLocationError(null);
      setCurrentStep(4);
      return;
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // ─── 6. Need Submission ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!location || mediaItems.length === 0 || title.trim().length < 3) return;

    setIsSubmitting(true);

    try {
      const now = new Date();
      const needId = `need_${Date.now()}`;

      // Photo base64 array & video count
      const photosBase64 = mediaItems
        .filter((m) => m.type === 'photo')
        .map((m) => m.dataUrl);
      const videosCount = mediaItems.filter((m) => m.type === 'video').length;

      const newNeed = {
        id: needId,
        title: title.trim(),
        cat: category,
        urg: urgency,
        desc: description.trim(),
        land: landmark.trim(),
        loc: {
          lat: location.lat,
          lng: location.lng,
          acc: location.acc,
          approxLat: Number(location.lat.toFixed(2)),
          approxLng: Number(location.lng.toFixed(2)),
          address: location.address || `${headerCity || 'Indore'}, MP`,
          city: headerCity || 'Indore',
        },
        photos: photosBase64,
        videos: videosCount,
        time: now.toISOString(),
        status: 'open' as const,
      };

      // 1. Save to localStorage "sahaaye_needs"
      const existingNeedsRaw = localStorage.getItem(NEEDS_STORAGE_KEY);
      let existingNeeds: any[] = [];
      try {
        if (existingNeedsRaw) existingNeeds = JSON.parse(existingNeedsRaw);
        if (!Array.isArray(existingNeeds)) existingNeeds = [];
      } catch {}

      existingNeeds.unshift(newNeed);
      localStorage.setItem(NEEDS_STORAGE_KEY, JSON.stringify(existingNeeds));

      // 2. Dispatch CustomEvent "sahaaye:need-submitted"
      window.dispatchEvent(
        new CustomEvent('sahaaye:need-submitted', {
          detail: newNeed,
        })
      );

      // 3. Clear draft
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      // 4. Update UI to success screen
      setSubmittedNeed(newNeed);
      setIsSubmitting(false);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Submission error:', err);
      setIsSubmitting(false);
    }
  };

  // ─── 7. Render Success Screen ─────────────────────────────────────────────
  if (submittedNeed) {
    return (
      <div
        className="report-need-modal-container"
        style={{
          maxWidth: '680px',
          margin: '24px auto',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          padding: '32px 24px',
          textAlign: 'center',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(13, 148, 136, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0d9488',
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={36} strokeWidth={2.2} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          {t.successTitle}
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.5 }}>
          {t.successSubtitle}
        </p>

        {/* Report ID & Details Pill Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            maxWidth: 440,
            margin: '0 auto 28px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>{t.reportIdLabel}:</span>
            <strong style={{ color: '#0d9488', fontFamily: 'monospace' }}>
              SHY-{submittedNeed.id.slice(-6).toUpperCase()}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>{t.categoryLabel}:</span>
            <strong style={{ color: '#0f172a' }}>{submittedNeed.cat}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>{t.urgencyLabel}:</span>
            <span
              style={{
                fontWeight: 700,
                color: submittedNeed.urg === 'High' ? '#dc2626' : '#0d9488',
              }}
            >
              {submittedNeed.urg}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
            }}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              background: '#0d9488',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 10px rgba(13, 148, 136, 0.3)',
            }}
          >
            <MapPin size={16} />
            <span>{t.viewInNearbyBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubmittedNeed(null);
              handleClearDraft();
            }}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              background: '#ffffff',
              color: '#334155',
              border: '1.5px solid #cbd5e1',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.reportAnotherBtn}
          </button>
        </div>
      </div>
    );
  }

  // ─── 8. Main 4-Step Modal ─────────────────────────────────────────────────
  return (
    <div
      className="report-need-modal-container"
      style={{
        maxWidth: '720px',
        margin: '18px auto',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Modal Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          background: '#ffffff',
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {lang === 'hi' ? 'ज़रूरत रिपोर्ट करें' : 'Report Community Need'}
          </h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {lang === 'hi' ? 'भू-सत्यापित सामाजिक सेवा' : 'Geo-verified social seva network'}
          </span>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            title={t.closeModal}
            aria-label={t.closeModal}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Restored Draft Banner ── */}
      {draftRestored && (
        <div
          style={{
            background: 'rgba(13, 148, 136, 0.09)',
            borderBottom: '1px solid rgba(13, 148, 136, 0.25)',
            padding: '9px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
            color: '#0f766e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Sparkles size={15} color="#0d9488" />
            <span>{t.draftRestoredBanner}</span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b91c1c',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {t.clearDraftBtn}
          </button>
        </div>
      )}

      {/* ── Stepper Indicator ── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          overflowX: 'auto',
        }}
      >
        {[
          { num: 1, label: t.step1 },
          { num: 2, label: t.step2 },
          { num: 3, label: t.step3 },
          { num: 4, label: t.step4 },
        ].map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;

          return (
            <div
              key={s.num}
              style={{
                flex: 1,
                minWidth: 120,
                padding: '12px 10px',
                textAlign: 'center',
                borderBottom: isActive ? '3px solid #0d9488' : '3px solid transparent',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0d9488' : isDone ? '#0f172a' : '#94a3b8',
                fontWeight: isActive ? 700 : 600,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: isActive ? '#0d9488' : isDone ? '#10b981' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                {isDone ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Step Body Content ── */}
      <div style={{ padding: '24px 20px', minHeight: '340px' }}>
        {/* ════ STEP 1: MEDIA (Live Camera Only) ════ */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {t.photoStepTitle}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                {t.photoStepSubtitle}
              </p>
            </div>

            {/* Single Prominent Live Camera Button */}
            <div style={{ textAlign: 'center', padding: '24px 16px', background: '#f8fafc', borderRadius: 14, border: '2px dashed #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                style={{
                  padding: '14px 28px',
                  borderRadius: 12,
                  background: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
                  transition: 'transform 0.1s ease',
                }}
              >
                <Camera size={20} />
                <span>{t.takePhotoVideoBtn}</span>
              </button>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '10px 0 0' }}>
                {lang === 'hi'
                  ? 'लाइव कैमरा खोलता है और हर फोटो पर GPS जियो-स्टैम्प दर्ज करता है (अधिकतम 5 आइटम)'
                  : 'Opens live full-screen camera and burns GPS coordinates into every photo (Max 5 captures)'}
              </p>
            </div>

            {/* Inline Error Message */}
            {mediaError && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{mediaError}</span>
              </div>
            )}

            {/* Captured Items Thumbnails */}
            {mediaItems.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {t.itemsCount} ({mediaItems.length}/5)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0d9488',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + {lang === 'hi' ? 'और जोड़ें' : 'Add more'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                  {mediaItems.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        position: 'relative',
                        height: 90,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1.5px solid #e2e8f0',
                        background: '#0f172a',
                      }}
                    >
                      <img
                        src={item.dataUrl}
                        alt={`Capture ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {item.type === 'video' && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(220, 38, 38, 0.9)',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {t.videoBadge}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMediaItems((prev) => prev.filter((m) => m.id !== item.id));
                        }}
                        title={t.removeMediaBtn}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 2: DETAILS ════ */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ marginBottom: 4 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {t.detailsStepTitle}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                {t.detailsStepSubtitle}
              </p>
            </div>

            {/* Need Title (min 3 chars) */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {t.titleLabel}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError && e.target.value.trim().length >= 3) {
                    setTitleError(null);
                  }
                }}
                placeholder={t.titlePlaceholder}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: titleError ? '1.5px solid #dc2626' : '1.5px solid #cbd5e1',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {titleError && (
                <span style={{ display: 'block', color: '#dc2626', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                  {titleError}
                </span>
              )}
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {t.categoryLabel}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: category === cat.id ? '2px solid #0d9488' : '1px solid #e2e8f0',
                      background: category === cat.id ? '#f0fdfa' : '#ffffff',
                      color: category === cat.id ? '#0d9488' : '#334155',
                      fontSize: 12.5,
                      fontWeight: category === cat.id ? 700 : 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency Chips: Low, Medium, High (High in red!) */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {t.urgencyLabel}
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Low Chip */}
                <button
                  type="button"
                  onClick={() => setUrgency('Low')}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: urgency === 'Low' ? '2px solid #10b981' : '1px solid #e2e8f0',
                    background: urgency === 'Low' ? '#ecfdf5' : '#ffffff',
                    color: urgency === 'Low' ? '#047857' : '#64748b',
                    fontSize: 13,
                    fontWeight: urgency === 'Low' ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  🟢 {t.urgencyLow}
                </button>

                {/* Medium Chip */}
                <button
                  type="button"
                  onClick={() => setUrgency('Medium')}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: urgency === 'Medium' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    background: urgency === 'Medium' ? '#fffbeb' : '#ffffff',
                    color: urgency === 'Medium' ? '#b45309' : '#64748b',
                    fontSize: 13,
                    fontWeight: urgency === 'Medium' ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  🟡 {t.urgencyMedium}
                </button>

                {/* High Chip (Styled specifically in RED as requested!) */}
                <button
                  type="button"
                  onClick={() => setUrgency('High')}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: urgency === 'High' ? '2px solid #dc2626' : '1px solid #fecaca',
                    background: urgency === 'High' ? '#fef2f2' : '#ffffff',
                    color: '#dc2626',
                    fontSize: 13,
                    fontWeight: urgency === 'High' ? 800 : 600,
                    cursor: 'pointer',
                    boxShadow: urgency === 'High' ? '0 0 10px rgba(220, 38, 38, 0.2)' : 'none',
                  }}
                >
                  🔴 {t.urgencyHigh}
                </button>
              </div>
            </div>

            {/* Description (max 500 chars) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                  {t.descriptionLabel}
                </label>
                <span style={{ fontSize: 12, color: description.length > 500 ? '#dc2626' : '#94a3b8' }}>
                  {description.length} / 500 {t.descCharCount}
                </span>
              </div>
              <textarea
                rows={4}
                value={description}
                maxLength={500}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (descError && e.target.value.length <= 500) setDescError(null);
                }}
                placeholder={t.descriptionPlaceholder}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: descError ? '1.5px solid #dc2626' : '1.5px solid #cbd5e1',
                  fontSize: 13.5,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              {descError && (
                <span style={{ display: 'block', color: '#dc2626', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                  {descError}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ════ STEP 3: LOCATION ════ */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {t.locationStepTitle}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                {t.locationStepSubtitle}
              </p>
            </div>

            {/* GPS Locked Card */}
            <div
              style={{
                borderRadius: 12,
                border: '1.5px solid #0d9488',
                background: '#f0fdfa',
                padding: '16px 18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 8px #10b981',
                    }}
                  />
                  <strong style={{ fontSize: 12, color: '#0f766e', letterSpacing: 0.5 }}>
                    {location ? t.gpsCardLocked : t.gpsCardAcquiring}
                  </strong>
                </div>

                {/* Refresh Location Button */}
                <button
                  type="button"
                  onClick={handleRefreshLocation}
                  disabled={isRefreshingGps}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#ffffff',
                    border: '1px solid #0d9488',
                    color: '#0d9488',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isRefreshingGps ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <RefreshCw size={13} className={isRefreshingGps ? 'spin' : ''} />
                  <span>{t.refreshLocationBtn}</span>
                </button>
              </div>

              {location ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                    📍 {location.address || `${headerCity || 'Indore'}, MP`}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    {t.exactCoordsLabel}:{' '}
                    <strong>
                      {location.lat.toFixed(5)}°, {location.lng.toFixed(5)}°
                    </strong>{' '}
                    • {t.accuracyLabel}: ±{location.acc}m
                  </div>
                  <div style={{ fontSize: 12, color: '#0d9488', marginTop: 4 }}>
                    {t.approxCoordsLabel}:{' '}
                    <strong>
                      {location.lat.toFixed(2)}°, {location.lng.toFixed(2)}°
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {t.gpsCardAcquiring}
                </div>
              )}
            </div>

            {/* Optional Landmark Text Field */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {t.landmarkLabel}
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder={t.landmarkPlaceholder}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Public View Dignity Notice */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 12,
                color: '#64748b',
                lineHeight: 1.4,
              }}
            >
              {t.approximateNotice}
            </div>

            {locationError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{locationError}</span>
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 4: REVIEW ════ */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {t.reviewStepTitle}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                {t.reviewStepSubtitle}
              </p>
            </div>

            {/* Media Thumbnails Strip */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                {t.reviewPhotosTitle} ({mediaItems.length})
              </label>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {mediaItems.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      position: 'relative',
                      border: '1.5px solid #0d9488',
                      background: '#0f172a',
                    }}
                  >
                    <img
                      src={item.dataUrl}
                      alt={`Thumb ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {item.type === 'video' && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Play size={14} color="#ffffff" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Details Card */}
            <div
              style={{
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  {t.titleLabel}
                </span>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {t.categoryLabel}
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{category}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {t.urgencyLabel}
                  </span>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: urgency === 'High' ? '#dc2626' : urgency === 'Medium' ? '#d97706' : '#10b981',
                    }}
                  >
                    {urgency}
                  </div>
                </div>
              </div>

              {description && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {t.descriptionLabel}
                  </span>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>{description}</div>
                </div>
              )}

              {landmark && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {t.landmarkLabel}
                  </span>
                  <div style={{ fontSize: 13, color: '#334155' }}>📍 {landmark}</div>
                </div>
              )}

              {location && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {t.reviewLocationTitle}
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0d9488' }}>
                    {location.address || `${headerCity || 'Indore'}, MP`}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    GPS: {location.lat.toFixed(5)}°, {location.lng.toFixed(5)}° (±{location.acc}m)
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Footer Bar: Back & Next / Submit ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              background: '#f1f5f9',
              border: 'none',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ChevronLeft size={16} />
            <span>{t.backBtn}</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              background: '#0d9488',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
            }}
          >
            <span>{t.nextBtn}</span>
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '11px 24px',
              borderRadius: 10,
              background: '#0d9488',
              color: '#ffffff',
              border: 'none',
              fontSize: 14,
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
            }}
          >
            <span>{isSubmitting ? t.submittingNeed : t.submitNeedBtn}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      {/* ── Fullscreen Live Camera Modal ── */}
      <LiveCameraModal
        isOpen={isCameraOpen}
        initialItems={mediaItems}
        onClose={() => setIsCameraOpen(false)}
        onDone={(items) => {
          setMediaItems(items);
          if (items.length > 0) setMediaError(null);
        }}
      />
    </div>
  );
};

export default ReportNeed;
