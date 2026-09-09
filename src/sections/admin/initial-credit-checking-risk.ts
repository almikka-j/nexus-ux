// Shared with initial-credit-checking-view.tsx (renders the risk callout)
// and call-report/credit-checking-result-modal.tsx (uses the level to decide
// the report's Cleared/not-Cleared tone) — a single source of truth so the
// two screens never disagree on what counts as "negative."
//
// Translates the PDF template's "8. AUTOMATED DECISION LOGIC" 6-condition
// table into real if/else branches (see
// docs/superpowers/specs/2026-08-29-bureau-reports-results-design.md), and
// the "AI RECOMMENDATION" block's field structure (Overall Assessment / AI
// Risk Level / AI Summary sub-bullets / AI Recommended Action / Reason for
// Recommendation / AI Review Basis / Required Verification or Next Steps).
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

export type RecommendedActionCode =
  | 'clear-to-proceed'
  | 'proceed-subject-to-verification'
  | 'for-further-credit-review'
  | 'on-hold'
  | 'policy-exception'
  | 'does-not-meet-initial-rac';

export const RECOMMENDED_ACTION_LABELS: Record<RecommendedActionCode, string> = {
  'clear-to-proceed': 'CLEAR TO PROCEED',
  'proceed-subject-to-verification': 'PROCEED SUBJECT TO VERIFICATION',
  'for-further-credit-review': 'FOR FURTHER CREDIT REVIEW',
  'on-hold': 'ON HOLD',
  'policy-exception': 'POLICY EXCEPTION',
  'does-not-meet-initial-rac': 'DOES NOT MEET INITIAL RAC',
};

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
  'unable-to-determine': 'UNABLE TO DETERMINE – INSUFFICIENT INFORMATION',
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

export function isNegativeStatus(value: string): boolean {
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
  /**
   * The simulated bureau-review outcome from simulate-bureau-finding.ts
   * (see initial-credit-checking-view.tsx's useEffect) — independent of the
   * canned bureau row data above, since it represents a random negative
   * finding rolled once per upload session rather than anything read from
   * cmapCases/bapNfisRecords/etc. Must override every other rule: a negative
   * simulated finding always means the application does not meet the
   * initial RAC, regardless of what the (always-clean) canned rows say.
   */
  bureauFindingStatus?: 'pending' | 'clean' | 'negative';
  bureauFindingBureau?: string | null;
  bureauFindingReason?: string | null;
};

