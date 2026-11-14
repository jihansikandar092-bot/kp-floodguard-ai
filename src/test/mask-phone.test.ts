import { describe, expect, it } from "vitest";
import { maskPhone } from "@/lib/request-display";

describe("maskPhone", () => {
  it("shows only the last 4 digits", () => {
    expect(maskPhone("+923001234567")).toBe("•••• 4567");
  });
  it("hides very short numbers fully", () => {
    expect(maskPhone("123")).toBe("••••");
  });
});
