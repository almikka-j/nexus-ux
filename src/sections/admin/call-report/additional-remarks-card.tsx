'use client';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { cardSx, fieldSx } from './call-report-types';

// ----------------------------------------------------------------------

export function AdditionalRemarksCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        13. Additional Remarks
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Anything else worth noting that isn&apos;t covered above.
      </Typography>

      <TextField
        label="Additional Remarks"
        multiline
        minRows={3}
        value={callReport.additionalRemarks}
        onChange={(event) => setCallReport({ additionalRemarks: event.target.value })}
        sx={fieldSx}
      />
    </Box>
  );
}
