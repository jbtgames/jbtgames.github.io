import { createStore } from "./state/store.js";
import { createInitialState } from "./state/initialState.js";
import { loadGameState, setupAutosave } from "./state/persistence/index.js";
import { buildingDefinitions, getUpgradeCost } from "./data/buildings.js";
import { unitList, units } from "./data/units.js";
import { cards, cardById } from "./data/cards.js";
import { ghostArmies, getGhostArmy } from "./data/ghosts.js";
import { getRealmEvent, getNextRealmEventId } from "./data/events.js";
import { relicCatalog, relicById } from "./data/relics.js";
import { runBattleSimulation } from "./sim/battle.js";

const DECK_LIMIT = 12;
const resourceBarEl = document.querySelector("#resource-bar");
const panelEl = document.querySelector("#panel");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const realmEventButton = document.querySelector("#realm-event");
const onboardingOverlay = document.querySelector("#onboarding-overlay");

const ONBOARDING_STEPS = [
  {
    id: "resources",
    tab: "resources",
    title: "Stabilize the Flow",
    description:
      "Resources trickle constantly. Monitor the green rates and keep them positive before you attempt any deployments.",
  },
  {
    id: "build",
    tab: "build",
    title: "Reignite the Foundry",
    description:
      "Upgrade any structure or forge a relic to permanently accelerate production. Relics consume stockpiled resources but never decay.",
    requirement: (state) => Object.values(state.buildings ?? {}).some((building) => building.level > 1) || state.relics?.crafted?.length,
    requirementText: "Upgrade a building or forge your first relic to proceed.",
  },
  {
    id: "deck",
    tab: "deck",
    title: "Tune Your Command Deck",
    description:
      "Every battle plays five rounds. Fill all twelve card slots so the simulation has tactical options to draw from.",
    requirement: (state) => (state.deck?.active?.length ?? 0) >= DECK_LIMIT,
    requirementText: "Fill the command deck to 12 cards to continue.",
  },
  {
    id: "alliance",
    tab: "alliance",
    title: "Link to the Alliance",
    description:
      "Contribute to the shared raid or sync with the Firebase relay to earn weekly rewards. Cooperation unlocks ghost army intel.",
  },
];

let realmTooltipOpen = false;
let battlePlaybackInterval = null;

const triggerBattleVisual = (effect = "shake") => {
  if (!panelEl) return;
  const classes = ["battle-visual-shake", "battle-visual-glow"];
  panelEl.classList.remove(...classes);
  // force reflow
  void panelEl.offsetWidth;
  const className = effect === "glow" ? "battle-visual-glow" : "battle-visual-shake";
  panelEl.classList.add(className);
  setTimeout(() => {
    panelEl.classList.remove(className);
  }, effect === "glow" ? 900 : 450);
};

const highlightOnboardingTab = (tabId) => {
  tabButtons.forEach((button) => {
    const shouldPulse = tabId && button.dataset.tab === tabId;
    button.classList.toggle("tab-button--pulse", shouldPulse);
  });
};

const renderOnboarding = (state) => {
  if (!onboardingOverlay) return;
  if (state.onboarding?.completed) {
    onboardingOverlay.classList.add("hidden");
    highlightOnboardingTab(null);
    return;
  }
  const step = ONBOARDING_STEPS[state.onboarding?.currentStep ?? 0] ?? ONBOARDING_STEPS[0];
  highlightOnboardingTab(step.tab);
  if (store && state.activeTab !== step.tab) {
    store.setState({ activeTab: step.tab });
    return;
  }
  const requirementMet = step.requirement ? step.requirement(state) : true;
  const requirementText = step.requirementText && !requirementMet ? `<p class="panel-note">${step.requirementText}</p>` : "";
  const isLastStep = (state.onboarding?.currentStep ?? 0) >= ONBOARDING_STEPS.length - 1;

  onboardingOverlay.innerHTML = `
    <article class="onboarding-card">
      <h2>${step.title}</h2>
      <p>${step.description}</p>
      ${requirementText}
      <footer>
        <button class="button button--ghost" data-onboarding-skip type="button">Skip</button>
        <button class="button button--primary" data-onboarding-next type="button" ${
          requirementMet ? "" : "disabled"
        }>${isLastStep ? "Begin Siege" : "Next"}</button>
      </footer>
    </article>
  `;
  onboardingOverlay.classList.remove("hidden");

  const nextButton = onboardingOverlay.querySelector("[data-onboarding-next]");
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      advanceOnboarding();
    });
  }
  const skipButton = onboardingOverlay.querySelector("[data-onboarding-skip]");
  if (skipButton) {
    skipButton.addEventListener("click", () => {
      completeOnboarding();
    });
  }
};

const advanceOnboarding = () => {
  if (!store) return;
  store.setState((state) => {
    if (state.onboarding.completed) return {};
    const nextStep = state.onboarding.currentStep + 1;
    if (nextStep >= ONBOARDING_STEPS.length) {
      return {
        onboarding: {
          ...state.onboarding,
          completed: true,
        },
      };
    }
    const nextTab = ONBOARDING_STEPS[nextStep]?.tab ?? state.activeTab;
    return {
      onboarding: {
        ...state.onboarding,
        currentStep: nextStep,
      },
      activeTab: nextTab,
    };
  });
};

const completeOnboarding = () => {
  if (!store) return;
  store.setState((state) => {
    if (state.onboarding.completed) return {};
    return {
      onboarding: {
        ...state.onboarding,
        completed: true,
      },
    };
  });
};

const formatNumber = (value) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  if (value >= 100) {
    return value.toFixed(0);
  }
  return value.toFixed(1);
};

const formatRate = (value) => (value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2));

const clampRate = (value) => Math.round(value * 100) / 100;

