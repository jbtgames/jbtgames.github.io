# RUNE & RATION
Pixel-Art Fantasy Resource Strategy Game (Codename: Rune & Ration)

## OVERVIEW
Rune & Ration is a pixel-art, web-based strategy and resource management game where players rebuild their citadel, command armies, collect runes (magical cards), and engage in asynchronous tactical battles against other players’ saved armies.

The tone and setting are dark fantasy with a ruined-world atmosphere, delivered through compact pixel visuals optimized for mobile (390x844). Gameplay is primarily solo, with asynchronous PvP simulations for competition.

The design combines:
- Resource management loops (Mana, Food, Crystals, Souls, Gold)
- Army building (recruitment, formations, upkeep)
- Deck-building (magical Command Cards affecting battle outcomes)
- Deterministic auto-battle simulation (turn-based, seeded RNG)
- Compact pixel-style UI with minimal screen transitions

## GAME LOOP
1. Gather → resources over time via buildings.
2. Build → upgrade citadel, forge, barracks, and mage tower.
3. Recruit → units from different factions (Sanctum, Dominion, Wild, Arcane).
4. Deck Build → choose up to 12 Command Cards for tactics and spells.
5. Battle → fight ghost armies using deterministic combat simulation.
6. Upgrade → unlock new cards, units, and events weekly.

## RESOURCES
- **Mana**: Powers Command Cards.
- **Crystals**: Upgrade structures and research.
- **Food**: Maintains morale and unit upkeep.
- **Souls**: Rare currency for necromancy and high-tier summons.
- **Gold**: Universal trade and recruitment cost.

## VISUAL STYLE
- **Pixel aesthetic** aligned to 8x8 grid; sharp retro edges.
- **Palette**: deep navy, obsidian, violet, ember orange, emerald.
- **Units**: 16x16 or 24x24 icons, simple battle motion (slide, flash, shake).
- **Cards**: pixel rectangles (60x80) with colored borders by rarity.
- **UI**: one-screen layout with layered panels, no scroll.
- **Transitions**: wipes, flickers, ripple effects between views.

## ARCHITECTURE
Built as a **single-page modular JS app**:
- HTML5 + CSS + Vanilla JS (no frameworks)
- Mobile-first layout (390×844px container)
- IndexedDB (default) or Firebase for persistence
- Deterministic RNG (Mulberry32 or xorshift32)
- Game state via reactive store pattern (subscribe / patch)

## CORE MODULES
```
/index.html              # Base container, mobile viewport
/styles/                 # Base + theme CSS
/src/main.js             # Bootstrap entry point
/src/state/store.js      # Reactive global state
/src/state/persistence/  # IndexedDB + Firebase adapters
/src/data/               # Static JSON (units, cards, terrain)
/src/sim/                # Battle logic, RNG, combat reports
/src/ui/components/      # Header, ResourceBar, Panels
/src/utils/              # Helpers for time, format, validation
/assets/pixel/           # Placeholder sprites, icons
```

## SIMULATION LOGIC
Each battle runs in 5–6 rounds:
1. Terrain and weather modifiers applied.
2. Both sides draw 3 cards from shuffled deck (seeded RNG).
3. AI picks best valid card based on cost/rarity.
4. Damage = sum(unit atk * qty) ± variance * effects.
5. Morale and casualties resolved.
6. Results logged as JSON, displayed with round highlights.

Outcome is deterministic for given inputs and RNG seed.

## PANEL LAYOUT
**Tabs**: Resources | Build | Army | Deck | Battle  
Each tab replaces the central panel but reuses header and footer.

- **Resource Bar:** Shows mana, food, souls, crystals, gold with icons.
- **Building Panel:** Upgrade buildings; production values update live.
- **Army Panel:** Recruit and organize units; toggle formations.
- **Deck Panel:** Drag & drop cards into 12-slot active deck.
- **Battle Panel:** Match against ghost armies and run auto-simulation.

## PHASE 1 COMPLETION CRITERIA
1. IndexedDB autosave and load working.
2. Resources tick automatically per second.
3. Deck build logic functional (validate max 12).
4. Battle simulation produces deterministic outcomes.
5. Ghost opponents seeded locally with varied decks.
6. Mobile layout fully responsive and pixel-perfect.

## PHASE 1 IMPLEMENTATION SNAPSHOT
- **State & Persistence**: Reactive store persists automatically through IndexedDB with a graceful localStorage fallback. State hydration replays saved resources, formations, and deck selections.
- **Resource Economy**: Mana, food, crystals, souls, and gold tick every second with building-driven rates. Upgrade tiers recalculate production instantly.
- **Citadel Build Queue**: Rune Forge, Barracks, Granary, and Mage Tower upgrades spend resources, scale costs, and surface per-level production deltas.
- **Army & Deck Management**: Adjustable unit counts feed battle readiness summaries, while a 12-card command deck enforces per-card copy limits with add/remove controls.
- **Battle Simulation**: Deterministic five-round auto-battle compares the player build against three seeded ghost armies and produces granular combat logs, honoring optional custom seeds.

## PHASE 2 LAYOUT PLAN
1. **Realm Events Layer** – Introduce rotating realm modifiers (e.g., Blood Moon, Verdant Tide) that alter resource rates and combat bonuses. UI: seasonal badge in the header with tooltip and countdown.
2. **Relics & Crafting** – Extend the Build tab with a Relic Foundry panel. Players forge relics using surplus resources for permanent stat augments and passive abilities.
3. **Alliance Outpost** – Add a new tab for asynchronous co-op goals, including shared ghost raids and weekly leaderboards synchronized via Firebase.
4. **Enhanced Battle Visuals** – Implement pixel animations (screen shake, card glow, rune traces) and per-round timelines for richer battle feedback. Integrate a replay slider.
5. **Expanded Persistence** – Migrate autosave to a strategy that merges local state with Firebase, enabling ghost army sharing and seasonal reset support.
6. **Onboarding Flow** – Script a guided tutorial overlay (3–4 steps) that highlights key panels, ensures the first deck is valid, and primes players for alliances in Phase 2.

## FUTURE EXPANSIONS
- Firebase sync for live player ghost data.
- Seasonal realm modifiers (e.g., “Blood Moon Week”).
- Relic and crafting systems.
- Alliance battles and event leaderboards.
- Visual polish: animated backgrounds, pixel particles.

## DESIGN GOAL
Rune & Ration is meant to feel both strategic and meditative — a hybrid between a fantasy idle sim and a deck-based auto battler. Every choice (building upgrade, card slot, army composition) meaningfully changes your fate in battle.

The player is not grinding — they are *tuning* a machine of war.

## IMPLEMENTATION ORDER (FOR CODEX)
1. Scaffold all directories and empty module files.
2. Create base HTML and CSS for mobile-first container.
3. Build state/store.js and IndexedDB persistence.
4. Add dummy data (units, cards, terrain) as JSON.
5. Implement resource tick and upgrade logic.
6. Build minimal UI panels for Resource, Build, Army, Deck, Battle.
7. Implement RNG, battle simulation, and ghost system.
8. Hook everything up through main.js and verify full loop.
9. Polish UI, transitions, and pixel alignment.

## CREDITS
Concept: Dark pixel-fantasy strategy  
Framework: Pure JS modular SPA  
Phase 1 Target: Functional offline prototype with auto-battles