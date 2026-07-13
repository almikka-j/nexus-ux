'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

import { cardSx } from './call-report-types';

// ----------------------------------------------------------------------

export function OfficerNotesCard() {
  const { review } = useAdmin();
  const notes = review.creditChecking.notes;

  if (!notes) return null;

  return (
    <Box sx={cardSx}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:notes-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
          Notes from Initial Credit Checking
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Read-only, carried forward from the credit checking officer.
      </Typography>
      <Typography sx={{ fontSize: 14, color: '#3B4256', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {notes}
      </Typography>
    </Box>
  );
}
