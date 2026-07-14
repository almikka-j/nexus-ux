import type { Metadata } from 'next';

import { RequirementChecklistView } from 'src/sections/admin/requirement-checklist-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Requirement Checklist | HHC LMS Admin',
};

export default function Page() {
  return <RequirementChecklistView />;
}
