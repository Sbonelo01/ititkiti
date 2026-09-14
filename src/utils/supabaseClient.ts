import { createClient } from "@supabase/supabase-js";

// Placeholder values allow `next build` to prerender public pages when env is unset
// (e.g. local/CI). Vercel production must still set the real NEXT_PUBLIC_* vars.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key-placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
  },
});
