import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { FastLoanView } from 'src/sections/fast-loan/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Fast Loan | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <FastLoanView />
    </MainLayout>
  );
}
