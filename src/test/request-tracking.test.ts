import { describe, expect, it } from "vitest";
import type { EmergencyRequest } from "@/lib/emergency";
import { filterRequests, requestsToCsv } from "@/lib/request-display";
import { phoneMatchesLast4, trackInputSchema } from "@/lib/track-rules";

const base: EmergencyRequest = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "KPF-2026-0001",
  createdAt: "2026-11-15T10:00:00Z",
  updatedAt: "2026-11-15T10:00:00Z",
  status: "pending",
  language: "en",
  isTest: false,
  fullName: "Test Person",
  phone: "+923001234567",
  district: "Swat",
  tehsil: "Mingora",
  location: "Near bazaar",
  type: "rescue",
  peopleAffected: 3,
  description: "Water rising",
  assignedTeam: null,
  internalNote: null,
};

const all = {
  district: "all",
  type: "all",
  status: "all",
  language: "all",
  hideTest: false,
  q: "",
};

describe("track input rules", () => {
  it("accepts a valid code and 4 digits", () => {
    expect(trackInputSchema.safeParse({ code: "kpf-2026-0001", last4: "4567" }).success).toBe(true);
  });
  it("rejects a malformed code", () => {
    expect(trackInputSchema.safeParse({ code: "ABC-1", last4: "4567" }).success).toBe(false);
  });
  it("rejects non-4-digit phone input", () => {
    expect(trackInputSchema.safeParse({ code: "KPF-2026-0001", last4: "456" }).success).toBe(false);
    expect(trackInputSchema.safeParse({ code: "KPF-2026-0001", last4: "45678" }).success).toBe(
      false,
    );
  });
  it("matches phone by last 4 digits only", () => {
    expect(phoneMatchesLast4("+923001234567", "4567")).toBe(true);
    expect(phoneMatchesLast4("0300 1234567", "4567")).toBe(true);
    expect(phoneMatchesLast4("+923001234567", "4568")).toBe(false);
    expect(phoneMatchesLast4("123", "4567")).toBe(false);
  });
});

describe("request filters", () => {
  const rows = [
    base,
    { ...base, id: "2", code: "KPF-2026-0002", language: "ur" as const },
    { ...base, id: "3", code: "KPF-2026-0003", isTest: true },
  ];
  it("filters by language", () => {
    const out = filterRequests(rows, { ...all, language: "ur" });
    expect(out.map((r) => r.code)).toEqual(["KPF-2026-0002"]);
  });
  it("hides test requests when hideTest is on", () => {
    const out = filterRequests(rows, { ...all, hideTest: true });
    expect(out.map((r) => r.code)).toEqual(["KPF-2026-0001", "KPF-2026-0002"]);
  });
  it("shows test requests when hideTest is off", () => {
    expect(filterRequests(rows, all)).toHaveLength(3);
  });
});

describe("CSV export", () => {
  it("exports only the last 4 phone digits, never the full phone number", () => {
    const csv = requestsToCsv([base]);
    expect(csv.split("\n")[1]?.split(",")[10]).toBe("•••• 4567");
    expect(csv).not.toContain("+923001234567");
  });
  it("writes a header and one line per row", () => {
    const csv = requestsToCsv([base]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("code,created_at,status");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("KPF-2026-0001");
  });
  it("escapes commas, quotes and newlines", () => {
    const tricky = { ...base, fullName: 'Khan, "Jim"', location: "line1\nline2" };
    const csv = requestsToCsv([tricky]);
    expect(csv).toContain('"Khan, ""Jim"""');
    expect(csv).toContain('"line1\nline2"');
  });
});
