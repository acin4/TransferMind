// supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import "dotenv/config"; // if you use dotenv + ES modules

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // or SERVICE_ROLE_KEY on backend only

export const supabase = createClient(supabaseUrl, supabaseKey);
