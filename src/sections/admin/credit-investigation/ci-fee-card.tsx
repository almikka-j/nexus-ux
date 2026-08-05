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
import { adminCardSx } from 'src/components/admin-ui';

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

const STATUS_COPY: Record<
  'not-requested' | 'pending-approval' | 'approved' | 'not-applicable',
  { icon: string; iconColor: string; bg: string; title: string; body: string }
> = {
  'not-requested': {
    icon: 'solar:wallet-money-bold-duotone',
    iconColor: '#8891A6',
    bg: '#F9FAFC',
    title: 'CI Fee not yet requested',
    body: 'Does this application have a Credit Investigation fee?',
  },
  'pending-approval': {
    icon: 'solar:hourglass-bold-duotone',
    iconColor: '#B36A05',
    bg: '#FEF0D6',
    title: 'Waiting on another officer to approve',
    body: 'The CI Fee request has been sent. A different officer must approve it before the CI Report can be prepared — this can’t be self-approved.',
  },
  approved: {
    icon: 'solar:check-circle-bold',
    iconColor: '#0C8A4F',
    bg: '#E7F8F0',
    title: 'CI Fee approved',
    body: 'The CI Report below is now unlocked.',
  },
  'not-applicable': {
    icon: 'solar:forbidden-circle-linear',
    iconColor: '#3448B0',
    bg: '#EEF1FE',
    title: 'No CI Fee for this application',
    body: 'No fee was needed for this application. The CI Report below is unlocked either way.',
  },
};

export function CiFeeCard() {
  const { review, setCreditInvestigation } = useAdmin();
  const { ciFeeStatus, ciFeeAmount, ciFeeAmountDescription, ciFeeRemarks } =
    review.creditInvestigation;
  const copy = STATUS_COPY[ciFeeStatus];

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
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:wallet-money-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Fee</Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        The Credit Investigation fee must be requested and approved before the CI Report can be
        prepared.
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ p: 2, borderRadius: '11px', bgcolor: copy.bg }}
      >
        <Iconify icon={copy.icon} width={22} sx={{ color: copy.iconColor, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: copy.iconColor }}>
            {copy.title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>{copy.body}</Typography>
        </Box>
      </Stack>

      {ciFeeStatus === 'pending-approval' || ciFeeStatus === 'approved' ? (
        <Stack
          spacing={1.5}
          sx={{
            mt: 2,
            p: 2,
            borderRadius: '12px',
            bgcolor: '#F9FAFC',
            border: '1px solid #EEF0F5',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ pb: 1.5, borderBottom: '1px solid #E7EAF1' }}
          >
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>
                REQUEST AMOUNT
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: 21, fontWeight: 800, color: '#1C2A6E' }}>
                {fCurrency(ciFeeAmount)}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 38,
                height: 38,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                color: '#1C2A6E',
                bgcolor: '#E9EDFF',
              }}
            >
              <Iconify icon="solar:wad-of-money-bold-duotone" width={22} />
            </Box>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Description</Typography>
            <Typography sx={{ fontSize: 12.5, color: '#3B4256', textAlign: 'right', maxWidth: '65%' }}>
              {ciFeeAmountDescription}
            </Typography>
          </Stack>
          {ciFeeRemarks && (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Remarks</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#3B4256', textAlign: 'right', maxWidth: '65%' }}>
                {ciFeeRemarks}
              </Typography>
            </Stack>
          )}
        </Stack>
      ) : null}

      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
        {ciFeeStatus === 'not-requested' && (
          <>
            <Button
              onClick={openRequestForm}
              variant="contained"
              startIcon={<Iconify icon="solar:send-square-bold" width={18} />}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
            >
              Yes, Request CI Fee
            </Button>
            <Button
              onClick={() => setCreditInvestigation({ ciFeeStatus: 'not-applicable' })}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
            >
              No CI Fee
            </Button>
          </>
        )}
        {ciFeeStatus === 'not-applicable' && (
          <Button
            onClick={() => setCreditInvestigation({ ciFeeStatus: 'not-requested' })}
            variant="outlined"
            startIcon={<Iconify icon="solar:pen-2-bold-duotone" width={18} />}
            sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
          >
            Actually, this has a CI Fee
          </Button>
        )}
      </Stack>

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
