'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

import { cardSx } from './call-report-types';
import { OfficerNotesDialog, buildOfficerNoteEntry } from '../officer-notes-history';

// ----------------------------------------------------------------------

export function OfficerNotesCard() {
  const { review, adminUser, setCreditChecking } = useAdmin();
  const notes = review.creditChecking.notes;
  const [noteDraft, setNoteDraft] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);

  const handleAddNote = () => {
    const note = noteDraft.trim();
    if (!note) return;

    const officer = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
    const entry = buildOfficerNoteEntry({ officer, process: 'Call Report', note });
    setCreditChecking({ notes: notes ? `${notes}\n\n---\n\n${entry}` : entry });
    setNoteDraft('');
  };

  return (
    <>
      <Box sx={cardSx}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:notes-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              Officer notes
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:notes-bold-duotone" width={16} />}
            onClick={() => setNotesOpen(true)}
            sx={{
              color: '#1C2A6E',
              borderColor: '#C7CEEA',
              borderRadius: '10px',
              px: 1.75,
              fontWeight: 700,
              flexShrink: 0,
              '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
            }}
          >
            View all officer notes
          </Button>
        </Stack>
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
          Add observations from this stage of the application process.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          placeholder="Add a note from the call report review…"
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
        />
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
            disabled={!noteDraft.trim()}
            onClick={handleAddNote}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.25, '&:hover': { bgcolor: '#14205A' } }}
          >
            Add note
          </Button>
        </Stack>
      </Box>

      <OfficerNotesDialog
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        notes={notes}
        process="Call Report"
      />
    </>
  );
}
