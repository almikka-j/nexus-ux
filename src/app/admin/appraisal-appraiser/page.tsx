import type { Metadata } from 'next';

import { AppraisalAppraiserView } from 'src/sections/admin/appraisal-appraiser-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal Appraiser | HHC LMS',
};

export default function Page() {
  return <AppraisalAppraiserView />;
}
