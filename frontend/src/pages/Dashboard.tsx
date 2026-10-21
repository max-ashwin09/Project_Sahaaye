import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReportNeed from './ReportNeed';
import LiveMap from '../components/LiveMap';
import {
  LayoutDashboard,
  MapPin,
  Search,
  PlusCircle,
  ClipboardList,
  MessageSquare,
  Bell,
  Bookmark,
  User,
  Settings,
  LogIn,
  Smartphone,
  ArrowDownToLine,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface StatCard {
  id: string;
  value: string | number;
  label: string;
  icon: string;
  iconBg: string;
  color: string;
  trend: string;
  trendDir: 'up' | 'down';
  chartData: number[];
  chartColor: string;
}

interface Need {
  id: string;
  title: string;
  location: string;
  timeAgo: string;
  emoji: string;
  tagLabel: string;
  tagColor: string;
  tagBorder: string;
  tagBg: string;
}

interface QuickAction {
  id: string;
  label: string;
  sub: string;
  icon: string;
  bg: string;
  iconBg: string;
}

interface Activity {
  id: string;
  title: string;
  location: string;
  emoji: string;
  status: 'completed' | 'pending';
}

interface DonutSegment {
  label: string;
  pct: number;
  color: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={2} /> },
  { id: 'nearby', label: 'Nearby Needs', icon: <MapPin size={18} strokeWidth={2} /> },
  { id: 'search', label: 'Search Needs', icon: <Search size={18} strokeWidth={2} /> },
  { id: 'report', label: 'Report Need', icon: <PlusCircle size={18} strokeWidth={2} /> },
  { id: 'activities', label: 'My Activities', icon: <ClipboardList size={18} strokeWidth={2} /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} strokeWidth={2} />, badge: 3 },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} strokeWidth={2} />, badge: 12 },
  { id: 'saved', label: 'Saved', icon: <Bookmark size={18} strokeWidth={2} /> },
  { id: 'profile', label: 'Profile', icon: <User size={18} strokeWidth={2} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} strokeWidth={2} /> },
];

const STATS: StatCard[] = [
  {
    id: 'nearby', value: 28, label: 'Nearby Needs', icon: '👥',
    iconBg: '#f0fdfa', color: '#0d9488', trend: '+12%', trendDir: 'up',
    chartData: [4, 7, 5, 9, 6, 8, 10], chartColor: '#0d9488',
  },
  {
    id: 'progress', value: 9, label: 'In Progress', icon: '🔄',
    iconBg: '#fff7ed', color: '#f59e0b', trend: '+5%', trendDir: 'up',
    chartData: [3, 5, 4, 6, 5, 7, 9], chartColor: '#f59e0b',
  },
  {
    id: 'completed', value: 16, label: 'Completed', icon: '✅',
    iconBg: '#f0fdf4', color: '#10b981', trend: '+26%', trendDir: 'up',
    chartData: [5, 8, 7, 10, 9, 13, 16], chartColor: '#10b981',
  },
  {
    id: 'rating', value: '4.8', label: 'Community Rating', icon: '⭐',
    iconBg: '#fdf4ff', color: '#a855f7', trend: '+0.2', trendDir: 'up',
    chartData: [4.2, 4.3, 4.5, 4.4, 4.6, 4.7, 4.8], chartColor: '#a855f7',
  },
];

const NEEDS: Need[] = [
  {
    id: 'n1', title: 'Food Support for Family', location: 'Vijay Nagar, Indore',
    timeAgo: '10 mins ago', emoji: '🍚',
    tagLabel: 'Food', tagColor: '#2563eb', tagBorder: '#bfdbfe', tagBg: '#eff6ff',
  },
  {
    id: 'n2', title: 'Medical Help Required', location: 'Palasia, Indore',
    timeAgo: '25 mins ago', emoji: '💊',
    tagLabel: 'Medical', tagColor: '#e11d48', tagBorder: '#fecdd3', tagBg: '#fff1f2',
  },
  {
    id: 'n3', title: 'School Supplies Needed', location: 'Scheme 54, Indore',
    timeAgo: '1 hour ago', emoji: '📚',
    tagLabel: 'Education', tagColor: '#0d9488', tagBorder: '#99f6e4', tagBg: '#f0fdfa',
  },
  {
    id: 'n4', title: 'Elderly Care Support', location: 'Annapurna Road, Indore',
    timeAgo: '2 hours ago', emoji: '👴',
    tagLabel: 'Elderly', tagColor: '#7c3aed', tagBorder: '#ddd6fe', tagBg: '#f5f3ff',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'report', label: 'Report a Need', sub: 'Let the community know', icon: '➕', bg: '#eff6ff', iconBg: '#dbeafe' },
  { id: 'find', label: 'Find Nearby Needs', sub: 'Explore around you', icon: '🗺️', bg: '#f0fdf4', iconBg: '#d1fae5' },
  { id: 'myreports', label: 'My Reports', sub: 'Track your submissions', icon: '📋', bg: '#f5f3ff', iconBg: '#ede9fe' },
  { id: 'helping', label: 'My Helping Activities', sub: 'See your impact', icon: '❤️', bg: '#fff1f2', iconBg: '#fce7f3' },
];

const ACTIVITIES: Activity[] = [
  { id: 'a1', title: 'Helped with Food Supplies', location: 'Vijay Nagar, Indore • 2 days ago', emoji: '🍚', status: 'completed' },
  { id: 'a2', title: 'Clothes Donation', location: 'Rajwada, Indore • 4 days ago', emoji: '👕', status: 'completed' },
  { id: 'a3', title: 'Medical Support', location: 'MY Hospital, Indore • 1 week ago', emoji: '💊', status: 'completed' },
];

