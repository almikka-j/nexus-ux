'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  ELECTRICITY_PAYMENT_OPTIONS,
  CREDIT_CARD_PAYMENT_OPTIONS,
  OTHER_LOAN_REPAYMENT_OPTIONS,
  YES_NO_VERIFY_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

export function PaymentBehaviorCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const showExplanation =
    callReport.hasReturnedChecks === 'yes' ||
    callReport.hasPastDueObligations === 'yes' ||
    callReport.hasPendingCases === 'yes';

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        7. Payment Behavior
      </Typography>
      <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#FEF0D6', mb: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, color: '#B36A05' }}>
          These answers are borrower declarations and are subject to verification.
        </Typography>
      </Box>

      <Stack spacing={2.5}>
        <RadioRow
          label="Electricity Bill Payment"
          value={callReport.electricityPayment}
          options={ELECTRICITY_PAYMENT_OPTIONS}
          onChange={(value) => setCallReport({ electricityPayment: value })}
        />

        <RadioRow
          label="Credit-card Payment"
          value={callReport.creditCardPayment}
          options={CREDIT_CARD_PAYMENT_OPTIONS}
          onChange={(value) => setCallReport({ creditCardPayment: value })}
        />

        <RadioRow
          label="Other Loan Repayment"
          value={callReport.otherLoanRepayment}
          options={OTHER_LOAN_REPAYMENT_OPTIONS}
          onChange={(value) => setCallReport({ otherLoanRepayment: value })}
        />

        <RadioRow
          label="Returned Checks"
          value={callReport.hasReturnedChecks}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ hasReturnedChecks: value })}
        />

        <RadioRow
          label="Past-due Obligations"
          value={callReport.hasPastDueObligations}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ hasPastDueObligations: value })}
        />

        <RadioRow
          label="Pending Financial or Court Cases"
          value={callReport.hasPendingCases}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ hasPendingCases: value })}
        />

        {showExplanation && (
          <TextField
            label="Explanation"
            multiline
            minRows={2}
            value={callReport.paymentBehaviorExplanation}
            onChange={(event) =>
              setCallReport({ paymentBehaviorExplanation: event.target.value })
            }
            sx={fieldSx}
          />
        )}
      </Stack>
    </Box>
  );
}
