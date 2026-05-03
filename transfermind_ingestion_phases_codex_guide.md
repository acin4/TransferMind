# TransferMind Ingestion Roadmap

This roadmap reflects the repository state inspected on 2026-05-02. It is intentionally scoped for future Codex runs: one small backend/data task at a time, with explicit allowed files and validation.

## 1. Current Project Status

- Frontend stack: React 18, TypeScript, Vite, React Router, Recharts, lucide-react, Tailwind-style utility classes. Frontend API access is centralized in `frontend/src/api/api.ts`.
- Backend stack: Express 5 with ES modules. `backend/index.js` mounts `/health` and `/api`, and `backend/api/routes.js` registers routes.
- Database/Supabase setup: Supabase/PostgreSQL migrations live in `supabase/migrations/`. Backend uses `@supabase/supabase-js` through `backend/lib/supabaseClient.js` with `SUPABASE_SERVICE_KEY`.
- Existing API route style: `route -> controller -> service -> repository -> Supabase`, using `asyncHandler`, `parseInteger`, `HttpError`, and `{ data: ... }` response envelopes.
- Existing ingestion scripts: executable Node scripts live in `backend/ingestion/`. There is no `backend/scripts/` directory. `backend/jobs/` and `backend/config/` currently contain only `.gitkeep`.
- Existing data sources: ingestion calls Sofascore/RapidAPI through `backend/lib/client.js`, using `API_BASE`, `RAPIDAPI_KEY`, and `RAPIDAPI_HOST`.
- Existing cron/job/worker support: no real orchestrator, scheduler, queue worker, GitHub Actions workflow, or package script exists for ingestion jobs. `backend/jobs/` is only a placeholder.
- Existing freshness/logging support: `entity_freshness` already exists in the initial schema migration, and `backend/lib/freshness.js` provides key builders plus `markFresh`, `markFailed`, `markFreshMany`, and `getFreshness`. No `job_runs`, `ingestion_logs`, or `refresh_queue` table was found.
- Existing raw/debug output: ingestion scripts save raw JSON under paths like `backend/data/raw/...` when run from `backend/ingestion/`. `backend/data/.gitignore` exists.
- Existing throttling/retry behavior: scripts use local `delay` helpers and throttle constants. `backend/lib/client.js` retries 429/500/502/503/504 responses up to 3 times with backoff and `Retry-After` support.
- Existing frontend pages relying on ingested data: `Teams.tsx`, `Players.tsx`, `Standings.tsx`, `TeamProfile.tsx`, `PlayerProfile.tsx`, and `TeamsComparison.tsx`. Team Comparison and clustering already have backend endpoints.

## 2. What Already Exists

