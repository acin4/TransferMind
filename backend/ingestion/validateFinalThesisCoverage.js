import { supabase } from "../lib/supabaseClient.js";

// Keep DB reads paginated so the script can validate larger tables without
// asking Supabase for the whole dataset in one request.
const PAGE_SIZE = 1000;
const SAMPLE_LIMIT = 5;
const NULL_TOKEN = "<null>";

const results = [];

// Build a stable string key from several columns. This lets us compare logical
// database identities such as "team + season + tournament" with a Set or Map.
function keyOf(parts) {
  return parts.map((part) => part ?? NULL_TOKEN).join("|");
}

// Store one validation result. "failures" is a count, while "samples" keeps a
// few examples so the output stays readable even if thousands of rows fail.
function addResult(section, name, failures, samples = []) {
  results.push({
    section,
    name,
    failures,
    samples: samples.slice(0, SAMPLE_LIMIT),
  });
}

// Only keep the first few sample rows for each check. The full failure count is
// still printed, but the console output stays short enough to scan.
function pushSample(samples, value) {
  if (samples.length < SAMPLE_LIMIT) {
    samples.push(value);
  }
}

// Convert a small object into a single readable line for console output.
function formatRow(row) {
  return Object.entries(row)
    .map(([key, value]) => `${key}=${value ?? "null"}`)
    .join(", ");
}

function describeSupabaseError(table, error) {
  return new Error(
    `Supabase read failed for ${table}: ${error.message ?? String(error)}`,
  );
}

// Generic paginated Supabase reader. All validation queries go through this
// helper so every check uses the same safe batch size and narrow select list.
async function forEachPage({ table, select, filters = [], pageSize = PAGE_SIZE }, onPage) {
  let from = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    for (const filter of filters) {
      if (filter.type === "not") {
        query = query.not(filter.column, filter.operator, filter.value);
      } else if (filter.type === "eq") {
        query = query.eq(filter.column, filter.value);
      }
    }

    const { data, error } = await query;
    if (error) {
      throw describeSupabaseError(table, error);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      break;
    }

    await onPage(rows);

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
  }
}

// Use this only for small lookup datasets that are needed across multiple
// checks. Large table scans should process each page in forEachPage instead.
async function readRows({ table, select, filters = [] }) {
  const rows = [];
  await forEachPage({ table, select, filters }, (pageRows) => {
    rows.push(...pageRows);
  });
  return rows;
}

// Detect duplicate logical keys for tables where the database row id is not the
// real business identity. For example, team_stats should be unique per
// team/season/tournament even though every row also has its own id.
async function checkDuplicateKeys({ table, select, keyColumns, name }) {
  const seen = new Map();
  const duplicates = [];

  await forEachPage({ table, select }, (rows) => {
    for (const row of rows) {
      const logicalKey = keyOf(keyColumns.map((column) => row[column]));
      const previous = seen.get(logicalKey);

      if (previous) {
        previous.count += 1;
        if (previous.count === 2) {
          duplicates.push({
            key: logicalKey,
            first_id: previous.id,
            duplicate_id: row.id,
          });
        }
      } else {
        seen.set(logicalKey, { count: 1, id: row.id });
      }
    }
  });

  addResult(
    "Duplicate logical keys",
    name,
    duplicates.length,
    duplicates.map(formatRow),
  );
}

// Entity tables map external API ids to internal DB ids. Missing or duplicate
// api_id values are risky because ingestion and read views use those mappings.
async function checkEntityApiIds(table) {
  const seen = new Map();
  const duplicateSamples = [];
  const missingSamples = [];
  let duplicateCount = 0;
  let missingCount = 0;

  await forEachPage({ table, select: "id, api_id" }, (rows) => {
    for (const row of rows) {
      if (row.api_id == null) {
        missingCount += 1;
        pushSample(missingSamples, formatRow({ id: row.id, api_id: row.api_id }));
        continue;
      }

      const previousId = seen.get(row.api_id);
      if (previousId != null) {
        duplicateCount += 1;
        pushSample(
          duplicateSamples,
          formatRow({
            api_id: row.api_id,
            first_id: previousId,
            duplicate_id: row.id,
          }),
        );
      } else {
        seen.set(row.api_id, row.id);
      }
    }
  });

  addResult(
    "Duplicate logical keys",
    `${table}.api_id duplicates`,
    duplicateCount,
    duplicateSamples,
  );
  addResult(
    "Duplicate logical keys",
    `${table}.api_id missing`,
    missingCount,
    missingSamples,
  );
}

