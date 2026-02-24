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
  bg: "#f4f5f8", surface: "#eaeef2", surfaceHover: "#dfe4e9",
  card: "#ffffff", border: "#d9dce1", borderLight: "#e2e5ea",
  text: "#2b2d31", textMuted: "#6b6e76", textDim: "#9ea2aa",
  accent: "#d9972b", accentDim: "#b07b23",
  accentBg: "rgba(217,151,43,0.12)", accentBorder: "rgba(217,151,43,0.3)",
  blue: "#357abd", blueBg: "rgba(53,122,189,0.1)", blueBorder: "rgba(53,122,189,0.25)",
  green: "#409e63", greenBg: "rgba(64,158,99,0.1)", greenBorder: "rgba(64,158,99,0.25)",
  red: "#c94638", redBg: "rgba(201,70,56,0.08)", redBorder: "rgba(201,70,56,0.2)",
  yellow: "#c2a334", yellowBg: "rgba(194,163,52,0.1)", yellowBorder: "rgba(194,163,52,0.2)",
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
