import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSubscriptionStats,
  sendMyTestNotification,
} from "@/lib/subscriptions/subscriptions.functions";
import { formatPkt } from "@/lib/request-display";

/** Coordinators only: counts per district and recent delivery statuses. No contact data. */
export function SubscriptionStats() {
  const stats = useServerFn(getSubscriptionStats);
  const test = useServerFn(sendMyTestNotification);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["subscription-stats"], queryFn: () => stats() });
  const send = useMutation({
    mutationFn: () => test(),
    onSuccess: (r) => {
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      void qc.invalidateQueries({ queryKey: ["subscription-stats"] });
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading subscriber counts…</p>;
  if (error || !data) return <p className="text-sm text-emergency">Subscriber counts temporarily unavailable.</p>;
  if (!data.authorized) return null;
  const rows = Object.entries(data.perDistrict).sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-card" aria-label="Alert subscribers">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Alert subscribers</h2>
          <p className="text-sm text-muted-foreground">
            {data.total} active verified subscriptions. Counts only; contact details are never shown.
          </p>
        </div>
        <Button variant="outline" onClick={() => send.mutate()} disabled={send.isPending}>
          Send test to my email
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm">No active subscribers yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-3">
          {rows.map(([d, c]) => (
            <li key={d} className="flex justify-between rounded-md border px-3 py-2 text-sm">
              <span className="capitalize">{d.replace(/-/g, " ")}</span>
              <span className="font-mono">
                {c.email} email · {c.webpush} push
              </span>
            </li>
          ))}
        </ul>
      )}
      <h3 className="font-semibold">Last 50 deliveries</h3>
      {data.deliveries.length === 0 ? (
        <p className="text-sm">No deliveries recorded yet.</p>
      ) : (
        <ul className="divide-y text-sm">
          {data.deliveries.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
              <Badge variant={d.status === "sent" ? "default" : d.status === "failed" ? "destructive" : "secondary"}>
                {d.status}
              </Badge>
              {d.is_test && <Badge variant="outline">TEST</Badge>}
              <span>{d.district_id ?? "—"}</span>
              <span className="text-muted-foreground">{d.channel}</span>
              <span className="text-muted-foreground">attempt {d.attempt}</span>
              <span className="text-muted-foreground">{formatPkt(d.sent_at)}</span>
              {d.error && <span className="w-full text-xs text-muted-foreground">{d.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
