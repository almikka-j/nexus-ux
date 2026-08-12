# Admin — Appraisal

> **Maintenance rule:** update this file whenever `appraisal-view.tsx` or its
> supporting files (`appraisal/appraisal-fee-card.tsx`,
> `appraisal/appraiser-assignment-card.tsx`, `appraisal/head-approval-card.tsx`,
> `appraisal/pass-fail-card.tsx`) change. Companion to `PROJECT_OVERVIEW.md`
> and `docs/ADMIN_CREDIT_INVESTIGATION.md` (the step immediately before this
> one in the pipeline).

## What this is

"Step 5 · Appraisal" in the admin application-review pipeline
(`src/sections/admin/appraisal-view.tsx`, rendered at
`/admin/applications/[id]/appraisal`). This is the detail workspace for the
`appraisal` step under the sidebar's queue — that nav entry and the
`ReviewStep` type value existed before this page did, deliberately scaffolded
ahead of their workspace (see `PROJECT_OVERVIEW.md`'s admin flow section);
this page is that workspace.

Pipeline position: Initial Credit Checking → Call Report → Requirement
Checklist → Credit Investigation → **Appraisal** → *(Credit Scoring exists
only as a stub page — no real workspace built yet)*. Credit Investigation's
Proceed action routes here (`paths.admin.appraisal`, see
`docs/ADMIN_CREDIT_INVESTIGATION.md`'s "Proceed application?" section); this
page's Pass outcome routes forward to the Credit Scoring stub
(`paths.admin.creditScoring`).

The page is built from the source swimlane process diagram for Appraisal
(fee request/approval → advise client to settle via Sendit/Odoo → appraiser
assignment → Head Approval → Pass/Fail). As with every other admin workspace
in this app, there is no real backend and no real integrations — every
status transition is either a direct officer action or a simulated
"other officer"/"Head" action behind a page button, never a call to any
external service.

Non-goals (see also "Non-goals / Open items" below): the Sendit payment link
and Odoo request are simulated, not real integrations; there is no real
photo capture or lot-plotting for in-house appraiser reports (flagged as
future integration work directly on the card); Credit Scoring beyond the
existing stub page is unbuilt; and the Pass/Fail decision is a manual
officer judgment call, not an automated appraised-value-vs-loan-amount
comparison.

## Page order

1. `ApplicationReviewHeader` (`step="Step 5 · Appraisal"`,
   `reviewStep="appraisal"`, `hideApplicationCard`).
2. `ApplicationDetailsCard` (collapsible, `officerNotesProcess="Appraisal"`).
3. **Pledged Properties** card (read-only).
4. **Appraisal Fee** card.
5. **Appraiser Assignment** card — rendered once the fee is resolved,
   otherwise a locked dashed placeholder in its place.
6. **Head Approval** card — rendered once the fee is resolved *and* a
   report has been submitted, otherwise a locked dashed placeholder (and
   nothing at all until the fee is resolved).
7. **Passed?** (Pass/Fail) card — rendered once Head Approval has approved,
   otherwise a locked dashed placeholder (and nothing at all until the fee
   is resolved and a report is submitted).

Unlike Credit Investigation's page, there's no separate Document Checklist
or "AI review, summary & recommendation" card here — the gating logic
between cards (see below) stands in for a page-level completeness summary.

If `review.appraisal.passed === false`, the entire page is replaced by a
terminal **"Process stopped"** screen (see "Pass/Fail" below) instead of
rendering any of the cards above.

## Pledged Properties

Read-only. Sourced from `review.requirementChecklist.appraisalGroups` — an
array of `AppraisalTctGroup` (`{ id, tctNumber, documents }`), one group per
pledged property (TCT/CCT), each carrying its own copy of the appraisal
document set collected during Requirement Checklist. Rendered here purely
for reference (grouped by TCT number, each document row using the shared
`ReadOnlyRequirementDocRow`), with no upload/edit controls on this page —
the write side of this data lives entirely on Requirement Checklist.

When `review.requirementChecklist.appraisalNotApplicable` is `true` — an
officer's manual "this application has no real-estate collateral"
declaration made on Requirement Checklist, not something derived from loan
type or any other field — this card instead shows a single line: "This
application has no pledged real-estate collateral." No appraisal fee or
appraiser-assignment logic downstream depends on this flag; it only affects
what this card displays.

## Appraisal Fee

`review.appraisal.feeStatus: 'not-requested' | 'pending-approval' |
'approved' | 'declined' | 'not-applicable'` (`AppraisalFeeStatus`,
`src/auth/admin-context.tsx`). `'declined'` is a type-level member that is
never actually observed in the UI — `AppraisalFeeCard`'s decline confirm
handler resets straight back to `'not-requested'` in the same action (same
"decline re-enters at the request step" convention as CI Fee), recording the
reason in `feeDeclineReason` rather than surfacing a distinct "declined"
state on screen. Only four of the five type values ever render:
`not-requested`, `pending-approval`, `approved`, `not-applicable`.

Same state-machine shape as CI Fee (`docs/ADMIN_CREDIT_INVESTIGATION.md`'s
CI Fee section): the officer picks **"Yes, Request Appraisal Fee"** (opens a
form for Request Amount, Request Amount Description, and Remarks, moving the
status to `pending-approval`) or **"No Fee Needed"** (moves straight to
`not-applicable`, reversible via "Actually, this needs a fee"). There's no
separate approver role or login in this prototype, so — unlike CI Fee, whose
two simulated page actions are registered by the *parent* view
(`credit-investigation-view.tsx`) — **`AppraisalFeeCard` registers its own
page actions internally**, appearing in the floating settings popover
(bottom-right gear icon → Page actions) while `feeStatus === 'pending-approval'`:

- **"Simulate: Another Officer Approves Appraisal Fee"** — sets
  `feeStatus: 'approved'` directly, no confirmation dialog.
- **"Simulate: Another Officer Declines Appraisal Fee"** — opens a
  `ConfirmDialog` requiring a typed reason; confirming resets
  `feeStatus: 'not-requested'`, clears amount/description/remarks, and
  records the reason in `feeDeclineReason`.

Once `feeStatus === 'approved'`, an **"Advise Client"** button simulates
three things at once, matching the source diagram's swimlanes: it sets
`clientNotifiedAt` and `sentToOdooAt` together (a client email notification
and a request sent to Odoo — neither a real integration), which unlocks a
second button, **"Simulate: Payment Received (Sendit)"**, setting
`paymentReceivedAt`. The Appraiser Assignment card below only unlocks once
the fee path is fully resolved — `feeStatus === 'not-applicable'`, or
`feeStatus === 'approved'` *and* `paymentReceivedAt` is set (this is the
`feeResolved` gate computed in `appraisal-view.tsx`, not something
`AppraisalFeeCard` decides on its own).

## Appraiser Assignment

Rendered by `appraisal-view.tsx` only when `feeResolved` is true; otherwise
a locked dashed placeholder ("Resolve the Appraisal Fee above to unlock
appraiser assignment.") takes its place.

`review.appraisal.appraiserType: 'inhouse' | 'external' | null`
(`AppraiserType`). A `ButtonGroup` toggle picks between the two, mutually
exclusive — switching type before Head Approval clears the other path's
partial `AppraisalReport` data (`propertyDetails`, `appraisedValue`,
`remarks`, `recommendation`, `fileName`, `fileUrl`, `uploadedAt` all reset).
Both paths write into the same `review.appraisal.report: AppraisalReport`
object (`setAppraisalReport`).

- **In-house** — a structured inline form (Property Details, Appraised
  Value, Remarks, Recommendation), plus a fixed dashed-border note
  (verbatim from the source process diagram): *"Realtime taking picture,
  uploading of files anywhere in the system (integrate lot plotting and
  market value)"* — flagged there as future integration work, not built
  here. **"Create Appraisal Report"** is enabled once Property Details and
  Appraised Value are filled, and sets `report.uploadedAt`.
- **External** — a single dashed file dropzone for the external appraiser's
  finished report (image or PDF). Picking a file sets
  `fileName`/`fileUrl`/`uploadedAt` directly (no separate submit step).

Once `headApprovalStatus !== 'pending'` **or** a report has already been
submitted (`report.uploadedAt` is set), the whole card locks: the inactive
appraiser-type button disables, and form fields/dropzone become read-only.
This keeps the assignment from being silently swapped out from under an
in-flight or already-approved report. The card reconstructs a stand-in
`File` object from `report.fileName` (`new File([], report.fileName)`)
purely so the shared `FileThumbnail`/dropzone display can show a filename —
this is a display-only stand-in with no real bytes behind it, not something
that can be re-downloaded or re-inspected. The external dropzone's own
`disabled` prop (derived from the same locked/`editable` flag) also hides
its delete (×) button once locked — a locked report's file cannot be
cleared via that button, which would otherwise desync the page (Head
Approval's card would revert to its "locked" placeholder while Pass/Fail,
gated separately, stayed open).

## Head Approval

Rendered by `appraisal-view.tsx` only when `feeResolved && reportSubmitted`
(`reportSubmitted = !!report.uploadedAt`); otherwise a locked dashed
placeholder ("Submit the appraisal report above to unlock Head Approval.")
appears once the fee is resolved, and nothing at all before that.

`review.appraisal.headApprovalStatus: 'pending' | 'approved' | 'declined'`
(`HeadApprovalStatus`). As with `feeStatus`'s `'declined'`, `'declined'` is
a type-level member that is **never actually set** by this card's own
decline handler — confirmed by reading `head-approval-card.tsx` directly:
declining calls `setAppraisal({ headApprovalStatus: 'pending', ... })`, i.e.
it resets the status back to `'pending'`, not forward to `'declined'`. Same
simulated single-officer convention as CI Fee/Appraisal Fee approval — no
separate Head login in this prototype:

- **"Simulate: Head Approves"** — sets `headApprovalStatus: 'approved'`
  directly.
- **"Simulate: Head Declines"** — `ConfirmDialog` requiring a typed reason;
  confirming resets `headApprovalStatus: 'pending'`, records the reason in
  `headApprovalDeclineReason`, and clears the submitted report
  (`uploadedAt`/`fileName`/`fileUrl` all reset to `null`) so the assigned
  appraiser resubmits. The `appraiserType` choice itself is preserved — only
  the report contents are cleared, not the in-house/external selection.

While `headApprovalStatus === 'pending'` and a decline reason exists from a
previous round, the card shows "Last decline reason: …" beneath the
"Awaiting Head Approval" status line, so the officer resubmitting the report
can see why the last one was declined.

## Pass/Fail

Rendered by `appraisal-view.tsx` only once `headApprovalStatus === 'approved'`
**and** a report is still submitted (`headApproved && reportSubmitted`) —
the `reportSubmitted` half is a belt-and-suspenders re-lock so Pass/Fail
can't stay open if a report is ever cleared after approval through some
other path. Otherwise a locked dashed placeholder ("Head Approval must
approve the report above to unlock the Pass/Fail decision.") appears once
the fee is resolved and a report is submitted, and nothing at all before
that.

`review.appraisal.passed: boolean | null`. This is a manual officer judgment
call — the app has no automated appraised-value-vs-loan-amount comparison
driving it.

- **Pass** — sets `passed: true` directly, no confirmation dialog. The card
  then shows **"Proceed to Credit Scoring"**, routing to
  `paths.admin.creditScoring(encodeURIComponent(signUpData.email))` — the
  existing Credit Scoring stub page.
- **Fail** — `ConfirmDialog` requiring a typed reason; confirming sets
  `passed: false` and `failReason`, and calls the card's `onFailed` prop.
  `PassFailCard`'s `onFailed` prop is wired from `appraisal-view.tsx` as a
  no-op (`onFailed={() => {}}`) — the actual state transition already
  happened via `setAppraisal` inside the card itself, and `AppraisalView`
  reacts to the updated `review.appraisal.passed` on its own next render;
  the prop is a wire-through, not the mechanism.

When `passed === false`, `AppraisalView` replaces the entire page (all
cards, including `ApplicationReviewHeader`/`ApplicationDetailsCard`) with a
single terminal **"Process stopped"** screen: a centered icon, a message
naming the fail reason ("The appraisal failed: {reason}. Credit
Investigation and Financial Evaluation have been halted, and the client has
been notified by email."), and a **"Back to Application List"** button.
There is no path back from this screen to re-open the appraisal on this
build — Fail is a dead end, matching the source diagram's "process halted"
outcome.

## Queue unlocking

`application-list-view.tsx`'s live-row `isActionable` computation changed
from an array-exclusion form to a single inequality check:
`isActionable: step !== 'financialEvaluation'`. This means the `appraisal`
row is now unconditionally actionable, same as every other built step in
this pipeline (`creditChecking` through `appraisal`) — an admin can reach
this page directly from the queue at any time, regardless of where the live
application actually is in the pipeline. `financialEvaluation` remains the
only always-non-actionable step (unbuilt, no workspace page exists for it
yet).

## Non-goals / Open items

- **Simulated Sendit/Odoo integrations** — the payment link and the request
  sent to Odoo when advising the client to settle the fee are both
  simulated button clicks, not real integrations with either service.
- **No real photo capture or lot-plotting** for in-house appraiser reports —
  flagged directly on the Appraiser Assignment card's dashed note as future
  integration work, not built here.
- **Credit Scoring remains unbuilt** beyond its existing stub page — Pass
  routes there, but there is no real Credit Scoring workspace yet.
- **Pass/Fail is a manual officer judgment call**, not an automated
  appraised-value-vs-loan-amount comparison — this app has no such
  calculation anywhere in the appraisal flow.
