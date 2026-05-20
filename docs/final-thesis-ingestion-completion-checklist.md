# Final Thesis Ingestion Completion Checklist

Inspection date: 2026-05-20

This checklist reflects the repository as inspected locally. No external API fetches were run. Backend code, frontend code, migrations, jobs, and package scripts were not modified.

## 1. Executive Summary

The ingestion implementation is now partially aligned with the final thesis scope:

- Init bootstrap is mostly implemented through `backend/ingestion/initIngestion.js`.
- `fetchStandings.js` supports `init` and `refresh` modes.
- `fetchAllTeamStats.js` supports `init` and `refresh` modes.
- Players and player stats are current-season scoped through `current_season_teams`.
- Raw JSON saving, throttling, retries, freshness helpers, and ingestion run logging exist in some form.

The main missing piece is scheduled refresh orchestration. `backend/jobs/` contains only `.gitkeep`, and `backend/package.json` only exposes `ingestion:init`; there are no weekly, monthly, annual, or fixed-date player refresh jobs. Post-ingestion validation is also not implemented.

Important safety note: `key_passes` still exists in the old `player_stats` schema and `fetchAllPlayerStats.js` maps `s.keyPasses` into it. This is legacy behavior. Do not expand new product, API, or frontend reliance on `key_passes`.

## 2. Current Implementation Status Table

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Ingestion script inventory | Implemented | `backend/ingestion/fetchSeasons.js`, `fetchTournaments.js`, `fetchStandings.js`, `fetchTeams.js`, `fetchTeamLogos.js`, `fetchAllTeamStats.js`, `fetchPlayers.js`, `fetchAllPlayerStats.js`, `initIngestion.js` | All inspected scripts export reusable run functions and support direct execution. |
| Direct execution guards | Implemented | Each ingestion file compares `process.argv[1]` to `fileURLToPath(import.meta.url)` | Direct runs set `process.exitCode = 1` on fatal errors. |
| Reusable exports | Implemented | `runFetchSeasons`, `runFetchTournaments`, `runFetchStandings`, `runFetchTeams`, `runFetchTeamLogos`, `runFetchAllTeamStats`, `runFetchPlayers`, `runFetchAllPlayerStats`, `runInitIngestion` | Suitable for jobs to import later. |
| Init orchestrator | Mostly implemented | `backend/ingestion/initIngestion.js` | Runs seasons, tournaments, standings init, teams, logos, team stats init, players, player stats. Uses ingestion logging and freshness marking. |
| Refresh orchestrators | Missing | `backend/jobs/.gitkeep` only | No weekly/monthly/annual/player fixed-date job files. |
| Package scripts | Partial | `backend/package.json` has `ingestion:init`; no refresh scripts | `test:api` points to `api/fetchTest.js`, which was not found in the file inventory. |
| Config directory | Missing | `backend/config/.gitkeep` only | No schedule or freshness policy config module. |
| Current-season views | Implemented | `20260405130000_create_current_tournament_seasons_view.sql`, `20260405131500_create_current_season_teams_view.sql`, `20260405133000_fix_current_scope_views.sql` | Final fixed view exposes internal and external ids for current tournament seasons and current-season teams. |
| `is_current` calculation | Partial | `fetchSeasons.js`, `backend/lib/utils.js` | `getCurrentSeasonFromList` chooses the season with the greatest parsed end year among selected seasons. No DB constraint was found to enforce only one current season per tournament. |
| Tournament ingestion | Implemented | `fetchTournaments.js` | Reads tournament ids from `seasons`, fetches detail, saves raw JSON, upserts `tournaments`. |
| Last 3 seasons per tournament | Implemented, hardcoded | `fetchSeasons.js` | `TOURNAMENT_IDS = [185, 17, 8, 35, 23]`, `SEASONS_PER_TOURNAMENT = 3`, saves raw JSON, upserts seasons. |
| Teams ingestion | Implemented, standings-derived | `fetchTeams.js` | Reads unique `standings.team_id`, fetches only missing team details, saves raw and derived JSON, throttles. |
| Team logos | Partial | `fetchTeamLogos.js` | Fetches logos for teams with `logo_url` null. Does not detect changed logos. No raw JSON applies because it fetches binary logo buffers. |
| Standings init scope | Implemented | `fetchStandings.js` | `mode: "init"` fetches all DB season/tournament pairs. |
| Standings refresh scope | Implemented | `fetchStandings.js` | Default `refresh` mode reads `current_tournament_seasons`. |
| Team stats init scope | Implemented | `fetchAllTeamStats.js` | `mode: "init"` builds targets from all standings rows. This is standings-backed, not directly all seasons if standings are missing. |
| Team stats refresh scope | Implemented | `fetchAllTeamStats.js` | Default `refresh` mode reads `current_season_teams`. |
| Player ingestion scope | Implemented current-season only | `fetchPlayers.js` | Reads `current_season_teams`; does not fetch historical squads. Skips existing players rather than refreshing existing details. |
| Player stats scope | Implemented current-season only | `fetchAllPlayerStats.js` | Builds requests from `players` plus `current_season_teams`; no historical player stats mode. |
| Transfer history | Not implemented | No matching ingestion file found | Correct for final scope: do not implement transfer history. |
| Raw JSON saving | Mostly implemented | `saveJSON` calls in seasons, tournaments, standings, teams, team stats, players, player stats | Team logos store binary files in Supabase Storage and update `logo_url`; no raw JSON. |
| Throttling | Implemented locally | `THROTTLE_MS` in standings, teams, team logos, team stats, players, player stats | Not centralized. `fetchSeasons.js` and `fetchTournaments.js` do not throttle between tournament calls. |
| Retry/backoff | Implemented centrally | `backend/lib/client.js` | Retries 429, 500, 502, 503, 504, and timeout errors up to 3 times, with `Retry-After` support or exponential backoff. |
| Structured logging | Partial | `backend/lib/ingestionLogger.js`, `20260503_create_ingestion_logging_tables.sql` | DB logging exists for ingestion runs, steps, and API requests. Console logs remain unstructured. |
| Freshness helpers | Partial | `backend/lib/freshness.js` | Can mark/get freshness, but scripts do not use freshness to skip stale/fresh entities except init step marks after success. |
| `job_runs` table | Not needed for current scope | No `job_runs` migration found; scheduled jobs use `backend/lib/ingestionLogger.js` | Reuse `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs` as the job observability layer. Add `job_runs` only if a separate scheduler/job abstraction becomes necessary later. |
| Post-ingestion validation | Missing | No validation scripts found | Duplicate, missing FK, coverage, and abnormal drop/spike checks are still open. |
| GitHub Actions | Missing | `.github/` directory not found | Cloud scheduling is not ready. |

