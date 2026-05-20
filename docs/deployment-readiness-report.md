# Deployment Readiness Report

Date: 2026-05-20

Scope: repository inspection only. No application code was changed.

## Summary

TransferMind is close to manual deployment readiness for a split deployment with the frontend on Vercel, the backend on Render, and Supabase as the hosted database. The main deployment gaps are production CORS hardening, Python dependency setup for backend-hosted clustering endpoints, and cleanup of a tracked Python cache artifact.

## Readiness Status

| Area | Status | Notes |
| --- | --- | --- |
| Frontend env usage | Ready with one caveat | Frontend API calls use `VITE_API_BASE_URL` from `frontend/src/api/api.ts`. |
| Backend env usage | Mostly ready | Backend reads required Supabase env vars and ingestion env vars from `backend/.env`, but some documented env names are unused or missing from examples. |
| CORS setup | Needs change before production | `backend/index.js` uses `cors({ origin: true })`, allowing reflected origins instead of restricting to configured production origins. |
| Python dependencies | Needs deployment decision | Python is required by backend API clustering/rules endpoints, and dependency files are duplicated with different strictness. |
| Start/build scripts | Mostly ready | Frontend and backend scripts exist in their subdirectories. Root package scripts are absent. |
| Secrets ignored | Mostly ready | `.env` files are ignored, examples are tracked, but one Python `__pycache__` file is tracked. |

## Frontend Environment Usage

Findings:

- `frontend/src/api/api.ts` reads `import.meta.env.VITE_API_BASE_URL`.
- All frontend `fetch` calls found in `frontend/src` go through `frontend/src/api/api.ts`.
- No frontend Supabase client or direct Supabase table access was found.
- No hardcoded localhost or production backend URL was found in frontend API calls.
- `frontend/.env.example` defines `VITE_API_BASE_URL=http://localhost:3001`.
- If `VITE_API_BASE_URL` is absent, the frontend falls back to relative API paths such as `/api/teams`.

Deployment notes:

- For Vercel, set `VITE_API_BASE_URL` to the deployed backend origin, for example `https://your-render-service.onrender.com`.
- The relative-path fallback is useful only if frontend and backend are served behind the same origin or a proxy. With Vercel plus Render, the variable must be set.

## Backend Environment Usage

Findings:

- `backend/lib/env.js` loads `backend/.env`.
- `backend/lib/supabaseClient.js` requires:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
- `backend/lib/client.js`, used by ingestion/API-fetch code, requires:
  - `API_BASE`
  - `RAPIDAPI_KEY`
  - `RAPIDAPI_HOST`
- `backend/index.js` reads `PORT`, defaulting to `3001`.
- Python runner clients read `TRANSFERMIND_PYTHON_BIN` in:
  - `backend/lib/pythonKMeansClient.js`
  - `backend/lib/pythonAgglomerativeClient.js`
  - `backend/lib/pythonAprioriClient.js`
- `backend/.env.example` defines `CORS_ORIGIN`, but `backend/index.js` does not currently use it.
- Local `backend/.env` contains `SUPABASE_ANON_KEY`, but the inspected backend code does not use it.
- `TRANSFERMIND_PYTHON_BIN` is used by code but is not listed in `backend/.env.example`.

Deployment notes:

- Render should set at least `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and any RapidAPI variables needed by ingestion jobs.
- If Render runs clustering or association-rule endpoints, it also needs Python and the Python package dependencies installed.
- Consider documenting `TRANSFERMIND_PYTHON_BIN` if the production Python executable is not simply `python3`.

## CORS Setup

Findings:

- `backend/index.js` currently has:

```js
app.use(cors({ origin: true }));
```

- This reflects/allows requesting origins and does not use the configured `CORS_ORIGIN` value from `backend/.env.example`.

Deployment risk:

- This is acceptable for local testing but should be tightened before public production deployment.
- Recommended production behavior is to allow only the Vercel frontend origin and local development origins as needed.

Suggested follow-up:

- Replace permissive CORS with an allowlist based on an env var such as `CORS_ORIGIN` or `CORS_ORIGINS`.
- Keep local development support for `http://localhost:5173`.

## Python Dependency Files

Findings:

- Python runners exist under `backend/python/`:
  - `kmeans_runner.py`
  - `agglomerative_runner.py`
  - `apriori_runner.py`
