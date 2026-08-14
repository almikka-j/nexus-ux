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
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { fCurrency } from 'src/utils/format-number';
import { getLoanNumber } from 'src/utils/get-loan-number';

import type { CiFeeStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Personal workspace for the Credit Investigation Head/Approver — framed
// as "My Approvals," their own inbox of CI Fee requests waiting on a
// decision, not a generic admin-facing queue. Same role-workspace
// treatment as appraisal-appraiser-view.tsx's "My Assignments": a
// "CI HEAD / APPROVER" eyebrow label, first-person copy, and no sample
// filler rows — a real approver's inbox would never show other people's
// unrelated requests. `ciFeeStatus` lives on a single flat
// review.creditInvestigation object in AdminContext (not per-application),
// so this only ever has the one live application's request to show.
//
// This is a second way to trigger the same simulated-second-officer
// approval the "Simulate: Another Officer Approves CI Fee" page action on
// credit-investigation-view.tsx already offers; that action is unchanged
// and still present.
// ----------------------------------------------------------------------

const NOT_PENDING_COPY: Record<Exclude<CiFeeStatus, 'pending-approval'>, string> = {
  'not-requested': "There's no CI Fee request waiting on you right now.",
  approved: 'You already approved this CI Fee request.',
  'not-applicable': "This application doesn't require a CI Fee.",
};

// Same completed-screen shape as Requirement Checklist's local
// SuccessState (requirement-checklist-view.tsx, shown on `endorsed`) —
// centered icon/heading/body plus a forward action and a "Back to
// Application List" fallback — reused here for both outcomes (approved,
// declined) so finishing this screen reads the same way regardless of
// which decision was made, matching how other steps in this pipeline
// present their own completion.
function OutcomeScreen({
  icon,
  iconBg,
  iconColor,
  heading,
  body,
  forwardHref,
  forwardLabel,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  heading: string;
  body: string;
  forwardHref: string;
  forwardLabel: string;
}) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack
        alignItems="center"
        textAlign="center"
        spacing={2}
        sx={{ ...adminCardSx, p: { xs: 4, md: 6 } }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: iconBg,
          }}
        >
          <Iconify icon={icon} width={26} sx={{ color: iconColor }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>{heading}</Typography>
        <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>{body}</Typography>
        <Button
          component={RouterLink}
          href={forwardHref}
          variant="contained"
          sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }}
        >
          {forwardLabel}
        </Button>
        <Button
          component={RouterLink}
          href={paths.admin.accountSolicitation}
          variant="outlined"
          sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', mt: 0.5 }}
        >
          Back to Application List
        </Button>
      </Stack>
    </Container>
  );
}

export function CiFeeApprovalView() {
  const { signUpData } = useRegistration();
  const { review, setCreditInvestigation } = useAdmin();
  const { ciFeeStatus, ciFeeAmount, ciFeeAmountDescription, ciFeeRemarks } =
    review.creditInvestigation;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Tracks "approved just now, in this visit" separately from the
  // persisted `ciFeeStatus === 'approved'` — that status can also be
  // reached via the other approval path (the inline page action on
  // credit-investigation-view.tsx) or from an earlier session, so it isn't
  // safe to treat every render of an already-'approved' status as a fresh
  // completion. This flag gates the one-time success screen below; a
  // stale 'approved' status (this flag still false) instead falls through
  // to the plain "already approved" info card.
  const [justApproved, setJustApproved] = useState(false);
  // Same idea for a fresh decline — separate from the persisted state
  // (which resets to 'not-requested', indistinguishable from an
  // application that never had a CI Fee requested at all) so the officer
  // still sees a clear "declined" outcome screen right after acting,
  // instead of the request just silently reverting to its blank state.
  const [justDeclined, setJustDeclined] = useState(false);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  const isPending = !!signUpData && ciFeeStatus === 'pending-approval';

  // Stays on this page after approving (no redirect) so the approver sees
  // the completed result — the success screen below — right here, instead
  // of being sent away before the outcome is visible.
  const confirmApprove = () => {
    if (!signUpData) return;
    setConfirmOpen(false);
    setCreditInvestigation({ ciFeeStatus: 'approved' });
    setJustApproved(true);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setDeclineReason('');
  };

  // A typed reason is required, then the request is reset back to
  // 'not-requested' (same re-entry point as an application that never
  // requested a fee) — the officer can re-request from the CI Fee card
  // with corrected terms.
  const confirmDecline = () => {
    if (!signUpData || !declineReason.trim()) return;
    setCreditInvestigation({
      ciFeeStatus: 'not-requested',
      ciFeeAmount: '',
      ciFeeAmountDescription: '',
      ciFeeRemarks: '',
      ciFeeDeclineReason: declineReason.trim(),
    });
    setDeclineOpen(false);
    setDeclineReason('');
    setJustDeclined(true);
  };

  if (justApproved && signUpData) {
    return (
      <OutcomeScreen
        icon="solar:check-circle-bold"
        iconBg="#E7F8F0"
        iconColor="#12B76A"
        heading="CI Fee approved"
        body={`The CI Fee for ${applicantName} has been approved. The CI Report is now unlocked on the Credit Investigation page.`}
        forwardHref={paths.admin.creditInvestigation(encodeURIComponent(signUpData.email))}
        forwardLabel="Continue to Credit Investigation"
      />
    );
  }

  if (justDeclined && signUpData) {
    return (
      <OutcomeScreen
        icon="solar:close-circle-bold"
        iconBg="#FEF0D6"
        iconColor="#B36A05"
        heading="CI Fee declined"
        body={`The CI Fee request for ${applicantName} was declined and reset. The officer can re-request it from Credit Investigation with corrected terms.`}
        forwardHref={paths.admin.creditInvestigation(encodeURIComponent(signUpData.email))}
        forwardLabel="Continue to Credit Investigation"
      />
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            CI Head / Approver
          </Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            My Approvals
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Credit Investigation fee requests waiting on your decision.
          </Typography>
        </Box>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify
              icon="solar:wallet-money-bold-duotone"
              width={48}
              sx={{ color: '#C7CCDA', mb: 2 }}
            />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing waiting on you yet
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
              There’s no live application in this session yet. Start one from the Application List,
              then request a CI Fee on its Credit Investigation page.
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
        ) : isPending ? (
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

            <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 2.5 }}>
              This request is waiting on your decision before the CI Report can be prepared.
            </Typography>

            <Stack spacing={1} sx={{ mt: 2.5 }}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
                >
                  Approve CI Fee
                </Button>
                <Button
                  onClick={() => setDeclineOpen(true)}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
                >
                  Decline CI Fee
                </Button>
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
                There’s no real second-officer login in this prototype — approving or declining
                here simulates your review.
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify
              icon="solar:check-circle-bold-duotone"
              width={48}
              sx={{ color: '#C7CCDA', mb: 2 }}
            />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing waiting on you right now
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
              {NOT_PENDING_COPY[ciFeeStatus as Exclude<CiFeeStatus, 'pending-approval'>]}
            </Typography>
            <Button
              component={RouterLink}
              href={paths.admin.creditInvestigation(encodeURIComponent(signUpData.email))}
              variant="outlined"
              sx={{ ...outlinedNavyButtonSx, px: 2.5 }}
            >
              Go to Credit Investigation
            </Button>
          </Box>
        )}
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve CI Fee?"
        content={
          <>
            Approving unlocks the CI Report for <strong>{applicantName}</strong>
            {ciFeeAmount ? <> ({fCurrency(ciFeeAmount)})</> : null}. This can’t be undone from
            here.
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
            placeholder="Explain why this CI Fee request is being declined…"
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
