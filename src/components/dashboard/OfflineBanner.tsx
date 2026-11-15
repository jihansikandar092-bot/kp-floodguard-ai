import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/offline/use-offline-queue";

/** Shown only while the device is offline; the time is the stored reading's real fetch time. */
export function OfflineBanner({ fetchedAt }: { fetchedAt: string | null | undefined }) {
  const online = useOnline();
  if (online) return null;
  const when = fetchedAt
    ? `${fetchedAt.replace("T", " ").slice(0, 16)} UTC (${Math.max(0, Math.round((Date.now() - Date.parse(fetchedAt)) / 60_000))} min old)`
    : "Not available";
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-lg border bg-notice px-3 py-2 text-sm font-medium text-notice-foreground"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You are offline, showing last saved data from {when}
    </p>
  );
}
