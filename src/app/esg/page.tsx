import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { ESGView } from 'src/sections/esg/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'ESG | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <ESGView />
    </MainLayout>
  );
}
