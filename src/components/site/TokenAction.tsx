import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Runs a one-time token action on load (confirm or unsubscribe) and shows the outcome. */
export function TokenAction({
  token,
  run,
  successTitle,
  successText,
}: {
  token: string | undefined;
  run: (token: string) => Promise<{ ok: boolean; message?: string }>;
  successTitle: string;
  successText: string;
}) {
  const [state, setState] = useState<{ ok: boolean; message?: string } | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) return setState({ ok: false, message: "This link is missing its code." });
    run(token)
      .then(setState)
      .catch(() => setState({ ok: false, message: "This link is not valid." }));
  }, [token, run]);
  return (
    <div className="container-page max-w-xl py-12">
      <div role="status" className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
        {!state ? (
          <p className="flex items-center gap-2">
            <Loader2 className="animate-spin" /> Working…
          </p>
        ) : state.ok ? (
          <>
            <h1 className="text-2xl font-bold">{successTitle}</h1>
            <p className="text-muted-foreground">{successText}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Link not valid</h1>
            <p className="text-muted-foreground">{state.message}</p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/alerts">View alerts</Link>
          </Button>
          <Button asChild variant="emergency">
            <a href="tel:1122">
              <Phone /> Rescue 1122
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
