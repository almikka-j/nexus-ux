'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import { cardSx, fieldSx, YES_NO_OPTIONS, NEXT_ACTION_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------

export function AgreedNextStepsCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Follow-up and Next Step
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        What happens after this call.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Follow-up Required"
          value={callReport.followUpRequired}
          options={YES_NO_OPTIONS}
          onChange={(value) =>
            setCallReport({
              followUpRequired: value,
              followUpDate: value === 'yes' ? callReport.followUpDate : '',
            })
          }
        />

        {callReport.followUpRequired === 'yes' && (
          <TextField
            label="Follow-up Date"
            type="date"
            required
            error={!callReport.followUpDate}
            helperText={!callReport.followUpDate ? 'Required — follow-up was marked as needed.' : ' '}
            value={callReport.followUpDate}
            onChange={(event) => setCallReport({ followUpDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        )}

        <RadioRow
          label="Next Action"
          value={callReport.nextAction}
          options={NEXT_ACTION_OPTIONS}
          onChange={(value) => setCallReport({ nextAction: value })}
        />

        {callReport.nextAction === 'other' && (
          <TextField
            label="Other Next Action"
            value={callReport.nextActionOther}
            onChange={(event) => setCallReport({ nextActionOther: event.target.value })}
            sx={fieldSx}
          />
        )}

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