| Area                                              | Status                   | Existing Files                                                                                                                                                   | Notes                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend HTTP app                                  | Existing                 | `backend/index.js`, `backend/api/routes.js`, `backend/lib/http.js`                                                                                               | Express app, `/health`, `/api`, async/error helpers, `{ data: ... }` success envelopes.                                                                                                                                                      |
| Backend route/controller/service/repository split | Existing                 | `backend/controllers/`, `backend/services/`, `backend/repositories/`                                                                                             | Use this pattern for public APIs. Ingestion scripts may remain script-oriented unless being refactored into reusable ingestion modules.                                                                                                      |
| Supabase client                                   | Existing                 | `backend/lib/supabaseClient.js`                                                                                                                                  | Uses service key from backend env. Do not expose this to frontend.                                                                                                                                                                           |
| Sofascore/RapidAPI client                         | Existing, noisy          | `backend/lib/client.js`                                                                                                                                          | Has env loading, axios client, retry handling, and debug/tutor-style logs/comments. Reuse before introducing a new external API client.                                                                                                      |
| Freshness table                                   | Existing                 | `supabase/migrations/20260329193451_remote_schema.sql`                                                                                                           | `entity_freshness(entity_type, entity_key, last_fetched_at, status, error, updated_at)` already exists. Do not create a second freshness table without a specific reason.                                                                    |
| Freshness helpers                                 | Existing, partial        | `backend/lib/freshness.js`                                                                                                                                       | Has entity types, stable key builder, mark success/failure, bulk mark success, and lookup. Missing stale-policy helper.                                                                                                                      |
| Core schema                                       | Existing                 | `supabase/migrations/20260329193451_remote_schema.sql`                                                                                                           | Tables include `tournaments`, `seasons`, `teams`, `standings`, `players`, `positions`, `player_positions`, `team_stats`, `player_stats`, `entity_freshness`.                                                                                 |
| Current-scope views                               | Existing                 | `20260405130000_create_current_tournament_seasons_view.sql`, `20260405131500_create_current_season_teams_view.sql`, `20260405133000_fix_current_scope_views.sql` | `current_tournament_seasons` and `current_season_teams` already exist and should be reused by current-season refreshes.                                                                                                                      |
| Standings enriched view                           | Existing                 | `add_standings_view_and_public_read.sql`, `update_standigs_view_with_stage_columns.sql`, `20260502120000_fix_standings_team_season_tournament_join.sql`          | `standings_with_team_info` exposes internal and external id references with clearer aliases.                                                                                                                                                 |
| Season ingestion                                  | Existing, partly aligned | `backend/ingestion/fetchSeasons.js`                                                                                                                              | Hardcoded tournament ids `[185, 17, 8, 35, 23]`, marks current season, and currently inserts `rows.slice(0, 3)`. The final roadmap should make this explicit as the last 3 seasons per configured tournament.                                |
| Tournament ingestion                              | Existing                 | `backend/ingestion/fetchTournaments.js`                                                                                                                          | Reads tournament ids from `seasons`, fetches details, upserts `tournaments`, saves raw JSON.                                                                                                                                                 |
| Team ingestion                                    | Existing                 | `backend/ingestion/fetchTeams.js`                                                                                                                                | Reads missing team API ids from `standings`, fetches team details, upserts `teams`, saves raw JSON.                                                                                                                                          |
| Team logo ingestion                               | Existing                 | `backend/ingestion/fetchTeamLogos.js`                                                                                                                            | Fetches logos for teams without `logo_url`, uploads to Supabase Storage bucket `team-logos`, updates `teams.logo_url`.                                                                                                                       |
| Standings ingestion                               | Existing, broad scope    | `backend/ingestion/fetchStandings.js`                                                                                                                            | Reads all seasons with API ids, fetches standings, preserves stage/group fields, upserts by `api_id`, throttles. This matches init mode but is not safe as a recurring refresh default.                                                      |
| Team stats ingestion                              | Existing, broad scope    | `backend/ingestion/fetchAllTeamStats.js`                                                                                                                         | Builds unique requests from all `standings`, fetches stats, writes skeleton rows for missing stats, upserts `team_stats`, saves raw JSON, throttles. This matches init mode but is not safe as a recurring refresh default.                  |
| Player ingestion                                  | Existing, current-scope  | `backend/ingestion/fetchPlayers.js`                                                                                                                              | Reads `current_season_teams`, fetches squads/details, upserts players by `api_id`, links positions using internal player ids. Skips existing players.                                                                                        |
| Player stats ingestion                            | Existing, current-scope  | `backend/ingestion/fetchAllPlayerStats.js`                                                                                                                       | Builds requests from `players` plus `current_season_teams`, uses external tournament/season ids for API calls and internal ids for DB stats rows. Includes the legacy `key_passes` column mapping; do not expand new product reliance on it. |
| Team Comparison backend                           | Existing                 | `GET/POST /api/teams/comparison-dataset`, clustering routes, team service/repository                                                                             | Preserve Custom Comparison and Cluster Analysis.                                                                                                                                                                                             |
| Frontend stale/loading/error UI                   | Existing, local patterns | `frontend/src/pages/*.tsx`, hooks in `frontend/src/hooks/`                                                                                                       | Reuse current page-level loading/error patterns if freshness UI is added later. Do not invent a new UI pattern during ingestion stabilization.                                                                                               |
| Ingestion jobs                                    | Missing                  | `backend/jobs/.gitkeep`                                                                                                                                          | No `bootstrap.js`, weekly job, monthly job, annual reset job, player refresh job, scheduler, or worker exists.                                                                                                                               |
| Ingestion config                                  | Missing                  | `backend/config/.gitkeep`                                                                                                                                        | No config modules exist. Prefer adding minimal policy to `backend/lib/freshness.js` first unless a real config convention appears.                                                                                                           |
| Backend scripts directory                         | Missing                  | none                                                                                                                                                             | Do not plan work under `backend/scripts/` unless the project intentionally creates it later.                                                                                                                                                 |
| API smoke test script                             | Missing                  | `backend/package.json` references `api/fetchTest.js`                                                                                                             | `backend/api/fetchTest.js` was not found. Do not rely on `npm run test:api` until fixed.                                                                                                                                                     |

## 3. Final Data Scope

The final thesis data scope has separate operating modes:

- Init mode is allowed to be broader than recurring refresh jobs. It establishes the full local dataset needed for the thesis.
- Refresh mode is intentionally narrow and should only update current-season datasets on the documented schedule.
- On-demand mode is optional future work for targeted historical corrections only. It should require explicit tournament/season input and should never be the default job behavior.

Mode definitions:

- `init`: broad bootstrap mode for creating or rebuilding the thesis dataset. It fetches standings and team stats for every season already present in the database, while keeping players and player stats current-season scoped.
- `refresh`: recurring maintenance mode for scheduled updates. It fetches standings, team stats, and player stats only for current seasons, using existing current-season views where possible.
- `on-demand`: optional future mode for explicit historical corrections. It may refresh only a requested historical standings dataset or team-stats dataset, requires explicit tournament/season input, and must not include historical player squads or historical player stats.

Init mode should:

