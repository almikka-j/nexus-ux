# Appraisal - Approver Fee (Fee Approvals)

> **Maintenance rule:** update this file whenever
> `appraisal-fee-approval-bundle-view.tsx` (the detail page — the only
> page this doc still covers) changes. Companion to
> `docs/170-request-appraiser.md` (where each fee bundle this screen
> approves is actually requested and submitted, and where the full
> `AppraisalReportBundle.feeApprovalStatus`/`feeNeeded` data model
> lives), `docs/110-appraisal.md` (the Officer's step page that creates
> the bundles), `docs/155-request-fee-approvals.md` (**the merged list
> page** — `appraisal-fee-approval-view.tsx` was deleted and folded into
> `fee-approvals-view.tsx`; see that doc for the list-page behavior this
> doc used to cover), `docs/200-request-appraisal-report-approval.md`
> (the report side of the same Approver's two duties),
> `docs/210-request-payments.md` (where an approved fee is actually
> recorded as paid — per-bundle now too),
> `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`
> (the design doc for the per-bundle restructure this whole page is
> built around), and `docs/225-admin-design-system.md` (the admin design
> system — `ConfirmDialog` approve/decline per §6, and the
> `ApplicationDetailsCard` tighter-padding variant is a §13 known
> exception).

## What this is

**The detail page**, `appraisal-fee-approval-bundle-view.tsx` (reached at
`paths.admin.feeApprovalsDetail('appraisal-fee', bundleId)`), shows the
fee breakdown and Approve/Decline actions for **one specific
`AppraisalReportBundle`** — not the whole application's Appraisal Fee
request as a batch. Fee approval moved from a single whole-application
`Appraisal.feeApprovalStatus` down onto each bundle itself (see the
per-bundle design doc above), so this page takes a `bundleId` prop and
looks up exactly one bundle from `review.appraisal.reportBundles`, the
same convention `appraisal-appraiser-bundle-view.tsx` already used for
its own per-bundle lookup. Two bundles on the same application are
approved, declined, and paid completely independently of each other.

**The list page that used to link here
(`appraisal-fee-approval-view.tsx`) was deleted and merged into
`fee-approvals-view.tsx`** — one combined "Fee Approvals" list showing
one Appraisal Fee row per bundle (plus the CI Fee row) together (nav
label **"Fee Approvals"**, replacing the former separate "Credit
Investigation - Fee Approval" / "Appraisal - Fee Approval" nav entries).
See `docs/155-request-fee-approvals.md` for the merged list page's own
columns, auto-seed rules, and per-bundle row behavior.

This detail page itself behaves the same as before the restructure: no
redirect or one-time outcome screen on action — it stays put and updates
the card in place, matching how the underlying cards on
`appraisal-view.tsx` already behave. There is no role/permission system
in this app (`AdminUser` has no role field), so nothing mechanically
gates who can open it; the merged list page shows no role-specific
eyebrow label at all (see `docs/155-request-fee-approvals.md`).

## Always one actionable request, per bundle

Each bundle's own auto-seed effect (on the Fee Approvals list, see
`docs/155-request-fee-approvals.md`) submits that one bundle's fee for
approval the first time it has a fee decision and hasn't been submitted
yet — there's no longer a single shared "always one actionable request"
guarantee for the whole application; instead, each bundle independently
reaches `'pending-approval'` once its own fee is proposed. **`approved`
is a real terminal decision per bundle and never self-heals; `declined`
does** — a decline immediately re-submits the same bundle's own fee
values (unchanged fields, just resubmitted) rather than leaving that one
bundle's row on a dead "Declined" end.

The dev-only **"Simulate: Reset Appraisal Fees"** page action that used
to live on both the list and this detail page was removed from both —
with fee approval per-bundle and potentially several bundles visible at
once, there's no longer a single natural target for a page-level reset.
`appraisal-appraiser-bundle-view.tsx` still registers its own
bundle-scoped **"Simulate: Reset Appraisal Fee"** action
(`resetAppraisalBundleFees(bundleId)`), which resets only that one
bundle and is the place to exercise this scenario now.

This detail page no longer needs the `justApproved` local-state
workaround the earlier batch-level version required (to distinguish "you
just now approved this, this visit" from "you already approved this
earlier" after the shared reset action ran) — since the reset action is
gone from this page, that edge case no longer exists here; the page
simply reads `bundle.feeApprovalStatus` directly.

## The detail page

`appraisal-fee-approval-bundle-view.tsx` mirrors
`appraisal-appraiser-bundle-view.tsx`'s own header-card shape.

### Header card + FactChip strip

A header card (42px icon-avatar + applicant name as the title + "App No. …
· email" subtitle + a `StatusBadge` derived from **this bundle's own**
`feeApprovalStatus`, top-right) with a bordered/tinted `FactChip` strip
below it: **Properties** (this bundle's own `tctGroupIds.length`),
**Appraisal Fee** (this bundle's own `feeAmount` — not a running total
across bundles), and **Requested On** (this bundle's own
`feeSubmittedAt`).

**Below the FactChip strip: a `Divider`, then a "View Appraisal
Documents" button** — matching the exact layout of the Call Report page's
own collapsible summary card (`ApplicationDetailsCard`,
`application-details-card.tsx`, rendered on `call-report-view.tsx`):
header row, FactChip strip, `Divider`, then a row of compact outlined
navy buttons sitting left-aligned at the bottom of the card. The header
card's own outer padding matches that same reference too —
`p: { xs: 2.5, md: 3 }`, the tighter override `ApplicationDetailsCard`'s
collapsible variant uses (a `docs/225-admin-design-system.md` §13
documented exception). Clicking the button opens a read-only `Dialog`
listing every `APPRAISAL_DOC_META` document for **this bundle's own**
TCT groups only (same `ReadOnlyRequirementDocRow` component
`appraisal-appraiser-bundle-view.tsx`'s own Appraisal Documents section
uses) — no longer looping across every bundle in the request, since
there's exactly one bundle per detail page now.

### Appraisal Fee Details card

Then an **"Appraisal Fee Details"** card holds this one bundle's own TCT
numbers, appraiser name (bold and navy, `#1C2A6E`, `fontSize: 13`), and
fee amount/description — no loop over multiple bundles and no running
total, since there's exactly one bundle to show. Finally the **"Approve
Appraisal Fee"** / **"Decline Appraisal Fee"** buttons call
`approveAppraisalBundleFee(bundle.id)` /
`declineAppraisalBundleFee(bundle.id, reason)` — each applies **only to
this bundle**, never to a sibling bundle on the same application.
`declineAppraisalBundleFee` sets this bundle's own `feeApprovalStatus:
'declined'` and `feeDeclineReason` to the typed reason — the bundle's
own `feeNeeded`/`feeAmount`/`feeDescription`/`feeRemarks` are left
exactly as submitted, not reset, so the appraiser revises rather than
re-typing from scratch. This is not a single flat-amount approval like
Credit Investigation - Fee Approval's shape (see
`docs/150-request-credit-investigation-fee-approval.md`).

### Route shape

Reached via `paths.admin.feeApprovalsDetail('appraisal-fee', bundleId)`
(`/admin/fee-approvals/appraisal-fee/{bundleId}`) — `bundleId` is now a
real per-bundle identifier (the actual `AppraisalReportBundle.id`), not
an opaque placeholder like the old fixed `/current` segment used to be.
The underlying Next.js route is an optional catch-all
(`[kind]/[[...bundleId]]/page.tsx`, shared with the CI Fee kind, which
ignores the segment entirely) — see `docs/155-request-fee-approvals.md`
for the shared route shape.

## Decision Gate

This screen is one of the two ways a bundle's own `feeApprovalStatus`
moves from `'pending-approval'` to `'approved'` — scoped to this one
bundle, not the whole application. Approval unlocks this bundle's own
report form on the Appraiser workspace
(`appraisal-appraiser-bundle-view.tsx`'s `reportUnlocked` gate). Decline
sets this bundle's own visible `'declined'` status + `feeDeclineReason`
and leaves its fee decision as submitted for revision. No
document-completeness gate.

## Fabricated Claims — Real vs. Simulated

- **No real Head login** — `AdminUser` has no role field; the behavior is
  simulated.
- **Each bundle's own fee reaches `'pending-approval'` independently** —
  the Fee Approvals list's per-bundle auto-seed effect submits a bundle's
  fee the first time it has a decision and hasn't been submitted.
- **No opaque request ID** — the `bundleId` route segment is the real
  `AppraisalReportBundle.id`, not a placeholder.
- All state lives in `review.appraisal.reportBundles` in `localStorage`.

## Non-Goals / Open Items

- **No batch approval across bundles** — approving or declining one
  bundle's fee never touches any other bundle on the same application;
  there is no "approve everything at once" action anymore.
- **No queue of multiple requests per bundle** — one bundle, one
  `feeApprovalStatus`, one row on the list.
- **No separate Head login** — the same officer can act here or via the
  Appraiser page's simulated shortcut; this screen is a fuller surface,
  not a role gate.
- **No real fee record here** — each bundle's own `feePayment` and "mark
  as paid" live on `docs/210-request-payments.md`.
