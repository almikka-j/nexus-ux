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

// createBapNfisSampleRecord()'s canned CLEAN statusRemarks value ("No
// cancelled credit card, adversely classified loan, or negative-file
// indicator found.") uses "negative-file indicator" as bureau jargon for "a
// derogatory-record file" — it contains the substring "negative" while
// stating a clean result, the same false-positive shape rules 1-3 above had
// to be fixed for. Exempt this one known clean phrase rather than weakening
// the "negative" keyword generally (real free-text negative findings, if
// this app ever gains them, should still match on that word elsewhere).
const NEGATIVE_STATUS_KEYWORD_EXEMPTIONS = ['negative-file indicator found'];

function isNegativeStatus(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (NEGATIVE_STATUS_KEYWORD_EXEMPTIONS.some((phrase) => normalized.includes(phrase))) {
    return false;
  }
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
    loandexRecords.length +
    pgfcExposureRecords.length;

  // Every bureau now ALWAYS seeds exactly one canned row the moment its file
  // is uploaded (see admin-context.tsx's createXSampleRecord factories) — row
  // *presence* no longer means anything, since a row exists whether the
  // finding is adverse or clean. These predicates must instead read each
  // row's own status-like field and compare against the canned clean value
  // that factory always writes; anything else is an adverse finding. Exact
  // match is sufficient here — this is a closed set of canned values with no
  // free-text officer input anywhere in this prototype.
  const hasCourtCase = cmapCases.some((row) => row.status.trim().toLowerCase() !== 'no record found');
  const hasNegativeStatus =
    bapNfisRecords.some((row) => isNegativeStatus(row.statusRemarks) || isNegativeStatus(row.paymentHistory)) ||
    cibiResults.some((row) => isNegativeStatus(row.paymentStatus)) ||
    cicContracts.some((row) => isNegativeStatus(row.contractStatus)) ||
    loandexRecords.some((row) => isNegativeStatus(row.accountStatus)) ||
    pgfcExposureRecords.some((row) => isNegativeStatus(row.paymentStatus));

  const ratio = monthlyIncome > 0 ? desiredLoanAmount / (monthlyIncome * 12) : null;
  const hasExistingExposure = pgfcExposureRecords.some(
    (row) => row.paymentStatus.trim().toLowerCase() !== 'no existing exposure'
  );
  const highDebtRatio = ratio !== null && ratio > 0.6;

  const buildAssessment = (level: InitialCreditCheckingRiskLevel) =>
    `The applicant is assessed as ${RISK_LEVEL_LABELS[level]} credit risk based on consolidated bureau results, existing exposure, payment history, legal findings, and credit scoring.`;

  // 1. ON HOLD — missing bureau result / incomplete data.
  if (!allBureauReportsUploaded) {
    return {
      riskLevel: 'unable-to-determine',
      overallAssessment: buildAssessment('unable-to-determine'),
      summary:
        'One or more bureau reports have not been uploaded yet. Risk assessment cannot be completed until CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, and PGFC Existing Exposure reports are all on file.',
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
      summary: `${totalRows} bureau record(s) reviewed across CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, and PGFC Existing Exposure. ${hasCourtCase ? 'A court/legal case was found on record. ' : ''}${hasNegativeStatus ? 'One or more accounts show a delinquent, overdue, or negative status.' : ''}`.trim(),
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

  // 4. PROCEED SUBJECT TO VERIFICATION — a genuinely intermediate state: some
  // bureau activity is on record but not everything has been uploaded yet
  // (so rule 1 hasn't fired), and nothing adverse was found. With the current
  // canned-data reality every bureau always seeds exactly one clean row the
  // instant its file is uploaded, so once `allBureauReportsUploaded` is true
  // this condition can no longer distinguish anything from rule 5 below —
  // that combination now falls through to CLEAR TO PROCEED instead. This
  // branch is kept structurally in place in case a future data source (real
  // bureau integrations, partial/ambiguous records) produces a state that
  // legitimately belongs here. Note `!allBureauReportsUploaded` can never be
  // true at this point in the function (rule 1 already returned early for
  // that case) — this condition is intentionally unreachable under today's
  // canned-data reality, not a bug; it documents the shape of state this
  // branch is reserved for.
  if (totalRows > 0 && !allBureauReportsUploaded) {
    return {
      riskLevel: 'moderate',
      overallAssessment: buildAssessment('moderate'),
      summary: `${totalRows} bureau record(s) reviewed across CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, and PGFC Existing Exposure. No adverse findings, but recorded activity should be verified against the application details before proceeding.`,
      recommendedAction: 'Recommend proceeding to Call Report preparation, subject to verification of the recorded bureau activity above.',
      reviewBasis: ['bureau-consistency'],
    };
  }

  // 5. CLEAR TO PROCEED — every report uploaded, nothing adverse anywhere,
  // income ratio acceptable. This is the common case now that every bureau
  // always seeds a clean canned row on upload.
  return {
    riskLevel: 'low',
    overallAssessment: buildAssessment('low'),
    summary: `All 6 bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, PGFC Existing Exposure) are on file with no adverse findings, court/legal records, or existing PGFC exposure. Requested amount is within an acceptable range for stated income (${employmentStatus.toLowerCase()}).`,
    recommendedAction: 'Debt-to-income and bureau indicators are within an acceptable range. Recommend proceeding to Call Report preparation.',
    reviewBasis: ['data-completeness', 'bureau-consistency'],
  };
}
