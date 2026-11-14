import { queryOptions } from "@tanstack/react-query";
import { LIVE_STALE_TIME } from "@/lib/api/live-data";
import { getRiskAssessments } from "./risk.functions";

export const riskAssessmentOptions = () =>
  queryOptions({
    queryKey: ["risk-assessments"],
    queryFn: () => getRiskAssessments(),
    staleTime: LIVE_STALE_TIME,
    refetchInterval: LIVE_STALE_TIME,
    retry: 1,
  });
