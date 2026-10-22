import React, { useState } from 'react';
import { X, Bell, CheckCircle2, Sparkles } from 'lucide-react';
import { API_BASE } from '../services/api';

interface CityWaitlistModalProps {
  cityName: string;
  stateName: string;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const CityWaitlistModal: React.FC<CityWaitlistModalProps> = ({
  cityName,
  stateName,
  onClose,
  onSuccessToast,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setIsSubmitting(true);
    try {
      await fetch(`${API_BASE}/location/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cityName,
          state: stateName,
          email: email.trim(),
        }),
      });

      setIsSubmitted(true);
      if (onSuccessToast) {
        onSuccessToast(`🔔 We'll notify you as soon as SAHAAYE expands to ${cityName}!`);
      }
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch {
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          maxWidth: 440,
          width: '100%',
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: '#ecfdf5',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              marginBottom: 12,
            }}
          >
            <Sparkles size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
            SAHAAYE is coming soon to {cityName}! 🚀
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
            We are currently active in Indore, Bhopal, Delhi, Mumbai, Jaipur, Pune, and Ahmedabad.
            Be the first to know when volunteers and verified seva requests launch in {cityName}, {stateName}.
          </p>
        </div>

        {isSubmitted ? (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'center',
              color: '#166534',
            }}
          >
            <CheckCircle2 size={24} style={{ margin: '0 auto 6px', display: 'block', color: '#16a34a' }} />
            <div style={{ fontWeight: 700, fontSize: 14 }}>You're on the list!</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>We will notify you at {email}.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13.5,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                padding: '11px 16px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Bell size={16} />
              {isSubmitting ? 'Saving...' : 'Notify Me When You Launch Here'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
