import type { Metadata } from 'next';

import { AppraisalApproverView } from 'src/sections/admin/appraisal-approver-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal - Report Approval | HHC LMS',
};

export default function Page() {
  return <AppraisalApproverView />;
}
