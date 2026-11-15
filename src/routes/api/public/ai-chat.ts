import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleChatRequest } = await import("@/lib/assistant/chat.server");
        return handleChatRequest(request);
      },
    },
  },
});
