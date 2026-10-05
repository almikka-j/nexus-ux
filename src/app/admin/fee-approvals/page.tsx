import type { Metadata } from 'next';

import { FeeApprovalsView } from 'src/sections/admin/fee-approvals-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Fee Approvals | HHC LMS',
};

export default function Page() {
  return <FeeApprovalsView />;
}
