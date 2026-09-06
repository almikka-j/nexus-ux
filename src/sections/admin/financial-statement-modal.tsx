'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
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
  type FinancialStatementField,
} from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { TONE_COLORS } from 'src/components/admin-ui';

import { computeIncomeStatement, computeBalanceSheet } from './financial-summary-calcs';

// ----------------------------------------------------------------------
// Financial Statement sub-tool — per-period income-statement + balance-sheet
// entry, one period at a time via a period selector (the legacy "Manage per
// year" model without the separate page). Every field persists on keystroke;
// live mini-summaries + a balance-sheet tally chip update as you type.
// Opened from the Financial Summary card's "Manage" on the Financial
// Statement row.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' },
};

const INCOME_FIELDS: { field: FinancialStatementField; label: string; allowNegative?: boolean }[] = [
  { field: 'grossSales', label: 'Gross Sales' },
  { field: 'salesReturns', label: 'Sales Returns / Discounts' },
  { field: 'costOfGoodsSold', label: 'Cost of Goods Sold' },
  { field: 'operatingExpenses', label: 'Operating Expenses' },
  { field: 'otherIncomeExpense', label: 'Other Income (Expense)', allowNegative: true },
  { field: 'interestExpense', label: 'Interest Expense' },
  { field: 'provisionForTaxes', label: 'Provision for Taxes' },
];

const BALANCE_FIELDS: { field: FinancialStatementField; label: string }[] = [
  { field: 'currentAssets', label: 'Current Assets' },
  { field: 'nonCurrentAssets', label: 'Non-Current Assets' },
  { field: 'currentLiabilities', label: 'Current Liabilities' },
  { field: 'nonCurrentLiabilities', label: 'Non-Current Liabilities' },
  { field: 'equity', label: 'Equity' },
];

function MoneyField({
  label,
  value,
  onValueChange,
  allowNegative,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  allowNegative?: boolean;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <NumericFormat
        fullWidth
        size="small"
        customInput={TextField}
        placeholder="0.00"
        value={value}
        onValueChange={({ value: next }) => onValueChange(next)}
        thousandSeparator=","
        decimalScale={2}
        allowNegative={!!allowNegative}
        valueIsNumericString
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.info.solid }}>
                ₱
              </Typography>
            </InputAdornment>
          ),
        }}
        sx={fieldSx}
      />
    </Stack>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
      <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A' }}>{value}</Typography>
    </Stack>
  );
}

type FinancialStatementModalProps = {
  open: boolean;
  onClose: () => void;
};

export function FinancialStatementModal({ open, onClose }: FinancialStatementModalProps) {
  const { review, setFinancialStatementField } = useAdmin();
  const [period, setPeriod] = useState<FinancialPeriod>('2023');

  const data = review.financialStatement[period];
  const inc = computeIncomeStatement(data);
  const bs = computeBalanceSheet(data);
  const money = (n: number) => fCurrency(n) || '₱0.00';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Financial Statement
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Income statement &amp; balance sheet · one period at a time
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close Financial Statement">
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
              Income Statement
            </Typography>
            <Grid container spacing={2}>
              {INCOME_FIELDS.map(({ field, label, allowNegative }) => (
                <Grid item xs={12} sm={6} key={field}>
                  <MoneyField
                    label={label}
                    value={data[field]}
                    onValueChange={(value) => setFinancialStatementField(period, field, value)}
                    allowNegative={allowNegative}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#8891A6', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1 }}>
                Income summary
              </Typography>
              <SummaryRow label="Net Sales" value={money(inc.netSales)} />
              <SummaryRow label="Gross Profit" value={money(inc.grossProfit)} />
              <SummaryRow label="Operating Income" value={money(inc.operatingIncome)} />
              <SummaryRow label="Net Income Before Tax" value={money(inc.netIncomeBeforeTax)} />
              <SummaryRow label="Net Income After Tax" value={money(inc.netIncomeAfterTax)} />
            </Box>
          </Grid>

          <Grid item xs={12} md={7}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#5A6273', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1.5 }}>
              Balance Sheet
            </Typography>
            <Grid container spacing={2}>
              {BALANCE_FIELDS.map(({ field, label }) => (
                <Grid item xs={12} sm={6} key={field}>
                  <MoneyField
                    label={label}
                    value={data[field]}
                    onValueChange={(value) => setFinancialStatementField(period, field, value)}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#8891A6', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1 }}>
                Balance summary
              </Typography>
              <SummaryRow label="Total Assets" value={money(bs.totalAssets)} />
              <SummaryRow label="Total Liabilities" value={money(bs.totalLiabilities)} />
              <SummaryRow label="Total Equity" value={money(bs.totalEquity)} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1 }}>
                <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>Tally</Typography>
                <Chip
                  size="small"
                  icon={
                    <Iconify
                      icon={bs.tallyMatched ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'}
                      width={13}
                    />
                  }
                  label={bs.tallyMatched ? 'Matched' : `Off by ${money(Math.abs(bs.tallyDelta))}`}
                  sx={{
                    fontWeight: 700,
                    fontSize: 11.5,
                    bgcolor: bs.tallyMatched ? TONE_COLORS.success.bg : TONE_COLORS.warning.bg,
                    color: bs.tallyMatched ? TONE_COLORS.success.text : TONE_COLORS.warning.text,
                  }}
                />
              </Stack>
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
