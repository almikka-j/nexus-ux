import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { ClubshareLoanView } from 'src/sections/clubshare-loan/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Clubshare Loan | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <ClubshareLoanView />
    </MainLayout>
  );
}
