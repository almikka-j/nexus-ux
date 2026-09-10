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
import type { BankLoanRow } from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { parseNum, fRatio, computeDscr, computeBankLoanTotals } from './financial-summary-calcs';

// ----------------------------------------------------------------------
// Bank Loan Report — a DSCR computation table (as-of Date vs Projection) and
// a wide Bank Loan table with per-section totals and grand totals. DSCR is
// an interest-only debt-service proxy (see financial-summary-calcs.ts) —
// the legacy engine isn't fully documented. On-screen only. Opened from the
// Financial Summary card's "View" on the Bank Loans row.
// ----------------------------------------------------------------------

const cellSx = { fontSize: 11, px: 1, py: 0.55, whiteSpace: 'nowrap' as const };
const numCellSx = { ...cellSx, textAlign: 'right' as const, color: '#3B4256' };

const LOAN_COLUMNS: { key: keyof BankLoanRow; label: string; money?: boolean }[] = [
  { key: 'institution', label: 'Bank / Financial Institution' },
  { key: 'facility', label: 'Facilities' },
  { key: 'approvedAmount', label: 'Approved Amount', money: true },
  { key: 'amountPreviousYear', label: 'Amount Previous Year', money: true },
  { key: 'amountOutstanding', label: 'Amount', money: true },
  { key: 'balanceAsOfDate', label: 'Balance Date as of' },
  { key: 'projectionAmount', label: 'Projection Amount', money: true },
  { key: 'security', label: 'Security' },
  { key: 'dateGranted', label: 'Date Granted' },
  { key: 'expiry', label: 'Expiry' },
  { key: 'term', label: 'Term' },
  { key: 'interestRate', label: 'Interest Rate' },
  { key: 'principalPaid', label: 'Principal Paid', money: true },
  { key: 'paymentHandling', label: 'Payment Handling' },
  { key: 'principalAmortizationPerMonth', label: 'Principal Amortization/Mo.', money: true },
  { key: 'interestAmortizationPerMonth', label: 'Interest Amortization/Mo.', money: true },
  { key: 'principalPaymentAsOf', label: 'Payment as of Date — Principal', money: true },
  { key: 'interestPaymentAsOf', label: 'Payment as of Date — Interest', money: true },
  { key: 'projectedPrincipalPaymentDec', label: 'Payment Projected — Principal', money: true },
  { key: 'projectedInterestDec', label: 'Payment Projected — Interest Dec.', money: true },
];

