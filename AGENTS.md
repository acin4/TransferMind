# TransferMind Agent Instructions

## Project Overview

TransferMind is a thesis project for football data ingestion, exploration, and analysis.

- Frontend: React, TypeScript, Vite, Tailwind-style utility classes.
- Backend: Express with ES modules.
- Database: Supabase/PostgreSQL.
- External football API ids, including `api_id` values, are backend and ingestion implementation details.
- Frontend routes, API inputs, and API responses should use internal database ids unless an existing contract explicitly says otherwise.

Before changing this file in the future, inspect the actual repository structure and relevant files. Adjust details if the repo has changed. Do not invent commands, paths, or conventions.

## Repo Layout

- `frontend/src/pages/`: page components, including `TeamsComparison.tsx`.
- `frontend/src/api/api.ts`: frontend API gateway for backend calls.
- `frontend/src/components/teams-comparison/`: Teams Comparison UI components.
- `frontend/src/utils/teamsComparison.ts`: Teams Comparison helpers.
- `frontend/src/teamStatsConfig.ts`: team-stat display metadata.
- `backend/index.js`: Express app setup, `/health`, `/api` mounting, and error handling.
- `backend/api/routes.js`: backend route registration.
- `backend/controllers/`: request parsing and response controllers.
- `backend/services/`: business logic and response shaping.
- `backend/repositories/`: Supabase query layer.
- `backend/ingestion/`: external football API ingestion scripts.
- `backend/lib/`: shared backend utilities, HTTP helpers, env loading, Supabase client, freshness helpers.
- `supabase/migrations/`: database schema and view migrations.
- `backend/postman/`: Postman collection and local environment docs.

## Architecture Rules

- The frontend must not read Supabase directly. Frontend data access should go through backend API routes.
- Prefer the backend flow `route -> controller -> service -> repository -> Supabase`.
- Keep controllers thin: parse params/query values, call services, and return JSON.
- Put business rules, id translation, and response shaping in services.
- Put Supabase reads/writes in repositories.
- Do not mix internal database ids and external football API ids.
- Repositories and ingestion code may translate between internal ids and external API ids.
- Treat external `api_id` values as private implementation details unless maintaining an already existing internal backend query.
- Follow the existing API response envelope and HTTP helper conventions. Prefer `{ data: ... }` for successful API responses where that matches the current backend pattern.

## Frontend Rules

- Add or update backend calls through `frontend/src/api/api.ts`.
- Keep Supabase clients, Supabase URLs, service keys, and direct table/view reads out of frontend code.
- Avoid broad `any` usage. Prefer explicit TypeScript types for API responses and UI view models.
- Preserve existing routes unless explicitly asked to change them, including `/teams-comparison`.
- Use internal ids in route params, API function args, links, and component state.
- Keep chart rendering and interactive UI behavior in the frontend.
- Do not keep expanding page components into backend-style aggregation layers. When a page needs cross-entity data assembly, prefer a backend endpoint.

## Backend Rules

- Register API routes in `backend/api/routes.js`.
- Use controllers in `backend/controllers/` for request parsing and response status handling.
- Use services in `backend/services/` for domain logic, response DTOs, and id normalization.
- Use repositories in `backend/repositories/` for Supabase queries.
- Use existing helpers from `backend/lib/http.js` for async route handling, request parsing, and error handling.
- Keep service responses frontend-ready and avoid leaking external `api_id` values into public response contracts.
- If adding an endpoint for comparison data, prefer a backend dataset endpoint such as `GET /api/team-season-stats/comparison`.

## Database/Supabase Rules

- Do not edit old applied migrations.
- Create a new migration in `supabase/migrations/` for schema or view changes.
- Be explicit about id semantics in views and queries. Names like `team_db_id`, `team_api_id`, `season_db_id`, and `season_api_id` are clearer than overloaded `team_id` when both id systems are present.
- Existing views include `current_tournament_seasons`, `current_season_teams`, and `standings_with_team_info`.
- Do not commit `.env` files, service keys, RapidAPI keys, Supabase keys, or other secrets.
- Do not add new product/API/frontend reliance on `key_passes`. It is a project rule that this stat must not be reintroduced.

## Ingestion Rules

- Ingestion scripts live in `backend/ingestion/`.
- Ingestion scripts may call the external football API and may use Supabase directly.
- Preserve throttling, pagination, raw JSON/debug output, skeleton rows for missing stats, and freshness concepts unless explicitly changing ingestion behavior.
- Respect current-season scope where existing scripts and views use it.
- Be careful with RapidAPI/Sofascore request volume. Avoid broad new bulk fetches without an explicit reason.
- External API ids are normal in ingestion code, but do not pass them through to the frontend as public ids.

## Experimental Thesis Features

The Teams Comparison page is experimental but intentional. Preserve it unless explicitly asked to remove or replace it.

- Do not remove Teams Comparison just because it looks unfinished.
- Do not remove Custom Comparison or Cluster Analysis unless explicitly requested.
- Preserve custom team-season comparison.
- Preserve selectable statistics.
- Preserve raw stat values.
- Preserve relative score comparison.
- Preserve chart-based comparison.
- Preserve cluster analysis.
- Preserve the idea of comparing team-season entries, not only teams.
- Preserve the distinction between raw stat values and relative scores.
- Relative scores should compare against teams from the same season and tournament when possible.
- Long-term architecture goal: move comparison dataset assembly out of `TeamsComparison.tsx` and into a backend endpoint such as `GET /api/team-season-stats/comparison`.

## Commands

Run commands from the listed directory.

Frontend, from `frontend/`:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Backend, from `backend/`:

```bash
npm run dev
npm start
npm run test:api
```

Notes:

- `backend` expects environment variables from `backend/.env`; `backend/.env.example` exists.
- `backend/package.json` currently defines `test:api` as `node api/fetchTest.js`; verify that file exists before relying on the command.
- Root `package.json` currently does not define project workflow scripts.

## Verification Checklist

- Documentation-only changes: run `git status --short` and `git diff -- AGENTS.md`.
- Frontend changes: run `npm run lint` and `npm run build` from `frontend/` when relevant.
- Backend changes: start or smoke-check the backend when relevant, including `/health`.
- API changes: update frontend API functions/types and Postman docs when the public contract changes.
- Database changes: add a new migration and verify affected repositories/services.
- Teams Comparison changes: verify Custom Comparison and Cluster Analysis still render and preserve raw values versus relative scores.

## Git And Review Rules

- Respect the existing dirty worktree. Do not revert unrelated user changes.
- Only change files required for the task.
- Follow `CONTRIBUTING.md`: use focused feature/fix branches, integrate through `dev`, and keep commits meaningful.
- Review for direct frontend Supabase access, leaked secrets, id-mixing bugs, old migration edits, broad `any`, and accidental removal of experimental thesis features.

## Things Agents Must Not Do

- Do not format, lint, refactor, or touch unrelated files as drive-by cleanup.
- Do not create Supabase clients in frontend code.
- Do not expose or rely on external `api_id` values in frontend routes or public API contracts.
- Do not edit old applied migrations.
- Do not commit `.env` files or secrets.
- Do not add broad `any` usage.
- Do not remove Teams Comparison, Custom Comparison, or Cluster Analysis unless explicitly requested.
- Do not collapse team-season comparisons into team-only comparisons.
- Do not blur the distinction between raw stat values and relative scores.
- Do not add new reliance on `key_passes`.

