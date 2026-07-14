import type { Metadata } from 'next';

import { AdminDashboardView } from 'src/sections/admin/admin-dashboard-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Admin Dashboard | HHC LMS',
};

export default function Page() {
  return <AdminDashboardView />;
}
