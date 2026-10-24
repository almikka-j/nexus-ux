# Appraisal - Approver Report (Report Approvals)

> **Maintenance rule:** update this file whenever
> `appraisal-approver-bundle-view.tsx` (the detail page — the only page
> this doc still covers) changes. Companion to `docs/110-appraisal.md`
> (the Officer's `HeadApprovalCard` writes the exact same
> `headApprovalStatus` fields this screen does),
> `docs/170-request-appraiser.md` (which owns `AppraisalReportView`, the
> read-only report component this detail page renders, and the report
> form that produces it), `docs/190-request-appraisal-fee-approval.md`
> (the fee side of the same Approver's two duties),
> `docs/165-request-report-approvals.md` (**the merged list page** —
> `appraisal-approver-view.tsx` was deleted and folded into
> `report-approvals-view.tsx`; see that doc for the list-page behavior
> this doc used to cover, including the conditional-row gate), and
> `docs/225-admin-design-system.md` (the admin design system — the "Your
> Decision" card is the §10 decision-gate pattern, and Decline uses a §6
> `ConfirmDialog`).

## What this is

**The detail page** (`appraisal-approver-bundle-view.tsx`, reached at
`paths.admin.reportApprovalsDetail('appraisal')`) is the Head/Approver's
"reviewed and noted" step, the report side of the Approver's two duties.

**The list page that used to link here
(`appraisal-approver-view.tsx`) was deleted and merged into
`report-approvals-view.tsx`** — one combined "Report Approvals" list
showing this row alongside the Call Report row (nav label **"Report
Approvals"**, replacing the former separate "Call Report - Report
Approval" / "Appraisal - Report Approval" nav entries). See
`docs/165-request-report-approvals.md` for the merged list page's own
row-gating (this row is genuinely conditional — it only appears once
every pledged property's report has been submitted and
`headApprovalStatus === 'pending'`), columns, and auto-seed rules.

**Framed as the signed-in role's own personal workspace** used to apply
to the list page; the merged list page no longer shows a role-specific
eyebrow label at all (see `docs/165-request-report-approvals.md`). This
detail page itself is unchanged: its actions never redirect or show a
one-time outcome screen — the page stays put and the card updates in
place, matching how `head-approval-card.tsx` on `appraisal-view.tsx`
already behaves. There is no role/permission system in this app
(`AdminUser` has no role field), so nothing mechanically gates who can
open it.

## The detail page

The detail page's header card (applicant, `StatusBadge`, FactChip strip for
Properties/Appraiser/Requested On) matches the same summary-card shape
every other detail page here uses.

Below it, **every report bundle in the request renders its own full
Appraisal Report**, reusing `AppraisalReportView`
(`appraisal/appraisal-report-view.tsx`) — the same read-only summary
component the Appraisal Officer's own "View Report" dialog uses on
`appraisal-view.tsx` (see `docs/170-request-appraiser.md`'s "Read-only view
(`AppraisalReportView`)" for its letterhead/"At a Glance"/collapsible-section
internals) — one per bundle, labeled with that bundle's own Appraisal No.
only when the request spans more than one (a single-bundle request, the
common case in this prototype, has nothing to disambiguate).
`AppraisalReportView` renders the bundle's own kind
(`getBundleCollateralType`) — the Real Estate REM, or the Chattel /
Machineries read-only summaries from `chattelReport`/`machineriesReport`;
external bundles of any kind show the uploaded file from
`realEstateReport`. This is the
reason the restructure exists: the flat version this replaced showed only
the applicant summary, with no way to see what the appraiser actually
submitted before approving.

An earlier pass of this same restructure reused `AppraiserAssignmentCard`
directly instead — the Appraiser's own *editable* form, which already
locks itself read-only once a report is submitted
(`locked = headApprovalStatus !== 'pending' || !!getBundleUploadedAt(bundle)`), so
it seemed like it needed no separate read-only variant. In practice a
disabled form reads as broken on a review page — bare `TextField`s with
no section styling, and a "Choose a photo" dropzone shell sitting around
each Collateral Photo instead of an actual photo view (see
`docs/170-request-appraiser.md`'s "Land Title Fields").
`AppraisalReportView` was built for exactly this read-only case already
(label/value `Field` pairs grouped under `SectionLabel` headings with
`Divider`s between them — this app's standard read-only-detail shape —
and a real, properly-sized Collateral Photo block per land title, not a
cramped thumbnail, that opens the full photo on click via
`LandTitleSummary`), so the fix was swapping to it rather than inventing a
new component. This is also why `buildSampleAppraisalReport()` stamps a
`SAMPLE_COLLATERAL_PHOTO` data URI on every land title it produces — this
page has no way to attach a real photo itself and would otherwise show
every sample bundle's Collateral Photo as perpetually unset (see
`docs/110-appraisal.md`'s "Dev/testing page actions").

### "Your Decision" card

Approve/Decline live in their own **"Your Decision"** card — the
`docs/225-admin-design-system.md` §10 decision-gate pattern (a single
card carrying the terminal choice), titled the same way
`appraisal-fee-approval-bundle-view.tsx` titles its own "Appraisal Fee
Details" card — grouped tightly (`spacing={1.5}`, not this
page's usual `spacing={3}` gap) directly beneath the report bundle(s)
inside one shared inner `Stack`, so the decision reads as attached to
what it's deciding on rather than a separate, disconnected card further
down the page. (An earlier version put every report in its own card at
the page's normal spacing, then Approve/Decline in a further plain card
below with no title and generic filler copy about "every pledged
property's report" — visually indistinguishable from just another
unrelated section, unlike the Fee Approval page's own single-card
"content + decision together" shape it was meant to mirror; this was
tightened to match instead.)

The card's own internal layout matches `requirement-checklist-view.tsx`'s
"Ready to endorse?" card exactly: title (`mb: 0.5`) → one subtitle whose
text changes by state (`mb: 2.5`) → the action button(s) directly below
with no extra top margin, since the subtitle's own bottom margin already
provides the gap. This is a single flat shape used for every state, not
two different layouts swapped based on `isPending` — an earlier version
branched into a title+subtitle+buttons layout while pending, then an
entirely different icon+message row once decided, which read as an
inconsistent card bolted together from two designs rather than one
consistent shape whose content updates in place. Now the Approve button
itself carries the state instead: label and icon read "Approve (Reviewed
and Noted)" while pending, "Approved" (disabled, grayed) once decided;
Decline only renders at all while still pending, since there's nothing
to decline once a decision has been made.

**Approve** reuses the exact same `setAppraisal` call
`head-approval-card.tsx` makes (`headApprovalStatus: 'approved'`).
**Decline** resets `headApprovalStatus: 'pending'` and calls
`clearAllAppraisalBundleReports()` again — the same behavior
`head-approval-card.tsx` itself uses (see `docs/110-appraisal.md`'s "Head
Approval", which also covers why `'declined'` is a type-level member the
decline handler never actually sets, and where the "Last decline reason"
line surfaces) — clearing every bundle's submitted report/file so each
assigned appraiser resubmits from their own page. Since
`clearAllAppraisalBundleReports()` wipes all three kind reports'
`uploadedAt` (so `getBundleUploadedAt` reads `null`),
`AppraisalReportView` returns `null` for a bundle the instant a decline is
confirmed (it only ever renders a bundle with a submitted report) — the
report card disappears from this page in place, no navigation away, until
the appraiser resubmits.

## Decision Gate

The **"Your Decision"** card is the gate. **Approve** →
`headApprovalStatus: 'approved'` (same call `head-approval-card.tsx`
makes), which lets the Officer's Appraisal page proceed to its Pass/Fail
decision. **Decline** → `headApprovalStatus: 'pending'` +
`clearAllAppraisalBundleReports()`, so every assigned appraiser resubmits.
No completeness gate beyond "a report has been submitted".

## Fabricated Claims — Real vs. Simulated

- **No real Head login** — `AdminUser` has no role field; the review is
  simulated.
- **The detail page renders every bundle's report inline** via
  `AppraisalReportView` — a read-only render of the bundle's own kind
  report (`realEstateReport`/`chattelReport`/`machineriesReport`), nothing
  parsed from an upload.
- **`buildSampleAppraisalReport()` stamps a `SAMPLE_COLLATERAL_PHOTO`
  data URI** on every land title because this page cannot attach a real
  photo itself.
- **No request ID** — the detail route (`/admin/report-approvals/appraisal`)
  uses `kind` as a real discriminator, not a per-request ID; the component
  reads `review.appraisal` directly.
- All state lives in `review.appraisal` in `localStorage`.

## Non-Goals / Open Items

- **No per-bundle report decision** — Approve/Decline is one call over
  the whole request's `headApprovalStatus`; Decline (`clearAll…`) clears
  **every** bundle's report, not just one.
- **No queue of multiple requests** — one live application, one
  `headApprovalStatus`, one detail page.
- **No separate Head login** — this screen and the Officer's
  `HeadApprovalCard` write the same fields; there is no role gate.
- **`'declined'` is a type-level value the decline handler never sets** —
  Decline resets to `'pending'` + clears reports; see
  `docs/110-appraisal.md`'s "Head Approval".
