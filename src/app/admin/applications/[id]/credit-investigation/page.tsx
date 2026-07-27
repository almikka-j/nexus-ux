// src/app/admin/applications/[id]/credit-investigation/page.tsx
import type { Metadata } from 'next';

import { CreditInvestigationView } from 'src/sections/admin/credit-investigation-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Credit Investigation | HHC LMS Admin',
};

export default function Page() {
  return <CreditInvestigationView />;
}
