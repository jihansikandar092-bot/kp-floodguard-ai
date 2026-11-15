import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { TokenAction } from "@/components/site/TokenAction";
import { unsubscribe } from "@/lib/subscriptions/subscriptions.functions";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>): { token?: string | undefined } => ({
    token: typeof s["token"] === "string" ? s["token"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Unsubscribe — KP FloodGuard AI" },
      { name: "description", content: "Stop KP FloodGuard AI flood alert messages." },
      { property: "og:title", content: "Unsubscribe — KP FloodGuard AI" },
      { property: "og:description", content: "Stop KP FloodGuard AI flood alert messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { token } = Route.useSearch();
  const fn = useServerFn(unsubscribe);
  const run = useCallback((t: string) => fn({ data: { token: t } }), [fn]);
  return (
    <TokenAction
      token={token}
      run={run}
      successTitle="Unsubscribed"
      successText="You will not receive any more alerts from this subscription."
    />
  );
}
