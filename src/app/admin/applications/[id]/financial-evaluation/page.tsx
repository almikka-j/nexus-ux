// src/app/admin/applications/[id]/financial-evaluation/page.tsx
import type { Metadata } from 'next';

import { FinancialEvaluationView } from 'src/sections/admin/financial-evaluation-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Financial Evaluation | HHC LMS Admin',
};

export default function Page() {
  return <FinancialEvaluationView />;
}
