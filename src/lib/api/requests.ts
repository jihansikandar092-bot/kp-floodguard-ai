/**
 * Emergency request store.
 *
 * Until the n8n workflow and Google Sheets database are connected, requests are
 * saved ONLY in this browser (localStorage) as demo records. Nothing is sent to
 * rescue teams. Replace `localDemoSink` with a real sink when integrations go live.
 */
import { useSyncExternalStore } from "react";
import {
  normalizePkPhone,
  type EmergencyRequest,
  type EmergencyRequestInput,
  type RequestStatus,
} from "@/lib/emergency";
import { DEMO_REQUESTS } from "@/lib/data/demo-requests";

const STORAGE_KEY = "kpfg.requests.v1";
const STATUS_KEY = "kpfg.status-overrides.v1";

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: EmergencyRequest[] | null = null;

function readLocal(): EmergencyRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function readOverrides(): Record<string, RequestStatus> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STATUS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function compute(): EmergencyRequest[] {
  const overrides = readOverrides();
  return [...readLocal(), ...DEMO_REQUESTS]
    .map((r) => {
      const s = overrides[r.id];
      return s ? { ...r, status: s } : r;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function emit() {
  cache = compute();
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === STATUS_KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  if (!cache) cache = compute();
  return cache;
}

const serverSnapshot = DEMO_REQUESTS;

export function useEmergencyRequests() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function generateRequestId(now = new Date()) {
  const y = now.getFullYear().toString().slice(-2);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KPF-${y}${String(now.getMonth() + 1).padStart(2, "0")}-${rand}`;
}

export interface SubmitResult {
  request: EmergencyRequest;
  /** Whether the request reached a real coordination system. Always false until n8n/Sheets are connected. */
  delivered: false;
}

export async function submitEmergencyRequest(
  input: EmergencyRequestInput,
  source: EmergencyRequest["source"],
): Promise<SubmitResult> {
  const request: EmergencyRequest = {
    ...input,
    phone: normalizePkPhone(input.phone) ?? input.phone,
    id: generateRequestId(),
    createdAt: new Date().toISOString(),
    status: "pending",
    source,
    channel: "local-demo",
  };
  const existing = readLocal();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([request, ...existing]));
  emit();
  return { request, delivered: false };
}

export function updateRequestStatus(id: string, status: RequestStatus) {
  const overrides = readOverrides();
  overrides[id] = status;
  window.localStorage.setItem(STATUS_KEY, JSON.stringify(overrides));
  emit();
}
