'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, type SemanticTone } from 'src/components/admin-ui';

// ----------------------------------------------------------------------
// CI Fee request/approval gate. Not every application has a CI Fee — the
// officer first decides Yes/No; "No" resolves straight to 'not-applicable'
// and unlocks the CI Report the same as 'approved' does. There's no real
// approver role/login in this prototype outside the dedicated CI Fee
// Approval screens (see ci-fee-approval-view.tsx).
//
// Layout and decision flow now mirror Appraisal Fee's own card exactly
// (appraisal-appraiser-bundle-view.tsx's "Appraisal Fee" section) rather
// than this card's own earlier tinted-banner-with-inline-buttons design:
// a compact header row (title + StatusBadge, not a full-width colored
// banner), a one-line summary once a request exists, and a single button
// that opens a Dialog — the Yes/No decision and the amount/description/
// remarks fields all live inside that modal now, not inline on the card
// itself.
// ----------------------------------------------------------------------

const STATUS_BADGE_COPY: Record<
  'not-requested' | 'pending-approval' | 'approved' | 'not-applicable',
  { label: string; tone: SemanticTone }
> = {
  'not-requested': { label: 'Draft', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  'not-applicable': { label: 'No Fee', tone: 'neutral' },
};

// Same selectable-pill Yes/No control as Appraisal Fee's own
// FeeNeededOption (appraisal-appraiser-bundle-view.tsx) — kept in sync
// manually rather than sharing a module, same as every other admin file
// that reimplements this exact shape.
function FeeNeededOption({
  needed,
  selected,
  onSelect,
}: {
  needed: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = needed ? 'Yes' : 'No';

  return (
    <Box
      onClick={onSelect}
      role="button"
      sx={{
        flex: 1,
        p: 1,
        borderRadius: '10px',
        border: '1.5px solid',
        borderColor: selected ? '#1C2A6E' : '#E1E4ED',
        bgcolor: selected ? '#EEF1FE' : 'common.white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: selected ? '#1C2A6E' : '#14172A' }}>
        {label}
      </Typography>
    </Box>
  );
}

export function CiFeeCard() {
  const { review, setCreditInvestigation } = useAdmin();
  const { ciFeeStatus, ciFeeAmount, ciFeeAmountDescription, ciFeeRemarks } =
    review.creditInvestigation;
  const badgeCopy = STATUS_BADGE_COPY[ciFeeStatus];

  // Draft state for the Yes/No + amount/description/remarks decision,
  // same convention as Appraisal Fee's own modal — edits accumulate here
  // and only commit to review.creditInvestigation when the request is
  // sent, so closing the modal without sending discards the draft.
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [needsFeeDraft, setNeedsFeeDraft] = useState<'yes' | 'no' | null>(null);
  const [amountDraft, setAmountDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [remarksDraft, setRemarksDraft] = useState('');
  const hasValidAmount = Number(amountDraft) > 0;

  // Same "editable while not yet decided or reversible" set Appraisal
  // Fee treats as feeEditable ('not-submitted' | 'declined') — CI Fee's
  // equivalent reversible state is 'not-applicable' (an officer who
  // marked "No" can still decide the application actually needs a fee
  // after all), so it stays editable here too rather than becoming a
  // dead end the way this card's old design required a separate
  // "Actually, this has a CI Fee" button to escape.
  const feeEditable = ciFeeStatus === 'not-requested' || ciFeeStatus === 'not-applicable';

  const openFeeModal = () => {
    if (feeEditable) {
      // Yes is the common case, so default a not-yet-decided request to
      // it the moment the modal opens, instead of leaving both options
      // unselected and making the officer click Yes just to confirm
      // what's already the likely answer — same convention Appraisal
      // Fee's own modal uses.
      setNeedsFeeDraft(ciFeeStatus === 'not-applicable' ? 'no' : 'yes');
      setAmountDraft('');
      setDescriptionDraft('');
      setRemarksDraft('');
    }
    setFeeModalOpen(true);
  };

  const canSubmit =
    needsFeeDraft === 'no' || (needsFeeDraft === 'yes' && hasValidAmount && !!descriptionDraft.trim());

  const confirmSendRequest = () => {
    if (!canSubmit) return;
    if (needsFeeDraft === 'no') {
      setCreditInvestigation({ ciFeeStatus: 'not-applicable' });
    } else {
      setCreditInvestigation({
        ciFeeStatus: 'pending-approval',
        ciFeeAmount: amountDraft.trim(),
        ciFeeAmountDescription: descriptionDraft.trim(),
        ciFeeRemarks: remarksDraft.trim(),
      });
    }
    setFeeModalOpen(false);
  };

  return (
    <Box sx={adminCardSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A' }}>
              CI Fee
            </Typography>
            <StatusBadge tone={badgeCopy.tone} label={badgeCopy.label} />
          </Stack>
          {(ciFeeStatus === 'pending-approval' || ciFeeStatus === 'approved') && (
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.5 }}>
              {fCurrency(ciFeeAmount)} requested
            </Typography>
          )}
          {ciFeeStatus === 'not-applicable' && (
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.5 }}>
              No fee needed for this application.
            </Typography>
          )}
        </Box>
        <Button
          onClick={openFeeModal}
          variant={feeEditable ? 'contained' : 'outlined'}
          size="small"
          startIcon={<Iconify icon="solar:wallet-money-bold-duotone" width={16} />}
          sx={
            feeEditable
              ? { bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', flexShrink: 0, '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }
              : { borderRadius: '10px', px: 2, whiteSpace: 'nowrap', flexShrink: 0 }
          }
        >
          {feeEditable ? 'Request CI Fee' : 'View CI Fee'}
        </Button>
      </Stack>

      <Dialog
        open={feeModalOpen}
        onClose={() => setFeeModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>
                CI Fee
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.5 }}>
                {feeEditable
                  ? 'Decide this application’s fee, then send it for approval.'
                  : 'This application’s fee decision.'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setFeeModalOpen(false)} sx={{ mt: -0.5, mr: -0.5 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 0.5, pb: 3 }}>
          {feeEditable ? (
            <Stack spacing={2}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  Does this application need a CI fee?
                </Typography>
                <Stack direction="row" spacing={1.25}>
                  <FeeNeededOption
                    needed
                    selected={needsFeeDraft === 'yes'}
                    onSelect={() => setNeedsFeeDraft('yes')}
                  />
                  <FeeNeededOption
                    needed={false}
                    selected={needsFeeDraft === 'no'}
                    onSelect={() => setNeedsFeeDraft('no')}
                  />
                </Stack>
              </Stack>

              {needsFeeDraft === 'yes' && (
                <Stack spacing={1.75}>
                  <NumericFormat
                    fullWidth
                    size="small"
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
                        : undefined
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1C2A6E' }}>₱</Typography>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ inputMode: 'decimal' }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
                      '& .MuiFormHelperText-root': { mx: 0, fontSize: 11 },
                    }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
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
              )}
            </Stack>
          ) : (
            <Stack spacing={1.25} sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontSize: 13, color: '#5A6273' }}>Request Amount</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1C2A6E' }}>
                  {fCurrency(ciFeeAmount)}
                </Typography>
              </Stack>
              {ciFeeAmountDescription && (
                <Typography sx={{ fontSize: 13, color: '#8891A6' }}>{ciFeeAmountDescription}</Typography>
              )}
              {ciFeeRemarks && (
                <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Remarks: {ciFeeRemarks}</Typography>
              )}
              {ciFeeStatus === 'pending-approval' && (
                <Typography sx={{ fontSize: 11.5, color: '#ADB3C2', pt: 0.5, borderTop: '1px solid #EEF0F5' }}>
                  Awaiting approval from a different officer.
                </Typography>
              )}
              {ciFeeStatus === 'approved' && (
                <Typography sx={{ fontSize: 11.5, color: '#0C8A4F' }}>Approved.</Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        {feeEditable && (
          <Stack direction="row" spacing={1.25} sx={{ p: 3, pt: 2, borderTop: '1px solid #EEF0F5' }}>
            <Button
              onClick={confirmSendRequest}
              disabled={!canSubmit}
              fullWidth
              variant="contained"
              startIcon={<Iconify icon="solar:send-square-bold" width={16} />}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Send Request
            </Button>
          </Stack>
        )}
      </Dialog>
    </Box>
  );
}