## 3. Init Mode Readiness Checklist

- [x] Fetch the last 3 seasons per configured tournament.
  - Implemented in `fetchSeasons.js` with `TOURNAMENT_IDS` and `SEASONS_PER_TOURNAMENT = 3`.
  - Needs verification: API ordering must be newest-first for `seasons.slice(0, 3)` to mean "last 3 seasons".
- [x] Fetch and store tournament data.
  - Implemented in `fetchTournaments.js`.
  - Depends on seasons existing first because tournament ids are derived from `seasons.tournament_id`.
- [x] Fetch and store team data.
  - Implemented in `fetchTeams.js`.
  - Depends on standings existing first because team ids are derived from `standings`.
- [~] Fetch and store team logos.
  - Missing-logo fetch is implemented in `fetchTeamLogos.js`.
  - Missing work: changed-logo detection.
- [x] Fetch standings for all seasons present in the database.
  - Implemented by `runFetchStandings({ mode: "init" })`.
- [x] Fetch team stats for all seasons present in the database.
  - Implemented as standings-backed team-season-tournament targets by `runFetchAllTeamStats({ mode: "init" })`.
  - Needs verification: if a DB season has no standings rows, team stats will not be fetched for that season.
- [x] Fetch players only for current seasons.
  - Implemented in `fetchPlayers.js` through `current_season_teams`.
- [x] Fetch player stats only for current seasons.
  - Implemented in `fetchAllPlayerStats.js` through `players` plus `current_season_teams`.
- [x] Do not fetch historical player squads.
  - No historical squad mode found.
- [x] Do not fetch historical player stats.
  - No historical player-stat mode found.
- [x] Do not implement transfer history.
  - No transfer-history ingestion implementation found.
- [x] Provide one bootstrap command.
  - `backend/package.json` has `npm run ingestion:init`.
- [~] Record init observability.
  - `initIngestion.js` writes `ingestion_runs` and `ingestion_step_logs`, and `client.js` logs API requests.
  - Missing work: validation summaries and freshness-based skip logic.