// Current-season views are small and are the anchor for most coverage checks.
// They translate the external ids used by ingestion into internal ids used by
// backend/frontend read paths.
async function loadCurrentTournamentSeasons() {
  return readRows({
    table: "current_tournament_seasons",
    select:
      "tournament_id, season_id, tournament_api_id, season_api_id, season_name",
  });
}

// current_season_teams is the canonical list of teams expected to have current
// standings, team stats, players, and player stats.
async function loadCurrentSeasonTeams() {
  return readRows({
    table: "current_season_teams",
    select:
      "team_id, team_api_id, team_name, tournament_id, season_id, tournament_api_id, season_api_id",
  });
}

// Standings stores external team ids, so this lookup lets validation translate
// those external ids back to internal team ids.
async function loadTeamsByApiId() {
  const teamsByApiId = new Map();

  await forEachPage({ table: "teams", select: "id, api_id" }, (rows) => {
    for (const row of rows) {
      if (row.api_id != null) {
        teamsByApiId.set(row.api_id, row.id);
      }
    }
  });

  return teamsByApiId;
}

// The standings read view should resolve each external standing reference to an
// internal team, tournament, and season. Missing DB ids here usually mean an id
// mapping problem, not a frontend problem.
async function checkStandingsViewMappings() {
  const samples = [];
  let failures = 0;

  await forEachPage(
    {
      table: "standings_with_team_info",
      select:
        "standing_id, team_id, tournament_id, season_id, team_db_id, tournament_db_id, season_db_id",
    },
    (rows) => {
      for (const row of rows) {
        const missingTeam = row.team_id != null && row.team_db_id == null;
        const missingTournament =
          row.tournament_id != null && row.tournament_db_id == null;
        const missingSeason = row.season_id != null && row.season_db_id == null;

        if (missingTeam || missingTournament || missingSeason) {
          failures += 1;
          pushSample(
            samples,
            formatRow({
              standing_id: row.standing_id,
              team_id: row.team_id,
              team_db_id: row.team_db_id,
              tournament_id: row.tournament_id,
              tournament_db_id: row.tournament_db_id,
              season_id: row.season_id,
              season_db_id: row.season_db_id,
            }),
          );
        }
      }
    },
  );

  addResult(
    "Mapping checks",
    "standings_with_team_info resolves source ids",
    failures,
    samples,
  );
}

// Every season marked is_current=true should be visible through the current
// tournament-season view; otherwise current-season ingestion has no stable
// tournament/season context to work from.
async function checkCurrentSeasonsMapToView(currentTournamentSeasons) {
  const ctsSeasonIds = new Set(
    currentTournamentSeasons.map((row) => String(row.season_id)),
  );
  const samples = [];
  let failures = 0;

  await forEachPage(
    {
      table: "seasons",
      select: "id, api_id, tournament_id, is_current",
      filters: [{ type: "eq", column: "is_current", value: true }],
    },
    (rows) => {
      for (const row of rows) {
        if (!ctsSeasonIds.has(String(row.id))) {
          failures += 1;
          pushSample(
            samples,
            formatRow({
              season_id: row.id,
              season_api_id: row.api_id,
              tournament_ref: row.tournament_id,
            }),
          );
        }
      }
    },
  );

  addResult(
    "Mapping checks",
    "current seasons appear in current_tournament_seasons",
    failures,
    samples,
  );
}

