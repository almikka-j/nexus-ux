import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { TermsView } from 'src/sections/terms/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Terms & Conditions | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <TermsView />
    </MainLayout>
  );
}
