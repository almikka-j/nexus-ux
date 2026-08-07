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

import type { CiFeeStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Dedicated screen for approving the one live application's pending CI
// Fee — a second way to trigger the same simulated-second-officer approval
// the "Simulate: Another Officer Approves CI Fee" page action on
// credit-investigation-view.tsx already offers; that action is unchanged
// and still present. This screen exists purely for discoverability/
// workflow framing (a distinct approver-shaped screen, reachable from the
// main nav), not a replacement.
//
// Styled as a real per-step queue/list, matching every other queue in this
// app (application-list-view.tsx's per-step filtered list — Initial Credit
// Checking, Call Report, Requirement Checklist, Credit Investigation): one
// row per application currently relevant to this screen, not a single
// isolated card. Unlike those queues, `ciFeeStatus` lives on a single flat
// review.creditInvestigation object in AdminContext — not per-application
// like `ReviewStep` — so only the one live application can ever really be
// "pending" here. The extra rows below it come from a fake `ciFee` field
// added to a couple of SAMPLE_APPLICATIONS entries (sample-applications.ts)
// purely for visual completeness; like every other sample row in this app,
// they're read-only and never actionable (no working Approve/Decline —
// there's nowhere real to save an edit to sample data). See
// docs/ADMIN_CREDIT_INVESTIGATION.md's "CI Fee" section.
// ----------------------------------------------------------------------

const NOT_PENDING_COPY: Record<Exclude<CiFeeStatus, 'pending-approval'>, string> = {
  'not-requested': "A CI Fee hasn't been requested for the current application yet.",
  approved: 'The CI Fee for the current application has already been approved.',
  'not-applicable': "The current application doesn't require a CI Fee.",
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

// One row's worth of markup, shared by the live pending row and the fake
// sample rows — same visual shape as application-list-view.tsx's queue
// rows (icon box, name (+ "Sample" badge), App No. subtext, status badge)
// but never wrapped in a ButtonBase here: the live row's detail/actions
// render unconditionally below the list (no click needed), and sample
// rows are non-actionable everywhere else in this app too.
function QueueRow({
  name,
  email,
  isSample,
}: {
  name: string;
  email: string;
  isSample: boolean;
}) {
  return (
    <Box sx={{ ...adminCardSx, p: { xs: 2.5, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1.75} alignItems="center">
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
          <Stack spacing={0.25}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.75}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                {name}
              </Typography>
              {isSample && <StatusBadge tone="neutral" label="Sample" />}
            </Stack>
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              App No. {getLoanNumber(email)}
            </Typography>
          </Stack>
        </Stack>

        <StatusBadge tone="warning" label="Pending approval" />
      </Stack>
    </Box>
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

  const isLivePending = !!signUpData && ciFeeStatus === 'pending-approval';
  const sampleRows = SAMPLE_APPLICATIONS.filter((entry) => !!entry.ciFee);
  const hasAnyRow = isLivePending || sampleRows.length > 0;

  // Stays on this page after approving (no redirect) so the officer sees
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

  // Mirrors credit-investigation-view.tsx's confirmReturnToAmd: a typed
  // reason is required, then the request is reset back to 'not-requested'
  // (same re-entry point as an application that never requested a fee) —
  // the officer can re-request from the CI Fee card with corrected terms.
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
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            CI Fee Approval
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Applications with a Credit Investigation fee awaiting approval.
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
              No application in progress
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
              There’s no live application in this session to review a CI Fee for yet. Start one
              from the Application List, then request a CI Fee on its Credit Investigation page.
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
            {isLivePending && (
              <QueueRow name={applicantName} email={signUpData.email} isSample={false} />
            )}
            {sampleRows.map((entry) => {
              const { signUpData: sampleSignUp } = entry.registration;
              if (!sampleSignUp) return null;
              return (
                <QueueRow
                  key={sampleSignUp.email}
                  name={`${sampleSignUp.firstName} ${sampleSignUp.lastName}`}
                  email={sampleSignUp.email}
                  isSample
                />
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify
              icon="solar:wallet-money-bold-duotone"
              width={48}
              sx={{ color: '#C7CCDA', mb: 2 }}
            />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No CI Fee pending approval
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

        {/* Detail card + actions for the live application specifically —
            rendered directly below the list whenever its row is present,
            no click/expand needed (the sample rows above have no
            equivalent detail, since they're not real). */}
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
              The CI Fee request has been sent. A different officer must approve it before the CI
              Report can be prepared — this can’t be self-approved.
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
                here simulates that second step.
              </Typography>
            </Stack>
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
