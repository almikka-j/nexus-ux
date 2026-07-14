import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { FAQDetailsView } from 'src/sections/faq/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'FAQ | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <FAQDetailsView />
    </MainLayout>
  );
}
