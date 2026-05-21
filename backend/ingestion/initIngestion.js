import { fileURLToPath } from "url";
import { ENTITY_TYPES, markFresh } from "../lib/freshness.js";
import {
  clearIngestionLogContext,
  finishIngestionRun,
  finishIngestionStep,
  setIngestionLogContext,
  startIngestionRun,
  startIngestionStep,
} from "../lib/ingestionLogger.js";
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

function errorMessage(error) {
  return error?.message || String(error);
}

function summaryCounts(summary = {}) {
  const counts = summary.counts ?? summary;

  return {
    inserted: counts.inserted,
    updated: counts.updated,
    skipped: counts.skipped,
    failed: counts.failed,
  };
}

function summaryMetadata(step, index, summary = {}) {
  const {
    inserted,
    updated,
    skipped,
    failed,
    counts,
    metadata = {},
    ...summaryRest
  } = summary;

  return {
    order: index + 1,
    totalSteps: INIT_STEPS.length,
    description: step.description,
    entityType: step.entityType,
    entityKey: step.entityKey,
    ...summaryRest,
    ...metadata,
  };
}

async function runInitStep(step, index, runId) {
  const label = `${index + 1}/${INIT_STEPS.length} ${step.name}`;
  const stepLogId = await startIngestionStep({
    runId,
    stepName: step.name,
    metadata: {
      order: index + 1,
      totalSteps: INIT_STEPS.length,
      description: step.description,
      entityType: step.entityType,
      entityKey: step.entityKey,
    },
  });

  console.log(`\n=== Init step ${label}: starting (${step.description}) ===`);

  setIngestionLogContext({
    runId,
    stepLogId,
    stepName: step.name,
  });

  try {
    const summary = (await step.run()) ?? {};

    await markFresh({
      entityType: step.entityType,
      entityKey: step.entityKey,
    });

    await finishIngestionStep(stepLogId, {
      status: "success",
      counts: summaryCounts(summary),
      metadata: summaryMetadata(step, index, summary),
    });

    console.log(
      `=== Init step ${label}: complete; freshness recorded as ${step.entityKey} ===`,
    );

    return summary;
  } catch (error) {
    const summary = error?.summary ?? {};
    await finishIngestionStep(stepLogId, {
      status: "failed",
      counts: summaryCounts(summary),
      errorMessage: errorMessage(error),
      metadata: summaryMetadata(step, index, summary),
    });
    throw error;
  } finally {
    clearIngestionLogContext();
  }
}

export async function runInitIngestion() {
  console.log("🚀 Starting init ingestion...");
  console.log("Freshness checks are not used to skip init ingestion work.");

  const runId = await startIngestionRun({
    mode: "init",
    metadata: {
      totalSteps: INIT_STEPS.length,
      steps: INIT_STEPS.map((step) => step.name),
    },
  });

  for (let index = 0; index < INIT_STEPS.length; index += 1) {
    const step = INIT_STEPS[index];

    try {
      await runInitStep(step, index, runId);
    } catch (error) {
      console.error(
        `❌ Init ingestion stopped at step "${step.name}". Freshness was not recorded for this step.`,
      );
      await finishIngestionRun(runId, {
        status: "failed",
        errorMessage: errorMessage(error),
        metadata: {
          failedStep: step.name,
          failedStepOrder: index + 1,
          completedSteps: index,
        },
      });
      throw error;
    }
  }

  await finishIngestionRun(runId, {
    status: "success",
    metadata: {
      completedSteps: INIT_STEPS.length,
    },
  });

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
