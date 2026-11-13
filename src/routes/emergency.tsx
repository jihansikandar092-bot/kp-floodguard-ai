import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Bot, CheckCircle2, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DemoBadge, PageHeader } from "@/components/site/Demo";
import { EmergencyForm } from "@/components/emergency/EmergencyForm";
import { openAssistant } from "@/lib/assistant/events";
import { formatPkt } from "@/lib/request-display";
import { EMERGENCY_TYPE_LABEL, type EmergencyRequest } from "@/lib/emergency";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Request Emergency Help — KP FloodGuard AI" },
      { name: "description", content: "Submit a flood emergency request for rescue, medical assistance, food, drinking water or shelter in Khyber Pakhtunkhwa." },
      { property: "og:title", content: "Request Emergency Help — KP FloodGuard AI" },
      { property: "og:description", content: "Report rescue, medical, food, water or shelter needs during floods in KP." },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const [submitted, setSubmitted] = useState<EmergencyRequest | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Emergency assistance"
        title="Request Emergency Help"
        description="Tell us what you need and where. Coordinators use these details to prioritise help."
      />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border bg-card p-5 shadow-card sm:p-8">
          {submitted ? (
            <Confirmation request={submitted} onReset={() => setSubmitted(null)} />
          ) : (
            <EmergencyForm
              onSubmitted={(r) => {
                setSubmitted(r);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border-2 border-emergency bg-emergency-soft p-5">
            <div className="flex items-center gap-2 font-bold text-emergency">
              <AlertTriangle className="size-5" aria-hidden /> In immediate danger?
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Call official rescue services first. This prototype does not dispatch rescue teams.
            </p>
            <div className="mt-4 grid gap-2">
              <Button asChild variant="emergency"><a href="tel:1122"><Phone /> Call Rescue 1122</a></Button>
              <Button asChild variant="outline"><a href="tel:1700"><Phone /> PDMA KP helpline 1700</a></Button>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <Bot className="size-6 text-primary" aria-hidden />
            <h2 className="mt-3 font-bold">Prefer to chat?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The assistant asks one question at a time, in English or Urdu.
            </p>
            <Button variant="outline" className="mt-4 w-full" onClick={openAssistant}>
              Open Emergency Assistant
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}

function Confirmation({ request, onReset }: { request: EmergencyRequest; onReset: () => void }) {
  const rows: [string, React.ReactNode][] = [
    ["Request ID", <span className="font-mono font-semibold">{request.id}</span>],
    ["Recorded", formatPkt(request.createdAt)],
    ["Emergency type", EMERGENCY_TYPE_LABEL[request.type].en],
    ["Name", request.fullName],
    ["Phone", request.phone],
    ["District / Tehsil", `${request.district} · ${request.tehsil}`],
    ["Exact location", request.location],
    ["People affected", request.peopleAffected],
    ["Description", request.description],
  ];
  return (
    <div className="animate-fade-up" role="status">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-2xl font-extrabold">Request recorded</h2>
          <p className="mt-1 text-muted-foreground">
            Reference <span className="font-mono font-semibold text-foreground">{request.id}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3 rounded-lg border border-demo-foreground/20 bg-demo p-4 text-sm text-demo-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong>Prototype notice:</strong> this request is saved on this device as a demo record and
          has <strong>not</strong> been sent to rescue teams. The coordination system (n8n and Google
          Sheets) is not connected yet. If anyone is in danger, call Rescue 1122 now.
        </p>
      </div>

      <dl className="mt-6 divide-y rounded-lg border">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button asChild variant="emergency"><a href="tel:1122"><Phone /> Call Rescue 1122</a></Button>
        <Button variant="outline" onClick={onReset}>Submit another request</Button>
        <Button asChild variant="ghost"><Link to="/admin">View in coordinator preview</Link></Button>
        <DemoBadge className="ml-auto" label="STATUS: PENDING · NOT DISPATCHED" />
      </div>
    </div>
  );
}
