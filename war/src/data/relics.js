export const relicCatalog = [
  {
    id: "ember-signet",
    name: "Ember Signet",
    description: "Crystalized forge heat woven into a ring. Increases mana flow and weapon ferocity.",
    cost: { gold: 120, crystals: 60, mana: 40 },
    economy: { manaFlat: 0.6 },
    battle: { attackMultiplier: 0.06 },
  },
  {
    id: "verdant-heart",
    name: "Verdant Heart",
    description: "A living core harvested from the undergrowth. Sustains troops and bolsters healing.",
    cost: { gold: 90, food: 120, souls: 10 },
    economy: { foodFlat: 0.9 },
    battle: { healBonus: 5, defenseMultiplier: 0.04 },
  },
  {
    id: "gloom-censer",
    name: "Gloom Censer",
    description: "A censer of chained souls that whisper battle insight. Enhances souls and card control.",
    cost: { gold: 140, souls: 18, mana: 55 },
    economy: { soulsFlat: 0.25 },
    battle: { controlBonus: 1.5, moraleBonus: 1 },
  },
];

export const relicById = Object.fromEntries(relicCatalog.map((relic) => [relic.id, relic]));
