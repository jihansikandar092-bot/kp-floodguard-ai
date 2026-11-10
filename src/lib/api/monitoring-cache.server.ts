import { LIVE_STALE_TIME } from "./live-data";

// Worker Cache API shares successful public responses across invocations at the edge.
// The in-flight map deduplicates concurrent SSR/RPC requests within an isolate.
const memory = new Map<string, { body: string; status: number; headers: [string, string][]; expires: number }>();
const inflight = new Map<string, Promise<Response>>();
type EdgeCache = { match: (request: Request) => Promise<Response | undefined>; put: (request: Request, response: Response) => Promise<void> };

export const cachedMonitoringFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  const key = new Request(url);
  const edge = (globalThis as typeof globalThis & { caches?: { default?: EdgeCache } }).caches?.default;
  const saved = memory.get(url);
  if (saved && saved.expires > Date.now()) return new Response(saved.body, { status: saved.status, headers: [...saved.headers, ["x-monitoring-cache", "hit"]] });
  if (edge) {
    try {
      const hit = await edge.match(key);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("x-monitoring-cache", "hit");
        return new Response(await hit.text(), { status: hit.status, headers });
      }
    } catch (error) { console.warn("Monitoring edge cache read failed", String(error)); }
  }
  const pending = inflight.get(url);
  if (pending) return (await pending).clone();
  const work = (async () => {
    const response = await fetch(input, init);
    const body = await response.text();
    const headers = new Headers(response.headers);
    if (response.ok) {
      headers.set("x-monitoring-updated-at", new Date().toISOString());
      headers.set("cache-control", "public, max-age=900");
    }
    // Back off briefly on 429; never treat an error as successful data.
    const ttl = response.ok ? LIVE_STALE_TIME : response.status === 429 ? 60000 : 0;
    if (ttl) memory.set(url, { body, status: response.status, headers: [...headers.entries()], expires: Date.now() + ttl });
    const result = new Response(body, { status: response.status, headers });
    if (response.ok && edge) {
      try { await edge.put(key, result.clone()); } catch (error) { console.warn("Monitoring edge cache write failed", String(error)); }
    }
    return result;
  })();
  inflight.set(url, work);
  try { return (await work).clone(); } finally { inflight.delete(url); }
};