// src/sections/admin/bank-statement.ts

// ----------------------------------------------------------------------
// Pure helpers for Financial Evaluation's Bank Statement card
// (bank-statement-card.tsx / bank-statement-modal.tsx). Nothing here is
// stored — total deposits and average daily balance are recomputed from
// BankStatement's raw string inputs on every render, same convention as
// cash-flow-statement.ts.
// ----------------------------------------------------------------------

import type { BankStatementDeposit, BankStatementDailyBalance } from 'src/auth/admin-context';

// Amount/balance inputs are free-text strings (matching every other numeric
// field in this app's forms). Blank or non-numeric parses to 0 so an
// incomplete row still contributes a partial (not NaN) total.
export function parseNumber(raw: string): number {
  const parsed = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeTotalDeposits(deposits: Pick<BankStatementDeposit, 'amount'>[]): number {
  return deposits.reduce((sum, deposit) => sum + parseNumber(deposit.amount), 0);
}

export function computeAvgDailyBalance(
  balances: Pick<BankStatementDailyBalance, 'balance'>[]
): number | null {
  if (balances.length === 0) return null;
  const total = balances.reduce((sum, balance) => sum + parseNumber(balance.balance), 0);
  return total / balances.length;
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

// Depository Bank dropdown options — the major Philippine banks. Free-text
// entry isn't offered; this is a fixed list (an unmatched legacy value would
// still render since the modal falls back to showing the raw string).
export const PHILIPPINE_BANKS = [
  'BDO Unibank',
  'BPI (Bank of the Philippine Islands)',
  'Metrobank',
  'Land Bank of the Philippines',
  'Philippine National Bank (PNB)',
  'Security Bank',
  'China Banking Corporation (Chinabank)',
  'UnionBank of the Philippines',
  'RCBC (Rizal Commercial Banking Corporation)',
  'Development Bank of the Philippines (DBP)',
  'EastWest Bank',
  'AUB (Asia United Bank)',
  'Bank of Commerce',
  'Philtrust Bank',
  'Robinsons Bank',
  'PSBank (Philippine Savings Bank)',
  'Maybank Philippines',
  'CIMB Bank Philippines',
  'Sterling Bank of Asia',
  'BDO Network Bank',
] as const;

export function formatMonthRange(from: string, to: string): string {
  if (from && to) return `${from}–${to}`;
  return from || to || '';
}
