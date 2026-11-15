import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCoordinatorStatus } from "@/lib/api/requests.functions";
import { SafetyNotice, PageHeader } from "@/components/site/Status";
import { RequestsTable } from "@/components/admin/RequestsTable";
import { SubscriptionStats } from "@/components/admin/SubscriptionStats";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Rescue Coordination Dashboard — KP FloodGuard AI" },
      {
        name: "description",
        content:
          "Coordinator interface to review, filter and update flood emergency requests by district, type and status.",
      },
      { property: "og:title", content: "Rescue Coordination Dashboard — KP FloodGuard AI" },
      {
        property: "og:description",
        content: "Triage and track flood emergency requests across KP.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", replace: true });
    // Role is decided on the server with has_role(); nothing is read from client storage.
    const { coordinator } = await getCoordinatorStatus();
    return { coordinator, email: data.user.email ?? "" };
  },
  component: AdminPage,
});

function AdminPage() {
  const { coordinator, email } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/login", replace: true });
  }
  const bar = (
    <div className="container-page flex items-center justify-end gap-3 pt-4 text-sm">
      <span className="text-muted-foreground">{email}</span>
      <Button variant="outline" size="sm" onClick={logout}>
        <LogOut /> Logout
      </Button>
    </div>
  );
  if (!coordinator)
    return (
      <>
        {bar}
        <div className="container-page py-16">
          <p role="alert" className="rounded-xl border bg-card p-10 text-center shadow-card">
            <strong className="block text-lg">Access denied</strong>
            <span className="text-sm text-muted-foreground">
              Your account does not have the coordinator or admin role. In an emergency call Rescue
              1122.
            </span>
          </p>
        </div>
      </>
    );
  return (
    <>
      {bar}
      <PageHeader
        eyebrow="Authorized coordinators"
        title="Rescue Coordination Dashboard"
        description="Review incoming requests, filter by district, emergency type and status, and update progress."
      />
      <div className="container-page space-y-6 py-8">
        <SafetyNotice>
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 sm:hidden" aria-hidden />
            <p>
              <strong>Coordinators only.</strong> Requests are read from the database and shown only
              to signed-in users with the coordinator or admin role. Coordinators verify each
              request; nothing is dispatched automatically. In a life-threatening emergency call
              Rescue 1122.
            </p>
          </div>
        </SafetyNotice>
        <RequestsTable />
        <SubscriptionStats />
      </div>
    </>
  );
}