const DONUT_SEGMENTS: DonutSegment[] = [
  { label: 'Food', pct: 28, color: '#2563eb' },
  { label: 'Medical', pct: 22, color: '#e11d48' },
  { label: 'Education', pct: 18, color: '#0d9488' },
  { label: 'Shelter', pct: 14, color: '#f59e0b' },
  { label: 'Elderly', pct: 10, color: '#7c3aed' },
  { label: 'Others', pct: 8, color: '#94a3b8' },
];

const MAP_PINS = [
  { x: '30%', y: '35%', color: '#2563eb', emoji: '🍚', delay: 0 },
  { x: '55%', y: '28%', color: '#7c3aed', emoji: '💊', delay: 0.15 },
  { x: '70%', y: '55%', color: '#f59e0b', emoji: '🏠', delay: 0.25 },
  { x: '25%', y: '65%', color: '#0d9488', emoji: '📚', delay: 0.1 },
  { x: '65%', y: '75%', color: '#e11d48', emoji: '❤️', delay: 0.3 },
  { x: '45%', y: '60%', color: '#10b981', emoji: '🍚', delay: 0.2 },
];

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const REPORTED = [18, 28, 22, 35, 27, 32, 30];
const COMPLETED_DATA = [10, 15, 12, 20, 18, 22, 20];

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useRipple() {
  const addRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const existing = el.querySelector('.ripple');
    existing?.remove();

    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    Object.assign(ripple.style, {
      width: `${size}px`,
      height: `${size}px`,
      left: `${e.clientX - rect.left - size / 2}px`,
      top: `${e.clientY - rect.top - size / 2}px`,
    });
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }, []);
  return addRipple;
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ─── Mini Sparkline SVG ───────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const w = 60, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="mini-chart" viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points={`0,${h} ${pts} ${w},${h}`}
        fill={color} fillOpacity="0.12" stroke="none" />
    </svg>
  );
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────
const DonutChart: React.FC<{ segments: DonutSegment[]; total: number }> = ({ segments, total }) => {
  const r = 52, cx = 65, cy = 65, strokeW = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg className="donut-svg" viewBox="0 0 130 130">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * circ;
        const gap = circ - dash;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
};

