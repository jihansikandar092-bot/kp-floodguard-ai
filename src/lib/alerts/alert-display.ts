import type { RiskLanguage } from "@/lib/risk/outlook";

/**
 * Wording helpers for the alerts panel. These only re-format rows that are
 * already stored; they never invent alert state.
 */

/** Note the scoring-correction pass appends when it closes an alert. */
export const WITHDRAWAL_NOTE_EN = "superseded by corrected scoring rule";

const WITHDRAWAL_NOTES: Record<RiskLanguage, string> = {
  en: WITHDRAWAL_NOTE_EN,
  ur: "درست کردہ اسکورنگ اصول کی وجہ سے سابقہ انتباہ بند کر دیا گیا۔",
  ps: "د سم شوي نمرې اصولو له امله پخوانی خبرداری وتړل شو.",
};

const WITHDRAWAL_LABEL: Record<RiskLanguage, string> = {
  en: "Withdrawn: scoring correction",
  ur: "واپس لیا گیا: اسکورنگ اصلاح",
  ps: "شپښول شوی: د نمرې سمون",
};

const WITHDRAWAL_SENTENCE: Record<RiskLanguage, (day: string) => string> = {
  en: (day) => `Withdrawn after a scoring correction on ${day}.`,
  ur: (day) => `اسکورنگ اصلاح کے بعد ${day} کو واپس لیا گیا۔`,
  ps: (day) => `د نمرې له سمون وروسته د ${day} په ورځ شپښول شو.`,
};

const ORIGINAL_REASON_LABEL: Record<RiskLanguage, string> = {
  en: "Original reason:",
  ur: "اصل وجہ:",
  ps: "اصلي لامل:",
};

const TECHNICAL_DETAILS_LABEL: Record<RiskLanguage, string> = {
  en: "Technical details",
  ur: "تکنیکی تفصیلات",
  ps: "تخنیکي جزئیات",
};

export type AlertDisplayFields = {
  reason_text: string;
  reason_templates?: Record<string, string> | null;
  resolved_at: string | null;
  type: string;
  horizon_hours: number | null;
  expected_by: string | null;
};

export const utc = (value: string) => `${value.replace("T", " ").slice(0, 16)} UTC`;

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** "2026-11-15T15:06:45Z" -> "15 Nov 2026" */
export function formatDay(iso: string) {
  return dayFmt.format(new Date(iso));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when this row was closed by the corrected scoring rule. */
export function isWithdrawn(alert: Pick<AlertDisplayFields, "reason_text">) {
  return new RegExp(`\\s*${escapeRe(WITHDRAWAL_NOTE_EN)}\\s*$`, "i").test(alert.reason_text);
}

/** Removes the trailing withdrawal note from a stored reason string. */
export function stripWithdrawalNote(text: string, language: RiskLanguage = "en") {
  let out = text;
  for (const note of [WITHDRAWAL_NOTES[language], WITHDRAWAL_NOTE_EN]) {
    out = out.replace(new RegExp(`\\s*${escapeRe(note)}\\s*$`, "i"), "");
  }
  return out.trim();
}

/** Language-selected reason text with the withdrawal note removed. */
export function displayReason(alert: AlertDisplayFields, language: RiskLanguage) {
  const raw = alert.reason_templates?.[language] ?? alert.reason_text;
  return stripWithdrawalNote(raw, language) || stripWithdrawalNote(alert.reason_text, "en");
}

export function withdrawalLabel(language: RiskLanguage) {
  return WITHDRAWAL_LABEL[language];
}

export function withdrawalSentence(iso: string, language: RiskLanguage) {
  return WITHDRAWAL_SENTENCE[language](formatDay(iso));
}

export function originalReasonLabel(language: RiskLanguage) {
  return ORIGINAL_REASON_LABEL[language];
}

export function technicalDetailsLabel(language: RiskLanguage) {
  return TECHNICAL_DETAILS_LABEL[language];
}

/**
 * Status line for one alert. A resolved alert is never described as active.
 */
export function alertStatusText(alert: AlertDisplayFields) {
  if (alert.resolved_at) return `Resolved ${utc(alert.resolved_at)}`;
  if (alert.type === "expected") {
    return `Expected within ${alert.horizon_hours ?? "Not available"} hours · By ${
      alert.expected_by ? utc(alert.expected_by) : "Not available"
    }`;
  }
  return "Active now";
}
