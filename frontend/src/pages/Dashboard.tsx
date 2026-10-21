import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReportNeed from './ReportNeed';
import LiveMap from '../components/LiveMap';
import { LocationSelector } from '../components/LocationSelector';
import { LocationPromptBanner } from '../components/LocationPromptBanner';
import { useSelectedLocation } from '../hooks/useSelectedLocation';
import { useNearbyNeeds } from '../hooks/useNearbyNeeds';
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
  Users,
  Clock,
  CheckCircle2,
  Star,
  Compass,
  Heart,
  HandHeart,
  HeartHandshake,
  Building2,
  Utensils,
  HeartPulse,
  BookOpen,
  Shirt,
  Droplets,
  Home,
  HelpCircle,
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
  icon: React.ReactNode;
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
  icon: React.ReactNode;
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

// Category monochrome icon helper
export function getCategoryIcon(cat: string, size = 18, color = 'currentColor') {
  const c = cat.toLowerCase();
  if (c.includes('food') || c.includes('ration') || c.includes('meal')) {
    return <Utensils size={size} strokeWidth={1.8} color={color} />;
  }
  if (c.includes('med') || c.includes('health') || c.includes('insulin')) {
    return <HeartPulse size={size} strokeWidth={1.8} color={color} />;
  }
  if (c.includes('edu') || c.includes('school') || c.includes('book')) {
    return <BookOpen size={size} strokeWidth={1.8} color={color} />;
  }
  if (c.includes('elder') || c.includes('care') || c.includes('senior')) {
    return <HeartHandshake size={size} strokeWidth={1.8} color={color} />;
  }
  if (c.includes('shelt') || c.includes('rain') || c.includes('house') || c.includes('tarpaulin')) {
    return <Home size={size} strokeWidth={1.8} color={color} />;
  }
  if (c.includes('water') || c.includes('drink')) {
    return <Droplets size={size} strokeWidth={1.8} color={color} />;
  }
  if (c.includes('cloth') || c.includes('blanket') || c.includes('winter')) {
    return <Shirt size={size} strokeWidth={1.8} color={color} />;
  }
  return <HelpCircle size={size} strokeWidth={1.8} color={color} />;
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
    id: 'nearby', value: 28, label: 'Nearby Needs',
    icon: <Users size={21} strokeWidth={1.8} color="#0d9488" />,
    iconBg: 'rgba(13, 148, 136, 0.11)', color: '#0d9488', trend: '+12%', trendDir: 'up',
    chartData: [4, 7, 5, 9, 6, 8, 10], chartColor: '#0d9488',
  },
  {
    id: 'progress', value: 9, label: 'In Progress',
    icon: <Clock size={21} strokeWidth={1.8} color="#f59e0b" />,
    iconBg: 'rgba(245, 158, 11, 0.11)', color: '#f59e0b', trend: '+5%', trendDir: 'up',
    chartData: [3, 5, 4, 6, 5, 7, 9], chartColor: '#f59e0b',
  },
  {
    id: 'completed', value: 16, label: 'Completed',
    icon: <CheckCircle2 size={21} strokeWidth={1.8} color="#10b981" />,
    iconBg: 'rgba(16, 185, 129, 0.11)', color: '#10b981', trend: '+26%', trendDir: 'up',
    chartData: [5, 8, 7, 10, 9, 13, 16], chartColor: '#10b981',
  },
  {
    id: 'rating', value: '4.8', label: 'Community Rating',
    icon: <Star size={21} strokeWidth={1.8} color="#a855f7" />,
    iconBg: 'rgba(168, 85, 247, 0.11)', color: '#a855f7', trend: '+0.2', trendDir: 'up',
    chartData: [4.2, 4.3, 4.5, 4.4, 4.6, 4.7, 4.8], chartColor: '#a855f7',
  },
];

