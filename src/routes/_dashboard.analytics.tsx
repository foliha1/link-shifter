import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_dashboard/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Relay" },
      { name: "description", content: "Scan activity across your codes." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Scans, referrers, and destinations over time."
      />
      <EmptyState
        title="Nothing to measure yet"
        description="Once your codes are in the wild, scans and traffic will show up here."
      />
    </>
  );
}
