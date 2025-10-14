export const units = {
  sanctumGuard: {
    id: "sanctumGuard",
    name: "Sanctum Guard",
    faction: "Sanctum",
    attack: 6,
    defense: 8,
    hp: 28,
    upkeep: { food: 2, gold: 1 },
    description: "Shieldwall defenders who anchor the front.",
  },
  dominionSpears: {
    id: "dominionSpears",
    name: "Dominion Spears",
    faction: "Dominion",
    attack: 8,
    defense: 5,
    hp: 24,
    upkeep: { food: 2, gold: 2 },
    description: "Disciplined pikelines that counter cavalry.",
  },
  wildRangers: {
    id: "wildRangers",
    name: "Wild Rangers",
    faction: "Wild",
    attack: 7,
    defense: 4,
    hp: 20,
    upkeep: { food: 1, gold: 1 },
    description: "Camouflaged archers that harry from afar.",
  },
  arcaneWarden: {
    id: "arcaneWarden",
    name: "Arcane Warden",
    faction: "Arcane",
    attack: 5,
    defense: 6,
    hp: 22,
    upkeep: { food: 1, gold: 2, mana: 1 },
    description: "Rune casters that stabilize the weave.",
  },
};

export const unitList = Object.values(units);
