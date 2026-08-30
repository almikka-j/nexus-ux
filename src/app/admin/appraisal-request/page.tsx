import type { Metadata } from 'next';

import { AppraisalRequestView } from 'src/sections/admin/appraisal-request-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal - Request | HHC LMS',
};

export default function Page() {
  return <AppraisalRequestView />;
}
