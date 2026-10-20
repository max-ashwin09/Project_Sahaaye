import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReportNeed from './ReportNeed';
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
  const addRipple = useRipple();
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const interval = setInterval(fetchLiveNeeds, 5000);
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
              {/* ── HERO BANNER ─────────────────────────────────────────────── */}
              <div className="hero-banner">

            <div className="hero-text">
              <h1>{currentUser ? `Welcome Back, ${currentUser.name}! 👋` : 'Welcome to SAHAAYE! 🤝'}</h1>
              <p>
                {currentUser
                  ? "Small actions create big changes. Let's keep making the difference."
                  : "Discover local needs, connect with communities, and lend a helping hand across India."}
              </p>
            </div>
            <div className="hero-illustration">
              <svg width="220" height="90" viewBox="0 0 220 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Sky */}
                <rect width="220" height="90" rx="8" fill="url(#skyGrad)" />
                {/* Mountains */}
                <polygon points="0,90 40,30 80,90" fill="#a5d6a7" opacity="0.6" />
                <polygon points="30,90 70,25 110,90" fill="#81c784" opacity="0.5" />
                {/* Temple */}
                <rect x="85" y="45" width="50" height="45" fill="#ffcc80" />
                <polygon points="85,45 110,15 135,45" fill="#ff8a65" />
                <rect x="95" y="60" width="12" height="30" fill="#e65100" />
                <rect x="113" y="60" width="12" height="30" fill="#e65100" />
                <rect x="85" y="35" width="50" height="12" fill="#ff8a65" />
                {/* Flag */}
                <line x1="110" y1="15" x2="110" y2="5" stroke="#795548" strokeWidth="1.5" />
                <polygon points="110,5 120,8 110,11" fill="#f44336" />
                {/* Trees */}
                <circle cx="75" cy="60" r="14" fill="#66bb6a" />
                <rect x="73" y="70" width="4" height="20" fill="#795548" />
                <circle cx="155" cy="55" r="12" fill="#4caf50" />
                <rect x="153" y="63" width="4" height="27" fill="#795548" />
                <circle cx="170" cy="65" r="8" fill="#81c784" />
                <rect x="168" y="71" width="3" height="19" fill="#795548" />
                {/* Ground */}
                <rect x="0" y="83" width="220" height="7" rx="0" fill="#a5d6a7" />
                {/* Sun */}
                <circle cx="185" cy="20" r="10" fill="#ffd54f" opacity="0.9" />
                <circle cx="185" cy="20" r="14" fill="#ffd54f" opacity="0.2" />
                {/* Clouds */}
                <ellipse cx="40" cy="15" rx="18" ry="8" fill="white" opacity="0.7" />
                <ellipse cx="55" cy="12" rx="12" ry="7" fill="white" opacity="0.7" />
                <ellipse cx="30" cy="13" rx="10" ry="6" fill="white" opacity="0.6" />
                <defs>
                  <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bbdefb" />
                    <stop offset="100%" stopColor="#e8f5e9" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
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

            {/* Live Map */}
            <div className="card map-section">
              <div className="card-header">
                <span className="card-title">Live Map</span>
                <select className="filter-select">
                  <option>All Categories</option>
                  <option>Food</option>
                  <option>Medical</option>
                  <option>Education</option>
                  <option>Shelter</option>
                </select>
              </div>
              <div className="map-canvas">
                {/* Map background */}
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 40%, #dcedc8 70%, #f1f8e9 100%)',
                  position: 'relative',
                }}>
                  {/* Roads */}
                  {[25, 50, 75].map(pos => (
                    <div key={pos} className="map-road-h" style={{ top: `${pos}%` }} />
                  ))}
                  {[25, 50, 75].map(pos => (
                    <div key={pos} className="map-road-v" style={{ left: `${pos}%` }} />
                  ))}

                  {/* City label */}
                  <div className="map-city-label">Indore</div>

                  {/* Pulse at center */}
                  <div className="map-pulse" style={{ top: '50%', left: '50%' }}>
                    <div className="pulse-ring" />
                  </div>

                  {/* Pins */}
                  {MAP_PINS.map((pin, i) => (
                    <div
                      key={i}
                      className="map-pin"
                      style={{ left: pin.x, top: pin.y, animationDelay: `${pin.delay}s` }}
                      onClick={() => showToast(`📌 ${pin.emoji} Need at this location`)}
                    >
                      <div
                        className="pin-icon"
                        style={{ background: pin.color, boxShadow: `0 2px 8px ${pin.color}60` }}
                      >
                        <span>{pin.emoji}</span>
                      </div>
                    </div>
                  ))}

                  {/* Controls */}
                  <div className="map-controls">
                    {['+', '−', '⊕'].map(ctrl => (
                      <button
                        key={ctrl}
                        className="map-ctrl-btn ripple-container"
                        onClick={(e) => { addRipple(e); showToast(`Map control: ${ctrl}`); }}
                      >
                        {ctrl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="map-legend">
                {[
                  { color: '#2563eb', label: 'Food' },
                  { color: '#e11d48', label: 'Medical' },
                  { color: '#7c3aed', label: 'Education' },
                  { color: '#f59e0b', label: 'Shelter' },
                  { color: '#94a3b8', label: 'Others' },
                ].map(item => (
                  <div key={item.label} className="legend-item"
                    onClick={() => showToast(`Filter: ${item.label}`)}>
                    <div className="legend-dot" style={{ background: item.color }} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

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

          {/* ── COMMUNITY IMPACT BANNER ─────────────────────────────────── */}
          <div
            className="community-impact-banner ripple-container"
            onClick={(e) => { addRipple(e); showToast('Together for a Kinder Indore! 🌟'); }}
          >
            <div className="impact-banner-content">
              <div className="impact-banner-icon">❤️</div>
              <div className="impact-banner-info">
                <h3>Together for a Kinder Indore</h3>
                <p>Every act of kindness matters in our community. Join local volunteers, discover needs near you, and make a real difference today.</p>
              </div>
            </div>
            <button
              className="impact-banner-btn ripple-container"
              onClick={(e) => { e.stopPropagation(); handleNav('nearby'); }}
            >
              <span>Explore Needs</span>
              <span>→</span>
            </button>
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
