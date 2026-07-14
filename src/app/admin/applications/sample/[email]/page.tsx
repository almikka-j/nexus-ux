import type { Metadata } from 'next';

import { SampleApplicationView } from 'src/sections/admin/sample-application-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Sample Application | HHC LMS Admin',
};

export default function Page({ params }: { params: { email: string } }) {
  return <SampleApplicationView email={decodeURIComponent(params.email)} />;
}
