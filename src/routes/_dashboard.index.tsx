import { createFileRoute } from "@tanstack/react-router";
import {
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/page-header";

export const Route = createFileRoute("/_dashboard/")({
  component: CodesPage,
});

function CodesPage() {
  return (
    <>
      <PageHeader
        title="Codes"
        description="Every code is a permanent short link you can re-point anytime."
        actions={
          <>
            <SecondaryButton>Import</SecondaryButton>
            <PrimaryButton>New code</PrimaryButton>
          </>
        }
      />
      <EmptyState
        title="No codes yet"
        description="Create your first dynamic QR code. Print it once — change where it points as often as you need."
        icon={<QrGlyph />}
        action={<PrimaryButton>New code</PrimaryButton>}
      />
    </>
  );
}

function QrGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="1" y="1" width="7" height="7" rx="1" stroke="currentColor" />
      <rect x="12" y="1" width="7" height="7" rx="1" stroke="currentColor" />
      <rect x="1" y="12" width="7" height="7" rx="1" stroke="currentColor" />
      <rect x="13" y="13" width="2" height="2" fill="currentColor" />
      <rect x="17" y="13" width="2" height="2" fill="currentColor" />
      <rect x="13" y="17" width="2" height="2" fill="currentColor" />
      <rect x="17" y="17" width="2" height="2" fill="currentColor" />
    </svg>
  );
}
