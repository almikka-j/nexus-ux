'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { cardSx, fieldSx, RadioRow, ChipToggleGroup, UNDERSTANDING_LEVEL_OPTIONS, LOAN_TERM_ITEM_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 4: Customer Understanding of Loan Terms & Requirements.
// ----------------------------------------------------------------------

export function CustomerUnderstandingCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const toggleTerm = (value: (typeof LOAN_TERM_ITEM_OPTIONS)[number]['value']) => {
    const next = callReport.termsUnderstood.includes(value)
      ? callReport.termsUnderstood.filter((entry) => entry !== value)
      : [...callReport.termsUnderstood, value];
    setCallReport({ termsUnderstood: next });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Customer Understanding of Loan Terms &amp; Requirements
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Confirm that the customer understands and is aware of the loan terms discussed.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Customer Level of Understanding"
          value={callReport.understandingLevel}
          options={UNDERSTANDING_LEVEL_OPTIONS}
          onChange={(value) => setCallReport({ understandingLevel: value })}
        />

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
            Terms and Requirements Understood
          </Typography>
          <ChipToggleGroup options={LOAN_TERM_ITEM_OPTIONS} selected={callReport.termsUnderstood} onToggle={toggleTerm} />
        </Box>

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Concerns / Clarifications"
          value={callReport.concernsClarifications}
          onChange={(event) => setCallReport({ concernsClarifications: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
