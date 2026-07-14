import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { NewsView } from 'src/sections/news/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'News | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <NewsView />
    </MainLayout>
  );
}
