import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  REQUEST_STATUSES,
  normalizePkPhone,
  submitRequestSchema,
  type EmergencyRequest,
  type RequestStatus,
} from "@/lib/emergency";

export const RATE_LIMIT_PER_HOUR = 10;

export type SubmitResponse =
  | { ok: true; code: string; createdAt: string }
  | { ok: false; error: "rate_limited" | "invalid" | "unavailable"; message: string };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Public: any citizen may submit. Validates, rate-limits per IP, stores the row. */
export const submitEmergencyRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitRequestSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitResponse> => {
    const phone = normalizePkPhone(data.phone);
    if (!phone) return { ok: false, error: "invalid", message: "Enter a valid mobile number." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const ipHash = await sha256(`kpfg:${ip}`);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count, error: countErr } = await supabaseAdmin
      .from("submission_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if (countErr) {
      console.error("rate limit check failed", countErr.message);
      return { ok: false, error: "unavailable", message: "Request service temporarily unavailable." };
    }
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return {
        ok: false,
        error: "rate_limited",
        message:
          "Too many requests from this connection in the last hour. Please wait, or call Rescue 1122 now if anyone is in danger.",
      };
    }

    // The test flag is only honoured for signed-in coordinators/admins (checked as the caller).
    let isTest = false;
    if (data.isTest) {
      const auth = getRequestHeader("authorization");
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
      if (token) isTest = await callerIsCoordinator(token);
    }

    const { data: district } = await supabaseAdmin
      .from("districts")
      .select("id")
      .eq("name_en", data.district)
      .maybeSingle();

    const { data: row, error } = await supabaseAdmin
      .from("emergency_requests")
      .insert({
        request_code: "pending", // replaced by the database trigger
        full_name: data.fullName,
        phone,
        district_id: district?.id ?? null,
        tehsil: data.tehsil,
        location: data.location,
        emergency_type: data.type,
        people_affected: data.peopleAffected,
        description: data.description,
        language: data.language,
        is_test: isTest,
      })
      .select("request_code, created_at")
      .single();
    if (error || !row) {
      console.error("emergency request insert failed", error?.message);
      return { ok: false, error: "unavailable", message: "Request service temporarily unavailable." };
    }
    await supabaseAdmin.from("submission_rate_limits").insert({ ip_hash: ipHash });
    return { ok: true, code: row.request_code, createdAt: row.created_at };
  });

async function callerIsCoordinator(token: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}`, apikey: key } },
  });
  const { data: user } = await client.auth.getUser(token);
  if (!user.user) return false;
  const [c, a] = await Promise.all([
    client.rpc("has_role", { _user_id: user.user.id, _role: "coordinator" }),
    client.rpc("has_role", { _user_id: user.user.id, _role: "admin" }),
  ]);
  return c.data === true || a.data === true;
}

async function isCoordinator(ctx: {
  supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "coordinator" | "admin" }) => PromiseLike<{ data: boolean | null }> };
  userId: string;
}) {
  const [c, a] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "coordinator" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
  ]);
  return c.data === true || a.data === true;
}

export const getCoordinatorStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ coordinator: await isCoordinator(context) }));

export const listEmergencyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ authorized: boolean; requests: EmergencyRequest[] }> => {
    if (!(await isCoordinator(context))) return { authorized: false, requests: [] };
    const { data, error } = await context.supabase
      .from("emergency_requests")
      .select("*, districts(name_en)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("Requests temporarily unavailable");
    return {
      authorized: true,
      requests: (data ?? []).map((r) => ({
        id: r.id,
        code: r.request_code,
        createdAt: r.created_at,
        status: r.status as RequestStatus,
        language: r.language as EmergencyRequest["language"],
        isTest: r.is_test,
        fullName: r.full_name,
        phone: r.phone,
        district: r.districts?.name_en ?? "Other",
        tehsil: r.tehsil,
        location: r.location,
        type: r.emergency_type as EmergencyRequest["type"],
        peopleAffected: r.people_affected,
        description: r.description,
      })),
    };
  });

export const updateEmergencyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(REQUEST_STATUSES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("emergency_requests")
      .update({ status: data.status }, { count: "exact" })
      .eq("id", data.id);
    if (error || !count) throw new Error("Status could not be updated");
    return { ok: true };
  });
