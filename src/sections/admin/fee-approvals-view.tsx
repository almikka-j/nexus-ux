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

import { useAdmin, APPRAISER_ROSTER } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { getAppraisalNumber } from 'src/utils/get-appraisal-number';

import { APPRAISAL_DOC_META } from './requirement-checklist-docs';
import { SAMPLE_APPLICATION } from './sample-application';

import type { CiFeeStatus, FeeApprovalStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Merged "Fee Approvals" list — replaces the two former separate list
// pages ci-fee-approval-view.tsx and appraisal-fee-approval-view.tsx
// (both deleted), which each already carried the page title "Fee
// Approvals" on their own. One nav entry ("Fee Approvals," replacing the
// old "Credit Investigation - Fee Approval" / "Appraisal - Fee Approval"
// pair — see config-nav-admin.tsx).
//
// CI Fee is still one flat row (no bundle concept) — its row renders
// UNCONDITIONALLY whenever a live application exists (`hasApplication`),
// same convention application-list-view.tsx uses.
//
// Appraisal Fee is now ONE ROW PER BUNDLE (per appraiser assignment), not
// one combined row — fee approval moved from a single whole-application
// batch status down onto each AppraisalReportBundle itself, so two
// bundles on the same application can be at different approval states
// and are approved/declined independently. See
// docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md
// and docs/155-request-fee-approvals.md. A bundle only gets a row once
// its own fee has actually been proposed and submitted
// (`feeNeeded === 'yes' && feeApprovalStatus !== 'not-submitted'`) — a
// bundle with no fee, or whose fee hasn't been submitted yet, has
// nothing to approve.
//
// Both former screens' auto-seed-on-hydrate effects are preserved in
// spirit (not merged into one generic effect — the two seeding rules are
// genuinely different: CI Fee has no bundle concept, Appraisal Fee
// does), just running together in this one component instead of two.
// `loadSample` only needs to fire once if `!hasApplication` — guarded by
// the same `didSeedApplication` ref both former effects used individually.
//
// Since there's no real multi-application backend in this prototype,
// this list only ever has at most one CI Fee row and a small handful of
// Appraisal Fee rows (one per bundle actually assigned) — same
// "one live application" ceiling every other list page here has.
//
// See docs/155-request-fee-approvals.md.
// ----------------------------------------------------------------------

const CI_FEE_ROW_STATUS_COPY: Record<CiFeeStatus, { label: string; tone: SemanticTone }> = {
  'not-requested': { label: 'Not Requested', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  'not-applicable': { label: 'Not Applicable', tone: 'info' },
};

const APPRAISAL_FEE_ROW_STATUS_COPY: Record<FeeApprovalStatus, { label: string; tone: SemanticTone }> = {
  'not-submitted': { label: 'Not Submitted', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  declined: { label: 'Declined', tone: 'error' },
};

export function FeeApprovalsView() {
  const router = useRouter();
  const { signUpData, application, hydrated, loadSample } = useRegistration();
  const {
    review,
    setCreditInvestigation,
    createAppraisalReportBundle,
    submitAppraisalBundleFeeForApproval,
  } = useAdmin();
  const { ciFeeStatus, ciFeeAmount, ciFeeAmountDescription } = review.creditInvestigation;
  const { appraisalGroups } = review.requirementChecklist;
  const { reportBundles } = review.appraisal;

  const hasApplication = !!signUpData && !!application.personalInfo;

  // CI Fee's auto-seed rule, unchanged from ci-fee-approval-view.tsx: load
  // the sample application once if there's no live application yet; then,
  // whenever ciFeeStatus is 'not-requested' or 'not-applicable', re-seed a
  // fresh 'pending-approval' request. Deliberately excludes 'approved' —
  // that's a real terminal decision.
  const didSeedApplication = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!hasApplication) {
      if (didSeedApplication.current) return;
      didSeedApplication.current = true;
      loadSample(SAMPLE_APPLICATION);
      return;
    }
    if (ciFeeStatus === 'not-requested' || ciFeeStatus === 'not-applicable') {
      setCreditInvestigation({
        ciFeeStatus: 'pending-approval',
        ciFeeAmount: '3500',
        ciFeeAmountDescription: 'Field verification + report preparation fee',
        ciFeeDeclineReason: '',
        ciFeeSubmittedAt: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, ciFeeStatus]);

  // Appraisal Fee's auto-seed rule: seed one sample bundle with a fee
  // decision, then submit that bundle's own fee for approval — so this
  // list always has at least one genuinely reviewable Appraisal Fee row
  // on a fresh session. Unlike the old batch-level version, this never
  // needs to loop over every bundle re-submitting them — each bundle
  // submits independently, once, the first time it has a fee decision
  // and hasn't been submitted yet.
  const hasBundleNeedingSubmit = reportBundles.some(
    (bundle) => bundle.feeNeeded === 'yes' && bundle.feeApprovalStatus === 'not-submitted'
  );
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
      }
      return;
    }
    const bundleNeedingSubmit = reportBundles.find(
      (bundle) => bundle.feeNeeded === 'yes' && bundle.feeApprovalStatus === 'not-submitted'
    );
    if (bundleNeedingSubmit) {
      submitAppraisalBundleFeeForApproval(bundleNeedingSubmit.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, reportBundles.length, hasBundleNeedingSubmit]);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const appNo = signUpData ? getLoanNumber(signUpData.email) : '';

  const ciRowStatusCopy = CI_FEE_ROW_STATUS_COPY[ciFeeStatus];

  // One row per bundle that actually needs a fee decision and has been
  // submitted at least once — a bundle with feeNeeded !== 'yes', or one
  // whose fee hasn't been submitted yet, has nothing to show here.
  const appraisalFeeRows = reportBundles.filter(
    (bundle) => bundle.feeNeeded === 'yes' && bundle.feeApprovalStatus !== 'not-submitted'
  );

  // Same "Requested By" source payment-detail-view.tsx already uses
  // (`application.assignedOfficer`) — the officer who owns this
  // application, not a separate per-fee-request field (neither
  // CreditInvestigation nor Appraisal track who submitted the request).
  const requestedByDisplay = application.assignedOfficer ?? '—';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Fee Approvals
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Credit Investigation and Appraisal fee requests from the officer, past and present.
          </Typography>
        </Box>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:wallet-money-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
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
                    <TableCell sx={{ width: '15%' }}>Requested By</TableCell>
                    <TableCell sx={{ width: '12%' }}>Amount</TableCell>
                    <TableCell sx={{ width: '16%' }}>Status</TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow
                    hover
                    onClick={() => router.push(paths.admin.feeApprovalsDetail('ci-fee'))}
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
                      <Chip label="CI Fee" size="small" sx={{ fontSize: 11.5, fontWeight: 700, bgcolor: '#EEF1FE', color: '#3448B0' }} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={ciFeeAmountDescription}>
                        {ciFeeAmountDescription || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={requestedByDisplay}>
                        {requestedByDisplay}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1C2A6E' }}>
                        {fCurrency(ciFeeAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={ciRowStatusCopy.tone} label={ciRowStatusCopy.label} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: '#8891A6' }}>
                        <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  {appraisalFeeRows.map((bundle) => {
                    const appraisalRowStatusCopy = APPRAISAL_FEE_ROW_STATUS_COPY[bundle.feeApprovalStatus];
                    const propertyCount = bundle.tctGroupIds.length;
                    const appraisalDetails = `${getAppraisalNumber(bundle.tctGroupIds)} · ${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'} · ${bundle.appraiserName ?? 'No appraiser assigned'}`;
                    return (
                      <TableRow
                        key={bundle.id}
                        hover
                        onClick={() => router.push(paths.admin.feeApprovalsDetail('appraisal-fee', bundle.id))}
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
                          <Chip label="Appraisal Fee" size="small" sx={{ fontSize: 11.5, fontWeight: 700, bgcolor: '#FDF2E9', color: '#B15E1F' }} />
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
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1C2A6E' }}>
                            {fCurrency(bundle.feeAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={appraisalRowStatusCopy.tone} label={appraisalRowStatusCopy.label} />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" sx={{ color: '#8891A6' }}>
                            <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
