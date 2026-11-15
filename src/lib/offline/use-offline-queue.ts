import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEmergencyRequest } from "@/lib/api/requests.functions";
import { flushQueue, readQueue, type FlushOutcome, type QueuedRequest } from "./request-queue";

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/** Pending offline requests, retried on mount, on the 'online' event and every 30 s. */
export function useOfflineQueue(onSent?: (o: FlushOutcome) => void) {
  const submit = useServerFn(submitEmergencyRequest);
  const [pending, setPending] = useState<QueuedRequest[]>([]);
  const [sending, setSending] = useState(false);
  const refresh = useCallback(() => setPending(readQueue()), []);

  const retry = useCallback(async () => {
    if (!readQueue().length || !navigator.onLine) return refresh();
    setSending(true);
    try {
      const outcome = await flushQueue((payload) => submit({ data: payload }));
      if (outcome.sent.length || outcome.rejected.length) onSent?.(outcome);
    } finally {
      setSending(false);
      refresh();
    }
  }, [submit, onSent, refresh]);

  useEffect(() => {
    void retry();
    const onOnline = () => void retry();
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => void retry(), 30_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [retry]);

  return { pending, sending, refresh, retry };
}
