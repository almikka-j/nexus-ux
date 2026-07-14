import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { PrivacyPolicyView } from 'src/sections/privacy-policy/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Privacy Policy | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <PrivacyPolicyView />
    </MainLayout>
  );
}
