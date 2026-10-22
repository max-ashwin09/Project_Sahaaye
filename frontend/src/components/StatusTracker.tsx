import React from 'react';
import { CheckCircle2, Clock, UserCheck, Truck, HeartHandshake, LucideIcon } from 'lucide-react';

export type NeedStatus = 'Reported' | 'Verified' | 'Volunteer Assigned' | 'In Progress' | 'Fulfilled' | 'OPEN' | 'FLAGGED';

export interface StatusHistoryEntry {
  status: NeedStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

interface StatusTrackerProps {
  currentStatus: NeedStatus;
  statusHistory?: StatusHistoryEntry[];
}

const STEPS: { key: NeedStatus; label: string; icon: LucideIcon }[] = [
  { key: 'Reported', label: 'Reported', icon: Clock },
  { key: 'Verified', label: 'Verified', icon: CheckCircle2 },
  { key: 'Volunteer Assigned', label: 'Volunteer Assigned', icon: UserCheck },
  { key: 'In Progress', label: 'In Progress', icon: Truck },
  { key: 'Fulfilled', label: 'Fulfilled', icon: HeartHandshake },
];

export const StatusTracker: React.FC<StatusTrackerProps> = ({ currentStatus, statusHistory = [] }) => {
  // Normalize 'OPEN' status from initial legacy schema to 'Reported'
  const normalizedCurrent = currentStatus === 'OPEN' ? 'Reported' : currentStatus;

  const currentIdx = STEPS.findIndex((s) => s.key === normalizedCurrent);
  const activeIndex = currentIdx >= 0 ? currentIdx : 0;

  return (
    <div style={{ padding: '16px 8px', width: '100%' }}>
      {/* Visual Stepper Pipeline */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        marginBottom: 20,
      }}>
        {/* Background Connecting Bar */}
        <div style={{
          position: 'absolute',
          top: 18,
          left: 20,
          right: 20,
          height: 3,
          background: '#e2e8f0',
          zIndex: 1,
        }} />

        {/* Active Progress Line */}
        <div style={{
          position: 'absolute',
          top: 18,
          left: 20,
          width: `${(activeIndex / (STEPS.length - 1)) * (100 - 10)}%`,
          height: 3,
          background: '#10b981',
          zIndex: 2,
          transition: 'width 0.4s ease',
        }} />

        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const Icon = step.icon;

          // Find timestamp from history if available
          const historyItem = statusHistory.find((h) => h.status === step.key);
          const timeStr = historyItem
            ? new Date(historyItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : idx === 0
            ? 'Just now'
            : '';

          return (
            <div
              key={step.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 3,
                flex: 1,
              }}
            >
              {/* Circle Icon Badge */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: isDone ? '#10b981' : isCurrent ? '#059669' : '#ffffff',
                color: isDone || isCurrent ? '#ffffff' : '#94a3b8',
                border: isCurrent ? '3px solid #bbf7d0' : isDone ? '2px solid #10b981' : '2px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isCurrent ? '0 0 0 4px rgba(16,185,129,0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease',
              }}>
                <Icon size={18} />
              </div>

              {/* Step Label */}
              <span style={{
                fontSize: 11.5,
                fontWeight: isCurrent ? 700 : 600,
                color: isCurrent ? '#065f46' : isDone ? '#1e293b' : '#94a3b8',
                marginTop: 6,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>

              {/* Timestamp if reached */}
              {timeStr && (
                <span style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                  {timeStr}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Description Card */}
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{ fontSize: 20 }}>
          {activeIndex === 0 && '📡'}
          {activeIndex === 1 && '✅'}
          {activeIndex === 2 && '🙋'}
          {activeIndex === 3 && '🚚'}
          {activeIndex === 4 && '🤝'}
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#166534' }}>
            Current Status: {STEPS[activeIndex]?.label}
          </div>
          <div style={{ fontSize: 11.5, color: '#15803d' }}>
            {activeIndex === 0 && 'Report published to live seva map. Awaiting local volunteer verification.'}
            {activeIndex === 1 && 'Verified by local community volunteers. Field seva task opened.'}
            {activeIndex === 2 && 'Volunteer dispatched to the spot.'}
            {activeIndex === 3 && 'Relief materials / aid in progress of being handed over.'}
            {activeIndex === 4 && 'Need fulfilled! Thank you for strengthening your community.'}
          </div>
        </div>
      </div>
    </div>
  );
};
