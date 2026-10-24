import type { Metadata } from 'next';

import { FullApplicationView } from 'src/sections/admin/full-application-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Full Application | HHC LMS Admin',
};

export default function Page() {
  return <FullApplicationView />;
}
