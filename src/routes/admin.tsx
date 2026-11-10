import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { DemoBanner, PageHeader } from "@/components/site/Demo";
import { RequestsTable } from "@/components/admin/RequestsTable";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Rescue Coordination Dashboard — KP FloodGuard AI" },
      { name: "description", content: "Coordinator interface to review, filter and update flood emergency requests by district, type and status." },
      { property: "og:title", content: "Rescue Coordination Dashboard — KP FloodGuard AI" },
      { property: "og:description", content: "Triage and track flood emergency requests across KP." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Authorized coordinators"
        title="Rescue Coordination Dashboard"
        description="Review incoming requests, filter by district, emergency type and status, and update progress."
      />
      <div className="container-page space-y-6 py-8">
        <DemoBanner>
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 sm:hidden" aria-hidden />
            <p>
              <strong>Coordinator preview.</strong> Rows marked DEMO are fictional samples; rows marked
              LOCAL were submitted from this browser. Coordinator sign-in and the shared Google Sheets
              database are not connected yet, so status changes are saved on this device only.
            </p>
          </div>
        </DemoBanner>
        <RequestsTable />
      </div>
    </>
  );
}