- Fetch the last 3 seasons per configured tournament.
- Fetch and store tournament data.
- Fetch and store team data.
- Fetch and store team logos.
- Fetch standings for all seasons that are present in the database.
- Fetch team stats for all seasons that are present in the database.
- Fetch players only for current seasons.
- Fetch player stats only for current seasons.
- Do not fetch historical player squads.
- Do not fetch historical player stats.
- Do not implement transfer history.

Refresh mode should:

- Weekly: every Tuesday at midnight, refresh only current-season standings and current-season team stats.
- Monthly: every 1st day of the month, refresh only current-season player stats.
- Annual: every July 1st, refresh tournaments, seasons, teams, missing or changed team logos, and recalculate `is_current`.
- Player fixed dates: refresh current-season players on July 1, August 1, October 1, January 1, February 1, and March 1.

## 4. Main Gaps

| Priority | Gap                                                                                   | Why It Matters                                                                                                                                  | Suggested Next Step                                                                                       |
| -------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P0       | Ingestion modes are not explicit in scripts                                           | Init and recurring refresh need different scopes. Broad init behavior is valid, but recurring jobs must not fan out across every stored season. | Add an explicit scope model before introducing jobs: `init`, `refresh`, and optional future `on-demand`.  |
| P0       | Season ingestion slices to 3 seasons but does not document that as the final contract | The final scope requires the last 3 seasons per configured tournament, so the code should name this policy directly.                            | Update `fetchSeasons.js` to use an explicit constant/helper for the last 3 seasons.                       |
| P0       | Standings has only broad all-DB-season behavior                                       | This is correct for init but unsafe for weekly refresh.                                                                                         | Add init all-DB-seasons mode and refresh current-season mode.                                             |
| P0       | Team stats has only broad all-standings behavior                                      | This is correct for init but unsafe for weekly refresh.                                                                                         | Add init all-DB-seasons mode and refresh current-season mode while preserving skeleton rows.              |
| P0       | No documented run order for init and recurring refreshes                              | Running scripts out of order can produce missing teams, missing current-season views, or skipped players/stats.                                 | Document flows first, then add orchestrators only after scripts export reusable runners.                  |
| P0       | No real job implementations exist                                                     | The target Tuesday/monthly/annual/fixed-date refreshes are not currently represented in `backend/jobs/` or `backend/package.json`.              | Plan separate jobs after scope-safe runners exist.                                                        |
| P1       | Existing freshness helpers are not integrated into ingestion scripts                  | `entity_freshness` exists but does not currently protect quota or skip fresh entities.                                                          | Add stale-policy helper in `backend/lib/freshness.js`, then integrate it one script at a time.            |
| P1       | Ingestion scripts are self-invoking and hard to compose                               | Jobs cannot safely import and reuse them without triggering immediate execution.                                                                | Refactor one script at a time to export a `run...` function while preserving direct execution.            |
| P1       | No job-level observability                                                            | Failures are visible only in console output; there is no run history table.                                                                     | Defer `job_runs` until after scripts are composable and scheduled/local jobs exist.                       |
| P1       | `backend/lib/client.js` has debug env logs and process exit at import time            | Importing it from jobs/tests can terminate the process and noisy logs weaken maintainability.                                                   | Clean it in a focused utility step without changing retry behavior.                                       |
| P1       | Internal DB ids and external API ids are still mixed in tables and some APIs/types    | This is the main source of bugs in Team Profile, Standings, and comparison data.                                                                | Keep public API inputs/responses internal-id based; isolate external ids in repositories and ingestion.   |
| P2       | No queue or async worker for on-demand refresh                                        | UI-triggered refresh would otherwise block requests and use service-role credentials from web handlers.                                         | Treat on-demand historical refresh as optional future work, not thesis-critical unless explicitly needed. |
| P2       | No GitHub Actions ingestion automation                                                | Scheduled cloud refresh needs secrets and careful quota control.                                                                                | Mark as future production improvement after local refresh is deterministic.                               |

## 5. Target Architecture

Use the current repo shape. Do not recreate the old architecture blindly.

```text
backend/
  api/routes.js                  # Public API route registration.
  controllers/                   # Thin request parsing and response status handling.
  services/                      # Public response shaping and domain rules.
  repositories/                  # Supabase reads for API responses.
  ingestion/                     # External API ingestion scripts and future ingestion modules.
  jobs/                          # Future orchestrators only after scripts export reusable runners.
  lib/
    client.js                    # Shared Sofascore/RapidAPI client.
    supabaseClient.js            # Backend-only service-role Supabase client.
    freshness.js                 # Existing freshness keys and DB helpers; add policy here first.
    utils.js                     # Shared ingestion/stat helpers; can receive small extracted helpers.
  config/                        # Keep placeholder until the repo has enough config to justify it.
supabase/migrations/             # New migrations only; never edit old applied migrations.
frontend/src/api/api.ts          # Frontend gateway for public backend APIs.
```

Architecture decisions:

