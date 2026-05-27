import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { HttpError } from "./http.js";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = resolve(CURRENT_DIR, "../python/apriori_runner.py");
const PYTHON_BIN = process.env.TRANSFERMIND_PYTHON_BIN ?? "python3";
const DEFAULT_TIMEOUT_MS = 60000;
const ERROR_MESSAGE = "Unable to complete Apriori association rules mining.";
const TIMEOUT_ERROR_MESSAGE =
  "Apriori mining took too long. Increase the minimum support value and try again.";

function validateAprioriResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Apriori runner output must be an object.");
  }

  if (!Array.isArray(result.rules)) {
    throw new Error("Apriori runner output rules must be an array.");
  }

  if (
    result.warnings !== undefined &&
    result.warnings !== null &&
    !Array.isArray(result.warnings)
  ) {
    throw new Error("Apriori runner output warnings must be an array.");
  }

  if (
    result.pagination !== undefined &&
    result.pagination !== null &&
    (typeof result.pagination !== "object" || Array.isArray(result.pagination))
  ) {
    throw new Error("Apriori runner output pagination must be an object.");
  }

  return {
    rules: result.rules,
    pagination: result.pagination ?? null,
    warnings: result.warnings ?? [],
  };
}

export function runPythonApriori(payload, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolveResult, reject) => {
    const child = spawn(PYTHON_BIN, [RUNNER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeout;

    const settle = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      callback();
    };

    timeout = setTimeout(() => {
      child.kill("SIGKILL");
      settle(() => {
        reject(new HttpError(408, TIMEOUT_ERROR_MESSAGE));
      });
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.stdin.on("error", (error) => {
      if (!settled) {
        console.error(
          "Unable to write to Python Apriori runner:",
          error.message,
        );
      }
    });

    child.on("error", (error) => {
      settle(() => {
        console.error("Unable to start Python Apriori runner:", error.message);
        reject(new HttpError(500, ERROR_MESSAGE));
      });
    });

    child.on("close", (code) => {
      settle(() => {
        if (code !== 0) {
          if (stderr.trim()) {
            console.error("Python Apriori runner failed:", stderr.trim());
          }

          reject(new HttpError(500, ERROR_MESSAGE));
          return;
        }

        try {
          resolveResult(validateAprioriResult(JSON.parse(stdout)));
        } catch (error) {
          if (stderr.trim()) {
            console.error("Python Apriori runner stderr:", stderr.trim());
          }

          console.error("Invalid Python Apriori JSON output:", error.message);
          reject(new HttpError(500, ERROR_MESSAGE));
        }
      });
    });

    child.stdin.end(JSON.stringify(payload));
  });
}
