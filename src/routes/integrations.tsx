import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/site/Status";
import { INTEGRATIONS, PLANNED_SERVICES } from "@/lib/api/integrations";
import { platformHealthOptions } from "@/lib/api/service-health-query";
import { healthTime, serviceStatus } from "@/lib/api/service-health";

export const Route = createFileRoute("/integrations")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(platformHealthOptions());
  },
  head: () => ({
    meta: [
      { title: "Service Status & Integrations — KP FloodGuard AI" },
      {
        name: "description",
        content:
          "Recorded service health for Open-Meteo, GloFAS, database, n8n chat and historical data, with last success and error times.",
      },
      { property: "og:title", content: "Service Status & Integrations — KP FloodGuard AI" },
      {
        property: "og:description",
        content:
          "Evidence-based connection status and recorded successes and errors for KP FloodGuard AI services.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsPage,
});
function IntegrationsPage() {
  const { data } = useSuspenseQuery(platformHealthOptions());
  return (
    <>
      <PageHeader
        eyebrow="Service health"
        title="Integrations"
        description="Recorded connection status, successful checks and service errors."
      />
      <div className="container-page space-y-8 py-10">
        {data.error && <p role="alert">{data.error}</p>}
        <section aria-label="Service status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((service) => {
            const health = data.health.find((h) => h.service === service.service);
            const status = serviceStatus(health);
            return (
              <article key={service.service} className="rounded-lg border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-bold">{service.name}</h2>
                  <Badge
                    variant={
                      status === "Connected"
                        ? "resolved"
                        : status === "Degraded"
                          ? "review"
                          : "pending"
                    }
                  >
                    {status}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{service.purpose}</p>
                <dl className="mt-4 space-y-2 text-xs">
                  <div>
                    <dt className="font-semibold">Last success</dt>
                    <dd>{healthTime(health?.lastSuccessAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Last error</dt>
                    <dd className="break-words">{health?.lastErrorText ?? "None recorded"}</dd>
                    {health?.lastErrorAt && <dd>{healthTime(health.lastErrorAt)}</dd>}
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
        <section aria-labelledby="planned">
          <h2 id="planned" className="text-lg font-bold">
            Planned services
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {PLANNED_SERVICES.map((name) => (
              <article
                key={name}
                className="flex items-center justify-between gap-3 rounded-lg border p-5"
              >
                <h3 className="font-semibold">{name}</h3>
                <Badge variant="outline">Planned</Badge>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
