import type { Metadata } from 'next';

import { PaymentView } from 'src/sections/admin/payment-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Payment Verification | HHC LMS',
};

export default function Page() {
  return <PaymentView />;
}
