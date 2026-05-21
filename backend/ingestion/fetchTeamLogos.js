import { client } from "../lib/client.js";
import { supabase } from "../lib/supabaseClient.js";
import { fileURLToPath } from "url";

const BUCKET_NAME = "team-logos";
const PAGE_SIZE = 1000;
const THROTTLE_MS = 300;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getTeamsWithoutLogo() {
  const teams = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("teams")
      .select("api_id, name")
      .not("api_id", "is", null)
      .is("logo_url", null)
      .order("api_id", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    teams.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return teams;
}

async function fetchLogoBuffer(teamId) {
  const response = await client.get("/teams/get-logo", {
    params: { teamId },
    responseType: "arraybuffer",
  });

  return Buffer.from(response.data);
}

async function uploadLogo(teamId, buffer) {
  const path = `${teamId}.png`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

  return data.publicUrl;
}

async function updateTeamLogo(teamId, url) {
  const { error } = await supabase
    .from("teams")
    .update({ logo_url: url })
    .eq("api_id", teamId);

  if (error) {
    throw error;
  }
}

export async function runFetchTeamLogos() {
  const teams = await getTeamsWithoutLogo();
  const failures = [];
  const summary = {
    targets: teams.length,
    upserted: 0,
    skipped: 0,
    failed: 0,
    notFoundSkipped: 0,
  };

  console.log(`Found ${teams.length} teams without logos.`);

  for (const team of teams) {
    const teamId = team.api_id;

    try {
      console.log(`Fetching logo for ${team.name ?? "Unknown"} (${teamId})...`);

      const buffer = await fetchLogoBuffer(teamId);
      const publicUrl = await uploadLogo(teamId, buffer);
      await updateTeamLogo(teamId, publicUrl);

      console.log(`Saved logo for ${team.name ?? "Unknown"} (${teamId}).`);
      summary.upserted += 1;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(
          `No logo available for ${team.name ?? "Unknown"} (${teamId}).`,
        );
        summary.skipped += 1;
        summary.notFoundSkipped += 1;
        await delay(THROTTLE_MS);
        continue;
      }

      failures.push({ teamId, error });
      summary.failed += 1;
      console.error(
        `Failed logo import for ${team.name ?? "Unknown"} (${teamId}):`,
        error.message,
      );
    }

    await delay(THROTTLE_MS);
  }

  if (failures.length > 0) {
    const error = new Error(
      `Team logo sync failed for ${failures.length} team(s).`,
    );
    error.summary = summary;
    throw error;
  }

  console.log("Done.");
  return summary;
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  try {
    await runFetchTeamLogos();
  } catch (error) {
    console.error("Fatal error:", error.message);
    process.exitCode = 1;
  }
}
