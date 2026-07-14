import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { FAQSearchResult } from 'src/sections/faq/view/faq-search-result';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'FAQs | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <FAQSearchResult />
    </MainLayout>
  );
}
