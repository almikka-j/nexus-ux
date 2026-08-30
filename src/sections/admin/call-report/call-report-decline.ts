// ----------------------------------------------------------------------
// Shared between Call Report's own "Sales Reject" button
// (call-report-view.tsx) and the Call Report Approval screen's "Decline"
// action (call-report-approval-bundle-view.tsx) — both reject an
// application to Reconsideration with the same reason list and the same
// "{category} — {remarks}" formatting, so they can never drift apart.
// ----------------------------------------------------------------------

export const SALES_REJECT_REASONS = [
  'Insufficient income',
  'Poor credit history',
  'Incomplete documents',
  'Employment not verifiable',
  'Requested amount too high',
  'Other',
];

export function buildDecisionReason(reasonCategory: string, reasonRemarks: string): string {
  return reasonRemarks.trim() ? `${reasonCategory} — ${reasonRemarks.trim()}` : reasonCategory;
}
