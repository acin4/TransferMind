## ✅ Step-by-step Guide (Roadmap to Final Product)

This roadmap takes the project from “local pipeline working” to a hosted, automated, prediction-powered product.

---

## Phase 0 — Restructure Backend for Scalability

Current ingestion scripts live inside `backend/api/`.  
Before scaling, we separate responsibilities clearly.

1. Refactor folder structure:

   backend/
   ├── ingestion/ # All Sofascore fetching logic (moved here)
   ├── jobs/ # Orchestrators & workers
   ├── lib/ # Shared utilities (supabase, retry, logger)
   ├── api/ # API endpoints (refresh, simulate, health)
   ├── ml/ # Prediction system
   └── config/ # Constants & configuration

2. Move existing ingestion files:
   - `fetchPlayers.js`
   - `fetchTeams.js`
   - `fetchStandings.js`
   - `fetchAllPlayerStats.js`
   - `fetchAllTeamStats.js`
   - `fetchSeasons.js`
   - `fetchTournaments.js`

   ➜ into `backend/ingestion/`

3. Move shared utilities (`supabaseClient.js`, `utils.js`)  
   ➜ into `backend/lib/`

**Output:** clear separation between ingestion logic, API logic, and ML logic.

---

## Phase 1 — Production-Grade Ingestion (Local)

4. Create orchestrator:

   backend/jobs/monthlyRefresh.js
   - Runs all ingestion scripts in correct order
   - Handles errors centrally
   - Exits with code `0` (success) or `1` (failure)

5. Add:
   - Retry + exponential backoff
   - Rate limiting for Sofascore API
   - Structured logging per step

6. Add post-ingestion data validation:
   - Duplicate detection
   - Missing foreign keys
   - Abnormal drop/spike checks
   - Coverage % validation

**Output:** pipeline is stable and deterministic.

---

## Phase 2 — Observability

7. Create `job_runs` table:
   - job_name
   - started_at
   - ended_at
   - status
   - rows_upserted
   - errors_count
   - duration_ms
   - meta (jsonb)

8. Update `monthlyRefresh.js`:
   - Insert row at start
   - Update on success/failure
   - Store error samples

**Output:** full visibility into ingestion health.

---

## Phase 3.1 — Monthly Automation (Cloud Cron)

9. Add GitHub Actions workflow:

   .github/workflows/monthly-refresh.yml
   - Scheduled monthly
   - Manual trigger enabled

10. Add GitHub Secrets:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SOFASCORE_API_KEY (if applicable)

11. Manually test workflow once.

**Output:** automated monthly ingestion.

---

## Phase 3.2 — On-demand Refresh System

TransferMind supports:

1. Scheduled monthly refresh
2. On-demand refresh triggered by UI

### A. Freshness Tracking

12. Add metadata to canonical entities:

- last_fetched_at
- fetch_status
- fetch_error (optional)

13. Define freshness rules:

- player stats → 7 days
- team stats → 3 days
- standings → 24 hours

**Output:** system knows what is stale.

---

### B. Refresh Queue

14. Create `refresh_queue` table:

- entity_type (player/team/standings)
- entity_id
- tournament_id
- season_id
- priority
- status (queued/running/done/failed)
- requested_at
- started_at
- finished_at
- error

15. Add deduplication:

- If entity already queued or running → skip
- If recently refreshed → skip

**Output:** controlled, cost-efficient refresh system.

---

### C. Refresh API Endpoints

16. Create endpoints:

- POST /api/refresh/player/:id
- POST /api/refresh/team/:id
- POST /api/refresh/standings

17. Endpoint logic:

- Validate input
- Check freshness
- Enqueue refresh job
- Return refresh_job_id

**Output:** UI triggers refresh safely.

---

### D. Worker

18. Create:

backend/jobs/workerRefreshQueue.js

19. Worker:

- Fetch highest priority queued job
- Mark as running
- Execute correct ingestion script
- Update status + last_fetched_at

20. Run worker:

- Hosted server (ideal), OR
- GitHub Actions every 5–10 minutes

**Output:** asynchronous refresh processing.

---

### E. UI Pattern — Stale-While-Revalidate

21. On page load:

- Fetch current data from Supabase views
- If stale → trigger refresh in background

22. UI shows:

- Last updated timestamp
- “Updating…” indicator
- Auto-refresh when done

**Output:** fast UX + fresh data without excessive API calls.

---

## Phase 4 — Database Contract (Silver Layer)

23. Define grain for each canonical table.

Example:
player_stats grain =
(player_id, team_id, tournament_id, season_id)

24. Add composite unique constraints.
25. Ensure correct upsert logic.
26. Standardize null handling.

**Output:** data integrity guaranteed.

---

## Phase 5 — Analytics Layer (Gold Views)

27. Create analytics views:

- v_player_season_summary
- v_player_form_last_n
- v_team_strength
- v_league_strength

28. Create:

- v_transfer_features_base

29. UI + ML read from views only.

**Output:** clean contract layer.

---

## Phase 6 — Prediction System

30. Define label:

- Performance delta OR projected performance.

31. Create:
    ml_transfer_samples
    (1 row = 1 historical transfer event)

32. Implement baseline predictor:

- per90 normalization
- league difficulty adjustment
- minutes reliability penalty
- similarity search

33. Train ML model (v1):

- Season-based split
- Evaluate metrics
- Save artifact

34. Add inference endpoint:

- Compute features
- Run model
- Fallback to baseline if needed

35. Add explainability:

- Confidence score
- Top drivers
- Comparable transfers

**Output:** reliable and interpretable predictions.

---

## Phase 7 — Frontend MVP

36. Build 3 screens:

- Player Search
- Player Profile
- Transfer Simulation

37. Show:

- Current (yellow)
- Predicted (blue)
- Confidence
- Last refresh time

**Output:** complete demo-ready application.

---

## Phase 8 — Hosting

38. Deploy frontend on Vercel.
39. Keep ingestion in GitHub Actions.
40. Choose:

- Direct Supabase access OR
- API layer mediation

**Output:** publicly accessible product.

---

## Phase 9 — Final Polish

41. Add:

- Architecture diagram
- Schema documentation
- Pipeline explanation
- Screenshots
- Demo video (optional)

42. Add guardrails:

- Health endpoints
- Clear error handling
- “Insufficient data” messaging

**Output:** final thesis-grade, portfolio-ready system.
