import { queryOptions } from "@tanstack/react-query";
import { getHistoricalData } from "./history.functions";

export const historicalOptions = () => queryOptions({ queryKey: ["historical-statistics"], queryFn: () => getHistoricalData(), staleTime: 15*60*1000, refetchInterval: 15*60*1000, retry: 1 });