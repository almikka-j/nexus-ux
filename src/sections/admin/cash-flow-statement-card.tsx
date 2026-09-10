'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
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
import type { CashFlowComputationType } from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { StatusBadge, TONE_COLORS, adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

import {
  computeTotalIncome,
  computeExpenseSubtotal,
  computeAdjustedExpenseAmount,
  computeTotalExpenses,
  computeIncomeAvailableForDebtService,
  computeTotalOtherLoans,
  computeMonthlyAmortization,
  computeNetIncome,
  computeDebtServiceRatio,
} from './cash-flow-statement';

// ----------------------------------------------------------------------
// Financial Evaluation's Cash Flow Statement — an editable Combined/
// Borrower Only two-column form computing Total Income, Total Expenses,
// Income Available for Debt Service, Monthly Amortization (per
// computationType), Net Income, and Debt Service Ratio. Every derived
// value is recomputed live from review.cashFlowStatement's raw string
// inputs via cash-flow-statement.ts's pure functions — nothing derived is
// stored, only the raw inputs are (mirroring every other form in this app).
//
// Visual language matches the rest of the admin app rather than mirroring
// the reference spreadsheet: the Manage form is one <table> (CfsFormTable)
// where each section opens with a tinted SectionRow band carrying both the
// section name and the COMBINED / BORROWER ONLY column labels, followed by
// that section's InputRows (light zebra) and computed ValueRows (subtotal
// / total / headline tones). ₱-prefixed currency inputs, TONE_COLORS
// instead of hardcoded hex.
//
// "Save Record" only stamps `savedAt` — there's no separate draft/saved
// state split; every keystroke already persists to review.cashFlowStatement
// via setCashFlowStatement, same as every other admin form field in this
// app. The button exists to give the officer an explicit "I'm done for
// now" moment matching the reference design, not because unsaved changes
// could otherwise be lost.
// ----------------------------------------------------------------------

const COMPUTATION_TYPE_LABELS: Record<CashFlowComputationType, string> = {
  'add-on': 'Add On',
  diminishing: 'Diminishing Balance',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' },
};

function Field({
  label,
  required,
  ...props
}: {
  label: string;
  required?: boolean;
} & React.ComponentProps<typeof TextField>) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>
        {label}
        {required && <Box component="span" sx={{ color: TONE_COLORS.error.solid }}> *</Box>}
      </Typography>
      <TextField fullWidth size="small" sx={fieldSx} {...props} />
    </Stack>
  );
}

// ----------------------------------------------------------------------
// The whole Manage form is one <table> (CfsFormTable). Each section opens
// with a tinted SectionRow band — section name on the left, the COMBINED
// / BORROWER ONLY column labels on the right (there is no separate table
// head) — followed by that section's InputRows (light zebra) and computed
// ValueRows. Sections are not separate cards. Scrolls horizontally on
// narrow screens.
// ----------------------------------------------------------------------

const CFS_VALUE_WIDTH = 180;
const CFS_MIN_TABLE_WIDTH = 200 + CFS_VALUE_WIDTH * 2 + 48;

const CFS_SECTION_BG = '#F1F3F8';

const cellFieldSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: 13.5, bgcolor: 'common.white' },
  '& input': { textAlign: 'right' },
};

const cfsCellSx = { px: 1, py: 0.6, verticalAlign: 'middle' as const };

function CurrencyCell({
  value,
  onValueChange,
  disabled,
}: {
  value: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <NumericFormat
      size="small"
      customInput={TextField}
      placeholder="0.00"
      value={value}
      disabled={disabled}
      onValueChange={({ value: next }) => onValueChange?.(next)}
      thousandSeparator=","
      decimalScale={2}
      allowNegative={false}
      valueIsNumericString
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: TONE_COLORS.info.solid }}>₱</Typography>
          </InputAdornment>
        ),
      }}
      sx={cellFieldSx}
    />
  );
}

function PercentCell({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  return (
    <NumericFormat
      size="small"
      customInput={TextField}
      placeholder="0"
      value={value}
      onValueChange={({ value: next }) => onValueChange(next)}
      decimalScale={2}
      allowNegative={false}
      valueIsNumericString
      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
      sx={cellFieldSx}
    />
  );
}

function IntegerCell({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  return (
    <NumericFormat
      size="small"
      customInput={TextField}
      placeholder="0"
      value={value}
      onValueChange={({ value: next }) => onValueChange(next)}
      decimalScale={0}
      allowNegative={false}
      valueIsNumericString
      sx={cellFieldSx}
    />
  );
}

/** The whole form: one horizontally-scrolling <table>. The COMBINED /
 *  BORROWER ONLY column labels live on each SectionRow, not a separate
 *  head. */
function CfsFormTable({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ overflowX: 'auto', border: '1px solid #EBEDF3', borderRadius: '13px' }}>
      <Box
        component="table"
        sx={{ width: '100%', minWidth: CFS_MIN_TABLE_WIDTH, borderCollapse: 'collapse', tableLayout: 'fixed' }}
      >
        <Box component="colgroup">
          <Box component="col" sx={{ width: 'auto' }} />
          <Box component="col" sx={{ width: CFS_VALUE_WIDTH }} />
          <Box component="col" sx={{ width: CFS_VALUE_WIDTH }} />
        </Box>
        <Box component="tbody">{children}</Box>
      </Box>
    </Box>
  );
}

