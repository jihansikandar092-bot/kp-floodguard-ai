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
  f: { district: string; type: string; status: string; q: string },
) {
  const q = f.q.trim().toLowerCase();
  return list.filter(
    (r) =>
      (f.district === "all" || r.district === f.district) &&
      (f.type === "all" || r.type === f.type) &&
      (f.status === "all" || r.status === f.status) &&
      (!q ||
        r.id.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)),
  );
}
