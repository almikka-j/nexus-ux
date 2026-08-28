// Shared with initial-credit-checking-view.tsx (renders the risk callout)
// and call-report/credit-checking-result-modal.tsx (uses the level to decide
// the report's Cleared/not-Cleared tone) — a single source of truth so the
// two screens never disagree on what counts as "negative."
//
// Translates the PDF template's "8. AUTOMATED DECISION LOGIC" 6-condition
// table into real if/else branches (see
// docs/superpowers/specs/2026-08-29-bureau-reports-results-design.md).
// Entirely computed, never stored — same "pure derivation" convention as
// every other AI output in this app.

import type {
  CmapCase,
  BapNfisRecord,
  CibiResult,
  CicContract,
  LoandexRecord,
  PgfcExposureRecord,
} from 'src/auth/admin-context';

export type InitialCreditCheckingRiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'unable-to-determine';

export type ReviewBasisTag =
  | 'bureau-consistency'
  | 'existing-exposure'
  | 'delinquency-overdue-history'
  | 'court-legal-findings'
  | 'pgfc-payment-history'
  | 'credit-scoring'
  | 'policy-rac-alignment'
  | 'kyc-aml-fraud-indicators'
  | 'data-completeness';

export const REVIEW_BASIS_LABELS: Record<ReviewBasisTag, string> = {
  'bureau-consistency': 'Bureau consistency',
  'existing-exposure': 'Existing exposure',
  'delinquency-overdue-history': 'Delinquency / overdue history',
  'court-legal-findings': 'Court / legal findings',
  'pgfc-payment-history': 'PGFC payment history',
  'credit-scoring': 'Credit scoring',
  'policy-rac-alignment': 'Policy / RAC alignment',
  'kyc-aml-fraud-indicators': 'KYC / AML / fraud indicators',
  'data-completeness': 'Data completeness',
};

const RISK_LEVEL_LABELS: Record<InitialCreditCheckingRiskLevel, string> = {
  low: 'LOW',
  moderate: 'MODERATE',
  elevated: 'ELEVATED',
  high: 'HIGH',
  'unable-to-determine': 'UNABLE TO DETERMINE',
};

// Deterministic keyword match against each row's own status-like field —
// same "hash/keyword, not real NLP" spirit as simulate-bureau-finding.ts's
// existing negative-finding logic, not a real classifier.
const NEGATIVE_STATUS_KEYWORDS = [
  'overdue',
  'delinquent',
  'default',
  'past due',
  'negative',
  'closed with balance',
];

