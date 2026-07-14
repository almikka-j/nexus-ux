import type { Metadata } from 'next';

import { SignUpView } from 'src/sections/auth/sign-up-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Sign Up | HHC LMS',
};

export default function Page() {
  return <SignUpView />;
}
