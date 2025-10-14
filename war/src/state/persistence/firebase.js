const CLOUD_STORAGE_KEY = "rune-ration-cloud";

const hasLocalStorage = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch (error) {
    return false;
  }
};

const readFromStorage = (key) => {
  if (!hasLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to load Firebase snapshot", error);
    return null;
  }
};

const writeToStorage = (key, value) => {
  if (!hasLocalStorage()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Failed to persist Firebase snapshot", error);
    return false;
  }
};

export const loadFirebaseSnapshot = async () => {
  return readFromStorage(CLOUD_STORAGE_KEY);
};

export const saveFirebaseSnapshot = async (state) => {
  return writeToStorage(CLOUD_STORAGE_KEY, state);
};

export const mergeStateWithCloud = (localState, cloudState) => {
  if (!cloudState) return localState;
  if (!localState) return structuredClone(cloudState);

  const merged = structuredClone(localState);

  merged.relics = {
    crafted: Array.from(
      new Set([...(localState.relics?.crafted ?? []), ...(cloudState.relics?.crafted ?? [])])
    ),
  };

  merged.onboarding = {
    completed: Boolean(localState.onboarding?.completed || cloudState.onboarding?.completed),
    currentStep: localState.onboarding?.currentStep ?? 0,
  };

  const localEventEnd = localState.realm?.eventExpiresAt ?? 0;
  const cloudEventEnd = cloudState.realm?.eventExpiresAt ?? 0;
  merged.realm =
    cloudEventEnd > localEventEnd
      ? { ...localState.realm, ...cloudState.realm }
      : structuredClone(localState.realm);

  const combinedLeaderboard = [...(cloudState.alliance?.leaderboard ?? [])];
  if (localState.alliance?.leaderboard) {
    localState.alliance.leaderboard.forEach((entry) => {
      const existing = combinedLeaderboard.find((cloudEntry) => cloudEntry.name === entry.name);
      if (existing) {
        existing.score = Math.max(existing.score, entry.score);
      } else {
        combinedLeaderboard.push(structuredClone(entry));
      }
    });
  }

  merged.alliance = {
    ...cloudState.alliance,
    ...localState.alliance,
    contributed: Math.max(
      cloudState.alliance?.contributed ?? 0,
      localState.alliance?.contributed ?? 0
    ),
    leaderboard: combinedLeaderboard
      .filter((entry) => entry?.name)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 8),
  };

  if (
    (cloudState.battle?.lastResult?.timestamp ?? 0) >
    (localState.battle?.lastResult?.timestamp ?? 0)
  ) {
    merged.battle = {
      ...localState.battle,
      lastResult: cloudState.battle.lastResult,
    };
  }

  return merged;
};

let pendingSave = null;

export const queueFirebaseSave = (state) => {
  if (!hasLocalStorage()) return;
  if (pendingSave) {
    clearTimeout(pendingSave);
  }
  const snapshot = JSON.parse(JSON.stringify(state));
  pendingSave = setTimeout(() => {
    saveFirebaseSnapshot(snapshot);
    pendingSave = null;
  }, 500);
};
