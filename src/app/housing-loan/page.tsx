import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { HousingLoanView } from 'src/sections/housing-loan/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Housing Loan | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <HousingLoanView />
    </MainLayout>
  );
}
