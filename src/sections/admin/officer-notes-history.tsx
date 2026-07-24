'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { useAdmin } from 'src/auth/admin-context';

type OfficerNoteView = {
  officer: string;
  dateTime: string;
  process: string;
  note: string;
};

export function buildOfficerNoteEntry({
  officer,
  process,
  note,
}: {
  officer: string;
  process: string;
  note: string;
}) {
  const dateTime = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Officer: ${officer}\nDate & time: ${dateTime}\nProcess: ${process}\nNote:\n${note.trim()}`;
}

function parseOfficerNotes(value: string): OfficerNoteView[] {
  if (!value.trim()) return [];

  return value.split(/\n\n---\n\n|\n\n(?=[^\n]+ · [^\n]+\n)/).map((entry) => {
    const structuredMatch = entry.match(
      /^Officer: (.*)\nDate & time: (.*)\nProcess: (.*)\nNote:\n([\s\S]*)$/
    );
    if (structuredMatch) {
      return {
        officer: structuredMatch[1],
        dateTime: structuredMatch[2],
        process: structuredMatch[3],
        note: structuredMatch[4],
      };
    }

    const [heading, ...noteLines] = entry.split('\n');
    const legacyHeading = heading.match(/^(.*) · (.*)$/);
    if (legacyHeading && noteLines.length) {
      return {
        officer: legacyHeading[1],
        dateTime: legacyHeading[2],
        process: 'Initial Credit Checking',
        note: noteLines.join('\n'),
      };
    }

    return {
      officer: 'Credit Officer',
      dateTime: 'Date unavailable',
      process: 'Initial Credit Checking',
      note: entry,
    };
  });
}

export function OfficerNotesHistory({ notes }: { notes: string }) {
  if (!notes.trim()) {
    return (
      <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
        No officer notes have been added yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {parseOfficerNotes(notes).map((entry, index) => (
        <Box
          // Existing notes have no stable ID, so their persisted order is the safest key.
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
        >
          <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
              {entry.officer}
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#C7CCDA' }} />
            <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
              {entry.dateTime}
            </Typography>
            <Box
              sx={{
                px: 1,
                py: 0.35,
                borderRadius: '999px',
                bgcolor: '#EEF1FE',
                color: '#3448B0',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {entry.process}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.55, whiteSpace: 'pre-wrap', mt: 1 }}>
            {entry.note}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

// Chat-bubble rendering of parsed officer notes, used only inside
// OfficerNotesDialog's drawer — kept separate from OfficerNotesHistory
// (the boxed-card renderer used standalone in reconsideration-view.tsx)
// since that component's visual style is out of scope here.
function OfficerNotesBubbleList({ notes }: { notes: string }) {
  if (!notes.trim()) {
    return (
      <Typography sx={{ fontSize: 12.5, color: '#B0B6C3', textAlign: 'center', mt: 2 }}>
        No officer notes have been added yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {parseOfficerNotes(notes).map((entry, index) => (
        <Box
          // Existing notes have no stable ID, so their persisted order is the safest key.
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          sx={{
            maxWidth: '90%',
            alignSelf: 'flex-start',
            px: 1.75,
            py: 1.25,
            borderRadius: '4px 14px 14px 14px',
            bgcolor: 'common.white',
            border: '1px solid #E7EAF1',
          }}
        >
          <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 0.75, mb: 0.5 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A' }}>
              {entry.officer}
            </Typography>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: '999px',
                bgcolor: '#EEF1FE',
                color: '#3448B0',
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              {entry.process}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {entry.note}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: '#98A2B3', mt: 0.5 }}>{entry.dateTime}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

export function OfficerNotesDialog({
  open,
  onClose,
  notes,
  process,
}: {
  open: boolean;
  onClose: () => void;
  notes: string;
  process?: string;
}) {
  const { adminUser, setCreditChecking } = useAdmin();
  const [noteDraft, setNoteDraft] = useState('');
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes, open]);

  const handleAddNote = () => {
    const note = noteDraft.trim();
    if (!note || !process) return;

    const officer = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
    const entry = buildOfficerNoteEntry({ officer, process, note });
    setCreditChecking({ notes: notes ? `${notes}\n\n---\n\n${entry}` : entry });
    setNoteDraft('');
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          maxWidth: '100%',
          bgcolor: '#F8F9FC',
        },
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2.5, py: 2, bgcolor: 'common.white' }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                bgcolor: '#EEF1FE',
                color: '#3448B0',
              }}
            >
              <Iconify icon="solar:notes-bold-duotone" width={20} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A' }}>
                All officer notes
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
                Recorded throughout the application process
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close officer notes">
            <Iconify icon="solar:close-circle-bold" width={21} />
          </IconButton>
        </Stack>

        <Divider />

        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2.5 }}>
          <OfficerNotesBubbleList notes={notes} />
          <Box ref={conversationEndRef} />
        </Stack>

        {process && (
          <Box sx={{ p: 2, bgcolor: 'common.white', borderTop: '1px solid #E7EAF1' }}>
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleAddNote();
                  }
                }}
                placeholder={`Add a note for ${process}…`}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: 14 },
                  '& textarea::placeholder': { color: '#98A2B3', opacity: 1 },
                }}
              />
              <IconButton
                onClick={handleAddNote}
                disabled={!noteDraft.trim()}
                aria-label="Add officer note"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '11px',
                  bgcolor: '#1C2A6E',
                  color: 'common.white',
                  '&:hover': { bgcolor: '#14205A' },
                  '&.Mui-disabled': { bgcolor: '#E7EAF1', color: '#98A2B3' },
                }}
              >
                <Iconify icon="solar:plain-2-bold" width={19} />
              </IconButton>
            </Stack>
          </Box>
        )}
      </Stack>
    </Drawer>
  );
}
