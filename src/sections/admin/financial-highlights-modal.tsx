'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';
import {
  FINANCIAL_PERIODS,
  FINANCIAL_PERIOD_LABELS,
  type FinancialPeriod,
} from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { TONE_COLORS } from 'src/components/admin-ui';

import { fRatio, fPct, deriveHighlightsRow } from './financial-summary-calcs';

// ----------------------------------------------------------------------
// Financial Highlights sub-tool — the officer-typed fields per period (days
// ratios, EBITDA, total loans, annual debt service, rating, adjusted rate).
// The rest of the Highlights table is derived from Financial Statement and
// shown read-only in the preview strip. Opened from the Financial Summary
// card's "Manage" on the Financial Highlights row.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' },
};

function IntInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <NumericFormat
        fullWidth
        size="small"
        customInput={TextField}
        placeholder="0"
        value={value}
        onValueChange={({ value: next }) => onChange(next)}
        decimalScale={0}
        allowNegative={false}
        valueIsNumericString
        sx={fieldSx}
      />
    </Stack>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <NumericFormat
        fullWidth
        size="small"
        customInput={TextField}
        placeholder="0.00"
        value={value}
        onValueChange={({ value: next }) => onChange(next)}
        thousandSeparator=","
        decimalScale={2}
        allowNegative={false}
        valueIsNumericString
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.info.solid }}>₱</Typography>
            </InputAdornment>
          ),
        }}
        sx={fieldSx}
      />
    </Stack>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.35 }}>
      <Typography sx={{ fontSize: 12, color: '#5A6273' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#14172A' }}>{value}</Typography>
    </Stack>
  );
}

export function FinancialHighlightsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { review, setFinancialHighlightsField } = useAdmin();
  const [period, setPeriod] = useState<FinancialPeriod>('2023');

  const hi = review.financialHighlights[period];
  const derived = deriveHighlightsRow(period, review.financialStatement, review.financialHighlights);
  const money = (n: number) => fCurrency(n) || '₱0.00';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Financial Highlights
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Officer-entered metrics · the rest is derived from the Financial Statement
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close Financial Highlights">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ mb: 3 }}>
          {FINANCIAL_PERIODS.map((p) => (
            <Button
              key={p}
              onClick={() => setPeriod(p)}
              variant={p === period ? 'contained' : 'outlined'}
              size="small"
              sx={{
                borderRadius: '9px',
                px: 2,
                boxShadow: 'none',
                ...(p === period
                  ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }
                  : { color: '#5A6273', borderColor: '#C7CCDA' }),
              }}
            >
              {FINANCIAL_PERIOD_LABELS[p]}
            </Button>
          ))}
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#5A6273', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1.5 }}>
              Entered for {FINANCIAL_PERIOD_LABELS[period]}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <IntInput label="Days Inventory" value={hi.daysInventory} onChange={(v) => setFinancialHighlightsField(period, 'daysInventory', v)} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <IntInput label="Days Receivable" value={hi.daysReceivable} onChange={(v) => setFinancialHighlightsField(period, 'daysReceivable', v)} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <IntInput label="Days Payable" value={hi.daysPayable} onChange={(v) => setFinancialHighlightsField(period, 'daysPayable', v)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MoneyInput label="EBITDA" value={hi.ebitda} onChange={(v) => setFinancialHighlightsField(period, 'ebitda', v)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MoneyInput label="Total Loans" value={hi.totalLoans} onChange={(v) => setFinancialHighlightsField(period, 'totalLoans', v)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MoneyInput label="Annual Debt Service" value={hi.annualDebtService} onChange={(v) => setFinancialHighlightsField(period, 'annualDebtService', v)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#3B4256' }}>Rating</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. BBB"
                    value={hi.rating}
                    onChange={(event) => setFinancialHighlightsField(period, 'rating', event.target.value)}
                    sx={fieldSx}
                  />
                </Stack>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#3B4256' }}>Adjusted Rate</Typography>
                  <NumericFormat
                    fullWidth
                    size="small"
                    customInput={TextField}
                    placeholder="0"
                    value={hi.adjustedRate}
                    onValueChange={({ value: next }) => setFinancialHighlightsField(period, 'adjustedRate', next)}
                    decimalScale={2}
                    allowNegative={false}
                    valueIsNumericString
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    sx={fieldSx}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#8891A6', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1 }}>
                Derived from Financial Statement
              </Typography>
              <PreviewRow label="Gross Sales" value={money(derived.grossSales)} />
              <PreviewRow label="Net Income" value={money(derived.netIncome)} />
              <PreviewRow label="Total Assets" value={money(derived.totalAssets)} />
              <PreviewRow label="Total Liabilities" value={money(derived.totalLiabilities)} />
              <PreviewRow label="Equity" value={money(derived.equity)} />
              <PreviewRow label="Current Ratio" value={fRatio(derived.currentRatio)} />
              <PreviewRow label="Debt-Equity Ratio" value={fRatio(derived.debtEquityRatio)} />
              <PreviewRow label="GPM" value={fPct(derived.gpm)} />
              <PreviewRow label="NPM" value={fPct(derived.npm)} />
              <PreviewRow label="Revenue / Total Loans" value={fRatio(derived.revenueOverTotalLoans)} />
              <PreviewRow label="Debt Service Coverage" value={fRatio(derived.debtServiceCoverageRatio)} />
            </Box>
          </Grid>
        </Grid>
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
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
