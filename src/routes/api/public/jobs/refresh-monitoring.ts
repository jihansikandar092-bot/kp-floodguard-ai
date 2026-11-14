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
          .union([
            z
              .object({ kind: z.literal("monitoring"), trigger: z.literal("manual").optional() })
              .strict(),
            z.object({ kind: z.literal("risk") }).strict(),
          ])
          .safeParse(await request.json().catch(() => null));
        if (!body.success)
          return Response.json({ error: "Invalid schedule payload" }, { status: 400 });
        // Operator-only: assess the currently stored snapshots without calling providers.
        if (body.data.kind === "risk") {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { assessStoredSnapshots } = await import("@/lib/risk/assessments.server");
          return Response.json({ assessed: await assessStoredSnapshots(supabaseAdmin) });
        }
        // The managed schedule sends only { kind }; operator calls add trigger: "manual".
        const trigger = ("trigger" in body.data && body.data.trigger) || "schedule";
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
