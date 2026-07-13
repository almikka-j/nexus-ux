// Shared with initial-credit-checking-view.tsx (renders the risk callout)
// and call-report/credit-checking-result-modal.tsx (uses the level to decide
// the report's Cleared/not-Cleared tone) — a single source of truth so the
// two screens never disagree on what counts as "negative."

export type InitialRiskLevel = 'good' | 'watch' | 'high';

export function buildInitialAiRecommendation(
  loanAmount: number,
  monthlyIncome: number,
  employmentStatus: string
): { level: InitialRiskLevel; text: string } {
  const ratio = monthlyIncome > 0 ? loanAmount / (monthlyIncome * 12) : null;

  if (ratio === null) {
    return {
      level: 'watch',
      text: 'Monthly income not on file — debt-to-income ratio cannot be estimated yet.',
    };
  }
  if (ratio <= 0.35) {
    return {
      level: 'good',
      text: `Requested amount is well within range for stated income (${employmentStatus.toLowerCase()}). Debt-to-income ratio is approximately ${(ratio * 100).toFixed(0)}% of annual income — low risk on this measure alone.`,
    };
  }
  if (ratio <= 0.6) {
    return {
      level: 'watch',
      text: `Requested amount is moderate relative to stated income (${employmentStatus.toLowerCase()}). Debt-to-income ratio is approximately ${(ratio * 100).toFixed(0)}% of annual income — worth a closer look during document review.`,
    };
  }
  return {
    level: 'high',
    text: `Requested amount is high relative to stated income (${employmentStatus.toLowerCase()}). Debt-to-income ratio is approximately ${(ratio * 100).toFixed(0)}% of annual income — recommend added scrutiny before proceeding.`,
  };
}
