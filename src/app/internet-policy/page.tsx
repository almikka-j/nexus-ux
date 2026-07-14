import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { InternetPolicyView } from 'src/sections/internet-policy/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Internet Policy Statement | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <InternetPolicyView />
    </MainLayout>
  );
}
