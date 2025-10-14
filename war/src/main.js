import { createStore } from "./state/store.js";

const panelContent = {
  resources: () => `
    <h2>Resource Operations</h2>
    <div class="panel-section">
      <h3>Production Overview</h3>
      <p>Harvest mana, food, crystals, souls, and gold from the recovered districts. Upgrades will accelerate hourly yields.</p>
    </div>
    <div class="panel-section">
      <h3>Next Steps</h3>
      <ul>
        <li>Stabilize core production buildings to tier II.</li>
        <li>Recruit gatherers and wardens to protect supply lines.</li>
        <li>Unlock arcane relays to channel surplus mana.</li>
      </ul>
    </div>
  `,
  build: () => `
    <h2>Citadel Reconstruction</h2>
    <div class="panel-section">
      <h3>Current Projects</h3>
      <ul>
        <li>Forge: Reinforce smoldering crucibles for rune crafting.</li>
        <li>Barracks: Expand bunks to accommodate Dominion infantry.</li>
        <li>Mage Tower: Install prism arrays for crystal amplification.</li>
      </ul>
    </div>
    <div class="panel-section">
      <h3>Blueprint Queue</h3>
      <p>Drag future upgrades here to schedule construction once resources are available.</p>
    </div>
  `,
  army: () => `
    <h2>Army Assembly</h2>
    <div class="panel-section">
      <h3>Formations</h3>
      <p>Slot Sanctum, Dominion, Wild, and Arcane units. Cohesion impacts morale and initiative.</p>
    </div>
    <div class="panel-section">
      <h3>Upkeep</h3>
      <p>Monitor food and gold requirements. Low supplies reduce strength by up to 30%.</p>
    </div>
  `,
  deck: () => `
    <h2>Command Deck</h2>
    <div class="panel-section">
      <h3>Card Slots</h3>
      <p>Assemble 12 command cards. Costs draw from mana reserves; high rarity cards include unique weather effects.</p>
    </div>
    <div class="panel-section">
      <h3>Synergy Tips</h3>
      <ul>
        <li>Pair Dominion armor buffs with Wild ambush tactics.</li>
        <li>Reserve Souls for necromancy or high-tier Arcane summons.</li>
        <li>Maintain at least three emergency response cards.</li>
      </ul>
    </div>
  `,
  battle: () => `
    <h2>Battle Simulation</h2>
    <div class="panel-section">
      <h3>Ghost Armies</h3>
      <p>Challenge echoes of other players. Outcomes are deterministic — adjust inputs to alter fate.</p>
    </div>
    <div class="panel-section">
      <h3>Combat Log</h3>
      <p>Round-by-round reports will appear here, highlighting tactical triggers and morale shifts.</p>
    </div>
  `,
};

const INITIAL_STATE = {
  resources: {
    mana: { label: "Mana", amount: 120, rate: 2 },
    food: { label: "Food", amount: 80, rate: 1 },
    crystals: { label: "Crystals", amount: 45, rate: 0.5 },
    souls: { label: "Souls", amount: 12, rate: 0.1 },
    gold: { label: "Gold", amount: 200, rate: 3 },
  },
  activeTab: "resources",
};

const store = createStore(INITIAL_STATE);

const resourceBarEl = document.querySelector("#resource-bar");
const panelEl = document.querySelector("#panel");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));

const formatNumber = (value) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1);
};

const renderResources = (state) => {
  const entries = Object.entries(state.resources);
  resourceBarEl.innerHTML = entries
    .map(
      ([key, resource]) => `
        <article class="resource-chip" data-resource="${key}">
          <span class="resource-name">${resource.label}</span>
          <span class="resource-value">${formatNumber(resource.amount)}</span>
        </article>
      `
    )
    .join("");
};

const renderPanel = (state) => {
  panelEl.innerHTML = panelContent[state.activeTab]();
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });
};

store.subscribe((state) => {
  renderResources(state);
  renderPanel(state);
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    store.setState({ activeTab: tab });
  });
});

const tickResources = () => {
  store.setState((state) => {
    const updated = Object.fromEntries(
      Object.entries(state.resources).map(([key, resource]) => {
        const newAmount = resource.amount + resource.rate;
        return [key, { ...resource, amount: newAmount }];
      })
    );
    return { resources: updated };
  });
};

setInterval(tickResources, 1000);

renderPanel(INITIAL_STATE);
renderResources(INITIAL_STATE);
