# Admin — Appraisal

> **Maintenance rule:** update this file whenever `appraisal-view.tsx` or its
> supporting files (`appraisal/appraisal-fee-card.tsx`,
> `appraisal/appraiser-assignment-card.tsx`, `appraisal/head-approval-card.tsx`,
> `appraisal/pass-fail-card.tsx`, `appraisal-appraiser-view.tsx`,
> `appraisal-fee-approval-view.tsx`, `appraisal-approver-view.tsx`) change.
> Companion to `PROJECT_OVERVIEW.md` and `docs/ADMIN_CREDIT_INVESTIGATION.md`
> (the step immediately before this one in the pipeline, and where "CI Fee
> Approval" — nested alongside these three under the same "Approval" nav
> dropdown — is documented).
>
> **`AppraisalFeeCard`/`AppraiserAssignmentCard` moved off this page** — the
> fee request/settlement and report creation/upload steps are now the
> Appraiser's own workflow, living on `/admin/appraisal-appraiser`
> (`appraisal-appraiser-view.tsx`) instead of here. This page only shows an
> assigned bundle's report once it's actually submitted (locked with a
> pointer to that page otherwise) — see "Appraisal Fee & Report (moved to
> Appraisal Appraiser)" below.

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
3. **Collateral titles** table — a checkbox row per TCT/CCT, used to select
   properties and assign an appraiser via a modal.
