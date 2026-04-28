# TransferMind Architecture Refactor Audit

## 1. Executive Summary

TransferMind is broadly aligned with the intended thesis architecture: the React frontend calls a Node/Express backend, and the backend already has a recognizable route/controller/service/repository split. The database layer also contains useful Supabase/PostgreSQL views, especially for current tournament seasons, current season teams, and standings enriched with team information.

The main thesis-quality issue is not the absence of layers. It is that some page-level frontend code still acts like an application/data-service layer. `TeamsComparison.tsx`, `TeamProfile.tsx`, and `Standings.tsx` fetch multiple resources, join or group data, select seasons/stages, normalize rows, and build derived view models that would be easier to explain and maintain if the backend returned frontend-ready responses.

The biggest frontend/backend responsibility leaks are:

- `frontend/src/pages/TeamsComparison.tsx` builds a team-season-stat dataset by fetching all teams, then all seasons per team, then stats per team-season.
- `frontend/src/pages/TeamProfile.tsx` combines team, squad, seasons, stats, and standings, then chooses the relevant standings group and mini-table in the browser.
- `frontend/src/pages/Standings.tsx` reconstructs standings group keys, labels, stage priority, deduplication, and selected group behavior client-side.
- Several frontend pages use `any[]` and know raw API/database field names such as `season_id`, `tournament_id`, `standing_group_id`, and `stage_tournament_id`.

The biggest boilerplate/repetition problems are:

- Repeated `useEffect` + `loading` + `error` + empty-state handling across pages.
- Repeated tab button styling across `Teams.tsx`, `Standings.tsx`, `TeamProfile.tsx`, and `TeamsComparison.tsx`.
- Repeated select/dropdown shell styling for league and season controls.
- Repeated team location/stadium normalization in `Teams.tsx` and `TeamProfile.tsx`.
- Repeated standings grouping/deduplication logic in `Standings.tsx` and `TeamProfile.tsx`.
- Types are scattered and partial, with API response types mostly local to pages/utilities.

Suggested refactor order:

1. Add shared frontend response types and small UI/fetching primitives.
2. Move the team comparison dataset assembly behind a backend endpoint.
3. Make standings stage/grouping a backend response contract.
4. Add a team profile season view-model endpoint.
5. Clean up backend mapper placement and ingestion helper duplication only after the high-impact read-path changes.

## 2. Findings Table

