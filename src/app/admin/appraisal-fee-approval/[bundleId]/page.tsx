import type { Metadata } from 'next';

import { AppraisalFeeApprovalBundleView } from 'src/sections/admin/appraisal-fee-approval-bundle-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal - Fee Approval | HHC LMS',
};

export default function Page() {
  return <AppraisalFeeApprovalBundleView />;
}
