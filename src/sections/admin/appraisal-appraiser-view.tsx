'use client';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin, APPRAISER_ROSTER, getBundleUploadedAt, getBundleCollateralType } from 'src/auth/admin-context';

import type { AppraisalCollateralType } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, StatusBadge, TONE_COLORS, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { getAppraisalNumber } from 'src/utils/get-appraisal-number';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { SAMPLE_APPLICATION } from './sample-application';
import {
  buildSampleAppraisalReport,
  buildSampleChattelReport,
  buildSampleMachineriesReport,
} from './appraisal/sample-appraisal-report';
import { getAppraisalBundleStatus, APPRAISAL_BUNDLE_STATUS_COPY } from './appraisal/appraisal-bundle-status';

// ----------------------------------------------------------------------
// This is the Appraiser's own workspace — framed as personal work ("My
// Assignments"), not an admin-facing approval queue. Follows the exact
// same auto-load convention application-list-view.tsx already uses: once
// hydrated, if there's no live application in the session yet, this page
// calls `loadSample(SAMPLE_APPLICATION)` — the same sample dataset
// Application List loads — so `signUpData` becomes real, active session
// state (not a disabled placeholder).
//
// This page never creates or assigns a bundle itself — "Assign Appraiser"
// is always the Officer's own decision, made on the Collateral/TCT table
// (via its "Assign Appraiser" modal, or its own "Auto-assign All TCTs" dev
// shortcut), never auto-fired just by an appraiser opening this page. If
// no bundle is assigned to this appraiser yet, the list below is simply
// empty until the Officer assigns one.
//
// The table is one row per report bundle assigned to this appraiser,
// showing its TCT number(s), a per-bundle "Fee" status pill, and an
// overall progress status pill — list-only, nothing expands inline.
// Clicking a row navigates to that bundle's own detail page
// (appraisal-appraiser-bundle-view.tsx, at
// paths.admin.appraisalAppraiserBundle(bundleId)), where the fee-decision
// fields and the report form actually live. (An earlier version made each
// row expand inline via a Collapse, showing the fee fields + report form
// directly in the table; that was replaced with real navigation to a
// dedicated page per bundle instead of an in-place toggle.)
//
// "Submit Fee for Approval" itself lives ONLY on the per-bundle detail
// page now (appraisal-appraiser-bundle-view.tsx), not here — an earlier
// version also had that button (plus its own ConfirmDialog/canSubmit
// gate) directly below this table, but it was removed once the detail
// page grew the same action, so the request only ever happens from
// inside an assignment's own page, not duplicated on the list too. The
// "Advise Client" / "Payment Received" card, though, still stays here —
// fee approval is per-bundle (see
// docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md),
// but "Advise Client"/"Payment Received" themselves stay whole-
// application (paymentReceivedAt has no per-bundle framing), so this
// card shows whenever ANY bundle's own fee is approved and unsettled —
// better surfaced on this list (where every bundle's status is visible
// at a glance) than from inside one bundle's page.
//
// (Removed: an "Available for Assignment" section used to sit above this
// table, listing every pledged property not yet claimed by any appraiser
// with a "Claim" button that routed to the Officer's Collateral titles
// table/Assign Appraiser modal — claiming/assigning is the Officer's
// action there, not something this page needs to offer a shortcut into.)
// ----------------------------------------------------------------------

const COLLATERAL_TYPE_LABEL: Record<AppraisalCollateralType, string> = {
  'real-estate': 'Real Estate',
  chattel: 'Chattel',
  machineries: 'Machineries',
};

