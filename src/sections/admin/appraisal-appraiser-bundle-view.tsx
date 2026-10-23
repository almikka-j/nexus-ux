'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, StatusBadge, TONE_COLORS, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { getAppraisalNumber } from 'src/utils/get-appraisal-number';
import { CollapsibleSection, CollapsibleSectionBadge } from 'src/components/collapsible-section';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ReadOnlyRequirementDocRow } from './credit-investigation/credit-investigation-doc-row';
import { APPRAISAL_DOC_META } from './requirement-checklist-docs';
import { AppraiserAssignmentCard, AppraisalReportSubmitCard } from './appraisal/appraiser-assignment-card';
import { buildSampleAppraisalReport } from './appraisal/sample-appraisal-report';

import type { AppraisalCollateralType } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Per-bundle detail page for the Appraiser — reached by clicking a row on
// "My Assignments" (appraisal-appraiser-view.tsx), at
// paths.admin.appraisalAppraiserBundle(bundleId). This is a real page
// navigation, not an inline expand/collapse: the list page only ever
// shows the table (TCT number, applicant, fee status, progress status),
// and every bundle's own details/documents/fee-decision fields/report
// form live here instead. An earlier version made each list row expand in
// place via a Collapse; that toggle was removed in favor of this
// dedicated page so there's nothing to expand/collapse on the list at
// all.
//
// Render order matches the appraiser's actual workflow: (1) a single
// header card matching the system's standard summary-card shape (same as
// application-details-card.tsx/application-review-header.tsx) — a 42px
// icon-avatar + Appraisal No. (getAppraisalNumber(bundle.tctGroupIds)) as the
// title (15px/800, not a page-heading size) + applicant/App No.
// subtitle, a `StatusBadge` top-right, then a bordered/tinted `FactChip`
// strip below (local copy of application-details-card.tsx's own
// unexported FactChip — same 11px uppercase label / 13.5px bold value
// shape) for Collateral (TCT numbers, comma-joined), Collateral Type,
// Appraiser Type, Assigned To, and Target Completion. There is no
// separate "Appraisal Details" heading — the header and the fields read
// as one continuous card, not two stacked sections. (An earlier version
// used the joined TCT number list itself as a 22px/800 giant page-style
// title with a bare title/subtitle — no icon avatar, no StatusBadge
// reuse, plain floating label/value pairs instead of a FactChip strip —
// which read as a one-off design rather than matching this app's
// established summary-card convention; it was rebuilt to match that
// convention instead of inventing its own.); (2) an **Appraisal Fee**
// card — the fee-status pill (FEE_STATUS_COPY, same No Fee/Draft/For
// Approval/Approved/Settled tones the list page's table pill uses)
// beside the "Appraisal Fee" title, plus a "Request Appraisal Fee"
// button (relabeled "View Appraisal Fee" and outlined once
// `!feeEditable`) that opens a `Dialog`, not an inline panel — same
// modal convention this page's sibling list page
// (appraisal-appraiser-view.tsx) already uses for "Advise Client to
// Settle" (DialogTitle with a close IconButton, DialogContent, a footer
// action row). Opening the modal on a bundle whose fee decision is still
// undecided (`feeNeeded === null`) defaults it to `'yes'` right then —
// Yes is the common case, so the modal opens with it already selected
// instead of forcing a click just to confirm the likely answer; No is
// still one click away. Inside the modal: while `feeEditable`
// (`feeApprovalStatus === 'not-submitted' || 'declined'`), the Yes/No
// FeeNeededOption pair + Request Amount/Description/Remarks fields for
// *this* bundle,
// followed by a "Submit Fee for Approval" button — gated on `canSubmit`
// (this bundle's own fee decision is complete). Fee approval is per-
// bundle (see
// docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md):
// submitting only sends THIS bundle's own fee, never a sibling bundle's,
// and there is no whole-application gate requiring every bundle to have
// a decision first. Once submitted, the same modal instead shows a
// read-only summary (amount/description/remarks, or "No fee needed")
// plus a "Requested on {date}" line sourced from this bundle's own
// `feeSubmittedAt` (an ISO string stamped by
// `submitAppraisalBundleFeeForApproval(bundleId)` the moment this
// bundle's fee is sent, same `new Date().toISOString()` convention every
// other admin-context.tsx timestamp uses — cleared back to `null` if
// this bundle's fee is later declined, since a decline effectively
// un-submits it), and the trigger button relabels to "View" with no
// submit footer. (An earlier version moved that read-only summary out of
// the modal entirely, straight onto the card, and dropped the
// button/modal for that case — reverted back to the modal since it reads
// better kept consistent with the editable flow rather than splitting
// the fee UI across two different presentations.) Separately, once
// `!feeEditable` (this bundle's own fee has actually been submitted —
// pending-approval, approved, or settled), a "{amount} requested"
// subtitle shows under the title/badge row on the card itself, so the
// appraiser can see at a glance what was actually requested without
// opening the "View Appraisal Fee" modal at all; only shown when
// `feeNeeded === 'yes'`, since a no-fee bundle has no amount to summarize
// this way — that case already has its own "No Fee" badge. Deliberately
// absent while still `feeEditable` (a draft, not yet submitted) — an
// in-progress Yes/No + amount decision the appraiser hasn't sent yet
// isn't a "request" to summarize on the card; it only earns the subtitle
// once it's actually
// been requested.
//
// Every "Simulate: ..." dev/testing shortcut this page registers
// (`useRegisterPageActions`, surfaced in the layout settings popover) is
// ALWAYS visible, regardless of current state — an earlier version only
// showed "Approve/Decline" while `feeApprovalStatus === 'pending-approval'`
// and "Payment Received" only once advised, meaning most of the popover
// was empty on a fresh bundle. Instead, every action now calls a shared
// `ensureFeeSubmitted()` helper first: if THIS bundle's own fee is still
// `not-submitted` or `declined`, it fills in this bundle's fee decision
// (sample ₱2,500, if still `feeNeeded === null`) and calls
// `submitAppraisalBundleFeeForApproval(bundleId)`, so there's always
// something real to approve/decline/settle no matter which button gets
// clicked first — every action here only ever touches this one bundle,
// never a sibling bundle on the same application (fee approval is
// per-bundle, see
// docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md).
// "Simulate: Another Officer Approves/Declines Appraisal Fee" — repeated
// here from the sibling list page (appraisal-appraiser-view.tsx) so a
// tester who navigated straight into a single bundle's detail page
// doesn't have to go back to the list — ensures submission, then approve
// calls `approveAppraisalBundleFee(bundleId)` directly; decline opens
// this page's own `ConfirmDialog` (a local copy of the list page's
// decline dialog, not a shared component) asking for a reason, then
// calls `declineAppraisalBundleFee(bundleId, reason)`. "Simulate:
// Payment Received (Sendit)" cascades further still — ensures
// submission, approves this bundle's fee if not already approved, then
// stamps the whole-application `clientNotifiedAt`/`sentToOdooAt`/
// `paymentReceivedAt` all at once (these three stay whole-application,
// not per-bundle — see admin-context.tsx's `Appraisal` type) — so
// clicking it alone from a completely fresh bundle takes it all the way
// to "Settled" in one click.
// "Simulate: Fill Sample Report" is independent of all of the above — a
// report can be filled in whenever, it's never gated on the fee — and
// fills in `buildSampleAppraisalReport()`'s data
// (`src/sections/admin/appraisal/sample-appraisal-report.ts`, the same
// sample values `AppraisalTctTable`'s own "Simulate: Appraiser Submits
// Report" and the list page's equivalent action produce) for just this
// one bundle, if it doesn't already have `report.uploadedAt`. Unlike
// `AppraisalTctTable`'s own version, this one passes `buildSampleAppraisalReport`'s
// `submit` argument as `false` — it only fills in the fields as a
// starting point to review/edit, it does NOT also set `uploadedAt`
// (an earlier version passed the default `submit: true`, which
// auto-submitted the report the instant the button was clicked, locking
// every field read-only immediately — the tester never got a chance to
// look at or tweak the sample values before they became permanent). The
// form (and each TCT's Collateral Photo dropzone) stays fully editable
// after clicking this, exactly like it would after the appraiser typed
// the same values in by hand — "Submit Appraisal Report" still has to be
// clicked separately to actually submit and lock it.
//
// `feeApprovalStatus: 'declined'` (this bundle's own, per-bundle field
// now) is a real, visible status — not an instant silent reset.
// `declineAppraisalBundleFee(bundleId, reason)` sets this bundle's own
// `feeApprovalStatus: 'declined'` and stores its own `feeDeclineReason`,
// but deliberately leaves its `feeNeeded`/`feeAmount`/`feeDescription`/
// `feeRemarks` exactly as they were (an earlier version wiped them back
// to blank/null on decline — changed so revising means editing what's
// there, not retyping from scratch). `feeEditable` is
// `feeApprovalStatus === 'not-submitted' || 'declined'`, so a declined
// bundle behaves exactly like a fresh draft: the Appraisal Fee card shows
// a "Declined" badge (`tone: 'error'`) instead of "Draft", plus a full
// "Reason for decline" banner as its own row below the title/button row
// (a warning-triangle Iconify icon + uppercase label + the stored
// `feeDeclineReason`, tinted with `TONE_COLORS.error` — the same
// canonical error tone every other error-toned surface in the admin app
// pulls from `src/components/admin-ui/admin-tokens.ts`, not one-off hex
// values) — so the reason is visible at a glance without opening the
// modal at all. (An earlier version crammed a single-line "Declined:
// {reason}" directly under the title, in a hand-picked red hex; rebuilt
// as this bordered/tinted banner, matching the design system's actual
// error tone.) The button reads "Request Appraisal Fee" again (not
// "View"), and Appraisal Documents un-collapses back into its
// always-open editable state. The fee modal itself does NOT repeat this
// banner — an earlier version showed the identical banner inside the
// modal too, above the editable fields, but that duplicated what the
// card right behind it already shows the moment the modal is closed, so
// it was removed; the reason lives on the card only now. Editing the
// fields and clicking "Submit Fee for Approval" again is the exact same
// action as the very first submission, just starting from the previous
// values instead of blank ones.
// `submitAppraisalBundleFeeForApproval(bundleId)` clears this bundle's
// own `feeDeclineReason` back to `''` the moment it's called, so a stale
// reason never lingers once resubmitted. (3) Appraisal Documents — every
// APPRAISAL_DOC_META document for
// each pledged property this bundle covers, read-only
// (ReadOnlyRequirementDocRow, same as credit-investigation-view.tsx's own
// Document Checklist), wrapped in the shared `CollapsibleSection`
// component (`src/components/collapsible-section`) — the same
// chevron+badge+animated-Collapse shell Document Checklist,
// Requirement Checklist's per-tab groups, etc. all already use, so this
// card collapses/expands the same way every other document list in the
// admin app does instead of always rendering fully open with a plain
// static title. The badge shows `docsReceivedCount` (every doc across
// every pledged property whose status isn't `'missing'`) out of
// `APPRAISAL_DOC_META.length * bundleGroups.length`, with a green
// checkmark once that ratio is 100% — same "N/total on file" +
// complete-checkmark convention `CollapsibleSectionBadge` already
// standardizes (see below for the collapsed-by-default detail); this
// page is the only place an Appraiser can see these
// documents at all, since AppraisalTctTable's own per-row document
// expansion lives on the Officer's page instead. (4) either
// AppraiserAssignmentCard (the report form, once `feeSettled`) or a
// locked message, same as before.
//
// Appraisal Documents is NOT collapsible at all while the fee decision
// is still editable (`docsCollapsible = !feeEditable`, so
// not-submitted OR declined both keep it locked open) — same "not
// clickable until a condition is met" convention
// appraisal-tct-table.tsx's own Collateral titles table header uses for
// its `allGroupsAssigned` gate. While `!docsCollapsible`, this renders as
// a plain always-open header (title + badge, no chevron, no onClick) —
// document review is still the thing the appraiser needs to be looking
// at while deciding the fee, so there's nothing to tuck away yet. Once
// `docsCollapsible` is true, it renders wrapped in the shared
// `CollapsibleSection` instead, and immediately auto-collapses: a
// `wasFeeEditableRef` + `useEffect` (same "collapse on transition, not on
// every render" convention credit-investigation-view.tsx uses for its
// own `checklistExpanded`) sets `docsExpanded` to `false` the instant
// `feeEditable` flips from `true` to `false` — covering both
// not-submitted -> submitted and declined -> resubmitted, since either
// one means the checklist the appraiser was reviewing while deciding the
// fee is no longer the thing needing attention, so it tucks itself away.
// It only fires on that specific transition, so a manual re-open
// afterward is never fought by the effect re-collapsing it. When
// a bundle covers more than one TCT, each property's own document list is
// its own nested `CollapsibleSection` too (a "TCT-2024-00981" title + its
// own badge/checkmark, wrapped in a bordered box) — and unlike the outer
// section, these per-property groups are ALWAYS collapsible, independent
// of `docsCollapsible`/the fee gate: there's no reason to lock away the
// ability to tuck one property's already-reviewed documents aside just
// because this bundle's own fee hasn't been submitted yet. `expandedGroupIds`
// tracks which ones are open (absent from that set means collapsed, the
// default for every group), so expanding one property's list never
// affects any other. A bundle covering only one TCT skips that extra
// nesting level entirely — there's nothing to disambiguate between when
// there's only one property.
// (An earlier version made this always collapsible regardless of fee
// status, closed by default from the very first load; that was reverted
// back to this fee-gated version per explicit direction.)
//
// (The fee UI briefly lived as an inline card directly on this page
// (Yes/No + fields + submit, no modal) between Documents and the report
// form; it was removed entirely, then rebuilt as this modal instead of
// an inline card, matching the "Advise Client" modal convention on the
// sibling list page rather than re-adding another bare card.)
// ----------------------------------------------------------------------

