import { queryOptions } from "@tanstack/react-query";
import { getPlatformHealth } from "./service-health.functions";

export const platformHealthOptions = () =>
  queryOptions({
    queryKey: ["platform-health"],
    queryFn: () => getPlatformHealth(),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