const cfsSectionColLabelSx = {
  ...cfsCellSx,
  py: 0.85,
  textAlign: 'right' as const,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: '#8891A6',
};

/** A tinted section band — section name on the left, the COMBINED /
 *  BORROWER ONLY column labels on the right. */
function SectionRow({ label }: { label: string }) {
  return (
    <Box component="tr" sx={{ bgcolor: CFS_SECTION_BG }}>
      <Box
        component="td"
        sx={{ ...cfsCellSx, py: 0.85, fontSize: 13, fontWeight: 800, color: '#14172A', letterSpacing: '0.02em' }}
      >
        {label}
      </Box>
      <Box component="td" sx={cfsSectionColLabelSx}>Combined</Box>
      <Box component="td" sx={cfsSectionColLabelSx}>Borrower Only</Box>
    </Box>
  );
}

const cfsZebraSx = { '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } };

/** An editable line: label + two input cells. Light zebra. */
function InputRow({
  label,
  required,
  kind = 'currency',
  combinedValue,
  borrowerOnlyValue,
  onCombinedChange,
  onBorrowerOnlyChange,
}: {
  label: string;
  required?: boolean;
  kind?: 'currency' | 'percent' | 'integer';
  combinedValue: string;
  borrowerOnlyValue: string;
  onCombinedChange: (value: string) => void;
  onBorrowerOnlyChange: (value: string) => void;
}) {
  const Cell = kind === 'percent' ? PercentCell : kind === 'integer' ? IntegerCell : CurrencyCell;
  return (
    <Box component="tr" sx={cfsZebraSx}>
      <Box component="td" sx={{ ...cfsCellSx, fontSize: 13, fontWeight: 600, color: '#3B4256' }}>
        {label}
        {required && <Box component="span" sx={{ color: TONE_COLORS.error.solid }}> *</Box>}
      </Box>
      <Box component="td" sx={cfsCellSx}>
        <Cell value={combinedValue} onValueChange={onCombinedChange} />
      </Box>
      <Box component="td" sx={cfsCellSx}>
        <Cell value={borrowerOnlyValue} onValueChange={onBorrowerOnlyChange} />
      </Box>
    </Box>
  );
}

/** The read-only Monthly Amortization line — disabled ₱ fields. */
function DisabledCurrencyRow({
  label,
  combined,
  borrowerOnly,
}: {
  label: string;
  combined: number | null;
  borrowerOnly: number | null;
}) {
  return (
    <Box component="tr" sx={cfsZebraSx}>
      <Box component="td" sx={{ ...cfsCellSx, fontSize: 13, fontWeight: 600, color: '#3B4256' }}>{label}</Box>
      <Box component="td" sx={cfsCellSx}>
        <CurrencyCell disabled value={combined === null ? '' : String(combined)} />
      </Box>
      <Box component="td" sx={cfsCellSx}>
        <CurrencyCell disabled value={borrowerOnly === null ? '' : String(borrowerOnly)} />
      </Box>
    </Box>
  );
}

type ResultTone = 'subtotal' | 'total' | 'headline';

const RESULT_TONE_SX: Record<ResultTone, { row: object; label: object; value: object }> = {
  subtotal: {
    row: {},
    label: { fontSize: 13, fontWeight: 500, color: '#5A6273' },
    value: { fontSize: 13, fontWeight: 600, color: '#3B4256' },
  },
  total: {
    row: { bgcolor: '#F9FAFC' },
    label: { fontSize: 13.5, fontWeight: 700, color: '#14172A' },
    value: { fontSize: 13.5, fontWeight: 700, color: '#14172A' },
  },
  headline: {
    row: { bgcolor: '#EEF1FE' },
    label: { fontSize: 13.5, fontWeight: 800, color: '#14172A' },
    value: { fontSize: 13.5, fontWeight: 800, color: '#3448B0' },
  },
};

/** A computed line: label + two value cells. */
function ValueRow({
  label,
  combined,
  borrowerOnly,
  tone = 'subtotal',
}: {
  label: string;
  combined: string;
  borrowerOnly: string;
  tone?: ResultTone;
}) {
  const t = RESULT_TONE_SX[tone];
  return (
    <Box component="tr" sx={t.row}>
      <Box component="td" sx={{ ...cfsCellSx, py: tone === 'subtotal' ? 0.6 : 1, ...t.label }}>{label}</Box>
      <Box component="td" sx={{ ...cfsCellSx, py: tone === 'subtotal' ? 0.6 : 1, textAlign: 'right', ...t.value }}>
        {combined}
      </Box>
      <Box component="td" sx={{ ...cfsCellSx, py: tone === 'subtotal' ? 0.6 : 1, textAlign: 'right', ...t.value }}>
        {borrowerOnly}
      </Box>
    </Box>
  );
}

export function CashFlowStatementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signUpData, application } = useRegistration();
  const { review, setCashFlowStatement, addCashFlowOtherLoan, removeCashFlowOtherLoan, updateCashFlowOtherLoan } =
    useAdmin();
  const cashFlow = review.cashFlowStatement;

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const loanAmount = application.financialInfo?.desiredLoanAmount ?? null;

  const patch = (data: Partial<typeof cashFlow>) => setCashFlowStatement(data);

  const totalIncomeCombined = computeTotalIncome(
    cashFlow.fixedIncomeCombined,
    cashFlow.variableIncomeCombined,
    cashFlow.otherIncomeCombined,
    cashFlow.lessDeductionsCombined
  );
  const totalIncomeBorrowerOnly = computeTotalIncome(
    cashFlow.fixedIncomeBorrowerOnly,
    cashFlow.variableIncomeBorrowerOnly,
    cashFlow.otherIncomeBorrowerOnly,
    cashFlow.lessDeductionsBorrowerOnly
  );

  const subtotalCombined = computeExpenseSubtotal(
    cashFlow.fixedExpenseCombined,
    cashFlow.utilitiesCombined,
    cashFlow.transportCombined,
    cashFlow.otherExpenseCombined,
    cashFlow.miscExpensesCombined
  );
  const subtotalBorrowerOnly = computeExpenseSubtotal(
    cashFlow.fixedExpenseBorrowerOnly,
    cashFlow.utilitiesBorrowerOnly,
    cashFlow.transportBorrowerOnly,
    cashFlow.otherExpenseBorrowerOnly,
    cashFlow.miscExpensesBorrowerOnly
  );

  const adjustedExpenseAmountCombined = computeAdjustedExpenseAmount(subtotalCombined, cashFlow.adjustedExpensePercentCombined);
  const adjustedExpenseAmountBorrowerOnly = computeAdjustedExpenseAmount(
    subtotalBorrowerOnly,
    cashFlow.adjustedExpensePercentBorrowerOnly
  );

  const totalExpensesCombined = computeTotalExpenses(subtotalCombined, adjustedExpenseAmountCombined);
  const totalExpensesBorrowerOnly = computeTotalExpenses(subtotalBorrowerOnly, adjustedExpenseAmountBorrowerOnly);

  const incomeAvailableCombined = computeIncomeAvailableForDebtService(totalIncomeCombined, totalExpensesCombined);
  const incomeAvailableBorrowerOnly = computeIncomeAvailableForDebtService(totalIncomeBorrowerOnly, totalExpensesBorrowerOnly);

  const totalOtherLoansCombined = computeTotalOtherLoans(cashFlow.otherLoans, 'combined');
  const totalOtherLoansBorrowerOnly = computeTotalOtherLoans(cashFlow.otherLoans, 'borrowerOnly');

  const monthlyAmortizationCombined = computeMonthlyAmortization(
    cashFlow.computationType,
    cashFlow.principalCombined,
    cashFlow.interestRateCombined,
    cashFlow.termCombined
  );
  const monthlyAmortizationBorrowerOnly = computeMonthlyAmortization(
    cashFlow.computationType,
    cashFlow.principalBorrowerOnly,
    cashFlow.interestRateBorrowerOnly,
    cashFlow.termBorrowerOnly
  );

  const netIncomeCombined = computeNetIncome(incomeAvailableCombined, totalOtherLoansCombined, monthlyAmortizationCombined);
  const netIncomeBorrowerOnly = computeNetIncome(
    incomeAvailableBorrowerOnly,
    totalOtherLoansBorrowerOnly,
    monthlyAmortizationBorrowerOnly
  );

  const debtServiceRatioCombined = computeDebtServiceRatio(
    monthlyAmortizationCombined,
    totalOtherLoansCombined,
    incomeAvailableCombined
  );
  const debtServiceRatioBorrowerOnly = computeDebtServiceRatio(
    monthlyAmortizationBorrowerOnly,
    totalOtherLoansBorrowerOnly,
    incomeAvailableBorrowerOnly
  );

  const fmt = (value: number) => fCurrency(value) || '₱0.00';
  const fmtOrBlank = (value: number | null) => (value === null ? '—' : fCurrency(value) || '₱0.00');
  const fmtPercent = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}%`);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Cash Flow Statement
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Combined / Borrower Only — Debt Service Ratio for the proposed loan
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close Cash Flow Statement">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack spacing={2}>
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
              <FactChip label="Borrower's Name" value={applicantName} />
              <FactChip
                label="Amount of Loan"
                value={loanAmount !== null ? fCurrency(loanAmount) : '—'}
              />
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Field
                  select
                  label="Computation Type"
                  value={cashFlow.computationType}
                  onChange={(event) => patch({ computationType: event.target.value as CashFlowComputationType })}
                >
                  {(Object.keys(COMPUTATION_TYPE_LABELS) as CashFlowComputationType[]).map((key) => (
                    <MenuItem key={key} value={key}>
                      {COMPUTATION_TYPE_LABELS[key]}
                    </MenuItem>
                  ))}
                </Field>
              </Grid>
            </Grid>
          </Stack>

          <CfsFormTable>
            <SectionRow label="Source of Income" />
            <InputRow
              label="Fixed Income"
              required
              combinedValue={cashFlow.fixedIncomeCombined}
              borrowerOnlyValue={cashFlow.fixedIncomeBorrowerOnly}
              onCombinedChange={(value) => patch({ fixedIncomeCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ fixedIncomeBorrowerOnly: value })}
            />
            <InputRow
              label="Variable Income"
              combinedValue={cashFlow.variableIncomeCombined}
              borrowerOnlyValue={cashFlow.variableIncomeBorrowerOnly}
              onCombinedChange={(value) => patch({ variableIncomeCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ variableIncomeBorrowerOnly: value })}
            />
            <InputRow
              label="Other Income (Spouse Income / Profit Sharing)"
              combinedValue={cashFlow.otherIncomeCombined}
              borrowerOnlyValue={cashFlow.otherIncomeBorrowerOnly}
              onCombinedChange={(value) => patch({ otherIncomeCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ otherIncomeBorrowerOnly: value })}
            />
            <InputRow
              label="Less: Deductions"
              combinedValue={cashFlow.lessDeductionsCombined}
              borrowerOnlyValue={cashFlow.lessDeductionsBorrowerOnly}
              onCombinedChange={(value) => patch({ lessDeductionsCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ lessDeductionsBorrowerOnly: value })}
            />
            <ValueRow
              label="Total Income"
              tone="total"
              combined={fmt(totalIncomeCombined)}
              borrowerOnly={fmt(totalIncomeBorrowerOnly)}
            />

            <SectionRow label="Less Expenses" />
            <InputRow
              label="Fixed Expense"
              required
              combinedValue={cashFlow.fixedExpenseCombined}
              borrowerOnlyValue={cashFlow.fixedExpenseBorrowerOnly}
              onCombinedChange={(value) => patch({ fixedExpenseCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ fixedExpenseBorrowerOnly: value })}
            />
            <InputRow
              label="Utilities"
              combinedValue={cashFlow.utilitiesCombined}
              borrowerOnlyValue={cashFlow.utilitiesBorrowerOnly}
              onCombinedChange={(value) => patch({ utilitiesCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ utilitiesBorrowerOnly: value })}
            />
            <InputRow
              label="Transport"
              combinedValue={cashFlow.transportCombined}
              borrowerOnlyValue={cashFlow.transportBorrowerOnly}
              onCombinedChange={(value) => patch({ transportCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ transportBorrowerOnly: value })}
            />
            <InputRow
              label="Other Expense"
              combinedValue={cashFlow.otherExpenseCombined}
              borrowerOnlyValue={cashFlow.otherExpenseBorrowerOnly}
              onCombinedChange={(value) => patch({ otherExpenseCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ otherExpenseBorrowerOnly: value })}
            />
            <InputRow
              label="Miscellaneous Expenses"
              combinedValue={cashFlow.miscExpensesCombined}
              borrowerOnlyValue={cashFlow.miscExpensesBorrowerOnly}
              onCombinedChange={(value) => patch({ miscExpensesCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ miscExpensesBorrowerOnly: value })}
            />
            <ValueRow label="Sub-total" combined={fmt(subtotalCombined)} borrowerOnly={fmt(subtotalBorrowerOnly)} />
            <InputRow
              label="Add: Adjusted Expense Percent"
              kind="percent"
              combinedValue={cashFlow.adjustedExpensePercentCombined}
              borrowerOnlyValue={cashFlow.adjustedExpensePercentBorrowerOnly}
              onCombinedChange={(value) => patch({ adjustedExpensePercentCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ adjustedExpensePercentBorrowerOnly: value })}
            />
            <ValueRow
              label="Add: Adjusted Expense Amount"
              combined={fmt(adjustedExpenseAmountCombined)}
              borrowerOnly={fmt(adjustedExpenseAmountBorrowerOnly)}
            />
            <ValueRow
              label="Total Expenses"
              tone="total"
              combined={fmt(totalExpensesCombined)}
              borrowerOnly={fmt(totalExpensesBorrowerOnly)}
            />
            <ValueRow
              label="Income Available for Debt Service"
              tone="total"
              combined={fmt(incomeAvailableCombined)}
              borrowerOnly={fmt(incomeAvailableBorrowerOnly)}
            />

            <SectionRow label="Other Loans" />
            {cashFlow.otherLoans.length > 0 &&
              cashFlow.otherLoans.map((loan) => (
                <Box component="tr" key={loan.id} sx={cfsZebraSx}>
                  <Box component="td" sx={cfsCellSx}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Lender — e.g. Another Bank"
                      value={loan.lender}
                      onChange={(event) => updateCashFlowOtherLoan(loan.id, { lender: event.target.value })}
                      sx={{ ...cellFieldSx, '& input': { textAlign: 'left' } }}
                    />
                  </Box>
                  <Box component="td" sx={cfsCellSx}>
                    <CurrencyCell
                      value={loan.monthlyAmortizationCombined}
                      onValueChange={(value) => updateCashFlowOtherLoan(loan.id, { monthlyAmortizationCombined: value })}
                    />
                  </Box>
                  <Box component="td" sx={cfsCellSx}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <CurrencyCell
                        value={loan.monthlyAmortizationBorrowerOnly}
                        onValueChange={(value) =>
                          updateCashFlowOtherLoan(loan.id, { monthlyAmortizationBorrowerOnly: value })
                        }
                      />
                      <IconButton
                        size="small"
                        onClick={() => removeCashFlowOtherLoan(loan.id)}
                        aria-label="Remove other loan"
                        sx={{ flexShrink: 0 }}
                      >
                        <Iconify icon="mingcute:close-line" width={15} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Box>
              ))}
            <Box component="tr">
              <Box component="td" colSpan={3} sx={{ px: 1, py: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                    {cashFlow.otherLoans.length === 0
                      ? 'No other loans recorded.'
                      : `${cashFlow.otherLoans.length} other loan${cashFlow.otherLoans.length > 1 ? 's' : ''} recorded.`}
                  </Typography>
                  <Button
                    onClick={addCashFlowOtherLoan}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
                    sx={{ ...outlinedNavyButtonSx, flexShrink: 0 }}
                  >
                    Add Other Loan
                  </Button>
                </Stack>
              </Box>
            </Box>
            <ValueRow
              label="Total of Other Loans"
              tone="total"
              combined={fmt(totalOtherLoansCombined)}
              borrowerOnly={fmt(totalOtherLoansBorrowerOnly)}
            />

            <SectionRow label="Proposed Amount" />
            <InputRow
              label="Principal"
              required
              combinedValue={cashFlow.principalCombined}
              borrowerOnlyValue={cashFlow.principalBorrowerOnly}
              onCombinedChange={(value) => patch({ principalCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ principalBorrowerOnly: value })}
            />
            <InputRow
              label="Interest Rate (annual)"
              required
              kind="percent"
              combinedValue={cashFlow.interestRateCombined}
              borrowerOnlyValue={cashFlow.interestRateBorrowerOnly}
              onCombinedChange={(value) => patch({ interestRateCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ interestRateBorrowerOnly: value })}
            />
            <InputRow
              label="Term (months)"
              required
              kind="integer"
              combinedValue={cashFlow.termCombined}
              borrowerOnlyValue={cashFlow.termBorrowerOnly}
              onCombinedChange={(value) => patch({ termCombined: value })}
              onBorrowerOnlyChange={(value) => patch({ termBorrowerOnly: value })}
            />
            <DisabledCurrencyRow
              label="Monthly Amortization"
              combined={monthlyAmortizationCombined}
              borrowerOnly={monthlyAmortizationBorrowerOnly}
            />
            <ValueRow
              label="Principal & Interest"
              combined={fmtOrBlank(monthlyAmortizationCombined)}
              borrowerOnly={fmtOrBlank(monthlyAmortizationBorrowerOnly)}
            />
            <ValueRow
              label="Net Income"
              tone="total"
              combined={fmt(netIncomeCombined)}
              borrowerOnly={fmt(netIncomeBorrowerOnly)}
            />
            <ValueRow
              label="Debt Service Ratio"
              tone="headline"
              combined={fmtPercent(debtServiceRatioCombined)}
              borrowerOnly={fmtPercent(debtServiceRatioBorrowerOnly)}
            />
          </CfsFormTable>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          onClick={() => patch({ savedAt: new Date().toISOString() })}
          variant="outlined"
          startIcon={<Iconify icon="solar:diskette-bold" width={18} />}
          sx={{
            color: TONE_COLORS.info.solid,
            borderColor: '#C7CEEA',
            borderRadius: '10px',
            px: 2.5,
            fontWeight: 700,
            '&:hover': { borderColor: TONE_COLORS.info.solid, bgcolor: 'rgba(28,42,110,0.04)' },
          }}
        >
          Save Record
        </Button>
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

// ----------------------------------------------------------------------
// Read-only report — the computed Cash Flow results (both columns), no
// inputs. Opened from the card's "View report".
// ----------------------------------------------------------------------
export function CashFlowStatementReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signUpData, application } = useRegistration();
  const { review } = useAdmin();
  const cashFlow = review.cashFlowStatement;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';
  const loanAmount = application.financialInfo?.desiredLoanAmount ?? null;

  const totalIncomeCombined = computeTotalIncome(
    cashFlow.fixedIncomeCombined,
    cashFlow.variableIncomeCombined,
    cashFlow.otherIncomeCombined,
    cashFlow.lessDeductionsCombined
  );
  const totalIncomeBorrowerOnly = computeTotalIncome(
    cashFlow.fixedIncomeBorrowerOnly,
    cashFlow.variableIncomeBorrowerOnly,
    cashFlow.otherIncomeBorrowerOnly,
    cashFlow.lessDeductionsBorrowerOnly
  );
  const subtotalCombined = computeExpenseSubtotal(
    cashFlow.fixedExpenseCombined,
    cashFlow.utilitiesCombined,
    cashFlow.transportCombined,
    cashFlow.otherExpenseCombined,
    cashFlow.miscExpensesCombined
  );
  const subtotalBorrowerOnly = computeExpenseSubtotal(
    cashFlow.fixedExpenseBorrowerOnly,
    cashFlow.utilitiesBorrowerOnly,
    cashFlow.transportBorrowerOnly,
    cashFlow.otherExpenseBorrowerOnly,
    cashFlow.miscExpensesBorrowerOnly
  );
  const totalExpensesCombined = computeTotalExpenses(
    subtotalCombined,
    computeAdjustedExpenseAmount(subtotalCombined, cashFlow.adjustedExpensePercentCombined)
  );
  const totalExpensesBorrowerOnly = computeTotalExpenses(
    subtotalBorrowerOnly,
    computeAdjustedExpenseAmount(subtotalBorrowerOnly, cashFlow.adjustedExpensePercentBorrowerOnly)
  );
  const incomeAvailableCombined = computeIncomeAvailableForDebtService(totalIncomeCombined, totalExpensesCombined);
  const incomeAvailableBorrowerOnly = computeIncomeAvailableForDebtService(
    totalIncomeBorrowerOnly,
    totalExpensesBorrowerOnly
  );
  const totalOtherLoansCombined = computeTotalOtherLoans(cashFlow.otherLoans, 'combined');
  const totalOtherLoansBorrowerOnly = computeTotalOtherLoans(cashFlow.otherLoans, 'borrowerOnly');
  const monthlyAmortizationCombined = computeMonthlyAmortization(
    cashFlow.computationType,
    cashFlow.principalCombined,
    cashFlow.interestRateCombined,
    cashFlow.termCombined
  );
  const monthlyAmortizationBorrowerOnly = computeMonthlyAmortization(
    cashFlow.computationType,
    cashFlow.principalBorrowerOnly,
    cashFlow.interestRateBorrowerOnly,
    cashFlow.termBorrowerOnly
  );
  const netIncomeCombined = computeNetIncome(
    incomeAvailableCombined,
    totalOtherLoansCombined,
    monthlyAmortizationCombined
  );
  const netIncomeBorrowerOnly = computeNetIncome(
    incomeAvailableBorrowerOnly,
    totalOtherLoansBorrowerOnly,
    monthlyAmortizationBorrowerOnly
  );
  const dsrCombined = computeDebtServiceRatio(
    monthlyAmortizationCombined,
    totalOtherLoansCombined,
    incomeAvailableCombined
  );
  const dsrBorrowerOnly = computeDebtServiceRatio(
    monthlyAmortizationBorrowerOnly,
    totalOtherLoansBorrowerOnly,
    incomeAvailableBorrowerOnly
  );

  // "PGFC Loan – Principal & Interest" = the proposed loan's monthly
  // amortization annualised; "Total Loans" = other loans + that.
  const pgfcAnnualCombined = monthlyAmortizationCombined === null ? null : monthlyAmortizationCombined * 12;
  const pgfcAnnualBorrowerOnly =
    monthlyAmortizationBorrowerOnly === null ? null : monthlyAmortizationBorrowerOnly * 12;
  const totalLoansCombined = totalOtherLoansCombined + (pgfcAnnualCombined ?? 0);
  const totalLoansBorrowerOnly = totalOtherLoansBorrowerOnly + (pgfcAnnualBorrowerOnly ?? 0);

  const adjustedExpenseCombined = computeAdjustedExpenseAmount(
    subtotalCombined,
    cashFlow.adjustedExpensePercentCombined
  );
  const adjustedExpenseBorrowerOnly = computeAdjustedExpenseAmount(
    subtotalBorrowerOnly,
    cashFlow.adjustedExpensePercentBorrowerOnly
  );

  // Percentage of Net Income Over Gross = Net Income ÷ Total Income.
  const pctNetOverGross = (net: number, gross: number) =>
    gross === 0 ? null : (net / gross) * 100;

  const num = (raw: string) => parseFloat(String(raw).replace(/,/g, '')) || 0;
  const fmt = (value: number) => fCurrency(value) || '₱0.00';
  const fmtDash = (raw: string) => {
    const n = num(raw);
    return n === 0 ? '—' : fmt(n);
  };
  const fmtOrDash = (value: number) => (value === 0 ? '—' : fmt(value));
  const fmtNullDash = (value: number | null) => (value === null || value === 0 ? '—' : fmt(value));
  const fmtPct = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}%`);
  const nowLabel = new Date().toLocaleString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Cash Flow Statement Report
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              {applicantName} · Combined / Borrower Only
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="PDF export coming soon">
              <span>
                <IconButton
                  disabled
                  aria-label="Download Cash Flow Statement Report"
                  sx={{ border: '1px solid #E1E4ED', borderRadius: '10px', px: 1.5 }}
                >
                  <Iconify icon="solar:file-download-bold" width={18} sx={{ color: '#8891A6' }} />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton onClick={onClose} aria-label="Close Cash Flow Statement Report">
              <Iconify icon="mingcute:close-line" width={22} />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {/* Meta — the Application Details card's FactChip strip. */}
        <Stack
          direction="row"
          flexWrap="wrap"
          sx={{
            mb: 2.5,
            border: '1px solid #EEF0F5',
            borderRadius: '12px',
            bgcolor: '#FAFBFD',
            '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
          }}
        >
          <FactChip label="Borrower's Name" value={applicantName} />
          <FactChip label="Amount of Loan" value={loanAmount !== null ? fCurrency(loanAmount) : '—'} />
          <FactChip label="Computation Type" value={COMPUTATION_TYPE_LABELS[cashFlow.computationType]} />
        </Stack>

        <Box
          sx={{
            overflowX: 'auto',
            border: '1px solid #EBEDF3',
            borderRadius: '13px',
          }}
        >
          <Box component="table" sx={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#EEF1FE' }}>
                <Box
                  component="th"
                  sx={{ ...reportCellSx, textAlign: 'left', fontWeight: 800, color: '#14172A' }}
                >
                  Personal Income &amp; Expenses
                </Box>
                <Box component="th" sx={{ ...reportCellSx, fontWeight: 800, color: '#14172A' }}>
                  Combined
                </Box>
                <Box component="th" sx={{ ...reportCellSx, fontWeight: 800, color: '#14172A' }}>
                  Borrower Only
                </Box>
              </Box>
            </Box>
            <Box component="tbody">
              <ReportGroupRow label="Source of Income" />
              <ReportLineRow label="Fixed Income" combined={fmtDash(cashFlow.fixedIncomeCombined)} borrowerOnly={fmtDash(cashFlow.fixedIncomeBorrowerOnly)} />
              <ReportLineRow label="Variable Income" combined={fmtDash(cashFlow.variableIncomeCombined)} borrowerOnly={fmtDash(cashFlow.variableIncomeBorrowerOnly)} />
              <ReportLineRow label="Other Income (Spouse Income / Profit Sharing)" combined={fmtDash(cashFlow.otherIncomeCombined)} borrowerOnly={fmtDash(cashFlow.otherIncomeBorrowerOnly)} />
              <ReportLineRow label="Less: Deductions" combined={fmtDash(cashFlow.lessDeductionsCombined)} borrowerOnly={fmtDash(cashFlow.lessDeductionsBorrowerOnly)} />
              <ReportTotalRow label="Total Income" combined={fmtOrDash(totalIncomeCombined)} borrowerOnly={fmtOrDash(totalIncomeBorrowerOnly)} />

              <ReportGroupRow label="Less Expenses" />
              <ReportLineRow label="Fixed Expense" combined={fmtDash(cashFlow.fixedExpenseCombined)} borrowerOnly={fmtDash(cashFlow.fixedExpenseBorrowerOnly)} />
              <ReportLineRow label="Utilities" combined={fmtDash(cashFlow.utilitiesCombined)} borrowerOnly={fmtDash(cashFlow.utilitiesBorrowerOnly)} />
              <ReportLineRow label="Transport" combined={fmtDash(cashFlow.transportCombined)} borrowerOnly={fmtDash(cashFlow.transportBorrowerOnly)} />
              <ReportLineRow label="Other Expense" combined={fmtDash(cashFlow.otherExpenseCombined)} borrowerOnly={fmtDash(cashFlow.otherExpenseBorrowerOnly)} />
              <ReportLineRow label="Miscellaneous Expenses" combined={fmtDash(cashFlow.miscExpensesCombined)} borrowerOnly={fmtDash(cashFlow.miscExpensesBorrowerOnly)} />
              <ReportLineRow label="Sub-total" combined={fmtOrDash(subtotalCombined)} borrowerOnly={fmtOrDash(subtotalBorrowerOnly)} muted />
              <ReportLineRow
                label={`Add: Adjusted Expense (${cashFlow.adjustedExpensePercentCombined || '0'}% / ${cashFlow.adjustedExpensePercentBorrowerOnly || '0'}%)`}
                combined={fmtOrDash(adjustedExpenseCombined)}
                borrowerOnly={fmtOrDash(adjustedExpenseBorrowerOnly)}
                muted
              />
              <ReportTotalRow label="Total Expenses" combined={fmtOrDash(totalExpensesCombined)} borrowerOnly={fmtOrDash(totalExpensesBorrowerOnly)} />

              <ReportTotalRow label="Income Available for Debt Service" combined={fmtOrDash(incomeAvailableCombined)} borrowerOnly={fmtOrDash(incomeAvailableBorrowerOnly)} />

              <ReportGroupRow label="Other Loans" />
              {cashFlow.otherLoans.length === 0 ? (
                <ReportLineRow label="No other loans recorded" combined="—" borrowerOnly="—" muted />
              ) : (
                cashFlow.otherLoans.map((loan) => (
                  <ReportLineRow
                    key={loan.id}
                    label={loan.lender || 'Other loan'}
                    combined={fmtDash(loan.monthlyAmortizationCombined)}
                    borrowerOnly={fmtDash(loan.monthlyAmortizationBorrowerOnly)}
                  />
                ))
              )}
              <ReportLineRow label="Total of Other Loans" combined={fmtOrDash(totalOtherLoansCombined)} borrowerOnly={fmtOrDash(totalOtherLoansBorrowerOnly)} muted />
              <ReportLineRow label="PGFC Loan – Principal & Interest" combined={fmtNullDash(pgfcAnnualCombined)} borrowerOnly={fmtNullDash(pgfcAnnualBorrowerOnly)} />
              <ReportTotalRow label="Total Loans" combined={fmtOrDash(totalLoansCombined)} borrowerOnly={fmtOrDash(totalLoansBorrowerOnly)} />

              <ReportTotalRow label="Net Income" combined={fmtOrDash(netIncomeCombined)} borrowerOnly={fmtOrDash(netIncomeBorrowerOnly)} />
              <ReportTotalRow label="Debt Service Ratio" combined={fmtPct(dsrCombined)} borrowerOnly={fmtPct(dsrBorrowerOnly)} />
              <ReportLineRow
                label="Percentage of Net Income Over Gross"
                combined={fmtPct(pctNetOverGross(netIncomeCombined, totalIncomeCombined))}
                borrowerOnly={fmtPct(pctNetOverGross(netIncomeBorrowerOnly, totalIncomeBorrowerOnly))}
                muted
              />
            </Box>
          </Box>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 3 }}
        >
          <Box sx={{ flex: 1, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
            <Typography
              sx={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#8891A6',
              }}
            >
              Prepared by
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mt: 1 }}>
              {application.assignedOfficer ?? '—'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Credit Officer · {nowLabel}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
            <Typography
              sx={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#8891A6',
              }}
            >
              Noted by
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mt: 1 }}>—</Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Pending review</Typography>
          </Box>
        </Stack>
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

