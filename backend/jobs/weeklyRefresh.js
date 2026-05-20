import { fileURLToPath } from "url";
import {
  clearIngestionLogContext,
  finishIngestionRun,
  finishIngestionStep,
  setIngestionLogContext,
  startIngestionRun,
  startIngestionStep,
} from "../lib/ingestionLogger.js";
import { runFetchAllTeamStats } from "../ingestion/fetchAllTeamStats.js";
import { runFetchStandings } from "../ingestion/fetchStandings.js";

const WEEKLY_REFRESH_STEPS = [
  {
    name: "standings",
    description: "current-season standings",
    run: () => runFetchStandings({ mode: "refresh" }),
  },
  {
    name: "team stats",
    description: "current-season team stats",
    run: () => runFetchAllTeamStats({ mode: "refresh" }),
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
    totalSteps: WEEKLY_REFRESH_STEPS.length,
    description: step.description,
    ...summaryRest,
    ...metadata,
  };
}

async function runWeeklyRefreshStep(step, index, runId) {
  const label = `${index + 1}/${WEEKLY_REFRESH_STEPS.length} ${step.name}`;
  const stepLogId = await startIngestionStep({
    runId,
    stepName: step.name,
    metadata: {
      order: index + 1,
      totalSteps: WEEKLY_REFRESH_STEPS.length,
      description: step.description,
    },
  });

  console.log(
    `\n=== Weekly refresh step ${label}: starting (${step.description}) ===`,
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

    console.log(`=== Weekly refresh step ${label}: complete ===`);

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

export async function runWeeklyRefresh() {
  console.log("Starting weekly refresh ingestion...");
  console.log(
    "Weekly refresh runs current-season standings and team stats only.",
  );

  const runId = await startIngestionRun({
    mode: "weekly-refresh",
    metadata: {
      totalSteps: WEEKLY_REFRESH_STEPS.length,
      steps: WEEKLY_REFRESH_STEPS.map((step) => step.name),
    },
  });

  for (let index = 0; index < WEEKLY_REFRESH_STEPS.length; index += 1) {
    const step = WEEKLY_REFRESH_STEPS[index];

    try {
      await runWeeklyRefreshStep(step, index, runId);
    } catch (error) {
      console.error(`Weekly refresh stopped at step "${step.name}".`);
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
      completedSteps: WEEKLY_REFRESH_STEPS.length,
    },
  });

  console.log("\nWeekly refresh ingestion complete.");
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runWeeklyRefresh();
  } catch (error) {
    console.error("Weekly refresh failed:", error.message || error);
    process.exitCode = 1;
  }
}
