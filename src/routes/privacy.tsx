import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Status";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — KP FloodGuard AI" },
      { name: "description", content: "How KP FloodGuard AI handles your information." },
      { property: "og:title", content: "Privacy Policy — KP FloodGuard AI" },
      { property: "og:description", content: "How KP FloodGuard AI handles your information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const SECTIONS: { h: string; p: string }[] = [
  {
    "h": "What we collect",
    "p": "When you send an emergency request we store your name, phone number, district, tehsil, location, emergency type, number of people and description, plus a tracking code. If you subscribe to alerts we store your contact, chosen districts and language."
  },
  {
    "h": "Who can see it",
    "p": "Only signed-in coordinators can read emergency requests. Phone numbers are masked until a coordinator reveals them to verify a request. Status changes are logged."
  },
  {
    "h": "Rate limiting",
    "p": "To stop abuse we store a one-way hash of your connection address for a short time. We do not store the address itself."
  },
  {
    "h": "Your browser",
    "p": "We save your language choice and, if you are offline, an unsent request in your browser so it can be sent once you are back online. Sign-in for coordinators keeps a session in the browser."
  },
  {
    "h": "Visitor analytics",
    "p": "Lovable's analytics uses no cookies, stores nothing on your device, doesn't keep IP addresses and doesn't identify visitors. It records pages visited, where visitors came from, country, browser, operating system and device type, time on page, page speed, errors and clicks on buttons and links. These are recorded for every visitor. Detailed data is kept for 90 days and daily summaries for a year. Lovable collects this data for us; Lovable's privacy policy (lovable.dev/privacy) explains how it handles it."
  },
  {
    "h": "Other services",
    "p": "Weather and river data come from Open-Meteo and GloFAS. Messages to the assistant are processed by our AI service to write a reply. Map tiles load from OpenStreetMap."
  }
];

function Page() {
  return (
    <>
      <PageHeader eyebrow="Trust" title="Privacy Policy" description="How KP FloodGuard AI handles your information." />
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
