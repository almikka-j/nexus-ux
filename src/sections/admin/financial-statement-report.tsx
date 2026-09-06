'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import {
  FINANCIAL_PERIODS,
  FINANCIAL_PERIOD_LABELS,
  type FinancialPeriod,
} from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import {
  parseNum,
  fRatio,
  fPct,
  computeGrowth,
  computeRatios,
  computeBalanceSheet,
  computePctOfSales,
  computeIncomeStatement,
} from './financial-summary-calcs';

// ----------------------------------------------------------------------
// Financial Statement Report — read-only income statement (₱ / % of sales /
// growth per period), balance sheet with an Assets = Liabilities + Equity
// tally, and a ratios block. All figures are recomputed from Financial
// Statement state (financial-summary-calcs.ts); nothing stored. On-screen
// only — no XLS/PDF. Opened from the Financial Summary card's "View" on the
// Financial Statement row.
// ----------------------------------------------------------------------

const cellSx = { fontSize: 11.5, px: 1, py: 0.6, whiteSpace: 'nowrap' as const };
const labelCellSx = { ...cellSx, fontWeight: 700, color: '#14172A', textAlign: 'left' as const };
const numCellSx = { ...cellSx, textAlign: 'right' as const, color: '#3B4256' };

/** Prior actual period for growth — Interim/Projected have no direct prior. */
function priorPeriod(period: FinancialPeriod): FinancialPeriod | null {
  const idx = FINANCIAL_PERIODS.indexOf(period);
  if (period === 'interim' || period === 'projected' || idx <= 0) return null;
  return FINANCIAL_PERIODS[idx - 1];
}

