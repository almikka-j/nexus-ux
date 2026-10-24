import type { Metadata } from 'next';

import { CallReportResultView } from 'src/sections/admin/call-report-result-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Call Report Result | HHC LMS Admin',
};

export default function Page() {
  return <CallReportResultView />;
}