## 4. Refresh Mode Readiness Checklist

- [~] Weekly Tuesday midnight refresh for current-season standings and team stats.
  - Script support exists: `fetchStandings.js` default `refresh`, `fetchAllTeamStats.js` default `refresh`.
  - Missing work: no `backend/jobs/weeklyRefresh.js`, package script, or scheduler.
- [~] Monthly 1st-day refresh for current-season player stats.
  - Script support exists: `fetchAllPlayerStats.js` is current-season scoped.
  - Missing work: no monthly job, package script, or scheduler.
- [~] Annual July 1 refresh for tournaments, seasons, teams, missing/changed team logos, and `is_current`.
  - Component scripts exist for tournaments, seasons, teams, and missing logos.
  - Missing work: no annual job; changed-logo detection missing; no DB constraint or cleanup guaranteeing one `is_current` per tournament.
- [~] Fixed-date player refresh on July 1, August 1, October 1, January 1, February 1, and March 1.
  - Component script exists: `fetchPlayers.js`.
  - Missing work: no fixed-date job, package script, or scheduler.
- [x] Use existing current-season views where possible.
  - `fetchStandings.js` refresh uses `current_tournament_seasons`.
  - `fetchAllTeamStats.js`, `fetchPlayers.js`, and `fetchAllPlayerStats.js` use `current_season_teams`.
- [x] Avoid accidental historical player fetches.
  - Player scripts are current-season scoped.
- [~] Avoid accidental historical standings/team-stats refreshes.
  - Script defaults are `refresh`, which is safe.
  - Missing work: scheduled jobs do not exist, so job-level safety cannot be verified.
- [ ] Provide refresh package scripts.
  - Missing.
- [ ] Provide GitHub Actions schedules.
  - Missing.

## 5. Missing Work Grouped By Priority

### Must Do Before Thesis

- Add local job files in `backend/jobs/` for:
  - weekly current-season standings and team stats refresh;
  - monthly current-season player stats refresh;
  - annual July 1 season reset;
  - fixed-date current-season player refresh.
- Add corresponding `backend/package.json` scripts only after each job exists and passes `node --check`.
- Keep using `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs` as the observability layer for ingestion jobs. A separate `job_runs` table is not needed for the current final-thesis scope.
- Add a minimal post-ingestion validation script or module for thesis safety:
  - duplicate detection for unique logical keys;
  - missing foreign key detection across current-scope views and stats tables;
  - coverage validation for current standings, team stats, players, and player stats.
- Make `is_current` recalculation safer:
  - verify season ordering before relying on `slice(0, 3)`;
  - ensure only one current season per tournament after annual refresh;
  - document or implement a reset of stale `is_current` flags if needed.
- Add changed-logo handling or explicitly document that thesis scope only guarantees missing-logo fill.
- Clean or at least document `backend/lib/client.js` import-time behavior:
  - it logs env path/debug details;
  - it calls `process.exit(1)` if API env vars are missing.

### Should Do If Time Allows

- Integrate `entity_freshness` into refresh jobs to skip fresh work and reduce RapidAPI usage.
- Add centralized job error handling helper so all jobs:
  - start and finish an ingestion run;
  - write step-level outcomes;
  - exit `0` on success and `1` on failure.
- Add summary output per job with target/upserted/skipped/failed counts.
- Add abnormal drop/spike checks:
  - standings row count changes;
  - team stats coverage drops;
  - player stats coverage drops;
  - unusually high skeleton-row ratio.
- Add targeted dry-run/list-targets modes that query DB targets without calling the external API.
- Remove or isolate legacy `key_passes` usage from new feature surfaces. Do not make this a broad schema cleanup unless the thesis requires it.

### Future Production Improvement

- Add GitHub Actions workflows after local jobs are deterministic and quota-safe.
- Add cloud secrets documentation for Supabase service key and RapidAPI key.
- Add a queue/worker model only if on-demand refresh becomes necessary.
- Add concurrency control with a small pool and central rate limiter after correctness is stable.
- Add alerting or dashboards from `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs`.
- Add historical on-demand standings/team-stats repair mode only for explicit tournament/season inputs.
- Do not add historical players, historical player stats, or transfer history for the final thesis scope.

## 6. File-by-File Findings

### `AGENTS.md`

