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

// Βοηθητική για υπολογισμό ποσοστών (π.χ. 30/100 -> 30.00)
// Επιστρέφει null αν ο παρονομαστής είναι 0 ή null
export const calcPerc = (num, total) => {
  if (num == null || total == null) return null;
  if (total === 0) return null;
  if (num === 0) return 0;

  return parseFloat(((num / total) * 100).toFixed(2));
};
