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
  ChevronLeft,
  ShieldCheck,
  PhoneCall,
  Clock,
  Utensils,
  HeartPulse,
  Home,
  BookOpen,
  Shirt,
  HelpCircle,
  Share2,
  AlertOctagon,
  Check,
  Plus,
  Minus,
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

interface UploadedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  exifGps?: { latitude: number; longitude: number } | null;
  exifTimestamp?: string | null;
}

const DRAFT_KEY = 'sahaaye_report_need_wizard_draft_v2';

// 6 Structured Categories with Monochrome Line Icons
const CATEGORIES = [
  { id: 'Food & Ration', label: 'Food & Ration', icon: Utensils, desc: 'Meals, dry groceries & water' },
  { id: 'Medical Aid', label: 'Medical Aid', icon: HeartPulse, desc: 'Medicines, first-aid & transit' },
  { id: 'Shelter & Housing', label: 'Shelter & Housing', icon: Home, desc: 'Tarpaulins & night roof' },
  { id: 'Education & Books', label: 'Education & Books', icon: BookOpen, desc: 'Stationery & student fees' },
  { id: 'Clothes & Blankets', label: 'Clothes & Blankets', icon: Shirt, desc: 'Winter wear & garments' },
  { id: 'Other Seva', label: 'Other Seva', icon: HelpCircle, desc: 'Elderly care & community help' },
];

