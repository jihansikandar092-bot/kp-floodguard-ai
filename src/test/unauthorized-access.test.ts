import { describe, expect, it } from "vitest";

const url: string = process.env["VITE_SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"] ?? "";
const key: string = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";

async function anonRead(table: string) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=5`, { headers: { apikey: key } });
  const body = await res.json().catch(() => null);
  return Array.isArray(body) ? body.length : 0;
}

describe.skipIf(!url || !key)("anonymous visitors cannot read private data", () => {
  for (const t of ["emergency_requests", "request_events", "user_roles", "alert_subscriptions", "alert_deliveries", "monitoring_runs", "rate_limits"]) {
    it(`returns no rows from ${t}`, async () => {
      expect(await anonRead(t)).toBe(0);
    }, 20000);
  }
  it("cannot update a request status", async () => {
    const res = await fetch(`${url}/rest/v1/emergency_requests?status=eq.pending`, {
      method: "PATCH",
      headers: { apikey: key, "content-type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ status: "resolved" }),
    });
    const body = await res.json().catch(() => []);
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });
  it("cannot call the request trigger function directly", async () => {
    const res = await fetch(`${url}/rest/v1/rpc/emergency_requests_before_write`, {
      method: "POST", headers: { apikey: key, "content-type": "application/json" }, body: "{}",
    });
    expect(res.ok).toBe(false);
  });
});
