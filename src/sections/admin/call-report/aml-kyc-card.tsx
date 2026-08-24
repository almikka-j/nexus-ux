'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useAdmin } from 'src/auth/admin-context';
import type { PaymentHistoryDescriptor, YesNoVerify } from 'src/auth/admin-context';

import { cardSx, Option, YES_NO_VERIFY_OPTIONS, PAYMENT_HISTORY_DESCRIPTOR_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 3: AML / KYC Questions. Six declarations retained because
// they are not explicitly captured elsewhere in the application form.
// Row layout matches Application Validation's ValidationRow: label left,
// control right, divider between rows.
// ----------------------------------------------------------------------

function QuestionRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | '';
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <Box sx={{ py: 1.5, borderBottom: '1px solid #EEF0F5' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
          {label}
        </Typography>
        <RadioGroup
          row
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          sx={{ flexShrink: 0, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
        >
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio size="small" />}
              label={<Typography sx={{ fontSize: 13 }}>{option.label}</Typography>}
            />
          ))}
        </RadioGroup>
      </Stack>
    </Box>
  );
}

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

      <Stack>
        <QuestionRow<YesNoVerify>
          label="Are you a Politically Exposed Person (PEP) or a close family member?"
          value={callReport.amlIsPep}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlIsPep: value })}
        />
        <QuestionRow<YesNoVerify>
          label="Are you an officer, director, shareholder, employee, or related party of PGFC?"
          value={callReport.amlIsPgfcRelatedParty}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlIsPgfcRelatedParty: value })}
        />
        <QuestionRow<YesNoVerify>
          label="Do you currently have loans with banks or other financing companies?"
          value={callReport.amlHasExistingLoans}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasExistingLoans: value })}
        />
        <QuestionRow<PaymentHistoryDescriptor>
          label="How would you describe your payment history?"
          value={callReport.amlPaymentHistory}
          options={PAYMENT_HISTORY_DESCRIPTOR_OPTIONS}
          onChange={(value) => setCallReport({ amlPaymentHistory: value })}
        />
        <QuestionRow<YesNoVerify>
          label="Have you ever issued a check that was returned due to insufficient funds or other reasons?"
          value={callReport.amlHasReturnedChecks}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasReturnedChecks: value })}
        />
        <QuestionRow<YesNoVerify>
          label="Do you currently have any Past Due Obligations or unpaid financial obligations?"
          value={callReport.amlHasPastDueObligations}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasPastDueObligations: value })}
        />
      </Stack>
    </Box>
  );
}
