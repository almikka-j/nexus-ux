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
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { getAppraisalNumber } from 'src/utils/get-appraisal-number';

import { APPRAISAL_DOC_META } from './requirement-checklist-docs';
import { SAMPLE_APPLICATION } from './sample-application';

import type { FeeApprovalStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Personal workspace for the Appraisal Fee Approver — framed as "Fee
// Approvals," their own inbox of Appraisal Fee requests waiting on a
// decision, not a generic admin-facing queue. Same role-workspace
// treatment as appraisal-appraiser-view.tsx's "My Assignments" and
// ci-fee-approval-view.tsx's "My Approvals": an "APPRAISAL FEE APPROVER"
// eyebrow label, first-person copy, and no sample filler rows — a real
// approver's inbox would never show other people's unrelated requests.
//
// Restructured from a single flat page into a list -> detail split,
// mirroring appraisal-appraiser-view.tsx (list) ->
// appraisal-appraiser-bundle-view.tsx (detail) exactly. This page is now
// ONLY the list: one row per pending fee request, styled as a table
// matching the Appraiser list's own shape and column order (Appraisal
// No. leads, same as appraisal-appraiser-view.tsx's own table, then
// Applicant/Properties/Appraiser/Total Appraisal Fee/Status) — Appraisal
// No. and Appraiser were added, and Appraisal No. moved to lead the row,
// since a fee request otherwise had no reference number or appraiser
// name visible at a glance from the list. Both show the FIRST bundle's
// own value plus a "+N more" suffix when the request bundles more than
// one property (`getAppraisalNumber(firstBundle.tctGroupIds)` for the number,
// deduplicated `appraiserName`s for the appraiser — a request can list
// more than one distinct appraiser if its bundles were assigned to
// different people), rather than cramming every bundle's value into one
// cell. Clicking a row navigates to appraisal-fee-approval-bundle-view.tsx
// (paths.admin.appraisalFeeApprovalBundle()) — the actual fee breakdown,
// StatusBadge/FactChip header card, and Approve/Decline actions all live
// there now, not here. (An earlier version rendered the pending request's
// full detail inline on this same page; that content moved wholesale to
// the new detail page instead.)
//
// Each pledged property proposes its own fee decision (Yes/No + amount)
// inline in the Assign Appraiser modal on the Appraisal page — this
// workflow never approves one property's fee in isolation. It reviews the
// whole batch (`review.appraisal.reportBundles`, each with its own
// feeNeeded/feeAmount/feeDescription/feeRemarks) as one request once the
// officer has submitted it (`feeApprovalStatus === 'pending-approval'`),
// and approves or declines all of it in a single action on the detail
// page — that hasn't changed, only where it's rendered has. Since there's
// no real multi-application backend in this prototype, this list only
// ever has at most one real row (the current live application's request,
// if pending) — same as every other list page here.
//
// Same auto-load-and-seed convention appraisal-appraiser-view.tsx uses:
// if the session hydrates with no live application, load the shared
// sample dataset so `signUpData` becomes real session state instead of a
// disabled placeholder. Since this page needs an actual PENDING request
// to show anything, the same effect goes one step further than the
// Appraiser list's own seed — it also gives the seeded bundle a real fee
// decision and immediately submits it, landing directly in
// `pending-approval` — so there's always one real, active, clickable
// request to look at on a fresh session, not an empty list. (An earlier
// version stopped at loading the sample application and left the fee
// request itself to be driven manually from the Appraiser pages first;
// that was changed so this list follows the same "always show one real
// active example" convention every other list page in this app already
// does, rather than being the one exception.)
//
// The live application's row ALWAYS shows whenever a live application
// exists in the session — same convention application-list-view.tsx uses
// (its `liveRows` render unconditionally whenever `hasApplication` is
// true, regardless of which step/status she's actually at). An earlier
// version of this page gated the row behind `feeApprovalStatus ===
// 'pending-approval'`, so approving/declining the request made the row
// vanish entirely and the table fall back to an empty state — the row is
// now always present and clickable; only its StatusBadge tone/label and
// the detail page's available actions vary by status.
// ----------------------------------------------------------------------

const APPRAISAL_FEE_ROW_STATUS_COPY: Record<FeeApprovalStatus, { label: string; tone: SemanticTone }> = {
  'not-submitted': { label: 'Not Submitted', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  declined: { label: 'Declined', tone: 'error' },
};

export function AppraisalFeeApprovalView() {
  const router = useRouter();
  const { signUpData, application, hydrated, loadSample } = useRegistration();
  const { review, createAppraisalReportBundle, submitAppraisalFeesForApproval } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { feeApprovalStatus, reportBundles } = review.appraisal;

  const hasApplication = !!signUpData && !!application.personalInfo;

  // Same auto-load-and-seed convention appraisal-appraiser-view.tsx uses,
  // taken one step further: if the session hydrates with no live
  // application, load the shared sample dataset; then, since this page
  // needs an actual PENDING fee request to show anything (not just an
  // assigned bundle), seed one directly into that state — covering every
  // still-unassigned, docs-complete appraisalGroups entry in one bundle
  // (same completeness gate the Appraiser list's own seed uses) with a
  // ready-made 'yes'/₱5,000 fee decision passed straight into
  // createAppraisalReportBundle's optional `fee` argument, then
  // immediately calling submitAppraisalFeesForApproval() so it lands
  // directly in `pending-approval` — the one state this list actually
  // renders a row for. This mirrors the Appraiser list's own "always show
  // one real, active example" convention rather than leaving a fresh
  // session's Fee Approvals list empty until someone manually drives the
  // Appraiser flow first.
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
        submitAppraisalFeesForApproval();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, reportBundles.length]);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const rowStatusCopy = APPRAISAL_FEE_ROW_STATUS_COPY[feeApprovalStatus];

  const feeBundles = reportBundles.filter((bundle) => bundle.feeNeeded === 'yes');
  const totalFeeAmount = feeBundles.reduce((sum, bundle) => sum + (Number(bundle.feeAmount) || 0), 0);

  // A single bundle already covers however many properties were assigned
  // together (bundle.tctGroupIds, one consolidated Assign Appraiser
  // selection) — "Properties" counts every TCT group across every bundle
  // in the whole request, not the number of bundles themselves (a request
  // with one multi-collateral bundle covering 5 TCTs is 5 properties, not
  // 1 — reportBundles.length alone would undercount it as 1).
  const propertyCount = reportBundles.reduce((sum, bundle) => sum + bundle.tctGroupIds.length, 0);

  // A request can also span more than one AppraisalReportBundle (its own
  // appraisal number, possibly its own appraiser) if the officer assigned
  // different pledged properties to separate bundles — this table only
  // ever has one row per whole request (see header comment above), so it
  // shows the first bundle's own appraisal number/appraiser plus a "+N more"
  // suffix rather than trying to cram every bundle's values into one cell.
  const firstBundle = reportBundles[0];
  const appraisalNumberDisplay = firstBundle
    ? `${getAppraisalNumber(firstBundle.tctGroupIds)}${reportBundles.length > 1 ? ` +${reportBundles.length - 1} more` : ''}`
    : '—';
  const uniqueAppraiserNames = Array.from(
    new Set(reportBundles.map((bundle) => bundle.appraiserName).filter((name): name is string => !!name))
  );
  const appraiserDisplay = uniqueAppraiserNames.length
    ? `${uniqueAppraiserNames[0]}${uniqueAppraiserNames.length > 1 ? ` +${uniqueAppraiserNames.length - 1} more` : ''}`
    : 'No appraiser assigned';

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
              Fee Approvals
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Appraisal fee requests from the officer, past and present.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Appraisal Fee Approver
          </Typography>
        </Stack>

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
                    <TableCell sx={{ width: '15%' }}>Appraisal No.</TableCell>
                    <TableCell sx={{ width: '20%' }}>Applicant</TableCell>
                    <TableCell sx={{ width: '10%' }}>Properties</TableCell>
                    <TableCell sx={{ width: '18%' }}>Appraiser</TableCell>
                    <TableCell sx={{ width: '17%' }}>Total Appraisal Fee</TableCell>
                    <TableCell sx={{ width: '15%' }}>Status</TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow
                    hover
                    onClick={() => router.push(paths.admin.appraisalFeeApprovalBundle())}
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
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={appraiserDisplay}>
                        {appraiserDisplay}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1C2A6E' }}>
                        {fCurrency(totalFeeAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={rowStatusCopy.tone} label={rowStatusCopy.label} />
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
        )}
      </Stack>
    </Container>
  );
}
