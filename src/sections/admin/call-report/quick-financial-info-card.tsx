'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { SupportingDocItem } from 'src/auth/admin-context';

import { ChipToggleGroup } from './loan-discussion-card';
import {
  computeTotalMonthlyIncome,
  computeTotalMonthlyObligations,
  computeDisposableIncome,
  computeDti,
} from './call-report-computations';
import { cardSx, fieldSx, SUPPORTING_DOC_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function ComputedRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontSize: 13, color: '#667085' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value}</Typography>
    </Stack>
  );
}

export function QuickFinancialInfoCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const totalIncome = computeTotalMonthlyIncome(callReport);
  const totalObligations = computeTotalMonthlyObligations(callReport);
  const disposableIncome = computeDisposableIncome(callReport);
  const dti = computeDti(callReport);

  const toggleDoc = (value: SupportingDocItem) => {
    const has = callReport.supportingDocsAvailable.includes(value);
    setCallReport({
      supportingDocsAvailable: has
        ? callReport.supportingDocsAvailable.filter((item) => item !== value)
        : [...callReport.supportingDocsAvailable, value],
    });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        6. Quick Financial Information
      </Typography>
      <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#FEF0D6', mb: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, color: '#B36A05' }}>
          Declared during the call — subject to document and financial verification.
        </Typography>
      </Box>

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Declared Gross Monthly Income"
            type="number"
            value={callReport.declaredGrossMonthlyIncome}
            onChange={(event) => setCallReport({ declaredGrossMonthlyIncome: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Declared Net Monthly Income"
            type="number"
            value={callReport.declaredNetMonthlyIncome}
            onChange={(event) => setCallReport({ declaredNetMonthlyIncome: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <TextField
          label="Other Recurring Monthly Income"
          type="number"
          value={callReport.otherRecurringMonthlyIncome}
          onChange={(event) => setCallReport({ otherRecurringMonthlyIncome: event.target.value })}
          sx={fieldSx}
        />

        <TextField
          label="Estimated Monthly Household Expenses"
          type="number"
          value={callReport.estimatedMonthlyHouseholdExpenses}
          onChange={(event) =>
            setCallReport({ estimatedMonthlyHouseholdExpenses: event.target.value })
          }
          sx={fieldSx}
        />

        <Stack direction="row" spacing={2}>
          <TextField
            label="Existing Monthly Loan Payments"
            type="number"
            value={callReport.existingMonthlyLoanPayments}
            onChange={(event) => setCallReport({ existingMonthlyLoanPayments: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Monthly Credit-card Payments"
            type="number"
            value={callReport.monthlyCreditCardPayments}
            onChange={(event) => setCallReport({ monthlyCreditCardPayments: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <TextField
          label="Other Recurring Monthly Obligations"
          type="number"
          value={callReport.otherRecurringMonthlyObligations}
          onChange={(event) =>
            setCallReport({ otherRecurringMonthlyObligations: event.target.value })
          }
          sx={fieldSx}
        />

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1} sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC' }}>
          <ComputedRow label="Total Monthly Income" value={formatCurrency(totalIncome)} />
          <ComputedRow label="Total Monthly Obligations" value={formatCurrency(totalObligations)} />
          <ComputedRow
            label="Preliminary Disposable Income"
            value={formatCurrency(disposableIncome)}
          />
          <ComputedRow label="Estimated Debt-to-Income Ratio" value={`${dti.toFixed(1)}%`} />
        </Stack>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Supporting Documents Available
          </Typography>
          <ChipToggleGroup
            options={SUPPORTING_DOC_OPTIONS}
            selected={callReport.supportingDocsAvailable}
            onToggle={toggleDoc}
          />
        </Box>
      </Stack>
    </Box>
  );
}
