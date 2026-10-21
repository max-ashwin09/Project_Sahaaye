import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Video,
  X,
  RotateCcw,
  Zap,
  ZapOff,
  Check,
  Trash2,
  AlertCircle,
  MapPin,
  Play,
  Square,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { TRANSLATIONS } from '../utils/i18n';
import { useLanguageStore } from '../stores/useLanguageStore';

export interface CameraMediaItem {
  id: string;
  type: 'photo' | 'video';
  dataUrl: string; // Base64 for photo, thumbnail dataUrl for video
  videoBlob?: Blob;
  lat: number;
  lng: number;
  acc: number;
  timestamp: string;
}

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (items: CameraMediaItem[]) => void;
  initialItems?: CameraMediaItem[];
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onDone,
  initialItems = [],
}) => {
  const { lang } = useLanguageStore();
  const t = TRANSLATIONS[lang];

  // Camera Mode: 'photo' | 'video'
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [blurFaces, setBlurFaces] = useState(false);
  const [captures, setCaptures] = useState<CameraMediaItem[]>(initialItems);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Live GPS state
  const [gpsLocked, setGpsLocked] = useState(false);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number; acc: number } | null>(null);

  // Screen Flash fallback state
  const [showScreenFlash, setShowScreenFlash] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── 1. Setup Live GPS Watch (Continuous while camera is open) ─────────────
  useEffect(() => {
    if (!isOpen) return;

    if (!('geolocation' in navigator)) {
      showToast(t.gpsRequiredNotice);
      return;
    }

    const onGeoSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setCurrentGps({ lat: latitude, lng: longitude, acc: Math.round(accuracy) });
      setGpsLocked(true);
    };

    const onGeoError = (err: GeolocationPositionError) => {
      console.warn('Geolocation watch error:', err.message);
      // Keep previous GPS if available
    };

    const watchId = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, showToast, t.gpsRequiredNotice]);

  // ─── 2. Initialize Camera Stream ──────────────────────────────────────────
  const initCamera = useCallback(
    async (targetFacing: 'environment' | 'user') => {
      setCameraError(null);

      // Stop any existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(t.cameraInsecureContext);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false, // Audio requested separately for video recording
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError(t.cameraPermissionDenied);
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError(t.cameraNotFound);
        } else {
          setCameraError(t.cameraInsecureContext);
        }
      }
    },
    [t.cameraInsecureContext, t.cameraNotFound, t.cameraPermissionDenied]
  );

  useEffect(() => {
    if (isOpen) {
      initCamera(facingMode);
    } else {
      // Cleanup stream when closed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  }, [isOpen, facingMode, initCamera]);

  // ─── 3. Torch / Flash Handler ─────────────────────────────────────────────
  const handleToggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = (track as any)?.getCapabilities?.();

    if (capabilities && 'torch' in capabilities) {
      try {
        const next = !torchOn;
        await (track as any).applyConstraints({ advanced: [{ torch: next }] });
        setTorchOn(next);
      } catch {
        triggerScreenFlash();
      }
    } else {
      triggerScreenFlash();
    }
  };

  const triggerScreenFlash = () => {
    setShowScreenFlash(true);
    setTimeout(() => setShowScreenFlash(false), 220);
    showToast(t.torchUnsupported);
  };

  // ─── 4. Switch Front/Back Camera ──────────────────────────────────────────
  const handleSwitchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setTorchOn(false);
  };

  // ─── 5. Request Fresh GPS Fix on Shutter ───────────────────────────────────
  const getFreshGpsFix = async (): Promise<{ lat: number; lng: number; acc: number } | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve(currentGps);
        return;
      }

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(currentGps); // Fallback to latest watchPosition fix
        }
      }, 4000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              acc: Math.round(pos.coords.accuracy),
            });
          }
        },
        () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(currentGps); // Fallback to watchPosition
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 4000 }
      );
    });
  };

  // ─── 6. Face Blur on Canvas ───────────────────────────────────────────────
  const applyFaceBlur = async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    if (!('FaceDetector' in window)) {
      showToast(t.faceDetectorUnsupported);
      return;
    }

    try {
      const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
      const faces = await detector.detect(canvas);
      if (faces && faces.length > 0) {
        faces.forEach((face: any) => {
          const { x, y, width, height } = face.boundingBox;
          const pad = Math.round(width * 0.15);
          const bx = Math.max(0, Math.round(x - pad));
          const by = Math.max(0, Math.round(y - pad));
          const bw = Math.min(canvas.width - bx, Math.round(width + pad * 2));
          const bh = Math.min(canvas.height - by, Math.round(height + pad * 2));

          pixelateRegion(ctx, bx, by, bw, bh, 16);
        });
      }
    } catch (err) {
      console.warn('FaceDetector error:', err);
      showToast(t.faceDetectorUnsupported);
    }
  };

  const pixelateRegion = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    pixelSize = 16
  ) => {
    try {
      const imgData = ctx.getImageData(x, y, w, h);
      const data = imgData.data;

      for (let py = 0; py < h; py += pixelSize) {
        for (let px = 0; px < w; px += pixelSize) {
          const pIndex = (py * w + px) * 4;
          const r = data[pIndex];
          const g = data[pIndex + 1];
          const b = data[pIndex + 2];
          const a = data[pIndex + 3];

          for (let subY = 0; subY < pixelSize && py + subY < h; subY++) {
            for (let subX = 0; subX < pixelSize && px + subX < w; subX++) {
              const targetIndex = ((py + subY) * w + (px + subX)) * 4;
              data[targetIndex] = r;
              data[targetIndex + 1] = g;
              data[targetIndex + 2] = b;
              data[targetIndex + 3] = a;
            }
          }
        }
      }
      ctx.putImageData(imgData, x, y);
    } catch {}
  };

  // ─── 7. Capture Photo with Geo-Stamp ──────────────────────────────────────
  const handleCapturePhoto = async () => {
    if (captures.length >= 5) {
      showToast(t.maxMediaReached);
      return;
    }

    if (!videoRef.current) return;
    const video = videoRef.current;

    // Fresh GPS fix check
    const gps = await getFreshGpsFix();
    if (!gps) {
      showToast(t.gpsRequiredNotice);
      return;
    }

    // Screen flash effect if torch off
    if (!torchOn) {
      setShowScreenFlash(true);
      setTimeout(() => setShowScreenFlash(false), 140);
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Optional face blur
    if (blurFaces) {
      await applyFaceBlur(canvas, ctx);
    }

    // Burn Geo-stamp onto bottom of photo
    const bannerHeight = Math.max(54, Math.round(canvas.height * 0.09));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; // Crisp dark slate banner
    ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

    // Top border teal accent
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, 3);

    const now = new Date();
    const dateFormatted = now.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const fontSize = Math.max(13, Math.round(bannerHeight * 0.28));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';

    const line1 = `📍 GEO-STAMPED: ${gps.lat.toFixed(5)}°N, ${gps.lng.toFixed(5)}°E (±${gps.acc}m) • ${dateFormatted}`;
    const line2 = `🛡️ SAHAAYE VERIFIED COMMUNITY PROOF • DIGNITY-FIRST`;

    ctx.fillText(line1, 16, canvas.height - bannerHeight + bannerHeight * 0.35);
    ctx.font = `500 ${Math.round(fontSize * 0.8)}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#5eead4';
    ctx.fillText(line2, 16, canvas.height - bannerHeight + bannerHeight * 0.75);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    const newItem: CameraMediaItem = {
      id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'photo',
      dataUrl,
      lat: gps.lat,
      lng: gps.lng,
      acc: gps.acc,
      timestamp: now.toISOString(),
    };

    setCaptures((prev) => [...prev, newItem]);
    showToast(lang === 'hi' ? '✓ फ़ोटो जियो-स्टैम्प के साथ सुरक्षित' : '✓ Photo captured with geo-stamp');
  };

  // ─── 8. Video Recording with MediaRecorder & 30s Auto-Stop ────────────────
  const handleStartRecording = async () => {
    if (captures.length >= 5) {
      showToast(t.maxMediaReached);
      return;
    }

    const gps = await getFreshGpsFix();
    if (!gps) {
      showToast(t.gpsRequiredNotice);
      return;
    }

    videoChunksRef.current = [];

    // Attempt video + audio stream; fallback to video-only if mic unavailable
    let recordStream = streamRef.current;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (recordStream && audioStream) {
        const combined = new MediaStream([
          ...recordStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);
        recordStream = combined;
      }
    } catch {
      // Audio permission denied or mic not available; proceed with video-only
    }

    if (!recordStream) return;

    try {
      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? { mimeType: 'video/webm;codecs=vp9,opus' }
        : MediaRecorder.isTypeSupported('video/webm')
        ? { mimeType: 'video/webm' }
        : MediaRecorder.isTypeSupported('video/mp4')
        ? { mimeType: 'video/mp4' }
        : undefined;

      const recorder = new MediaRecorder(recordStream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        });

        // Capture current video frame for video thumbnail
        let thumbUrl = '';
        if (videoRef.current) {
          const c = document.createElement('canvas');
          c.width = videoRef.current.videoWidth || 640;
          c.height = videoRef.current.videoHeight || 360;
          const cCtx = c.getContext('2d');
          if (cCtx) {
            cCtx.drawImage(videoRef.current, 0, 0, c.width, c.height);
            thumbUrl = c.toDataURL('image/jpeg', 0.8);
          }
        }

        const newItem: CameraMediaItem = {
          id: `video_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'video',
          dataUrl: thumbUrl,
          videoBlob,
          lat: gps.lat,
          lng: gps.lng,
          acc: gps.acc,
          timestamp: new Date().toISOString(),
        };

        setCaptures((prev) => [...prev, newItem]);
        showToast(lang === 'hi' ? '✓ वीडियो क्लिप सुरक्षित हो गई' : '✓ Video clip recorded with location');
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start recording seconds interval & 30-second auto-stop
      let elapsed = 0;
      recordIntervalRef.current = setInterval(() => {
        elapsed += 1;
        setRecordingSeconds(elapsed);
        if (elapsed >= 30) {
          handleStopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('Recording start error:', err);
      showToast('Could not start video recorder.');
    }
  };

  const handleStopRecording = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // ─── 9. Done / Remove Items ───────────────────────────────────────────────
  const handleRemoveCapture = (id: string) => {
    setCaptures((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFinish = () => {
    if (isRecording) {
      handleStopRecording();
    }
    onDone(captures);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="live-camera-fullscreen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#090d16',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Screen Flash Overlay for fallback ── */}
      {showScreenFlash && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#ffffff',
            zIndex: 10010,
            pointerEvents: 'none',
            animation: 'flash-fade 0.2s ease-out',
          }}
        />
      )}

      {/* ── Top Header Bar ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10002,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        }}
      >
        {/* GPS Locked Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 12px',
            borderRadius: 20,
            background: gpsLocked ? 'rgba(13, 148, 136, 0.25)' : 'rgba(234, 88, 12, 0.25)',
            border: gpsLocked ? '1px solid #14b8a6' : '1px solid #f97316',
            backdropFilter: 'blur(8px)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: gpsLocked ? '#10b981' : '#f59e0b',
              boxShadow: gpsLocked ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
              animation: 'pulse 1.8s infinite',
            }}
          />
          <span>
            {gpsLocked && currentGps
              ? `${t.cameraLocationLocked} ±${currentGps.acc}m`
              : t.cameraFindingLocation}
          </span>
        </div>

        {/* Top Controls: Flash, Switch Camera, Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Flash / Torch Toggle */}
          <button
            type="button"
            onClick={handleToggleFlash}
            title={t.flashBtn}
            aria-label={t.flashBtn}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: torchOn ? '#f59e0b' : 'rgba(255,255,255,0.18)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
            }}
          >
            {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
          </button>

          {/* Front / Back Switch */}
          <button
            type="button"
            onClick={handleSwitchCamera}
            title={t.switchCameraBtn}
            aria-label={t.switchCameraBtn}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
            }}
          >
            <RotateCcw size={18} />
          </button>

          {/* Close Camera Button */}
          <button
            type="button"
            onClick={onClose}
            title={t.closeModal}
            aria-label={t.closeModal}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Viewport Video Element ── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Recording Indicator */}
        {isRecording && (
          <div
            style={{
              position: 'absolute',
              top: 74,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(220, 38, 38, 0.9)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              zIndex: 10003,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ffffff',
                animation: 'pulse 1s infinite',
              }}
            />
            <span>REC {String(recordingSeconds).padStart(2, '0')}s / 30s</span>
          </div>
        )}

        {/* Camera Hardware / Permission Error Notice */}
        {cameraError && (
          <div
            style={{
              position: 'absolute',
              inset: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.94)',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              zIndex: 10005,
            }}
          >
            <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Camera Access Notice</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 360, lineHeight: 1.5 }}>
              {cameraError}
            </p>
            <button
              type="button"
              onClick={() => initCamera(facingMode)}
              style={{
                marginTop: 18,
                padding: '9px 20px',
                borderRadius: 8,
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* In-app Toast message inside camera */}
        {toastMessage && (
          <div
            style={{
              position: 'absolute',
              bottom: 120,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.92)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: 24,
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.15)',
              zIndex: 10006,
              whiteSpace: 'nowrap',
              maxWidth: '90vw',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {toastMessage}
          </div>
        )}
      </div>

      {/* ── Bottom Controls & Thumbnail Strip ── */}
      <div
        style={{
          zIndex: 10002,
          padding: '12px 16px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Row 1: Mode Switcher & Blur Faces Filter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Photo / Video Mode Pill */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 20,
              padding: 3,
            }}
          >
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setMode('photo')}
              style={{
                padding: '6px 16px',
                borderRadius: 16,
                border: 'none',
                background: mode === 'photo' ? '#0d9488' : 'transparent',
                color: mode === 'photo' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: 12,
                cursor: isRecording ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.photoMode}
            </button>
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setMode('video')}
              style={{
                padding: '6px 16px',
                borderRadius: 16,
                border: 'none',
                background: mode === 'video' ? '#0d9488' : 'transparent',
                color: mode === 'video' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: 12,
                cursor: isRecording ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.videoMode}
            </button>
          </div>

          {/* Blur Faces Checkbox (Photo mode only) */}
          {mode === 'photo' && (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                color: '#e2e8f0',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={blurFaces}
                onChange={(e) => setBlurFaces(e.target.checked)}
                style={{
                  accentColor: '#0d9488',
                  width: 15,
                  height: 15,
                  cursor: 'pointer',
                }}
              />
              <span>{t.blurFacesCheckbox}</span>
            </label>
          )}
        </div>

        {/* Row 2: Thumbnail Strip (Horizontal scroll, max 5 items) */}
        {captures.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {captures.map((item, index) => (
              <div
                key={item.id}
                style={{
                  position: 'relative',
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1.5px solid #0d9488',
                  background: '#1e293b',
                }}
              >
                <img
                  src={item.dataUrl}
                  alt={`Capture ${index + 1}`}
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
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleRemoveCapture(item.id)}
                  title="Remove capture"
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.9)',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Row 3: Action Bar (Counter / Shutter Button / Done Button) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 4,
          }}
        >
          {/* Counter (e.g. 2/5) */}
          <div
            style={{
              minWidth: 70,
              fontSize: 13,
              fontWeight: 700,
              color: captures.length >= 5 ? '#f59e0b' : '#94a3b8',
            }}
          >
            {captures.length} / 5
          </div>

          {/* Shutter / Record Trigger */}
          {mode === 'photo' ? (
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={captures.length >= 5}
              title={t.capturePhotoBtn}
              aria-label={t.capturePhotoBtn}
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: captures.length >= 5 ? '#475569' : '#ffffff',
                border: '4px solid #0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: captures.length >= 5 ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 20px rgba(13, 148, 136, 0.4)',
                transform: 'scale(1)',
                transition: 'transform 0.1s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: captures.length >= 5 ? '#64748b' : '#0d9488',
                }}
              />
            </button>
          ) : isRecording ? (
            <button
              type="button"
              onClick={handleStopRecording}
              title={t.stopVideoBtn}
              aria-label={t.stopVideoBtn}
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: '#ffffff',
                border: '4px solid #dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 4,
                  background: '#dc2626',
                }}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={captures.length >= 5}
              title={t.recordVideoBtn}
              aria-label={t.recordVideoBtn}
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: captures.length >= 5 ? '#475569' : '#ffffff',
                border: '4px solid #dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: captures.length >= 5 ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: captures.length >= 5 ? '#64748b' : '#dc2626',
                }}
              />
            </button>
          )}

          {/* Done Button */}
          <button
            type="button"
            onClick={handleFinish}
            style={{
              minWidth: 70,
              padding: '9px 16px',
              borderRadius: 20,
              background: '#0d9488',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <Check size={16} />
            <span>{t.doneBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
