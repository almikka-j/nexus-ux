# Admin — Appraisal

> **Maintenance rule:** update this file whenever `appraisal-view.tsx` or its
> supporting files (`appraisal/appraiser-assignment-card.tsx`,
> `appraisal/appraisal-report-view.tsx`,
> `appraisal/assigned-appraiser-card.tsx`,
> `appraisal/head-approval-card.tsx`,
> `appraisal/pass-fail-card.tsx`, `appraisal/sample-appraisal-report.ts`,
> `appraisal-appraiser-view.tsx`, `appraisal-appraiser-bundle-view.tsx`,
> `appraisal-fee-approval-view.tsx`, `appraisal-fee-approval-bundle-view.tsx`,
> `appraisal-approver-view.tsx`, `appraisal-approver-bundle-view.tsx`) change.
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

**A row's checkbox also disables until every one of its 8 documents is
verified** (`docsIncomplete(groupId)`, i.e. `docs.done < docs.total`) —
an appraiser shouldn't be handed a property whose collateral documents
aren't confirmed complete yet. A disabled-by-incomplete-docs checkbox
shows a `Tooltip` ("Every document must be verified before this property
can be assigned to an appraiser.") on hover; an already-assigned row
(disabled for the pre-existing `isRowLocked` reason above) shows no
tooltip, since that row isn't a documents problem. **"Auto-assign All
TCTs"** (see "Dev/testing page actions" below) respects the same gate —
it now filters to `group.reportId === null && !docsIncomplete(group.id)`
instead of every still-unassigned group, so it can't be used to bypass
the rule either. This is also why the 5 default seed
`AppraisalTctGroup`s (`createInitialReview()` in `admin-context.tsx`)
were changed to seed **every** document as `'verified'`
(`createAppraisalGroupDocuments(seeded = true)`) instead of reusing
`APPRAISAL_DOC_META[key].freshStatus` per key — two of the 8 keys
(`realtyTaxReceipt`, `appraisalPrimaryIdsMortgagor`) have
`freshStatus: 'needs-review'` there (shared metadata Requirement
Checklist/CI also draw from, where a `'needs-review'` fresh state is
still meaningful), which would have permanently capped every seeded
group at 6/8 and made none of them assignable out of the box. A freshly
**added** TCT (via "Add Collateral") still starts fully `'missing'`
(`seeded = false`, unchanged) and stays unassignable until its documents
are actually uploaded/verified.

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
Appraiser page. The actual sample values (in-house bundles get a full
sample REM covering every section `AppraisalReportView` renders —
Land/title details, Technical Specification, Utilities, Construction
Features, Basis of Valuation, the FMV/RCN valuation table with a
₱2,500,000 Appraised Value, and the Prepared/Reviewed/Endorsed/Noted-by
chain; external bundles get a fake uploaded file, mirroring what
`handleExternalFile` actually stores) live in
`buildSampleAppraisalReport()`
(`src/sections/admin/appraisal/sample-appraisal-report.ts`) — pulled out
of this file so the exact same values are shared with the equivalent
"Simulate: Fill Sample Report" entries the Appraiser's own list and
per-bundle detail pages register (see below), instead of three near-copies
of the same object slowly drifting apart. It only ever fills bundles
missing a report, so re-clicking after new bundles are assigned won't
clobber a report an appraiser (or this same action) already submitted.
All three are dev/testing conveniences for reaching downstream states
quickly, not user-facing officer actions.

Each `landTitles` entry `buildSampleAppraisalReport()` produces also
stamps a `photoFileUrl`/`photoFileName`/`photoUploadedAt` — a
`SAMPLE_COLLATERAL_PHOTO` inline SVG data URI, same
data-URI-placeholder convention `sample-application.ts` uses for its own
ID/selfie photos — so a sample-filled land title's Collateral Photo
dropzone (`ReportFileDropzone`, see "Land Title Fields" below) renders an
actual photo preview once locked/read-only, instead of the empty "Choose
a photo" uploader state. This matters most on read-only views of an
already-submitted report — the Head/Approver's "My Approvals" detail
page in particular, which has no way to attach a real photo itself and
would otherwise show every sample bundle's Collateral Photo as
perpetually unset. Getting `FileThumbnail` to actually render the image
(rather than fall back to a generic file-type icon) requires a real file
extension at the tail of the URL — `FileThumbnail`'s format check
(`fileTypeByUrl`) naively does `url.split('.').pop()`, which fails on a
raw `data:image/svg+xml` URI (the closest `.` sits deep inside the
encoded markup); appending an inert `#.jpg` fragment (harmless to how the
browser resolves a `data:` URI, but present at the very end of the
string) gives that naive check a real extension to find.

**Every Appraisal Fee simulate action on both pages is always visible in
the Settings popover, regardless of current state** — an earlier version
gated each one behind the state it was meant to produce (Approve/Decline
only while `pending-approval`, Payment Received only once advised),
which meant most of the popover was empty on a freshly-assigned bundle
and a tester had to click things in a specific order to unlock the next
one. Every action now calls a shared `ensureFeeBatchSubmitted()` helper
first: if the batch is still `not-submitted` or `declined`, it fills in
any bundle whose `feeNeeded` is still `null` (sample "Yes, ₱2,500, Site
visit + valuation fee") and calls `submitAppraisalFeesForApproval()`
before doing anything else — so clicking any one simulate button, from
any starting state, always has something real to act on and "just
works" in a single click.

`appraisal-appraiser-view.tsx` registers **"Simulate: Another Officer
Approves/Declines Appraisal Fees"** (see "Appraisal Fee" below).
`appraisal-appraiser-bundle-view.tsx` (the per-bundle detail page)
registers the exact same two entries — duplicated rather than shared,
since the two pages don't share a component for this — so the shortcut
is reachable whether a tester is on the list or already drilled into a
single bundle's detail page. Approve ensures the batch is submitted, then
calls `approveAppraisalFees()`; decline ensures submission too, then
opens each page's own local decline `ConfirmDialog` (same "Reason for
declining Appraisal Fees" prompt, same `declineAppraisalFees(reason)`
call, just two separate `useState` + dialog instances, one per file).
Since `page-actions-context.tsx` merges every registrant's actions rather
than having the latest one replace the rest (see below), both pages'
registrations coexist fine with `AppraisalTctTable`'s own entries — there
is never a conflict from two different pages registering the identical
action, because only one of these two pages is ever mounted at a time.

Both pages also register **"Simulate: Payment Received (Sendit)"** —
the deepest cascade of the set. It ensures submission, approves if not
already `'approved'`, then stamps `clientNotifiedAt`/`sentToOdooAt`/
`paymentReceivedAt` all in the same call via `setAppraisal({...})`. This
means clicking just this one button from a completely fresh, undecided
bundle takes the whole batch from nothing all the way to "Settled" in a
single click — request, submit, approve, advise, and pay all folded into
one. (An earlier version split "Advise Client to Settle" and "Payment
Received" into two separate popover entries that only appeared one after
the other, in order; that's gone now — "Payment Received" alone handles
the whole remaining path.)

Both list and detail pages also always register **"Simulate: Reset
Appraisal Fees"** (`resetAppraisalFees()`, `src/auth/admin-context.tsx`)
— this one has no cascade logic and needs none, since a tester might
want to restart the whole fee flow from any state. It wipes
`feeApprovalStatus` back to `'not-submitted'`,
`feeDeclineReason`/`feeSubmittedAt`/`feeApprovedAt`/`clientNotifiedAt`/
`sentToOdooAt`/`paymentReceivedAt` all back to their blank/null defaults,
and every bundle's own `feeNeeded`/`feeAmount`/`feeDescription`/
`feeRemarks` back to undecided — but deliberately leaves
`reportBundles`' appraiser assignment and report content completely
untouched, since this is meant to restart just the fee
request/approval/settlement cycle, not undo an appraiser assignment or a
filled-in report.

Both pages also register **"Simulate: Fill Sample Report"** — always
visible, independent of fee status entirely, since a report can be
filled in whenever (`AppraiserAssignmentCard`'s own form is never gated
on the fee either). It calls the same `buildSampleAppraisalReport()`
helper `AppraisalTctTable` uses (see above), just scoped differently per
page: the list page's version loops every bundle in the batch that
doesn't yet have `report.uploadedAt`, same as `AppraisalTctTable`'s own
version; the bundle detail page's version only fills in the one bundle
currently being viewed. Either way it's a no-op on a bundle that already
has a report — clicking it again never clobbers one an appraiser (or
this same action) already submitted.

**Unlike `AppraisalTctTable`'s own version, both of these pass
`buildSampleAppraisalReport(..., false)`** — the fourth `submit`
argument. `buildSampleAppraisalReport()` defaults `submit` to `true`
(matching `AppraisalTctTable`'s own use, whose whole purpose is
simulating a report the appraiser has already fully submitted — so it
still stamps `uploadedAt` and immediately locks the form); the
Appraiser's own two "Simulate: Fill Sample Report" entries pass `false`
instead, since their purpose is different — auto-filling the fields as a
starting point to review or tweak, not submitting a report on the
appraiser's behalf. With `submit: false`, `uploadedAt` stays unset, so
the form (including each TCT's own Collateral Photo dropzone) remains
fully editable afterward, exactly as if the appraiser had typed those
same values in by hand — "Submit Appraisal Report" (or, for an external
bundle, the file dropzone's own upload) still has to be triggered
separately to actually submit and lock it. (An earlier version of these
two page actions used the default `submit: true`, which auto-submitted
the report the instant the button was clicked — every field locked
read-only immediately, before a tester ever got a chance to look at or
adjust the sample values. That's the bug this `submit: false` change
fixes.)

The same page also registers **"Simulate: Request CI Fee"**, also
always visible now (an earlier version hid it once
`review.creditInvestigation.ciFeeStatus` moved past `'not-requested'`,
matching the "gate every simulate action behind its own precondition"
pattern that was dropped everywhere else on this page too) — a
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
Clicking it always re-applies these same values, even if CI Fee is
already pending/approved/declined, resetting it back to a fresh pending
request — the actual approve/decline simulation for it still lives on
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

**Requesting the fee happens inside a modal on the bundle's own detail
page, not an inline card.** `appraisal-appraiser-bundle-view.tsx` (see
"Appraiser" under "Approval-role screens" below) renders an "Appraisal
Fee" summary card between the header card and Documents — a fee-status
`StatusBadge` (No Fee/Draft/For Approval/Approved/Settled, same
`FEE_STATUS_COPY` map the list page's table pill uses) sits directly
beside the "Appraisal Fee" title, plus a single button, **"Request
Appraisal Fee"** (relabeled **"View Appraisal Fee"**, rendered outlined
instead of filled, once the batch is no longer `not-submitted`). Clicking
it opens a `Dialog` — not an inline expand/panel — following the exact
same modal convention this page's sibling list page
(`appraisal-appraiser-view.tsx`) already uses for "Advise Client to
Settle": a `DialogTitle` with a close `IconButton`, a `DialogContent`,
and (only while editable) a footer action row. If the bundle's fee
decision is still undecided (`feeNeeded === null`), opening the modal
defaults it to `'yes'` right then, before the modal even renders — Yes is
the common case, so it opens pre-selected instead of making the appraiser
click Yes just to confirm the likely answer; No remains one click away,
same as ever.

Inside the modal, while `feeApprovalStatus === 'not-submitted'`
(`feeEditable`): the same Yes/No `FeeNeededOption` pair plus, once "Yes"
is picked, Request Amount (`NumericFormat` currency field) / Request
Amount Description (multiline, required) / Remarks (multiline, optional)
— all wired to `setAppraisalBundleFee(bundle.id, data)`, for *this*
bundle only. Picking "No" clears any previously-entered
amount/description/remarks. Below the fields, a **"Submit Fees for
Approval"** button — gated on `canSubmit` (every pledged property
assigned + every bundle in the batch has a complete fee decision, the
same rule described below) — sits in the modal's footer; confirming
calls `submitAppraisalFeesForApproval()` directly (no separate
`ConfirmDialog` layered on top — the modal itself already reads as the
deliberate "review before sending" step) and closes the modal. It still
submits the **whole batch**, not just the bundle whose modal happens to
be open. Once submitted, the modal instead shows a read-only summary
(amount + description + remarks, or "No fee needed") plus a "Requested
on {date}" line sourced from `Appraisal.feeSubmittedAt` — an ISO string
`submitAppraisalFeesForApproval()` stamps via `new Date().toISOString()`
(same convention every other admin-context.tsx timestamp uses) each time
the batch is actually sent, overwritten on every re-submission (including
after a decline — see below) so it always reflects the *latest* send, not
the first — with no footer button at all — editing only happens
pre-submission, same as always. (An
earlier version moved that read-only summary out of the modal entirely,
straight onto the card, dropping the button/modal for that case; that was
reverted — keeping the fee UI in one consistent place, the modal, reads
better than splitting it across two different presentations depending on
whether it's editable.)

Separately, once `!feeEditable` (the batch has actually been submitted —
pending-approval, approved, or settled), the Appraisal Fee card itself
gains a subtitle under the title/badge row —
`"{fCurrency(bundle.feeAmount)} requested"` — so the appraiser can see
what was actually requested at a glance without opening the modal. It
only renders when `bundle.feeNeeded === 'yes'`; a no-fee bundle already
communicates that via its "No Fee" badge alone, with nothing to summarize
as an amount. It's deliberately absent while still `feeEditable`
(`not-submitted` OR `declined`) — an in-progress decision that hasn't
been (re-)sent yet isn't a "request" worth summarizing on the card; a
declined batch loses the subtitle the moment it's declined, the same way
it never had one before its first submission, and only earns it back
once "Submit Fees for Approval" has actually been clicked again.

(This flow went through several homes before landing here: a standalone
`AppraisalFeeCard` component (`src/sections/admin/appraisal/
appraisal-fee-card.tsx`, since deleted) rendered one whole-batch card on
the Appraiser's list page; that was replaced by moving the per-bundle
fields into each list row's expandable panel; that was replaced by an
inline card directly on this detail page (fields + a page-level "Submit
Fees for Approval" button, no modal); that inline card was removed
entirely with no replacement for a period; it was then rebuilt as this
modal instead of another bare card, matching the "Advise Client" modal
convention already established on the sibling list page rather than
reintroducing a third inline-card variant.)

Each pledged property's fee is still decided **per bundle** — there is no
app-wide flat fee. What lives on `Appraisal` is a single **batch** state,
`feeApprovalStatus: 'not-submitted' | 'pending-approval' | 'approved' |
'declined'` plus `feeSubmittedAt: string | null` (the ISO timestamp of
the moment the batch was last submitted, `null` until the first
submission, overwritten — not cleared — on every subsequent
re-submission), that every bundle's decided fee travels through together
once submitted as one request. `AppraisalReportBundle` carries the actual
per-bundle decision: `feeNeeded: 'yes' | 'no' | null`, `feeAmount`,
`feeDescription`, `feeRemarks` — freshly-created bundles start with
`feeNeeded: null` (undecided), since `createAppraisalReportBundle` is
never called with a `fee` argument from the Assign Appraiser modal (the
Officer never sets this — see "Assign Appraiser modal" above).

The Appraiser's "My Assignments" table still shows an **"Appraisal Fee"**
status pill per row (distinct from the overall On Process/For
Approval/For Report/Reported pill next to it) — **No Fee** (`feeNeeded
=== 'no'`, unless declined), **Draft** (`not-submitted`), **Declined**
(`feeApprovalStatus === 'declined'`, `tone: 'error'`, takes priority over
every other label including "No Fee" — even a no-fee bundle's decision
was part of the declined batch and needs reconsidering), **For Approval**
(`pending-approval`), **Approved** (`feeApprovalStatus === 'approved'`
but not yet settled, `tone: 'success'` — green, same tone as "Settled";
an earlier version used `tone: 'info'` (blue), changed so "Approved"
reads as an unambiguous positive outcome rather than a neutral
in-progress one), or **Settled** (`feeSettled`) — the same pill shape the
bundle detail page's own Appraisal Fee card trigger button now sits next
to. Once approved, the fee card also gains an `"Approved on {date}"`
segment appended to its `"{amount} requested"` subtitle, sourced from the
new `Appraisal.feeApprovedAt: string | null` field (stamped by
`approveAppraisalFees()` via `new Date().toISOString()`, the same
convention `feeSubmittedAt` uses; cleared back to `null` whenever
`submitAppraisalFeesForApproval()` runs again, since a fresh submission
means whatever was previously approved no longer applies) — visible both
on the card itself and inside the modal's read-only summary.

There's no real approver role in this prototype, so approval/decline is
simulated via page actions both `appraisal-appraiser-view.tsx` (the list
page) and `appraisal-appraiser-bundle-view.tsx` (the per-bundle detail
page) register themselves, independently (same convention as CI Fee's
"Simulate: Another Officer Approves/Declines CI Fee") — **"Simulate:
Another Officer Approves Appraisal Fees"** calls `approveAppraisalFees()`
(`feeApprovalStatus: 'approved'`); **"Simulate: Another Officer Declines
Appraisal Fees"** opens a reason dialog whose confirm calls
`declineAppraisalFees(reason)`. These page actions are not part of the
detail page's fee modal itself — they're a separate popover entry,
reachable from whichever of the two pages happens to be open.

**Decline is a real, visible status, not an instant silent reset.**
`declineAppraisalFees(reason)` sets `feeApprovalStatus: 'declined'` and
stores the reason in `feeDeclineReason` — it deliberately does **not**
touch any bundle's `feeNeeded`/`feeAmount`/`feeDescription`/`feeRemarks`
(an earlier version wiped every bundle back to blank/undecided on
decline; that was changed so revising means editing what's already
there, not re-typing a whole batch from scratch). `feeEditable` — used
throughout the bundle detail page — is `feeApprovalStatus ===
'not-submitted' || feeApprovalStatus === 'declined'`, so a declined batch
behaves exactly like a fresh draft: the fee card shows a red "Declined"
badge, **plus its own full "Reason for decline" banner row** below the
title/button row — a warning-triangle `Iconify` icon, an uppercase
"Reason for decline" label, and the stored `feeDeclineReason` body text,
all tinted with `TONE_COLORS.error` (`src/components/admin-ui/
admin-tokens.ts` — the same canonical error-tone bg/border/text values
every other error surface in the admin app uses, not one-off hex) so the
reason is visible at a glance without opening anything. Its button reads
"Request Appraisal Fee" again (not "View"), and Appraisal Documents
un-collapses back to its always-open editable state (see below). **The
fee modal itself does not repeat this banner** — an earlier version
showed the identical banner inside the modal too, above the editable
fields, but that duplicated what the card sitting right behind it
already shows, so it was removed; the reason now lives on the card only.
(An even earlier version crammed a single red `"Declined: {reason}"`
line directly under the card's title, in a hand-picked hex; that became
this bordered/tinted banner using the actual design-system tone.) There
is no separate "Revise" step or button — editing the fields and clicking
"Submit Fees for Approval" again is exactly the same action as the very
first submission (same `submitAppraisalFeesForApproval()` call, same
`canSubmit` gate, now
written as `feeEditable && allGroupsAssigned && allBundlesHaveFeeDecision`
rather than checking `'not-submitted'` specifically), just starting from
the previous values instead of blank ones.
`submitAppraisalFeesForApproval()` clears `feeDeclineReason` back to `''`
the instant it's called, so a stale reason never lingers once
resubmitted.

The "Advise client to settle the Appraisal fees" / "Advise Client" /
"Simulate: Payment Received" block still lives on the list page
(`appraisal-appraiser-view.tsx`) at page level, gated on
`feeApprovalStatus === 'approved' && !feeSettled` — not duplicated on the
bundle detail page, since advising the client and confirming payment are
whole-batch actions with no natural "which bundle" framing, unlike the
fee decision itself which is inherently per-bundle.

`feeSettled` (`feeApprovalStatus === 'approved' && !!paymentReceivedAt`)
is the "batch is fully done" flag, computed the same way everywhere it's
used. The bundle detail page's report form (`AppraiserAssignmentCard`)
unlocks on `reportUnlocked = bundle.feeNeeded === 'no' || feeSettled` —
**not** on `feeSettled` alone. A bundle whose fee decision is "No" has
nothing to wait on at all: there's no payment to settle, so its report
form unlocks the instant that Yes/No choice is made in the fee modal,
independent of whatever the batch's submit→approve→pay cycle is doing
for *other* bundles in the same batch that do need a fee. Only a bundle
whose fee is actually needed (`feeNeeded === 'yes'`) waits on
`feeSettled`; while waiting, it shows a plain locked message ("The
Appraisal Fee must be settled before the report form for this property
unlocks."). The same `bundle.feeNeeded === 'no' || (feeApprovalStatus
=== 'approved' && feeSettled)` check also drives the `'for-report'`
branch of the On Process/For Approval/For Report/Reported status
pill — both on this detail page's header `StatusBadge` and on the list
page's own table pill (`appraisal-appraiser-view.tsx`) — so a no-fee
bundle reads as "For Report" immediately too, not stuck on "On Process"
until an unrelated batch-level payment clears.

**`/admin/appraisal-fee-approval`** (`appraisal-fee-approval-view.tsx`) is
now a **list page**, "Fee Approvals" — restructured from an earlier
single flat page (which rendered everything below inline, titled "My
Approvals") into the same list → detail split
`appraisal-appraiser-view.tsx` → `appraisal-appraiser-bundle-view.tsx`
already uses. Same auto-load-and-seed convention as the Appraiser list,
taken one step further: if the session hydrates with no live application,
`loadSample(SAMPLE_APPLICATION)` runs; if there are no `reportBundles`
yet, it seeds one the same way the Appraiser list does, but with a
ready-made fee decision passed straight into
`createAppraisalReportBundle`'s `fee` argument and an immediate
`submitAppraisalFeesForApproval()` call right after — landing the seeded
batch directly in `pending-approval` (see "Approval-role screens" below
for the exact seed values). So a fresh session always shows one real,
active "For Approval" row here, same as every other list page in this
app, rather than an empty state until someone manually drives the
Appraiser flow first. Renders a table (same shape AND column order as
the Appraiser list's own — Appraisal No. leads the row, matching
`appraisal-appraiser-view.tsx`'s own table) with exactly one row —
Appraisal No., Applicant, Properties (bundle count), Appraiser, Total
Appraisal Fee, a "For Approval" `StatusBadge`, and a trailing chevron.
**"Properties" is every TCT group across every bundle in the request**
(`reportBundles.reduce((sum, bundle) => sum + bundle.tctGroupIds.length,
0)`), not the number of bundles — a single `AppraisalReportBundle`
already covers however many properties were assigned together in one
Assign Appraiser selection, so a request with one multi-collateral bundle
covering 5 TCTs is 5 properties, not 1 (an earlier version used
`reportBundles.length` directly, which undercounted exactly this case).
Appraisal No. and Appraiser both show the FIRST bundle's own value plus
a "+N more" suffix when the request bundles more than one property
(`getAppraisalNumber(firstBundle.id)`; deduplicated `appraiserName`s,
since a request can list more than one distinct appraiser if its
bundles were assigned to different people) — rather than cramming every
bundle's value into one cell. **The row always renders whenever a live
application exists** (`!!signUpData`), regardless of `feeApprovalStatus`
— same convention `application-list-view.tsx` uses for its own live row
(always present, only its actionability/status varies by step). An
earlier version gated the row behind `feeApprovalStatus ===
'pending-approval'`, so approving or declining the seeded request made
the row disappear entirely and the page fall back to an empty-state
card; that gate was removed — only the `StatusBadge` tone/label
(`APPRAISAL_FEE_ROW_STATUS_COPY`, one entry per `FeeApprovalStatus`
value: `not-submitted`/`pending-approval`/`approved`/`declined`) varies
now. The only remaining empty state is "no live application at all"
(`!signUpData`), prompting to start one from Account Solicitation. There
is no real multi-application backend here — like every other list page
in this app, at most one real row ever renders, since one live session
only ever holds one live fee request.

Clicking the row navigates to
**`/admin/appraisal-fee-approval/[bundleId]`**
(`appraisal-fee-approval-bundle-view.tsx`, new — mirrors
`appraisal-appraiser-bundle-view.tsx`'s own header-card shape) — the
**detail page**, which now holds everything the old single page used to
render inline: a header card (42px icon-avatar + applicant name as the
title + "App No. … · email" subtitle + a `StatusBadge` derived from
`feeApprovalStatus`, top-right) with a bordered/tinted `FactChip` strip
below it (Properties — same TCT-group-count fix described above, not
`reportBundles.length` — Total Appraisal Fee, Requested On — sourced
from `feeSubmittedAt`).

**Below the FactChip strip: a `Divider`, then a "View Appraisal
Documents" button** — matching the exact layout of the Call Report
page's own collapsible summary card (`ApplicationDetailsCard`,
`application-details-card.tsx`, rendered on `call-report-view.tsx`):
header row, FactChip strip, `Divider`, then a row of compact outlined
navy buttons sitting left-aligned at the bottom of the card (that card's
own row has "View full application" / "Initial credit checking result" /
"View all officer notes" — same `sx` shape reused here: `color: '#1C2A6E'`,
`borderColor: '#C7CEEA'`, `borderRadius: '10px'`, not full-width). The
header card's own outer padding matches that same reference too —
`p: { xs: 2.5, md: 3 }`, the tighter override `ApplicationDetailsCard`'s
collapsible variant uses, in place of the plain `adminCardSx` default
(`p: { xs: 3, md: 4 }`) every other content card on the sibling
Appraiser pages keeps — since this specific card is what's being
matched, not just its internal layout; the "Appraisal Fee Details" card
below it keeps the plain `adminCardSx` default, same as those other
cards. Clicking the button opens a read-only `Dialog` listing every
`APPRAISAL_DOC_META` document (same `ReadOnlyRequirementDocRow`
component `appraisal-appraiser-bundle-view.tsx`'s own Appraisal
Documents section uses), grouped per TCT group, across every bundle in
the request — the Fee Approver's only way to see the underlying
property documents without leaving this page. (Two earlier attempts
placed this differently: first inline beside the title/StatusBadge in
the header row; then as a full-width button below the FactChip strip
with no `Divider` — both were replaced with this `Divider` +
compact-button layout once it became clear the actual reference was the
Call Report card, not the Requirement Checklist card's own summary,
which an earlier pass had mistakenly copied instead.)

Then an **"Appraisal Fee Details"** card holds every bundle's
fee-or-"No fee needed" row plus the running total — each bundle's
**appraiser name now renders bold and navy (`#1C2A6E`, `fontSize: 13`)**,
visually distinct from the muted-gray TCT numbers/fee description around
it (an earlier version rendered the appraiser name at the same small
muted weight as the fee description beneath it, making it easy to miss)
— and finally the **"Approve Appraisal Fees"** / **"Decline Appraisal
Fees"** buttons (unchanged — still call the same batch-level
`approveAppraisalFees()` / `declineAppraisalFees(reason)` context
methods the Appraiser page's own page-action shortcuts do, and still
apply to the **whole request**, not one property in isolation — see
"Appraisal Fee" above for why approval stays batch-level even though
this page is reached per-request). The "There's no real Head login in
this prototype — approving or declining here simulates your review."
disclaimer line that used to sit under these buttons has been removed.

**Spacing pass** — each bundle row got slightly more internal padding
(`p: 1.75` up from `1.5`) and more room between its stacked TCT
No./appraiser/fee-description lines (`mt: 0.5` up from `0.25`); the
`Divider` above "Total Appraisal Fees" gained a touch of vertical margin
(`my: 0.5`) and that row's own padding grew (`py: 0.75` up from `0.5`);
and the gap before "This request is waiting…" plus the Approve/Decline
button row widened (`mt: 3`/`0.75` up from `2.5`/`0.5`) — the whole card
felt visibly cramped before this pass, with almost no breathing room
between the fee breakdown, the total, and the action buttons.

The `[bundleId]` route segment is a fixed placeholder
(`paths.admin.appraisalFeeApprovalBundle()` always resolves to
`/admin/appraisal-fee-approval/current`, no actual ID) — there's no
per-bundle approval status to route on (`feeApprovalStatus` lives once
per application, not once per property), so the segment exists purely to
keep this page's URL shape consistent with `appraisalAppraiserBundle`'s
own list → detail split, and to leave room for genuine multi-application
support later without another URL migration. The detail page component
ignores the param entirely and reads `review.appraisal` directly, the
same way the old single page did with no bundle lookup by ID at all.

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
  areaSize, lotNo, zonalValue, boundaries, technicalSpecification,
  photoFileName, photoFileUrl, photoUploadedAt }`), since the PDF's
  LAND/BOUNDARIES/TECHNICAL SPECIFICATION tables repeat once per TCT/OCT.
  `boundaries` is a single free-text field (matching the PDF, which has
  no North/South/East/West breakdown), not structured per-direction
  fields. The three `photo*` fields are a later addition — one Collateral
  Photo upload per TCT/OCT, same `fileName`/`fileUrl`/`uploadedAt`
  triplet shape every other single-file upload in this app uses, just
  renamed with a `photo` prefix since they sit alongside the title's own
  other fields rather than being the report's single file (see
  "In-house form" below for the upload UI).
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

Which report path applies — `'inhouse'` or `'external'`
(`bundle.appraiserType`) — is decided exactly once, by the Officer, in
the Assign Appraiser modal (see "Assign Appraiser modal" above). This
page renders whichever one already applies; it no longer lets the
appraiser switch it. (An earlier version had a `ButtonGroup` toggle right
on this card — `setAppraisalBundleAppraiserType` — that reset `report`
to a fresh blank `AppraisalReport` on switch; it was removed since the
appraiser already knows which type they were assigned as, and re-deciding
it from inside the report form was both redundant and a way to
second-guess the Officer's own assignment. There is no read-only label
in its place either — the type just isn't surfaced here at all anymore.)

- **In-house** — the full sectioned form described above (each section
  under its own uppercase `SectionLabel`, separated by `Divider`s), plus
  one `LandTitleFields` block per pledged property, plus a fixed
  dashed-border note (verbatim from the source process diagram):
  *"Realtime taking picture, uploading of files anywhere in the system
  (integrate lot plotting and market value)"* — flagged there as future
  integration work, not built here. **"Submit Appraisal Report"** (renamed
  from "Create Appraisal Report" — the button submits an already
  filled-in report, it doesn't create one from nothing, so "Submit"
  describes the action more accurately) is enabled once Appraised Value
  is filled (the one required field, same as before), and sets
  `report.uploadedAt`. The confirmation line beneath it once the report
  is submitted reads "Report submitted {date}" to match (was "Report
  created {date}").
- **External** — unchanged: a single dashed file dropzone for the external
  appraiser's finished report (image or PDF). Picking a file sets
  `fileName`/`fileUrl`/`uploadedAt` directly (no separate submit step).

**Each `LandTitleFields` block also has its own "Choose a photo —
Collateral Photo" dropzone**, one per TCT/OCT, sitting at the END of that
property's field list — after Survey No./Book No./Boundaries/Technical
Specification, not before them — since the photo is a supporting
attachment for the title's other details, not the lead field to fill in
first. (An earlier version put it first, above Survey No.; moved to last
per explicit direction.) A real photo of the collateral itself, distinct
from the title/document fields around it.
Backed by three new fields on `AppraisalReportLandTitle`:
`photoFileName: string | null`, `photoFileUrl: string | null`,
`photoUploadedAt: string | null` (same fileName/fileUrl/uploadedAt
triplet convention every other single-file upload in this app already
uses — `RequirementDoc`, the external-appraiser report file — just
scoped per land title instead of per bundle/document, since exactly one
photo per title is all this needs; not an array). Picking a file calls
`onChange({ photoFileName, photoFileUrl: URL.createObjectURL(file),
photoUploadedAt })` directly through `setAppraisalBundleLandTitle`, no
separate submit step, same as the external report dropzone.

`ReportFileDropzone` (the shared dashed-border upload control this card
already used for the external report file) was generalized to support
this: its `value` prop now accepts `File | string | null` instead of just
`File | null` — a freshly-dropped photo passes the real `File` for that
one render, but on every subsequent render (including after a page
reload within the same session) only the persisted `photoFileUrl` string
survives, since the `File` object itself never persists. Passing that URL
string straight through to `FileThumbnail` (which accepts `File | string`
via its own `imageView` prop) still renders a real photo thumbnail, unlike
the external-file dropzone's own display, which only ever reconstructs a
`new File([], fileName)` stand-in with no real bytes and therefore never
renders as an actual image (see below) — a new `imageView` prop on
`ReportFileDropzone` (default `false`) opts the photo dropzone into that
real-thumbnail rendering, while the external-file dropzone keeps its
existing icon-only look. A new `fileName` prop fills in the display name
whenever `value` is a bare URL string, since a blob: URL can't be parsed
back into a filename the way a `File`'s own `.name` can.

Once `headApprovalStatus !== 'pending'` **or** that bundle's report has
already been submitted (`report.uploadedAt` is set), the form locks:
every field/dropzone (including each TCT's own Collateral Photo dropzone)
becomes read-only. This keeps the assignment from being silently swapped
out from under an in-flight or already-approved report. The external
report dropzone still reconstructs a stand-in `File` object from
`report.fileName` (`new File([], report.fileName)`) purely so the shared
`FileThumbnail` display can show a filename — this is a display-only
stand-in with no real bytes behind it, not something that can be
re-downloaded, re-inspected, or (unlike the Collateral Photo dropzone)
rendered as an actual image preview. The external dropzone's own
`disabled` prop (derived from the same locked/`editable` flag) also hides
its delete (×) button once locked — a locked report's file cannot be
cleared via that button, which would otherwise desync the page.

**Locked fields still render dark, readable text — they no longer wash
out to MUI's default disabled gray.** An earlier version left every
`TextField` at its default disabled appearance, which colors the text a
light gray (`#919EAB`) regardless of whether the field is genuinely
empty or holds a fully filled-in, already-submitted report's real
content — on a completed report, that made the entire form barely
legible. The shared `fieldSx` both `LandTitleFields` and
`AppraiserAssignmentCard` build now overrides `.Mui-disabled`: text stays
`#14172A` (this app's standard dark text color) via both `color` and
`WebkitTextFillColor` (Safari/Chrome require overriding both for a
disabled input's text color to actually change), and the field's
background becomes `#F5F6FA` with a `#E1E4ED` border — `TONE_COLORS.neutral`'s
own `bg`/`border` values (`src/components/admin-ui/admin-tokens.ts`), not
one-off hex — so a light gray background is what communicates "locked"
now, instead of light gray text.

### Read-only view (`AppraisalReportView`)

Once a bundle's `report.uploadedAt` is set, `AssignedAppraiserCard`
renders this inside its "View Report" `Dialog` for that bundle on the
Officer's page, and `appraisal-approver-bundle-view.tsx` renders it
directly (one per bundle, no dialog) on the Head/Approver's "My
Approvals" detail page — `appraisal-view.tsx` itself never renders
`AppraiserAssignmentCard` or `AppraisalReportView` directly; both only
ever appear via the pages that own them. It's a read-only rendering of
everything the appraiser filled in, so whoever is reviewing (Officer or
Head/Approver) can actually see the report's content instead of just a
"submitted" boolean.

Deliberately built from this app's own tokens rather than a one-off
document look — the outer card is plain `adminCardSx` (16px radius,
`#EBEDF3` border, same shell every other card here uses), each land title
is a nested `10px`-radius box matching `LandTitleFields`'s own inner-card
convention, and the Appraised Value callout reuses the tinted-box +
icon-avatar pattern (`TONE_COLORS.info.bg`, a navy `#1C2A6E` icon square)
this app already uses for its other prominent-total summaries. What makes
it read as a document rather than another admin card: a centered
"Appraisal Report" title + "Covers … Submitted by … on …" meta line up
top (a small letterhead, not a page-heading-sized title), a `SectionLabel`
(small-caps label + a full-width `Divider`) before each of the report's
sections, and every `Field` value sitting on its own hairline
bottom-border rather than floating loose in a wrapped paragraph — the way
values sit on ruled lines in an actual filled-in form. (Two earlier
passes overcorrected in the opposite direction: the very first version
used loose flex-wrapped `Field` pairs with no visual distinction from any
other app card; a second pass fixed that but introduced sharp 4-6px
corners, a monospace font, and hand-picked ink/border hex values found
nowhere else in the app, reading as a foreign component instead of this
app's own take on a document. This version keeps the *document structure*
— letterhead, section rules, field rules — while rendering it with the
app's actual card chrome and palette.) Every field is conditionally
rendered (`Field` returns `null` for an empty value, `SectionLabel`
dividers always show) so a partially-filled report doesn't show a wall of
blank labels. External-appraiser bundles instead show the uploaded file
with a **"View"** link (`report.fileUrl`) rather than any of the
structured fields, since external appraisers only ever upload a finished
file.

Each `LandTitleSummary` card (one per TCT/OCT) shows its own Collateral
Photo beside its field grid — `Stack direction="row"` with a fixed-width
(`200px`) photo column on the left and the fields flowing in the
remaining space, when `title.photoFileUrl` is set — wrapped in a plain
`<a target="_blank">` with a hover-reveal "View full photo" overlay so
clicking it opens the full photo in a new tab. (Three earlier layouts
got this wrong in different ways: first a small 56×56, then a still-small
84×64, thumbnail squeezed into the title row next to "TCT No. …" — both
too small to read as an actual photo; then a properly-sized photo
block stacked ABOVE the field grid instead of beside it, which left a
large dead gap of empty white space next to the photo whenever the grid
didn't fill every column on a row. The current side-by-side layout is
what actually fixed it — the photo's height now roughly matches its
fields' height instead of leaving unused space.) Unlike
`AppraiserAssignmentCard`'s own dropzone display (which can't render a
real image once locked, since it only has a stand-in `File`
reconstructed from just the filename), this view reads `photoFileUrl`
directly — a real, still-valid blob/object URL or data URI — so it
renders an actual photo, not a placeholder icon. No photo block renders
at all when a title has no photo, same "conditionally rendered, no blank
placeholder" convention every other field on this card follows.

**Collapsible sections + no muted text.** A full in-house report has
roughly 15 sections plus one land-title card per pledged property — an
earlier pass tried fixing the resulting wall-of-text feel by muting
"routine" fields to a lighter gray weight, but that read as
disabled/broken text rather than an intentional design choice, so it was
reverted entirely: every `Field` now renders at the same normal,
readable weight regardless of section. The actual fix for length: every
section after Land (Technical Specification, Source or Kind of
Utilities, Improvement — General Construction Features, and Basis of
Valuation) is wrapped in the shared `CollapsibleSection` component
(`src/components/collapsible-section` — the same chevron+`Collapse`
shell Document Checklist and Requirement Checklist's per-tab groups
already use elsewhere in this app), collapsed by default via a single
`expanded: Record<string, boolean>` state keyed per section. The
Valuation section's own totals (Loanable Amount, Rounded Figures,
Appraised Value (P), Item of Property, FMV/RCN, Construction Status %,
Depreciated Value), Remarks/Recommendation, and the
Prepared/Reviewed/Endorsed/Noted By signature block all stay
always-visible, not wrapped in a `CollapsibleSection` — the signature
block was wrapped in one in an earlier version, but who prepared,
reviewed, endorsed, and noted a report is attribution a reviewer
shouldn't have to click to see, not routine detail worth tucking away
by default, so it now renders as a plain `SectionLabel` + `FieldGrid`
like the other always-visible sections.

**Land titles collapse too, past the first fix's remaining problem.**
Wrapping only the sections AFTER Land wasn't enough on its own: a bundle
covering several pledged properties still stacked that many full
`LandTitleSummary` cards — five near-identical property cards, each with
its own photo and field grid — in one column, dominating the page before
a reviewer reached anything else. Same fix
`appraisal-appraiser-bundle-view.tsx` already applies to its own per-TCT
document lists: when a bundle covers more than one title
(`showToggle={titleGroups.length > 1}`), each `LandTitleSummary` renders
as a compact collapsed row by default — a 40×40 photo thumbnail, "TCT
No. …", and Zonal Value, right-aligned — expanding in place to the full
photo + field detail on click. A `Set<string>` of expanded group ids
(`expandedTitleIds`) tracks which are open, same "present in the set
means expanded" convention the Appraiser page's own per-TCT nesting
uses. A bundle covering only one title skips the toggle entirely
(`showToggle` false) and renders the full detail directly, same as
before — there's nothing to disambiguate or tuck away when it's the only
property in the report. The net effect on the 5-property sample data:
the page that used to require scrolling through ~3800px of stacked
photo cards before reaching Technical Specification now shows the whole
report, every property collapsed, in about one screen's height.

**"At a Glance" restructure — the fourth pass, and the first to change
the information architecture rather than the document's internals.**
Every fix above (side-by-side photo layout, no muted text, per-section
collapse, per-title collapse) still left the same underlying shape: one
long form read top to bottom, with pieces individually tucked away — a
reviewer still had to open several separate `CollapsibleSection`s one at
a time to build a full picture. This version inverts that instead of
tweaking it further: everything a reviewer actually needs to decide sits
in one always-visible "At a Glance" summary right after the letterhead —
`AppraisedValueHero`, then a `FieldGrid` of Registered Owner, Loanable
Amount, Location of Property, Highest and Best Use, and Properties
Covered (`titleGroups.length`), then `PhotoChipRow` — a small 72×54
thumbnail per pledged property (skipping any title with no photo), each
linking to its full photo, so every property's photo is visible without
opening anything. Below that, a single full-width "View Full Report" /
"Hide Full Report" toggle button (chevron rotates 180° when open) reveals
the ENTIRE itemized report underneath — every field, every section, the
exact same content and CollapsibleSection/per-title-collapse behavior the
earlier passes built, unchanged — collapsed by a single `fullReportOpen`
boolean rather than shown by default.

No tabs and no multi-column layout were introduced for this — grepping
the codebase for `@mui/material/Tabs` and any two-column detail-page grid
turns up nothing else in this app, so either would have been a genuinely
new interaction pattern bolted onto one screen rather than a restructure
that stays inside the existing design language. A single expand/collapse
toggle, reusing the same chevron+`Collapse` shell `CollapsibleSection`
already standardizes elsewhere, was the version of "new layout" that
actually fit. `Registered Owner`, `Loanable Amount`, `Location of
Property`, and `Highest and Best Use` each appear twice now — once in
the At a Glance summary, once again inside the full report's own
Land/Technical Specification/Valuation sections — which is intentional:
the full report is meant to read as the complete, unabridged document
(matching the printed REM section-by-section, as it always has), while
the summary is a separate "everything important, nothing to expand" view
layered on top of it, not a replacement for any of its content.

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
("My Approvals" for CI Fee and Appraisal Report approval, "Fee Approvals"
for Appraisal Fee approval — see below for why that one's title differs
now — "My Assignments" for the Appraiser screen), not generic
admin-facing queues —
each has a small uppercase eyebrow label naming the role (e.g. "CI HEAD /
APPROVER", "APPRAISER WORKSPACE"), first-person copy throughout ("Nothing
waiting on you yet", "Request your fee and submit the report…"), and (with
one exception, below) **no sample filler rows at all** — unlike every
other queue in this app, a real person's personal inbox/workspace would
never show other unrelated applications' sample data. This is why
`SampleApplicationEntry` (`sample-applications.ts`) carries no
`ciFee`/`appraisalFeePending`/`appraisalAwaitingHeadApproval` fields (all
removed) — these four screens only ever show the one live application's
own state, sourced entirely from `review.creditInvestigation`
/`review.appraisal`/`review.requirementChecklist` in `AdminContext`.

**Exception: the Appraiser screen (and, as of the Fee Approvals
restructure and the Appraisal Report Approval restructure, the Appraisal
Fee Approver's and Appraisal Report Approver's list pages too) auto-loads
a real sample application and seeds it a real assigned bundle, instead of
showing an empty/sample placeholder.** This mirrors the exact mechanism
`application-list-view.tsx` already uses for its own table — once
hydrated, if there's no live application in the session
(`!signUpData || !application.personalInfo`), it calls
`loadSample(SAMPLE_APPLICATION)` (`useRegistration()`, the same shared
sample dataset Application List loads), which makes `signUpData` genuine
session state, not a disabled placeholder object. Since this page also
needs an actual *assigned bundle* to show anything (unlike Application
List, where the loaded sample application alone is enough), the same
effect additionally seeds one: it filters `appraisalGroups` to
**every** still-unassigned entry whose documents are all `'verified'`
(same completeness gate `docsIncomplete()` enforces on the Officer's
page — see "Documents must be verified before assignment" below), and
calls `createAppraisalReportBundle(groupIds, 'inhouse',
APPRAISER_ROSTER[0], null)` with **all** of those group IDs together in
one call — the same call selecting every eligible TCT row and assigning
them as one consolidated bundle via the Officer's Assign Appraiser modal
makes. This runs the moment `reportBundles.length === 0`. The net
effect: the very first time this page is visited in a fresh session
(even navigating to it directly, without ever visiting Application List
first), the table already shows one genuinely active, clickable
**multi-collateral** assignment row covering all 5 of the default seed
TCTs (e.g. "TCT-2024-00981, TCT-2024-00982, TCT-2024-00983,
TCT-2024-00984, TCT-2024-00985") — not a single-property example, and
not a static, disabled one either. (Earlier iterations first covered
just one group, then just the first two, before landing on covering
every eligible group at once — a single multi-collateral bundle reads
as a more realistic example of a consolidated assignment than a
single- or two-property one. Before any of those, an even earlier
version instead rendered one hardcoded, always-inert
`SAMPLE_ASSIGNMENT` row — no `onClick`, disabled chevron, no real
`bundleId` — appended after any real bundles, mirroring
`application-list-view.tsx`'s `[...liveRows, ...sampleRows]` *shape* but
not its actual *mechanism*. That diverged from how every other "no live
data yet" case in this app is handled — real pages there auto-load real
sample data rather than rendering a disabled stand-in — so it was
replaced with this auto-load-and-seed approach instead.) Since the seeded
bundle is a real `AppraisalReportBundle`, it behaves identically to one
created through the normal Assign Appraiser modal — full fee-request flow,
report form, batch submit, everything documented under "Appraisal Fee"
and "Appraisal Report (per bundle)" above works on it exactly the same
way. The effect only ever fires once per empty state (gated on
`reportBundles.length === 0`), so it doesn't re-seed a second bundle once
one exists, and it never overwrites a real application that just hasn't
finished loading from `localStorage` yet (same `hydrated` gate
`application-list-view.tsx` uses).

**The Appraisal Fee Approver's list page follows this same convention all
the way through, one step further than the Appraiser list's own seed.**
If the session hydrates with no live application, it loads
`SAMPLE_APPLICATION`; if there are no `reportBundles` yet, it seeds one
the same way the Appraiser list does (every still-unassigned,
docs-complete `appraisalGroups` entry, one consolidated bundle) — but
passes a ready-made fee decision straight into
`createAppraisalReportBundle`'s optional `fee` argument (`{ feeNeeded:
'yes', feeAmount: '5000', feeDescription: 'Site visit + valuation fee',
feeRemarks: '' }`) instead of leaving it undecided, then immediately
calls `submitAppraisalFeesForApproval()` so the batch lands directly in
`pending-approval`. The net effect: the very first time this page is
visited in a fresh session, the list already shows one genuinely active,
clickable "For Approval" row — not an empty state. (An earlier version
stopped at loading the sample application and left the fee request
itself to be driven manually from the Appraiser pages first, reasoning
that auto-driving a submitted fee request here would duplicate the
Appraiser's own submit logic; that was changed once it became clear this
page was the one exception to "every list page here always shows one
real active example," which reads as inconsistent rather than
intentional.)

**The Appraisal Report Approver's ("My Approvals") list page goes one
step further still, since it only ever shows a row once every pledged
property's report is submitted, not merely fee-approved.** If the
session hydrates with no live application, it loads `SAMPLE_APPLICATION`;
if there are no `reportBundles` yet, it seeds one the same way (every
still-unassigned, docs-complete `appraisalGroups` entry, one consolidated
bundle) with the fee already settled — `feeApprovalStatus: 'approved'`
plus `feeSubmittedAt`/`feeApprovedAt`/`clientNotifiedAt`/`sentToOdooAt`/
`paymentReceivedAt` all stamped directly via `setAppraisal()` in the same
effect, skipping the request/approve steps entirely since nothing on this
page needs to show them mid-flight. A second effect then finds the first
bundle still missing a submitted report (`!bundle.report.uploadedAt`) and
fills it in via `buildSampleAppraisalReport(bundle, tctNumbers,
applicantName, true)` — `submit: true`, unlike the Appraiser/Fee list
seeds' own "fill sample report" actions, which pass `false` and leave
`uploadedAt` unset for a human to submit by hand; this seed needs the
report to land already-submitted, since that's the only state this page
renders a row for. The net effect: the very first time this page is
visited in a fresh session, `signUpData` loads, the bundle is created with
its fee pre-settled, then (next render) the report gets filled in and
submitted — the list already shows one genuinely active "For Approval"
row within two effect passes, without ever having to drive the Appraiser
page manually first.

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
  not sample/filler rows), columns: **Appraisal No.** (a deterministic
  per-bundle reference number, `getAppraisalNumber(bundle.tctGroupIds)` —
  `src/utils/get-appraisal-number.ts`, same hash-then-format convention
  as `getLoanNumber()` — `APR-######`, hashed from the bundle's own pledged
  TCT group ids (stable/user-chosen) rather than the bundle's own
  `crypto.randomUUID()` id or a persisted counter, so the same set of
  properties always yields the same number even across a freshly-created
  bundle, no separate sequence state needed), **Collateral No.** (every TCT number
  this bundle covers, comma-joined — clamped to 2 lines with an ellipsis
  via `-webkit-line-clamp` so a bundle spanning many properties, e.g. all
  5 default TCTs, doesn't blow out the row height), **Applicant**,
  **Appraisal Fee** (the per-bundle fee-status pill — see "Appraisal Fee"
  above), **Status** (the same On Process/For Approval/For Report/Reported
  pill convention `AssignedAppraiserCard` uses on the Officer's page,
  computed independently here rather than shared/refactored into one
  utility), and a trailing chevron (`eva:arrow-ios-forward-fill`) signaling
  navigation, not expand. `getAppraisalNumber()` is also shown on the
  per-bundle detail page's header subtitle (see below), so the same
  reference number is visible in both places. There is no separate heading
  above the table (an
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
  in order:
  1. A "Back to My Assignments" link, then a single header/details
     card built to match this app's standard summary-card shape (the same
     one `application-details-card.tsx`/`application-review-header.tsx`
     use) rather than a one-off design — no separate "Appraisal Details"
     heading; the header and the read-only fields below it are one
     continuous card, not two stacked sections. The header row is a 42px
     icon-avatar (`#EEF1FE` background, `solar:document-text-bold-duotone`
     in `#1C2A6E`) + **Appraisal No.** (`getAppraisalNumber(bundle.tctGroupIds)`,
     see "Appraisal No." above) as a **card-level** title
     (15px/800 — the size every other summary card in this app uses for
     its title, not a 22-30px page-heading size) + `{applicantName} ·
     App No. {getLoanNumber(...)}` as the subtitle, with the overall
     status rendered via the shared `StatusBadge` component
     (`src/components/admin-ui`) top-right rather than an inlined pill.
     Below that, still in the same card, a bordered/tinted row of
     `FactChip`s (a local copy of `application-details-card.tsx`'s own
     unexported `FactChip` — 11px uppercase micro-label over a 13.5px
     bold value, `border:'1px solid #EEF0F5', borderRadius:'12px',
     bgcolor:'#FAFBFD'` wrapping the whole row, vertical dividers between
     chips) for: **Collateral** (labeled "Collateral (N)" once N > 1,
     every TCT number this bundle covers comma-joined into one value),
     **Collateral Type** (`COLLATERAL_TYPE_LABEL[group.collateralType]`,
     **deduplicated** via `Array.from(new Set(...))` before joining — a
     bundle whose every property is "Real Estate" shows that once, not
     "Real Estate, Real Estate, Real Estate..." repeated per TCT; a
     bundle mixing types would still show each distinct one,
     comma-joined), **Appraiser Type** (In-house/External), **Assigned
     To** (`bundle.appraiserName`), and **Target Completion** (formatted
     via `toLocaleDateString()`, or "—" if unset). Nothing here is
     editable — reassigning still only happens via the Officer's Assign
     Appraiser modal, same as `AssignedAppraiserCard`. (Two earlier
     designs preceded this: first the joined TCT number list itself as a
     22px/800 giant page-style title with no icon avatar, an inlined
     status pill instead of `StatusBadge`, and plain floating label/value
     pairs instead of a `FactChip` strip — for a bundle covering many
     properties that title was also unreadably long and wrapping; then
     Appraisal No. replaced the TCT list as the title, with the TCT list
     moved into its own "Collateral" field rendered as small wrapped
     chip boxes rather than a `FactChip` value. Both were rebuilt into
     the current shape once it became clear the card was reinventing a
     pattern this app already has a standard for, rather than reusing
     it.)
  2. **Appraisal Fee** card — a `StatusBadge` (No Fee/Draft/For
     Approval/Approved/Settled) beside the title, plus a **"Request
     Appraisal Fee"** button (relabeled **"View Appraisal Fee"**,
     outlined, once the batch is no longer `not-submitted`) that opens a
     `Dialog` — see "Appraisal Fee" above for the full modal contents
     (Yes/No + amount/description/remarks while editable, a "Submit Fees
     for Approval" footer button gated on `canSubmit`, or a read-only
     summary once submitted). This is the *only* place an Appraiser can
     decide or submit a fee at all — there is no fee UI on the list
     page, and `appraisal-view.tsx` (the Officer's page) never shows any
     fee UI either.
  3. **Appraisal Documents** (renamed from "Documents" to disambiguate
     from every other Document Checklist in this app) — **not collapsible
     at all while the fee decision is still editable**
     (`docsCollapsible = !feeEditable`, so both `not-submitted` and
     `declined` keep it locked open — see "Appraisal Fee" above for why
     `declined` counts as editable too). Same "not clickable until a
     condition is met" convention
     `appraisal-tct-table.tsx`'s own Collateral titles table header uses
     for its `allGroupsAssigned` gate — while `!docsCollapsible`, this
     renders as a plain always-open header (title + badge, no chevron, no
     `onClick`) with no way to collapse it, since document review is
     still the thing the appraiser needs to be looking at while deciding
     the fee. Only once `docsCollapsible` is true does it render wrapped
     in the shared `CollapsibleSection` component
     (`src/components/collapsible-section`), the single reusable
     chevron+badge+animated-`Collapse` shell every other collapsible
     document list in this app already uses (Credit Investigation's own
     Document Checklist, Requirement Checklist's per-tab groups, etc.).
     Either way, the header shows a `CollapsibleSectionBadge` ("N/total on
     file", counting every document across every pledged property this
     bundle covers whose `status !== 'missing'`, out of
     `APPRAISAL_DOC_META.length * bundleGroups.length`) — no green
     completion checkmark next to it (an earlier version showed one once
     that ratio hit 100%, matching every nested per-TCT group's own
     checkmark; the outer section's checkmark was removed, so only the
     per-property groups still show one, not the outer "Appraisal
     Documents" header itself). The badge renders identically whether or
     not the section happens to be collapsible yet.

     **Auto-collapses the moment the fee batch is (re-)submitted.** A
     `wasFeeEditableRef` + `useEffect` (same "collapse on transition, not
     on every render" convention `credit-investigation-view.tsx` uses for
     its own `checklistExpanded`) sets `docsExpanded` to `false` the
     instant `feeEditable` flips from `true` to `false` during this
     session — covering both the first `not-submitted -> submitted`
     transition and a later `declined -> resubmitted` one, since either
     means the document checklist the appraiser was reviewing while
     deciding the fee is no longer the thing needing attention, so it
     tucks itself away. It only fires on that specific transition, never
     on every render, so the appraiser's own manual re-open afterward is
     never fought by the effect re-collapsing it. Picking Yes/No inside
     the Appraisal Fee modal alone does **not** trigger this — only the
     batch-level "Submit Fees for Approval" actually changes
     `feeApprovalStatus`, so the collapse only happens once that's
     actually been sent, not per bundle's individual Yes/No decision.

     **When a bundle covers more than one TCT, each property's document
     list is its OWN nested `CollapsibleSection`** (a "TCT-2024-00981"
     title + its own `CollapsibleSectionBadge`, "8/8 on file" etc. + its
     own green checkmark, wrapped in a bordered box), independently
     collapsible from every other property's list and from the outer
     Appraisal Documents section — `expandedGroupIds` (a `Set<string>` of
     group ids *currently expanded*; absent from the set is the default,
     collapsed, state for every group) tracks each one separately, so
     expanding TCT-2024-00981's list leaves TCT-2024-00982 through -00985
     exactly as they were. Unlike the outer section, **these per-property
     groups are always collapsible, regardless of `docsCollapsible`** —
     the fee-submission gate only applies to the outer "Appraisal
     Documents" header; there's no reason to lock away the ability to
     tuck one already-reviewed property's documents aside just because the
     batch fee hasn't been submitted yet. A bundle covering only *one* TCT
     skips the extra nesting entirely (no per-property title, no second
     collapsible level) — there's nothing to disambiguate between when
     there's only one property, so the outer Appraisal Documents section
     alone is enough. Inside each property's list: every
     `APPRAISAL_DOC_META` entry, rendered read-only via the same
     `ReadOnlyRequirementDocRow` component `credit-investigation-view.tsx`
     uses for its own Document Checklist (status chip, reviewer note,
     filename, "View" button opening `doc.fileUrl`). This is the *only*
     place an Appraiser can see these documents at all —
     `AppraisalTctTable`'s own per-row document expansion lives on the
     Officer's Collateral titles table instead, not duplicated here.

     (An earlier version made this always collapsible regardless of fee
     status, closed by default from the very first load — no
     `docsCollapsible` gate, no auto-collapse effect. That was tried and
     reverted twice in each direction; the fee-gated version above is the
     current, confirmed behavior.)
  4. Either `AppraiserAssignmentCard` (the report fill-in form, once
     `feeSettled`) or a plain locked message ("The Appraisal Fee must be
     settled before the report form for this property unlocks.") when
     it isn't.

  "Advise Client"/"Simulate: Payment Received" remain **list-page-only**
  actions, not duplicated on this detail page — those only make sense
  once the whole batch is already `approved`, a state better surfaced on
  the list where every bundle's fee/report status is visible at a glance,
  and they have no natural "which bundle" framing the way the fee
  decision itself does.
- **Appraisal - Approver Fee** (`/admin/appraisal-fee-approval`,
  `appraisal-fee-approval-view.tsx`) — nav label reworded from "Appraisal
  Fee Approval" to lead with "Appraisal" and name the role ("Approver")
  before what they're approving ("Fee"), matching the sibling "Appraisal -
  Approver Report" item below and the dropdown's own move from "Approval"
  to "Request." **"Fee Approvals"** — a **list page** now, not a single
  flat page (see "Appraisal Fee Approver" under "Approval-role screens"
  above for the full list → detail split). Shows one table row whenever
  `review.appraisal.feeApprovalStatus === 'pending-approval'`; clicking
  it navigates to `/admin/appraisal-fee-approval/[bundleId]`
  (`appraisal-fee-approval-bundle-view.tsx`, a fixed `'current'`
  placeholder segment, not a real ID), which lists every bundle's fee
  decision (or "No fee needed") plus a running total, with single
  **Approve/Decline** buttons for the whole batch calling
  `approveAppraisalFees()` (`feeApprovalStatus: 'approved'`) /
  `declineAppraisalFees(reason)` (sets `feeApprovalStatus: 'declined'`
  and `feeDeclineReason` to the typed reason — every bundle's fee
  decision is left exactly as submitted, not reset, so the appraiser
  revises rather than re-typing from scratch; see "Appraisal Fee" above)
  — not a single flat-amount approval like CI Fee Approval's shape used
  to be.

  **The list row always renders whenever a live application exists**
  (`hasApplication`), regardless of `feeApprovalStatus` — not gated to
  `'pending-approval'` only, so approving/declining never makes the row
  vanish into an empty-list state; only its `StatusBadge` tone/label and
  the detail page's available actions vary by status. Both the list page
  and the detail page guarantee this workspace always has one live,
  actionable **"For Approval"** request in front of the approver, with a
  single carved-out exception: **`approved` is a real terminal decision
  and never self-heals.** `declined` does — a decline immediately
  re-submits the same bundles (`submitAppraisalFeesForApproval()` right
  after `declineAppraisalFees(reason)`) rather than leaving the page/row
  on a dead "Declined" end until some other seed effect happens to run
  later. A dev-only **"Simulate: Reset Appraisal Fees"** page action
  (gear-icon popover, registered via `useRegisterPageActions` on both the
  list and detail views) forces `feeApprovalStatus` back to
  `'not-submitted'` (`resetAppraisalFees()`, blanking every bundle's own
  fee fields) purely to exercise that scenario on demand — each view
  re-arms it in place immediately afterward (re-populate a sample fee
  decision per bundle, then resubmit) rather than leaving either page on
  a dead "Not Submitted" end.

  Getting this right on the detail page required more than resetting
  `feeApprovalStatus` alone: `appraisal-fee-approval-bundle-view.tsx`
  keeps its own local `justApproved` state (`true` once `confirmApprove()`
  fires) purely to distinguish "you just now approved this, this visit"
  copy from "you already approved this earlier" copy — and the
  Approve/Decline buttons render on `isPending && !justApproved`, not
  `isPending` alone. A first version reset `feeApprovalStatus` back to
  `'pending-approval'` (via the Simulate action, fired without leaving
  this page) but never touched `justApproved`, which is local `useState`
  and outlives that reset — the `StatusBadge` correctly flipped to "For
  Approval" while the buttons stayed hidden and the body copy fell
  through to "No Appraisal Fees have been submitted … yet," a
  self-contradicting dead end reachable only by firing the reset action
  while already sitting on the detail page (navigating list → detail
  fresh remounts the component and never showed it, since local state
  resets to its initial `false` on mount). Fixed with a `useEffect` that
  clears `justApproved` whenever `feeApprovalStatus` is no longer
  `'approved'`, so it can never outlive the one status it exists to
  qualify.
- **Appraisal - Approver Report** (`/admin/appraisal-approver`,
  `appraisal-approver-view.tsx`) — nav label reworded from "Appraisal
  Approver" to "Appraisal - Approver Report," naming this as the report
  side of the Approver's two duties (see "Appraisal - Approver Fee" above
  for the fee side) now that both sit side by side under "Request" instead
  of a generic "Approval" grouping. "My Approvals" for the Head/Approver's
  "reviewed and noted" step. **A list page**, same list → detail split as
  its sibling "Appraisal - Approver Fee" above (an earlier pass had
  restructured this one too, then reverted it back to a single flat page
  with no report content shown at all; it has since been restructured
  again — this time to stay, since the Head/Approver reviewing a report
  they can't see defeats the point of a review step). Shows one table row
  whenever every pledged property is covered by a submitted report bundle
  and `headApprovalStatus === 'pending'` (`isPending = !!signUpData &&
  reportSubmitted && headApprovalStatus === 'pending'` — the same
  `reportSubmitted` computation `appraisal-view.tsx` uses to unlock its own
  Head Approval card, duplicated here rather than shared since the two
  files don't currently import from each other); clicking it navigates to
  `/admin/appraisal-approver/[bundleId]`
  (`appraisal-approver-bundle-view.tsx`, a fixed `'current'` placeholder
  segment, not a real ID, same convention as
  `appraisal-fee-approval-bundle-view.tsx` — there's no real
  multi-application backend, so there's no real request ID to route on).

  The detail page's header card (applicant, `StatusBadge`, FactChip strip
  for Properties/Appraiser/Requested On) matches the same summary-card
  shape every other detail page here uses. Below it, **every report
  bundle in the request renders its own full Appraisal Report**, reusing
  `AppraisalReportView` (`appraisal-report-view.tsx`) — the same read-only
  summary component the Appraisal Officer's own "View Report" dialog uses
  on `appraisal-view.tsx` (see "Appraisal Report (per bundle)" above) —
  one per bundle, labeled with that bundle's own Appraisal No. only when
  the request spans more than one (a single-bundle request, the common
  case in this prototype, has nothing to disambiguate). This is the reason
  the restructure exists: the flat version this replaced showed only the
  applicant summary, with no way to see what the appraiser actually
  submitted before approving.

  An earlier pass of this same restructure reused `AppraiserAssignmentCard`
  directly instead — the Appraiser's own *editable* form, which already
  locks itself read-only once a report is submitted
  (`locked = headApprovalStatus !== 'pending' || !!report.uploadedAt`), so
  it seemed like it needed no separate read-only variant. In practice a
  disabled form reads as broken on a review page — bare `TextField`s with
  no section styling, and (see "Land Title Fields" below) a "Choose a
  photo" dropzone shell sitting around each Collateral Photo instead of an
  actual photo view. `AppraisalReportView` was built for exactly this
  read-only case already (label/value `Field` pairs grouped under
  `SectionLabel` headings with `Divider`s between them — this app's
  standard read-only-detail shape — and a real, properly-sized Collateral
  Photo block per land title, not a cramped thumbnail, that opens the full
  photo on click via `LandTitleSummary`; see "Read-only view
  (AppraisalReportView)" above for the full visual details), so the fix
  was swapping to it rather than inventing a new component.

  Approve/Decline live in their own **"Your Decision"** card, titled the
  same way `appraisal-fee-approval-bundle-view.tsx` titles its own
  "Appraisal Fee Details" card — grouped tightly (`spacing={1.5}`, not this
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
  to decline once a decision has been made. Approve reuses the exact same
  `setAppraisal` call `head-approval-card.tsx` makes; Decline resets
  `headApprovalStatus: 'pending'` and calls
  `clearAllAppraisalBundleReports()` again — the same behavior
  `head-approval-card.tsx` itself uses (see "Head Approval" above) —
  clearing every bundle's submitted report/file so each assigned appraiser
  resubmits. Since `clearAllAppraisalBundleReports()` wipes
  `report.uploadedAt`, `AppraisalReportView` returns `null` for a bundle
  the instant a decline is confirmed (it only ever renders a bundle with a
  submitted report) — the report card disappears from this page in place,
  no navigation away, until the appraiser resubmits from their own page.

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
