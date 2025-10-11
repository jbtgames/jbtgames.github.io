import { getState, updateState } from "./state.js";
import { createRng } from "./rng.js";

const archetypes = [
  {
    name: "Neo Haven",
    archetype: "Industrialist",
    bias: { growth: 0.6, eco: 0.2, welfare: 0.2 }
  },
  {
    name: "Asteria",
    archetype: "Eco Utopia",
    bias: { growth: 0.3, eco: 0.5, welfare: 0.2 }
  },
  {
    name: "Beacon City",
    archetype: "Civic Tech",
    bias: { growth: 0.4, eco: 0.2, welfare: 0.4 }
  }
];

export function initializeAi(deck) {
  updateState((state) => {
    const aiCities = archetypes.map((config, index) => ({
      ...config,
      treasury: 400 + index * 40,
      happiness: 55,
      pollution: 25,
      deck: deck
        .slice(index * 8, index * 8 + 12)
        .map((card, idx) => ({ ...card, instanceId: `${card.id}-ai${index}-${idx}` })),
      hand: deck
        .slice(index * 8, index * 8 + 5)
        .map((card, idx) => ({ ...card, instanceId: `${card.id}-ai${index}-h${idx}` })),
      population: 800 + index * 150,
      infrastructure: 90,
      rngSeed: state.rngSeed + index * 13
    }));
    return { ...state, aiCities };
  });
}

function scoreCard(card, ai, state, rng) {
  const effects = card.effects ?? {};
  const { bias } = ai;
  const growth = (effects.treasury ?? 0) + (effects.population ?? 0);
  const eco = -(effects.pollution ?? 0) + (effects.infrastructure ?? 0);
  const welfare = (effects.happiness ?? 0);
  const randomness = (rng.random() - 0.5) * 5;
  return (
    growth * bias.growth + eco * bias.eco + welfare * bias.welfare + randomness
  );
}

export function aiTakeTurn() {
  updateState((state) => {
    if (state.ended) return state;
    const rng = createRng(state.rngSeed + state.turn * 3);
    const aiCities = state.aiCities.map((aiCity, idx) => {
      const localRng = createRng(aiCity.rngSeed + state.turn);
      const hand = aiCity.hand ?? [];
      const scored = hand
        .slice()
        .sort((a, b) => scoreCard(b, aiCity, state, localRng) - scoreCard(a, aiCity, state, localRng))
        .slice(0, 3);
      let treasury = aiCity.treasury;
      let happiness = aiCity.happiness;
      let pollution = aiCity.pollution;
      let population = aiCity.population;

      for (const card of scored) {
        treasury -= card.cost ?? 0;
        const effects = card.effects ?? {};
        treasury += effects.treasury ?? 0;
        happiness += effects.happiness ?? 0;
        pollution += effects.pollution ?? 0;
        population += effects.population ?? 0;
      }

      const retained = [];
      const discard = [...(aiCity.discard ?? []), ...scored];
      for (const card of hand) {
        if (scored.includes(card)) continue;
        const remaining = (card.remaining ?? card.duration) - 1;
        if (remaining > 0) {
          retained.push({ ...card, remaining });
        }
      }
      const filteredHand = retained;
      const extraCards = Math.max(0, 5 - filteredHand.length);
      const deck = aiCity.deck ?? [];
      const drawn = [];
      for (let i = 0; i < extraCards; i++) {
        const next = deck[(aiCity.deckPointer ?? 0) + i];
        if (!next) break;
        drawn.push({ ...next });
      }

      return {
        ...aiCity,
        treasury,
        happiness,
        pollution,
        population,
        hand: [...filteredHand, ...drawn],
        discard,
        deck,
        deckPointer: (aiCity.deckPointer ?? 0) + drawn.length,
        rngSeed: aiCity.rngSeed + idx + state.turn
      };
    });

    return { ...state, aiCities };
  });
}
