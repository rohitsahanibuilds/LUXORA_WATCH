/* =========================================================
   LUXORA — Supabase configuration
   Fill these in from your Supabase project dashboard:
   Project Settings → API → Project URL / anon public key.

   For demo without Supabase, the app falls back to localStorage.
   ========================================================= */

const SUPABASE_URL = "https://waolhycpotenkzxgbzqg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_molQ0vYMbxY7RFIZNrAHyw_z0T0zPo0";

// Create Supabase client if library is loaded
let sb;
try {
  if (typeof supabase !== "undefined") {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn("Supabase library not loaded. Running in demo mode with localStorage.");
    sb = null;
  }
} catch (e) {
  console.warn("Supabase init failed. Running in demo mode:", e.message);
  sb = null;
}