// ─── Bar Chart ────────────────────────────────────────────────────────────────
const BarChart: React.FC = () => {
  const maxVal = Math.max(...REPORTED, ...COMPLETED_DATA);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="impact-chart">
      <div className="chart-legend">
        <div className="chart-legend-item">
          <div className="legend-swatch" style={{ background: '#2563eb' }} />
          <span>Needs Reported</span>
        </div>
        <div className="chart-legend-item">
          <div className="legend-swatch" style={{ background: '#cbd5e1' }} />
          <span>Needs Completed</span>
        </div>
      </div>
      <div className="bar-chart">
        {WEEK_LABELS.map((label, i) => (
          <div key={label} className="bar-col">
            <div className="bar-group">
              <div
                className="bar"
                title={`Reported: ${REPORTED[i]}`}
                style={{
                  height: visible ? `${(REPORTED[i] / maxVal) * 100}%` : '0%',
                  background: '#2563eb',
                  transitionDelay: `${i * 60}ms`,
                }}
              />
              <div
                className="bar"
                title={`Completed: ${COMPLETED_DATA[i]}`}
                style={{
                  height: visible ? `${(COMPLETED_DATA[i] / maxVal) * 100}%` : '0%',
                  background: '#e2e8f0',
                  transitionDelay: `${i * 60 + 30}ms`,
                }}
              />
            </div>
            <div className="bar-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Stat Card Component ──────────────────────────────────────────────────────
const StatCardItem: React.FC<{ stat: StatCard; onClick: () => void }> = ({ stat, onClick }) => {
  const addRipple = useRipple();
  const numVal = typeof stat.value === 'number' ? stat.value : parseFloat(stat.value as string);
  const countedVal = useCountUp(numVal);
  const displayVal = typeof stat.value === 'string' && stat.value.includes('.')
    ? countedVal.toFixed(1)
    : countedVal;

  return (
    <div
      className="stat-card ripple-container"
      style={{ borderTop: `3px solid ${stat.color}` }}
      onClick={(e) => { addRipple(e); onClick(); }}
      role="button"
      tabIndex={0}
    >
      <div className="stat-icon-wrap" style={{ background: stat.iconBg }}>
        <span style={{ fontSize: '22px' }}>{stat.icon}</span>
      </div>
      <div className="stat-body">
        <div className="stat-value" style={{ color: stat.color }}>{displayVal}</div>
        <div className="stat-label">{stat.label}</div>
      </div>
      <div className="stat-trend">
        <div className={`trend-badge ${stat.trendDir}`}>{stat.trend}</div>
        <Sparkline data={stat.chartData} color={stat.chartColor} />
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [needsList, setNeedsList] = useState<Need[]>(NEEDS);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; avatar: string } | null>(() => {
    try {
      const stored = localStorage.getItem('sahaaye_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [apkInfo, setApkInfo] = useState<{
    fileSizeMb: string;
    version: string;
    lastUpdated: string;
    downloadUrl: string;
  } | null>(null);

  // Day / Night mode for Hero Banner animation (Auto-detected from local hour, toggleable)
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    const hr = new Date().getHours();
    return hr >= 19 || hr < 6; // 7:00 PM to 6:00 AM is Night
  });

  const addRipple = useRipple();
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/v1/app/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success) {
          setApkInfo({
            fileSizeMb: data.fileSizeMb || '25.0 MB',
            version: data.version || '1.0.0',
            lastUpdated: data.lastUpdated,
            downloadUrl: data.downloadUrl || '/downloads/sahaaye-latest.apk',
          });
        } else {
          setApkInfo({
            fileSizeMb: '25.0 MB',
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            downloadUrl: '/downloads/sahaaye-latest.apk',
          });
        }
      })
      .catch(() => {
        setApkInfo({
          fileSizeMb: '25.0 MB',
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          downloadUrl: '/downloads/sahaaye-latest.apk',
        });
      });
  }, []);

  const fetchLiveNeeds = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/needs');
      if (res.ok) {
        const data = await res.json();
        if (data && data.needs && data.needs.length > 0) {
          const mapped: Need[] = data.needs.map((item: any) => {
            const cat = item.category || 'Food';
            const isFood = cat.toLowerCase().includes('food');
            const isMed = cat.toLowerCase().includes('med');
            const isEdu = cat.toLowerCase().includes('edu');
            const isShelter = cat.toLowerCase().includes('shelter');
            const isElderly = cat.toLowerCase().includes('elder');

            const emoji = isFood ? '🍚' : isMed ? '💊' : isEdu ? '📚' : isShelter ? '🏠' : isElderly ? '👴' : '🤝';
            const tagColor = isFood ? '#2563eb' : isMed ? '#e11d48' : isEdu ? '#0d9488' : isShelter ? '#7c3aed' : '#d97706';
            const tagBorder = isFood ? '#bfdbfe' : isMed ? '#fecdd3' : isEdu ? '#99f6e4' : isShelter ? '#ddd6fe' : '#fde68a';
            const tagBg = isFood ? '#eff6ff' : isMed ? '#fff1f2' : isEdu ? '#f0fdfa' : isShelter ? '#f5f3ff' : '#fef3c7';

            return {
              id: item.id,
              title: item.title,
              location: item.location || 'Community Location',
              timeAgo: item.distanceKm ? `${item.distanceKm} km away` : 'Recently',
              emoji,
              tagLabel: item.category || 'Need',
              tagColor,
              tagBorder,
              tagBg,
            };
          });
          setNeedsList(mapped);
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchLiveNeeds();
    const interval = setInterval(fetchLiveNeeds, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveNeeds]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const handleNav = useCallback((id: string) => {
    setActiveNav(id);
    setMobileOpen(false);
    if (id !== 'dashboard') showToast(`Navigating to ${NAV_ITEMS.find(n => n.id === id)?.label}…`);
  }, [showToast]);

  const handleStatClick = (stat: StatCard) => {
    showToast(`${stat.label}: ${stat.value} (${stat.trend} this week)`);
  };

  return (
    <div className="dashboard-shell">
      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ═══ SIDEBAR ════════════════════════════════════════════════════════ */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <a className="sidebar-logo" onClick={() => handleNav('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon logo-icon--img">
            <img
              src="/sahaaye-logo.png"
              alt="Sahaaye Logo"
              style={{ width: '72px', height: '72px', objectFit: 'contain' }}
            />
          </div>
          <div className="logo-text">
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}>SAHAAYE</h2>
            <span>Discover · Connect · Contribute</span>
          </div>
        </a>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <a
            href={apkInfo?.downloadUrl || '/downloads/sahaaye-latest.apk'}
            download="Sahaaye-Latest.apk"
            className="sidebar-app-btn ripple-container"
            onClick={(e) => {
              addRipple(e);
              showToast('📥 Downloading SAHAAYE Android APK…');
            }}
            title="Download SAHAAYE Android App"
          >
            <div className="sidebar-app-btn-icon">
              <Smartphone size={18} />
            </div>
            <div className="sidebar-app-btn-text">
              <span className="sidebar-app-btn-title">Android App</span>
              <span className="sidebar-app-btn-sub">v{apkInfo?.version || '1.0'} • {apkInfo?.fileSizeMb || '25 MB'}</span>
            </div>
            <ArrowDownToLine size={16} className="sidebar-app-btn-dl" />
          </a>

          <div
            className="sidebar-cta ripple-container"
            onClick={(e) => { addRipple(e); showToast('Together for a Kinder Indore! 🌟'); }}
          >
            <span className="sidebar-cta-emoji">❤️</span>
            <h4>Together for a Kinder Indore</h4>
            <p>Every act of kindness matters in our community.</p>
            <button className="sidebar-cta-btn">→</button>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN AREA ══════════════════════════════════════════════════════ */}
      <div className="main-area">

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
        <header className="topbar">
          <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            <div className="toggle-bar" />
            <div className="toggle-bar" />
            <div className="toggle-bar" />
          </button>

          <div className="search-box">
            <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search needs, location, or keywords…"
              onFocus={(e) => e.target.parentElement?.classList.add('focused')}
              onBlur={(e) => e.target.parentElement?.classList.remove('focused')}
            />
          </div>

          <div className="topbar-right">
            <a
              href={apkInfo?.downloadUrl || '/downloads/sahaaye-latest.apk'}
              download="Sahaaye-Latest.apk"
              className="download-topbar-btn ripple-container"
              onClick={(e) => {
                addRipple(e);
                showToast('📥 Downloading SAHAAYE Android APK…');
              }}
              title="Download Android App APK (Latest Build)"
            >
              <Smartphone size={15} />
              <span>Get Android App</span>
              <span className="download-topbar-badge">{apkInfo?.fileSizeMb || '25 MB'}</span>
            </a>

            <button
              className="location-btn ripple-container"
              onClick={(e) => { addRipple(e); showToast('📍 Location: Indore, MP'); }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span>Indore, MP</span>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div className="icon-btn ripple-container" onClick={(e) => { addRipple(e); showToast(currentUser ? '🔔 12 new notifications' : '🔔 Please login to view notifications'); }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {currentUser && <div className="badge">12</div>}
            </div>

            {currentUser ? (
              <div
                className="user-chip ripple-container"
                onClick={(e) => { addRipple(e); showToast(`👤 ${currentUser.name}'s Profile`); }}
              >
                <div className="user-avatar">{currentUser.avatar || currentUser.name.charAt(0)}</div>
                <div className="user-info">
                  <div className="user-name">{currentUser.name}</div>
                  <div className="user-role">{currentUser.role || 'Helper'}</div>
                </div>
                <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            ) : (
              <button
                className="signin-btn ripple-container"
                onClick={(e) => {
                  addRipple(e);
                  showToast('🔑 Login modal / page jald hi open hoga!');
                }}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* ── PAGE CONTENT ───────────────────────────────────────────────── */}
        <main className="page-content">
          {activeNav === 'report' ? (
            <ReportNeed
              onCancel={() => handleNav('dashboard')}
              onSuccess={() => {
                showToast('🎉 Need reported and published to community!');
                handleNav('dashboard');
              }}
            />
          ) : (
            <>
              {/* ── HERO BANNER (Animated Day / Night View) ────────────────── */}
              <div className={`hero-banner ${isNightMode ? 'night-mode' : ''}`}>
                {/* Hero Text with Original Colors & Day/Night Switcher */}
                <div className="hero-text">
                  <h1>{currentUser ? `Welcome Back, ${currentUser.name}! 👋` : 'Welcome to SAHAAYE! 🤝'}</h1>
                  <p>
                    {currentUser
                      ? "Small actions create big changes. Let's keep making the difference."
                      : "Discover local needs, connect with communities, and lend a helping hand across India."}
                  </p>
                  <button
                    type="button"
                    className={`day-night-pill-btn ${isNightMode ? 'night' : 'day'}`}
                    onClick={() => {
                      const next = !isNightMode;
                      setIsNightMode(next);
                      showToast(next ? '🌙 Night View Activated (Moon, Stars & Night Aura)' : '☀️ Day View Activated (Sun, Birds & Daylight)');
                    }}
                    title="Click to toggle between Day and Night animated themes"
                  >
                    <span className="pill-dot" />
                    <span>{isNightMode ? '🌙 Night View Active' : '☀️ Day View Active'}</span>
                  </button>
                </div>

                {/* Hero Illustration: Realistic Atmospheric Day / Night Landscape */}
                <div className="hero-illustration">
                  <svg className="hero-landscape-svg" viewBox="0 0 480 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      {/* Atmospheric Filters */}
                      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* Mountain Gradients (Aerial Perspective) */}
                      <linearGradient id="farMntGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#1e1b4b' : '#93c5fd'} stopOpacity={isNightMode ? 0.75 : 0.6} />
                        <stop offset="100%" stopColor={isNightMode ? '#0f172a' : '#dbeafe'} stopOpacity={0.15} />
                      </linearGradient>

                      <linearGradient id="midMntGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#1e293b' : '#6ee7b7'} stopOpacity={isNightMode ? 0.85 : 0.65} />
                        <stop offset="100%" stopColor={isNightMode ? '#0f172a' : '#a7f3d0'} stopOpacity={0.2} />
                      </linearGradient>

                      <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#1e1b4b' : '#ffffff'} stopOpacity={isNightMode ? 0.3 : 0.55} />
                        <stop offset="100%" stopColor={isNightMode ? '#0f172a' : '#e0f2fe'} stopOpacity={0} />
                      </linearGradient>

                      {/* Rolling Hills Gradients */}
                      <linearGradient id="hillBackGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#064e3b' : '#34d399'} />
                        <stop offset="100%" stopColor={isNightMode ? '#022c22' : '#059669'} />
                      </linearGradient>

                      <linearGradient id="hillMidGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#047857' : '#10b981'} />
                        <stop offset="100%" stopColor={isNightMode ? '#011f18' : '#047857'} />
                      </linearGradient>

                      <linearGradient id="hillForeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#059669' : '#059669'} />
                        <stop offset="100%" stopColor={isNightMode ? '#01150f' : '#022c22'} />
                      </linearGradient>

                      {/* Day Sun Gradients */}
                      <radialGradient id="sunBloomGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#fef08a" stopOpacity="0.7" />
                        <stop offset="70%" stopColor="#fed7aa" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </radialGradient>

                      <linearGradient id="godRayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                        <stop offset="40%" stopColor="#fef08a" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#fed7aa" stopOpacity="0" />
                      </linearGradient>

                      {/* Cloud Gradients */}
                      <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.35" />
                      </linearGradient>

                      {/* Night Moon Gradients */}
                      <radialGradient id="moonAtmosphereGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                        <stop offset="45%" stopColor="#c7d2fe" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
                      </radialGradient>

                      <linearGradient id="moonCrescentGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="60%" stopColor="#fef08a" />
                        <stop offset="100%" stopColor="#fde047" />
                      </linearGradient>

                      {/* Meteor Trail Gradient */}
                      <linearGradient id="meteorGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                        <stop offset="75%" stopColor="#c7d2fe" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                      </linearGradient>

                      {/* Architecture Gradients */}
                      <linearGradient id="hubRoofGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#334155' : '#475569'} />
                        <stop offset="100%" stopColor={isNightMode ? '#1e293b' : '#334155'} />
                      </linearGradient>

                      <linearGradient id="hubWallGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#1e293b' : '#f8fafc'} />
                        <stop offset="100%" stopColor={isNightMode ? '#0f172a' : '#e2e8f0'} />
                      </linearGradient>

                      <linearGradient id="cabinRoofGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#7c2d12' : '#c2410c'} />
                        <stop offset="100%" stopColor={isNightMode ? '#431407' : '#9a3412'} />
                      </linearGradient>

                      <linearGradient id="cabinWallGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isNightMode ? '#334155' : '#fef3c7'} />
                        <stop offset="100%" stopColor={isNightMode ? '#1e293b' : '#fde68a'} />
                      </linearGradient>

                      {/* Night Window Cast Light onto Ground */}
                      <linearGradient id="groundLightSpillGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fde047" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                      </linearGradient>

                      {/* Botanical Pine Tree Template Def */}
                      <g id="pineTree">
                        <path d="M0,-24 L3,-19 L1.5,-19 L4.5,-13 L2.2,-13 L6.5,-6 L3.2,-6 L8,2 L-8,2 L-3.2,-6 L-6.5,-6 L-2.2,-13 L-4.5,-13 L-1.5,-19 L-3,-19 Z" />
                        <rect x="-1" y="2" width="2" height="4" fill="#451a03" />
                      </g>
                    </defs>

                    {/* ─── LAYER 1: Distant Atmospheric Mountain Ridges (Natural Contours) ─── */}
                    <path
                      d="M-10,140 L-10,72 Q35,66 70,52 Q115,36 150,48 Q190,62 230,42 Q265,24 305,34 Q345,44 380,28 Q420,12 455,26 Q475,34 490,30 L490,140 Z"
                      fill="url(#farMntGrad)"
                    />

                    {/* Horizontal Atmosphere / Valley Mist Band */}
                    <path
                      d="M-10,140 L-10,76 Q100,68 200,74 Q300,78 400,68 L490,72 L490,140 Z"
                      fill="url(#mistGrad)"
                    />

                    {/* Mid-Distance Mountain Ridge */}
                    <path
                      d="M-10,140 L-10,88 Q45,78 95,84 Q145,90 190,76 Q240,62 285,70 Q335,78 380,60 Q430,44 490,64 L490,140 Z"
                      fill="url(#midMntGrad)"
                    />

                    {/* ─── LAYER 2: DAY SKY (Realistic Sun Bloom, Volumetric Rays, Strata Clouds & Birds) ─── */}
                    {!isNightMode && (
                      <g className="day-sky-group">
                        {/* Volumetric Sunbeams / God Rays */}
                        <g className="anim-god-rays">
                          <polygon points="370,36 280,140 325,140" fill="url(#godRayGrad)" />
                          <polygon points="370,36 355,140 405,140" fill="url(#godRayGrad)" />
                          <polygon points="370,36 430,140 475,140" fill="url(#godRayGrad)" />
                        </g>

                        {/* Outer Atmospheric Sun Bloom */}
                        <circle cx="370" cy="36" r="38" fill="url(#sunBloomGrad)" className="anim-sun-bloom" />

                        {/* Radiant Sun Disc */}
                        <circle cx="370" cy="36" r="13" fill="#ffffff" filter="url(#softGlow)" />
                        <circle cx="370" cy="36" r="11" fill="#fef08a" />

                        {/* Floating Golden Sun Motes */}
                        <circle cx="345" cy="56" r="1.5" fill="#fef08a" className="anim-sun-mote-1" />
                        <circle cx="325" cy="78" r="1.2" fill="#fed7aa" className="anim-sun-mote-2" />
                        <circle cx="390" cy="68" r="1.4" fill="#ffffff" className="anim-sun-mote-3" />

                        {/* Realistic Strata Clouds */}
                        <g className="anim-cloud-1">
                          <path
                            d="M200,34 C212,26 232,25 246,31 C256,23 276,24 286,32 C296,29 308,33 312,39 C312,41 200,41 200,34 Z"
                            fill="url(#cloudGrad)"
                          />
                        </g>
                        <g className="anim-cloud-2">
                          <path
                            d="M85,24 C95,18 110,17 122,22 C130,16 148,16 156,23 C164,20 174,23 176,28 C176,30 85,30 85,24 Z"
                            fill="url(#cloudGrad)"
                          />
                        </g>

                        {/* Soaring Gliding Birds Formation */}
                        <g className="anim-birds">
                          <path d="M0,4 Q4,-1 8,3 Q12,-1 16,4 Q12,1 8,2 Q4,1 0,4 Z" fill="#334155" opacity="0.85" />
                          <path d="M18,9 Q21,5 24,8 Q27,5 30,9 Q27,7 24,7.5 Q21,7 18,9 Z" fill="#475569" opacity="0.75" />
                          <path d="M-12,10 Q-9,6 -6,9 Q-3,6 0,10 Q-3,8 -6,8.5 Q-9,8 -12,10 Z" fill="#475569" opacity="0.75" />
                        </g>
                      </g>
                    )}

                    {/* ─── LAYER 2: NIGHT SKY (Luminous Moon, Micro-Starfield, Meteor & Fireflies) ─── */}
                    {isNightMode && (
                      <g className="night-sky-group">
                        {/* Astronomical Micro-Starfield */}
                        <g className="starfield">
                          <circle cx="45" cy="18" r="0.8" fill="#ffffff" className="anim-star-1" />
                          <circle cx="78" cy="32" r="1.2" fill="#fef08a" className="anim-star-2" />
                          <circle cx="115" cy="14" r="0.9" fill="#c7d2fe" className="anim-star-3" />
                          <circle cx="138" cy="28" r="0.7" fill="#ffffff" className="anim-star-4" />
                          <circle cx="165" cy="12" r="1.3" fill="#fef08a" className="anim-star-5" />
                          <circle cx="195" cy="26" r="0.8" fill="#e0e7ff" className="anim-star-6" />
                          <circle cx="225" cy="15" r="1.1" fill="#ffffff" className="anim-star-7" />
                          <circle cx="255" cy="22" r="0.7" fill="#a5f3fc" className="anim-star-1" />
                          <circle cx="282" cy="14" r="1.2" fill="#fef08a" className="anim-star-3" />
                          <circle cx="310" cy="26" r="0.8" fill="#ffffff" className="anim-star-2" />
                          <circle cx="420" cy="16" r="1.1" fill="#e0e7ff" className="anim-star-5" />
                          <circle cx="445" cy="28" r="0.7" fill="#fef08a" className="anim-star-4" />
                          <circle cx="462" cy="14" r="1.0" fill="#ffffff" className="anim-star-6" />
                        </g>

                        {/* Swift Meteor Streak */}
                        <g className="anim-meteor">
                          <line x1="85" y1="10" x2="130" y2="30" stroke="url(#meteorGrad)" strokeWidth="1.6" strokeLinecap="round" />
                          <circle cx="130" cy="30" r="1.2" fill="#ffffff" />
                        </g>

                        {/* Luminous Lunar Halo */}
                        <circle cx="370" cy="34" r="32" fill="url(#moonAtmosphereGrad)" className="anim-moon-halo" />

                        {/* Earthshine (Spherical outline of dark moon) */}
                        <circle cx="370" cy="34" r="14" fill="#1e1b4b" opacity="0.35" stroke="#312e81" strokeWidth="0.5" />

                        {/* Realistic Crescent Moon Body */}
                        <path
                          d="M370,20 C377.7,20 384,26.3 384,34 C384,41.7 377.7,48 370,48 C375.5,43 378,38.5 378,34 C378,29.5 375.5,25 370,20 Z"
                          fill="url(#moonCrescentGrad)"
                          filter="url(#softGlow)"
                          className="anim-moon-body"
                        />

                        {/* Chimney Warm Dissipating Smoke Puffs */}
                        <circle cx="266" cy="46" r="2.2" fill="#94a3b8" className="anim-smoke-puff-1" />
                        <circle cx="266" cy="46" r="2.8" fill="#cbd5e1" className="anim-smoke-puff-2" />
                      </g>
                    )}

                    {/* ─── LAYER 3: Back Rolling Ridge & Distant Tree Silhouettes ─── */}
                    <path
                      d="M-10,140 L-10,100 Q80,90 180,96 Q280,102 380,86 Q430,78 490,84 L490,140 Z"
                      fill="url(#hillBackGrad)"
                      opacity="0.85"
                    />

                    {/* Distant Realistic Pine Trees on Crest */}
                    <g fill={isNightMode ? '#022c22' : '#047857'} opacity="0.8">
                      <use href="#pineTree" transform="translate(138, 92) scale(0.65)" />
                      <use href="#pineTree" transform="translate(152, 90) scale(0.75)" />
                      <use href="#pineTree" transform="translate(315, 84) scale(0.68)" />
                      <use href="#pineTree" transform="translate(330, 82) scale(0.8)" />
                      <use href="#pineTree" transform="translate(345, 85) scale(0.62)" />
                      <use href="#pineTree" transform="translate(435, 78) scale(0.75)" />
                    </g>

                    {/* Midground Rolling Green Ridge */}
                    <path
                      d="M-10,140 L-10,112 Q90,102 190,108 Q290,112 370,98 Q430,90 490,100 L490,140 Z"
                      fill="url(#hillMidGrad)"
                    />

                    {/* Midground Pine Trees Group Left */}
                    <g fill={isNightMode ? '#011f18' : '#065f46'}>
                      <use href="#pineTree" transform="translate(110, 106) scale(0.9)" />
                      <use href="#pineTree" transform="translate(126, 102) scale(1.1)" />
                    </g>

                    {/* ─── LAYER 4: ARCHITECTURE (SAHAAYE Community Hub & Clinic) ─── */}
                    {/* Secondary Cottage / Clinic Annex */}
                    <polygon points="167,86 190,72 213,86" fill="url(#cabinRoofGrad)" />
                    <rect x="172" y="86" width="36" height="26" rx="1" fill="url(#cabinWallGrad)" />
                    <rect x="193" y="93" width="9" height="19" rx="1" fill="#78350f" />
                    {/* Cabin Window */}
                    <rect
                      x="178" y="91" width="10" height="10" rx="1"
                      fill={isNightMode ? '#fef08a' : '#bae6fd'}
                      stroke={isNightMode ? '#f59e0b' : '#38bdf8'}
                      strokeWidth="0.8"
                      className={isNightMode ? 'anim-night-window' : ''}
                    />
                    <line x1="183" y1="91" x2="183" y2="101" stroke={isNightMode ? '#d97706' : '#38bdf8'} strokeWidth="0.6" />
                    <line x1="178" y1="96" x2="188" y2="96" stroke={isNightMode ? '#d97706' : '#38bdf8'} strokeWidth="0.6" />

                    {/* Night Window Cast Light Spill onto Lawn */}
                    {isNightMode && (
                      <polygon points="226,102 210,128 285,128 274,102" fill="url(#groundLightSpillGrad)" />
                    )}

                    {/* Main SAHAAYE Community Relief Center / Dispatch Hub */}
                    {/* Chimney */}
                    <rect x="264" y="52" width="6" height="12" rx="1" fill={isNightMode ? '#1e293b' : '#64748b'} />
                    {/* Modern Architectural Roof with Overhang Eaves */}
                    <polygon points="214,78 248,56 282,78" fill="url(#hubRoofGrad)" />
                    <line x1="212" y1="78" x2="284" y2="78" stroke={isNightMode ? '#0f172a' : '#1e293b'} strokeWidth="1.5" />
                    {/* Hub Walls */}
                    <rect
                      x="220" y="78" width="56" height="34" rx="1"
                      fill="url(#hubWallGrad)"
                      stroke={isNightMode ? '#334155' : '#cbd5e1'}
                      strokeWidth="0.8"
                    />

                    {/* Emergency / Community Cross Emblem on Hub Gable */}
                    <rect x="246" y="65" width="4" height="7" rx="0.5" fill="#ef4444" />
                    <rect x="244.5" y="66.5" width="7" height="4" rx="0.5" fill="#ef4444" />

                    {/* Hub Entrance Door */}
                    <rect x="248" y="87" width="12" height="25" rx="1.5" fill={isNightMode ? '#0f172a' : '#334155'} />
                    <circle cx="257" cy="99" r="0.9" fill="#fde047" />

                    {/* Left Architectural Paned Window */}
                    <rect
                      x="226" y="86" width="16" height="15" rx="1"
                      fill={isNightMode ? '#fef08a' : '#bae6fd'}
                      stroke={isNightMode ? '#f59e0b' : '#38bdf8'}
                      strokeWidth="1"
                      className={isNightMode ? 'anim-night-window' : ''}
                    />
                    <line x1="234" y1="86" x2="234" y2="101" stroke={isNightMode ? '#d97706' : '#0284c7'} strokeWidth="0.8" />
                    <line x1="226" y1="93.5" x2="242" y2="93.5" stroke={isNightMode ? '#d97706' : '#0284c7'} strokeWidth="0.8" />

                    {/* Right Paned Window */}
                    <rect
                      x="266" y="88" width="8" height="13" rx="1"
                      fill={isNightMode ? '#fef08a' : '#bae6fd'}
                      stroke={isNightMode ? '#f59e0b' : '#38bdf8'}
                      strokeWidth="1"
                      className={isNightMode ? 'anim-night-window' : ''}
                    />
                    <line x1="266" y1="94.5" x2="274" y2="94.5" stroke={isNightMode ? '#d97706' : '#0284c7'} strokeWidth="0.8" />

                    {/* Midground Tall Evergreen Pine Right of Hub */}
                    <g fill={isNightMode ? '#011f18' : '#065f46'} className="anim-tree-sway">
                      <use href="#pineTree" transform="translate(305, 96) scale(1.15)" />
                    </g>

                    {/* ─── LAYER 5: Foreground Rolling Ridge & Framing Pines ─── */}
                    <path
                      d="M-10,140 L-10,126 Q100,118 200,122 Q300,126 390,116 Q440,112 490,120 L490,140 Z"
                      fill="url(#hillForeGrad)"
                    />

                    {/* Tall Foreground Botanical Pines (Framing) */}
                    <g fill={isNightMode ? '#01150f' : '#047857'}>
                      <use href="#pineTree" transform="translate(90, 116) scale(1.4)" />
                      <use href="#pineTree" transform="translate(390, 112) scale(1.3)" />
                      <use href="#pineTree" transform="translate(415, 118) scale(1.1)" />
                    </g>

                    {/* Grass Tufts on Foreground Ridge */}
                    <g stroke={isNightMode ? '#065f46' : '#10b981'} strokeWidth="1.2" strokeLinecap="round">
                      <path d="M140,125 Q142,119 140,115 M142,125 Q145,120 146,116" />
                      <path d="M210,126 Q212,120 210,116 M212,126 Q215,121 216,117" />
                      <path d="M330,122 Q332,116 330,112 M332,122 Q335,117 336,113" />
                    </g>

                    {/* Bioluminescent Night Fireflies */}
                    {isNightMode && (
                      <g className="night-fireflies">
                        <circle cx="160" cy="115" r="1.5" fill="#bef264" className="anim-firefly-1" />
                        <circle cx="210" cy="122" r="1.2" fill="#fde047" className="anim-firefly-2" />
                        <circle cx="295" cy="118" r="1.4" fill="#a3e635" className="anim-firefly-3" />
                        <circle cx="340" cy="125" r="1.3" fill="#bef264" className="anim-firefly-4" />
                      </g>
                    )}
                  </svg>
                </div>

                {/* Hero Quote Card */}
                <div className="hero-quote">
                  <p>Helping people builds stronger communities.</p>
                </div>
              </div>

          {/* ── STAT CARDS ──────────────────────────────────────────────── */}
          <div className="stats-row">
            {STATS.map((stat) => (
              <StatCardItem key={stat.id} stat={stat} onClick={() => handleStatClick(stat)} />
            ))}
          </div>

          {/* ── MAIN GRID (Needs / Map / Quick Actions) ──────────────────── */}
          <div className="main-grid">

            {/* Needs Near You */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Needs Near You</span>
                <button className="view-all-btn" onClick={() => { handleNav('nearby'); }}>
                  View All →
                </button>
              </div>
              <div className="needs-list">
                {needsList.map((need) => (
                  <div
                    key={need.id}
                    className="need-item ripple-container"
                    onClick={(e) => { addRipple(e); showToast(`📌 ${need.title}`); }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="need-thumb">{need.emoji}</div>
                    <div className="need-body">
                      <div className="need-title">{need.title}</div>
                      <div className="need-loc">📍 {need.location}</div>
                      <div className="need-loc">{need.timeAgo}</div>
                    </div>
                    <span
                      className="need-tag"
                      style={{
                        color: need.tagColor,
                        borderColor: need.tagBorder,
                        background: need.tagBg,
                      }}
                    >
                      {need.tagLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Live Map & Distance Radar */}
            <LiveMap
              onToast={showToast}
              onVolunteer={(need) => showToast(`🤝 Volunteered for: ${need.title}`)}
            />

            {/* Quick Actions + Promo */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <span className="card-title">Quick Actions</span>
                <button className="view-all-btn" onClick={() => showToast('All quick actions →')}>
                  See All →
                </button>
              </div>
              <div className="quick-actions-grid">
                {QUICK_ACTIONS.map((qa) => (
                  <div
                    key={qa.id}
                    className="qa-card ripple-container"
                    style={{ background: qa.bg }}
                    onClick={(e) => { addRipple(e); showToast(`${qa.icon} ${qa.label}`); handleNav(qa.id === 'report' ? 'report' : qa.id === 'find' ? 'nearby' : qa.id === 'myreports' ? 'activities' : 'activities'); }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="qa-icon" style={{ background: qa.iconBg }}>{qa.icon}</div>
                    <div className="qa-label">{qa.label}</div>
                    <div className="qa-sub">{qa.sub}</div>
                  </div>
                ))}
              </div>
              <div
                className="helping-promo ripple-container"
                onClick={(e) => { addRipple(e); handleNav('nearby'); }}
              >
                <div className="promo-emoji">❤️</div>
                <div className="promo-body">
                  <h4>Be a Helping Hand</h4>
                  <p>Support someone in need and make a real impact today.</p>
                </div>
                <button className="promo-btn" onClick={(e) => { e.stopPropagation(); handleNav('nearby'); }}>
                  Explore Needs →
                </button>
              </div>
            </div>
          </div>

          {/* ── BOTTOM GRID ─────────────────────────────────────────────── */}
          <div className="bottom-grid">

            {/* Impact Overview */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Impact Overview</span>
                <select className="filter-select">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                </select>
              </div>
              <BarChart />
              <div className="impact-stats">
                {[
                  { icon: '🤝', num: '120+', lbl: 'People Helped' },
                  { icon: '💚', num: '2,000+', lbl: 'Lives Touched' },
                  { icon: '👥', num: '50+', lbl: 'Active Helpers' },
                  { icon: '🏙️', num: '4', lbl: 'Cities Reached' },
                ].map((item) => (
                  <div
                    key={item.lbl}
                    className="impact-stat-item ripple-container"
                    onClick={(e) => { addRipple(e); showToast(`${item.icon} ${item.num} ${item.lbl}`); }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="impact-stat-icon">{item.icon}</div>
                    <div>
                      <div className="impact-stat-num">{item.num}</div>
                      <div className="impact-stat-lbl">{item.lbl}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Distribution Donut */}
            <div className="card donut-section">
              <div className="card-header">
                <span className="card-title">Category Distribution</span>
              </div>
              <div className="donut-chart-wrap">
                <DonutChart segments={DONUT_SEGMENTS} total={48} />
                <div className="donut-center">
                  <div className="donut-value">48</div>
                  <div className="donut-sub">Total Needs</div>
                </div>
              </div>
              <div className="donut-legend">
                {DONUT_SEGMENTS.map((seg) => (
                  <div
                    key={seg.label}
                    className="donut-legend-item ripple-container"
                    onClick={(e) => { addRipple(e); showToast(`${seg.label}: ${seg.pct}%`); }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="legend-dot" style={{ background: seg.color }} />
                    <span className="legend-label">{seg.label}</span>
                    <span className="legend-pct">{seg.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Helping Activities */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Recent Helping Activities</span>
                <button className="view-all-btn" onClick={() => handleNav('activities')}>View All →</button>
              </div>
              <div className="activities-list">
                {ACTIVITIES.map((act) => (
                  <div
                    key={act.id}
                    className="activity-item ripple-container"
                    onClick={(e) => { addRipple(e); showToast(`✅ ${act.title}`); }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="activity-thumb">{act.emoji}</div>
                    <div className="activity-body">
                      <div className="activity-title">{act.title}</div>
                      <div className="activity-loc">{act.location}</div>
                    </div>
                    <span className={`activity-status ${act.status}`}>
                      {act.status.charAt(0).toUpperCase() + act.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        )}
        </main>

      </div>

      {/* ═══ TOAST NOTIFICATION ═════════════════════════════════════════════ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e293b',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '50px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          zIndex: 9999,
          animation: 'toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          whiteSpace: 'nowrap',
          maxWidth: '90vw',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.9); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
