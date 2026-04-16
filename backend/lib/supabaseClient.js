import { createClient } from "@supabase/supabase-js";
import "./env.js";
import { getRequiredEnv } from "./env.js";

const supabaseUrl = getRequiredEnv("SUPABASE_URL");
const supabaseKey = getRequiredEnv("SUPABASE_SERVICE_KEY");

export const supabase = createClient(supabaseUrl, supabaseKey);
