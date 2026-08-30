import type { Metadata } from 'next';

import { CiFeeApprovalBundleView } from 'src/sections/admin/ci-fee-approval-bundle-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Credit Investigation - Fee Approval | HHC LMS',
};

export default function Page() {
  return <CiFeeApprovalBundleView />;
}