const collectEconomyModifiers = (state) => {
  const multipliers = {};
  const flats = {};

  const event = getRealmEvent(state.realm?.activeEventId);
  if (event?.resourceMultipliers) {
    Object.entries(event.resourceMultipliers).forEach(([resource, multiplier]) => {
      if (typeof multiplier !== "number") return;
      multipliers[resource] = (multipliers[resource] ?? 1) * multiplier;
    });
  }

  (state.relics?.crafted ?? []).forEach((relicId) => {
    const relic = relicById[relicId];
    if (!relic?.economy) return;
    if (relic.economy.manaFlat) flats.mana = (flats.mana ?? 0) + relic.economy.manaFlat;
    if (relic.economy.foodFlat) flats.food = (flats.food ?? 0) + relic.economy.foodFlat;
    if (relic.economy.soulsFlat) flats.souls = (flats.souls ?? 0) + relic.economy.soulsFlat;
    if (relic.economy.crystalsFlat) flats.crystals = (flats.crystals ?? 0) + relic.economy.crystalsFlat;
    if (relic.economy.goldFlat) flats.gold = (flats.gold ?? 0) + relic.economy.goldFlat;
    if (relic.economy.manaMultiplier)
      multipliers.mana = (multipliers.mana ?? 1) * (1 + relic.economy.manaMultiplier);
    if (relic.economy.foodMultiplier)
      multipliers.food = (multipliers.food ?? 1) * (1 + relic.economy.foodMultiplier);
    if (relic.economy.soulsMultiplier)
      multipliers.souls = (multipliers.souls ?? 1) * (1 + relic.economy.soulsMultiplier);
    if (relic.economy.crystalsMultiplier)
      multipliers.crystals = (multipliers.crystals ?? 1) * (1 + relic.economy.crystalsMultiplier);
    if (relic.economy.goldMultiplier)
      multipliers.gold = (multipliers.gold ?? 1) * (1 + relic.economy.goldMultiplier);
  });

  return { multipliers, flats };
};

const collectBattleModifiers = (state) => {
  const player = {
    attackMultiplier: 1,
    defenseMultiplier: 1,
    moraleBonus: 0,
    healBonus: 0,
    controlBonus: 0,
    varianceBonus: 0,
    leechBonus: 0,
  };
  const ghost = { ...player };

  const applySource = (target, source) => {
    if (!source) return;
    if (typeof source.attackMultiplier === "number") {
      target.attackMultiplier *= source.attackMultiplier > 1 ? source.attackMultiplier : 1 + source.attackMultiplier;
    }
    if (typeof source.defenseMultiplier === "number") {
      target.defenseMultiplier *= source.defenseMultiplier > 1 ? source.defenseMultiplier : 1 + source.defenseMultiplier;
    }
    if (typeof source.moraleBonus === "number") {
      target.moraleBonus += source.moraleBonus;
    }
    if (typeof source.healBonus === "number") {
      target.healBonus += source.healBonus;
    }
    if (typeof source.controlBonus === "number") {
      target.controlBonus += source.controlBonus;
    }
    if (typeof source.varianceBonus === "number") {
      target.varianceBonus += source.varianceBonus;
    }
    if (typeof source.leechBonus === "number") {
      target.leechBonus += source.leechBonus;
    }
  };

  const event = getRealmEvent(state.realm?.activeEventId);
  applySource(player, event?.battleModifiers?.player);
  applySource(ghost, event?.battleModifiers?.ghost);

  (state.relics?.crafted ?? []).forEach((relicId) => {
    const relic = relicById[relicId];
    if (!relic?.battle) return;
    applySource(player, relic.battle);
  });

  return { player, ghost };
};

const calculateResourceRates = (state) => {
  const totals = Object.fromEntries(
    Object.entries(state.resources).map(([key, resource]) => [key, resource.baseRate ?? 0])
  );

  Object.entries(state.buildings).forEach(([buildingId, building]) => {
    const def = buildingDefinitions[buildingId];
    if (!def) return;
    const level = building.level ?? 0;
    Object.entries(def.rateEffects).forEach(([resourceKey, perLevel]) => {
      totals[resourceKey] = (totals[resourceKey] ?? 0) + perLevel * level;
    });
  });

  const economy = collectEconomyModifiers(state);

  return Object.fromEntries(
    Object.entries(state.resources).map(([key, resource]) => [
      key,
      {
        ...resource,
        rate: clampRate((totals[key] ?? resource.baseRate ?? 0) * (economy.multipliers[key] ?? 1) + (economy.flats[key] ?? 0)),
      },
    ])
  );
};

