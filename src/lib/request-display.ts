import type { EmergencyRequest } from "@/lib/emergency";
const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
export const formatPkt = (iso: string) => `${fmt.format(new Date(iso))} PKT`;
export function filterRequests(
  list: EmergencyRequest[],
  f: {
    district: string;
    type: string;
    status: string;
    language: string;
    hideTest: boolean;
    q: string;
  },
) {
  const q = f.q.trim().toLowerCase();
  return list.filter(
    (r) =>
      (f.district === "all" || r.district === f.district) &&
      (f.type === "all" || r.type === f.type) &&
      (f.status === "all" || r.status === f.status) &&
      (f.language === "all" || r.language === r.language) &&
      (!f.hideTest || !r.isTest) &&
      (!q ||
        r.code.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)),
  );
}

/** Coordinator-only CSV export of the filtered rows. Escapes quotes, commas and newlines. */
export function requestsToCsv(rows: EmergencyRequest[]): string {
  const header = [
    "code",
    "created_at",
    "status",
    "district",
    "tehsil",
    "location",
    "type",
    "people_affected",
    "language",
    "full_name",
    "phone",
    "assigned_team",
  ];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    header.join(","),
    ...rows.map((r) =>
      [
        r.code,
        r.createdAt,
        r.status,
        r.district,
        r.tehsil,
        r.location,
        r.type,
        r.peopleAffected,
        r.language,
        r.fullName,
        r.phone,
        r.assignedTeam ?? "",
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}
/** Masks all but the last 4 digits of a phone number. */
export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 4 ? "••••" : `•••• ${digits.slice(-4)}`;
}
