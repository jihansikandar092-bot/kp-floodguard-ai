/**
 * Single service-worker registrar. Refuses (and unregisters /sw.js) in dev, iframes,
 * Lovable preview hosts and with ?sw=off, so previews never serve stale builds.
 */
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const PREVIEW_ROOTS = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];

export function swRefused(hostname: string, search: string, inIframe: boolean, prod: boolean) {
  const host = hostname.toLowerCase();
  const label = host.split(".")[0] ?? "";
  if (!prod || inIframe) return true;
  if (new URLSearchParams(search).get("sw") === "off") return true;
  const lovableRoot = PREVIEW_ROOTS.some((r) => host.endsWith(r));
  if (lovableRoot && PREVIEW_LABEL.test(label)) return true;
  if (lovableRoot && /^project--[a-z0-9-]+-dev$/.test(label)) return true;
  for (const root of ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) {
    if (host === root || host.endsWith(`.${root}`)) return true;
  }
  return false;
}

async function unregisterAppWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active ?? r.waiting ?? r.installing)?.scriptURL.endsWith("/sw.js"))
      .map((r) => r.unregister()),
  );
}

export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let inIframe = true;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  const refused = swRefused(
    window.location.hostname,
    window.location.search,
    inIframe,
    import.meta.env.PROD,
  );
  if (refused) {
    void unregisterAppWorkers().catch(() => undefined);
    return;
  }
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
    console.error("service worker registration failed", e);
  });
}
