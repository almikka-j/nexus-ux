import type { Metadata } from 'next';

import { CallReportView } from 'src/sections/admin/call-report-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Call Report | HHC LMS Admin',
};

export default function Page() {
  return <CallReportView />;
}