- Keep `backend/ingestion/`. It already exists and matches AGENTS.md.
- Do not use `backend/scripts/`; it is absent.
- Do not add package scripts until the corresponding job file exists and has been syntax-checked.
- Do not add `ingestion_logs`, `job_runs`, or `refresh_queue` immediately. `entity_freshness` already exists and should be reused first.
- Keep freshness in `backend/lib/freshness.js` for now. `backend/config/freshness.js` can be reconsidered only if policies grow beyond a small helper.
- Prefer `entity_freshness` for backend refresh decisions. Add canonical `last_fetched_at`, `fetch_status`, or `fetch_error` columns only if a specific UI/API response needs display-ready metadata.
- GitHub Actions is realistic only after local refresh is deterministic and secrets/quota risk are documented.
- Reuse current frontend loading/error patterns if freshness status reaches the UI.

## 6. Target Ingestion Flow

### Init Flow

Run manually when bootstrapping or rebuilding the thesis dataset. Init is broader than recurring refresh jobs.

1. `fetchSeasons.js`: fetch the last 3 seasons per configured tournament and recalculate `is_current`.
2. `fetchTournaments.js`: fetch and store tournament details for tournament ids present in `seasons`.
3. `fetchStandings.js` in init mode: fetch standings for all seasons present in the database.
4. `fetchTeams.js`: fetch and store missing teams discovered from standings.
5. `fetchTeamLogos.js`: fetch and store missing team logos, and later support changed logos if the API/source metadata allows it.
6. `fetchAllTeamStats.js` in init mode: fetch team stats for all team/tournament/season combinations present through standings.
7. `fetchPlayers.js`: fetch players only for current-season teams.
8. `fetchAllPlayerStats.js`: fetch player stats only for current-season players and current-season team context.

### Weekly Refresh Flow

Runs every Tuesday at midnight.

1. `fetchStandings.js` in refresh mode: refresh current-season standings only.
2. `fetchAllTeamStats.js` in refresh mode: refresh current-season team stats only.

### Monthly Refresh Flow

Runs every 1st day of the month.

1. `fetchAllPlayerStats.js` in refresh mode: refresh current-season player stats only.

### Annual Season Reset Flow

Runs every July 1st.

1. `fetchTournaments.js`: refresh configured tournament metadata.
2. `fetchSeasons.js`: fetch the last 3 seasons per configured tournament and recalculate `is_current`.
3. `fetchStandings.js` in current-season reset mode or init-compatible mode, as needed to discover current-season teams.
4. `fetchTeams.js`: refresh or fill teams discovered from standings.
5. `fetchTeamLogos.js`: fetch logos that are missing or detected as changed.

### Player Refresh Flow

Runs on July 1, August 1, October 1, January 1, February 1, and March 1.

1. `fetchPlayers.js`: refresh current-season players only.
2. Keep historical squads out of scope.

### Optional On-Demand Flow

Optional future work only if a specific historical correction is needed.

- Accept explicit tournament and season inputs.
- Refresh only the requested standings or team stats dataset.
- Do not run implicitly from weekly/monthly/annual jobs.
- Do not include player squads or player stats for historical seasons.

## 7. Implementation Phases

### Phase 1: Define Ingestion Modes And Scope

- Goal: make the intended scope explicit before changing high-volume scripts.
- Files to inspect: `AGENTS.md`, this roadmap, `backend/ingestion/fetchSeasons.js`, `backend/ingestion/fetchStandings.js`, `backend/ingestion/fetchAllTeamStats.js`, `backend/ingestion/fetchPlayers.js`, `backend/ingestion/fetchAllPlayerStats.js`, `backend/jobs/`, and `backend/package.json`.
- Files allowed to modify: this roadmap only.
- What to change: define `init`, `refresh`, and optional future `on-demand` behavior in documentation. Init can process all DB seasons for standings/team stats; refresh must use current seasons only; players remain current-season scoped.
- What not to change: backend code, frontend code, public API routes, old migrations, schema, jobs, package scripts, Team Comparison behavior, or invented commands.
- Validation steps: run `git diff -- transfermind_ingestion_phases_codex_guide.md`; check that init and refresh mode are clearly separated.
- Codex prompt: see Section 8, Step 1.

### Phase 2: Make Season Scope Explicit

- Goal: make `fetchSeasons.js` explicitly fetch and store the last 3 seasons per configured tournament.
- Files to inspect: `backend/ingestion/fetchSeasons.js`, `backend/lib/utils.js`, current-scope migrations.
- Files allowed to modify: `backend/ingestion/fetchSeasons.js`.
- What to change: replace implicit `slice(0, 3)` behavior with a named constant/helper and clear logging.
- What not to change: tournament ids unless explicitly requested, schema, jobs, package scripts.
- Validation steps: `node --check backend/ingestion/fetchSeasons.js`; inspect diff.
- Codex prompt: see Section 8, Step 2.

### Phase 3: Add Standings Modes

