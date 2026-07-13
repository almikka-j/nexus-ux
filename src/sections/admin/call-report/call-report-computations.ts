import type { CallReport } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Pure functions only — no React, no state. Section 6's four ratios and
// section 11's requested-vs-proposed comparisons are always derived at
// render time from CallReport's raw string fields, never stored, so they
// can never drift out of sync with their inputs.
// ----------------------------------------------------------------------

export function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function computeTotalMonthlyIncome(cr: CallReport): number {
  return toNumber(cr.declaredNetMonthlyIncome) + toNumber(cr.otherMonthlyIncome);
}

export function computeTotalMonthlyObligations(cr: CallReport): number {
  return (
    toNumber(cr.estimatedMonthlyHouseholdExpenses) +
    toNumber(cr.existingMonthlyLoanPayments) +
    toNumber(cr.monthlyCreditCardPayments) +
    toNumber(cr.otherMonthlyObligations)
  );
}

export function computeDisposableIncome(cr: CallReport): number {
  return Math.max(0, computeTotalMonthlyIncome(cr) - computeTotalMonthlyObligations(cr));
}

export function computeDti(cr: CallReport): number {
  const income = computeTotalMonthlyIncome(cr);
  if (income <= 0) return 0;
  return Math.min(100, (computeTotalMonthlyObligations(cr) / income) * 100);
}

export function compareAmount(requested: number, proposed: number): 'same' | 'lower' | 'higher' {
  if (proposed === requested) return 'same';
  return proposed < requested ? 'lower' : 'higher';
}

export function compareTerm(requested: number, proposed: number): 'same' | 'shorter' | 'longer' {
  if (proposed === requested) return 'same';
  return proposed < requested ? 'shorter' : 'longer';
}
