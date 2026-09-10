'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
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
  type BalanceSheetCategory,
} from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';

import { parseNum, computeIncomeStatement, sumBalanceSheetLines } from './financial-summary-calcs';
import { FinancialStatementReport } from './financial-statement-report';

// ----------------------------------------------------------------------
// Financial Statement sub-tool — a two-level modal matching the legacy
// period-row model, minus the separate-page navigation:
//
//   Level 1 (landing): a read-only Applicant Name / Amount Applied
//   FactChip strip, 5 period rows (2023 … Projected) with status, Manage
//   then View, rich-text Remarks, and Submit (just stamps submittedAt).
//   Level 2 (period form): that period's Income Statement — editable
//   inputs left, live computed values right. Every field persists on
//   keystroke — no "save income statement first" gating.
//
// Opened from the Financial Summary card's "Manage" on the Financial
// Statement row. The card's "View" opens the comparative report separately.
// ----------------------------------------------------------------------

// Lock both the ₱ input and the computed-value box to this exact height so
// the two Income Statement columns stay row-for-row level.
const FS_FIELD_HEIGHT = 40;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontSize: 14,
    bgcolor: 'common.white',
    height: FS_FIELD_HEIGHT,
  },
};

const primaryBtnSx = {
  bgcolor: '#1C2A6E',
  borderRadius: '10px',
  px: 3,
  fontWeight: 700,
  boxShadow: 'none',
  '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
};

const sectionBannerSx = {
  bgcolor: '#1C2A6E',
  color: 'common.white',
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  px: 2,
  py: 1,
  borderRadius: '8px',
  mb: 2,
};

function FactChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack spacing={0.35} sx={{ px: 1.75, py: 1, minWidth: 0, flex: '1 1 160px' }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#9AA2B4',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={typeof value === 'string' ? value : undefined}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

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

// The five Balance Sheet categories. Each is a dynamic list of line items;
// `options` is the fixed label set for a line's type dropdown.
const BALANCE_CATEGORIES: {
  key: BalanceSheetCategory;
  banner: string;
  addLabel: string;
  options: string[];
}[] = [
  {
    key: 'currentAssets',
    banner: 'Current Assets',
    addLabel: 'Add Current Asset',
    options: [
      'Cash',
      'Account Receivable – Trade',
      'Inventory',
      'Prepaid Expenses',
      'Short-term Investments',
      'Other Current Assets',
    ],
  },
  {
    key: 'nonCurrentAssets',
    banner: 'Non-Current Asset',
    addLabel: 'Add Asset',
    options: [
      'Property, plant and equipment (net of depr.)',
      'Long-term Investments',
      'Intangible Assets',
      'Deferred Tax Assets',
      'Other Non-Current Assets',
    ],
  },
  {
    key: 'currentLiabilities',
    banner: 'Current Liabilities',
    addLabel: 'Add Current Liabilities',
    options: [
      'Accounts Payable – Trade',
      'Short-term Loans',
      'Accrued Expenses',
      'Current Portion of Long-term Debt',
      'Income Tax Payable',
      'Other Current Liabilities',
    ],
  },
  {
    key: 'nonCurrentLiabilities',
    banner: 'Non-Current Liabilities',
    addLabel: 'Add Non-Current Liabilities',
    options: [
      'Long-term Loans',
      'Deferred Tax Liabilities',
      'Bonds Payable',
      'Other Non-Current Liabilities',
    ],
  },
  {
    key: 'equity',
    banner: 'Equity',
    addLabel: 'Add Equity',
    options: [
      'Capital',
      'Additional Paid-in Capital',
      'Retained Earnings',
      'Net Income',
      'Other Equity',
    ],
  },
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
      <Typography sx={fsLabelSx}>{label}</Typography>
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

// One line, no wrap — the dialog is wide enough that every label fits.
const fsLabelSx = {
  fontSize: 12,
  fontWeight: 600,
  color: '#3B4256',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

function ComputedField({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.6}>
      <Typography sx={{ ...fsLabelSx, color: '#8891A6' }} title={label}>{label}</Typography>
      <Box
        sx={{
          px: 1.5,
          borderRadius: '10px',
          bgcolor: '#F1F3F8',
          border: '1px solid #E1E4ED',
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          height: FS_FIELD_HEIGHT,
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
  const incomeFilled = INCOME_INPUTS.some(({ field }) => parseNum(p[field]) !== 0);
  const bsFilled = BALANCE_CATEGORIES.some(({ key }) => sumBalanceSheetLines(p[key]) !== 0);
  return incomeFilled || bsFilled;
}

// One Balance Sheet category in the flat list — a plain text heading and
// its line items as single horizontal rows (item dropdown + ₱ value +
// remove), then an "Add" button matching the Cash Flow Manage form.
function BalanceCategoryBlock({
  banner,
  addLabel,
  options,
  lines,
  onAdd,
  onUpdate,
  onRemove,
}: {
  banner: string;
  addLabel: string;
  options: string[];
  lines: { id: string; label: string; value: string }[];
  onAdd: () => void;
  onUpdate: (id: string, patch: { label?: string; value?: string }) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Stack spacing={1.25}>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#8891A6',
        }}
      >
        {banner}
      </Typography>

      <Box
        sx={{
          bgcolor: '#F9FAFC',
          border: '1px solid #EEF0F5',
          borderRadius: '11px',
          p: 1.5,
        }}
      >
        <Stack spacing={1.25}>
          {lines.length === 0 ? (
            <Box
              sx={{
                border: '1px dashed #E1E4ED',
                borderRadius: '10px',
                py: 1.5,
                textAlign: 'center',
                fontSize: 12.5,
                color: '#8891A6',
              }}
            >
              No {banner.toLowerCase()} items yet.
            </Box>
          ) : (
            lines.map((row) => (
              <Stack
                key={row.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Select
                  size="small"
                  displayEmpty
                  value={row.label}
                  onChange={(event) => onUpdate(row.id, { label: event.target.value })}
                  sx={{ flex: 1, minWidth: 0, borderRadius: '10px', fontSize: 13, bgcolor: 'common.white' }}
                  renderValue={(v) =>
                    v ? (v as string) : <Box component="span" sx={{ color: '#8891A6' }}>Select item…</Box>
                  }
                >
                  {options.map((opt) => (
                    <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
                <Stack direction="row" spacing={1} alignItems="center">
                  <NumericFormat
                    size="small"
                    customInput={TextField}
                    placeholder="0.00"
                    value={row.value}
                    onValueChange={({ value }) => onUpdate(row.id, { value })}
                    thousandSeparator=","
                    decimalScale={2}
                    allowNegative={false}
                    valueIsNumericString
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TONE_COLORS.info.solid }}>
                            Php
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      width: { xs: '100%', sm: 220 },
                      flexShrink: 0,
                      '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13, bgcolor: 'common.white' },
                      '& input': { textAlign: 'right' },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => onRemove(row.id)}
                    aria-label="Remove line item"
                    sx={{ flexShrink: 0 }}
                  >
                    <Iconify icon="mingcute:close-line" width={15} sx={{ color: TONE_COLORS.error.solid }} />
                  </IconButton>
                </Stack>
              </Stack>
            ))
          )}
        </Stack>
      </Box>

      <Button
        onClick={onAdd}
        variant="outlined"
        size="small"
        startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
        sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-end' }}
      >
        {addLabel}
      </Button>
    </Stack>
  );
}

type FinancialStatementModalProps = {
  open: boolean;
  onClose: () => void;
};

export function FinancialStatementModal({ open, onClose }: FinancialStatementModalProps) {
  const { signUpData, application } = useRegistration();
  const {
    review,
    setFinancialStatementField,
    markFinancialStatementBalanceSheetSaved,
    addBalanceSheetLine,
    updateBalanceSheetLine,
    removeBalanceSheetLine,
    setFinancialStatementDetails,
  } = useAdmin();
  const [editing, setEditing] = useState<FinancialPeriod | null>(null);
  const [step, setStep] = useState<'income' | 'balance' | 'combined'>('income');
  const [reportPeriod, setReportPeriod] = useState<FinancialPeriod | null>(null);

  const details = review.financialStatementDetails;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';
  const amountApplied = application.financialInfo?.desiredLoanAmount;

  const openPeriod = (p: FinancialPeriod) => {
    setStep(review.financialStatement[p].balanceSheetSaved ? 'combined' : 'income');
    setEditing(p);
  };

  const exitToPeriodList = () => {
    setEditing(null);
    setStep('income');
  };

  const handleClose = () => {
    exitToPeriodList();
    setReportPeriod(null);
    onClose();
  };

  const handleSubmit = () => {
    setFinancialStatementDetails(submitFinancialStatementDetails(details, new Date().toISOString()));
    handleClose();
  };

  const handleSaveBalanceSheet = () => {
    if (editing) markFinancialStatementBalanceSheetSaved(editing);
    exitToPeriodList();
  };

  const money = (n: number) => fCurrency(n) || '₱0.00';

  const data = editing ? review.financialStatement[editing] : null;
  const inc = data ? computeIncomeStatement(data) : null;

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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {editing && (
              <IconButton onClick={exitToPeriodList} aria-label="Back to period list" size="small">
                <Iconify icon="solar:alt-arrow-left-linear" width={20} />
              </IconButton>
            )}
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
                Financial Statement
                {editing ? ` · ${FINANCIAL_PERIOD_LABELS[editing]}` : ''}
                {editing && step === 'income' ? ' · Income Statement' : ''}
                {editing && step === 'balance' ? ' · Balance Sheet' : ''}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                {!editing && 'Pick a period to enter its income statement & balance sheet'}
                {editing && step === 'income' && 'Enter the income statement, then proceed to the balance sheet'}
                {editing && step === 'balance' && 'Enter the balance sheet — computed totals update as you type'}
                {editing && step === 'combined' && 'Income statement & balance sheet — computed values update as you type'}
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
            <Stack
              direction="row"
              flexWrap="wrap"
              sx={{
                border: '1px solid #EEF0F5',
                borderRadius: '12px',
                bgcolor: '#FAFBFD',
                '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
              }}
            >
              <FactChip label="Applicant Name" value={applicantName} />
              <FactChip
                label="Amount Applied"
                value={amountApplied == null ? '—' : `₱${amountApplied.toLocaleString('en-PH')}`}
              />
            </Stack>

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
                      onClick={() => openPeriod(p)}
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
                    <Button
                      onClick={() => setReportPeriod(p)}
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
                      sx={{ ...outlinedNavyButtonSx, px: 2 }}
                    >
                      View
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

        {editing && data && inc && (step === 'income' || step === 'combined') && (
          <Box sx={{ mb: step === 'combined' ? 3 : 0 }}>
            {step === 'combined' && <Box sx={sectionBannerSx}>Income Statement</Box>}
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
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
        )}

        {editing && data && (step === 'balance' || step === 'combined') && (
          <Stack spacing={2.5}>
            {step === 'combined' && <Box sx={sectionBannerSx}>Balance Sheet</Box>}
            {BALANCE_CATEGORIES.map((cat) => (
              <BalanceCategoryBlock
                key={cat.key}
                banner={cat.banner}
                addLabel={cat.addLabel}
                options={cat.options}
                lines={data[cat.key]}
                onAdd={() => addBalanceSheetLine(editing, cat.key)}
                onUpdate={(id, patch) => updateBalanceSheetLine(editing, cat.key, id, patch)}
                onRemove={(id) => removeBalanceSheetLine(editing, cat.key, id)}
              />
            ))}
          </Stack>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        {!editing && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={primaryBtnSx}
          >
            Submit
          </Button>
        )}

        {editing && step === 'income' && (
          <>
            <Button onClick={exitToPeriodList} variant="outlined" sx={{ ...outlinedNavyButtonSx, px: 3 }}>
              Back to periods
            </Button>
            <Button onClick={() => setStep('balance')} variant="contained" sx={primaryBtnSx}>
              Proceed to Balance Sheet
            </Button>
          </>
        )}

        {editing && step === 'balance' && (
          <>
            <Button onClick={() => setStep('income')} variant="outlined" sx={{ ...outlinedNavyButtonSx, px: 3 }}>
              Back to Income Statement
            </Button>
            <Button onClick={handleSaveBalanceSheet} variant="contained" sx={primaryBtnSx}>
              Save
            </Button>
          </>
        )}

        {editing && step === 'combined' && (
          <>
            <Button onClick={exitToPeriodList} variant="outlined" sx={{ ...outlinedNavyButtonSx, px: 3 }}>
              Back to periods
            </Button>
            <Button onClick={exitToPeriodList} variant="contained" sx={primaryBtnSx}>
              Done
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
