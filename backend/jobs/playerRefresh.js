import { fileURLToPath } from "url";
import {
  clearIngestionLogContext,
  finishIngestionRun,
  finishIngestionStep,
  setIngestionLogContext,
  startIngestionRun,
  startIngestionStep,
} from "../lib/ingestionLogger.js";
import { runFetchPlayers } from "../ingestion/fetchPlayers.js";

const FIXED_PLAYER_REFRESH_DATES = [
  "July 1",
  "August 1",
  "October 1",
  "January 1",
  "February 1",
  "March 1",
];

const PLAYER_REFRESH_STEPS = [
  {
    name: "players",
    description: "current-season players",
    existingPlayerBehavior: "existing players are skipped, not refreshed",
    run: () => runFetchPlayers(),
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
    totalSteps: PLAYER_REFRESH_STEPS.length,
    description: step.description,
    fixedDates: FIXED_PLAYER_REFRESH_DATES,
    existingPlayerBehavior: step.existingPlayerBehavior,
    ...summaryRest,
    ...metadata,
  };
}

async function runPlayerRefreshStep(step, index, runId) {
  const label = `${index + 1}/${PLAYER_REFRESH_STEPS.length} ${step.name}`;
  const stepLogId = await startIngestionStep({
    runId,
    stepName: step.name,
    metadata: {
      order: index + 1,
      totalSteps: PLAYER_REFRESH_STEPS.length,
      description: step.description,
      fixedDates: FIXED_PLAYER_REFRESH_DATES,
      existingPlayerBehavior: step.existingPlayerBehavior,
    },
  });

  console.log(
    `\n=== Player refresh step ${label}: starting (${step.description}) ===`,
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

    console.log(`=== Player refresh step ${label}: complete ===`);

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

export async function runPlayerRefresh() {
  console.log("Starting fixed-date player refresh ingestion...");
  console.log(
    `Fixed-date player refresh is intended for ${FIXED_PLAYER_REFRESH_DATES.join(", ")}.`,
  );
  console.log(
    "Player refresh runs current-season players only; existing players are skipped, not refreshed.",
  );

  const runId = await startIngestionRun({
    mode: "player-refresh",
    metadata: {
      totalSteps: PLAYER_REFRESH_STEPS.length,
      steps: PLAYER_REFRESH_STEPS.map((step) => step.name),
      fixedDates: FIXED_PLAYER_REFRESH_DATES,
      existingPlayerBehavior: PLAYER_REFRESH_STEPS[0].existingPlayerBehavior,
    },
  });

  for (let index = 0; index < PLAYER_REFRESH_STEPS.length; index += 1) {
    const step = PLAYER_REFRESH_STEPS[index];

    try {
      await runPlayerRefreshStep(step, index, runId);
    } catch (error) {
      console.error(`Player refresh stopped at step "${step.name}".`);
      await finishIngestionRun(runId, {
        status: "failed",
        errorMessage: errorMessage(error),
        metadata: {
          failedStep: step.name,
          failedStepOrder: index + 1,
          completedSteps: index,
          fixedDates: FIXED_PLAYER_REFRESH_DATES,
          existingPlayerBehavior: step.existingPlayerBehavior,
        },
      });
      throw error;
    }
  }

  await finishIngestionRun(runId, {
    status: "success",
    metadata: {
      completedSteps: PLAYER_REFRESH_STEPS.length,
      fixedDates: FIXED_PLAYER_REFRESH_DATES,
      existingPlayerBehavior: PLAYER_REFRESH_STEPS[0].existingPlayerBehavior,
    },
  });

  console.log("\nFixed-date player refresh ingestion complete.");
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runPlayerRefresh();
  } catch (error) {
    console.error("Fixed-date player refresh failed:", error.message || error);
    process.exitCode = 1;
  }
}
