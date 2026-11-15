import { describe, it, expect, vi, afterEach } from "vitest";
const records = vi.hoisted(() => ({
  health: vi.fn(async () => undefined),
  limit: vi.fn(async () => ({ data: true, error: null })),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: records.limit } }));
vi.mock("@/lib/api/service-health.server", () => ({ recordServiceHealth: records.health }));
vi.mock("@/lib/risk/assessments.server", () => ({ readLatestAssessments: async () => [] }));
vi.mock("@/lib/api/public-db.server", () => ({
  readDistricts: async () => [{ id: "swat", name: "Swat" }],
}));
vi.mock("@/lib/alerts/alerts.server", () => ({
  readAlerts: async () => ({ active: [], expected: [] }),
}));
import { handleChatRequest } from "@/lib/assistant/chat.server";
const request = (language = "en") =>
  new Request("https://app.example/api/public/n8n-chat", {
    method: "POST",
    body: JSON.stringify({
      sessionId: "e50e6598-b557-4729-b34b-2b6424e16a35",
      chatInput: "Swat risk?",
      language,
    }),
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  records.limit.mockResolvedValue({ data: true, error: null });
});
describe("chat proxy recovery", () => {
  it("wrong configured URL returns a safe fallback; restored configuration works", async () => {
    const fetcher = vi.fn(async (url: URL) =>
      url.pathname === "/wrong"
        ? new Response("private failure", { status: 404 })
        : Response.json({ output: "reply" }),
    );
    vi.stubGlobal("fetch", fetcher);
    const wrong = await handleChatRequest(request(), "https://workflow.example/wrong");
    expect(wrong.status).toBe(503);
    expect(await wrong.json()).toMatchObject({ fallback: true, mode: "intake" });
    const restored = await handleChatRequest(request(), "https://workflow.example/chat");
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ reply: "reply", fallback: false });
  });
  it("aborts provider calls at 20 seconds and falls back", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let started = false;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init: RequestInit) => {
        started = true;
        return new Promise((_resolve, reject) =>
          init.signal?.addEventListener("abort", () => reject(new Error("internal timeout"))),
        );
      }),
    );
    const promise = handleChatRequest(request("ps"), "https://workflow.example/chat");
    while (!started) await new Promise((resolve) => setImmediate(resolve));
    await vi.advanceTimersByTimeAsync(20000);
    const response = await promise;
    expect(response.status).toBe(503);
    expect((await response.json()).reply).not.toContain("internal timeout");
  });
});
