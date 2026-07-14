import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { AboutView } from 'src/sections/about/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'About us | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <AboutView />
    </MainLayout>
  );
}
