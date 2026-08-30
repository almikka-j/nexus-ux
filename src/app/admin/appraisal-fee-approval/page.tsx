import type { Metadata } from 'next';

import { AppraisalFeeApprovalView } from 'src/sections/admin/appraisal-fee-approval-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal - Fee Approval | HHC LMS',
};

export default function Page() {
  return <AppraisalFeeApprovalView />;
}