function isNegativeStatus(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return NEGATIVE_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export type BuildInitialCreditCheckingResultInput = {
  cmapCases: CmapCase[];
  bapNfisRecords: BapNfisRecord[];
  cibiResults: CibiResult[];
  cicContracts: CicContract[];
  loandexRecords: LoandexRecord[];
  pgfcExposureRecords: PgfcExposureRecord[];
  allBureauReportsUploaded: boolean;
  desiredLoanAmount: number;
  monthlyIncome: number;
  employmentStatus: string;
};

export type InitialCreditCheckingResult = {
  riskLevel: InitialCreditCheckingRiskLevel;
  overallAssessment: string;
  summary: string;
  recommendedAction: string;
  reviewBasis: ReviewBasisTag[];
};

export function buildInitialCreditCheckingResult(
  input: BuildInitialCreditCheckingResultInput
): InitialCreditCheckingResult {
  const {
    cmapCases,
    bapNfisRecords,
    cibiResults,
    cicContracts,
    loandexRecords,
    pgfcExposureRecords,
    allBureauReportsUploaded,
    desiredLoanAmount,
    monthlyIncome,
    employmentStatus,
  } = input;

  const totalRows =
    cmapCases.length +
    bapNfisRecords.length +
    cibiResults.length +
    cicContracts.length +
    loandexRecords.length;

  const hasCourtCase = cmapCases.length > 0;
  const hasNegativeStatus =
    bapNfisRecords.some((row) => isNegativeStatus(row.statusRemarks) || isNegativeStatus(row.paymentHistory)) ||
    cibiResults.some((row) => isNegativeStatus(row.paymentStatus)) ||
    cicContracts.some((row) => isNegativeStatus(row.contractStatus)) ||
    loandexRecords.some((row) => isNegativeStatus(row.accountStatus)) ||
    pgfcExposureRecords.some((row) => isNegativeStatus(row.paymentStatus));

  const ratio = monthlyIncome > 0 ? desiredLoanAmount / (monthlyIncome * 12) : null;
  const hasExistingExposure = pgfcExposureRecords.length > 0;
  const highDebtRatio = ratio !== null && ratio > 0.6;

  const buildAssessment = (level: InitialCreditCheckingRiskLevel) =>
    `The applicant is assessed as ${RISK_LEVEL_LABELS[level]} credit risk based on consolidated bureau results, existing exposure, payment history, legal findings, and credit scoring.`;

  // 1. ON HOLD — missing bureau result / incomplete data.
  if (!allBureauReportsUploaded) {
    return {
      riskLevel: 'unable-to-determine',
      overallAssessment: buildAssessment('unable-to-determine'),
      summary:
        'One or more bureau reports have not been uploaded yet. Risk assessment cannot be completed until CIBI, LOANDEX, CIC, CMAP, and NFIS/BAP reports are all on file.',
      recommendedAction: 'Upload the remaining bureau reports above before proceeding.',
      reviewBasis: ['data-completeness'],
    };
  }

  // 2. DOES NOT MEET INITIAL RAC / FOR FURTHER CREDIT REVIEW — court/legal
  // findings or a negative status anywhere across the bureau tables.
  if (hasCourtCase || hasNegativeStatus) {
    const reviewBasis: ReviewBasisTag[] = [];
    if (hasCourtCase) reviewBasis.push('court-legal-findings');
    if (hasNegativeStatus) reviewBasis.push('delinquency-overdue-history');
    if (hasExistingExposure) reviewBasis.push('existing-exposure');
    return {
      riskLevel: 'high',
      overallAssessment: buildAssessment('high'),
      summary: `${totalRows} bureau record(s) reviewed across CIBI, LOANDEX, CIC, CMAP, and NFIS/BAP. ${hasCourtCase ? 'A court/legal case was found on record. ' : ''}${hasNegativeStatus ? 'One or more accounts show a delinquent, overdue, or negative status.' : ''}`.trim(),
      recommendedAction:
        'Recommend further credit review before proceeding — the finding(s) above require independent validation by authorized Credit personnel.',
      reviewBasis,
    };
  }

  // 3. FOR FURTHER CREDIT REVIEW — existing PGFC exposure, or a high
  // debt-to-income ratio relative to stated income.
  if (hasExistingExposure || highDebtRatio) {
    const reviewBasis: ReviewBasisTag[] = ['credit-scoring'];
    if (hasExistingExposure) reviewBasis.push('existing-exposure', 'pgfc-payment-history');
    return {
      riskLevel: 'elevated',
      overallAssessment: buildAssessment('elevated'),
      summary: `${hasExistingExposure ? 'The applicant has existing PGFC exposure on record. ' : ''}${highDebtRatio ? `Requested amount is high relative to stated income (${employmentStatus.toLowerCase()}), approximately ${((ratio ?? 0) * 100).toFixed(0)}% of annual income.` : ''}`.trim(),
      recommendedAction: 'Recommend proceeding with added scrutiny — review existing exposure and debt-to-income indicators before final decision.',
      reviewBasis,
    };
  }

  // 4. PROCEED SUBJECT TO VERIFICATION — at least one row on file, nothing
  // adverse found.
  if (totalRows > 0) {
    return {
      riskLevel: 'moderate',
      overallAssessment: buildAssessment('moderate'),
      summary: `${totalRows} bureau record(s) reviewed across CIBI, LOANDEX, CIC, CMAP, and NFIS/BAP. No adverse findings, but recorded activity should be verified against the application details before proceeding.`,
      recommendedAction: 'Recommend proceeding to Call Report preparation, subject to verification of the recorded bureau activity above.',
      reviewBasis: ['bureau-consistency'],
    };
  }

  // 5. CLEAR TO PROCEED — every report uploaded, nothing recorded, income
  // ratio acceptable.
  return {
    riskLevel: 'low',
    overallAssessment: buildAssessment('low'),
    summary: `All 5 bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP) are on file with no adverse findings, court/legal records, or existing PGFC exposure. Requested amount is within an acceptable range for stated income (${employmentStatus.toLowerCase()}).`,
    recommendedAction: 'Debt-to-income and bureau indicators are within an acceptable range. Recommend proceeding to Call Report preparation.',
    reviewBasis: ['data-completeness', 'bureau-consistency'],
  };
}
