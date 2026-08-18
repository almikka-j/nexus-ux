# Admin — Appraisal

> **Maintenance rule:** update this file whenever `appraisal-view.tsx` or its
> supporting files (`appraisal/appraiser-assignment-card.tsx`,
> `appraisal/appraisal-report-view.tsx`,
> `appraisal/assigned-appraiser-card.tsx`,
> `appraisal/head-approval-card.tsx`,
> `appraisal/pass-fail-card.tsx`, `appraisal-appraiser-view.tsx`,
> `appraisal-appraiser-bundle-view.tsx`,
> `appraisal-fee-approval-view.tsx`, `appraisal-approver-view.tsx`) change.
> Companion to `PROJECT_OVERVIEW.md`
> and `docs/ADMIN_CREDIT_INVESTIGATION.md` (the step immediately before this
> one in the pipeline, and where "CI Fee Approval" — nested alongside these
> three under the same "Request" nav dropdown — is documented).
>
> **Fee is proposed per bundle, submitted as one batch — but requesting it
> is the Appraiser's job, not the Officer's.** The Officer only assigns an
> appraiser to each pledged property on **this** page — no fee decision is
> made here at all. The fee UI (Yes/No + amount/description/remarks per
> bundle) lives entirely on `/admin/appraisal-appraiser`
> (`appraisal-appraiser-view.tsx`), inside each row's expandable panel — it's
> the Appraiser who requests the fee, since they're the one who needs it
> paid before they can do the on-site work the fee covers. Once **every**
> pledged property has an appraiser (and therefore a fee decision), the
> Appraiser submits the batch as **one** request via a page-level "Submit
> Fees for Approval" action; the Head/Approver reviews and approves/declines
> the whole batch in a single action, not one bundle's fee at a time. There
> is no standalone `AppraisalFeeCard` component any more — its contents were
> dissolved into `appraisal-appraiser-view.tsx` directly (see "Appraisal Fee"
> below for the full model:
> `review.appraisal.feeApprovalStatus`, `AppraisalReportBundle.feeNeeded`/
> `feeAmount`/`feeDescription`/`feeRemarks`).
>
> Report creation/upload is *also* entirely the Appraiser's own workflow,
> living on the same `/admin/appraisal-appraiser` page
> (`AppraiserAssignmentCard`) — **this (Officer) page never renders that
> editable form, nor the fee-request card, nor a submitted report's
> contents inline.** Once a bundle's report is submitted, the Officer sees
> it via `AssignedAppraiserCard`'s **"View Report"** button, which opens a
> `Dialog` showing that bundle's read-only `AppraisalReportView` — not a
> scroll-to-section link down to a card rendered directly on the page (the
> per-bundle report cards that used to sit between `AssignedAppraiserCard`
> and Head Approval have been removed entirely). See "Appraisal Fee",
> "Assigned Appraiser", and "Appraisal Report (per bundle)" below.
>
> **A submitted report goes straight to Head Approval — there is no
> Appraisal Officer review step in between.** The full chain is Appraiser
> → Head Approver → Credit Scoring. Once every pledged property's report
> is submitted (`reportSubmitted`), `appraisal-view.tsx` renders
> `HeadApprovalCard` directly (`{reportSubmitted && <HeadApprovalCard />}`)
> — no intermediate "Review Appraisal Reports" card, no explicit
> officer-side forwarding action. (An officer-review card with its own
> forwarding-flag gate briefly sat between Appraiser submission and Head
> Approval and has since been fully reverted — see "Head Approval" below
> for what a Head decline does now.)

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
   properties and assign an appraiser (plus that bundle's fee decision) via
   a modal.
4. **Assigned Appraiser** card (`AssignedAppraiserCard`) — rendered
   whenever at least one bundle exists (`!appraisalNotApplicable &&
   reportBundles.length > 0`), regardless of fee/report state. A read-only
   "who's doing what" summary — one bordered row per bundle, TCT number(s)
   + target completion date (if set) on the left, the assigned appraiser's
   name on the right (or a muted "No appraiser assigned" for a bundle whose
   type/roster pick somehow wasn't set) — see "Assigned Appraiser" below.
   Nothing here is editable; reassigning still only happens via the
   Collateral titles table's Assign Appraiser modal.
5. **No per-bundle Appraisal Report cards render on this page at all.**
   There used to be one card per report bundle directly after Assigned
   Appraiser — each either a completed read-only `AppraisalReportView` or
   a locked "waiting for appraiser" placeholder — but that loop has been
   deleted from `appraisal-view.tsx` entirely. A submitted report is now
   only ever viewed via `AssignedAppraiserCard`'s **"View Report"** button,
   which opens that bundle's `AppraisalReportView` inside a `Dialog` owned
   by `AssignedAppraiserCard` itself — see "Assigned Appraiser" and
   "Appraisal Report (per bundle)" below. **No Appraisal Fee card renders
   on this page at all** either — see the note below and "Appraisal Fee"
   further down.
6. **Head Approval** card — rendered once `reportSubmitted` (every pledged
   property's report is submitted), otherwise nothing renders in its place
   (no locked placeholder — removed for being redundant noise; see below).
   There is no intermediate officer-review step between report submission
   and this card — see "Head Approval" below.
7. **Passed?** (Pass/Fail) card — rendered once Head Approval has approved,
   otherwise nothing renders in its place (no locked placeholder — same
   removal as Head Approval's).

Unlike Credit Investigation's page, there's no separate Document Checklist
or "AI review, summary & recommendation" card here — the gating logic
between cards (see below) stands in for a page-level completeness summary.

If `review.appraisal.passed === false`, the entire page is replaced by a
terminal **"Process stopped"** screen (see "Pass/Fail" below) instead of
rendering any of the cards above.

## Collateral titles

A table of every `review.requirementChecklist.appraisalGroups` entry
(`AppraisalTctGroup`, `{ id, tctNumber, collateralType, documents,
reportId }`), one row per pledged property, rendered by
`src/sections/admin/appraisal/appraisal-tct-table.tsx`. The card header
row matches `ApplicationDetailsCard`'s title-row convention: the
"Collateral" title (renamed from "Collateral titles" — kept generic since
a pledged property isn't always real estate with an actual TCT/CCT title;
chattel collateral has no title document at all, so a label implying one
always exists was misleading) + one-line description stack on the left, and
the **"Request Document"** / **"Add Collateral"** buttons — plain
`outlinedNavyButtonSx` outlined buttons at default MUI size, same as
"View full application" — sit inline on the right of that same row.

`collateralType: 'real-estate' | 'chattel'` (`AppraisalCollateralType`)
distinguishes titled real property from chattel (no title document — e.g.
a vehicle or equipment), defaulting to `'real-estate'` everywhere (the 5
seed rows, and the "Add Collateral" form unless the officer switches it).
Older stored sessions from before this field existed are topped up to
`'real-estate'` on hydration (`readStoredState()`), same convention as
other backfilled fields on this page.

"Add Collateral" (renamed from "Add TCT") expands an inline form —
a compact **Type** `Select` (Real Estate / Chattel) next to the number
`TextField`, whose placeholder swaps between `"e.g. TCT-2024-00991"` and
`"e.g. Plate/Serial No."` depending on the selected type — then
`addAppraisalGroup(tctNumber, collateralType)` (same duplicate-number
validation as Requirement Checklist's own "Add collateral property"
control — it appends to the same `appraisalGroups` array, so an entry
added here also appears on Requirement Checklist and vice versa, though
Requirement Checklist's own add control still only creates
`'real-estate'` entries — `addAppraisalGroup`'s second param is optional
and defaults there). On add, the table auto-scrolls to the new row and
briefly highlights it (green background + "NEW" badge, fading after ~2s).

**Collapsible only once every property is assigned.** The title/subtitle
block only becomes clickable — cursor turns to a pointer and a chevron
`IconButton` appears — once `allGroupsAssigned`
(`appraisalGroups.length > 0 && appraisalGroups.every(g => g.reportId !==
null)`). Before that, the header renders with no chevron and no
`onClick` at all: the officer still has unassigned rows to act on here,
so collapsing the table away would hide exactly the rows that still need
attention. A `useEffect` auto-closes it (`tableOpen: false`) the instant
`allGroupsAssigned` flips true — at that point there's nothing left to
select/assign, so keeping the full table expanded only pushes whatever
follows further down the page. Once collapsed this way, the officer can
still click the header to reopen it (toggling `tableOpen`) to review or
re-check assignments. (This used to auto-collapse on
`feeApprovalStatus === 'pending-approval'` instead — the fee batch being
submitted — but that state now lives on the Appraiser's own page instead
of the Officer's, and doesn't reliably fire at the moment that actually
matters for *this* page: every property having an appraiser. See
"Appraisal Fee" for where fee submission actually happens now.) The
Assign Appraiser modal (a `Dialog`) sits *outside* this collapsed region
regardless, unaffected by `tableOpen`. The "X of Y assigned" pill and the
Request Document/Add Collateral buttons stay visible whether the table
is open or collapsed, so the officer can always glance at progress or
start a new request without reopening the table.

The whole block — header, "Add TCT" form, table, and selection bar — sits in
one `adminCardSx` card (matching the other Appraisal-page cards), with the
table itself styled to match the system's other tables (e.g.
`application-list-view.tsx`'s application table): a fixed-layout `Table`
with column-width percentages, a bordered/rounded `TableContainer`, and a
styled `TableHead` row (`#FBFBFD` background, uppercase 11px labels in
`#8891A6`). Status pills use the same dot-indicator convention (a small
solid circle in the tone color next to the label) as other status columns
in the system.

Each row has a checkbox, the **Collateral No.** (renamed from "TCT No."
— same generic reasoning as the card title), a **Type** column showing
"Real Estate" or "Chattel" (`COLLATERAL_TYPE_LABEL[group.collateralType]`,
plain text, no chip/pill — the Status column already carries the row's
badge, a second one would be visual noise) between it and Documents, a
**"X/8 docs"** count (verified documents out of
`APPRAISAL_DOC_META.length`), a Status pill —
**Unassigned** (`reportId === null`), **Pending appraiser type** (belongs
to a bundle whose `appraiserType` hasn't been picked yet — not reachable
through the normal assign flow, which always sets a type immediately, but
kept as a defensive label), or **In-house/External** (shortened from the
old "In Report — …" label now that the bundle's appraiser type is also
implied by the Appraiser column) — an **Appraiser** column showing the
bundle's `appraiserName` plus its type in parentheses (e.g. "Ramon Dela
Cruz (In-house)"), or "Not yet assigned" in a muted tone, and a trailing
expand toggle (rightmost column) revealing the full read-only document list
(`ReadOnlyRequirementDocRow` — this page has no upload/edit controls for
document contents). A row's checkbox disables the moment it's assigned to
a bundle (`isRowLocked = !!bundleForGroup(groupId)`) — an already-assigned
TCT can never be re-checked to combine it with other rows, so a fresh
selection can only ever be a set of still-`Unassigned` rows. (There used
to be a narrower version of this gate — only locking once the bundle's
*report* was submitted — that let an officer keep adding TCTs to an
already-assigned, not-yet-submitted bundle via an "Add to Report" action;
that capability, `addTctGroupsToReportBundle`, and its selection-bar
branch were removed, since a TCT should stop being selectable the moment
it's assigned, full stop.)

### Request Document modal

The **"Request Document"** button opens a `Dialog` for asking the borrower
for specific documents on one collateral title:

- **Collateral No.** (renamed from "TCT No.") — a `Select` listing every
  `appraisalGroups` entry by its collateral number.
- **Documents** — a multi-select `Select` (checkbox `MenuItem`s, chip
  `renderValue`) populated from `APPRAISAL_DOC_META`, letting the officer
  pick one or more document labels to request.
- **Remarks** — a free-text `TextField` (same multiline convention used by
  CI Fee/Appraisal Fee's Remarks fields) for optional notes.

Sending calls `addDocumentRequestMessage({ tctGroupId, documentKeys,
remarks })`, which appends a `DocumentRequestMessage` (`{ id, tctGroupId,
documentKeys, remarks, sentAt }`) to a new
`review.requirementChecklist.documentRequests` array — a simulated send,
like `outreachMessages`, with no real email/WhatsApp/Viber message actually
sent anywhere in this prototype. The dialog then shows a one-time "Document
request sent" confirmation screen (mirroring the Assign Appraiser modal's
non-reversible-action pattern) before closing.

Below the form (and below the success screen, on reopen) the dialog also
renders a **Request history** list — every `documentRequests` entry, newest
first, showing the TCT number, sent timestamp, requested document chips, and
remarks. This makes prior sends visible instead of only living silently in
the data model; the modal itself stays a repeatable action (each send just
appends another history entry).

Checking one or more `Unassigned` rows reveals a selection bar **below**
the table — "N titles selected", plus a note ("Assigning together creates
one consolidated report" for 2+ titles) — with **"Clear"** and a single
**"Assign appraiser"** button that opens the Assign Appraiser modal (see
below). Since every row's checkbox locks the instant it's assigned, a
selection can never span an already-assigned row, so there's no
multi-bundle case to guard against here anymore.

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
  prototype has no real backend to look either up from. Required — the
  "Assign appraiser" confirm button stays disabled until a name is picked,
  since the Collateral titles table's Appraiser column reads directly off
  this field and an unnamed bundle would otherwise show as "Not yet
  assigned" despite having been "assigned" (a type + roster confirmation).
- **Target completion date** — a plain date input, stored as
  `targetCompletionDate: string | null` on the bundle. Informational only;
  no reminder/overdue logic reads it anywhere yet.

**No Appraisal Fee section in this modal.** It used to also show "Does
this application need an Appraisal fee?" (a `FeeNeededOption` card pair +
Request Amount/Description/Remarks fields), answered by the Officer at
assign time — that's been removed entirely. Requesting the Appraisal Fee
is the **Appraiser's** job, not the Officer's, so the fee decision now
lives exclusively on `/admin/appraisal-appraiser`
(`appraisal-appraiser-view.tsx` — see "Appraisal Fee" below). This modal
only ever collects Appraiser type/name/target
date; the confirm button stays disabled until just a name is picked, and
never relabels to "Assign with Fee" (that label variant was removed along
with the fee section).

Confirming calls `createAppraisalReportBundle(tctGroupIds, appraiserType,
appraiserName, targetCompletionDate)` — the optional 5th `fee` param is
no longer passed from here, so every new bundle starts with `feeNeeded:
null` (the factory's default) and picks up its actual fee decision later,
directly from the Appraiser's own page.

When `review.requirementChecklist.appraisalNotApplicable` is `true` — an
officer's manual "this application has no real-estate collateral"
declaration made on Requirement Checklist, not something derived from loan
type or any other field — this whole card is replaced by a single line,
"This application has no pledged real-estate collateral." No appraisal fee
or appraiser-assignment logic downstream depends on this flag; it only
affects what this section displays.

**Removed: standalone "Appraisal status" card.** A card summarizing
Appraisal fee/payment/report status with plain-label pills briefly lived
directly on this page (above the fee/assignment/report cards) so the
officer had an at-a-glance read that never disappeared once the fee was
settled. It was removed for being confusing and redundant — the same
information (fee status, appraiser per TCT, report submission) is already
visible via `AssignedAppraiserCard` below and the Collateral titles
table's Appraiser column, so a third summary surface just added noise.
(The shared `ProgressTracker`/`appraisalProgressIndex`
(`src/sections/admin/appraisal/progress-tracker.tsx`) that once backed
this — and, later, a per-assignment progress display on
`/admin/appraisal-appraiser` — has since been deleted from the codebase
entirely; see "Appraiser" under "Approval-role screens" below for what
replaced it there.)

### Dev/testing page actions

`AppraisalTctTable` registers three always-on entries in the shared
gear-icon Settings popover (`useRegisterPageActions` /
`src/layouts/admin/page-actions-context.tsx`) — **"Auto-assign All
TCTs"** folds every still-`Unassigned` group into its own single-property
in-house bundle (cycling `APPRAISER_ROSTER`); **"Unassign All
TCTs"** deletes every bundle and resets every group's `reportId` back to
`null`; and **"Simulate: Appraiser Submits Report"** fills in
`bundle.report` for every bundle that doesn't yet have
`report.uploadedAt` and stamps `uploadedAt`, simulating the Appraiser
having already filled in and submitted their report on the Appraisal
Appraiser page — in-house bundles get a full sample REM (every section
`AppraisalReportView` renders: Land/title details, Technical
Specification, Utilities, Construction Features, Basis of Valuation, the
FMV/RCN valuation table with a ₱2,500,000 Appraised Value, and the
Prepared/Reviewed/Endorsed/Noted-by chain), external bundles get a fake
uploaded file (mirroring what `handleExternalFile` actually stores). It
only ever fills bundles missing a report, so re-clicking after new
bundles are assigned won't clobber a report an appraiser (or this same
action) already submitted. All three are dev/testing conveniences for
reaching downstream states quickly, not user-facing officer actions.

`appraisal-appraiser-view.tsx` itself registers two more entries the
moment a fee batch is `pending-approval` (see "Appraisal Fee" below) —
**"Simulate: Another Officer Approves/Declines Appraisal Fees."** These
show on `/admin/appraisal-appraiser`'s Settings popover only, since
fee-requesting is exclusively the Appraiser's action and this page is
where it happens (there is no standalone `AppraisalFeeCard` component any
more — see "Appraisal Fee" below for where its contents live now).

The same page also registers **"Simulate: Request CI Fee"** while
`review.creditInvestigation.ciFeeStatus === 'not-requested'` — a
dev/testing shortcut that calls `setCreditInvestigation({ ciFeeStatus:
'pending-approval', ciFeeAmount: '2500', ciFeeAmountDescription: 'Credit
investigation fee', ciFeeRemarks: '' })` directly, the same transition
`CiFeeCard`'s own "Yes, Request CI Fee" form makes (see
`docs/ADMIN_CREDIT_INVESTIGATION.md`), just with fixed sample values
instead of officer-typed ones. This exists so a tester already on the
Appraiser page — several steps downstream of Credit Investigation — can
fast-forward CI Fee's own request step (the very first fee-gate in the
whole pipeline) without navigating all the way back to
`/admin/applications/[id]/credit-investigation` to trigger it manually.
It disappears once `ciFeeStatus` moves past `'not-requested'`, so it
can't be used to stomp on a request already pending/approved/declined —
the actual approve/decline simulation for it still lives on
`credit-investigation-view.tsx` (**"Simulate: Another Officer
Approves/Declines CI Fee"**) and on `/admin/ci-fee-approval`
(`ci-fee-approval-view.tsx`), not here.
`page-actions-context.tsx` still keys registered actions by a stable
per-caller id and merges them (`Object.values(actionsByRegistrant).flat()`)
rather than one `useRegisterPageActions` caller's `setActions(...)`
replacing whatever another caller registered — a real bug this page
surfaced back when `AppraisalTctTable` and the old standalone
`AppraisalFeeCard` briefly co-mounted on the same page
(`appraisal-view.tsx`), where the second one to run its effect silently
erased the first's entries from the popover. The merge fix itself is
still load-bearing today for `AppraisalTctTable`'s own three entries
co-existing with each other, even though the specific two-different-cards
scenario that surfaced the bug no longer occurs on this page.

## Assigned Appraiser

`AssignedAppraiserCard` (`src/sections/admin/appraisal/assigned-appraiser-card.tsx`)
is a small read-only summary card rendered directly on `appraisal-view.tsx`
whenever at least one report bundle exists
(`!appraisalNotApplicable && reportBundles.length > 0`) — a quick
"who's assigned to what" glance without opening the Collateral titles
table's per-row Appraiser column or the Assign Appraiser modal. It has no
gating condition beyond a bundle existing — unlike every other card on
this page, it doesn't wait on fee status, report submission, or Head
Approval, since it's purely informational.

Lists every `reportBundles` entry as a bordered row (same bordered-row
convention used for the Appraiser page's own per-bundle fee panels). The
**left side** of
each row stacks three lines: the bundle's TCT number(s), then
`bundle.appraiserName` directly beneath it (or a muted "No appraiser
assigned" if somehow unset), then, if set, its `targetCompletionDate`
(formatted via `toLocaleDateString()`). Deliberately does **not** also
show `appraiserType` (In-house/External) as a separate line —
`APPRAISER_ROSTER` names already embed that distinction for in-house
appraisers (e.g. "Ramon Dela Cruz (In-house)"), so a separate "In-house"
label would repeat the same information the Collateral titles table's own
appraiser-name-duplication bug already taught this codebase to avoid (see
that table's `bundle.appraiserName` usage — no appended type suffix there
either). The appraiser name lives in this left-side stack — not beside a
status pill on the right — so the right side of the row stays exclusively
a single status/action element (see below); an earlier version placed the
name next to the status pill on the right, which was moved into the left
column once report submission needed a *button* there instead of a
label, and the name reads more naturally directly under its own TCT
number than floating next to an unrelated status pill anyway.

Nothing on this card is editable — reassigning an appraiser, or changing
the target completion date, still only happens through the Collateral
titles table's Assign Appraiser modal. This card is purely a summary
surface layered on top of the same `reportBundles` data every other card
on this page reads.

The **right side** of each row is either a static status pill or a "View
Report" button — never both — computed per bundle by `bundleStatus()`
from the batch `feeApprovalStatus` + `feeSettled` + that specific
bundle's own `report.uploadedAt` (in that priority order: a submitted
report always wins, overriding whatever the batch-level fee state would
otherwise imply). `bundleStatus()` returns `null` for "reported" rather
than a 4th status value — the caller (`AssignedAppraiserCard`) treats
`null` as "render the button instead of a pill":

- **On Process** (neutral gray pill) — `feeApprovalStatus ===
  'not-submitted'`. The appraiser is assigned but hasn't requested their
  fee yet.
- **For Approval** (warning/amber pill) — `feeApprovalStatus ===
  'pending-approval'`. The Appraiser has submitted the fee batch from
  their own page; waiting on the Head/Approver.
- **For Report** (info/blue pill) — `feeApprovalStatus === 'approved' &&
  feeSettled` but this bundle's `report.uploadedAt` is still `null`. The
  fee is cleared; the appraiser should now be doing the on-site work and
  filling in/uploading the report.
- **`bundle.report.uploadedAt` set** → no pill at all — instead, a
  **"View Report"** `Button` (`outlinedNavyButtonSx`, eye icon) that sets
  local state (`setViewReportBundleId(bundle.id)`) instead of scrolling
  anywhere. `AssignedAppraiserCard` itself owns a MUI `Dialog`
  (`open={!!viewReportBundle}`) with a `DialogTitle` ("Appraisal Report" +
  a close `IconButton`) and a `DialogContent` rendering
  `<AppraisalReportView bundleId={viewReportBundle.id}
  tctNumbers={viewReportTctNumbers} />` for whichever bundle's button was
  clicked — the report's contents are shown in a modal, not duplicated
  inline on this summary card and not scrolled to as a separate section
  further down the page. (An earlier version showed a green "Reported"
  pill that was itself clickable — replaced with an explicit button once
  it became clear a clickable *label* read ambiguously as just another
  status indicator, not an actionable control. A still-earlier version of
  this button scrolled down to a per-bundle `AppraisalReportView` card
  that used to render inline on `appraisal-view.tsx` via
  `document.getElementById('appraisal-report-' + bundle.id)
  ?.scrollIntoView(...)`; that inline per-bundle report loop has since
  been removed from `appraisal-view.tsx` entirely, so there's no longer
  any on-page section to scroll to — the Dialog replaced the scroll
  target rather than pointing at it.)

These stages were originally a per-bundle reframing of the same
whole-application progress the now-deleted `appraisalProgressIndex()`
(`progress-tracker.tsx`) used to track — that function's 5 steps
(Assigned → Fee requested → Fee approved → Client paid → Report
submitted) collapsed fee-approved+client-paid into this card's single
"For Report" stage, and the terminal step became an action (View Report)
rather than a label. `bundleStatus()` is defined locally in
`assigned-appraiser-card.tsx` rather than sharing a utility with it, since
this card needs a per-bundle category (with a `null` sentinel meaning
"show a button instead") rather than a 5-step linear tracker index — and
now that `progress-tracker.tsx` has been deleted entirely (its last
consumer, the Appraiser page's old single-card layout, was replaced by a
table — see "Appraiser" under "Approval-role screens" below),
`bundleStatus()`'s independent logic is the only status computation left
on this page.

## Appraisal Fee

**Requesting the fee is the Appraiser's job, not the Appraisal Officer's,
and there is no standalone fee card any more.** All of the fee UI lives
directly inside `/admin/appraisal-appraiser`
(`appraisal-appraiser-view.tsx`) — `appraisal-view.tsx` (the Officer's
page) never shows any fee UI at all, and the Assign Appraiser modal
doesn't ask "Does this application need an Appraisal fee?" either (see
"Assign Appraiser modal" above). The Officer's role stops at assigning an
appraiser to each pledged property; deciding whether that property needs
a fee, how much, and requesting it is entirely the assigned Appraiser's
own action on their own page. (There used to be a standalone
`AppraisalFeeCard` component — `src/sections/admin/appraisal/
appraisal-fee-card.tsx` — that rendered as one whole-batch card on the
Appraiser's page; it has been deleted entirely and its contents
redistributed: the per-bundle fee-decision fields moved into each table
row's expandable panel, and the batch-level submit/approve/advise/settle
actions moved to page level, both described below.)

Each pledged property's fee is still decided **per bundle** — there is no
app-wide flat fee. The "My Assignments" table (see "Appraiser" under
"Approval-role screens" below) has one row per bundle; expanding a row
reveals an **"Appraisal Fee"** panel above that bundle's report form.
While `feeApprovalStatus === 'not-submitted'`, that panel is **editable**:
a `FeeNeededOption` Yes/No card pair (plain centered label, selected-state
border+text color, same convention `AppraiserTypeOption` uses) plus,
revealed in a `Collapse` once Yes is picked, Request Amount (a
`NumericFormat` currency field) / Request Amount Description (multiline,
required) / Remarks (multiline, optional) — all wired directly to
`setAppraisalBundleFee(bundleId, data)`. Picking **No** also clears any
previously-entered amount/description/remarks back to empty. Once the
batch is submitted, the same panel switches to a read-only rendering
(amount + description, or a muted "No fee needed" label) — editing only
happens pre-submission.

The table itself also shows an **"Appraisal Fee"** status pill per row
(distinct from the overall On Process/For Approval/For Report/Reported
status pill next to it) — **No Fee** (`feeNeeded === 'no'`), **Draft**
(`not-submitted`), **For Approval** (`pending-approval`), **Approved**
(`feeApprovalStatus === 'approved'` but not yet settled), or **Settled**
(`feeSettled`) — so the batch's fee progress is visible at a glance
without expanding every row.

What lives on `Appraisal` (the data model) is a single **batch** state,
`feeApprovalStatus: 'not-submitted' | 'pending-approval' | 'approved' |
'declined'`, that every bundle's decided fee travels through together
once the Appraiser explicitly submits it as one request. `AppraisalReportBundle`
carries the actual per-bundle decision: `feeNeeded: 'yes' | 'no' | null`,
`feeAmount`, `feeDescription`, `feeRemarks` — freshly-created bundles
start with `feeNeeded: null` (undecided) now that
`createAppraisalReportBundle` is never called with a `fee` argument from
the Assign Appraiser modal.

Below the table, a **page-level** action block (not inside any row or
card) handles the batch actions, since these are single actions covering
every bundle at once, not a per-TCT action:

- While `feeApprovalStatus === 'not-submitted'`: a **"Submit fees for
  approval"** block with a **"Submit Fees for Approval"** button, enabled
  only once **every** pledged property is assigned *and* every bundle has
  a *complete* fee decision — `feeNeeded === 'no'`, or `feeNeeded ===
  'yes'` with a valid amount (`> 0`) and a non-empty description —
  `canSubmit = feeApprovalStatus === 'not-submitted' && allGroupsAssigned
  && allBundlesHaveFeeDecision`. This is the "one buong request" gate: a
  partial batch (some TCTs still Unassigned, or an assigned bundle whose
  fee question was left unanswered or under-filled) can't be submitted —
  the Head always reviews a complete picture of every pledged property's
  fee decision at once, TCTs needing no fee included alongside the ones
  that do, not a trickle of individual requests. Clicking it doesn't
  submit immediately — it opens a **`ConfirmDialog`** ("Send Appraisal
  Fees for Approval?") summarizing exactly what's about to be sent
  (property count, total fee amount across however many need one, a note
  that bundles lock while pending) with **"Send for Approval"** /
  **"Cancel"** actions. Only confirming calls
  `submitAppraisalFeesForApproval()`, which flips `feeApprovalStatus` to
  `'pending-approval'` — it does not touch any bundle's already-set
  `feeNeeded`/`feeAmount`.
- While `feeApprovalStatus === 'approved'` and not yet settled: an
  **"Advise client to settle the Appraisal fees"** block with an
  **"Advise Client"** button that opens a `Dialog` — the same
  summary-before-send / confirmation-after-send pattern as the Collateral
  titles table's Request Document modal. The dialog's `DialogContent`
  shows every fee-needing bundle (TCT number + amount) and a running
  total before sending; confirming ("Send") calls
  `setAppraisal({ clientNotifiedAt, sentToOdooAt })` (simulated Sendit
  payment link + Odoo request), then the dialog swaps to a one-time
  success screen ("Client advised to settle" + sent timestamp) with a
  "Done" button. Once `clientNotifiedAt` is set, the "Advise Client"
  button disappears from this block, replaced by **"Simulate: Payment
  Received"** (sets `paymentReceivedAt`).

There's no real approver role in this prototype, so approval/decline is
simulated via page actions `appraisal-appraiser-view.tsx` registers
itself (same convention as CI Fee's "Simulate: Another Officer
Approves/Declines CI Fee"): **"Simulate: Another Officer Approves
Appraisal Fees"** calls `approveAppraisalFees()` (`feeApprovalStatus:
'approved'`); **"Simulate: Another Officer Declines Appraisal Fees"**
opens a reason dialog whose confirm calls `declineAppraisalFees(reason)`
— this resets `feeApprovalStatus` back to `'not-submitted'` **and** every
bundle's `feeNeeded`/`feeAmount`/`feeDescription`/`feeRemarks` back to
undecided, so the officer re-proposes fees for the whole batch rather
than patching just one bundle.

`feeSettled` (`feeApprovalStatus === 'approved' && !!paymentReceivedAt`)
is the UI-only "batch is fully done" flag, computed the same way on this
page as everywhere else it's used. Once settled, the page-level advise/
payment action block disappears entirely (nothing left to act on for the
fee), each row's fee panel shows the read-only summary, the table's fee
pill reads "Settled," and — the whole reason this state matters — each
row's report form (`AppraiserAssignmentCard`) unlocks below the fee
panel. Before settlement, that same spot shows a locked message ("Submit
and settle the Appraisal Fee above before the report form for this
property unlocks.") instead of the form.

**`/admin/appraisal-fee-approval`** (`appraisal-fee-approval-view.tsx`,
the Fee Approver's own "My Approvals" page) mirrors this same batch
view — every bundle listed with its fee-or-"No fee needed", a running
total, and single **"Approve Appraisal Fees"** / **"Decline Appraisal
Fees"** buttons that call the same `approveAppraisalFees()` /
`declineAppraisalFees(reason)` context methods the Appraiser page's
page-action shortcuts do. It becomes reachable (`isPending`) once `feeApprovalStatus ===
'pending-approval'`, same as before.

## Appraisal Report (per bundle)

`review.appraisal.reportBundles: AppraisalReportBundle[]` — each entry is
`{ id, tctGroupIds, appraiserType, appraiserName, targetCompletionDate,
report }`, created by selecting TCT rows in the Collateral titles table
above and assigning an appraiser via its modal (see above).

**The Officer's page never renders `AppraisalReportView` inline at all.**
There used to be a per-bundle loop on `appraisal-view.tsx` — gated on
`feeSettled` — rendering either a completed read-only `AppraisalReportView`
(once `bundle.report.uploadedAt` was set) or nothing for a bundle whose
report wasn't submitted yet, sitting directly after `AssignedAppraiserCard`
and before Head Approval. That loop has been deleted entirely. A
submitted bundle's report is now shown **only** inside
`AssignedAppraiserCard`'s "View Report" `Dialog` — clicking that button
renders `<AppraisalReportView bundleId={...} tctNumbers={...} />` inside
`DialogContent` for that one bundle — see "Assigned Appraiser" above.
There's no on-page anchor for it anymore either: an earlier version of
`appraisal-report-view.tsx` stamped `id={`appraisal-report-${bundleId}`}`
plus `scrollMarginTop: '88px'` on its outer `Box` (on both of its two
return branches — external-file and in-house-form) purely so a "View
Report" button could `scrollIntoView` down to it; now that the report is
opened in a modal instead of scrolled to, that `id`/`scrollMarginTop`
plumbing has been removed from both return branches — there's no scroll
target left to support. A bundle whose report isn't submitted yet simply
has no report to view — the "View Report" button itself doesn't render
until `bundle.report.uploadedAt` is set (see "Assigned Appraiser" above).

`AppraiserAssignmentCard` (the actual fill-in form) only ever renders on
`/admin/appraisal-appraiser` (`appraisal-appraiser-view.tsx`) — the
Appraiser's own workspace, where filling in and submitting the report is
that role's job, and it remains the **only** page where that editable form
appears. Both pages read the exact same `bundle.report` data, so a report
the appraiser is still working on there simply isn't visible anywhere on
the Officer's page until submitted, at which point it becomes viewable via
`AssignedAppraiserCard`'s Dialog.

### `AppraisalReport` data model

Expanded from an original 4-field summary (Property Details, Appraised
Value, Remarks, Recommendation) to the full structure of the printed
**"Appraisal Report (REM)" PDF**, section by section:

- **Report details** — `dateReport`, `dateInspected`, `requestingOfficer`, `branch`.
- **Land** — `registeredOwner`, `locationOfProperty`, `encumbrancesRemarks`,
  plus `landTitles: AppraisalReportLandTitle[]` — one entry per pledged
  property (`AppraisalTctGroup`) the bundle covers (`{ tctGroupId,
  surveyNo, bookPageNo, titleRegistrationDate, titleRegistrationPlace,
  areaSize, lotNo, zonalValue, boundaries, technicalSpecification }`),
  since the PDF's LAND/BOUNDARIES/TECHNICAL SPECIFICATION tables repeat
  once per TCT/OCT. `boundaries` is a single free-text field (matching the
  PDF, which has no North/South/East/West breakdown), not structured
  per-direction fields.
- **Technical specification** (report-wide, not per-title) —
  `streetFrontage`, `streetWidth`, `surfacing`, `averageDepth`,
  `approxShape`, `topography`, `neighborhood`, `presentUse`,
  `highestAndBestUse`.
- **Source or kind of utilities** — `utilityPublicConveyance`,
  `utilityElectricity`, `utilityWater`, `utilityTelephone`.
- **Improvement / General Construction Features / Particular Description**
  — `generalConstructionFeatures`, `floorLevel`, `externalWalls`,
  `interiorWallsPartitions`, `flooring`, `doorsWindows`, `ceilingRoofing`.
- **Basis of Valuation (Land)** — `basisSource`, `basisLocation`,
  `basisAreaSize`, `basisPriceType`, `basisSellingPrice`,
  `fairMarketValuePerSqm`.
- **Remarks / Additional Information** — `remarksAdditionalInfo`.
- **Valuation table** — `itemOfProperty`, `fmvRcn`,
  `constructionStatusPercent`, `depreciatedValue`, `appraisedValueP`, then
  the headline totals: `appraisedValue` (required to submit — the only
  required field, same gate the old 2-field version had), `roundedFigures`,
  `amountInWords`, `loanableAmount`.
- **Signature chain** — `preparedBy`, `reviewedBy`, `endorsedBy`, `notedBy`.
- **Legacy fields kept as-is** — `propertyDetails` and `remarks` (no longer
  shown as prominently, but still present) and `recommendation` (the
  source process diagram's own field, distinct from the PDF).
- **External file fields** — `fileName`, `fileUrl`, `uploadedAt`, unchanged.

`createAppraisalReportBundle` (the `admin-context.tsx` factory, not the
context method of the same name) seeds `landTitles` from the bundle's
`tctGroupIds` on creation; `addTctGroupsToReportBundle` appends new blank
`landTitles` entries when TCTs are added to an existing unsubmitted
bundle; `setAppraisalBundleLandTitle(bundleId, tctGroupId, data)` is the
dedicated setter for patching one title's fields (a plain
`setAppraisalBundleReport` merge can't reach inside the `landTitles`
array). Stored sessions from before this expansion are topped up the same
way `appraisalGroups` is — by `tctGroupId`, defaulting any missing title
to blank rather than trusting a stale/absent array.

### In-house form (`AppraiserAssignmentCard`)

A `ButtonGroup` toggle picks between `'inhouse'`/`'external'`
(`AppraiserType`), mutually exclusive — switching a bundle's type before
its report is submitted resets `report` to a fresh blank `AppraisalReport`
(via the same factory used on bundle creation, so `landTitles` stays
seeded correctly) scoped to that one bundle via
`setAppraisalBundleAppraiserType`.

- **In-house** — the full sectioned form described above (each section
  under its own uppercase `SectionLabel`, separated by `Divider`s), plus
  one `LandTitleFields` block per pledged property, plus a fixed
  dashed-border note (verbatim from the source process diagram):
  *"Realtime taking picture, uploading of files anywhere in the system
  (integrate lot plotting and market value)"* — flagged there as future
  integration work, not built here. **"Create Appraisal Report"** is
  enabled once Appraised Value is filled (the one required field, same as
  before), and sets `report.uploadedAt`.
- **External** — unchanged: a single dashed file dropzone for the external
  appraiser's finished report (image or PDF). Picking a file sets
  `fileName`/`fileUrl`/`uploadedAt` directly (no separate submit step).

Once `headApprovalStatus !== 'pending'` **or** that bundle's report has
already been submitted (`report.uploadedAt` is set), the form locks: the
inactive appraiser-type button disables, and every field/dropzone becomes
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

### Officer's read-only view (`AppraisalReportView`)

Once a bundle's `report.uploadedAt` is set, `AssignedAppraiserCard`
renders this inside its "View Report" `Dialog` for that bundle —
`appraisal-view.tsx` itself never renders `AppraiserAssignmentCard` or
`AppraisalReportView` directly; both only ever appear via the pages that
own them (`AppraiserAssignmentCard` on the Appraiser's page,
`AppraisalReportView` inside the Officer's modal). It's a read-only
rendering of everything the appraiser filled in, so the officer (and,
implicitly, whoever reviews Head Approval next) can actually see the
report's content instead of just a "submitted" boolean. Sectioned to
mirror the printed PDF (Land + per-title cards, Technical Specification,
Utilities, Construction Features, Basis of Valuation, a highlighted
Appraised Value card with amount-in-words, Signature chain, Recommendation)
using this app's own card/`Field`-label conventions rather than
reproducing the PDF's literal dark-blue section bars. Every field is
conditionally rendered (`Field` returns `null` for an empty value, section
`Divider`s always show) so a partially-filled report doesn't show a wall of
blank labels. External-appraiser bundles instead show the uploaded file
with a **"View"** link (`report.fileUrl`) rather than any of the structured
fields, since external appraisers only ever upload a finished file.

## Head Approval

Rendered by `appraisal-view.tsx` only when `reportSubmitted` —
`{reportSubmitted && <HeadApprovalCard />}` — i.e. every pledged
property's report is submitted. There is no intermediate officer-review
step: an officer-review card gated on `reportSubmitted` plus a
forward-to-Head boolean field briefly sat in this slot instead, prompting
the Appraisal Officer to explicitly forward the batch before Head
Approval would render — that step, its card, and the boolean field it
wrote have all been fully reverted, so this card is back to rendering
directly off `reportSubmitted` alone, same as before that feature
shipped. Otherwise nothing renders in its place —
there used to be a locked dashed placeholder ("Head Approval unlocks once
every appraisal report below has been submitted.") but it was removed;
with the per-bundle report cards no longer rendered inline on this page
at all (a submitted report is now only viewed via `AssignedAppraiserCard`'s
"View Report" Dialog — see "Assigned Appraiser" and "Appraisal Report (per
bundle)" above), a placeholder phrased around "the reports below" would
no longer even make sense here.

`review.appraisal.headApprovalStatus: 'pending' | 'approved' | 'declined'`
(`HeadApprovalStatus`). As with `feeApprovalStatus`'s `'declined'`,
`'declined'` is a type-level member that is **never actually set** by this card's own
decline handler — confirmed by reading `head-approval-card.tsx` directly:
declining calls `setAppraisal({ headApprovalStatus: 'pending', ... })`, i.e.
it resets the status back to `'pending'`, not forward to `'declined'`. Same
simulated single-officer convention as CI Fee/Appraisal Fee approval — no
separate Head login in this prototype. The Approve/Decline buttons sit at
the bottom of the card below the status banner (not inline beside it),
matching the "Proceed application?"-style bottom-action block the other
admin review pages use (e.g. `credit-investigation-view.tsx`,
`appraisal-approver-view.tsx`) — a small italic disclaimer line under the
buttons ("There's no real Head login in this prototype…") makes the
simulated nature explicit, same wording `appraisal-approver-view.tsx`
already used:

- **"Simulate: Head Approves"** — sets `headApprovalStatus: 'approved'`
  directly.
- **"Simulate: Head Declines"** — `ConfirmDialog` requiring a typed reason;
  confirming resets `headApprovalStatus: 'pending'`, records the reason in
  `headApprovalDeclineReason`, **and calls `clearAllAppraisalBundleReports()`**
  — wiping every bundle's `uploadedAt`/`fileName`/`fileUrl` back to `null`
  so every assigned appraiser (in-house or external) has to resubmit from
  scratch, even when the decline reason had nothing to do with the report
  contents themselves. Each bundle's `appraiserType` and TCT membership are
  preserved — only report contents are cleared. (Resetting a
  forward-to-Head boolean field instead — sending the batch back to an
  intermediate officer-review card rather than clearing reports — briefly
  replaced this behavior; that step has been fully reverted, so decline is
  back to clearing every bundle's report outright, same as before that
  feature shipped.)

While `headApprovalStatus === 'pending'` and a decline reason exists from a
previous round, the card shows "Last decline reason: …" beneath the
"Awaiting Head Approval" status line, so whoever revisits this card (the
Officer here, or the Head/Approver on `appraisal-approver-view.tsx`, which
shows the same field) can see why the last round was declined.

## Pass/Fail

Rendered by `appraisal-view.tsx` only once `headApprovalStatus === 'approved'`
**and** a report is still submitted (`headApproved && reportSubmitted`) —
the `reportSubmitted` half is a belt-and-suspenders re-lock so Pass/Fail
can't stay open if a report is ever cleared after approval through some
other path. Otherwise nothing renders in its place — there used to be a
locked dashed placeholder ("Head Approval must approve the reports below
to unlock the Pass/Fail decision.") once a report was submitted, but it
was removed: with per-bundle report cards no longer rendered inline on
this page at all (see "Appraisal Report (per bundle)" above), "the
reports below" isn't accurate any more, and the card above it
(`HeadApprovalCard`) already makes clear what's still pending.

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

## Approval-role screens (CI Fee / Appraiser / Approver Fee / Approver Report)

Four dedicated screens nested under the **"Request"** nav dropdown
(`approvalItems`, `src/layouts/admin/config-nav-admin.tsx` — the variable
name is unchanged even though the rendered section title moved from
"Approval" to "Request"). None of these are `application-list-view.tsx`'s
`?step=` queue; each is a standalone view filtering on a derived
condition, since none of "CI fee pending"/"needs an appraiser"/"fee
pending"/"awaiting Head Approval" is a `ReviewStep`.

**All four are framed as the signed-in role's own personal workspace**
("My Approvals" for the three Head/Approver-facing screens, "My
Assignments" for the Appraiser screen), not generic admin-facing queues —
each has a small uppercase eyebrow label naming the role (e.g. "CI HEAD /
APPROVER", "APPRAISER WORKSPACE"), first-person copy throughout ("Nothing
waiting on you yet", "Request your fee and submit the report…"), and **no sample filler
rows at all** — unlike every other queue in this app, a real person's
personal inbox/workspace would never show other unrelated applications'
sample data. This is why `SampleApplicationEntry` (`sample-applications.ts`)
carries no `ciFee`/`appraisalFeePending`/`appraisalAwaitingHeadApproval`
fields (all removed) — these four screens only ever show the one live
application's own state, sourced entirely from `review.creditInvestigation`
/`review.appraisal`/`review.requirementChecklist` in `AdminContext`.

There is no role/permission system in this app (`AdminUser` has no role
field — every session is one undifferentiated admin), so nothing
mechanically gates who can open any of these four screens; the personal
framing is a UI/workflow choice, not access control.

- **CI Fee Approval** (`/admin/ci-fee-approval`, `ci-fee-approval-view.tsx`)
  — "My Approvals" for the CI Head/Approver. Shows the live application's
  detail card (request amount/description/remarks) with **"Approve CI
  Fee"**/**"Decline CI Fee"** whenever `review.creditInvestigation.
  ciFeeStatus === 'pending-approval'`; otherwise an empty-state card
  ("Nothing waiting on you yet" / "Nothing waiting on you right now",
  depending on whether there's a live application at all). This is a
  second way to trigger the same simulated-second-officer approval the
  "Simulate: Another Officer Approves CI Fee" page action on
  `credit-investigation-view.tsx` already offers; that action is
  unchanged and still present. Approving/declining shows a one-time
  `OutcomeScreen` (centered icon/heading/body + forward action) — the one
  screen among these four that does this, unchanged from its original
  design.
- **Appraiser** (`/admin/appraisal-appraiser`,
  `appraisal-appraiser-view.tsx`) — nav label shortened from "Appraisal
  Appraiser" now that the dropdown itself is titled "Request" rather than
  "Approval" (the redundant "Appraisal" prefix was there to disambiguate
  from the CI-side items when everything sat under one generic "Approval"
  label). "My Assignments" for the Appraiser — the header row places the
  "APPRAISER WORKSPACE" eyebrow label on the right, level with the "My
  Assignments" title/subtitle on the left (`Stack direction="row"
  justifyContent="space-between"`), unlike the stacked eyebrow-above-title
  layout every other role-workspace screen on this page still uses. The
  page has no "Available for Assignment"/claim section any more — an
  earlier version listed every still-unassigned pledged property here
  with a "Claim" button routing into the Officer's Assign Appraiser modal,
  but claiming/assigning is the Officer's action on their own page, not
  something this page needs to offer a shortcut into; that section was
  removed entirely, leaving just the assignments table described below.

  A single table, one row per `reportBundles` entry actually assigned to
  the signed-in appraiser (real data — `review.appraisal.reportBundles`,
  not sample/filler rows), columns: **Collateral No.**, **Applicant**,
  **Appraisal Fee** (the per-bundle fee-status pill — see "Appraisal Fee"
  above), **Status** (the same On Process/For Approval/For Report/Reported
  pill convention `AssignedAppraiserCard` uses on the Officer's page,
  computed independently here rather than shared/refactored into one
  utility), and a trailing chevron (`eva:arrow-ios-forward-fill`) signaling
  navigation, not expand. There is no separate heading above the table (an
  earlier version had a "My Active Assignments" label directly above it;
  removed as redundant with the page's own "My Assignments" title). Empty
  state: a plain message card ("No active assignments right now — check
  back once a property is assigned to you.") when there's a live
  application but no bundles yet.

  **This table is list-only — nothing on it expands or collapses.**
  Clicking a row navigates to a dedicated per-bundle detail page,
  `appraisal-appraiser-bundle-view.tsx` at
  `paths.admin.appraisalAppraiserBundle(bundleId)`
  (`/admin/appraisal-appraiser/[bundleId]`, a Next.js dynamic route nested
  under the same auth-guarded layout as the list page). That page shows,
  in order: a "Back to My Assignments" link, the bundle's TCT number(s) +
  applicant + overall status pill as a header, then that bundle's
  **Appraisal Fee** panel (editable while `not-submitted`, read-only once
  submitted — see "Appraisal Fee" above for the fields), then either
  `AppraiserAssignmentCard` (the report fill-in form, once `feeSettled`)
  or a locked message telling the appraiser to settle the fee first (from
  the list page) before the report form unlocks. This is the *only* place
  either the fee-decision fields or the editable report form ever render
  — `appraisal-view.tsx` never renders either one, and the list page
  itself renders neither (see "Appraisal Fee" and "Appraisal Report (per
  bundle)" above). (Two earlier designs sat between this and the original
  single-card layout: first a standalone `AppraisalFeeCard` — a separate
  whole-batch card below the table — alongside a shared
  `ProgressTracker`-based single-card layout; then a version where each
  list row expanded in place via a `Collapse` with a click-to-toggle
  chevron `IconButton`. Both were replaced — the per-row `Collapse` toggle
  in particular was replaced with real page navigation, since a per-bundle
  workspace this substantial (fee panel + full report form) reads better
  as its own page than as an inline row expansion.) The page-level "Submit
  Fees for Approval"/"Advise Client"/"Simulate: Payment Received" actions
  stay on the **list** page (not the per-bundle detail page), since
  they're whole-batch actions covering every bundle at once.
- **Appraisal - Approver Fee** (`/admin/appraisal-fee-approval`,
  `appraisal-fee-approval-view.tsx`) — nav label reworded from "Appraisal
  Fee Approval" to lead with "Appraisal" and name the role ("Approver")
  before what they're approving ("Fee"), matching the sibling "Appraisal -
  Approver Report" item below and the dropdown's own move from "Approval"
  to "Request." "My Approvals" for the Appraisal Fee Approver. Shows the
  live application's detail card whenever
  `review.appraisal.feeApprovalStatus === 'pending-approval'`, listing
  every bundle's fee decision (or "No fee needed") plus a running total,
  with single **Approve/Decline** buttons for the whole batch calling
  `approveAppraisalFees()` (`feeApprovalStatus: 'approved'`) /
  `declineAppraisalFees(reason)` (resets `feeApprovalStatus` to
  `'not-submitted'`, `feeDeclineReason` to the typed reason, and every
  bundle's fee decision back to undecided) — not a single flat-amount
  approval like CI Fee Approval's shape used to be.
- **Appraisal - Approver Report** (`/admin/appraisal-approver`,
  `appraisal-approver-view.tsx`) — nav label reworded from "Appraisal
  Approver" to "Appraisal - Approver Report," naming this as the report
  side of the Approver's two duties (see "Appraisal - Approver Fee" above
  for the fee side) now that both sit side by side under "Request" instead
  of a generic "Approval" grouping. "My Approvals" for the Head/Approver's
  "reviewed and noted" step. Shows the live application's detail card
  whenever every pledged property is covered by a submitted report bundle
  and `headApprovalStatus === 'pending'` (`isPending = !!signUpData &&
  reportSubmitted && headApprovalStatus === 'pending'` — the same
  `reportSubmitted` computation `appraisal-view.tsx` uses to unlock its own
  Head Approval card, duplicated here rather than shared since the two
  files don't currently import from each other). Approve reuses the exact
  same `setAppraisal` call `head-approval-card.tsx` makes; Decline resets
  `headApprovalStatus: 'pending'` and calls `clearAllAppraisalBundleReports()`
  again — the same behavior `head-approval-card.tsx` itself uses (see
  "Head Approval" above) — clearing every bundle's submitted
  report/file so each assigned appraiser resubmits, not touching any
  forward-to-Head boolean field (a brief intermediate officer-review step
  introduced one, and had this screen's decline stop clearing reports in
  favor of resetting it; that step has been fully reverted, so this
  screen's decline is back to calling `clearAllAppraisalBundleReports()`
  exactly like `HeadApprovalCard` does).

Except for CI Fee Approval's `OutcomeScreen`, none of these screens'
live-application actions redirect or show a one-time outcome screen —
they stay on the same page and the detail card simply updates to reflect
the new state (or the whole card disappears back to the empty state once
resolved), matching how the underlying cards on `appraisal-view.tsx`
already behave in place.

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
