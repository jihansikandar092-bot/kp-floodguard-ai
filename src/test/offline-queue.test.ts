import { describe, expect, it, vi } from "vitest";
import {
  enqueueRequest,
  flushQueue,
  readQueue,
  type QueuedRequest,
} from "@/lib/offline/request-queue";
import { swRefused } from "@/lib/pwa/register-sw";

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
  key() {
    return null;
  }
  get length() {
    return this.m.size;
  }
}
const item = (id: string): QueuedRequest => ({
  clientRequestId: id,
  queuedAt: "2026-11-15T12:00:00Z",
  payload: {
    clientRequestId: id,
    fullName: "x",
    phone: "x",
    district: "x",
    tehsil: "x",
    location: "x",
    type: "rescue",
    peopleAffected: 1,
    description: "",
    language: "en",
    isTest: false,
  } as QueuedRequest["payload"],
});

describe("offline emergency queue", () => {
  it("stores the same request only once", () => {
    const s = new MemStorage() as unknown as Storage;
    enqueueRequest(item("a"), s);
    enqueueRequest(item("a"), s);
    expect(readQueue(s)).toHaveLength(1);
  });
  it("keeps the request while the network is down", async () => {
    const s = new MemStorage() as unknown as Storage;
    enqueueRequest(item("a"), s);
    const out = await flushQueue(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")), s);
    expect(out.remaining).toBe(1);
  });
  it("sends once and removes it, even when flush runs twice at the same time", async () => {
    const s = new MemStorage() as unknown as Storage;
    enqueueRequest(item("a"), s);
    const send = vi.fn().mockResolvedValue({ ok: true, code: "KPF-2026-0009", createdAt: "t" });
    const [a, b] = await Promise.all([flushQueue(send, s), flushQueue(send, s)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(readQueue(s)).toHaveLength(0);
  });
  it("keeps the request when the hourly limit is hit", async () => {
    const s = new MemStorage() as unknown as Storage;
    enqueueRequest(item("a"), s);
    const out = await flushQueue(
      vi.fn().mockResolvedValue({ ok: false, error: "rate_limited", message: "m" }),
      s,
    );
    expect(out.remaining).toBe(1);
  });
});

describe("service worker guard", () => {
  it("never registers on preview hosts or in dev", () => {
    expect(swRefused("id-preview--df38ae9f.lovable.app", "", false, true)).toBe(true);
    expect(swRefused("kp-floodguard-ai.lovable.app", "", false, false)).toBe(true);
    expect(swRefused("kp-floodguard-ai.lovable.app", "?sw=off", false, true)).toBe(true);
  });
  it("registers on the published site", () => {
    expect(swRefused("kp-floodguard-ai.lovable.app", "", false, true)).toBe(false);
  });
});