const NEEDS: Need[] = [
  {
    id: 'n1', title: 'Food Support for Family', location: 'Vijay Nagar, Indore',
    timeAgo: '10 mins ago', emoji: 'Food',
    tagLabel: 'Food', tagColor: '#2563eb', tagBorder: '#bfdbfe', tagBg: '#eff6ff',
  },
  {
    id: 'n2', title: 'Medical Help Required', location: 'Palasia, Indore',
    timeAgo: '25 mins ago', emoji: 'Medical',
    tagLabel: 'Medical', tagColor: '#e11d48', tagBorder: '#fecdd3', tagBg: '#fff1f2',
  },
  {
    id: 'n3', title: 'School Supplies Needed', location: 'Scheme 54, Indore',
    timeAgo: '1 hour ago', emoji: 'Education',
    tagLabel: 'Education', tagColor: '#0d9488', tagBorder: '#99f6e4', tagBg: '#f0fdfa',
  },
  {
    id: 'n4', title: 'Elderly Care Support', location: 'Annapurna Road, Indore',
    timeAgo: '2 hours ago', emoji: 'Elderly',
    tagLabel: 'Elderly', tagColor: '#7c3aed', tagBorder: '#ddd6fe', tagBg: '#f5f3ff',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'report', label: 'Report a Need', sub: 'Let the community know', icon: <PlusCircle size={20} strokeWidth={1.8} color="#2563eb" />, bg: '#eff6ff', iconBg: '#dbeafe' },
  { id: 'find', label: 'Find Nearby Needs', sub: 'Explore around you', icon: <Compass size={20} strokeWidth={1.8} color="#0d9488" />, bg: '#f0fdf4', iconBg: '#d1fae5' },
  { id: 'myreports', label: 'My Reports', sub: 'Track your submissions', icon: <ClipboardList size={20} strokeWidth={1.8} color="#7c3aed" />, bg: '#f5f3ff', iconBg: '#ede9fe' },
  { id: 'helping', label: 'My Helping Activities', sub: 'See your impact', icon: <Heart size={20} strokeWidth={1.8} color="#e11d48" />, bg: '#fff1f2', iconBg: '#fce7f3' },
];

