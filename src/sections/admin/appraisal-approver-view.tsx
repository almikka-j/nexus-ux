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
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATIONS } from './sample-applications';

// ----------------------------------------------------------------------
// Head/Approver's queue for the "reviewed and noted" Head Approval step —
// every pledged property's appraisal report bundle has been submitted
// (same reportSubmitted condition appraisal-view.tsx computes to unlock
// its own Head Approval card) and headApprovalStatus === 'pending'. Same
// shape as ci-fee-approval-view.tsx/appraisal-fee-approval-view.tsx; only
// the live application has working Approve/Decline, reusing the same
// setAppraisal/clearAllAppraisalBundleReports setters
// head-approval-card.tsx already uses.
// ----------------------------------------------------------------------

function QueueRow({
  name,
  email,
  appraiserName,
  isSample,
}: {
  name: string;
  email: string;
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
            <Iconify icon="solar:clipboard-check-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
          </Box>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.75}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                {name}
              </Typography>
              {isSample && <StatusBadge tone="neutral" label="Sample" />}
            </Stack>
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              App No. {getLoanNumber(email)} · {appraiserName}
            </Typography>
          </Stack>
        </Stack>

        <StatusBadge tone="warning" label="Pending approval" />
      </Stack>
    </Box>
  );
}

export function AppraisalApproverView() {
  const { signUpData } = useRegistration();
  const { review, setAppraisal, clearAllAppraisalBundleReports } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { headApprovalStatus, headApprovalDeclineReason, reportBundles } = review.appraisal;

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  const allGroupsAssigned = appraisalGroups.every((group) => group.reportId !== null);
  const allBundlesSubmitted = reportBundles.every((bundle) => !!bundle.report.uploadedAt);
  const reportSubmitted =
    appraisalNotApplicable || (allGroupsAssigned && reportBundles.length > 0 && allBundlesSubmitted);
  const isLivePending = !!signUpData && reportSubmitted && headApprovalStatus === 'pending';

  const sampleRows = SAMPLE_APPLICATIONS.filter((entry) => !!entry.appraisalAwaitingHeadApproval);
  const hasAnyRow = isLivePending || sampleRows.length > 0;

  const approve = () => {
    setAppraisal({ headApprovalStatus: 'approved' });
    setJustApproved(true);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setDeclineReason('');
  };

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setAppraisal({ headApprovalStatus: 'pending', headApprovalDeclineReason: declineReason.trim() });
    clearAllAppraisalBundleReports();
    setDeclineOpen(false);
    setDeclineReason('');
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Appraisal Approver
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Applications with every appraisal report submitted, awaiting Head Approval.
          </Typography>
        </Box>

        {!signUpData && sampleRows.length === 0 ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:clipboard-check-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
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
                appraiserName={
                  reportBundles.map((bundle) => bundle.appraiserName).filter(Boolean).join(', ') || 'Appraiser'
                }
                isSample={false}
              />
            )}
            {sampleRows.map((entry) => {
              const { signUpData: sampleSignUp } = entry.registration;
              if (!sampleSignUp || !entry.appraisalAwaitingHeadApproval) return null;
              return (
                <QueueRow
                  key={sampleSignUp.email}
                  name={`${sampleSignUp.firstName} ${sampleSignUp.lastName}`}
                  email={sampleSignUp.email}
                  appraiserName={entry.appraisalAwaitingHeadApproval.appraiserName}
                  isSample
                />
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:clipboard-check-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No appraisal pending Head Approval
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              {justApproved
                ? `The appraisal for ${applicantName} has been reviewed and noted.`
                : 'No application currently has every appraisal report submitted and awaiting Head Approval.'}
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

            {headApprovalDeclineReason && (
              <Typography sx={{ fontSize: 12.5, color: '#5A6273', mb: 1.5 }}>
                Last decline reason: {headApprovalDeclineReason}
              </Typography>
            )}

            <Typography sx={{ fontSize: 12.5, color: '#5A6273', mb: 2.5 }}>
              Every pledged property&apos;s appraisal report has been submitted. Review and note the
              appraisal before it proceeds to Credit Scoring.
            </Typography>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  onClick={approve}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#0C8A4F', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0A7042' } }}
                >
                  Approve (Reviewed and Noted)
                </Button>
                <Button
                  onClick={() => setDeclineOpen(true)}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
                >
                  Decline
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
        open={declineOpen}
        onClose={closeDecline}
        title="Reason for declining"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what needs revision…"
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
