# Jury Game 3.0 Build Plan

## Completed in this iteration
- Added runtime helpers in `app.js` to prepare and consume the hourly trial queue, run trials end-to-end, and record verdict metadata in-memory.
- Structured verdict summaries now include the vote split, factors, and judge copy so the UI can render richer results without recomputing them on the client.

## Next implementation milestones
1. **Live queue dashboard**
   - Build a lightweight control panel (HTML/CSS) that calls `JuryRuntime.prepareQueue()` and `JuryRuntime.progressTrial()`.
   - Display the active case, transcript excerpts, and verdict summary with timestamps.
   - Provide admin-only controls (stubbed) for skipping/pausing cases.
2. **State persistence layer**
   - Replace the transient queue/archive writers with adapters that sync to a backend API or browser storage for demos.
   - Emit custom events (`queue:updated`, `trial:completed`) from `app.js` so the UI can react to state changes.
3. **Juror insight overlays**
   - Extend the juror roster data with avatars and expertise tags.
   - Surface juror tallies, abstentions, and heuristics in the dashboard to explain verdicts.
4. **Moderator tooling**
   - Add log views for judge interjections and security filters (from `settings.security`).
   - Prototype a timeline scrubber that replays transcript rounds using the deterministic seed helpers.
5. **Public landing page polish**
   - Integrate hero metrics and roadmap cards from `index.html` into a cohesive navigation flow.
   - Produce responsive layouts and add CTA routing into the dashboard prototype.

## Research & content tasks
- Draft copy for juror onboarding and moderator guidelines informed by telemetry hooks.
- Identify additional case archetypes to populate `cases.inbox.json`, prioritizing ones that stress new systems (reputation loop, live broadcast).
- Define analytics requirements for measuring trial throughput, juror participation, and moderation interventions.

## Testing & validation
- Unit test deterministic helpers (`hashSeed`, `seededRandom`, queue preparation) with predictable fixtures.
- Run end-to-end smoke tests that simulate multiple hourly cycles and ensure archive summaries stay unique per case.
- Validate JSON payloads against the schemas in `data/schema/` as part of the build pipeline.

