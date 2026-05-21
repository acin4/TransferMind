// Import the built-in Node.js modules for file system and path handling
import path from "path";
import fs from "fs";

/**
 * Saves a JavaScript object or array as a formatted JSON file.
 * Automatically creates directories if they don't exist.
 *
 * @param {string} filepath - The full path where the JSON file should be saved.
 * @param {Object|Array} data - The data to be written to the file.
 */
export function saveJSON(filepath, data) {
  // Get the directory path from the given file path
  const dir = path.dirname(filepath);

  // If the directory doesn't exist, create it (recursively for nested folders)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Write the data as formatted JSON (2-space indentation) to the file
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
  // Log a confirmation message with info about the saved file
  console.log(
    `Saved: ${filepath} (${Array.isArray(data) ? data.length : "object"})`,
  );
}

export function truncateStatNumber(value) {
  if (value == null || value === "") return null;

  const num = Number(value);
  if (Number.isNaN(num)) return null;

  return Math.trunc(num * 100) / 100;
}

export function truncateNumericStatFields(row, excludedKeys = []) {
  const excluded = new Set(excludedKeys);

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (excluded.has(key)) return [key, value];
      if (value == null || value === "") return [key, null];
      if (typeof value !== "number" && typeof value !== "string") {
        return [key, value];
      }

      const truncated = truncateStatNumber(value);
      return [key, truncated ?? value];
    }),
  );
}

// Βοηθητική για υπολογισμό ποσοστών (π.χ. 30/100 -> 30.00)
// Επιστρέφει null αν ο παρονομαστής είναι 0 ή null
export const calcPerc = (num, total) => {
  if (num == null || total == null) return null;
  if (total === 0) return null;
  if (num === 0) return 0;

  return truncateStatNumber((num / total) * 100);
};

function parseSeasonEndYear(seasonYear) {
  if (!seasonYear) return -1;
  const parts = String(seasonYear).split("/");
  if (parts.length !== 2) return -1;

  const endYY = Number(parts[1]);
  if (Number.isNaN(endYY)) return -1;

  // Handles "25/26" -> 2026
  return 2000 + endYY;
}

export function getCurrentSeasonFromList(seasons) {
  if (!Array.isArray(seasons) || seasons.length === 0) return null;

  let best = seasons[0];
  let bestEnd = parseSeasonEndYear(best.year);

  for (const s of seasons.slice(1)) {
    const end = parseSeasonEndYear(s.year);
    if (end > bestEnd) {
      best = s;
      bestEnd = end;
    }
  }

  return best;
}
