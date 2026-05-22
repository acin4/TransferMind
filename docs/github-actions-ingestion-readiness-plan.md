# GitHub Actions Ingestion Readiness Plan

This document tracks the manual GitHub Actions ingestion jobs and the later schedule-readiness plan.

The rollout order is intentional:

1. Prove each job with manual `workflow_dispatch` runs.
2. Review logs, data changes, and API quota behavior.
3. Add scheduled cron triggers only after manual runs are reliable.

## Manual Jobs

The current manual ingestion workflows run from `backend/`, install Node dependencies with `npm ci`, and execute the existing backend package scripts.

| Refresh | Workflow file | Operational time | Backend command |
| --- | --- | --- | --- |
| Weekly standings and team stats | `.github/workflows/manual-weekly-refresh.yml` | Every Tuesday at 00:00 Europe/Athens | `npm run ingestion:weekly-refresh -- --skip-fresh` |
| Monthly player stats | `.github/workflows/manual-monthly-player-stats-refresh.yml` | 1st day of every month at 00:00 Europe/Athens | `npm run ingestion:monthly-player-stats-refresh -- --skip-fresh` |
| Annual season reset | `.github/workflows/manual-annual-season-reset.yml` | July 1 at 00:00 Europe/Athens | `npm run ingestion:annual-season-reset` |
| Fixed-date player refresh | `.github/workflows/manual-player-refresh.yml` | July 1, August 1, October 1, January 1, February 1, and March 1 at 00:00 Europe/Athens | `npm run ingestion:player-refresh -- --skip-fresh` |

The fixed player refresh dates intentionally exclude September 1, matching the current final-thesis scope and `backend/jobs/playerRefresh.js`.

## Manual Testing First

The first workflow version uses `workflow_dispatch` only. Do not add cron triggers until manual runs are proven safe.

Manual test requirements:

- Trigger each workflow manually from the GitHub Actions tab.
- Confirm the job runs from `backend/` and installs dependencies with `npm ci`.
- Review GitHub Actions logs for failures, retries, unusually high request counts, and accidental secret output.
- Review Supabase ingestion tables after each run, especially `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs`.
- Confirm the resulting data changes match the intended job scope.
- Treat RapidAPI `429` responses, repeated retries, unexpectedly broad fetches, or failed ingestion runs as stop signals before rerunning.
- Keep per-workflow concurrency groups so the same workflow cannot overlap with itself. The current group is `transfermind-${{ github.workflow }}-${{ github.ref }}`, which still allows different ingestion workflows to run at the same time.

The manual workflows need these GitHub repository or environment secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `API_BASE`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

Never commit `.env` files, Supabase service keys, RapidAPI keys, or generated logs that expose secret values. The Supabase service key must remain backend/job-only and must not be exposed to frontend code.

The current manual ingestion package scripts are Node-only, so these workflows do not install Python dependencies. If a future workflow calls Python-backed analysis or ingestion code, add Python setup and install from `backend/requirements.txt`.

## Scheduled Cron Later

GitHub Actions cron schedules run in UTC. Europe/Athens uses UTC+2 in winter and UTC+3 during daylight saving time, so one UTC cron expression cannot always mean local midnight.

Use Europe/Athens as the operational time in job names, comments, and run guards. Use UTC cron only as the GitHub Actions trigger.

Suggested UTC cron equivalents:

| Refresh | Europe/Athens target | Winter UTC cron | Summer UTC cron | Notes |
| --- | --- | --- | --- | --- |
| Weekly standings and team stats | Tuesday 00:00 | `0 22 * * 1` | `0 21 * * 1` | UTC date is Monday evening for Athens Tuesday midnight. |
| Monthly player stats | Day 1 at 00:00 | `0 22 * * *` | `0 21 * * *` | Add a Europe/Athens guard for local day `1` and local hour `00`. |
| Annual season reset | July 1 at 00:00 | N/A | `0 21 30 6 *` | July 1 midnight Athens is June 30 at 21:00 UTC. |
| Fixed-date player refresh | Listed dates at 00:00 | Guarded cron | Guarded cron | Use Europe/Athens guards for July 1, August 1, October 1, January 1, February 1, and March 1. |

For monthly and fixed-date jobs, prefer a guarded workflow or script step that checks the Europe/Athens local date before running the ingestion command. This avoids month-boundary mistakes around UTC dates and daylight saving changes.

## Safety Notes

- Do not schedule `npm run ingestion:init`; init mode is broad bootstrap behavior and can fan out across historical data.
- Do not add scheduled historical player ingestion or historical player-stat ingestion for the final thesis scope.
- Keep recurring jobs scoped to current-season refresh behavior, except for the narrow annual season reset.
- Keep the annual reset narrow: seasons, tournaments, standings refresh for team discovery, missing teams, and missing logos.
- Do not add historical player squads, historical player stats, transfer history, or init-mode team stats to the annual reset.
- Keep `--skip-fresh` enabled for recurring jobs that support it.
- Treat scheduled workflow creation as a separate implementation step after manual `workflow_dispatch` runs are proven safe.
