import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Status";
import { HowScoreWorks, RISK_DISCLAIMER } from "@/components/risk/RiskExplain";
import { RISK_CONFIG } from "@/lib/risk/engine";
import { HORIZONS, horizonLabel } from "@/lib/risk/outlook";

export const Route = createFileRoute("/responsible-ai")({
  head: () => ({
    meta: [
      { title: "Responsible AI & Privacy — KP FloodGuard AI" },
      {
        name: "description",
        content:
          "How KP FloodGuard AI uses environmental data, calculates experimental flood risk, protects emergency requests and keeps coordinators in control.",
      },
      { property: "og:title", content: "Responsible AI & Privacy — KP FloodGuard AI" },
      {
        property: "og:description",
        content:
          "Risk scoring, limitations, data sources, human review and privacy for KP FloodGuard AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResponsibleAIPage,
});

function ResponsibleAIPage() {
  const config = RISK_CONFIG;
  return (
    <>
      <PageHeader
        eyebrow="Transparency and safety"
        title="Responsible AI & Privacy"
        description={RISK_DISCLAIMER}
      />
      <div className="container-page max-w-4xl space-y-8 py-10">
        <section lang="ur" dir="rtl" className="border-b pb-6">
          <h2 className="text-xl font-bold">اردو خلاصہ</h2>
          <p className="mt-3 leading-relaxed">
            یہ نظام موسم اور دریاؤں کے ماڈل شدہ بہاؤ سے سیلاب کے خطرے کا تجرباتی اندازہ دیتا ہے؛ یہ
            سرکاری انتباہ نہیں ہے۔ بہاؤ کے اعداد گیج کی پیمائش نہیں ہیں۔ نامکمل عوامل والے اسکور کو
            جزوی کہا جاتا ہے اور اصل خطرہ زیادہ ہو سکتا ہے۔ ہر امدادی درخواست کی تصدیق کوآرڈینیٹر
            کرتا ہے؛ مصنوعی ذہانت خود امدادی ٹیم نہیں بھیجتی۔ فوری خطرے میں ریسکیو 1122 کو فون کریں۔
            درخواست میں نام، فون، مقام اور صورتِ حال جمع ہوتے ہیں؛ یہ عوام کو نہیں دکھائے جاتے۔
            معلومات رکھنے کی مدت اور منصوبے کا حذف کرنے کے لیے رابطہ ابھی مقرر نہیں ہیں۔
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. What the system does and does not do</h2>
          <p>
            KP FloodGuard AI displays stored weather and modelled river discharge, calculates
            explainable experimental risk scores, generates system alerts and records citizen
            requests for human review. The assistant offers chat when its service is available,
            otherwise guided intake.
          </p>
          <p>
            It does not issue official warnings, measure river depth, guarantee safety or rescue, or
            automatically dispatch responders. No validated accuracy, partnership, certification or
            pilot is claimed.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Data sources</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Open-Meteo: weather forecasts and recent modelled rainfall.</li>
            <li>
              GloFAS through the Open-Meteo Flood API: modelled river discharge in m³/s, not gauge
              data, measured depth or an official danger threshold.
            </li>
            <li>ERA5 through the Open-Meteo Archive API: historical rainfall statistics.</li>
            <li>
              User-submitted emergency requests: reports from citizens, not independently verified
              observations until a coordinator checks them.
            </li>
          </ul>
          <p>
            Historical GloFAS data after July 2022 is an archived forecast, not reanalysis.
            Historical records distinguish the transition year from earlier reanalysis and later
            archived forecasts.
          </p>
          <p>
            Some district locations use approximate headquarters coordinates, not boundaries or
            verified gauge sites. Sources, last-success timestamps and retained readings are
            labelled; missing values are not invented.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. How the risk score works</h2>
          <HowScoreWorks />
          <p>
            Factors are scaled to 0–100 and combined as Σ(available factor score × weight) /
            Σ(available weights). Missing factors are excluded, not treated as zero; weights are
            renormalised over available factors. No assessment is produced if every factor is
            missing.
          </p>
          <p>
            Partial scores show how many factors are available and warn that a missing factor may
            mean the real risk is higher. Partial assessments cannot resolve an alert. Confidence is
            Low or Medium, never High; it is not a calibrated probability.
          </p>
          <p>
            Five-horizon outlook: {HORIZONS.map(horizonLabel).join(", ")}. Now uses the base
            assessment; later horizons use cumulative forecast rainfall and daily discharge over
            that horizon, with the same configured scaling references.
          </p>
          <h3 className="font-semibold">Current reference ratios</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Discharge peak ÷ median historical annual maximum:{" "}
              {config.references.dischargePeakVsHistory.low}–
              {config.references.dischargePeakVsHistory.high}.
            </li>
            <li>
              When historical discharge is unavailable, peak ÷ recent maximum:{" "}
              {config.references.dischargePeakVsOwnRange.low}–
              {config.references.dischargePeakVsOwnRange.high}.
            </li>
            <li>
              Predictive-alert horizon limit: {config.alerts.maxHorizonHours} hours; freshness
              window: {config.alerts.freshHours} hours; resolution requires{" "}
              {config.alerts.lowRunsToResolve} distinct complete Low runs across all outlook
              horizons.
            </li>
          </ul>
          <p>
            The displayed configuration is read directly from the same configuration object used by
            the engine.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Limitations and false alarm risk</h2>
          <p>
            The thresholds have not yet been validated against recorded floods. False alarms and
            missed events are possible. Forecast uncertainty, incomplete inputs, coarse model grids,
            approximate locations, missing historical records, rate limits and stale readings can
            affect estimates. A Low score is not proof of safety.
          </p>
          <p>
            Modelled discharge cannot establish a river's measured depth or local danger mark.
            Always follow official warnings and local conditions rather than relying on this score
            alone.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Human in the loop</h2>
          <p>
            Coordinators verify every request and decide its next steps. AI never dispatches rescue.
            Submitting a request does not guarantee a response or dispatch.
          </p>
          <a href="tel:1122" className="font-semibold text-emergency underline">
            In immediate danger, call Rescue 1122.
          </a>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Privacy</h2>
          <h3 className="font-semibold">Emergency requests and access</h3>
          <p>
            We collect your name, phone number, district, tehsil, location, emergency type, people
            affected, description and language, together with a reference code, status and
            submission/update times. Requests are stored in Lovable Cloud. Only authorised
            coordinators and administrators can read requests through the app; visitors and ordinary
            signed-in users cannot. Phone numbers are masked by default until an authorised reviewer
            reveals them. Privileged hosting services process the records to operate the platform.
          </p>
          <p>
            No automatic deletion schedule or fixed emergency-request retention period is currently
            configured. Requests remain stored until an authorised operator deletes them. To ask for
            deletion or correction, use the{" "}
            <Link to="/contact" className="underline">
              contact page
            </Link>{" "}
            and provide your request reference. Project contact details are currently unavailable
            there, so a working deletion-request channel has not yet been established. Do not send
            privacy requests to emergency helplines.
          </p>
          <h3 className="font-semibold">Assistant, sign-in and abuse prevention</h3>
          <p>
            AI chat sends your message, a session identifier, language and compact public risk/alert
            context to the configured n8n workflow. That workflow may use additional AI services;
            its downstream providers and retention are not established in this site's configuration.
            Avoid sharing sensitive details in AI chat; use the emergency form for a
            coordinator-reviewed request. Guided intake stays in the current browser session until
            submitted.
          </p>
          <p>
            Coordinator sign-in sends credentials to Lovable Cloud auth and saves session
            information in browser storage. Request and chat limits store hashed IP-derived
            identifiers and timestamps, not raw IP addresses in those limit records. Chat-limit
            records older than an hour are pruned when the limiter runs; no automatic retention
            period is configured for emergency-submission limit records.
          </p>
          <h3 className="font-semibold">Browser storage and external services</h3>
          <p>
            The selected-district fallback caches environmental readings and their saved time in
            localStorage. They are reused for a short cache window, but have no automatic deletion
            schedule; clearing site storage removes them. It does not cache emergency requests.
            Open-Meteo receives district-coordinate requests, including browser fallback requests.
            OpenStreetMap receives map-tile requests, and Google Fonts receives font requests; those
            external services can receive connection metadata such as your IP address. No
            advertising pixels or embedded media were found in the app.
          </p>
          <h3 className="font-semibold">Visitor analytics</h3>
          <p>
            Clicks are recorded for every visitor on this site; there is no consent banner connected
            to analytics. Page visits, time on page, page speed and errors are also recorded for
            every visitor, without cookies and without identifying anyone.
          </p>
          <p>
            Lovable's analytics uses no cookies, stores nothing on your device, does not keep IP
            addresses and does not identify visitors. It records pages visited, where visitors came
            from, country, browser, operating system, device type, time on site, page-load speed,
            errors and clicks. Detailed data is kept for 90 days and daily summaries for a year.
          </p>
          <p>
            Lovable collects this data for us.{" "}
            <a
              href="https://lovable.dev/privacy"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Lovable's privacy policy
            </a>{" "}
            explains how it handles it. Other storage described above is separate from this
            cookie-free analytics.
          </p>
          <h3 className="font-semibold">Alert subscribers (email and browser notifications)</h3>
          <p>
            If you subscribe on the{" "}
            <Link to="/subscribe" className="underline">
              subscribe page
            </Link>
            , we store your email address or your browser&apos;s notification address, the districts,
            language and minimum level you chose, when you confirmed, and a random unsubscribe code.
            We use this only to send the experimental flood-risk alerts you asked for. Email
            subscriptions start only after you click the confirmation link we send.
          </p>
          <p>
            This data cannot be read from the website by anyone. Only the server reads it to send
            alerts. Coordinators see counts of subscribers per district and the status of each send
            (sent, failed or skipped), never email addresses or notification addresses. Emails are
            delivered through Resend; browser notifications go through your browser maker&apos;s push
            service. Sign-up attempts store a one-way hash of your connection address, not the
            address itself.
          </p>
          <p>
            Every email has an unsubscribe link that works immediately without logging in.
            Unsubscribed records are kept switched off; no automatic deletion period is configured
            yet. To ask for full deletion, use the contact page with the email address you
            subscribed with (a working deletion channel is not yet established, as noted above).
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Official sources to follow</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <a className="underline" href="https://pdma.gov.pk/" target="_blank" rel="noreferrer">
                PDMA Khyber Pakhtunkhwa
              </a>
            </li>
            <li>
              <a
                className="underline"
                href="https://www.pmd.gov.pk/"
                target="_blank"
                rel="noreferrer"
              >
                Pakistan Meteorological Department (PMD)
              </a>
            </li>
            <li>
              <a
                className="underline"
                href="https://ffd.pmd.gov.pk/"
                target="_blank"
                rel="noreferrer"
              >
                Flood Forecasting Division (FFD)
              </a>
            </li>
            <li>
              <a className="underline" href="tel:1122">
                Rescue 1122
              </a>
            </li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Contact for corrections</h2>
          <p>
            Use the{" "}
            <Link to="/contact" className="underline">
              contact page
            </Link>{" "}
            for project corrections, including district coordinates, data provenance and privacy
            enquiries. Project contact details still need to be supplied; this page does not invent
            a contact address.
          </p>
        </section>
      </div>
    </>
  );
}
