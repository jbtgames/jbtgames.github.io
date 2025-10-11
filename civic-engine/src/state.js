const STORAGE_KEY = "civic-engine-save";

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export const defaultState = {
  turn: 1,
  treasury: 500,
  population: 1000,
  happiness: 60,
  pollution: 10,
  infrastructure: 100,
  deck: [],
  discard: [],
  hand: [],
  deckPointer: 0,
  activeCards: [],
  aiCities: [],
  events: [],
  rngSeed: Date.now() % 2147483647,
  ended: false
};

let state = clone(defaultState);

const subscribers = new Set();

function notify() {
  for (const cb of subscribers) cb(state);
}

export function subscribe(cb) {
  subscribers.add(cb);
  cb(state);
  return () => subscribers.delete(cb);
}

export function getState() {
  return state;
}

export function setState(partial) {
  state = { ...state, ...partial };
  notify();
  persist();
}

export function resetState(base) {
  state = clone(base ?? defaultState);
  notify();
  persist();
}

export function updateState(updater) {
  state = updater(state);
  notify();
  persist();
}

export function persist() {
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (err) {
    console.warn("Unable to save", err);
  }
}

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    state = { ...clone(defaultState), ...parsed };
    notify();
    return true;
  } catch (err) {
    console.warn("Unable to load save", err);
    return false;
  }
}

export function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}
