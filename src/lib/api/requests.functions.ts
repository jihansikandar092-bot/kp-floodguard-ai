import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  REQUEST_STATUSES,
  normalizePkPhone,
  submitRequestSchema,
  type EmergencyRequest,
  type RequestEvent,
  type RequestStatus,
} from "@/lib/emergency";
import {
  TRACK_ATTEMPTS_PER_HOUR,
  TRACK_GENERIC_MESSAGE,
  TRACK_RATE_LIMIT_MESSAGE,
  phoneMatchesLast4,
  trackInputSchema,
} from "@/lib/track-rules";

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
  .validator((input: unknown) => submitRequestSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitResponse> => {
    const phone = normalizePkPhone(data.phone);
    if (!phone) return { ok: false, error: "invalid", message: "Enter a valid mobile number." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const findExisting = async () => {
      if (!data.clientRequestId) return null;
      const { data: hit } = await supabaseAdmin
        .from("emergency_requests")
        .select("request_code, created_at")
        .eq("client_request_id", data.clientRequestId)
        .maybeSingle();
      return hit ? { ok: true as const, code: hit.request_code, createdAt: hit.created_at } : null;
    };
    const already = await findExisting();
    if (already) return already;

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
      return {
        ok: false,
        error: "unavailable",
        message: "Request service temporarily unavailable.",
      };
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
        client_request_id: data.clientRequestId ?? null,
      })
      .select("request_code, created_at")
      .single();
    if (error?.code === "23505") {
      const dup = await findExisting();
      if (dup) return dup;
    }
    if (error || !row) {
      console.error("emergency request insert failed", error?.message);
      return {
        ok: false,
        error: "unavailable",
        message: "Request service temporarily unavailable.",
      };
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

export async function isCoordinator(ctx: {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "coordinator" | "admin" },
    ) => PromiseLike<{ data: boolean | null }>;
  };
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
        updatedAt: r.updated_at,
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
        assignedTeam: r.assigned_team,
        internalNote: r.internal_note,
      })),
    };
  });

export const updateEmergencyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(REQUEST_STATUSES),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("emergency_requests")
      .update({ status: data.status }, { count: "exact" })
      .eq("id", data.id);
    if (error || !count) throw new Error("Status could not be updated");
    // The database trigger already wrote the event row; attach the optional note to it.
    if (data.note) {
      const { data: ev } = await context.supabase
        .from("request_events")
        .select("id")
        .eq("request_id", data.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ev)
        await context.supabase.from("request_events").update({ note: data.note }).eq("id", ev.id);
    }
    return { ok: true };
  });

/** Coordinators: set the assigned team and internal note on a request. */
export const updateRequestDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        assignedTeam: z.string().trim().max(120).nullable(),
        internalNote: z.string().trim().max(2000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("emergency_requests")
      .update(
        {
          assigned_team: data.assignedTeam || null,
          internal_note: data.internalNote || null,
        },
        { count: "exact" },
      )
      .eq("id", data.id);
    if (error || !count) throw new Error("Details could not be saved");
    return { ok: true };
  });

/** Coordinators: full status history of one request, oldest first. */
export const listRequestEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ authorized: boolean; events: RequestEvent[] }> => {
    if (!(await isCoordinator(context))) return { authorized: false, events: [] };
    const { data: rows, error } = await context.supabase
      .from("request_events")
      .select("id, from_status, to_status, note, created_at")
      .eq("request_id", data.requestId)
      .order("created_at", { ascending: true });
    if (error) throw new Error("History temporarily unavailable");
    return {
      authorized: true,
      events: (rows ?? []).map((e) => ({
        id: e.id,
        fromStatus: (e.from_status as RequestStatus | null) ?? null,
        toStatus: e.to_status as RequestStatus,
        note: e.note,
        createdAt: e.created_at,
      })),
    };
  });

/** Coordinators: open (unresolved, non-test) request counts per district for the admin map. */
export const getOpenRequestCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<{ authorized: boolean; counts: Record<string, number> }> => {
      if (!(await isCoordinator(context))) return { authorized: false, counts: {} };
      const { data, error } = await context.supabase
        .from("emergency_requests")
        .select("district_id")
        .neq("status", "resolved")
        .eq("is_test", false)
        .not("district_id", "is", null);
      if (error) throw new Error("Counts temporarily unavailable");
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        if (r.district_id) counts[r.district_id] = (counts[r.district_id] ?? 0) + 1;
      }
      return { authorized: true, counts };
    },
  );

export type TrackResponse =
  { ok: true; status: RequestStatus; updatedAt: string } | { ok: false; message: string };

/** Public: track a request by code + last 4 phone digits. Rate-limited; one generic error. */
export const trackRequest = createServerFn({ method: "POST" })
  .validator((input: unknown) => trackInputSchema.parse(input))
  .handler(async ({ data }): Promise<TrackResponse> => {
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const ipHash = await sha256(`kpfg-track:${ip}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count, error: countErr } = await supabaseAdmin
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if (countErr) {
      console.error("track rate limit check failed", countErr.message);
      return { ok: false, message: "Tracking temporarily unavailable." };
    }
    if ((count ?? 0) >= TRACK_ATTEMPTS_PER_HOUR) {
      return { ok: false, message: TRACK_RATE_LIMIT_MESSAGE };
    }
    await supabaseAdmin.from("rate_limits").insert({ ip_hash: ipHash });

    const { data: row, error } = await supabaseAdmin
      .from("emergency_requests")
      .select("status, updated_at, phone")
      .eq("request_code", data.code)
      .maybeSingle();
    if (error) {
      console.error("track lookup failed", error.message);
      return { ok: false, message: "Tracking temporarily unavailable." };
    }
    if (!row || !phoneMatchesLast4(row.phone, data.last4)) {
      return { ok: false, message: TRACK_GENERIC_MESSAGE };
    }
    return { ok: true, status: row.status as RequestStatus, updatedAt: row.updated_at };
  });
