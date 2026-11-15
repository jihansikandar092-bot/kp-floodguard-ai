import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { z } from "zod";

export const Route = createFileRoute("/api/public/jobs/collect-history")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const failure = await authenticateCronRequest(request);
        if (failure) return failure;
        if (
          !z
            .object({ kind: z.literal("history") })
            .strict()
            .safeParse(await request.json().catch(() => null)).success
        )
          return Response.json({ error: "Invalid schedule payload" }, { status: 400 });
        const { collectHistoricalBatch } = await import("@/lib/history/collection.server");
        const background = (request as Request & { waitUntil?: (work: Promise<unknown>) => void })
          .waitUntil;
        if (background) {
          background(collectHistoricalBatch().catch(() => console.error("Historical job failed")));
          return Response.json({ accepted: true }, { status: 202 });
        }
        return Response.json(await collectHistoricalBatch());
      },
    },
  },
});
