import { updateState } from "./state.js";
import { createRng } from "./rng.js";

const baseEvents = [
  {
    id: "event_drought",
    name: "Drought",
    description: "Water shortage strains services.",
    trigger: (state) => state.pollution > 60,
    effects: { happiness: -5, treasury: -30 }
  },
  {
    id: "event_tourism_boom",
    name: "Tourism Boom",
    description: "Visitors flock to the city.",
    trigger: (state) => state.happiness > 70,
    effects: { treasury: 40, pollution: 3 }
  },
  {
    id: "event_tech_award",
    name: "GovTech Award",
    description: "Recognition for digital services.",
    trigger: (state) => state.turn % 5 === 0,
    effects: { treasury: 25, happiness: 4 }
  }
];

export function maybeTriggerEvent() {
  updateState((state) => {
    if (state.ended) return state;
    const rng = createRng(state.rngSeed + state.turn * 7);
    const shouldTrigger = state.turn % 3 === 0 || rng.random() > 0.75;
    if (!shouldTrigger) return state;

    const candidates = baseEvents.filter((event) => event.trigger(state));
    if (candidates.length === 0) return state;
    const event = candidates[Math.floor(rng.random() * candidates.length)];

    const events = [
      ...state.events,
      {
        id: event.id,
        name: event.name,
        description: event.description,
        effects: event.effects
      }
    ];

    return { ...state, events };
  });
}

export function resolveEvents() {
  updateState((state) => {
    if (state.events.length === 0) return state;
    let { treasury, happiness, pollution, events } = state;
    const [event, ...rest] = events;
    treasury += event.effects.treasury ?? 0;
    happiness += event.effects.happiness ?? 0;
    pollution += event.effects.pollution ?? 0;
    return {
      ...state,
      treasury,
      happiness,
      pollution,
      events: rest,
      lastEvent: event
    };
  });
}

export function clearLastEvent() {
  updateState((state) => ({ ...state, lastEvent: null }));
}
