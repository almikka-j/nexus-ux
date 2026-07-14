import type { Metadata } from 'next';

import { ApplicationListView } from 'src/sections/admin/application-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Initial Credit Checking | HHC LMS Admin',
};

export default function Page() {
  return <ApplicationListView />;
}
