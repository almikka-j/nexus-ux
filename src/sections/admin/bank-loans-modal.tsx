'use client';

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

// ----------------------------------------------------------------------
// Bank Loans sub-tool — inline-editable existing bank / PGFC loan rows plus
// the PGFC Proposed Loan block. Same inline-row pattern as Bank Statement's
// deposits (Add appends an empty row, ✕ removes). Every field persists on
// change. Opened from the Financial Summary card's "Manage" on the Bank
// Loans row.
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

function LoanRowCard({
  row,
  onChange,
  onRemove,
}: {
  row: BankLoanRow;
  onChange: (data: Partial<Omit<BankLoanRow, 'id'>>) => void;
  onRemove: () => void;
}) {
  return (
    <Box sx={{ borderRadius: '12px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD', p: 2 }}>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: -1 }}>
        <IconButton size="small" onClick={onRemove} aria-label="Remove loan row">
          <Iconify icon="mingcute:close-line" width={16} />
        </IconButton>
      </Stack>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <TextInput label="Bank / Financial Institution" value={row.institution} onChange={(v) => onChange({ institution: v })} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextInput label="Facilities" value={row.facility} onChange={(v) => onChange({ facility: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <MoneyInput label="Approved Amount" value={row.approvedAmount} onChange={(v) => onChange({ approvedAmount: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <MoneyInput label="Amount Previous Year" value={row.amountPreviousYear} onChange={(v) => onChange({ amountPreviousYear: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <MoneyInput label="Amount (Outstanding)" value={row.amountOutstanding} onChange={(v) => onChange({ amountOutstanding: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextInput label="Balance Date as of" type="date" value={row.balanceAsOfDate} onChange={(v) => onChange({ balanceAsOfDate: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <MoneyInput label="Projection Amount" value={row.projectionAmount} onChange={(v) => onChange({ projectionAmount: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextInput label="Security" value={row.security} onChange={(v) => onChange({ security: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextInput label="Date Granted" type="date" value={row.dateGranted} onChange={(v) => onChange({ dateGranted: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextInput label="Expiry" type="date" value={row.expiry} onChange={(v) => onChange({ expiry: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextInput label="Term (months)" value={row.term} onChange={(v) => onChange({ term: v })} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <MoneyInput label="Interest Rate" value={row.interestRate} onChange={(v) => onChange({ interestRate: v })} suffix="%" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <MoneyInput label="Principal Paid" value={row.principalPaid} onChange={(v) => onChange({ principalPaid: v })} />
        </Grid>
      </Grid>
    </Box>
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
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
          {title}
        </Typography>
        <Button
          onClick={() => addBankLoanRow(kind)}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={outlinedNavyButtonSx}
        >
          Add {kind === 'bank' ? 'bank loan' : 'PGFC loan'}
        </Button>
      </Stack>
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: '#B0B6C3' }}>No rows added yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <LoanRowCard
              key={row.id}
              row={row}
              onChange={(data) => updateBankLoanRow(kind, row.id, data)}
              onRemove={() => removeBankLoanRow(kind, row.id)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function BankLoansModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { review, setPgfcProposedLoan } = useAdmin();
  const { bankRows, pgfcRows, proposed } = review.bankLoans;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
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
          <Divider />
          <LoanSection title="PGFC Loan Balance" kind="pgfc" rows={pgfcRows} />
          <Divider />
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
              PGFC Proposed Loan
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <MoneyInput label="Projection Amount" value={proposed.projectionAmount} onChange={(v) => setPgfcProposedLoan({ projectionAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MoneyInput label="Interest Rate" value={proposed.interestRate} onChange={(v) => setPgfcProposedLoan({ interestRate: v })} suffix="%" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextInput label="Principal Payment as of Date" type="date" value={proposed.principalPaymentAsOfDate} onChange={(v) => setPgfcProposedLoan({ principalPaymentAsOfDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextInput label="Interest Payment as of Date" type="date" value={proposed.interestPaymentAsOfDate} onChange={(v) => setPgfcProposedLoan({ interestPaymentAsOfDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MoneyInput label="Projected Principal Payment on December" value={proposed.projectedPrincipalPaymentDec} onChange={(v) => setPgfcProposedLoan({ projectedPrincipalPaymentDec: v })} />
              </Grid>
              <Grid item xs={12} sm={6}>
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
