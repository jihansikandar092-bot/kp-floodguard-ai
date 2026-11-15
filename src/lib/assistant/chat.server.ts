import { generateResponse } from "@lovable.dev/ai-gateway";
import { readLatestAssessments } from "@/lib/risk/assessments.server";
import { readDistricts } from "@/lib/api/public-db.server";
import { readAlerts } from "@/lib/alerts/alerts.server";
import { compactChatContext } from "./context";
import { chatBody, chatFallback, chatLimitReply } from "./chat";
import { recordServiceHealth } from "@/lib/api/service-health.server";

const SYSTEM_PROMPT = `You are the KP FloodGuard AI assistant for Khyber Pakhtunkhwa, Pakistan. Answer in the language given in the language field (en, ur or ps), in short and simple sentences. Use ONLY the context for current flood conditions; if it does not contain the answer, say you do not have that information. Never claim that rescue has been sent. In any life-threatening situation tell the person to call Rescue 1122 immediately and offer to record an emergency request. Say that risk levels are experimental estimates and not official warnings. Never invent weather, river levels or alerts, You are FloodGuard AI for Khyber Pakhtunkhwa.
Your name is Jiya.
Rules:
- Reply in maximum 2 to 3 short sentences.
- Ask only ONE question at a time, never a long list.
- Use simple language, no bullet lists unless asked.
- Reply in the user's language (English, Urdu, Roman Urdu or Pashto).
- If there is danger, first say: "Call Rescue 1122 now."
- For emergencies, collect details step by step: help type, then location, then number of people, then name and phone..`;

/** Pulls the assistant text out of a Responses API result. */
function extractText(response: unknown): string | undefined {
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return undefined;
  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const p = part as { type?: string; text?: string };
      if (p.type === "output_text" && typeof p.text === "string" && p.text.trim()) {
        parts.push(p.text);
      }
    }
  }
  const text = parts.join("\n").trim();
  return text || undefined;
}

export async function handleChatRequest(request: Request) {
  const parsed = chatBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });
  const { language } = parsed.data;
  const fallback = async (message: string) => {
    await recordServiceHealth("AI chat", false, message).catch(() => console.error("Chat health record unavailable"));
    return Response.json({ reply: chatFallback[language], fallback: true, mode: "intake" }, { status: 503 });
  };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`kpfg-chat:${ip}`));
    const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const { data: allowed, error } = await supabaseAdmin.rpc("consume_chat_limit", {
      _ip_hash: hash,
    });
    if (error) return fallback("Chat request limit check unavailable");
    if (!allowed)
      return Response.json(
        { reply: chatLimitReply[language], error: "rate_limited", fallback: false },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const [risks, districts, alerts] = await Promise.all([readLatestAssessments(), readDistricts(), readAlerts()]);
    const context = compactChatContext(risks, districts, [...alerts.active, ...alerts.expected], language);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      // No tools: the model can only answer from the supplied context. It cannot
      // write to the database, send emails or create emergency requests.
      const response = await generateResponse(
        {
          model: "openai/gpt-6-astra",
          instructions: SYSTEM_PROMPT,
          input: [
            {
              role: "user",
              content: `language: ${language}\n<context>${JSON.stringify(context)}</context>\nUser message: ${parsed.data.chatInput}`,
            },
          ],
        },
        { signal: controller.signal },
      );
      const reply = extractText(response);
      if (!reply) return fallback("AI chat returned no reply");
      await recordServiceHealth("AI chat", true).catch(() => console.error("Chat health record unavailable"));
      return Response.json({
        reply,
        fallback: false,
        dataTime: context.data_time,
        source: context.source,
        disclaimer: context.disclaimer,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn("AI chat unavailable or timed out", error);
    return fallback("AI chat request failed or timed out");
  }
}