- Confirms ingestion scripts live in `backend/ingestion/`.
- Confirms frontend must not access Supabase directly.
- Confirms external `api_id` values are ingestion/backend implementation details.
- Confirms final architecture preference: routes/controllers/services/repositories for public APIs.
- Confirms no new reliance on `key_passes`.

### `backend/package.json`

- Scripts found:
  - `dev`: `node --watch index.js`
  - `start`: `node index.js`
  - `ingestion:init`: `node ingestion/initIngestion.js`
  - `test:api`: `node api/fetchTest.js`
- Missing:
  - weekly refresh script;
  - monthly refresh script;
  - annual refresh script;
  - player fixed-date refresh script.
- Needs verification: `backend/api/fetchTest.js` was not found in the file inventory.

### `backend/ingestion/initIngestion.js`

- Exports `runInitIngestion`.
- Supports direct execution.
- Runs the correct high-level init sequence:
  1. seasons;
  2. tournaments;
  3. standings init;
  4. teams;
  5. team logos;
  6. team stats init;
  7. players;
  8. player stats.
- Uses `ingestionLogger` and `freshness.markFresh`.
- Stops on first failed step and sets `process.exitCode = 1`.
- Missing:
  - no validation stage;
  - no resume/skip based on freshness;
  - no changed-logo logic.

### `backend/ingestion/fetchSeasons.js`

- Exports `runFetchSeasons`.
- Supports direct execution.
- Hardcoded tournament ids: `[185, 17, 8, 35, 23]`.
- Uses `SEASONS_PER_TOURNAMENT = 3`.
- Saves raw JSON to `../data/raw/seasons/...`.
- Sets `is_current` using `getCurrentSeasonFromList(selectedSeasons)`.
- Missing/needs verification:
  - no throttle/retry beyond shared client retry;
  - no config file for tournament ids;
  - no guarantee found that old `is_current` flags are cleared outside selected rows;
  - API response ordering should be verified so `slice(0, 3)` truly means latest 3.

### `backend/ingestion/fetchTournaments.js`

- Exports `runFetchTournaments`.
- Supports direct execution.
- Reads distinct tournament ids from `seasons.tournament_id`.
- Fetches `/tournaments/detail`.
- Saves raw JSON to `../data/raw/tournament/...`.
- Upserts into `tournaments` by `api_id`.
- Missing/needs verification:
  - no throttle between tournament calls;
  - uses season tournament refs that may be external API ids or internal ids depending on data history.

### `backend/ingestion/fetchStandings.js`

- Exports `runFetchStandings({ mode = "refresh" })`.
- Supports direct execution and CLI mode parsing.
- Valid modes: `refresh`, `init`.
- Init mode reads all DB seasons and resolves tournament refs against `tournaments`.
- Refresh mode reads `current_tournament_seasons`.
- Fetches `/tournaments/get-standings`.
- Saves raw JSON to `../data/raw/standings/...`.
- Preserves stage/group fields.
- Upserts by `api_id`.
- Throttles at 300 ms per tournament/season pair.
- Missing:
  - no freshness skip;
  - no post-fetch coverage validation;
  - no protection against duplicate `api_id` semantics if the external standings API changes row ids across stages.

### `backend/ingestion/fetchTeams.js`

- Exports `runFetchTeams`.
- Supports direct execution.
- Reads unique team ids from `standings.team_id`.
- Reads existing `teams.api_id`.
- Fetches only missing team details from `/teams/detail`.
- Saves derived team id lists and raw team detail JSON.
- Upserts `teams` by `api_id`.
- Throttles at 300 ms.
- Missing/needs verification:
  - only missing teams are fetched; annual "refresh teams" may need updates for existing team metadata;
  - derives teams from all standings, not only current standings.

### `backend/ingestion/fetchTeamLogos.js`

- Exports `runFetchTeamLogos`.
- Supports direct execution.
- Selects teams where `logo_url` is null.
- Fetches `/teams/get-logo` as an array buffer.
- Uploads to Supabase Storage bucket `team-logos`.
- Updates `teams.logo_url`.
- Throttles at 300 ms.
- Handles 404 as skipped.
- Missing:
  - changed-logo detection;
  - raw JSON/debug output is not applicable to binary logo fetches;
  - no validation that bucket exists before run.

### `backend/ingestion/fetchAllTeamStats.js`