const sanitizeState = (storedState) => {
  const base = createInitialState();
  const state = {
    ...base,
    resources: Object.fromEntries(
      Object.entries(base.resources).map(([key, resource]) => {
        const stored = storedState?.resources?.[key] ?? {};
        const amount = typeof stored.amount === "number" ? stored.amount : resource.amount;
        return [
          key,
          {
            ...resource,
            amount,
          },
        ];
      })
    ),
    buildings: Object.fromEntries(
      Object.entries(base.buildings).map(([key, building]) => {
        const storedLevel = storedState?.buildings?.[key]?.level;
        return [key, { level: Math.max(1, Math.round(storedLevel ?? building.level ?? 1)) }];
      })
    ),
    army: Object.fromEntries(
      Object.entries(base.army).map(([unitId, unitState]) => {
        const storedCount = storedState?.army?.[unitId]?.count;
        return [
          unitId,
          {
            count: Math.max(0, Math.round(storedCount ?? unitState.count ?? 0)),
          },
        ];
      })
    ),
    deck: {
      active: (() => {
        const storedDeck = Array.isArray(storedState?.deck?.active)
          ? storedState.deck.active
          : base.deck.active;
        const sanitized = storedDeck.filter((cardId) => cardById[cardId]).slice(0, DECK_LIMIT);
        return sanitized.length ? sanitized : base.deck.active;
      })(),
      library: [...base.deck.library],
    },
    battle: {
      selectedGhostId: getGhostArmy(storedState?.battle?.selectedGhostId).id,
      lastResult: storedState?.battle?.lastResult ?? null,
      seedInput: storedState?.battle?.seedInput ?? "",
    },
    realm: (() => {
      const storedEventId = storedState?.realm?.activeEventId;
      const event = getRealmEvent(storedEventId);
      const baseExpires = Date.now() + event.durationHours * 60 * 60 * 1000;
      const expiresAt =
        typeof storedState?.realm?.eventExpiresAt === "number"
          ? storedState.realm.eventExpiresAt
          : baseExpires;
      return {
        activeEventId: event.id,
        eventExpiresAt: expiresAt,
        lastRotationAt: storedState?.realm?.lastRotationAt ?? Date.now(),
      };
    })(),
    relics: {
      crafted: Array.from(
        new Set(
          (Array.isArray(storedState?.relics?.crafted) ? storedState.relics.crafted : []).filter(
            (relicId) => relicById[relicId]
          )
        )
      ),
    },
    alliance: (() => {
      const baseAlliance = base.alliance;
      const storedAlliance = storedState?.alliance ?? {};
      const leaderboard = Array.isArray(storedAlliance.leaderboard)
        ? storedAlliance.leaderboard
            .filter((entry) => entry?.name && typeof entry.score === "number")
            .slice(0, 6)
        : baseAlliance.leaderboard;
      return {
        ...baseAlliance,
        ...storedAlliance,
        leaderboard,
        contributed: Math.max(storedAlliance.contributed ?? baseAlliance.contributed, 0),
        lastSynced: storedAlliance.lastSynced ?? baseAlliance.lastSynced,
        featuredRaid: {
          ...baseAlliance.featuredRaid,
          ...(storedAlliance.featuredRaid ?? {}),
          progress: Math.min(1, Math.max(0, storedAlliance.featuredRaid?.progress ?? baseAlliance.featuredRaid.progress ?? 0)),
        },
      };
    })(),
    onboarding: {
      completed: Boolean(storedState?.onboarding?.completed),
      currentStep: Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, storedState?.onboarding?.currentStep ?? 0)),
    },
    lastTick: storedState?.lastTick ?? Date.now(),
    activeTab: storedState?.activeTab ?? "resources",
  };

  state.resources = calculateResourceRates(state);
  return state;
};

let store = null;

const renderResourceBar = (state) => {
  const entries = Object.entries(state.resources);
  resourceBarEl.innerHTML = entries
    .map(
      ([key, resource]) => `
        <article class="resource-chip" data-resource="${key}">
          <span class="resource-name">${resource.label}</span>
          <span class="resource-value">${formatNumber(resource.amount)}</span>
          <span class="resource-rate">${formatRate(resource.rate)}/s</span>
        </article>
      `
    )
    .join("");
};

const formatCountdown = (expiresAt) => {
  const remaining = Math.max(0, expiresAt - Date.now());
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
};

const renderRealmEvent = (state) => {
  if (!realmEventButton) return;
  const event = getRealmEvent(state.realm?.activeEventId);
  const expiresAt = state.realm?.eventExpiresAt ?? Date.now();
  const countdown = formatCountdown(expiresAt);

  const resourceLines = Object.entries(event.resourceMultipliers ?? {})
    .map(([resource, multiplier]) => {
      const label = state.resources[resource]?.label ?? resource;
      const percent = Math.round((multiplier - 1) * 100);
      const sign = percent >= 0 ? "+" : "";
      return `<li>${label} ${sign}${percent}%</li>`;
    })
    .join("") || "<li>No resource shifts</li>";

  const battleModifiers = event.battleModifiers?.player ?? {};
  const battleLines = Object.entries(battleModifiers)
    .map(([key, value]) => {
      if (typeof value !== "number") return null;
      if (key.endsWith("Multiplier")) {
        return `<li>${key.replace("Multiplier", "").toUpperCase()} +${Math.round((value > 1 ? value - 1 : value) * 100)}%</li>`;
      }
      if (key.endsWith("Bonus")) {
        return `<li>${key.replace("Bonus", "").toUpperCase()} +${value}</li>`;
      }
      return null;
    })
    .filter(Boolean)
    .join("");

  const tooltip = `
    <div class="realm-event__tooltip">
      <strong>${event.description}</strong>
      <ul>${resourceLines}</ul>
      ${battleLines ? `<p>Battle Edge</p><ul>${battleLines}</ul>` : ""}
    </div>
  `;

  realmEventButton.innerHTML = `
    <span class="realm-event__name">${event.name}</span>
    <span class="realm-event__timer">${countdown}</span>
    ${tooltip}
  `;
  realmEventButton.setAttribute("data-event", event.id);
  realmEventButton.setAttribute("aria-expanded", realmTooltipOpen ? "true" : "false");
};

const renderResourcesPanel = (state) => {
  const resourceRows = Object.entries(state.resources)
    .map(([key, resource]) => {
      return `
        <div class="resource-row" data-resource="${key}">
          <div>
            <div class="resource-row__label">${resource.label}</div>
            <div class="resource-row__meta">Base ${resource.baseRate.toFixed(2)}/s</div>
          </div>
          <div class="resource-row__value">${formatNumber(resource.amount)}</div>
          <div class="resource-row__rate">${formatRate(resource.rate)}/s</div>
        </div>
      `;
    })
    .join("");

  const event = getRealmEvent(state.realm?.activeEventId);
  const eventSummary = Object.entries(event.resourceMultipliers ?? {})
    .map(([resource, multiplier]) => {
      const label = state.resources[resource]?.label ?? resource;
      const percent = Math.round((multiplier - 1) * 100);
      const sign = percent >= 0 ? "+" : "";
      return `${label} ${sign}${percent}%`;
    })
    .join(" • ");

  return `
    <h2>Resource Operations</h2>
    <section class="panel-section">
      <h3>Production Overview</h3>
      <div class="resource-grid">${resourceRows}</div>
      <p class="panel-note">Production ticks automatically every second. Leaving the citadel will resume from the saved timeline.</p>
      <p class="panel-note">Realm Event — <strong>${event.name}</strong>: ${eventSummary || "No active modifiers"}.</p>
    </section>
    <section class="panel-section">
      <h3>Focus Suggestions</h3>
      <ul>
        <li>Upgrade the Mage Tower to accelerate mana flow.</li>
        <li>Balance food and gold so upkeep remains positive.</li>
        <li>Collect at least 30 crystals before attempting a rune infusion.</li>
      </ul>
    </section>
  `;
};

