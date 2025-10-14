import { units } from "./units.js";

export const ghostArmies = [
  {
    id: "ashen-lancers",
    name: "Ashen Lancers",
    description: "An order of spectral knights that refuse to yield.",
    power: "Attrition specialists",
    seed: 1337,
    units: {
      sanctumGuard: 6,
      dominionSpears: 4,
      wildRangers: 2,
    },
    deck: [
      "sanctum-aegis",
      "bastion-call",
      "dominion-charge",
      "wild-snare",
      "arcane-veil",
      "dominion-barrage",
      "wild-howl",
      "arcane-burst",
    ],
  },
  {
    id: "ember-sages",
    name: "Ember Sages",
    description: "Pyromancers that wield volcanic familiars.",
    power: "Burst casters",
    seed: 421,
    units: {
      arcaneWarden: 5,
      wildRangers: 3,
      dominionSpears: 2,
    },
    deck: [
      "arcane-burst",
      "arcane-burst",
      "arcane-veil",
      "soul-binding",
      "emerald-mend",
      "wild-snare",
      "soul-surge",
      "luminous-rally",
    ],
  },
  {
    id: "feral-swarm",
    name: "Feral Swarm",
    description: "Packlords and skittering beasts that overwhelm.",
    power: "Morale drain",
    seed: 987,
    units: {
      wildRangers: 6,
      dominionSpears: 3,
      sanctumGuard: 2,
    },
    deck: [
      "wild-howl",
      "wild-snare",
      "emerald-mend",
      "dominion-charge",
      "bastion-call",
      "dominion-barrage",
      "arcane-veil",
      "arcane-burst",
    ],
  },
];

export const getGhostArmy = (id) =>
  ghostArmies.find((ghost) => ghost.id === id) ?? ghostArmies[0];

export const resolveGhostUnitStats = (ghost) =>
  Object.entries(ghost.units).map(([unitId, count]) => ({
    ...units[unitId],
    count,
  }));
