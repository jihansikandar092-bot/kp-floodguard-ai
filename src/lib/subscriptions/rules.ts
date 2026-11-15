import { z } from "zod";

/** All notification limits live here so they can be reviewed in one place. */
export const NOTIFY_CONFIG = {
  /** At most one message per subscriber per district within this window. */
  capHours: 6,
  /** A failed delivery is retried once on the next run, then given up. */
  maxAttempts: 2,
  /** Alerts updated longer ago than this are not (re)sent. */
  lookbackHours: 48,
  /** Email verification links expire after this many hours. */
  verifyHours: 48,
  /** Subscription requests per hashed connection per hour. */
  subscribePerHour: 5,
} as const;

export const SUB_LANGUAGES = ["en", "ur", "ps"] as const;
export type SubLanguage = (typeof SUB_LANGUAGES)[number];
export const SUB_LEVELS = ["medium", "high"] as const;
export type SubLevel = (typeof SUB_LEVELS)[number];

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

const base = {
  districtIds: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).min(1, "Choose at least one district").max(40),
  language: z.enum(SUB_LANGUAGES),
  minLevel: z.enum(SUB_LEVELS),
};
export const subscribeSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), email: z.string().trim().toLowerCase().email().max(254), ...base }),
  z.object({ channel: z.literal("webpush"), push: pushSubscriptionSchema, ...base }),
]);
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{32,96}$/) });

export interface SubscriptionRow {
  id: string;
  channel: "email" | "webpush";
  district_ids: string[];
  language: string;
  min_level: string;
  verified_at: string | null;
  unsubscribed_at: string | null;
}
export interface AlertRow {
  id: string;
  district_id: string;
  level: string;
  horizon_hours: number;
  resolved_at: string | null;
}
export interface DeliveryRow {
  subscription_id: string | null;
  district_id: string | null;
  event_key: string | null;
  status: string;
  sent_at: string;
}

const RANK: Record<string, number> = { medium: 1, high: 2 };

/** New alerts and escalations get distinct keys because the level is part of the key. */
export const eventKey = (a: Pick<AlertRow, "id" | "level">) => `${a.id}:${a.level}`;

export function isActive(s: SubscriptionRow) {
  return Boolean(s.verified_at) && !s.unsubscribed_at;
}

export function matches(s: SubscriptionRow, a: AlertRow) {
  return (
    isActive(s) &&
    !a.resolved_at &&
    s.district_ids.includes(a.district_id) &&
    (RANK[a.level] ?? 0) >= (RANK[s.min_level] ?? 99)
  );
}

export type Decision = { action: "send"; attempt: number } | { action: "skip-cap" } | { action: "none" };

/** What to do for one subscriber and one alert event, given earlier deliveries. */
export function decide(
  s: SubscriptionRow,
  a: AlertRow,
  deliveries: DeliveryRow[],
  now = Date.now(),
): Decision {
  if (!matches(s, a)) return { action: "none" };
  const key = eventKey(a);
  const mine = deliveries.filter((d) => d.subscription_id === s.id);
  const forEvent = mine.filter((d) => d.event_key === key);
  if (forEvent.some((d) => d.status === "sent" || d.status === "skipped")) return { action: "none" };
  const failures = forEvent.filter((d) => d.status === "failed").length;
  if (failures >= NOTIFY_CONFIG.maxAttempts) return { action: "none" };
  const capStart = now - NOTIFY_CONFIG.capHours * 3600_000;
  const recent = mine.some(
    (d) => d.status === "sent" && d.district_id === a.district_id && Date.parse(d.sent_at) > capStart,
  );
  if (recent) return { action: "skip-cap" };
  return { action: "send", attempt: failures + 1 };
}

const LEVEL: Record<SubLanguage, Record<string, string>> = {
  en: { medium: "Medium", high: "High" },
  ur: { medium: "درمیانہ", high: "زیادہ" },
  ps: { medium: "منځنی", high: "لوړ" },
};

/** The required alert text, translated. Hours 0 means the current assessment. */
export function alertMessage(
  lang: SubLanguage,
  district: string,
  level: string,
  hours: number,
  link: string,
) {
  const lv = LEVEL[lang][level] ?? level;
  if (lang === "ur")
    return `${district}: ${hours ? `اگلے ${hours} گھنٹوں میں` : "اس وقت"} ${lv} سیلابی خطرہ متوقع ہے۔ یہ ماڈل شدہ پیشگوئیوں پر مبنی ایک تجرباتی اندازہ ہے، سرکاری وارننگ نہیں۔ تفصیل: ${link}۔ ہنگامی صورت میں ریسکیو 1122 پر کال کریں۔ PDMA اور محکمہ موسمیات پاکستان کی ہدایات پر عمل کریں۔`;
  if (lang === "ps")
    return `${district}: ${hours ? `په راتلونکو ${hours} ساعتونو کې` : "اوس مهال"} د ${lv} سیلاب خطر اټکل کېږي. دا د ماډل شویو وړاندوینو پر بنسټ یو تجربوي اټکل دی، رسمي خبرداری نه دی. جزئیات: ${link}. په بیړني حالت کې ریسکیو 1122 ته زنګ ووهئ. د PDMA او د پاکستان د هواپېژندنې ریاست لارښوونې تعقیب کړئ.`;
  return `${district}: ${lv} flood risk expected ${hours ? `within ${hours} hours` : "now"}. This is an experimental estimate based on modelled forecasts, not an official warning. Details: ${link}. In an emergency call Rescue 1122. Follow PDMA and Pakistan Meteorological Department advisories.`;
}

export const TEST_PREFIX = "TEST, not a real alert";

export function districtLabel(
  d: { name_en: string; name_ur: string | null; name_ps: string | null } | undefined,
  lang: SubLanguage,
  fallback: string,
) {
  if (!d) return fallback;
  return (lang === "ur" ? d.name_ur : lang === "ps" ? d.name_ps : null) ?? d.name_en;
}
