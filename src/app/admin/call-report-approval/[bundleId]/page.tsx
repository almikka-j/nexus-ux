import type { Metadata } from 'next';

import { CallReportApprovalBundleView } from 'src/sections/admin/call-report-approval-bundle-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Call Report - Report Approval | HHC LMS',
};

export default function Page() {
  return <CallReportApprovalBundleView />;
}
