import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Αυτό το check θα μας πει στην κονσόλα αν λείπουν τα κλειδιά
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("LACK OF ENV VARIABLES: Check your .env file!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

