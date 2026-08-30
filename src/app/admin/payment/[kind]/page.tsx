import type { Metadata } from 'next';

import { PaymentDetailView } from 'src/sections/admin/payment-detail-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Payment Verification Details | HHC LMS',
};

export default function Page({ params }: { params: { kind: string } }) {
  // `kind` is a real discriminator (see paths.ts's paymentDetail()), not
  // an opaque ID like every other [bundleId]/[id] route in this app — an
  // unrecognized value (a stray URL, not something the UI itself ever
  // produces) falls back to 'ci-fee' rather than rendering with an
  // invalid kind.
  const kind = params.kind === 'appraisal-fee' ? 'appraisal-fee' : 'ci-fee';
  return <PaymentDetailView kind={kind} />;
}
