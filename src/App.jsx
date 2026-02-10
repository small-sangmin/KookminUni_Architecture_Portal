import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ════════════════════════════════════════════════════════════════
//  국민대학교 건축대학 실기실, 물품 예약 시스템 v1.0
//  Kookmin University Architecture Studio & Equipment Reservation System
// ════════════════════════════════════════════════════════════════

// ─── Editable Data (update here) ────────────────────────────────
const EDITABLE = {
  students: [

  ],
  rooms: [
    { id: "R101", name: "모형제작실", floor: "6F", building: "복지관", equipment: "목공 기계, 집진기, 톱날", rules: "반드시 보호장구 착용" },
    { id: "R102", name: "3D프린팅실", floor: "6F", building: "복지관", equipment: "프린터 3대", rules: "프린터 사용 후 노즐 청소 필수" },
    { id: "R201", name: "캐드실", floor: "6F", building: "복지관", equipment: "3D Modeling 가능한 컴퓨터 다수 보유", rules: "사용후 정리 후 퇴실" },
    { id: "R202", name: "레이저커팅실", floor: "6F", building: "복지관", equipment: "레이저 커터 1대", rules: "환기 필수, 가연성 재료 주의" },
    { id: "R203", name: "사진실", floor: "6F", building: "복지관", equipment: "작업대 1개", rules: "조명 전원 OFF 후 퇴실" },
  ],
  equipment: [
    { id: "E002", name: "3D 프린터 (FDM)", category: "가공장비", available: 4, total: 5, deposit: false, maxDays: 1, icon: "🖨" },
    { id: "E003", name: "열선 커터", category: "수공구", available: 3, total: 3, deposit: false, maxDays: 1, icon: "🔥" },
    { id: "E004", name: "전동 드릴 세트", category: "수공구", available: 5, total: 8, deposit: false, maxDays: 2, icon: "🔧" },
    { id: "E005", name: "직소기", category: "수공구", available: 2, total: 3, deposit: false, maxDays: 1, icon: "🪚" },
    { id: "E006", name: "샌딩기", category: "수공구", available: 1, total: 2, deposit: false, maxDays: 1, icon: "🔨" },
    { id: "E007", name: "노트북", category: "전자제품", available: 6, total: 6, deposit: false, maxDays: 1, icon: "💻" },
  ],
  equipmentReturnChecklist: [
    "외관 손상 여부 확인",
    "부속/케이블/소모품 포함 여부 확인",
    "동작 테스트",
    "대여 기록 서명",
  ],
  timeSlots: [
    { id: "T1", label: "09:00–10:00", start: 9 }, { id: "T2", label: "10:00–11:00", start: 10 },
    { id: "T3", label: "11:00–12:00", start: 11 }, { id: "T4", label: "12:00–13:00", start: 12 },
    { id: "T5", label: "13:00–14:00", start: 13 }, { id: "T6", label: "14:00–15:00", start: 14 },
    { id: "T7", label: "15:00–16:00", start: 15 }, { id: "T8", label: "16:00–17:00", start: 16 },
  ],
  workers: [
    { id: "W001", name: "근로학생A", shift: "오전 (09–13시)", username: "worker1", password: "1234" },
    { id: "W002", name: "근로학생B", shift: "오후 (13–18시)", username: "worker2", password: "1234" },
    { id: "W003", name: "근로학생C", shift: "야간 (18–21시)", username: "worker3", password: "1234" },
  ],
  safetySheet: {
    url: "https://script.google.com/macros/s/AKfycbwZCS76_LkUPqBEbXMACCX6DM9Z-cOorwQAGNE_DL3nCO_cQaSa-9kJUd5_FV0A_VgQ6w/exec",
    sheetName: "안전교육이수자 명단",
    columns: {
      studentId: "학번",
      studentName: "이름",
      year: "학년",
      dept: "전공",
      safetyTrained: "안전교육",
      email: "1열",
    },
  },
  emailNotify: {
    url: "https://script.google.com/macros/s/AKfycbxYcNb5hLoMbLzDchdZFmlHiNCWBRcpfpqc18GTWRjYEoXgteGdneebp0iJWcM3exzPcA/exec",
    recipients: ["samkim11300@gmail.com"],
    enabled: true,
  },
  adminAccount: { username: "admin", password: "admin1234", name: "관리자" },
};

// ─── Data Constants (do not edit below) ─────────────────────────
const STUDENTS_DB = EDITABLE.students;
const ROOMS = EDITABLE.rooms;
const EQUIPMENT_DB = EDITABLE.equipment;
const TIME_SLOTS = EDITABLE.timeSlots;
const DEFAULT_WORKERS = EDITABLE.workers;
const ADMIN_ACCOUNT = EDITABLE.adminAccount;

// ─── Utility Functions ───────────────────────────────────────────
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ts = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
};
const dateStr = () => new Date().toISOString().split("T")[0];
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; };
const formatDate = (d) => { if (!d) return ""; const [y,m,dd] = d.split("-"); return `${m}/${dd}`; };

// ─── Storage Layer ───────────────────────────────────────────────
const store = {
  async get(key) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val)); return true; }
    catch { return false; }
  },
  async listByPrefix(prefix) {
    try {
      const r = await window.storage.list(prefix);
      return r?.keys || [];
    } catch { return []; }
  }
};

// ─── SVG Icons ───────────────────────────────────────────────────
const I = ({ d, size = 18, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
    {typeof d === "string" ? <path d={d}/> : d}
  </svg>
);

const Icons = {
  door: (p) => <I {...p} d={<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><circle cx="15" cy="12" r="1" fill="currentColor"/></>}/>,
  tool: (p) => <I {...p} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>,
  check: (p) => <I {...p} d="M20 6L9 17l-5-5"/>,
  x: (p) => <I {...p} d="M18 6L6 18M6 6l12 12"/>,
  bell: (p) => <I {...p} d={<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>}/>,
  lock: (p) => <I {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}/>,
  unlock: (p) => <I {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></>}/>,
  user: (p) => <I {...p} d={<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>}/>,
  clock: (p) => <I {...p} d={<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>}/>,
  calendar: (p) => <I {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>}/>,
  log: (p) => <I {...p} d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></>}/>,
  home: (p) => <I {...p} d={<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></>}/>,
  download: (p) => <I {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></>}/>,
  search: (p) => <I {...p} d={<><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>}/>,
  alert: (p) => <I {...p} d={<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>}/>,
  refresh: (p) => <I {...p} d={<><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>}/>,
  arrowLeft: (p) => <I {...p} d="M19 12H5M12 19l-7-7 7-7"/>,
  list: (p) => <I {...p} d={<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>}/>,
  grid: (p) => <I {...p} d={<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>}/>,
  info: (p) => <I {...p} d={<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>}/>,
  logout: (p) => <I {...p} d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>}/>,
  history: (p) => <I {...p} d={<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>}/>,
  filter: (p) => <I {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3"/>,
  package: (p) => <I {...p} d={<><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></>}/>,
  shield: (p) => <I {...p} d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>}/>,
  edit: (p) => <I {...p} d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>}/>,
  trash: (p) => <I {...p} d={<><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>}/>,
  plus: (p) => <I {...p} d="M12 5v14M5 12h14"/>,
  users: (p) => <I {...p} d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>}/>,
  eye: (p) => <I {...p} d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}/>,
  eyeOff: (p) => <I {...p} d={<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/><path d="M14.12 14.12a3 3 0 11-4.24-4.24"/></>}/>,
  upload: (p) => <I {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></>}/>,
  file: (p) => <I {...p} d={<><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></>}/>,
  loading: (p) => <I {...p} d={<><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>} style={{ animation: "spin 1s linear infinite", ...p?.style }}/>,
};

// ─── Shared Styles ───────────────────────────────────────────────
const theme = {
  bg: "#1a1b1e",
  surface: "#222326",
  surfaceHover: "#2a2b2f",
  card: "#252629",
  border: "#1c1e22",
  borderLight: "#252830",
  text: "#e4e2de",
  textMuted: "#7a7d85",
  textDim: "#4a4d55",
  accent: "#d4a053",
  accentDim: "#8b6b38",
  accentBg: "rgba(212,160,83,0.08)",
  accentBorder: "rgba(212,160,83,0.2)",
  blue: "#4a90d9",
  blueBg: "rgba(74,144,217,0.08)",
  blueBorder: "rgba(74,144,217,0.2)",
  green: "#5cb87a",
  greenBg: "rgba(92,184,122,0.08)",
  greenBorder: "rgba(92,184,122,0.2)",
  red: "#d45d5d",
  redBg: "rgba(212,93,93,0.08)",
  redBorder: "rgba(212,93,93,0.2)",
  yellow: "#d4b34a",
  yellowBg: "rgba(212,179,74,0.08)",
  yellowBorder: "rgba(212,179,74,0.15)",
  font: "'DM Sans', 'Noto Sans KR', sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  radius: 10,
  radiusSm: 6,
};

// ─── Base Components ─────────────────────────────────────────────
const Badge = ({ children, color = "accent", style: st }) => {
  const colors = {
    accent: { bg: theme.accentBg, border: theme.accentBorder, text: theme.accent },
    blue: { bg: theme.blueBg, border: theme.blueBorder, text: theme.blue },
    green: { bg: theme.greenBg, border: theme.greenBorder, text: theme.green },
    red: { bg: theme.redBg, border: theme.redBorder, text: theme.red },
    yellow: { bg: theme.yellowBg, border: theme.yellowBorder, text: theme.yellow },
    dim: { bg: "rgba(255,255,255,0.04)", border: theme.border, text: theme.textMuted },
  };
  const c = colors[color] || colors.accent;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, letterSpacing: "0.2px", background: c.bg, border: `1px solid ${c.border}`, color: c.text, ...st }}>{children}</span>;
};

const Card = ({ children, style: st, onClick, hover }) => (
  <div onClick={onClick} style={{
    background: theme.card, borderRadius: theme.radius, border: `1px solid ${theme.border}`,
    padding: 20, transition: "all 0.2s ease",
    cursor: onClick ? "pointer" : "default",
    ...st
  }}
  onMouseEnter={e => { if (hover || onClick) { e.currentTarget.style.borderColor = theme.borderLight; e.currentTarget.style.background = theme.surfaceHover; }}}
  onMouseLeave={e => { if (hover || onClick) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.card; }}}
  >{children}</div>
);

const Button = ({ children, variant = "primary", disabled, onClick, style: st, size = "md" }) => {
  const variants = {
    primary: { bg: theme.accent, color: "#0a0a0a", hoverBg: "#e0b060" },
    secondary: { bg: theme.surfaceHover, color: theme.text, hoverBg: "#1e2025" },
    danger: { bg: theme.redBg, color: theme.red, hoverBg: "rgba(212,93,93,0.15)" },
    ghost: { bg: "transparent", color: theme.textMuted, hoverBg: "rgba(255,255,255,0.04)" },
    success: { bg: theme.greenBg, color: theme.green, hoverBg: "rgba(92,184,122,0.15)" },
  };
  const v = variants[variant];
  const sizes = { sm: { padding: "6px 14px", fontSize: 12 }, md: { padding: "10px 22px", fontSize: 13 }, lg: { padding: "14px 28px", fontSize: 15 } };
  const s = sizes[size];
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ ...s, borderRadius: theme.radiusSm, border: variant === "ghost" ? `1px solid ${theme.border}` : "none", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: theme.font, background: disabled ? theme.surfaceHover : v.bg, color: disabled ? theme.textDim : v.color, opacity: disabled ? 0.5 : 1, transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 6, ...st }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = v.hoverBg; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = disabled ? theme.surfaceHover : v.bg; }}
    >{children}</button>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", height: 42, ...props.style }}
      onFocus={e => e.target.style.borderColor = theme.accent}
      onBlur={e => e.target.style.borderColor = theme.border}
    />
  </div>
);

const SectionTitle = ({ icon, children, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: theme.text }}>
      {icon} {children}
    </div>
    {right}
  </div>
);

const Empty = ({ icon, text }) => (
  <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textDim }}>
    <div style={{ marginBottom: 8, opacity: 0.5 }}>{icon}</div>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

const Divider = () => <div style={{ height: 1, background: theme.border, margin: "20px 0" }}/>;

// ─── Tab Component ───────────────────────────────────────────────
const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 2, background: theme.surface, borderRadius: theme.radius, padding: 3, marginBottom: 24, border: `1px solid ${theme.border}` }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        flex: 1, padding: "10px 8px", borderRadius: theme.radiusSm + 1, border: "none", cursor: "pointer",
        fontSize: 12.5, fontWeight: 600, fontFamily: theme.font, transition: "all 0.2s",
        background: active === t.id ? theme.card : "transparent",
        color: active === t.id ? theme.text : theme.textMuted,
        boxShadow: active === t.id ? `0 1px 3px rgba(0,0,0,0.3)` : "none",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, position: "relative",
      }}>
        {t.icon} {t.label}
        {/* 단일 배지 (기존 호환성) */}
        {t.badge > 0 && !t.badges && <span style={{ position: "absolute", top: 4, right: 8, minWidth: 16, height: 16, borderRadius: 8, background: theme.red, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{t.badge}</span>}
        {/* 다중 배지 지원 */}
        {t.badges && (
          <div style={{ position: "absolute", top: 2, right: 4, display: "flex", gap: 3 }}>
            {t.badges.map((b, idx) => b.count > 0 && (
              <span key={idx} style={{ minWidth: 16, height: 16, borderRadius: 8, background: b.color, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{b.count}</span>
            ))}
          </div>
        )}
      </button>
    ))}
  </div>
);

