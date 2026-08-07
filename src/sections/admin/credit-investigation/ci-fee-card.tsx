'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, outlinedNavyButtonSx, TONE_COLORS, type SemanticTone } from 'src/components/admin-ui';

// ----------------------------------------------------------------------
// CI Fee request/approval gate. Not every application has a CI Fee — the
// officer first decides Yes/No; "No" resolves straight to 'not-applicable'
// and unlocks the CI Report the same as 'approved' does. "Yes" opens a
// form (Request Amount, Request Amount Description, Remarks) before moving
// to 'pending-approval'. There's no real approver role/login in this
// prototype — "Mark CI Fee as Approved" is a simulated second step the
// same officer triggers, same convention as "Force Clean/Negative Bureau
// Finding" elsewhere in the admin app.
// ----------------------------------------------------------------------

// Tone-driven, same TONE_COLORS palette every other status banner/pill in
// the admin app draws from (see admin-tokens.ts) — this card previously
// hand-picked its own hex values per status instead of reusing the shared
// warning/success/info/neutral set.
const STATUS_COPY: Record<
  'not-requested' | 'pending-approval' | 'approved' | 'not-applicable',
  { icon: string; tone: SemanticTone; title: string; body: string }
> = {
  'not-requested': {
    icon: 'solar:wallet-money-bold-duotone',
    tone: 'neutral',
    title: 'CI Fee not yet requested',
    body: 'Does this application have a Credit Investigation fee?',
  },
  'pending-approval': {
    icon: 'solar:hourglass-bold-duotone',
    tone: 'warning',
    title: 'CI Fee awaiting approval',
    body: 'The request has been sent. A different officer must approve it before the CI Report can be prepared — this can’t be self-approved.',
  },
  approved: {
    icon: 'solar:check-circle-bold',
    tone: 'success',
    title: 'CI Fee approved',
    body: 'The CI Report below is now unlocked.',
  },
  'not-applicable': {
    icon: 'solar:forbidden-circle-linear',
    tone: 'info',
    title: 'No CI Fee for this application',
    body: 'No fee was needed for this application. The CI Report below is unlocked either way.',
  },
};

