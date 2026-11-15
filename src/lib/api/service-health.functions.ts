import { createServerFn } from "@tanstack/react-start";

export const getPlatformHealth = createServerFn({ method: "GET" }).handler(async () => {
  const { readPlatformHealth } = await import("./service-health.server");
  return readPlatformHealth();
});
