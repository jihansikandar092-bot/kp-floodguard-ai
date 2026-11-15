import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent } from "react";
import { Bell, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/site/Status";
import { districtListOptions } from "@/lib/api/district-query";
import { createSubscription, getPushPublicKey } from "@/lib/subscriptions/subscriptions.functions";
import {
  SUB_LANGUAGES,
  subscribeSchema,
  type SubLanguage,
  type SubLevel,
} from "@/lib/subscriptions/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Subscribe to Flood Alerts — KP FloodGuard AI" },
      {
        name: "description",
        content:
          "Get experimental district flood-risk alerts for Khyber Pakhtunkhwa by email or browser notification.",
      },
      { property: "og:title", content: "Subscribe to Flood Alerts — KP FloodGuard AI" },
      {
        property: "og:description",
        content:
          "Experimental district flood-risk alerts by email or browser notification. Not official warnings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(districtListOptions()),
  component: SubscribePage,
});

const LANG_LABEL: Record<SubLanguage, string> = { en: "English", ur: "اردو", ps: "پښتو" };

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function SubscribePage() {
  const { data: districts } = useSuspenseQuery(districtListOptions());
  const grouped = useMemo(
    () => [
      { title: "Southern and Merged Districts", items: districts.filter((d) => d.isArdc) },
      { title: "Other districts", items: districts.filter((d) => !d.isArdc) },
    ],
    [districts],
  );
  const subscribe = useServerFn(createSubscription);
  const pushKey = useServerFn(getPushPublicKey);
  const [selected, setSelected] = useState<string[]>([]);
  const [language, setLanguage] = useState<SubLanguage>("en");
  const [minLevel, setMinLevel] = useState<SubLevel>("medium");
  const [channel, setChannel] = useState<"email" | "webpush">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"email" | "webpush" | null>(null);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function pushSubscription() {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    )
      throw new Error("This browser does not support notifications.");
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg)
      throw new Error(
        "Browser notifications work only in the installed or published app, not in this preview.",
      );
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted.");
    const { key } = await pushKey();
    if (!key) throw new Error("Browser notifications are not configured.");
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToBytes(key),
      }));
    return sub.toJSON();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const input =
        channel === "email"
          ? { channel, email, districtIds: selected, language, minLevel }
          : { channel, push: await pushSubscription(), districtIds: selected, language, minLevel };
      const parsed = subscribeSchema.safeParse(input);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check the form.");
        return;
      }
      const res = await subscribe({ data: parsed.data });
      if (!res.ok) setError(res.message);
      else setDone(res.channel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Flood alerts"
        title="Subscribe to district alerts"
        description="Experimental, system-generated risk alerts from modelled weather and river data. Not official warnings."
      />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-5 shadow-card sm:p-8">
          {done ? (
            <div role="status" className="space-y-3">
              <h2 className="text-xl font-bold">
                {done === "email" ? "Check your inbox" : "Browser notifications are on"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {done === "email"
                  ? "We sent a confirmation link. Alerts start only after you click it. If it does not arrive, check spam."
                  : "This browser will receive alerts for the districts you chose."}
              </p>
              <Button asChild variant="outline">
                <Link to="/alerts">View current alerts</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-8">
              <fieldset className="space-y-4">
                <legend className="text-base font-bold">1. Districts</legend>
                {grouped.map((g) =>
                  g.items.length ? (
                    <div key={g.title}>
                      <p className="mb-2 text-sm font-semibold text-muted-foreground">{g.title}</p>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {g.items.map((d) => (
                          <label
                            key={d.id}
                            className="flex min-h-11 items-center gap-3 rounded-md px-2 hover:bg-muted"
                          >
                            <Checkbox
                              checked={selected.includes(d.id)}
                              onCheckedChange={() => toggle(d.id)}
                            />
                            <span className="text-sm">{d.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </fieldset>

              <fieldset>
                <legend className="text-base font-bold">2. Language</legend>
                <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Language">
                  {SUB_LANGUAGES.map((l) => (
                    <Choice key={l} active={language === l} onClick={() => setLanguage(l)}>
                      {LANG_LABEL[l]}
                    </Choice>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-base font-bold">3. Minimum level</legend>
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-label="Minimum level"
                >
                  <Choice active={minLevel === "medium"} onClick={() => setMinLevel("medium")}>
                    Medium and High
                  </Choice>
                  <Choice active={minLevel === "high"} onClick={() => setMinLevel("high")}>
                    High only
                  </Choice>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-base font-bold">4. How to receive alerts</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Channel">
                  <Choice active={channel === "email"} onClick={() => setChannel("email")}>
                    <Mail className="size-4" aria-hidden /> Email
                  </Choice>
                  <Choice active={channel === "webpush"} onClick={() => setChannel("webpush")}>
                    <Bell className="size-4" aria-hidden /> Browser notification
                  </Choice>
                </div>
                {channel === "email" ? (
                  <div className="space-y-1">
                    <Label htmlFor="sub-email">Email address</Label>
                    <Input
                      id="sub-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      We email a confirmation link first. Nothing is sent until you confirm.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your browser asks for permission only after you press Subscribe.
                  </p>
                )}
              </fieldset>

              {error && (
                <p role="alert" className="text-sm font-semibold text-emergency">
                  {error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                By subscribing you agree to how we handle your data, explained on{" "}
                <Link to="/responsible-ai" className="underline">
                  Responsible AI &amp; Privacy
                </Link>
                . Every message has an unsubscribe link.
              </p>
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                {busy && <Loader2 className="animate-spin" />} Subscribe
              </Button>
            </form>
          )}
        </div>
        <aside className="h-fit rounded-xl border-2 border-emergency bg-emergency-soft p-5">
          <p className="font-bold text-emergency">Alerts are not a rescue service</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Messages may be late or missing. Follow PDMA and Pakistan Meteorological Department
            advisories. In an emergency call Rescue 1122.
          </p>
          <Button asChild variant="emergency" className="mt-4 w-full">
            <a href="tel:1122">
              <Phone /> Call Rescue 1122
            </a>
          </Button>
        </aside>
      </div>
    </>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold",
        active && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}
