import { createServerFn } from "@tanstack/react-start";

export const getAlerts = createServerFn({ method: "GET" }).handler(async () => {
  const { readAlerts } = await import("./alerts.server");
  return readAlerts();
});
