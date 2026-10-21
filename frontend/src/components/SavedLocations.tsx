import React, { useState } from 'react';
import { Home, Briefcase, Heart, MapPin, Plus, Trash2, Bell, Check } from 'lucide-react';
import { useLocationStore, SavedLocationItem } from '../stores/useLocationStore';

interface SavedLocationsProps {
  onSelect: (item: SavedLocationItem) => void;
}

export const SavedLocations: React.FC<SavedLocationsProps> = ({ onSelect }) => {
  const savedLocations = useLocationStore((s) => s.savedLocations);
  const location = useLocationStore((s) => s.location);
  const addSavedLocation = useLocationStore((s) => s.addSavedLocation);
  const removeSavedLocation = useLocationStore((s) => s.removeSavedLocation);
  const toggleNotificationArea = useLocationStore((s) => s.toggleNotificationArea);

  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [notifyToggle, setNotifyToggle] = useState(true);

  const getIconForLabel = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('home')) return <Home size={14} color="#0d9488" />;
    if (l.includes('office') || l.includes('work')) return <Briefcase size={14} color="#2563eb" />;
    if (l.includes('parent') || l.includes('family')) return <Heart size={14} color="#e11d48" />;
    return <MapPin size={14} color="#7c3aed" />;
  };

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel === 'Custom' ? customLabel.trim() : newLabel;
    if (!label) return;
    await addSavedLocation(label, notifyToggle);
    setIsAdding(false);
    setCustomLabel('');
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#64748b',
          }}
        >
          Saved Spots ({savedLocations.length}/5)
        </span>
        {savedLocations.length < 5 && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0d9488',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: 0,
            }}
          >
            <Plus size={13} /> Save Current Spot
          </button>
        )}
      </div>

      {/* Save current location sub-form */}
      {isAdding && (
        <form
          onSubmit={handleSaveCurrent}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
            Save "{location.city}{location.area ? ` (${location.area})` : ''}" as:
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {['Home', 'Office', "Parents' House", 'Custom'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setNewLabel(opt)}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: newLabel === opt ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                  background: newLabel === opt ? '#f0fdfa' : '#ffffff',
                  color: newLabel === opt ? '#0f766e' : '#475569',
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {newLabel === 'Custom' && (
            <input
              type="text"
              required
              placeholder="e.g. Grandma's, College"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              color: '#475569',
              cursor: 'pointer',
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={notifyToggle}
              onChange={(e) => setNotifyToggle(e.target.checked)}
              style={{ accentColor: '#0d9488' }}
            />
            <span>Set as push-notification alert area</span>
          </label>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: 11.5,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#0d9488',
                fontSize: 11.5,
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Saved locations list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {savedLocations.map((item) => {
          const isSelected =
            location.city === item.city &&
            (item.area ? location.area === item.area : true);

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: 8,
                background: isSelected ? '#f0fdfa' : '#f8fafc',
                border: isSelected ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                onClick={() => onSelect(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {getIconForLabel(item.label)}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {item.city} {item.area ? `· ${item.area}` : ''} ({item.radiusKm} km)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Notification alert toggle */}
                <button
                  type="button"
                  title={item.isNotificationArea ? 'Notification alert active' : 'Turn on notification alerts'}
                  onClick={() => toggleNotificationArea(item.id)}
                  style={{
                    background: item.isNotificationArea ? '#fef3c7' : '#f1f5f9',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 6px',
                    cursor: 'pointer',
                    color: item.isNotificationArea ? '#d97706' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 10.5,
                  }}
                >
                  <Bell size={11} />
                  {item.isNotificationArea && <Check size={10} />}
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  title="Remove saved spot"
                  onClick={() => removeSavedLocation(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
