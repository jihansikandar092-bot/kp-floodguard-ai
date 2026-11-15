import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getRiskAssessments = createServerFn({ method: "GET" }).handler(async () => {
  const { readLatestAssessments } = await import("./assessments.server");
  return readLatestAssessments();
});

/** Explicit operator correction only; no provider fetch or notification dispatch. */
export const correctDegenerateRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [coordinator, admin] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "coordinator" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (coordinator.error || admin.error || (!coordinator.data && !admin.data)) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assessStoredSnapshots } = await import("./assessments.server");
    return { assessed: await assessStoredSnapshots(supabaseAdmin, true) };
  });
