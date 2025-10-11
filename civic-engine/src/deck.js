import { updateState, getState } from "./state.js";
import { shuffle, createRng } from "./rng.js";

export function initializeDeck(cards) {
  updateState((state) => {
    const rng = createRng(state.rngSeed);
    const deck = shuffle(
      cards.map((card, index) => ({ ...card, instanceId: `${card.id}-p-${index}` })),
      rng
    );
    return {
      ...state,
      deck,
      discard: [],
      hand: deck.slice(0, 5),
      deckPointer: 5,
      activeCards: []
    };
  });
}

export function drawCards(count = 1) {
  updateState((state) => {
    if (state.ended) return state;
    let { deck, discard, hand, deckPointer } = state;
    const rng = createRng(state.rngSeed + state.turn);
    const nextHand = [...hand];

    for (let i = 0; i < count; i++) {
      if (deckPointer >= deck.length) {
        deck = shuffle(discard, rng);
        discard = [];
        deckPointer = 0;
        if (deck.length === 0) break;
      }
      nextHand.push(deck[deckPointer]);
      deckPointer += 1;
    }

    return { ...state, deck, discard, hand: nextHand, deckPointer };
  });
}

export function discardHand() {
  updateState((state) => {
    const discard = [...state.discard, ...state.hand];
    return { ...state, discard, hand: [] };
  });
}

export function playCard(cardId) {
  const state = getState();
  if (state.ended) return false;
  const card = state.hand.find((c) => c.id === cardId);
  if (!card) return false;
  if (state.hand.filter((c) => c.playedThisTurn).length >= 3) return false;
  if (state.treasury - card.cost < -200) return false;

  updateState((prev) => {
    const hand = prev.hand.map((c) =>
      c.id === cardId ? { ...c, playedThisTurn: true, remaining: c.duration } : c
    );
    const activeCards = [...prev.activeCards, { ...card, remaining: card.duration }];
    const treasury = prev.treasury - card.cost;
    return { ...prev, hand, activeCards, treasury };
  });
  return true;
}

export function cleanupTurn() {
  updateState((state) => {
    const played = state.hand.filter((c) => c.playedThisTurn);
    const remainingHand = state.hand.filter((c) => !c.playedThisTurn);
    const discard = [...state.discard, ...played];
    const hand = remainingHand.map((card) => ({ ...card, playedThisTurn: false }));
    const activeCards = state.activeCards
      .map((card) => ({ ...card, remaining: (card.remaining ?? card.duration) - 1 }))
      .filter((card) => card.remaining > 0);
    return { ...state, discard, hand, activeCards };
  });
}

export function removeExpired() {
  updateState((state) => {
    const activeCards = state.activeCards.filter((card) => card.remaining > 0);
    return { ...state, activeCards };
  });
}

export function drawNewHand() {
  discardHand();
  drawCards(5);
}
