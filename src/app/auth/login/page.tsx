import type { Metadata } from 'next';

import { LoginView } from 'src/sections/auth/login-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Login | HHC LMS',
};

export default function Page() {
  return <LoginView />;
}
