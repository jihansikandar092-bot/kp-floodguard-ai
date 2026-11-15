import { z } from "zod";

export const chatBody = z.object({ sessionId: z.string().uuid(), chatInput: z.string().trim().min(1).max(1000), language: z.enum(["en", "ur", "ps"]) }).strict();
export type ChatLanguage = z.infer<typeof chatBody>["language"];
export const chatFallback = {
  en: "The AI assistant is temporarily unavailable. In an emergency call Rescue 1122 or use the emergency request form.",
  ur: "AI معاون عارضی طور پر دستیاب نہیں ہے۔ ہنگامی صورت میں ریسکیو 1122 پر کال کریں یا ہنگامی درخواست فارم استعمال کریں۔",
  ps: "د AI مرستیال لنډمهاله نه شته. په بیړني حالت کې ریسکیو 1122 ته زنګ ووهئ یا د بیړنۍ غوښتنې فورمه وکاروئ.",
} as const;
export const chatLimitReply = {
  en: "Too many messages. Please wait before trying again. In an emergency call Rescue 1122.",
  ur: "بہت زیادہ پیغامات بھیجے گئے ہیں۔ دوبارہ کوشش کرنے سے پہلے انتظار کریں۔ ہنگامی صورت میں ریسکیو 1122 پر کال کریں۔",
  ps: "ډېر پیغامونه لېږل شوي دي. بیا هڅه کولو مخکې لږ انتظار وکړئ. په بیړني حالت کې ریسکیو 1122 ته زنګ ووهئ.",
} as const;
export const chatDataLabel = { en: "Data time", ur: "ڈیٹا کا وقت", ps: "د معلوماتو وخت" } as const;
export function extractReply(data: unknown): string | undefined {
  const item = Array.isArray(data) ? data[0] : data;
  if (typeof item === "string" && item.trim()) return item;
  if (item && typeof item === "object") {
    const object = item as Record<string, unknown>;
    for (const key of ["output", "text", "response", "message"]) {
      const value = object[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return undefined;
}