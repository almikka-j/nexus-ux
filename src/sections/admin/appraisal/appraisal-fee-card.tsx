'use client';

import { useMemo, useState } from 'react';
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

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

// ----------------------------------------------------------------------
// Appraisal Fee request/approval gate — same shape as CI Fee
// (ci-fee-card.tsx): the officer decides Yes/No first; "No" resolves
// straight to 'not-applicable'. "Yes" opens a request form before moving
// to 'pending-approval'. There's no real approver role in this prototype,
// so approval/decline is simulated via a page action this card registers
// itself, same convention as CI Fee's inline "Simulate: Another Officer
// Approves/Declines CI Fee" actions.
//
// Once approved (or not-applicable), "Advise Client to Settle" simulates
// three things at once, matching the source diagram's swimlanes: a client
// email notification, a request sent to Odoo, and a Sendit payment link —
// none of which are real integrations. `clientNotifiedAt`/`sentToOdooAt`
// are set together; `paymentReceivedAt` is set later by a separate
// simulated "payment received" page action, gating the Appraiser
// Assignment card below.
// ----------------------------------------------------------------------

const STATUS_COPY: Record<
  'not-requested' | 'pending-approval' | 'approved' | 'not-applicable',
  { icon: string; tone: SemanticTone; title: string; body: string }
> = {
  'not-requested': {
    icon: 'solar:wallet-money-bold-duotone',
    tone: 'neutral',
    title: 'Appraisal Fee not yet requested',
    body: 'Does this application need an Appraisal fee?',
  },
  'pending-approval': {
    icon: 'solar:hourglass-bold-duotone',
    tone: 'warning',
    title: 'Appraisal Fee awaiting approval',
    body: 'The request has been sent. A different officer must approve it before appraiser assignment can proceed.',
  },
  approved: {
    icon: 'solar:check-circle-bold',
    tone: 'success',
    title: 'Appraisal Fee approved',
    body: 'Advise the client to settle the fee to unlock appraiser assignment below.',
  },
  'not-applicable': {
    icon: 'solar:forbidden-circle-linear',
    tone: 'info',
    title: 'No Appraisal Fee for this application',
    body: 'No fee was needed. Appraiser assignment below is unlocked.',
  },
};

