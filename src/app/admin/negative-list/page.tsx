import type { Metadata } from 'next';

import { NegativeListView } from 'src/sections/admin/negative-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Negative List | HHC LMS',
};

export default function Page() {
  return <NegativeListView />;
}
