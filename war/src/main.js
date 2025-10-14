import { createStore } from "./state/store.js";
import { createInitialState } from "./state/initialState.js";
import { loadGameState, setupAutosave } from "./state/persistence/index.js";
import { buildingDefinitions, getUpgradeCost } from "./data/buildings.js";
import { unitList, units } from "./data/units.js";
import { cards, cardById } from "./data/cards.js";
import { ghostArmies, getGhostArmy } from "./data/ghosts.js";
import { runBattleSimulation } from "./sim/battle.js";

const DECK_LIMIT = 12;
const resourceBarEl = document.querySelector("#resource-bar");
const panelEl = document.querySelector("#panel");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));

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

  return Object.fromEntries(
    Object.entries(state.resources).map(([key, resource]) => [
      key,
      {
        ...resource,
        rate: Math.round((totals[key] ?? resource.baseRate ?? 0) * 100) / 100,
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

  return `
    <h2>Resource Operations</h2>
    <section class="panel-section">
      <h3>Production Overview</h3>
      <div class="resource-grid">${resourceRows}</div>
      <p class="panel-note">Production ticks automatically every second. Leaving the citadel will resume from the saved timeline.</p>
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

  return `
    <h2>Citadel Reconstruction</h2>
    <section class="panel-section">
      <h3>Project Queue</h3>
      <div class="buildings-grid">${buildingCards}</div>
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
          <p class="battle-summary">Seed ${lastResult.seed} • Remaining HP — You: ${lastResult.remaining.playerHp}, Ghost: ${lastResult.remaining.ghostHp}</p>
          <ol>
            ${lastResult.rounds
              .map(
                (round) => `
                  <li>
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

const panelRenderers = {
  resources: renderResourcesPanel,
  build: renderBuildPanel,
  army: renderArmyPanel,
  deck: renderDeckPanel,
  battle: renderBattlePanel,
};

const panelBinders = {
  build: () => {
    panelEl.querySelectorAll("[data-upgrade]").forEach((button) => {
      button.addEventListener("click", () => {
        const buildingId = button.dataset.upgrade;
        upgradeBuilding(buildingId);
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
  },
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

  const result = runBattleSimulation({
    seed,
    playerArmy,
    playerDeck: state.deck.active,
    ghostDeck: selectedGhost.deck,
    ghostArmy,
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
};

const tickResources = () => {
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

const bootstrap = async () => {
  const stored = await loadGameState();
  const initialState = sanitizeState(stored);
  store = createStore(initialState);

  store.subscribe((state) => {
    renderResourceBar(state);
    renderPanel(state);
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      store.setState({ activeTab: tab });
    });
  });

  setupAutosave(store);
  setInterval(tickResources, 1000);
};

bootstrap();
