import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { HttpError } from "./http.js";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = resolve(CURRENT_DIR, "../python/kmeans_runner.py");
const PYTHON_BIN = process.env.TRANSFERMIND_PYTHON_BIN ?? "python3";
const DEFAULT_TIMEOUT_MS = 15000;

export function runPythonKMeans(payload, options = {}) {
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
        reject(new HttpError(500, "Unable to complete K-Means clustering."));
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
        console.error("Unable to write to Python K-Means runner:", error.message);
      }
    });

    child.on("error", (error) => {
      settle(() => {
        console.error("Unable to start Python K-Means runner:", error.message);
        reject(new HttpError(500, "Unable to complete K-Means clustering."));
      });
    });

    child.on("close", (code) => {
      settle(() => {
        if (code !== 0) {
          if (stderr.trim()) {
            console.error("Python K-Means runner failed:", stderr.trim());
          }

          reject(new HttpError(500, "Unable to complete K-Means clustering."));
          return;
        }

        try {
          resolveResult(JSON.parse(stdout));
        } catch (error) {
          if (stderr.trim()) {
            console.error("Python K-Means runner stderr:", stderr.trim());
          }

          console.error("Invalid Python K-Means JSON output:", error.message);
          reject(new HttpError(500, "Unable to complete K-Means clustering."));
        }
      });
    });

    child.stdin.end(JSON.stringify(payload));
  });
}
