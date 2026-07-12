'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { OfficerObservationItem } from 'src/auth/admin-context';

import { ChipToggleGroup } from './loan-discussion-card';
import {
  cardSx,
  fieldSx,
  OFFICER_OBSERVATION_POSITIVE_OPTIONS,
  OFFICER_OBSERVATION_ATTENTION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

export function OfficerObservationCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const toggleObservation = (value: OfficerObservationItem) => {
    const has = callReport.officerObservations.includes(value);
    setCallReport({
      officerObservations: has
        ? callReport.officerObservations.filter((item) => item !== value)
        : [...callReport.officerObservations, value],
    });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        8. Officer Observation
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Select everything that applies to how this call went.
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0C8A4F', mb: 1 }}>
            Positive or neutral
          </Typography>
          <ChipToggleGroup
            options={OFFICER_OBSERVATION_POSITIVE_OPTIONS}
            selected={callReport.officerObservations}
            onToggle={toggleObservation}
          />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#B32C22', mb: 1 }}>
            Needs attention
          </Typography>
          <ChipToggleGroup
            options={OFFICER_OBSERVATION_ATTENTION_OPTIONS}
            selected={callReport.officerObservations}
            onToggle={toggleObservation}
          />
        </Box>

        <TextField
          label="Additional Observation Notes"
          multiline
          minRows={2}
          value={callReport.additionalObservationNotes}
          onChange={(event) => setCallReport({ additionalObservationNotes: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
