# GitHub Actions Ingestion Readiness Plan

This document tracks the GitHub Actions ingestion jobs that run manually and on schedules.

The rollout order is intentional:

1. Keep manual `workflow_dispatch` available for each job.
2. Run recurring ingestion through scheduled UTC cron triggers.
3. Review logs, data changes, and API quota behavior after both manual and scheduled runs.

## Ingestion Jobs

The current ingestion workflows run from `backend/`, install Node dependencies with `npm ci`, and execute the existing backend package scripts. Each workflow supports manual runs from GitHub -> Actions and scheduled runs through GitHub Actions cron.

GitHub Actions cron schedules run in UTC. This project intentionally uses UTC midnight schedules directly and does not convert them to Europe/Athens time.

| Refresh | Workflow file | Schedule | Cron | Backend command |
| --- | --- | --- | --- | --- |
| Weekly standings and team stats | `.github/workflows/manual-weekly-refresh.yml` | Every Tuesday at 00:00 UTC | `0 0 * * 2` | `npm run ingestion:weekly-refresh -- --skip-fresh` |
| Monthly player stats | `.github/workflows/manual-monthly-player-stats-refresh.yml` | 1st day of every month at 00:00 UTC | `0 0 1 * *` | `npm run ingestion:monthly-player-stats-refresh -- --skip-fresh` |
| Annual season reset | `.github/workflows/manual-annual-season-reset.yml` | July 1 at 00:00 UTC | `0 0 1 7 *` | `npm run ingestion:annual-season-reset` |
| Fixed-date player refresh | `.github/workflows/manual-player-refresh.yml` | January 1, February 1, March 1, July 1, August 1, and October 1 at 00:00 UTC | `0 0 1 1,2,3,7,8,10 *` | `npm run ingestion:player-refresh -- --skip-fresh` |

The fixed player refresh dates intentionally exclude September 1, matching the current final-thesis scope and `backend/jobs/playerRefresh.js`.

## Manual And Scheduled Testing

Manual runs remain available even though the workflows also have schedules.

Test requirements:

- Trigger each workflow manually from the GitHub Actions tab.
- Confirm the job runs from `backend/` and installs dependencies with `npm ci`.
- Review GitHub Actions logs for failures, retries, unusually high request counts, and accidental secret output.
- Review Supabase ingestion tables after each run, especially `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs`.
- Confirm the resulting data changes match the intended job scope.
- Treat RapidAPI `429` responses, repeated retries, unexpectedly broad fetches, or failed ingestion runs as stop signals before rerunning.
- Keep per-workflow concurrency groups so the same workflow cannot overlap with itself. The current group is `transfermind-${{ github.workflow }}-${{ github.ref }}`, which still allows different ingestion workflows to run at the same time.

The ingestion workflows need these GitHub repository or environment secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `API_BASE`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

Never commit `.env` files, Supabase service keys, RapidAPI keys, or generated logs that expose secret values. The Supabase service key must remain backend/job-only and must not be exposed to frontend code.

The current ingestion package scripts are Node-only, so these workflows do not install Python dependencies. If a future workflow calls Python-backed analysis or ingestion code, add Python setup and install from `backend/requirements.txt`.

## Safety Notes

- Do not schedule `npm run ingestion:init`; init mode is broad bootstrap behavior and can fan out across historical data.
- Do not add scheduled historical player ingestion or historical player-stat ingestion for the final thesis scope.
- Keep recurring jobs scoped to current-season refresh behavior, except for the narrow annual season reset.
- Keep the annual reset narrow: seasons, tournaments, standings refresh for team discovery, missing teams, and missing logos.
- Do not add historical player squads, historical player stats, transfer history, or init-mode team stats to the annual reset.
- Keep `--skip-fresh` enabled for recurring jobs that support it.
- Keep GitHub Actions cron expressions in UTC and use UTC midnight schedules for this project.
