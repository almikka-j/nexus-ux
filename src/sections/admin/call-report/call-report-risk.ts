import type { CallReport } from 'src/auth/admin-context';

import { computeDti } from './call-report-computations';

// ----------------------------------------------------------------------
// Mirrors initial-credit-checking-risk.ts's shape (level + text) so the
// Call Report page's "AI review, summary & recommendation" card matches
// Initial Credit Checking's pattern. Driven by the officer's own
// Preliminary Recommendation answer first — that's the explicit judgment
// call from section 11 — falling back to the computed DTI ratio only when
// no recommendation has been entered yet.
// ----------------------------------------------------------------------

export type CallReportRiskLevel = 'good' | 'watch' | 'high';

const RECOMMENDATION_LEVELS: Partial<Record<CallReport['preliminaryRecommendation'], CallReportRiskLevel>> = {
  'proceed-as-requested': 'good',
  'proceed-with-revised-terms': 'watch',
  'proceed-with-conditions': 'watch',
  'needs-additional-verification': 'watch',
  'schedule-follow-up': 'watch',
  hold: 'high',
  'do-not-proceed': 'high',
};

export function buildCallReportAiRecommendation(callReport: CallReport): {
  level: CallReportRiskLevel;
  text: string;
} {
  const dti = computeDti(callReport);
  const dtiClause = callReport.declaredNetMonthlyIncome
    ? ` Estimated debt-to-income ratio from declared figures is approximately ${dti.toFixed(0)}%.`
    : '';

  if (callReport.preliminaryRecommendation) {
    const level = RECOMMENDATION_LEVELS[callReport.preliminaryRecommendation] ?? 'watch';
    const reasonClause = callReport.recommendationReason ? ` ${callReport.recommendationReason}` : '';
    switch (level) {
      case 'good':
        return {
          level,
          text: `Officer recommends proceeding as requested.${dtiClause}${reasonClause}`,
        };
      case 'high':
        return {
          level,
          text: `Officer recommends against proceeding as currently proposed.${dtiClause}${reasonClause}`,
        };
      default:
        return {
          level,
          text: `Officer recommends proceeding with conditions or further verification before this moves forward.${dtiClause}${reasonClause}`,
        };
    }
  }

  if (!callReport.declaredNetMonthlyIncome) {
    return {
      level: 'watch',
      text: 'Preliminary recommendation and declared income are not yet on file — complete the call report above to generate a fuller read.',
    };
  }

  if (dti <= 35) {
    return {
      level: 'good',
      text: `Debt-to-income ratio from declared figures is approximately ${dti.toFixed(0)}% — within an acceptable range. No preliminary recommendation has been entered yet.`,
    };
  }
  if (dti <= 50) {
    return {
      level: 'watch',
      text: `Debt-to-income ratio from declared figures is approximately ${dti.toFixed(0)}% — worth a closer look. No preliminary recommendation has been entered yet.`,
    };
  }
  return {
    level: 'high',
    text: `Debt-to-income ratio from declared figures is approximately ${dti.toFixed(0)}% — high relative to declared income. No preliminary recommendation has been entered yet.`,
  };
}
