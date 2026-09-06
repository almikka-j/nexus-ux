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

import { parseNum, fRatio, fPct, deriveHighlightsRow } from './financial-summary-calcs';

// ----------------------------------------------------------------------
// Financial Highlights report — the full wide metrics table (rows = each
// metric, columns = the 5 periods), read-only, merging Financial Statement
// derivations with the officer-typed Highlights fields. On-screen only.
// Opened from the Financial Summary card's "View" on the Financial
// Highlights row.
// ----------------------------------------------------------------------

const cellSx = { fontSize: 11.5, px: 1.25, py: 0.6, whiteSpace: 'nowrap' as const };
const labelCellSx = { ...cellSx, fontWeight: 700, color: '#14172A', textAlign: 'left' as const, minWidth: 210 };
const numCellSx = { ...cellSx, textAlign: 'right' as const, color: '#3B4256' };

export function FinancialHighlightsReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { review } = useAdmin();
  const { signUpData } = useRegistration();
  const { financialStatement, financialHighlights } = review;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';

  const money = (n: number) => fCurrency(n) || '₱0.00';

  const rows: { label: string; render: (p: FinancialPeriod) => string }[] = [
    { label: 'Gross Sales', render: (p) => money(deriveHighlightsRow(p, financialStatement, financialHighlights).grossSales) },
    { label: 'Net Income', render: (p) => money(deriveHighlightsRow(p, financialStatement, financialHighlights).netIncome) },
    { label: 'Current Assets', render: (p) => money(deriveHighlightsRow(p, financialStatement, financialHighlights).currentAssets) },
    { label: 'Total Assets', render: (p) => money(deriveHighlightsRow(p, financialStatement, financialHighlights).totalAssets) },
    { label: 'Current Liabilities', render: (p) => money(deriveHighlightsRow(p, financialStatement, financialHighlights).currentLiabilities) },
    { label: 'Total Liabilities', render: (p) => money(deriveHighlightsRow(p, financialStatement, financialHighlights).totalLiabilities) },
    { label: 'Equity', render: (p) => money(deriveHighlightsRow(p, financialStatement, financialHighlights).equity) },
    { label: 'Current Ratio', render: (p) => fRatio(deriveHighlightsRow(p, financialStatement, financialHighlights).currentRatio) },
    { label: 'Debt Equity Ratio', render: (p) => fRatio(deriveHighlightsRow(p, financialStatement, financialHighlights).debtEquityRatio) },
    { label: 'Acid Ratio', render: (p) => fRatio(deriveHighlightsRow(p, financialStatement, financialHighlights).acidRatio) },
    { label: 'Days Inventory', render: (p) => String(parseNum(financialHighlights[p].daysInventory)) },
    { label: 'Days Receivable', render: (p) => String(parseNum(financialHighlights[p].daysReceivable)) },
    { label: 'Days Payable', render: (p) => String(parseNum(financialHighlights[p].daysPayable)) },
    { label: 'GPM', render: (p) => fPct(deriveHighlightsRow(p, financialStatement, financialHighlights).gpm) },
    { label: 'NPM', render: (p) => fPct(deriveHighlightsRow(p, financialStatement, financialHighlights).npm) },
    { label: 'EBITDA', render: (p) => money(parseNum(financialHighlights[p].ebitda)) },
    { label: 'Revenue Over Total Loans', render: (p) => fRatio(deriveHighlightsRow(p, financialStatement, financialHighlights).revenueOverTotalLoans) },
    { label: 'Debt Service Coverage Ratio', render: (p) => fRatio(deriveHighlightsRow(p, financialStatement, financialHighlights).debtServiceCoverageRatio) },
    { label: 'Rating', render: (p) => financialHighlights[p].rating || '—' },
    { label: 'Adjusted Rate', render: (p) => (financialHighlights[p].adjustedRate ? `${financialHighlights[p].adjustedRate}%` : '—') },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Financial Highlights
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Client Name: {applicantName}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close Financial Highlights report">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', minWidth: 820 }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#EEF1FE' }}>
                <Box component="th" sx={labelCellSx} />
                {FINANCIAL_PERIODS.map((p) => (
                  <Box
                    component="th"
                    key={p}
                    sx={{ ...cellSx, fontWeight: 800, color: '#14172A', textAlign: 'right', borderLeft: '1px solid #D6DCFA' }}
                  >
                    {FINANCIAL_PERIOD_LABELS[p]}
                    <Typography component="span" sx={{ display: 'block', fontSize: 9.5, color: '#667085', fontWeight: 600 }}>
                      12 Mos.
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map((row) => (
                <Box component="tr" key={row.label} sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
                  <Box component="td" sx={labelCellSx}>{row.label}</Box>
                  {FINANCIAL_PERIODS.map((p) => (
                    <Box component="td" key={p} sx={{ ...numCellSx, borderLeft: '1px solid #F0F1F5' }}>
                      {row.render(p)}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Typography sx={{ fontSize: 11, color: '#98A2B3', mt: 2, textAlign: 'center' }}>
          Prepared by · {new Date().toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
