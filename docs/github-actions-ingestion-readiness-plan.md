# GitHub Actions Ingestion Readiness Plan

This plan documents the intended GitHub Actions schedules for ingestion refresh jobs. It is a readiness note only: do not create workflow files until the local jobs are deterministic, quota-safe, and intentionally promoted to cloud scheduling.

## Scheduling Scope

All scheduled jobs should run from `backend/` after installing dependencies with `npm ci`. The existing backend package scripts are the intended commands for future GitHub Actions orchestration.

| Refresh | Intended local time | Future backend command |
| --- | --- | --- |
| Weekly standings and team stats | Every Tuesday at midnight, Europe/Athens | `npm run ingestion:weekly-refresh -- --skip-fresh` |
| Monthly player stats | 1st day of every month at midnight, Europe/Athens | `npm run ingestion:monthly-player-stats-refresh -- --skip-fresh` |
| Annual season reset | July 1 at midnight, Europe/Athens | `npm run ingestion:annual-season-reset` |
| Fixed-date player refresh | July 1, August 1, October 1, January 1, February 1, and March 1 at midnight, Europe/Athens | `npm run ingestion:player-refresh -- --skip-fresh` |

The fixed player refresh dates intentionally exclude September 1, matching the current final-thesis scope and `backend/jobs/playerRefresh.js`.

## UTC Cron Readiness

GitHub Actions cron schedules run in UTC. Europe/Athens switches between UTC+2 in winter and UTC+3 in summer, so one UTC cron expression cannot always equal local midnight.

When workflows are created, choose one of these policies and document the choice in each workflow:

- Precise local-midnight policy: use separate winter and summer UTC cron expressions so runs stay aligned to Europe/Athens midnight. Winter local midnight is `22:00 UTC` on the previous calendar day; summer local midnight is `21:00 UTC` on the previous calendar day. Add date guards inside the workflow or script step where a cron expression cannot express the exact seasonal window or fixed local date safely.
- Simple UTC policy: use one UTC cron expression and explicitly accept a one-hour seasonal shift in Europe/Athens local time.

Suggested precise cron anchors before adding workflow-level date guards:

| Refresh | Winter UTC anchor | Summer UTC anchor | Notes |
| --- | --- | --- | --- |
| Weekly standings and team stats | `0 22 * * 1` | `0 21 * * 1` | Runs at Athens Tuesday midnight because UTC date is Monday evening. |
| Monthly player stats | `0 22 * * *` with a local-date guard for day 1 | `0 21 * * *` with a local-date guard for day 1 | Use a Europe/Athens date guard to avoid month-boundary mistakes. |
| Annual season reset | `0 21 30 6 *` | `0 21 30 6 *` | July 1 midnight Athens is June 30 at 21:00 UTC during summer time. |
| Fixed-date player refresh | Date-guarded daily/monthly cron | Date-guarded daily/monthly cron | Use Europe/Athens guards for July 1, August 1, October 1, January 1, February 1, and March 1. |

The annual July 1 reset and summer fixed dates fall during UTC+3. January, February, and early March fixed dates fall during UTC+2. A guarded workflow is safer than relying on a single calendar-day cron expression for all fixed dates.

## Required Secrets

Future workflows need these repository or environment secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `API_BASE`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

Never commit `.env` files, Supabase service keys, RapidAPI keys, or generated workflow logs that expose secret values. The Supabase service key must remain backend/job-only and must not be exposed to frontend code.

## Workflow Readiness Notes

- Do not schedule `npm run ingestion:init`; init mode is broad bootstrap behavior and can fan out across historical data.
- Add `workflow_dispatch` when workflows are eventually created so each schedule can be manually smoke-tested.
- Use GitHub Actions concurrency groups to prevent overlapping ingestion runs, especially around monthly, annual, and fixed-date player refreshes.
- Keep jobs scoped to current-season refresh behavior except for the annual season metadata reset.
- Keep the annual reset narrow: seasons, tournaments, standings refresh for team discovery, missing teams, and missing logos. Do not add historical player squads, historical player stats, transfer history, or init-mode team stats to the scheduled reset.
- Treat `.github/workflows/` creation as a separate implementation step after this readiness plan.

## Quota And Safety Notes

- Keep `--skip-fresh` enabled for recurring jobs that support it.
- Monitor `ingestion_runs`, `ingestion_step_logs`, and `api_request_logs` after scheduled runs.
- Treat RapidAPI `429` responses, unusually high request counts, repeated retries, or failed ingestion runs as stop signals before rerunning a schedule.
- Prefer manual `workflow_dispatch` tests with a narrow schedule before enabling recurring cron triggers.
- Avoid broad retries of annual or player refreshes without checking logs first; these jobs can touch many current-season teams and players.
- Do not add scheduled historical player or historical player-stat ingestion for the final thesis scope.
