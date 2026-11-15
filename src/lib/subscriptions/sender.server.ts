import {
  alertMessage,
  decide,
  districtLabel,
  eventKey,
  NOTIFY_CONFIG,
  safetyNotice,
  TEST_PREFIX,
  type AlertRow,
  type DeliveryRow,
  type SubLanguage,
  type SubscriptionRow,
} from "./rules";
import { sendEmail, sendPush, SITE_URL } from "./channels.server";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
interface FullSub extends SubscriptionRow {
  contact: string;
  unsubscribe_token: string;
}

const lang = (l: string): SubLanguage => (l === "ur" || l === "ps" ? l : "en");

export function footerText(l: SubLanguage, unsubscribeToken: string) {
  return `${safetyNotice(l)}\nUnsubscribe: ${SITE_URL}/unsubscribe?token=${unsubscribeToken}`;
}

async function deliver(sub: FullSub, subject: string, text: string, link: string) {
  if (sub.channel === "email") {
    await sendEmail(sub.contact, subject, text, footerText(lang(sub.language), sub.unsubscribe_token));
  } else {
    await sendPush(sub.contact, subject, text, link);
  }
}

function safeError(e: unknown) {
  return (e instanceof Error ? e.message : "Send failed").slice(0, 300);
}

/**
 * Sends new/escalated alerts to matching verified subscribers. Every attempt is recorded.
 * Never throws: monitoring must not depend on delivery.
 */
export async function dispatchAlertNotifications(admin: Admin) {
  const summary = { sent: 0, failed: 0, skipped: 0 };
  try {
    const since = new Date(Date.now() - NOTIFY_CONFIG.lookbackHours * 3600_000).toISOString();
    const { data: alerts } = await admin
      .from("alerts")
      .select("id,district_id,level,horizon_hours,resolved_at,updated_at")
      .is("resolved_at", null)
      .in("level", ["medium", "high"])
      .gte("updated_at", since);
    if (!alerts?.length) return summary;
    const [{ data: subs }, { data: districts }, { data: deliveries }] = await Promise.all([
      admin
        .from("alert_subscriptions")
        .select("id,channel,contact,district_ids,language,min_level,verified_at,unsubscribed_at,unsubscribe_token")
        .not("verified_at", "is", null)
        .is("unsubscribed_at", null),
      admin.from("districts").select("id,name_en,name_ur,name_ps"),
      admin
        .from("alert_deliveries")
        .select("subscription_id,district_id,event_key,status,sent_at")
        .eq("is_test", false)
        .gte("sent_at", new Date(Date.now() - NOTIFY_CONFIG.lookbackHours * 3600_000).toISOString()),
    ]);
    const history: DeliveryRow[] = [...(deliveries ?? [])];
    for (const a of alerts as AlertRow[]) {
      for (const s of (subs ?? []) as FullSub[]) {
        const d = decide(s, a, history);
        if (d.action === "none") continue;
        const base = {
          alert_id: a.id,
          subscription_id: s.id,
          district_id: a.district_id,
          channel: s.channel,
          event_key: eventKey(a),
        };
        let row;
        if (d.action === "skip-cap") {
          row = { ...base, status: "skipped", error: `cap: one message per district per ${NOTIFY_CONFIG.capHours} h` };
          summary.skipped++;
        } else {
          const l = lang(s.language);
          const name = districtLabel(districts?.find((x) => x.id === a.district_id), l, a.district_id);
          const link = `${SITE_URL}/alerts`;
          const text = alertMessage(l, name, a.level, a.horizon_hours, link);
          try {
            await deliver(s, `KP FloodGuard AI: ${name}`, text, link);
            row = { ...base, status: "sent", attempt: d.attempt };
            summary.sent++;
          } catch (e) {
            row = { ...base, status: "failed", attempt: d.attempt, error: safeError(e) };
            summary.failed++;
          }
        }
        const sentAt = new Date().toISOString();
        await admin.from("alert_deliveries").insert({ ...row, sent_at: sentAt });
        history.push({ ...base, status: row.status, sent_at: sentAt });
      }
    }
  } catch (e) {
    console.error("Alert notification dispatch failed", safeError(e));
  }
  return summary;
}

/** One clearly labelled test message through the same sender path; never touches alerts. */
export async function sendTestNotification(admin: Admin, email: string) {
  const { data: subs } = await admin
    .from("alert_subscriptions")
    .select("id,channel,contact,district_ids,language,min_level,verified_at,unsubscribed_at,unsubscribe_token")
    .eq("channel", "email")
    .eq("contact", email.toLowerCase())
    .not("verified_at", "is", null)
    .is("unsubscribed_at", null)
    .limit(1);
  const sub = subs?.[0] as FullSub | undefined;
  if (!sub) return { ok: false as const, message: "No verified, active email subscription for your account email." };
  const l = lang(sub.language);
  const text = `${TEST_PREFIX}.\n\n${alertMessage(l, "TEST", "medium", 24, `${SITE_URL}/alerts`)}`;
  let status: "sent" | "failed" = "sent";
  let error: string | null = null;
  try {
    await deliver(sub, `${TEST_PREFIX}: KP FloodGuard AI`, text, `${SITE_URL}/alerts`);
  } catch (e) {
    status = "failed";
    error = safeError(e);
  }
  const { data: row } = await admin
    .from("alert_deliveries")
    .insert({ subscription_id: sub.id, channel: "email", status, error, is_test: true, event_key: "test" })
    .select("id,status,sent_at")
    .single();
  return { ok: status === "sent", delivery: row, message: error ?? "Test notification sent." };
}
