// ─── SVG Icons ───────────────────────────────────────────────────
const I = ({ d, size = 18, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  door: (p) => <I {...p} d={<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><circle cx="15" cy="12" r="1" fill="currentColor" /></>} />,
  tool: (p) => <I {...p} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
  check: (p) => <I {...p} d="M20 6L9 17l-5-5" />,
  x: (p) => <I {...p} d="M18 6L6 18M6 6l12 12" />,
  bell: (p) => <I {...p} d={<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></>} />,
  lock: (p) => <I {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>} />,
  unlock: (p) => <I {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 019.9-1" /></>} />,
  user: (p) => <I {...p} d={<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />,
  clock: (p) => <I {...p} d={<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>} />,
  calendar: (p) => <I {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>} />,
  log: (p) => <I {...p} d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8M16 17H8M10 9H8" /></>} />,
  home: (p) => <I {...p} d={<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></>} />,
  download: (p) => <I {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>} />,
  search: (p) => <I {...p} d={<><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>} />,
  alert: (p) => <I {...p} d={<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>} />,
  refresh: (p) => <I {...p} d={<><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></>} />,
  arrowLeft: (p) => <I {...p} d="M19 12H5M12 19l-7-7 7-7" />,
  list: (p) => <I {...p} d={<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>} />,
  grid: (p) => <I {...p} d={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>} />,
  info: (p) => <I {...p} d={<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>} />,
  logout: (p) => <I {...p} d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>} />,
  history: (p) => <I {...p} d={<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>} />,
  filter: (p) => <I {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3" />,
  package: (p) => <I {...p} d={<><path d="M16.5 9.4l-9-5.19" /><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05" /><path d="M12 22.08V12" /></>} />,
  shield: (p) => <I {...p} d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>} />,
  edit: (p) => <I {...p} d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>} />,
  trash: (p) => <I {...p} d={<><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></>} />,
  plus: (p) => <I {...p} d="M12 5v14M5 12h14" />,
  users: (p) => <I {...p} d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>} />,
  eye: (p) => <I {...p} d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>} />,
  eyeOff: (p) => <I {...p} d={<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" /><path d="M14.12 14.12a3 3 0 11-4.24-4.24" /></>} />,
  upload: (p) => <I {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></>} />,
  file: (p) => <I {...p} d={<><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M13 2v7h7" /></>} />,
  loading: (p) => <I {...p} d={<><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></>} style={{ animation: "spin 1s linear infinite", ...p?.style }} />,
  sun: (p) => <I {...p} d={<><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>} />,
  moon: (p) => <I {...p} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
};

export default Icons;
