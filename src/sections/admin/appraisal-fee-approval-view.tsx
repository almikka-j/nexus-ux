'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { fCurrency } from 'src/utils/format-number';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATIONS } from './sample-applications';

// ----------------------------------------------------------------------
// Head/Approver's queue for the Appraisal Fee an appraiser has requested
// (review.appraisal.feeStatus === 'pending-approval'), same shape as
// ci-fee-approval-view.tsx. Only the live application has a working
// Approve/Decline; sample rows below are read-only filler (SAMPLE_
// APPLICATIONS entries with an `appraisalFeePending` field), same
// convention as every other queue in this app.
// ----------------------------------------------------------------------

function QueueRow({
  name,
  email,
  amount,
  appraiserName,
  isSample,
}: {
  name: string;
  email: string;
  amount: string;
  appraiserName: string;
  isSample: boolean;
}) {
  return (
    <Box sx={{ ...adminCardSx, p: { xs: 2.5, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#EEF1FE',
            }}
          >
            <Iconify icon="solar:wallet-money-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
          </Box>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.75}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                {name}
              </Typography>
              {isSample && <StatusBadge tone="neutral" label="Sample" />}
            </Stack>
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              App No. {getLoanNumber(email)} · {appraiserName} · {fCurrency(amount)}
            </Typography>
          </Stack>
        </Stack>

        <StatusBadge tone="warning" label="Pending approval" />
      </Stack>
    </Box>
  );
}

export function AppraisalFeeApprovalView() {
  const { signUpData } = useRegistration();
  const { review, setAppraisal } = useAdmin();
  const { feeStatus, feeAmount, feeDescription, feeRemarks } = review.appraisal;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const isLivePending = !!signUpData && feeStatus === 'pending-approval';
  const sampleRows = SAMPLE_APPLICATIONS.filter((entry) => !!entry.appraisalFeePending);
  const hasAnyRow = isLivePending || sampleRows.length > 0;

  const confirmApprove = () => {
    setConfirmOpen(false);
    setAppraisal({ feeStatus: 'approved' });
    setJustApproved(true);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setDeclineReason('');
  };

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setAppraisal({
      feeStatus: 'not-requested',
      feeAmount: '',
      feeDescription: '',
      feeRemarks: '',
      feeDeclineReason: declineReason.trim(),
    });
    setDeclineOpen(false);
    setDeclineReason('');
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Appraisal Fee Approval
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Applications with an Appraisal fee requested by the appraiser, awaiting approval.
          </Typography>
        </Box>

        {!signUpData && sampleRows.length === 0 ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:wallet-money-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No application in progress
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
              There’s no live application in this session yet. Start one from the Application List.
            </Typography>
            <Button
              component={RouterLink}
              href={paths.admin.accountSolicitation}
              variant="outlined"
              sx={{ ...outlinedNavyButtonSx, px: 2.5 }}
            >
              Go to Application List
            </Button>
          </Box>
        ) : hasAnyRow ? (
          <Stack spacing={1.5}>
            {isLivePending && signUpData && (
              <QueueRow
                name={applicantName}
                email={signUpData.email}
                amount={feeAmount}
                appraiserName="Appraiser"
                isSample={false}
              />
            )}
            {sampleRows.map((entry) => {
              const { signUpData: sampleSignUp } = entry.registration;
              if (!sampleSignUp || !entry.appraisalFeePending) return null;
              return (
                <QueueRow
                  key={sampleSignUp.email}
                  name={`${sampleSignUp.firstName} ${sampleSignUp.lastName}`}
                  email={sampleSignUp.email}
                  amount={entry.appraisalFeePending.amount}
                  appraiserName={entry.appraisalFeePending.appraiserName}
                  isSample
                />
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:wallet-money-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No Appraisal Fee pending approval
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              {justApproved
                ? `The Appraisal Fee for ${applicantName} has been approved.`
                : 'No appraiser has requested an Appraisal fee for the current application yet.'}
            </Typography>
          </Box>
        )}

        {isLivePending && signUpData && (
          <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 } }}>
            <Stack spacing={0.5} sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#14172A' }}>
                {applicantName}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                App No. {getLoanNumber(signUpData.email)} · {signUpData.email}
              </Typography>
            </Stack>

            <Stack
              spacing={1.5}
              sx={{ p: 2, borderRadius: '12px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
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
                    {fCurrency(feeAmount)}
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
                  {feeDescription}
                </Typography>
              </Stack>
              {feeRemarks && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Remarks</Typography>
                  <Typography sx={{ fontSize: 12.5, color: '#3B4256', textAlign: 'right', maxWidth: '65%' }}>
                    {feeRemarks}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 2.5 }}>
              The Appraisal Fee request has been sent. A different officer (the Head) must approve
              it before the client is advised to settle.
            </Typography>

            <Stack spacing={1} sx={{ mt: 2.5 }}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
                >
                  Approve Appraisal Fee
                </Button>
                <Button
                  onClick={() => setDeclineOpen(true)}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
                >
                  Decline Appraisal Fee
                </Button>
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
                There’s no real Head login in this prototype — approving or declining here
                simulates that step.
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve Appraisal Fee?"
        content={
          <>
            Approving lets the appraiser advise the client to settle the fee for{' '}
            <strong>{applicantName}</strong>
            {feeAmount ? <> ({fCurrency(feeAmount)})</> : null}. This can’t be undone from here.
          </>
        }
        action={
          <Button variant="contained" onClick={confirmApprove} sx={confirmDialogActionToneSx.default}>
            Approve
          </Button>
        }
      />

      <ConfirmDialog
        open={declineOpen}
        onClose={closeDecline}
        title="Reason for declining"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why this Appraisal Fee request is being declined…"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineReason.trim()}
            onClick={confirmDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
