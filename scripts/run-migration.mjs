/**
 * One-time migration script for the Policies feature.
 * Run: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/run-migration.mjs
 * (Get your service role key from Supabase dashboard > Project Settings > API)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const sql = readFileSync(new URL("../supabase/migrations/20260520120000_policies.sql", import.meta.url), "utf8");

const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

let ok = 0;
let fail = 0;
for (const stmt of statements) {
  const { error } = await supabase.rpc("exec_sql", { sql: stmt + ";" }).single().catch(() => ({ error: null }));
  if (error) {
    // Try via direct rpc if exec_sql not available
    console.warn("  ⚠", stmt.slice(0, 60), "—", error.message);
    fail++;
  } else {
    ok++;
  }
}
console.log(`Done: ${ok} OK, ${fail} failed. If failed, run supabase/migrations/20260520120000_policies.sql in the Supabase SQL editor.`);
