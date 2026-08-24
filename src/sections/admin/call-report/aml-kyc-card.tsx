'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { cardSx, RadioRow, YES_NO_VERIFY_OPTIONS, PAYMENT_HISTORY_DESCRIPTOR_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 3: AML / KYC Questions. Six declarations retained because
// they are not explicitly captured elsewhere in the application form.
// ----------------------------------------------------------------------

export function AmlKycCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        3. AML / KYC Questions
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Record customer declarations. Positive responses or uncertainty should be routed for
        independent verification under the applicable PGFC AML/KYC policy.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Are you a Politically Exposed Person (PEP) or a close family member?"
          value={callReport.amlIsPep}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlIsPep: value })}
        />
        <RadioRow
          label="Are you an officer, director, shareholder, employee, or related party of PGFC?"
          value={callReport.amlIsPgfcRelatedParty}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlIsPgfcRelatedParty: value })}
        />
        <RadioRow
          label="Do you currently have loans with banks or other financing companies?"
          value={callReport.amlHasExistingLoans}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasExistingLoans: value })}
        />
        <RadioRow
          label="How would you describe your payment history?"
          value={callReport.amlPaymentHistory}
          options={PAYMENT_HISTORY_DESCRIPTOR_OPTIONS}
          onChange={(value) => setCallReport({ amlPaymentHistory: value })}
        />
        <RadioRow
          label="Have you ever issued a check that was returned due to insufficient funds or other reasons?"
          value={callReport.amlHasReturnedChecks}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasReturnedChecks: value })}
        />
        <RadioRow
          label="Do you currently have any Past Due Obligations or unpaid financial obligations?"
          value={callReport.amlHasPastDueObligations}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasPastDueObligations: value })}
        />
      </Stack>
    </Box>
  );
}