export function AppraisalFeeCard() {
  const { review, setAppraisal } = useAdmin();
  const {
    feeStatus,
    feeAmount,
    feeDescription,
    feeRemarks,
    clientNotifiedAt,
    paymentReceivedAt,
  } = review.appraisal;
  // feeStatus is narrowed to the 4 renderable states here — see the note
  // above STATUS_COPY: 'declined' is never actually observed because
  // confirmFeeDecline() below resets straight back to 'not-requested' in
  // the same action.
  const copy = STATUS_COPY[feeStatus as 'not-requested' | 'pending-approval' | 'approved' | 'not-applicable'];
  const toneColors = TONE_COLORS[copy.tone];

  const [requestOpen, setRequestOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [remarksDraft, setRemarksDraft] = useState('');
  const hasValidAmount = Number(amountDraft) > 0;

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReasonDraft, setDeclineReasonDraft] = useState('');

  const confirmFeeDecline = () => {
    if (!declineReasonDraft.trim()) return;
    setAppraisal({
      feeStatus: 'not-requested',
      feeAmount: '',
      feeDescription: '',
      feeRemarks: '',
      feeDeclineReason: declineReasonDraft.trim(),
    });
    setDeclineOpen(false);
    setDeclineReasonDraft('');
  };

  // Simulated second-officer approval/decline, same convention as
  // credit-investigation-view.tsx's CI Fee page actions — registered here
  // (not in appraisal-view.tsx) so this card owns its entire fee lifecycle
  // in one file, the same way CiFeeCard would if it registered its own
  // page actions instead of credit-investigation-view.tsx doing it for it.
  useRegisterPageActions(
    useMemo(
      () =>
        feeStatus === 'pending-approval'
          ? [
              {
                key: 'simulate-appraisal-fee-approval',
                label: 'Simulate: Another Officer Approves Appraisal Fee',
                icon: 'solar:user-check-bold-duotone',
                color: '#0C8A4F',
                onClick: () => setAppraisal({ feeStatus: 'approved' }),
              },
              {
                key: 'simulate-appraisal-fee-decline',
                label: 'Simulate: Another Officer Declines Appraisal Fee',
                icon: 'solar:user-cross-bold-duotone',
                color: '#B32C22',
                onClick: () => setDeclineOpen(true),
              },
            ]
          : [],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [feeStatus]
    )
  );

  const openRequestForm = () => {
    setAmountDraft('');
    setDescriptionDraft('');
    setRemarksDraft('');
    setRequestOpen(true);
  };

  const submitRequest = () => {
    if (!hasValidAmount || !descriptionDraft.trim()) return;
    setAppraisal({
      feeStatus: 'pending-approval',
      feeAmount: amountDraft.trim(),
      feeDescription: descriptionDraft.trim(),
      feeRemarks: remarksDraft.trim(),
    });
    setRequestOpen(false);
  };

  const adviseClient = () => {
    const now = new Date().toISOString();
    setAppraisal({ clientNotifiedAt: now, sentToOdooAt: now });
  };

  return (
    <Box sx={adminCardSx}>
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

        {(feeStatus === 'not-requested' || feeStatus === 'not-applicable') && (
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {feeStatus === 'not-requested' && (
              <>
                <Button
                  onClick={openRequestForm}
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="solar:send-square-bold" width={16} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
                >
                  Yes, Request Appraisal Fee
                </Button>
                <Button
                  onClick={() => setAppraisal({ feeStatus: 'not-applicable' })}
                  variant="outlined"
                  size="small"
                  sx={{ ...outlinedNavyButtonSx, px: 2, whiteSpace: 'nowrap', bgcolor: 'common.white' }}
                >
                  No Fee Needed
                </Button>
              </>
            )}
            {feeStatus === 'not-applicable' && (
              <Button
                onClick={() => setAppraisal({ feeStatus: 'not-requested' })}
                variant="outlined"
                size="small"
                sx={{ ...outlinedNavyButtonSx, px: 2, whiteSpace: 'nowrap', bgcolor: 'common.white' }}
              >
                Actually, this needs a fee
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {feeStatus === 'pending-approval' || feeStatus === 'approved' ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 1.5, p: 2, borderRadius: '12px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Box
              sx={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: '#1C2A6E' }}
            >
              <Iconify icon="solar:wad-of-money-bold-duotone" width={24} sx={{ color: 'common.white' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>
                REQUEST AMOUNT
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: 21, fontWeight: 800, color: '#1C2A6E' }}>
                {fCurrency(feeAmount)}
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
              <Typography sx={{ fontSize: 13, color: '#3B4256', mt: 0.25 }}>{feeDescription}</Typography>
            </Box>
            {feeRemarks && (
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>Remarks</Typography>
                <Typography sx={{ fontSize: 13, color: '#3B4256', mt: 0.25 }}>{feeRemarks}</Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      ) : null}

      {feeStatus === 'approved' && (
        <Stack spacing={1.25} sx={{ mt: 1.5, p: 2, borderRadius: '12px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                Advise client to settle the Appraisal fee
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.25 }}>
                {clientNotifiedAt
                  ? `Sent ${new Date(clientNotifiedAt).toLocaleString()} — request details sent to Odoo, payment link sent via Sendit.`
                  : 'Sends a payment link (Sendit) and notifies Odoo — both simulated.'}
              </Typography>
            </Box>
            {!clientNotifiedAt && (
              <Button
                onClick={adviseClient}
                variant="contained"
                size="small"
                sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
              >
                Advise Client
              </Button>
            )}
          </Stack>
          {clientNotifiedAt && !paymentReceivedAt && (
            <Button
              onClick={() => setAppraisal({ paymentReceivedAt: new Date().toISOString() })}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:card-recive-bold-duotone" width={16} />}
              sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start', bgcolor: 'common.white' }}
            >
              Simulate: Payment Received (Sendit)
            </Button>
          )}
          {paymentReceivedAt && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0C8A4F' }}>
              Payment received {new Date(paymentReceivedAt).toLocaleString()}
            </Typography>
          )}
        </Stack>
      )}

      <ConfirmDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request Appraisal Fee"
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
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1C2A6E' }}>₱</Typography>
                  </InputAdornment>
                ),
              }}
              inputProps={{ inputMode: 'decimal' }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'common.white', fontSize: 16, fontWeight: 700 },
                '& .MuiFormHelperText-root': { mx: 0, fontSize: 11.5 },
              }}
            />
            <TextField
              fullWidth
              label="Request Amount Description"
              placeholder="What this amount covers, e.g. Site visit + valuation fee"
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

      <ConfirmDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Reason for declining Appraisal Fee"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={declineReasonDraft}
            onChange={(event) => setDeclineReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineReasonDraft.trim()}
            onClick={confirmFeeDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Box>
  );
}
