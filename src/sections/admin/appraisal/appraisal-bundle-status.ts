import type { SemanticTone } from 'src/components/admin-ui';

import { getBundleUploadedAt } from 'src/auth/admin-context';

import type { AppraisalReportBundle } from 'src/auth/admin-context';

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
//
// `feeApprovalStatus` used to be a whole-application batch value passed
// in separately; fee approval moved to per-bundle (see
// docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md),
// so this now reads `bundle.feeApprovalStatus` directly instead of
// taking it as a parameter — one less thing for each call site to wire
// up, and it can never drift from the bundle it's actually describing.
// `feeSettled` still comes from the caller since it also depends on
// whole-application `paymentReceivedAt` (the client-advisory step, which
// stays whole-application — see admin-context.tsx's Appraisal type).
// ----------------------------------------------------------------------

export type AppraisalBundleStatus = 'on-process' | 'for-approval' | 'for-report' | 'reported';

export const APPRAISAL_BUNDLE_STATUS_COPY: Record<AppraisalBundleStatus, { label: string; tone: SemanticTone }> = {
  'on-process': { label: 'On Process', tone: 'neutral' },
  'for-approval': { label: 'For Approval', tone: 'warning' },
  'for-report': { label: 'For Report', tone: 'info' },
  reported: { label: 'Reported', tone: 'success' },
};

export function getAppraisalBundleStatus(bundle: AppraisalReportBundle, feeSettled: boolean): AppraisalBundleStatus {
  if (getBundleUploadedAt(bundle)) return 'reported';
  if (bundle.feeNeeded === 'no' || (bundle.feeApprovalStatus === 'approved' && feeSettled)) return 'for-report';
  if (bundle.feeApprovalStatus === 'pending-approval') return 'for-approval';
  return 'on-process';
}
