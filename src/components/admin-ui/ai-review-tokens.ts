// ----------------------------------------------------------------------
// Risk-level display tokens for the shared AiReviewCard. Two distinct
// scales, deliberately kept apart:
//
//  - AI_REVIEW_RISK_STYLES — the 3-level *document-readiness* scale used by
//    Requirement Checklist / Credit Investigation / Financial Evaluation
//    ("is this checklist ready to advance?").
//  - SCREENING_RISK_STYLES — the 5-level *screening-risk* scale used by
//    Initial Credit Checking ("how risky does this applicant look?").
//
// Both feed the same visual slot in AiReviewCard (the risk pill + the
// tinted assessment/recommendation box); the scales are not
// interchangeable, so a screen picks exactly one.
// ----------------------------------------------------------------------

export type AiReviewRiskDisplay = {
  bg: string;
  color: string;
  icon: string;
  /** Short label shown in the risk pill, e.g. "Ready" / "Low". */
  label: string;
};

// 3-level document-readiness scale. Values verbatim from the previous
// AI_REVIEW_RISK_STYLES in credit-investigation-risk.ts and the identical
// duplicate RISK_STYLES in requirement-checklist-view.tsx (now removed).
export const AI_REVIEW_RISK_STYLES = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Ready' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Almost ready' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'Not ready' },
} as const satisfies Record<'good' | 'watch' | 'high', AiReviewRiskDisplay>;

// 5-level screening-risk scale. Values verbatim from the previous
// RISK_LEVEL_STYLES in src/components/admin-ui/ai-recommendation-summary.tsx.
export const SCREENING_RISK_STYLES = {
  low: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low' },
  moderate: { bg: '#EEF1FE', color: '#3448B0', icon: 'solar:info-circle-bold', label: 'Moderate' },
  elevated: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Elevated' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High' },
  'unable-to-determine': {
    bg: '#F5F6FA',
    color: '#8891A6',
    icon: 'solar:question-circle-bold',
    label: 'Unable to Determine',
  },
} as const satisfies Record<
  'low' | 'moderate' | 'elevated' | 'high' | 'unable-to-determine',
  AiReviewRiskDisplay
>;

// The advisory footnote shown at the bottom of every AiReviewCard.
export const AI_CONTROL_STATEMENT =
  'This AI-generated result is an advisory screening output only. It is not a loan ' +
  'approval, disapproval, or policy waiver. All findings and recommendations must be ' +
  'independently validated by authorized Credit personnel.';