const renderBuildPanel = (state) => {
  const buildingCards = Object.values(buildingDefinitions)
    .map((building) => {
      const currentLevel = state.buildings[building.id]?.level ?? 1;
      const nextLevel = currentLevel + 1;
      const cost = getUpgradeCost(building.id, nextLevel);
      const canAfford = Object.entries(cost).every(
        ([resource, value]) => (state.resources[resource]?.amount ?? 0) >= value
      );
      const rateEffects = Object.entries(building.rateEffects)
        .map(([resource, delta]) => {
          const label = state.resources[resource]?.label ?? resource;
          const sign = delta >= 0 ? "+" : "";
          return `<span class="rate-pill">${label}: ${sign}${delta.toFixed(1)}/lvl</span>`;
        })
        .join(" ");

      const costText = Object.entries(cost)
        .map(([resource, value]) => `${state.resources[resource]?.label ?? resource}: ${value}`)
        .join(" • ");

      return `
        <article class="building-card" data-building="${building.id}">
          <header>
            <h3>${building.label}</h3>
            <span class="building-level">Tier ${currentLevel}</span>
          </header>
          <p class="building-description">${building.description}</p>
          <p class="building-flavor">${building.flavor}</p>
          <div class="building-rates">${rateEffects}</div>
          <footer>
            <button class="button button--primary" data-upgrade="${building.id}" ${
              canAfford ? "" : "disabled"
            }>
              Upgrade to Tier ${nextLevel}
            </button>
            <div class="building-cost">${costText}</div>
          </footer>
        </article>
      `;
    })
    .join("");

  const relicCards = relicCatalog
    .map((relic) => {
      const owned = state.relics?.crafted?.includes(relic.id);
      const canAfford = Object.entries(relic.cost).every(
        ([resource, value]) => (state.resources[resource]?.amount ?? 0) >= value
      );
      const costText = Object.entries(relic.cost)
        .map(([resource, value]) => `${state.resources[resource]?.label ?? resource}: ${value}`)
        .join(" • ");

      const economyEffects = Object.entries(relic.economy ?? {})
        .map(([key, value]) => {
          if (typeof value !== "number") return null;
          if (key.endsWith("Flat")) {
            const resource = key.replace("Flat", "");
            const label = state.resources[resource]?.label ?? resource;
            return `<span class="relic-pill">+${value.toFixed(2)} ${label}/s</span>`;
          }
          if (key.endsWith("Multiplier")) {
            const resource = key.replace("Multiplier", "");
            const label = state.resources[resource]?.label ?? resource;
            return `<span class="relic-pill">+${Math.round(value * 100)}% ${label}</span>`;
          }
          return null;
        })
        .filter(Boolean)
        .join("");

      const battleEffects = Object.entries(relic.battle ?? {})
        .map(([key, value]) => {
          if (typeof value !== "number") return null;
          if (key.endsWith("Multiplier")) {
            return `<span class="relic-pill">${key.replace("Multiplier", "").toUpperCase()} +${Math.round(value * 100)}%</span>`;
          }
          if (key.endsWith("Bonus")) {
            return `<span class="relic-pill">${key.replace("Bonus", "").toUpperCase()} +${value}</span>`;
          }
          return null;
        })
        .filter(Boolean)
        .join("");

      const effectTags = [economyEffects, battleEffects].filter(Boolean).join(" ");

      return `
        <article class="relic-card ${owned ? "relic-card--owned" : ""}" data-relic="${relic.id}">
          <header>
            <h3>${relic.name}</h3>
            <p>${relic.description}</p>
          </header>
          <div class="relic-effects">${effectTags}</div>
          <footer>
            <span class="building-cost">${costText}</span>
            <button class="button button--primary" data-forge="${relic.id}" ${
              !canAfford || owned ? "disabled" : ""
            }>${owned ? "Forged" : "Forge Relic"}</button>
          </footer>
        </article>
      `;
    })
    .join("");

  return `
    <h2>Citadel Reconstruction</h2>
    <section class="panel-section">
      <h3>Project Queue</h3>
      <div class="buildings-grid">${buildingCards}</div>
    </section>
    <section class="panel-section">
      <h3>Relic Foundry</h3>
      <p class="panel-note">Relics consume resources once and permanently enhance production and combat.</p>
      <div class="relic-grid">${relicCards}</div>
    </section>
  `;
};

