import { partialScoreNote, type PartialLanguage } from "@/lib/risk/partial";

export function PartialScoreNote({ availableFactors, language = "en" }: {
  availableFactors: number;
  language?: PartialLanguage;
}) {
  const note = partialScoreNote(availableFactors, language);
  if (!note) return null;
  return <p className="mt-1 text-xs text-muted-foreground" lang={language} dir={language === "en" ? "ltr" : "rtl"}>{note}</p>;
}