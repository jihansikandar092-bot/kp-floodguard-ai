import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOpenRequestCounts } from "@/lib/api/requests.functions";
import { districtListOptions } from "@/lib/api/district-query";

const LazyMap = lazy(() => import("./AdminRequestMapLeaflet"));

function MapFallback() {
  return (
    <div
      className="flex h-[380px] items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground"
      role="status"
    >
      Loading map…
    </div>
  );
}

/** Coordinators only: open (unresolved, non-test) request counts per district on a KP map. */
export function AdminRequestMap() {
  const countsFn = useServerFn(getOpenRequestCounts);
  const counts = useQuery({
    queryKey: ["open-request-counts"],
    queryFn: () => countsFn(),
    refetchInterval: 30_000,
    retry: false,
  });
  const districts = useQuery(districtListOptions());

  if (counts.isError || districts.isError)
    return (
      <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
        Request map temporarily unavailable.
      </p>
    );
  if (!counts.data?.authorized) return null;

  return (
    <section className="space-y-3" aria-label="Open requests map">
      <div>
        <h2 className="text-lg font-bold">Open requests by district</h2>
        <p className="text-sm text-muted-foreground">
          Unresolved requests from the database, refreshes every 30 seconds. Test requests are
          excluded.
        </p>
      </div>
      <div className="h-[380px] overflow-hidden rounded-xl border shadow-card">
        <ClientOnly fallback={<MapFallback />}>
          <Suspense fallback={<MapFallback />}>
            <LazyMap counts={counts.data.counts} districts={districts.data ?? []} />
          </Suspense>
        </ClientOnly>
      </div>
    </section>
  );
}
