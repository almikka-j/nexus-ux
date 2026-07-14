import type { Metadata } from 'next';

import { TransactionTypeView } from 'src/sections/admin/transaction-type-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Transaction Type | HHC LMS Admin',
};

export default function Page() {
  return <TransactionTypeView />;
}
