'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, type SemanticTone } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { getAppraisalNumber } from 'src/utils/get-appraisal-number';

import { AppraisalReportView } from './appraisal/appraisal-report-view';

// ----------------------------------------------------------------------
// Detail page for the Head/Approver — reached by clicking the one row on
// "My Approvals" (appraisal-approver-view.tsx), at
// paths.admin.appraisalApproverBundle(). Same as the Fee Approval detail
// page this mirrors (appraisal-fee-approval-bundle-view.tsx), the head
// approval decision is still batch-level (Appraisal.headApprovalStatus,
// not a per-bundle status), and there's no real multi-application backend
// in this prototype, so there's exactly one live appraisal to show per
// session. The `[bundleId]` route segment is a fixed placeholder
// ("current"), not a real ID, same convention as
// appraisalFeeApprovalBundle — this component ignores it and reads
// review.appraisal directly.
//
// Header card matches the same summary-card shape every other detail page
// here uses — a 42px icon-avatar + applicant name as the title (15px/800)
// + "App No. … · email" subtitle, a StatusBadge top-right, then a
// bordered/tinted FactChip strip for Properties, Appraiser, and Requested
// On (bundle.report.uploadedAt from the LAST bundle to submit — same idea
// as feeSubmittedAt on the Fee Approval detail page, just derived from the
// per-bundle report timestamps since there's no separate batch-level
// "submitted" stamp for reports the way there is for fees).
//
// Below the header, this is where the Fee Approval detail page and this
// one diverge: the Head Approver's whole job is reviewing the actual
// Appraisal Report content the appraiser submitted, not a fee breakdown —
// so every bundle in the request renders its own full report via
// AppraisalReportView, the exact same read-only summary component the
// Appraisal Officer's own "View Report" dialog uses
// (appraisal-report-view.tsx). This deliberately is NOT
// AppraiserAssignmentCard (the Appraiser's own editable form) — an earlier
// version of this page reused that component directly since it already
// locks itself read-only once a report is submitted, but a *disabled form*
// reads as broken/uploader-shaped on a review page (bare TextFields with no
// section styling, a "Choose a photo" dropzone shell around a photo instead
// of an actual photo view) rather than matching this app's own read-only
// summary conventions. AppraisalReportView already solves exactly this —
// label/value Field pairs grouped under SectionLabel headings with
// Dividers between them (this app's standard read-only-detail shape, same
// as the FactChip/Field patterns every other detail page here uses), and
// each land title's Collateral Photo renders as a real 56×56 thumbnail
// that opens the full photo on click (LandTitleSummary), not a disabled
// dropzone control.
//
// Approve/Decline live at the bottom of their own card below every
// bundle's report, unchanged from the old single-page view: both still
// call the batch-level setAppraisal({ headApprovalStatus })/
// clearAllAppraisalBundleReports context calls, and approving/declining
// still applies to the whole appraisal at once, not just one property's
// report.
// ----------------------------------------------------------------------

const HEAD_APPROVAL_STATUS_COPY: Record<'pending' | 'approved' | 'declined', { label: string; tone: SemanticTone }> = {
  pending: { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  declined: { label: 'Declined', tone: 'error' },
};

// Same label-over-value chip convention every other detail page's own
// unexported FactChip uses (appraisal-fee-approval-bundle-view.tsx,
// appraisal-appraiser-bundle-view.tsx) — kept in sync manually rather than
// sharing a module, matching this codebase's convention for this exact
// component.
function FactChip({ label, value }: { label: string; value?: string }) {
  return (
    <Stack spacing={0.35} sx={{ px: 1.75, py: 1, minWidth: 0, flex: '1 1 128px' }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#9AA2B4',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={value}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

export function AppraisalApproverBundleView() {
  const { signUpData } = useRegistration();
  const { review, setAppraisal, clearAllAppraisalBundleReports } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { headApprovalStatus, headApprovalDeclineReason, reportBundles } = review.appraisal;

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  if (!signUpData || reportBundles.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <Iconify icon="solar:clipboard-check-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Appraisal not found
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
            This appraisal isn&apos;t in your current session.
          </Typography>
          <Button component={RouterLink} href={paths.admin.appraisalApprover} variant="outlined">
            Back to My Approvals
          </Button>
        </Box>
      </Container>
    );
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const appraiserName =
    reportBundles.map((bundle) => bundle.appraiserName).filter(Boolean).join(', ') || 'No appraiser assigned';
  const propertyCount = reportBundles.reduce((sum, bundle) => sum + bundle.tctGroupIds.length, 0);
  const latestReportSubmittedAt = reportBundles
    .map((bundle) => bundle.report.uploadedAt)
    .filter((value): value is string => !!value)
    .sort()
    .pop();

  const copy = HEAD_APPROVAL_STATUS_COPY[headApprovalStatus];
  const isPending = headApprovalStatus === 'pending';

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
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={RouterLink}
            href={paths.admin.appraisalApprover}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{ color: '#5A6273', fontWeight: 600, fontSize: 13, px: 0.5 }}
          >
            Back to My Approvals
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
                <Iconify icon="solar:clipboard-check-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
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
              '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
            }}
          >
            <FactChip label="Properties" value={String(propertyCount)} />
            <FactChip label="Appraiser" value={appraiserName} />
            <FactChip
              label="Requested On"
              value={latestReportSubmittedAt ? new Date(latestReportSubmittedAt).toLocaleDateString() : undefined}
            />
          </Stack>

          {headApprovalDeclineReason && isPending && (
            <Stack
              direction="row"
              spacing={1.25}
              sx={{ mt: 2, p: 1.5, borderRadius: '10px', border: '1px solid #F3C4BE', bgcolor: '#FDF2F1' }}
            >
              <Iconify icon="solar:danger-triangle-bold" width={17} sx={{ color: '#B32C22', flexShrink: 0, mt: 0.1 }} />
              <Stack spacing={0.25}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#B32C22', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Reason for decline
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#B32C22' }}>{headApprovalDeclineReason}</Typography>
              </Stack>
            </Stack>
          )}
        </Box>

        {reportBundles.map((bundle) => {
          const bundleTctNumbers = appraisalGroups
            .filter((group) => bundle.tctGroupIds.includes(group.id))
            .map((group) => group.tctNumber);
          return (
            <Stack key={bundle.id} spacing={1}>
              {reportBundles.length > 1 && (
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#5A6273', px: 0.5 }}>
                  {getAppraisalNumber(bundle.tctGroupIds)}
                </Typography>
              )}
              <AppraisalReportView bundleId={bundle.id} tctNumbers={bundleTctNumbers} />
            </Stack>
          );
        })}

        <Box sx={{ ...adminCardSx }}>
          {isPending && !justApproved ? (
            <Stack spacing={1.25}>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                Every pledged property&apos;s appraisal report has been submitted. Review and note this
                appraisal before it proceeds to Credit Scoring.
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
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
              <Divider sx={{ borderColor: '#EEF0F5' }} />
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
                There’s no real Head login in this prototype — approving or declining here simulates
                your review.
              </Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Iconify icon="solar:check-circle-bold-duotone" width={20} sx={{ color: '#0C8A4F' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                {headApprovalStatus === 'approved'
                  ? `You already reviewed and noted the appraisal for ${applicantName}.`
                  : `Reviewed and noted the appraisal for ${applicantName}.`}
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
