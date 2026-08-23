import type { Metadata } from 'next';

import { AppraisalApproverBundleView } from 'src/sections/admin/appraisal-approver-bundle-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal Approval | HHC LMS',
};

export default function Page() {
  return <AppraisalApproverBundleView />;
}
