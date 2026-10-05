'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, type SemanticTone } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { CallReportResultContent } from './call-report/call-report-result-modal';
import { SALES_REJECT_REASONS, buildDecisionReason } from './call-report/call-report-decline';

import type { CallReportApprovalStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Detail page for the Call Report Approver — reached by clicking the
// Call Report row on the merged "Report Approvals" list
// (report-approvals-view.tsx), at
// paths.admin.reportApprovalsDetail('call-report'). Rendered by the
// `/admin/report-approvals/[kind]` route — Call Report's approval status
// lives on a single flat review.callReport object (no bundles/
// multi-property concept), so this component ignores the `kind` param
// and reads context directly.
//
// The full Call Report result is displayed inline on this page (via
// CallReportResultContent — the same body CallReportResultModal wraps
// elsewhere) so the approver reviews it directly, no "View" button.
//
// Decline reuses Call Report's own Sales Reject reason flow exactly
// (SALES_REJECT_REASONS + buildDecisionReason from call-report-decline.ts)
// and performs the identical routing (-> Reconsideration), plus resets
// callReportApprovalStatus back to 'not-submitted' — functionally the
// same outcome as clicking Sales Reject directly on the Call Report page.
// ----------------------------------------------------------------------

const CALL_REPORT_STATUS_COPY: Record<CallReportApprovalStatus, { label: string; tone: SemanticTone }> = {
  'not-submitted': { label: 'Not Submitted', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
};

export function CallReportApprovalBundleView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review, setCallReport } = useAdmin();
  const { callReportApprovalStatus, callReportSubmittedAt } = review.callReport;

  const [declineOpen, setDeclineOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonRemarks, setReasonRemarks] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  if (!signUpData) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Request not found
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
            This request isn&apos;t in your current session.
          </Typography>
          <Button component={RouterLink} href={paths.admin.reportApprovals} variant="outlined">
            Back to Call Report Approvals
          </Button>
        </Box>
      </Container>
    );
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const copy = CALL_REPORT_STATUS_COPY[callReportApprovalStatus];
  const isPending = callReportApprovalStatus === 'pending-approval';
  const submittedOnLabel = callReportSubmittedAt ? new Date(callReportSubmittedAt).toLocaleString() : '—';

  // No real second-officer login in this prototype — approving stamps a
  // fixed dummy name instead of asking the user to type one, so "Approve
  // Call Report" is a single click with no intermediate dialog.
  const handleApprove = () => {
    setCallReport({
      callReportApprovalStatus: 'approved',
      callReportApprovedAt: new Date().toISOString(),
      callReportApprovedBy: 'Jaime Reyes',
    });
    setJustApproved(true);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setReasonCategory('');
    setReasonRemarks('');
  };

  // Same outcome as clicking Sales Reject directly on the Call Report
  // page (same reason format, same route to Reconsideration), plus
  // resetting callReportApprovalStatus so a fresh Call Report can be
  // submitted for approval again if this application ever re-enters the
  // forward pipeline.
  const confirmDecline = () => {
    if (!signUpData || !reasonCategory) return;
    const decisionReason = buildDecisionReason(reasonCategory, reasonRemarks);
    setCallReport({ callReportApprovalStatus: 'not-submitted', decisionReason });
    closeDecline();
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={RouterLink}
            href={paths.admin.reportApprovals}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{ color: '#5A6273', fontWeight: 600, fontSize: 13, px: 0.5 }}
          >
            Back to Call Report Approvals
          </Button>
        </Box>

        <Box sx={{ ...adminCardSx, p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
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
                <Iconify icon="solar:document-text-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                  {applicantName}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                  App No. {getLoanNumber(signUpData.email)} · {signUpData.email}
                </Typography>
              </Box>
            </Stack>
            <StatusBadge tone={copy.tone} label={copy.label} />
          </Stack>

          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              mt: 2.5,
              border: '1px solid #EEF0F5',
              borderRadius: '12px',
              bgcolor: '#FAFBFD',
              p: 1.75,
            }}
          >
            <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
              Submitted on {submittedOnLabel}
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ ...adminCardSx }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.5 }}>
            <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#5A6273' }} />
            <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
              Review the full call report below before deciding.
            </Typography>
          </Stack>

          <CallReportResultContent />
        </Box>

        <Box sx={{ ...adminCardSx }}>
          {isPending && !justApproved ? (
            <Stack spacing={1.25}>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                This call report is waiting on your decision before Requirement Checklist unlocks.
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                <Button
                  onClick={handleApprove}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
                >
                  Approve Call Report
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
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Iconify
                icon={
                  callReportApprovalStatus === 'approved' && justApproved
                    ? 'solar:check-circle-bold-duotone'
                    : 'solar:info-circle-bold-duotone'
                }
                width={20}
                sx={{ color: callReportApprovalStatus === 'approved' ? '#0C8A4F' : '#8891A6' }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                {callReportApprovalStatus === 'approved'
                  ? justApproved
                    ? `Approved the call report for ${applicantName}.`
                    : `You already approved the call report for ${applicantName}.`
                  : `No call report has been submitted for ${applicantName} yet.`}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>

      <ConfirmDialog
        open={declineOpen}
        onClose={closeDecline}
        title="Reason for declining"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              autoFocus
              fullWidth
              label="Reason"
              value={reasonCategory}
              onChange={(event) => setReasonCategory(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            >
              {SALES_REJECT_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Remarks"
              placeholder="Add any additional details…"
              value={reasonRemarks}
              onChange={(event) => setReasonRemarks(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!reasonCategory}
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
