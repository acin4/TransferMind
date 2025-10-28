// api/client.js

// === Imports ===
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// === Load environment variables ===

// Compute the path to the root-level .env file (one directory above this file)
const envPath = path.join(__dirname, "..", ".env");

// Log debug info: show the resolved .env path and whether it exists
console.log("ENV PATH:", envPath, "exists:", fs.existsSync(envPath));

// Load .env file into process.env (with debug mode enabled)
require("dotenv").config({ path: envPath, debug: true });

// Load again (redundant but ensures coverage in some setups — can be removed if unnecessary)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// === Read environment variables ===
const { API_BASE, RAPIDAPI_KEY, RAPIDAPI_HOST } = process.env;

// Check if all required environment variables are defined
if (!API_BASE || !RAPIDAPI_KEY || !RAPIDAPI_HOST) {
  console.error(
    "❌ Missing env vars. Expected in .env:\n" +
      "API_BASE=https://sofascore.p.rapidapi.com\n" +
      "RAPIDAPI_KEY=YOUR_KEY\n" +
      "RAPIDAPI_HOST=sofascore.p.rapidapi.com"
  );
  // Exit the process if any variable is missing
  process.exit(1);
}

// === Create a preconfigured Axios instance ===
const client = axios.create({
  baseURL: API_BASE, // base URL for all API calls
  timeout: 20000, // 20s timeout for each request
  headers: {
    "X-RapidAPI-Key": RAPIDAPI_KEY, // your RapidAPI authentication key
    "X-RapidAPI-Host": RAPIDAPI_HOST, // the host header required by RapidAPI
    Accept: "application/json", // expect JSON responses
  },
});

// === Add a response interceptor for automatic retries ===
client.interceptors.response.use(
  // On success, just return the response as-is
  (res) => res,

  // On error, handle retry logic for certain HTTP codes
  async (error) => {
    const cfg = error.config || {}; // original request config
    const status = error.response?.status; // HTTP status code
    const shouldRetry = [429, 500, 502, 503, 504].includes(status); // retryable codes

    // Initialize retry counter if not already set
    cfg.__retryCount = cfg.__retryCount || 0;

    // If error is retryable and we haven’t exceeded 3 attempts
    if (shouldRetry && cfg.__retryCount < 3) {
      cfg.__retryCount += 1;

      // Use Retry-After header if present, else exponential backoff:
      // 500ms, 1000ms, 2000ms, etc.
      const retryAfterHeader = error.response?.headers?.["retry-after"];
      const waitMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : 500 * Math.pow(2, cfg.__retryCount - 1);

      // Wait the calculated delay before retrying
      await new Promise((r) => setTimeout(r, waitMs));

      // Retry the request using the same Axios instance
      return client(cfg);
    }

    // If not retryable or max retries reached, propagate the error
    return Promise.reject(error);
  }
);

// === Export the configured Axios client ===
module.exports = { client };
