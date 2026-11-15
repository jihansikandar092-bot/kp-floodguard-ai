import { describe, it, expect } from "vitest";
import { serviceStatus, type ServiceHealth } from "@/lib/api/service-health";
const health: ServiceHealth = {service:"Open-Meteo",lastSuccessAt:"2026-11-15T01:00:00Z",lastErrorAt:null,lastErrorText:null};
describe("recorded service status", () => {
  it("never claims connected without a recorded success", () => {
    expect(serviceStatus(undefined)).toBe("Not connected");
    expect(serviceStatus({...health,lastSuccessAt:null,lastErrorAt:"2026-11-15T02:00:00Z"})).toBe("Not connected");
  });
  it("marks a later failure degraded while retaining the last success", () => {
    expect(serviceStatus({...health,lastErrorAt:"2026-11-15T02:00:00Z"})).toBe("Degraded");
  });
  it("a later successful check restores connected without erasing old errors", () => {
    expect(serviceStatus({...health,lastErrorAt:"2026-11-15T00:00:00Z"})).toBe("Connected");
  });
});