- Goal: support init all-DB-seasons mode and refresh current-season mode.
- Files to inspect: `backend/ingestion/fetchStandings.js`, current-scope migrations, `backend/lib/supabaseClient.js`.
- Files allowed to modify: `backend/ingestion/fetchStandings.js`.
- What to change: keep broad all-DB-seasons behavior for init, add current-season refresh behavior for recurring jobs.
- What not to change: schema, frontend, public APIs, teams ingestion, package scripts.
- Validation steps: `node --check backend/ingestion/fetchStandings.js`; inspect diff.
- Codex prompt: see Section 8, Step 3.

### Phase 4: Add Team Stats Modes

- Goal: support init all-DB-seasons mode and refresh current-season mode.
- Files to inspect: `backend/ingestion/fetchAllTeamStats.js`, `backend/ingestion/fetchStandings.js`, current-scope migrations, `backend/lib/utils.js`.
- Files allowed to modify: `backend/ingestion/fetchAllTeamStats.js`.
- What to change: keep broad all-standings behavior for init, add current-season refresh behavior for recurring jobs.
- What not to change: skeleton-row behavior, stat mapping, schema, frontend, public APIs.
- Validation steps: `node --check backend/ingestion/fetchAllTeamStats.js`; inspect diff.
- Codex prompt: see Section 8, Step 4.

### Phase 5: Preserve Current-Season Player Scope

- Goal: keep players and player stats scoped to current seasons only.
- Files to inspect: `backend/ingestion/fetchPlayers.js`, `backend/ingestion/fetchAllPlayerStats.js`, current-scope migrations.
- Files allowed to modify: one target player ingestion script per Codex run.
- What to change: only clarify scope or make existing current-scope behavior harder to bypass accidentally.
- What not to change: no historical squads, no historical player stats, no product reliance on `key_passes`.
- Validation steps: `node --check` the touched script; inspect diff.
- Codex prompts: see Section 8, Steps 5 and 6.

### Phase 6: Add Job Plans After Runners Are Composable

- Goal: plan separate jobs for the documented refresh schedule without creating them prematurely.
- Files to inspect: `backend/jobs/`, `backend/package.json`, ingestion runner exports.
- Files allowed to modify: one job file per Codex run after required runners exist.
- What to change: add narrowly scoped jobs for weekly, monthly, annual, and player fixed-date refreshes.
- What not to change: no package script until the job exists, no GitHub Actions, no migrations, no frontend.
- Validation steps: `node --check` each new job file; inspect package scripts only if changed.
- Codex prompt: see Section 8, Step 7.

### Phase 7: Add Freshness Policy And Observability Later

- Goal: reduce quota waste and make refresh outcomes inspectable after scope-safe jobs exist.
- Files to inspect: `backend/lib/freshness.js`, `supabase/migrations/`, created job files.
- Files allowed to modify: `backend/lib/freshness.js` first; a new migration/helper only in a separate later run if job history is needed.
- What to change: add stale-policy helpers before adding any job history table.
- What not to change: no queue, no UI refresh, no broad workflow automation in the same run.
- Validation steps: `node --check backend/lib/freshness.js`; inspect diff.

## 8. Phase Details With Codex Prompts

### Codex Prompt

# DONE | Step 1: Define Ingestion Modes And Scope

## Goal

Define clear ingestion modes so future script changes can distinguish bootstrap behavior from recurring refresh behavior.

## Files To Inspect

- `AGENTS.md`
- `transfermind_ingestion_phases_codex_guide.md`
- `backend/ingestion/fetchSeasons.js`
- `backend/ingestion/fetchStandings.js`
- `backend/ingestion/fetchAllTeamStats.js`
- `backend/ingestion/fetchPlayers.js`
- `backend/ingestion/fetchAllPlayerStats.js`
- `backend/jobs/`
- `backend/package.json`

## Allowed Changes

- Modify only `transfermind_ingestion_phases_codex_guide.md`, unless the user explicitly asks for code changes.

## Do Not Change

- Do not modify backend code in this step.
- Do not modify frontend code.
- Do not create migrations.
- Do not create jobs.
- Do not add package scripts.
- Do not invent commands that do not exist.

## Implementation Requirements

- Define `init` as the broad bootstrap mode.
- Define `refresh` as current-season recurring mode.
- Define optional future `on-demand` mode for explicit historical standings/team-stats refreshes only.
- State that init fetches standings and team stats for all seasons present in the database.
- State that recurring refreshes fetch standings/team stats/player stats only for current seasons.
- State that players remain current-season scoped.

## Validation

- Run `git diff -- transfermind_ingestion_phases_codex_guide.md`.
- Check that init mode and refresh mode are clearly separated.

## Output Summary

Summarize:

- File changed
- Mode definitions added
- Validation result
- Follow-up code steps needed

### Codex Prompt

# Step 2: Make fetchSeasons.js Explicitly Fetch The Last 3 Seasons

## Goal

