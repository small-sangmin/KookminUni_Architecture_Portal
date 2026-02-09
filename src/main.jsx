import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css";
import firebaseStore from "./firebase";

if (!window.storage) {
  const SERVER_PREFIX = "portal";
  const MIGRATION_FLAG_KEY = "__server_migrated_v1__";
  const STORAGE_TIMEOUT_MS = 2000;
  const serverKey = (key) => `${SERVER_PREFIX}/${key}`;
  const withTimeout = (promise, fallbackValue) =>
    Promise.race([
      promise,
      new Promise((resolve) => setTimeout(() => resolve(fallbackValue), STORAGE_TIMEOUT_MS)),
    ]);

  window.storage = {
    async get(key) {
      const fromServer = await withTimeout(firebaseStore.get(serverKey(key)), "__timeout__");
      if (fromServer === "__timeout__") {
        const local = localStorage.getItem(key);
        return local ? { value: local } : null;
      }
      if (typeof fromServer === "string") return { value: fromServer };
      if (fromServer === null || fromServer === undefined) return null;
      return { value: JSON.stringify(fromServer) };
    },
    async set(key, value) {
      const ok = await withTimeout(firebaseStore.set(serverKey(key), value), false);
      if (ok) return true;
      localStorage.setItem(key, value);
      return true;
    },
    async list(prefix) {
      const all = await withTimeout(firebaseStore.listByPrefix(SERVER_PREFIX), null);
      if (Array.isArray(all)) {
        const keys = all
          .map(({ name }) => name.replace(`${SERVER_PREFIX}/`, ""))
          .filter((name) => name.startsWith(prefix))
          .map((name) => ({ name }));
        return { keys };
      }
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push({ name: k });
      }
      return { keys };
    },
  };

  (async () => {
    const alreadyMigrated = await firebaseStore.get(serverKey(MIGRATION_FLAG_KEY));
    if (alreadyMigrated) return;

    const writes = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (value === null) continue;
      writes.push(firebaseStore.set(serverKey(key), value));
    }
    await Promise.all(writes);
    await firebaseStore.set(serverKey(MIGRATION_FLAG_KEY), "1");
  })().catch((error) => {
    console.error("Initial migration to server storage failed:", error);
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


