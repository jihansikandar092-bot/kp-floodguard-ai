import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { alertsOptions } from "@/lib/alerts/alerts-query";
import { districtListOptions } from "@/lib/api/district-query";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { PageHeader } from "@/components/site/Demo";
export const Route = createFileRoute("/alerts")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(alertsOptions()),
      context.queryClient.ensureQueryData(districtListOptions()),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Predictive Flood Alerts — KP FloodGuard AI" },
      {
        name: "description",
        content:
          "Expected, active and recently resolved experimental flood alerts from stored weather and modelled discharge.",
      },
      { property: "og:title", content: "Predictive Flood Alerts — KP FloodGuard AI" },
      {
        property: "og:description",
        content: "District risk outlook alerts, not official warnings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
});
function AlertsPage() {
  const { data: districts } = useSuspenseQuery(districtListOptions());
  return (
    <>
      <PageHeader
        eyebrow="Modelled flood outlook"
        title="Flood alerts"
        description="Expected, active and recently resolved"
      />
      <div className="container-page py-8">
        <AlertsPanel districts={districts} />
      </div>
    </>
  );
}
