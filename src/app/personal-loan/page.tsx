import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { PersonalLoanView } from 'src/sections/personal-loan/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Personal Loan | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <PersonalLoanView />
    </MainLayout>
  );
}
