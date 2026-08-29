import type { AoPreliminaryRiskLevel, CallReport, SystemVarianceStatus } from 'src/auth/admin-context';

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

// Maps the officer's own AO Preliminary Risk rating (section 7,
// AoPreliminaryRiskLevel) onto the same 3-tier scale the system's AI
// recommendation uses (CallReportRiskLevel), so the two can be compared
// directly. 'unable-to-determine' has no clear system-tier equivalent —
// treated as its own case below rather than forced into good/watch/high.
const AO_RISK_TO_SYSTEM_TIER: Record<Exclude<AoPreliminaryRiskLevel, 'unable-to-determine'>, CallReportRiskLevel> = {
  low: 'good',
  moderate: 'watch',
  high: 'high',
};

const SYSTEM_TIER_LABELS: Record<CallReportRiskLevel, string> = {
  good: 'Low risk',
  watch: 'Needs a closer look',
  high: 'High risk',
};

const AO_RISK_LABELS: Record<AoPreliminaryRiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'unable-to-determine': 'Unable to Determine',
};

/**
 * AO vs. System Assessment Variance is computed automatically from the
 * officer's AO Preliminary Risk rating vs. the system's own AI
 * recommendation level — not an officer-entered field. A variance is
 * "noted" whenever the two assessments land in different tiers, or
 * whenever the officer marked their own risk as "Unable to Determine"
 * while the system did reach a conclusion (or vice versa is moot, since
 * the system always reaches a conclusion).
 */
export function buildCallReportVariance(callReport: CallReport): {
  status: SystemVarianceStatus;
  explanation: string;
} {
  const systemLevel = buildCallReportAiRecommendation(callReport).level;

  if (!callReport.preliminaryRiskLevel) {
    return { status: '', explanation: '' };
  }

  if (callReport.preliminaryRiskLevel === 'unable-to-determine') {
    return {
      status: 'noted',
      explanation: `The officer marked AO Preliminary Risk as Unable to Determine, while the system assessment reached ${SYSTEM_TIER_LABELS[systemLevel]}.`,
    };
  }

  const aoTier = AO_RISK_TO_SYSTEM_TIER[callReport.preliminaryRiskLevel];
  if (aoTier === systemLevel) {
    return { status: 'none', explanation: '' };
  }

  return {
    status: 'noted',
    explanation: `The officer's AO Preliminary Risk (${AO_RISK_LABELS[callReport.preliminaryRiskLevel]}) differs from the system assessment (${SYSTEM_TIER_LABELS[systemLevel]}).`,
  };
}
