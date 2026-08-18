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
import { getLoanNumber } from 'src/utils/get-loan-number';

// ----------------------------------------------------------------------
// Personal workspace for the Head/Approver's "reviewed and noted" Head
// Approval step — framed as "My Approvals," their own inbox of
// appraisals waiting on a decision once every pledged property's report
// bundle has been submitted (same reportSubmitted computation
// appraisal-view.tsx uses to unlock its own Head Approval card, duplicated
// here rather than shared since the two files don't currently import from
// each other). Same role-workspace treatment as the other three Approval
// screens: a "HEAD / APPROVER" eyebrow label, first-person copy, and no
// sample filler rows — a real approver's inbox would never show other
// people's unrelated appraisals. Reuses the same setAppraisal/
// clearAllAppraisalBundleReports setters head-approval-card.tsx uses.
// ----------------------------------------------------------------------

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
  const isPending = !!signUpData && reportSubmitted && headApprovalStatus === 'pending';

  const appraiserName =
    reportBundles.map((bundle) => bundle.appraiserName).filter(Boolean).join(', ') || 'Appraiser';

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
      <Stack spacing={3}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            Head / Approver
          </Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            My Approvals
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Appraisals with every report submitted, waiting on your review.
          </Typography>
        </Box>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:clipboard-check-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing waiting on you yet
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
        ) : isPending ? (
          <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 } }}>
            <Stack spacing={0.5} sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#14172A' }}>
                {applicantName}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                App No. {getLoanNumber(signUpData.email)} · {signUpData.email} · {appraiserName}
              </Typography>
            </Stack>

            {headApprovalDeclineReason && (
              <Typography sx={{ fontSize: 12.5, color: '#5A6273', mb: 1.5 }}>
                Last decline reason: {headApprovalDeclineReason}
              </Typography>
            )}

            <Typography sx={{ fontSize: 12.5, color: '#5A6273', mb: 2.5 }}>
              Every pledged property&apos;s appraisal report has been submitted. Review and note this
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
                simulates your review.
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:clipboard-check-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing waiting on you right now
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              {justApproved
                ? `You already reviewed and noted the appraisal for ${applicantName}.`
                : 'No application currently has every appraisal report submitted and awaiting your review.'}
            </Typography>
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
