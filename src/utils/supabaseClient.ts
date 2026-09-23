import { createClient } from "@supabase/supabase-js";

// Placeholder values allow `next build` to prerender public pages when env is unset
// (e.g. local/CI). Vercel production must still set the real NEXT_PUBLIC_* vars.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key-placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    // Do not exchange `?code=` during client init. The shared client is created
    // as soon as the layout loads, which races the one-time PKCE code and can
    // drop the verifier before `/auth/callback` observes a session. That page
    // calls `exchangeCodeForSession` itself. Verifier + session stay in
    // localStorage (where `signInWithOAuth` wrote them); a cookie adapter would miss them.
    detectSessionInUrl: false,
    persistSession: true,
  },
});
