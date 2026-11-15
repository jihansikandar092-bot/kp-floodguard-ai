import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, SafetyNotice } from "@/components/site/Status";
import { trackRequest } from "@/lib/api/requests.functions";
import { STATUS_BADGE, STATUS_LABEL, type RequestStatus } from "@/lib/emergency";
import { formatPkt } from "@/lib/request-display";
import { trackInputSchema } from "@/lib/track-rules";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Track your emergency request — KP FloodGuard AI" },
      {
        name: "description",
        content:
          "Check the status of your flood emergency request with your request code and the last 4 digits of your phone number.",
      },
      { property: "og:title", content: "Track your emergency request — KP FloodGuard AI" },
      {
        property: "og:description",
        content: "See your request status and last update time. No personal data is shown.",
      },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const trackFn = useServerFn(trackRequest);
  const [code, setCode] = useState("");
  const [last4, setLast4] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: RequestStatus; updatedAt: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => trackFn({ data: { code, last4 } }),
    onSuccess: (r) => {
      if (r.ok) {
        setResult({ status: r.status, updatedAt: r.updatedAt });
        setFormError(null);
      } else {
        setResult(null);
        setFormError(r.message);
      }
    },
    onError: () => {
      setResult(null);
      setFormError("Tracking temporarily unavailable. Please try again.");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = trackInputSchema.safeParse({ code, last4 });
    if (!parsed.success) {
      setResult(null);
      setFormError(parsed.error.issues[0]?.message ?? "Check your entries.");
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <PageHeader
        eyebrow="Citizens"
        title="Track your emergency request"
        description="Enter the request code you received and the last 4 digits of the phone number you used. Only the status and last update time are shown."
      />
      <div className="container-page max-w-xl space-y-6 py-8">
        <SafetyNotice>
          <p>
            In a life-threatening emergency do not wait for an update — call <strong>Rescue 1122</strong> now.
          </p>
        </SafetyNotice>

        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Request code</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="KPF-2026-0001"
              className="font-mono"
              autoComplete="off"
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Last 4 digits of your phone number</span>
            <Input
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
              className="font-mono"
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </label>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Checking…" : "Check status"}
          </Button>
        </form>

        {formError && (
          <p role="alert" className="rounded-xl border bg-card p-4 text-sm shadow-card">
            {formError}
          </p>
        )}

        {result && (
          <div
            role="status"
            className="space-y-2 rounded-xl border bg-card p-6 text-center shadow-card"
          >
            <p className="text-sm text-muted-foreground">Current status</p>
            <Badge variant={STATUS_BADGE[result.status]} className="text-base">
              {STATUS_LABEL[result.status]}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Last updated: {formatPkt(result.updatedAt)}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