const URGENCIES = [
  { id: 'Low', label: 'Low', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'Medium', label: 'Medium', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { id: 'High', label: 'High', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { id: 'Critical', label: 'Critical', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

const NEEDED_WITHIN_OPTIONS = [
  { id: '2_hours', label: 'Within 2 Hours', urgent: true },
  { id: 'today', label: 'Today', urgent: false },
  { id: 'this_week', label: 'This Week', urgent: false },
];

export const ReportNeed: React.FC<ReportNeedProps> = ({ onSuccess, onCancel, onViewOnMap }) => {
  // ─── Wizard Step (1: Photo, 2: Details, 3: Location, 4: Review) ────────────
  const [currentStep, setCurrentStep] = useState<number>(1);

  // ─── Language & i18n ────────────────────────────────────────────────────────
  const [lang, setLang] = useState<LanguageCode>('en');
  const t = TRANSLATIONS[lang];
  const { city: headerCity } = useSelectedLocation();

  // ─── Step 1: Photos & Verification State ────────────────────────────────────
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [blurFaces, setBlurFaces] = useState(false);
  const [exifWarning, setExifWarning] = useState<string | null>(null);

  // ─── Step 2: Need Details State ─────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food & Ration');
  const [urgency, setUrgency] = useState('High');
  const [neededWithin, setNeededWithin] = useState('today');
  const [peopleAffected, setPeopleAffected] = useState<number>(1);
  const [specificRequirements, setSpecificRequirements] = useState('');
  const [description, setDescription] = useState('');
  const [aiSuggested, setAiSuggested] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // ─── Step 3: Location & Geolocation ─────────────────────────────────────────
  const {
    exactLat,
    exactLng,
    accuracyMeters,
    publicLat,
    publicLng,
    address,
    isLoading: isGpsLoading,
    isLowAccuracy,
    refreshGps,
    setManualLocation,
  } = useGeolocation();

  const [isManualPickerOpen, setIsManualPickerOpen] = useState(false);
  const { isChecking: isCheckingDuplicates, checkDuplicates } = useDuplicateCheck();
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateNeedMatch | null>(null);
  const [isSupportingExisting, setIsSupportingExisting] = useState(false);

  // ─── Step 4: Emergency & Privacy State ──────────────────────────────────────
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hidePhoneNumber, setHidePhoneNumber] = useState(true);
  const [consentDignity, setConsentDignity] = useState(true);

  // ─── UI & Submission State ──────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Voice Input Hook ───────────────────────────────────────────────────────
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

  // ─── Draft Auto-Save & Restore ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.title || p.description || p.category) {
          setTitle(p.title || '');
          setCategory(p.category || 'Food & Ration');
          setUrgency(p.urgency || 'High');
          setNeededWithin(p.neededWithin || 'today');
          setPeopleAffected(p.peopleAffected || 1);
          setSpecificRequirements(p.specificRequirements || '');
          setDescription(p.description || '');
          setIsEmergencyMode(Boolean(p.isEmergencyMode));
          setIsAnonymous(Boolean(p.isAnonymous));
          setHidePhoneNumber(Boolean(p.hidePhoneNumber ?? true));
          setHasDraftRestored(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (submitSuccess) return;
    try {
      const draft = {
        title,
        category,
        urgency,
        neededWithin,
        peopleAffected,
        specificRequirements,
        description,
        isEmergencyMode,
        isAnonymous,
        hidePhoneNumber,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    title,
    category,
    urgency,
    neededWithin,
    peopleAffected,
    specificRequirements,
    description,
    isEmergencyMode,
    isAnonymous,
    hidePhoneNumber,
    submitSuccess,
  ]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle('');
    setDescription('');
    setSpecificRequirements('');
    setPhotos([]);
    setPeopleAffected(1);
    setUrgency('High');
    setCategory('Food & Ration');
    setIsEmergencyMode(false);
    setHasDraftRestored(false);
    setCurrentStep(1);
  };

  // ─── Photo Capture & Multi-Photo Processing ─────────────────────────────────
  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      setErrorMessage(lang === 'hi' ? 'अधिकतम 5 फोटो अपलोड कर सकते हैं।' : 'You can upload up to 5 photos.');
      return;
    }

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const newPhotos: UploadedPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Client-side EXIF Extraction
        const exifGps = await extractExifGps(file);

        // Verification check: distance & timestamp
        if (exifGps && exactLat !== null && exactLng !== null) {
          const dist = calculateDistanceMeters(exactLat, exactLng, exifGps.latitude, exifGps.longitude);
          if (dist > 300) {
            setExifWarning(
              lang === 'hi'
                ? `⚠️ फोटो की लोकेशन आपके वर्तमान GPS से ${dist}m दूर है।`
                : `⚠️ Photo GPS location is ${dist}m away from your current location.`
            );
          } else {
            setExifWarning(null);
          }
        }

        // 2. Client-side Canvas Compression (1280px, 0.8)
        const compressed = await compressImage(file, 1280, 0.8);

        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          file: compressed.file,
          previewUrl: compressed.previewUrl,
          exifGps,
          exifTimestamp: new Date().toISOString(),
        });
      }

      const updated = [...photos, ...newPhotos].slice(0, 5);
      setPhotos(updated);

      // Trigger AI Analysis on first photo if not already filled
      if (updated.length > 0 && !title) {
        triggerAiAnalysis(updated[0].file);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing photos');
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // ─── AI Vision Auto-Fill ────────────────────────────────────────────────────
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

  // ─── Wizard Step Validation & Navigation ────────────────────────────────────
  const goToNextStep = async () => {
    setErrorMessage(null);

    if (currentStep === 1) {
      if (photos.length === 0) {
        setErrorMessage(
          lang === 'hi'
            ? 'कृपया कम से कम 1 वास्तविक फोटो प्रमाण जोड़ें।'
            : 'Please add at least 1 real proof photo.'
        );
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!title.trim() || title.trim().length < 4) {
        setErrorMessage(
          lang === 'hi'
            ? 'कृपया आवश्यकता का स्पष्ट शीर्षक दर्ज करें (कम से कम 4 अक्षर)।'
            : 'Please enter a clear title for the need (at least 4 characters).'
        );
        return;
      }
      setCurrentStep(3);

      // Perform 300m duplicate check as soon as location step loads
      if (exactLat !== null && exactLng !== null) {
        const match = await checkDuplicates(exactLat, exactLng, category, title);
        if (match) {
          setDuplicateWarning(match);
        }
      }
      return;
    }

    if (currentStep === 3) {
      if (exactLat === null || exactLng === null) {
        setErrorMessage(
          lang === 'hi'
            ? 'GPS लोकेशन अनिवार्य है। Refresh GPS या Pick on Map का उपयोग करें।'
            : 'GPS location is mandatory. Use Refresh GPS or Pick on Map.'
        );
        return;
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      if (!consentDignity) {
        setErrorMessage(
          lang === 'hi'
            ? 'कृपया समुदाय गरिमा और सत्यता का नियम स्वीकार करें।'
            : 'Please confirm the dignity and truthfulness consent checkbox.'
        );
        return;
      }
      executeFinalSubmit();
    }
  };

  const goToPrevStep = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // ─── Final Submission to Backend / Firestore ────────────────────────────────
  const executeFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', `${description.trim()}${specificRequirements ? `\n\nSpecific Requirements: ${specificRequirements.trim()}` : ''}`);
      formData.append('category', category);
      formData.append('urgency', isEmergencyMode ? 'Critical' : urgency);
      formData.append('neededWithin', neededWithin);
      formData.append('latitude', String(exactLat));
      formData.append('longitude', String(exactLng));
      formData.append('accuracy', String(accuracyMeters || 10));
      formData.append('publicLatitude', String(publicLat || exactLat));
      formData.append('publicLongitude', String(publicLng || exactLng));
      formData.append('location', address);
      formData.append('peopleAffected', String(peopleAffected || 1));
      formData.append('specificRequirements', specificRequirements.trim());
      formData.append('isEmergencyMode', String(isEmergencyMode));
      formData.append('isAnonymous', String(isAnonymous));
      formData.append('hidePhoneNumber', String(hidePhoneNumber));
      formData.append('blurFaces', String(blurFaces));
      formData.append('aiGenerated', String(aiSuggested));

      // Append up to 5 photos
      photos.forEach((p, idx) => {
        formData.append(idx === 0 ? 'photo' : `photo_${idx}`, p.file);
      });

      const res = await fetch(`${API_BASE}/needs`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      localStorage.removeItem(DRAFT_KEY);
      setSubmitSuccess(data.need);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting report to community network');
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
    } catch {
      setErrorMessage('Could not add support to existing report');
    } finally {
      setIsSupportingExisting(false);
    }
  };

  // ─── WhatsApp Share Handler ─────────────────────────────────────────────────
  const handleWhatsAppShare = () => {
    if (!submitSuccess) return;
    const shareText = `🚨 *SAHAAYE Community Need Reported*\n\n*${submitSuccess.title}*\n📍 Location: ${submitSuccess.location}\n⚠️ Urgency: ${submitSuccess.urgency}\n\nPlease check SAHAAYE to support this family or volunteer:\n${window.location.origin}?needId=${submitSuccess.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const isCityMismatch = !!(
    address &&
    headerCity &&
    !address.toLowerCase().includes(headerCity.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 14px', fontFamily: 'inherit' }}>
      {/* ─── SUCCESS SCREEN WITH REAL STATUS TRACKER & WHATSAPP SHARE ─────────── */}
      {submitSuccess ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '2px solid #a7f3d0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={36} strokeWidth={2} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            {lang === 'hi' ? 'आवश्यकता सफलतापूर्वक दर्ज की गई!' : 'Community Need Published!'}
          </h2>
          <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 auto 20px', maxWidth: 480, lineHeight: 1.5 }}>
            {lang === 'hi'
              ? 'आपकी रिपोर्ट 300m के दायरे में सुरक्षित रूप से प्रकाशित हो गई है। नजदीकी सेवा स्वयंसेवकों को सूचना भेज दी गई है।'
              : 'Your verified need has been broadcast to nearby volunteers. Volunteers in your area can now coordinate aid.'}
          </p>

          {/* Report Tracking Badge */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '16px',
              maxWidth: 480,
              margin: '0 auto 24px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', letterSpacing: '0.05em' }}>
                TRACKING ID: {submitSuccess.id ? `SHY-${submitSuccess.id.slice(0, 8).toUpperCase()}` : 'SHY-2026-9481'}
              </span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {new Date(submitSuccess.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>
              {submitSuccess.title}
            </div>

            <div style={{ fontSize: 12.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} color="#0d9488" />
              <span>{submitSuccess.location} (~300m approximate area)</span>
            </div>
          </div>

          {/* 5-Stage Live Seva Status Tracker */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: '16px',
              maxWidth: 480,
              margin: '0 auto 24px',
              textAlign: 'left',
            }}
          >
            <h4 style={{ margin: '0 0 12px 4px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              📊 {lang === 'hi' ? 'सेवा स्थिति टाइमलाइन' : 'Live Seva Status Timeline'}
            </h4>
            <StatusTracker
              currentStatus={(submitSuccess.status as NeedStatus) || 'Reported'}
              statusHistory={submitSuccess.statusHistory || []}
            />
          </div>

          {/* Action Buttons: WhatsApp Share & View on Map */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              style={{
                background: '#25D366',
                color: '#ffffff',
                border: 'none',
                padding: '11px 20px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
              }}
            >
              <Share2 size={16} />
              <span>{lang === 'hi' ? 'WhatsApp पर शेयर करें' : 'Share on WhatsApp'}</span>
            </button>

            {onViewOnMap && (
              <button
                type="button"
                onClick={() => onViewOnMap(submitSuccess.latitude || 22.7196, submitSuccess.longitude || 75.8577)}
                style={{
                  background: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  padding: '11px 20px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MapPin size={16} />
                <span>{lang === 'hi' ? 'लाइव मैप पर देखें' : 'View on Live Map'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(null);
                clearDraft();
              }}
              style={{
                background: '#f8fafc',
                color: '#334155',
                border: '1.5px solid #cbd5e1',
                padding: '11px 18px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              {lang === 'hi' ? '+ दूसरी रिपोर्ट दर्ज करें' : '+ Report Another Need'}
            </button>
          </div>
        </div>
      ) : (
        /* ─── 4-STEP WIZARD FORM CONTAINER ─────────────────────────────────── */
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            padding: '24px 20px',
          }}
        >
          {/* Header Bar with Language Switch & Cancel */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {lang === 'hi' ? 'सामुदायिक आवश्यकता दर्ज करें' : 'Report Community Need'}
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {lang === 'hi' ? 'भू-सत्यापित सामाजिक सेवा नेटवर्क' : 'Geo-verified dignity-first social seva network'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Language toggle */}
              <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  color: '#0d9488',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Languages size={13} />
                <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Restored Draft Alert Banner */}
          {hasDraftRestored && (
            <div
              style={{
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                color: '#0f766e',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={14} />
                <span>{lang === 'hi' ? 'पिछला सहेजा गया ड्राफ्ट पुनर्प्राप्त किया गया।' : 'Unsaved draft restored.'}</span>
              </div>
              <button
                type="button"
                onClick={clearDraft}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 11.5,
                }}
              >
                {lang === 'hi' ? 'हटाएं' : 'Clear'}
              </button>
            </div>
          )}

          {/* ─── 4-STEP PROGRESS BAR ────────────────────────────────────────── */}
          <div style={{ marginBottom: 24, padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              {/* Connecting progress background line */}
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 20,
                  right: 20,
                  height: 3,
                  background: '#e2e8f0',
                  zIndex: 1,
                }}
              />
              {/* Connecting active filled line */}
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 20,
                  width: `${((currentStep - 1) / 3) * 100}%`,
                  height: 3,
                  background: '#0d9488',
                  zIndex: 2,
                  transition: 'width 0.3s ease',
                }}
              />

              {[
                { step: 1, label: lang === 'hi' ? '1. फोटो प्रमाण' : '1. Photo' },
                { step: 2, label: lang === 'hi' ? '2. विवरण' : '2. Details' },
                { step: 3, label: lang === 'hi' ? '3. लोकेशन' : '3. Location' },
                { step: 4, label: lang === 'hi' ? '4. समीक्षा' : '4. Review' },
              ].map((item) => {
                const isCompleted = currentStep > item.step;
                const isActive = currentStep === item.step;

                return (
                  <div
                    key={item.step}
                    onClick={() => {
                      // Allow navigating back to completed steps
                      if (item.step < currentStep) setCurrentStep(item.step);
                    }}
                    style={{
                      position: 'relative',
                      zIndex: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: item.step < currentStep ? 'pointer' : 'default',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isCompleted || isActive ? '#0d9488' : '#ffffff',
                        border: isCompleted || isActive ? '2px solid #0d9488' : '2px solid #cbd5e1',
                        color: isCompleted || isActive ? '#ffffff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        transition: 'all 0.2s',
                        boxShadow: isActive ? '0 0 0 4px rgba(13, 148, 136, 0.15)' : 'none',
                      }}
                    >
                      {isCompleted ? <Check size={14} strokeWidth={3} /> : item.step}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#0d9488' : isCompleted ? '#334155' : '#94a3b8',
                        marginTop: 4,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecdd3',
                color: '#991b1b',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: PHOTO PROOF & EXIF VERIFICATION                            */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  📸 {lang === 'hi' ? 'फोटो प्रमाण (अधिकतम 5 फोटो)' : 'Need Proof / Photo (Up to 5 photos)'}
                </label>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                  {lang === 'hi'
                    ? 'वास्तविक स्थिति की फोटो लें या अपलोड करें। AI स्वचालित रूप से आवश्यकता का विश्लेषण करेगा।'
                    : 'Capture or upload photos of the community condition. AI will auto-fill need details.'}
                </p>

                {/* Upload Buttons: Camera & Gallery */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={photos.length >= 5 || isCompressing}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px 16px',
                      borderRadius: 10,
                      background: '#0d9488',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: photos.length >= 5 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Camera size={16} />
                    <span>{lang === 'hi' ? 'कैमरा से लें' : 'Take Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= 5 || isCompressing}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px 16px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1.5px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: photos.length >= 5 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Upload size={16} />
                    <span>{lang === 'hi' ? 'गैलरी से चुनें' : 'Upload from Gallery'}</span>
                  </button>

                  {/* Hidden inputs */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoFiles(e.target.files)}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoFiles(e.target.files)}
                  />
                </div>

                {/* Uploaded Photos Grid Preview */}
                {photos.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    {photos.map((p, idx) => (
                      <div
                        key={p.id}
                        style={{
                          position: 'relative',
                          borderRadius: 10,
                          overflow: 'hidden',
                          height: 95,
                          border: '1.5px solid #e2e8f0',
                        }}
                      >
                        <img
                          src={p.previewUrl}
                          alt={`Proof ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: blurFaces ? 'blur(3px)' : 'none',
                            transition: 'filter 0.2s',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(p.id)}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={12} />
                        </button>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            background: 'rgba(0,0,0,0.6)',
                            color: '#ffffff',
                            fontSize: 9.5,
                            padding: '1px 5px',
                            borderRadius: 4,
                          }}
                        >
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Privacy Face-Blur Toggle */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} color="#0d9488" />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
                        {lang === 'hi' ? 'फोटो में चेहरों को धुंधला (Blur) करें' : 'Blur faces in photos (Privacy Filter)'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {lang === 'hi' ? 'व्यक्तियों की पहचान और गरिमा सुरक्षित रखने के लिए' : 'Protects individual identity & community dignity'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={blurFaces}
                    onChange={(e) => setBlurFaces(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                </div>

                {/* EXIF Warning if detected distance >300m */}
                {exifWarning && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span>{exifWarning}</span>
                  </div>
                )}

                {/* AI Auto-Fill Progress Beacon */}
                {isAiAnalyzing && (
                  <div
                    style={{
                      background: '#f0fdfa',
                      border: '1px solid #99f6e4',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#0f766e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Sparkles size={14} className="spin-animation" />
                    <span>{lang === 'hi' ? 'AI फोटो का विश्लेषण करके फॉर्म विवरण तैयार कर रहा है...' : 'AI is analyzing photo to suggest title and category...'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: DETAILS, CATEGORY CARDS & URGENCY                          */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div>
              {/* Need Title with Voice Input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    {lang === 'hi' ? 'आवश्यकता का शीर्षक *' : 'Need Title *'}
                  </label>

                  {/* Voice input mic & language toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setSpeechLang(speechLang === 'hi-IN' ? 'en-IN' : 'hi-IN')}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#0d9488',
                        cursor: 'pointer',
                      }}
                    >
                      {speechLang === 'hi-IN' ? 'हिंदी (hi)' : 'EN'}
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
                      {isListening && activeField === 'title' ? <MicOff size={11} /> : <Mic size={11} />}
                      <span>{isListening && activeField === 'title' ? 'Listening...' : 'Voice'}</span>
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={lang === 'hi' ? 'उदा: 5 परिवारों के लिए राशन और स्वच्छ पानी सहायता' : 'e.g. Dry Ration Kits Needed for Displaced Families'}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Category Cards (Replaces standard dropdown) */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  {lang === 'hi' ? 'श्रेणी चुनें (Category)' : 'Select Category'}
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: 8,
                  }}
                >
                  {CATEGORIES.map((cat) => {
                    const IconComp = cat.icon;
                    const isSelected = category === cat.id;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        style={{
                          border: isSelected ? '2px solid #0d9488' : '1.5px solid #e2e8f0',
                          background: isSelected ? '#f0fdfa' : '#ffffff',
                          borderRadius: 12,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: isSelected ? '#ccfbf1' : '#f8fafc',
                            color: isSelected ? '#0d9488' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <IconComp size={20} strokeWidth={1.8} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: isSelected ? '#0f766e' : '#1e293b' }}>
                            {cat.label}
                          </div>
                          <div style={{ fontSize: 10.5, color: '#64748b' }}>{cat.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Urgency Level Buttons */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  {lang === 'hi' ? 'प्राथमिकता स्तर (Urgency)' : 'Urgency Level'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {URGENCIES.map((u) => {
                    const isSelected = urgency === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUrgency(u.id)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 10,
                          fontSize: 12.5,
                          fontWeight: isSelected ? 700 : 600,
                          border: isSelected ? `2px solid ${u.color}` : '1.5px solid #e2e8f0',
                          background: isSelected ? u.bg : '#ffffff',
                          color: isSelected ? u.color : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {u.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* "Kab Tak Chahiye" (Needed Within) */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  ⏱️ {lang === 'hi' ? 'कब तक चाहिए? (Needed Within)' : 'Needed Within'}
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {NEEDED_WITHIN_OPTIONS.map((opt) => {
                    const isSelected = neededWithin === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNeededWithin(opt.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          border: isSelected ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                          background: isSelected ? '#f0fdfa' : '#ffffff',
                          color: isSelected ? '#0f766e' : '#334155',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {opt.urgent && <Clock size={12} />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* People Affected Stepper & Specific Quantity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                    👥 {lang === 'hi' ? 'प्रभावित लोग' : 'People Affected'}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setPeopleAffected((prev) => Math.max(1, prev - 1))}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', minWidth: 32, textAlign: 'center' }}>
                      {peopleAffected}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPeopleAffected((prev) => prev + 1)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                    📦 {lang === 'hi' ? 'आवश्यक सामग्री और मात्रा' : 'Items & Quantity Needed'}
                  </label>
                  <input
                    type="text"
                    value={specificRequirements}
                    onChange={(e) => setSpecificRequirements(e.target.value)}
                    placeholder={lang === 'hi' ? 'उदा: चावल 10 kg, तेल 2L, दवाइयां' : 'e.g. Rice 10 kg, Cooking Oil 2L'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: 12.5,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Description & Requirements with Voice Input */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    {lang === 'hi' ? 'विस्तृत विवरण (Description)' : 'Detailed Description'}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleVoiceToggle('description')}
                    style={{
                      background: isListening && activeField === 'description' ? '#ef4444' : '#f1f5f9',
                      color: isListening && activeField === 'description' ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: 14,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isListening && activeField === 'description' ? <MicOff size={11} /> : <Mic size={11} />}
                    <span>{isListening && activeField === 'description' ? 'Listening...' : 'Voice'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={lang === 'hi' ? 'स्थिति का विवरण दें ताकि स्वयंसेवक सही सहायता लेकर पहुंच सकें...' : 'Describe the situation so volunteers can bring exactly what is needed...'}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 3: LOCATION, GPS & 300M DUPLICATE CHECK                        */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div>
              {/* GPS Card with Clean Outline Buttons */}
              <div
                style={{
                  background: '#f0fdf4',
                  borderRadius: 14,
                  border: '1.5px solid #86efac',
                  padding: '14px 16px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', letterSpacing: '0.04em' }}>
                      {isGpsLoading ? 'GPS ACQUIRING...' : 'GPS LOCKED & GEO-STAMPED'}
                    </span>
                    {accuracyMeters !== null && (
                      <span style={{ fontSize: 10.5, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                        ±{accuracyMeters} m
                      </span>
                    )}
                  </div>

                  {/* Clean Outline Buttons for Refresh GPS & Pick on Map */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={refreshGps}
                      disabled={isGpsLoading}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #86efac',
                        color: '#166534',
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <RefreshCw size={11} className={isGpsLoading ? 'spin-animation' : ''} />
                      <span>Refresh GPS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsManualPickerOpen(true)}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#334155',
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MapPin size={11} />
                      <span>Pick on Map</span>
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, marginTop: 4 }}>
                  📍 {address}
                </div>

                {exactLat !== null && exactLng !== null && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Exact: {exactLat.toFixed(5)}° N, {exactLng.toFixed(5)}° E · Public shows ~300m randomized area for safety
                  </div>
                )}

                {/* Cross-feature check: GPS vs Selected Header City */}
                {isCityMismatch && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      borderRadius: 8,
                      padding: '6px 10px',
                      marginTop: 8,
                      fontSize: 11.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span>
                      Your GPS shows <strong>{address}</strong> but header city is <strong>{headerCity}</strong>. The need will be reported at your verified GPS location.
                    </span>
                  </div>
                )}
              </div>

              {/* 300m Duplicate Detection Card */}
              {duplicateWarning && (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1.5px solid #fed7aa',
                    borderRadius: 12,
                    padding: '14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <AlertTriangle size={20} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412' }}>
                        {lang === 'hi' ? '300m के दायरे में समान आवश्यकता पहले से दर्ज है' : 'A similar need is already reported nearby within 300m'}
                      </div>
                      <div style={{ fontSize: 12, color: '#7c2d12', marginTop: 2 }}>
                        "{duplicateWarning.title}" ({duplicateWarning.distanceMeters}m away)
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleSupportExisting(duplicateWarning.id)}
                          disabled={isSupportingExisting}
                          style={{
                            background: '#ea580c',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isSupportingExisting ? 'Supporting...' : 'Support This Need Instead'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDuplicateWarning(null)}
                          style={{
                            background: '#ffffff',
                            color: '#7c2d12',
                            border: '1px solid #fed7aa',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Report Anyway
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 4: REVIEW PREVIEW, EMERGENCY MODE & PRIVACY                   */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div>
              {/* Emergency Mode Toggle */}
              <div
                style={{
                  background: isEmergencyMode ? '#fef2f2' : '#f8fafc',
                  border: isEmergencyMode ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '14px',
                  marginBottom: 16,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: isEmergencyMode ? '#fee2e2' : '#f1f5f9',
                        color: isEmergencyMode ? '#dc2626' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AlertOctagon size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isEmergencyMode ? '#991b1b' : '#1e293b' }}>
                        {lang === 'hi' ? '🚨 आपातकालीन सेवा मोड (Emergency Mode)' : '🚨 Emergency Seva Mode (Life Threat / Urgent Medical)'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {lang === 'hi' ? '5km के सभी प्रमाणित स्वयंसेवकों को तत्काल उच्च प्राथमिकता अलर्ट भेजा जाएगा' : 'Broadcasts high-priority push dispatch to all verified emergency volunteers within 5km'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEmergencyMode}
                    onChange={(e) => setIsEmergencyMode(e.target.checked)}
                    style={{ width: 20, height: 20, accentColor: '#dc2626', cursor: 'pointer' }}
                  />
                </div>

                {isEmergencyMode && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid #fecaca',
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <a
                      href="tel:112"
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <PhoneCall size={13} />
                      <span>Call 112 (Police / Emergency)</span>
                    </a>
                    <a
                      href="tel:108"
                      style={{
                        background: '#ea580c',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <PhoneCall size={13} />
                      <span>Call 108 (Ambulance)</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Seva Card Preview */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
                  👁️ {lang === 'hi' ? 'सार्वजनिक पूर्वावलोकन (Preview)' : 'Live Public Card Preview'}
                </label>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isEmergencyMode ? '#fee2e2' : '#f0fdfa',
                        color: isEmergencyMode ? '#dc2626' : '#0d9488',
                      }}
                    >
                      {isEmergencyMode ? '🚨 EMERGENCY' : category}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Needed: {neededWithin}</span>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                    {title || 'Untitled Community Need'}
                  </div>

                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    📍 {address || 'Location GPS'} (~300m area) · 👥 {peopleAffected} {peopleAffected === 1 ? 'person' : 'people'}
                  </div>

                  {specificRequirements && (
                    <div style={{ fontSize: 12, background: '#f8fafc', padding: '6px 10px', borderRadius: 6, color: '#334155', marginBottom: 8 }}>
                      <strong>Requirements:</strong> {specificRequirements}
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                      {photos.map((p, idx) => (
                        <img
                          key={p.id}
                          src={p.previewUrl}
                          alt="preview"
                          style={{
                            width: 80,
                            height: 60,
                            borderRadius: 6,
                            objectFit: 'cover',
                            filter: blurFaces ? 'blur(3px)' : 'none',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Controls & Dignity Consent */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  🔒 {lang === 'hi' ? 'गोपनीयता और संपर्क नियंत्रण' : 'Privacy & Trust Controls'}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ accentColor: '#0d9488' }}
                  />
                  <span>{lang === 'hi' ? 'गुमनाम रूप से रिपोर्ट करें (नाम छिपाएं)' : 'Report anonymously (Hide my name)'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer', marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={hidePhoneNumber}
                    onChange={(e) => setHidePhoneNumber(e.target.checked)}
                    style={{ accentColor: '#0d9488' }}
                  />
                  <span>{lang === 'hi' ? 'फोन नंबर छुपाएं (केवल इन-ऐप चैट)' : 'Hide phone number (In-app seva chat only)'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#0f766e', cursor: 'pointer', marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    required
                    checked={consentDignity}
                    onChange={(e) => setConsentDignity(e.target.checked)}
                    style={{ accentColor: '#0d9488', marginTop: 2 }}
                  />
                  <span>
                    {lang === 'hi'
                      ? 'मैं पुष्टि करता हूँ कि यह आवश्यकता वास्तविक है, और फोटो में व्यक्तियों की गरिमा का सम्मान किया गया है।'
                      : 'I confirm this need is genuine and community members pictured have consented to seva publication.'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ─── WIZARD BOTTOM NAVIGATION BAR ──────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 16,
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={goToPrevStep}
                  disabled={isSubmitting}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    padding: '9px 18px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>{lang === 'hi' ? 'पीछे' : 'Back'}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={isSubmitting}
                style={{
                  background: isEmergencyMode && currentStep === 4 ? '#dc2626' : '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : currentStep === 4 ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{lang === 'hi' ? 'आवश्यकता सबमिट करें' : 'Submit Community Need'}</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'hi' ? 'आगे बढ़ें' : 'Next Step'}</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Location Draggable Pin Modal */}
      {isManualPickerOpen && (
        <ManualLocationPicker
          initialLat={exactLat || 22.7196}
          initialLng={exactLng || 75.8577}
          onConfirm={(lat: number, lng: number) => {
            setManualLocation(lat, lng);
            setIsManualPickerOpen(false);
          }}
          onCancel={() => setIsManualPickerOpen(false)}
        />
      )}

      {/* Duplicate Alert Modal */}
      {duplicateWarning && (
        <DuplicateWarningModal
          match={duplicateWarning}
          onSupportInstead={(needId: string) => handleSupportExisting(needId)}
          onProceedAnyway={() => setDuplicateWarning(null)}
          onCancel={() => setDuplicateWarning(null)}
        />
      )}
    </div>
  );
};

export default ReportNeed;
