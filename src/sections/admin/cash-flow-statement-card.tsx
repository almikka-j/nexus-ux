'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
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
// the reference spreadsheet layout it was speced from: label-above-field
// (bureau-reports-card.tsx's Field convention) instead of label-beside-
// field, ₱-prefixed currency inputs (ci-fee-card.tsx's Request Amount
// convention) instead of bare placeholders, StatusBadge pills for
// result-like totals, TONE_COLORS instead of hardcoded hex, and the same
// gray-uppercase-letterspaced sub-section label style Requirement
// Checklist's subgroups use ("Loan Credit Checking Documents") instead of
// a solid navy banner.
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

function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
      {children}
    </Typography>
  );
}

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

function CurrencyField({
  label,
  required,
  value,
  onValueChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>
        {label}
        {required && <Box component="span" sx={{ color: TONE_COLORS.error.solid }}> *</Box>}
      </Typography>
      <NumericFormat
        fullWidth
        size="small"
        customInput={TextField}
        placeholder="0.00"
        value={value}
        onValueChange={({ value: next }) => onValueChange(next)}
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

function PercentField({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <NumericFormat
        fullWidth
        size="small"
        customInput={TextField}
        placeholder="0"
        value={value}
        onValueChange={({ value: next }) => onValueChange(next)}
        decimalScale={2}
        allowNegative={false}
        valueIsNumericString
        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
        sx={fieldSx}
      />
    </Stack>
  );
}

function IntegerField({
  label,
  required,
  value,
  onValueChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256' }}>
        {label}
        {required && <Box component="span" sx={{ color: TONE_COLORS.error.solid }}> *</Box>}
      </Typography>
      <NumericFormat
        fullWidth
        size="small"
        customInput={TextField}
        placeholder="0"
        value={value}
        onValueChange={({ value: next }) => onValueChange(next)}
        decimalScale={0}
        allowNegative={false}
        valueIsNumericString
        sx={fieldSx}
      />
    </Stack>
  );
}

function ColumnHeaders() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <SubsectionLabel>Combined</SubsectionLabel>
      </Grid>
      <Grid item xs={12} sm={6}>
        <SubsectionLabel>Borrower Only</SubsectionLabel>
      </Grid>
    </Grid>
  );
}

function TotalRow({ label, combined, borrowerOnly }: { label: string; combined: string; borrowerOnly: string }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ py: 0.5 }}>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{label}</Typography>
      <Stack direction="row" spacing={1.5}>
        <StatusBadge tone="info" label={combined} />
        <StatusBadge tone="info" label={borrowerOnly} />
      </Stack>
    </Stack>
  );
}