| Priority | Area                    | File path                                                                                                                                          | Current issue                                                                                                                      | Why it matters                                                                                                                            | Recommended fix                                                                                                                                                   | Difficulty                                                                                                                   | Before thesis submission |
| -------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --- |
| DONE     | High                    | Frontend / API Contract                                                                                                                            | `frontend/src/pages/TeamsComparison.tsx`                                                                                           | Builds a comparison dataset through many frontend calls: teams, seasons per team, stats per team-season, plus module-level caches.        | The frontend is doing backend-style aggregation and orchestration. It is hard to explain as a pure UI layer and creates many requests.                            | Add `GET /api/teams/comparison-dataset` returning ready `entries`. Frontend should fetch once and render.                    | Moderate                 | Yes |
| DONE     | High                    | Frontend / API Contract                                                                                                                            | `frontend/src/pages/TeamProfile.tsx`                                                                                               | Fetches team, squad, seasons, stats, standings, then selects standings group and mini-table client-side.                                  | Team profile becomes a data composition layer rather than a page renderer. Domain rules for season/tournament/stage selection are duplicated outside the backend. | Add `GET /api/teams/:id/profile?seasonId=...` or `GET /api/teams/:id/season-view?seasonId=...` returning profile-ready data. | Moderate                 | Yes |
| DONE     | High                    | Frontend / API Contract                                                                                                                            | `frontend/src/pages/Standings.tsx`                                                                                                 | Groups standings rows, builds group keys/labels, applies stage priority, dedupes rows by team, and decides selected group in the browser. | Standings stage semantics belong in the backend/database contract. The frontend currently knows too much about standings schema and competition structure.        | Make `GET /api/standings` return grouped, deduped, sorted standings with a selected/default group.                           | Moderate                 | Yes |
| DONE | High     | API Contract / Backend  | `backend/services/standingsService.js`, `backend/repositories/standingsRepository.js`                                                              | Backend returns a flat standings row array while preserving stage fields, forcing frontend grouping.                               | The API exposes raw-ish rows rather than a page-ready model.                                                                              | Return `{ groups, selectedGroupKey }`; each group should include labels, ids, and sorted rows.                                                                    | Moderate                                                                                                                     | Yes                      |
| DONE | High     | API Contract            | `frontend/src/pages/TeamsComparison.tsx`, `frontend/src/utils/teamsComparison.ts`                                                                  | Relative score ranges and comparison pool are computed client-side from a dataset assembled client-side.                           | The UI needs chart interaction, but the dataset should already be complete and consistently shaped by the backend.                        | Backend should return complete entries with numeric stats normalized to `number                                                                                   | null`; keep interactive score/range display in frontend for thesis clarity.                                                  | Moderate                 | Yes |
| DONE |Medium   | Frontend                | `frontend/src/pages/TeamProfile.tsx`                                                                                                               | Very large page component with fetching, transformation, routing query construction, display helpers, and tab content in one file. | Hard to maintain and hard to describe cleanly in a thesis architecture chapter.                                                           | Split into page-level container plus `TeamHeader`, `TeamStatsPanel`, `TeamSquadTable`, `TeamStandingsPreview`, and shared controls.                               | Moderate                                                                                                                     | Yes                      |
|  DONE| Medium   | Frontend                | `frontend/src/pages/Standings.tsx`                                                                                                                 | Large page component mixes URL param parsing, data fetching, grouping logic, controls, and table rendering.                        | Responsibility boundaries inside the frontend are unclear.                                                                                | After backend grouping, extract `StandingsFilters`, `StageTabs`, and `StandingsTable`.                                                                            | Moderate                                                                                                                     | Yes                      |
| DONE| Medium   | Frontend                | `frontend/src/pages/Home.tsx`                                                                                                                      | Loads full players and teams lists, then filters search results locally.                                                           | Acceptable for small thesis data, but it duplicates search/filter responsibility and can become inefficient as data grows.                | Optional `GET /api/search?q=...` returning small team/player result lists.                                                                                        | Moderate                                                                                                                     | Optional                 |
|  DONE | Medium   | Frontend                | `frontend/src/pages/Teams.tsx`, `frontend/src/pages/TeamProfile.tsx`                                                                               | Duplicate `normalizeCountry`, `getTeamLocation`, and `getTeamStadium` helpers.                                                     | Repeated display model logic creates drift and noise.                                                                                     | Extract `frontend/src/utils/teamDisplay.ts` or have backend return `location_label` and `stadium_label`.                                                          | Quick                                                                                                                        | Yes                      |
| Medium   | Frontend                | `frontend/src/pages/Standings.tsx`, `frontend/src/pages/TeamProfile.tsx`                                                                           | Duplicate standings row deduplication by team.                                                                                     | A subtle domain rule exists in two frontend places.                                                                                       | Move to backend grouped standings response; if delayed, extract one shared frontend helper.                                                                       | Quick                                                                                                                        | Yes                      |
| Medium   | Frontend                | `frontend/src/pages/*.tsx`                                                                                                                         | Repeated `useEffect`, `loading`, `error`, reset, and empty-state patterns.                                                         | Boilerplate hides page intent and increases error handling inconsistency.                                                                 | Add `useApiResource` or narrow page-specific hooks such as `useTeams`, `usePlayers`, `useStandings`.                                                              | Quick                                                                                                                        | Yes                      |
| Medium   | Frontend                | `frontend/src/pages/Teams.tsx`, `frontend/src/pages/Standings.tsx`, `frontend/src/pages/TeamProfile.tsx`, `frontend/src/pages/TeamsComparison.tsx` | Repeated tab button class groups and behavior.                                                                                     | Styling changes require multiple edits and the code is visually noisy.                                                                    | Extract shared `TabButton` / `SegmentedTabs` component.                                                                                                           | Quick                                                                                                                        | Yes                      |
| Medium   | Frontend                | `frontend/src/pages/Standings.tsx`, `frontend/src/pages/TeamProfile.tsx`                                                                           | Repeated season/league dropdown shell styling.                                                                                     | UI consistency is being maintained by copy-paste.                                                                                         | Extract shared `IconSelect` or `SeasonSelect`.                                                                                                                    | Quick                                                                                                                        | Optional                 |
| Medium   | API Contract / Frontend | `frontend/src/api/api.ts`                                                                                                                          | API client returns untyped `payload?.data`; only team types are partially defined.                                                 | Pages fall back to `any`, which weakens TypeScript and obscures API contracts.                                                            | Add shared response types and generic `request<T>()`; type all exported API functions.                                                                            | Quick                                                                                                                        | Yes                      |
| Medium   | API Contract / Frontend | `frontend/src/pages/Players.tsx`, `backend/services/playerService.js`                                                                              | `Players.tsx` reads `p.player_stats?.[0]`, but backend list players currently returns sanitized player rows without nested stats.  | UI and API contract are out of sync.                                                                                                      | Either enrich `/api/players` with list-card stats or remove stats display from the list page.                                                                     | Quick                                                                                                                        | Yes                      |
| Medium   | API Contract / Frontend | `frontend/src/pages/PlayerProfile.tsx`, `backend/services/playerService.js`                                                                        | Player profile renders very little despite backend returning raw-ish player fields.                                                | The page is not a clear thesis-quality profile view and lacks a shaped response contract.                                                 | Add a player profile response shape with normalized display fields; keep scope modest.                                                                            | Moderate                                                                                                                     | Optional                 |
| Medium   | Backend                 | `backend/repositories/teamRepository.js`                                                                                                           | Repository contains participation selection, badge labels, fallback country selection, and profile mapping logic.                  | Repository is partly doing service/mapper work, making backend responsibilities less clean.                                               | Keep queries in repository; move participation selection/mapping to `teamService` or a mapper utility.                                                            | Moderate                                                                                                                     | Optional                 |
| Medium   | Backend                 | `backend/repositories/playerRepository.js`                                                                                                         | Returns `select("*")` rows from `players`.                                                                                         | Frontend-facing contracts can accidentally inherit database details.                                                                      | Select explicit columns and map to response DTOs in service.                                                                                                      | Quick                                                                                                                        | Yes                      |
| Medium   | Backend / API Contract  | `backend/services/teamService.js`, `backend/repositories/teamRepository.js`                                                                        | `getLatestTeamStatsByApiId` reads one stats row with no explicit ordering or season contract when no season is supplied.           | “Latest” or default stats behavior is under-specified and hard to defend.                                                                 | Make the default stats endpoint current-season based or require `seasonId`; document the behavior.                                                                | Moderate                                                                                                                     | Yes                      |
| Medium   | Backend / Database      | `supabase/migrations/*current*_views.sql`, repositories                                                                                            | Internal DB ids and external API ids are mixed in tables/views with generic names like `team_id`, `season_id`, `tournament_id`.    | ID semantics are the main architectural confusion in the repo.                                                                            | Keep external ids internal to ingestion/repositories; expose internal ids in API. Consider clear aliases in views: `team_db_id`, `team_api_id`.                   | Large                                                                                                                        | Yes                      |
| Medium   | Ingestion               | `backend/ingestion/fetchAllTeamStats.js`, `backend/ingestion/fetchAllPlayerStats.js`                                                               | Duplicated paginated Supabase fetch helpers, throttling, raw JSON saving, and stats upsert skeleton patterns.                      | Ingestion is harder to maintain and explain as a pipeline.                                                                                | Extract `fetchAllRows`, `delay`, and raw-save helpers into ingestion utilities.                                                                                   | Moderate                                                                                                                     | Optional                 |
| Medium   | Ingestion               | `backend/ingestion/fetchSeasons.js`, `backend/ingestion/fetchStandings.js`                                                                         | Tournament/season scope is script-driven and partly hardcoded.                                                                     | Thesis explanation is easier if ingestion scope is explicit and documented.                                                               | Keep hardcoded scope if thesis dataset is fixed, but document it clearly; do not overbuild scheduler/orchestrator now.                                            | Quick                                                                                                                        | Optional                 |
| Low      | Frontend                | `frontend/src/utils/teamsComparison.ts`                                                                                                            | `formatRawStatValue` fallback shows mojibake (`â€”`) instead of an em dash or ASCII fallback.                                      | Small polish issue visible in tooltips.                                                                                                   | Replace with `-` or a proper dash.                                                                                                                                | Quick                                                                                                                        | Yes                      |
| Low      | Frontend                | `frontend/src/App.tsx`                                                                                                                             | Stale explanatory comments remain around imports/routes.                                                                           | Comments make the thesis code feel experimental.                                                                                          | Remove stale comments.                                                                                                                                            | Quick                                                                                                                        | Optional                 |
| Low      | Backend                 | `backend/lib/client.js`, `backend/lib/positions.js`, `backend/lib/utils.js`                                                                        | Debug logs and overly tutorial-style comments remain in shared backend utilities.                                                  | Noisy code weakens maintainability/readability.                                                                                           | Reduce comments to intent-level notes and remove debug logs.                                                                                                      | Quick                                                                                                                        | Optional                 |
| Low      | Tooling                 | root `package.json`, `backend/package.json`, `frontend/package.json`                                                                               | Root package has no workflow; backend `test:api` references a missing file; frontend has build/lint scripts only inside frontend.  | Thesis reproducibility is less clear.                                                                                                     | Add a minimal README workflow or root scripts for frontend build and backend start/smoke.                                                                         | Quick                                                                                                                        | Optional                 |

