'use client';

import { useRef, useState, useEffect } from 'react';
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
import type { BankLoanKind, BankLoanRow } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------
// Bank Loans sub-tool — inline-editable existing bank / PGFC loan rows plus
// the PGFC Proposed Loan block. Same flat-list pattern as the Financial
// Statement modal's Balance Sheet sub-step: a plain uppercase section
// label above one shared #F9FAFC inset box holding all of that section's
// rows. Each loan collapses to one summary line (Institution — Facility —
// Amount Outstanding) with an edit pencil + red-× remove; the pencil
// expands that line in place into the full field form, so only one card's
// worth of fields is ever rendered per loan, not a permanently-open one.
// Add appends an empty (expanded) row; every field persists on change.
// Opened from the Financial Summary card's "Manage" on the Bank Loans row.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' },
};

function TextInput({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <TextField
        fullWidth
        size="small"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        sx={fieldSx}
      />
    </Stack>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <NumericFormat
        fullWidth
        size="small"
        customInput={TextField}
        placeholder={suffix === '%' ? '0' : '0.00'}
        value={value}
        onValueChange={({ value: next }) => onChange(next)}
        thousandSeparator={suffix === '%' ? undefined : ','}
        decimalScale={2}
        allowNegative={false}
        valueIsNumericString
        InputProps={
          suffix === '%'
            ? { endAdornment: <InputAdornment position="end">%</InputAdornment> }
            : {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.info.solid }}>
                      ₱
                    </Typography>
                  </InputAdornment>
                ),
              }
        }
        sx={fieldSx}
      />
    </Stack>
  );
}

/** The full field form for one loan — rendered only while that loan's
 *  summary line is expanded. PGFC rows skip Institution/Facilities (every
 *  PGFC loan is from PGFC by definition, matching the legacy PGFC form). */