- Exports `runFetchAllTeamStats({ mode = "refresh" })`.
- Supports direct execution and CLI mode parsing.
- Valid modes: `refresh`, `init`.
- Init mode builds unique team/tournament/season requests from all `standings`.
- Refresh mode builds unique requests from `current_season_teams`.
- Fetches `/teams/get-statistics`.
- Saves raw JSON to `../data/raw/teamStats/...`.
- Writes skeleton rows with `has_stats=false` when stats are missing.
- Upserts by `team_id, season_id, tournament_id`.
- Throttles at 600 ms.
- Missing:
  - no freshness skip;
  - no coverage validation;
  - init mode depends on standings coverage.

### `backend/ingestion/fetchPlayers.js`

- Exports `runFetchPlayers`.
- Supports direct execution.
- Reads current-season teams from `current_season_teams`.
- Fetches squad ids from `/teams/get-squad`.
- Fetches player details from `/players/detail` only for players missing from DB.
- Saves raw squad and player detail JSON.
- Upserts players by `api_id`.
- Links positions through `positions` and `player_positions`.
- Throttles player detail calls at 250 ms.
- Missing/needs verification:
  - existing players are skipped, so player metadata is not refreshed on fixed player dates;
  - team membership updates for existing players may not be captured;
  - no historical squads, which is correct for final scope.

### `backend/ingestion/fetchAllPlayerStats.js`

- Exports `runFetchAllPlayerStats`.
- Supports direct execution.
- Current-season scoped only.
- Builds player requests from `players` plus `current_season_teams`.
- Uses external tournament/season ids for API calls and internal ids for DB rows.
- Saves raw JSON to `../data/raw/playerStats/...`.
- Writes skeleton rows with `has_stats=false` when stats are missing.
- Upserts by `player_id, team_id, season_id, tournament_id`.
- Throttles at 600 ms.
- Legacy caveat: maps `s.keyPasses` to `key_passes`; do not expand new reliance.
- Missing:
  - no explicit `refresh` mode argument, though current-season behavior is effectively refresh-only;
  - no freshness skip;
  - no coverage validation.

### `backend/jobs/`

- Contains only `.gitkeep`.
- Missing all scheduled job implementations.

### `backend/config/`

- Contains only `.gitkeep`.
- Missing centralized schedule/freshness config.

### `backend/lib/client.js`

- Creates the shared Axios client.
- Loads env from `backend/.env`.
- Requires `API_BASE`, `RAPIDAPI_KEY`, and `RAPIDAPI_HOST`.
- Sets request timeout to 45 seconds.
- Logs API requests through `logApiRequest`.
- Retries retryable errors up to 3 times with `Retry-After` or exponential backoff.
- Concerns:
  - logs env-path/debug details on import;
  - calls `process.exit(1)` on missing API env vars, which can surprise imported jobs/tests.

### `backend/lib/freshness.js`

- Defines entity types and stable entity keys.
- Implements `markFresh`, `markFailed`, `markFreshMany`, and `getFreshness`.
- Missing stale-policy helpers and script/job integration for skip decisions.

### `backend/lib/ingestionLogger.js`

- Implements DB logging for:
  - ingestion runs;
  - ingestion step logs;
  - API request logs.
- Sanitizes metadata and redacts sensitive keys.
- Logging failures warn but do not block ingestion.
- Existing table names differ from requested `job_runs`, but they already cover the needed run, step, and API-request observability.

### `supabase/migrations/`

- Core schema exists in `20260329193451_remote_schema.sql`.
- `entity_freshness` exists with unique `(entity_type, entity_key)`.
- `current_tournament_seasons` and `current_season_teams` exist and were later fixed to expose internal and external ids.
- `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs` exist in `20260503_create_ingestion_logging_tables.sql`.
- No `job_runs` table found, and no new migration is recommended for the current ingestion job scope.
- No GitHub Actions workflow found.

### Job Observability Decision

Reuse the existing ingestion observability tables instead of adding a new `job_runs` table.