### Well-Structured Areas

- `backend/api/routes.js` is concise and keeps route registration separate from controller logic.
- Backend controllers are thin and mostly limited to parsing request inputs and returning JSON.
- `backend/lib/http.js` provides useful shared `asyncHandler`, `HttpError`, and parsing/error handling.
- `backend/lib/seasonLabels.js` is a good example of a small focused utility.
- `frontend/src/teamStatsConfig.ts` is a useful frontend display metadata file and should not be folded into page code.
- `frontend/src/components/teams-comparison/SearchableCheckboxPanel.tsx` is already a good reusable component.

## 3. Move From Frontend To Backend

### 3.1 Team Comparison Dataset

Current frontend files involved:

- `frontend/src/pages/TeamsComparison.tsx`
- `frontend/src/utils/teamsComparison.ts`
- `frontend/src/components/teams-comparison/CustomComparisonTab.tsx`
- `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx`

Current frontend behavior:

- Fetches all teams with `getTeams()`.
- For every team, fetches seasons with `getTeamSeasons(team.id)` in frontend batches.
- Flattens every team-season pair into an entry.
- For every entry, fetches stats with `getTeamStats(entry.teamId, entry.seasonId)` in frontend batches.
- Sanitizes raw stats into numeric values in the browser.
- Uses module-level caches to avoid repeated work.