const FEE_STATUS_COPY: Record<'no-fee' | 'not-submitted' | 'pending-approval' | 'approved' | 'settled' | 'declined', { label: string; tone: SemanticTone }> = {
  'no-fee': { label: 'No Fee', tone: 'neutral' },
  'not-submitted': { label: 'Draft', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  settled: { label: 'Settled', tone: 'success' },
  declined: { label: 'Declined', tone: 'error' },
};

export function AppraisalAppraiserView() {
  const router = useRouter();
  const { signUpData, application, hydrated, loadSample } = useRegistration();
  const {
    review,
    setAppraisal,
    setAppraisalBundleFee,
    setAppraisalBundleReport,
    setAppraisalBundleChattelReport,
    setAppraisalBundleMachineriesReport,
    setCreditInvestigation,
    createAppraisalReportBundle,
    submitAppraisalBundleFeeForApproval,
    approveAppraisalBundleFee,
    declineAppraisalBundleFee,
    resetAppraisalBundleFees,
  } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { clientNotifiedAt, paymentReceivedAt, reportBundles } = review.appraisal;

  const hasApplication = !!signUpData && !!application.personalInfo;

  // Same auto-load convention application-list-view.tsx uses: if the
  // session hydrates with no live application, load the shared sample
  // dataset so `signUpData` becomes real session state (not a disabled
  // placeholder).
  //
  // A brand-new session (reportBundles totally empty — this has never run
  // before) also seeds exactly ONE bundle per collateral kind that has
  // eligible, docs-complete groups — covering every eligible group of
  // that kind together (an appraiser can be assigned several properties
  // at once, as long as they're all the same collateral type — same rule
  // the Collateral table's own "Assign Appraiser" modal enforces via
  // isWrongKind), not a separate bundle per group. So this page shows a
  // default example of every Appraisal Report kind the very first time
  // it's opened — one Real Estate bundle, one Chattel bundle, one
  // Machineries bundle — instead of starting completely empty. This
  // fires ONLY when reportBundles is still empty (same one-time-only
  // gate the original version of this effect used) — once any bundle of
  // any kind exists, assigning another one is the Officer's own decision
  // again, made via the Collateral/TCT table's "Assign Appraiser" modal
  // (or its own "Auto-assign All TCTs" dev shortcut), never auto-fired
  // again just by opening this page.
  useEffect(() => {
    if (!hydrated) return;
    if (!hasApplication) {
      loadSample(SAMPLE_APPLICATION);
      return;
    }
    if (reportBundles.length > 0) return;
    const eligibleGroups = appraisalGroups.filter(
      (entry) => entry.reportId === null && entry.documents.every((doc) => doc.status === 'verified')
    );
    (['real-estate', 'chattel', 'machineries'] as const).forEach((kind, index) => {
      const groupIds = eligibleGroups.filter((group) => group.collateralType === kind).map((group) => group.id);
      if (groupIds.length > 0) {
        createAppraisalReportBundle(groupIds, 'inhouse', APPRAISER_ROSTER[index % APPRAISER_ROSTER.length], null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, reportBundles.length]);

  const [declineBundleId, setDeclineBundleId] = useState<string | null>(null);
  const [declineReasonDraft, setDeclineReasonDraft] = useState('');
  const [adviseClientOpen, setAdviseClientOpen] = useState(false);

  const hasActiveAssignments = !!signUpData && reportBundles.length > 0;

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  // "Approved and unsettled" now spans every bundle whose OWN fee is
  // approved but payment hasn't been received yet — fee approval moved
  // from one whole-application batch status to one per bundle (see
  // docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md).
  // paymentReceivedAt itself stays whole-application (the client-advisory
  // step never had a per-bundle framing), so once it's set every
  // approved bundle is considered settled together.
  const approvedFeeBundles = reportBundles.filter(
    (bundle) => bundle.feeNeeded === 'yes' && bundle.feeApprovalStatus === 'approved'
  );
  const totalFeeAmount = approvedFeeBundles.reduce((sum, bundle) => sum + (Number(bundle.feeAmount) || 0), 0);
  const hasUnsettledApprovedFee = approvedFeeBundles.length > 0 && !paymentReceivedAt;

  const confirmFeeDecline = () => {
    if (!declineReasonDraft.trim() || !declineBundleId) return;
    declineAppraisalBundleFee(declineBundleId, declineReasonDraft.trim());
    setDeclineBundleId(null);
    setDeclineReasonDraft('');
  };

  const confirmAdviseClient = () => {
    const now = new Date().toISOString();
    setAppraisal({ clientNotifiedAt: now, sentToOdooAt: now });
  };

  // Every simulate action below is always visible in the Settings
  // popover, regardless of current state — clicking one "just works" by
  // auto-completing whatever earlier steps it depends on first, instead
  // of only appearing once those steps already happened. Acts on the
  // FIRST bundle needing a decision — fee approval is per-bundle now, so
  // there's no single whole-application status to submit; this mirrors
  // how a tester would naturally work through bundles one at a time via
  // this always-visible shortcut.
  const ensureFeeSubmitted = () => {
    const bundle = reportBundles.find(
      (entry) => entry.feeApprovalStatus === 'not-submitted' || entry.feeApprovalStatus === 'declined'
    );
    if (!bundle) return null;
    if (bundle.feeNeeded === null) {
      setAppraisalBundleFee(bundle.id, {
        feeNeeded: 'yes',
        feeAmount: '2500',
        feeDescription: 'Site visit + valuation fee',
      });
    }
    submitAppraisalBundleFeeForApproval(bundle.id);
    return bundle.id;
  };

  // Simulated second-officer approval/decline, same convention as
  // credit-investigation-view.tsx's CI Fee page actions. Acts on the
  // first bundle awaiting a decision.
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-appraisal-fee-approval',
          label: 'Simulate: Another Officer Approves Appraisal Fee',
          icon: 'solar:user-check-bold-duotone',
          color: '#0C8A4F',
          onClick: () => {
            const bundleId =
              ensureFeeSubmitted() ??
              reportBundles.find((entry) => entry.feeApprovalStatus === 'pending-approval')?.id ??
              null;
            if (bundleId) approveAppraisalBundleFee(bundleId);
          },
        },
        {
          key: 'simulate-appraisal-fee-decline',
          label: 'Simulate: Another Officer Declines Appraisal Fee',
          icon: 'solar:user-cross-bold-duotone',
          color: '#B32C22',
          onClick: () => {
            const bundleId =
              ensureFeeSubmitted() ??
              reportBundles.find((entry) => entry.feeApprovalStatus === 'pending-approval')?.id ??
              null;
            if (bundleId) setDeclineBundleId(bundleId);
          },
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [reportBundles]
    )
  );

  // Dev/testing shortcut: lets a tester who's already on the Appraiser
  // page fast-forward straight into the very first step of the whole
  // pipeline (Credit Investigation's CI Fee request) without navigating
  // back there — same simulated-request convention CiFeeCard's own "Yes,
  // Request CI Fee" uses, just with fixed sample values instead of a
  // typed-in amount/description. Always visible and always re-applies
  // these values regardless of `ciFeeStatus` — clicking it resets CI Fee
  // back to a fresh pending request even if one was already
  // approved/declined, rather than only being reachable once and
  // disappearing.
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-request-ci-fee',
          label: 'Simulate: Request CI Fee',
          icon: 'solar:wallet-money-bold-duotone',
          color: '#1C2A6E',
          onClick: () =>
            setCreditInvestigation({
              ciFeeStatus: 'pending-approval',
              ciFeeAmount: '2500',
              ciFeeAmountDescription: 'Credit investigation fee',
              ciFeeRemarks: '',
              ciFeeSubmittedAt: new Date().toISOString(),
            }),
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    )
  );

  // Always visible — cascades through every prerequisite (submit ->
  // approve every bundle -> advise client) before stamping
  // `paymentReceivedAt`, same "just works from any state" convention
  // every other simulate action on this page now follows. Same
  // underlying transition the "Simulate: Payment Received (Sendit)"
  // button in the visible "Advise client to settle" card below performs
  // — this is the always-available popover shortcut for it, not a
  // duplicate of the officer-facing card itself. Approves every bundle
  // that still needs a decision (not just the first) since
  // `paymentReceivedAt` settles all approved bundles together.
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-payment-received',
          label: 'Simulate: Payment Received (Sendit)',
          icon: 'solar:card-recive-bold-duotone',
          color: '#0C8A4F',
          onClick: () => {
            reportBundles.forEach((bundle) => {
              if (bundle.feeNeeded === null) {
                setAppraisalBundleFee(bundle.id, {
                  feeNeeded: 'yes',
                  feeAmount: '2500',
                  feeDescription: 'Site visit + valuation fee',
                });
              }
              if (bundle.feeApprovalStatus === 'not-submitted' || bundle.feeApprovalStatus === 'declined') {
                submitAppraisalBundleFeeForApproval(bundle.id);
              }
              if (bundle.feeApprovalStatus !== 'approved') {
                approveAppraisalBundleFee(bundle.id);
              }
            });
            const now = new Date().toISOString();
            setAppraisal({ clientNotifiedAt: now, sentToOdooAt: now, paymentReceivedAt: now });
          },
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [reportBundles]
    )
  );

  // Always visible — fills in a full sample report (buildSampleAppraisalReport,
  // shared with AppraisalTctTable's own "Simulate: Appraiser Submits
  // Report" and the per-bundle detail page's equivalent) for every
  // bundle in the batch that doesn't already have one, regardless of fee
  // status — a report can be filled in independently of where the fee
  // request stands, since AppraiserAssignmentCard's own form is never
  // gated on it either. Skips bundles that already have
  // `report.uploadedAt`, so re-clicking after new bundles are assigned
  // never clobbers a report an appraiser (or this same action) already
  // submitted. Passes `submit: false` — fills in the fields only, leaves
  // `uploadedAt` unset so the form stays editable and the appraiser still
  // has to click "Submit Appraisal Report" themselves to actually submit
  // (unlike AppraisalTctTable's own version, which defaults to
  // `submit: true` since its whole purpose is simulating a report that's
  // already been fully submitted).
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-fill-sample-report',
          label: 'Simulate: Fill Sample Report',
          icon: 'solar:document-add-bold-duotone',
          color: '#1C2A6E',
          onClick: () => {
            reportBundles
              .filter((bundle) => !getBundleUploadedAt(bundle))
              .forEach((bundle) => {
                const bundleTctNumbers = appraisalGroups
                  .filter((group) => bundle.tctGroupIds.includes(group.id))
                  .map((group) => group.tctNumber);
                // Exactly one kind's sample report per bundle. External appraisers
                // upload a file on ANY kind (stored on realEstateReport — see
                // appraiser-assignment-card.tsx's external dropzone), so they always
                // get the Real Estate builder's sample-file shape.
                const bundleCollateralType = getBundleCollateralType(bundle, appraisalGroups);
                if (bundle.appraiserType === 'inhouse' && bundleCollateralType === 'chattel') {
                  setAppraisalBundleChattelReport(
                    bundle.id,
                    buildSampleChattelReport(bundle, bundleTctNumbers, applicantName, false)
                  );
                } else if (bundle.appraiserType === 'inhouse' && bundleCollateralType === 'machineries') {
                  setAppraisalBundleMachineriesReport(
                    bundle.id,
                    buildSampleMachineriesReport(bundle, bundleTctNumbers, applicantName, false)
                  );
                } else {
                  setAppraisalBundleReport(
                    bundle.id,
                    buildSampleAppraisalReport(bundle, bundleTctNumbers, applicantName, false)
                  );
                }
              });
          },
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [reportBundles, appraisalGroups, applicantName]
    )
  );

  // Always available — wipes every bundle's own fee flow (status/dates
  // plus its own fee decision) back to its very first state, same
  // `resetAppraisalBundleFees(bundleId)` the bundle detail page also
  // registers this action from, just applied to every bundle here since
  // this is the whole-list view. Does not touch report/assignment data,
  // only fee fields.
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-reset-appraisal-fees',
          label: 'Simulate: Reset Appraisal Fees',
          icon: 'solar:restart-bold-duotone',
          color: '#5A6273',
          onClick: () => reportBundles.forEach((bundle) => resetAppraisalBundleFees(bundle.id)),
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [reportBundles]
    )
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 1 }}
        >
          <Box>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              My Assignments
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Request your fee and submit the report for each property assigned to you, once the
              client has paid.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Appraiser Workspace
          </Typography>
        </Stack>

        <Stack spacing={2}>
          {hasActiveAssignments ? (
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
                      <TableCell sx={{ width: '13%' }}>Appraisal No.</TableCell>
                      <TableCell sx={{ width: '13%' }}>Collateral Type</TableCell>
                      <TableCell sx={{ width: '20%' }}>Collateral No.</TableCell>
                      <TableCell sx={{ width: '20%' }}>Applicant</TableCell>
                      <TableCell sx={{ width: '17%' }}>Appraisal Fee</TableCell>
                      <TableCell sx={{ width: '17%' }}>Status</TableCell>
                      <TableCell sx={{ width: 44 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportBundles.map((bundle) => {
                      const bundleTctNumbers = appraisalGroups
                        .filter((group) => bundle.tctGroupIds.includes(group.id))
                        .map((group) => group.tctNumber);
                      const feeSettled = bundle.feeApprovalStatus === 'approved' && !!paymentReceivedAt;
                      const status = getAppraisalBundleStatus(bundle, feeSettled);
                      const copy = APPRAISAL_BUNDLE_STATUS_COPY[status];
                      const toneColors = TONE_COLORS[copy.tone];

                      const feeStatusKey =
                        bundle.feeApprovalStatus === 'declined'
                          ? 'declined'
                          : bundle.feeNeeded === 'no'
                            ? 'no-fee'
                            : feeSettled
                              ? 'settled'
                              : bundle.feeApprovalStatus === 'approved'
                                ? 'approved'
                                : bundle.feeApprovalStatus === 'pending-approval'
                                  ? 'pending-approval'
                                  : 'not-submitted';
                      const feeCopy = FEE_STATUS_COPY[feeStatusKey];
                      const feeToneColors = TONE_COLORS[feeCopy.tone];
                      const bundleCollateralType = getBundleCollateralType(bundle, appraisalGroups);

                      return (
                        <TableRow
                          key={bundle.id}
                          hover
                          onClick={() => router.push(paths.admin.appraisalAppraiserBundle(bundle.id))}
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
                              {getAppraisalNumber(bundle.tctGroupIds)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone="info" label={COLLATERAL_TYPE_LABEL[bundleCollateralType]} />
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: '#14172A',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {bundleTctNumbers.join(', ')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
                              {applicantName}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
                              App No. {getLoanNumber(signUpData!.email)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                px: 1.1,
                                py: 0.4,
                                borderRadius: '999px',
                                bgcolor: feeToneColors.bg,
                                color: feeToneColors.text,
                                fontSize: 11.5,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {feeCopy.label}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                px: 1.1,
                                py: 0.4,
                                borderRadius: '999px',
                                bgcolor: toneColors.bg,
                                color: toneColors.text,
                                fontSize: 11.5,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {copy.label}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small">
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
          ) : (
            <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 }, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                No active assignments right now — check back once a property is assigned to
                you.
              </Typography>
            </Box>
          )}
        </Stack>

        {signUpData && (
          <>
            {hasActiveAssignments && hasUnsettledApprovedFee && (
              <Stack spacing={1.25} sx={{ ...adminCardSx }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1.5}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                      Advise client to settle the Appraisal fees
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
                      {clientNotifiedAt
                        ? `Sent ${new Date(clientNotifiedAt).toLocaleString()} — request details sent to Odoo, payment link sent via Sendit.`
                        : 'Sends a payment link (Sendit) and notifies Odoo — both simulated.'}
                    </Typography>
                  </Box>
                  {!clientNotifiedAt && (
                    <Button
                      onClick={() => setAdviseClientOpen(true)}
                      variant="contained"
                      size="small"
                      sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
                    >
                      Advise Client
                    </Button>
                  )}
                </Stack>
                {clientNotifiedAt && !paymentReceivedAt && (
                  <Button
                    onClick={() => setAppraisal({ paymentReceivedAt: new Date().toISOString() })}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:card-recive-bold-duotone" width={16} />}
                    sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start', bgcolor: 'common.white' }}
                  >
                    Simulate: Payment Received (Sendit)
                  </Button>
                )}
              </Stack>
            )}
          </>
        )}
      </Stack>

      <ConfirmDialog
        open={!!declineBundleId}
        onClose={() => setDeclineBundleId(null)}
        title="Reason for declining Appraisal Fee"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={declineReasonDraft}
            onChange={(event) => setDeclineReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineReasonDraft.trim()}
            onClick={confirmFeeDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />

      <Dialog
        open={adviseClientOpen}
        onClose={() => setAdviseClientOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>
                Advise Client to Settle
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                Sends a payment link (Sendit) and notifies Odoo — both simulated.
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setAdviseClientOpen(false)} sx={{ mt: -0.5 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {clientNotifiedAt ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 3 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: TONE_COLORS.success.bg }}>
                <Iconify icon="solar:check-circle-bold" width={26} sx={{ color: TONE_COLORS.success.solid }} />
              </Box>
              <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#14172A' }}>
                Client advised to settle
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', textAlign: 'center' }}>
                Sent {new Date(clientNotifiedAt).toLocaleString()} — request details sent to Odoo,
                payment link sent via Sendit.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
                This will notify the client that their Appraisal Fees are ready to be settled, for{' '}
                {approvedFeeBundles.length} propert{approvedFeeBundles.length === 1 ? 'y' : 'ies'} needing a fee.
              </Typography>
              <Stack spacing={1}>
                {approvedFeeBundles.map((bundle) => {
                  const bundleTctNumbers = appraisalGroups
                    .filter((group) => bundle.tctGroupIds.includes(group.id))
                    .map((group) => group.tctNumber);
                  return (
                    <Stack
                      key={bundle.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #EEF0F5' }}
                    >
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A' }}>
                        {bundleTctNumbers.join(', ')}
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1C2A6E' }}>
                        {fCurrency(bundle.feeAmount)}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
              <Divider sx={{ borderColor: '#EEF0F5' }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  Total Appraisal Fees
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1C2A6E' }}>
                  {fCurrency(totalFeeAmount)}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <Stack direction="row" spacing={1.25} sx={{ p: 2.5, pt: 1.5 }}>
          {clientNotifiedAt ? (
            <Button
              onClick={() => setAdviseClientOpen(false)}
              fullWidth
              variant="contained"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                onClick={confirmAdviseClient}
                fullWidth
                variant="contained"
                sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
              >
                Send
              </Button>
              <Button onClick={() => setAdviseClientOpen(false)} variant="outlined" sx={outlinedNavyButtonSx}>
                Cancel
              </Button>
            </>
          )}
        </Stack>
      </Dialog>
    </Container>
  );
}
