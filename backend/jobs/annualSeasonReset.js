import { fileURLToPath } from "url";
import {
  clearIngestionLogContext,
  finishIngestionRun,
  finishIngestionStep,
  setIngestionLogContext,
  startIngestionRun,
  startIngestionStep,
} from "../lib/ingestionLogger.js";
import { runFetchSeasons } from "../ingestion/fetchSeasons.js";
import { runFetchStandings } from "../ingestion/fetchStandings.js";
import { runFetchTeamLogos } from "../ingestion/fetchTeamLogos.js";
import { runFetchTeams } from "../ingestion/fetchTeams.js";
import { runFetchTournaments } from "../ingestion/fetchTournaments.js";

const ANNUAL_RESET_DATE = "July 1";
const RETENTION_POLICY =
  "do not delete old seasons, standings, team stats, teams, or tournaments";
const RESET_SCOPE = "narrow season/tournament/team/logo maintenance";
const STANDINGS_USAGE = "refresh mode only; used to discover current teams";

const ANNUAL_SEASON_RESET_STEPS = [
  {
    name: "seasons",
    description: "recent seasons and is_current verification",
    run: () => runFetchSeasons(),
  },
  {
    name: "tournaments",
    description: "tournament metadata for known season tournament ids",
    run: () => runFetchTournaments(),
  },
  {
    name: "standings",
    description:
      "current-season standings used only as the team discovery bridge",
    run: () => runFetchStandings({ mode: "refresh" }),
  },
  {
    name: "teams",
    description: "missing teams discovered from refreshed standings",
    run: () => runFetchTeams(),
  },
  {
    name: "team logos",
    description: "missing team logos only",
    run: () => runFetchTeamLogos(),
  },
];

function errorMessage(error) {
  return error?.message || String(error);
}

function summaryCounts(summary = {}) {
  const counts = summary.counts ?? summary;

  return {
    inserted: counts.inserted,
    updated: counts.updated ?? counts.upserted,
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
    totalSteps: ANNUAL_SEASON_RESET_STEPS.length,
    description: step.description,
    scheduledFor: ANNUAL_RESET_DATE,
    scope: RESET_SCOPE,
    standingsUsage: STANDINGS_USAGE,
    retentionPolicy: RETENTION_POLICY,
    ...summaryRest,
    ...metadata,
  };
}

async function runAnnualSeasonResetStep(step, index, runId) {
  const label = `${index + 1}/${ANNUAL_SEASON_RESET_STEPS.length} ${step.name}`;
  const stepLogId = await startIngestionStep({
    runId,
    stepName: step.name,
    metadata: {
      order: index + 1,
      totalSteps: ANNUAL_SEASON_RESET_STEPS.length,
      description: step.description,
      scheduledFor: ANNUAL_RESET_DATE,
      scope: RESET_SCOPE,
      standingsUsage: STANDINGS_USAGE,
      retentionPolicy: RETENTION_POLICY,
    },
  });

  console.log(
    `\n=== Annual season reset step ${label}: starting (${step.description}) ===`,
  );

  setIngestionLogContext({
    runId,
    stepLogId,
    stepName: step.name,
  });

  try {
    const summary = (await step.run()) ?? {};

    await finishIngestionStep(stepLogId, {
      status: "success",
      counts: summaryCounts(summary),
      metadata: summaryMetadata(step, index, summary),
    });

    console.log(`=== Annual season reset step ${label}: complete ===`);

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

export async function runAnnualSeasonReset() {
  console.log("Starting annual season reset ingestion...");
  console.log(`Annual season reset is intended for ${ANNUAL_RESET_DATE}.`);
  console.log(
    "Annual season reset stays narrow: tournaments, seasons, standings refresh for team discovery, missing teams, and missing logos only.",
  );
  console.log(
    "Standings are needed because the existing team sync discovers current teams from standings; this job uses refresh mode only.",
  );
  console.log(
    "This job does not fetch historical player squads, historical player stats, transfer history, or init-mode team stats.",
  );
  console.log(
    "This job does not delete old seasons, old standings, old team stats, old teams, or old tournament rows; it only upserts/updates current maintenance data and recalculates is_current.",
  );

  const runId = await startIngestionRun({
    mode: "annual-season-reset",
    metadata: {
      totalSteps: ANNUAL_SEASON_RESET_STEPS.length,
      steps: ANNUAL_SEASON_RESET_STEPS.map((step) => step.name),
      scheduledFor: ANNUAL_RESET_DATE,
      scope: RESET_SCOPE,
      standingsUsage: STANDINGS_USAGE,
      retentionPolicy: RETENTION_POLICY,
    },
  });

  for (let index = 0; index < ANNUAL_SEASON_RESET_STEPS.length; index += 1) {
    const step = ANNUAL_SEASON_RESET_STEPS[index];

    try {
      await runAnnualSeasonResetStep(step, index, runId);
    } catch (error) {
      console.error(`Annual season reset stopped at step "${step.name}".`);
      await finishIngestionRun(runId, {
        status: "failed",
        errorMessage: errorMessage(error),
        metadata: {
          failedStep: step.name,
          failedStepOrder: index + 1,
          completedSteps: index,
          scheduledFor: ANNUAL_RESET_DATE,
          scope: RESET_SCOPE,
          standingsUsage: STANDINGS_USAGE,
          retentionPolicy: RETENTION_POLICY,
        },
      });
      throw error;
    }
  }

  await finishIngestionRun(runId, {
    status: "success",
    metadata: {
      completedSteps: ANNUAL_SEASON_RESET_STEPS.length,
      scheduledFor: ANNUAL_RESET_DATE,
      scope: RESET_SCOPE,
      standingsUsage: STANDINGS_USAGE,
      retentionPolicy: RETENTION_POLICY,
    },
  });

  console.log("\nAnnual season reset ingestion complete.");
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runAnnualSeasonReset();
  } catch (error) {
    console.error("Annual season reset failed:", error.message || error);
    process.exitCode = 1;
  }
}
