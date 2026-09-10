// src/sections/admin/financial-summary-calcs.ts

// ----------------------------------------------------------------------
// Pure formulas for the three Financial Summary sub-tools (Financial
// Statement, Bank Loans, Financial Highlights). Nothing here is stored —
// every report figure is recomputed from the raw string state on render,
// same convention as cash-flow-statement.ts.
//
// Several legacy ratios have no source field in this build (inventory /
// receivable / payable balances, depreciation). Those are approximated or
// returned as 0 and flagged inline — the legacy screens also show 0 for
// them.
// ----------------------------------------------------------------------

import type {
  BankLoans,
  BankLoanRow,
  FinancialStatement,
  FinancialHighlights,
  FinancialStatementPeriod,
} from 'src/auth/admin-context';
import { FINANCIAL_PERIODS } from 'src/auth/admin-context';

export function parseNum(raw: string | undefined | null): number {
  const n = Number(String(raw ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Ratio helper — null on divide-by-zero (rendered as `—` or `0.00`). */
export function safeDiv(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  const r = numerator / denominator;
  return Number.isFinite(r) ? r : null;
}

// ---------- Financial Statement ----------

export type IncomeStatementTotals = {
  netSales: number;
  grossProfit: number;
  operatingIncomeBeforeOther: number; // = grossProfit − operatingExpenses
  operatingIncome: number; // = operatingIncomeBeforeOther + otherIncomeExpense
  netIncomeBeforeTax: number;
  netIncomeAfterTax: number;
  ebitda: number; // operatingIncome + interest + depreciation (add-backs)
};

export function computeIncomeStatement(p: FinancialStatementPeriod): IncomeStatementTotals {
  const grossSales = parseNum(p.grossSales);
  const netSales = grossSales - parseNum(p.salesReturns);
  const grossProfit = netSales - parseNum(p.costOfGoodsSold);
  const operatingIncomeBeforeOther = grossProfit - parseNum(p.operatingExpenses);
  const operatingIncome = operatingIncomeBeforeOther + parseNum(p.otherIncomeExpense);
  const netIncomeBeforeTax = operatingIncome - parseNum(p.interestExpense);
  const netIncomeAfterTax = netIncomeBeforeTax - parseNum(p.provisionForTaxes);
  const ebitda = operatingIncome + parseNum(p.interestExpense) + parseNum(p.depreciation);
  return {
    netSales,
    grossProfit,
    operatingIncomeBeforeOther,
    operatingIncome,
    netIncomeBeforeTax,
    netIncomeAfterTax,
    ebitda,
  };
}

export type BalanceSheetTotals = {
  totalCurrentAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabEquity: number;
  tallyMatched: boolean;
  tallyDelta: number;
};

/** Sum a Balance Sheet category's line-item values. */
export function sumBalanceSheetLines(lines: { value: string }[]): number {
  return lines.reduce((acc, line) => acc + parseNum(line.value), 0);
}

export function computeBalanceSheet(p: FinancialStatementPeriod): BalanceSheetTotals {
  const totalCurrentAssets = sumBalanceSheetLines(p.currentAssets);
  const totalAssets = totalCurrentAssets + sumBalanceSheetLines(p.nonCurrentAssets);
  const totalCurrentLiabilities = sumBalanceSheetLines(p.currentLiabilities);
  const totalLiabilities = totalCurrentLiabilities + sumBalanceSheetLines(p.nonCurrentLiabilities);
  const totalEquity = sumBalanceSheetLines(p.equity);
  const totalLiabEquity = totalLiabilities + totalEquity;
  const tallyDelta = totalAssets - totalLiabEquity;
  return {
    totalCurrentAssets,
    totalAssets,
    totalCurrentLiabilities,
    totalLiabilities,
    totalEquity,
    totalLiabEquity,
    tallyMatched: tallyDelta === 0,
    tallyDelta,
  };
}

export type FinancialRatios = {
  netWorkingCapital: number;
  netWorth: number;
  currentRatio: number | null;
  quickRatio: number | null; // approximated == currentRatio (no inventory field)
  daysReceivable: number; // no receivable balance field → 0
  daysInventory: number; // no inventory balance field → 0
  daysPayable: number; // no payable balance field → 0
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  grossProfitMargin: number | null;
  operatingMargin: number | null;
  returnOnSales: number | null;
  totalAssetsToEquity: number | null;
  debtToEquity: number | null;
  debtToAsset: number | null;
  interestCoverage: number | null;
  debtServiceCoverage: number | null;
};

export function computeRatios(p: FinancialStatementPeriod): FinancialRatios {
  const inc = computeIncomeStatement(p);
  const bs = computeBalanceSheet(p);
  const currentRatio = safeDiv(bs.totalCurrentAssets, bs.totalCurrentLiabilities);
  const interestExpense = parseNum(p.interestExpense);
  return {
    netWorkingCapital: bs.totalCurrentAssets - bs.totalCurrentLiabilities,
    netWorth: bs.totalAssets - bs.totalLiabilities,
    currentRatio,
    quickRatio: currentRatio,
    daysReceivable: 0,
    daysInventory: 0,
    daysPayable: 0,
    returnOnEquity: safeDiv(inc.netIncomeAfterTax, bs.totalEquity),
    returnOnAssets: safeDiv(inc.netIncomeAfterTax, bs.totalAssets),
    grossProfitMargin: safeDiv(inc.grossProfit, inc.netSales),
    operatingMargin: safeDiv(inc.operatingIncome, inc.netSales),
    returnOnSales: safeDiv(inc.netIncomeAfterTax, inc.netSales),
    totalAssetsToEquity: safeDiv(bs.totalAssets, bs.totalEquity),
    debtToEquity: safeDiv(bs.totalLiabilities, bs.totalEquity),
    debtToAsset: safeDiv(bs.totalLiabilities, bs.totalAssets),
    interestCoverage: safeDiv(inc.operatingIncome, interestExpense),
    debtServiceCoverage: safeDiv(inc.netIncomeAfterTax + interestExpense, interestExpense),
  };
}

/** Growth of `current` vs `prior` as a ratio (0.15 = +15%); null when prior is 0. */
export function computeGrowth(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return current / prior - 1;
}

export function computePctOfSales(value: number, grossSales: number): number | null {
  return safeDiv(value, grossSales);
}

// ---------- Bank Loans ----------

function sumRowField(rows: BankLoanRow[], field: keyof BankLoanRow): number {
  return rows.reduce((acc, row) => acc + parseNum(row[field] as string), 0);
}

export type BankLoanTotals = {
  approvedAmount: number;
  amountPreviousYear: number;
  amountOutstanding: number;
  projectionAmount: number;
};

export function computeBankLoanTotals(rows: BankLoanRow[]): BankLoanTotals {
  return {
    approvedAmount: sumRowField(rows, 'approvedAmount'),
    amountPreviousYear: sumRowField(rows, 'amountPreviousYear'),
    amountOutstanding: sumRowField(rows, 'amountOutstanding'),
    projectionAmount: sumRowField(rows, 'projectionAmount'),
  };
}

/** Interest-only annual debt service proxy for a set of loan rows. */
function interestOnlyDebtService(rows: BankLoanRow[]): number {
  return rows.reduce(
    (acc, row) => acc + parseNum(row.amountOutstanding) * (parseNum(row.interestRate) / 100),
    0
  );
}

/** Add-on annual amortization proxy (principal / term × 12), no interest. */
function addOnAnnualAmortization(rows: BankLoanRow[]): number {
  return rows.reduce((acc, row) => {
    const term = parseNum(row.term);
    if (term === 0) return acc;
    return acc + (parseNum(row.approvedAmount) / term) * 12;
  }, 0);
}

export type DscrReport = {
  serviceableIncome: number;
  depreciation: number;
  asOf: { pct100: number | null; pct50: number | null; pct20: number | null; amortization: number | null };
  projection: {
    pct100: number | null;
    pct50: number | null;
    pct20: number | null;
    amortization: number | null;
  };
};

/**
 * DSCR report figures. The legacy engine isn't fully documented, so this is
 * an interest-only debt-service proxy with a percentage-scaled numerator.
 * `serviceableIncome` = latest actual EBITDA — the officer-entered Highlights
 * EBITDA when present, else computed from the 2025 Financial Statement
 * (operating income + interest + depreciation add-backs).
 */
export function computeDscr(
  bankLoans: BankLoans,
  highlights: FinancialHighlights,
  statement: FinancialStatement
): DscrReport {
  const inc2025 = computeIncomeStatement(statement['2025']);
  const ebitda2025 = parseNum(highlights['2025'].ebitda);
  const serviceableIncome = ebitda2025 !== 0 ? ebitda2025 : inc2025.ebitda;
  const depreciation = parseNum(statement['2025'].depreciation);

  const debtServiceAsOf =
    interestOnlyDebtService(bankLoans.bankRows) + interestOnlyDebtService(bankLoans.pgfcRows);
  const debtServiceProjection =
    parseNum(bankLoans.proposed.projectionAmount) * (parseNum(bankLoans.proposed.interestRate) / 100) +
    parseNum(bankLoans.proposed.projectedPrincipalPaymentDec);

  const amortAsOf =
    addOnAnnualAmortization(bankLoans.bankRows) + addOnAnnualAmortization(bankLoans.pgfcRows);
  const projectionAmort = (() => {
    // proposed loan has no term — treat the projected Dec principal as the
    // annual amortization when present.
    const dec = parseNum(bankLoans.proposed.projectedPrincipalPaymentDec);
    return dec > 0 ? dec : amortAsOf;
  })();

  const scaled = (income: number, pct: number, ds: number) => safeDiv(income * (pct / 100), ds);

  return {
    serviceableIncome,
    depreciation,
    asOf: {
      pct100: scaled(serviceableIncome, 100, debtServiceAsOf),
      pct50: scaled(serviceableIncome, 50, debtServiceAsOf),
      pct20: scaled(serviceableIncome, 20, debtServiceAsOf),
      amortization: safeDiv(serviceableIncome, amortAsOf),
    },
    projection: {
      pct100: scaled(serviceableIncome, 100, debtServiceProjection),
      pct50: scaled(serviceableIncome, 50, debtServiceProjection),
      pct20: scaled(serviceableIncome, 20, debtServiceProjection),
      amortization: safeDiv(serviceableIncome, projectionAmort),
    },
  };
}

// ---------- Financial Highlights (derived rows) ----------

export type HighlightsDerivedRow = {
  grossSales: number;
  netIncome: number;
  currentAssets: number;
  totalAssets: number;
  currentLiabilities: number;
  totalLiabilities: number;
  equity: number;
  currentRatio: number | null;
  debtEquityRatio: number | null;
  acidRatio: number | null;
  gpm: number | null;
  npm: number | null;
  revenueOverTotalLoans: number | null;
  debtServiceCoverageRatio: number | null;
};

/** Everything the Financial Highlights table shows for one period, merging
 *  Financial Statement figures with the officer-typed Highlights fields. */
export function deriveHighlightsRow(
  period: (typeof FINANCIAL_PERIODS)[number],
  statement: FinancialStatement,
  highlights: FinancialHighlights
): HighlightsDerivedRow {
  const fs = statement[period];
  const hi = highlights[period];
  const inc = computeIncomeStatement(fs);
  const bs = computeBalanceSheet(fs);
  const ratios = computeRatios(fs);
  return {
    grossSales: parseNum(fs.grossSales),
    netIncome: inc.netIncomeAfterTax,
    currentAssets: bs.totalCurrentAssets,
    totalAssets: bs.totalAssets,
    currentLiabilities: bs.totalCurrentLiabilities,
    totalLiabilities: bs.totalLiabilities,
    equity: bs.totalEquity,
    currentRatio: ratios.currentRatio,
    debtEquityRatio: ratios.debtToEquity,
    acidRatio: ratios.quickRatio,
    gpm: ratios.grossProfitMargin,
    npm: ratios.returnOnSales,
    revenueOverTotalLoans: safeDiv(parseNum(fs.grossSales), parseNum(hi.totalLoans)),
    debtServiceCoverageRatio: safeDiv(parseNum(hi.ebitda), parseNum(hi.annualDebtService)),
  };
}

// ---------- Formatting helpers for the reports ----------

/** Ratio → "0.00" style (2dp). null → "—". */
export function fRatio(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}

/** Fraction (0.15) → "15.00%". null → "—". */
export function fPct(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(2)}%`;
}

/** Integer days → "0" style. */
export function fDays(value: number): string {
  return String(Math.round(value));
}
