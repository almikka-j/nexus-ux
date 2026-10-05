import type { Metadata } from 'next';

import { CiFeeApprovalBundleView } from 'src/sections/admin/ci-fee-approval-bundle-view';
import { AppraisalFeeApprovalBundleView } from 'src/sections/admin/appraisal-fee-approval-bundle-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Fee Approvals | HHC LMS',
};

export default function Page({ params }: { params: { kind: string; bundleId?: string[] } }) {
  // `kind` is a real discriminator (see paths.ts's feeApprovalsDetail()),
  // not an opaque ID — an unrecognized value (a stray URL, not something
  // the UI itself ever produces) falls back to 'ci-fee'. Appraisal Fee's
  // approval is per-bundle now (see
  // docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md),
  // so it needs a real bundleId from the optional catch-all segment; CI
  // Fee has no bundle concept and ignores it.
  if (params.kind === 'appraisal-fee') {
    return <AppraisalFeeApprovalBundleView bundleId={params.bundleId?.[0] ?? ''} />;
  }
  return <CiFeeApprovalBundleView />;
}
