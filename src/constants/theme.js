// ─── Shared Styles ───────────────────────────────────────────────
export const darkColors = {
  bg: "#1a1b1e", surface: "#222326", surfaceHover: "#2a2b2f",
  card: "#252629", border: "#1c1e22", borderLight: "#252830",
  text: "#e4e2de", textMuted: "#7a7d85", textDim: "#4a4d55",
  accent: "#d4a053", accentDim: "#8b6b38",
  accentBg: "rgba(212,160,83,0.08)", accentBorder: "rgba(212,160,83,0.2)",
  blue: "#4a90d9", blueBg: "rgba(74,144,217,0.08)", blueBorder: "rgba(74,144,217,0.2)",
  green: "#5cb87a", greenBg: "rgba(92,184,122,0.08)", greenBorder: "rgba(92,184,122,0.2)",
  red: "#d45d5d", redBg: "rgba(212,93,93,0.08)", redBorder: "rgba(212,93,93,0.2)",
  yellow: "#d4b34a", yellowBg: "rgba(212,179,74,0.08)", yellowBorder: "rgba(212,179,74,0.15)",
};

export const lightColors = {
  bg: "#f0f1f3", surface: "#e8e9ec", surfaceHover: "#dcdde0",
  card: "#ffffff", border: "#d0d2d6", borderLight: "#c0c2c6",
  text: "#1a1b1e", textMuted: "#5a5d65", textDim: "#9a9da5",
  accent: "#e8a832", accentDim: "#b8862d",
  accentBg: "rgba(232,168,50,0.12)", accentBorder: "rgba(232,168,50,0.3)",
  blue: "#2e73c0", blueBg: "rgba(46,115,192,0.1)", blueBorder: "rgba(46,115,192,0.25)",
  green: "#3a9a58", greenBg: "rgba(58,154,88,0.1)", greenBorder: "rgba(58,154,88,0.25)",
  red: "#c0392b", redBg: "rgba(192,57,43,0.08)", redBorder: "rgba(192,57,43,0.2)",
  yellow: "#b89a2a", yellowBg: "rgba(184,154,42,0.1)", yellowBorder: "rgba(184,154,42,0.2)",
};

// Mutable theme object - updated at render time via Object.assign(theme, darkColors/lightColors)
const theme = {
  ...darkColors,
  font: "'DM Sans', 'Noto Sans KR', sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  radius: 10,
  radiusSm: 6,
};

export default theme;
