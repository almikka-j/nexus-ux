// src/sections/admin/cash-flow-statement.ts

// ----------------------------------------------------------------------
// Pure derivation formulas for Financial Evaluation's Cash Flow Statement
// card (cash-flow-statement-card.tsx). Nothing here is stored — every value
// is recomputed from CashFlowStatement's raw string inputs on every render,
// same pattern as requirement-checklist-risk.ts's
// buildRequirementChecklistSummary. Two independent computations are run
// side by side, one per column ('Combined' and 'Borrower Only').
// ----------------------------------------------------------------------

import type { CashFlowOtherLoan, CashFlowComputationType } from 'src/auth/admin-context';

// Currency/percentage inputs are free-text strings (matching every other
// numeric field in this app's forms) — blank or non-numeric parses to 0 for
// arithmetic, so an incomplete form still computes a partial (not NaN)
// total, same convention CI Fee/Appraisal Fee amount fields already use.
function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeTotalIncome(
  fixedIncome: string,
  variableIncome: string,
  otherIncome: string,
  lessDeductions: string
): number {
  return toNumber(fixedIncome) + toNumber(variableIncome) + toNumber(otherIncome) - toNumber(lessDeductions);
}

export function computeExpenseSubtotal(
  fixedExpense: string,
  utilities: string,
  transport: string,
  otherExpense: string,
  miscExpenses: string
): number {
  return (
    toNumber(fixedExpense) + toNumber(utilities) + toNumber(transport) + toNumber(otherExpense) + toNumber(miscExpenses)
  );
}

export function computeAdjustedExpenseAmount(subtotal: number, adjustedExpensePercent: string): number {
  return subtotal * (toNumber(adjustedExpensePercent) / 100);
}

export function computeTotalExpenses(subtotal: number, adjustedExpenseAmount: number): number {
  return subtotal + adjustedExpenseAmount;
}

export function computeIncomeAvailableForDebtService(totalIncome: number, totalExpenses: number): number {
  return totalIncome - totalExpenses;
}

export function computeTotalOtherLoans(
  otherLoans: CashFlowOtherLoan[],
  column: 'combined' | 'borrowerOnly'
): number {
  return otherLoans.reduce((sum, loan) => {
    const amount = column === 'combined' ? loan.monthlyAmortizationCombined : loan.monthlyAmortizationBorrowerOnly;
    return sum + toNumber(amount);
  }, 0);
}

// Standard diminishing-balance (declining-balance) amortization:
// M = P × r(1+r)^n / ((1+r)^n − 1), where r is the MONTHLY rate (annual
// rate ÷ 100 ÷ 12) and n is the term in months.
function computeDiminishingAmortization(principal: number, monthlyRate: number, termMonths: number): number {
  if (monthlyRate === 0) return principal / termMonths;
  const factor = (1 + monthlyRate) ** termMonths;
  return (principal * monthlyRate * factor) / (factor - 1);
}

// Add-on interest: total interest = principal × annual rate × (term in
// years), added to principal, then divided evenly across the term — no
// compounding, every month's payment is identical from day one.
function computeAddOnAmortization(principal: number, annualRatePercent: number, termMonths: number): number {
  const totalInterest = principal * (annualRatePercent / 100) * (termMonths / 12);
  return (principal + totalInterest) / termMonths;
}

// Returns null (render as blank, not "∞"/NaN) when Principal/Interest
// Rate/Term aren't all present as valid, positive numbers — an incomplete
// Proposed Amount section has nothing to compute yet.
export function computeMonthlyAmortization(
  computationType: CashFlowComputationType,
  principal: string,
  annualInterestRate: string,
  termMonths: string
): number | null {
  const p = toNumber(principal);
  const rateAnnual = toNumber(annualInterestRate);
  const n = toNumber(termMonths);
  if (p <= 0 || n <= 0 || annualInterestRate.trim() === '' || termMonths.trim() === '' || principal.trim() === '') {
    return null;
  }
  if (computationType === 'add-on') return computeAddOnAmortization(p, rateAnnual, n);
  return computeDiminishingAmortization(p, rateAnnual / 100 / 12, n);
}

export function computeNetIncome(
  incomeAvailableForDebtService: number,
  totalOtherLoans: number,
  monthlyAmortization: number | null
): number {
  return incomeAvailableForDebtService - totalOtherLoans - (monthlyAmortization ?? 0);
}

// (Monthly Amortization + Total of Other Loans) ÷ Income Available for Debt
// Service, as a percentage. Null (render as blank) when there's no
// amortization to service yet, or income available is zero/negative — a
// ratio against zero or negative income isn't a meaningful percentage.
export function computeDebtServiceRatio(
  monthlyAmortization: number | null,
  totalOtherLoans: number,
  incomeAvailableForDebtService: number
): number | null {
  if (monthlyAmortization === null || incomeAvailableForDebtService <= 0) return null;
  return ((monthlyAmortization + totalOtherLoans) / incomeAvailableForDebtService) * 100;
}
