import { cardById } from "../data/cards.js";
import { units } from "../data/units.js";
import { createMulberry32, pickFromArray, normalizeSeed } from "../utils/random.js";

const computeArmyStats = (composition) => {
  return Object.entries(composition).reduce(
    (acc, [unitId, { count }]) => {
      const unit = units[unitId];
      if (!unit || count <= 0) return acc;
      acc.attack += unit.attack * count;
      acc.defense += unit.defense * count;
      acc.hp += unit.hp * count;
      acc.upkeep.food += (unit.upkeep.food ?? 0) * count;
      acc.upkeep.gold += (unit.upkeep.gold ?? 0) * count;
      acc.upkeep.mana += (unit.upkeep.mana ?? 0) * count;
      return acc;
    },
    { attack: 0, defense: 0, hp: 0, upkeep: { food: 0, gold: 0, mana: 0 } }
  );
};

const applyArmyModifiers = (stats, modifiers = {}) => {
  return {
    ...stats,
    attack: stats.attack * (modifiers.attackMultiplier ?? 1),
    defense: stats.defense * (modifiers.defenseMultiplier ?? 1),
    morale: modifiers.moraleBonus ?? 0,
    heal: modifiers.healBonus ?? 0,
    control: modifiers.controlBonus ?? 0,
    variance: modifiers.varianceBonus ?? 0,
    leech: modifiers.leechBonus ?? 0,
  };
};

const drawCard = (deck, rng) => {
  if (!deck.length) return null;
  const cardId = pickFromArray(deck, rng);
  const card = cardById[cardId];
  if (!card) return null;
  return card;
};

const applyCardEffect = (stats, card) => {
  if (!card) {
    return {
      ...stats,
      log: "No card played.",
    };
  }
  const effect = card.effect ?? {};
  const varianceBonus = effect.variance ?? (effect.morale ? effect.morale * 1.5 : 0);
  return {
    ...stats,
    attack: stats.attack + (effect.attackBoost ?? 0),
    defense: stats.defense + (effect.defenseBoost ?? 0),
    morale: (stats.morale ?? 0) + (effect.morale ?? 0),
    shred: (stats.shred ?? 0) + (effect.shred ?? 0),
    heal: (stats.heal ?? 0) + (effect.heal ?? 0),
    control: (stats.control ?? 0) + (effect.control ?? 0),
    leech: (stats.leech ?? 0) + (effect.leech ?? 0),
    variance: (stats.variance ?? 0) + varianceBonus,
    log: effect.description,
  };
};

const resolveDamage = (attacker, defender, rng) => {
  const base = attacker.attack - defender.defense * 0.4;
  const moraleBonus = (attacker.morale ?? 0) * 2 - (defender.morale ?? 0);
  const controlPenalty = (defender.control ?? 0) * 1.5;
  const shred = attacker.shred ?? 0;
  const variance = (attacker.variance ?? 0) * (rng() * 0.6 + 0.4);
  const randomDrift = (rng() - 0.5) * 6;
  const damage = Math.max(0, base + moraleBonus - controlPenalty + shred + variance + randomDrift);
  return damage;
};

export const runBattleSimulation = ({
  seed,
  playerArmy,
  playerDeck,
  ghostDeck,
  ghostArmy,
  playerModifiers = {},
  ghostModifiers = {},
}) => {
  const normalizedSeed = normalizeSeed(seed);
  const rng = createMulberry32(normalizedSeed);
  const rounds = [];
  const playerStats = applyArmyModifiers(computeArmyStats(playerArmy), playerModifiers);
  const ghostStats = applyArmyModifiers(computeArmyStats(ghostArmy), ghostModifiers);

  let playerHp = playerStats.hp;
  let ghostHp = ghostStats.hp;

  for (let round = 1; round <= 5; round += 1) {
    const playerCard = drawCard(playerDeck, rng);
    const ghostCard = drawCard(ghostDeck, rng);

    const playerBuff = applyCardEffect(
      {
        attack: playerStats.attack,
        defense: playerStats.defense,
        morale: playerStats.morale,
        heal: playerStats.heal,
        control: playerStats.control,
        variance: playerStats.variance,
        leech: playerStats.leech,
      },
      playerCard
    );
    const ghostBuff = applyCardEffect(
      {
        attack: ghostStats.attack,
        defense: ghostStats.defense,
        morale: ghostStats.morale,
        heal: ghostStats.heal,
        control: ghostStats.control,
        variance: ghostStats.variance,
        leech: ghostStats.leech,
      },
      ghostCard
    );

    const playerDamage = resolveDamage(playerBuff, ghostBuff, rng);
    const ghostDamage = resolveDamage(ghostBuff, playerBuff, rng);

    ghostHp = Math.max(0, ghostHp - playerDamage + (ghostBuff.heal ?? 0));
    playerHp = Math.max(0, playerHp - ghostDamage + (playerBuff.heal ?? 0));

    if (playerBuff.leech) {
      playerHp = Math.min(playerStats.hp, playerHp + playerBuff.leech);
      ghostHp = Math.max(0, ghostHp - playerBuff.leech * 0.5);
    }

    rounds.push({
      round,
      playerCard: playerCard?.name ?? "No Card",
      playerCardText: playerBuff.log,
      ghostCard: ghostCard?.name ?? "No Card",
      ghostCardText: ghostBuff.log,
      playerDamage: Number(playerDamage.toFixed(1)),
      ghostDamage: Number(ghostDamage.toFixed(1)),
      playerHp: Number(playerHp.toFixed(1)),
      ghostHp: Number(ghostHp.toFixed(1)),
    });

    if (playerHp <= 0 || ghostHp <= 0) {
      break;
    }
  }

  const winner =
    playerHp === ghostHp
      ? "draw"
      : playerHp > ghostHp
      ? "player"
      : "ghost";

  return {
    rounds,
    winner,
    remaining: {
      playerHp: Number(playerHp.toFixed(1)),
      ghostHp: Number(ghostHp.toFixed(1)),
    },
    seed: normalizedSeed,
  };
};
