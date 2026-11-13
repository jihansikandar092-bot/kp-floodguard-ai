import { describe, expect, it } from "vitest";
import { submitRequestSchema } from "@/lib/emergency";

const base = {
  fullName: "Test Citizen",
  phone: "0300-1234567",
  district: "Swat",
  tehsil: "Mingora",
  location: "Near main bazaar",
  type: "rescue",
  peopleAffected: 5,
  description: "Water entering the house",
};

describe("emergency request validation", () => {
  it("accepts 03XX-XXXXXXX and +92 3XX XXXXXXX", () => {
    expect(submitRequestSchema.safeParse(base).success).toBe(true);
    expect(submitRequestSchema.safeParse({ ...base, phone: "+92 300 1234567" }).success).toBe(true);
  });
  it("rejects non-mobile numbers", () => {
    expect(submitRequestSchema.safeParse({ ...base, phone: "091-1234567" }).success).toBe(false);
  });
  it("limits people affected to 1..10000", () => {
    expect(submitRequestSchema.safeParse({ ...base, peopleAffected: 0 }).success).toBe(false);
    expect(submitRequestSchema.safeParse({ ...base, peopleAffected: 10000 }).success).toBe(true);
    expect(submitRequestSchema.safeParse({ ...base, peopleAffected: 10001 }).success).toBe(false);
  });
  it("limits text length", () => {
    expect(submitRequestSchema.safeParse({ ...base, description: "x".repeat(1001) }).success).toBe(
      false,
    );
  });
  it("defaults is_test to false", () => {
    expect(submitRequestSchema.parse(base).isTest).toBe(false);
  });
});
