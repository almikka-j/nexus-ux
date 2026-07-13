'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { buildCallSummary } from './call-report-summary';
import { cardSx, fieldSx } from './call-report-types';

// ----------------------------------------------------------------------

export function CallSummaryCard() {
  const { review, setCallReport } = useAdmin();
  const { signUpData } = useRegistration();
  const { callReport } = review;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const generate = () => {
    setCallReport({
      callSummary: buildCallSummary(callReport, signUpData),
      callSummaryEdited: false,
    });
  };

  const handleRegenerateClick = () => {
    if (callReport.callSummaryEdited) {
      setConfirmOpen(true);
    } else {
      generate();
    }
  };

  const confirmRegenerate = () => {
    generate();
    setConfirmOpen(false);
  };

  return (
    <Box sx={cardSx}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
          Call Summary
        </Typography>
        <Button
          onClick={handleRegenerateClick}
          size="small"
          startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
          sx={{ color: 'text.disabled' }}
        >
          {callReport.callSummary ? 'Regenerate Summary' : 'Generate Summary'}
        </Button>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Generated from the structured answers above — you can edit it directly.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={5}
        placeholder="Click Generate Summary to build this from your answers above…"
        value={callReport.callSummary}
        onChange={(event) =>
          setCallReport({ callSummary: event.target.value, callSummaryEdited: true })
        }
        sx={{ ...fieldSx, mb: 2.5 }}
      />

      <TextField
        fullWidth
        multiline
        minRows={2}
        label="Additional Remarks"
        value={callReport.additionalRemarks}
        onChange={(event) => setCallReport({ additionalRemarks: event.target.value })}
        sx={fieldSx}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Replace edited summary?"
        content="You've made manual edits to this summary. Regenerating will replace your edits with a fresh summary built from the current answers."
        action={
          <Button variant="contained" onClick={confirmRegenerate} sx={{ bgcolor: '#F04438', '&:hover': { bgcolor: '#B32C22' } }}>
            Replace
          </Button>
        }
      />
    </Box>
  );
}
