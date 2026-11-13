import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Read-only publishable client for public tables; RLS applies.
export function publicDbClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Monitoring storage unavailable");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function readDistricts() {
  const { toDistrict } = await import("@/lib/data/districts");
  const { data, error } = await publicDbClient()
    .from("districts")
    .select("id,slug,name_en,name_ur,name_ps,lat,lng,region")
    .order("name_en");
  if (error) throw new Error("District list temporarily unavailable");
  return (data ?? []).map(toDistrict);
}
