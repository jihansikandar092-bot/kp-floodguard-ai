import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CloudRain,
  Database,
  History,
  Map as MapIcon,
  Mic,
  Radar,
  Siren,
  Users,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPSchematicMap } from "@/components/landing/KPSchematicMap";
import { MapLegend } from "@/components/map/KPMap";
import { LiveStatus, MonitoringError, MonitoringPending } from "@/components/dashboard/LiveStatus";
import { useSuspenseQuery } from "@tanstack/react-query";
import { liveMonitoringOptions } from "@/lib/api/monitoring-query";
import { liveSnapshot } from "@/lib/api/live-data";
import { DISTRICTS } from "@/lib/data/districts";
import riverImg from "@/assets/swat-river-monitoring.jpg";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(liveMonitoringOptions());
  },
  pendingComponent: MonitoringPending,
  errorComponent: MonitoringError,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "KP FloodGuard AI — Smarter Flood Monitoring. Safer Communities." },
      {
        name: "description",
        content:
          "AI-powered flood prediction and emergency assistance for Khyber Pakhtunkhwa: district monitoring, river levels, interactive map and an emergency assistant.",
      },
      {
        property: "og:title",
        content: "KP FloodGuard AI — Smarter Flood Monitoring. Safer Communities.",
      },
      {
        property: "og:description",
        content: "AI-powered flood prediction and emergency assistance for Khyber Pakhtunkhwa.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Radar,
    title: "District-wise flood monitoring",
    text: "Track conditions across KP districts in one consolidated view.",
  },
  {
    icon: CloudRain,
    title: "Rainfall & weather monitoring",
    text: "Rainfall, temperature, humidity and wind per district.",
  },
  {
    icon: Waves,
    title: "River water level monitoring",
    text: "River levels plotted against their danger marks.",
  },
  {
    icon: History,
    title: "Historical flood analysis",
    text: "Learn from past flood seasons such as 2010 and 2022.",
  },
  {
    icon: BrainCircuit,
    title: "ML flood-risk prediction",
    text: "Risk scores from models trained on weather and flood history.",
  },
  {
    icon: MapIcon,
    title: "Interactive KP flood map",
    text: "Colour-coded district risk with one-click details.",
  },
  {
    icon: Bot,
    title: "AI emergency chat assistant",
    text: "Guided help in English and Urdu, with Pashto planned.",
  },
  {
    icon: Mic,
    title: "Voice-based assistance",
    text: "Speak instead of type — designed for Retell AI voice calls.",
  },
  {
    icon: Users,
    title: "Rescue request coordination",
    text: "Coordinators triage, assign and track every request.",
  },
];

const STEPS = [
  {
    n: "01",
    icon: Database,
    title: "Collect",
    text: "Gather weather forecasts, river discharge and historical flood records for every district.",
  },
  {
    n: "02",
    icon: BrainCircuit,
    title: "Analyse",
    text: "Machine-learning models combine the signals into a flood-risk score per district.",
  },
  {
    n: "03",
    icon: Siren,
    title: "Act",
    text: "Show risks on the dashboard and map, and route citizens' emergency requests to coordinators.",
  },
];

