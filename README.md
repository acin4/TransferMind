## ✅ Step-by-step Guide (Roadmap to Final Product)

This roadmap takes the project from “local pipeline working” to a hosted, automated, prediction-powered product.

---

### Phase 0 — Project Structure & Conventions

1. Create a clean repo structure:
   - `backend/` (ETL + API)
   - `backend/jobs/` (orchestrators like monthly refresh)
   - `backend/lib/` (retry, rate limit, helpers)
   - `backend/ml/` (feature build, training, inference)
   - `frontend/` (Next.js UI)
   - `docs/` (schema, diagrams, screenshots)
2. Add `.env.example` files for backend + frontend (no secrets committed).
3. Document naming conventions (tables/views/columns) and define “1 row = what?” per key table.

**Output:** repo is organized and scalable.

---

### Phase 1 — Make Ingestion Production-Grade (Local)

4. Create a single orchestrator script:
   - `backend/jobs/monthlyRefresh.js`
   - runs all ingestion steps in the correct order
   - exits with code `0` on success, `1` on failure
5. Add retry/backoff + rate limiting for Sofascore requests.
6. Add structured logging (per step: duration, rows, errors).
7. Implement data quality checks after ingestion:
   - duplicate detection
   - missing key fields
   - abnormal drop/spike in inserted rows
   - % coverage checks (e.g., players with stats)

**Output:** pipeline is reliable, repeatable, and debuggable.

---

### Phase 2 — Observability (Job Runs)

8. Create a `job_runs` table in Supabase to track pipeline execution:
   - `job_name`, `started_at`, `ended_at`, `status`
   - `rows_upserted`, `errors_count`, `duration_ms`
   - optional `meta jsonb` for per-step counters and samples
9. Update the orchestrator to:
   - write a row at start
   - update at end (success/failure)
   - store an error sample if it fails

**Output:** you can prove the job ran and diagnose issues fast.

---

### Phase 3.1 — Deploy Monthly Automation (Cloud Cron)

10. Add a GitHub Actions workflow:

- `.github/workflows/monthly-refresh.yml`
- scheduled monthly + manual trigger (`workflow_dispatch`)