// Scan standings once and collect the current-season facts needed by multiple
// checks: whether each current season has standings and whether standings-backed
// teams appear in current_season_teams.
async function collectCurrentStandingContext({
  currentTournamentSeasons,
  currentSeasonTeams,
  teamsByApiId,
}) {
  const currentByExternalSeason = new Map();
  const currentSeasonTeamKeys = new Set();
  const standingsCountsByCurrentSeason = new Map();
  const standingsBackedTeamKeys = new Set();

  for (const row of currentTournamentSeasons) {
    const externalSeasonKey = keyOf([row.tournament_api_id, row.season_api_id]);
    currentByExternalSeason.set(externalSeasonKey, row);
    standingsCountsByCurrentSeason.set(
      keyOf([row.tournament_id, row.season_id]),
      0,
    );
  }

  for (const row of currentSeasonTeams) {
    currentSeasonTeamKeys.add(keyOf([row.team_id, row.tournament_id, row.season_id]));
  }

  await forEachPage(
    {
      table: "standings",
      select: "id, team_id, tournament_id, season_id",
    },
    (rows) => {
      for (const row of rows) {
        const currentSeason = currentByExternalSeason.get(
          keyOf([row.tournament_id, row.season_id]),
        );

        if (!currentSeason) {
          continue;
        }

        const currentSeasonKey = keyOf([
          currentSeason.tournament_id,
          currentSeason.season_id,
        ]);
        standingsCountsByCurrentSeason.set(
          currentSeasonKey,
          (standingsCountsByCurrentSeason.get(currentSeasonKey) ?? 0) + 1,
        );

        const teamDbId = teamsByApiId.get(row.team_id);
        if (teamDbId != null) {
          standingsBackedTeamKeys.add(
            keyOf([teamDbId, currentSeason.tournament_id, currentSeason.season_id]),
          );
        }
      }
    },
  );

  return {
    currentByExternalSeason,
    currentSeasonTeamKeys,
    standingsCountsByCurrentSeason,
    standingsBackedTeamKeys,
  };
}

// If a current standing can be mapped to a known internal team, that team should
// also appear in current_season_teams. This catches broken view joins or missing
// current-season team coverage.
function checkStandingsBackedTeamsMapToView({
  standingsBackedTeamKeys,
  currentSeasonTeamKeys,
}) {
  const samples = [];
  let failures = 0;

  for (const key of standingsBackedTeamKeys) {
    if (!currentSeasonTeamKeys.has(key)) {
      failures += 1;
      pushSample(samples, `team_context=${key}`);
    }
  }

  addResult(
    "Mapping checks",
    "standings-backed current teams appear in current_season_teams",
    failures,
    samples,
  );
}

// Team stats currently store the external id tuple used by ingestion. Compare
// those rows to current_season_teams by external ids, and collect the rows that
// count as current-season team-stat coverage.
async function collectTeamStatsContext(currentSeasonTeams) {
  const currentExternalTeamKeys = new Set();
  const currentExternalSeasonKeys = new Set();
  const currentTeamStatKeys = new Set();
  const unmappedSamples = [];
  let unmappedCurrentTeamStats = 0;

  for (const row of currentSeasonTeams) {
    currentExternalTeamKeys.add(
      keyOf([row.team_api_id, row.tournament_api_id, row.season_api_id]),
    );
    currentExternalSeasonKeys.add(keyOf([row.tournament_api_id, row.season_api_id]));
  }

  await forEachPage(
    { table: "team_stats", select: "id, team_id, tournament_id, season_id" },
    (rows) => {
      for (const row of rows) {
        const seasonKey = keyOf([row.tournament_id, row.season_id]);
        const teamKey = keyOf([row.team_id, row.tournament_id, row.season_id]);

        if (currentExternalTeamKeys.has(teamKey)) {
          currentTeamStatKeys.add(teamKey);
        } else if (currentExternalSeasonKeys.has(seasonKey)) {
          unmappedCurrentTeamStats += 1;
          pushSample(
            unmappedSamples,
            formatRow({
              team_stats_id: row.id,
              team_id: row.team_id,
              tournament_id: row.tournament_id,
              season_id: row.season_id,
            }),
          );
        }
      }
    },
  );

  addResult(
    "Mapping checks",
    "current-season team_stats rows map to current_season_teams",
    unmappedCurrentTeamStats,
    unmappedSamples,
  );

  return currentTeamStatKeys;
}

