import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, afterEach, describe, expect, it } from "vitest";

// Isolated PostgreSQL only: fixtures never enter the app's database or UI.
let db: PGlite;
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.districts(id text PRIMARY KEY, name_en text NOT NULL);
    CREATE TABLE public.risk_assessments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), district_id text, level text, reason_text text, computed_at timestamptz);
    INSERT INTO public.districts VALUES ('test-district', 'Test district');
  `);
  await db.exec(readFileSync("drizzle/migrations/0007_system_risk_alerts.sql", "utf8"));
}, 20000);
afterEach(async () => { await db.close(); });

async function assessment(level: string, minute: number) {
  await db.query("INSERT INTO public.risk_assessments(district_id,level,reason_text,computed_at) VALUES ('test-district',$1,'Isolated test reason',$2)", [level, `2026-11-15T09:${String(minute).padStart(2, "0")}:00Z`]);
}
async function alerts() {
  return (await db.query<{ level: string; resolved_at: Date | null; source: string }>("SELECT level,resolved_at,source FROM public.alerts ORDER BY created_at")).rows;
}

describe("database system alert rules", () => {
  it("creates one Medium alert when risk rises from Low", async () => {
    await assessment("low", 0); await assessment("medium", 1);
    expect(await alerts()).toEqual([{ level: "medium", resolved_at: null, source: "system" }]);
  });
  it("does not duplicate an active alert on repeated Medium assessments", async () => {
    await assessment("medium", 0); await assessment("medium", 1);
    expect(await alerts()).toHaveLength(1);
  });
  it("replaces Medium with one active High alert on escalation", async () => {
    await assessment("medium", 0); await assessment("high", 1); await assessment("high", 2);
    const rows = await alerts();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.resolved_at?.toISOString()).toBe("2026-11-15T09:01:00.000Z");
    expect(rows.filter((r) => !r.resolved_at).map((r) => r.level)).toEqual(["high"]);
  });
  it("resolves the active alert when risk returns to Low", async () => {
    await assessment("high", 0); await assessment("low", 1);
    expect((await alerts())[0]?.resolved_at?.toISOString()).toBe("2026-11-15T09:01:00.000Z");
  });
  it("allows a new alert after resolution", async () => {
    await assessment("medium", 0); await assessment("low", 1); await assessment("medium", 2);
    expect(await alerts()).toHaveLength(2);
    expect((await alerts()).filter((r) => !r.resolved_at)).toHaveLength(1);
  });
  it("allows public reads but denies public writes", async () => {
    await assessment("medium", 0);
    await db.exec("SET ROLE anon");
    expect(await alerts()).toHaveLength(1);
    await expect(db.query("UPDATE public.alerts SET resolved_at = now()")).rejects.toThrow(/permission denied/);
    await expect(db.query("INSERT INTO public.alerts DEFAULT VALUES")).rejects.toThrow(/permission denied/);
  });
  it("does not create alerts for Low or historical out-of-order assessments", async () => {
    await assessment("low", 2); await assessment("medium", 1);
    expect(await alerts()).toHaveLength(0);
  });
});