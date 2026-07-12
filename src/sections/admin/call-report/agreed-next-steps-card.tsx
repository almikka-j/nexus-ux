'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { NextStepItem } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import { ChipToggleGroup } from './loan-discussion-card';
import { cardSx, fieldSx, NEXT_STEP_OPTIONS, RESPONSIBLE_PARTY_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------

export function AgreedNextStepsCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const followUpRequired =
    callReport.callStatus === 'follow-up-needed' ||
    callReport.nextSteps.includes('schedule-follow-up-call');

  const toggleStep = (value: NextStepItem) => {
    const has = callReport.nextSteps.includes(value);
    setCallReport({
      nextSteps: has
        ? callReport.nextSteps.filter((item) => item !== value)
        : [...callReport.nextSteps, value],
    });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        10. Agreed Next Steps
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        What happens after this call.
      </Typography>

      <Stack spacing={2.5}>
        <ChipToggleGroup
          options={NEXT_STEP_OPTIONS}
          selected={callReport.nextSteps}
          onToggle={toggleStep}
        />

        <RadioRow
          label="Responsible Party"
          value={callReport.responsibleParty}
          options={RESPONSIBLE_PARTY_OPTIONS}
          onChange={(value) => setCallReport({ responsibleParty: value })}
        />

        <Stack direction="row" spacing={2}>
          <TextField
            label="Due Date"
            type="date"
            value={callReport.nextStepsDueDate}
            onChange={(event) => setCallReport({ nextStepsDueDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Follow-up Date"
            type="date"
            required={followUpRequired}
            error={followUpRequired && !callReport.followUpDate}
            helperText={
              followUpRequired && !callReport.followUpDate
                ? 'Required — call status is Follow-up Needed or a follow-up call was scheduled.'
                : ' '
            }
            value={callReport.followUpDate}
            onChange={(event) => setCallReport({ followUpDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <TextField
          label="Short Instructions"
          multiline
          minRows={2}
          value={callReport.nextStepsInstructions}
          onChange={(event) => setCallReport({ nextStepsInstructions: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
