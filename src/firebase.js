// Firebase 설정 파일
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, remove, onValue, update } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA3yT_4no9dn4v1GIVpUkYeLjQo8jrcSAM",
  authDomain: "kookminarchiportal.firebaseapp.com",
  databaseURL: "https://kookminarchiportal-default-rtdb.firebaseio.com",
  projectId: "kookminarchiportal",
  storageBucket: "kookminarchiportal.firebasestorage.app",
  messagingSenderId: "196510835085",
  appId: "1:196510835085:web:8ccb9df98c9fd849539dc4",
  measurementId: "G-83HGXX5H9E"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// ─── Firebase Store API ───────────────────────────────────────────────
export const firebaseStore = {
  async get(key) {
    try {
      const snapshot = await get(ref(database, key));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error(`Firebase get error (${key}):`, error);
      return null;
    }
  },

  async set(key, value) {
    try {
      await set(ref(database, key), value);
      return true;
    } catch (error) {
      console.error(`Firebase set error (${key}):`, error);
      return false;
    }
  },

  async update(key, value) {
    try {
      await update(ref(database, key), value);
      return true;
    } catch (error) {
      console.error(`Firebase update error (${key}):`, error);
      return false;
    }
  },

  async push(key, value) {
    try {
      const newRef = push(ref(database, key));
      await set(newRef, value);
      return newRef.key;
    } catch (error) {
      console.error(`Firebase push error (${key}):`, error);
      return null;
    }
  },

  async remove(key) {
    try {
      await remove(ref(database, key));
      return true;
    } catch (error) {
      console.error(`Firebase remove error (${key}):`, error);
      return false;
    }
  },

  subscribe(key, callback) {
    const unsubscribe = onValue(ref(database, key), (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    }, (error) => {
      console.error(`Firebase subscribe error (${key}):`, error);
    });
    return unsubscribe;
  },

  async listByPrefix(prefix) {
    try {
      const snapshot = await get(ref(database, prefix));
      if (!snapshot.exists()) return [];
      const data = snapshot.val();
      return Object.keys(data).map(name => ({ name: `${prefix}/${name}` }));
    } catch (error) {
      console.error(`Firebase listByPrefix error (${prefix}):`, error);
      return [];
    }
  }
};

export { database, ref, onValue };
export default firebaseStore;