Why it belongs in the backend:

- This is a backend aggregation endpoint by nature: team, season, tournament, and stats relationships are database/backend concerns.
- The frontend currently performs request orchestration and joins that should be centralized.
- A single endpoint is easier to explain: backend exposes a clean comparison dataset; frontend renders charts and interactive selections.

Suggested backend endpoint:

`GET /api/teams/comparison-dataset`

Proposed response shape:

```json
{
  "data": {
    "entries": [
      {
        "id": "team-12-season-34",
        "teamId": 12,
        "teamName": "Example FC",
        "seasonId": 34,
        "seasonName": "25/26",
        "tournamentId": 7,
        "tournamentName": "Example League",
        "label": "Example FC - 25/26",
        "stats": {
          "goals_scored": 52,
          "assists": 31,
          "goals_conceded": 28
        }
      }
    ]
  }
}
```

Expected frontend simplification:

- `TeamsComparison.tsx` becomes a one-request page.
- Remove `mapInBatches`, `teamsCache`, `seasonsCache`, `statsCache`, and `datasetPromise` from the frontend.
- Keep user interaction, chart mode selection, k-means clustering, and relative chart display in frontend because those are UI/analysis interactions.

### 3.2 Team Profile Season View

Current frontend files involved:

- `frontend/src/pages/TeamProfile.tsx`
- `frontend/src/api/api.ts`

Current frontend behavior:

