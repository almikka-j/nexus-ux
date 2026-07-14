import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { PropertyForsaleView } from 'src/sections/property-forsale/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Property for Sale | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <PropertyForsaleView />
    </MainLayout>
  );
}
