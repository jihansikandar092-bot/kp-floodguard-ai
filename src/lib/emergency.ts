import { z } from "zod";

export const EMERGENCY_TYPES = ["rescue", "medical", "food", "water", "shelter"] as const;
export type EmergencyType = (typeof EMERGENCY_TYPES)[number];

export const EMERGENCY_TYPE_LABEL: Record<EmergencyType, { en: string; ur: string }> = {
  rescue: { en: "Rescue", ur: "ریسکیو / بچاؤ" },
  medical: { en: "Medical Assistance", ur: "طبی امداد" },
  food: { en: "Food", ur: "خوراک" },
  water: { en: "Drinking Water", ur: "پینے کا پانی" },
  shelter: { en: "Shelter", ur: "پناہ گاہ" },
};

export const REQUEST_STATUSES = ["pending", "under_review", "in_progress", "resolved"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const STATUS_BADGE: Record<RequestStatus, "pending" | "review" | "progress" | "resolved"> = {
  pending: "pending",
  under_review: "review",
  in_progress: "progress",
  resolved: "resolved",
};

export const REQUEST_LANGUAGES = ["en", "ur", "ps"] as const;
export type RequestLanguage = (typeof REQUEST_LANGUAGES)[number];

/** Normalises a Pakistani mobile number. Returns null when it is not a valid 03XX-XXXXXXX number. */
export function normalizePkPhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "");
  const m = digits.match(/^(?:\+92|0092|92|0)(3\d{9})$/);
  return m ? `0${m[1]}` : null;
}

export const emergencyRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizePkPhone(v) !== null, "Enter a valid mobile number, e.g. 0300 1234567"),
  district: z.string().trim().min(1, "Select a district").max(60),
  tehsil: z.string().trim().min(2, "Enter the tehsil").max(60),
  location: z.string().trim().min(5, "Describe the exact location (village, landmark)").max(300),
  type: z.enum(EMERGENCY_TYPES, { errorMap: () => ({ message: "Choose an emergency type" }) }),
  peopleAffected: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .int("Enter a whole number")
    .min(1, "At least 1 person")
    .max(10000, "Enter a number up to 10,000"),
  description: z.string().trim().min(10, "Describe the situation in a few words").max(1000),
});

export type EmergencyRequestInput = z.infer<typeof emergencyRequestSchema>;

/** Server-side submission payload: form fields plus language and the coordinator-only test flag. */
export const submitRequestSchema = emergencyRequestSchema.extend({
  language: z.enum(REQUEST_LANGUAGES).default("en"),
  isTest: z.boolean().default(false),
});
export type SubmitRequestInput = z.input<typeof submitRequestSchema>;

/** A request as stored in the database. */
export interface EmergencyRequest extends EmergencyRequestInput {
  id: string;
  code: string;
  createdAt: string; // ISO
  status: RequestStatus;
  language: RequestLanguage;
  isTest: boolean;
}
