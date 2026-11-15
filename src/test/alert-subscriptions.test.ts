import { describe, expect, it } from "vitest";
import {
  alertMessage,
  decide,
  NOTIFY_CONFIG,
  subscribeSchema,
  verificationOutcome,
  type AlertRow,
  type DeliveryRow,
  type SubscriptionRow,
} from "@/lib/subscriptions/rules";

const NOW = Date.parse("2026-11-15T12:00:00Z");
const sub = (o: Partial<SubscriptionRow> = {}): SubscriptionRow => ({
  id: "s1",
  channel: "email",
  district_ids: ["bannu"],
  language: "en",
  min_level: "medium",
  verified_at: "2026-11-15T10:00:00Z",
  unsubscribed_at: null,
  ...o,
});
const alert = (o: Partial<AlertRow> = {}): AlertRow => ({
  id: "a1",
  district_id: "bannu",
  level: "medium",
  horizon_hours: 48,
  resolved_at: null,
  ...o,
});
const sent = (hoursAgo: number, o: Partial<DeliveryRow> = {}): DeliveryRow => ({
  subscription_id: "s1",
  district_id: "bannu",
  event_key: "old:medium",
  status: "sent",
  sent_at: new Date(NOW - hoursAgo * 3600_000).toISOString(),
  ...o,
});

describe("subscription validation", () => {
  const base = { districtIds: ["bannu"], language: "ur", minLevel: "high" };
  it("accepts a valid email subscription and lowercases the address", () => {
    const r = subscribeSchema.parse({ channel: "email", email: " Me@Example.COM ", ...base });
    expect(r.channel === "email" && r.email).toBe("me@example.com");
  });
  it("rejects a bad email, no districts, or an unknown language", () => {
    expect(subscribeSchema.safeParse({ channel: "email", email: "nope", ...base }).success).toBe(
      false,
    );
    expect(
      subscribeSchema.safeParse({ channel: "email", email: "a@b.co", ...base, districtIds: [] })
        .success,
    ).toBe(false);
    expect(
      subscribeSchema.safeParse({ channel: "email", email: "a@b.co", ...base, language: "fr" })
        .success,
    ).toBe(false);
  });
  it("rejects a non-https push endpoint", () => {
    const push = {
      endpoint: "http://x.example/p",
      keys: { p256dh: "x".repeat(40), auth: "y".repeat(16) },
    };
    expect(subscribeSchema.safeParse({ channel: "webpush", push, ...base }).success).toBe(false);
  });
});

describe("double opt-in", () => {
  it("activates a pending, unexpired subscription once", () => {
    const pending = {
      verified_at: null,
      verify_expires_at: "2026-11-16T12:00:00Z",
      unsubscribed_at: null,
    };
    expect(verificationOutcome(pending, NOW)).toBe("activate");
    expect(verificationOutcome({ ...pending, verified_at: "2026-11-15T11:00:00Z" }, NOW)).toBe(
      "already",
    );
  });
  it("refuses expired, unsubscribed or unknown links", () => {
    expect(
      verificationOutcome(
        { verified_at: null, verify_expires_at: "2026-11-14T00:00:00Z", unsubscribed_at: null },
        NOW,
      ),
    ).toBe("expired");
    expect(
      verificationOutcome(
        { verified_at: null, verify_expires_at: null, unsubscribed_at: "2026-11-15T00:00:00Z" },
        NOW,
      ),
    ).toBe("invalid");
    expect(verificationOutcome(null, NOW)).toBe("invalid");
  });
});

describe("matching rules", () => {
  it("unverified subscriptions never receive alerts", () => {
    expect(decide(sub({ verified_at: null }), alert(), [], NOW).action).toBe("none");
  });
  it("unsubscribed subscriptions never receive alerts", () => {
    expect(decide(sub({ unsubscribed_at: "2026-11-15T11:00:00Z" }), alert(), [], NOW).action).toBe(
      "none",
    );
  });
  it("matches only chosen districts and the minimum level", () => {
    expect(decide(sub(), alert(), [], NOW)).toEqual({ action: "send", attempt: 1 });
    expect(decide(sub(), alert({ district_id: "swat" }), [], NOW).action).toBe("none");
    expect(decide(sub({ min_level: "high" }), alert({ level: "medium" }), [], NOW).action).toBe(
      "none",
    );
    expect(decide(sub({ min_level: "high" }), alert({ level: "high" }), [], NOW).action).toBe(
      "send",
    );
  });
  it("sends an escalation as a new event but never repeats the same event", () => {
    const prior = sent(8, { event_key: "a1:medium" });
    expect(decide(sub(), alert(), [prior], NOW).action).toBe("none");
    expect(decide(sub(), alert({ level: "high" }), [prior], NOW).action).toBe("send");
  });
});

describe("6-hour cap and retry", () => {
  it("caps at one message per subscriber per district per 6 hours", () => {
    expect(NOTIFY_CONFIG.capHours).toBe(6);
    expect(decide(sub(), alert({ id: "a2" }), [sent(5)], NOW).action).toBe("skip-cap");
    expect(decide(sub(), alert({ id: "a2" }), [sent(7)], NOW).action).toBe("send");
    expect(decide(sub(), alert({ id: "a2", district_id: "tank" }), [sent(1)], NOW).action).toBe(
      "none",
    );
  });
  it("retries a failed delivery once, then gives up", () => {
    const fail = sent(1, { event_key: "a1:medium", status: "failed" });
    expect(decide(sub(), alert(), [fail], NOW)).toEqual({ action: "send", attempt: 2 });
    expect(decide(sub(), alert(), [fail, { ...fail }], NOW).action).toBe("none");
  });
});

describe("message template", () => {
  it("includes the required safety text and link", () => {
    const m = alertMessage("en", "Bannu", "high", 48, "https://x/alerts");
    expect(m).toBe(
      "Bannu: High flood risk expected within 48 hours. This is an experimental estimate based on modelled forecasts, not an official warning. Details: https://x/alerts. In an emergency call Rescue 1122. Follow PDMA and Pakistan Meteorological Department advisories.",
    );
    expect(alertMessage("ur", "بنوں", "high", 48, "L")).toContain("1122");
    expect(alertMessage("ps", "بنو", "high", 48, "L")).toContain("1122");
  });
});
