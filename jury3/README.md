# Jury Game 3.0 Data Pack

This folder seeds the Jury Game 3.0 prototype with deterministic, cache-friendly JSON files plus a light runtime scaffold (`app.js`). Everything is split into small, schema-validated chunks so the web client can fetch only the data it needs.

## Layout

```
jury3/
├─ index.html          # product brief (unchanged)
├─ app.js              # runtime helpers for the hourly trial loop
└─ data/
   ├─ schema/          # JSON Schema definitions for validation tooling
   ├─ lawyers.json     # roster of AI counsel archetypes
   ├─ jurors.json      # juror bios + weighting heuristics
   ├─ judge.json       # judge voice, guardrails, verdict templates
   ├─ settings.json    # knobs for trials, ranking, security, scheduler
   ├─ prompts.json     # template variables and fallbacks
   ├─ cases.inbox.json # submissions awaiting ranking
   ├─ cases.queue.json # ordered IDs ready for play
   └─ cases.archive.json # decided cases with verdict metadata
```

## Runtime notes

- `app.js` exposes a `window.JuryRuntime` namespace with helpers to pick the hourly case, run a deterministic trial, and read cached JSON data on demand.
- Schema files follow JSON Schema Draft 2020-12 so you can wire them into any validation step.
- All fetches are on-demand; nothing loads the entire docket unless explicitly requested.
- Deterministic seeding keeps lawyer template selections and verdict phrasing stable for replays.

Hook this bundle into any vanilla HTML page by importing `app.js` and calling `JuryRuntime.pickHourlyCase()` followed by `JuryRuntime.runTrial(caseId)`.
