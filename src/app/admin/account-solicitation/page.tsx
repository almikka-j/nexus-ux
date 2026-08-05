import type { Metadata } from 'next';

import { ApplicationListView } from 'src/sections/admin/application-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Account Solicitation | HHC LMS Admin',
};

export default function Page() {
  return <ApplicationListView accountSolicitation />;
}
