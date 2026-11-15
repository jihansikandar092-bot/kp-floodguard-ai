import { EMERGENCY_TYPE_LABEL, STATUS_LABEL, type EmergencyRequest } from "./emergency";
import { formatPkt, maskPhone } from "./request-display";

/** Plain-text handover slip a coordinator copies for a Rescue 1122 field team. Phone is masked unless explicitly included. */
export function buildDispatchSlip(r: EmergencyRequest, includeFullPhone = false): string {
  return [
    "KP FloodGuard AI — Dispatch handover (coordinator verified, prototype)",
    `Request: ${r.code}${r.isTest ? " [TEST]" : ""}`,
    `Status: ${STATUS_LABEL[r.status]}`,
    `Type: ${EMERGENCY_TYPE_LABEL[r.type].en}`,
    `People affected: ${r.peopleAffected}`,
    `District / Tehsil: ${r.district} / ${r.tehsil}`,
    `Location: ${r.location}`,
    `Contact: ${r.fullName}, ${includeFullPhone ? r.phone : maskPhone(r.phone)}`,
    `Details: ${r.description}`,
    `Assigned team: ${r.assignedTeam ?? "Not assigned"}`,
    `Submitted: ${formatPkt(r.createdAt)}`,
  ].join("\n");
}

export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
