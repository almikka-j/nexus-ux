'use client';

import { useRef, useState } from 'react';
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
import { useRegistration } from 'src/auth/registration-context';
import { submitFinancialStatementDetails } from 'src/auth/financial-statement-details';
import {
  FINANCIAL_PERIODS,
  FINANCIAL_PERIOD_LABELS,
  type FinancialPeriod,
  type FinancialStatementField,
  type FinancialStatementPeriod,
} from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';

import { parseNum, computeIncomeStatement, computeBalanceSheet } from './financial-summary-calcs';
import { FinancialStatementReport } from './financial-statement-report';

// ----------------------------------------------------------------------
// Financial Statement sub-tool — a two-level modal matching the legacy
// period-row model, minus the separate-page navigation:
//
//   Level 1 (landing): applicant/application details, editable Product Line
//   and AMD, 5 period rows (2023 … Projected) with status, View and Manage,
//   rich-text Remarks, and Submit.
//   Level 2 (period form): that period's Income Statement (editable inputs
//   left, live computed values right) and Balance Sheet (editable inputs
//   paired with computed totals + a tally chip). Every field persists on
//   keystroke — no "save income statement first" gating.
//
// Opened from the Financial Summary card's "Manage" on the Financial
// Statement row. The card's "View" opens the comparative report separately.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' },
};

// Legacy income-statement inputs & labels (no separate Sales Returns field —
// Gross Sales flows straight to Net Sale).
const INCOME_INPUTS: { field: FinancialStatementField; label: string; allowNegative?: boolean }[] = [
  { field: 'grossSales', label: 'Gross Sales', allowNegative: false },
  { field: 'costOfGoodsSold', label: 'Cost of Goods Sold' },
  { field: 'operatingExpenses', label: 'Operating Expenses' },
  { field: 'otherIncomeExpense', label: 'Other Income (Expense)', allowNegative: true },
  { field: 'interestExpense', label: 'Interest Expense (Expense)' },
  { field: 'provisionForTaxes', label: 'Provision for Taxes' },
  { field: 'depreciation', label: 'Depreciation' },
];

const BALANCE_INPUTS: {
  field: FinancialStatementField;
  label: string;
  totalLabel: string;
  total: (bs: ReturnType<typeof computeBalanceSheet>) => number;
}[] = [
  { field: 'currentAssets', label: 'Current Assets', totalLabel: 'Total Current Assets', total: (bs) => bs.totalCurrentAssets },
  { field: 'nonCurrentAssets', label: 'Non-Current Assets', totalLabel: 'Total Assets', total: (bs) => bs.totalAssets },
  { field: 'currentLiabilities', label: 'Current Liabilities', totalLabel: 'Total Current Liabilities', total: (bs) => bs.totalCurrentLiabilities },
  { field: 'nonCurrentLiabilities', label: 'Non-Current Liabilities', totalLabel: 'Total Liabilities', total: (bs) => bs.totalLiabilities },
  { field: 'equity', label: 'Equity', totalLabel: 'Total Equity', total: (bs) => bs.totalEquity },
];

function MoneyInput({
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
    <Stack spacing={0.6}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
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
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.info.solid }}>₱</Typography>
            </InputAdornment>
          ),
        }}
        sx={fieldSx}
      />
    </Stack>
  );
}

