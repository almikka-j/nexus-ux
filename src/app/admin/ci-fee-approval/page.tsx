import type { Metadata } from 'next';

import { CiFeeApprovalView } from 'src/sections/admin/ci-fee-approval-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'CI Fee Approval | HHC LMS',
};

export default function Page() {
  return <CiFeeApprovalView />;
}
