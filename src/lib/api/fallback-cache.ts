import type { LiveMonitoring } from "./live-data";

const PREFIX = "kpfg:fallback:";
export interface CachedFallback {
  savedAt: string;
  data: LiveMonitoring;
}

export function readFallbackCache(id: string, storage?: Storage): CachedFallback | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedFallback>;
    if (typeof parsed.savedAt !== "string" || !Array.isArray(parsed.data?.districts)) return null;
    if (Number.isNaN(Date.parse(parsed.savedAt))) return null;
    return parsed as CachedFallback;
  } catch {
    return null;
  }
}

export function writeFallbackCache(id: string, data: LiveMonitoring, storage?: Storage) {
  try {
    const entry: CachedFallback = { savedAt: new Date().toISOString(), data };
    (storage ?? window.localStorage).setItem(PREFIX + id, JSON.stringify(entry));
    return entry;
  } catch {
    return null;
  }
}