4. **Appraisal Report** cards — one per report bundle created from the
   table above, rendered once its fee has been settled (see "Appraisal Fee
   & Report (moved to Appraisal Appraiser)" below), otherwise a locked
   dashed placeholder pointing at `/admin/appraisal-appraiser`.
5. **Head Approval** card — rendered once every pledged property is
   covered by a submitted report bundle, otherwise a locked dashed
   placeholder.
6. **Passed?** (Pass/Fail) card — rendered once Head Approval has approved,
   otherwise a locked dashed placeholder (and nothing at all until every
   bundle's report is submitted).

Unlike Credit Investigation's page, there's no separate Document Checklist
or "AI review, summary & recommendation" card here — the gating logic
between cards (see below) stands in for a page-level completeness summary.

If `review.appraisal.passed === false`, the entire page is replaced by a
terminal **"Process stopped"** screen (see "Pass/Fail" below) instead of
rendering any of the cards above.

## Collateral titles

A table of every `review.requirementChecklist.appraisalGroups` entry
(`AppraisalTctGroup`, `{ id, tctNumber, documents, reportId }`), one row per
pledged property (TCT/CCT), rendered by
`src/sections/admin/appraisal/appraisal-tct-table.tsx`. The card header
shows an **"X of Y assigned"** pill (`assignedCount` = groups with
`reportId !== null`) next to the title, and a small **"Add TCT"** button
that expands an inline field (`addAppraisalGroup(tctNumber)`, same
duplicate-number validation as Requirement Checklist's own "Add collateral
property" control — it appends to the same `appraisalGroups` array, so a
TCT added here also appears on Requirement Checklist and vice versa). On
add, the table auto-scrolls to the new row and briefly highlights it (green
background + "NEW" badge, fading after ~2s).

Each row has a checkbox, the TCT number, a **"X/8 docs"** count (verified
documents out of `APPRAISAL_DOC_META.length`) with an expand toggle
revealing the full read-only document list (`ReadOnlyRequirementDocRow` —
this page has no upload/edit controls for document contents), and a Status
pill: **Unassigned** (`reportId === null`), **Pending appraiser type**
(belongs to a bundle whose `appraiserType` hasn't been picked yet — not
reachable through the normal assign flow, which always sets a type
immediately, but kept as a defensive label), or **In Report —
In-house/External**. A row's checkbox is disabled once its bundle's report
has been submitted (`report.uploadedAt` set).

Checking one or more `Unassigned` rows (or rows already in an *unsubmitted*
bundle) reveals a selection bar **below** the table — "N titles selected",
plus a note ("Assigning together creates one consolidated report" for 2+
titles, or a warning if the selection spans two different bundles) — with
**"Clear"** and an assign action:

- If every checked row is `Unassigned`, the button reads **"Assign
  appraiser"** and opens the Assign Appraiser modal (see below).
- If the checked rows all belong to the same single unsubmitted bundle
  (plus optionally some `Unassigned` rows), the button reads **"Add to
  Report"** instead — no modal, since the bundle's type/appraiser are
  already set — calling `addTctGroupsToReportBundle(bundleId, newGroupIds)`.
- If the checked rows span two or more different bundles, the button
  disables with "Select properties from only one report at a time" —
  merging two bundles isn't supported.

### Assign Appraiser modal

A `Dialog` (not an inline panel) listing the selected TCT numbers, then:

- **Appraiser type** — two large selectable cards, In-house ("Fills report
  in system") / External ("Uploads their report"), same meaning as the
  existing `AppraiserType` — only which form/dropzone the resulting
  Appraisal Report card renders.
- **Assign to** — a `Select` populated from `APPRAISER_ROSTER`
  (`src/auth/admin-context.tsx`), a fixed sample list of specific
  appraiser/company names, stored on the bundle as `appraiserName: string |
  null`. Deliberately a separate roster from Application List's officer
  roster — an appraiser is a different role from a loan officer, and this
  prototype has no real backend to look either up from.
- **Target completion date** — a plain date input, stored as
  `targetCompletionDate: string | null` on the bundle. Informational only;
  no reminder/overdue logic reads it anywhere yet.

Confirming calls `createAppraisalReportBundle(tctGroupIds, appraiserType,
appraiserName, targetCompletionDate)`, creating a new
`AppraisalReportBundle` and stamping every selected group's `reportId`.
There is no Appraisal Fee toggle inside this modal — fee decisions stay on
the existing **Appraisal Fee** card below (see next section); adding it
here would create two competing places to decide the same thing.

When `review.requirementChecklist.appraisalNotApplicable` is `true` — an
officer's manual "this application has no real-estate collateral"
declaration made on Requirement Checklist, not something derived from loan
type or any other field — this whole card is replaced by a single line,
"This application has no pledged real-estate collateral." No appraisal fee
or appraiser-assignment logic downstream depends on this flag; it only
affects what this section displays.

## Appraisal Fee & Report (moved to Appraisal Appraiser)

`AppraisalFeeCard` (`src/sections/admin/appraisal/appraisal-fee-card.tsx`)
and `AppraiserAssignmentCard`
(`src/sections/admin/appraisal/appraiser-assignment-card.tsx`) are no
longer rendered on this page at all — the Appraiser's own post-assignment
work (request the fee, wait for it to clear, submit the report once the
client has paid) now lives entirely on `/admin/appraisal-appraiser`
(`appraisal-appraiser-view.tsx`, see "Approval-role screens" below). This
page only renders a bundle's `AppraiserAssignmentCard` once its fee is
fully settled — `feeStatus === 'not-applicable'`, or `feeStatus ===
'approved'` *and* `paymentReceivedAt` is set (`feeSettled` computed
locally in `appraisal-view.tsx`) — otherwise a locked dashed placeholder
appears pointing the officer at the Appraisal Appraiser page to complete
that work. The Collateral titles table's selection/bundle-creation flow
itself is still not gated on the fee — an officer can group TCTs and
assign an appraiser via the modal at any time; only each bundle's
*report* card waits for `feeSettled`.

`review.appraisal.feeStatus`'s full state machine (`'not-requested' |
'pending-approval' | 'approved' | 'declined' | 'not-applicable'`), the
request amount/description/remarks, "Advise Client"/Sendit/Odoo, and
"Payment Received" are unchanged — only *where* they're surfaced moved.

## Appraisal Report (per bundle)

`review.appraisal.reportBundles: AppraisalReportBundle[]` — each entry is
`{ id, tctGroupIds, appraiserType, appraiserName, targetCompletionDate,
report }`, created by selecting TCT rows in the Collateral titles table
above and assigning an appraiser via its modal (see above). Once its fee
is settled (see above), `appraisal-view.tsx` renders one **"Appraisal
Report"** card per bundle (`AppraiserAssignmentCard`, taking `{ bundleId,
tctNumbers }` props instead of reading a single whole-application
`review.appraisal` field, as it did before this page tracked multiple
bundles) — the exact same component the Appraisal Appraiser page renders
for its own in-progress bundles, so a report started on one page shows
correctly on the other.

Each card's subtitle lists which TCT numbers it covers ("Covers
TCT-2024-00981, TCT-2024-00982"). A `ButtonGroup` toggle picks between
`'inhouse'`/`'external'` (`AppraiserType`), mutually exclusive — switching a
bundle's type before its report is submitted clears the other path's
partial `AppraisalReport` data (`propertyDetails`, `appraisedValue`,
`remarks`, `recommendation`, `fileName`, `fileUrl`, `uploadedAt` all reset),
scoped to that one bundle via `setAppraisalBundleAppraiserType`. Both paths
write into that bundle's own `report: AppraisalReport` object via
`setAppraisalBundleReport`.

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

Once `headApprovalStatus !== 'pending'` **or** that bundle's report has
already been submitted (`report.uploadedAt` is set), the card locks: the
inactive appraiser-type button disables, and form fields/dropzone become
read-only. This keeps the assignment from being silently swapped out from
under an in-flight or already-approved report. The card reconstructs a
stand-in `File` object from `report.fileName` (`new File([],
report.fileName)`) purely so the shared `FileThumbnail`/dropzone display can
show a filename — this is a display-only stand-in with no real bytes
behind it, not something that can be re-downloaded or re-inspected. The
external dropzone's own `disabled` prop (derived from the same
locked/`editable` flag) also hides its delete (×) button once locked — a
locked report's file cannot be cleared via that button, which would
otherwise desync the page.

## Head Approval

Rendered by `appraisal-view.tsx` only when `reportSubmitted`, meaning every
pledged property is covered by some report bundle **and** every bundle's
report has been submitted: `appraisalNotApplicable ||
(appraisalGroups.every(g => g.reportId !== null) && reportBundles.length
> 0 && reportBundles.every(b => !!b.report.uploadedAt))`. Otherwise a
locked dashed placeholder ("Submit the appraisal report above to unlock
Head Approval.") appears.

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
  `headApprovalDeclineReason`, and calls `clearAllAppraisalBundleReports()`,
  clearing the submitted report (`uploadedAt`/`fileName`/`fileUrl` all reset
  to `null`) on **every** bundle so each assigned appraiser resubmits. Each
  bundle's `appraiserType` and TCT membership are preserved — only report
  contents are cleared.

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

## Approval-role screens (Appraisal Appraiser / Fee Approval / Approver)

Three dedicated queue screens, nested under the **"Approval"** nav dropdown
(`approvalItems`, `src/layouts/admin/config-nav-admin.tsx`) alongside "CI
Fee Approval" (which moved into this same dropdown as its first entry —
see `docs/ADMIN_CREDIT_INVESTIGATION.md`). None of these are
`application-list-view.tsx`'s `?step=` queue; each is a standalone view
filtering on a derived condition, since none of "needs an appraiser"/"fee
pending"/"awaiting Head Approval" is a `ReviewStep`.

**Appraisal Fee Approval** and **Appraisal Approver** render their queue
as a real table (`Table`/`TableHead`/`TableRow`/`TableCell`, matching
`application-list-view.tsx`'s main queue table styling — deterministic
per-borrower avatar palette (`getAvatarPalette`, duplicated locally in
each view file — not shared/exported from `application-list-view.tsx`),
uppercase muted column headers, status pill with dot indicator) rather
than `ci-fee-approval-view.tsx`'s stacked-card `QueueRow` rows, since each
reads more naturally as a straight applicant list than as cards. Neither
table is clickable — instead, a detail card with the real working
Approve/Decline actions renders below the table whenever the live
application's row is present, same "list above, detail card below" layout
`ci-fee-approval-view.tsx` uses, just with the list itself now a table.

There is no role/permission system in this app (`AdminUser` has no role
field — every session is one undifferentiated admin), so nothing gates
who can open any of these four screens; they exist as distinct
workflow-framing destinations, not access-controlled ones. **Appraisal
Appraiser** is the one exception in spirit, not enforcement: it's
deliberately framed as the signed-in appraiser's own personal workspace
(see below) even though, mechanically, any admin session can still open
it.

- **Appraisal Appraiser** (`/admin/appraisal-appraiser`,
  `appraisal-appraiser-view.tsx`) — framed as "My Assignments," an
  Appraiser's personal workspace rather than an admin approval queue: an
  "APPRAISER WORKSPACE" eyebrow label, first-person copy ("Claim pledged
  properties…", "My Active Assignments"), and **no sample filler rows at
  all** — unlike every other queue in this app, since a real appraiser's
  workspace would never show other people's unrelated applications. If
  there's no live application, or nothing needs attention, each section
  just reads as empty ("Nothing available right now…" /
  "No active assignments right now…"), same as a real inbox with nothing
  pending. Two sections:
  - **"Available for Assignment"** — pledged properties (TCTs) whose
    `AppraisalTctGroup.reportId` is still `null`
    (`appraisalGroups.filter(g => g.reportId === null)`, live application
    only; empty entirely if `appraisalNotApplicable`), each row rendered
    as a plain list item (icon, TCT number, applicant name/App No.) with
    a **"Claim"** button. Claiming still routes into
    `paths.admin.appraisal(email)` — the actual Collateral titles
    table/Assign Appraiser modal live entirely on the Appraisal page
    itself, not duplicated here — but the button reads "Claim," not
    "Assign appraiser," to match the personal-workspace framing.
  - **"My Active Assignments"** — one row when the live application has
    an appraiser assigned (`reportBundles.length > 0`) but still needs
    the fee requested, cleared, or the report submitted once paid
    (`!(feeSettled && allBundlesSubmitted)`). Instead of a status pill,
    each assignment shows a 5-step `ProgressTracker` (Assigned → Fee
    requested → Fee approved → Client paid → Report submitted, filled
    icons up to the current step) computed from `feeStatus`/
    `paymentReceivedAt`/bundle submission state. Clicking the row toggles
    an inline detail panel below both sections that renders
    `AppraisalFeeCard` (request/advise-client/payment-received — the same
    component `appraisal-view.tsx` used to render directly) and, once
    `feeSettled`, one `AppraiserAssignmentCard` per bundle (create/upload
    report — same component `appraisal-view.tsx` still renders for
    already-settled bundles).
- **Appraisal Fee Approval** (`/admin/appraisal-fee-approval`,
  `appraisal-fee-approval-view.tsx`) — lists applications where
  `review.appraisal.feeStatus === 'pending-approval'`. Same
  Approve/Decline shape as CI Fee Approval, writing directly to
  `review.appraisal` via `setAppraisal` (`feeStatus: 'approved'` on
  approve; reset to `'not-requested'` plus a typed `feeDeclineReason` on
  decline). Sample rows come from `SampleApplicationEntry.
  appraisalFeePending: { amount: string; appraiserName: string }`.
- **Appraisal Approver** (`/admin/appraisal-approver`,
  `appraisal-approver-view.tsx`) — lists applications where every pledged
  property is covered by a submitted report bundle and
  `headApprovalStatus === 'pending'` (the same `reportSubmitted`
  computation `appraisal-view.tsx` uses to unlock its own Head Approval
  card, duplicated here rather than shared since the two files don't
  currently import from each other). Approve/Decline reuse the exact same
  `setAppraisal`/`clearAllAppraisalBundleReports` setters
  `head-approval-card.tsx` calls — declining clears every bundle's
  submitted report the same way. Sample rows come from
  `SampleApplicationEntry.appraisalAwaitingHeadApproval: { appraiserName:
  string }`.

None of these three screens' live-application actions redirect or show a
one-time outcome screen (unlike CI Fee Approval's `OutcomeScreen`) — they
stay on the same page and the row/detail card simply update to reflect the
new state (or disappear from "pending" once resolved), matching how the
underlying cards on `appraisal-view.tsx` already behave in place.

## Non-goals / Open items

- **Simulated Sendit/Odoo integrations** — the payment link and the request
  sent to Odoo when advising the client to settle the fee are both
  simulated button clicks, not real integrations with either service. Now
  triggered from the Appraisal Appraiser page (see "Appraisal Fee & Report
  (moved to Appraisal Appraiser)" above), not this page.
- **No real photo capture or lot-plotting** for in-house appraiser reports —
  flagged directly on each Appraisal Report card's dashed note as future
  integration work, not built here.
- **Credit Scoring remains unbuilt** beyond its existing stub page — Pass
  routes there, but there is no real Credit Scoring workspace yet.
- **Pass/Fail is a manual officer judgment call**, not an automated
  appraised-value-vs-loan-amount comparison — this app has no such
  calculation anywhere in the appraisal flow.
- **`APPRAISER_ROSTER` is a fixed sample list**, not a real appraiser
  directory — there is no backend anywhere in this app, so "Assign to"
  choices are hardcoded names/companies, not looked up from any system.
- **`targetCompletionDate` is informational only** — nothing reads it for
  reminders, overdue flags, or sorting; it is simply stored and never
  surfaced elsewhere on this page.
- **No merging two existing report bundles** — if a selection spans TCTs
  from two different bundles, the Collateral titles table blocks the
  action rather than combining them.