| Observability option | Existing coverage | Decision |
| --- | --- | --- |
| `ingestion_runs` | Run-level status, `mode`, start/finish timestamps, duration, error message, and metadata. Current job modes such as `weekly-refresh`, `monthly-player-stats-refresh`, `player-refresh`, and `annual-season-reset` can be distinguished through `mode`. | Use as the job/run history table. |
| `ingestion_step_logs` | Per-step status, timings, inserted/updated/skipped/failed counts, errors, and metadata linked to an `ingestion_runs.id`. | Use for job step outcomes and thesis refresh summaries. |
| `api_request_logs` | External API endpoint, params, status code, success flag, duration, error message, and optional links to run and step logs. | Use for request-level debugging and RapidAPI visibility. |
| Requested `job_runs` | Would duplicate the run-level parts of `ingestion_runs` for current ingestion jobs. | Do not add now. Reconsider only if non-ingestion jobs need tracking, scheduler metadata becomes first-class, or retries/attempts need a distinct job model. |

### `docs/transfermind_ingestion_phases_codex_guide.md`

- Mostly matches current architecture, but some sections are now stale:
  - it says no real job support, still true;
  - it previously listed some mode support as future work, but standings and team stats modes now exist;
  - it says no `job_runs`, `ingestion_logs`, or `refresh_queue`; still true for those names, but `ingestion_runs` and step/API logs now exist.

### `README.md`

- Contains older architecture ideas for `backend/scripts/bootstrap.js`, `cronUpdate.js`, transfer history, on-demand refresh, `ingestion_logs`, and GitHub Actions.
- These do not match the current final scope exactly.
- Treat README ingestion sections as aspirational/stale unless updated later.

## 7. Recommended Implementation Order

1. Add `backend/jobs/weeklyRefresh.js`.
   - Calls `runFetchStandings({ mode: "refresh" })` then `runFetchAllTeamStats({ mode: "refresh" })`.
   - Uses shared job error handling or minimal try/catch.

2. Add `backend/jobs/monthlyPlayerStatsRefresh.js`.
   - Calls `runFetchAllPlayerStats()`.
   - Keeps current-season scope.

3. Add `backend/jobs/playerRefresh.js`.
   - Calls `runFetchPlayers()`.
   - Decide whether existing players should be refreshed or only missing players should remain the thesis behavior.

4. Add `backend/jobs/annualSeasonReset.js`.
   - Calls tournaments/seasons/standings refresh or init-compatible current discovery, teams, and logos.
   - Make `is_current` verification explicit.

5. Add backend package scripts for the jobs after they exist and pass syntax checks.

6. Add a lightweight validation module or job step.
   - Start with read-only checks.
   - Do not call external APIs.

7. Integrate freshness skip policy into refresh jobs.
   - Reuse `entity_freshness`.
   - Avoid adding duplicate freshness tables.

8. Decide observability table direction.
   - Prefer existing `ingestion_runs` unless a separate `job_runs` abstraction is justified.

9. Add GitHub Actions only after local jobs are deterministic.

## 8. Risks And Safety Notes

- RapidAPI quota risk: broad init can make many requests. Do not run init accidentally from scheduled jobs.
- Historical player data risk: final scope explicitly excludes historical squads, historical player stats, and transfer history.
- Current-season correctness depends on `seasons.is_current`; there is no DB-level one-current-season-per-tournament guarantee found.
- Team stats init depends on standings coverage; missing standings means missing team-stat targets.
- `fetchPlayers.js` skips existing players, so fixed-date player refresh may not update transferred players unless that behavior is changed.
- Team logos only fetch missing logos; changed logos are not detected.
- `backend/lib/client.js` exits the process on missing API env vars during import.
- Raw JSON paths are relative, such as `../data/raw/...`; expected working directory should be documented before jobs run in CI.
- Existing DB observability tables are named `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs`, not `job_runs`.
- Do not add new reliance on `key_passes`.
- Do not create migrations or GitHub Actions until local behavior is stable and intentionally requested.

## 9. Specific Next Codex Prompts

### Prompt 1: Weekly Refresh Job

Inspect the current ingestion implementation and add a weekly refresh job for the final thesis scope.

Allowed changes:
- Create `backend/jobs/weeklyRefresh.js`.
- Update `backend/package.json` only if the job file is created and syntax-checked.

Requirements:
- Call `runFetchStandings({ mode: "refresh" })`.
- Call `runFetchAllTeamStats({ mode: "refresh" })`.
- Do not fetch players or player stats.
- Do not call init mode.
- Preserve current-season scope.
- Use existing ingestion logging helpers if appropriate.
- Ensure failures set exit code `1`.

Validation:
- Run `node --check backend/jobs/weeklyRefresh.js`.
- Do not run external API fetches unless explicitly asked.