- Fetches team details, squad, and seasons in one effect.
- Chooses default season client-side.
- Fetches team stats and standings in another effect.
- Determines the correct standings tournament from selected season/team.
- Groups/dedupes standings rows and picks a mini-table around the current team.
- Builds URL query params for the full standings page.

Why it belongs in the backend:

- The backend knows team/season/tournament relationships and can pick the correct standings group consistently.
- The frontend should not understand `standing_group_id`, `stage_tournament_id`, stage priority, or internal/external ID translation.
- A profile view model is easier to document in the thesis: backend composes the profile, frontend renders tabs.

Suggested backend endpoint:

`GET /api/teams/:id/profile?seasonId=123`

Proposed response shape:

```json
{
  "data": {
    "team": {
      "id": 12,
      "name": "Example FC",
      "logo_url": "...",
      "location_label": "Athens, Greece",
      "stadium_label": "Example Stadium",
      "tournament_id": 7,
      "tournament_name": "Example League"
    },
    "seasons": [
      {
        "season_id": 34,
        "season_name": "25/26",
        "tournament_id": 7,
        "tournament_name": "Example League",
        "is_current": true
      }
    ],
    "selectedSeason": {
      "season_id": 34,
      "season_name": "25/26",
      "tournament_id": 7,
      "tournament_name": "Example League"
    },
    "stats": {
      "goals_scored": 52,
      "assists": 31
    },
    "squad": [
      {
        "id": 99,
        "name": "Player Name",
        "nationality": "Greece",
        "position": "MF",
        "age": 24,
        "photo_url": null
      }
    ],
    "standingsPreview": {
      "label": "Example League - 25/26",
      "teamRow": {
        "team_id": 12,
        "team_name": "Example FC",
        "position": 3,
        "matches": 20,
        "wins": 12,
        "draws": 5,
        "losses": 3,
        "points": 41
      },
      "rows": []
    },
    "standingsLinkParams": {
      "tournamentId": 7,
      "seasonId": 34,
      "standingGroupId": null,
      "stageTournamentId": null
    }
  }
}
```

Expected frontend simplification:

- Team profile state becomes `profile`, `selectedSeasonId`, `activeTab`, and loading/error.
- Delete frontend standings group selection helpers from `TeamProfile.tsx`.
- Keep tab rendering and stat category selection in frontend.

### 3.3 Stage-Aware Standings

Current frontend files involved:

- `frontend/src/pages/Standings.tsx`
- `frontend/src/pages/TeamProfile.tsx`

Current frontend behavior:

- Creates group keys from stage/standing identifiers.
- Creates labels from stage and group names.
- Sorts groups by hardcoded stage priority.
- Dedupes rows by team and picks one row per team.
- Chooses default/requested group using URL params.

Why it belongs in the backend:

- Stage/group semantics are part of the competition data model.
- Backend already reads `standings_with_team_info`; it should shape the rows into stable groups.
- A grouped standings API prevents every page from re-implementing the same rules.

Suggested backend endpoint change:

Keep `GET /api/standings?tournamentId=7&seasonId=34`, but change response from a flat array to a grouped object.

Proposed response shape:

```json
{
  "data": {
    "tournamentId": 7,
    "seasonId": 34,
    "selectedGroupKey": "stage:100::group:200",
    "groups": [
      {
        "key": "stage:100::group:200",
        "label": "Regular Season",
        "standingGroupId": 200,
        "stageTournamentId": 100,
        "rows": [
          {
            "id": 1,
            "team_id": 12,
            "team_name": "Example FC",
            "position": 1,
            "matches": 20,
            "wins": 14,
            "draws": 4,
            "losses": 2,
            "goals_for": 45,
            "goals_against": 18,
            "goal_diff": 27,
            "points": 46
          }
        ]
      }
    ]
  }
}
```

Expected frontend simplification:

- `Standings.tsx` renders `groups`, `selectedGroupKey`, and selected rows.
- Delete frontend `STAGE_ORDER`, `STAGE_PRIORITY`, group key creation, label creation, and dedupe helpers.
- `TeamProfile.tsx` can reuse the same backend grouping or receive its own `standingsPreview`.

### 3.4 Search/Home Data

