import type { SubmitRequestInput } from "@/lib/emergency";

/** Emergency requests saved on this device while offline. Never holds API data. */
export const QUEUE_KEY = "kpfg:offline-requests";

export interface QueuedRequest {
  clientRequestId: string;
  queuedAt: string;
  payload: SubmitRequestInput & { clientRequestId: string };
}

export type SendResult =
  | { ok: true; code: string; createdAt: string }
  | { ok: false; error: "rate_limited" | "invalid" | "unavailable"; message: string };

export interface FlushOutcome {
  sent: { item: QueuedRequest; code: string; createdAt: string }[];
  rejected: { item: QueuedRequest; message: string }[];
  remaining: number;
}

function store(storage?: Storage): Storage | null {
  try {
    return storage ?? window.localStorage;
  } catch {
    return null;
  }
}

export function readQueue(storage?: Storage): QueuedRequest[] {
  try {
    const raw = store(storage)?.getItem(QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (q): q is QueuedRequest =>
        typeof q?.clientRequestId === "string" && typeof q?.queuedAt === "string" && !!q?.payload,
    );
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedRequest[], storage?: Storage) {
  try {
    store(storage)?.setItem(QUEUE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

/** Adds once per clientRequestId; returns false when the device cannot store it. */
export function enqueueRequest(item: QueuedRequest, storage?: Storage) {
  const items = readQueue(storage);
  if (items.some((q) => q.clientRequestId === item.clientRequestId)) return true;
  return writeQueue([...items, item], storage);
}

function removeFromQueue(id: string, storage?: Storage) {
  writeQueue(
    readQueue(storage).filter((q) => q.clientRequestId !== id),
    storage,
  );
}

let flushing: Promise<FlushOutcome> | null = null;

/**
 * Sends queued requests one by one. Concurrent calls share one run, and each item carries
 * its idempotency key, so the server stores a queued request at most once even if a reply
 * is lost. Network errors and rate limits keep the item; invalid items are dropped.
 */
export function flushQueue(
  send: (payload: QueuedRequest["payload"]) => Promise<SendResult>,
  storage?: Storage,
): Promise<FlushOutcome> {
  if (flushing) return flushing;
  flushing = (async () => {
    const outcome: FlushOutcome = { sent: [], rejected: [], remaining: 0 };
    for (const item of readQueue(storage)) {
      let res: SendResult;
      try {
        res = await send(item.payload);
      } catch {
        break; // still offline or server unreachable: keep the rest for the next attempt
      }
      if (res.ok) {
        removeFromQueue(item.clientRequestId, storage);
        outcome.sent.push({ item, code: res.code, createdAt: res.createdAt });
      } else if (res.error === "invalid") {
        removeFromQueue(item.clientRequestId, storage);
        outcome.rejected.push({ item, message: res.message });
      } else {
        break; // rate limited or service unavailable: retry later
      }
    }
    outcome.remaining = readQueue(storage).length;
    return outcome;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** True when a thrown submit error looks like a connectivity failure. */
export function isNetworkFailure(e: unknown, online: boolean) {
  if (!online) return true;
  return e instanceof TypeError || (e instanceof Error && /fetch|network|load failed/i.test(e.message));
}