### Prompt 2: Monthly Player Stats Job

Add a monthly current-season player stats refresh job.

Allowed changes:
- Create `backend/jobs/monthlyPlayerStatsRefresh.js`.
- Update `backend/package.json` only after the job exists and passes syntax check.

Requirements:
- Call `runFetchAllPlayerStats()`.
- Keep player stats current-season scoped through `current_season_teams`.
- Do not fetch historical player stats.
- Do not fetch player squads.
- Ensure failures set exit code `1`.

Validation:
- Run `node --check backend/jobs/monthlyPlayerStatsRefresh.js`.
- Do not run external API fetches unless explicitly asked.

### Prompt 3: Fixed-Date Player Refresh Job

Add a fixed-date current-season player refresh job for July 1, August 1, October 1, January 1, February 1, and March 1.

Allowed changes:
- Create `backend/jobs/playerRefresh.js`.
- Update `backend/package.json` only after the job exists and passes syntax check.

Requirements:
- Call `runFetchPlayers()`.
- Keep current-season scope.
- Do not fetch historical squads.
- Identify whether existing players are only skipped or refreshed; do not change that behavior unless explicitly requested.
- Ensure failures set exit code `1`.

Validation:
- Run `node --check backend/jobs/playerRefresh.js`.
- Do not run external API fetches unless explicitly asked.

### Prompt 4: Annual Season Reset Job

Add an annual July 1 reset job for tournament/season/team/logo maintenance.

Allowed changes:
- Create `backend/jobs/annualSeasonReset.js`.
- Update `backend/package.json` only after the job exists and passes syntax check.

Requirements:
- Refresh tournaments, seasons, teams, and missing logos.
- Recalculate or verify `is_current`.
- Do not fetch historical player squads.
- Do not fetch historical player stats.
- Do not implement transfer history.
- Be explicit about whether standings are needed to discover current teams.
- Ensure failures set exit code `1`.

Validation:
- Run `node --check backend/jobs/annualSeasonReset.js`.
- Do not run external API fetches unless explicitly asked.

### Prompt 5: Read-Only Validation Checks

Add read-only post-ingestion validation for final thesis data coverage.

Allowed changes:
- Create a validation helper or script under `backend/ingestion/` or `backend/jobs/`.
- Do not create migrations.
- Do not modify frontend code.

Requirements:
- Check duplicate logical keys for standings, team stats, player stats, teams, players, seasons, and tournaments.
- Check missing foreign-key-like mappings between external id storage tables and internal read views.
- Check current-season coverage:
  - current standings exist;
  - current team stats exist for current-season teams;
  - current players exist for current-season teams;
  - current player stats exist for current-season players where applicable.
- Print a clear summary and exit nonzero on failed validation.
- Do not call external APIs.

Validation:
- Run `node --check` on the new file.
- If running the validation requires DB env vars, ask before executing it.

### Prompt 6: Freshness Skip Policy

Integrate freshness checks into refresh jobs without changing init behavior.

Allowed changes:
- Modify `backend/lib/freshness.js`.
- Modify only the job files that already exist.

Requirements:
- Reuse `entity_freshness`.
- Add a small stale-policy helper.
- Make init ignore freshness.
- Make refresh jobs optionally skip fresh datasets.
- Do not add new tables.
- Do not add frontend UI.

Validation:
- Run `node --check backend/lib/freshness.js`.
- Run `node --check` on touched job files.
- Do not run external API fetches unless explicitly asked.

### Prompt 7: Job Observability Decision

Review existing ingestion observability and decide whether `job_runs` is still needed.

Allowed changes:
- Documentation only, unless explicitly asked for code.

Requirements:
- Compare requested `job_runs` with existing `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs`.
- Recommend reuse or a new migration.
- If recommending a migration, provide the exact table shape but do not create it.

Validation:
- Run `git diff -- docs/`.

### Prompt 8: GitHub Actions Readiness Plan

Create a GitHub Actions readiness plan for ingestion refresh schedules.

Allowed changes:
- Documentation only.

Requirements:
- Cover weekly Tuesday midnight standings/team stats.
- Cover monthly 1st-day player stats.
- Cover annual July 1 reset.
- Cover fixed player refresh dates.
- Include required secrets.
- Include quota/safety notes.
- Do not create workflows yet.

Validation:
- Run `git diff -- docs/`.
