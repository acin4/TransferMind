import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { HttpError } from "./http.js";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = resolve(CURRENT_DIR, "../python/agglomerative_runner.py");
const PYTHON_BIN = process.env.TRANSFERMIND_PYTHON_BIN;
const DEFAULT_TIMEOUT_MS = 15000;
const ERROR_MESSAGE = "Unable to complete Agglomerative clustering.";

function getPythonCommands() {
  if (PYTHON_BIN) {
    return [{ command: PYTHON_BIN, args: [RUNNER_PATH] }];
  }

  if (process.platform === "win32") {
    return [
      { command: "python", args: [RUNNER_PATH] },
      { command: "py", args: ["-3", RUNNER_PATH] },
      { command: "python3", args: [RUNNER_PATH] },
    ];
  }

  return [
    { command: "python3", args: [RUNNER_PATH] },
    { command: "python", args: [RUNNER_PATH] },
  ];
}

function validateAgglomerativeResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Agglomerative runner output must be an object.");
  }

  if (!Array.isArray(result.assignments)) {
    throw new Error("Agglomerative runner output assignments must be an array.");
  }

  if (!result.assignments.every((assignment) => Number.isInteger(assignment))) {
    throw new Error("Agglomerative runner assignments must be integers.");
  }

  const hasDendrogramSvg =
    typeof result.dendrogramSvg === "string" && result.dendrogramSvg.trim();
  const hasDendrogramImage =
    typeof result.dendrogramImage === "string" && result.dendrogramImage.trim();

  if (!hasDendrogramSvg && !hasDendrogramImage) {
    throw new Error(
      "Agglomerative runner output must include dendrogramSvg or dendrogramImage.",
    );
  }

  if (
    result.linkageMatrix !== undefined &&
    result.linkageMatrix !== null &&
    !Array.isArray(result.linkageMatrix)
  ) {
    throw new Error("Agglomerative runner linkageMatrix must be an array.");
  }

  if (
    result.warnings !== undefined &&
    result.warnings !== null &&
    !Array.isArray(result.warnings)
  ) {
    throw new Error("Agglomerative runner output warnings must be an array.");
  }

  return {
    assignments: result.assignments,
    dendrogramSvg: hasDendrogramSvg ? result.dendrogramSvg : undefined,
    dendrogramImage: hasDendrogramImage ? result.dendrogramImage : undefined,
    linkageMatrix: result.linkageMatrix,
    warnings: result.warnings ?? [],
  };
}

export function runPythonAgglomerative(payload, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pythonCommands = getPythonCommands();

  const runWithCommand = (commandIndex) =>
    new Promise((resolveResult, reject) => {
      const pythonCommand = pythonCommands[commandIndex];
      let child;
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

      try {
        child = spawn(pythonCommand.command, pythonCommand.args, {
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (error) {
        const hasFallback = commandIndex < pythonCommands.length - 1;

        console.error(
          "Unable to start Python Agglomerative runner:",
          pythonCommand.command,
          error.message,
        );

        if (hasFallback) {
          runWithCommand(commandIndex + 1).then(resolveResult, reject);
          return;
        }

        reject(new HttpError(500, ERROR_MESSAGE));
        return;
      }

      timeout = setTimeout(() => {
        child.kill("SIGKILL");
        settle(() => {
          reject(new HttpError(500, ERROR_MESSAGE));
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
            "Unable to write to Python Agglomerative runner:",
            error.message,
          );
        }
      });

      child.on("error", (error) => {
        settle(() => {
          const hasFallback = commandIndex < pythonCommands.length - 1;

          console.error(
            "Unable to start Python Agglomerative runner:",
            pythonCommand.command,
            error.message,
          );

          if (hasFallback) {
            runWithCommand(commandIndex + 1).then(resolveResult, reject);
            return;
          }

          reject(new HttpError(500, ERROR_MESSAGE));
        });
      });

      child.on("close", (code) => {
        settle(() => {
          if (code !== 0) {
            if (stderr.trim()) {
              console.error(
                "Python Agglomerative runner failed:",
                stderr.trim(),
              );
            }

            reject(new HttpError(500, ERROR_MESSAGE));
            return;
          }

          try {
            if (stderr.trim()) {
              console.debug(
                "Python Agglomerative runner debug:",
                stderr.trim(),
              );
            }

            resolveResult(validateAgglomerativeResult(JSON.parse(stdout)));
          } catch (error) {
            if (stderr.trim()) {
              console.error(
                "Python Agglomerative runner stderr:",
                stderr.trim(),
              );
            }

            console.error(
              "Invalid Python Agglomerative JSON output:",
              error.message,
            );
            reject(new HttpError(500, ERROR_MESSAGE));
          }
        });
      });

      child.stdin.end(JSON.stringify(payload));
    });

  return runWithCommand(0);
}