export function FinancialStatementReport({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { review } = useAdmin();
  const { signUpData } = useRegistration();
  const statement = review.financialStatement;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';

  const money = (n: number) => fCurrency(n) || '₱0.00';

  const incomeRows: { label: string; value: (p: FinancialPeriod) => number; pct?: boolean }[] = [
    { label: 'Gross Sales', value: (p) => parseNum(statement[p].grossSales), pct: true },
    { label: 'Net Sales', value: (p) => computeIncomeStatement(statement[p]).netSales, pct: true },
    { label: 'Cost of Goods Sold', value: (p) => parseNum(statement[p].costOfGoodsSold), pct: true },
    { label: 'Gross Profit', value: (p) => computeIncomeStatement(statement[p]).grossProfit, pct: true },
    { label: 'Operating Expenses', value: (p) => parseNum(statement[p].operatingExpenses), pct: true },
    { label: 'Operating Income', value: (p) => computeIncomeStatement(statement[p]).operatingIncome, pct: true },
    { label: 'Other Income (Expense)', value: (p) => parseNum(statement[p].otherIncomeExpense), pct: true },
    { label: 'Interest Expense', value: (p) => parseNum(statement[p].interestExpense), pct: true },
    { label: 'Net Income Before Tax', value: (p) => computeIncomeStatement(statement[p]).netIncomeBeforeTax, pct: true },
    { label: 'Provision for Taxes', value: (p) => parseNum(statement[p].provisionForTaxes), pct: true },
    { label: 'Net Income After Tax', value: (p) => computeIncomeStatement(statement[p]).netIncomeAfterTax, pct: true },
  ];

  const balanceRows: { label: string; value: (p: FinancialPeriod) => number }[] = [
    { label: 'Total Current Assets', value: (p) => computeBalanceSheet(statement[p]).totalCurrentAssets },
    { label: 'Total Assets', value: (p) => computeBalanceSheet(statement[p]).totalAssets },
    { label: 'Total Current Liabilities', value: (p) => computeBalanceSheet(statement[p]).totalCurrentLiabilities },
    { label: 'Total Liabilities', value: (p) => computeBalanceSheet(statement[p]).totalLiabilities },
    { label: 'Total Equity', value: (p) => computeBalanceSheet(statement[p]).totalEquity },
    { label: "Total Liabilities & Stockholders' Equity", value: (p) => computeBalanceSheet(statement[p]).totalLiabEquity },
  ];

  const ratioRows: { label: string; value: (p: FinancialPeriod) => string }[] = [
    { label: 'Net Working Capital', value: (p) => money(computeRatios(statement[p]).netWorkingCapital) },
    { label: 'Net Worth', value: (p) => money(computeRatios(statement[p]).netWorth) },
    { label: 'Current Ratio', value: (p) => fRatio(computeRatios(statement[p]).currentRatio) },
    { label: 'Quick Ratio (Acid Test)', value: (p) => fRatio(computeRatios(statement[p]).quickRatio) },
    { label: "Days' Receivable", value: (p) => String(computeRatios(statement[p]).daysReceivable) },
    { label: "Days' Inventory", value: (p) => String(computeRatios(statement[p]).daysInventory) },
    { label: "Days' Payable", value: (p) => String(computeRatios(statement[p]).daysPayable) },
    { label: 'Return on Equity (ROE)', value: (p) => fPct(computeRatios(statement[p]).returnOnEquity) },
    { label: 'Return on Assets (ROA)', value: (p) => fPct(computeRatios(statement[p]).returnOnAssets) },
    { label: 'Gross Profit Margin', value: (p) => fPct(computeRatios(statement[p]).grossProfitMargin) },
    { label: 'Operating Margin', value: (p) => fPct(computeRatios(statement[p]).operatingMargin) },
    { label: 'Return on Sales', value: (p) => fPct(computeRatios(statement[p]).returnOnSales) },
    { label: 'Total Assets / Equity', value: (p) => fRatio(computeRatios(statement[p]).totalAssetsToEquity) },
    { label: 'Debt to Equity Ratio', value: (p) => fRatio(computeRatios(statement[p]).debtToEquity) },
    { label: 'Debt to Asset Ratio', value: (p) => fRatio(computeRatios(statement[p]).debtToAsset) },
    { label: 'Interest Coverage', value: (p) => fRatio(computeRatios(statement[p]).interestCoverage) },
    { label: 'Debt Service Coverage', value: (p) => fRatio(computeRatios(statement[p]).debtServiceCoverage) },
  ];

  const growthCell = (period: FinancialPeriod, valueFn: (p: FinancialPeriod) => number) => {
    const prior = priorPeriod(period);
    if (!prior) return '';
    return fPct(computeGrowth(valueFn(period), valueFn(prior)));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Financial Statement Report
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>{applicantName}</Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close Financial Statement Report">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#EEF1FE' }}>
                <Box component="th" sx={{ ...labelCellSx, minWidth: 230 }} />
                {FINANCIAL_PERIODS.map((p) => (
                  <Box
                    component="th"
                    key={p}
                    colSpan={3}
                    sx={{ ...cellSx, fontWeight: 800, color: '#14172A', textAlign: 'center', borderLeft: '1px solid #D6DCFA' }}
                  >
                    {FINANCIAL_PERIOD_LABELS[p]}
                    <Typography component="span" sx={{ display: 'block', fontSize: 9.5, color: '#667085', fontWeight: 600 }}>
                      12 Mos.
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box component="tr" sx={{ bgcolor: '#F5F7FF' }}>
                <Box component="th" sx={labelCellSx} />
                {FINANCIAL_PERIODS.map((p) => (
                  <Box key={p} sx={{ display: 'contents' }}>
                    <Box component="th" sx={{ ...cellSx, textAlign: 'right', color: '#9AA2B4', fontWeight: 700, borderLeft: '1px solid #E1E4ED' }}>
                      Amount
                    </Box>
                    <Box component="th" sx={{ ...cellSx, textAlign: 'right', color: '#9AA2B4', fontWeight: 700 }}>
                      % Sales
                    </Box>
                    <Box component="th" sx={{ ...cellSx, textAlign: 'right', color: '#9AA2B4', fontWeight: 700 }}>
                      Growth
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box component="tbody">
              <SectionHeaderRow label="Income Statement" span={1 + FINANCIAL_PERIODS.length * 3} />
              {incomeRows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {FINANCIAL_PERIODS.map((p) => (
                    <Box key={p} sx={{ display: 'contents' }}>
                      <Box component="td" sx={{ ...numCellSx, borderLeft: '1px solid #F0F1F5' }}>
                        {money(row.value(p))}
                      </Box>
                      <Box component="td" sx={numCellSx}>
                        {row.pct ? fPct(computePctOfSales(row.value(p), parseNum(statement[p].grossSales))) : ''}
                      </Box>
                      <Box component="td" sx={numCellSx}>{growthCell(p, row.value)}</Box>
                    </Box>
                  ))}
                </Box>
              ))}

              <SectionHeaderRow label="Balance Sheet" span={1 + FINANCIAL_PERIODS.length * 3} />
              {balanceRows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {FINANCIAL_PERIODS.map((p) => (
                    <Box key={p} sx={{ display: 'contents' }}>
                      <Box component="td" sx={{ ...numCellSx, borderLeft: '1px solid #F0F1F5' }}>
                        {money(row.value(p))}
                      </Box>
                      <Box component="td" sx={numCellSx} />
                      <Box component="td" sx={numCellSx}>{growthCell(p, row.value)}</Box>
                    </Box>
                  ))}
                </Box>
              ))}
              <Box component="tr">
                <Box component="td" sx={labelCellSx}>
                  Assets vs Liabilities &amp; Equity
                </Box>
                {FINANCIAL_PERIODS.map((p) => {
                  const bs = computeBalanceSheet(statement[p]);
                  return (
                    <Box
                      component="td"
                      key={p}
                      colSpan={3}
                      sx={{
                        ...cellSx,
                        textAlign: 'center',
                        fontWeight: 700,
                        borderLeft: '1px solid #F0F1F5',
                        color: bs.tallyMatched ? '#0C8A4F' : '#B36A05',
                      }}
                    >
                      {bs.tallyMatched ? 'Matched' : `Off by ${money(Math.abs(bs.tallyDelta))}`}
                    </Box>
                  );
                })}
              </Box>

              <SectionHeaderRow label="Ratios" span={1 + FINANCIAL_PERIODS.length * 3} />
              {ratioRows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {FINANCIAL_PERIODS.map((p) => (
                    <Box
                      component="td"
                      key={p}
                      colSpan={3}
                      sx={{ ...cellSx, textAlign: 'right', color: '#3B4256', borderLeft: '1px solid #F0F1F5' }}
                    >
                      {row.value(p)}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Typography sx={{ fontSize: 11, color: '#98A2B3', mt: 2, textAlign: 'center' }}>
          Days&apos; Receivable / Inventory / Payable and Quick Ratio are approximated — this build
          has no receivable / inventory / payable balance fields. All figures are computed on screen.
        </Typography>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#1C2A6E',
            borderRadius: '10px',
            px: 3,
            fontWeight: 700,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SectionHeaderRow({ label, span }: { label: string; span: number }) {
  return (
    <Box component="tr">
      <Box
        component="td"
        colSpan={span}
        sx={{
          fontSize: 12,
          fontWeight: 800,
          color: '#14172A',
          bgcolor: '#F1F3F8',
          px: 1,
          py: 0.75,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Box>
    </Box>
  );
}
