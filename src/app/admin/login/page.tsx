import type { Metadata } from 'next';

import { AdminLoginView } from 'src/sections/admin/admin-login-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Admin Login | HHC LMS',
};

export default function Page() {
  return <AdminLoginView />;
}
