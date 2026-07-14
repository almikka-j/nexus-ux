import type { Metadata } from 'next';

import { BorrowerDashboardView } from 'src/sections/borrower/dashboard-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Dashboard | HHC LMS',
};

export default function Page() {
  return <BorrowerDashboardView />;
}
