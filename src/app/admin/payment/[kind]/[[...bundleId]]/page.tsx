import type { Metadata } from 'next';

import { PaymentDetailView } from 'src/sections/admin/payment-detail-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Payment Verification Details | HHC LMS',
};

export default function Page({ params }: { params: { kind: string; bundleId?: string[] } }) {
  // `kind` is a real discriminator (see paths.ts's paymentDetail()), not
  // an opaque ID — an unrecognized value (a stray URL, not something the
  // UI itself ever produces) falls back to 'ci-fee'. Appraisal Fee's
  // payment is per-bundle now (see
  // docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md),
  // so it needs the real bundleId from the optional catch-all segment;
  // CI Fee has no bundle concept and ignores it.
  const kind = params.kind === 'appraisal-fee' ? 'appraisal-fee' : 'ci-fee';
  return <PaymentDetailView kind={kind} bundleId={params.bundleId?.[0]} />;
}
