import { defaultState, loadState, resetState, getState, updateState } from "./state.js";
import { initializeDeck, drawCards, cleanupTurn, drawNewHand } from "./deck.js";
import { initializeAi, aiTakeTurn } from "./ai.js";
import { applyCardEffects, simulateTurn, checkEndConditions } from "./sim.js";
import { maybeTriggerEvent, resolveEvents } from "./events.js";
import { initUi } from "./ui.js";

async function bootstrap() {
  const loaded = loadState();
  if (!loaded) {
    resetState(defaultState);
  }

  initUi();

  const cardsData = await loadCards();
  const cards = cardsData.map((card) => ({ ...card }));
  if (!loaded || getState().deck.length === 0) {
    initializeDeck(cards);
  }
  if (!loaded || getState().aiCities.length === 0) {
    initializeAi(cards);
  }

  drawCards(Math.max(0, 5 - getState().hand.length));

  gameLoop();
}

function gameLoop() {
  const state = getState();
  if (state.endTurnRequested && !state.ended) {
    processTurn();
  }
  requestAnimationFrame(gameLoop);
}

function processTurn() {
  aiTakeTurn();
  applyCardEffects();
  simulateTurn();
  maybeTriggerEvent();
  resolveEvents();
  cleanupTurn();

  updateState((state) => ({
    ...state,
    turn: state.turn + 1,
    endTurnRequested: false
  }));

  drawNewHand();

  checkEndConditions();
}

async function loadCards() {
  try {
    const response = await fetch(new URL("./cards.json", import.meta.url));
    if (!response.ok) {
      throw new Error(`Failed to load cards (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    showFatalError("Unable to load game data. Please refresh the page.");
    throw error;
  }
}

function showFatalError(message) {
  const container = document.getElementById("app");
  if (!container) return;
  container.innerHTML = `<div class="error">${message}</div>`;
}

bootstrap().catch((error) => {
  console.error("Civic Engine failed to start", error);
});