Make `fetchSeasons.js` explicitly fetch and store the last 3 seasons per configured tournament.

## Files To Inspect

- `AGENTS.md`
- `backend/ingestion/fetchSeasons.js`
- `backend/lib/utils.js`
- `supabase/migrations/20260405130000_create_current_tournament_seasons_view.sql`
- `supabase/migrations/20260405133000_fix_current_scope_views.sql`

## Allowed Changes

- Modify only `backend/ingestion/fetchSeasons.js`.

## Do Not Change

- Do not modify frontend files.
- Do not modify public API routes, controllers, services, or repositories.
- Do not create migrations.
- Do not create jobs.
- Do not add package scripts.
- Do not change configured tournament ids unless explicitly requested.

## Implementation Requirements

- Replace implicit `rows.slice(0, 3)` behavior with a named constant such as `SEASONS_PER_TOURNAMENT = 3`.
- Apply the limit before current-season detection if that matches the existing intended behavior, or clearly justify the safer ordering in comments.
- Log the number of fetched seasons and the number selected for storage.
- Keep direct script execution working.
- Preserve raw JSON saving and existing upsert conflict key.
- Keep `is_current` recalculation explicit.

## Validation

- Run `node --check backend/ingestion/fetchSeasons.js`.
- Run `git diff -- backend/ingestion/fetchSeasons.js`.
- Do not run the external API fetch unless explicitly requested.

## Output Summary

Summarize:

- File changed
- Last-3-season behavior
- Validation result
- Any follow-up needed

### Codex Prompt

# Step 3: Make Standings Support Init And Refresh Modes

## Goal

Make `fetchStandings.js` support init all-DB-seasons mode and refresh current-season mode.

## Files To Inspect

- `AGENTS.md`
- `backend/ingestion/fetchStandings.js`
- `backend/lib/client.js`
- `backend/lib/supabaseClient.js`
- `supabase/migrations/20260405130000_create_current_tournament_seasons_view.sql`
- `supabase/migrations/20260405133000_fix_current_scope_views.sql`
- `supabase/migrations/20260502120000_fix_standings_team_season_tournament_join.sql`

## Allowed Changes

- Modify only `backend/ingestion/fetchStandings.js`.

## Do Not Change

- Do not modify frontend files.
- Do not modify public API routes, controllers, services, or repositories.
- Do not create migrations.
- Do not create jobs.
- Do not add package scripts.
- Do not change standings table conflict keys unless a verified schema constraint requires it.

## Implementation Requirements

- Keep init mode able to fetch standings for all seasons present in the database.
- Add refresh mode that fetches only current seasons, preferably using existing current-scope views.
- Make the selected mode explicit in logs.
- Preserve stage/group fields, raw JSON saving, throttling, and retry behavior.
- Preserve clear comments for internal DB ids versus external API ids where useful.
- Do not make historical fetching the recurring default.

## Validation

- Run `node --check backend/ingestion/fetchStandings.js`.
- Run `git diff -- backend/ingestion/fetchStandings.js`.
- Do not run a broad external API fetch unless explicitly requested.

## Output Summary

Summarize:

- File changed
- How init mode works
- How refresh mode works
- Validation result
- Any follow-up needed

### Codex Prompt

# Step 4: Make Team Stats Support Init And Refresh Modes

## Goal

Make `fetchAllTeamStats.js` support init all-DB-seasons mode and refresh current-season mode.

## Files To Inspect

- `AGENTS.md`
- `backend/ingestion/fetchAllTeamStats.js`
- `backend/ingestion/fetchStandings.js`
- `backend/lib/client.js`
- `backend/lib/supabaseClient.js`
- `backend/lib/utils.js`
- `supabase/migrations/20260405131500_create_current_season_teams_view.sql`
- `supabase/migrations/20260405133000_fix_current_scope_views.sql`

## Allowed Changes

- Modify only `backend/ingestion/fetchAllTeamStats.js`.

## Do Not Change

- Do not modify frontend files.
- Do not modify public API routes, controllers, services, or repositories.
- Do not create migrations.
- Do not create jobs.
- Do not add package scripts.
- Do not remove raw JSON saving, throttling, retry behavior, or skeleton rows.
- Do not add new product/API/frontend reliance on `key_passes`.

## Implementation Requirements

- Keep init mode able to fetch team stats for all seasons present in the database through standings.
- Add refresh mode that fetches only current-season team stats, preferably using `current_season_teams` or current-season standings context.
- Make the selected mode explicit in logs.
- Preserve skeleton rows with `has_stats=false` for missing stats.
- Preserve numeric truncation and existing stat mapping.
- Preserve internal/external id semantics.

## Validation

- Run `node --check backend/ingestion/fetchAllTeamStats.js`.
- Run `git diff -- backend/ingestion/fetchAllTeamStats.js`.
- Do not run a broad external API fetch unless explicitly requested.

## Output Summary

Summarize:

- File changed
- How init mode works
- How refresh mode works
- Validation result
- Any follow-up needed