function SubtotalRow({ label, combined, borrowerOnly }: { label: string; combined: string; borrowerOnly: string }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ py: 0.25 }}>
      <Typography sx={{ fontSize: 13, color: '#5A6273' }}>{label}</Typography>
      <Stack direction="row" spacing={1.5}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#3B4256', minWidth: 96, textAlign: 'right' }}>
          {combined}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#3B4256', minWidth: 96, textAlign: 'right' }}>
          {borrowerOnly}
        </Typography>
      </Stack>
    </Stack>
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
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

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#8891A6', mb: 0.5 }}>Borrower&apos;s Name</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{applicantName}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#8891A6', mb: 0.5 }}>Amount of Loan</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                {loanAmount !== null ? fCurrency(loanAmount) : '—'}
              </Typography>
            </Grid>
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

          <Divider />

          <Stack spacing={2}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Personal Income &amp; Expenses</Typography>

            <SubsectionLabel>Source of Income</SubsectionLabel>
            <ColumnHeaders />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Fixed Income"
                  required
                  value={cashFlow.fixedIncomeCombined}
                  onValueChange={(value) => patch({ fixedIncomeCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Fixed Income"
                  required
                  value={cashFlow.fixedIncomeBorrowerOnly}
                  onValueChange={(value) => patch({ fixedIncomeBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Variable Income"
                  value={cashFlow.variableIncomeCombined}
                  onValueChange={(value) => patch({ variableIncomeCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Variable Income"
                  value={cashFlow.variableIncomeBorrowerOnly}
                  onValueChange={(value) => patch({ variableIncomeBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Other Income (Spouse Income/Profit Sharing)"
                  value={cashFlow.otherIncomeCombined}
                  onValueChange={(value) => patch({ otherIncomeCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Other Income (Spouse Income/Profit Sharing)"
                  value={cashFlow.otherIncomeBorrowerOnly}
                  onValueChange={(value) => patch({ otherIncomeBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Less: Deductions"
                  value={cashFlow.lessDeductionsCombined}
                  onValueChange={(value) => patch({ lessDeductionsCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Less: Deductions"
                  value={cashFlow.lessDeductionsBorrowerOnly}
                  onValueChange={(value) => patch({ lessDeductionsBorrowerOnly: value })}
                />
              </Grid>
            </Grid>

            <TotalRow label="Total Income" combined={fmt(totalIncomeCombined)} borrowerOnly={fmt(totalIncomeBorrowerOnly)} />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <SubsectionLabel>Less Expenses</SubsectionLabel>
            <ColumnHeaders />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Fixed Expense"
                  required
                  value={cashFlow.fixedExpenseCombined}
                  onValueChange={(value) => patch({ fixedExpenseCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Fixed Expense"
                  required
                  value={cashFlow.fixedExpenseBorrowerOnly}
                  onValueChange={(value) => patch({ fixedExpenseBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Utilities"
                  value={cashFlow.utilitiesCombined}
                  onValueChange={(value) => patch({ utilitiesCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Utilities"
                  value={cashFlow.utilitiesBorrowerOnly}
                  onValueChange={(value) => patch({ utilitiesBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Transport"
                  value={cashFlow.transportCombined}
                  onValueChange={(value) => patch({ transportCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Transport"
                  value={cashFlow.transportBorrowerOnly}
                  onValueChange={(value) => patch({ transportBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Other Expense"
                  value={cashFlow.otherExpenseCombined}
                  onValueChange={(value) => patch({ otherExpenseCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Other Expense"
                  value={cashFlow.otherExpenseBorrowerOnly}
                  onValueChange={(value) => patch({ otherExpenseBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Miscellaneous Expenses"
                  value={cashFlow.miscExpensesCombined}
                  onValueChange={(value) => patch({ miscExpensesCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Miscellaneous Expenses"
                  value={cashFlow.miscExpensesBorrowerOnly}
                  onValueChange={(value) => patch({ miscExpensesBorrowerOnly: value })}
                />
              </Grid>
            </Grid>

            <SubtotalRow label="Sub-total" combined={fmt(subtotalCombined)} borrowerOnly={fmt(subtotalBorrowerOnly)} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <PercentField
                  label="Add: Adjusted Expense Percent"
                  value={cashFlow.adjustedExpensePercentCombined}
                  onValueChange={(value) => patch({ adjustedExpensePercentCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PercentField
                  label="Add: Adjusted Expense Percent"
                  value={cashFlow.adjustedExpensePercentBorrowerOnly}
                  onValueChange={(value) => patch({ adjustedExpensePercentBorrowerOnly: value })}
                />
              </Grid>
            </Grid>

            <SubtotalRow
              label="Add: Adjusted Expense Amount"
              combined={fmt(adjustedExpenseAmountCombined)}
              borrowerOnly={fmt(adjustedExpenseAmountBorrowerOnly)}
            />
            <TotalRow label="Total Expenses" combined={fmt(totalExpensesCombined)} borrowerOnly={fmt(totalExpensesBorrowerOnly)} />
            <TotalRow
              label="Income Available for Debt Service"
              combined={fmt(incomeAvailableCombined)}
              borrowerOnly={fmt(incomeAvailableBorrowerOnly)}
            />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Other Loans</Typography>
              <Button
                onClick={addCashFlowOtherLoan}
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
                sx={outlinedNavyButtonSx}
              >
                Add Other Loan
              </Button>
            </Stack>

            {cashFlow.otherLoans.length > 0 && (
              <Stack spacing={2}>
                {cashFlow.otherLoans.map((loan) => (
                  <Grid container spacing={2} alignItems="flex-end" key={loan.id}>
                    <Grid item xs={12} sm={4}>
                      <Field
                        label="Lender"
                        placeholder="e.g. Another Bank"
                        value={loan.lender}
                        onChange={(event) => updateCashFlowOtherLoan(loan.id, { lender: event.target.value })}
                      />
                    </Grid>
                    <Grid item xs={5} sm={3.5}>
                      <CurrencyField
                        label="Monthly Amortization (Combined)"
                        value={loan.monthlyAmortizationCombined}
                        onValueChange={(value) => updateCashFlowOtherLoan(loan.id, { monthlyAmortizationCombined: value })}
                      />
                    </Grid>
                    <Grid item xs={5} sm={3.5}>
                      <CurrencyField
                        label="Monthly Amortization (Borrower Only)"
                        value={loan.monthlyAmortizationBorrowerOnly}
                        onValueChange={(value) =>
                          updateCashFlowOtherLoan(loan.id, { monthlyAmortizationBorrowerOnly: value })
                        }
                      />
                    </Grid>
                    <Grid item xs={2} sm={1}>
                      <IconButton size="small" onClick={() => removeCashFlowOtherLoan(loan.id)}>
                        <Iconify icon="mingcute:close-line" width={16} />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </Stack>
            )}

            <TotalRow
              label="Total of Other Loans"
              combined={fmt(totalOtherLoansCombined)}
              borrowerOnly={fmt(totalOtherLoansBorrowerOnly)}
            />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Proposed Amount</Typography>
            <ColumnHeaders />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Principal"
                  required
                  value={cashFlow.principalCombined}
                  onValueChange={(value) => patch({ principalCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CurrencyField
                  label="Principal"
                  required
                  value={cashFlow.principalBorrowerOnly}
                  onValueChange={(value) => patch({ principalBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PercentField
                  label="Interest Rate (annual) *"
                  value={cashFlow.interestRateCombined}
                  onValueChange={(value) => patch({ interestRateCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PercentField
                  label="Interest Rate (annual) *"
                  value={cashFlow.interestRateBorrowerOnly}
                  onValueChange={(value) => patch({ interestRateBorrowerOnly: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <IntegerField
                  label="Term (months)"
                  required
                  value={cashFlow.termCombined}
                  onValueChange={(value) => patch({ termCombined: value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <IntegerField
                  label="Term (months)"
                  required
                  value={cashFlow.termBorrowerOnly}
                  onValueChange={(value) => patch({ termBorrowerOnly: value })}
                />
              </Grid>
            </Grid>

            <SubtotalRow
              label="Monthly Amortization"
              combined={fmtOrBlank(monthlyAmortizationCombined)}
              borrowerOnly={fmtOrBlank(monthlyAmortizationBorrowerOnly)}
            />
            <SubtotalRow
              label="Principal & Interest"
              combined={fmtOrBlank(monthlyAmortizationCombined)}
              borrowerOnly={fmtOrBlank(monthlyAmortizationBorrowerOnly)}
            />
            <TotalRow label="Net Income" combined={fmt(netIncomeCombined)} borrowerOnly={fmt(netIncomeBorrowerOnly)} />
            <TotalRow
              label="Debt Service Ratio"
              combined={fmtPercent(debtServiceRatioCombined)}
              borrowerOnly={fmtPercent(debtServiceRatioBorrowerOnly)}
            />
          </Stack>
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

  const fmt = (value: number) => fCurrency(value) || '₱0.00';
  const fmtOrBlank = (value: number | null) => (value === null ? '—' : fCurrency(value) || '₱0.00');
  const fmtPercent = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}%`);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
              Cash Flow Statement Report
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              {applicantName}
              {loanAmount !== null ? ` · Loan ${fCurrency(loanAmount)}` : ''}
              {` · ${COMPUTATION_TYPE_LABELS[cashFlow.computationType]}`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close Cash Flow Statement Report">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={1}>
          <ColumnHeaders />
          <TotalRow label="Total Income" combined={fmt(totalIncomeCombined)} borrowerOnly={fmt(totalIncomeBorrowerOnly)} />
          <SubtotalRow label="Sub-total Expenses" combined={fmt(subtotalCombined)} borrowerOnly={fmt(subtotalBorrowerOnly)} />
          <TotalRow label="Total Expenses" combined={fmt(totalExpensesCombined)} borrowerOnly={fmt(totalExpensesBorrowerOnly)} />
          <TotalRow
            label="Income Available for Debt Service"
            combined={fmt(incomeAvailableCombined)}
            borrowerOnly={fmt(incomeAvailableBorrowerOnly)}
          />
          <SubtotalRow
            label="Total of Other Loans"
            combined={fmt(totalOtherLoansCombined)}
            borrowerOnly={fmt(totalOtherLoansBorrowerOnly)}
          />
          <SubtotalRow
            label="Monthly Amortization"
            combined={fmtOrBlank(monthlyAmortizationCombined)}
            borrowerOnly={fmtOrBlank(monthlyAmortizationBorrowerOnly)}
          />
          <TotalRow label="Net Income" combined={fmt(netIncomeCombined)} borrowerOnly={fmt(netIncomeBorrowerOnly)} />
          <TotalRow
            label="Debt Service Ratio"
            combined={fmtPercent(dsrCombined)}
            borrowerOnly={fmtPercent(dsrBorrowerOnly)}
          />
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
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
                Cash Flow Statement
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.25 }}>
                Combined / Borrower Only income-expense form computing Debt Service Ratio.
              </Typography>
            </Box>
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
