// src/app/admin/applications/[id]/appraisal/page.tsx
import type { Metadata } from 'next';

import { AppraisalView } from 'src/sections/admin/appraisal-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal | HHC LMS Admin',
};

export default function Page() {
  return <AppraisalView />;
}