### Codex Prompt

# Step 5: Keep Players Current-Season Only

## Goal

Keep `fetchPlayers.js` scoped to current-season teams only.

## Files To Inspect

- `AGENTS.md`
- `backend/ingestion/fetchPlayers.js`
- `backend/lib/positions.js`
- `backend/lib/client.js`
- `backend/lib/supabaseClient.js`
- `supabase/migrations/20260405131500_create_current_season_teams_view.sql`
- `supabase/migrations/20260405133000_fix_current_scope_views.sql`

## Allowed Changes

- Modify only `backend/ingestion/fetchPlayers.js`.

## Do Not Change

- Do not modify frontend files.
- Do not modify public API routes, controllers, services, or repositories.
- Do not create migrations.
- Do not create jobs.
- Do not add package scripts.
- Do not fetch historical squads.
- Do not alter position schema or player position join-table behavior.

## Implementation Requirements

- Continue reading teams from `current_season_teams`.
- Make logs/comments explicit that the script is current-season scoped.
- Preserve player upsert by `api_id`.
- Preserve position normalization and `player_positions` replacement behavior.
- Preserve throttling and raw JSON saving.
- Do not broaden the script to all teams unless explicitly requested for a separate init-only operation.

## Validation

- Run `node --check backend/ingestion/fetchPlayers.js`.
- Run `git diff -- backend/ingestion/fetchPlayers.js`.
- Do not run the external API fetch unless explicitly requested.

## Output Summary

Summarize:

- File changed
- Current-season scoping preserved
- Validation result
- Any follow-up needed

### Codex Prompt

# Step 6: Keep Player Stats Current-Season Only

## Goal

Keep `fetchAllPlayerStats.js` scoped to current-season player stats only.

## Files To Inspect

- `AGENTS.md`
- `backend/ingestion/fetchAllPlayerStats.js`
- `backend/lib/client.js`
- `backend/lib/supabaseClient.js`
- `backend/lib/utils.js`
- `supabase/migrations/20260405131500_create_current_season_teams_view.sql`
- `supabase/migrations/20260405133000_fix_current_scope_views.sql`

## Allowed Changes

- Modify only `backend/ingestion/fetchAllPlayerStats.js`.

## Do Not Change

- Do not modify frontend files.
- Do not modify public API routes, controllers, services, or repositories.
- Do not create migrations.
- Do not create jobs.
- Do not add package scripts.
- Do not fetch historical player stats.
- Do not add new product/API/frontend reliance on `key_passes`.

## Implementation Requirements

- Continue deriving requests from `players` plus `current_season_teams`.
- Use external tournament/season ids only for API calls.
- Store internal tournament/season/team ids in DB rows where the current schema expects them.
- Make logs/comments explicit that the script is current-season scoped.
- Preserve skeleton rows with `has_stats=false`.
- Preserve throttling, raw JSON saving, numeric truncation, and existing stat mapping.

## Validation

- Run `node --check backend/ingestion/fetchAllPlayerStats.js`.
- Run `git diff -- backend/ingestion/fetchAllPlayerStats.js`.
- Do not run the external API fetch unless explicitly requested.

## Output Summary

Summarize:

- File changed
- Current-season scoping preserved
- Validation result
- Any follow-up needed

### Codex Prompt

# Step 7: Add Separate Job Plans For The Refresh Schedule

## Goal

Add separate local job plans for the final refresh schedule after ingestion runners are composable.

## Files To Inspect

- `AGENTS.md`
- `backend/jobs/`
- `backend/package.json`
- `backend/ingestion/fetchStandings.js`
- `backend/ingestion/fetchAllTeamStats.js`
- `backend/ingestion/fetchAllPlayerStats.js`
- `backend/ingestion/fetchTournaments.js`
- `backend/ingestion/fetchSeasons.js`
- `backend/ingestion/fetchTeams.js`
- `backend/ingestion/fetchTeamLogos.js`
- `backend/ingestion/fetchPlayers.js`
- `backend/lib/freshness.js`

## Allowed Changes

- Add or modify one job plan file per Codex run under `backend/jobs/`.
- Optionally update `backend/package.json` with one script only after the matching job file exists and is syntax-checked.

## Do Not Change

- Do not modify frontend files.
- Do not create migrations.
- Do not add GitHub Actions.
- Do not add queues, workers, or refresh endpoints.
- Do not invent package commands for jobs that do not exist.
- Do not run real external API refreshes unless explicitly requested.

## Implementation Requirements

- Weekly job plan: Tuesday midnight, current-season standings and current-season team stats only.
- Monthly job plan: 1st day of each month, current-season player stats only.
- Annual job plan: July 1st, tournaments, seasons, teams, missing or changed team logos, and `is_current` recalculation.
- Player refresh job plan: July 1, August 1, October 1, January 1, February 1, and March 1, current-season players only.
- Keep each job small and named for its schedule or purpose.
- Jobs should import reusable runners only after scripts have been refactored to export them safely.
- Fail clearly on critical errors and avoid silent partial success.

