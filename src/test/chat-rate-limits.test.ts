// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, it, expect } from "vitest";

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
  await db.exec(readFileSync("drizzle/migrations/0011_chat_rate_limits.sql", "utf8"));
}, 20000);
beforeEach(async () => {
  await db.exec("RESET ROLE; DELETE FROM public.rate_limits;");
});
afterAll(async () => {
  await db?.close();
});
const hash = "a".repeat(64);
describe("atomic chat rate limits", () => {
  it("allows 15 requests per minute and rejects the 16th", async () => {
    for (let n = 0; n < 15; n++)
      expect(
        (await db.query<{ ok: boolean }>("select public.consume_chat_limit($1) ok", [hash])).rows[0]
          ?.ok,
      ).toBe(true);
    expect(
      (await db.query<{ ok: boolean }>("select public.consume_chat_limit($1) ok", [hash])).rows[0]
        ?.ok,
    ).toBe(false);
  });
  it("allows 100 per hour and rejects the 101st", async () => {
    await db.exec(
      `insert into public.rate_limits(ip_hash,created_at) select '${hash}',now()-interval '2 minutes' from generate_series(1,99);`,
    );
    expect(
      (await db.query<{ ok: boolean }>("select public.consume_chat_limit($1) ok", [hash])).rows[0]
        ?.ok,
    ).toBe(true);
    expect(
      (await db.query<{ ok: boolean }>("select public.consume_chat_limit($1) ok", [hash])).rows[0]
        ?.ok,
    ).toBe(false);
  });
  it("does not let public callers read or bypass limits", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from public.rate_limits")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.consume_chat_limit($1)", [hash])).rejects.toThrow(
      /permission denied/,
    );
  });
});