const renderArmyPanel = (state) => {
  const armyRows = unitList
    .map((unit) => {
      const unitState = state.army[unit.id] ?? { count: 0 };
      return `
        <article class="unit-card" data-unit="${unit.id}">
          <header>
            <h3>${unit.name}</h3>
            <span class="unit-faction">${unit.faction}</span>
          </header>
          <p class="unit-description">${unit.description}</p>
          <dl class="unit-stats">
            <div><dt>Attack</dt><dd>${unit.attack}</dd></div>
            <div><dt>Defense</dt><dd>${unit.defense}</dd></div>
            <div><dt>Vitality</dt><dd>${unit.hp}</dd></div>
          </dl>
          <div class="unit-controls">
            <button class="button button--ghost" data-change="-1" data-unit="${unit.id}">-</button>
            <span class="unit-count">${unitState.count}</span>
            <button class="button button--ghost" data-change="1" data-unit="${unit.id}">+</button>
          </div>
        </article>
      `;
    })
    .join("");

  const totals = unitList.reduce(
    (acc, unit) => {
      const count = state.army[unit.id]?.count ?? 0;
      acc.attack += unit.attack * count;
      acc.defense += unit.defense * count;
      acc.hp += unit.hp * count;
      Object.entries(unit.upkeep).forEach(([resource, value]) => {
        acc.upkeep[resource] = (acc.upkeep[resource] ?? 0) + value * count;
      });
      return acc;
    },
    { attack: 0, defense: 0, hp: 0, upkeep: {} }
  );

  const upkeepText = Object.entries(totals.upkeep)
    .map(([resource, value]) => `${state.resources[resource]?.label ?? resource}: ${value}`)
    .join(" • ");

  return `
    <h2>Army Assembly</h2>
    <section class="panel-section">
      <h3>Formations</h3>
      <div class="units-grid">${armyRows}</div>
    </section>
    <section class="panel-section">
      <h3>Battle Readiness</h3>
      <p>Projected Power — Attack: <strong>${totals.attack}</strong>, Defense: <strong>${totals.defense}</strong>, Vitality: <strong>${totals.hp}</strong></p>
      <p>Upkeep per deployment: ${upkeepText}</p>
    </section>
  `;
};

const renderDeckPanel = (state) => {
  const activeDeck = state.deck.active;
  const deckCounts = activeDeck.reduce((acc, cardId) => {
    acc[cardId] = (acc[cardId] ?? 0) + 1;
    return acc;
  }, {});

  const libraryCards = cards
    .map((card) => {
      const inDeck = deckCounts[card.id] ?? 0;
      const remaining = card.maxCopies - inDeck;
      return `
        <article class="card-entry" data-card="${card.id}">
          <header>
            <h3>${card.name}</h3>
            <span class="card-tag">${card.faction}</span>
            <span class="card-tag card-tag--rarity">${card.rarity}</span>
          </header>
          <p>${card.effect.description}</p>
          <footer>
            <span class="card-cost">Mana: ${card.cost}</span>
            <span class="card-remaining">${inDeck}/${card.maxCopies}</span>
            <button class="button button--primary" data-add-card="${card.id}" ${
              remaining > 0 && activeDeck.length < DECK_LIMIT ? "" : "disabled"
            }>Add</button>
          </footer>
        </article>
      `;
    })
    .join("");

  const deckCards = activeDeck
    .map((cardId, index) => {
      const card = cardById[cardId];
      return `
        <li class="deck-card" data-card="${cardId}">
          <span>${card.name}</span>
          <button class="button button--ghost" data-remove-card="${index}">Remove</button>
        </li>
      `;
    })
    .join("");

  const warning = activeDeck.length === DECK_LIMIT
    ? `<p class="deck-status deck-status--ready">Deck filled (${activeDeck.length}/${DECK_LIMIT}).</p>`
    : `<p class="deck-status">${DECK_LIMIT - activeDeck.length} slots remaining.</p>`;

  return `
    <h2>Command Deck</h2>
    <section class="panel-section deck-panel">
      <h3>Library</h3>
      <div class="deck-grid">${libraryCards}</div>
    </section>
    <section class="panel-section">
      <h3>Active Deck</h3>
      ${warning}
      <ol class="deck-list">${deckCards}</ol>
    </section>
  `;
};

const renderBattlePanel = (state) => {
  const ghostButtons = ghostArmies
    .map((ghost) => {
      const isActive = ghost.id === state.battle.selectedGhostId;
      return `
        <button class="ghost-button ${isActive ? "ghost-button--active" : ""}" data-ghost="${
        ghost.id
      }">
          <span class="ghost-name">${ghost.name}</span>
          <span class="ghost-power">${ghost.power}</span>
        </button>
      `;
    })
    .join("");

  const selectedGhost = getGhostArmy(state.battle.selectedGhostId);
  const ghostUnits = Object.entries(selectedGhost.units)
    .map(([unitId, count]) => `<li>${units[unitId].name}: <strong>${count}</strong></li>`)
    .join("");

  const lastResult = state.battle.lastResult;
  const battleLog = lastResult
    ? `
        <section class="panel-section battle-log">
          <h3>Last Simulation — ${
            lastResult.winner === "player"
              ? "Victory"
              : lastResult.winner === "ghost"
              ? "Defeat"
              : "Stalemate"
          }</h3>
          <div class="battle-timeline">
            <div class="battle-timeline__controls">
              <button class="button button--ghost" data-battle-play type="button">Replay</button>
              <input type="range" class="battle-timeline__slider" min="1" max="${lastResult.rounds.length}" value="${lastResult.rounds.length}" data-round-slider />
            </div>
            <div class="battle-timeline__rounds">
              ${lastResult.rounds
                .map(
                  (round, index) => `
                    <button type="button" class="battle-round-pill ${
                      index === lastResult.rounds.length - 1 ? "active" : ""
                    }" data-round-pill="${round.round}">R${round.round}</button>
                  `
                )
                .join("")}
            </div>
          </div>
          <p class="battle-summary">Seed ${lastResult.seed} • Remaining HP — You: ${lastResult.remaining.playerHp}, Ghost: ${lastResult.remaining.ghostHp}</p>
          <ol>
            ${lastResult.rounds
              .map(
                (round, index) => `
                  <li class="battle-log__round" data-round-entry="${round.round}" data-active="${
                    index === lastResult.rounds.length - 1
                  }">
                    <header>Round ${round.round}</header>
                    <p><strong>You:</strong> ${round.playerCard} — ${round.playerCardText}</p>
                    <p><strong>Ghost:</strong> ${round.ghostCard} — ${round.ghostCardText}</p>
                    <p>Damage • You: ${round.playerDamage} | Ghost: ${round.ghostDamage}</p>
                    <p>HP • You: ${round.playerHp} | Ghost: ${round.ghostHp}</p>
                  </li>
                `
              )
              .join("")}
          </ol>
        </section>
      `
    : `
        <section class="panel-section battle-log">
          <h3>No simulations yet</h3>
          <p>Configure your army and command deck, then challenge a ghost army to generate a combat report.</p>
        </section>
      `;

  return `
    <h2>Battle Simulation</h2>
    <section class="panel-section">
      <h3>Ghost Armies</h3>
      <div class="ghost-grid">${ghostButtons}</div>
      <p class="ghost-description">${selectedGhost.description}</p>
      <ul class="ghost-composition">${ghostUnits}</ul>
    </section>
    <section class="panel-section">
      <h3>Simulation Seed</h3>
      <div class="seed-controls">
        <input type="text" class="seed-input" value="${state.battle.seedInput ?? ""}" placeholder="Optional custom seed" />
        <button class="button button--primary" data-run-battle>Run Auto-Battle</button>
      </div>
      <p class="panel-note">Deterministic outcomes: identical seed, deck, and formations yield identical logs.</p>
    </section>
    ${battleLog}
  `;
};

