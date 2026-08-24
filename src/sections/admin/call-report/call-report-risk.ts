import type { CallReport } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Mirrors initial-credit-checking-risk.ts's shape (level + text). Driven
// by the officer's own Call Disposition answer first (section 7's
// explicit judgment call), falling back to a simple AML/KYC exception
// count when no disposition has been entered yet.
// ----------------------------------------------------------------------

export type CallReportRiskLevel = 'good' | 'watch' | 'high';

const DISPOSITION_LEVELS: Partial<Record<CallReport['callDisposition'], CallReportRiskLevel>> = {
  'proceed-to-next-process': 'good',
  'proceed-subject-to-requirements': 'watch',
  'additional-verification': 'watch',
  'follow-up-call': 'watch',
  'sales-reject-decline': 'high',
};

function countAmlFlags(callReport: CallReport): number {
  const flagged: (CallReport['amlIsPep'] | CallReport['amlHasReturnedChecks'])[] = [
    callReport.amlIsPep,
    callReport.amlIsPgfcRelatedParty,
    callReport.amlHasReturnedChecks,
    callReport.amlHasPastDueObligations,
  ];
  return flagged.filter((value) => value === 'yes' || value === 'for-verification').length;
}

export function buildCallReportAiRecommendation(callReport: CallReport): {
  level: CallReportRiskLevel;
  text: string;
} {
  const amlFlagCount = countAmlFlags(callReport);
  const amlClause = amlFlagCount > 0 ? ` ${amlFlagCount} AML/KYC item(s) flagged for review.` : '';

  if (callReport.callDisposition) {
    const level = DISPOSITION_LEVELS[callReport.callDisposition] ?? 'watch';
    const reasonClause = callReport.reasonKeyCondition ? ` ${callReport.reasonKeyCondition}` : '';
    switch (level) {
      case 'good':
        return { level, text: `Officer recommends proceeding to the next process.${amlClause}${reasonClause}` };
      case 'high':
        return { level, text: `Officer recommends against proceeding as currently proposed.${amlClause}${reasonClause}` };
      default:
        return {
          level,
          text: `Officer recommends proceeding with conditions or further verification before this moves forward.${amlClause}${reasonClause}`,
        };
    }
  }

  if (amlFlagCount === 0) {
    return {
      level: 'watch',
      text: 'Call disposition has not been entered yet, and no AML/KYC items are flagged so far — complete the sections above to generate a fuller read.',
    };
  }
  if (amlFlagCount <= 1) {
    return {
      level: 'watch',
      text: `${amlFlagCount} AML/KYC item(s) flagged for review. No call disposition has been entered yet.`,
    };
  }
  return {
    level: 'high',
    text: `${amlFlagCount} AML/KYC items flagged for review — worth a closer look. No call disposition has been entered yet.`,
  };
}
