import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Relay" },
      { name: "description", content: "Workspace and redirect service settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace, redirect domain, and team access."
      />
      <EmptyState
        title="Settings will live here"
        description="Redirect domain, API keys, team members, and billing — all in one place once the data model is in."
      />
    </>
  );
}
