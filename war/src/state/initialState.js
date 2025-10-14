import { cards } from "../data/cards.js";
import { buildingDefinitions } from "../data/buildings.js";
import { unitList } from "../data/units.js";
import { ghostArmies } from "../data/ghosts.js";
import { realmEvents } from "../data/events.js";

const defaultResource = (label, amount, baseRate) => ({
  label,
  amount,
  baseRate,
  rate: baseRate,
});

const initialEvent = realmEvents[0];

export const createInitialState = () => ({
  version: 2,
  lastTick: Date.now(),
  resources: {
    mana: defaultResource("Mana", 120, 2),
    food: defaultResource("Food", 80, 1.2),
    crystals: defaultResource("Crystals", 45, 0.5),
    souls: defaultResource("Souls", 12, 0.12),
    gold: defaultResource("Gold", 200, 2.8),
  },
  buildings: Object.fromEntries(
    Object.keys(buildingDefinitions).map((key) => [
      key,
      { level: 1 },
    ])
  ),
  army: Object.fromEntries(
    unitList.map((unit) => [
      unit.id,
      {
        count: 2,
      },
    ])
  ),
  deck: {
    active: [
      "sanctum-aegis",
      "dominion-charge",
      "dominion-charge",
      "wild-snare",
      "wild-snare",
      "arcane-burst",
      "arcane-veil",
      "emerald-mend",
      "bastion-call",
      "luminous-rally",
      "dominion-barrage",
      "wild-howl",
    ],
    library: cards.map((card) => card.id),
  },
  battle: {
    selectedGhostId: ghostArmies[0].id,
    lastResult: null,
  },
  realm: {
    activeEventId: initialEvent.id,
    eventExpiresAt: Date.now() + initialEvent.durationHours * 60 * 60 * 1000,
    lastRotationAt: Date.now(),
  },
  relics: {
    crafted: [],
  },
  alliance: {
    name: "Echo Lattice",
    rank: 823,
    weeklyGoal: 9000,
    contributed: 4820,
    lastSynced: Date.now(),
    featuredRaid: {
      ghostId: ghostArmies[1]?.id ?? ghostArmies[0].id,
      progress: 0.34,
    },
    leaderboard: [
      { name: "Echo Lattice", score: 4820 },
      { name: "Iron Chorus", score: 4550 },
      { name: "Gloom Harvest", score: 4410 },
      { name: "Obsidian Choir", score: 3980 },
    ],
  },
  onboarding: {
    completed: false,
    currentStep: 0,
  },
});