function ComputedField({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.6}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#8891A6' }}>{label}</Typography>
      <Box
        sx={{
          px: 1.5,
          py: '9px',
          borderRadius: '10px',
          bgcolor: '#F1F3F8',
          border: '1px solid #E1E4ED',
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {value}
      </Box>
    </Stack>
  );
}

function periodFilled(p: FinancialStatementPeriod): boolean {
  return Object.values(p).some((v) => parseNum(v) !== 0);
}

type FinancialStatementModalProps = {
  open: boolean;
  onClose: () => void;
};

export function FinancialStatementModal({ open, onClose }: FinancialStatementModalProps) {
  const { signUpData, application } = useRegistration();
  const { review, setFinancialStatementField, setFinancialStatementDetails } = useAdmin();
  const [editing, setEditing] = useState<FinancialPeriod | null>(null);
  const [reportPeriod, setReportPeriod] = useState<FinancialPeriod | null>(null);
  const [productLineError, setProductLineError] = useState(false);
  const productLineRef = useRef<HTMLInputElement>(null);

  const details = review.financialStatementDetails;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';
  const amountApplied = application.financialInfo?.desiredLoanAmount;

  const handleClose = () => {
    setEditing(null);
    setReportPeriod(null);
    setProductLineError(false);
    onClose();
  };

  const handleSubmit = () => {
    const submitted = submitFinancialStatementDetails(details, new Date().toISOString());
    if (!submitted) {
      setProductLineError(true);
      productLineRef.current?.focus({ preventScroll: true });
      productLineRef.current?.scrollIntoView({ block: 'center' });
      return;
    }
    setFinancialStatementDetails(submitted);
    setProductLineError(false);
    handleClose();
  };

  const money = (n: number) => fCurrency(n) || '₱0.00';

  const data = editing ? review.financialStatement[editing] : null;
  const inc = data ? computeIncomeStatement(data) : null;
  const bs = data ? computeBalanceSheet(data) : null;

  // Unmount the outgoing dialog so its exit transition cannot overlap the
  // incoming dialog or render a report whose selected period was cleared.
  if (reportPeriod !== null) {
    return (
      <FinancialStatementReport
        open={open}
        period={reportPeriod}
        onClose={() => setReportPeriod(null)}
      />
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {editing && (
              <IconButton onClick={() => setEditing(null)} aria-label="Back to period list" size="small">
                <Iconify icon="solar:alt-arrow-left-linear" width={20} />
              </IconButton>
            )}
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
                Financial Statement{editing ? ` · ${FINANCIAL_PERIOD_LABELS[editing]}` : ''}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                {editing
                  ? 'Income statement & balance sheet — computed values update as you type'
                  : 'Pick a period to enter its income statement & balance sheet'}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={handleClose} aria-label="Close Financial Statement">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {!editing && (
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Applicant Name"
                  value={applicantName}
                  disabled
                  size="small"
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Amount Applied"
                  value={amountApplied == null ? '—' : amountApplied.toLocaleString('en-PH')}
                  disabled
                  size="small"
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  required
                  label="Product Line"
                  inputRef={productLineRef}
                  value={details.productLine}
                  onChange={(event) => {
                    setFinancialStatementDetails({ productLine: event.target.value });
                    if (productLineError && event.target.value.trim()) setProductLineError(false);
                  }}
                  error={productLineError}
                  helperText={productLineError ? 'Product Line is required.' : undefined}
                  size="small"
                  sx={fieldSx}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="AMD"
                  value={details.amd}
                  onChange={(event) => setFinancialStatementDetails({ amd: event.target.value })}
                  size="small"
                  sx={fieldSx}
                />
              </Grid>
            </Grid>

            {FINANCIAL_PERIODS.map((p) => {
              const filled = periodFilled(review.financialStatement[p]);
              return (
                <Box
                  key={p}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 2,
                    borderRadius: '13px',
                    border: '1px solid #EBEDF3',
                    bgcolor: 'common.white',
                  }}
                >
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', flex: 1 }}>
                    {FINANCIAL_PERIOD_LABELS[p]}
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="flex-end">
                    <Chip
                      size="small"
                      label={filled ? 'Filled' : 'Empty'}
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        bgcolor: filled ? TONE_COLORS.success.bg : TONE_COLORS.neutral.bg,
                        color: filled ? TONE_COLORS.success.text : TONE_COLORS.neutral.text,
                      }}
                    />
                    <Button
                      onClick={() => setReportPeriod(p)}
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
                      sx={{ ...outlinedNavyButtonSx, px: 2 }}
                    >
                      View
                    </Button>
                    <Button
                      onClick={() => setEditing(p)}
                      variant="contained"
                      size="small"
                      startIcon={<Iconify icon="solar:pen-bold" width={15} />}
                      sx={{
                        bgcolor: '#1C2A6E',
                        borderRadius: '9px',
                        px: 2,
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
                      }}
                    >
                      Manage
                    </Button>
                  </Stack>
                </Box>
              );
            })}

            <RichTextField
              label="Remarks"
              value={details.remarks}
              onChange={(remarks) => setFinancialStatementDetails({ remarks })}
              placeholder="Enter financial statement remarks…"
            />
          </Stack>
        )}

        {editing && data && inc && bs && (
          <Stack spacing={3}>
            <Box>
              <Box
                sx={{
                  bgcolor: '#1C2A6E',
                  color: 'common.white',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  mb: 2,
                }}
              >
                Income Statement
              </Box>
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    {INCOME_INPUTS.map(({ field, label, allowNegative }) => (
                      <MoneyInput
                        key={field}
                        label={label}
                        value={data[field]}
                        onValueChange={(value) => setFinancialStatementField(editing, field, value)}
                        allowNegative={allowNegative}
                      />
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <ComputedField label="Net Sale" value={money(inc.netSales)} />
                    <ComputedField label="Gross Profit" value={money(inc.grossProfit)} />
                    <ComputedField
                      label="Operating Income Before Other Income (Expenses)"
                      value={money(inc.operatingIncomeBeforeOther)}
                    />
                    <ComputedField label="Operating Income" value={money(inc.operatingIncome)} />
                    <ComputedField label="Net Income Before Tax" value={money(inc.netIncomeBeforeTax)} />
                    <ComputedField label="Net Income After Tax" value={money(inc.netIncomeAfterTax)} />
                    <ComputedField label="EBITDA" value={money(inc.ebitda)} />
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Box
                sx={{
                  bgcolor: '#1C2A6E',
                  color: 'common.white',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  mb: 2,
                }}
              >
                Balance Sheet
              </Box>
              <Grid container spacing={2.5}>
                {BALANCE_INPUTS.map(({ field, label, totalLabel, total }) => (
                  <Grid item xs={12} sm={6} key={field}>
                    <Stack spacing={1}>
                      <MoneyInput
                        label={label}
                        value={data[field]}
                        onValueChange={(value) => setFinancialStatementField(editing, field, value)}
                      />
                      <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5 }}>
                        <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>{totalLabel}</Typography>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#14172A' }}>
                          {money(total(bs))}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pt: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                      Assets vs Liabilities &amp; Equity
                    </Typography>
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
                </Grid>
              </Grid>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        {editing ? (
          <Button
            onClick={() => setEditing(null)}
            variant="outlined"
            sx={{ ...outlinedNavyButtonSx, px: 3 }}
          >
            Back to periods
          </Button>
        ) : null}
        <Button
          onClick={editing ? handleClose : handleSubmit}
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
          {editing ? 'Done' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
