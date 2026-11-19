import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Logo } from "./Logo";
import { useSuspenseQuery } from "@tanstack/react-query";
import { platformHealthOptions } from "@/lib/api/service-health-query";
import { healthTime } from "@/lib/api/service-health";

export const DISCLAIMER =
  "This platform is an AI-assisted prototype for flood monitoring and emergency coordination. It does not replace official emergency services. In immediate danger, contact the relevant official rescue authorities.";

export function SiteFooter() {
  const { data } = useSuspenseQuery(platformHealthOptions());
  return (
    <footer className="bg-navy-deep pb-24 text-navy-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-muted">
            KP FloodGuard AI combines stored weather forecasts, modelled river discharge and
            AI-assisted risk scoring with emergency request review by coordinators.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
          <FooterCol title="Platform">
            <FooterLink to="/" hash="about">
              About KP FloodGuard AI
            </FooterLink>
            <FooterLink to="/" hash="features">
              Features
            </FooterLink>
            <FooterLink to="/dashboard">Flood Dashboard</FooterLink>
            <FooterLink to="/map">Interactive Map</FooterLink>
            <FooterLink to="/responsible-ai">Responsible AI & Privacy</FooterLink>
          </FooterCol>

          <FooterCol title="Assistance">
            <FooterLink to="/emergency">Emergency Assistance</FooterLink>
            <FooterLink to="/track">Track your request</FooterLink>
            <FooterLink to="/subscribe">Subscribe to alerts</FooterLink>
            <FooterLink to="/login">Coordinator login</FooterLink>
            <FooterLink to="/integrations">Integrations</FooterLink>
            <FooterLink to="/contact">Contact</FooterLink>
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/terms">Terms of Use</FooterLink>
          </FooterCol>

          <FooterCol title="Official helplines">
            <li>
              <a className="hover:underline" href="tel:1122">
                Rescue 1122
              </a>
            </li>
            <li>
              <a className="hover:underline" href="tel:1700">
                PDMA KP · 1700
              </a>
            </li>
            <li>
              <a className="hover:underline" href="tel:15">
                Police · 15
              </a>
            </li>
            <li>
              <a className="hover:underline" href="tel:115">
                Edhi Ambulance · 115
              </a>
            </li>
          </FooterCol>
        </div>
      </div>

      <div id="disclaimer" className="border-t border-navy-line">
        <div className="container-page flex gap-3 py-6 text-sm text-navy-muted">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-emergency" aria-hidden />
          <p>
            <strong className="text-navy-foreground">Disclaimer: </strong>
            {DISCLAIMER}
          </p>
        </div>
      </div>
      <div className="border-t border-navy-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-navy-muted sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} KP FloodGuard AI · Experimental estimates, not official
            warnings
          </p>
          <div aria-label="Data sources" className="space-y-1">
            <p>Weather: Open-Meteo · Last updated {healthTime(data.sourceTimes.weather)}</p>
            <p>Modelled discharge: GloFAS · Last updated {healthTime(data.sourceTimes.flood)}</p>
            <p>
              AI-assisted risk scoring: stored assessments · Last updated{" "}
              {healthTime(data.sourceTimes.risk)}
            </p>
            <p>
              Historical records: {data.historicalCount ? data.historicalSource : "Not available"}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="eyebrow text-navy-muted">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({
  to,
  hash,
  children,
}: {
  to:
    | "/"
    | "/dashboard"
    | "/map"
    | "/emergency"
    | "/login"
    | "/integrations"
    | "/contact"
    | "/responsible-ai"
    | "/subscribe"
    | "/track"
    | "/privacy"
    | "/terms";
  hash?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link to={to} {...(hash ? { hash } : {})} className="hover:underline">
        {children}
      </Link>
    </li>
  );
}
