import type { Metadata } from 'next';

import { InitialCreditCheckingView } from 'src/sections/admin/initial-credit-checking-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Initial Credit Checking | HHC LMS Admin',
};

export default function Page() {
  return <InitialCreditCheckingView />;
}
