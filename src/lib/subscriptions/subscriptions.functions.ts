import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isCoordinator } from "@/lib/api/requests.functions";
import { NOTIFY_CONFIG, subscribeSchema, tokenSchema, verificationOutcome } from "./rules";

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export type SubscribeResult =
  | { ok: true; channel: "email" | "webpush" }
  | { ok: false; error: "rate_limited" | "invalid" | "unavailable"; message: string };

/** Public. Same reply whether or not an address already subscribed, so nothing leaks. */
export const createSubscription = createServerFn({ method: "POST" })
  .validator((input: unknown) => subscribeSchema.parse(input))
  .handler(async ({ data }): Promise<SubscribeResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const ipHash = await sha256(`kpfg-sub:${ip}`);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count, error: rlErr } = await supabaseAdmin
      .from("subscription_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if (rlErr)
      return {
        ok: false,
        error: "unavailable",
        message: "Subscriptions are temporarily unavailable.",
      };
    if ((count ?? 0) >= NOTIFY_CONFIG.subscribePerHour)
      return {
        ok: false,
        error: "rate_limited",
        message:
          "Too many subscription attempts from this connection. Please try again in an hour.",
      };
    await supabaseAdmin.from("subscription_rate_limits").insert({ ip_hash: ipHash });

    const { data: known } = await supabaseAdmin
      .from("districts")
      .select("id")
      .in("id", data.districtIds);
    const districtIds = [...new Set((known ?? []).map((d) => d.id))];
    if (!districtIds.length)
      return { ok: false, error: "invalid", message: "Choose at least one district." };

    const contact = data.channel === "email" ? data.email : JSON.stringify(data.push);
    const contactHash = await sha256(data.channel === "email" ? data.email : data.push.endpoint);
    const common = {
      channel: data.channel,
      contact,
      contact_hash: contactHash,
      district_ids: districtIds,
      language: data.language,
      min_level: data.minLevel,
    };

    if (data.channel === "webpush") {
      // Browser permission was granted by an explicit click; that is the opt-in.
      await supabaseAdmin
        .from("alert_subscriptions")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("contact_hash", contactHash)
        .is("unsubscribed_at", null);
      const { error } = await supabaseAdmin
        .from("alert_subscriptions")
        .insert({ ...common, verified_at: new Date().toISOString() });
      if (error)
        return {
          ok: false,
          error: "unavailable",
          message: "Subscriptions are temporarily unavailable.",
        };
      return { ok: true, channel: "webpush" };
    }

    const verifyToken = randomToken();
    const { data: row, error } = await supabaseAdmin
      .from("alert_subscriptions")
      .insert({
        ...common,
        verify_token: verifyToken,
        verify_expires_at: new Date(
          Date.now() + NOTIFY_CONFIG.verifyHours * 3600_000,
        ).toISOString(),
      })
      .select("unsubscribe_token")
      .single();
    if (error || !row)
      return {
        ok: false,
        error: "unavailable",
        message: "Subscriptions are temporarily unavailable.",
      };
    const { sendEmail, SITE_URL } = await import("./channels.server");
    const { footerText } = await import("./sender.server");
    try {
      await sendEmail(
        data.email,
        "Confirm your KP FloodGuard AI alert subscription",
        `Please confirm that you want KP FloodGuard AI flood-risk emails.\n\nConfirm: ${SITE_URL}/verify-subscription?token=${verifyToken}\n\nIf you did not ask for this, ignore this email and nothing will be sent. The link expires in ${NOTIFY_CONFIG.verifyHours} hours.`,
        footerText(data.language, row.unsubscribe_token),
      );
    } catch (e) {
      console.error("verification email failed", e instanceof Error ? e.message : "unknown");
      return {
        ok: false,
        error: "unavailable",
        message: "The confirmation email could not be sent, so you are not subscribed. During the prototype only the project owner's address can receive email; please use browser notifications instead.",
      };
    }
    return { ok: true, channel: "email" };
  });

/** Public: activates a pending email subscription after the link is clicked. */
export const verifySubscription = createServerFn({ method: "POST" })
  .validator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("alert_subscriptions")
      .select("id,contact_hash,verified_at,verify_expires_at,unsubscribed_at")
      .eq("verify_token", data.token)
      .maybeSingle();
    const outcome = verificationOutcome(sub);
    if (outcome === "invalid" || !sub)
      return { ok: false as const, message: "This link is not valid." };
    if (outcome === "already") return { ok: true as const };
    if (outcome === "expired")
      return { ok: false as const, message: "This link has expired. Please subscribe again." };
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("alert_subscriptions")
      .update({ unsubscribed_at: now })
      .eq("contact_hash", sub.contact_hash)
      .neq("id", sub.id)
      .is("unsubscribed_at", null);
    await supabaseAdmin.from("alert_subscriptions").update({ verified_at: now }).eq("id", sub.id);
    return { ok: true as const };
  });

/** Public, no login: deactivates that subscription immediately. */
export const unsubscribe = createServerFn({ method: "POST" })
  .validator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("alert_subscriptions")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("unsubscribe_token", data.token)
      .is("unsubscribed_at", null)
      .select("id");
    if (rows?.length) return { ok: true as const };
    const { data: existing } = await supabaseAdmin
      .from("alert_subscriptions")
      .select("id")
      .eq("unsubscribe_token", data.token)
      .maybeSingle();
    return existing
      ? { ok: true as const }
      : { ok: false as const, message: "This link is not valid." };
  });

/** Public VAPID key (not secret) so the browser can create a push subscription. */
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => ({
  key: process.env["VAPID_PUBLIC_KEY"] ?? null,
}));

/** Coordinators: counts only (no contact details) and the last 50 deliveries. */
export const getSubscriptionStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isCoordinator(context))) return { authorized: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: subs }, { data: deliveries }] = await Promise.all([
      supabaseAdmin
        .from("alert_subscriptions")
        .select("district_ids,channel")
        .not("verified_at", "is", null)
        .is("unsubscribed_at", null),
      context.supabase
        .from("alert_deliveries")
        .select("id,district_id,channel,status,error,sent_at,is_test,attempt")
        .order("sent_at", { ascending: false })
        .limit(50),
    ]);
    const perDistrict: Record<string, { email: number; webpush: number }> = {};
    for (const s of subs ?? []) {
      for (const d of s.district_ids) {
        perDistrict[d] ??= { email: 0, webpush: 0 };
        perDistrict[d][s.channel as "email" | "webpush"]++;
      }
    }
    return {
      authorized: true as const,
      total: subs?.length ?? 0,
      perDistrict,
      deliveries: deliveries ?? [],
    };
  });

/** Coordinators: one labelled test message to their own verified email subscription. */
export const sendMyTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isCoordinator(context))) return { ok: false as const, message: "Not authorized." };
    const email = (context.claims as { email?: string }).email;
    if (!email) return { ok: false as const, message: "Your account has no email address." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTestNotification } = await import("./sender.server");
    return sendTestNotification(supabaseAdmin, email);
  });
