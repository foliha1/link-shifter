import { createFileRoute } from "@tanstack/react-router";
import {
  EmptyState,
  PageHeader,
  PrimaryButton,
} from "@/components/page-header";

export const Route = createFileRoute("/_dashboard/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — Oleeha QR" },
      {
        name: "description",
        content: "Group related codes into campaigns.",
      },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Group related codes so you can manage and measure them together."
        actions={<PrimaryButton>New campaign</PrimaryButton>}
      />
      <EmptyState
        title="No campaigns yet"
        description="Campaigns are optional. Use them to bundle codes for a single launch, print run, or client."
        action={<PrimaryButton>New campaign</PrimaryButton>}
      />
    </>
  );
}
