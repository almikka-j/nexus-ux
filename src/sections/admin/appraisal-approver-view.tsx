'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
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

import { useAdmin, APPRAISER_ROSTER } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { getAppraisalNumber } from 'src/utils/get-appraisal-number';

import { APPRAISAL_DOC_META } from './requirement-checklist-docs';
import { SAMPLE_APPLICATION } from './sample-application';
import { buildSampleAppraisalReport } from './appraisal/sample-appraisal-report';

// ----------------------------------------------------------------------
// Personal workspace for the Head/Approver's "reviewed and noted" Head
// Approval step — framed as "My Approvals," their own inbox of appraisals
// waiting on a decision once every pledged property's report bundle has
// been submitted (same reportSubmitted computation appraisal-view.tsx
// uses to unlock its own Head Approval card, duplicated here rather than
// shared since the two files don't currently import from each other).
//
// Restructured from a single flat page into a list -> detail split, same
// convention as appraisal-fee-approval-view.tsx (list) ->
// appraisal-fee-approval-bundle-view.tsx (detail) and
// appraisal-appraiser-view.tsx (list) -> appraisal-appraiser-bundle-view.tsx
// (detail). This page is now ONLY the list: one row for the pending
// appraisal, styled as a table matching those same list pages' shape
// (Appraisal No. leads, then Applicant/Properties/Appraiser/Status).
// Clicking the row navigates to appraisal-approver-bundle-view.tsx
// (paths.admin.appraisalApproverBundle()) — the actual report content and
// Approve/Decline actions live there now, so the Head Approver can review
// what the appraiser actually submitted before deciding, not just see a
// bare applicant summary. (An earlier version rendered the pending
// appraisal's full applicant summary + Approve/Decline inline on this same
// page, with no visibility into the report itself; that content moved
// wholesale to the new detail page instead, which additionally now shows
// the report.)
//
// Same auto-load-and-seed convention appraisal-appraiser-view.tsx and
// appraisal-fee-approval-view.tsx use, taken one step further than either:
// this list only ever shows a row once every pledged property's report is
// actually submitted (`reportSubmitted`), so a fresh session needs a bundle
// seeded all the way through fee-settled + report-submitted, not just
// assigned or just fee-approved. Once hydrated, if there's no live
// application, loads the shared SAMPLE_APPLICATION; if there are no
// reportBundles yet, seeds one covering every still-unassigned,
// docs-complete appraisalGroups entry (same completeness gate the other two
// pages' seeds use) with the fee already settled
// (feeApprovalStatus/paymentReceivedAt stamped directly via setAppraisal,
// skipping the request/approve steps since nothing on this page needs them
// mid-flight); a second effect then fills in each such bundle's report via
// buildSampleAppraisalReport(..., true) (submit: true, unlike the
// Appraiser/Fee list seeds' own report-filling actions, which leave
// uploadedAt unset for the appraiser to submit by hand) the moment the
// bundle exists but its report doesn't, so the table always shows one
// genuinely active "For Approval" row on a fresh session — same "the first
// application is always the live active one" convention every list page
// here follows.
// ----------------------------------------------------------------------

export function AppraisalApproverView() {
  const router = useRouter();
  const { signUpData, application, hydrated, loadSample } = useRegistration();
  const { review, setAppraisal, createAppraisalReportBundle, setAppraisalBundleReport } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { headApprovalStatus, reportBundles } = review.appraisal;

  const hasApplication = !!signUpData && !!application.personalInfo;

  useEffect(() => {
    if (!hydrated) return;
    if (!hasApplication) {
      loadSample(SAMPLE_APPLICATION);
      return;
    }
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
          feeApprovalStatus: 'approved',
          feeSubmittedAt: now,
          feeApprovedAt: now,
          clientNotifiedAt: now,
          sentToOdooAt: now,
          paymentReceivedAt: now,
        });
      }
      return;
    }
    const bundleNeedingReport = reportBundles.find((bundle) => !bundle.report.uploadedAt);
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
  }, [hydrated, hasApplication, reportBundles.length, reportBundles.some((bundle) => !bundle.report.uploadedAt)]);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  const allGroupsAssigned = appraisalGroups.every((group) => group.reportId !== null);
  const allBundlesSubmitted = reportBundles.every((bundle) => !!bundle.report.uploadedAt);
  const reportSubmitted =
    appraisalNotApplicable || (allGroupsAssigned && reportBundles.length > 0 && allBundlesSubmitted);
  const isPending = !!signUpData && reportSubmitted && headApprovalStatus === 'pending';

  const appraiserName =
    reportBundles.map((bundle) => bundle.appraiserName).filter(Boolean).join(', ') || 'No appraiser assigned';

  // Same fix as the Fee Approvals list's own "Properties" column — a
  // single bundle already covers however many properties were assigned
  // together (bundle.tctGroupIds), so this counts every TCT group across
  // every bundle, not the number of bundles themselves.
  const propertyCount = reportBundles.reduce((sum, bundle) => sum + bundle.tctGroupIds.length, 0);

  // A request can span more than one AppraisalReportBundle, same as the Fee
  // Approvals list — shows the first bundle's own appraisal number plus a
  // "+N more" suffix rather than cramming every bundle's number into one
  // cell.
  const firstBundle = reportBundles[0];
  const appraisalNumberDisplay = firstBundle
    ? `${getAppraisalNumber(firstBundle.tctGroupIds)}${reportBundles.length > 1 ? ` +${reportBundles.length - 1} more` : ''}`
    : '—';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 1 }}
        >
          <Box>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              My Approvals
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Appraisals with every report submitted, waiting on your review.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Head / Approver
          </Typography>
        </Stack>

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
                    <TableCell sx={{ width: '18%' }}>Appraisal No.</TableCell>
                    <TableCell sx={{ width: '27%' }}>Applicant</TableCell>
                    <TableCell sx={{ width: '12%' }}>Properties</TableCell>
                    <TableCell sx={{ width: '23%' }}>Appraiser</TableCell>
                    <TableCell sx={{ width: '20%' }}>Status</TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow
                    hover
                    onClick={() => router.push(paths.admin.appraisalApproverBundle())}
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
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={appraisalNumberDisplay}>
                        {appraisalNumberDisplay}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A' }}>
                        {applicantName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
                        App No. {getLoanNumber(signUpData.email)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
                        {propertyCount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={appraiserName}>
                        {appraiserName}
                      </Typography>
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
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:clipboard-check-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing waiting on you right now
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              {headApprovalStatus === 'approved'
                ? `You already reviewed and noted the appraisal for ${applicantName}.`
                : 'No application currently has every appraisal report submitted and awaiting your review.'}
            </Typography>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