export function BankLoanReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { review } = useAdmin();
  const { signUpData } = useRegistration();
  const { bankLoans, financialHighlights, financialStatement } = review;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';

  const money = (n: number) => fCurrency(n) || '₱0.00';
  const dscr = computeDscr(bankLoans, financialHighlights, financialStatement);
  const bankTotals = computeBankLoanTotals(bankLoans.bankRows);
  const pgfcTotals = computeBankLoanTotals(bankLoans.pgfcRows);
  const grandBalance = bankTotals.amountOutstanding + pgfcTotals.amountOutstanding;
  const proposedProjection = parseNum(bankLoans.proposed.projectionAmount);

  const cellValue = (row: BankLoanRow, col: (typeof LOAN_COLUMNS)[number]) => {
    const raw = row[col.key];
    if (col.money) return money(parseNum(raw));
    return raw || '—';
  };

  const totalRow = (label: string, totals: ReturnType<typeof computeBankLoanTotals>) => (
    <Box component="tr" sx={{ bgcolor: '#F1F3F8', fontWeight: 700 }}>
      <Box component="td" sx={{ ...cellSx, fontWeight: 700 }}>{label}</Box>
      <Box component="td" sx={cellSx} />
      <Box component="td" sx={numCellSx}>{money(totals.approvedAmount)}</Box>
      <Box component="td" sx={numCellSx}>{money(totals.amountPreviousYear)}</Box>
      <Box component="td" sx={numCellSx}>{money(totals.amountOutstanding)}</Box>
      <Box component="td" sx={cellSx} />
      <Box component="td" sx={numCellSx}>{money(totals.projectionAmount)}</Box>
      <Box component="td" colSpan={13} sx={cellSx} />
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>Bank Loan Report</Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>{applicantName}</Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close Bank Loan Report">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1C2A6E', mb: 1.5 }}>
          Computation of DSCR
        </Typography>
        <Box sx={{ overflowX: 'auto', mb: 3 }}>
          <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#F5F7FF' }}>
                <Box component="th" sx={{ ...cellSx, textAlign: 'left', color: '#9AA2B4' }} />
                <Box component="th" sx={{ ...cellSx, textAlign: 'left', color: '#9AA2B4' }} />
                <Box component="th" sx={{ ...cellSx, textAlign: 'right', color: '#9AA2B4' }}>as of Date</Box>
                <Box component="th" sx={{ ...cellSx, textAlign: 'right', color: '#9AA2B4' }}>Projection</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {[
                { label: 'DSCR', pct: '100%', asOf: dscr.asOf.pct100, proj: dscr.projection.pct100 },
                { label: 'DSCR', pct: '50%', asOf: dscr.asOf.pct50, proj: dscr.projection.pct50 },
                { label: 'DSCR', pct: '20%', asOf: dscr.asOf.pct20, proj: dscr.projection.pct20 },
                {
                  label: 'DSCR',
                  pct: 'Based on Amortization',
                  asOf: dscr.asOf.amortization,
                  proj: dscr.projection.amortization,
                },
              ].map((r) => (
                <Box component="tr" key={r.pct} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={{ ...cellSx, fontWeight: 700, color: '#14172A' }}>{r.label}</Box>
                  <Box component="td" sx={{ ...cellSx, color: '#5A6273' }}>{r.pct}</Box>
                  <Box component="td" sx={numCellSx}>{fRatio(r.asOf)}</Box>
                  <Box component="td" sx={numCellSx}>{fRatio(r.proj)}</Box>
                </Box>
              ))}
              <Box component="tr">
                <Box component="td" sx={{ ...cellSx, fontWeight: 700, color: '#14172A' }}>Depreciation</Box>
                <Box component="td" sx={cellSx} />
                <Box component="td" sx={numCellSx}>{money(dscr.depreciation)}</Box>
                <Box component="td" sx={numCellSx}>{money(dscr.depreciation)}</Box>
              </Box>
            </Box>
          </Box>
        </Box>
        <Typography sx={{ fontSize: 11, color: '#98A2B3', mb: 3 }}>
          Serviceable income {money(dscr.serviceableIncome)} — latest EBITDA (Financial Highlights, or
          the 2025 Financial Statement: operating income + interest + depreciation). Debt service is an
          interest-only proxy.
        </Typography>

        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1C2A6E', mb: 1.5 }}>Bank Loan</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100 }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#EEF1FE' }}>
                {LOAN_COLUMNS.map((col) => (
                  <Box
                    component="th"
                    key={col.key}
                    sx={{ ...cellSx, fontWeight: 800, color: '#14172A', textAlign: col.money ? 'right' : 'left' }}
                  >
                    {col.label}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {bankLoans.bankRows.map((row) => (
                <Box component="tr" key={row.id} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  {LOAN_COLUMNS.map((col) => (
                    <Box component="td" key={col.key} sx={col.money ? numCellSx : cellSx}>
                      {cellValue(row, col)}
                    </Box>
                  ))}
                </Box>
              ))}
              {totalRow('Total (Bank Loans)', bankTotals)}
              {bankLoans.pgfcRows.map((row) => (
                <Box component="tr" key={row.id} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  {LOAN_COLUMNS.map((col) => (
                    <Box component="td" key={col.key} sx={col.money ? numCellSx : cellSx}>
                      {cellValue(row, col)}
                    </Box>
                  ))}
                </Box>
              ))}
              {totalRow('Total (PGFC Loans)', pgfcTotals)}
              <Box component="tr" sx={{ bgcolor: '#F1F3F8', fontWeight: 700 }}>
                <Box component="td" sx={{ ...cellSx, fontWeight: 700 }}>Grand Total (balance)</Box>
                <Box component="td" colSpan={3} sx={cellSx} />
                <Box component="td" sx={numCellSx}>{money(grandBalance)}</Box>
                <Box component="td" colSpan={15} sx={cellSx} />
              </Box>
              <Box component="tr">
                <Box component="td" sx={{ ...cellSx, fontWeight: 700, color: '#14172A' }}>PGFC (proposed)</Box>
                <Box component="td" colSpan={5} sx={cellSx} />
                <Box component="td" sx={numCellSx}>{money(proposedProjection)}</Box>
                <Box component="td" colSpan={4} sx={cellSx} />
                <Box component="td" sx={numCellSx}>
                  {bankLoans.proposed.interestRate ? `${bankLoans.proposed.interestRate}%` : '—'}
                </Box>
                <Box component="td" colSpan={8} sx={cellSx} />
              </Box>
              <Box component="tr" sx={{ bgcolor: '#F1F3F8', fontWeight: 700 }}>
                <Box component="td" sx={{ ...cellSx, fontWeight: 700 }}>Grand Total</Box>
                <Box component="td" colSpan={3} sx={cellSx} />
                <Box component="td" sx={numCellSx}>{money(grandBalance + proposedProjection)}</Box>
                <Box component="td" colSpan={15} sx={cellSx} />
              </Box>
            </Box>
          </Box>
        </Box>
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