const renderAlliancePanel = (state) => {
  const alliance = state.alliance;
  const ghost = getGhostArmy(alliance.featuredRaid?.ghostId);
  const weeklyProgress = Math.min(100, Math.round((alliance.contributed / alliance.weeklyGoal) * 100));
  const raidProgress = Math.min(100, Math.round((alliance.featuredRaid?.progress ?? 0) * 100));
  const lastSynced = alliance.lastSynced
    ? new Date(alliance.lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Never";

  const leaderboard = (alliance.leaderboard ?? [])
    .map(
      (entry, index) => `
        <li>
          <span>${index + 1}. ${entry.name}</span>
          <span>${Math.round(entry.score).toLocaleString()}</span>
        </li>
      `
    )
    .join("");

  return `
    <h2>Alliance Outpost</h2>
    <section class="panel-section alliance-panel">
      <div>
        <h3>${alliance.name}</h3>
        <p class="panel-note">Rank #${alliance.rank} • Last synced ${lastSynced}</p>
      </div>
      <div class="alliance-metrics">
        <article class="metric-card">
          <span>Weekly Goal</span>
          <strong>${Math.round(alliance.contributed).toLocaleString()} / ${Math.round(alliance.weeklyGoal).toLocaleString()}</strong>
          <span>${weeklyProgress}% complete</span>
        </article>
        <article class="metric-card">
          <span>Featured Raid</span>
          <strong>${ghost.name}</strong>
          <span>${raidProgress}% ghost morale broken</span>
        </article>
      </div>
      <div>
        <button class="button button--primary" data-sync-alliance>Sync Firebase Relay</button>
        <button class="button button--ghost" data-contribute>${"Pledge 240 strength"}</button>
      </div>
      <p class="panel-note">Alliance pledges consume 40 Gold and 20 Mana to add 240 raid strength plus a bonus from your deck.</p>
      <section class="panel-section">
        <h3>Season Leaderboard</h3>
        <ul class="leaderboard">${leaderboard}</ul>
      </section>
    </section>
  `;
};

const panelRenderers = {
  resources: renderResourcesPanel,
  build: renderBuildPanel,
  army: renderArmyPanel,
  deck: renderDeckPanel,
  battle: renderBattlePanel,
  alliance: renderAlliancePanel,
};

const panelBinders = {
  build: () => {
    panelEl.querySelectorAll("[data-upgrade]").forEach((button) => {
      button.addEventListener("click", () => {
        const buildingId = button.dataset.upgrade;
        upgradeBuilding(buildingId);
      });
    });
    panelEl.querySelectorAll("[data-forge]").forEach((button) => {
      button.addEventListener("click", () => {
        const relicId = button.dataset.forge;
        forgeRelic(relicId);
      });
    });
  },
  army: () => {
    panelEl.querySelectorAll("[data-change]").forEach((button) => {
      button.addEventListener("click", () => {
        const unitId = button.dataset.unit;
        const delta = Number(button.dataset.change);
        adjustUnit(unitId, delta);
      });
    });
  },
  deck: () => {
    panelEl.querySelectorAll("[data-add-card]").forEach((button) => {
      button.addEventListener("click", () => {
        const cardId = button.dataset.addCard;
        addCard(cardId);
      });
    });
    panelEl.querySelectorAll("[data-remove-card]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.removeCard);
        removeCard(index);
      });
    });
  },
  battle: (state) => {
    panelEl.querySelectorAll("[data-ghost]").forEach((button) => {
      button.addEventListener("click", () => {
        const ghostId = button.dataset.ghost;
        selectGhost(ghostId);
      });
    });
    const seedInput = panelEl.querySelector(".seed-input");
    if (seedInput) {
      seedInput.addEventListener("input", (event) => {
        updateSeedInput(event.target.value);
      });
    }
    const runButton = panelEl.querySelector("[data-run-battle]");
    if (runButton) {
      runButton.addEventListener("click", () => {
        runBattle();
      });
    }
    initializeBattleTimeline(state);
  },
  alliance: () => {
    const syncButton = panelEl.querySelector("[data-sync-alliance]");
    if (syncButton) {
      syncButton.addEventListener("click", () => {
        syncAlliance();
      });
    }
    const contributeButton = panelEl.querySelector("[data-contribute]");
    if (contributeButton) {
      contributeButton.addEventListener("click", () => {
        pledgeAlliance();
      });
    }
  },
};

