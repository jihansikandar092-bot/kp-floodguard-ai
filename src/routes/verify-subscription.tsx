import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { TokenAction } from "@/components/site/TokenAction";
import { verifySubscription } from "@/lib/subscriptions/subscriptions.functions";

export const Route = createFileRoute("/verify-subscription")({
  validateSearch: (s: Record<string, unknown>): { token?: string | undefined } => ({
    token: typeof s["token"] === "string" ? s["token"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Confirm Subscription — KP FloodGuard AI" },
      { name: "description", content: "Confirm your KP FloodGuard AI flood alert subscription." },
      { property: "og:title", content: "Confirm Subscription — KP FloodGuard AI" },
      { property: "og:description", content: "Confirm your KP FloodGuard AI flood alert subscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { token } = Route.useSearch();
  const fn = useServerFn(verifySubscription);
  const run = useCallback((t: string) => fn({ data: { token: t } }), [fn]);
  return (
    <TokenAction
      token={token}
      run={run}
      successTitle="Subscription confirmed"
      successText="You will now receive experimental flood-risk alerts for your chosen districts. Every message has an unsubscribe link."
    />
  );
}
