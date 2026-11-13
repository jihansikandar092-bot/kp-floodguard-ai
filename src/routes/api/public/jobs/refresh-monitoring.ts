import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { z } from "zod";

export const Route = createFileRoute("/api/public/jobs/refresh-monitoring")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const failure = await authenticateCronRequest(request);
        if (failure) return failure;
        const body = z
          .object({ kind: z.literal("monitoring"), trigger: z.literal("manual").optional() })
          .strict()
          .safeParse(await request.json().catch(() => null));
        if (!body.success)
          return Response.json({ error: "Invalid schedule payload" }, { status: 400 });
        // The managed schedule sends only { kind }; operator calls add trigger: "manual".
        const trigger = body.data.trigger ?? "schedule";
        const { refreshMonitoringSnapshots } =
          await import("@/lib/api/monitoring-snapshots.server");
        // Nitro attaches the Worker's execution-context waitUntil to the Request.
        const background = (request as Request & { waitUntil?: (work: Promise<unknown>) => void })
          .waitUntil;
        if (background) {
          background(
            refreshMonitoringSnapshots(trigger).catch((error) =>
              console.error("Monitoring refresh failed", error),
            ),
          );
          return Response.json({ accepted: true }, { status: 202 });
        }
        return Response.json(await refreshMonitoringSnapshots(trigger));
      },
    },
  },
});
