import type { Metadata } from 'next';

import { AppraisalApproverBundleView } from 'src/sections/admin/appraisal-approver-bundle-view';
import { CallReportApprovalBundleView } from 'src/sections/admin/call-report-approval-bundle-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Report Approvals | HHC LMS',
};

export default function Page({ params }: { params: { kind: string } }) {
  // `kind` is a real discriminator (see paths.ts's reportApprovalsDetail()),
  // not an opaque ID — an unrecognized value (a stray URL, not something
  // the UI itself ever produces) falls back to 'call-report'.
  if (params.kind === 'appraisal') return <AppraisalApproverBundleView />;
  return <CallReportApprovalBundleView />;
}
