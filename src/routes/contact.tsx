import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Phone } from "lucide-react";
import { PageHeader } from "@/components/site/Demo";
import { DISCLAIMER } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Contact & Helplines — KP FloodGuard AI" },
      { name: "description", content: "Official emergency helplines for Khyber Pakhtunkhwa and contact information for the KP FloodGuard AI project." },
      { property: "og:title", content: "Contact & Helplines — KP FloodGuard AI" },
      { property: "og:description", content: "Rescue 1122, PDMA KP and other official helplines." },
    ],
  }),
  component: ContactPage,
});

const HELPLINES = [
  { name: "Rescue 1122", number: "1122", note: "Emergency rescue & ambulance" },
  { name: "PDMA Khyber Pakhtunkhwa", number: "1700", note: "Provincial disaster management helpline" },
  { name: "Police", number: "15", note: "Police emergency" },
  { name: "Edhi Ambulance", number: "115", note: "Ambulance service" },
];

function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Contact & Official Helplines"
        description="For any life-threatening situation, contact official services directly."
      />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="helplines">
          <h2 id="helplines" className="text-xl font-bold">Official emergency helplines</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {HELPLINES.map((h) => (
              <li key={h.number}>
                <a
                  href={`tel:${h.number}`}
                  className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-emergency"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-emergency-soft text-emergency">
                    <Phone className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-mono text-2xl font-bold">{h.number}</span>
                    <span className="block text-sm font-semibold">{h.name}</span>
                    <span className="block text-xs text-muted-foreground">{h.note}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Please verify helpline numbers with local authorities before relying on them in an emergency.</p>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h2 className="font-bold">Project team</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              KP FloodGuard AI is a prototype developed for research and innovation-competition
              demonstration. Project contact details will be published here.
            </p>
          </div>
          <div id="disclaimer" className="rounded-xl border border-emergency/40 bg-emergency-soft p-5">
            <h2 className="flex items-center gap-2 font-bold text-emergency">
              <AlertTriangle className="size-4" aria-hidden /> Disclaimer
            </h2>
            <p className="mt-2 text-sm">{DISCLAIMER}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