Current frontend files involved:

- `frontend/src/pages/Home.tsx`

Current frontend behavior:

- Loads all players and all teams on home page mount.
- Filters both arrays locally as the user types.

Why it may belong in the backend:

- Search is a backend/filtering concern once data grows.
- It avoids transferring full lists just to show a few search results.

Suggested backend endpoint:

`GET /api/search?q=olym`

Proposed response shape:

```json
{
  "data": {
    "teams": [{ "id": 12, "name": "Olympiacos" }],
    "players": [{ "id": 99, "name": "Player Name" }]
  }
}
```

Expected frontend simplification:

- Home keeps only `query`, `results`, and loading/error state.
- This is optional before thesis submission if the dataset is small and local filtering is acceptable for the demo.

## 4. Boilerplate Cleanup

### Components To Extract

- `TabButton` / `SegmentedTabs`: used in `Teams.tsx`, `Standings.tsx`, `TeamProfile.tsx`, and `TeamsComparison.tsx`.
- `IconSelect`: reusable styled select with a left icon and right chevron for league and season dropdowns.
- `LoadingState`: shared full-page and panel loading variants.
- `ErrorState`: shared full-page and panel error variants.
- `EmptyState`: shared dashed empty state.
- `StandingsTable`: render full standings rows.
- `CompactStandingsTable`: render the team profile mini standings preview.
- `TeamMetaLine`: shared icon/value row used in teams list and team profile header.

### Hooks To Extract

- `useApiResource<T>(loader, deps)`: narrow helper for one-shot load/error/data pages.
- `useTeamSeasons(teamId)`: loads seasons and picks current/default season.
- `useStandingsGroups`: only useful as a temporary frontend helper if backend grouped standings is not implemented immediately.
- `useSearchResults`: if `/api/search` is added.

### Utilities / Config To Extract

- `frontend/src/utils/teamDisplay.ts`: `normalizeCountry`, `getTeamLocation`, `getTeamStadium`.
- `frontend/src/utils/standingsDisplay.ts`: temporary stage/group helpers if backend move is delayed.
- `frontend/src/utils/routeParams.ts`: parsing optional numbers and building standings query params.
- Keep `frontend/src/teamStatsConfig.ts` as the frontend display metadata source for labels/categories/formatting.
- Add a backend stat allowlist if the comparison dataset endpoint should expose only known team stats.

### Types To Centralize

Create `frontend/src/api/types.ts` or split by domain:

- `TeamListItem`
- `TeamProfileData`
- `TeamSeason`
- `TeamStats`
- `PlayerListItem`
- `PlayerProfileData`
- `StandingsRow`
- `StandingsGroup`
- `StandingsResponse`
- `TeamSeasonStatEntry`
- `SearchResponse`

Then type API methods in `frontend/src/api/api.ts` with a generic request helper:

```ts
async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload?.data as T;
}
```

### Code To Delete Or Clean

- Remove stale route/import comments in `frontend/src/App.tsx`.
- Remove debug env-path logging from `backend/lib/client.js`.
- Remove debug position logs and commented-out obsolete code in `backend/lib/positions.js`.
- Replace the mojibake fallback in `frontend/src/utils/teamsComparison.ts` with `"-"` or a proper dash.
- If `Players.tsx` remains simple, remove display of `p.player_stats?.[0]` unless the backend intentionally returns it.

## 5. API Contract And Response Shaping

Current strengths:

- API responses consistently use `{ data: ... }` for success.
- Controllers are thin and easy to follow.
- Services already sanitize teams and players in several places.
- Backend already hides some external API ids from frontend responses, especially in `playerService.js` and `standingsService.js`.

Problems to address:

- Some endpoints return arrays where the frontend needs grouped view models, especially standings.
- `getTeams()` and `getTeam()` return useful but partial display data; frontend still derives location/stadium labels.
- `/api/players` does not match what `Players.tsx` tries to render if player stats are expected.
- `team_stats` responses expose raw database/stat column names directly. This is acceptable for a thesis if the stat config documents them, but the API contract should still be typed.
- Null and fallback labels are often handled in the frontend (`Unknown Team`, `Tournament ${id}`, `Season ${id}`).

