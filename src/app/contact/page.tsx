import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { ContactView } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Contact Us | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <ContactView />
    </MainLayout>
  );
}