const initializeBattleTimeline = (state) => {
  if (!state.battle?.lastResult) return;
  if (battlePlaybackInterval) {
    clearInterval(battlePlaybackInterval);
    battlePlaybackInterval = null;
  }
  const slider = panelEl.querySelector("[data-round-slider]");
  const pills = Array.from(panelEl.querySelectorAll("[data-round-pill]"));
  const entries = Array.from(panelEl.querySelectorAll("[data-round-entry]"));
  if (!slider || !entries.length) return;

  const highlight = (round) => {
    entries.forEach((entry) => {
      const isActive = Number(entry.dataset.roundEntry) === round;
      entry.setAttribute("data-active", isActive);
    });
    pills.forEach((pill) => {
      const isActive = Number(pill.dataset.roundPill) === round;
      pill.classList.toggle("active", isActive);
    });
  };

  const maxRound = Number(slider.max);
  highlight(Number(slider.value) || maxRound);

  slider.addEventListener("input", (event) => {
    const round = Number(event.target.value);
    highlight(round);
    triggerBattleVisual("glow");
  });

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const round = Number(pill.dataset.roundPill);
      slider.value = round;
      highlight(round);
      triggerBattleVisual();
    });
  });

  const playButton = panelEl.querySelector("[data-battle-play]");
  if (playButton) {
    playButton.addEventListener("click", () => {
      if (battlePlaybackInterval) {
        clearInterval(battlePlaybackInterval);
        battlePlaybackInterval = null;
      }
      let currentRound = 1;
      highlight(currentRound);
      slider.value = currentRound;
      triggerBattleVisual("glow");
      battlePlaybackInterval = setInterval(() => {
        currentRound += 1;
        if (currentRound > maxRound) {
          clearInterval(battlePlaybackInterval);
          battlePlaybackInterval = null;
          return;
        }
        slider.value = currentRound;
        highlight(currentRound);
        triggerBattleVisual(currentRound === maxRound ? "glow" : "shake");
      }, 900);
    });
  }
};

const renderPanel = (state) => {
  const render = panelRenderers[state.activeTab];
  if (!render) return;
  panelEl.innerHTML = render(state);
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });
  const binder = panelBinders[state.activeTab];
  if (binder) {
    binder(state);
  }
};

const upgradeBuilding = (buildingId) => {
  store.setState((state) => {
    const currentLevel = state.buildings[buildingId]?.level ?? 1;
    const nextLevel = currentLevel + 1;
    const cost = getUpgradeCost(buildingId, nextLevel);
    const canAfford = Object.entries(cost).every(
      ([resource, amount]) => (state.resources[resource]?.amount ?? 0) >= amount
    );
    if (!canAfford) return {};

    const updatedResources = Object.fromEntries(
      Object.entries(state.resources).map(([resourceId, resource]) => {
        const spend = cost[resourceId] ?? 0;
        return [
          resourceId,
          {
            ...resource,
            amount: resource.amount - spend,
          },
        ];
      })
    );

    const updatedBuildings = {
      ...state.buildings,
      [buildingId]: {
        level: nextLevel,
      },
    };

    const updatedState = {
      ...state,
      resources: updatedResources,
      buildings: updatedBuildings,
    };

    updatedState.resources = calculateResourceRates({ ...updatedState });
    return {
      resources: updatedState.resources,
      buildings: updatedBuildings,
    };
  });
};

const forgeRelic = (relicId) => {
  store.setState((state) => {
    const relic = relicById[relicId];
    if (!relic) return {};
    const crafted = state.relics?.crafted ?? [];
    if (crafted.includes(relicId)) return {};
    const canAfford = Object.entries(relic.cost).every(
      ([resource, value]) => (state.resources[resource]?.amount ?? 0) >= value
    );
    if (!canAfford) return {};

    const updatedResources = Object.fromEntries(
      Object.entries(state.resources).map(([resourceId, resource]) => {
        const spend = relic.cost[resourceId] ?? 0;
        return [
          resourceId,
          {
            ...resource,
            amount: resource.amount - spend,
          },
        ];
      })
    );

    const updatedRelics = [...crafted, relicId];
    const recalculated = calculateResourceRates({
      ...state,
      resources: updatedResources,
      relics: { crafted: updatedRelics },
    });

    return {
      resources: recalculated,
      relics: {
        crafted: updatedRelics,
      },
    };
  });
};

const syncAlliance = () => {
  store.setState((state) => {
    const now = Date.now();
    const leaderboard = [...(state.alliance.leaderboard ?? [])].map((entry) => {
      if (entry.name === state.alliance.name) {
        return {
          ...entry,
          score: Math.max(entry.score, state.alliance.contributed),
        };
      }
      return {
        ...entry,
        score: Math.round(entry.score * (1 + Math.random() * 0.05)),
      };
    });

    if (!leaderboard.some((entry) => entry.name === state.alliance.name)) {
      leaderboard.push({ name: state.alliance.name, score: state.alliance.contributed });
    }

    leaderboard.sort((a, b) => b.score - a.score);

    return {
      alliance: {
        ...state.alliance,
        leaderboard: leaderboard.slice(0, 6),
        lastSynced: now,
      },
    };
  });
};

