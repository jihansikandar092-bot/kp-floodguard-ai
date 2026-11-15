import { describe, it, expect, vi, afterEach } from "vitest";
const records = vi.hoisted(() => ({
  health: vi.fn(async () => undefined),
  limit: vi.fn(async () => ({ data: true, error: null })),
  generate: vi.fn(),
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
vi.mock("@lovable.dev/ai-gateway", () => ({ generateResponse: records.generate }));
import { handleChatRequest } from "@/lib/assistant/chat.server";
const request = (language = "en") =>
  new Request("https://app.example/api/public/ai-chat", {
    method: "POST",
    body: JSON.stringify({
      sessionId: "e50e6598-b557-4729-b34b-2b6424e16a35",
      chatInput: "Swat risk?",
      language,
    }),
  });
const aiReply = (text: string) => ({
  output: [{ type: "message", content: [{ type: "output_text", text }] }],
});
afterEach(() => {
  vi.useRealTimers();
  records.limit.mockResolvedValue({ data: true, error: null });
  records.generate.mockReset();
});
describe("AI chat proxy", () => {
  it("returns the model reply with context metadata", async () => {
    records.generate.mockResolvedValue(aiReply("Swat is Low right now."));
    const response = await handleChatRequest(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      reply: "Swat is Low right now.",
      fallback: false,
    });
    expect(records.health).toHaveBeenCalledWith("AI chat", true);
    const payload = records.generate.mock.calls[0][0];
    expect(payload.model).toBe("openai/gpt-6-astra");
    expect(payload.instructions).toContain("KP FloodGuard AI assistant");
    expect(payload.tools).toBeUndefined();
    expect(payload.input[0].content).toContain("language: en");
  });
  it("falls back to guided intake when the AI call fails", async () => {
    records.generate.mockRejectedValue(new Error("private failure"));
    const response = await handleChatRequest(request("ur"));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ fallback: true, mode: "intake" });
    expect(body.reply).not.toContain("private failure");
    expect(records.health).toHaveBeenCalledWith("AI chat", false, expect.any(String));
  });
  it("falls back when the model returns no text", async () => {
    records.generate.mockResolvedValue({ output: [] });
    const response = await handleChatRequest(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ fallback: true, mode: "intake" });
  });
  it("aborts the AI call at 20 seconds and falls back", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let started = false;
    records.generate.mockImplementation((_payload, options: { signal?: AbortSignal }) => {
      started = true;
      return new Promise((_resolve, reject) =>
        options.signal?.addEventListener("abort", () => reject(new Error("internal timeout"))),
      );
    });
    const promise = handleChatRequest(request("ps"));
    while (!started) await new Promise((resolve) => setImmediate(resolve));
    await vi.advanceTimersByTimeAsync(20000);
    const response = await promise;
    expect(response.status).toBe(503);
    expect((await response.json()).reply).not.toContain("internal timeout");
  });
  it("returns 429 when the chat limit is exhausted", async () => {
    records.limit.mockResolvedValue({ data: false, error: null });
    const response = await handleChatRequest(request());
    expect(response.status).toBe(429);
    expect(records.generate).not.toHaveBeenCalled();
  });
  it("rejects invalid input with 400", async () => {
    const bad = new Request("https://app.example/api/public/ai-chat", {
      method: "POST",
      body: JSON.stringify({ sessionId: "nope" }),
    });
    const response = await handleChatRequest(bad);
    expect(response.status).toBe(400);
    expect(records.generate).not.toHaveBeenCalled();
  });
});
