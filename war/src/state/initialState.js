import { cards } from "../data/cards.js";
import { buildingDefinitions } from "../data/buildings.js";
import { unitList } from "../data/units.js";
import { ghostArmies } from "../data/ghosts.js";

const defaultResource = (label, amount, baseRate) => ({
  label,
  amount,
  baseRate,
  rate: baseRate,
});

export const createInitialState = () => ({
  version: 1,
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
});
