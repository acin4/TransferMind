import { supabase } from "./supabaseClient.js";

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 4;
const SENSITIVE_KEY_PATTERN =
  /(authorization|auth|api[-_]?key|rapidapi|token|secret|password|cookie|headers?)/i;

let ingestionLogContext = null;
const runStartTimes = new Map();
const stepStartTimes = new Map();
const runMetadata = new Map();
const stepMetadata = new Map();

function warnLoggingFailure(action, error) {
  console.warn(
    `⚠️ Ingestion logging ${action} failed; continuing without blocking ingestion:`,
    error?.message || error,
  );
}

function normalizeErrorMessage(errorMessage) {
  if (!errorMessage) return null;
  const message = String(errorMessage);
  return message.length > MAX_STRING_LENGTH
    ? `${message.slice(0, MAX_STRING_LENGTH)}...`
    : message;
}

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) return value ?? null;

  if (depth >= MAX_DEPTH) {
    return "[Truncated]";
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...`
      : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    const sanitized = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1));

    if (value.length > MAX_ARRAY_ITEMS) {
      sanitized.push(`[${value.length - MAX_ARRAY_ITEMS} more item(s)]`);
    }

    return sanitized;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
    const sanitized = {};

    for (const [key, entryValue] of entries) {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : sanitizeValue(entryValue, depth + 1);
    }

    const objectKeyCount = Object.keys(value).length;
    if (objectKeyCount > MAX_OBJECT_KEYS) {
      sanitized.__truncatedKeys = objectKeyCount - MAX_OBJECT_KEYS;
    }

    return sanitized;
  }

  return String(value);
}

function sanitizeObject(value) {
  const sanitized = sanitizeValue(value ?? {});
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized
    : {};
}

function durationFrom(startMap, id) {
  const startedAt = startMap.get(id);
  return startedAt ? Date.now() - startedAt : null;
}

function normalizeCounts(counts = {}) {
  return {
    records_inserted: counts.inserted ?? null,
    records_updated: counts.updated ?? null,
    records_skipped: counts.skipped ?? null,
    records_failed: counts.failed ?? null,
  };
}

export function setIngestionLogContext(context) {
  ingestionLogContext = context
    ? {
        runId: context.runId ?? null,
        stepLogId: context.stepLogId ?? null,
        stepName: context.stepName ?? null,
      }
    : null;
}

export function getIngestionLogContext() {
  return ingestionLogContext ? { ...ingestionLogContext } : null;
}

export function clearIngestionLogContext() {
  ingestionLogContext = null;
}

export async function startIngestionRun({ mode, metadata = {} }) {
  const startedAt = new Date().toISOString();

  try {
    const compactMetadata = sanitizeObject(metadata);
    const { data, error } = await supabase
      .from("ingestion_runs")
      .insert({
        mode,
        status: "running",
        started_at: startedAt,
        metadata: compactMetadata,
      })
      .select("id")
      .single();

    if (error) throw error;

    const id = data?.id ?? null;
    if (id) {
      runStartTimes.set(id, Date.now());
      runMetadata.set(id, compactMetadata);
    }

    return id;
  } catch (error) {
    warnLoggingFailure("run start", error);
    return null;
  }
}

export async function finishIngestionRun(
  runId,
  { status, errorMessage = null, metadata = {} } = {},
) {
  if (!runId) return;

  try {
    const finishedAt = new Date().toISOString();
    const previousMetadata = runMetadata.get(runId) ?? {};
    const durationMs = durationFrom(runStartTimes, runId);

    const { error } = await supabase
      .from("ingestion_runs")
      .update({
        status,
        finished_at: finishedAt,
        duration_ms: durationMs,
        error_message: normalizeErrorMessage(errorMessage),
        metadata: {
          ...previousMetadata,
          ...sanitizeObject(metadata),
        },
      })
      .eq("id", runId);

    if (error) throw error;
  } catch (error) {
    warnLoggingFailure("run finish", error);
  } finally {
    runStartTimes.delete(runId);
    runMetadata.delete(runId);
  }
}

export async function startIngestionStep({
  runId,
  stepName,
  metadata = {},
}) {
  if (!runId) return null;

  const startedAt = new Date().toISOString();

  try {
    const compactMetadata = sanitizeObject(metadata);
    const { data, error } = await supabase
      .from("ingestion_step_logs")
      .insert({
        run_id: runId,
        step_name: stepName,
        status: "running",
        started_at: startedAt,
        metadata: compactMetadata,
      })
      .select("id")
      .single();

    if (error) throw error;

    const id = data?.id ?? null;
    if (id) {
      stepStartTimes.set(id, Date.now());
      stepMetadata.set(id, compactMetadata);
    }

    return id;
  } catch (error) {
    warnLoggingFailure("step start", error);
    return null;
  }
}

export async function finishIngestionStep(
  stepLogId,
  { status, counts = {}, errorMessage = null, metadata = {} } = {},
) {
  if (!stepLogId) return;

  try {
    const finishedAt = new Date().toISOString();
    const previousMetadata = stepMetadata.get(stepLogId) ?? {};
    const durationMs = durationFrom(stepStartTimes, stepLogId);

    const { error } = await supabase
      .from("ingestion_step_logs")
      .update({
        status,
        finished_at: finishedAt,
        duration_ms: durationMs,
        ...normalizeCounts(counts),
        error_message: normalizeErrorMessage(errorMessage),
        metadata: {
          ...previousMetadata,
          ...sanitizeObject(metadata),
        },
      })
      .eq("id", stepLogId);

    if (error) throw error;
  } catch (error) {
    warnLoggingFailure("step finish", error);
  } finally {
    stepStartTimes.delete(stepLogId);
    stepMetadata.delete(stepLogId);
  }
}

export async function logApiRequest({
  runId,
  stepLogId,
  stepName,
  endpoint,
  params = {},
  statusCode = null,
  success,
  durationMs = null,
  errorMessage = null,
}) {
  const context = getIngestionLogContext();

  try {
    const { error } = await supabase.from("api_request_logs").insert({
      run_id: runId ?? context?.runId ?? null,
      step_log_id: stepLogId ?? context?.stepLogId ?? null,
      step_name: stepName ?? context?.stepName ?? null,
      endpoint: endpoint || "unknown",
      params: sanitizeObject(params),
      status_code: statusCode,
      success: Boolean(success),
      duration_ms: durationMs,
      error_message: normalizeErrorMessage(errorMessage),
    });

    if (error) throw error;
  } catch (error) {
    warnLoggingFailure("API request insert", error);
  }
}