const ACTIVITIES: Activity[] = [
  { id: 'a1', title: 'Helped with Food Supplies', location: 'Vijay Nagar, Indore • 2 days ago', emoji: 'Food', status: 'completed' },
  { id: 'a2', title: 'Clothes Donation', location: 'Rajwada, Indore • 4 days ago', emoji: 'Clothes', status: 'completed' },
  { id: 'a3', title: 'Medical Support', location: 'MY Hospital, Indore • 1 week ago', emoji: 'Medical', status: 'completed' },
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
      <div
        className="stat-icon-wrap"
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: stat.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {stat.icon}
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
  const { location: selectedLocation, filterToast, clearFilterToast } = useSelectedLocation();
  const { needs: nearbyNeedsList, isLoading: isNeedsLoading } = useNearbyNeeds();

  useEffect(() => {
    if (filterToast) {
      showToast(`📍 ${filterToast}`);
      clearFilterToast();
    }
  }, [filterToast, clearFilterToast]);
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

            <LocationSelector onToast={showToast} />

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

        {/* ── LOCATION & STATE LANGUAGE NOTIFICATION PROMPTS ─────────────── */}
        <LocationPromptBanner
          onOpenSelector={() => {
            const locBtn = document.querySelector('.location-btn') as HTMLButtonElement;
            locBtn?.click();
          }}
          onLanguageSwitch={(lang) => {
            showToast(lang === 'hi' ? '🇮🇳 भाषा हिंदी में सेट हो गई' : 'Language set to English');
          }}
        />

        {/* ── PAGE CONTENT ───────────────────────────────────────────────── */}
        <main className="page-content">
          {activeNav === 'report' ? (
            <ReportNeed
              onCancel={() => handleNav('dashboard')}
              onSuccess={() => {
                showToast('🎉 Need reported and published to community!');
              }}
              onViewOnMap={(lat, lng) => {
                handleNav('dashboard');
                showToast(`📍 Switched to Live Map at ${lat.toFixed(3)}°, ${lng.toFixed(3)}°`);
              }}
            />
          ) : (
            <>
              {/* ── HERO BANNER ─────────────────────────────────────────────── */}
              <div className="hero-banner">
                {/* Hero Text with Original Colors */}
                <div className="hero-text">
                  <h1>{currentUser ? `Welcome Back, ${currentUser.name}! 👋` : 'Welcome to SAHAAYE! 🤝'}</h1>
                  <p>
                    {currentUser
                      ? "Small actions create big changes. Let's keep making the difference."
                      : "Discover local needs, connect with communities, and lend a helping hand across India."}
                  </p>
                </div>

                {/* Hero Illustration: Only the Grass, Cottages & Nature Landscape Effect */}
                <div className="hero-illustration">
                  <svg className="hero-landscape-svg" viewBox="0 0 460 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="mntGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.1" />
                      </linearGradient>
                      <linearGradient id="mntGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.1" />
                      </linearGradient>
                      <linearGradient id="grassHillBack" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#86efac" />
                        <stop offset="100%" stopColor="#4ade80" />
                      </linearGradient>
                      <linearGradient id="grassHillMid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                      <linearGradient id="grassHillFore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="roofGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                      <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fffbeb" />
                        <stop offset="100%" stopColor="#fef3c7" />
                      </linearGradient>
                      <linearGradient id="treeGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="treeGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fde047" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>

                    {/* Distant Soft Mountains */}
                    <polygon points="10,140 75,35 155,140" fill="url(#mntGrad1)" />
                    <polygon points="110,140 185,25 270,140" fill="url(#mntGrad2)" />
                    <polygon points="230,140 305,45 385,140" fill="url(#mntGrad1)" />

                    {/* Sun & Cloud */}
                    <circle cx="340" cy="32" r="14" fill="url(#sunGrad)" />
                    <circle cx="340" cy="32" r="22" fill="#fef08a" opacity="0.35" />
                    <ellipse cx="260" cy="30" rx="14" ry="6" fill="#ffffff" opacity="0.75" />
                    <ellipse cx="270" cy="27" rx="10" ry="5" fill="#ffffff" opacity="0.85" />

                    {/* Back Rolling Grass Knolls */}
                    <path d="M0,140 Q80,95 180,105 Q300,118 410,95 Q440,88 460,92 L460,140 Z" fill="url(#grassHillBack)" opacity="0.65" />

                    {/* Mid Rolling Hills */}
                    <path d="M-10,140 Q90,110 190,115 Q310,120 370,90 Q420,70 470,85 L470,140 Z" fill="url(#grassHillMid)" opacity="0.85" />

                    {/* Trees Behind House */}
                    <rect x="175" y="70" width="5" height="35" rx="2" fill="#78350f" />
                    <ellipse cx="177" cy="65" rx="16" ry="18" fill="url(#treeGrad1)" />
                    <ellipse cx="173" cy="60" rx="12" ry="14" fill="#6ee7b7" opacity="0.4" />

                    <rect x="295" y="75" width="5" height="30" rx="2" fill="#78350f" />
                    <ellipse cx="297" cy="70" rx="14" ry="16" fill="url(#treeGrad2)" />
                    <ellipse cx="294" cy="66" rx="10" ry="12" fill="#34d399" opacity="0.4" />

                    {/* Tall Cypress Style Tree */}
                    <rect x="365" y="60" width="4" height="45" rx="2" fill="#78350f" />
                    <path d="M367,25 Q380,45 378,75 Q367,90 356,75 Q354,45 367,25 Z" fill="#059669" />
                    <path d="M367,28 Q375,45 373,70 Q367,82 361,70 Q360,45 367,28 Z" fill="#10b981" opacity="0.6" />

                    {/* Small Cottage */}
                    <polygon points="175,85 200,68 225,85" fill="url(#roofGrad)" />
                    <rect x="180" y="85" width="40" height="26" fill="url(#wallGrad)" />
                    <rect x="195" y="93" width="10" height="18" rx="1" fill="#b45309" />
                    <rect x="185" y="90" width="6" height="6" rx="1" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />

                    {/* Main Community Cottage */}
                    <rect x="240" y="44" width="10" height="15" fill="url(#wallGrad)" />
                    <polygon points="238,44 245,34 252,44" fill="url(#roofGrad)" />
                    <line x1="245" y1="34" x2="245" y2="28" stroke="#78350f" strokeWidth="1.5" />
                    <line x1="242" y1="30" x2="248" y2="30" stroke="#78350f" strokeWidth="1.2" />

                    {/* Main House Roof */}
                    <polygon points="215,64 245,46 275,64" fill="url(#roofGrad)" />
                    <polygon points="210,64 245,43 280,64" fill="none" stroke="#ea580c" strokeWidth="1" />

                    {/* Main House Walls */}
                    <rect x="219" y="64" width="52" height="42" rx="1" fill="url(#wallGrad)" stroke="#fde68a" strokeWidth="0.8" />

                    {/* Door & Windows */}
                    <rect x="240" y="78" width="11" height="28" rx="2" fill="#b45309" />
                    <circle cx="249" cy="92" r="1" fill="#fef08a" />
                    <rect x="224" y="74" width="10" height="10" rx="1" fill="#bae6fd" stroke="#0284c7" strokeWidth="1" />
                    <line x1="229" y1="74" x2="229" y2="84" stroke="#0284c7" strokeWidth="0.8" />
                    <line x1="224" y1="79" x2="234" y2="79" stroke="#0284c7" strokeWidth="0.8" />
                    <rect x="256" y="74" width="10" height="10" rx="1" fill="#bae6fd" stroke="#0284c7" strokeWidth="1" />
                    <line x1="261" y1="74" x2="261" y2="84" stroke="#0284c7" strokeWidth="0.8" />
                    <line x1="256" y1="79" x2="266" y2="79" stroke="#0284c7" strokeWidth="0.8" />

                    {/* Foreground Tree Left */}
                    <rect x="150" y="85" width="6" height="26" rx="2" fill="#78350f" />
                    <circle cx="153" cy="80" r="18" fill="url(#treeGrad1)" />
                    <circle cx="148" cy="74" r="12" fill="#6ee7b7" opacity="0.45" />

                    {/* Tree Right */}
                    <rect x="330" y="85" width="5" height="30" rx="2" fill="#78350f" />
                    <circle cx="332" cy="78" r="16" fill="url(#treeGrad2)" />
                    <circle cx="328" cy="72" r="11" fill="#34d399" opacity="0.4" />

                    {/* Foreground Rolling Grass Ridge */}
                    <path d="M0,140 Q100,122 200,126 Q300,130 380,118 Q420,110 460,115 L460,140 Z" fill="url(#grassHillFore)" />

                    {/* Small Grass Tufts */}
                    <path d="M120,128 Q122,122 120,118 M122,128 Q125,123 126,119" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M210,130 Q212,124 210,120 M212,130 Q215,125 216,121" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M310,125 Q312,119 310,115 M312,125 Q315,120 316,116" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Hero Quote Card */}
                <div className="hero-quote">
                  <p>Helping people builds stronger communities.</p>
                </div>
              </div>

          {/* ── STAT CARDS ──────────────────────────────────────────────── */}
          <div className="stats-row">
            {STATS.map((stat) => {
              const dynamicStat =
                stat.id === 'nearby' ? { ...stat, value: nearbyNeedsList.length } : stat;
              return (
                <StatCardItem key={stat.id} stat={dynamicStat} onClick={() => handleStatClick(dynamicStat)} />
              );
            })}
          </div>

          {/* ── MAIN GRID (Needs / Map / Quick Actions) ──────────────────── */}
          <div className="main-grid">

            {/* Needs Near You */}
            <div className="card">
              <div className="card-header">
                <div>
                  <span className="card-title">Needs Near You ({nearbyNeedsList.length})</span>
                  <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 600, marginTop: 2 }}>
                    📍 {selectedLocation.area ? `${selectedLocation.area}, ` : ''}{selectedLocation.city} ·{' '}
                    {selectedLocation.radiusKm === 0 ? 'Whole city' : `${selectedLocation.radiusKm} km radius`}
                  </div>
                </div>
                <button className="view-all-btn" onClick={() => { handleNav('nearby'); }}>
                  View All →
                </button>
              </div>

              {isNeedsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 8 }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="skeleton-box" style={{ height: 62, width: '100%' }} />
                  ))}
                </div>
              ) : nearbyNeedsList.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(13, 148, 136, 0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488', marginBottom: 8 }}>
                    <MapPin size={24} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                    No needs reported within {selectedLocation.radiusKm === 0 ? 'city limits' : `${selectedLocation.radiusKm} km`}
                  </div>
                  <p style={{ fontSize: 12, margin: '6px 0 14px', color: '#64748b', lineHeight: 1.4 }}>
                    Be the first volunteer to report a community need in {selectedLocation.city}!
                  </p>
                  <button
                    type="button"
                    onClick={() => handleNav('report')}
                    style={{
                      background: '#0d9488',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Report Need in {selectedLocation.city}
                  </button>
                </div>
              ) : (
                <div className="needs-list">
                  {nearbyNeedsList.map((need) => (
                    <div
                      key={need.id}
                      className="need-item ripple-container"
                      onClick={(e) => { addRipple(e); showToast(`📌 ${need.title}`); }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="need-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getCategoryIcon(need.category || need.title, 18, need.tagColor)}
                      </div>
                      <div className="need-body">
                        <div className="need-title">{need.title}</div>
                        <div className="need-loc">
                          📍 {need.location}
                          {need.distanceKm !== undefined && (
                            <span style={{ color: '#0d9488', fontWeight: 600, marginLeft: 4 }}>
                              ({need.distanceKm} km away)
                            </span>
                          )}
                        </div>
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
              )}
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
                    onClick={(e) => { addRipple(e); showToast(`${qa.label}`); handleNav(qa.id === 'report' ? 'report' : qa.id === 'find' ? 'nearby' : qa.id === 'myreports' ? 'activities' : 'activities'); }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="qa-icon" style={{ background: qa.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qa.icon}</div>
                    <div className="qa-label">{qa.label}</div>
                    <div className="qa-sub">{qa.sub}</div>
                  </div>
                ))}
              </div>
              <div
                className="helping-promo ripple-container"
                onClick={(e) => { addRipple(e); handleNav('nearby'); }}
              >
                <div className="promo-emoji" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Heart size={26} strokeWidth={1.8} />
                </div>
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
                  { icon: <HandHeart size={20} strokeWidth={1.8} color="#2563eb" />, num: '120+', lbl: 'People Helped', bg: 'rgba(37, 99, 235, 0.1)' },
                  { icon: <HeartHandshake size={20} strokeWidth={1.8} color="#10b981" />, num: '2,000+', lbl: 'Lives Touched', bg: 'rgba(16, 185, 129, 0.1)' },
                  { icon: <Users size={20} strokeWidth={1.8} color="#a855f7" />, num: '50+', lbl: 'Active Helpers', bg: 'rgba(168, 85, 247, 0.1)' },
                  { icon: <Building2 size={20} strokeWidth={1.8} color="#f59e0b" />, num: '4', lbl: 'Cities Reached', bg: 'rgba(245, 158, 11, 0.1)' },
                ].map((item) => (
                  <div
                    key={item.lbl}
                    className="impact-stat-item ripple-container"
                    onClick={(e) => { addRipple(e); showToast(`${item.num} ${item.lbl}`); }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="impact-stat-icon" style={{ background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
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
                    onClick={(e) => { addRipple(e); showToast(`Activity: ${act.title}`); }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="activity-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getCategoryIcon(act.title, 18, '#0d9488')}
                    </div>
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

        {/* ═══ MAP LEGAL ATTRIBUTION FOOTER ══════════════════════════════════ */}
        <footer
          className="dashboard-map-attribution-footer"
          style={{
            marginTop: '28px',
            padding: '16px 8px 24px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#94a3b8',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <span>
            Map data &copy;{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 500 }}
            >
              OpenStreetMap
            </a>{' '}
            contributors. Built with{' '}
            <a
              href="https://leafletjs.com"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 500 }}
            >
              Leaflet
            </a>
            .
          </span>
        </footer>
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
