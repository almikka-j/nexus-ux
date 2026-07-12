'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import type {
  ClientUnderstandingItem,
  ClientConcernItem,
} from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  LOAN_PURPOSE_CONFIRMATION_OPTIONS,
  REPAYMENT_SOURCE_OPTIONS,
  CLIENT_UNDERSTANDING_OPTIONS,
  CLIENT_CONCERN_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

export function ChipToggleGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Chip
            key={option.value}
            label={option.label}
            onClick={() => onToggle(option.value)}
            variant={isSelected ? 'filled' : 'outlined'}
            sx={{
              borderRadius: '8px',
              fontSize: 13,
              bgcolor: isSelected ? '#1C2A6E' : 'transparent',
              color: isSelected ? 'common.white' : '#3B4256',
              borderColor: '#D2D6E0',
              '&:hover': { bgcolor: isSelected ? '#14205A' : '#F5F7FE' },
            }}
          />
        );
      })}
    </Stack>
  );
}

export function LoanDiscussionCard() {
  const { review, setCallReport } = useAdmin();
  const { application } = useRegistration();
  const { callReport } = review;

  // Default Final Loan Purpose from the borrower's original stated purpose,
  // once, the first time this card sees an empty value — a plain `useEffect`
  // guard rather than a form `defaultValues` prop, since this page has no
  // form library (see Global Constraints).
  useEffect(() => {
    if (!callReport.finalLoanPurpose && application.financialInfo?.loanPurpose) {
      setCallReport({ finalLoanPurpose: application.financialInfo.loanPurpose });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.financialInfo?.loanPurpose]);

  const toggleUnderstanding = (value: ClientUnderstandingItem) => {
    const has = callReport.clientUnderstanding.includes(value);
    setCallReport({
      clientUnderstanding: has
        ? callReport.clientUnderstanding.filter((item) => item !== value)
        : [...callReport.clientUnderstanding, value],
    });
  };

  const toggleConcern = (value: ClientConcernItem) => {
    const has = callReport.clientConcerns.includes(value);
    setCallReport({
      clientConcerns: has
        ? callReport.clientConcerns.filter((item) => item !== value)
        : [...callReport.clientConcerns, value],
    });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        2. Loan Discussion
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Confirm the loan purpose and gauge the client&apos;s understanding and concerns.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Loan Purpose Confirmation"
          value={callReport.loanPurposeConfirmation}
          options={LOAN_PURPOSE_CONFIRMATION_OPTIONS}
          onChange={(value) => setCallReport({ loanPurposeConfirmation: value })}
        />

        <TextField
          label="Final Loan Purpose"
          value={callReport.finalLoanPurpose}
          onChange={(event) => setCallReport({ finalLoanPurpose: event.target.value })}
          sx={fieldSx}
        />

        <TextField
          label="Specific Use of Proceeds"
          value={callReport.specificUseOfProceeds}
          onChange={(event) => setCallReport({ specificUseOfProceeds: event.target.value })}
          sx={fieldSx}
        />

        <TextField
          label="Target Release Date"
          type="date"
          value={callReport.targetReleaseDate}
          onChange={(event) => setCallReport({ targetReleaseDate: event.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />

        <RadioRow
          label="Primary Source of Repayment"
          value={callReport.primaryRepaymentSource}
          options={REPAYMENT_SOURCE_OPTIONS}
          onChange={(value) => setCallReport({ primaryRepaymentSource: value })}
        />

        {callReport.primaryRepaymentSource === 'other' && (
          <TextField
            label="Other Source of Repayment"
            value={callReport.otherRepaymentSource}
            onChange={(event) => setCallReport({ otherRepaymentSource: event.target.value })}
            sx={fieldSx}
          />
        )}

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Client Understanding
          </Typography>
          <ChipToggleGroup
            options={CLIENT_UNDERSTANDING_OPTIONS}
            selected={callReport.clientUnderstanding}
            onToggle={toggleUnderstanding}
          />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Client Concerns
          </Typography>
          <ChipToggleGroup
            options={CLIENT_CONCERN_OPTIONS}
            selected={callReport.clientConcerns}
            onToggle={toggleConcern}
          />
        </Box>

        {callReport.clientConcerns.length > 0 && (
          <TextField
            label="Concern Notes"
            multiline
            minRows={2}
            value={callReport.concernNotes}
            onChange={(event) => setCallReport({ concernNotes: event.target.value })}
            sx={fieldSx}
          />
        )}
      </Stack>
    </Box>
  );
}
