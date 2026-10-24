import type { Metadata } from 'next';

import { CreditCheckingResultView } from 'src/sections/admin/credit-checking-result-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Initial Credit Checking Result | HHC LMS Admin',
};

export default function Page() {
  return <CreditCheckingResultView />;
}
