import { createServerFn } from "@tanstack/react-start";

export const getRiskAssessments = createServerFn({ method: "GET" }).handler(async () => {
  const { readLatestAssessments } = await import("./assessments.server");
  return readLatestAssessments();
});

