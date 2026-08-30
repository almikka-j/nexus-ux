import type { Metadata } from 'next';

import { CallReportApprovalView } from 'src/sections/admin/call-report-approval-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Call Report - Approval | HHC LMS',
};

export default function Page() {
  return <CallReportApprovalView />;
}
