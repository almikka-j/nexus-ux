import type { CallReport } from 'src/auth/admin-context';

import {
  computeTotalMonthlyIncome,
  computeTotalMonthlyObligations,
  computeDisposableIncome,
  computeDti,
} from './call-report-computations';
import {
  labelFor,
  CALL_TYPE_OPTIONS,
  IDENTITY_CONFIRMED_OPTIONS,
  REPAYMENT_SOURCE_OPTIONS,
  RESIDENCE_YEARS_OPTIONS,
  INCOME_TREND_OPTIONS,
  OFFICER_OBSERVATION_POSITIVE_OPTIONS,
  OFFICER_OBSERVATION_ATTENTION_OPTIONS,
  NEXT_ACTION_OPTIONS,
  PRELIMINARY_RECOMMENDATION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// Pure function: reads the structured CallReport answers and composes a
// plain-text summary, skipping any section whose relevant fields are still
// empty ("include when available" per the design spec). Never called
// automatically on every keystroke — only when the officer opens the Call
// Summary card for the first time (empty callSummary) or clicks Regenerate.
// ----------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function buildCallSummary(
  callReport: CallReport,
  signUpData: { firstName: string; lastName: string } | null
): string {
  const lines: string[] = [];
  const name = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : 'the borrower';

  const callTypeLabel = labelFor(CALL_TYPE_OPTIONS, callReport.callType);
  if (callReport.callDate || callTypeLabel) {
    const parts = [`Call with ${name}`];
    if (callReport.callDate) parts.push(`on ${callReport.callDate}`);
    if (callReport.callTime) parts.push(`${callReport.callTime}`);
    if (callTypeLabel) parts.push(`(${callTypeLabel})`);
    lines.push(`${parts.join(' ')}.`);
  }

  const identityLabel = labelFor(IDENTITY_CONFIRMED_OPTIONS, callReport.identityConfirmed);
  if (identityLabel) lines.push(`Identity confirmed: ${identityLabel}.`);

  if (callReport.finalLoanPurpose) {
    lines.push(`Loan purpose: ${callReport.finalLoanPurpose}.`);
  }
  const repaymentLabel = labelFor(REPAYMENT_SOURCE_OPTIONS, callReport.primaryRepaymentSource);
  if (repaymentLabel) lines.push(`Primary source of repayment: ${repaymentLabel}.`);

  const residenceYearsLabel = labelFor(RESIDENCE_YEARS_OPTIONS, callReport.yearsAtResidence);
  if (residenceYearsLabel || callReport.numberOfDependents) {
    const parts: string[] = [];
    if (residenceYearsLabel) parts.push(`residing at current address for ${residenceYearsLabel.toLowerCase()}`);
    if (callReport.numberOfDependents) parts.push(`${callReport.numberOfDependents} dependents`);
    if (parts.length) lines.push(`Household: ${parts.join(', ')}.`);
  }

  const trendLabel = labelFor(INCOME_TREND_OPTIONS, callReport.incomeTrend);
  if (trendLabel) {
    lines.push(`Employment/business income trend: ${trendLabel.toLowerCase()}.`);
  }

  if (callReport.declaredNetMonthlyIncome) {
    const income = computeTotalMonthlyIncome(callReport);
    const obligations = computeTotalMonthlyObligations(callReport);
    const disposable = computeDisposableIncome(callReport);
    const dti = computeDti(callReport);
    lines.push(
      `Declared net monthly income ${formatCurrency(income)}; total obligations ${formatCurrency(
        obligations
      )}; preliminary disposable income ${formatCurrency(disposable)} (DTI ${dti.toFixed(0)}%).`
    );
  }

  const allObservationOptions = [
    ...OFFICER_OBSERVATION_POSITIVE_OPTIONS,
    ...OFFICER_OBSERVATION_ATTENTION_OPTIONS,
  ];
  if (callReport.officerObservations.length > 0) {
    const labels = callReport.officerObservations
      .map((value) => labelFor(allObservationOptions, value))
      .filter((label): label is string => !!label);
    lines.push(`Officer observations: ${labels.join(', ').toLowerCase()}.`);
  }

  if (callReport.collateralOffered === 'yes' && callReport.collateralEntries.length > 0) {
    lines.push(
      `Collateral: ${callReport.collateralEntries.length} item(s) offered.`
    );
  } else if (callReport.collateralOffered === 'no') {
    lines.push('No collateral offered.');
  }

  const nextActionLabel = labelFor(NEXT_ACTION_OPTIONS, callReport.nextAction);
  if (nextActionLabel) {
    const label = callReport.nextAction === 'other' && callReport.nextActionOther
      ? callReport.nextActionOther
      : nextActionLabel;
    const followUpSuffix = callReport.followUpDate ? ` Follow-up on ${callReport.followUpDate}.` : '';
    lines.push(`Next step: ${label.toLowerCase()}.${followUpSuffix}`);
  }

  if (callReport.proposedLoanAmount) {
    const term = callReport.proposedLoanTerm ? ` over ${callReport.proposedLoanTerm} months` : '';
    lines.push(`Proposed: ₱${Number(callReport.proposedLoanAmount).toLocaleString()}${term}.`);
  }

  const recommendationLabel = labelFor(
    PRELIMINARY_RECOMMENDATION_OPTIONS,
    callReport.preliminaryRecommendation
  );
  if (recommendationLabel) {
    lines.push(`Preliminary recommendation: ${recommendationLabel}.`);
  }

  return lines.join(' ');
}