export function CiFeeCard() {
  const { review, setCreditInvestigation } = useAdmin();
  const { ciFeeStatus, ciFeeAmount, ciFeeAmountDescription, ciFeeRemarks } =
    review.creditInvestigation;
  const copy = STATUS_COPY[ciFeeStatus];
  const toneColors = TONE_COLORS[copy.tone];

  const [requestOpen, setRequestOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [remarksDraft, setRemarksDraft] = useState('');
  const hasValidAmount = Number(amountDraft) > 0;

  const openRequestForm = () => {
    setAmountDraft('');
    setDescriptionDraft('');
    setRemarksDraft('');
    setRequestOpen(true);
  };

  const submitRequest = () => {
    if (!hasValidAmount || !descriptionDraft.trim()) return;
    setCreditInvestigation({
      ciFeeStatus: 'pending-approval',
      ciFeeAmount: amountDraft.trim(),
      ciFeeAmountDescription: descriptionDraft.trim(),
      ciFeeRemarks: remarksDraft.trim(),
    });
    setRequestOpen(false);
  };

  return (
    <Box sx={adminCardSx}>
      {/* No separate "CI Fee" title row — copy.title already leads with CI
          Fee context in every status ("CI Fee not yet requested", "CI Fee
          approved", etc.), so a standalone title above it was a redundant
          near-empty line. Full-width tinted status banner instead, same
          visual weight as the AI Recommendation banner above this card on
          the page. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ p: 2, borderRadius: '12px', bgcolor: toneColors.bg }}
      >
        <Iconify icon={copy.icon} width={22} sx={{ color: toneColors.text, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: toneColors.text }}>
            {copy.title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>{copy.body}</Typography>
        </Box>

        {(ciFeeStatus === 'not-requested' || ciFeeStatus === 'not-applicable') && (
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {ciFeeStatus === 'not-requested' && (
              <>
                <Button
                  onClick={openRequestForm}
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="solar:send-square-bold" width={16} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
                >
                  Yes, Request CI Fee
                </Button>
                <Button
                  onClick={() => setCreditInvestigation({ ciFeeStatus: 'not-applicable' })}
                  variant="outlined"
                  size="small"
                  sx={{ ...outlinedNavyButtonSx, px: 2, whiteSpace: 'nowrap', bgcolor: 'common.white' }}
                >
                  No CI Fee
                </Button>
              </>
            )}
            {ciFeeStatus === 'not-applicable' && (
              <Button
                onClick={() => setCreditInvestigation({ ciFeeStatus: 'not-requested' })}
                variant="outlined"
                size="small"
                sx={{ ...outlinedNavyButtonSx, px: 2, whiteSpace: 'nowrap', bgcolor: 'common.white' }}
              >
                Actually, this has a CI Fee
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {ciFeeStatus === 'pending-approval' || ciFeeStatus === 'approved' ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            mt: 1.5,
            p: 2,
            borderRadius: '12px',
            bgcolor: '#F9FAFC',
            border: '1px solid #EEF0F5',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                bgcolor: '#1C2A6E',
              }}
            >
              <Iconify icon="solar:wad-of-money-bold-duotone" width={24} sx={{ color: 'common.white' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>
                REQUEST AMOUNT
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: 21, fontWeight: 800, color: '#1C2A6E' }}>
                {fCurrency(ciFeeAmount)}
              </Typography>
            </Box>
          </Stack>

          <Stack
            spacing={1.25}
            sx={{
              flex: 1,
              minWidth: 0,
              pt: { xs: 1.5, sm: 0 },
              pl: { xs: 0, sm: 2 },
              borderTop: { xs: '1px solid #E7EAF1', sm: 'none' },
              borderLeft: { xs: 'none', sm: '1px solid #E7EAF1' },
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>Description</Typography>
              <Typography sx={{ fontSize: 13, color: '#3B4256', mt: 0.25 }}>{ciFeeAmountDescription}</Typography>
            </Box>
            {ciFeeRemarks && (
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>Remarks</Typography>
                <Typography sx={{ fontSize: 13, color: '#3B4256', mt: 0.25 }}>{ciFeeRemarks}</Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      ) : null}

      <ConfirmDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request CI Fee"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <NumericFormat
              autoFocus
              fullWidth
              customInput={TextField}
              label="Request Amount"
              placeholder="0.00"
              value={amountDraft}
              onValueChange={({ value }) => setAmountDraft(value)}
              thousandSeparator=","
              decimalScale={2}
              allowNegative={false}
              allowLeadingZeros={false}
              valueIsNumericString
              error={amountDraft !== '' && !hasValidAmount}
              helperText={
                amountDraft !== '' && !hasValidAmount
                  ? 'Enter an amount greater than ₱0.00.'
                  : 'Use the exact approved/requested fee amount.'
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1C2A6E' }}>
                      ₱
                    </Typography>
                  </InputAdornment>
                ),
              }}
              inputProps={{ inputMode: 'decimal' }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  bgcolor: 'common.white',
                  fontSize: 16,
                  fontWeight: 700,
                },
                '& .MuiFormHelperText-root': { mx: 0, fontSize: 11.5 },
              }}
            />
            <TextField
              fullWidth
              label="Request Amount Description"
              placeholder="What this amount covers, e.g. Site visit + verification fee"
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Remarks"
              placeholder="Optional notes for this request"
              value={remarksDraft}
              onChange={(event) => setRemarksDraft(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!hasValidAmount || !descriptionDraft.trim()}
            onClick={submitRequest}
            sx={confirmDialogActionToneSx.default}
          >
            Send Request
          </Button>
        }
      />
    </Box>
  );
}