Recommended realistic response-shaping changes:

- Backend should return display labels for common page headers and selectors: `season_name`, `tournament_name`, `location_label`, `stadium_label`.
- Backend should return standings already grouped/sorted/deduped.
- Backend should return numeric stats as numbers or `null`, not mixed `number | string | null`, for comparison-focused endpoints.
- Keep the existing `{ data }` envelope; do not introduce a new response framework.
- Keep raw stat field names for now if they match the database and `teamStatsConfig.ts`, but centralize the TypeScript type.

## 6. Backend Organization

### Routes / Controllers

The route/controller split is good for a thesis project. `backend/api/routes.js` is compact, and controllers mainly parse inputs and return service results. This is already well structured and should not be heavily refactored.

Recommended small improvements:

- Add routes for `GET /api/teams/comparison-dataset` and `GET /api/teams/:id/profile`.
- If standings response shape changes, keep route path stable and evolve the service response.

### Services

Services currently add value by sanitizing teams/players and translating ids. That is good.

Issues:

- Some service functions are thin pass-throughs, but this is acceptable where they preserve a consistent layer.
- `standingsService.js` should own grouping/default group selection instead of leaving it to the frontend.
- `teamService.js` should own profile-view composition if a profile endpoint is added.

### Repositories

Repositories should ideally query and return raw repository models, not make many domain/display decisions.

Issues:

- `teamRepository.js` contains participation deduplication, preferred participation selection, country fallback, badge label construction, and season sorting. Some of this can move to service/mapper helpers.
- `playerRepository.js` uses `select("*")`, which makes API contracts more likely to inherit DB detail.
- `standingsRepository.js` is fairly focused, but it returns flat rows. Pair it with a standings mapper/service grouping function.

### Ingestion Scripts

Ingestion is understandably script-oriented for a thesis project. Do not overbuild this into a full job platform unless thesis scope requires it.

Issues worth cleaning:

- Repeated `fetchAllRows` helper in stats scripts.
- Repeated throttling and raw JSON saving patterns.
- Long stat mapping objects in `fetchAllTeamStats.js` and `fetchAllPlayerStats.js`.
- Hardcoded tournament scope in `fetchSeasons.js` should be documented if intentional.

Recommended thesis-appropriate cleanup:

- Extract `backend/ingestion/lib/fetchAllRows.js`.
- Extract `backend/ingestion/lib/timing.js`.
- Keep long stat mappers if they are working, but move them into named functions to make scripts easier to read.

### ID Semantics

This is the most important backend architecture concern.

Current state:

- Frontend routes generally use internal DB ids.
- External provider ids are stored as `api_id` on teams, players, seasons, and tournaments.
- Some fact tables and views still use columns named `team_id`, `season_id`, and `tournament_id` where values may be external API ids.
- Backend services translate some of this, but not uniformly.

Recommended policy:

- API-facing ids should be internal DB ids unless explicitly named `api_id`.
- Backend repositories/views may use external ids internally, but aliases should make this obvious: `team_db_id`, `team_api_id`, `season_db_id`, `season_api_id`, `tournament_db_id`, `tournament_api_id`.
- Do not expose ambiguous ids to the frontend.

## 7. Frontend Organization

### Pages

Pages are currently doing too much:

- `TeamProfile.tsx` is a page, data orchestrator, standings selector, table renderer, stat renderer, and helper collection.
- `Standings.tsx` is a page, URL parser, data orchestrator, stage grouping engine, and full table renderer.
- `TeamsComparison.tsx` is a page plus a dataset builder and request scheduler.
- `Home.tsx` is acceptable for a thesis landing/search page, but search can move backend-side if data grows.

Recommended direction:

- Pages should coordinate view state and pass backend-ready data to components.
- Domain-specific rendering should live in components.
- Data fetching should move to hooks or backend view-model endpoints.

### Components

Good existing component:

- `SearchableCheckboxPanel` is a useful reusable component for comparison filters.

Missing reusable components:

- `SegmentedTabs`
- `IconSelect`
- `PageLoading`
- `PanelEmptyState`
- `StandingsTable`
- `TeamCard`
- `PlayerCard` if player list becomes richer

### API Client