function Index() {
  const { data } = useSuspenseQuery(liveMonitoringOptions());
  const totals = liveSnapshot(data).totals;
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-deep text-navy-foreground">
        <div
          className="absolute inset-0 grid-lines opacity-40 [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_75%)]"
          aria-hidden
        />
        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-navy-line px-3 py-1.5 text-navy-muted">
              <span className="size-1.5 rounded-full bg-emergency" aria-hidden /> Khyber Pakhtunkhwa
              · Flood Intelligence
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Smarter Flood Monitoring.
              <br />
              <span className="text-emergency">Safer</span> Communities.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-muted">
              AI-powered flood prediction and emergency assistance for Khyber Pakhtunkhwa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="navy-solid">
                <Link to="/dashboard">
                  Explore Flood Dashboard <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="emergency">
                <Link to="/emergency">
                  <Siren /> Request Emergency Help
                </Link>
              </Button>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-navy-line pt-6">
              <HeroStat
                k="Districts monitored"
                v={data.referenceCount ? String(data.referenceCount) : "Not available"}
              />
              <HeroStat k="Rainfall (24h · mm)" v={String(totals.rainfall24h ?? "Not available")} />
              <HeroStat k="Temperature (°C)" v={String(totals.temperature ?? "Not available")} />
            </dl>
          </div>

          <div className="relative animate-fade-up [animation-delay:150ms]">
            <div className="relative mx-auto aspect-[3/4] max-w-md rounded-2xl border border-navy-line bg-navy-deep/60 p-5 shadow-float">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-navy-muted">KP Risk Monitor</p>
                <span className="text-xs text-navy-muted">District locations</span>
              </div>
              <div className="relative mt-3 h-[calc(100%-5.5rem)]">
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[85%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-navy-line"
                  aria-hidden
                >
                  <div className="absolute inset-0 animate-sweep [background:conic-gradient(from_0deg,transparent_0deg,transparent_300deg,var(--navy-line)_360deg)] opacity-70" />
                </div>
                <KPSchematicMap />
              </div>
              <div className="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-lg border border-navy-line bg-navy px-3 py-2 text-xs">
                <span className="text-navy-muted">Flood risk: Not available</span>
                <span className="[&_li]:text-navy-foreground">
                  <MapLegend />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-4">
        <LiveStatus data={data} rows={data.districts} />
      </div>
      {/* ABOUT */}
      <section id="about" className="scroll-mt-28 py-20 lg:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            <img
              src={riverImg}
              alt="A swollen mountain river with a river-gauge monitoring station on its bank"
              width={1280}
              height={896}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card"
            />
            <div className="absolute -bottom-6 right-4 max-w-[240px] rounded-xl border bg-card p-4 shadow-float sm:right-[-1.5rem]">
              <p className="eyebrow text-muted-foreground">Signal sources</p>
              <p className="mt-2 text-sm font-semibold">
                Weather · River gauges · Flood history · Citizen reports
              </p>
            </div>
          </div>
          <div>
            <p className="eyebrow text-emergency">About the project</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
              One platform from early warning to rescue coordination
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                KP's river valleys — Swat, Kabul, Panjkora, Kurram and the Indus — are among the
                most flood-exposed in Pakistan. KP FloodGuard AI brings the signals that matter into
                one place.
              </p>
              <p>
                It combines <strong className="text-foreground">weather monitoring</strong>,{" "}
                <strong className="text-foreground">historical flood data</strong> and{" "}
                <strong className="text-foreground">machine learning</strong> to estimate
                district-level flood risk, and pairs it with an{" "}
                <strong className="text-foreground">AI emergency assistant</strong> that helps
                citizens report what they need — in their own language.
              </p>
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Built for KP's districts and rivers",
                "Bilingual: English and Urdu",
                "Coordinator-ready request tracking",
                "Modular, API-ready architecture",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-medium">
                  <span className="size-1.5 rounded-full bg-emergency" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="scroll-mt-28 border-y bg-muted/60 py-20 lg:py-28">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow text-emergency">Key features</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
              Everything a flood season demands
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-card p-6 transition-colors hover:bg-secondary/50"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-28 py-20 lg:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-emergency">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
              Data in. Risk out. Help on the way.
            </h2>
          </div>
          <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
            <div
              className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-border md:block"
              aria-hidden
            />
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="relative rounded-2xl border bg-card p-6 text-center shadow-card"
              >
                <span className="relative mx-auto grid size-16 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground">
                  <s.icon className="size-6" aria-hidden />
                </span>
                <p className="eyebrow mt-5 text-muted-foreground">Step {s.n}</p>
                <h3 className="mt-1 text-xl font-bold">{s.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="pb-20 lg:pb-28">
        <div className="container-page grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 rounded-2xl bg-primary p-8 text-primary-foreground">
            <div>
              <BarChart3 className="size-7" aria-hidden />
              <h2 className="mt-4 text-2xl font-extrabold">Explore district risk</h2>
              <p className="mt-2 text-primary-foreground/75">
                Rainfall, river levels, history and risk comparison for Swat, Nowshera, Bannu, Upper
                Dir and Mardan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="navy-solid">
                <Link to="/dashboard">
                  Open dashboard <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="on-navy">
                <Link to="/map">View flood map</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-2xl border-2 border-emergency bg-emergency-soft p-8">
            <div>
              <Siren className="size-7 text-emergency" aria-hidden />
              <h2 className="mt-4 text-2xl font-extrabold">Need help now?</h2>
              <p className="mt-2 text-muted-foreground">
                Submit a rescue, medical, food, water or shelter request. If life is in immediate
                danger, call{" "}
                <a href="tel:1122" className="font-bold text-emergency underline">
                  Rescue 1122
                </a>{" "}
                first.
              </p>
            </div>
            <div>
              <Button asChild variant="emergency" size="lg">
                <Link to="/emergency">Request Emergency Help</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroStat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dd className="font-mono text-xl font-bold break-words">{v}</dd>
      <dt className="mt-1 text-xs text-navy-muted">{k}</dt>
    </div>
  );
}
