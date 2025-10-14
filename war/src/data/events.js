export const realmEvents = [
  {
    id: "blood-moon",
    name: "Blood Moon",
    description:
      "Souls spill freely while armies strike with reckless abandon. Mana surges but food spoils faster.",
    durationHours: 6,
    resourceMultipliers: {
      souls: 1.5,
      mana: 1.2,
      food: 0.8,
    },
    battleModifiers: {
      player: { attackMultiplier: 1.12, moraleBonus: 1 },
      ghost: { attackMultiplier: 1.05 },
    },
  },
  {
    id: "verdant-tide",
    name: "Verdant Tide",
    description:
      "Fungal groves flourish, feeding troops and lending resilience. Arcane output steadies but crystals flow slower.",
    durationHours: 6,
    resourceMultipliers: {
      food: 1.4,
      gold: 1.1,
      crystals: 0.85,
    },
    battleModifiers: {
      player: { defenseMultiplier: 1.1, healBonus: 4 },
      ghost: { defenseMultiplier: 1.05 },
    },
  },
  {
    id: "emberwake",
    name: "Emberwake",
    description:
      "The forge blazes white hot. Crystal lattices scream, empowering command cards while upkeep strains supplies.",
    durationHours: 6,
    resourceMultipliers: {
      crystals: 1.5,
      mana: 1.1,
      gold: 0.9,
    },
    battleModifiers: {
      player: { attackMultiplier: 1.08, varianceBonus: 0.2 },
      ghost: { controlBonus: 1 },
    },
  },
];

export const realmEventById = Object.fromEntries(realmEvents.map((event) => [event.id, event]));

export const getRealmEvent = (id) => realmEventById[id] ?? realmEvents[0];

export const getNextRealmEventId = (currentId) => {
  if (!currentId) return realmEvents[0].id;
  const index = realmEvents.findIndex((event) => event.id === currentId);
  if (index === -1) return realmEvents[0].id;
  const nextIndex = (index + 1) % realmEvents.length;
  return realmEvents[nextIndex].id;
};
