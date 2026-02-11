// ─── Utility Functions ───────────────────────────────────────────
export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const ts = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

export const dateStr = () => new Date().toISOString().split("T")[0];

export const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };

export const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; };

export const formatDate = (d) => { if (!d) return ""; const [y, m, dd] = d.split("-"); return `${m}/${dd}`; };

export const ACTIVE_PORTAL_SESSION_KEY = "kmu_active_portal_session";
