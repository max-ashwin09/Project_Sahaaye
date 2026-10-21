import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  MapPin,
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  EyeOff,
  Languages,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { API_BASE } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useDuplicateCheck, DuplicateNeedMatch } from '../hooks/useDuplicateCheck';
import { compressImage, extractExifGps, calculateDistanceMeters } from '../utils/imageCompressor';
import { ManualLocationPicker } from '../components/ManualLocationPicker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { StatusTracker, NeedStatus, StatusHistoryEntry } from '../components/StatusTracker';
import { TRANSLATIONS, LanguageCode } from '../utils/i18n';
import { useSelectedLocation } from '../hooks/useSelectedLocation';

interface ReportNeedProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onViewOnMap?: (lat: number, lng: number) => void;
}

const DRAFT_KEY = 'sahaaye_report_need_draft_v1';

export const ReportNeed: React.FC<ReportNeedProps> = ({ onSuccess, onCancel, onViewOnMap }) => {
  // ─── Language & i18n ────────────────────────────────────────────────────────
  const [lang, setLang] = useState<LanguageCode>('en');
  const t = TRANSLATIONS[lang];
  const { city: headerCity } = useSelectedLocation();

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [urgency, setUrgency] = useState('Normal');
  const [peopleAffected, setPeopleAffected] = useState<number | ''>(1);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // ─── AI Auto-Fill State ─────────────────────────────────────────────────────
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

  // ─── Photo & EXIF State ─────────────────────────────────────────────────────
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [exifGpsMatch, setExifGpsMatch] = useState<'match' | 'mismatch' | 'none'>('none');
  const [exifDistanceMeters, setExifDistanceMeters] = useState<number | null>(null);

  // ─── UI & Submission State ──────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);

  // ─── Modals State ───────────────────────────────────────────────────────────
  const [isManualPickerOpen, setIsManualPickerOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateNeedMatch | null>(null);
  const [isSupportingExisting, setIsSupportingExisting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Feature 1: Geolocation Hook ────────────────────────────────────────────
  const {
    exactLat,
    exactLng,
    accuracyMeters,
    publicLat,
    publicLng,
    address,
    isLoading: isGpsLoading,
    error: gpsError,
    isLowAccuracy,
    refreshGps,
    setManualLocation,
  } = useGeolocation();

  // ─── Feature 3: Voice Input Hook ────────────────────────────────────────────
  const {
    isSupported: isVoiceSupported,
    isListening,
    language: speechLang,
    setLanguage: setSpeechLang,
    activeField,
    interimTranscript,
    startListening,
    stopListening,
  } = useVoiceInput('hi-IN');

  // ─── Feature 4: Duplicate Check Hook ────────────────────────────────────────
  const { isChecking: isCheckingDuplicates, checkDuplicates } = useDuplicateCheck();

  // ─── Auto-Save Draft to LocalStorage ────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.description) {
          setTitle(parsed.title || '');
          setDescription(parsed.description || '');
          setCategory(parsed.category || 'Food');
          setUrgency(parsed.urgency || 'Normal');
          setPeopleAffected(parsed.peopleAffected ?? 1);
          setIsAnonymous(Boolean(parsed.isAnonymous));
          setHasDraftRestored(true);
        }
      }
    } catch (e) {
      // ignore storage error
    }
  }, []);

  useEffect(() => {
    if (submitSuccess) return;
    try {
      const draft = {
        title,
        description,
        category,
        urgency,
        peopleAffected,
        isAnonymous,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      // ignore
    }
  }, [title, description, category, urgency, peopleAffected, isAnonymous, submitSuccess]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle('');
    setDescription('');
    setCategory('Food');
    setUrgency('Normal');
    setPeopleAffected(1);
    setIsAnonymous(false);
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setAiSuggested(false);
    setHasDraftRestored(false);
  };

  // ─── Feature 2: Photo Capture, Compression & AI Auto-Fill ───────────────────
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setUploadProgress(20);

    try {
      // 1. Client-side EXIF GPS extraction
      const exifGps = await extractExifGps(file);
      if (exifGps && exactLat !== null && exactLng !== null) {
        const dist = calculateDistanceMeters(exactLat, exactLng, exifGps.latitude, exifGps.longitude);
        setExifDistanceMeters(dist);
        setExifGpsMatch(dist > 500 ? 'mismatch' : 'match');
      } else {
        setExifGpsMatch('none');
        setExifDistanceMeters(null);
      }

      setUploadProgress(50);

      // 2. Client-side Image Compression (max 1280px, quality 0.8)
      const compressed = await compressImage(file, 1280, 0.8);
      setSelectedPhoto(compressed.file);
      setPhotoPreview(compressed.previewUrl);
      setUploadProgress(80);

      // 3. Trigger AI Photo Auto-Fill
      triggerAiAnalysis(compressed.file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing photo');
    } finally {
      setIsCompressing(false);
      setUploadProgress(100);
    }
  };

  const triggerAiAnalysis = async (file: File) => {
    setIsAiAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`${API_BASE}/needs/ai-analyze`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.suggestion) {
          const s = data.suggestion;
          if (s.title) setTitle(s.title);
          if (s.category) setCategory(s.category);
          if (s.urgency) setUrgency(s.urgency);
          if (s.description) setDescription(s.description);
          if (s.peopleAffected) setPeopleAffected(s.peopleAffected);
          setAiSuggested(true);
        }
      }
    } catch (err) {
      console.warn('AI Vision auto-fill note:', err);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // ─── Voice Input Handlers ───────────────────────────────────────────────────
  const handleVoiceToggle = (fieldName: 'title' | 'description') => {
    if (isListening && activeField === fieldName) {
      stopListening();
    } else {
      startListening(fieldName, (recognizedText) => {
        if (fieldName === 'title') {
          setTitle((prev) => (prev ? `${prev} ${recognizedText}` : recognizedText));
        } else {
          setDescription((prev) => (prev ? `${prev} ${recognizedText}` : recognizedText));
        }
      });
    }
  };

  // ─── Feature 4: Pre-Submit Duplicate Interception ───────────────────────────
  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage(lang === 'hi' ? 'कृपया आवश्यकता का स्पष्ट शीर्षक दर्ज करें।' : 'Please enter a clear title for the need.');
      return;
    }
    if (exactLat === null || exactLng === null) {
      setErrorMessage(lang === 'hi' ? 'GPS लोकेशन निर्देशांक अनिवार्य हैं।' : 'GPS Location coordinates are mandatory.');
      return;
    }

    setErrorMessage(null);

    // Check for duplicates within 200m
    const match = await checkDuplicates(exactLat, exactLng, category, title);
    if (match) {
      setDuplicateWarning(match);
      return; // Intercept submit with modal
    }

    // No duplicate found, proceed to final submit
    executeFinalSubmit();
  };

  // ─── Final Submission to Backend / Firestore ────────────────────────────────
  const executeFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('urgency', urgency);
      formData.append('latitude', String(exactLat));
      formData.append('longitude', String(exactLng));
      formData.append('accuracy', String(accuracyMeters || 10));
      formData.append('publicLatitude', String(publicLat || exactLat));
      formData.append('publicLongitude', String(publicLng || exactLng));
      formData.append('location', address);
      formData.append('peopleAffected', String(peopleAffected || 1));
      formData.append('isAnonymous', String(isAnonymous));
      formData.append('aiGenerated', String(aiSuggested));
      formData.append('locationMismatch', String(exifGpsMatch === 'mismatch'));

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

      // Clear draft on successful submission
      localStorage.removeItem(DRAFT_KEY);
      setSubmitSuccess(data.need);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading report to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Support Existing Duplicate Instead Handler ─────────────────────────────
  const handleSupportExisting = async (needId: string) => {
    setIsSupportingExisting(true);
    try {
      const res = await fetch(`${API_BASE}/needs/${needId}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      if (res.ok) {
        setDuplicateWarning(null);
        localStorage.removeItem(DRAFT_KEY);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage('Could not add support to existing report');
    } finally {
      setIsSupportingExisting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px', fontFamily: 'inherit' }}>
      {/* ─── SUCCESS SCREEN WITH REAL STATUS TRACKER ─────────────────────────── */}
      {submitSuccess ? (
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '32px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
            {t.successTitle}
          </h2>
          <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 20px 0', lineHeight: 1.5 }}>
            {t.successSubtitle}
          </p>

          {/* Report ID & Details Box */}
          <div style={{
            background: '#f8fafc',
            borderRadius: 14,
            padding: 18,
            textAlign: 'left',
            marginBottom: 20,
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}>
                {t.reportIdLabel}: {submitSuccess.id}
              </span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {new Date(submitSuccess.createdAt).toLocaleString()}
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>
              {submitSuccess.title}
            </div>

            <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 8 }}>
              📍 {submitSuccess.location} ({submitSuccess.latitude.toFixed(4)}° N, {submitSuccess.longitude.toFixed(4)}° E)
            </div>

            {submitSuccess.imageUrl && (
              <img
                src={submitSuccess.imageUrl}
                alt="Uploaded Need Proof"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginTop: 6 }}
              />
            )}
          </div>

          {/* Feature 5: Live Seva Status Tracker Pipeline */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '16px 14px',
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <h4 style={{ margin: '0 0 10px 6px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              📊 {t.statusTimelineTitle}
            </h4>
            <StatusTracker
              currentStatus={(submitSuccess.status as NeedStatus) || 'Reported'}
              statusHistory={submitSuccess.statusHistory || []}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {onViewOnMap && (
              <button
                type="button"
                onClick={() => onViewOnMap(submitSuccess.latitude, submitSuccess.longitude)}
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <MapPin size={16} />
                <span>{t.viewOnMapBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(null);
                clearDraft();
              }}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t.reportAnotherBtn}
            </button>
          </div>
        </div>
      ) : (
        /* ─── MAIN REPORT COMMUNITY NEED FORM ───────────────────────────────── */
        <form onSubmit={handlePreSubmit} style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '24px 22px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
        }}>
          {/* Header Row with Language Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 21, fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                {t.pageTitle}
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {t.pageSubtitle}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Language Switcher Pill */}
              <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Switch Language / भाषा बदलें"
              >
                <Languages size={13} />
                <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', padding: 4 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Draft Restored Banner */}
          {hasDraftRestored && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 11.5,
              color: '#166534',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <span>💾 {t.draftSaved}</span>
              <button
                type="button"
                onClick={clearDraft}
                style={{ background: 'none', border: 'none', color: '#15803d', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t.clearDraft}
              </button>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              marginBottom: 16,
              border: '1px solid #fecaca',
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {/* ─── FEATURE 2: Photo Capture, EXIF GPS & AI Auto-Fill ────────────── */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                {t.photoLabel}
              </label>

              {aiSuggested && (
                <span style={{
                  background: '#fdf4ff',
                  border: '1px solid #f0abfc',
                  color: '#a21caf',
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <Sparkles size={11} />
                  {t.aiSuccess}
                </span>
              )}
            </div>

            {photoPreview ? (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', maxHeight: 220, background: '#000' }}>
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: 220, objectFit: 'cover' }} />

                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  display: 'flex',
                  gap: 6,
                }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'rgba(15,23,42,0.85)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 20,
                      padding: '5px 12px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t.photoRetake}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedPhoto(null); setPhotoPreview(null); setAiSuggested(false); }}
                    style={{
                      background: 'rgba(239,68,68,0.85)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 20,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* EXIF GPS verification badge */}
                <div style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  background: exifGpsMatch === 'mismatch' ? 'rgba(220,38,38,0.9)' : 'rgba(15,23,42,0.85)',
                  color: exifGpsMatch === 'mismatch' ? '#ffffff' : '#34d399',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 10.5,
                  fontWeight: 600,
                }}>
                  {exifGpsMatch === 'match' && t.exifMatch}
                  {exifGpsMatch === 'mismatch' && `${t.exifMismatch} (~${exifDistanceMeters}m)`}
                  {exifGpsMatch === 'none' && '✓ Geo-Stamped Proof'}
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 14,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#f8fafc',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13.5 }}>
                  {t.photoUploadTitle}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                  {t.photoUploadSubtitle}
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

            {/* AI Vision Analysis Progress Indicator */}
            {isAiAnalyzing && (
              <div style={{
                marginTop: 8,
                background: '#fdf4ff',
                border: '1px solid #f0abfc',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 11.5,
                color: '#86198f',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Sparkles size={14} className="animate-spin" />
                <span>{t.aiAnalyzing}</span>
              </div>
            )}
          </div>

          {/* ─── FEATURE 1: Real GPS + Reverse Geocoding + Map Pin Fallback ────── */}
          <div style={{
            background: isLowAccuracy ? '#fffbeb' : '#f0fdf4',
            border: isLowAccuracy ? '1px solid #fde68a' : '1px solid #bbf7d0',
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isLowAccuracy ? '#f59e0b' : '#10b981',
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isLowAccuracy ? '#92400e' : '#166534' }}>
                  {isGpsLoading ? t.gpsAcquiring : t.gpsLocked}
                </span>

                {accuracyMeters !== null && (
                  <span style={{
                    fontSize: 11,
                    background: isLowAccuracy ? '#fef3c7' : '#dcfce7',
                    color: isLowAccuracy ? '#b45309' : '#15803d',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}>
                    ±{accuracyMeters} m
                  </span>
                )}
              </div>

              {/* Action buttons: Refresh GPS & Manual Picker */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={refreshGps}
                  disabled={isGpsLoading}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #86efac',
                    color: '#166534',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <RefreshCw size={11} className={isGpsLoading ? 'animate-spin' : ''} />
                  <span>{t.refreshGps}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManualPickerOpen(true)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t.pickManualPin}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12.5, color: '#1e293b', marginTop: 4, fontWeight: 600 }}>
              📍 {address}
            </div>

            {exactLat !== null && exactLng !== null && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {exactLat.toFixed(5)}° N, {exactLng.toFixed(5)}° E · {t.approximateNotice}
              </div>
            )}

            {isLowAccuracy && (
              <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
                {t.lowAccuracyWarning}
              </div>
            )}

            {address && headerCity && !address.toLowerCase().includes(headerCity.toLowerCase()) && (
              <div
                style={{
                  fontSize: 11.5,
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  borderRadius: 6,
                  padding: '6px 10px',
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                <span>
                  Your GPS location differs from the selected header city (<strong>{headerCity}</strong>). The need will be reported at your verified GPS location.
                </span>
              </div>
            )}
          </div>

          {/* ─── FEATURE 3: Need Title + Voice Input ──────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                {t.titleLabel}
              </label>

              {/* Voice Input Button & Language Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setSpeechLang(speechLang === 'hi-IN' ? 'en-IN' : 'hi-IN')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#2563eb',
                    cursor: 'pointer',
                  }}
                  title="Toggle speech language"
                >
                  {speechLang === 'hi-IN' ? t.voiceHindi : t.voiceEnglish}
                </button>

                <button
                  type="button"
                  onClick={() => handleVoiceToggle('title')}
                  style={{
                    background: isListening && activeField === 'title' ? '#ef4444' : '#f1f5f9',
                    color: isListening && activeField === 'title' ? '#ffffff' : '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 14,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isListening && activeField === 'title' ? <MicOff size={12} /> : <Mic size={12} />}
                  <span>{isListening && activeField === 'title' ? t.voiceListening : 'Mic'}</span>
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder={t.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                fontSize: 13.5,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />

            {/* Interim live speech feedback */}
            {isListening && activeField === 'title' && interimTranscript && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3, fontStyle: 'italic' }}>
                🎙️ "{interimTranscript}"
              </div>
            )}
          </div>

          {/* ─── Category & Urgency Row ────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {t.categoryLabel}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="Food">{t.catFood}</option>
                <option value="Medical">{t.catMedical}</option>
                <option value="Education">{t.catEducation}</option>
                <option value="Shelter">{t.catShelter}</option>
                <option value="Elderly">{t.catElderly}</option>
                <option value="Water">{t.catWater}</option>
                <option value="Others">{t.catOthers}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {t.urgencyLabel}
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="Normal">{t.urgencyNormal}</option>
                <option value="Urgent">{t.urgencyUrgent}</option>
                <option value="Critical">{t.urgencyCritical}</option>
              </select>
            </div>
          </div>

          {/* ─── People Affected & Anonymous Row ───────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {t.peopleAffectedLabel}
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                placeholder={t.peopleAffectedPlaceholder}
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(e.target.value ? parseInt(e.target.value, 10) : '')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {t.anonymousLabel}
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                background: isAnonymous ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
                userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <EyeOff size={15} color={isAnonymous ? '#059669' : '#64748b'} />
                <span style={{ fontSize: 12, fontWeight: 600, color: isAnonymous ? '#065f46' : '#334155' }}>
                  {isAnonymous ? 'Anonymous' : 'Public'}
                </span>
              </label>
            </div>
          </div>

          {/* ─── FEATURE 3: Description & Voice Input ─────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                {t.descriptionLabel}
              </label>

              <button
                type="button"
                onClick={() => handleVoiceToggle('description')}
                style={{
                  background: isListening && activeField === 'description' ? '#ef4444' : '#f1f5f9',
                  color: isListening && activeField === 'description' ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 14,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {isListening && activeField === 'description' ? <MicOff size={12} /> : <Mic size={12} />}
                <span>{isListening && activeField === 'description' ? t.voiceListening : 'Mic'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              placeholder={t.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                fontSize: 13.5,
                boxSizing: 'border-box',
                resize: 'vertical',
                outline: 'none',
              }}
            />

            {/* Interim live speech feedback */}
            {isListening && activeField === 'description' && interimTranscript && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3, fontStyle: 'italic' }}>
                🎙️ "{interimTranscript}"
              </div>
            )}
          </div>

          {/* ─── Submit Button ─────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={isSubmitting || isCheckingDuplicates}
            style={{
              width: '100%',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '14px 20px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              cursor: isSubmitting || isCheckingDuplicates ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              opacity: isSubmitting || isCheckingDuplicates ? 0.75 : 1,
              boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
              transition: 'background 0.2s',
            }}
          >
            {isSubmitting || isCheckingDuplicates ? (
              <span>{isCheckingDuplicates ? 'Checking Duplicates…' : t.submittingBtn}</span>
            ) : (
              <span>{t.submitBtn}</span>
            )}
          </button>
        </form>
      )}

      {/* ─── Manual Location Picker Modal ────────────────────────────────────── */}
      {isManualPickerOpen && (
        <ManualLocationPicker
          initialLat={exactLat || 22.7533}
          initialLng={exactLng || 75.8937}
          onConfirm={(lat, lng) => {
            setManualLocation(lat, lng);
            setIsManualPickerOpen(false);
          }}
          onCancel={() => setIsManualPickerOpen(false)}
        />
      )}

      {/* ─── Feature 4: Duplicate Warning Interception Modal ─────────────────── */}
      {duplicateWarning && (
        <DuplicateWarningModal
          match={duplicateWarning}
          onSupportInstead={(needId) => handleSupportExisting(needId)}
          onProceedAnyway={() => {
            setDuplicateWarning(null);
            executeFinalSubmit();
          }}
          onCancel={() => setDuplicateWarning(null)}
          isSupporting={isSupportingExisting}
        />
      )}
    </div>
  );
};

export default ReportNeed;
