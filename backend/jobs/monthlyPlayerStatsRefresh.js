import { fileURLToPath } from "url";
import {
  clearIngestionLogContext,
  finishIngestionRun,
  finishIngestionStep,
  setIngestionLogContext,
  startIngestionRun,
  startIngestionStep,
} from "../lib/ingestionLogger.js";
import { runFetchAllPlayerStats } from "../ingestion/fetchAllPlayerStats.js";

const MONTHLY_PLAYER_STATS_REFRESH_STEPS = [
  {
    name: "player stats",
    description: "current-season player stats",
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
    totalSteps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.length,
    description: step.description,
    ...summaryRest,
    ...metadata,
  };
}

async function runMonthlyPlayerStatsRefreshStep(step, index, runId) {
  const label = `${index + 1}/${MONTHLY_PLAYER_STATS_REFRESH_STEPS.length} ${step.name}`;
  const stepLogId = await startIngestionStep({
    runId,
    stepName: step.name,
    metadata: {
      order: index + 1,
      totalSteps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.length,
      description: step.description,
    },
  });

  console.log(
    `\n=== Monthly player stats refresh step ${label}: starting (${step.description}) ===`,
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

    console.log(
      `=== Monthly player stats refresh step ${label}: complete ===`,
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

export async function runMonthlyPlayerStatsRefresh() {
  console.log("Starting monthly player stats refresh ingestion...");
  console.log(
    "Monthly player stats refresh runs current-season player stats only.",
  );

  const runId = await startIngestionRun({
    mode: "monthly-player-stats-refresh",
    metadata: {
      totalSteps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.length,
      steps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.map((step) => step.name),
    },
  });

  for (
    let index = 0;
    index < MONTHLY_PLAYER_STATS_REFRESH_STEPS.length;
    index += 1
  ) {
    const step = MONTHLY_PLAYER_STATS_REFRESH_STEPS[index];

    try {
      await runMonthlyPlayerStatsRefreshStep(step, index, runId);
    } catch (error) {
      console.error(
        `Monthly player stats refresh stopped at step "${step.name}".`,
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
      completedSteps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.length,
    },
  });

  console.log("\nMonthly player stats refresh ingestion complete.");
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runMonthlyPlayerStatsRefresh();
  } catch (error) {
    console.error(
      "Monthly player stats refresh failed:",
      error.message || error,
    );
    process.exitCode = 1;
  }
}
