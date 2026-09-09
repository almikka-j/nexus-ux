// Per-file "AI read" for one uploaded bureau report, shown under that file's
// results table in BureauFilePanel (bureau-reports-card.tsx). Same "pure
// derivation, never stored, keyword-match not real NLP" convention as
// initial-credit-checking-risk.ts — it reuses that module's isNegativeStatus
// so the two never disagree on what counts as adverse. Computed on render
// from file.rows only (+ the applicant's name for the prose).

import type { BureauFileKind, BureauReportFile, BureauResultRow } from 'src/auth/admin-context';

import { isNegativeStatus } from './initial-credit-checking-risk';

export type BureauFileRiskLevel = 'Low' | 'Moderate' | 'High';

export type BureauFileSummary = {
  summary: string;
  riskLevel: BureauFileRiskLevel;
  recommendation: string;
  documentMatch: string;
};

const BUREAU_LABEL: Record<BureauFileKind, string> = {
  cibi: 'CIBI (Credit Information Bureau, Inc.)',
  loandex: 'LOANDEX',
  cic: 'Credit Information Corporation (CIC)',
  cmap: 'Credit Management Association of the Philippines (CMAP)',
  nfisBap: 'NFIS / BAP (Bankers Association of the Philippines negative file)',
  pgfcExposure: 'PGFC Existing Exposure register',
};

// The status-like field(s) a row of each bureau kind carries. isNegativeStatus
// is run against every one of these.
function statusValues(kind: BureauFileKind, row: BureauResultRow): string[] {
  switch (kind) {
    case 'cmap':
      return [(row as { status: string }).status];
    case 'nfisBap':
      return [
        (row as { statusRemarks: string }).statusRemarks,
        (row as { paymentHistory: string }).paymentHistory,
      ];
    case 'cibi':
    case 'pgfcExposure':
      return [(row as { paymentStatus: string }).paymentStatus];
    case 'cic':
      return [(row as { contractStatus: string }).contractStatus];
    case 'loandex':
      return [(row as { accountStatus: string }).accountStatus];
    default:
      return [];
  }
}

// Parse a "₱172,060.00" style string to a number; returns 0 for blanks and
// the various "no record" sentinels.
function peso(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function overdueAmount(row: BureauResultRow): number {
  return peso((row as { overdueAmount?: string }).overdueAmount);
}

function outstandingBalance(row: BureauResultRow): number {
  return (
    peso((row as { outstandingBalance?: string }).outstandingBalance) ||
    peso((row as { principalBalance?: string }).principalBalance)
  );
}

function fmtPeso(n: number): string {
  return `${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PHP`;
}

const CMAP_CLEAN = 'no record found';
const PGFC_CLEAN = 'no existing exposure';

// A row is "adverse" if its status field trips the shared negative-keyword
// check, OR it carries a non-zero overdue amount, OR (CMAP) a real court case
// exists, OR (PGFC) there is real exposure on file.
function isAdverseRow(kind: BureauFileKind, row: BureauResultRow): boolean {
  if (statusValues(kind, row).some(isNegativeStatus)) return true;
  if (overdueAmount(row) > 0) return true;
  if (kind === 'cmap') {
    return (row as { status: string }).status.trim().toLowerCase() !== CMAP_CLEAN;
  }
  if (kind === 'pgfcExposure') {
    return (
      (row as { paymentStatus: string }).paymentStatus.trim().toLowerCase() !== PGFC_CLEAN
    );
  }
  return false;
}

export function deriveBureauFileSummary(
  kind: BureauFileKind,
  file: BureauReportFile,
  applicantName: string,
): BureauFileSummary {
  const rows = file.rows;
  const name = applicantName.trim() || 'the applicant';
  const bureau = BUREAU_LABEL[kind];
  const documentMatch = `Yes - this is a ${bureau} report containing credit history and financial information.`;

  const adverse = rows.filter((row) => isAdverseRow(kind, row));
  const overdueRows = rows
    .filter((row) => overdueAmount(row) > 0)
    .sort((a, b) => overdueAmount(b) - overdueAmount(a));

  if (adverse.length === 0) {
    const summary =
      rows.length === 0
        ? `The ${bureau} report for ${name} contains no result rows.`
        : `The ${bureau} report for ${name} lists ${rows.length} contract${
            rows.length === 1 ? '' : 's'
          }, all in good standing with no overdue balances or adverse status recorded.`;
    return {
      summary,
      riskLevel: 'Low',
      recommendation:
        'Proceed - no adverse findings on this report; verify the account details against the source document before deciding.',
      documentMatch,
    };
  }

  const highlights = overdueRows.slice(0, 2).map((row) => {
    const bal = outstandingBalance(row);
    const balText = bal > 0 ? `an outstanding balance of ${fmtPeso(bal)}` : 'an outstanding balance';
    return `one with ${balText} that is overdue`;
  });
  const overdueClause = highlights.length ? ` Notably, ${highlights.join(', and ')}.` : '';

  const summary = `The ${bureau} report for ${name} includes ${rows.length} loan contract${
    rows.length === 1 ? '' : 's'
  } and their statuses. ${adverse.length} show${
    adverse.length === 1 ? 's' : ''
  } overdue payments or an adverse status.${overdueClause} The report contains detailed information about the applicant's loan history, including amounts financed, outstanding balances, and payment statuses.`;

  // High whenever any overdue amount or an explicit negative status is
  // present; Moderate for a softer adverse signal (e.g. a CMAP/PGFC record
  // that exists but with no overdue amount and no negative-keyword status).
  const isHigh =
    overdueRows.length > 0 ||
    adverse.some((row) => statusValues(kind, row).some(isNegativeStatus));

  if (isHigh) {
    const worst = overdueRows[0];
    const worstText = worst
      ? ` The applicant has overdue payments, including an outstanding balance of ${fmtPeso(
          outstandingBalance(worst),
        )}, indicating significant risk of default.`
      : ' The applicant has one or more accounts in an adverse status, indicating significant risk of default.';
    return {
      summary,
      riskLevel: 'High',
      recommendation: `Do Not Proceed -${worstText}`,
      documentMatch,
    };
  }

  return {
    summary,
    riskLevel: 'Moderate',
    recommendation:
      'Proceed with Caution - a recorded finding is present but no overdue balance was reported; obtain independent validation from authorized Credit personnel before deciding.',
    documentMatch,
  };
}
