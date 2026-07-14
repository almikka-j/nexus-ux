import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { NewsDetailsView } from 'src/sections/news/view/news-details-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'News | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <NewsDetailsView />
    </MainLayout>
  );
}
