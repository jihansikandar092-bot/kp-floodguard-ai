import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/n8n-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleChatRequest } = await import("@/lib/assistant/chat.server");
        return handleChatRequest(request, process.env["N8N_WEBHOOK_URL"]);
      },
    },
  },
});
