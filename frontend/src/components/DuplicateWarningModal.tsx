import React from 'react';
import { AlertTriangle, Users, ArrowRight, X } from 'lucide-react';
import { DuplicateNeedMatch } from '../hooks/useDuplicateCheck';

interface DuplicateWarningModalProps {
  match: DuplicateNeedMatch;
  onSupportInstead: (needId: string) => void;
  onProceedAnyway: () => void;
  onCancel: () => void;
  isSupporting?: boolean;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  match,
  onSupportInstead,
  onProceedAnyway,
  onCancel,
  isSupporting = false,
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 16,
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #fed7aa',
        animation: 'modalPop 0.2s ease-out',
      }}>
        {/* Header Warning Bar */}
        <div style={{
          background: '#fff7ed',
          borderBottom: '1px solid #ffedd5',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ea580c',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#9a3412' }}>
                Similar Need Already Reported Nearby
              </h3>
              <span style={{ fontSize: 12, color: '#c2410c' }}>
                Avoid duplicate reports to help volunteers respond faster
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9a3412',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Need Card Preview */}
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px 0', lineHeight: 1.5 }}>
            A volunteer request in the <strong>{match.category}</strong> category was already reported within{' '}
            <strong style={{ color: '#ea580c' }}>~{match.distanceMeters} meters</strong> of your location:
          </p>

          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: 14,
            padding: 14,
            display: 'flex',
            gap: 12,
            marginBottom: 20,
          }}>
            {match.imageUrl ? (
              <img
                src={match.imageUrl}
                alt="Existing Need Proof"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 10,
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1px solid #cbd5e1',
                }}
              />
            ) : (
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 10,
                background: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                flexShrink: 0,
              }}>
                🤝
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  padding: '2px 7px',
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: 700,
                }}>
                  {match.category}
                </span>
                <span style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '2px 7px',
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: 700,
                }}>
                  {match.urgency}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
                  ~{match.distanceMeters}m away
                </span>
              </div>

              <h4 style={{
                margin: '0 0 4px 0',
                fontSize: 14,
                fontWeight: 700,
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {match.title}
              </h4>

              <div style={{ fontSize: 12, color: '#64748b' }}>
                📍 {match.location}
              </div>
            </div>
          </div>

          {/* Action Choice Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              disabled={isSupporting}
              onClick={() => onSupportInstead(match.id)}
              style={{
                width: '100%',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 18px',
                fontSize: 14,
                fontWeight: 700,
                cursor: isSupporting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                transition: 'background 0.15s ease',
              }}
            >
              <Users size={18} />
              <span>{isSupporting ? 'Adding Support…' : 'Support this Need Instead (Recommended)'}</span>
            </button>

            <button
              type="button"
              onClick={onProceedAnyway}
              style={{
                width: '100%',
                background: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>This is a different need · Report Anyway</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
