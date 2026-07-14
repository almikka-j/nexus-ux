import type { Metadata } from 'next';

import { LoanApplicationView } from 'src/sections/borrower/loan-application-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Apply for Loan | HHC LMS',
};

export default function Page() {
  return <LoanApplicationView />;
}
