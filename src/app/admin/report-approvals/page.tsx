import type { Metadata } from 'next';

import { ReportApprovalsView } from 'src/sections/admin/report-approvals-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Report Approvals | HHC LMS',
};

export default function Page() {
  return <ReportApprovalsView />;
}