const STATUS_COPY: Record<'on-process' | 'for-approval' | 'for-report' | 'reported', { label: string; tone: SemanticTone }> = {
  'on-process': { label: 'On Process', tone: 'neutral' },
  'for-approval': { label: 'For Approval', tone: 'warning' },
  'for-report': { label: 'For Report', tone: 'info' },
  reported: { label: 'Reported', tone: 'success' },
};

const FEE_STATUS_COPY: Record<'no-fee' | 'not-submitted' | 'pending-approval' | 'approved' | 'settled' | 'declined', { label: string; tone: SemanticTone }> = {
  'no-fee': { label: 'No Fee', tone: 'neutral' },
  'not-submitted': { label: 'Draft', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  settled: { label: 'Settled', tone: 'success' },
  declined: { label: 'Declined', tone: 'error' },
};

const COLLATERAL_TYPE_LABEL: Record<AppraisalCollateralType, string> = {
  'real-estate': 'Real Estate',
  chattel: 'Chattel',
  machineries: 'Machineries',
};

const APPRAISER_TYPE_LABEL: Record<'inhouse' | 'external', string> = {
  inhouse: 'In-house',
  external: 'External',
};

// Same label-over-value chip convention as application-details-card.tsx's
// own FactChip (not exported from there — kept in sync manually rather
// than sharing a module, same as every other admin file that reimplements
// this exact shape).
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

function FeeNeededOption({
  needed,
  selected,
  onSelect,
}: {
  needed: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = needed ? 'Yes' : 'No';

  return (
    <Box
      onClick={onSelect}
      role="button"
      sx={{
        flex: 1,
        p: 1,
        borderRadius: '10px',
        border: '1.5px solid',
        borderColor: selected ? '#1C2A6E' : '#E1E4ED',
        bgcolor: selected ? '#EEF1FE' : 'common.white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: selected ? '#1C2A6E' : '#14172A' }}>
        {label}
      </Typography>
    </Box>
  );
}

export function AppraisalAppraiserBundleView({ bundleId }: { bundleId: string }) {
  const { signUpData } = useRegistration();
  const {
    review,
    setAppraisal,
    setAppraisalBundleFee,
    setAppraisalBundleReport,
    submitAppraisalBundleFeeForApproval,
    approveAppraisalBundleFee,
    declineAppraisalBundleFee,
    resetAppraisalBundleFees,
    resetAppraisalBundleReport,
  } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { paymentReceivedAt, reportBundles } = review.appraisal;

  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeDeclineOpen, setFeeDeclineOpen] = useState(false);
  const [feeDeclineReasonDraft, setFeeDeclineReasonDraft] = useState('');

  // Every simulate action below is always visible in the Settings
  // popover, regardless of current state — clicking one "just works" by
  // auto-completing whatever earlier steps it depends on first, instead
  // of only appearing once those steps already happened. Fills in this
  // bundle's fee decision (sample ₱2,500 fee) if it's still undecided
  // and submits THIS BUNDLE's own fee if it hasn't been sent yet — fee
  // approval is per-bundle now (see
  // docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md),
  // so this only ever touches the current bundle, never any sibling
  // bundle on the same application.
  const ensureFeeSubmitted = () => {
    const currentBundle = reportBundles.find((entry) => entry.id === bundleId);
    if (!currentBundle) return;
    if (currentBundle.feeApprovalStatus === 'not-submitted' || currentBundle.feeApprovalStatus === 'declined') {
      if (currentBundle.feeNeeded === null) {
        setAppraisalBundleFee(currentBundle.id, {
          feeNeeded: 'yes',
          feeAmount: '2500',
          feeDescription: 'Site visit + valuation fee',
        });
      }
      submitAppraisalBundleFeeForApproval(currentBundle.id);
    }
  };

  // Same simulated second-officer approval/decline the list page
  // (appraisal-appraiser-view.tsx) already registers — repeated here so
  // it's also reachable while looking at a single bundle's own detail
  // page, not just from the list. Both act on this bundle only.
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-appraisal-fee-approval',
          label: 'Simulate: Another Officer Approves Appraisal Fee',
          icon: 'solar:user-check-bold-duotone',
          color: '#0C8A4F',
          onClick: () => {
            ensureFeeSubmitted();
            approveAppraisalBundleFee(bundleId);
          },
        },
        {
          key: 'simulate-appraisal-fee-decline',
          label: 'Simulate: Another Officer Declines Appraisal Fee',
          icon: 'solar:user-cross-bold-duotone',
          color: '#B32C22',
          onClick: () => {
            ensureFeeSubmitted();
            setFeeDeclineOpen(true);
          },
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [reportBundles]
    )
  );

  // Same simulated "Advise Client"/"Payment Received" steps the list
  // page's "Advise client to settle the Appraisal fees" card triggers —
  // repeated here as a quiet settings-popover entry (not a visible card,
  // since this page already has enough going on), always visible and
  // cascading through submit -> approve -> advise -> pay so it reaches
  // "Settled" from any starting state in one click. clientNotifiedAt/
  // sentToOdooAt/paymentReceivedAt stay whole-application (see
  // admin-context.tsx's Appraisal type) — only this bundle's own fee
  // submit/approve is scoped to it.
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-payment-received',
          label: 'Simulate: Payment Received (Sendit)',
          icon: 'solar:card-recive-bold-duotone',
          color: '#0C8A4F',
          onClick: () => {
            ensureFeeSubmitted();
            const currentBundle = reportBundles.find((entry) => entry.id === bundleId);
            if (currentBundle && currentBundle.feeApprovalStatus !== 'approved') {
              approveAppraisalBundleFee(bundleId);
            }
            const now = new Date().toISOString();
            setAppraisal({ clientNotifiedAt: now, sentToOdooAt: now, paymentReceivedAt: now });
          },
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [reportBundles]
    )
  );

  // Always visible — fills in a full sample report
  // (buildSampleAppraisalReport, shared with AppraisalTctTable's own
  // "Simulate: Appraiser Submits Report" and the list page's equivalent)
  // for just this one bundle, if it doesn't already have one. Independent
  // of fee status, same as the list page's version — a report can be
  // filled in whenever, it's never gated on the fee.
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-fill-sample-report',
          label: 'Simulate: Fill Sample Report',
          icon: 'solar:document-add-bold-duotone',
          color: '#1C2A6E',
          onClick: () => {
            const currentBundle = reportBundles.find((entry) => entry.id === bundleId);
            if (!currentBundle || currentBundle.report.uploadedAt || !signUpData) return;
            const bundleTctNumbers = appraisalGroups
              .filter((group) => currentBundle.tctGroupIds.includes(group.id))
              .map((group) => group.tctNumber);
            const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
            setAppraisalBundleReport(
              currentBundle.id,
              buildSampleAppraisalReport(currentBundle, bundleTctNumbers, applicantName, false)
            );
          },
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [reportBundles, appraisalGroups, signUpData]
    )
  );

  // Always available — wipes this bundle's own fee flow (status/dates
  // plus its own fee decision) back to its very first state, so a tester
  // can restart the request/approve/decline/settle cycle from scratch
  // without leaving this page. Does not touch report/assignment data,
  // only this bundle's fee fields (see resetAppraisalBundleFees in
  // admin-context.tsx) — every other bundle on the application is
  // untouched.
  //
  // "Simulate: Reset Report" is the report's own equivalent — restores
  // this bundle's `report` back to a genuinely blank, editable state
  // (uploadedAt: null, every field cleared, landTitles rebuilt fresh) via
  // resetAppraisalBundleReport. Exists so a bundle that reads as
  // "submitted" from earlier testing (Submit Appraisal Report, or "Simulate:
  // Appraiser Submits Report" on the Officer's page) can be restored to
  // editable without clearing the whole session's localStorage — added
  // after a report stuck in a submitted state made every other Simulate
  // action on this page (Fill Sample Report included) silently no-op,
  // since those all correctly guard on `!report.uploadedAt`.
  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'simulate-reset-appraisal-fees',
          label: 'Simulate: Reset Appraisal Fee',
          icon: 'solar:restart-bold-duotone',
          color: '#5A6273',
          onClick: () => resetAppraisalBundleFees(bundleId),
        },
        {
          key: 'simulate-reset-appraisal-report',
          label: 'Simulate: Reset Report',
          icon: 'solar:restart-bold-duotone',
          color: '#5A6273',
          onClick: () => resetAppraisalBundleReport(bundleId),
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [bundleId]
    )
  );
  // Starts expanded — while this bundle's own fee is still a draft,
  // document review is the thing the appraiser needs to be looking at,
  // and the section isn't even collapsible yet (see docsCollapsible below).
  const [docsExpanded, setDocsExpanded] = useState(true);
  // Per-TCT-group expand state for the nested document lists inside
  // Appraisal Documents — keyed by group id, present in this set means
  // expanded; absent (the default for every group) means collapsed.
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  const bundle = reportBundles.find((entry) => entry.id === bundleId);
  // paymentReceivedAt stays whole-application (the client-advisory step —
  // see admin-context.tsx's Appraisal type); this bundle's own
  // feeApprovalStatus is per-bundle now.
  const feeSettled = bundle?.feeApprovalStatus === 'approved' && !!paymentReceivedAt;

  // Declined behaves like a draft again — this bundle's previous
  // Yes/No/amount/description/remarks were left untouched by
  // declineAppraisalBundleFee(), so editing (and re-submitting) works
  // exactly the same as the very first time, just starting from those
  // prior values instead of blank fields.
  const feeEditable = bundle?.feeApprovalStatus === 'not-submitted' || bundle?.feeApprovalStatus === 'declined';

  // Not collapsible at all while this bundle's own fee request is still
  // editable — not-submitted OR declined-and-being-revised — see the
  // header comment for the full rationale.
  const docsCollapsible = !feeEditable;

  // Auto-collapse the moment this bundle's own fee is (re-)submitted —
  // fires on any editable -> non-editable transition (not-submitted ->
  // submitted, or declined -> resubmitted), never on every render, so a
  // manual re-open afterward is never fought by this effect.
  const wasFeeEditableRef = useRef(feeEditable);
  useEffect(() => {
    if (wasFeeEditableRef.current && !feeEditable) {
      setDocsExpanded(false);
    }
    wasFeeEditableRef.current = feeEditable;
  }, [feeEditable]);

  if (!signUpData || !bundle) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, maxWidth: '1040px !important' }}>
        <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Assignment not found
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
            This assignment isn&apos;t in your current session.
          </Typography>
          <Button component={RouterLink} href={paths.admin.appraisalAppraiser} variant="outlined">
            Back to My Assignments
          </Button>
        </Box>
      </Container>
    );
  }

  const bundleGroups = appraisalGroups.filter((group) => bundle.tctGroupIds.includes(group.id));
  const bundleTctNumbers = bundleGroups.map((group) => group.tctNumber);

  const docsReceivedCount = bundleGroups.reduce(
    (sum, group) =>
      sum +
      APPRAISAL_DOC_META.filter((meta) => group.documents.find((doc) => doc.key === meta.key)?.status !== 'missing').length,
    0
  );

  const status = bundle.report.uploadedAt
    ? 'reported'
    : bundle.feeNeeded === 'no' || (bundle.feeApprovalStatus === 'approved' && feeSettled)
      ? 'for-report'
      : bundle.feeApprovalStatus === 'pending-approval'
        ? 'for-approval'
        : 'on-process';
  const copy = STATUS_COPY[status];

  const hasValidFeeAmount = Number(bundle.feeAmount) > 0;
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

  // A bundle that doesn't need a fee at all has nothing to wait on —
  // there's no payment to settle, so the report form unlocks the moment
  // that decision is made, without waiting for this bundle's own
  // submit→approve→pay cycle.
  const reportUnlocked = bundle.feeNeeded === 'no' || feeSettled;

  // This bundle submits its own fee for approval independent of every
  // sibling bundle on the same application — no whole-application gate
  // requiring every bundle to have a fee decision first (that batch-wide
  // gate existed when approval was batch-level; see
  // docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md).
  // It only needs its OWN fee decision to be complete.
  const hasOwnFeeDecision =
    bundle.feeNeeded === 'no' || (bundle.feeNeeded === 'yes' && Number(bundle.feeAmount) > 0 && !!bundle.feeDescription.trim());
  const canSubmit = feeEditable && hasOwnFeeDecision;

  const confirmSubmitForApproval = () => {
    submitAppraisalBundleFeeForApproval(bundle.id);
    setFeeModalOpen(false);
  };

  const confirmFeeDecline = () => {
    if (!feeDeclineReasonDraft.trim()) return;
    declineAppraisalBundleFee(bundle.id, feeDeclineReasonDraft.trim());
    setFeeDeclineOpen(false);
    setFeeDeclineReasonDraft('');
  };

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;

  const docsContent = (
    <Stack spacing={2.5}>
      {bundleGroups.map((group) => {
        const groupDocsReceived = APPRAISAL_DOC_META.filter(
          (meta) => group.documents.find((doc) => doc.key === meta.key)?.status !== 'missing'
        ).length;
        const groupExpanded = expandedGroupIds.has(group.id);
        const toggleGroup = () =>
          setExpandedGroupIds((prev) => {
            const next = new Set(prev);
            if (next.has(group.id)) next.delete(group.id);
            else next.add(group.id);
            return next;
          });

        const groupDocs = (
          <Stack spacing={1.25}>
            {APPRAISAL_DOC_META.map((meta) => {
              const doc = group.documents.find((groupDoc) => groupDoc.key === meta.key);
              if (!doc) return null;
              return (
                <ReadOnlyRequirementDocRow
                  key={meta.key}
                  label={meta.label}
                  doc={doc}
                  applicantName={applicantName}
                />
              );
            })}
          </Stack>
        );

        if (bundleGroups.length === 1) {
          return <Stack key={group.id}>{groupDocs}</Stack>;
        }

        return (
          <Box key={group.id} sx={{ border: '1px solid #EEF0F5', borderRadius: '12px', p: 2 }}>
            <CollapsibleSection
              title={group.tctNumber}
              expanded={groupExpanded}
              onToggle={toggleGroup}
              badge={<CollapsibleSectionBadge received={groupDocsReceived} total={APPRAISAL_DOC_META.length} />}
              completeIcon={
                groupDocsReceived === APPRAISAL_DOC_META.length && (
                  <Iconify icon="solar:check-circle-bold" width={16} sx={{ color: '#0C8A4F' }} />
                )
              }
            >
              {groupDocs}
            </CollapsibleSection>
          </Box>
        );
      })}
    </Stack>
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, maxWidth: '1040px !important' }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={RouterLink}
            href={paths.admin.appraisalAppraiser}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{ color: '#5A6273', fontWeight: 600, fontSize: 13, px: 0.5 }}
          >
            Back to My Assignments
          </Button>
        </Box>

        <Box sx={{ ...adminCardSx }}>
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
                  {getAppraisalNumber(bundle.tctGroupIds)}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                  {applicantName} · App No. {getLoanNumber(signUpData.email)}
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
            <FactChip
              label={`Collateral${bundleTctNumbers.length > 1 ? ` (${bundleTctNumbers.length})` : ''}`}
              value={bundleTctNumbers.join(', ')}
            />
            <FactChip
              label="Collateral Type"
              value={Array.from(new Set(bundleGroups.map((group) => COLLATERAL_TYPE_LABEL[group.collateralType]))).join(', ')}
            />
            <FactChip
              label="Appraiser Type"
              value={bundle.appraiserType ? APPRAISER_TYPE_LABEL[bundle.appraiserType] : undefined}
            />
            <FactChip label="Assigned To" value={bundle.appraiserName ?? undefined} />
            <FactChip
              label="Target Completion"
              value={bundle.targetCompletionDate ? new Date(bundle.targetCompletionDate).toLocaleDateString() : undefined}
            />
          </Stack>
        </Box>

        <Stack spacing={1.75} sx={{ ...adminCardSx }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A' }}>
                  Appraisal Fee
                </Typography>
                <StatusBadge tone={feeCopy.tone} label={feeCopy.label} />
              </Stack>
              {!feeEditable && bundle.feeNeeded === 'yes' && hasValidFeeAmount && (
                <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.5 }}>
                  {fCurrency(bundle.feeAmount)} requested
                  {feeStatusKey === 'approved' && bundle.feeApprovedAt
                    ? ` · Approved on ${new Date(bundle.feeApprovedAt).toLocaleDateString()}`
                    : ''}
                </Typography>
              )}
            </Box>
            <Button
              onClick={() => {
                // Yes is the common case, so default a not-yet-decided
                // bundle to it the moment the modal opens, instead of
                // leaving both options unselected and making the
                // appraiser click Yes just to confirm what's already the
                // likely answer.
                if (bundle.feeNeeded === null) {
                  setAppraisalBundleFee(bundle.id, { feeNeeded: 'yes' });
                }
                setFeeModalOpen(true);
              }}
              variant={feeEditable ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Iconify icon="solar:wallet-money-bold-duotone" width={16} />}
              sx={
                feeEditable
                  ? { bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', flexShrink: 0, '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }
                  : { borderRadius: '10px', px: 2, whiteSpace: 'nowrap', flexShrink: 0 }
              }
            >
              {feeEditable ? 'Request Appraisal Fee' : 'View Appraisal Fee'}
            </Button>
          </Stack>

          {bundle.feeApprovalStatus === 'declined' && bundle.feeDeclineReason && (
            <Stack
              direction="row"
              spacing={1.25}
              sx={{
                p: 1.5,
                borderRadius: '10px',
                border: `1px solid ${TONE_COLORS.error.border}`,
                bgcolor: TONE_COLORS.error.bg,
              }}
            >
              <Iconify icon="solar:danger-triangle-bold" width={17} sx={{ color: TONE_COLORS.error.text, flexShrink: 0, mt: 0.1 }} />
              <Stack spacing={0.25}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: TONE_COLORS.error.text, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Reason for decline
                </Typography>
                <Typography sx={{ fontSize: 13, color: TONE_COLORS.error.text }}>{bundle.feeDeclineReason}</Typography>
              </Stack>
            </Stack>
          )}
        </Stack>

        <Box sx={{ ...adminCardSx }}>
          {docsCollapsible ? (
            <CollapsibleSection
              title="Appraisal Documents"
              expanded={docsExpanded}
              onToggle={() => setDocsExpanded((prev) => !prev)}
              badge={
                <CollapsibleSectionBadge
                  received={docsReceivedCount}
                  total={APPRAISAL_DOC_META.length * bundleGroups.length}
                />
              }
            >
              {docsContent}
            </CollapsibleSection>
          ) : (
            <Stack>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>Appraisal Documents</Typography>
                <CollapsibleSectionBadge
                  received={docsReceivedCount}
                  total={APPRAISAL_DOC_META.length * bundleGroups.length}
                />
              </Stack>
              {docsContent}
            </Stack>
          )}
        </Box>

        {reportUnlocked ? (
          <>
            <AppraiserAssignmentCard bundleId={bundle.id} tctNumbers={bundleTctNumbers} />
            <AppraisalReportSubmitCard bundleId={bundle.id} />
          </>
        ) : (
          <Box sx={{ ...adminCardSx, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              The Appraisal Fee must be settled before the report form for this property unlocks.
            </Typography>
          </Box>
        )}
      </Stack>

      <Dialog
        open={feeModalOpen}
        onClose={() => setFeeModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>
                Appraisal Fee
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.5 }}>
                {bundle.feeApprovalStatus === 'declined'
                  ? 'Declined — revise this property’s fee, then submit it again.'
                  : feeEditable
                    ? 'Decide this property’s fee, then submit it for approval.'
                    : 'This property’s submitted fee decision.'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setFeeModalOpen(false)} sx={{ mt: -0.5, mr: -0.5 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 0.5, pb: 3 }}>
          {feeEditable ? (
            <Stack spacing={2}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  Does this property need an Appraisal fee?
                </Typography>
                <Stack direction="row" spacing={1.25}>
                  <FeeNeededOption
                    needed
                    selected={bundle.feeNeeded === 'yes'}
                    onSelect={() => setAppraisalBundleFee(bundle.id, { feeNeeded: 'yes' })}
                  />
                  <FeeNeededOption
                    needed={false}
                    selected={bundle.feeNeeded === 'no'}
                    onSelect={() =>
                      setAppraisalBundleFee(bundle.id, {
                        feeNeeded: 'no',
                        feeAmount: '',
                        feeDescription: '',
                        feeRemarks: '',
                      })
                    }
                  />
                </Stack>
              </Stack>

              {bundle.feeNeeded === 'yes' && (
                <Stack spacing={1.75}>
                  <NumericFormat
                    fullWidth
                    size="small"
                    customInput={TextField}
                    label="Request Amount"
                    placeholder="0.00"
                    value={bundle.feeAmount}
                    onValueChange={({ value }) => setAppraisalBundleFee(bundle.id, { feeAmount: value })}
                    thousandSeparator=","
                    decimalScale={2}
                    allowNegative={false}
                    allowLeadingZeros={false}
                    valueIsNumericString
                    error={bundle.feeAmount !== '' && !hasValidFeeAmount}
                    helperText={
                      bundle.feeAmount !== '' && !hasValidFeeAmount
                        ? 'Enter an amount greater than ₱0.00.'
                        : undefined
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1C2A6E' }}>₱</Typography>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ inputMode: 'decimal' }}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
                      '& .MuiFormHelperText-root': { mx: 0, fontSize: 11 },
                    }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Request Amount Description"
                    placeholder="What this amount covers, e.g. Site visit + valuation fee"
                    value={bundle.feeDescription}
                    onChange={(event) => setAppraisalBundleFee(bundle.id, { feeDescription: event.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Remarks"
                    placeholder="Optional notes for this request"
                    value={bundle.feeRemarks}
                    onChange={(event) => setAppraisalBundleFee(bundle.id, { feeRemarks: event.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
                  />
                </Stack>
              )}
            </Stack>
          ) : bundle.feeNeeded === 'yes' ? (
            <Stack spacing={1.25} sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontSize: 13, color: '#5A6273' }}>Request Amount</Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1C2A6E' }}>
                  {fCurrency(bundle.feeAmount)}
                </Typography>
              </Stack>
              {bundle.feeDescription && (
                <Typography sx={{ fontSize: 13, color: '#8891A6' }}>{bundle.feeDescription}</Typography>
              )}
              {bundle.feeRemarks && (
                <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Remarks: {bundle.feeRemarks}</Typography>
              )}
              {bundle.feeSubmittedAt && (
                <Typography sx={{ fontSize: 11.5, color: '#ADB3C2', pt: 0.5, borderTop: '1px solid #EEF0F5' }}>
                  Requested on {new Date(bundle.feeSubmittedAt).toLocaleDateString()}
                </Typography>
              )}
              {bundle.feeApprovalStatus === 'approved' && bundle.feeApprovedAt && (
                <Typography sx={{ fontSize: 11.5, color: '#0C8A4F' }}>
                  Approved on {new Date(bundle.feeApprovedAt).toLocaleDateString()}
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack spacing={0.75}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#8891A6', py: 1 }}>
                No fee needed for this property.
              </Typography>
              {bundle.feeSubmittedAt && (
                <Typography sx={{ fontSize: 11.5, color: '#ADB3C2' }}>
                  Requested on {new Date(bundle.feeSubmittedAt).toLocaleDateString()}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        {feeEditable && (
          <Stack direction="row" spacing={1.25} sx={{ p: 3, pt: 2, borderTop: '1px solid #EEF0F5' }}>
            <Button
              onClick={confirmSubmitForApproval}
              disabled={!canSubmit}
              fullWidth
              variant="contained"
              startIcon={<Iconify icon="solar:send-square-bold" width={16} />}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Submit Fee for Approval
            </Button>
          </Stack>
        )}
      </Dialog>

      <ConfirmDialog
        open={feeDeclineOpen}
        onClose={() => setFeeDeclineOpen(false)}
        title="Reason for declining Appraisal Fees"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={feeDeclineReasonDraft}
            onChange={(event) => setFeeDeclineReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!feeDeclineReasonDraft.trim()}
            onClick={confirmFeeDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