function LoanRowForm({
  row,
  kind,
  onChange,
}: {
  row: BankLoanRow;
  kind: BankLoanKind;
  onChange: (data: Partial<Omit<BankLoanRow, 'id'>>) => void;
}) {
  return (
    <Box sx={{ pt: 1.5 }}>
      <Stack spacing={2}>
        <Grid container spacing={2}>
          {kind === 'bank' && (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <TextInput label="Bank / Financial Institution" value={row.institution} onChange={(v) => onChange({ institution: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextInput label="Facilities" value={row.facility} onChange={(v) => onChange({ facility: v })} />
              </Grid>
            </>
          )}
          <Grid item xs={6} sm={4} md={4}>
            <MoneyInput label="Approved Amount" value={row.approvedAmount} onChange={(v) => onChange({ approvedAmount: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <MoneyInput label="Amount Previous Year" value={row.amountPreviousYear} onChange={(v) => onChange({ amountPreviousYear: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <MoneyInput label="Amount (Outstanding)" value={row.amountOutstanding} onChange={(v) => onChange({ amountOutstanding: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <TextInput label="Balance Date as of" type="date" value={row.balanceAsOfDate} onChange={(v) => onChange({ balanceAsOfDate: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <MoneyInput label="Projection Amount" value={row.projectionAmount} onChange={(v) => onChange({ projectionAmount: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <TextInput label="Security" value={row.security} onChange={(v) => onChange({ security: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <TextInput label="Date Granted" type="date" value={row.dateGranted} onChange={(v) => onChange({ dateGranted: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <TextInput label="Expiry" type="date" value={row.expiry} onChange={(v) => onChange({ expiry: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <TextInput label="Term (months)" value={row.term} onChange={(v) => onChange({ term: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <MoneyInput label="Interest Rate" value={row.interestRate} onChange={(v) => onChange({ interestRate: v })} suffix="%" />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <MoneyInput label="Principal Paid" value={row.principalPaid} onChange={(v) => onChange({ principalPaid: v })} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextInput label="Payment Handling" value={row.paymentHandling} onChange={(v) => onChange({ paymentHandling: v })} />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <MoneyInput
              label="Principal Amortization per Month"
              value={row.principalAmortizationPerMonth}
              onChange={(v) => onChange({ principalAmortizationPerMonth: v })}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={4}>
            <MoneyInput
              label="Interest Amortization per Month"
              value={row.interestAmortizationPerMonth}
              onChange={(v) => onChange({ interestAmortizationPerMonth: v })}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Stack spacing={1}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8891A6' }}>
                Payment as of Date
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <MoneyInput label="Principal Payment" value={row.principalPaymentAsOf} onChange={(v) => onChange({ principalPaymentAsOf: v })} />
                </Grid>
                <Grid item xs={6}>
                  <MoneyInput label="Interest" value={row.interestPaymentAsOf} onChange={(v) => onChange({ interestPaymentAsOf: v })} />
                </Grid>
              </Grid>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Stack spacing={1}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8891A6' }}>
                Payment Projected
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <MoneyInput
                    label="Principal Payment"
                    value={row.projectedPrincipalPaymentDec}
                    onChange={(v) => onChange({ projectedPrincipalPaymentDec: v })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <MoneyInput
                    label="Interest December"
                    value={row.projectedInterestDec}
                    onChange={(v) => onChange({ projectedInterestDec: v })}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

/** One loan's summary line — Institution — Facility — Amount Outstanding
 *  (PGFC rows have no Institution/Facility, so they fall back to
 *  "PGFC Loan") — plus an edit pencil (toggles the full form open) and a
 *  remove ×. */
function LoanSummaryLine({
  row,
  kind,
  expanded,
  onToggle,
  onRemove,
}: {
  row: BankLoanRow;
  kind: BankLoanKind;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const summary =
    [row.institution, row.facility].filter(Boolean).join(' — ') ||
    (kind === 'pgfc' ? 'PGFC Loan' : 'Untitled loan');
  const amount = row.amountOutstanding ? fCurrency(Number(row.amountOutstanding)) : null;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#14172A' }} noWrap>
        {summary}
      </Typography>
      {amount && (
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3B4256', flexShrink: 0 }}>
          {amount}
        </Typography>
      )}
      <IconButton
        size="small"
        onClick={onToggle}
        aria-label={expanded ? 'Collapse loan details' : 'Edit loan details'}
        sx={{ flexShrink: 0 }}
      >
        <Iconify
          icon={expanded ? 'solar:alt-arrow-up-bold' : 'solar:pen-bold'}
          width={15}
          sx={{ color: TONE_COLORS.info.solid }}
        />
      </IconButton>
      <IconButton size="small" onClick={onRemove} aria-label="Remove loan row" sx={{ flexShrink: 0 }}>
        <Iconify icon="mingcute:close-line" width={15} sx={{ color: TONE_COLORS.error.solid }} />
      </IconButton>
    </Stack>
  );
}

function LoanSection({
  title,
  kind,
  rows,
}: {
  title: string;
  kind: BankLoanKind;
  rows: BankLoanRow[];
}) {
  const { addBankLoanRow, updateBankLoanRow, removeBankLoanRow } = useAdmin();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const prevCountRef = useRef(rows.length);
  useEffect(() => {
    if (rows.length > prevCountRef.current) {
      const lastId = rows[rows.length - 1].id;
      setExpandedIds((prev) => new Set(prev).add(lastId));
    }
    prevCountRef.current = rows.length;
  }, [rows]);

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
        {title}
      </Typography>
      <Box sx={{ bgcolor: '#F9FAFC', border: '1px solid #EEF0F5', borderRadius: '11px', p: 1.5 }}>
        <Stack spacing={1.25}>
          {rows.length === 0 ? (
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
              No {title.toLowerCase()} recorded yet.
            </Box>
          ) : (
            rows.map((row, index) => (
              <Box key={row.id}>
                {index > 0 && <Divider sx={{ borderColor: '#EEF0F5', mb: 1.25 }} />}
                <LoanSummaryLine
                  row={row}
                  kind={kind}
                  expanded={expandedIds.has(row.id)}
                  onToggle={() => toggle(row.id)}
                  onRemove={() => removeBankLoanRow(kind, row.id)}
                />
                {expandedIds.has(row.id) && (
                  <LoanRowForm row={row} kind={kind} onChange={(data) => updateBankLoanRow(kind, row.id, data)} />
                )}
              </Box>
            ))
          )}
        </Stack>
      </Box>
      <Button
        onClick={() => addBankLoanRow(kind)}
        variant="outlined"
        size="small"
        startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
        sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-end' }}
      >
        Add {kind === 'bank' ? 'Bank Loan' : 'PGFC Loan'}
      </Button>
    </Stack>
  );
}

export function BankLoansModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { review, setPgfcProposedLoan } = useAdmin();
  const { bankRows, pgfcRows, proposed } = review.bankLoans;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>Bank Loans</Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Existing bank / PGFC loan balances &amp; the PGFC proposed loan
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close Bank Loans">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <LoanSection title="Bank Loans" kind="bank" rows={bankRows} />
          <LoanSection title="PGFC Loan Balance" kind="pgfc" rows={pgfcRows} />
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
              PGFC Proposed Loan
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={3}>
                <MoneyInput label="Projection Amount" value={proposed.projectionAmount} onChange={(v) => setPgfcProposedLoan({ projectionAmount: v })} />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <MoneyInput label="Interest Rate" value={proposed.interestRate} onChange={(v) => setPgfcProposedLoan({ interestRate: v })} suffix="%" />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <TextInput label="Principal Payment as of Date" type="date" value={proposed.principalPaymentAsOfDate} onChange={(v) => setPgfcProposedLoan({ principalPaymentAsOfDate: v })} />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <TextInput label="Interest Payment as of Date" type="date" value={proposed.interestPaymentAsOfDate} onChange={(v) => setPgfcProposedLoan({ interestPaymentAsOfDate: v })} />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <MoneyInput label="Projected Principal Payment on December" value={proposed.projectedPrincipalPaymentDec} onChange={(v) => setPgfcProposedLoan({ projectedPrincipalPaymentDec: v })} />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <MoneyInput label="Projected Interest on December" value={proposed.projectedInterestDec} onChange={(v) => setPgfcProposedLoan({ projectedInterestDec: v })} />
              </Grid>
            </Grid>
          </Stack>
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
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
