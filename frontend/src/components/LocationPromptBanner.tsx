import React from 'react';
import { MapPin, Check, X, Languages } from 'lucide-react';
import { useLocationStore } from '../stores/useLocationStore';

interface LocationPromptBannerProps {
  onOpenSelector: () => void;
  onLanguageSwitch?: (lang: 'hi' | 'en') => void;
}

export const LocationPromptBanner: React.FC<LocationPromptBannerProps> = ({
  onOpenSelector,
  onLanguageSwitch,
}) => {
  const detectedPrompt = useLocationStore((s) => s.detectedPrompt);
  const confirmDetectedLocation = useLocationStore((s) => s.confirmDetectedLocation);
  const dismissDetectedPrompt = useLocationStore((s) => s.dismissDetectedPrompt);
  const languageSuggestion = useLocationStore((s) => s.languageSuggestion);
  const dismissLanguageSuggestion = useLocationStore((s) => s.dismissLanguageSuggestion);

  if (!detectedPrompt?.show && !languageSuggestion?.show) return null;

  return (
    <div style={{ padding: '8px 16px 0', maxWidth: 1200, margin: '0 auto' }}>
      {/* Detected City Prompt */}
      {detectedPrompt?.show && (
        <div
          style={{
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: 12,
            padding: '8px 14px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#ccfbf1',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={15} />
            </div>
            <span style={{ fontSize: 13, color: '#0f766e', fontWeight: 500 }}>
              Detected your location as <strong>{detectedPrompt.city}, {detectedPrompt.state}</strong>. Confirm?
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={confirmDetectedLocation}
              style={{
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Check size={13} /> Confirm
            </button>
            <button
              onClick={() => {
                dismissDetectedPrompt();
                onOpenSelector();
              }}
              style={{
                background: '#ffffff',
                color: '#0f766e',
                border: '1px solid #99f6e4',
                padding: '5px 10px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Change
            </button>
            <button
              onClick={dismissDetectedPrompt}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Suggested Language Prompt based on State */}
      {languageSuggestion?.show && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 12,
            padding: '8px 14px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Languages size={16} color="#d97706" />
            <span style={{ fontSize: 12.5, color: '#92400e' }}>
              आप <strong>{languageSuggestion.stateName}</strong> में हैं। क्या आप SAHAAYE को <strong>हिंदी (Hindi)</strong> में देखना चाहेंगे?
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => {
                if (onLanguageSwitch) onLanguageSwitch('hi');
                localStorage.setItem('sahaaye_lang', 'hi');
                dismissLanguageSuggestion();
              }}
              style={{
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              हाँ, हिंदी में बदलें
            </button>
            <button
              onClick={dismissLanguageSuggestion}
              style={{
                background: 'none',
                border: 'none',
                color: '#b45309',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
