import type { Metadata } from 'next';

import { AppraisalReportResultView } from 'src/sections/admin/appraisal/appraisal-report-result-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal Report | HHC LMS',
};

export default function Page({ params }: { params: { bundleId: string } }) {
  return <AppraisalReportResultView bundleId={params.bundleId} />;
}
