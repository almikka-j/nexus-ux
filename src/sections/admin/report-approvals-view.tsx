'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin, APPRAISER_ROSTER, getBundleUploadedAt } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { getAppraisalNumber } from 'src/utils/get-appraisal-number';

import { APPRAISAL_DOC_META } from './requirement-checklist-docs';
import { SAMPLE_APPLICATION } from './sample-application';
import { buildSampleCallReportFields } from './call-report/sample-call-report';
import { buildSampleAppraisalReport } from './appraisal/sample-appraisal-report';

import type { CallReportApprovalStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Merged "Report Approvals" list — replaces the two former separate list
// pages call-report-approval-view.tsx and appraisal-approver-view.tsx
// (both deleted). One nav entry ("Report Approvals," replacing the old
// "Call Report - Report Approval" / "Appraisal - Report Approval" pair —
// see config-nav-admin.tsx), one table, up to two rows (one per report
// type).
//
// Unlike the Fee Approvals merge (fee-approvals-view.tsx), the two rows
// here are NOT symmetric:
//
// - The Call Report row always renders whenever a live application
//   exists (`hasApplication`), regardless of status — same convention
//   every other list page here uses. Only its StatusBadge varies.
// - The Appraisal row is genuinely conditional: it only renders once
//   every pledged property's report has actually been submitted
//   (`reportSubmitted`) AND `headApprovalStatus === 'pending'` — this is
//   NOT a status-gating anti-pattern (unlike the old CI/Appraisal Fee
//   list pages' removed status gates), it's a real completeness gate:
//   there is nothing for the Head Approver to review until every report
//   exists. This is preserved unchanged from appraisal-approver-view.tsx.
//
// Both former screens' auto-seed-on-hydrate effects are preserved
// verbatim (not merged into one generic effect — the seeding rules are
// genuinely different), just running together in this one component.
// `loadSample` only needs to fire once if `!hasApplication` — guarded by
// the same `didSeedApplication` ref the Call Report effect used.
//
// See docs/165-request-report-approvals.md.
// ----------------------------------------------------------------------

const CALL_REPORT_ROW_STATUS_COPY: Record<CallReportApprovalStatus, { label: string; tone: SemanticTone }> = {
  'not-submitted': { label: 'Not Submitted', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
};

export function ReportApprovalsView() {
  const router = useRouter();
  const { signUpData, application, hydrated, loadSample } = useRegistration();
  const {
    review,
    setCallReport,
    setAppraisal,
    createAppraisalReportBundle,
    setAppraisalBundleReport,
    submitAppraisalBundleFeeForApproval,
    approveAppraisalBundleFee,
  } = useAdmin();
  const { callReportApprovalStatus, callReportSubmittedAt } = review.callReport;
  const isCallReportEmpty =
    !review.callReport.interactionType &&
    !review.callReport.identityStatus &&
    !review.callReport.callDisposition;
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { headApprovalStatus, reportBundles } = review.appraisal;

  const hasApplication = !!signUpData && !!application.personalInfo;

  // Call Report's auto-seed rule, unchanged from call-report-approval-view.tsx.
  const didSeedApplication = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!hasApplication) {
      if (didSeedApplication.current) return;
      didSeedApplication.current = true;
      loadSample(SAMPLE_APPLICATION);
      return;
    }
    if (callReportApprovalStatus === 'pending-approval') return;
    // Never overwrite a declined-but-untouched report.
    if (callReportApprovalStatus === 'not-submitted' && review.callReport.decisionReason) return;
    if (isCallReportEmpty) {
      setCallReport({
        ...buildSampleCallReportFields({
          firstName: signUpData?.firstName ?? '',
          assignedOfficer: application.assignedOfficer,
          desiredLoanAmount: application.financialInfo?.desiredLoanAmount,
          loanTermMonths: application.financialInfo?.loanTermMonths,
        }),
        callReportApprovalStatus: 'pending-approval',
        callReportSubmittedAt: new Date().toISOString(),
      });
    } else {
      setCallReport({
        callReportApprovalStatus: 'pending-approval',
        callReportSubmittedAt: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, callReportApprovalStatus, isCallReportEmpty]);

  // Appraisal Head Approval's auto-seed rule, unchanged from
  // appraisal-approver-view.tsx: seed a bundle with its fee already
  // settled, then fill in and submit its report — so this list always has
  // a genuinely reviewable row on a fresh session.
  const hasBundleNeedingFeeApproval = reportBundles.some(
    (bundle) => bundle.feeNeeded === 'yes' && bundle.feeApprovalStatus !== 'approved'
  );
  const hasBundleNeedingReport = reportBundles.some((bundle) => !getBundleUploadedAt(bundle));
  useEffect(() => {
    if (!hydrated) return;
    if (!hasApplication) return;
    if (reportBundles.length === 0) {
      const groupsForSampleBundle = appraisalGroups.filter(
        (group) =>
          group.reportId === null &&
          APPRAISAL_DOC_META.every((meta) => group.documents.find((doc) => doc.key === meta.key)?.status === 'verified')
      );
      if (groupsForSampleBundle.length > 0) {
        createAppraisalReportBundle(
          groupsForSampleBundle.map((group) => group.id),
          'inhouse',
          APPRAISER_ROSTER[0],
          null,
          { feeNeeded: 'yes', feeAmount: '5000', feeDescription: 'Site visit + valuation fee', feeRemarks: '' }
        );
        const now = new Date().toISOString();
        setAppraisal({
          clientNotifiedAt: now,
          sentToOdooAt: now,
          paymentReceivedAt: now,
        });
      }
      return;
    }
    // The bundle now exists (created on the previous render's branch
    // above) but its own fee approval hasn't settled yet — submit then
    // approve it directly, same "skip the request/approve steps since
    // nothing on this page needs them mid-flight" reasoning the old
    // batch-level seed used, just scoped to this one bundle now.
    const bundleNeedingFeeApproval = reportBundles.find(
      (bundle) => bundle.feeNeeded === 'yes' && bundle.feeApprovalStatus !== 'approved'
    );
    if (bundleNeedingFeeApproval) {
      if (bundleNeedingFeeApproval.feeApprovalStatus !== 'pending-approval') {
        submitAppraisalBundleFeeForApproval(bundleNeedingFeeApproval.id);
      }
      approveAppraisalBundleFee(bundleNeedingFeeApproval.id);
      return;
    }
    const bundleNeedingReport = reportBundles.find((bundle) => !getBundleUploadedAt(bundle));
    if (bundleNeedingReport && signUpData) {
      const bundleTctNumbers = appraisalGroups
        .filter((group) => bundleNeedingReport.tctGroupIds.includes(group.id))
        .map((group) => group.tctNumber);
      const applicantNameForReport = `${signUpData.firstName} ${signUpData.lastName}`;
      setAppraisalBundleReport(
        bundleNeedingReport.id,
        buildSampleAppraisalReport(bundleNeedingReport, bundleTctNumbers, applicantNameForReport, true)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, reportBundles.length, hasBundleNeedingFeeApproval, hasBundleNeedingReport]);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const appNo = signUpData ? getLoanNumber(signUpData.email) : '';

  const callReportRowStatusCopy = CALL_REPORT_ROW_STATUS_COPY[callReportApprovalStatus];
  const submittedOnLabel = callReportSubmittedAt ? new Date(callReportSubmittedAt).toLocaleDateString() : '—';

  const allGroupsAssigned = appraisalGroups.every((group) => group.reportId !== null);
  const allBundlesSubmitted = reportBundles.every((bundle) => !!getBundleUploadedAt(bundle));
  const reportSubmitted =
    appraisalNotApplicable || (allGroupsAssigned && reportBundles.length > 0 && allBundlesSubmitted);
  const showAppraisalRow = hasApplication && reportSubmitted && headApprovalStatus === 'pending';

  const appraiserName =
    reportBundles.map((bundle) => bundle.appraiserName).filter(Boolean).join(', ') || 'No appraiser assigned';
  const propertyCount = reportBundles.reduce((sum, bundle) => sum + bundle.tctGroupIds.length, 0);
  const firstBundle = reportBundles[0];
  const appraisalNumberDisplay = firstBundle
    ? `${getAppraisalNumber(firstBundle.tctGroupIds)}${reportBundles.length > 1 ? ` +${reportBundles.length - 1} more` : ''}`
    : '—';
  const appraisalDetails = `${appraisalNumberDisplay} · ${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'} · ${appraiserName}`;

  // Same "Requested By" source payment-detail-view.tsx and
  // fee-approvals-view.tsx already use (`application.assignedOfficer`) —
  // the officer who owns this application, not a separate per-report
  // submitter field.
  const requestedByDisplay = application.assignedOfficer ?? '—';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Report Approvals
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Call Report and Appraisal Report submissions from the officer, past and present.
          </Typography>
        </Box>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
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
        ) : (
          <Box sx={{ ...adminCardSx, p: 0, overflow: 'hidden' }}>
            <TableContainer>
              <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        bgcolor: '#FBFBFD',
                        borderBottom: '1px solid #E1E4ED',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#8891A6',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        py: 1.5,
                        px: 2,
                      },
                    }}
                  >
                    <TableCell sx={{ width: '19%' }}>Applicant</TableCell>
                    <TableCell sx={{ width: '12%' }}>Type</TableCell>
                    <TableCell sx={{ width: '26%' }}>Details</TableCell>
                    <TableCell sx={{ width: '14%' }}>Requested By</TableCell>
                    <TableCell sx={{ width: '13%' }}>Submitted On</TableCell>
                    <TableCell sx={{ width: '16%' }}>Status</TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow
                    hover
                    onClick={() => router.push(paths.admin.reportApprovalsDetail('call-report'))}
                    sx={{
                      cursor: 'pointer',
                      '& td': {
                        borderColor: '#EEF0F5',
                        py: 1.375,
                        px: 2,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A' }}>
                        {applicantName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>App No. {appNo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label="Call Report" size="small" sx={{ fontSize: 11.5, fontWeight: 700, bgcolor: '#EEF1FE', color: '#3448B0' }} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>—</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={requestedByDisplay}>
                        {requestedByDisplay}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>{submittedOnLabel}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={callReportRowStatusCopy.tone} label={callReportRowStatusCopy.label} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: '#8891A6' }}>
                        <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  {showAppraisalRow && (
                    <TableRow
                      hover
                      onClick={() => router.push(paths.admin.reportApprovalsDetail('appraisal'))}
                      sx={{
                        cursor: 'pointer',
                        '& td': {
                          borderColor: '#EEF0F5',
                          py: 1.375,
                          px: 2,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A' }}>
                          {applicantName}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: '#8891A6' }}>App No. {appNo}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label="Appraisal Report" size="small" sx={{ fontSize: 11.5, fontWeight: 700, bgcolor: '#FDF2E9', color: '#B15E1F' }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={appraisalDetails}>
                          {appraisalDetails}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={requestedByDisplay}>
                          {requestedByDisplay}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>—</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="warning" label="For Approval" />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" sx={{ color: '#8891A6' }}>
                          <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
