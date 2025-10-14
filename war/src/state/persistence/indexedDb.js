const DB_NAME = "rune-ration";
const STORE_NAME = "game-state";
const KEY = "profile";

const hasIndexedDb = () => typeof indexedDB !== "undefined";

const openDatabase = () =>
  new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

export const loadFromIndexedDb = async () => {
  try {
    const db = await openDatabase();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  } catch (error) {
    console.warn("IndexedDB load failed", error);
    return null;
  }
};

export const saveToIndexedDb = async (state) => {
  try {
    const db = await openDatabase();
    if (!db) return false;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(state, KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
    return true;
  } catch (error) {
    console.warn("IndexedDB save failed", error);
    return false;
  }
};