// Players store internal team ids. Current players are therefore players whose
// team_id belongs to the current_season_teams view.
async function collectCurrentPlayers(currentSeasonTeams) {
  const currentTeamIds = new Set(currentSeasonTeams.map((row) => String(row.team_id)));
  const currentPlayers = [];
  const currentPlayerApiIds = new Set();
  const currentPlayerTeamByApiId = new Map();
  const playerCountsByTeam = new Map();

  for (const row of currentSeasonTeams) {
    playerCountsByTeam.set(String(row.team_id), 0);
  }

  await forEachPage({ table: "players", select: "id, api_id, team_id, name" }, (rows) => {
    for (const row of rows) {
      if (!currentTeamIds.has(String(row.team_id))) {
        continue;
      }

      currentPlayers.push(row);
      if (row.api_id != null) {
        currentPlayerApiIds.add(String(row.api_id));
        currentPlayerTeamByApiId.set(String(row.api_id), row.team_id);
      }

      const teamKey = String(row.team_id);
      playerCountsByTeam.set(teamKey, (playerCountsByTeam.get(teamKey) ?? 0) + 1);
    }
  });

  return {
    currentPlayers,
    currentPlayerApiIds,
    currentPlayerTeamByApiId,
    playerCountsByTeam,
  };
}

// Player stats use player API ids plus internal team/tournament/season ids.
// This check accepts skeleton rows: it only verifies that a row exists for the
// current player/context, not that has_stats is true.
async function collectPlayerStatsContext({
  currentTournamentSeasons,
  currentSeasonTeams,
  currentPlayerApiIds,
  currentPlayerTeamByApiId,
}) {
  const currentInternalSeasonKeys = new Set();
  const currentInternalTeamKeys = new Set();
  const currentPlayerStatKeys = new Set();
  const unmappedSamples = [];
  let unmappedCurrentPlayerStats = 0;

  for (const row of currentTournamentSeasons) {
    currentInternalSeasonKeys.add(keyOf([row.tournament_id, row.season_id]));
  }

  for (const row of currentSeasonTeams) {
    currentInternalTeamKeys.add(keyOf([row.team_id, row.tournament_id, row.season_id]));
  }

  await forEachPage(
    {
      table: "player_stats",
      select: "id, player_id, team_id, tournament_id, season_id",
    },
    (rows) => {
      for (const row of rows) {
        const seasonKey = keyOf([row.tournament_id, row.season_id]);
        if (!currentInternalSeasonKeys.has(seasonKey)) {
          continue;
        }

        const playerKnown = currentPlayerApiIds.has(String(row.player_id));
        const playerTeamId = currentPlayerTeamByApiId.get(String(row.player_id));
        const playerTeamMatches = String(playerTeamId) === String(row.team_id);
        const teamKnown = currentInternalTeamKeys.has(
          keyOf([row.team_id, row.tournament_id, row.season_id]),
        );

        if (playerKnown && playerTeamMatches && teamKnown) {
          currentPlayerStatKeys.add(
            keyOf([row.player_id, row.team_id, row.tournament_id, row.season_id]),
          );
        } else {
          unmappedCurrentPlayerStats += 1;
          pushSample(
            unmappedSamples,
            formatRow({
              player_stats_id: row.id,
              player_id: row.player_id,
              team_id: row.team_id,
              tournament_id: row.tournament_id,
              season_id: row.season_id,
              player_known: playerKnown,
              player_team_matches: playerTeamMatches,
              team_context_known: teamKnown,
            }),
          );
        }
      }
    },
  );

  addResult(
    "Mapping checks",
    "current-season player_stats rows map to current players and contexts",
    unmappedCurrentPlayerStats,
    unmappedSamples,
  );

  return currentPlayerStatKeys;
}

