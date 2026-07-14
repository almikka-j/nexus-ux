import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { SanglaTituloView } from 'src/sections/sangla-titulo/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Sangla Titulo | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <SanglaTituloView />
    </MainLayout>
  );
}
