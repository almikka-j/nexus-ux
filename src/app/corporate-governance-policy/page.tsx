import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { CorporateGovernancePolicyView } from 'src/sections/corporate-governance-policy/view/corporate-governance-policy-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Corporate Governance Policy | HHC LMS' };

export default function Page() {
  return (
    <MainLayout>
      <CorporateGovernancePolicyView />
    </MainLayout>
  );
}
