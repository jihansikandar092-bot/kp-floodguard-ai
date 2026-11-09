import { useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { supabase } from "@/integrations/supabase/client";

type S = "idle" | "connecting" | "listening" | "speaking";
<VoiceCall />

export default function VoiceCall() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const [state, setState] = useState<S>("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    const c = new RetellWebClient();
    c.on("call_started", () => setState("listening"));
    c.on("call_ended", () => setState("idle"));
    c.on("agent_start_talking", () => setState("speaking"));
    c.on("agent_stop_talking", () => setState("listening"));
    c.on("error", (e: unknown) => {
      console.error(e);
      setErr("Call error. Try again.");
      setState("idle");
    });
    clientRef.current = c;
    return () => { c.stopCall(); };
  }, []);

  const start = async () => {
    setErr("");
    setState("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("retell-call");
      if (error || !data?.access_token) throw error || new Error("No token");
      await clientRef.current?.startCall({ accessToken: data.access_token });
    } catch (e) {
      console.error(e);
      setErr("Mic allow karo ya dobara try karo.");
      setState("idle");
    }
  };

  const end = () => clientRef.current?.stopCall();

  const label = {
    idle: "Start Voice Call",
    connecting: "Connecting...",
    listening: "Listening...",
    speaking: "Agent speaking...",
  }[state];

  return (
    <div className="p-3 text-center">
      {state === "idle" ? (
        <button onClick={start} className="rounded-full bg-red-600 px-5 py-2 text-white">
          🎤 {label}
        </button>
      ) : (
        <>
          <p className="mb-2 text-sm">{label}</p>
          <button onClick={end} className="rounded-full bg-gray-800 px-5 py-2 text-white">
            End Call
          </button>
        </>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
