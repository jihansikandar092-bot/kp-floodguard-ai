import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Status";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — KP FloodGuard AI" },
      { name: "description", content: "Rules and limits for using the KP FloodGuard AI prototype." },
      { property: "og:title", content: "Terms of Use — KP FloodGuard AI" },
      { property: "og:description", content: "Rules and limits for using the KP FloodGuard AI prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const SECTIONS: { h: string; p: string }[] = [
  {
    "h": "Prototype only",
    "p": "This service is an experimental prototype for flood monitoring and emergency coordination. It is not an official warning system and does not replace PDMA KP, NDMA or Rescue 1122."
  },
  {
    "h": "No guarantee",
    "p": "Risk levels are model estimates from weather and river data. Data may be delayed, missing or wrong. Do not rely on this site alone for safety decisions."
  },
  {
    "h": "Emergency requests",
    "p": "Sending a request does not dispatch rescue. Coordinators review requests and may contact official services. Always call Rescue 1122 in immediate danger."
  },
  {
    "h": "Fair use",
    "p": "Do not send false requests or try to misuse the service. Requests are rate limited."
  }
];

function Page() {
  return (
    <>
      <PageHeader eyebrow="Trust" title="Terms of Use" description="Rules and limits for using the KP FloodGuard AI prototype." />
      <div className="container-page max-w-3xl space-y-6 py-10">
        <p className="rounded-xl border border-emergency/40 bg-emergency-soft p-4 text-sm">
          KP FloodGuard AI is a prototype. Official flood warnings come only from PDMA KP, NDMA and
          Rescue 1122. In immediate danger, call Rescue 1122.
        </p>
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-bold">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </div>
    </>
  );
}
