import { fileURLToPath } from "url";
import { ENTITY_TYPES, markFresh } from "../lib/freshness.js";
import { runFetchAllPlayerStats } from "./fetchAllPlayerStats.js";
import { runFetchAllTeamStats } from "./fetchAllTeamStats.js";
import { runFetchPlayers } from "./fetchPlayers.js";
import { runFetchSeasons } from "./fetchSeasons.js";
import { runFetchStandings } from "./fetchStandings.js";
import { runFetchTeamLogos } from "./fetchTeamLogos.js";
import { runFetchTeams } from "./fetchTeams.js";
import { runFetchTournaments } from "./fetchTournaments.js";

const INIT_STEPS = [
  {
    name: "seasons",
    description: "last 3 seasons fetch",
    entityType: ENTITY_TYPES.SEASONS,
    entityKey: "seasons:init_last_3",
    run: () => runFetchSeasons(),
  },
  {
    name: "tournaments",
    description: "tournament metadata",
    entityType: ENTITY_TYPES.TOURNAMENTS,
    entityKey: "tournaments:init_metadata",
    run: () => runFetchTournaments(),
  },
  {
    name: "standings",
    description: "all DB seasons",
    entityType: ENTITY_TYPES.STANDINGS,
    entityKey: "standings:init_all_db_seasons",
    run: () => runFetchStandings({ mode: "init" }),
  },
  {
    name: "teams",
    description: "DB-derived team targets",
    entityType: ENTITY_TYPES.TEAMS,
    entityKey: "teams:init_db_derived_targets",
    run: () => runFetchTeams(),
  },
  {
    name: "team logos",
    description: "missing/changed logos",
    entityType: ENTITY_TYPES.TEAM_LOGOS,
    entityKey: "team_logos:init_missing_changed",
    run: () => runFetchTeamLogos(),
  },
  {
    name: "team stats",
    description: "all standings-backed DB seasons",
    entityType: ENTITY_TYPES.TEAM_STATS,
    entityKey: "team_stats:init_all_standings_backed_db_seasons",
    run: () => runFetchAllTeamStats({ mode: "init" }),
  },
  {
    name: "players",
    description: "current-season players",
    entityType: ENTITY_TYPES.PLAYERS,
    entityKey: "players:init_current_season",
    run: () => runFetchPlayers(),
  },
  {
    name: "player stats",
    description: "current-season player stats",
    entityType: ENTITY_TYPES.PLAYER_STATS,
    entityKey: "player_stats:init_current_season",
    run: () => runFetchAllPlayerStats(),
  },
];

async function runInitStep(step, index) {
  const label = `${index + 1}/${INIT_STEPS.length} ${step.name}`;

  console.log(`\n=== Init step ${label}: starting (${step.description}) ===`);

  await step.run();
  await markFresh({
    entityType: step.entityType,
    entityKey: step.entityKey,
  });

  console.log(
    `=== Init step ${label}: complete; freshness recorded as ${step.entityKey} ===`,
  );
}

export async function runInitIngestion() {
  console.log("🚀 Starting init ingestion...");
  console.log("Freshness checks are not used to skip init ingestion work.");

  for (let index = 0; index < INIT_STEPS.length; index += 1) {
    const step = INIT_STEPS[index];

    try {
      await runInitStep(step, index);
    } catch (error) {
      console.error(
        `❌ Init ingestion stopped at step "${step.name}". Freshness was not recorded for this step.`,
      );
      throw error;
    }
  }

  console.log("\n🎉 Init ingestion complete.");
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runInitIngestion();
  } catch (error) {
    console.error("❌ Init ingestion failed:", error.message || error);
    process.exitCode = 1;
  }
}
