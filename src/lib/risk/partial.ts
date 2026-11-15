export const TOTAL_RISK_FACTORS = 4;
export type PartialLanguage = "en" | "ur" | "ps";

export const partialScoreTranslations = {
  en: { partialScore: "Partial: based on {available} of 4 factors. A missing factor may mean the real risk is higher." },
  ur: { partialScore: "جزوی: 4 میں سے {available} عوامل پر مبنی ہے۔ کسی عامل کی عدم دستیابی کا مطلب ہو سکتا ہے کہ اصل خطرہ زیادہ ہے۔" },
  ps: { partialScore: "نیمګړی: له 4 عواملو څخه پر {available} ولاړ دی. د یوه عامل نشتوالی ښايي د دې معنا ولري چې اصلي خطر لوړ دی." },
} as const;

export function partialScoreNote(available: number, language: PartialLanguage = "en") {
  return available < TOTAL_RISK_FACTORS
    ? partialScoreTranslations[language].partialScore.replace("{available}", String(available))
    : "";
}