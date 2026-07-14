import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { FAQView } from 'src/sections/faq/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'FAQs | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <FAQView />
    </MainLayout>
  );
}
