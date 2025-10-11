import { updateState, getState } from "./state.js";

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function applyCardEffects() {
  updateState((state) => {
    let {
      treasury,
      happiness,
      pollution,
      population,
      infrastructure,
      activeCards
    } = state;

    let upkeep = 0;
    let incomeBoost = 0;

    activeCards = activeCards.map((card) => {
      const effects = card.effects ?? {};
      treasury += effects.treasury ?? 0;
      happiness += effects.happiness ?? 0;
      pollution += effects.pollution ?? 0;
      population += effects.population ?? 0;
      infrastructure += effects.infrastructure ?? 0;
      upkeep += card.upkeep ?? 0;
      incomeBoost += effects.income ?? 0;
      return card;
    });

    return {
      ...state,
      treasury,
      happiness,
      pollution,
      population,
      infrastructure,
      upkeep,
      incomeBoost,
      activeCards
    };
  });
}

export function simulateTurn() {
  updateState((state) => {
    const upkeep = state.upkeep ?? 0;
    const incomeBoost = state.incomeBoost ?? 0;

    const perCapita = state.population * 0.2;
    const treasury = state.treasury + perCapita + incomeBoost - upkeep;
    const pollution = state.pollution;
    const happiness = clamp(state.happiness - pollution / 50);
    const population = Math.max(0, Math.floor(state.population + happiness / 10));
    const infrastructureLoad = population / 20;
    const infrastructure = clamp(state.infrastructure - infrastructureLoad / 5 + 2);

    return {
      ...state,
      treasury,
      pollution: clamp(pollution),
      happiness: clamp(happiness),
      population,
      infrastructure,
      upkeep,
      incomeBoost
    };
  });
}

export function resolveCosts(playedCards) {
  updateState((state) => {
    let treasury = state.treasury;
    for (const card of playedCards) {
      treasury -= card.cost ?? 0;
    }
    return { ...state, treasury };
  });
}

export function checkEndConditions() {
  const state = getState();
  if (state.happiness <= 0 || state.treasury < -100) {
    return endGame(true);
  }
  if (state.turn > 20) {
    return endGame(false);
  }
  return false;
}

export function endGame(failed) {
  updateState((state) => ({ ...state, ended: true, failed }));
  return true;
}

export function computeScore() {
  const state = getState();
  return (
    state.population * 0.1 +
    state.treasury * 0.5 +
    state.happiness * 2 -
    state.pollution * 1.2
  );
}