## Validation

- Run `node --check backend/jobs/<job-file>.js` for any created job file.
- If `backend/package.json` changed, run `npm pkg get scripts` from `backend/`.
- Run `git diff -- backend/jobs backend/package.json`.

## Output Summary

Summarize:

- File changed
- Job schedule covered
- Validation result
- Any follow-up needed

### Codex Prompt

# Step 8: Remove Player Movement History From Future Phases

## Goal

Ensure future roadmap/docs do not include player movement history work as a planned ingestion phase.

## Files To Inspect

- `AGENTS.md`
- `transfermind_ingestion_phases_codex_guide.md`
- `README.md`

## Allowed Changes

- Modify only the documentation file requested by the user.

## Do Not Change

- Do not modify backend code.
- Do not modify frontend code.
- Do not create migrations.
- Do not create jobs.
- Do not add package scripts.

## Implementation Requirements

- Remove any planned future phase for player movement history.
- Remove any recommendation that suggests implementing player movement history after current ingestion stabilizes.
- Keep players and player stats documented as current-season scoped.
- Keep optional on-demand historical refresh limited to standings and team stats.

## Validation

- Search the touched docs for the removed player movement history terms requested by the task.
- Run `git diff -- transfermind_ingestion_phases_codex_guide.md README.md`.

## Output Summary

Summarize:

- File changed
- Removed roadmap items
- Validation result
- Any follow-up needed

## 9. Recommended Order

### Next 5 Codex Steps

1. Define ingestion mode conventions in the roadmap/scripts: `init`, `refresh`, and optional explicit `on-demand`.
2. Update `fetchSeasons.js` so the last-3-seasons policy is named, logged, and easy to validate.
3. Update `fetchStandings.js` to support init all-DB-seasons mode and refresh current-season mode.
4. Update `fetchAllTeamStats.js` to support init all-DB-seasons mode and refresh current-season mode while preserving skeleton rows.
5. Update `fetchPlayers.js` and `fetchAllPlayerStats.js` only as needed to make current-season-only scope explicit, then plan the separate refresh jobs.

### Must Do Before Thesis

1. Make `fetchSeasons.js` explicitly document and implement the last-3-seasons-per-tournament scope.
2. Make `fetchStandings.js` mode-aware: init all DB seasons, refresh current seasons only.
3. Make `fetchAllTeamStats.js` mode-aware: init all DB seasons, refresh current seasons only.
4. Verify `fetchPlayers.js` remains current-season only.
5. Verify `fetchAllPlayerStats.js` remains current-season only and still writes internal team/tournament/season ids while using external ids only for API calls.

### Nice To Have

1. Refactor high-volume ingestion scripts into exported runners while preserving direct execution.
2. Add stale-policy helpers to `backend/lib/freshness.js` and integrate them into one high-volume script first.
3. Clean `backend/lib/client.js` debug output and import-time `process.exit(1)` behavior in a focused utility cleanup.
4. Add separate local jobs for weekly, monthly, annual, and fixed-date player refreshes after runner exports exist.
5. Repair or remove the missing `backend/api/fetchTest.js` package script reference.

### Future Production Improvements

1. Add `job_runs` and a job-run logger after local jobs exist.
2. Add a queued async refresh system only after hosting assumptions are clear.
3. Add on-demand refresh endpoints only after the queue/worker exists.
4. Add GitHub Actions only after local refresh is deterministic and required secrets/quota controls are documented.

## 10. Risk Notes

- Sofascore/RapidAPI quota usage: `fetchStandings.js` and `fetchAllTeamStats.js` can fan out across all seasons in init mode. Do not run broad init or on-demand fetches accidentally.
- Duplicate data: upsert conflict keys exist, but stage-aware standings and mixed id references can still create confusing duplicates if API ids and DB ids are crossed.
- DB id vs external API id confusion: public frontend routes and API responses should use internal DB ids. External `api_id` values belong in ingestion and repository internals.
- Historical season over-fetching: historical standings/team-stats refreshes should remain explicit/manual until freshness and on-demand behavior are implemented.
- Supabase service role usage in GitHub Actions: never add workflows until secrets handling and quota limits are documented. Do not expose service role keys to frontend.
- Running async refresh from UI: synchronous UI-triggered refresh risks long HTTP requests, quota spikes, and service-role operations in request handlers. Prefer queued refresh later.
- Existing page behavior: do not break Team Stats, Team Comparison, Custom Comparison, Cluster Analysis, Standings, Team Profile, or Player pages while stabilizing ingestion.
- `key_passes`: it exists in the old `player_stats` schema/script, but project rules say not to add new product/API/frontend reliance on it.
- Old migrations: never edit applied migrations. Add new migrations only when schema changes are explicitly needed.
- Raw JSON output: existing scripts intentionally save debug/raw payloads. Preserve that behavior unless a task explicitly changes ingestion storage.
