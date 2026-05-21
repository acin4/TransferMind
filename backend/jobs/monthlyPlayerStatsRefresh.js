import { fileURLToPath } from "url";
import {
  ENTITY_TYPES,
  getFreshnessDecision,
  markFailed,
  markFresh,
  staleAfterDays,
} from "../lib/freshness.js";
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
    entityType: ENTITY_TYPES.PLAYER_STATS,
    entityKey: "monthly-player-stats-refresh",
    staleAfterMs: staleAfterDays(30),
    run: () => runFetchAllPlayerStats(),
  },
];

function parseSkipFresh(argv) {
  return argv.includes("--skip-fresh");
}

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
    entityType: step.entityType,
    entityKey: step.entityKey,
    staleAfterMs: step.staleAfterMs,
    ...summaryRest,
    ...metadata,
  };
}

function freshnessDecisionMetadata(decision) {
  if (!decision) return {};

  return {
    freshnessReason: decision.reason,
    freshnessStatus: decision.freshness?.status ?? null,
    lastFetchedAt: decision.lastFetchedAt ?? null,
    ageMs: decision.ageMs ?? null,
    staleAfterMs: decision.staleAfterMs,
  };
}

async function markStepFailedFreshness(step, error) {
  try {
    await markFailed({
      entityType: step.entityType,
      entityKey: step.entityKey,
      err: error,
    });
  } catch (freshnessError) {
    console.warn(
      `Could not record failed freshness for ${step.entityKey}:`,
      errorMessage(freshnessError),
    );
  }
}

async function runMonthlyPlayerStatsRefreshStep(
  step,
  index,
  runId,
  { skipFresh = false },
) {
  const label = `${index + 1}/${MONTHLY_PLAYER_STATS_REFRESH_STEPS.length} ${step.name}`;
  const stepLogId = await startIngestionStep({
    runId,
    stepName: step.name,
    metadata: {
      order: index + 1,
      totalSteps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.length,
      description: step.description,
      entityType: step.entityType,
      entityKey: step.entityKey,
      staleAfterMs: step.staleAfterMs,
      skipFresh,
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
    if (skipFresh) {
      const freshnessDecision = await getFreshnessDecision({
        entityType: step.entityType,
        entityKey: step.entityKey,
        staleAfterMs: step.staleAfterMs,
      });

      if (freshnessDecision.shouldSkip) {
        const summary = {
          skipped: 1,
          metadata: {
            skippedDueToFreshness: true,
            ...freshnessDecisionMetadata(freshnessDecision),
          },
        };

        await finishIngestionStep(stepLogId, {
          status: "success",
          counts: summaryCounts(summary),
          metadata: summaryMetadata(step, index, summary),
        });

        console.log(
          `=== Monthly player stats refresh step ${label}: skipped; ${step.entityKey} is fresh ===`,
        );

        return summary;
      }

      console.log(
        `Freshness check for ${step.entityKey}: ${freshnessDecision.reason}; running step.`,
      );
    }

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
      `=== Monthly player stats refresh step ${label}: complete ===`,
    );

    return summary;
  } catch (error) {
    const summary = error?.summary ?? {};
    await markStepFailedFreshness(step, error);
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

export async function runMonthlyPlayerStatsRefresh({ skipFresh = false } = {}) {
  console.log("Starting monthly player stats refresh ingestion...");
  console.log(
    "Monthly player stats refresh runs current-season player stats only.",
  );
  console.log(
    skipFresh
      ? "Freshness skipping is enabled for monthly player stats refresh."
      : "Freshness skipping is disabled for monthly player stats refresh.",
  );

  const runId = await startIngestionRun({
    mode: "monthly-player-stats-refresh",
    metadata: {
      totalSteps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.length,
      steps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.map((step) => step.name),
      skipFresh,
    },
  });

  for (
    let index = 0;
    index < MONTHLY_PLAYER_STATS_REFRESH_STEPS.length;
    index += 1
  ) {
    const step = MONTHLY_PLAYER_STATS_REFRESH_STEPS[index];

    try {
      await runMonthlyPlayerStatsRefreshStep(step, index, runId, {
        skipFresh,
      });
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
          skipFresh,
        },
      });
      throw error;
    }
  }

  await finishIngestionRun(runId, {
    status: "success",
    metadata: {
      completedSteps: MONTHLY_PLAYER_STATS_REFRESH_STEPS.length,
      skipFresh,
    },
  });

  console.log("\nMonthly player stats refresh ingestion complete.");
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runMonthlyPlayerStatsRefresh({
      skipFresh: parseSkipFresh(process.argv.slice(2)),
    });
  } catch (error) {
    console.error(
      "Monthly player stats refresh failed:",
      error.message || error,
    );
    process.exitCode = 1;
  }
}
