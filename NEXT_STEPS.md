# TransferMind Next-Phase Roadmap

## Summary

The next phase should focus on stabilizing the existing data pipeline before adding transfer-history. The current repo already has the right frontend-to-backend direction and useful DB views, but ingestion and id semantics are still unstable.

## Key Changes

- Phase 1: Stabilize current data pipeline
- Fix season ingestion regression, repair player ingestion, and make player/team stats scripts use one consistent id policy.
- Validate that current-season scoping is real, not just documented.

- Phase 2: Consolidate backend read layer
- Keep simple team/player list/detail reads as direct queries.
- Keep standings/current-scope logic in DB views.
- Add a deterministic current-team-stats view and make standings reads stage-aware.

- Phase 3: Finish transfer-history support
- Add minimal on-demand transfer-history caching and player-team membership resolution.
- Keep current stats tables unchanged in v1 and keep external-id handling inside backend internals.

- Phase 4: Testing / cleanup / thesis-readiness
- Repair npm scripts, add a real smoke-test path, and update README/docs to match the code.
- Remove or reduce UI assumptions that depend on missing backend fields.

## Test Plan

- Re-run ingestion in order and verify seasons, standings, teams, players, and stats counts/samples manually.
- Run frontend build, backend smoke requests, and Postman collection against corrected endpoints.
- Verify one standings case with multiple stages and one player/team case where internal ids and API ids previously diverged.

## Assumptions

- Frontend should continue using backend HTTP only.
- Frontend-facing routes should continue using internal DB ids.
- Transfer-history should start after ingestion correctness and read-layer stability are restored.