export type InitialCreditCheckingResult = {
  riskLevel: InitialCreditCheckingRiskLevel;
  overallAssessment: string;
  favorableFindings: string[];
  adverseFindings: string[];
  discrepancies: string[];
  missingInformation: string[];
  recommendedAction: RecommendedActionCode;
  reasonForRecommendation: string;
  reviewBasis: ReviewBasisTag[];
  requiredVerification: string[];
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
    bureauFindingStatus,
    bureauFindingBureau,
    bureauFindingReason,
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
  // Stricter tier above the existing 60% "elevated" threshold: a requested
  // amount exceeding a full year's income is treated as a deviation from
  // standard lending policy, not just an elevated-risk indicator.
  const exceedsPolicyDebtRatio = ratio !== null && ratio > 1.0;

  const buildAssessment = (level: InitialCreditCheckingRiskLevel, detail: string) =>
    `The applicant is assessed as ${RISK_LEVEL_LABELS[level]} credit risk based on consolidated bureau results, existing exposure, payment history, legal findings, and credit scoring. ${detail}`.trim();

  // 0. DOES NOT MEET INITIAL RAC — a negative simulated bureau finding
  // overrides every other rule below, including the always-clean canned row
  // data (see the BuildInitialCreditCheckingResultInput doc comment).
  if (bureauFindingStatus === 'negative') {
    const bureau = bureauFindingBureau ?? 'a bureau report';
    const reason = bureauFindingReason ?? 'an unspecified adverse finding';
    return {
      riskLevel: 'high',
      overallAssessment: buildAssessment(
        'high',
        `${bureau} flagged an adverse finding (${reason}) that does not satisfy the applicable Risk Acceptance Criteria.`
      ),
      favorableFindings: [],
      adverseFindings: [`${bureau} flagged: ${reason}.`],
      discrepancies: [],
      missingInformation: [],
      recommendedAction: 'does-not-meet-initial-rac',
      reasonForRecommendation: `${bureau} returned a confirmed adverse finding (${reason}). This does not satisfy the applicable Risk Acceptance Criteria and requires independent validation by authorized Credit personnel before any further action.`,
      reviewBasis: ['delinquency-overdue-history', 'policy-rac-alignment'],
      requiredVerification: [
        `Independent validation of the ${bureau} finding by authorized Credit personnel.`,
      ],
    };
  }

  // 1. ON HOLD — missing bureau result / incomplete data.
  if (!allBureauReportsUploaded) {
    return {
      riskLevel: 'unable-to-determine',
      overallAssessment: buildAssessment(
        'unable-to-determine',
        'One or more required bureau reports have not been uploaded yet, so a complete risk determination cannot be made at this time.'
      ),
      favorableFindings: [],
      adverseFindings: [],
      discrepancies: [],
      missingInformation: [
        'One or more bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, PGFC Existing Exposure) have not been uploaded.',
      ],
      recommendedAction: 'on-hold',
      reasonForRecommendation:
        'The application is placed on hold because required bureau reports or KYC information are incomplete. A risk determination cannot be finalized until all reports are on file.',
      reviewBasis: ['data-completeness'],
      requiredVerification: ['Upload the remaining bureau reports above before proceeding.'],
    };
  }

  // 2. DOES NOT MEET INITIAL RAC — court/legal findings or a negative status
  // anywhere across the bureau tables.
  if (hasCourtCase || hasNegativeStatus) {
    const reviewBasis: ReviewBasisTag[] = [];
    if (hasCourtCase) reviewBasis.push('court-legal-findings');
    if (hasNegativeStatus) reviewBasis.push('delinquency-overdue-history');
    if (hasExistingExposure) reviewBasis.push('existing-exposure');
    reviewBasis.push('policy-rac-alignment');

    const adverseFindings: string[] = [];
    if (hasCourtCase) adverseFindings.push('A court or legal case was found on record.');
    if (hasNegativeStatus) adverseFindings.push('One or more accounts show a delinquent, overdue, or negative status.');

    return {
      riskLevel: 'high',
      overallAssessment: buildAssessment(
        'high',
        `${totalRows} bureau record(s) were reviewed across CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, and PGFC Existing Exposure, and confirmed findings do not satisfy the applicable Risk Acceptance Criteria.`
      ),
      favorableFindings: [],
      adverseFindings,
      discrepancies: [],
      missingInformation: [],
      recommendedAction: 'does-not-meet-initial-rac',
      reasonForRecommendation:
        'A confirmed and validated adverse finding — court/legal record or delinquent status — does not satisfy the applicable Risk Acceptance Criteria. This finding requires independent validation by authorized Credit personnel before any further action.',
      reviewBasis,
      requiredVerification: [
        'Independent validation of the flagged finding(s) by authorized Credit personnel.',
      ],
    };
  }

  // 3. POLICY EXCEPTION — requested amount exceeds a full year's income,
  // a deviation from standard lending policy rather than merely elevated
  // risk (see rule 4 below for the milder 60% threshold).
  if (exceedsPolicyDebtRatio) {
    return {
      riskLevel: 'elevated',
      overallAssessment: buildAssessment(
        'elevated',
        `Requested amount is approximately ${((ratio ?? 0) * 100).toFixed(0)}% of annual income for stated employment (${employmentStatus.toLowerCase()}), exceeding standard lending policy limits.`
      ),
      favorableFindings: hasExistingExposure ? [] : ['No adverse bureau findings were identified.'],
      adverseFindings: [],
      discrepancies: [
        `Requested loan amount exceeds a full year of stated income (approximately ${((ratio ?? 0) * 100).toFixed(0)}% of annual income).`,
      ],
      missingInformation: [],
      recommendedAction: 'policy-exception',
      reasonForRecommendation:
        'The requested loan amount deviates from standard PGFC credit policy relative to the applicant’s stated income. The finding may still be referred to authorized personnel for exception review.',
      reviewBasis: ['credit-scoring', 'policy-rac-alignment'],
      requiredVerification: [
        'Refer to authorized Credit personnel for policy exception review.',
        'Confirm stated income and employment details before proceeding.',
      ],
    };
  }

  // 4. FOR FURTHER CREDIT REVIEW — existing PGFC exposure, or a high
  // debt-to-income ratio relative to stated income (below the policy-
  // exception threshold above).
  if (hasExistingExposure || highDebtRatio) {
    const reviewBasis: ReviewBasisTag[] = ['credit-scoring'];
    if (hasExistingExposure) reviewBasis.push('existing-exposure', 'pgfc-payment-history');

    const adverseFindings: string[] = [];
    if (hasExistingExposure) adverseFindings.push('The applicant has existing PGFC exposure on record.');
    if (highDebtRatio) {
      adverseFindings.push(
        `Requested amount is high relative to stated income (${employmentStatus.toLowerCase()}), approximately ${((ratio ?? 0) * 100).toFixed(0)}% of annual income.`
      );
    }

    return {
      riskLevel: 'elevated',
      overallAssessment: buildAssessment(
        'elevated',
        'Existing exposure and/or debt-to-income indicators warrant further credit review before a final decision.'
      ),
      favorableFindings: [],
      adverseFindings,
      discrepancies: [],
      missingInformation: [],
      recommendedAction: 'for-further-credit-review',
      reasonForRecommendation:
        'Elevated risk indicators — existing credit exposure and/or a high debt-to-income ratio — were identified. These do not constitute an outright adverse finding but warrant further credit review before a final decision.',
      reviewBasis,
      requiredVerification: [
        'Review existing exposure and debt-to-income indicators before final decision.',
      ],
    };
  }

  // 5. PROCEED SUBJECT TO VERIFICATION — a genuinely intermediate state: some
  // bureau activity is on record but not everything has been uploaded yet
  // (so rule 1 hasn't fired), and nothing adverse was found. With the current
  // canned-data reality every bureau always seeds exactly one clean row the
  // instant its file is uploaded, so once `allBureauReportsUploaded` is true
  // this condition can no longer distinguish anything from rule 6 below —
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
      overallAssessment: buildAssessment(
        'moderate',
        `${totalRows} bureau record(s) were reviewed across CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, and PGFC Existing Exposure with no adverse findings, but recorded activity should be verified before proceeding.`
      ),
      favorableFindings: ['No adverse bureau findings were identified.'],
      adverseFindings: [],
      discrepancies: ['Recorded bureau activity should be verified against the application details.'],
      missingInformation: [],
      recommendedAction: 'proceed-subject-to-verification',
      reasonForRecommendation:
        'No material adverse findings were identified, but some recorded bureau activity requires clarification or verification before it can be treated as fully consistent with the application.',
      reviewBasis: ['bureau-consistency'],
      requiredVerification: [
        'Verify the recorded bureau activity above against the application details.',
      ],
    };
  }

  // 6. CLEAR TO PROCEED — every report uploaded, nothing adverse anywhere,
  // income ratio acceptable. This is the common case now that every bureau
  // always seeds a clean canned row on upload.
  return {
    riskLevel: 'low',
    overallAssessment: buildAssessment(
      'low',
      `All 6 bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, PGFC Existing Exposure) are on file with no adverse findings, court/legal records, or existing PGFC exposure, and the requested amount is within an acceptable range for stated income (${employmentStatus.toLowerCase()}).`
    ),
    favorableFindings: [
      'All 6 bureau reports are on file with no adverse findings.',
      'No court/legal records or existing PGFC exposure were identified.',
      'Debt-to-income ratio is within an acceptable range for stated income.',
    ],
    adverseFindings: [],
    discrepancies: [],
    missingInformation: [],
    recommendedAction: 'clear-to-proceed',
    reasonForRecommendation:
      'Reports are complete and consistent, with no material adverse findings. Debt-to-income and bureau indicators are within an acceptable range, so the application may proceed to Call Report preparation.',
    reviewBasis: ['data-completeness', 'bureau-consistency'],
    requiredVerification: [],
  };
}
