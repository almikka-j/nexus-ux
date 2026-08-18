import type { Metadata } from 'next';

import { AppraisalAppraiserBundleView } from 'src/sections/admin/appraisal-appraiser-bundle-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal Assignment | HHC LMS',
};

export default function Page({ params }: { params: { bundleId: string } }) {
  return <AppraisalAppraiserBundleView bundleId={params.bundleId} />;
}
