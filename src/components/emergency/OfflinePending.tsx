import { CloudOff, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QueuedRequest } from "@/lib/offline/request-queue";

export function OfflinePending({
  pending,
  sending,
  online,
  onRetry,
}: {
  pending: QueuedRequest[];
  sending: boolean;
  online: boolean;
  onRetry: () => void;
}) {
  if (!pending.length) return null;
  return (
    <div
      role="status"
      className="space-y-3 rounded-lg border-2 border-risk-medium bg-risk-medium-soft p-4"
    >
      <p className="flex items-start gap-2 font-semibold">
        <CloudOff className="mt-0.5 size-5 shrink-0" aria-hidden />
        Saved on your phone, it will be sent automatically when you are back online.
      </p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Pending: {pending.length} request{pending.length === 1 ? "" : "s"} · saved{" "}
        {pending.map((p) => new Date(p.queuedAt).toLocaleTimeString()).join(", ")} ·{" "}
        {online ? (sending ? "Sending now…" : "Waiting to retry") : "You are offline"}
      </p>
      <p className="text-sm font-semibold text-emergency">
        Not yet received by coordinators. If anyone is in danger, call Rescue 1122 now.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="emergency">
          <a href="tel:1122">
            <Phone /> Call Rescue 1122
          </a>
        </Button>
        <Button variant="outline" onClick={onRetry} disabled={!online || sending}>
          Try sending now
        </Button>
      </div>
    </div>
  );
}
