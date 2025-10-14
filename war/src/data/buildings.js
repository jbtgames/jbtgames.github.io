export const buildingDefinitions = {
  forge: {
    id: "forge",
    label: "Rune Forge",
    description: "Enchants weapons and refines crystals for arcane work.",
    rateEffects: {
      mana: 0.6,
      crystals: 0.4,
    },
    baseCost: {
      gold: 60,
      crystals: 20,
    },
    costGrowth: 1.6,
    flavor: "Smoldering crucibles temper mana into runes.",
  },
  barracks: {
    id: "barracks",
    label: "Dominion Barracks",
    description: "Train disciplined infantry and maintain garrison morale.",
    rateEffects: {
      food: 0.8,
      gold: -0.5,
    },
    baseCost: {
      gold: 80,
      food: 50,
    },
    costGrowth: 1.55,
    flavor: "Marching drills echo through the ruin tunnels.",
  },
  granary: {
    id: "granary",
    label: "Underkeep Granary",
    description: "Preserves hunted game and fungal harvests.",
    rateEffects: {
      food: 1.2,
    },
    baseCost: {
      gold: 45,
      mana: 20,
    },
    costGrowth: 1.5,
    flavor: "Cool caverns keep supplies from rot.",
  },
  mageTower: {
    id: "mageTower",
    label: "Mage Tower",
    description: "Amplifies ley currents and refines souls.",
    rateEffects: {
      mana: 1,
      souls: 0.2,
    },
    baseCost: {
      gold: 90,
      mana: 40,
      crystals: 35,
    },
    costGrowth: 1.65,
    flavor: "Prisms hum with reclaimed resonance.",
  },
};

export const getUpgradeCost = (buildingId, level) => {
  const def = buildingDefinitions[buildingId];
  if (!def) return {};
  const factor = Math.pow(def.costGrowth, level - 1);
  return Object.fromEntries(
    Object.entries(def.baseCost).map(([resource, amount]) => [
      resource,
      Math.round(amount * factor),
    ])
  );
};