Current `frontend/src/api/api.ts` is a good starting point but should become typed.

Recommended:

- Keep one API client file.
- Add a generic request function.
- Move domain types to `frontend/src/api/types.ts`.
- Avoid page-level `any[]`.

## 8. Thesis-Quality Architecture

The codebase can support this thesis explanation after a few focused refactors:

- Database stores normalized football data and read-side views for current scopes/standings.
- Ingestion scripts populate/update Supabase from the external football API.
- Backend exposes clean REST endpoints and hides internal/external ID complexity.
- Frontend renders pages from backend-ready view models.

What currently makes that harder to defend:

- Frontend comparison and profile pages still compose backend data manually.
- Standings group/stage rules are implemented in frontend code.
- API response types are not centralized.
- ID names are ambiguous across raw DB rows, views, repositories, and frontend responses.
- Some README/roadmap ideas are ahead of the implemented code, so documentation should distinguish current architecture from future plans.

The most thesis-relevant improvement is not adding more infrastructure. It is making the frontend/backend boundary visibly clean: backend owns data relationships and response shaping; frontend owns presentation and interaction.

## 9. Do Not Over-Engineer

These are acceptable for a thesis project and should not be refactored right now:

- Keep Express and simple route/controller/service/repository modules. No need for NestJS or a large framework.
- Keep REST. No need for GraphQL.
- Keep Supabase SDK queries. No need for an ORM migration.
- Keep chart interaction, selected tabs, selected comparison stats, and k-means controls in the frontend.
- Keep `teamStatsConfig.ts` as frontend display metadata.
- Keep ingestion as scripts unless the thesis specifically requires scheduled production jobs.
- Keep simple local filtering on the home page if the dataset remains small.
- Do not spend time on production security hardening unless it directly clarifies architecture.
- Do not introduce global state management for the current page set.
- Do not rewrite all backend repositories before the high-impact endpoint contracts are fixed.

## 10. Final Recommended Roadmap

### Phase 1: High-Impact, Low-Risk Cleanup

- Add shared frontend API response types and a generic `request<T>()`.
- Replace page-level `any[]` in the main pages with centralized types.
- Extract shared `TabButton` / `SegmentedTabs`.
- Extract shared loading/error/empty components.
- Extract team display helpers used by `Teams.tsx` and `TeamProfile.tsx`.
- Remove stale debug comments/logs in obvious files.
- Fix the mojibake fallback in `teamsComparison.ts`.

### Phase 2: Backend Responsibility Fixes

- Add `GET /api/teams/comparison-dataset`.
- Update `TeamsComparison.tsx` to fetch one comparison dataset and remove frontend batch request orchestration.
- Make `GET /api/standings` return grouped stage-aware standings.
- Update `Standings.tsx` to render backend groups instead of reconstructing them.
- Add `GET /api/teams/:id/profile?seasonId=...` or an equivalent season view endpoint.
- Update `TeamProfile.tsx` to render backend profile data and remove standings mini-table selection logic.

### Phase 3: Optional Polish

- Add `GET /api/search?q=...` for home search.
- Extract ingestion helpers for pagination, throttling, and raw response saving.
- Add minimal documented smoke/build workflow.
- Update README to describe current implemented architecture separately from future roadmap.
- Split very large page components into domain components after endpoint contracts stabilize.

## Short Codex Chat Summary

Top 5 refactors recommended:

1. Add a backend team comparison dataset endpoint.
2. Add a backend team profile season view-model endpoint.
3. Return grouped, stage-aware standings from the backend.
4. Centralize frontend API response types and replace broad `any[]`.
5. Extract shared loading/error/tab/select UI primitives.

Frontend logic that should move to the backend first:

- `TeamsComparison.tsx` batch dataset construction. It is the clearest backend-owned aggregation because it joins teams, seasons, tournaments, and stats, and currently creates many frontend requests.

Repeated code to extract first:

- Shared loading/error/empty states and tab/select components, followed by shared API response types.

Intentionally not recommended:

- Production security hardening, auth redesign, GraphQL, ORM migration, heavy global state management, or a full ingestion orchestration platform. Those would distract from the thesis goal of a clear, maintainable frontend/backend/data-flow architecture.
