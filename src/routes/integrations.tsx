import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/site/Demo";
import { INTEGRATIONS } from "@/lib/api/integrations";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations & Architecture — KP FloodGuard AI" },
      { name: "description", content: "Planned data and AI integrations for KP FloodGuard AI: Open-Meteo, GloFAS, ML prediction API, OpenAI, Retell AI, n8n and Google Sheets." },
      { property: "og:title", content: "Integrations & Architecture — KP FloodGuard AI" },
      { property: "og:description", content: "How weather, river, ML and AI services plug into the platform." },
    ],
  }),
  component: IntegrationsPage,
});

const FLOW = [
  { title: "Data sources", items: ["Open-Meteo weather", "GloFAS river discharge", "Historical flood records"] },
  { title: "Intelligence", items: ["Python ML risk model", "OpenAI emergency chatbot", "Retell AI voice agent"] },
  { title: "Action", items: ["Dashboard & map", "n8n request routing", "Google Sheets coordination"] },
];

function IntegrationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Technology integration"
        title="Integrations & Architecture"
        description="The platform is modular: each service below plugs into a dedicated slot. None are connected yet — they will be switched on only after being wired up and tested."
      />
      <div className="container-page space-y-12 py-10">
        <section aria-labelledby="flow">
          <h2 id="flow" className="text-xl font-bold">Data flow</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {FLOW.map((col, i) => (
              <div key={col.title} className="relative rounded-xl border bg-card p-5 shadow-card">
                <p className="eyebrow text-emergency">Layer {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold">{col.title}</h3>
                <ul className="mt-4 space-y-2">
                  {col.items.map((it) => (
                    <li key={it} className="rounded-md bg-muted px-3 py-2 text-sm font-medium">{it}</li>
                  ))}
                </ul>
                {i < FLOW.length - 1 && (
                  <ArrowDown className="absolute -bottom-5 left-1/2 size-5 -translate-x-1/2 text-muted-foreground md:hidden" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="services">
          <h2 id="services" className="text-xl font-bold">Services</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((i) => (
              <article key={i.id} className="flex flex-col rounded-xl border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{i.name}</h3>
                  <Badge variant="pending" className="shrink-0 gap-1">
                    <CircleDashed className="size-3" aria-hidden /> Not connected
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{i.purpose}</p>
                <p className="mt-auto pt-4 text-xs">
                  <span className="eyebrow text-muted-foreground">Powers · </span>
                  {i.powers}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