// There should be at least one standings row for every current tournament-season
// pair. This is the broad "did standings ingestion happen?" check.
function checkCurrentStandingsCoverage({
  currentTournamentSeasons,
  standingsCountsByCurrentSeason,
}) {
  const samples = [];
  let failures = 0;

  for (const row of currentTournamentSeasons) {
    const currentSeasonKey = keyOf([row.tournament_id, row.season_id]);
    if ((standingsCountsByCurrentSeason.get(currentSeasonKey) ?? 0) === 0) {
      failures += 1;
      pushSample(
        samples,
        formatRow({
          tournament_id: row.tournament_id,
          season_id: row.season_id,
          tournament_api_id: row.tournament_api_id,
          season_api_id: row.season_api_id,
        }),
      );
    }
  }

  addResult(
    "Current-season coverage",
    "current standings exist",
    failures,
    samples,
  );
}

// Every current-season team should have one team_stats row for its external
// team/tournament/season tuple.
function checkCurrentTeamStatsCoverage({ currentSeasonTeams, currentTeamStatKeys }) {
  const samples = [];
  let failures = 0;

  for (const row of currentSeasonTeams) {
    const key = keyOf([row.team_api_id, row.tournament_api_id, row.season_api_id]);
    if (!currentTeamStatKeys.has(key)) {
      failures += 1;
      pushSample(
        samples,
        formatRow({
          team_id: row.team_id,
          team_api_id: row.team_api_id,
          tournament_api_id: row.tournament_api_id,
          season_api_id: row.season_api_id,
        }),
      );
    }
  }

  addResult(
    "Current-season coverage",
    "current team stats exist for current-season teams",
    failures,
    samples,
  );
}

// Every current-season team should have at least one player attached. This does
// not assert squad size; it just catches completely missing squad ingestion.
function checkCurrentPlayersCoverage({ currentSeasonTeams, playerCountsByTeam }) {
  const samples = [];
  let failures = 0;

  for (const row of currentSeasonTeams) {
    if ((playerCountsByTeam.get(String(row.team_id)) ?? 0) === 0) {
      failures += 1;
      pushSample(
        samples,
        formatRow({
          team_id: row.team_id,
          team_api_id: row.team_api_id,
          team_name: row.team_name,
        }),
      );
    }
  }

  addResult(
    "Current-season coverage",
    "current players exist for current-season teams",
    failures,
    samples,
  );
}

// Every current player should have a player_stats row for each current context
// that applies to their team. Rows with has_stats=false are intentionally valid
// because ingestion writes skeleton rows when the external API has no stats.
function checkCurrentPlayerStatsCoverage({
  currentSeasonTeams,
  currentPlayers,
  currentPlayerStatKeys,
}) {
  const contextsByTeamId = new Map();
  const samples = [];
  let failures = 0;

  for (const row of currentSeasonTeams) {
    const contexts = contextsByTeamId.get(String(row.team_id)) ?? [];
    contexts.push(row);
    contextsByTeamId.set(String(row.team_id), contexts);
  }

  for (const player of currentPlayers) {
    if (player.api_id == null) {
      failures += 1;
      pushSample(
        samples,
        formatRow({
          player_db_id: player.id,
          player_api_id: player.api_id,
          team_id: player.team_id,
          reason: "missing player api_id",
        }),
      );
      continue;
    }

    const contexts = contextsByTeamId.get(String(player.team_id)) ?? [];
    for (const context of contexts) {
      const key = keyOf([
        player.api_id,
        context.team_id,
        context.tournament_id,
        context.season_id,
      ]);

      if (!currentPlayerStatKeys.has(key)) {
        failures += 1;
        pushSample(
          samples,
          formatRow({
            player_api_id: player.api_id,
            player_name: player.name,
            team_id: context.team_id,
            tournament_id: context.tournament_id,
            season_id: context.season_id,
          }),
        );
      }
    }
  }

  addResult(
    "Current-season coverage",
    "current player stats rows exist for current-season players",
    failures,
    samples,
  );
}

