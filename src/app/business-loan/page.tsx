import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { BusinessLoanView } from 'src/sections/business-loan/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Business Loan | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <BusinessLoanView />
    </MainLayout>
  );
}
