// ─── Storage Layer ───────────────────────────────────────────────
const store = {
  async get(key) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, val) {
    // null을 전달하면 Firebase에서 해당 노드가 삭제됨 (set(ref, null))
    try { await window.storage.set(key, val === null ? null : JSON.stringify(val)); return true; }
    catch { return false; }
  },
  async listByPrefix(prefix) {
    try {
      const r = await window.storage.list(prefix);
      return r?.keys || [];
    } catch { return []; }
  }
};

export default store;
