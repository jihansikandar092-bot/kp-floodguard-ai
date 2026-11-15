import { buildPushPayload } from "@block65/webcrypto-web-push";
import { pushSubscriptionSchema } from "./rules";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
export const SITE_URL = "https://kp-floodguard-ai.lovable.app";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Sends one email through the Resend connector. Errors never include the recipient. */
export async function sendEmail(to: string, subject: string, body: string, footer: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) throw new Error("Email is not configured");
  const from = process.env["EMAIL_FROM"] || "KP FloodGuard AI <onboarding@resend.dev>";
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#14204a">
<p style="font-size:15px;line-height:1.5">${escapeHtml(body).replace(/\n/g, "<br>")}</p>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
<p style="font-size:12px;color:#555;line-height:1.5">${escapeHtml(footer).replace(/(https:\/\/\S+)/g, '<a href="$1">$1</a>')}</p></div>`;
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from, to: [to], subject, html, text: `${body}\n\n${footer}` }),
    signal: AbortSignal.timeout(10_000),
  });
  const { recordServiceHealth } = await import("@/lib/api/service-health.server");
  await recordServiceHealth("Email alerts", res.ok, `Email provider refused a send (HTTP ${res.status})`);
  if (!res.ok) {
    const text = (await res.text()).slice(0, 200).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]");
    throw new Error(`Email provider HTTP ${res.status}: ${text}`);
  }
}

/** Sends one Web Push message (RFC 8291 / VAPID) using Web Crypto, so it runs on Workers. */
export async function sendPush(contact: string, title: string, body: string, url: string) {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"];
  if (!publicKey || !privateKey || !subject) throw new Error("Web push is not configured");
  const sub = pushSubscriptionSchema.parse(JSON.parse(contact));
  const payload = await buildPushPayload(
    { data: JSON.stringify({ title, body, url }), options: { ttl: 6 * 3600, urgency: "high" } },
    { endpoint: sub.endpoint, expirationTime: sub.expirationTime ?? null, keys: sub.keys },
    { subject, publicKey, privateKey },
  );
  const res = await fetch(sub.endpoint, { ...payload, signal: AbortSignal.timeout(10_000) });
  // 4xx usually means one expired browser subscription, not a service failure.
  if (res.ok || res.status >= 500) {
    const { recordServiceHealth } = await import("@/lib/api/service-health.server");
    await recordServiceHealth("Web push", res.ok, `Push service error (HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(`Push service HTTP ${res.status}`);
  return res.status;
}
