import type { CallReport } from 'src/auth/admin-context';

import {
  labelFor,
  INTERACTION_TYPE_OPTIONS,
  IDENTITY_STATUS_OPTIONS,
  LOAN_PURPOSE_OPTIONS,
  RISK_DRIVER_OPTIONS,
  CALL_DISPOSITION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// Pure function: reads the structured CallReport answers and composes a
// plain-text summary for the "NEXUS System Validation" card's AI Summary
// field, skipping any section whose relevant fields are still empty.
// Recomputed fresh whenever the officer clicks "Refresh AI Review" (see
// system-validation-card.tsx) rather than on every render, so an officer
// can see exactly what changed since the last refresh.
// ----------------------------------------------------------------------

export function buildCallSummary(
  callReport: CallReport,
  signUpData: { firstName: string; lastName: string } | null
): string {
  const lines: string[] = [];
  const name = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : 'the borrower';

  const interactionLabel = labelFor(INTERACTION_TYPE_OPTIONS, callReport.interactionType);
  if (callReport.callVisitDate || interactionLabel) {
    const parts = [`Call with ${name}`];
    if (callReport.callVisitDate) parts.push(`on ${callReport.callVisitDate}`);
    if (callReport.callTime) parts.push(callReport.callTime);
    if (interactionLabel) parts.push(`(${interactionLabel})`);
    lines.push(`${parts.join(' ')}.`);
  }

  const identityLabel = labelFor(IDENTITY_STATUS_OPTIONS, callReport.identityStatus);
  if (identityLabel) lines.push(`Identity status: ${identityLabel}.`);

  const changedItems = Object.entries(callReport.validation).filter(([, status]) => status === 'changed');
  const unableItems = Object.entries(callReport.validation).filter(([, status]) => status === 'unable-to-verify');
  if (changedItems.length > 0) {
    lines.push(`${changedItems.length} application item(s) marked Changed during this call.`);
  }
  if (unableItems.length > 0) {
    lines.push(`${unableItems.length} application item(s) Unable to Verify.`);
  }

  const loanPurposeLabel = labelFor(LOAN_PURPOSE_OPTIONS, callReport.loanPurposeChangedTo);
  if (loanPurposeLabel) lines.push(`Loan purpose changed to: ${loanPurposeLabel}.`);

  const riskDriverLabels = callReport.primaryRiskDrivers
    .map((value) => labelFor(RISK_DRIVER_OPTIONS, value))
    .filter((label): label is string => !!label);
  if (riskDriverLabels.length > 0) {
    lines.push(`Primary risk driver(s): ${riskDriverLabels.join(', ')}.`);
  }

  const dispositionLabel = labelFor(CALL_DISPOSITION_OPTIONS, callReport.callDisposition);
  if (dispositionLabel) lines.push(`Call disposition: ${dispositionLabel}.`);

  if (callReport.proposedLoanAmount) {
    const term = callReport.proposedLoanTermMonths ? ` over ${callReport.proposedLoanTermMonths} months` : '';
    lines.push(`Proposed: ₱${Number(callReport.proposedLoanAmount).toLocaleString()}${term}.`);
  }

  return lines.join(' ');
}

// ----------------------------------------------------------------------
// AI Exceptions / Inconsistencies field — flags AML/KYC "for verification"
// or "yes" answers to red-flag questions, and any Application Validation
// row marked Unable to Verify, since those are exactly what the PDF's own
// "8. NEXUS System Validation" section is meant to surface.
// ----------------------------------------------------------------------

export function buildCallReportAiExceptions(callReport: CallReport): string {
  const exceptions: string[] = [];

  if (callReport.amlIsPep === 'yes' || callReport.amlIsPep === 'for-verification') {
    exceptions.push('Customer flagged as a possible Politically Exposed Person (PEP).');
  }
  if (callReport.amlIsPgfcRelatedParty === 'yes' || callReport.amlIsPgfcRelatedParty === 'for-verification') {
    exceptions.push('Customer flagged as a possible PGFC-related party.');
  }
  if (callReport.amlHasReturnedChecks === 'yes' || callReport.amlHasReturnedChecks === 'for-verification') {
    exceptions.push('Customer has a history of returned checks.');
  }
  if (callReport.amlHasPastDueObligations === 'yes' || callReport.amlHasPastDueObligations === 'for-verification') {
    exceptions.push('Customer has past due or unpaid financial obligations.');
  }
  if (callReport.amlPaymentHistory === 'major-delays' || callReport.amlPaymentHistory === 'for-verification') {
    exceptions.push('Payment history shows major delays or needs verification.');
  }

  const unableCount = Object.values(callReport.validation).filter((status) => status === 'unable-to-verify').length;
  if (unableCount > 0) {
    exceptions.push(`${unableCount} application validation item(s) could not be verified during this call.`);
  }

  return exceptions.length > 0 ? exceptions.join(' ') : 'No exceptions or inconsistencies flagged.';
}
