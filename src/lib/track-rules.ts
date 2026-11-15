import { z } from "zod";

/** Public request-tracking rules: shared by the /track page and the server function. */
export const TRACK_ATTEMPTS_PER_HOUR = 10;

/** Same message for a wrong code and a wrong phone number, so neither can be probed. */
export const TRACK_GENERIC_MESSAGE =
  "No request matches these details. Check the request code and the last 4 phone digits, or call Rescue 1122 in an emergency.";

export const TRACK_RATE_LIMIT_MESSAGE =
  "Too many attempts from this connection. Please wait an hour, or call Rescue 1122 in an emergency.";

export const trackInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^KPF-\d{4}-\d{4}$/, "Enter the full request code, for example KPF-2026-0001."),
  last4: z.string().trim().regex(/^\d{4}$/, "Enter exactly the last 4 digits of the phone number."),
});
export type TrackInput = z.infer<typeof trackInputSchema>;

/** True when the stored phone number ends with the given 4 digits. */
export function phoneMatchesLast4(phone: string, last4: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 && digits.endsWith(last4);
}
