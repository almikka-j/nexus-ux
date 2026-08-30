import type { SemanticTone } from 'src/components/admin-ui';
import type { AppraisalReportBundle, FeeApprovalStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Single source of truth for a report bundle's overall progress stage —
// previously computed twice with slightly different shapes: inline in
// appraisal-appraiser-view.tsx's table (a 4-value union including
// 'reported') and as assigned-appraiser-card.tsx's bundleStatus() (the
// same 3 in-progress values, using `null` as a "render a button instead"
// sentinel for the reported case). Both call sites, plus
// appraisal-request-view.tsx, now share this one function; each caller
// still decides for itself how to render the 'reported' case (a pill vs.
// a "View Report" button).
// ----------------------------------------------------------------------

export type AppraisalBundleStatus = 'on-process' | 'for-approval' | 'for-report' | 'reported';

export const APPRAISAL_BUNDLE_STATUS_COPY: Record<AppraisalBundleStatus, { label: string; tone: SemanticTone }> = {
  'on-process': { label: 'On Process', tone: 'neutral' },
  'for-approval': { label: 'For Approval', tone: 'warning' },
  'for-report': { label: 'For Report', tone: 'info' },
  reported: { label: 'Reported', tone: 'success' },
};

export function getAppraisalBundleStatus(
  bundle: AppraisalReportBundle,
  feeApprovalStatus: FeeApprovalStatus,
  feeSettled: boolean
): AppraisalBundleStatus {
  if (bundle.report.uploadedAt) return 'reported';
  if (bundle.feeNeeded === 'no' || (feeApprovalStatus === 'approved' && feeSettled)) return 'for-report';
  if (feeApprovalStatus === 'pending-approval') return 'for-approval';
  return 'on-process';
}