// Print all collected results at the end. The script keeps running after an
// individual check fails so the user gets a complete validation report.
function printSummary() {
  const sections = [...new Set(results.map((result) => result.section))];
  let totalFailures = 0;

  console.log("\nFinal thesis ingestion validation");
  console.log("=================================");

  for (const section of sections) {
    console.log(`\n${section}`);
    console.log("-".repeat(section.length));

    for (const result of results.filter((item) => item.section === section)) {
      totalFailures += result.failures;
      const status = result.failures === 0 ? "PASS" : "FAIL";
      console.log(`[${status}] ${result.name}: ${result.failures} failure(s)`);

      for (const sample of result.samples) {
        console.log(`  - ${sample}`);
      }
    }
  }

  console.log("\nResult");
  console.log("------");

  if (totalFailures === 0) {
    console.log("PASS: final thesis ingestion coverage validation passed.");
  } else {
    console.log(
      `FAIL: final thesis ingestion coverage validation found ${totalFailures} failure(s).`,
    );
  }

  return totalFailures;
}

// Main validation flow. The order is intentional: first gather duplicate/id
// health, then build current-season context, then validate coverage.
async function runValidation() {
  await checkDuplicateKeys({
    table: "standings",
    select: "id, tournament_id, season_id, team_id, standing_group_id, stage_tournament_id",
    keyColumns: [
      "tournament_id",
      "season_id",
      "team_id",
      "standing_group_id",
      "stage_tournament_id",
    ],
    name:
      "standings by tournament_id, season_id, team_id, standing_group_id, stage_tournament_id",
  });
  await checkDuplicateKeys({
    table: "team_stats",
    select: "id, team_id, tournament_id, season_id",
    keyColumns: ["team_id", "tournament_id", "season_id"],
    name: "team_stats by team_id, tournament_id, season_id",
  });
  await checkDuplicateKeys({
    table: "player_stats",
    select: "id, player_id, team_id, tournament_id, season_id",
    keyColumns: ["player_id", "team_id", "tournament_id", "season_id"],
    name: "player_stats by player_id, team_id, tournament_id, season_id",
  });

  for (const table of ["teams", "players", "seasons", "tournaments"]) {
    await checkEntityApiIds(table);
  }

  const [currentTournamentSeasons, currentSeasonTeams, teamsByApiId] =
    await Promise.all([
      loadCurrentTournamentSeasons(),
      loadCurrentSeasonTeams(),
      loadTeamsByApiId(),
    ]);

  await checkStandingsViewMappings();
  await checkCurrentSeasonsMapToView(currentTournamentSeasons);

  const currentStandingContext = await collectCurrentStandingContext({
    currentTournamentSeasons,
    currentSeasonTeams,
    teamsByApiId,
  });

  checkStandingsBackedTeamsMapToView(currentStandingContext);

  const currentTeamStatKeys = await collectTeamStatsContext(currentSeasonTeams);
  const {
    currentPlayers,
    currentPlayerApiIds,
    currentPlayerTeamByApiId,
    playerCountsByTeam,
  } =
    await collectCurrentPlayers(currentSeasonTeams);
  const currentPlayerStatKeys = await collectPlayerStatsContext({
    currentTournamentSeasons,
    currentSeasonTeams,
    currentPlayerApiIds,
    currentPlayerTeamByApiId,
  });

  checkCurrentStandingsCoverage({
    currentTournamentSeasons,
    standingsCountsByCurrentSeason:
      currentStandingContext.standingsCountsByCurrentSeason,
  });
  checkCurrentTeamStatsCoverage({ currentSeasonTeams, currentTeamStatKeys });
  checkCurrentPlayersCoverage({ currentSeasonTeams, playerCountsByTeam });
  checkCurrentPlayerStatsCoverage({
    currentSeasonTeams,
    currentPlayers,
    currentPlayerStatKeys,
  });

  return printSummary();
}

// This script is read-only. It reports DB issues and exits nonzero on failure,
// but it never writes to Supabase or calls the football API.
runValidation()
  .then((failureCount) => {
    if (failureCount > 0) {
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error("\nValidation failed before completion.");
    console.error(error.message ?? error);
    process.exitCode = 1;
  });