11. Add GitHub Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SOFASCORE_API_KEY` (if needed)

12. Run the workflow manually once to confirm:

- logs look correct
- `job_runs` updated
- database updated successfully

13. Add failure notifications (optional but recommended):

- email/Discord webhook on job failure

**Output:** monthly refresh runs without your laptop being on.

---

---

### Phase 3.2 — On-demand Refresh (Player/Team/Standings)

TransferMind supports **two update modes**:

1. Scheduled monthly ingestion (batch)
2. On-demand refresh when a user requests specific data via the UI

#### Step A: Add Data Freshness Tracking

1. Add freshness metadata (either columns or a separate table):
   - `last_fetched_at`
   - `fetch_status`
   - `fetch_error` (optional)
2. Define freshness rules (example):
   - player stats: fresh for 7 days
   - team stats: fresh for 3 days
   - standings: fresh for 24 hours
3. Ensure the UI can display:
   - “Last updated: …”
   - “Updating…” state

**Output:** the system knows what is stale and when to refresh.

#### Step B: Create an On-demand Refresh Queue (Recommended)

4. Create `refresh_queue` table:
   - `entity_type` (player/team/standings)
   - `entity_id` (and any extra identifiers needed)
   - `priority` (on-demand = high)
   - `status` (queued/running/done/failed)
   - timestamps + error fields
5. Add deduplication/cooldown logic:
   - if an entity is already `queued/running`, do not enqueue again
   - if last refresh is recent, skip refresh

**Output:** on-demand requests are controlled and cost-efficient.

#### Step C: Expose Refresh Endpoints

6. Add API endpoints:
   - `POST /api/refresh/player/:id`
   - `POST /api/refresh/team/:id`
   - `POST /api/refresh/standings?...`
7. Endpoint behavior:
   - check freshness
   - enqueue refresh task (or run immediately if allowed)
   - return `refresh_job_id`

**Output:** UI can trigger refresh without directly calling Sofascore.

#### Step D: Process the Queue (Worker)

8. Create a worker:
   - `backend/jobs/workerRefreshQueue.js`
9. Worker loop:
   - fetch next queued job (highest priority first)
   - mark `running`
   - run the correct refresh script (player/team/standings)
   - update status + write logs + update last_fetched_at
10. Run the worker:

- hosted server (ideal), OR
- GitHub Actions scheduled every 5–10 minutes, OR
- any scheduler that fits your deployment

**Output:** on-demand refresh completes asynchronously and safely.

#### Step E: UI Pattern (Stale-While-Revalidate)

11. When opening a page:

- fetch existing data immediately from Supabase views
- if stale: call refresh endpoint in background
- poll job status or refetch data after completion

12. Display:

- stale badge / updating spinner
- refreshed timestamp after completion

**Output:** fast UI + always improving freshness without wasting API calls.

---

### Phase 4 — Database Contract (Silver Layer)

14. For each canonical table, define and enforce the “grain”:

- example: `player_stats` grain = `(player_id, team_id, tournament_id, season_id)`

15. Add composite unique constraints to match real-world identity.
16. Ensure upserts use those composite keys correctly.
17. Fix missing/invalid values consistently (e.g., `0 → null` where 0 means “unknown”).

**Output:** database is stable and analytics won’t lie.

---

### Phase 5 — Analytics Layer (Gold Views)

18. Create analytics views used by the UI and prediction:

- `v_player_season_summary`
- `v_player_form_last_n`
- `v_team_strength`
- `v_league_strength`

19. Create the view that powers simulations/predictions:

- `v_transfer_features_base` (one row per player per season/competition context)

20. Confirm UI/API will query views, not raw tables.

**Output:** clean “contracts” for UI + ML.

---

### Phase 6 — Prediction System (Core Feature)

21. Define the prediction target (label):

- **Option A:** predict performance change after transfer (Δrating / Δper90 metrics)
- **Option B:** predict expected performance in target league (projected rating/per90)

22. Build the ML dataset:

- create `ml_transfer_samples` (one row = one transfer event)
- includes pre-transfer features, context features, and post-transfer outcome (label)

23. Implement a baseline predictor (must-have):

- per90 normalization
- league difficulty adjustment
- confidence penalty for low minutes
- similarity-based projection (nearest comparable transfers)

24. Train ML model v1 (optional but recommended):

- split by season to avoid leakage
- evaluate (F1/Accuracy or MAE/RMSE)
- save model artifact + metadata

25. Add inference logic:

- **On-demand:** API route computes features → runs model → returns prediction
- **Fallback:** if low confidence → use baseline

26. Add explainability:

- confidence score
- top drivers (league strength change, minutes, form)
- comparable transfers (if similarity baseline used)

**Output:** predictions are reliable, explainable, and thesis-ready.

---

### Phase 7 — Frontend MVP (Product Demo)

27. Build the 3 core screens:
1. Player Search
1. Player Profile (reads from analytics views)
1. Transfer Simulation (current vs predicted + explanation)
1. Visualize “Current vs Predicted”:

- yellow = real values
- blue = predicted values

29. Show confidence + sample size (minutes, matches) and last refresh date.

**Output:** end-to-end demo flow in the browser.

---

### Phase 8 — Hosting (Portfolio-Ready)

30. Deploy the frontend on Vercel (Free tier).
31. Decide how the frontend gets data:

- **Direct:** UI reads Supabase views (simple MVP)
- **Via API:** UI calls your API endpoints (more control, caching, versioning)

32. Keep ingestion in GitHub Actions regardless (best separation of concerns).

**Output:** shareable link + automated refresh.

---

### Phase 9 — Final Polish & Deliverables

33. Add documentation:

- architecture diagram (Bronze/Silver/Gold + ML)
- schema + grain definitions
- pipeline flow explanation
- “how to run locally” instructions

34. Add demo assets:

- screenshots
- short demo video/GIF (optional)

35. Add guardrails:

- health checks
- predictable error messages
- “insufficient data” messaging in prediction

**Output:** final thesis + portfolio version.
