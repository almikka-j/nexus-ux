import type { Metadata } from 'next';

import { PreliminaryApplicationView } from 'src/sections/auth/preliminary-application-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Preliminary Application | HHC LMS',
};

export default function Page() {
  return <PreliminaryApplicationView />;
}
