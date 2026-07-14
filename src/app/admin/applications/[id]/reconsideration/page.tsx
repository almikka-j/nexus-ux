import type { Metadata } from 'next';

import { ReconsiderationView } from 'src/sections/admin/reconsideration-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Reconsideration | HHC LMS Admin',
};

export default function Page() {
  return <ReconsiderationView />;
}
