import { loadFromIndexedDb, saveToIndexedDb } from "./indexedDb.js";

const LOCAL_STORAGE_KEY = "rune-ration-state";

const hasLocalStorage = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch (error) {
    return false;
  }
};

const loadFromLocalStorage = () => {
  if (!hasLocalStorage()) return null;
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse localStorage state", error);
    return null;
  }
};

const saveToLocalStorage = (state) => {
  if (!hasLocalStorage()) return false;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("Failed to persist to localStorage", error);
    return false;
  }
};

export const loadGameState = async () => {
  const stored = await loadFromIndexedDb();
  if (stored) return stored;
  return loadFromLocalStorage();
};

export const saveGameState = async (state) => {
  const snapshot = JSON.parse(JSON.stringify(state));
  const saved = await saveToIndexedDb(snapshot);
  if (!saved) {
    saveToLocalStorage(snapshot);
  }
};

export const setupAutosave = (store) => {
  let timeout = null;
  store.subscribe((state) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      saveGameState(state);
    }, 350);
  });
};