// ════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════
export default function App() {
  // ─── Global State ──────────────────────────────────────────────
  const [page, setPage] = useState("login"); // login | student | worker | admin
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // student | worker | admin
  const [rememberSession, setRememberSession] = useState(true);
  const [savedCredentials, setSavedCredentials] = useState(null);

  // ─── Data State (persistent) ───────────────────────────────────
  const [reservations, setReservations] = useState([]);
  const [equipRentals, setEquipRentals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [workers, setWorkers] = useState(DEFAULT_WORKERS);
  const [sheetConfig, setSheetConfig] = useState({ 
    reservationWebhookUrl: "https://script.google.com/macros/s/AKfycbwr8VbFmyLslDO2Yts2mm3DyHgVCSYfAs1w-pymo_sNIXsQXXjc9kpqOKG-EaP66j8h/exec",
    printWebhookUrl: "https://script.google.com/macros/s/AKfycbwr8VbFmyLslDO2Yts2mm3DyHgVCSYfAs1w-pymo_sNIXsQXXjc9kpqOKG-EaP66j8h/exec"
  });
  const [overdueFlags, setOverdueFlags] = useState({});
  const [warnings, setWarnings] = useState({});
  const [blacklist, setBlacklist] = useState({});
  const [certificates, setCertificates] = useState({});
  const [inquiries, setInquiries] = useState([]);
  const [printRequests, setPrintRequests] = useState([]); // 출력 신청 데이터
  const [visitCount, setVisitCount] = useState(0); // 홈페이지 방문 횟수 (로그인 기반)
  const [visitedUsers, setVisitedUsers] = useState({}); // 방문한 고유 사용자 목록
  const [dataLoaded, setDataLoaded] = useState(false);

  // ─── Community & Exhibition (shared between LoginPage & AdminPortal) ──
  const defaultPosts = useMemo(() => [
    { id: "c1", content: "레이저컷터 사용법 알려줄 분 계신가요?", createdAt: "2026-02-07T10:30:00", comments: [
      { id: "cm1", content: "유튜브에 튜토리얼 많아요!", createdAt: "2026-02-07T11:00:00" },
      { id: "cm2", content: "조교실에 문의하시면 교육받으실 수 있어요", createdAt: "2026-02-07T12:30:00" },
    ] },
    { id: "c2", content: "4학년 졸업전시 준비하시는 분들 화이팅!", createdAt: "2026-02-06T15:20:00", comments: [
      { id: "cm3", content: "감사합니다 ㅠㅠ", createdAt: "2026-02-06T16:00:00" },
    ] },
    { id: "c3", content: "실기실 예약 시스템 너무 편하네요 ㅎㅎ", createdAt: "2026-02-05T09:15:00", comments: [] },
  ], []);
  const [communityPosts, setCommunityPostsRaw] = useState(defaultPosts);
  const setCommunityPosts = useCallback((updater) => {
    setCommunityPostsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      store.set("communityPosts", next);
      return next;
    });
  }, []);
  const defaultExhibitionPosts = useMemo(() => [{
    id: "exh1", title: "archi.zip", description: "건축을 구성하는 작은 요소들에 대해",
    dates: "2026.02.05 ~ 02.09", location: "레드로드예술실험센터",
    instagramUrl: "https://www.instagram.com/archi.zip_kmu", posterUrl: "/archzip_poster.jpeg",
    createdAt: "2026-02-01T00:00:00",
  }], []);
  const [exhibitionPosts, setExhibitionPostsRaw] = useState(defaultExhibitionPosts);
  const setExhibitionPosts = useCallback((updater) => {
    setExhibitionPostsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      store.set("exhibitionPosts", next);
      return next;
    });
  }, []);

  // ─── Load persisted data ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // 1단계: 로그인 화면에 꼭 필요한 2개만 먼저 로드 → 즉시 화면 표시
        const [session, remember] = await Promise.all([
          store.get("session"),
          store.get("rememberSession"),
        ]);

        const rememberPref = remember ?? true;
        setRememberSession(rememberPref);
        if (rememberPref && session?.user && session?.role) {
          setSavedCredentials({ user: session.user, role: session.role });
        }

        setDataLoaded(true);

        // 2단계: 나머지 데이터 백그라운드 로드 (화면 표시 후)
        const [wk, warn, blk, certs, res, eq, lg, notif, sheet, overdue, inq, prints, visits, visitors, cmPosts, exhPosts, exhDataOld] = await Promise.all([
          store.get("workers"),
          store.get("warnings"),
          store.get("blacklist"),
          store.get("certificates"),
          store.get("reservations"),
          store.get("equipRentals"),
          store.get("logs"),
          store.get("notifications"),
          store.get("sheetConfig"),
          store.get("overdueFlags"),
          store.get("inquiries"),
          store.get("printRequests"),
          store.get("visitCount"),
          store.get("visitedUsers"),
          store.get("communityPosts"),
          store.get("exhibitionPosts"),
          store.get("exhibitionData"),
        ]);
        if (wk) setWorkers(wk);
        if (warn) setWarnings(warn);
        if (blk) setBlacklist(blk);
        if (certs) setCertificates(certs);
        if (res) setReservations(res);
        if (eq) setEquipRentals(eq);
        if (lg) setLogs(lg);
        if (notif) setNotifications(notif);
        if (sheet) setSheetConfig(sheet);
        if (overdue) setOverdueFlags(overdue);
        if (inq) setInquiries(inq);
        if (prints) setPrintRequests(prints);
        if (visits) setVisitCount(visits);
        if (visitors) setVisitedUsers(visitors);
        if (cmPosts) setCommunityPostsRaw(cmPosts); else store.set("communityPosts", defaultPosts);
        if (exhPosts) {
          setExhibitionPostsRaw(exhPosts);
        } else if (exhDataOld) {
          const migrated = [{ ...exhDataOld, id: `exh${Date.now()}`, createdAt: new Date().toISOString() }];
          setExhibitionPostsRaw(migrated);
          store.set("exhibitionPosts", migrated);
        } else {
          store.set("exhibitionPosts", defaultExhibitionPosts);
        }
      } catch (error) {
        console.error("Initial data load failed:", error);
        setDataLoaded(true);
      }
    })();
  }, []);

  // ─── Persist helpers ───────────────────────────────────────────
  const persist = useCallback(async (key, data) => { await store.set(key, data); }, []);

  const addLog = useCallback((action, type, extra = {}) => {
    setLogs(prev => {
      const next = [{ id: uid(), time: ts(), action, type, ...extra }, ...prev].slice(0, 500);
      persist("logs", next);
      return next;
    });
  }, [persist]);

  const addNotification = useCallback((text, type = "info", urgent = false) => {
    setNotifications(prev => {
      const next = [{ id: uid(), text, type, urgent, read: false, time: ts() }, ...prev].slice(0, 200);
      persist("notifications", next);
      return next;
    });
  }, [persist]);

  const updateReservations = useCallback((updater) => {
    setReservations(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("reservations", next);
      return next;
    });
  }, [persist]);

  const updateEquipRentals = useCallback((updater) => {
    setEquipRentals(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("equipRentals", next);
      return next;
    });
  }, [persist]);

  const updateWorkers = useCallback((updater) => {
    setWorkers(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("workers", next);
      return next;
    });
  }, [persist]);

  const updateSheetConfig = useCallback((updater) => {
    setSheetConfig(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("sheetConfig", next);
      return next;
    });
  }, [persist]);

  const updateOverdueFlags = useCallback((updater) => {
    setOverdueFlags(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("overdueFlags", next);
      return next;
    });
  }, [persist]);

  const updateWarnings = useCallback((updater) => {
    setWarnings(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("warnings", next);
      return next;
    });
  }, [persist]);

  const updateBlacklist = useCallback((updater) => {
    setBlacklist(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("blacklist", next);
      return next;
    });
  }, [persist]);

  const updateCertificates = useCallback((updater) => {
    setCertificates(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("certificates", next);
      return next;
    });
  }, [persist]);

  const updateInquiries = useCallback((updater) => {
    setInquiries(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("inquiries", next);
      return next;
    });
  }, [persist]);

  const updatePrintRequests = useCallback((updater) => {
    setPrintRequests(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist("printRequests", next);
      return next;
    });
  }, [persist]);

  const markNotifRead = useCallback((id) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? {...n, read: true} : n);
      persist("notifications", next);
      return next;
    });
  }, [persist]);

  const markAllNotifsRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({...n, read: true}));
      persist("notifications", next);
      return next;
    });
  }, [persist]);

  const verifyStudentInSheet = useCallback(async (studentId, studentName) => {
    const cfg = EDITABLE?.safetySheet;
    const url = cfg?.url?.trim();
    if (!url) return { ok: false, error: "연동 URL이 설정되지 않았습니다." };
    const payload = {
      action: "verify_student",
      studentId: studentId?.trim(),
      studentName: studentName?.trim(),
      sheetName: cfg?.sheetName,
      columns: cfg?.columns,
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = null; }
      if (!res.ok) return { ok: false, error: data?.error || text || `HTTP ${res.status}` };
      if (!data) return { ok: false, error: "응답 형식 오류" };
      if (!data.found) return { ok: false, error: "안전교육 이수자 명단에 없습니다." };
      return { ok: true, student: data.student || {}, safetyTrained: data.safetyTrained ?? true };
    } catch (err) {
      // POST 실패 시 GET 방식으로 재시도 (preflight/CORS 우회)
      try {
        const params = new URLSearchParams({
          action: "verify_student",
          studentId: payload.studentId || "",
          studentName: payload.studentName || "",
          sheetName: payload.sheetName || "",
        });
        const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch { data = null; }
        if (!res.ok) return { ok: false, error: data?.error || text || `HTTP ${res.status}` };
        if (!data) return { ok: false, error: "응답 형식 오류" };
        if (!data.found) return { ok: false, error: "안전교육 이수자 명단에 없습니다." };
        return { ok: true, student: data.student || {}, safetyTrained: data.safetyTrained ?? true };
      } catch (err2) {
        return { ok: false, error: err2?.message || err?.message || "연동 실패" };
      }
    }
  }, []);

  const sendEmailNotification = useCallback(async ({ to, subject, body }) => {
    const cfg = EDITABLE?.emailNotify;
    if (!cfg?.enabled) return { skipped: true };
    const url = cfg?.url?.trim();
    if (!url) return { skipped: true };
    // to 파라미터가 있으면 해당 이메일로, 없으면 기본 recipients로 발송
    const recipients = to || (Array.isArray(cfg?.recipients) ? cfg.recipients.join(",") : String(cfg?.recipients || ""));
    if (!recipients) return { skipped: true };
    try {
      const payload = {
        action: "send_email",
        to: recipients,
        subject,
        body,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true };
    } catch (err) {
      // CORS 우회: no-cors POST → 실패 시 GET
      try {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "send_email", to: recipients, subject, body }),
        });
        return { ok: true, opaque: true };
      } catch (err2) {
        try {
          const params = new URLSearchParams({
            action: "send_email",
            to: recipients,
            subject: subject || "",
            body: body || "",
          });
          await fetch(`${url}?${params.toString()}`, { method: "GET" });
          return { ok: true, fallback: "get" };
        } catch (err3) {
          return { ok: false, error: err3?.message || err2?.message || err?.message || "email_failed" };
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!equipRentals?.length) return;
    const today = dateStr();
    const newFlags = { ...overdueFlags };
    let changed = false;
    equipRentals.forEach(r => {
      if (r.status === "returned" || r.status === "cancelled") return;
      if (r.returnDate && r.returnDate < today) {
        if (!newFlags[r.id]) {
          newFlags[r.id] = true;
          changed = true;
          addNotification(`⏰ 연체 알림: ${r.studentName} → ${r.items?.map(i => i.name).join(", ")} (반납일 ${r.returnDate})`, "equipment", true);
          addLog(`[연체] ${r.studentName}(${r.studentId}) → ${r.items?.map(i => i.name).join(", ")} | 반납일 ${r.returnDate}`, "equipment", { studentId: r.studentId });
          sendEmailNotification({
            subject: `[연체 알림] ${r.studentName} · 기구 반납 지연`,
            body: [
              "물품 대여 반납 기한이 지났습니다.",
              "",
              "[대여 정보]",
              `- 학생: ${r.studentName} (${r.studentId})`,
              `- 전공/학년: ${r.studentDept || "-"}`,
              `- 대여 품목: ${r.items?.map(i => i.name).join(", ")}`,
              `- 반납 예정일: ${r.returnDate}`,
              "",
              "즉시 반납 안내 부탁드립니다.",
              "국민대학교 건축대학 실기실, 물품 예약 시스템",
            ].join("\n"),
          });
        }
      }
    });
    if (changed) updateOverdueFlags(newFlags);
  }, [equipRentals, overdueFlags, addNotification, addLog, sendEmailNotification, updateOverdueFlags]);

  const syncReservationToSheet = useCallback(async (reservation) => {
    const url = sheetConfig?.reservationWebhookUrl?.trim();
    if (!url) return { skipped: true };
    try {
      const payload = {
        event: "room_reservation",
        data: {
          id: reservation.id,
          studentId: reservation.studentId,
          studentName: reservation.studentName,
          studentDept: reservation.studentDept,
          roomId: reservation.roomId,
          roomName: reservation.roomName,
          date: reservation.date,
          slots: reservation.slots,
          slotLabels: reservation.slotLabels,
          purpose: reservation.purpose,
          members: reservation.members,
          status: reservation.status,
          createdAt: reservation.createdAt,
        },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true };
    } catch (err) {
      // CORS/Preflight issues are common with Google Apps Script webhooks.
      // Fallback to no-cors + text/plain to allow request delivery.
      try {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            event: "room_reservation",
            data: {
              id: reservation.id,
              studentId: reservation.studentId,
              studentName: reservation.studentName,
              studentDept: reservation.studentDept,
              roomId: reservation.roomId,
              roomName: reservation.roomName,
              date: reservation.date,
              slots: reservation.slots,
              slotLabels: reservation.slotLabels,
              purpose: reservation.purpose,
              members: reservation.members,
              status: reservation.status,
              createdAt: reservation.createdAt,
            },
          }),
        });
        return { ok: true, opaque: true };
      } catch (err2) {
        addLog(`[구글시트 연동 실패] ${reservation.studentName}(${reservation.studentId}) → ${reservation.roomName} ${reservation.date}`, "reservation");
        return { ok: false, error: err2?.message || err?.message || "unknown" };
      }
    }
  }, [sheetConfig, addLog]);

  // 출력 신청 → 구글 시트 연동
  const syncPrintToSheet = useCallback(async (printRequest) => {
    const url = sheetConfig?.printWebhookUrl?.trim();
    if (!url) return { skipped: true };
    try {
      const payload = {
        event: "print_request",
        data: {
          id: printRequest.id,
          studentId: printRequest.studentId,
          studentName: printRequest.studentName,
          studentDept: printRequest.studentDept,
          paperSize: printRequest.paperSize,
          colorMode: printRequest.colorMode,
          copies: printRequest.copies,
          unitPrice: printRequest.unitPrice,
          totalPrice: printRequest.totalPrice,
          fileName: printRequest.printFile?.name || "",
          note: printRequest.note,
          urgentPickup: printRequest.urgentPickup,
          status: printRequest.status,
          createdAt: printRequest.createdAt,
        },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true };
    } catch (err) {
      try {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            event: "print_request",
            data: {
              id: printRequest.id,
              studentId: printRequest.studentId,
              studentName: printRequest.studentName,
              studentDept: printRequest.studentDept,
              paperSize: printRequest.paperSize,
              colorMode: printRequest.colorMode,
              copies: printRequest.copies,
              unitPrice: printRequest.unitPrice,
              totalPrice: printRequest.totalPrice,
              fileName: printRequest.printFile?.name || "",
              note: printRequest.note,
              urgentPickup: printRequest.urgentPickup,
              status: printRequest.status,
              createdAt: printRequest.createdAt,
            },
          }),
        });
        return { ok: true, opaque: true };
      } catch (err2) {
        addLog(`[출력 시트 연동 실패] ${printRequest.studentName}(${printRequest.studentId})`, "print");
        return { ok: false, error: err2?.message || err?.message || "unknown" };
      }
    }
  }, [sheetConfig, addLog]);

  // ─── Auth ──────────────────────────────────────────────────────
  const updateRememberSession = useCallback(async (val) => {
    setRememberSession(val);
    await store.set("rememberSession", val);
    if (!val) await store.set("session", null);
  }, []);

  const handleLogin = async (user, role) => {
    setCurrentUser(user);
    setUserRole(role);
    setPage(role);
    if (rememberSession) store.set("session", { user, role, page: role });
    else store.set("session", null);
    
    // 학생 로그인 시 방문 횟수 증가 (로그인할 때마다 +1)
    if (role === "student" && user?.id) {
      const currentCount = await store.get("visitCount") || 0;
      const newCount = currentCount + 1;
      setVisitCount(newCount);
      await store.set("visitCount", newCount);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setPage("login");
    if (!rememberSession) store.set("session", null);
  };

  // ─── Reset data ────────────────────────────────────────────────
  const resetAllData = async () => {
    const empty = [];
    setReservations(empty); setEquipRentals(empty); setLogs(empty); setNotifications(empty);
    setWorkers(DEFAULT_WORKERS);
    await Promise.all([
      persist("reservations", empty), persist("equipRentals", empty),
      persist("logs", empty), persist("notifications", empty),
      persist("workers", DEFAULT_WORKERS),
    ]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!dataLoaded) {
    return (
      <div style={{ fontFamily: theme.font, background: theme.bg, color: theme.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.accent, marginBottom: 8 }}>국민대학교 건축대학 실기실, 물품 예약 시스템</div>
          <div style={{ fontSize: 13, color: theme.textMuted }}>데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: theme.font, background: theme.bg, color: theme.text, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Noto+Sans+KR:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.bg}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        ::selection { background: ${theme.accent}; color: #000; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        .slide-in { animation: slideIn 0.25s ease forwards; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 16px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {page === "login" && (
          <LoginPage
            onLogin={handleLogin}
            onReset={resetAllData}
            workers={workers}
            verifyStudentInSheet={verifyStudentInSheet}
            rememberSession={rememberSession}
            onRememberSessionChange={updateRememberSession}
            blacklist={blacklist}
            warnings={warnings}
            certificates={certificates}
            updateCertificates={updateCertificates}
            inquiries={inquiries}
            updateInquiries={updateInquiries}
            savedCredentials={savedCredentials}
            communityPosts={communityPosts}
            setCommunityPosts={setCommunityPosts}
            exhibitionPosts={exhibitionPosts}
          />
        )}
        {page === "student" && (
          <StudentPortal
            user={currentUser} onLogout={handleLogout}
            reservations={reservations} updateReservations={updateReservations}
            equipRentals={equipRentals} updateEquipRentals={updateEquipRentals}
            addLog={addLog} addNotification={addNotification}
            syncReservationToSheet={syncReservationToSheet}
            syncPrintToSheet={syncPrintToSheet}
            sendEmailNotification={sendEmailNotification}
            warnings={warnings}
            inquiries={inquiries}
            updateInquiries={updateInquiries}
            printRequests={printRequests}
            updatePrintRequests={updatePrintRequests}
          />
        )}
        {page === "worker" && (
          <WorkerPortal
            user={currentUser} onLogout={handleLogout}
            reservations={reservations} updateReservations={updateReservations}
            equipRentals={equipRentals} updateEquipRentals={updateEquipRentals}
            logs={logs} addLog={addLog}
            notifications={notifications} markNotifRead={markNotifRead} markAllNotifsRead={markAllNotifsRead}
            unreadCount={unreadCount}
            sendEmailNotification={sendEmailNotification}
            inquiries={inquiries} updateInquiries={updateInquiries}
            printRequests={printRequests} updatePrintRequests={updatePrintRequests}
            visitCount={visitCount}
          />
        )}
        {page === "admin" && (
          <AdminPortal
            onLogout={handleLogout}
            reservations={reservations} updateReservations={updateReservations}
            workers={workers} updateWorkers={updateWorkers}
            logs={logs} addLog={addLog}
            sheetConfig={sheetConfig} updateSheetConfig={updateSheetConfig}
            warnings={warnings} updateWarnings={updateWarnings}
            blacklist={blacklist} updateBlacklist={updateBlacklist}
            certificates={certificates}
            updateCertificates={updateCertificates}
            sendEmailNotification={sendEmailNotification}
            communityPosts={communityPosts} setCommunityPosts={setCommunityPosts}
            exhibitionPosts={exhibitionPosts} setExhibitionPosts={setExhibitionPosts}
          />
        )}
      </div>
      
      {/* Global KMU Logo - Fixed at bottom (center for login, right for portals) */}
      <img 
        src="/kmu-logo.png" 
        alt="KMU Logo"
        style={{
          position: "fixed",
          bottom: "15px",
          ...(page === "login" ? {
            left: "50%",
            transform: "translateX(-50%)",
          } : {
            right: "20px",
            left: "auto",
            transform: "none",
          }),
          height: "40px",
          width: "auto",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 1000,
          objectFit: "contain"
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  LOGIN PAGE
// ════════════════════════════════════════════════════════════════
function LoginPage({ onLogin, onReset, workers, verifyStudentInSheet, rememberSession, onRememberSessionChange, blacklist, warnings, certificates, updateCertificates, inquiries, updateInquiries, savedCredentials, communityPosts, setCommunityPosts, exhibitionPosts }) {
  const [mode, setMode] = useState(() => savedCredentials?.role === "worker" ? "worker" : savedCredentials?.role === "admin" ? "admin" : "student");
  const [sid, setSid] = useState(() => savedCredentials?.role === "student" ? (savedCredentials.user?.id || "") : "");
  const [sname, setSname] = useState(() => savedCredentials?.role === "student" ? (savedCredentials.user?.name || "") : "");
  const [wUser, setWUser] = useState(() => savedCredentials?.role === "worker" ? (savedCredentials.user?.username || "") : savedCredentials?.role === "admin" ? (savedCredentials.user?.username || "") : "");
  const [wPass, setWPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [studentChecking, setStudentChecking] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [certSid, setCertSid] = useState("");
  const [certSname, setCertSname] = useState("");
  const [certYear, setCertYear] = useState("");
  const [certMajor, setCertMajor] = useState("");
  const [certEmail, setCertEmail] = useState("");
  const [showCertUpload, setShowCertUpload] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryContact, setInquiryContact] = useState("");
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState("");
  const fileInputRef = useRef(null);
  
  // 전시회/커뮤니티 탭 상태
  const [rightPanelTab, setRightPanelTab] = useState("community"); // exhibition | community
  const [expandedExhId, setExpandedExhId] = useState(null); // 펼친 전시회 ID
  const [newPostContent, setNewPostContent] = useState("");
  const [expandedPostId, setExpandedPostId] = useState(null); // 슬라이드 확장된 게시글 ID
  const [newCommentContent, setNewCommentContent] = useState(""); // 새 댓글 내용
  const [myPostIds, setMyPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("myPostIds") || "[]");
    } catch { return []; }
  }); // 내가 작성한 글 ID들
  const [editingPostId, setEditingPostId] = useState(null); // 수정 중인 글 ID
  const [editingContent, setEditingContent] = useState(""); // 수정 중인 내용
  const [myCommentIds, setMyCommentIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("myCommentIds") || "[]");
    } catch { return []; }
  }); // 내가 작성한 댓글 ID들
  const [editingCommentId, setEditingCommentId] = useState(null); // 수정 중인 댓글 ID
  const [editingCommentContent, setEditingCommentContent] = useState(""); // 수정 중인 댓글 내용

  // 공지사항 상태
  const [notices, setNotices] = useState([
    { title: "[사단법인 밀레니엄심포니오케스트라] 대학생·대학원생 서포터즈 밀리언 3기 모집(~3/15)", date: "02.05", category: "사회봉사", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11324/view.do" },
    { title: "[서울시립일시청소년쉼터] 2026 자원활동가 모집(~2/21)", date: "02.05", category: "사회봉사", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11323/view.do" },
    { title: "제16회 DB보험금융공모전(IFC)", date: "02.05", category: "장학공지", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11322/view.do" },
    { title: "[외국인유학생지원센터] 2025-2 학위과정 외국인등록증 발급 및 연장 안내", date: "02.05", category: "학사공지", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11321/view.do" },
    { title: "2026학년도 1학기 재입학 신청 안내", date: "02.04", category: "학사공지", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11320/view.do" },
    { title: "2026학년도 1학기 복학 신청 안내", date: "02.04", category: "학사공지", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11319/view.do" },
    { title: "2026학년도 1학기 수강신청 일정 안내", date: "02.03", category: "학사공지", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11318/view.do" },
    { title: "2026학년도 1학기 등록금 납부 안내", date: "02.03", category: "학사공지", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11317/view.do" },
    { title: "2026년 2월 학위수여식 안내", date: "02.02", category: "학사공지", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11316/view.do" },
    { title: "2026학년도 교내장학금 신청 안내", date: "02.01", category: "장학공지", url: "https://www.kookmin.ac.kr/user/kmuNews/notice/8/11315/view.do" },
  ]);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [lastNoticeUpdate, setLastNoticeUpdate] = useState(null);
  const [haedongHover, setHaedongHover] = useState(false);
  const [certHover, setCertHover] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.innerWidth <= 1200);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const loginScale = useMemo(() => {
    const shouldScaleDown = viewportSize.width < 1600 || viewportSize.height < 900;
    if (!shouldScaleDown) return 1;

    const widthRatio = viewportSize.width / 1600;
    const heightRatio = viewportSize.height / 900;
    return Math.max(0.72, Math.min(1, widthRatio, heightRatio));
  }, [viewportSize]);

  // 공지사항 가져오기 함수
  const fetchNotices = async () => {
    setNoticeLoading(true);
    try {
      const proxies = [
        "https://api.codetabs.com/v1/proxy?quest=",
        "https://api.allorigins.win/raw?url=",
      ];
      const targetUrl = "https://www.kookmin.ac.kr/user/kmuNews/notice/index.do";
      let html = null;
      for (const proxy of proxies) {
        try {
          const res = await fetch(proxy + encodeURIComponent(targetUrl));
          if (res.ok) { html = await res.text(); break; }
        } catch {}
      }
      if (!html) throw new Error("proxy failed");

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const items = doc.querySelectorAll(".board_list ul li");

      const newNotices = [];
      items.forEach((li, idx) => {
        if (idx >= 10) return;
        const anchor = li.querySelector("a");
        const titleEl = li.querySelector("p.title");
        const categoryEl = li.querySelector("span.ctg_name");
        const etcSpans = li.querySelectorAll(".board_etc span");

        if (anchor && titleEl) {
          const href = anchor.getAttribute("href");
          const fullUrl = href?.startsWith("http") ? href : `https://www.kookmin.ac.kr${href}`;
          const rawDate = etcSpans[0]?.textContent?.trim() || "";
          const shortDate = rawDate.length >= 5 ? rawDate.slice(5) : rawDate;
          newNotices.push({
            title: titleEl.textContent?.trim() || "",
            date: shortDate,
            category: categoryEl?.textContent?.trim() || "",
            url: fullUrl
          });
        }
      });

      if (newNotices.length > 0) {
        setNotices(newNotices);
        setLastNoticeUpdate(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      console.log("공지사항 로딩 실패:", err);
    }
    setNoticeLoading(false);
  };

  // 30분마다 공지사항 업데이트
  useEffect(() => {
    fetchNotices(); // 초기 로딩
    const interval = setInterval(fetchNotices, 30 * 60 * 1000); // 30분
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsCompactLayout(width <= 1200);
      setViewportSize({ width, height });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleInquirySubmit = () => {
    if (!inquiryTitle.trim() || !inquiryContent.trim()) return;
    setInquirySubmitting(true);
    const newInquiry = {
      id: uid(),
      title: inquiryTitle.trim(),
      content: inquiryContent.trim(),
      name: inquiryName.trim() || "익명",
      contact: inquiryContact.trim() || "",
      createdAt: ts(),
      status: "pending",
      answer: null,
      isLoggedIn: false,
    };
    updateInquiries(prev => [newInquiry, ...prev]);
    setInquiryTitle("");
    setInquiryContent("");
    setInquiryName("");
    setInquiryContact("");
    setInquirySubmitting(false);
    setInquirySuccess("문의가 등록되었습니다!");
    setTimeout(() => setInquirySuccess(""), 3000);
  };

  const handleStudentLogin = async () => {
    const sidTrim = sid.trim();
    const snameTrim = sname.trim();
    if (!sidTrim || !snameTrim) return;
    setError("");
    setStudentChecking(true);
    const result = await verifyStudentInSheet?.(sidTrim, snameTrim);
    setStudentChecking(false);
    if (!result?.ok) { setError(result?.error || "조회 실패"); return; }
    const fallback = STUDENTS_DB.find(s => s.id === sidTrim && s.name === snameTrim);
    if (blacklist?.[sidTrim]) {
      setError("블랙리스트로 등록되어 로그인할 수 없습니다.");
      return;
    }
    const warnInfo = warnings?.[sidTrim];
    const student = {
      id: sidTrim,
      name: snameTrim,
      dept: result?.student?.dept || fallback?.dept || "미상",
      year: result?.student?.year || fallback?.year || 0,
      safetyTrained: result?.safetyTrained ?? true,
      safetyDate: result?.student?.safetyDate || fallback?.safetyDate || null,
      warningCount: warnInfo?.count || 0,
    };
    onLogin(student, "student");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadSuccess("");
    setError("");
  };

  const handleConfirmUpload = async () => {
    if (!uploadFile) {
      setError("파일을 먼저 선택해주세요.");
      return;
    }
    if (!certSid.trim() || !certSname.trim() || !certYear.trim() || !certMajor.trim() || !certEmail.trim()) {
      setError("학번, 이름, 학년, 전공, 이메일을 먼저 입력해주세요.");
      return;
    }
    setUploading(true);
    setUploadSuccess("");
    setError("");
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        const certData = {
          studentId: certSid.trim(),
          studentName: certSname.trim(),
          studentYear: certYear.trim(),
          studentMajor: certMajor.trim(),
          studentEmail: certEmail.trim(),
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          fileType: uploadFile.type,
          uploadDate: new Date().toISOString(),
          data: base64,
        };
        updateCertificates?.(prev => ({ ...prev, [certSid.trim()]: certData }));
        setUploading(false);
        setUploadSuccess("✅ 업로드 완료!");
        setShowUploadConfirm(true);
        setUploadFile(null);
      };
      reader.onerror = () => {
        setUploading(false);
        setError("파일 업로드 실패");
      };
      reader.readAsDataURL(uploadFile);
    } catch (err) {
      setUploading(false);
      setError("파일 업로드 실패: " + (err?.message || "알 수 없는 오류"));
    }
  };

  const handleWorkerLogin = () => {
    const found = workers.find(w => w.username === wUser.trim() && w.password === wPass) || workers[0];
    if (!found) { setError("근로학생 계정이 없습니다."); return; }
    setError("");
    onLogin(found, "worker");
  };

  const handleAdminLogin = () => {
    setError("");
    onLogin({ name: ADMIN_ACCOUNT.name, username: ADMIN_ACCOUNT.username, role: "admin" }, "admin");
  };

  const handleSubmit = async () => {
    if (mode === "student") await handleStudentLogin();
    else if (mode === "worker") handleWorkerLogin();
    else handleAdminLogin();
  };

  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      paddingBottom: 60,
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Top Left - User Guide & Notices (Above Quick Links) */}
      <div style={{
        position: "fixed",
        left: 20,
        top: 20,
        zIndex: isCompactLayout ? 2 : 10,
        width: 500,
        transform: `scale(${loginScale})`,
        transformOrigin: "top left",
      }}>
        {/* Horizontal Guide Content */}
        <div style={{
          background: "rgba(30, 31, 38, 0.95)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          padding: "14px 20px",
        }}>
          {/* Title Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📖</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.accent }}>이용 안내</span>
            <div style={{ flex: 1, height: 1, background: theme.border, marginLeft: 8 }}/>
          </div>
          
          {/* Quick Start Steps - Horizontal */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ 
                width: 20, height: 20, borderRadius: "50%", 
                background: theme.accentBg, color: theme.accent,
                fontSize: 11, fontWeight: 700, 
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>1</span>
              <span style={{ fontSize: 11, color: theme.textMuted }}>안전교육 수료증 제출</span>
            </div>
            <span style={{ color: theme.textDim, fontSize: 10 }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ 
                width: 20, height: 20, borderRadius: "50%", 
                background: theme.accentBg, color: theme.accent,
                fontSize: 11, fontWeight: 700, 
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>2</span>
              <span style={{ fontSize: 11, color: theme.textMuted }}>학번/이름 입력 후 로그인</span>
            </div>
            <span style={{ color: theme.textDim, fontSize: 10 }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ 
                width: 20, height: 20, borderRadius: "50%", 
                background: theme.accentBg, color: theme.accent,
                fontSize: 11, fontWeight: 700, 
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>3</span>
              <span style={{ fontSize: 11, color: theme.textMuted }}>예약/대여/출력 이용</span>
            </div>
          </div>
          
          {/* Quick Info - Horizontal */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 11, color: theme.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: theme.yellow }}>⏰</span> 평일 09:00~17:00
            </div>
            <div style={{ fontSize: 11, color: theme.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: theme.blue }}>📍</span> 복지관 602호실 교학팀
            </div>
            <div style={{ fontSize: 11, color: theme.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: theme.green }}>📞</span> 02-910-6525
            </div>
          </div>
        </div>
      </div>

      {/* Left Side Banner - Quick Links */}
      <div style={{
        position: "fixed",
        left: 20,
        top: "50%",
        transform: `translateY(-50%) scale(${loginScale})`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: isCompactLayout ? 2 : 100,
        transformOrigin: "left center",
      }}>
        {/* Banner Title */}
        <div style={{
          padding: "6px 12px",
          background: "transparent",
          marginBottom: 6,
          marginLeft: 4,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "2px", textTransform: "uppercase" }}>바로가기</span>
        </div>
        {[
          { label: "국민대학교", url: "https://www.kookmin.ac.kr", icon: "🏫", color: "#4A90D9" },
          { label: "건축대학", url: "https://archi.kookmin.ac.kr/", icon: "🏛️", color: "#d4a053" },
          { label: "ON국민", url: "https://portal.kookmin.ac.kr/por/ln", icon: "📋", color: "#6B8E23" },
          { label: "가상대학", url: "https://ecampus.kookmin.ac.kr/login/index.php", icon: "📚", color: "#9370DB" },
          { label: "성곡도서관", url: "https://lib.kookmin.ac.kr/#/", icon: "📖", color: "#20B2AA" },
        ].map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: "rgba(30, 31, 38, 0.9)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${link.color}40`,
              borderLeft: `3px solid ${link.color}`,
              borderRadius: "0 8px 8px 0",
              textDecoration: "none",
              color: theme.text,
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s ease",
              minWidth: 140,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${link.color}20`;
              e.currentTarget.style.borderColor = link.color;
              e.currentTarget.style.transform = "translateX(4px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(30, 31, 38, 0.9)";
              e.currentTarget.style.borderColor = `${link.color}40`;
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span style={{ fontSize: 16 }}>{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
        
        {/* 증명서 발급 with Tooltip */}
        <div style={{ position: "relative" }}>
          <a
            href="https://unc.doculink.co.kr/index/main.do#reload"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: certHover ? "#FF950020" : "rgba(30, 31, 38, 0.9)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${certHover ? "#FF9500" : "#FF950040"}`,
              borderLeft: "3px solid #FF9500",
              borderRadius: "0 8px 8px 0",
              textDecoration: "none",
              color: theme.text,
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s ease",
              minWidth: 140,
              transform: certHover ? "translateX(4px)" : "translateX(0)",
            }}
            onMouseEnter={() => setCertHover(true)}
            onMouseLeave={() => setCertHover(false)}
          >
            <span style={{ fontSize: 16 }}>📄</span>
            <span>증명서 발급</span>
          </a>
          
          {/* Tooltip */}
          {certHover && (
            <div style={{
              position: "absolute",
              left: "100%",
              top: "50%",
              transform: "translateY(-50%)",
              marginLeft: 12,
              background: "rgba(30, 31, 38, 0.98)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.border}`,
              borderLeft: "3px solid #FF9500",
              borderRadius: 8,
              padding: "10px 14px",
              zIndex: 9999,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>💰</span>
                <span style={{ fontSize: 12, color: "#FF9500", fontWeight: 600 }}>1건당 3,000원 수수료 있음</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 해동예약포털 with Tooltip */}
        <div style={{ position: "relative" }}>
          <a
            href="https://lib.kookmin.ac.kr/facility/reservation/room/all-rooms?roomIndex=1"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: haedongHover ? "#FF6B6B20" : "rgba(30, 31, 38, 0.9)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${haedongHover ? "#FF6B6B" : "#FF6B6B40"}`,
              borderLeft: "3px solid #FF6B6B",
              borderRadius: "0 8px 8px 0",
              textDecoration: "none",
              color: theme.text,
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s ease",
              minWidth: 140,
              transform: haedongHover ? "translateX(4px)" : "translateX(0)",
            }}
            onMouseEnter={() => setHaedongHover(true)}
            onMouseLeave={() => setHaedongHover(false)}
          >
            <span style={{ fontSize: 16 }}>🗓️</span>
            <span>해동예약포털</span>
          </a>
          
          {/* Tooltip */}
          {haedongHover && (
            <div style={{
              position: "absolute",
              left: "100%",
              top: 0,
              marginLeft: 12,
              width: 320,
              background: "rgba(30, 31, 38, 0.98)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.border}`,
              borderLeft: "3px solid #FF6B6B",
              borderRadius: 10,
              padding: 16,
              zIndex: 9999,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              {/* Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>🗓️</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FF6B6B" }}>해동예약포털 이용방법</span>
              </div>
              
              {/* Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {[
                  "로그인",
                  "공간/장비 예약 클릭",
                  "예약 클릭 후 해동KL 클릭",
                  "희망하는 날짜 조회 후 원하는 장비 예약하기",
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ 
                      width: 20, height: 20, borderRadius: "50%", 
                      background: "rgba(255, 107, 107, 0.2)", color: "#FF6B6B",
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>{idx + 1}</span>
                    <span style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.4 }}>{step}</span>
                  </div>
                ))}
              </div>
              
              {/* Warning */}
              <div style={{
                background: "rgba(255, 193, 7, 0.1)",
                border: "1px solid rgba(255, 193, 7, 0.3)",
                borderRadius: 6,
                padding: "10px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                  <span style={{ fontSize: 11, color: theme.yellow, lineHeight: 1.5 }}>
                    안전교육 이수 후 해당 장비 사전교육을 해동에서 받아야만 이용할 수 있습니다.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notice Board - Between Banner and Login */}
      <div style={{
        position: "fixed",
        left: 200,
        top: "50%",
        transform: `translateY(-50%) scale(${loginScale})`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        zIndex: 1,
        width: 420,
        transformOrigin: "left center",
      }}>
        {/* Notice Title */}
        <div style={{
          padding: "6px 12px",
          background: "transparent",
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "2px", textTransform: "uppercase" }}>📢 학교 공지사항</span>
          <a 
            href="https://www.kookmin.ac.kr/user/kmuNews/notice/index.do" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: theme.accent, textDecoration: "none" }}
          >
            더보기 →
          </a>
        </div>
        {/* Notice Items */}
        <div style={{
          background: "rgba(30, 31, 38, 0.9)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}>
          {noticeLoading && (
            <div style={{ position: "absolute", top: 8, right: 8 }}>
              <div style={{ width: 12, height: 12, border: `2px solid ${theme.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}/>
            </div>
          )}
          {notices.map((notice, i) => (
            <a
              key={i}
              href={notice.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                textDecoration: "none",
                borderBottom: i < notices.length - 1 ? `1px solid ${theme.border}` : "none",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(212, 160, 83, 0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ 
                fontSize: 12, 
                color: theme.text, 
                flex: 1, 
                overflow: "hidden", 
                textOverflow: "ellipsis", 
                whiteSpace: "nowrap",
                marginRight: 10,
              }}>
                {notice.title}
              </span>
              <span style={{ fontSize: 10, color: theme.textDim, flexShrink: 0 }}>{notice.date}</span>
            </a>
          ))}
        </div>
        {lastNoticeUpdate && (
          <div style={{ fontSize: 9, color: theme.textDim, textAlign: "right", marginTop: 4 }}>
            마지막 업데이트: {lastNoticeUpdate}
          </div>
        )}
      </div>

      {/* Exhibition Poster - Right Side */}
      <div style={{
        position: "fixed",
        right: 60,
        top: "50%",
        transform: `translateY(-50%) scale(${loginScale})`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: isCompactLayout ? 2 : 10,
        width: 420,
        transformOrigin: "top right",
      }}>
        {/* Tab Header */}
        <div style={{
          display: "flex",
          gap: 0,
          background: "rgba(30, 31, 38, 0.9)",
          borderRadius: 8,
          padding: 4,
          border: `1px solid ${theme.border}`,
        }}>
          <button
            onClick={() => setRightPanelTab("community")}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderRadius: 6,
              background: rightPanelTab === "community" ? theme.accent : "transparent",
              color: rightPanelTab === "community" ? "#000" : theme.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: theme.font,
            }}
          >
            💬 커뮤니티
          </button>
          <button
            onClick={() => setRightPanelTab("exhibition")}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderRadius: 6,
              background: rightPanelTab === "exhibition" ? theme.accent : "transparent",
              color: rightPanelTab === "exhibition" ? "#000" : theme.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: theme.font,
            }}
          >
            🎨 전시회 홍보
          </button>
        </div>

        {/* Exhibition Tab Content */}
        {rightPanelTab === "exhibition" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 500, overflowY: "auto" }}>
            {(!exhibitionPosts || exhibitionPosts.length === 0) ? (
              <div style={{
                padding: 30, textAlign: "center", color: theme.textDim, fontSize: 13,
                background: "rgba(30, 31, 38, 0.9)", borderRadius: 10,
                border: `1px solid ${theme.border}`,
              }}>
                등록된 전시회가 없습니다.
              </div>
            ) : (
              <div style={{
                background: "rgba(30, 31, 38, 0.9)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}>
                {exhibitionPosts.map((exhPost, idx) => (
                  <div key={exhPost.id}>
                    {/* 제목 행 (클릭하여 펼침) */}
                    <div
                      onClick={() => setExpandedExhId(expandedExhId === exhPost.id ? null : exhPost.id)}
                      style={{
                        padding: "12px 16px",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer",
                        borderBottom: (expandedExhId === exhPost.id || idx < exhibitionPosts.length - 1) ? `1px solid ${theme.border}` : "none",
                        background: expandedExhId === exhPost.id ? "rgba(212, 160, 83, 0.08)" : "transparent",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={e => { if (expandedExhId !== exhPost.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { if (expandedExhId !== exhPost.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: expandedExhId === exhPost.id ? theme.accent : theme.text, transition: "color 0.2s" }}>
                          {exhPost.title || "전시회"}
                        </div>
                        <div style={{ fontSize: 10, color: "#fff", marginTop: 3 }}>
                          📅 {exhPost.dates || "미정"} · 📍 {exhPost.location || "미정"}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: theme.textDim, flexShrink: 0, marginLeft: 8, transition: "transform 0.2s", transform: expandedExhId === exhPost.id ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </div>
                    {/* 펼침 내용: 포스터 + 상세정보 */}
                    {expandedExhId === exhPost.id && (
                      <div style={{ borderBottom: idx < exhibitionPosts.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                        {/* Poster Image */}
                        {exhPost.posterUrl && (
                          <div style={{ overflow: "hidden" }}>
                            <a
                              href={exhPost.instagramUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "block" }}
                            >
                              <img
                                src={exhPost.posterUrl}
                                alt={`${exhPost.title || ""} 전시회 포스터`}
                                style={{
                                  width: "100%",
                                  height: "auto",
                                  display: "block",
                                  transition: "transform 0.3s, opacity 0.3s",
                                }}
                                onMouseOver={e => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.opacity = "0.9"; }}
                                onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1"; }}
                                onError={e => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement.innerHTML = `
                                    <div style="padding: 30px 20px; text-align: center; color: #888;">
                                      <div style="font-size: 36px; margin-bottom: 8px;">🎨</div>
                                      <div style="font-size: 11px;">포스터를 불러올 수 없습니다</div>
                                    </div>
                                  `;
                                }}
                              />
                            </a>
                          </div>
                        )}
                        {/* 상세 정보 */}
                        <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.15)" }}>
                          <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.6, marginBottom: 8 }}>
                            {exhPost.description || ""}
                          </div>
                          <div style={{ fontSize: 11, color: "#fff", lineHeight: 1.5 }}>
                            📅 {exhPost.dates || ""}<br/>
                            📍 {exhPost.location || ""}
                          </div>
                          {exhPost.instagramUrl && (
                            <a href={exhPost.instagramUrl} target="_blank" rel="noopener noreferrer"
                              style={{ display: "inline-block", marginTop: 8, fontSize: 11, color: theme.accent, textDecoration: "none" }}
                              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                            >
                              Instagram →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Community Tab Content */}
        {rightPanelTab === "community" && (
          <>
            {/* New Post Input */}
            <div style={{
              background: "rgba(30, 31, 38, 0.9)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: 14,
            }}>
              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder="익명으로 자유롭게 글을 작성해보세요..."
                style={{
                  width: "100%",
                  height: 70,
                  padding: 12,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  background: theme.surface,
                  color: theme.text,
                  fontSize: 13,
                  resize: "none",
                  fontFamily: theme.font,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
              <button
                onClick={() => {
                  if (!newPostContent.trim()) return;
                  const newPostId = `c${Date.now()}`;
                  const newPost = {
                    id: newPostId,
                    content: newPostContent.trim(),
                    createdAt: new Date().toISOString(),
                    comments: [],
                  };
                  setCommunityPosts(prev => [newPost, ...prev]);
                  setNewPostContent("");
                  // 내가 작성한 글 ID 저장
                  const updatedIds = [...myPostIds, newPostId];
                  setMyPostIds(updatedIds);
                  localStorage.setItem("myPostIds", JSON.stringify(updatedIds));
                }}
                disabled={!newPostContent.trim()}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: 8,
                  background: newPostContent.trim() ? theme.accent : theme.surface,
                  color: newPostContent.trim() ? "#000" : theme.textDim,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: newPostContent.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  fontFamily: theme.font,
                }}
              >
                익명으로 게시하기
              </button>
            </div>

            {/* Posts List */}
            <div style={{
              background: "rgba(30, 31, 38, 0.9)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              maxHeight: 350,
              overflowY: "auto",
            }}>
              {communityPosts.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: theme.textDim, fontSize: 13 }}>
                  아직 게시글이 없습니다.<br/>첫 번째 글을 작성해보세요!
                </div>
              ) : (
                communityPosts.map((post, idx) => (
                  <div key={post.id}>
                    {/* 게시글 헤더 */}
                    <div
                      onClick={() => {
                        setExpandedPostId(expandedPostId === post.id ? null : post.id);
                        setNewCommentContent("");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderBottom: expandedPostId !== post.id && idx < communityPosts.length - 1 ? `1px solid ${theme.border}` : "none",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        background: expandedPostId === post.id ? "rgba(212, 160, 83, 0.1)" : "transparent",
                      }}
                      onMouseEnter={e => { if (expandedPostId !== post.id) e.currentTarget.style.background = "rgba(212, 160, 83, 0.05)"; }}
                      onMouseLeave={e => { if (expandedPostId !== post.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* 수정 모드 */}
                      {editingPostId === post.id ? (
                        <div onClick={e => e.stopPropagation()}>
                          <textarea
                            value={editingContent}
                            onChange={e => setEditingContent(e.target.value)}
                            style={{
                              width: "100%",
                              minHeight: 60,
                              padding: 10,
                              border: `1px solid ${theme.accent}`,
                              borderRadius: 6,
                              background: theme.surface,
                              color: theme.text,
                              fontSize: 13,
                              resize: "none",
                              fontFamily: theme.font,
                              outline: "none",
                              boxSizing: "border-box",
                              marginBottom: 8,
                            }}
                          />
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => {
                                setEditingPostId(null);
                                setEditingContent("");
                              }}
                              style={{
                                padding: "6px 12px",
                                border: `1px solid ${theme.border}`,
                                borderRadius: 4,
                                background: "transparent",
                                color: theme.textDim,
                                fontSize: 11,
                                cursor: "pointer",
                                fontFamily: theme.font,
                              }}
                            >
                              취소
                            </button>
                            <button
                              onClick={() => {
                                if (!editingContent.trim()) return;
                                setCommunityPosts(prev => prev.map(p =>
                                  p.id === post.id ? { ...p, content: editingContent.trim() } : p
                                ));
                                setEditingPostId(null);
                                setEditingContent("");
                              }}
                              disabled={!editingContent.trim()}
                              style={{
                                padding: "6px 12px",
                                border: "none",
                                borderRadius: 4,
                                background: editingContent.trim() ? theme.accent : theme.surface,
                                color: editingContent.trim() ? "#000" : theme.textDim,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: editingContent.trim() ? "pointer" : "not-allowed",
                                fontFamily: theme.font,
                              }}
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* 일반 모드 */
                        <>
                          <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5, marginBottom: 8 }}>
                            {post.content}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 10, color: theme.textDim }}>
                                익명 · {new Date(post.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {myPostIds.includes(post.id) && (
                                <span style={{ fontSize: 9, color: theme.accent, background: "rgba(212, 160, 83, 0.2)", padding: "2px 6px", borderRadius: 4 }}>
                                  내 글
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              {myPostIds.includes(post.id) && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPostId(post.id);
                                      setEditingContent(post.content);
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      border: "none",
                                      borderRadius: 4,
                                      background: "transparent",
                                      color: theme.textDim,
                                      fontSize: 10,
                                      cursor: "pointer",
                                      fontFamily: theme.font,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = theme.accent}
                                    onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm("정말 이 글을 삭제하시겠습니까?")) {
                                        setCommunityPosts(prev => prev.filter(p => p.id !== post.id));
                                        const updatedIds = myPostIds.filter(id => id !== post.id);
                                        setMyPostIds(updatedIds);
                                        localStorage.setItem("myPostIds", JSON.stringify(updatedIds));
                                      }
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      border: "none",
                                      borderRadius: 4,
                                      background: "transparent",
                                      color: theme.textDim,
                                      fontSize: 10,
                                      cursor: "pointer",
                                      fontFamily: theme.font,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = theme.red}
                                    onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                  >
                                    삭제
                                  </button>
                                </>
                              )}
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "4px 8px",
                                  color: post.comments.length > 0 ? theme.accent : theme.textDim,
                                  fontSize: 11,
                                  fontFamily: theme.font,
                                }}
                              >
                                💬 {post.comments.length} {expandedPostId === post.id ? "▲" : "▼"}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 슬라이드 댓글 영역 */}
                    <div
                      style={{
                        maxHeight: expandedPostId === post.id ? 300 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.3s ease-in-out",
                        background: "rgba(0,0,0,0.2)",
                        borderBottom: expandedPostId === post.id && idx < communityPosts.length - 1 ? `1px solid ${theme.border}` : "none",
                      }}
                    >
                      <div style={{ padding: "12px 16px" }}>
                        {/* 댓글 목록 */}
                        {post.comments.length === 0 ? (
                          <div style={{ textAlign: "center", color: theme.textDim, fontSize: 11, padding: "10px 0" }}>
                            아직 댓글이 없습니다. 첫 댓글을 달아보세요!
                          </div>
                        ) : (
                          post.comments.map((comment) => (
                            <div
                              key={comment.id}
                              style={{
                                padding: "8px 0",
                                borderBottom: `1px solid rgba(255,255,255,0.05)`,
                              }}
                            >
                              {editingCommentId === comment.id ? (
                                /* 댓글 수정 모드 */
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <input
                                    type="text"
                                    value={editingCommentContent}
                                    onChange={e => setEditingCommentContent(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      flex: 1,
                                      padding: "6px 10px",
                                      border: `1px solid ${theme.accent}`,
                                      borderRadius: 4,
                                      background: theme.surface,
                                      color: theme.text,
                                      fontSize: 11,
                                      outline: "none",
                                      fontFamily: theme.font,
                                    }}
                                    onKeyPress={e => {
                                      if (e.key === "Enter" && editingCommentContent.trim()) {
                                        setCommunityPosts(prev => prev.map(p =>
                                          p.id === post.id
                                            ? { ...p, comments: p.comments.map(c =>
                                                c.id === comment.id ? { ...c, content: editingCommentContent.trim() } : c
                                              )}
                                            : p
                                        ));
                                        setEditingCommentId(null);
                                        setEditingCommentContent("");
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCommentId(null);
                                      setEditingCommentContent("");
                                    }}
                                    style={{
                                      padding: "5px 8px",
                                      border: `1px solid ${theme.border}`,
                                      borderRadius: 4,
                                      background: "transparent",
                                      color: theme.textDim,
                                      fontSize: 10,
                                      cursor: "pointer",
                                      fontFamily: theme.font,
                                    }}
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!editingCommentContent.trim()) return;
                                      setCommunityPosts(prev => prev.map(p =>
                                        p.id === post.id
                                          ? { ...p, comments: p.comments.map(c =>
                                              c.id === comment.id ? { ...c, content: editingCommentContent.trim() } : c
                                            )}
                                          : p
                                      ));
                                      setEditingCommentId(null);
                                      setEditingCommentContent("");
                                    }}
                                    disabled={!editingCommentContent.trim()}
                                    style={{
                                      padding: "5px 8px",
                                      border: "none",
                                      borderRadius: 4,
                                      background: editingCommentContent.trim() ? theme.accent : theme.surface,
                                      color: editingCommentContent.trim() ? "#000" : theme.textDim,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      cursor: editingCommentContent.trim() ? "pointer" : "not-allowed",
                                      fontFamily: theme.font,
                                    }}
                                  >
                                    저장
                                  </button>
                                </div>
                              ) : (
                                /* 댓글 일반 모드 */
                                <>
                                  <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.4, marginBottom: 4 }}>
                                    ↳ {comment.content}
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontSize: 9, color: theme.textDim }}>
                                        익명 · {new Date(comment.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                      {myCommentIds.includes(comment.id) && (
                                        <span style={{ fontSize: 8, color: theme.accent, background: "rgba(212, 160, 83, 0.2)", padding: "1px 4px", borderRadius: 3 }}>
                                          내 댓글
                                        </span>
                                      )}
                                    </div>
                                    {myCommentIds.includes(comment.id) && (
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCommentId(comment.id);
                                            setEditingCommentContent(comment.content);
                                          }}
                                          style={{
                                            padding: "2px 6px",
                                            border: "none",
                                            borderRadius: 3,
                                            background: "transparent",
                                            color: theme.textDim,
                                            fontSize: 9,
                                            cursor: "pointer",
                                            fontFamily: theme.font,
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.color = theme.accent}
                                          onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm("이 댓글을 삭제하시겠습니까?")) {
                                              setCommunityPosts(prev => prev.map(p =>
                                                p.id === post.id
                                                  ? { ...p, comments: p.comments.filter(c => c.id !== comment.id) }
                                                  : p
                                              ));
                                              const updatedIds = myCommentIds.filter(id => id !== comment.id);
                                              setMyCommentIds(updatedIds);
                                              localStorage.setItem("myCommentIds", JSON.stringify(updatedIds));
                                            }
                                          }}
                                          style={{
                                            padding: "2px 6px",
                                            border: "none",
                                            borderRadius: 3,
                                            background: "transparent",
                                            color: theme.textDim,
                                            fontSize: 9,
                                            cursor: "pointer",
                                            fontFamily: theme.font,
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.color = theme.red}
                                          onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        )}

                        {/* 댓글 입력 */}
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <input
                            type="text"
                            value={expandedPostId === post.id ? newCommentContent : ""}
                            onChange={e => setNewCommentContent(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            onClick={e => e.stopPropagation()}
                            onKeyPress={e => {
                              if (e.key === "Enter" && newCommentContent.trim()) {
                                const newCommentId = `cm${Date.now()}`;
                                const newComment = {
                                  id: newCommentId,
                                  content: newCommentContent.trim(),
                                  createdAt: new Date().toISOString(),
                                };
                                setCommunityPosts(prev => prev.map(p => 
                                  p.id === post.id 
                                    ? { ...p, comments: [...p.comments, newComment] } 
                                    : p
                                ));
                                setNewCommentContent("");
                                // 내가 작성한 댓글 ID 저장
                                const updatedIds = [...myCommentIds, newCommentId];
                                setMyCommentIds(updatedIds);
                                localStorage.setItem("myCommentIds", JSON.stringify(updatedIds));
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: `1px solid ${theme.border}`,
                              borderRadius: 6,
                              background: theme.surface,
                              color: theme.text,
                              fontSize: 12,
                              outline: "none",
                              fontFamily: theme.font,
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!newCommentContent.trim()) return;
                              const newCommentId = `cm${Date.now()}`;
                              const newComment = {
                                id: newCommentId,
                                content: newCommentContent.trim(),
                                createdAt: new Date().toISOString(),
                              };
                              setCommunityPosts(prev => prev.map(p => 
                                p.id === post.id 
                                  ? { ...p, comments: [...p.comments, newComment] } 
                                  : p
                              ));
                              setNewCommentContent("");
                              // 내가 작성한 댓글 ID 저장
                              const updatedIds = [...myCommentIds, newCommentId];
                              setMyCommentIds(updatedIds);
                              localStorage.setItem("myCommentIds", JSON.stringify(updatedIds));
                            }}
                            disabled={!newCommentContent.trim()}
                            style={{
                              padding: "8px 14px",
                              border: "none",
                              borderRadius: 6,
                              background: newCommentContent.trim() ? theme.accent : theme.surface,
                              color: newCommentContent.trim() ? "#000" : theme.textDim,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: newCommentContent.trim() ? "pointer" : "not-allowed",
                              fontFamily: theme.font,
                            }}
                          >
                            등록
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Background Logo */}
      <img 
        src="/kmu-logo.svg" 
        alt="KMU Logo"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "500px",
          height: "500px",
          opacity: 0.15,
          pointerEvents: "none",
          zIndex: 0,
          objectFit: "contain"
        }}
      />
      
      <div className="fade-in" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: isCompactLayout ? 30 : 1, transform: `scale(${loginScale})`, transformOrigin: "center top" }}>
        {/* Main Login Section */}
        <div>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>The Best School of Architecture</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: theme.text, lineHeight: 1.3, letterSpacing: "-0.5px" }}>국민대 건축대학 포털사이트</h1>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 8 }}>Kookmin University School of Architecture Portal</div>
            
            {/* Feature Boxes */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
              <div style={{
                padding: "8px 16px", borderRadius: 8,
                background: "linear-gradient(135deg, #6BA3D6 0%, #5A8FC2 100%)",
                color: "#fff", fontSize: 12, fontWeight: 600,
                boxShadow: "0 2px 8px rgba(107, 163, 214, 0.3)",
              }}>🏠 실기실 예약</div>
              <div style={{
                padding: "8px 16px", borderRadius: 8,
                background: "linear-gradient(135deg, #6EBD8E 0%, #5DAD7D 100%)",
                color: "#fff", fontSize: 12, fontWeight: 600,
                boxShadow: "0 2px 8px rgba(110, 189, 142, 0.3)",
              }}>🔧 물품 대여</div>
              <div style={{
                padding: "8px 16px", borderRadius: 8,
                background: "linear-gradient(135deg, #E9A56A 0%, #D9955A 100%)",
                color: "#fff", fontSize: 12, fontWeight: 600,
                boxShadow: "0 2px 8px rgba(233, 165, 106, 0.3)",
              }}>🖨️ 출력물 보내기</div>
            </div>
          </div>

          {/* Role Switch */}
          <div style={{ display: "flex", gap: 2, background: theme.surface, borderRadius: theme.radius, padding: 3, marginBottom: 24, border: `1px solid ${theme.border}` }}>
            {[
              { id: "student", label: "학생", icon: <Icons.user size={15}/> },
              { id: "worker", label: "근로학생", icon: <Icons.tool size={15}/> },
              { id: "admin", label: "관리자", icon: <Icons.shield size={15}/> },
            ].map(r => (
              <button key={r.id} onClick={() => { setMode(r.id); setError(""); setWUser(""); setWPass(""); }} style={{
                flex: 1, padding: "11px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: theme.font, transition: "all 0.2s",
                background: mode === r.id ? theme.card : "transparent",
                color: mode === r.id ? theme.text : theme.textMuted,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: mode === r.id ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}>{r.icon} {r.label}</button>
            ))}
          </div>

          {/* Login Form */}
          <Card style={{ background: "rgba(18, 19, 24, 0.75)", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            {mode === "student" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Input label="학번" placeholder="예: 2021001" value={sid} onChange={e => setSid(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()}/>
                <Input label="이름" placeholder="예: 김건축" value={sname} onChange={e => setSname(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()}/>
                {error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: `1px solid ${theme.redBorder}`, color: theme.red, fontSize: 13 }}>
                    <Icons.alert size={16}/> {error}
                  </div>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.textMuted }}>
                  <input
                    type="checkbox"
                    checked={!!rememberSession}
                    onChange={e => onRememberSessionChange?.(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  로그아웃 후에도 로그인 기억
                </label>
                <Button size="lg" onClick={handleSubmit} disabled={!sid || !sname || studentChecking} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {studentChecking ? "확인 중..." : "로그인"}
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Input label="아이디" placeholder={mode === "admin" ? "관리자 아이디" : "근로학생 아이디"} value={wUser} onChange={e => setWUser(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()}/>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>비밀번호</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"} placeholder="비밀번호 입력"
                      value={wPass} onChange={e => setWPass(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSubmit()}
                      style={{ width: "100%", padding: "10px 42px 10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor = theme.accent}
                      onBlur={e => e.target.style.borderColor = theme.border}
                    />
                    <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}>
                      {showPass ? <Icons.eyeOff size={16}/> : <Icons.eye size={16}/>}
                    </button>
                  </div>
                </div>
                {error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: `1px solid ${theme.redBorder}`, color: theme.red, fontSize: 13 }}>
                    <Icons.alert size={16}/> {error}
                  </div>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.textMuted }}>
                  <input
                    type="checkbox"
                    checked={!!rememberSession}
                    onChange={e => onRememberSessionChange?.(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  로그아웃 후에도 로그인 기억
                </label>
                <Button size="lg" onClick={handleSubmit} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {mode === "admin" ? "관리자 로그인" : "관리 화면 접속"}
                </Button>
              </div>
            )}
          </Card>

          {/* Reset */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            {!showReset ? (
              <button onClick={() => setShowReset(true)} style={{ background: "none", border: "none", color: theme.textDim, fontSize: 12, cursor: "pointer", fontFamily: theme.font }}>데이터 초기화</button>
            ) : (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: theme.red }}>모든 데이터가 삭제됩니다</span>
                <Button size="sm" variant="danger" onClick={() => { onReset(); setShowReset(false); }}>확인</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReset(false)}>취소</Button>
              </div>
            )}
          </div>


        </div>

        {/* Safety Certificate Upload Banner (Student Mode Only) */}
        {mode === "student" && (
          <div style={{ marginTop: 16, width: "100%" }}>
            <Card 
              onClick={() => !showCertUpload && setShowCertUpload(true)}
              hover={!showCertUpload}
              style={{ 
                background: showCertUpload ? theme.blueBg : theme.surfaceHover, 
                borderColor: showCertUpload ? theme.blueBorder : theme.border,
                cursor: showCertUpload ? "default" : "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Icons.upload size={20} color={theme.blue}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.blue }}>
                      안전교육 수료증 업로드
                    </div>
                    {showCertUpload && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowCertUpload(false); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}
                      >
                        <Icons.x size={16}/>
                      </button>
                    )}
                  </div>
                  
                  {!showCertUpload ? (
                    <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
                      안전교육 수료증을 업로드하려면 클릭하세요
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                        학번과 이름을 입력한 후 파일을 선택해주세요.
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Input 
                            label="학번" 
                            placeholder="예: 2021001" 
                            value={certSid} 
                            onChange={e => setCertSid(e.target.value)}
                          />
                          <Input 
                            label="이름" 
                            placeholder="예: 김건축" 
                            value={certSname} 
                            onChange={e => setCertSname(e.target.value)}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Input
                            label="학년"
                            placeholder="예: 2"
                            value={certYear}
                            onChange={e => setCertYear(e.target.value)}
                          />
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>전공</label>
                            <select
                              value={certMajor}
                              onChange={e => setCertMajor(e.target.value)}
                              style={{ width: "100%", padding: "10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 14, fontFamily: theme.font, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", height: 42 }}
                              onFocus={e => e.target.style.borderColor = theme.accent}
                              onBlur={e => e.target.style.borderColor = theme.border}
                            >
                              <option value="">선택</option>
                              <option value="설계">설계</option>
                              <option value="시스템">시스템</option>
                            </select>
                          </div>
                        </div>
                        <Input
                          label="이메일"
                          placeholder="예: student@school.ac.kr"
                          value={certEmail}
                          onChange={e => setCertEmail(e.target.value)}
                        />
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={handleFileUpload} 
                          style={{ display: "none" }}
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 8, 
                            cursor: uploading ? "not-allowed" : "pointer", 
                            padding: "10px 16px", 
                            background: theme.surface, 
                            border: `1px solid ${theme.border}`, 
                            borderRadius: theme.radiusSm, 
                            fontSize: 13, 
                            color: theme.text, 
                            transition: "all 0.2s",
                            fontFamily: theme.font,
                            width: "100%",
                            justifyContent: "flex-start",
                            opacity: uploading ? 0.5 : 1
                          }}
                          onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = theme.blue; e.currentTarget.style.background = theme.surfaceHover; }}}
                          onMouseLeave={e => { if (!uploading) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.surface; }}}
                        >
                          <Icons.file size={16}/>
                          {uploadFile ? uploadFile.name : "파일 선택"}
                        </button>
                        {uploadFile && (
                          <button 
                            onClick={handleConfirmUpload}
                            disabled={uploading}
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              gap: 8, 
                              cursor: uploading ? "not-allowed" : "pointer", 
                              padding: "12px 16px", 
                              background: theme.blue, 
                              border: "none", 
                              borderRadius: theme.radiusSm, 
                              fontSize: 13, 
                              fontWeight: 600,
                              color: "#fff", 
                              transition: "all 0.2s",
                              fontFamily: theme.font,
                              width: "100%",
                              opacity: uploading ? 0.5 : 1
                            }}
                            onMouseEnter={e => { if (!uploading) e.currentTarget.style.opacity = "0.9"; }}
                            onMouseLeave={e => { if (!uploading) e.currentTarget.style.opacity = "1"; }}
                          >
                            {uploading ? <Icons.loading size={16}/> : <Icons.upload size={16}/>}
                            {uploading ? "업로드 중..." : "업로드"}
                          </button>
                        )}
                        {uploadSuccess && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, color: theme.green, fontSize: 12 }}>
                            <Icons.check size={14}/> {uploadSuccess}
                          </div>
                        )}
                        {certificates?.[certSid.trim()] && certSid.trim() && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.accentBg, border: `1px solid ${theme.accentBorder}`, color: theme.accent, fontSize: 11 }}>
                            <Icons.file size={14}/>
                            기존 업로드: {certificates[certSid.trim()].fileName} ({new Date(certificates[certSid.trim()].uploadDate).toLocaleDateString()})
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Upload Confirm Modal */}
        {showUploadConfirm && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10000,
            animation: "fadeIn 0.2s ease"
          }}>
            <div style={{
              background: theme.card,
              borderRadius: theme.radius,
              border: `1px solid ${theme.border}`,
              padding: 28,
              maxWidth: 400,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
            }}>
              <div style={{ 
                width: 60, height: 60, 
                borderRadius: "50%", 
                background: theme.greenBg, 
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px"
              }}>
                <Icons.check size={28} color={theme.green}/>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 12 }}>
                업로드 완료
              </div>
              <div style={{ fontSize: 14, color: theme.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
                교학팀에서 확인 후, 적어주신 이메일 주소로 확인 메일 보내드리겠습니다.
              </div>
              <Button 
                variant="primary" 
                onClick={() => setShowUploadConfirm(false)}
                style={{ width: "100%" }}
              >
                확인
              </Button>
            </div>
          </div>
        )}

        {/* Inquiry Banner */}
        <div style={{ marginTop: 12 }}>
          <Card 
            onClick={() => !showInquiry && setShowInquiry(true)}
            hover={!showInquiry}
            style={{ 
              background: showInquiry ? theme.accentBg : theme.surfaceHover, 
              borderColor: showInquiry ? theme.accentBorder : theme.border,
              cursor: showInquiry ? "default" : "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Icons.file size={20} color={theme.accent}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent }}>
                    문의사항
                  </div>
                  {showInquiry && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowInquiry(false); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}
                    >
                      <Icons.x size={16}/>
                    </button>
                  )}
                </div>
                
                {!showInquiry ? (
                  <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
                    비로그인 문의 (로그인 가능한 학생은 "문의 내역" 탭을 이용해주세요)
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                      로그인이 어려운 분들을 위한 문의 창입니다.
                    </div>
                    <div style={{ fontSize: 11, color: theme.yellow, marginBottom: 12, padding: "8px 12px", background: theme.yellowBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.yellowBorder}` }}>
                      ⚠️ 로그인 가능한 학생은 로그인 후 "문의 내역" 탭에서 문의해주세요. 답변 확인이 가능합니다.
                    </div>
                    <div style={{ fontSize: 11, color: theme.accent, marginBottom: 12, padding: "8px 12px", background: theme.accentBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.accentBorder}` }}>
                      📞 비로그인 문의는 근로학생이 연락처로 직접 답변드립니다.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Input 
                          label="이름 *" 
                          placeholder="이름을 입력하세요" 
                          value={inquiryName} 
                          onChange={e => setInquiryName(e.target.value)}
                        />
                        <Input 
                          label="연락처 *" 
                          placeholder="전화번호 또는 이메일" 
                          value={inquiryContact} 
                          onChange={e => setInquiryContact(e.target.value)}
                        />
                      </div>
                      <Input 
                        label="제목" 
                        placeholder="문의 제목을 입력하세요" 
                        value={inquiryTitle} 
                        onChange={e => setInquiryTitle(e.target.value)}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>내용</label>
                        <textarea
                          placeholder="문의 내용을 자세히 작성해주세요"
                          value={inquiryContent}
                          onChange={e => setInquiryContent(e.target.value)}
                          style={{ 
                            width: "100%", 
                            padding: "10px 14px", 
                            background: theme.surface, 
                            border: `1px solid ${theme.border}`, 
                            borderRadius: theme.radiusSm, 
                            color: theme.text, 
                            fontSize: 14, 
                            fontFamily: theme.font, 
                            outline: "none", 
                            boxSizing: "border-box", 
                            transition: "border-color 0.2s",
                            minHeight: 100,
                            resize: "vertical"
                          }}
                          onFocus={e => e.target.style.borderColor = theme.accent}
                          onBlur={e => e.target.style.borderColor = theme.border}
                        />
                      </div>
                      <Button
                        variant="primary"
                        onClick={handleInquirySubmit}
                        disabled={!inquiryTitle.trim() || !inquiryContent.trim() || !inquiryName.trim() || !inquiryContact.trim() || inquirySubmitting}
                      >
                        {inquirySubmitting ? "등록 중..." : "문의 등록"}
                      </Button>
                      {inquirySuccess && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: theme.radiusSm, background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, color: theme.green, fontSize: 12 }}>
                          <Icons.check size={14}/> {inquirySuccess}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  STUDENT PORTAL
// ════════════════════════════════════════════════════════════════
function StudentPortal({ user, onLogout, reservations, updateReservations, equipRentals, updateEquipRentals, addLog, addNotification, syncReservationToSheet, syncPrintToSheet, sendEmailNotification, warnings, inquiries, updateInquiries, printRequests, updatePrintRequests }) {
  const [tab, setTab] = useState("room");
  const isSafe = user.safetyTrained;
  const myInquiries = inquiries?.filter(i => i.name === user.name) || [];
  const myPrintRequests = printRequests?.filter(p => p.studentId === user.id) || [];

  return (
    <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 0 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Student Portal</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>안녕하세요, {user.name}님</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Badge color="dim">{user.dept}</Badge>
            <Badge color="dim">{user.year}학년</Badge>
            <Badge color={isSafe ? "green" : "red"}>{isSafe ? "안전교육 이수 ✓" : "안전교육 미이수 ✗"}</Badge>
            {warnings?.[user.id] && (
              <Badge color="orange">
                <Icons.alert size={12} style={{ marginRight: 4 }}/>
                경고 {warnings[user.id].count || 1}회
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}><Icons.logout size={15}/> 로그아웃</Button>
      </div>

      {/* Safety Warning */}
      {!isSafe && (
        <Card style={{ marginTop: 20, background: theme.redBg, borderColor: theme.redBorder }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Icons.alert size={20} color={theme.red}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.red }}>안전교육 미이수</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4, lineHeight: 1.6 }}>
                실기실 예약 및 물품 대여를 위해서는 안전교육을 먼저 이수해야 합니다.
                교학팀에 문의하거나 LMS에서 온라인 안전교육을 수강해주세요.
              </div>
            </div>
          </div>
        </Card>
      )}

      {isSafe && (
        <>
          <div style={{ paddingTop: 24 }}>
            <Tabs
              tabs={[
                { id: "room", label: "실기실 예약", icon: <Icons.door size={15}/> },
                { id: "equipment", label: "물품 대여", icon: <Icons.tool size={15}/> },
                { id: "print", label: "출력 신청", icon: <Icons.file size={15}/>, badge: myPrintRequests.filter(p => p.status === "pending" || p.status === "processing").length },
                { id: "history", label: "내 이용내역", icon: <Icons.history size={15}/> },
                { id: "inquiries", label: "문의 내역", icon: <Icons.file size={15}/>, badges: [
                  { count: myInquiries.filter(i => i.status === "pending").length, color: theme.red },
                  { count: myInquiries.filter(i => i.status === "answered").length, color: theme.green },
                ] },
              ]}
              active={tab} onChange={setTab}
            />
          </div>

          {tab === "room" && (
            <RoomReservation
              user={user}
              reservations={reservations}
              updateReservations={updateReservations}
              addLog={addLog}
              addNotification={addNotification}
              syncReservationToSheet={syncReservationToSheet}
              sendEmailNotification={sendEmailNotification}
            />
          )}
          {tab === "equipment" && (
            <EquipmentRental user={user} equipRentals={equipRentals} updateEquipRentals={updateEquipRentals} addLog={addLog} addNotification={addNotification}/>
          )}
          {tab === "print" && (
            <PrintRequest user={user} printRequests={myPrintRequests} updatePrintRequests={updatePrintRequests} addLog={addLog} addNotification={addNotification} syncPrintToSheet={syncPrintToSheet}/>
          )}
          {tab === "history" && (
            <StudentHistory user={user} reservations={reservations} equipRentals={equipRentals} updateReservations={updateReservations} sendEmailNotification={sendEmailNotification} addLog={addLog} addNotification={addNotification}/>
          )}
          {tab === "inquiries" && (
            <StudentInquiries user={user} inquiries={myInquiries} updateInquiries={updateInquiries}/>
          )}
        </>
      )}
    </div>
  );
}

// ─── Room Reservation ────────────────────────────────────────────
function RoomReservation({ user, reservations, updateReservations, addLog, addNotification, syncReservationToSheet, sendEmailNotification }) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedDate, setSelectedDate] = useState(tomorrow());
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [purpose, setPurpose] = useState("");
  const [members, setMembers] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  const toggleSlot = (id) => setSelectedSlots(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const bookedSlots = useMemo(() => {
    if (!selectedRoom || !selectedDate) return new Set();
    return new Set(
      reservations
        .filter(r => r.roomId === selectedRoom && r.date === selectedDate && !["cancelled", "rejected"].includes(r.status))
        .flatMap(r => r.slots)
    );
  }, [reservations, selectedRoom, selectedDate]);


  const handleSubmit = () => {
    if (!selectedRoom || selectedSlots.length === 0) return;
    if (selectedSlots.some(id => bookedSlots.has(id))) {
      setError("선택한 시간에 이미 예약이 있습니다. 다른 시간대를 선택하세요.");
      return;
    }
    setError("");
    setSubmitting(true);
    setTimeout(() => {
      const room = ROOMS.find(r => r.id === selectedRoom);
      const slotLabels = selectedSlots.map(sid => TIME_SLOTS.find(t => t.id === sid)?.label).filter(Boolean).sort();
      const res = {
        id: uid(), type: "room", studentId: user.id, studentName: user.name, studentDept: user.dept,
        roomId: selectedRoom, roomName: room.name, date: selectedDate, slots: selectedSlots, slotLabels,
        purpose: purpose || "개인 작업", members: parseInt(members) || 1,
        status: "approved", createdAt: ts(), autoApproved: true,
      };
      updateReservations(prev => [res, ...prev]);
      addLog(`[자동승인] ${user.name}(${user.id}) → ${room.name} 예약 | ${selectedDate} ${slotLabels.join(", ")} | ${res.purpose}`, "reservation", { studentId: user.id, roomId: selectedRoom });
      addNotification(`🏠 실기실 예약: ${user.name} → ${room.name} (${formatDate(selectedDate)} ${slotLabels[0]}${slotLabels.length > 1 ? ` 외 ${slotLabels.length-1}건` : ""})`, "room");
      sendEmailNotification({
        subject: `[실기실 예약 확정] ${user.name} · ${room.name}`,
        body: [
          "국민대학교 건축대학 실기실 예약이 확정되었습니다.",
          "",
          "[예약 정보]",
          `- 예약자: ${user.name} (${user.id})`,
          `- 전공/학년: ${user.dept} ${user.year}학년`,
          `- 실기실: ${room.name}`,
          `- 날짜: ${selectedDate}`,
          `- 시간: ${slotLabels.join(", ")}`,
          `- 목적: ${purpose || "개인 작업"}`,
          `- 인원: ${parseInt(members) || 1}명`,
          "",
          "[안내]",
          "- 이용 수칙을 준수해주세요.",
          "- 예약 변경/취소가 필요하면 근로학생 또는 관리자에게 문의해주세요.",
          "",
          "국민대학교 건축대학 실기실, 물품 예약 시스템",
        ].join("\n"),
      });
      syncReservationToSheet?.(res);
      setSuccess(res);
      setSubmitting(false);
      setSelectedSlots([]);
      setPurpose("");
      alert("✅ 예약이 완료되었습니다!\n\n📌 실기실 예약 시간 5분 전 교학팀으로 방문해주세요.");
    }, 800);
  };

  return (
    <div className="fade-in">
      {success && (
        <Card style={{ marginBottom: 20, background: theme.greenBg, borderColor: theme.greenBorder }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.check size={20} color={theme.green}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.green }}>예약 신청 완료!</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>
                {success.roomName} · {success.date} · {success.slotLabels.join(", ")}
              </div>
            </div>
            <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => setSuccess(null)}><Icons.x size={14}/></Button>
          </div>
        </Card>
      )}

      {error && (
        <Card style={{ marginBottom: 20, background: theme.redBg, borderColor: theme.redBorder }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.alert size={18} color={theme.red}/>
            <div style={{ fontSize: 13, color: theme.red }}>{error}</div>
          </div>
        </Card>
      )}

      {/* Two Column Layout */}
      <div style={{ display: "flex", gap: 24, minHeight: 500 }}>
        {/* Left: Room List (Vertical) */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <SectionTitle icon={<Icons.door size={16} color={theme.accent}/>}>실기실 선택</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ROOMS.map(room => {
              const sel = selectedRoom === room.id;
              const todayBookings = reservations.filter(r => 
                r.roomId === room.id && 
                r.date === selectedDate && 
                !["cancelled", "rejected"].includes(r.status)
              ).length;
              return (
                <Card key={room.id} onClick={() => setSelectedRoom(room.id)} style={{
                  padding: 16, cursor: "pointer",
                  borderColor: sel ? theme.accent : theme.border,
                  background: sel ? theme.accentBg : theme.card,
                  transition: "all 0.2s",
                  borderLeft: sel ? `3px solid ${theme.accent}` : `3px solid transparent`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: sel ? theme.accent : theme.text }}>{room.name}</div>
                    <Badge color={sel ? "accent" : "dim"}>{room.floor}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>{room.building}</div>
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>{room.equipment}</span>
                    {todayBookings > 0 && <Badge color="yellow" style={{ fontSize: 10 }}>오늘 {todayBookings}건</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right: Reservation Details */}
        <div style={{ flex: 1 }}>
          {!selectedRoom ? (
            <div style={{ 
              height: "100%", 
              display: "flex", 
              flexDirection: "column",
              alignItems: "center", 
              justifyContent: "center",
              background: theme.surface,
              borderRadius: 16,
              border: `2px dashed ${theme.border}`,
              padding: 40,
            }}>
              <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>🏠</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>실기실을 선택해주세요</div>
              <div style={{ fontSize: 13, color: theme.textDim, textAlign: "center" }}>
                왼쪽 목록에서 원하는 실기실을 클릭하면<br/>예약 정보를 입력할 수 있습니다
              </div>
            </div>
          ) : (
            <div>
              {/* Selected Room Header */}
              {(() => {
                const room = ROOMS.find(r => r.id === selectedRoom);
                return (
                  <Card style={{ marginBottom: 20, padding: 20, background: theme.accentBg, borderColor: theme.accent }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: theme.accent, marginBottom: 4 }}>{room?.name}</div>
                        <div style={{ fontSize: 13, color: theme.textMuted }}>{room?.building} · {room?.floor}</div>
                        <div style={{ fontSize: 12, color: theme.textDim, marginTop: 6 }}>🔧 {room?.equipment}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRoom(null)}>
                        <Icons.x size={14}/> 다른 실기실
                      </Button>
                    </div>
                  </Card>
                );
              })()}

              {/* Room Rules */}
              {(() => {
                const room = ROOMS.find(r => r.id === selectedRoom);
                return room?.rules && (
                  <Card style={{ marginBottom: 20, background: theme.yellowBg, borderColor: theme.yellowBorder, padding: 14 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: theme.yellow }}>
                      <Icons.alert size={16}/> <strong>이용 수칙:</strong> {room.rules}
                    </div>
                  </Card>
                );
              })()}

              {/* Date & Time */}
              <SectionTitle icon={<Icons.calendar size={16} color={theme.accent}/>}>날짜 및 시간 선택</SectionTitle>
              <Card style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                  <Input label="예약 날짜" type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedSlots([]); }} style={{ maxWidth: 180 }}/>
                  <Input label="사용 인원" type="number" min="1" max="30" value={members} onChange={e => setMembers(e.target.value)} style={{ maxWidth: 100 }}/>
                </div>

                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 10 }}>시간대 선택 (복수 가능)</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))", gap: 6 }}>
                  {TIME_SLOTS.map(slot => {
                    const booked = bookedSlots.has(slot.id);
                    const sel = selectedSlots.includes(slot.id);
                    return (
                      <button key={slot.id} disabled={booked} onClick={() => !booked && toggleSlot(slot.id)}
                        style={{
                          padding: "9px 8px", borderRadius: theme.radiusSm, fontSize: 12, fontWeight: 500,
                          fontFamily: theme.fontMono, cursor: booked ? "not-allowed" : "pointer",
                          border: `1px solid ${sel ? theme.accent : booked ? theme.border : theme.border}`,
                          background: sel ? theme.accentBg : booked ? "rgba(255,255,255,0.02)" : theme.surface,
                          color: sel ? theme.accent : booked ? theme.textDim : theme.textMuted,
                          opacity: booked ? 0.4 : 1, transition: "all 0.15s",
                          textDecoration: booked ? "line-through" : "none",
                        }}>
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
                {bookedSlots.size > 0 && (
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>취소선 = 이미 예약된 시간</div>
                )}
              </Card>

              {/* Purpose */}
              <SectionTitle icon={<Icons.info size={16} color={theme.accent}/>}>사용 목적</SectionTitle>
              <Card style={{ marginBottom: 24 }}>
                <Input placeholder="예: 졸업작품 모형 제작, 스터디 그룹 작업 등" value={purpose} onChange={e => setPurpose(e.target.value)}/>
              </Card>

              {/* Summary & Submit */}
              {selectedSlots.length > 0 && (
                <Card style={{ marginBottom: 20, background: theme.surface, padding: 16 }}>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>예약 요약</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <Badge color="accent">{ROOMS.find(r => r.id === selectedRoom)?.name}</Badge>
                    <Badge color="blue">{selectedDate}</Badge>
                    <Badge color="green">{selectedSlots.length}시간</Badge>
                    <Badge color="dim">{members}명</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: theme.textDim }}>
                    시간: {selectedSlots.map(sid => TIME_SLOTS.find(t => t.id === sid)?.label).filter(Boolean).sort().join(", ")}
                  </div>
                </Card>
              )}

              <Button size="lg" onClick={handleSubmit} disabled={selectedSlots.length === 0 || !purpose.trim() || submitting}
                style={{ width: "100%", justifyContent: "center", marginBottom: 40 }}>
                {submitting ? "처리 중..." : `예약 신청 (${selectedSlots.length}시간)`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Equipment Rental ────────────────────────────────────────────
function EquipmentRental({ user, equipRentals, updateEquipRentals, addLog, addNotification }) {
  const [selected, setSelected] = useState([]);
  const [returnDate, setReturnDate] = useState(addDays(3));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [filterCat, setFilterCat] = useState("전체");

  const categories = ["전체", ...new Set(EQUIPMENT_DB.map(e => e.category))];
  const filtered = filterCat === "전체" ? EQUIPMENT_DB : EQUIPMENT_DB.filter(e => e.category === filterCat);

  const toggleEquip = (id) => setSelected(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const handleSubmit = () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    setTimeout(() => {
      const items = selected.map(id => EQUIPMENT_DB.find(e => e.id === id)).filter(Boolean);
      const rental = {
        id: uid(), type: "equipment", studentId: user.id, studentName: user.name, studentDept: user.dept,
        items: items.map(i => ({ id: i.id, name: i.name, icon: i.icon })),
        returnDate, note: note || "", status: "pending_pickup", createdAt: ts(),
      };
      updateEquipRentals(prev => [rental, ...prev]);
      addLog(`[기구대여] ${user.name}(${user.id}) → ${items.map(i => i.name).join(", ")} | 반납: ${returnDate}`, "equipment", { studentId: user.id });
      addNotification(`🔧 기구대여 요청: ${user.name} → ${items.map(i => i.name).join(", ")}`, "equipment", true);
      setSuccess(rental);
      setSubmitting(false);
      setSelected([]);
      setNote("");
    }, 800);
  };

  return (
    <div className="fade-in">
      {success && (
        <Card style={{ marginBottom: 20, background: theme.greenBg, borderColor: theme.greenBorder }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.check size={20} color={theme.green}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.green }}>대여 신청 완료!</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>
                {success.items.map(i => i.name).join(", ")} · 반납 {success.returnDate}
              </div>
            </div>
            <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => setSuccess(null)}><Icons.x size={14}/></Button>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 20, padding: 14, background: theme.blueBg, borderColor: theme.blueBorder }}>
        <div style={{ fontSize: 13, color: theme.blue, display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.bell size={16}/> 신청 완료 시 근로학생에게 즉시 알림이 전송됩니다. 교학팀에서 수령해주세요.
        </div>
      </Card>

      {/* Two Column Layout */}
      <div style={{ display: "flex", gap: 24, minHeight: 500 }}>
        {/* Left: Equipment List */}
        <div style={{ width: 320, flexShrink: 0 }}>
          <SectionTitle icon={<Icons.tool size={16} color={theme.accent}/>}>물품 선택</SectionTitle>
          
          {/* Category Filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {categories.map(c => (
              <button key={c} onClick={() => setFilterCat(c)} style={{
                padding: "6px 14px", borderRadius: 20, border: `1px solid ${filterCat === c ? theme.accent : theme.border}`,
                background: filterCat === c ? theme.accentBg : "transparent",
                color: filterCat === c ? theme.accent : theme.textMuted,
                fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: theme.font, transition: "all 0.15s",
              }}>{c}</button>
            ))}
          </div>

          {/* Equipment Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 450, overflowY: "auto", paddingRight: 4 }}>
            {filtered.map(eq => {
              const sel = selected.includes(eq.id);
              const soldOut = eq.available === 0;
              return (
                <Card key={eq.id} onClick={() => !soldOut && toggleEquip(eq.id)} style={{
                  padding: 14, cursor: soldOut ? "not-allowed" : "pointer", opacity: soldOut ? 0.4 : 1,
                  borderColor: sel ? theme.accent : theme.border, 
                  background: sel ? theme.accentBg : theme.card,
                  borderLeft: sel ? `3px solid ${theme.accent}` : `3px solid transparent`,
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 28, width: 40, textAlign: "center" }}>{eq.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: sel ? theme.accent : theme.text }}>{eq.name}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <Badge color={eq.available > 0 ? "dim" : "red"} style={{ fontSize: 10 }}>재고 {eq.available}/{eq.total}</Badge>
                      <Badge color="dim" style={{ fontSize: 10 }}>최대 {eq.maxDays}일</Badge>
                    </div>
                  </div>
                  {sel && <div style={{ color: theme.accent }}><Icons.check size={20}/></div>}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right: Details Panel */}
        <div style={{ flex: 1 }}>
          {selected.length === 0 ? (
            <div style={{ 
              height: "100%", 
              display: "flex", 
              flexDirection: "column",
              alignItems: "center", 
              justifyContent: "center",
              background: theme.surface,
              borderRadius: 16,
              border: `2px dashed ${theme.border}`,
              padding: 40,
            }}>
              <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>🔧</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>물품을 선택해주세요</div>
              <div style={{ fontSize: 13, color: theme.textDim, textAlign: "center" }}>
                왼쪽 목록에서 대여할 물품을 클릭하면<br/>대여 정보를 입력할 수 있습니다
              </div>
            </div>
          ) : (
            <div>
              {/* Selected Items Summary */}
              <Card style={{ marginBottom: 20, padding: 20, background: theme.accentBg, borderColor: theme.accent }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: theme.accent }}>선택한 물품 ({selected.length}개)</div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                    <Icons.x size={14}/> 전체 해제
                  </Button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {selected.map(id => {
                    const eq = EQUIPMENT_DB.find(e => e.id === id);
                    return eq && (
                      <div key={id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", background: theme.card, borderRadius: 8,
                        border: `1px solid ${theme.border}`,
                      }}>
                        <span style={{ fontSize: 20 }}>{eq.icon}</span>
                        <span style={{ fontSize: 13, color: theme.text, fontWeight: 500 }}>{eq.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); toggleEquip(id); }} style={{
                          background: "none", border: "none", cursor: "pointer", padding: 2,
                          color: theme.textDim, display: "flex", alignItems: "center",
                        }}>
                          <Icons.x size={14}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Equipment Details */}
              <SectionTitle icon={<Icons.info size={16} color={theme.accent}/>}>물품 상세 정보</SectionTitle>
              <Card style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selected.map(id => {
                    const eq = EQUIPMENT_DB.find(e => e.id === id);
                    return eq && (
                      <div key={id} style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: 12, background: theme.surface, borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 32, width: 50, textAlign: "center" }}>{eq.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 4 }}>{eq.name}</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Badge color="dim">재고 {eq.available}/{eq.total}</Badge>
                            <Badge color="blue">최대 {eq.maxDays}일 대여</Badge>
                            {eq.deposit && <Badge color="yellow">보증금 필요</Badge>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Return Info */}
              <SectionTitle icon={<Icons.calendar size={16} color={theme.accent}/>}>반납 정보</SectionTitle>
              <Card style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <Input label="반납 예정일" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} style={{ maxWidth: 180 }}/>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Input label="비고 (선택)" placeholder="예: 수업용, 팀프로젝트 등" value={note} onChange={e => setNote(e.target.value)}/>
                  </div>
                </div>
              </Card>

              {/* Summary */}
              <Card style={{ marginBottom: 20, background: theme.surface, padding: 16 }}>
                <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>대여 요약</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <Badge color="accent">{selected.length}개 물품</Badge>
                  <Badge color="blue">반납: {returnDate}</Badge>
                </div>
                <div style={{ fontSize: 12, color: theme.textDim }}>
                  물품: {selected.map(id => EQUIPMENT_DB.find(e => e.id === id)?.name).filter(Boolean).join(", ")}
                </div>
              </Card>

              <Button size="lg" onClick={handleSubmit} disabled={submitting} style={{ width: "100%", justifyContent: "center", marginBottom: 40 }}>
                {submitting ? "신청 중..." : `기구 ${selected.length}건 대여 신청`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Print Request (출력 신청) ───────────────────────────────────
const PRINT_PRICES = {
  A4_BW: 50,      // A4 흑백
  A4_COLOR: 200,  // A4 컬러
  A3_BW: 100,     // A3 흑백
  A3_COLOR: 500,  // A3 컬러
  A2_BW: 500,     // A2 흑백
  A2_COLOR: 1500, // A2 컬러
  A1_BW: 1000,    // A1 흑백
  A1_COLOR: 3000, // A1 컬러
  A0_BW: 2000,    // A0 흑백
  A0_COLOR: 5000, // A0 컬러
};

const KAKAO_BANK_ACCOUNT = "3333-12-3456789"; // 카카오뱅크 계좌번호 (예시)

function PrintRequest({ user, printRequests, updatePrintRequests, addLog, addNotification, syncPrintToSheet }) {
  const [paperSize, setPaperSize] = useState("A4");
  const [colorMode, setColorMode] = useState("BW");
  const [copies, setCopies] = useState(1);
  const [printFile, setPrintFile] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [urgentPickup, setUrgentPickup] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const printFileRef = useRef(null);
  const paymentFileRef = useRef(null);

  const priceKey = `${paperSize}_${colorMode}`;
  const unitPrice = PRINT_PRICES[priceKey] || 50;
  const totalPrice = unitPrice * copies;

  const handlePrintFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPrintFile({ name: file.name, size: file.size, type: file.type, data: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPaymentProof({ name: file.name, size: file.size, type: file.type, data: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!printFile) {
      alert("출력할 파일을 업로드해주세요.");
      return;
    }
    if (!paymentProof) {
      alert("송금 완료 캡처를 업로드해주세요.");
      return;
    }

    setSubmitting(true);
    const newRequest = {
      id: uid(),
      studentId: user.id,
      studentName: user.name,
      studentDept: user.dept,
      paperSize,
      colorMode,
      copies,
      unitPrice,
      totalPrice,
      printFile,
      paymentProof,
      note: note.trim(),
      urgentPickup,
      status: "pending", // pending | processing | completed | cancelled
      createdAt: ts(),
      completedAt: null,
    };

    updatePrintRequests(prev => [newRequest, ...prev]);
    addLog(`출력 신청: ${paperSize} ${colorMode === "BW" ? "흑백" : "컬러"} ${copies}장`, "print", { studentId: user.id });
    addNotification(`🖨️ 새 출력 신청: ${user.name} - ${paperSize} ${copies}장`, "info", true);
    
    // 구글 시트 연동
    await syncPrintToSheet?.(newRequest);

    // 초기화
    setPrintFile(null);
    setPaymentProof(null);
    setCopies(1);
    setNote("");
    setUrgentPickup(false);
    setSubmitting(false);
    alert("출력 신청이 완료되었습니다! 근로학생이 확인 후 출력해드립니다.");
  };

  const statusLabels = { pending: "대기중", processing: "출력중", completed: "완료", cancelled: "취소됨" };
  const statusColors = { pending: "yellow", processing: "blue", completed: "green", cancelled: "red" };

  return (
    <div style={{ paddingTop: 20 }}>
      {/* 출력 가격표 안내 */}
      <Card style={{ marginBottom: 20, background: theme.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Icons.file size={20} color={theme.accent}/>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>📋 출력 가격표 및 안내</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
          {["A4", "A3", "A2", "A1", "A0"].map(size => (
            <div key={size} style={{ background: theme.card, padding: 10, borderRadius: 8, textAlign: "center", border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent, marginBottom: 6 }}>{size}</div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>흑백 {PRINT_PRICES[`${size}_BW`]}원</div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>컬러 {PRINT_PRICES[`${size}_COLOR`]}원</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.6 }}>
          💳 <strong>송금 계좌:</strong> 카카오뱅크 {KAKAO_BANK_ACCOUNT}<br/>
          ⏰ <strong>운영시간:</strong> 평일 10:00~17:00 (점심시간 12:00~13:00 제외)<br/>
          📍 <strong>수령장소:</strong> 건축대학 출력실 (본관 3층)
        </div>

        {/* 내 출력 신청 내역 배너 */}
        <button
          onClick={() => setShowHistoryModal(true)}
          style={{
            width: "100%", marginTop: 16, padding: "14px 16px", borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.accentBg} 0%, ${theme.surface} 100%)`,
            border: `1px solid ${theme.accent}`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "all 0.2s", fontFamily: theme.font,
          }}
          onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>내 출력 신청 내역</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {printRequests.length > 0 ? (
              <>
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  {printRequests.filter(r => r.status === "pending").length > 0 && (
                    <Badge color="yellow" style={{ marginRight: 6 }}>대기 {printRequests.filter(r => r.status === "pending").length}</Badge>
                  )}
                  {printRequests.filter(r => r.status === "processing").length > 0 && (
                    <Badge color="blue" style={{ marginRight: 6 }}>출력중 {printRequests.filter(r => r.status === "processing").length}</Badge>
                  )}
                  {printRequests.filter(r => r.status === "completed").length > 0 && (
                    <Badge color="green">완료 {printRequests.filter(r => r.status === "completed").length}</Badge>
                  )}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: theme.textDim }}>신청 내역 없음</span>
            )}
            <span style={{ fontSize: 16, color: theme.accent }}>→</span>
          </div>
        </button>
      </Card>

      {/* 출력 신청 내역 모달 */}
      {showHistoryModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }} onClick={() => setShowHistoryModal(false)}>
          <div style={{
            background: theme.card, borderRadius: 16, width: "100%", maxWidth: 500,
            maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column",
          }} onClick={e => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div style={{
              padding: "16px 20px", borderBottom: `1px solid ${theme.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>📋 내 출력 신청 내역</div>
              <button onClick={() => setShowHistoryModal(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: theme.surface, color: theme.textMuted, fontSize: 16,
                cursor: "pointer", fontFamily: theme.font,
              }}>✕</button>
            </div>

            {/* 모달 내용 */}
            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              {printRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 14 }}>출력 신청 내역이 없습니다</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {printRequests.map(req => (
                    <div key={req.id} style={{
                      padding: 16, background: theme.surface, borderRadius: 12,
                      border: `1px solid ${theme.border}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{req.paperSize}</span>
                          <span style={{
                            fontSize: 12, marginLeft: 8, padding: "2px 8px", borderRadius: 4,
                            background: req.colorMode === "BW" ? theme.surface : "linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3)",
                            color: req.colorMode === "BW" ? theme.textMuted : "#fff",
                            border: `1px solid ${theme.border}`,
                          }}>{req.colorMode === "BW" ? "흑백" : "컬러"}</span>
                          <span style={{ fontSize: 13, color: theme.textMuted, marginLeft: 8 }}>× {req.copies}장</span>
                        </div>
                        <Badge color={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>
                        📄 {req.printFile?.name || "파일 정보 없음"}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: theme.textDim }}>
                          신청: {req.createdAt?.slice(0, 10)} {req.createdAt?.slice(11, 16)}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent }}>
                          {req.totalPrice?.toLocaleString()}원
                        </span>
                      </div>
                      {req.urgentPickup && (
                        <div style={{ fontSize: 11, color: theme.red, marginTop: 6 }}>🚨 긴급 수령 요청</div>
                      )}
                      {req.note && (
                        <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4, padding: "6px 8px", background: theme.card, borderRadius: 6 }}>
                          💬 {req.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${theme.border}`, background: theme.surface }}>
              <Button size="sm" variant="ghost" onClick={() => setShowHistoryModal(false)} style={{ width: "100%", justifyContent: "center" }}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 출력 신청 폼 */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: theme.text }}>🖨️ 출력 신청</div>
        
        {/* 용지 크기 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>용지 크기</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["A4", "A3", "A2", "A1", "A0"].map(size => (
              <button key={size} onClick={() => setPaperSize(size)} style={{
                padding: "10px 20px", borderRadius: 8, border: `1px solid ${paperSize === size ? theme.accent : theme.border}`,
                background: paperSize === size ? theme.accentBg : "transparent",
                color: paperSize === size ? theme.accent : theme.textMuted,
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: theme.font,
              }}>{size}</button>
            ))}
          </div>
        </div>

        {/* 색상 모드 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>색상</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setColorMode("BW")} style={{
              padding: "10px 24px", borderRadius: 8, border: `1px solid ${colorMode === "BW" ? theme.accent : theme.border}`,
              background: colorMode === "BW" ? theme.accentBg : "transparent",
              color: colorMode === "BW" ? theme.accent : theme.textMuted,
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: theme.font,
            }}>⬛ 흑백</button>
            <button onClick={() => setColorMode("COLOR")} style={{
              padding: "10px 24px", borderRadius: 8, border: `1px solid ${colorMode === "COLOR" ? theme.accent : theme.border}`,
              background: colorMode === "COLOR" ? theme.accentBg : "transparent",
              color: colorMode === "COLOR" ? theme.accent : theme.textMuted,
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: theme.font,
            }}>🌈 컬러</button>
          </div>
        </div>

        {/* 매수 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>매수</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setCopies(Math.max(1, copies - 1))} style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 18, cursor: "pointer", fontFamily: theme.font,
            }}>-</button>
            <input type="number" value={copies} onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))} min={1} style={{
              width: 60, padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 16, fontWeight: 600, textAlign: "center", fontFamily: theme.font,
            }}/>
            <button onClick={() => setCopies(copies + 1)} style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
              color: theme.text, fontSize: 18, cursor: "pointer", fontFamily: theme.font,
            }}>+</button>
            <span style={{ fontSize: 13, color: theme.textMuted, marginLeft: 8 }}>장당 {unitPrice}원</span>
          </div>
        </div>

        {/* 총 금액 */}
        <div style={{ padding: 16, background: theme.accentBg, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>총 결제 금액</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: theme.accent }}>{totalPrice.toLocaleString()}원</span>
        </div>

        {/* 출력 파일 업로드 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>출력 파일 업로드 <span style={{ color: theme.red }}>*</span></div>
          <input type="file" ref={printFileRef} onChange={handlePrintFileUpload} accept=".pdf,.jpg,.jpeg,.png,.ai,.psd,.dwg" style={{ display: "none" }}/>
          <button onClick={() => printFileRef.current?.click()} style={{
            width: "100%", padding: 16, borderRadius: 8, border: `2px dashed ${printFile ? theme.green : theme.border}`,
            background: printFile ? theme.greenBg : "transparent", color: printFile ? theme.green : theme.textMuted,
            fontSize: 13, cursor: "pointer", fontFamily: theme.font, textAlign: "center",
          }}>
            {printFile ? `✅ ${printFile.name}` : "📎 파일을 선택하세요 (PDF, JPG, PNG, AI, PSD, DWG)"}
          </button>
        </div>

        {/* 송금 캡처 업로드 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>송금 완료 캡처 <span style={{ color: theme.red }}>*</span></div>
          <div style={{ fontSize: 11, color: theme.yellow, marginBottom: 8, padding: "8px 12px", background: theme.yellowBg, borderRadius: 6 }}>
            💡 카카오뱅크 {KAKAO_BANK_ACCOUNT}로 {totalPrice.toLocaleString()}원을 송금한 후 캡처해주세요
          </div>
          <input type="file" ref={paymentFileRef} onChange={handlePaymentUpload} accept=".jpg,.jpeg,.png" style={{ display: "none" }}/>
          <button onClick={() => paymentFileRef.current?.click()} style={{
            width: "100%", padding: 16, borderRadius: 8, border: `2px dashed ${paymentProof ? theme.green : theme.border}`,
            background: paymentProof ? theme.greenBg : "transparent", color: paymentProof ? theme.green : theme.textMuted,
            fontSize: 13, cursor: "pointer", fontFamily: theme.font, textAlign: "center",
          }}>
            {paymentProof ? `✅ ${paymentProof.name}` : "📸 송금 캡처 이미지를 업로드하세요"}
          </button>
        </div>

        {/* 요청사항 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>요청사항 (선택)</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="예: 양면출력 / 특정 페이지만 / 두껍게 출력 등" style={{
            width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.surface,
            color: theme.text, fontSize: 13, fontFamily: theme.font, resize: "none", minHeight: 60,
          }}/>
        </div>

        {/* 긴급 수령 */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }}>
          <input type="checkbox" checked={urgentPickup} onChange={e => setUrgentPickup(e.target.checked)} style={{ width: 18, height: 18 }}/>
          <span style={{ fontSize: 13, color: theme.text }}>🚨 긴급 수령 요청 (가능한 빨리 출력 요청)</span>
        </label>

        {/* 제출 버튼 */}
        <Button size="lg" onClick={handleSubmit} disabled={submitting || !printFile || !paymentProof} style={{ width: "100%", justifyContent: "center" }}>
          {submitting ? "신청 중..." : "출력 신청하기"}
        </Button>
      </Card>
    </div>
  );
}

// ─── Student History ─────────────────────────────────────────────
function StudentHistory({ user, reservations, equipRentals, updateReservations, sendEmailNotification, addLog, addNotification }) {
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const myRes = reservations.filter(r => r.studentId === user.id);
  const myRentals = equipRentals.filter(r => r.studentId === user.id);
  const all = [...myRes.map(r => ({ ...r, sortTime: r.createdAt })), ...myRentals.map(r => ({ ...r, sortTime: r.createdAt }))]
    .sort((a, b) => b.sortTime.localeCompare(a.sortTime));

  // 예약이 취소 가능한지 확인 (예약일이 아직 지나지 않은 경우)
  const canCancel = (item) => {
    if (item.type !== "room") return false;
    if (["cancelled", "rejected", "completed"].includes(item.status)) return false;
    const today = new Date().toISOString().slice(0, 10);
    return item.date >= today;
  };

  const handleCancelReservation = (item) => {
    setCancelling(true);
    setTimeout(() => {
      updateReservations(prev => 
        prev.map(r => r.id === item.id ? { ...r, status: "cancelled", cancelledAt: new Date().toISOString().replace('T', ' ').slice(0, 19) } : r)
      );
      addLog?.(`[예약취소] ${user.name}(${user.id}) → ${item.roomName} | ${item.date} ${item.slotLabels?.join(", ")} 예약을 취소했습니다.`, "reservation", { studentId: user.id, roomId: item.roomId });
      addNotification?.(`❌ 예약 취소: ${user.name} → ${item.roomName} (${item.date})`, "room");
      
      // 취소 확인 이메일 발송
      sendEmailNotification?.({
        subject: `[실기실 예약 취소] ${user.name} · ${item.roomName}`,
        body: [
          "국민대학교 건축대학 실기실 예약이 취소되었습니다.",
          "",
          "[취소된 예약 정보]",
          `- 예약자: ${user.name} (${user.id})`,
          `- 전공/학년: ${user.dept} ${user.year}학년`,
          `- 실기실: ${item.roomName}`,
          `- 날짜: ${item.date}`,
          `- 시간: ${item.slotLabels?.join(", ")}`,
          `- 목적: ${item.purpose || "개인 작업"}`,
          "",
          "[안내]",
          "- 예약이 취소되어 해당 시간대는 다른 학생이 예약할 수 있습니다.",
          "- 다시 예약이 필요한 경우 새로 예약을 진행해주세요.",
          "",
          "국민대학교 건축대학 실기실, 물품 예약 시스템",
        ].join("\n"),
      });

      setCancelling(false);
      setCancelConfirm(null);
      alert("✅ 예약이 취소되었습니다.\n확인 이메일이 발송됩니다.");
    }, 500);
  };

  return (
    <div className="fade-in">
      <SectionTitle icon={<Icons.history size={16} color={theme.accent}/>}>이용 내역
        <Badge color="dim">{all.length}건</Badge>
      </SectionTitle>
      {all.length === 0 ? (
        <Empty icon={<Icons.calendar size={32}/>} text="아직 이용 내역이 없습니다"/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {all.map(item => (
            <Card key={item.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Badge color={item.type === "room" ? "blue" : "accent"}>{item.type === "room" ? "실기실" : "기구대여"}</Badge>
                <Badge color={item.status === "approved" ? "green" : item.status === "ready" ? "blue" : item.status === "cancelled" || item.status === "rejected" ? "red" : "yellow"}>
                  {item.status === "approved" ? "승인" : item.status === "ready" ? "준비완료" : item.status === "cancelled" ? "취소" : item.status === "rejected" ? "반려" : item.status === "returned" ? "반납" : "대기중"}
                </Badge>
              </div>
              {item.type === "room" ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.roomName}</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>{item.date} · {item.slotLabels?.join(", ")}</div>
                  {item.purpose && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>목적: {item.purpose}</div>}
                  {canCancel(item) && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      {cancelConfirm === item.id ? (
                        <>
                          <span style={{ fontSize: 13, color: theme.red }}>정말 취소하시겠습니까?</span>
                          <Button variant="primary" size="sm" style={{ background: theme.red }} onClick={() => handleCancelReservation(item)} disabled={cancelling}>
                            {cancelling ? "취소 중..." : "예, 취소합니다"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setCancelConfirm(null)}>아니오</Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" style={{ color: theme.red, borderColor: theme.red }} onClick={() => setCancelConfirm(item.id)}>
                          <Icons.x size={14}/> 예약 취소
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.items?.map(i => `${i.icon} ${i.name}`).join(", ")}</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>반납: {item.returnDate}</div>
                </div>
              )}
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>{item.createdAt}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Student Inquiries ───────────────────────────────────────────
function StudentInquiries({ user, inquiries, updateInquiries }) {
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = () => {
    if (!inquiryTitle.trim() || !inquiryContent.trim()) return;
    setSubmitting(true);
    const newInquiry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: inquiryTitle.trim(),
      content: inquiryContent.trim(),
      name: user.name,
      contact: user.id,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: "pending",
      answer: null,
      isLoggedIn: true,
    };
    updateInquiries(prev => [newInquiry, ...prev]);
    setInquiryTitle("");
    setInquiryContent("");
    setSubmitting(false);
    setShowForm(false);
    setSuccess("문의가 등록되었습니다!");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="fade-in">
      <SectionTitle icon={<Icons.file size={16} color={theme.accent}/>}>내 문의 내역
        <Badge color="dim">{inquiries.length}건</Badge>
        <Button variant="primary" size="sm" style={{ marginLeft: "auto" }} onClick={() => setShowForm(!showForm)}>
          {showForm ? "취소" : "+ 문의 작성"}
        </Button>
      </SectionTitle>

      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, color: theme.green, fontSize: 13, marginBottom: 16 }}>
          <Icons.check size={16}/> {success}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 16, background: theme.accentBg, borderColor: theme.accentBorder }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent, marginBottom: 12 }}>새 문의 작성</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input 
              label="제목" 
              placeholder="문의 제목을 입력하세요" 
              value={inquiryTitle} 
              onChange={e => setInquiryTitle(e.target.value)}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>내용</label>
              <textarea
                placeholder="문의 내용을 자세히 작성해주세요"
                value={inquiryContent}
                onChange={e => setInquiryContent(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "10px 14px", 
                  background: theme.surface, 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: theme.radiusSm, 
                  color: theme.text, 
                  fontSize: 14, 
                  fontFamily: theme.font, 
                  outline: "none", 
                  boxSizing: "border-box", 
                  transition: "border-color 0.2s",
                  minHeight: 100,
                  resize: "vertical"
                }}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              <Button 
                variant="primary" 
                onClick={handleSubmit}
                disabled={!inquiryTitle.trim() || !inquiryContent.trim() || submitting}
              >
                {submitting ? "등록 중..." : "문의 등록"}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {inquiries.length === 0 && !showForm ? (
        <Empty icon={<Icons.file size={32}/>} text="등록한 문의가 없습니다"/>
      ) : inquiries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {inquiries.map(inquiry => (
            <Card 
              key={inquiry.id} 
              style={{ padding: 16, cursor: "pointer" }}
              hover
              onClick={() => setSelectedInquiry(inquiry)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{inquiry.title}</div>
                <Badge color={inquiry.status === "answered" ? "green" : "yellow"}>
                  {inquiry.status === "answered" ? "답변완료" : "대기중"}
                </Badge>
              </div>
              <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.5 }}>
                {inquiry.content.length > 80 ? inquiry.content.slice(0, 80) + "..." : inquiry.content}
              </div>
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>{inquiry.createdAt}</div>
              {inquiry.status === "answered" && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: theme.greenBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.greenBorder}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.green, marginBottom: 4 }}>✓ 답변</div>
                  <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.5 }}>
                    {inquiry.answer?.text?.length > 60 ? inquiry.answer.text.slice(0, 60) + "..." : inquiry.answer?.text}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInquiry && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setSelectedInquiry(null)}>
          <div style={{ background: theme.card, borderRadius: theme.radius, padding: 24, maxWidth: 500, width: "100%", maxHeight: "80vh", overflow: "auto", border: `1px solid ${theme.border}` }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedInquiry.title}</div>
              <button onClick={() => setSelectedInquiry(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim }}>
                <Icons.x size={20}/>
              </button>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 8 }}>
                {selectedInquiry.createdAt} · {selectedInquiry.contact}
              </div>
              <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {selectedInquiry.content}
              </div>
            </div>

            {selectedInquiry.status === "answered" && selectedInquiry.answer && (
              <div style={{ padding: 16, background: theme.greenBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.greenBorder}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.green }}>✓ 답변</div>
                  <div style={{ fontSize: 11, color: theme.textDim }}>{selectedInquiry.answer.answeredAt} · {selectedInquiry.answer.answeredBy}</div>
                </div>
                <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {selectedInquiry.answer.text}
                </div>
              </div>
            )}

            {selectedInquiry.status === "pending" && (
              <div style={{ padding: 12, background: theme.yellowBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.yellowBorder}`, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: theme.yellow }}>⏳ 답변 대기 중입니다. 잠시만 기다려주세요.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  WORKER PORTAL
// ════════════════════════════════════════════════════════════════
function WorkerPortal({ user, onLogout, reservations, updateReservations, equipRentals, updateEquipRentals, logs, addLog, notifications, markNotifRead, markAllNotifsRead, unreadCount, sendEmailNotification, inquiries, updateInquiries, printRequests, updatePrintRequests, visitCount }) {
  const [tab, setTab] = useState("dashboard");
  const pendingInquiries = inquiries?.filter(i => i.status === "pending")?.length || 0;
  const pendingPrints = printRequests?.filter(p => p.status === "pending" || p.status === "processing")?.length || 0;

  return (
    <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 0 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Worker Portal</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>관리 대시보드</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Badge color="accent">{user.name}</Badge>
            <Badge color="dim">{user.shift}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}><Icons.logout size={15}/> 나가기</Button>
      </div>

      <div style={{ paddingTop: 24 }}>
        <Tabs
          tabs={[
            { id: "dashboard", label: "대시보드", icon: <Icons.home size={15}/>, badge: unreadCount },
            { id: "print", label: "출력 관리", icon: <Icons.file size={15}/>, badge: pendingPrints },
            { id: "inquiries", label: "문의", icon: <Icons.file size={15}/>, badge: pendingInquiries },
            { id: "logs", label: "일지", icon: <Icons.log size={15}/> },
          ]}
          active={tab} onChange={setTab}
        />
      </div>

      {tab === "dashboard" && (
        <WorkerDashboard
          reservations={reservations} updateReservations={updateReservations}
          equipRentals={equipRentals} updateEquipRentals={updateEquipRentals}
          notifications={notifications} markNotifRead={markNotifRead} markAllNotifsRead={markAllNotifsRead}
          unreadCount={unreadCount} addLog={addLog} workerName={user.name}
          sendEmailNotification={sendEmailNotification}
          printRequests={printRequests}
          visitCount={visitCount}
        />
      )}
      {tab === "print" && (
        <PrintManagement printRequests={printRequests} updatePrintRequests={updatePrintRequests} addLog={addLog} workerName={user.name}/>
      )}
      {tab === "inquiries" && (
        <InquiriesPanel inquiries={inquiries} updateInquiries={updateInquiries} workerName={user.name} addLog={addLog}/>
      )}
      {tab === "logs" && (
        <LogViewer logs={logs} addLog={addLog}/>
      )}
    </div>
  );
}

// ─── Print Management (출력 관리) ────────────────────────────────
function PrintManagement({ printRequests, updatePrintRequests, addLog, workerName }) {
  const [filter, setFilter] = useState("pending"); // pending | processing | completed | all
  const [selectedRequest, setSelectedRequest] = useState(null);

  const filtered = (printRequests || []).filter(p => {
    if (filter === "pending") return p.status === "pending";
    if (filter === "processing") return p.status === "processing";
    if (filter === "completed") return p.status === "completed" || p.status === "cancelled";
    return true;
  });

  const handleStatusChange = (requestId, newStatus) => {
    updatePrintRequests(prev => prev.map(p => 
      p.id === requestId 
        ? { ...p, status: newStatus, completedAt: newStatus === "completed" ? ts() : p.completedAt, processedBy: workerName } 
        : p
    ));
    addLog(`출력 상태 변경: ${newStatus}`, "print", { requestId });
  };

  const pendingCount = (printRequests || []).filter(p => p.status === "pending").length;
  const processingCount = (printRequests || []).filter(p => p.status === "processing").length;

  const statusLabels = { pending: "대기중", processing: "출력중", completed: "완료", cancelled: "취소됨" };
  const statusColors = { pending: "yellow", processing: "blue", completed: "green", cancelled: "red" };

  return (
    <div style={{ paddingTop: 20 }}>
      {/* 긴급 알림 */}
      {pendingCount > 0 && (
        <Card style={{ marginBottom: 16, background: theme.yellowBg, borderColor: theme.yellowBorder }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.yellow }}>새 출력 요청 {pendingCount}건</div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>확인 후 출력을 진행해주세요</div>
            </div>
          </div>
        </Card>
      )}

      {/* 필터 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { id: "pending", label: `대기 (${pendingCount})` },
          { id: "processing", label: `출력중 (${processingCount})` },
          { id: "completed", label: "완료" },
          { id: "all", label: "전체" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${filter === f.id ? theme.accent : theme.border}`,
            background: filter === f.id ? theme.accentBg : "transparent",
            color: filter === f.id ? theme.accent : theme.textMuted,
            fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: theme.font,
          }}>{f.label}</button>
        ))}
      </div>

      {/* 요청 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
            출력 요청이 없습니다
          </div>
        ) : (
          filtered.map(req => (
            <Card key={req.id} style={{ 
              padding: 16, cursor: "pointer",
              borderColor: req.urgentPickup ? theme.red : (req.status === "pending" ? theme.yellow : theme.border),
              background: req.urgentPickup ? theme.redBg : theme.card,
            }} onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {req.urgentPickup && <span style={{ fontSize: 16 }}>🚨</span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{req.studentName}</span>
                    <Badge color="dim">{req.studentDept}</Badge>
                    <Badge color={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 13, color: theme.textMuted }}>
                    <span>📄 {req.paperSize} {req.colorMode === "BW" ? "흑백" : "컬러"}</span>
                    <span>📋 {req.copies}장</span>
                    <span>💰 {req.totalPrice?.toLocaleString()}원</span>
                  </div>
                  <div style={{ fontSize: 11, color: theme.textDim, marginTop: 6 }}>
                    신청: {req.createdAt?.slice(5, 16).replace("T", " ")}
                  </div>
                  {req.note && <div style={{ fontSize: 12, color: theme.accent, marginTop: 6 }}>💬 {req.note}</div>}
                </div>
              </div>

              {/* 상세 패널 */}
              {selectedRequest?.id === req.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
                  {/* 파일 정보 */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 6 }}>출력 파일</div>
                    <div style={{ padding: 10, background: theme.surface, borderRadius: 6, fontSize: 12, color: theme.text }}>
                      📎 {req.printFile?.name}
                      {req.printFile?.data && (
                        <a href={req.printFile.data} download={req.printFile.name} style={{ marginLeft: 12, color: theme.accent, textDecoration: "none" }}>
                          다운로드 ↓
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 송금 캡처 */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 6 }}>송금 캡처</div>
                    {req.paymentProof?.data && (
                      <img src={req.paymentProof.data} alt="송금 캡처" style={{ maxWidth: 200, borderRadius: 8, border: `1px solid ${theme.border}` }}/>
                    )}
                  </div>

                  {/* 상태 변경 버튼 */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {req.status === "pending" && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(req.id, "processing"); }}>
                        🖨️ 출력 시작
                      </Button>
                    )}
                    {req.status === "processing" && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(req.id, "completed"); }}>
                        ✅ 출력 완료
                      </Button>
                    )}
                    {(req.status === "pending" || req.status === "processing") && (
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleStatusChange(req.id, "cancelled"); }}>
                        ❌ 취소
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Inquiries Panel ─────────────────────────────────────────────
function InquiriesPanel({ inquiries, updateInquiries, workerName, addLog }) {
  const [filter, setFilter] = useState("all"); // all | pending | answered
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answerText, setAnswerText] = useState("");

  const filtered = (inquiries || []).filter(i => {
    if (filter === "pending") return i.status === "pending";
    if (filter === "answered") return i.status === "answered";
    return true;
  });

  const handleAnswer = (inquiryId) => {
    if (!answerText.trim()) return;
    updateInquiries(prev => prev.map(i => 
      i.id === inquiryId 
        ? { ...i, status: "answered", answer: { text: answerText.trim(), answeredBy: workerName, answeredAt: ts() } } 
        : i
    ));
    addLog(`[문의답변] "${selectedInquiry?.title}" 답변 완료 (${workerName})`, "inquiry");
    setAnswerText("");
    setSelectedInquiry(null);
  };

  const handleMarkComplete = (inquiryId) => {
    updateInquiries(prev => prev.map(i => 
      i.id === inquiryId 
        ? { ...i, status: "answered", answer: { text: "연락처로 직접 답변 완료", answeredBy: workerName, answeredAt: ts() } } 
        : i
    ));
    addLog(`[문의완료] "${selectedInquiry?.title}" 연락 완료 처리 (${workerName})`, "inquiry");
    setSelectedInquiry(null);
  };

  const handleDelete = (inquiryId) => {
    if (!confirm("이 문의를 삭제하시겠습니까?")) return;
    updateInquiries(prev => prev.filter(i => i.id !== inquiryId));
    setSelectedInquiry(null);
  };

  return (
    <div className="fade-in" style={{ paddingTop: 24 }}>
      <SectionTitle icon={<Icons.file size={16} color={theme.accent}/>}>
        문의 관리
        <Badge color="accent">{(inquiries || []).filter(i => i.status === "pending").length}건 대기</Badge>
      </SectionTitle>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { id: "all", label: "전체" },
          { id: "pending", label: "대기중" },
          { id: "answered", label: "답변완료" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 12px",
              borderRadius: theme.radiusSm,
              border: `1px solid ${filter === f.id ? theme.accent : theme.border}`,
              background: filter === f.id ? theme.accentBg : "transparent",
              color: filter === f.id ? theme.accent : theme.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: theme.font,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon={<Icons.file size={32}/>} text="문의가 없습니다"/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(inquiry => (
            <Card 
              key={inquiry.id} 
              style={{ padding: 16, cursor: "pointer" }}
              hover
              onClick={() => setSelectedInquiry(inquiry)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{inquiry.title}</div>
                <Badge color={inquiry.status === "pending" ? "yellow" : "green"}>
                  {inquiry.status === "pending" ? "대기중" : "답변완료"}
                </Badge>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                {inquiry.content.length > 100 ? inquiry.content.slice(0, 100) + "..." : inquiry.content}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: theme.textDim }}>
                <span>작성자: {inquiry.name}</span>
                {inquiry.contact && <span>연락처: {inquiry.contact}</span>}
                <span>{inquiry.createdAt}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInquiry && (
        <div style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.7)", 
          display: "flex", alignItems: "center", justifyContent: "center", 
          zIndex: 2000,
          padding: 20
        }} onClick={() => setSelectedInquiry(null)}>
          <div 
            style={{ 
              background: theme.card, 
              borderRadius: theme.radius, 
              padding: 24, 
              maxWidth: 500, 
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              border: `1px solid ${theme.border}`
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 8 }}>{selectedInquiry.title}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge color={selectedInquiry.status === "pending" ? "yellow" : "green"}>
                    {selectedInquiry.status === "pending" ? "대기중" : "답변완료"}
                  </Badge>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInquiry(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 4 }}
              >
                <Icons.x size={18}/>
              </button>
            </div>

            <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16 }}>
              작성자: {selectedInquiry.name} | 연락처: {selectedInquiry.contact || "없음"} | {selectedInquiry.createdAt}
            </div>

            <div style={{ 
              padding: 16, 
              background: theme.surface, 
              borderRadius: theme.radiusSm, 
              marginBottom: 16,
              fontSize: 14,
              color: theme.text,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap"
            }}>
              {selectedInquiry.content}
            </div>

            {selectedInquiry.status === "answered" && (
              <div style={{ 
                padding: 16, 
                background: theme.greenBg, 
                border: `1px solid ${theme.greenBorder}`,
                borderRadius: theme.radiusSm, 
                marginBottom: 16 
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.green, marginBottom: 8 }}>
                  답변 ({selectedInquiry.answeredBy} · {selectedInquiry.answeredAt})
                </div>
                <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {selectedInquiry.answer}
                </div>
              </div>
            )}

            {selectedInquiry.status === "pending" && selectedInquiry.isLoggedIn !== false && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  답변 작성
                </label>
                <textarea
                  placeholder="답변을 입력하세요"
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  style={{ 
                    width: "100%", 
                    padding: "10px 14px", 
                    background: theme.surface, 
                    border: `1px solid ${theme.border}`, 
                    borderRadius: theme.radiusSm, 
                    color: theme.text, 
                    fontSize: 14, 
                    fontFamily: theme.font, 
                    outline: "none", 
                    boxSizing: "border-box",
                    minHeight: 100,
                    resize: "vertical"
                  }}
                />
              </div>
            )}

            {selectedInquiry.status === "pending" && selectedInquiry.isLoggedIn === false && (
              <div style={{ padding: 16, background: theme.yellowBg, border: `1px solid ${theme.yellowBorder}`, borderRadius: theme.radiusSm, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: theme.yellow, fontWeight: 600, marginBottom: 6 }}>📞 비로그인 문의</div>
                <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5, marginBottom: 12 }}>
                  비로그인 문의는 연락처로 직접 연락해주세요.<br/>
                  연락처: <strong style={{ color: theme.text }}>{selectedInquiry.contact || "없음"}</strong>
                </div>
                <Button variant="primary" onClick={() => handleMarkComplete(selectedInquiry.id)}>
                  ✅ 답변 완료 처리
                </Button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {selectedInquiry.status === "pending" && selectedInquiry.isLoggedIn !== false && (
                <Button variant="primary" onClick={() => handleAnswer(selectedInquiry.id)} disabled={!answerText.trim()}>
                  답변 등록
                </Button>
              )}
              <Button variant="ghost" onClick={() => handleDelete(selectedInquiry.id)} style={{ color: theme.red }}>
                삭제
              </Button>
              <Button variant="ghost" onClick={() => setSelectedInquiry(null)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Worker Dashboard ────────────────────────────────────────────
function WorkerDashboard({ reservations, updateReservations, equipRentals, updateEquipRentals, notifications, markNotifRead, markAllNotifsRead, unreadCount, addLog, workerName, sendEmailNotification, printRequests, visitCount }) {
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [roomCleanup, setRoomCleanup] = useState({});

  // 실기실 정리 확인 — 오늘 날짜 기준 store 연동
  useEffect(() => {
    const key = `roomCleanup_${dateStr()}`;
    store.get(key).then(v => { if (v) setRoomCleanup(v); });
  }, []);
  const toggleRoomCleanup = (roomId) => {
    setRoomCleanup(prev => {
      const next = { ...prev, [roomId]: !prev[roomId] };
      store.set(`roomCleanup_${dateStr()}`, next);
      return next;
    });
  };

  const todayRes = reservations.filter(r => r.status === "approved");
  const pendingRes = reservations.filter(r => r.status === "pending");
  const pendingRentals = equipRentals.filter(r => r.status === "pending_pickup");
  const activeRentals = equipRentals.filter(r => r.status === "pending_pickup" || r.status === "ready");
  const pendingPrints = (printRequests || []).filter(p => p.status === "pending" || p.status === "processing").length;
  const today = dateStr();

  // 오늘 사용된 실기실 목록
  const todayUsedRooms = ROOMS.filter(room =>
    reservations.some(r => r.roomId === room.id && r.date === today && r.status === "approved")
  );
  const allRoomsChecked = todayUsedRooms.length === 0 || todayUsedRooms.every(r => roomCleanup[r.id]);

  // 체크리스트 완료 상태
  const checklistItems = [
    { key: "pending", label: "승인 대기 예약 처리", icon: <Icons.calendar size={16}/>, count: pendingRes.length, done: pendingRes.length === 0 },
    { key: "rental", label: "물품 수령/반납 처리", icon: <Icons.package size={16}/>, count: activeRentals.length, done: activeRentals.length === 0 },
    { key: "print", label: "출력 대기 처리", icon: <Icons.file size={16}/>, count: pendingPrints, done: pendingPrints === 0 },
    { key: "cleanup", label: "실기실 정리 확인", icon: <Icons.check size={16}/>, count: todayUsedRooms.filter(r => !roomCleanup[r.id]).length, done: allRoomsChecked },
  ];
  const doneCount = checklistItems.filter(c => c.done).length;
  
  // 통계 데이터 계산
  const totalReservations = reservations.length;
  const completedReservations = reservations.filter(r => r.status === "approved" || r.status === "completed").length;
  const cancelledReservations = reservations.filter(r => r.status === "cancelled" || r.status === "rejected").length;
  const totalRentals = equipRentals.length;
  const returnedRentals = equipRentals.filter(r => r.status === "returned").length;
  
  // 실기실별 예약 통계
  const roomStats = ROOMS.map(room => ({
    name: room.name.replace("실기실 ", ""),
    count: reservations.filter(r => r.roomId === room.id && r.status === "approved").length
  }));
  const maxRoomCount = Math.max(...roomStats.map(r => r.count), 1);
  
  // 최근 7일 예약 통계
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const dailyStats = last7Days.map(date => ({
    date,
    day: ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()],
    count: reservations.filter(r => r.date === date && r.status === "approved").length
  }));
  const maxDailyCount = Math.max(...dailyStats.map(d => d.count), 20);

  // 도넛 차트 렌더링 함수
  const DonutChart = ({ data, size = 120, strokeWidth = 16 }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    
    return (
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={theme.surface} strokeWidth={strokeWidth}/>
        {data.map((d, i) => {
          const dashLength = (d.value / total) * circumference;
          const segment = (
            <circle key={i} cx={size/2} cy={size/2} r={radius} fill="none" stroke={d.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              style={{ transition: "stroke-dasharray 0.5s, stroke-dashoffset 0.5s" }}
            />
          );
          offset += dashLength;
          return segment;
        })}
      </svg>
    );
  };

  // 원형 진행률 표시 컴포넌트
  const CircularProgress = ({ value, max, size = 50, color }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashLength = (percentage / 100) * circumference;
    
    return (
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={theme.surface} strokeWidth={4}/>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={4}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 10, fontWeight: 700, color }}>{Math.round(percentage)}%</div>
      </div>
    );
  };

  const markEquipReady = (rentalId) => {
    updateEquipRentals(prev => prev.map(r => r.id === rentalId ? {
      ...r,
      status: "ready",
      returnChecklist: r.returnChecklist || EDITABLE.equipmentReturnChecklist.map(label => ({ label, done: false })),
    } : r));
    const rental = equipRentals.find(r => r.id === rentalId);
    if (rental) {
      addLog(`[준비완료] ${rental.studentName}의 기구대여 준비 완료 → ${rental.items.map(i => i.name).join(", ")}`, "equipment");
    }
  };

  const markEquipReturned = (rentalId) => {
    updateEquipRentals(prev => prev.map(r => r.id === rentalId ? {...r, status: "returned", returnedAt: ts()} : r));
    const rental = equipRentals.find(r => r.id === rentalId);
    if (rental) {
      addLog(`[반납완료] ${rental.studentName}의 기구 반납 완료 → ${rental.items.map(i => i.name).join(", ")}`, "equipment");
      sendEmailNotification?.({
        subject: `[반납완료] ${rental.studentName} · 기구 반납 완료`,
        body: [
          "기구 반납이 완료되었습니다.",
          "",
          "[반납 정보]",
          `- 학생: ${rental.studentName} (${rental.studentId})`,
          `- 대여 품목: ${rental.items?.map(i => i.name).join(", ")}`,
          `- 반납 완료: ${ts()}`,
          "",
          "국민대학교 건축대학 실기실, 물품 예약 시스템",
        ].join("\n"),
      });
    }
  };

  const toggleChecklistItem = (rentalId, idx) => {
    updateEquipRentals(prev => prev.map(r => {
      if (r.id !== rentalId) return r;
      const list = r.returnChecklist || EDITABLE.equipmentReturnChecklist.map(label => ({ label, done: false }));
      const next = list.map((item, i) => i === idx ? { ...item, done: !item.done } : item);
      return { ...r, returnChecklist: next };
    }));
  };

  const approveReservation = (reservationId) => {
    updateReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: "approved", approvedAt: ts(), approvedBy: workerName } : r));
    const res = reservations.find(r => r.id === reservationId);
    if (res) {
      addLog(`[예약승인] ${res.studentName}(${res.studentId}) → ${res.roomName} | ${res.date} ${res.slotLabels?.join(", ")}`, "reservation", { studentId: res.studentId, roomId: res.roomId });
    }
  };

  const rejectReservation = (reservationId) => {
    const reason = window.prompt("반려 사유 (선택)") || "";
    updateReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: "rejected", rejectedAt: ts(), rejectedBy: workerName, rejectedReason: reason } : r));
    const res = reservations.find(r => r.id === reservationId);
    if (res) {
      addLog(`[예약반려] ${res.studentName}(${res.studentId}) → ${res.roomName} | ${res.date} ${res.slotLabels?.join(", ")}${reason ? ` | 사유: ${reason}` : ""}`, "reservation", { studentId: res.studentId, roomId: res.roomId });
    }
  };

  return (
    <div className="fade-in">
      {/* ═══ Header ═══ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: theme.text }}>관리 대시보드</h2>
          <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: theme.green }}/>
            <span style={{ fontSize: 12, color: theme.textMuted }}>실시간</span>
          </div>
          {/* 알림 벨 */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotifPopup(!showNotifPopup)} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: showNotifPopup ? theme.accent : theme.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "all 0.2s" }}>
              <Icons.bell size={18} color={showNotifPopup ? "#fff" : theme.textMuted}/>
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, background: theme.red, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: `2px solid ${theme.bg}` }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            {showNotifPopup && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 360, maxHeight: 400, background: theme.card, borderRadius: theme.radius, border: `1px solid ${theme.border}`, boxShadow: "0 10px 40px rgba(0,0,0,0.4)", zIndex: 1000, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>알림</span>
                    {unreadCount > 0 && <Badge color="red">{unreadCount}</Badge>}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); markAllNotifsRead(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: theme.accent, fontWeight: 600, fontFamily: theme.font }}>모두 읽음</button>
                  )}
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center" }}>
                      <Icons.bell size={32} color={theme.textDim}/>
                      <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 12 }}>알림이 없습니다</div>
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((n, i) => (
                      <div key={n.id} onClick={() => markNotifRead(n.id)} style={{ padding: "12px 16px", cursor: "pointer", transition: "background 0.15s", borderBottom: i < Math.min(notifications.length, 15) - 1 ? `1px solid ${theme.border}` : "none", background: !n.read ? (n.urgent ? "rgba(212,93,93,0.06)" : "rgba(212,160,83,0.06)") : "transparent", opacity: n.read ? 0.6 : 1 }}
                        onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.background = !n.read ? (n.urgent ? "rgba(212,93,93,0.06)" : "rgba(212,160,83,0.06)") : "transparent"}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: n.urgent ? theme.red : theme.accent, marginTop: 5, flexShrink: 0 }}/>}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{n.text}</div>
                            <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>{n.time}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 퇴근 전 체크리스트 ═══ */}
      <Card style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
        {/* 체크리스트 헤더 */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.shield size={18} color={doneCount === 4 ? theme.green : theme.accent}/>
            <span style={{ fontSize: 16, fontWeight: 800, color: theme.text }}>퇴근 전 체크리스트</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 80, height: 6, borderRadius: 3, background: theme.surface, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(doneCount / 4) * 100}%`, background: doneCount === 4 ? theme.green : theme.accent, borderRadius: 3, transition: "width 0.3s" }}/>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: doneCount === 4 ? theme.green : theme.accent, fontFamily: theme.fontMono }}>{doneCount}/4</span>
          </div>
        </div>

        {/* 체크리스트 항목들 */}
        {checklistItems.map((item, idx) => (
          <div key={item.key}>
            {/* 항목 행 */}
            <div
              onClick={() => setExpandedChecklist(expandedChecklist === item.key ? null : item.key)}
              style={{
                padding: "14px 20px", cursor: "pointer", transition: "background 0.15s",
                borderBottom: idx < checklistItems.length - 1 || expandedChecklist === item.key ? `1px solid ${theme.border}` : "none",
                display: "flex", alignItems: "center", gap: 12,
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* 체크 아이콘 */}
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: item.done ? theme.greenBg : theme.surface,
                border: `2px solid ${item.done ? theme.green : theme.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s"
              }}>
                {item.done && <Icons.check size={14} color={theme.green}/>}
              </div>
              {/* 아이콘 + 라벨 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ color: item.done ? theme.green : theme.textMuted }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: item.done ? theme.green : theme.text, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.7 : 1 }}>{item.label}</span>
              </div>
              {/* 카운트 뱃지 */}
              {item.done ? (
                <Badge color="green">완료</Badge>
              ) : (
                <Badge color={item.count > 0 ? "yellow" : "dim"}>{item.count}건 남음</Badge>
              )}
              {/* 펼침 화살표 */}
              <span style={{ fontSize: 11, color: theme.textDim, transition: "transform 0.2s", transform: expandedChecklist === item.key ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </div>

            {/* 펼침 콘텐츠 */}
            <div style={{
              maxHeight: expandedChecklist === item.key ? 600 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s ease-in-out",
              background: "rgba(0,0,0,0.15)",
            }}>
              <div style={{ padding: "12px 20px" }}>
                {/* 1) 승인 대기 예약 */}
                {item.key === "pending" && (
                  pendingRes.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: theme.textDim, fontSize: 13 }}>
                      <Icons.check size={24} color={theme.green}/><div style={{ marginTop: 8 }}>모든 예약이 처리되었습니다</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pendingRes.map(res => (
                        <div key={res.id} style={{ padding: 14, background: theme.card, borderRadius: theme.radiusSm, border: `1px solid ${theme.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{res.studentName} <span style={{ color: theme.textMuted, fontWeight: 400 }}>({res.studentId})</span></div>
                            <Badge color="yellow">대기</Badge>
                          </div>
                          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>{res.roomName} · {res.date} · {res.slotLabels?.join(", ")}</div>
                          {res.purpose && <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 8 }}>목적: {res.purpose}</div>}
                          <div style={{ display: "flex", gap: 8 }}>
                            <Button size="sm" onClick={() => approveReservation(res.id)}>승인</Button>
                            <Button size="sm" variant="danger" onClick={() => rejectReservation(res.id)}>반려</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 2) 물품 수령/반납 */}
                {item.key === "rental" && (
                  activeRentals.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: theme.textDim, fontSize: 13 }}>
                      <Icons.check size={24} color={theme.green}/><div style={{ marginTop: 8 }}>진행 중인 대여가 없습니다</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {activeRentals.map(rental => (
                        <div key={rental.id} style={{ padding: 14, background: theme.card, borderRadius: theme.radiusSm, border: `1px solid ${theme.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{rental.studentName} <span style={{ color: theme.textMuted, fontWeight: 400 }}>({rental.studentId})</span></div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {rental.returnDate && rental.returnDate < today && <Badge color="red">연체</Badge>}
                              <Badge color={rental.status === "ready" ? "blue" : "yellow"}>{rental.status === "ready" ? "준비완료" : "준비 필요"}</Badge>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 6 }}>{rental.items.map(i => `${i.icon} ${i.name}`).join("  ·  ")}</div>
                          <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 8 }}>반납: {rental.returnDate}</div>
                          {rental.status === "ready" && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 6 }}>반납 체크리스트</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {(rental.returnChecklist || EDITABLE.equipmentReturnChecklist.map(label => ({ label, done: false }))).map((cl, cidx) => (
                                  <label key={cidx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.textMuted, cursor: "pointer" }}>
                                    <input type="checkbox" checked={!!cl.done} onChange={() => toggleChecklistItem(rental.id, cidx)}/>
                                    {cl.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            {rental.status === "pending_pickup" && <Button size="sm" onClick={() => markEquipReady(rental.id)}>✓ 준비 완료</Button>}
                            {rental.status === "ready" && <Button size="sm" variant="success" onClick={() => markEquipReturned(rental.id)} disabled={(rental.returnChecklist || []).some(i => !i.done)}>↩ 반납 처리</Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 3) 출력 대기 */}
                {item.key === "print" && (
                  pendingPrints === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: theme.textDim, fontSize: 13 }}>
                      <Icons.check size={24} color={theme.green}/><div style={{ marginTop: 8 }}>대기 중인 출력이 없습니다</div>
                    </div>
                  ) : (
                    <div style={{ padding: 14, background: theme.card, borderRadius: theme.radiusSm, border: `1px solid ${theme.yellowBorder}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: theme.yellow }}>
                        <Icons.alert size={16}/>
                        <span style={{ fontWeight: 600 }}>{pendingPrints}건의 출력 요청이 대기 중입니다.</span>
                      </div>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>출력 대기 탭에서 처리해주세요.</div>
                    </div>
                  )
                )}

                {/* 4) 실기실 정리 확인 */}
                {item.key === "cleanup" && (
                  todayUsedRooms.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: theme.textDim, fontSize: 13 }}>
                      <Icons.check size={24} color={theme.green}/><div style={{ marginTop: 8 }}>오늘 사용된 실기실이 없습니다</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {todayUsedRooms.map(room => (
                        <label key={room.id}
                          onClick={(e) => { e.stopPropagation(); toggleRoomCleanup(room.id); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer",
                            background: roomCleanup[room.id] ? theme.greenBg : theme.card,
                            borderRadius: theme.radiusSm, border: `1px solid ${roomCleanup[room.id] ? theme.greenBorder : theme.border}`,
                            transition: "all 0.2s",
                          }}>
                          <input type="checkbox" checked={!!roomCleanup[room.id]} readOnly style={{ accentColor: theme.green }}/>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: roomCleanup[room.id] ? theme.green : theme.text }}>{room.name}</div>
                            <div style={{ fontSize: 11, color: theme.textDim }}>{room.floor} · {room.building}</div>
                          </div>
                          {roomCleanup[room.id] && <Badge color="green">확인됨</Badge>}
                        </label>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* ═══ 간단 요약 카드 ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "오늘 예약", value: todayRes.filter(r => r.date === today).length, icon: <Icons.calendar size={15} color={theme.accent}/>, color: theme.accent },
          { label: "총 예약", value: totalReservations, icon: <Icons.list size={15} color={theme.blue}/>, color: theme.blue },
          { label: "물품 대여", value: totalRentals, icon: <Icons.package size={15} color={theme.yellow}/>, color: theme.yellow },
          { label: "방문자", value: visitCount || 0, icon: <Icons.users size={15} color={theme.green}/>, color: theme.green },
        ].map((stat, i) => (
          <Card key={i} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {stat.icon}
              <span style={{ fontSize: 11, color: theme.textMuted }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, fontFamily: theme.fontMono }}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* ═══ Analytics (접을 수 있음) ═══ */}
      <div style={{ marginBottom: 20 }}>
        <div
          onClick={() => setAnalyticsOpen(!analyticsOpen)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: analyticsOpen ? 12 : 0, padding: "8px 0" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: theme.text }}>
            <Icons.grid size={16} color={theme.accent}/>
            Analytics
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.textDim }}>{analyticsOpen ? "접기" : "펼치기"}</span>
            <span style={{ fontSize: 11, color: theme.textDim, transition: "transform 0.2s", display: "inline-block", transform: analyticsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </div>
        </div>
        <div style={{ maxHeight: analyticsOpen ? 800 : 0, overflow: "hidden", transition: "max-height 0.4s ease-in-out" }}>
          {/* 도넛 + 주간 차트 + 실기실별 이용 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* 주간 예약 현황 */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>주간 예약 현황</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>{last7Days[0]} ~ {last7Days[6]}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", height: 140, position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 10, color: theme.textDim }}>
                  <span>{maxDailyCount}</span><span>{Math.round(maxDailyCount/2)}</span><span>0</span>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginLeft: 24 }}>
                  {dailyStats.map((d, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%" }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
                        <div style={{ width: "70%", height: `${Math.max((d.count / maxDailyCount) * 100, 5)}%`, background: d.date === today ? theme.accent : theme.blue, borderRadius: "4px 4px 0 0", transition: "height 0.3s", minHeight: 4 }}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-around", marginLeft: 24, marginTop: 8 }}>
                  {dailyStats.map((d, i) => (
                    <span key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: d.date === today ? theme.accent : theme.textDim }}>{d.day}</span>
                  ))}
                </div>
              </div>
            </Card>

            {/* 실기실별 이용 + 도넛 */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>예약 현황</div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <DonutChart data={[ { value: completedReservations, color: theme.green }, { value: pendingRes.length, color: theme.yellow }, { value: cancelledReservations, color: theme.red } ]} size={60} strokeWidth={8}/>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.green }}/><span style={{ color: theme.textMuted }}>승인 {completedReservations}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.yellow }}/><span style={{ color: theme.textMuted }}>대기 {pendingRes.length}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: theme.red }}/><span style={{ color: theme.textMuted }}>취소 {cancelledReservations}</span></div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roomStats.slice(0, 5).map((room, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>{room.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>{room.count}</span>
                    </div>
                    <div style={{ height: 4, background: theme.surface, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(room.count / maxRoomCount) * 100}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.yellow})`, borderRadius: 2, transition: "width 0.3s" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ═══ 활성 예약 ═══ */}
      <SectionTitle icon={<Icons.calendar size={16} color={theme.accent}/>}>활성 예약</SectionTitle>
      <Card style={{ padding: 0, overflow: "hidden", maxHeight: 350, overflowY: "auto" }}>
        {todayRes.length === 0 ? (
          <Empty icon={<Icons.calendar size={28}/>} text="승인된 예약이 없습니다"/>
        ) : (
          todayRes.map((res, i) => (
            <div key={res.id} style={{ padding: "14px 18px", borderBottom: i < todayRes.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{res.studentName}</span>
                  <span style={{ fontSize: 12, color: theme.textMuted, marginLeft: 8 }}>{res.studentDept}</span>
                </div>
                <Badge color="green">{res.autoApproved ? "자동승인" : "승인"}</Badge>
              </div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>{res.roomName} · {res.date} · {res.slotLabels?.join(", ")}</div>
              {res.purpose && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>목적: {res.purpose}</div>}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

// ─── Log Viewer ──────────────────────────────────────────────────
function LogViewer({ logs }) {
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  const typeLabels = { all: "전체", reservation: "실기실 예약", equipment: "물품 대여" };
  const typeColors = { reservation: theme.blue, equipment: theme.yellow };

  const filtered = logs.filter(l => {
    if (filter !== "all" && l.type !== filter) return false;
    if (searchQ && !l.action.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const header = "시간,구분,내용\n";
    const rows = filtered.map(l => `"${l.time}","${l.type}","${l.action.replace(/"/g, '""')}"`).join("\n");
    const csv = "\uFEFF" + header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `일지_${dateStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportText = () => {
    const title = `국민대학교 건축대학 실기실, 물품 예약 시스템 일지\n내보내기 일시: ${ts()}\n${"═".repeat(60)}\n\n`;
    const body = filtered.map(l => `[${l.time}] ${l.action}`).join("\n");
    const blob = new Blob([title + body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `일지_${dateStr()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <Card style={{ marginBottom: 20, background: theme.greenBg, borderColor: theme.greenBorder, padding: 14 }}>
        <div style={{ fontSize: 13, color: theme.green, display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.check size={16}/> 모든 일지는 시스템에 의해 자동 생성됩니다. 수기 작성이 필요 없습니다.
        </div>
      </Card>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {Object.entries(typeLabels).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: "6px 12px", borderRadius: 6, border: `1px solid ${filter === key ? theme.accent : theme.border}`,
              background: filter === key ? theme.accentBg : "transparent",
              color: filter === key ? theme.accent : theme.textMuted,
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: theme.font,
            }}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ position: "relative" }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="검색..."
              style={{ width: "100%", padding: "7px 12px 7px 32px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, color: theme.text, fontSize: 13, fontFamily: theme.font, outline: "none", boxSizing: "border-box" }}/>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.textDim }}><Icons.search size={14}/></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="secondary" size="sm" onClick={exportCSV}><Icons.download size={14}/> CSV</Button>
          <Button variant="secondary" size="sm" onClick={exportText}><Icons.download size={14}/> TXT</Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
        총 {filtered.length}건 {filter !== "all" && `(${typeLabels[filter]})`}
      </div>

      {/* Log List */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <Empty icon={<Icons.log size={28}/>} text="일지가 없습니다"/>
        ) : (
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {filtered.map((log, i) => (
              <div key={log.id} className={i < 3 ? "slide-in" : ""} style={{
                padding: "12px 18px", borderBottom: `1px solid ${theme.border}`,
                borderLeft: `3px solid ${typeColors[log.type] || theme.textDim}`,
                animationDelay: `${i * 0.05}s`,
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <code style={{ fontSize: 11, color: theme.textDim, fontFamily: theme.fontMono, whiteSpace: "nowrap", marginTop: 1 }}>{log.time}</code>
                  <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{log.action}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ADMIN PORTAL
// ════════════════════════════════════════════════════════════════
function AdminPortal({ onLogout, reservations, updateReservations, workers, updateWorkers, logs, addLog, sheetConfig, updateSheetConfig, warnings, updateWarnings, blacklist, updateBlacklist, certificates, updateCertificates, sendEmailNotification, communityPosts, setCommunityPosts, exhibitionPosts, setExhibitionPosts }) {
  const [tab, setTab] = useState("accounts");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", username: "", password: "", shift: "" });
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showPassFor, setShowPassFor] = useState({});
  const [sheetUrl, setSheetUrl] = useState(sheetConfig?.reservationWebhookUrl || "");
  const [warnForm, setWarnForm] = useState({ studentId: "", name: "", reason: "" });
  const [blkForm, setBlkForm] = useState({ studentId: "", name: "", reason: "" });
  const [certModal, setCertModal] = useState(null);
  const [approving, setApproving] = useState(false);
  // 커뮤니티/전시 관리 상태
  const [exhForm, setExhForm] = useState({ title: "", description: "", dates: "", location: "", instagramUrl: "", posterUrl: "" });
  const [exhSaved, setExhSaved] = useState(false);
  const [exhEditingId, setExhEditingId] = useState(null);
  const [exhDeleteConfirm, setExhDeleteConfirm] = useState(null);
  const [exhPosterFile, setExhPosterFile] = useState(null);
  const [exhPosterUploading, setExhPosterUploading] = useState(false);
  const exhPosterFileRef = useRef(null);
  const [cmDeleteConfirm, setCmDeleteConfirm] = useState(null);
  const [cmExpandedPostId, setCmExpandedPostId] = useState(null);
  const [cmCommentDeleteConfirm, setCmCommentDeleteConfirm] = useState(null);

  const handlePosterUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기가 5MB를 초과합니다. 더 작은 이미지를 선택해주세요.");
      return;
    }
    setExhPosterUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setExhForm(p => ({ ...p, posterUrl: reader.result }));
      setExhPosterFile(file);
      setExhPosterUploading(false);
    };
    reader.onerror = () => {
      alert("이미지 업로드 실패");
      setExhPosterUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // 수료증 개수 계산
  const certificateCount = certificates ? Object.keys(certificates).length : 0;

  useEffect(() => {
    setSheetUrl(sheetConfig?.reservationWebhookUrl || "");
  }, [sheetConfig]);

  const resetForm = () => {
    setFormData({ name: "", username: "", password: "", shift: "" });
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "이름을 입력해주세요.";
    if (!formData.username.trim()) return "아이디를 입력해주세요.";
    if (formData.username.trim().length < 3) return "아이디는 3자 이상이어야 합니다.";
    if (!formData.password) return "비밀번호를 입력해주세요.";
    if (formData.password.length < 4) return "비밀번호는 4자 이상이어야 합니다.";
    if (!formData.shift.trim()) return "근무시간을 입력해주세요.";
    const dup = workers.find(w => w.username === formData.username.trim() && w.id !== editingId);
    if (dup) return "이미 사용중인 아이디입니다.";
    if (formData.username.trim() === ADMIN_ACCOUNT.username) return "사용할 수 없는 아이디입니다.";
    return null;
  };

  const handleSave = () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (editingId) {
      updateWorkers(prev => prev.map(w => w.id === editingId ? { ...w, name: formData.name.trim(), username: formData.username.trim(), password: formData.password, shift: formData.shift.trim() } : w));
      addLog(`[관리자] 근로학생 계정 수정: ${formData.name} (${formData.username})`, "admin");
    } else {
      const newWorker = { id: `W${Date.now()}`, name: formData.name.trim(), username: formData.username.trim(), password: formData.password, shift: formData.shift.trim() };
      updateWorkers(prev => [...prev, newWorker]);
      addLog(`[관리자] 근로학생 계정 생성: ${formData.name} (${formData.username})`, "admin");
    }
    resetForm();
  };

  const handleEdit = (worker) => {
    setFormData({ name: worker.name, username: worker.username, password: worker.password, shift: worker.shift });
    setEditingId(worker.id);
    setShowForm(true);
    setFormError("");
  };

  const handleDelete = (workerId) => {
    const worker = workers.find(w => w.id === workerId);
    updateWorkers(prev => prev.filter(w => w.id !== workerId));
    addLog(`[관리자] 근로학생 계정 삭제: ${worker?.name} (${worker?.username})`, "admin");
    setConfirmDelete(null);
  };

  const togglePassVisibility = (id) => setShowPassFor(prev => ({ ...prev, [id]: !prev[id] }));

  const saveSheetConfig = () => {
    updateSheetConfig(prev => ({ ...prev, reservationWebhookUrl: sheetUrl.trim() }));
    addLog("[관리자] 구글시트 연동 URL 저장", "admin");
  };

  const adminLogs = logs.filter(l => l.type === "admin");
  const pendingRes = (reservations || []).filter(r => r.status === "pending");

  const addWarning = () => {
    if (!warnForm.studentId.trim()) return;
    updateWarnings(prev => {
      const prevItem = prev[warnForm.studentId] || { count: 0 };
      const next = {
        ...prev,
        [warnForm.studentId]: {
          studentId: warnForm.studentId.trim(),
          name: warnForm.name.trim() || prevItem.name || "",
          count: (prevItem.count || 0) + 1,
          reason: warnForm.reason.trim() || prevItem.reason || "",
          updatedAt: ts(),
        }
      };
      return next;
    });
    addLog(`[관리자] 경고 추가: ${warnForm.studentId} ${warnForm.name} ${warnForm.reason ? `| ${warnForm.reason}` : ""}`, "admin");
    setWarnForm({ studentId: "", name: "", reason: "" });
  };

  const removeWarning = (studentId) => {
    updateWarnings(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    addLog(`[관리자] 경고 삭제: ${studentId}`, "admin");
  };

  const addBlacklist = () => {
    if (!blkForm.studentId.trim()) return;
    updateBlacklist(prev => ({
      ...prev,
      [blkForm.studentId.trim()]: {
        studentId: blkForm.studentId.trim(),
        name: blkForm.name.trim() || "",
        reason: blkForm.reason.trim() || "",
        updatedAt: ts(),
      }
    }));
    addLog(`[관리자] 블랙리스트 등록: ${blkForm.studentId} ${blkForm.name} ${blkForm.reason ? `| ${blkForm.reason}` : ""}`, "admin");
    setBlkForm({ studentId: "", name: "", reason: "" });
  };

  const removeBlacklist = (studentId) => {
    updateBlacklist(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    addLog(`[관리자] 블랙리스트 해제: ${studentId}`, "admin");
  };

  const approveCertificate = async (cert) => {
    setApproving(true);
    try {
      const url = EDITABLE.safetySheet?.url?.trim();
      if (url) {
        const payload = {
          action: "add_safety_student",
          studentId: cert.studentId,
          studentName: cert.studentName || "",
          studentYear: cert.studentYear || "",
          studentMajor: cert.studentMajor || "",
          studentEmail: cert.studentEmail || "",
          sheetName: EDITABLE.safetySheet?.sheetName || "",
          columns: EDITABLE.safetySheet?.columns || {},
        };
        try {
          await fetch(url, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          const params = new URLSearchParams(payload);
          await fetch(`${url}?${params.toString()}`, { method: "GET" });
        }
      }
      updateCertificates(prev => {
        const next = { ...prev };
        delete next[cert.studentId];
        return next;
      });
      
      // 승인 이메일 발송
      if (cert.studentEmail && sendEmailNotification) {
        sendEmailNotification({
          to: cert.studentEmail,
          subject: `[국민대 건축대학] 안전교육 수료증 승인 완료`,
          body: `안녕하세요, ${cert.studentName}님.\n\n교학팀에서 안전교육 수료증 확인을 완료하였습니다.\n\n해당 메일을 받으신 시점부터 포털 로그인이 가능합니다.\n\n감사합니다.\n국민대학교 건축대학 교학팀`
        });
      }
      
      addLog(`[관리자] 수료증 승인: ${cert.studentName}(${cert.studentId})`, "admin");
      setCertModal(null);
      setApproving(false);
    } catch (err) {
      setApproving(false);
      alert("승인 처리 실패: " + (err?.message || "알 수 없는 오류"));
    }
  };

  const rejectCertificate = (cert) => {
    updateCertificates(prev => {
      const next = { ...prev };
      delete next[cert.studentId];
      return next;
    });
    addLog(`[관리자] 수료증 반려: ${cert.studentName}(${cert.studentId})`, "admin");
    setCertModal(null);
  };

  const approveReservation = (reservationId) => {
    updateReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: "approved", approvedAt: ts(), approvedBy: "관리자" } : r));
    const res = reservations.find(r => r.id === reservationId);
    if (res) {
      addLog(`[관리자] 예약 승인: ${res.studentName}(${res.studentId}) → ${res.roomName} | ${res.date} ${res.slotLabels?.join(", ")}`, "admin");
    }
  };

  const rejectReservation = (reservationId) => {
    const reason = window.prompt("반려 사유 (선택)") || "";
    updateReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: "rejected", rejectedAt: ts(), rejectedBy: "관리자", rejectedReason: reason } : r));
    const res = reservations.find(r => r.id === reservationId);
    if (res) {
      addLog(`[관리자] 예약 반려: ${res.studentName}(${res.studentId}) → ${res.roomName} | ${res.date} ${res.slotLabels?.join(", ")}${reason ? ` | 사유: ${reason}` : ""}`, "admin");
    }
  };

  return (
    <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 0 16px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: theme.red, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Admin Portal</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>관리자 설정</div>
          <Badge color="red" style={{ marginTop: 8 }}>관리자</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}><Icons.logout size={15}/> 로그아웃</Button>
      </div>

      <div style={{ paddingTop: 24 }}>
        <Tabs
          tabs={[
            { id: "accounts", label: "근로학생 계정", icon: <Icons.users size={15}/> },
            { id: "discipline", label: "경고/블랙리스트", icon: <Icons.alert size={15}/> },
            { id: "certificates", label: "수료증 관리", icon: <Icons.file size={15}/>, badge: certificateCount },
            { id: "community", label: "커뮤니티/전시", icon: <Icons.edit size={15}/>, badge: communityPosts?.length || 0 },
            { id: "adminLog", label: "관리 이력", icon: <Icons.log size={15}/> },
            { id: "integration", label: "연동 설정", icon: <Icons.refresh size={15}/> },
          ]}
          active={tab} onChange={setTab}
        />
      </div>

      {tab === "accounts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: theme.textMuted }}>등록된 계정: <strong style={{ color: theme.text }}>{workers.length}명</strong></div>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Icons.plus size={14}/> 계정 추가</Button>
          </div>

          {/* Form */}
          {showForm && (
            <Card style={{ marginBottom: 20, borderColor: theme.accentBorder }}>
              <SectionTitle icon={editingId ? <Icons.edit size={16} color={theme.accent}/> : <Icons.plus size={16} color={theme.accent}/>}>
                {editingId ? "계정 수정" : "새 근로학생 계정"}
              </SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <Input label="이름" placeholder="예: 홍길동" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))}/>
                <Input label="근무시간" placeholder="예: 오전 (09–13시)" value={formData.shift} onChange={e => setFormData(p => ({...p, shift: e.target.value}))}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <Input label="로그인 아이디" placeholder="예: worker4 (3자 이상)" value={formData.username} onChange={e => setFormData(p => ({...p, username: e.target.value}))}/>
                <Input label="비밀번호" placeholder="4자 이상" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))}/>
              </div>
              {formError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: theme.radiusSm, background: theme.redBg, border: `1px solid ${theme.redBorder}`, color: theme.red, fontSize: 13, marginBottom: 14 }}>
                  <Icons.alert size={16}/> {formError}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={handleSave}>{editingId ? "수정 저장" : "계정 생성"}</Button>
                <Button variant="ghost" onClick={resetForm}>취소</Button>
              </div>
            </Card>
          )}

          {/* Worker List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {workers.map(worker => (
              <Card key={worker.id} style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: theme.accentBg, border: `1px solid ${theme.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icons.user size={18} color={theme.accent}/>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{worker.name}</div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 1 }}>{worker.shift}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 10, paddingLeft: 48 }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: theme.textDim }}>아이디: </span>
                        <code style={{ color: theme.accent, background: theme.accentBg, padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>{worker.username}</code>
                      </div>
                      <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: theme.textDim }}>비밀번호: </span>
                        <code style={{ color: theme.text, background: theme.surface, padding: "1px 6px", borderRadius: 3, fontSize: 12, fontFamily: theme.fontMono }}>
                          {showPassFor[worker.id] ? worker.password : "••••"}
                        </code>
                        <button onClick={() => togglePassVisibility(worker.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textDim, padding: 2 }}>
                          {showPassFor[worker.id] ? <Icons.eyeOff size={13}/> : <Icons.eye size={13}/>}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(worker)}><Icons.edit size={14}/></Button>
                    {confirmDelete === worker.id ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(worker.id)}>삭제</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>취소</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(worker.id)}><Icons.trash size={14}/></Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {workers.length === 0 && <Empty icon={<Icons.users size={32}/>} text="등록된 근로학생 계정이 없습니다"/>}
        </div>
      )}

      {tab === "discipline" && (
        <div>
          <SectionTitle icon={<Icons.alert size={16} color={theme.red}/>}>경고 누적</SectionTitle>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Input label="학번" value={warnForm.studentId} onChange={e => setWarnForm(p => ({ ...p, studentId: e.target.value }))}/>
              <Input label="이름" value={warnForm.name} onChange={e => setWarnForm(p => ({ ...p, name: e.target.value }))}/>
            </div>
            <Input label="사유 (선택)" value={warnForm.reason} onChange={e => setWarnForm(p => ({ ...p, reason: e.target.value }))}/>
            <div style={{ marginTop: 12 }}>
              <Button size="sm" onClick={addWarning}>경고 추가</Button>
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
            {Object.keys(warnings || {}).length === 0 ? (
              <Empty icon={<Icons.alert size={28}/>} text="경고 대상이 없습니다"/>
            ) : (
              Object.values(warnings).map((w, i) => (
                <div key={w.studentId} style={{ padding: "12px 18px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name || "(이름 없음)"} <span style={{ color: theme.textMuted }}>({w.studentId})</span></div>
                      <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>누적: {w.count}회 {w.reason ? `· ${w.reason}` : ""}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeWarning(w.studentId)}>삭제</Button>
                  </div>
                </div>
              ))
            )}
          </Card>

          <SectionTitle icon={<Icons.shield size={16} color={theme.red}/>}>블랙리스트</SectionTitle>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Input label="학번" value={blkForm.studentId} onChange={e => setBlkForm(p => ({ ...p, studentId: e.target.value }))}/>
              <Input label="이름" value={blkForm.name} onChange={e => setBlkForm(p => ({ ...p, name: e.target.value }))}/>
            </div>
            <Input label="사유 (선택)" value={blkForm.reason} onChange={e => setBlkForm(p => ({ ...p, reason: e.target.value }))}/>
            <div style={{ marginTop: 12 }}>
              <Button size="sm" variant="danger" onClick={addBlacklist}>블랙리스트 등록</Button>
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {Object.keys(blacklist || {}).length === 0 ? (
              <Empty icon={<Icons.shield size={28}/>} text="블랙리스트가 없습니다"/>
            ) : (
              Object.values(blacklist).map((b, i) => (
                <div key={b.studentId} style={{ padding: "12px 18px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name || "(이름 없음)"} <span style={{ color: theme.textMuted }}>({b.studentId})</span></div>
                      <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>{b.reason || "사유 없음"}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeBlacklist(b.studentId)}>해제</Button>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {tab === "community" && (
        <div>
          {/* 전시회 정보 관리 */}
          <SectionTitle icon={<Icons.edit size={16} color={theme.accent}/>}>전시회 정보 관리</SectionTitle>
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.accent, marginBottom: 12 }}>
              {exhEditingId ? "전시회 수정" : "새 전시회 등록"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Input label="전시 제목" value={exhForm.title || ""} onChange={e => setExhForm(p => ({ ...p, title: e.target.value }))}/>
              <Input label="장소" value={exhForm.location || ""} onChange={e => setExhForm(p => ({ ...p, location: e.target.value }))}/>
              <Input label="기간" placeholder="예: 2026.02.05 ~ 02.09" value={exhForm.dates || ""} onChange={e => setExhForm(p => ({ ...p, dates: e.target.value }))}/>
              <Input label="Instagram URL" value={exhForm.instagramUrl || ""} onChange={e => setExhForm(p => ({ ...p, instagramUrl: e.target.value }))}/>
            </div>
            <Input label="설명" value={exhForm.description || ""} onChange={e => setExhForm(p => ({ ...p, description: e.target.value }))}/>
            {/* 포스터 이미지 업로드 */}
            <input ref={exhPosterFileRef} type="file" accept="image/*" onChange={handlePosterUpload} style={{ display: "none" }}/>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>포스터 이미지</div>
              <button
                onClick={() => exhPosterFileRef.current?.click()}
                disabled={exhPosterUploading}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: exhPosterUploading ? "not-allowed" : "pointer",
                  padding: "10px 16px", background: theme.surface,
                  border: `1px solid ${theme.border}`, borderRadius: 8,
                  fontSize: 13, color: theme.text, transition: "all 0.2s",
                  fontFamily: theme.font, width: "100%", justifyContent: "flex-start",
                  opacity: exhPosterUploading ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!exhPosterUploading) { e.currentTarget.style.borderColor = theme.accent; }}}
                onMouseLeave={e => { if (!exhPosterUploading) { e.currentTarget.style.borderColor = theme.border; }}}
              >
                <Icons.upload size={16}/>
                {exhPosterFile ? exhPosterFile.name : (exhForm.posterUrl ? (exhForm.posterUrl.startsWith("data:") ? "이미지 업로드됨 (변경하려면 클릭)" : exhForm.posterUrl) : "포스터 이미지 업로드")}
              </button>
              {exhForm.posterUrl && (
                <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}`, maxHeight: 200 }}>
                  <img src={exhForm.posterUrl} alt="포스터 미리보기" style={{ width: "100%", height: "auto", display: "block", maxHeight: 200, objectFit: "cover" }}/>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
              <Button size="sm" onClick={() => {
                if (!exhForm.title?.trim()) return;
                if (exhEditingId) {
                  setExhibitionPosts(prev => prev.map(p => p.id === exhEditingId ? { ...p, ...exhForm } : p));
                  addLog(`[관리자] 전시회 수정: "${exhForm.title}"`, "admin");
                } else {
                  const newPost = { ...exhForm, id: `exh${Date.now()}`, createdAt: new Date().toISOString() };
                  setExhibitionPosts(prev => [newPost, ...prev]);
                  addLog(`[관리자] 전시회 등록: "${exhForm.title}"`, "admin");
                }
                setExhForm({ title: "", description: "", dates: "", location: "", instagramUrl: "", posterUrl: "" });
                setExhEditingId(null);
                setExhPosterFile(null);
                setExhSaved(true);
                setTimeout(() => setExhSaved(false), 2000);
              }}>
                {exhEditingId ? "수정 저장" : "등록"}
              </Button>
              {exhEditingId && (
                <Button size="sm" variant="ghost" onClick={() => {
                  setExhForm({ title: "", description: "", dates: "", location: "", instagramUrl: "", posterUrl: "" });
                  setExhEditingId(null);
                  setExhPosterFile(null);
                }}>취소</Button>
              )}
              {exhSaved && <span style={{ fontSize: 12, color: theme.green, fontWeight: 600 }}>저장되었습니다</span>}
            </div>
          </Card>

          {/* 등록된 전시회 목록 */}
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
              등록된 전시회 목록입니다. 전시회 홍보 탭에 표시됩니다.
            </div>
            {!exhibitionPosts?.length ? (
              <Empty icon={<Icons.list size={28}/>} text="등록된 전시회가 없습니다"/>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {exhibitionPosts.map((post, idx) => (
                  <div key={post.id} style={{
                    padding: "14px 16px",
                    borderBottom: idx < exhibitionPosts.length - 1 ? `1px solid ${theme.border}` : "none",
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 12 }}>
                      {post.posterUrl && (
                        <img src={post.posterUrl} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: 13, color: theme.text, fontWeight: 600, marginBottom: 4 }}>{post.title}</div>
                        <div style={{ fontSize: 11, color: theme.textDim }}>
                          📅 {post.dates || "미정"} · 📍 {post.location || "미정"}
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", gap: 4 }}>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setExhForm({ title: post.title || "", description: post.description || "", dates: post.dates || "", location: post.location || "", instagramUrl: post.instagramUrl || "", posterUrl: post.posterUrl || "" });
                        setExhEditingId(post.id);
                        setExhPosterFile(null);
                      }}>
                        <Icons.edit size={14}/> 수정
                      </Button>
                      {exhDeleteConfirm === post.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button size="sm" variant="danger" onClick={() => {
                            setExhibitionPosts(prev => prev.filter(p => p.id !== post.id));
                            setExhDeleteConfirm(null);
                            addLog(`[관리자] 전시회 삭제: "${post.title}"`, "admin");
                          }}>확인</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExhDeleteConfirm(null)}>취소</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setExhDeleteConfirm(post.id)} style={{ color: theme.red }}>
                          <Icons.trash size={14}/> 삭제
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 커뮤니티 글 관리 */}
          <SectionTitle icon={<Icons.list size={16} color={theme.accent}/>}>커뮤니티 글 관리</SectionTitle>
          <Card>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
              로그인 페이지 커뮤니티 탭에 표시되는 익명 게시글을 관리합니다. 부적절한 글이나 댓글을 삭제할 수 있습니다.
            </div>
            {!communityPosts?.length ? (
              <Empty icon={<Icons.list size={28}/>} text="커뮤니티 글이 없습니다"/>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {communityPosts.map((post, idx) => (
                  <div key={post.id} style={{ borderBottom: idx < communityPosts.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                    {/* 글 헤더 */}
                    <div
                      style={{
                        padding: "14px 16px",
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                        cursor: post.comments?.length > 0 ? "pointer" : "default",
                        background: cmExpandedPostId === post.id ? "rgba(212, 160, 83, 0.05)" : "transparent",
                        transition: "background 0.2s",
                      }}
                      onClick={() => {
                        if (post.comments?.length > 0) {
                          setCmExpandedPostId(cmExpandedPostId === post.id ? null : post.id);
                          setCmCommentDeleteConfirm(null);
                        }
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5, marginBottom: 6, wordBreak: "break-word" }}>{post.content}</div>
                        <div style={{ display: "flex", gap: 12, fontSize: 11, color: theme.textDim }}>
                          <span>{new Date(post.createdAt).toLocaleString("ko-KR")}</span>
                          <span style={{ color: post.comments?.length > 0 ? theme.accent : theme.textDim }}>
                            💬 댓글 {post.comments?.length || 0}개 {post.comments?.length > 0 ? (cmExpandedPostId === post.id ? "▲" : "▼") : ""}
                          </span>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {cmDeleteConfirm === post.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <Button size="sm" variant="danger" onClick={() => {
                              setCommunityPosts(prev => prev.filter(p => p.id !== post.id));
                              setCmDeleteConfirm(null);
                              addLog(`[관리자] 커뮤니티 글 삭제: "${post.content.slice(0, 20)}..."`, "admin");
                            }}>확인</Button>
                            <Button size="sm" variant="ghost" onClick={() => setCmDeleteConfirm(null)}>취소</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setCmDeleteConfirm(post.id)} style={{ color: theme.red }}>
                            <Icons.trash size={14}/> 삭제
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* 댓글 목록 (펼침) */}
                    {cmExpandedPostId === post.id && post.comments?.length > 0 && (
                      <div style={{ padding: "0 16px 14px 32px", background: "rgba(0,0,0,0.15)" }}>
                        {post.comments.map((comment) => (
                          <div key={comment.id} style={{
                            padding: "8px 0",
                            borderBottom: `1px solid rgba(255,255,255,0.05)`,
                            display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.4, marginBottom: 3 }}>
                                ↳ {comment.content}
                              </div>
                              <div style={{ fontSize: 10, color: theme.textDim }}>
                                {new Date(comment.createdAt).toLocaleString("ko-KR")}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0 }}>
                              {cmCommentDeleteConfirm === comment.id ? (
                                <div style={{ display: "flex", gap: 4 }}>
                                  <Button size="sm" variant="danger" onClick={() => {
                                    setCommunityPosts(prev => prev.map(p =>
                                      p.id === post.id
                                        ? { ...p, comments: p.comments.filter(c => c.id !== comment.id) }
                                        : p
                                    ));
                                    setCmCommentDeleteConfirm(null);
                                    addLog(`[관리자] 댓글 삭제: "${comment.content.slice(0, 20)}..."`, "admin");
                                  }}>확인</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setCmCommentDeleteConfirm(null)}>취소</Button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCmCommentDeleteConfirm(comment.id)}
                                  style={{
                                    padding: "3px 8px", border: "none", borderRadius: 3,
                                    background: "transparent", color: theme.textDim,
                                    fontSize: 10, cursor: "pointer", fontFamily: theme.font,
                                    display: "flex", alignItems: "center", gap: 4,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.color = theme.red}
                                  onMouseLeave={e => e.currentTarget.style.color = theme.textDim}
                                >
                                  <Icons.trash size={12}/> 삭제
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "adminLog" && (
        <div>
          <SectionTitle icon={<Icons.log size={16} color={theme.accent}/>}>관리자 작업 이력</SectionTitle>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {adminLogs.length === 0 ? (
              <Empty icon={<Icons.log size={28}/>} text="관리 이력이 없습니다"/>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {adminLogs.map(log => (
                  <div key={log.id} style={{ padding: "12px 18px", borderBottom: `1px solid ${theme.border}`, borderLeft: `3px solid ${theme.red}` }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <code style={{ fontSize: 11, color: theme.textDim, fontFamily: theme.fontMono, whiteSpace: "nowrap", marginTop: 1 }}>{log.time}</code>
                      <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{log.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "certificates" && (
        <div>
          <SectionTitle icon={<Icons.file size={16} color={theme.blue}/>}>수료증 관리</SectionTitle>
          <Card>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
              학생들이 업로드한 안전교육 수료증을 확인하고 관리합니다.
            </div>
            {!Object.keys(certificates || {}).length ? (
              <Empty icon={<Icons.file size={28}/>} text="업로드된 수료증이 없습니다"/>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.entries(certificates).map(([studentId, cert]) => (
                  <Card 
                    key={studentId} 
                    style={{ background: theme.surface, padding: 14, cursor: "pointer" }} 
                    hover
                    onClick={() => setCertModal(cert)}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ padding: 12, background: theme.blueBg, borderRadius: theme.radiusSm, border: `1px solid ${theme.blueBorder}` }}>
                        <Icons.file size={24} color={theme.blue}/>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{cert.studentName || studentId}</span>
                          <Badge color="blue">수료증</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>
                          학번: {studentId} · 파일명: {cert.fileName}
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 11, color: theme.textDim }}>
                          <span>크기: {(cert.fileSize / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>업로드: {new Date(cert.uploadDate).toLocaleString("ko-KR")}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: theme.blue, fontWeight: 600 }}>
                        클릭하여 확인 →
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "integration" && (
        <div>
          <SectionTitle icon={<Icons.refresh size={16} color={theme.accent}/>}>구글 시트 연동</SectionTitle>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
              예약 발생 시 구글 시트로 실시간 전송됩니다. Google Apps Script 웹앱 URL을 입력하세요.
            </div>
            <Input
              label="Google Apps Script Web App URL"
              placeholder="https://script.google.com/macros/s/XXX/exec"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button size="sm" onClick={saveSheetConfig} disabled={!sheetUrl.trim()}>저장</Button>
              <Button size="sm" variant="ghost" onClick={() => setSheetUrl("")}>초기화</Button>
            </div>
          </Card>
          <Card style={{ background: theme.blueBg, borderColor: theme.blueBorder, padding: 14 }}>
            <div style={{ fontSize: 12, color: theme.blue, lineHeight: 1.6 }}>
              시트로 전송되는 데이터: 학생 정보, 실기실, 날짜/시간, 목적, 인원, 생성시간.
              CORS 허용과 POST 수신이 가능한 웹앱으로 배포되어야 합니다.
            </div>
          </Card>
        </div>
      )}

      {/* Certificate Preview Modal */}
      {certModal && (
        <div style={{ 
          position: "fixed", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: "rgba(0,0,0,0.85)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          zIndex: 9999,
          padding: 20
        }}
        onClick={() => setCertModal(null)}
        >
          <div style={{ 
            background: theme.card, 
            borderRadius: theme.radius, 
            border: `1px solid ${theme.border}`,
            maxWidth: 900,
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto",
            padding: 24
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                  안전교육 수료증 확인
                </div>
                <div style={{ fontSize: 13, color: theme.textMuted }}>
                  {certModal.studentName || "이름 없음"} ({certModal.studentId})
                </div>
              </div>
              <button 
                onClick={() => setCertModal(null)}
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: theme.textMuted, 
                  cursor: "pointer", 
                  fontSize: 24,
                  padding: 4
                }}
              >
                <Icons.x size={20}/>
              </button>
            </div>

            <div style={{ 
              background: theme.surface, 
              borderRadius: theme.radiusSm, 
              padding: 16,
              marginBottom: 20,
              maxHeight: "60vh",
              overflow: "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}>
              {certModal.fileType?.startsWith("image/") ? (
                <img 
                  src={certModal.data} 
                  alt="수료증" 
                  style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
                />
              ) : certModal.fileType === "application/pdf" ? (
                <iframe 
                  src={certModal.data} 
                  style={{ width: "100%", height: "60vh", border: "none" }}
                  title="PDF 수료증"
                />
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
                  <Icons.file size={48} style={{ opacity: 0.5, marginBottom: 12 }}/>
                  <div style={{ fontSize: 14 }}>미리보기를 지원하지 않는 파일 형식입니다</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>{certModal.fileName}</div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, fontSize: 12, color: theme.textDim, marginBottom: 20, padding: "12px 16px", background: theme.surface, borderRadius: theme.radiusSm }}>
              <span>파일명: {certModal.fileName}</span>
              <span>•</span>
              <span>크기: {(certModal.fileSize / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>업로드: {new Date(certModal.uploadDate).toLocaleString("ko-KR")}</span>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button 
                variant="ghost" 
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = certModal.data;
                  link.download = certModal.fileName;
                  link.click();
                }}
              >
                <Icons.download size={16}/> 다운로드
              </Button>
              <Button 
                variant="success" 
                onClick={() => approveCertificate(certModal)}
                disabled={approving}
              >
                <Icons.check size={16}/> {approving ? "처리 중..." : "이상없음 (승인)"}
              </Button>
              <Button 
                variant="danger" 
                onClick={() => {
                  if (window.confirm(`${certModal.studentName}(${certModal.studentId})의 수료증을 반려하시겠습니까?`)) {
                    rejectCertificate(certModal);
                  }
                }}
              >
                <Icons.x size={16}/> 반려
              </Button>
              <Button variant="ghost" onClick={() => setCertModal(null)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
