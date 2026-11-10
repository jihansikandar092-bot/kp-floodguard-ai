import { createServerFn } from "@tanstack/react-start";
import { fetchLiveData } from "./live-data";

export const getLiveMonitoring = createServerFn({ method: "GET" }).handler(() => fetchLiveData());