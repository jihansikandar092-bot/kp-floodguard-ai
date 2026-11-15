// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, it, expect } from "vitest";

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.waitReady;
}, 20000);
afterAll(async () => {
  await db?.close();
});

describe("historical import database safety", () => {
  it("claims exclusively, respects spacing and 429 pause, skips complete districts, and denies public writes", async () => {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
        CREATE TABLE public.districts(id text primary key);
        INSERT INTO public.districts VALUES('swat'),('bannu');
        CREATE TABLE public.historical_stats(id uuid default gen_random_uuid(),district_id text,year integer,annual_max_discharge double precision,source text);
        GRANT SELECT ON public.districts TO anon,authenticated;
      `);
    await db.exec(readFileSync("drizzle/migrations/0010_historical_collection.sql", "utf8"));
    expect(
      (
        await db.query<{ district_id: string }>(
          "select * from public.claim_historical_district(2010)",
        )
      ).rows[0]?.district_id,
    ).toBe("swat");
    expect(
      (await db.query("select * from public.claim_historical_district(2010)")).rows,
    ).toHaveLength(0);
    await db.exec(
      "update public.historical_job_progress set lease_until=null,next_request_at=now()+interval '3 seconds' where district_id='swat'",
    );
    expect(
      (await db.query("select * from public.claim_historical_district(2010)")).rows,
    ).toHaveLength(0);
    await db.exec(
      "update public.historical_job_progress set status='paused',next_request_at=now()+interval '1 hour' where district_id='swat'",
    );
    expect(
      (await db.query("select * from public.claim_historical_district(2010)")).rows,
    ).toHaveLength(0);
    await db.exec(
      "update public.historical_job_progress set next_request_at=now()-interval '1 second' where district_id='swat'",
    );
    expect(
      (
        await db.query<{ district_id: string }>(
          "select * from public.claim_historical_district(2010)",
        )
      ).rows[0]?.district_id,
    ).toBe("swat");
    await db.exec(
      "insert into public.historical_stats(district_id,year,annual_max_discharge,max_discharge_m3s,max_rain_1d_mm,max_rain_3d_mm,total_rain_mm) values('swat',2010,2,2,1,3,365); update public.historical_job_progress set lease_until=null;",
    );
    expect(
      (
        await db.query<{ district_id: string }>(
          "select * from public.claim_historical_district(2010)",
        )
      ).rows[0]?.district_id,
    ).toBe("bannu");
    await db.exec("set role anon");
    expect((await db.query("select * from public.historical_job_progress")).rows).toHaveLength(2);
    await expect(
      db.exec("update public.historical_job_progress set status='complete'"),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.claim_historical_district(2010)")).rejects.toThrow(
      /permission denied/,
    );
  });
});
