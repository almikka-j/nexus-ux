'use client';

import type { CiReport } from 'src/auth/admin-context';

export function CommercialReportSections({
  report: _report,
  onChange: _onChange,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
}) {
  return null;
}
