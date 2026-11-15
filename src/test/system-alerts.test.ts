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
    CREATE TABLE public.risk_assessments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), district_id text, level text, reason_text text, factors jsonb NOT NULL DEFAULT '{}', computed_at timestamptz);
    INSERT INTO public.districts VALUES ('test-district', 'Test district');
  `);
  await db.exec(readFileSync("drizzle/migrations/0007_system_risk_alerts.sql", "utf8"));
  await db.exec(readFileSync("drizzle/migrations/0008_predictive_risk_outlook.sql", "utf8"));
  await db.exec(readFileSync("drizzle/migrations/0009_partial_score_alert_safety.sql", "utf8"));
}, 20000);
afterEach(async () => {
  await db.close();
});

async function assessment(
  level: string,
  minute: number,
  nowLevel = level,
  staleHours = 0,
  partialHorizon: number | null = null,
) {
  const stamp = new Date(Date.now() - 60000 * (20 - minute) - staleHours * 3600000).toISOString();
  for (const h of [0, 24, 48, 72, 168])
    await db.query(
      "INSERT INTO public.risk_assessments(district_id,level,reason_text,computed_at,horizon_hours,snapshot_at,factors,reason_templates) VALUES('test-district',$1,'Isolated test reason',$2,$3,$2,$4,$5)",
      [
        h === 0 ? nowLevel : level,
        stamp,
        h,
        JSON.stringify({
          forecastRain72h: { score: h === partialHorizon ? null : 0 },
          pastRain3d: { score: 0 },
          dischargePeak: { score: 0 },
          dischargeTrend: { score: 0 },
        }),
        JSON.stringify({ en: "Isolated test reason", ur: "ازمایشی وجہ", ps: "ازمویښتي دلیل" }),
      ],
    );
  return db.query("SELECT public.sync_predictive_alert('test-district',$1,72,3,2)", [stamp]);
}
async function alerts() {
  return (
    await db.query<{
      id: string;
      level: string;
      resolved_at: Date | null;
      source: string;
      type: string;
      escalated_at: Date | null;
    }>(
      "SELECT id,level,resolved_at,source,type,escalated_at FROM public.alerts ORDER BY created_at",
    )
  ).rows;
}

describe("database system alert rules", () => {
  it("creates one Medium alert when risk rises from Low", async () => {
    await assessment("low", 0);
    await assessment("medium", 1);
    expect(await alerts()).toHaveLength(1);
    expect((await alerts())[0]).toMatchObject({
      level: "medium",
      type: "active",
      resolved_at: null,
      source: "system",
    });
  });
  it("does not duplicate an active alert on repeated Medium assessments", async () => {
    await assessment("medium", 0);
    await assessment("medium", 1);
    expect(await alerts()).toHaveLength(1);
  });
  it("updates the same Medium alert to High and records escalation", async () => {
    await assessment("medium", 0);
    const id = (await alerts())[0]?.id;
    await assessment("high", 1);
    await assessment("high", 2);
    const rows = await alerts();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(id);
    expect(rows[0]?.escalated_at).not.toBeNull();
    expect(rows.filter((r) => !r.resolved_at).map((r) => r.level)).toEqual(["high"]);
  });
  it("resolves only after two consecutive fresh Low runs", async () => {
    await assessment("high", 0);
    await assessment("low", 1);
    expect((await alerts())[0]?.resolved_at).toBeNull();
    await assessment("low", 2);
    expect((await alerts())[0]?.resolved_at).not.toBeNull();
  });
  it("partial Low batches never resolve an alert or count toward resolution", async () => {
    await assessment("high", 0);
    await assessment("low", 1);
    await assessment("low", 2, "low", 0, 0);
    await assessment("low", 3, "low", 0, 168);
    expect((await alerts())[0]?.resolved_at).toBeNull();
    const state = await db.query<{ low_runs: number }>(
      "SELECT low_runs FROM public.alert_run_state",
    );
    expect(state.rows[0]?.low_runs).toBe(0);
    await assessment("low", 4);
    expect((await alerts())[0]?.resolved_at).toBeNull();
    await assessment("low", 5);
    expect((await alerts())[0]?.resolved_at).not.toBeNull();
  });
  it("alerts created from a partial assessment carry its translated safety notes", async () => {
    await assessment("medium", 0, "medium", 0, 0);
    const result = await db.query<{
      reason_text: string;
      reason_templates: Record<string, string>;
      available_factors: number;
    }>(
      "SELECT a.reason_text,a.reason_templates,r.available_factors FROM public.alerts a JOIN public.risk_assessments r ON r.id=a.risk_assessment_id",
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.available_factors).toBe(3);
    expect(result.rows[0]?.reason_text).toContain(
      "Partial: based on 3 of 4 factors. A missing factor may mean the real risk is higher.",
    );
    expect(result.rows[0]?.reason_templates["ur"]).toContain("4 میں سے 3");
    expect(result.rows[0]?.reason_templates["ps"]).toContain("پر 3 ولاړ");
  });
  it("allows a new alert after resolution", async () => {
    await assessment("medium", 0);
    await assessment("low", 1);
    await assessment("low", 2);
    await assessment("medium", 3);
    expect(await alerts()).toHaveLength(2);
    expect((await alerts()).filter((r) => !r.resolved_at)).toHaveLength(1);
  });
  it("allows public reads but denies public writes", async () => {
    await assessment("medium", 0);
    await db.exec("SET ROLE anon");
    expect(await alerts()).toHaveLength(1);
    await expect(db.query("UPDATE public.alerts SET resolved_at = now()")).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query("INSERT INTO public.alerts DEFAULT VALUES")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("does not create alerts for Low or historical out-of-order assessments", async () => {
    await assessment("low", 2);
    await assessment("medium", 1);
    expect(await alerts()).toHaveLength(0);
  });
  it("creates an expected alert when only a future horizon is Medium", async () => {
    await assessment("medium", 0, "low");
    expect((await alerts())[0]).toMatchObject({ level: "medium", type: "expected" });
  });
  it("quietly de-escalates the same alert", async () => {
    await assessment("high", 0);
    const id = (await alerts())[0]?.id;
    await assessment("medium", 1);
    expect((await alerts())[0]).toMatchObject({ id, level: "medium", escalated_at: null });
  });
  it("never creates alerts from a snapshot at least three hours old", async () => {
    await assessment("high", 0, "high", 3);
    expect(await alerts()).toHaveLength(0);
  });
});