const pledgeAlliance = () => {
  store.setState((state) => {
    const cost = { gold: 40, mana: 20 };
    const canAfford = Object.entries(cost).every(
      ([resource, value]) => (state.resources[resource]?.amount ?? 0) >= value
    );
    if (!canAfford) return {};

    const updatedResources = Object.fromEntries(
      Object.entries(state.resources).map(([resourceId, resource]) => {
        const spend = cost[resourceId] ?? 0;
        return [
          resourceId,
          {
            ...resource,
            amount: resource.amount - spend,
          },
        ];
      })
    );

    const deckBonus = (state.deck?.active?.length ?? 0) * 5;
    const contributionGain = 240 + deckBonus;
    const contributed = state.alliance.contributed + contributionGain;
    const raidProgress = Math.min(
      1,
      (state.alliance.featuredRaid?.progress ?? 0) + contributionGain / state.alliance.weeklyGoal
    );

    const leaderboard = (state.alliance.leaderboard ?? []).map((entry) =>
      entry.name === state.alliance.name
        ? { ...entry, score: Math.max(entry.score, contributed) }
        : entry
    );

    triggerBattleVisual("glow");

    return {
      resources: updatedResources,
      alliance: {
        ...state.alliance,
        contributed,
        featuredRaid: {
          ...state.alliance.featuredRaid,
          progress: raidProgress,
        },
        leaderboard,
      },
    };
  });
};

const adjustUnit = (unitId, delta) => {
  store.setState((state) => {
    const current = state.army[unitId]?.count ?? 0;
    const next = Math.min(12, Math.max(0, current + delta));
    if (next === current) return {};
    return {
      army: {
        ...state.army,
        [unitId]: {
          count: next,
        },
      },
    };
  });
};

const addCard = (cardId) => {
  store.setState((state) => {
    const card = cardById[cardId];
    if (!card) return {};
    const active = [...state.deck.active];
    const copies = active.filter((id) => id === cardId).length;
    if (copies >= card.maxCopies) return {};
    if (active.length >= DECK_LIMIT) return {};
    active.push(cardId);
    return {
      deck: {
        ...state.deck,
        active,
      },
    };
  });
};

const removeCard = (index) => {
  store.setState((state) => {
    if (index < 0 || index >= state.deck.active.length) return {};
    const active = state.deck.active.filter((_, idx) => idx !== index);
    return {
      deck: {
        ...state.deck,
        active,
      },
    };
  });
};

const selectGhost = (ghostId) => {
  const ghost = getGhostArmy(ghostId);
  store.setState((state) => ({
    battle: {
      ...state.battle,
      selectedGhostId: ghost.id,
    },
  }));
};

const updateSeedInput = (value) => {
  store.setState((state) => ({
    battle: {
      ...state.battle,
      seedInput: value,
    },
  }));
};

const runBattle = () => {
  const state = store.getState();
  const selectedGhost = getGhostArmy(state.battle.selectedGhostId);
  if (!state.deck.active.length) {
    return;
  }
  const seed = state.battle.seedInput?.length ? state.battle.seedInput : selectedGhost.seed;

  const playerArmy = Object.fromEntries(
    Object.entries(state.army).map(([unitId, unitState]) => [unitId, { count: unitState.count }])
  );
  const ghostArmy = Object.fromEntries(
    Object.entries(selectedGhost.units).map(([unitId, count]) => [unitId, { count }])
  );

  const battleModifiers = collectBattleModifiers(state);

  const result = runBattleSimulation({
    seed,
    playerArmy,
    playerDeck: state.deck.active,
    ghostDeck: selectedGhost.deck,
    ghostArmy,
    playerModifiers: battleModifiers.player,
    ghostModifiers: battleModifiers.ghost,
  });

  store.setState((prev) => ({
    battle: {
      ...prev.battle,
      lastResult: {
        ...result,
        opponentId: selectedGhost.id,
        timestamp: Date.now(),
      },
    },
  }));
  triggerBattleVisual("glow");
};

const tickResources = () => {
  rotateRealmEventIfNeeded();
  store.setState((state) => {
    const now = Date.now();
    const elapsed = Math.max(0, (now - state.lastTick) / 1000);
    if (elapsed < 0.2) {
      return {};
    }
    const resources = Object.fromEntries(
      Object.entries(state.resources).map(([key, resource]) => {
        const gained = resource.rate * elapsed;
        return [
          key,
          {
            ...resource,
            amount: Math.max(0, Math.round((resource.amount + gained) * 10) / 10),
          },
        ];
      })
    );
    return {
      resources,
      lastTick: now,
    };
  });
};

const rotateRealmEventIfNeeded = () => {
  if (!store) return;
  const state = store.getState();
  if (!state.realm) return;
  const now = Date.now();
  if (now < (state.realm.eventExpiresAt ?? 0)) return;
  const nextId = getNextRealmEventId(state.realm.activeEventId);
  const nextEvent = getRealmEvent(nextId);
  const updatedRealm = {
    activeEventId: nextId,
    eventExpiresAt: now + nextEvent.durationHours * 60 * 60 * 1000,
    lastRotationAt: now,
  };
  const recalculated = calculateResourceRates({
    ...state,
    realm: updatedRealm,
  });
  store.setState({
    realm: updatedRealm,
    resources: recalculated,
  });
};

const bootstrap = async () => {
  const stored = await loadGameState();
  const initialState = sanitizeState(stored);
  store = createStore(initialState);

  store.subscribe((state) => {
    renderResourceBar(state);
    renderRealmEvent(state);
    renderPanel(state);
    renderOnboarding(state);
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      store.setState({ activeTab: tab });
    });
  });

  if (realmEventButton) {
    realmEventButton.addEventListener("click", (event) => {
      event.stopPropagation();
      realmTooltipOpen = !realmTooltipOpen;
      realmEventButton.setAttribute("aria-expanded", realmTooltipOpen ? "true" : "false");
    });
  }

  document.addEventListener("click", (event) => {
    if (!realmEventButton) return;
    if (!realmEventButton.contains(event.target)) {
      realmTooltipOpen = false;
      realmEventButton.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && realmTooltipOpen) {
      realmTooltipOpen = false;
      realmEventButton?.setAttribute("aria-expanded", "false");
    }
  });

  setupAutosave(store);
  setInterval(tickResources, 1000);
};

bootstrap();