const reportCellSx = {
  fontSize: 11.5,
  px: 1,
  py: 0.6,
  textAlign: 'right' as const,
  whiteSpace: 'nowrap' as const,
  color: '#3B4256',
};

function FactChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack
      spacing={0.35}
      sx={{
        px: 1.75,
        py: 1,
        minWidth: 0,
        flex: '1 1 128px',
      }}
    >
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

function ReportGroupRow({ label }: { label: string }) {
  return (
    <Box component="tr">
      <Box
        component="td"
        colSpan={3}
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

function ReportLineRow({
  label,
  combined,
  borrowerOnly,
  muted,
}: {
  label: string;
  combined: string;
  borrowerOnly: string;
  muted?: boolean;
}) {
  return (
    <Box component="tr" sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
      <Box
        component="td"
        sx={{
          ...reportCellSx,
          textAlign: 'left',
          color: muted ? '#8891A6' : '#5A6273',
          fontStyle: muted ? 'italic' : 'normal',
          pl: 2,
        }}
      >
        {label}
      </Box>
      <Box component="td" sx={{ ...reportCellSx, color: muted ? '#8891A6' : '#3B4256' }}>{combined}</Box>
      <Box component="td" sx={{ ...reportCellSx, color: muted ? '#8891A6' : '#3B4256' }}>{borrowerOnly}</Box>
    </Box>
  );
}

function ReportTotalRow({
  label,
  combined,
  borrowerOnly,
}: {
  label: string;
  combined: string;
  borrowerOnly: string;
}) {
  return (
    <Box component="tr" sx={{ '&:nth-of-type(even)': { bgcolor: '#FAFBFD' } }}>
      <Box component="td" sx={{ ...reportCellSx, textAlign: 'left', fontWeight: 800, color: '#14172A' }}>
        {label}
      </Box>
      <Box component="td" sx={{ ...reportCellSx, fontWeight: 800, color: '#14172A' }}>{combined}</Box>
      <Box component="td" sx={{ ...reportCellSx, fontWeight: 800, color: '#14172A' }}>{borrowerOnly}</Box>
    </Box>
  );
}

// ----------------------------------------------------------------------
// Thin card on the Financial Evaluation page — Manage opens the full form
// modal, View report opens the read-only results. Matches the Financial
// Summary card's Manage / View pattern.
// ----------------------------------------------------------------------
export function CashFlowStatementCard() {
  const { review } = useAdmin();
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<'manage' | 'view' | null>(null);

  return (
    <Box sx={adminCardSx}>
      <CollapsibleSection
        title="Cash Flow Statement"
        subtitle="Combined / Borrower Only income-expense form computing the Debt Service Ratio. Supporting evidence — not required to proceed."
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        badge={
          review.cashFlowStatement.savedAt ? (
            <StatusBadge tone="success" label="Saved" icon="solar:check-circle-bold" />
          ) : undefined
        }
      >
        <Box
          sx={{
            borderRadius: '13px',
            border: '1px solid #EBEDF3',
            bgcolor: 'common.white',
            p: 2,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1}>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
              Cash Flow Statement
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                onClick={() => setMode('manage')}
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:pen-bold" width={15} />}
                sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
              >
                Manage
              </Button>
              <Button
                onClick={() => setMode('view')}
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
                sx={{ ...outlinedNavyButtonSx, px: 1.5 }}
              >
                View report
              </Button>
            </Stack>
          </Stack>
        </Box>
      </CollapsibleSection>

      <CashFlowStatementModal open={mode === 'manage'} onClose={() => setMode(null)} />
      <CashFlowStatementReport open={mode === 'view'} onClose={() => setMode(null)} />
    </Box>
  );
}