- Backend runtime code spawns these scripts from API/service paths, so Python is not ingestion-only.
- There are two requirements files:
  - `backend/requirements.txt`, pinned versions.
  - `backend/python/requirements.txt`, unpinned top-level package names.
- `backend/how-to-run.md` says to install from `backend/requirements.txt`.
- No `pyproject.toml`, `Pipfile`, `poetry.lock`, `environment.yml`, or Python `runtime.txt` was found.

Deployment risk:

- Render or any backend host must install Python dependencies as part of backend deployment if clustering and association-rule endpoints are expected to work.
- The duplicate requirements files may drift. The pinned `backend/requirements.txt` is safer for reproducible deployment.

Suggested follow-up:

- Choose one canonical requirements file for deployment.
- Add a documented backend build command that installs both Node and Python dependencies.
- Consider adding a Python runtime/version file if the chosen host supports it.

## Start And Build Scripts

Frontend:

- `frontend/package.json` scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run preview`
- Vercel settings should use:
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `dist`

Backend:

- `backend/package.json` scripts:
  - `npm run dev`
  - `npm start`
  - ingestion job scripts
  - `npm run test:api`
- `npm start` runs `node index.js`.
- `GET /health` exists in `backend/index.js` and returns `{ data: { status: "ok" } }`.
- `backend/package.json` defines `test:api` as `node api/fetchTest.js`, but `backend/api/fetchTest.js` is missing.

Root:

- Root `package.json` is empty and defines no workflow scripts.
- For deployment, configure platform root directories explicitly as `frontend` and `backend`.

Deployment risk:

- Backend start is ready for Render, but the build command needs to account for Python if runtime endpoints use it.
- `npm run test:api` is not currently usable because its target file is absent.

## Secrets And Ignore Rules

Findings:

- Root `.gitignore` ignores:
  - `.env`
  - `.env.*`
  - `backend/.env`
  - `backend/.env.*`
  - `node_modules/`
  - build/cache/data artifacts
- `frontend/.gitignore` ignores:
  - `node_modules/`
  - `.vite/`
  - `dist/`
  - `.env`
  - `.env.local`
- `backend/.gitignore` ignores:
  - `node_modules/`
  - `.env`
  - `.env.local`
  - `.env.*.local`
  - `.venv/`
  - logs, build outputs, and local data files
- `backend/.env.example` and `frontend/.env.example` are tracked, as expected.
- Local `backend/.env` and `frontend/.env` are ignored.
- `git ls-files` shows no tracked `.env` files.
- A generated Python cache file is tracked:
  - `backend/python/__pycache__/kmeans_runner.cpython-312.pyc`

Deployment risk:

- Secrets appear safely ignored.
- The tracked `.pyc` file is not a secret, but it is generated local machine output and should not be tracked.
- `__pycache__/` and `*.pyc` are not currently covered by the root/backend ignore rules.

Suggested follow-up:

- Add Python cache ignore patterns and remove the tracked `.pyc` file from Git in a later cleanup change.

## Recommended Next Steps

1. Harden backend CORS by using a configured allowlist instead of `origin: true`.
2. Decide the canonical Python dependency file and document the Render build command.
3. Add `TRANSFERMIND_PYTHON_BIN` to backend environment documentation if needed for production.
4. Remove or fix the broken `backend` `test:api` script target.
5. Ignore and untrack Python cache artifacts.
6. Document final Render and Vercel environment variable settings after the production URLs are chosen.

## Inspected Files And Commands

Files inspected included:

- `frontend/src/api/api.ts`
- `frontend/package.json`
- `frontend/.env.example`
- `frontend/.gitignore`
- `frontend/vite.config.ts`
- `backend/index.js`
- `backend/package.json`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/lib/env.js`
- `backend/lib/supabaseClient.js`
- `backend/lib/client.js`
- `backend/lib/pythonKMeansClient.js`
- `backend/lib/pythonAgglomerativeClient.js`
- `backend/lib/pythonAprioriClient.js`
- `backend/requirements.txt`
- `backend/python/requirements.txt`
- `.gitignore`

Commands used included:

- `git status --short`
- `rg --files`
- `rg` searches for env, CORS, Supabase, and frontend API usage
- `git ls-files`
- `git check-ignore`
- targeted `sed` reads of deployment-relevant files
