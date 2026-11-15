import { describe, expect, it } from "vitest";
import { buildDispatchSlip } from "@/lib/dispatch";
import type { EmergencyRequest } from "@/lib/emergency";

const r = {
  id: "x", code: "KPF-2026-0099", createdAt: "2026-11-15T10:00:00Z", updatedAt: "2026-11-15T10:00:00Z",
  status: "pending", language: "en", isTest: true, assignedTeam: null, internalNote: null,
  fullName: "A", phone: "03001234567", district: "Swat", tehsil: "Mingora", location: "Near bridge",
  type: "rescue", peopleAffected: 3, description: "Water rising",
} as EmergencyRequest;

describe("dispatch slip", () => {
  it("masks the phone by default", () => {
    expect(buildDispatchSlip(r)).not.toContain("03001234567");
  });
  it("includes full phone only when asked", () => {
    expect(buildDispatchSlip(r, true)).toContain("03001234567");
  });
});
