import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const N8N_CHAT_URL =
  "https://najiyawazir.app.n8n.cloud/webhook/811faed4-007c-4cac-a579-4881b0135999/chat";

const Body = z.object({
  sessionId: z.string().min(1).max(100),
  chatInput: z.string().trim().min(1).max(2000),
});

function extractReply(data: unknown): string | undefined {
  const item = Array.isArray(data) ? data[0] : data;
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    for (const k of ["output", "text", "response", "message"]) {
      if (typeof o[k] === "string" && (o[k] as string).trim()) return o[k] as string;
    }
  }
  return undefined;
}

export const Route = createFileRoute("/api/public/n8n-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });
        try {
          const res = await fetch(N8N_CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sendMessage", ...parsed.data }),
          });
          const raw = await res.text();
          if (!res.ok) {
            console.error(`n8n chat failed [${res.status}]: ${raw}`);
            return Response.json(
              { error: res.status === 404 ? "workflow_inactive" : "upstream_error" },
              { status: 502 },
            );
          }
          let data: unknown = raw;
          try {
            data = JSON.parse(raw);
          } catch {
            /* plain text reply */
          }
          const reply = extractReply(data);
          if (!reply) return Response.json({ error: "empty_reply" }, { status: 502 });
          return Response.json({ reply });
        } catch (e) {
          console.error("n8n chat network error", e);
          return Response.json({ error: "network_error" }, { status: 502 });
        }
      },
    },
  },
});
