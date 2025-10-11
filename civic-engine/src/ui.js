import { subscribe, updateState, getState } from "./state.js";
import { playCard, drawNewHand } from "./deck.js";
import { computeScore } from "./sim.js";
import { clearLastEvent } from "./events.js";

const statElements = new Map();
let selectedCardId = null;

export function initUi() {
  document.querySelectorAll(".stat").forEach((element) => {
    statElements.set(element.dataset.key, element.querySelector("span"));
  });

  const handList = document.getElementById("handList");
  const deckDialog = document.getElementById("deckDialog");
  const deckList = document.getElementById("deckList");
  const eventDialog = document.getElementById("eventDialog");
  const eventCloseBtn = document.getElementById("eventCloseBtn");

  document.getElementById("playCardBtn").addEventListener("click", () => {
    if (!selectedCardId) return;
    playCard(selectedCardId);
    selectedCardId = null;
    renderHand(getState().hand);
    updatePlayButton();
  });

  document.getElementById("endTurnBtn").addEventListener("click", () => {
    updateState((state) => ({ ...state, pendingEndTurn: true }));
  });

  document.getElementById("viewDeckBtn").addEventListener("click", () => {
    deckList.innerHTML = "";
    const state = getState();
    state.deck.forEach((card) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${card.name}</span><span>${card.type}</span>`;
      deckList.appendChild(li);
    });
    deckDialog.showModal();
  });

  document.getElementById("closeDeckBtn").addEventListener("click", () => {
    deckDialog.close();
  });

  eventCloseBtn.addEventListener("click", () => {
    clearLastEvent();
    eventDialog.close();
  });

  subscribe((state) => {
    renderStats(state);
    renderHand(state.hand);
    renderEvent(state.lastEvent);
    updatePlayButton(state);
    if (state.ended) showEnd(state);
    if (state.pendingEndTurn) {
      updateState((s) => ({ ...s, pendingEndTurn: false, endTurnRequested: true }));
    }
  });

  setupCanvas();

  handList.addEventListener("click", (event) => {
    const li = event.target.closest("li[data-card]");
    if (!li) return;
    if (li.classList.contains("played")) return;
    const cardId = li.dataset.card;
    if (selectedCardId === cardId) {
      const played = playCard(cardId);
      if (played) {
        selectedCardId = null;
      }
    } else {
      selectedCardId = cardId;
    }
    renderHand(getState().hand);
    updatePlayButton();
  });
}

function renderStats(state) {
  for (const [key, element] of statElements) {
    const value = state[key];
    if (typeof value === "number") {
      element.textContent = Math.round(value);
    }
  }
}

function renderHand(hand) {
  const handList = document.getElementById("handList");
  handList.innerHTML = "";
  hand.forEach((card) => {
    const li = document.createElement("li");
    li.dataset.card = card.id;
    li.classList.toggle("selected", card.id === selectedCardId);
    if (card.playedThisTurn) {
      li.classList.add("played");
    }
    li.innerHTML = `
      <div class="card-title">${card.name}</div>
      <div class="card-meta">${card.type} • Cost ${card.cost}</div>
      <div class="card-meta">Effects: ${formatEffects(card.effects)}</div>
      ${card.playedThisTurn ? '<div class="card-meta">Queued</div>' : ""}
    `;
    handList.appendChild(li);
  });
}

function formatEffects(effects = {}) {
  return Object.entries(effects)
    .map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`)
    .join(", ");
}

function updatePlayButton(state = getState()) {
  const button = document.getElementById("playCardBtn");
  const playedCount = state.hand.filter((card) => card.playedThisTurn).length;
  const canPlay = selectedCardId && playedCount < 3;
  button.disabled = !canPlay;
}

function renderEvent(event) {
  const dialog = document.getElementById("eventDialog");
  if (!event) return;
  document.getElementById("eventTitle").textContent = event.name;
  document.getElementById("eventDescription").textContent = event.description;
  if (!dialog.open) dialog.showModal();
}

function showEnd(state) {
  const dialog = document.getElementById("eventDialog");
  document.getElementById("eventTitle").textContent = state.failed
    ? "City Collapses"
    : "20 Years Later";
  const score = computeScore().toFixed(0);
  document.getElementById("eventDescription").textContent = `Score: ${score}`;
  if (!dialog.open) dialog.showModal();
}

function setupCanvas() {
  const canvas = document.getElementById("cityCanvas");
  const ctx = canvas.getContext("2d");
  const draw = () => {
    const { happiness, pollution } = getState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#123";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const skylineHeight = 60 + happiness;
    const pollutionOpacity = Math.min(0.8, pollution / 100);

    ctx.fillStyle = `rgba(80, 140, 200, 0.8)`;
    ctx.fillRect(40, canvas.height - skylineHeight, 40, skylineHeight);
    ctx.fillRect(100, canvas.height - skylineHeight * 0.8, 60, skylineHeight * 0.8);
    ctx.fillRect(190, canvas.height - skylineHeight * 0.6, 30, skylineHeight * 0.6);

    ctx.fillStyle = `rgba(120, 150, 170, ${pollutionOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(draw);
  };
  draw();
}
