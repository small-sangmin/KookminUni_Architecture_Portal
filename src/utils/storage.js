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
  },
  // 로컬 전용 저장소 (로그인 기억 등 개인 기기에서만 유지해야 하는 데이터)
  localGet(key) {
    try { const v = localStorage.getItem(`_local_${key}`); return v ? JSON.parse(v) : null; }
    catch { return null; }
  },
  localSet(key, val) {
    try {
      if (val === null || val === undefined) localStorage.removeItem(`_local_${key}`);
      else localStorage.setItem(`_local_${key}`, JSON.stringify(val));
      return true;
    } catch { return false; }
  }
};

export default store;
