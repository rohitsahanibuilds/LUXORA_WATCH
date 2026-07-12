/* =========================================================
   LUXORA — Supabase configuration
   Connected to: https://waolhycpotenkzxgbzqg.supabase.co
   ========================================================= */

const SUPABASE_URL = "https://waolhycpotenkzxgbzqg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_molQ0vYMbxY7RFIZNrAHyw_z0T0zPo0";

// Create Supabase client if library is loaded
let sb;
try {
  if (typeof supabase !== "undefined") {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase connected successfully");
  } else {
    console.warn("⚠️ Supabase library not loaded. Running in demo mode.");
    sb = null;
  }
} catch (e) {
  console.warn("⚠️ Supabase init failed:", e.message);
  sb = null;
}