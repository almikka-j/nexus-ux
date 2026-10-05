# Appraisal (Step 5 · Officer workspace)

> **Maintenance rule:** update this file whenever `appraisal-view.tsx` or its
> supporting files (`appraisal/appraisal-tct-table.tsx`,
> `appraisal/assigned-appraiser-card.tsx`,
> `appraisal/appraisal-report-view.tsx` (rendered inline by
> `AssignedAppraiserCard`), `appraisal/appraisal-bundle-status.ts`,
> `appraisal/head-approval-card.tsx`, `appraisal/pass-fail-card.tsx`,
> `appraisal/sample-appraisal-report.ts`) change.
> Companion to `docs/230-project-overview.md`, `docs/100-credit-investigation.md`
> (the step immediately before this one in the pipeline), and
> `docs/225-admin-design-system.md` (the admin design system — `adminCardSx`
> cards, nested `CollapsibleSection` / `CollapsibleSectionBadge`, the §5/§6
> modal patterns for the Request Document and Assign Appraiser dialogs, and
> the §10 decision-gate pattern for Pass/Fail). The other
> Appraisal surfaces have their own files, all nested alongside this one
> under the same "Request" nav dropdown:
> `docs/170-request-appraiser.md` (the Appraiser's own workspace — fee request,
> report form, Advise Client / Payment Received),
> `docs/180-request-appraisal-request.md` (the read-only status list),
> `docs/190-request-appraisal-fee-approval.md` (the Fee Approver's screens),
> `docs/200-request-appraisal-report-approval.md` (the Report Approver's
> screens), `docs/150-request-credit-investigation-fee-approval.md` (CI Fee
> Approval), and `docs/210-request-payments.md` (once the Appraisal Fee batch is
> approved, `feePayment` and the actual "record payment / mark as paid"
> action live entirely on that page, not here or on
> `AssignedAppraiserCard`).
>
> **Fee is proposed per bundle, submitted as one batch — but requesting it
> is the Appraiser's job, not the Officer's.** The Officer only assigns an
> appraiser to each pledged property on **this** page — no fee decision is
> made here at all. The fee UI (Yes/No + amount/description/remarks per
> bundle) lives entirely on `/admin/appraisal-appraiser`
> (`appraisal-appraiser-view.tsx` and its per-bundle detail page) — it's
> the Appraiser who requests the fee, since they're the one who needs it
> paid before they can do the on-site work the fee covers. Each bundle
> (one appraiser assignment) submits, is approved/declined, and is paid
> **independently** of every other bundle on the same application — fee
> approval used to be one whole-application batch status shared by every
> bundle, but moved to one status per bundle (see
> `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`),
> so the Head/Approver reviews and decides each bundle's fee on its own,
> not the whole request in one action. There is no standalone
> `AppraisalFeeCard` component any more — its contents were dissolved into
> the Appraiser's own pages directly. See `docs/170-request-appraiser.md`
> for the full model
> (`AppraisalReportBundle.feeApprovalStatus`/`feeNeeded`/`feeAmount`/
> `feeDescription`/`feeRemarks`).
>
> Report creation/upload is *also* entirely the Appraiser's own workflow,
> living on the same `/admin/appraisal-appraiser` page
> (`AppraiserAssignmentCard`) — **this (Officer) page never renders that
> editable form nor the fee-request card.** Once a bundle's report is
> submitted, `AssignedAppraiserCard` shows that bundle's read-only
> `AppraisalReportView` **inline** — a collapsible panel under the bundle's
> row, expanded by default. There is no "View Report" button or `Dialog`.
> See "Assigned Appraiser" below and "Appraisal Report (per bundle)" in
> `docs/170-request-appraiser.md`. (For how this reached the inline panel,
> see `## History`.)
>
> **A submitted report goes straight to Head Approval — there is no
> Appraisal Officer review step in between.** The full chain is Appraiser
> → Head Approver → Credit Scoring. Once every pledged property's report
> is submitted (`reportSubmitted`), `appraisal-view.tsx` renders
> `HeadApprovalCard` directly (`{reportSubmitted && <HeadApprovalCard />}`)
> — no intermediate "Review Appraisal Reports" card, no explicit
> officer-side forwarding action. See "Head Approval" below for what a Head
> decline does now, and `## History` for the reverted officer-forward step.

## What this is

"Step 5 · Appraisal" in the admin application-review pipeline
(`src/sections/admin/appraisal-view.tsx`, rendered at
`/admin/applications/[id]/appraisal`). This is the detail workspace for the
`appraisal` step under the sidebar's queue — that nav entry and the
`ReviewStep` type value existed before this page did, deliberately scaffolded
ahead of their workspace (see `docs/230-project-overview.md`'s admin flow
section); this page is that workspace.

Pipeline position: Initial Credit Checking → Call Report → Requirement
Checklist → Credit Investigation → **Appraisal** → *(Credit Scoring exists
only as a stub page — no real workspace built yet)*. Credit Investigation's
Proceed action routes here (`paths.admin.appraisal`, see
`docs/100-credit-investigation.md`'s "Proceed application?" section); this
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
4. **Assigned Appraiser** card (`AssignedAppraiserCard`) — rendered
   whenever at least one bundle exists (`!appraisalNotApplicable &&
   reportBundles.length > 0`), regardless of fee/report state. A read-only
   "who's doing what" summary — one bordered row per bundle, TCT number(s)
   + target completion date (if set) on the left, the assigned appraiser's
   name on the right (or a muted "No appraiser assigned" for a bundle whose
   type/roster pick somehow wasn't set) — see "Assigned Appraiser" below.
   Nothing here is editable; reassigning still only happens via the
   Collateral titles table's Assign Appraiser modal.
5. **No standalone per-bundle Appraisal Report cards render on this page.**
   A submitted report is shown **inline inside `AssignedAppraiserCard`** —
   a collapsible `AppraisalReportView` panel under each reported bundle's
   row (expanded by default), no button or `Dialog` — see "Assigned
   Appraiser" below (and `## History` for the earlier standalone-card and
   `Dialog` iterations).
   **No Appraisal Fee card renders on this page at all** either — the fee
   lives entirely on the Appraiser's own pages
   (`docs/170-request-appraiser.md`).
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
re-check assignments. (The trigger was previously
`feeApprovalStatus === 'pending-approval'` — see `## History`.) The Assign
Appraiser modal (a `Dialog`) sits *outside* this
collapsed region regardless, unaffected by `tableOpen`. The "X of Y
assigned" pill and the Request Document/Add Collateral buttons stay
visible whether the table is open or collapsed, so the officer can always
glance at progress or start a new request without reopening the table.

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

This same completeness gate is what the Appraiser / Fee Approver / Report
Approver list pages' own auto-seed effects filter on when they seed a
sample bundle from still-unassigned, docs-complete `appraisalGroups`
entries — see `docs/170-request-appraiser.md`,
`docs/190-request-appraisal-fee-approval.md`, and
`docs/200-request-appraisal-report-approval.md`.

### Request Document modal

The **"Request Document"** button opens a `Dialog` (the
`docs/225-admin-design-system.md` §5/§6 modal convention — `<Dialog
fullWidth>`, a `DialogTitle`, a field stack, `DialogActions` with Cancel +
a primary) for asking the borrower for specific documents on one collateral
title:

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

**No Appraisal Fee section in this modal.** Requesting the Appraisal Fee
is the **Appraiser's** job, not the Officer's, so the fee decision lives
exclusively on `/admin/appraisal-appraiser` (see
`docs/170-request-appraiser.md`). This modal only ever collects Appraiser
type/name/target date; the confirm button stays disabled until a name is
picked, and never relabels to "Assign with Fee". (An earlier version of
this modal collected the fee here — see `## History`.)

Confirming calls `createAppraisalReportBundle(tctGroupIds, appraiserType,
appraiserName, targetCompletionDate)` — the optional 5th `fee` param is
no longer passed from here, so every new bundle starts with `feeNeeded:
null` (the factory's default) and picks up its actual fee decision later,
directly from the Appraiser's own page.

Which report path applies — `'inhouse'` or `'external'`
(`bundle.appraiserType`) — is decided exactly once here, by the Officer.
The Appraiser's own report form renders whichever one already applies and
cannot switch it (see `docs/170-request-appraiser.md`).

When `review.requirementChecklist.appraisalNotApplicable` is `true` — an
officer's manual "this application has no real-estate collateral"
declaration made on Requirement Checklist, not something derived from loan
type or any other field — this whole card is replaced by a single line,
"This application has no pledged real-estate collateral." No appraisal fee
or appraiser-assignment logic downstream depends on this flag; it only
affects what this section displays.

**No standalone "Appraisal status" card.** The current at-a-glance read of
fee status, appraiser per TCT, and report submission is
`AssignedAppraiserCard` below plus the Collateral titles table's Appraiser
column — a dedicated status card would be a third, redundant summary
surface. (A short-lived status card, and the `ProgressTracker` /
`appraisalProgressIndex` helper that backed it, have both been removed —
see `## History` and `docs/170-request-appraiser.md`.)

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
per-bundle detail pages register (see `docs/170-request-appraiser.md`),
instead of three near-copies of the same object slowly drifting apart. It
only ever fills bundles missing a report, so re-clicking after new bundles
are assigned won't clobber a report an appraiser (or this same action)
already submitted. All three are dev/testing conveniences for reaching
downstream states quickly, not user-facing officer actions.

Unlike the Appraiser page's own "Simulate: Fill Sample Report" entries
(which pass `submit: false`), this one uses `buildSampleAppraisalReport()`'s
default `submit: true` — its whole purpose is simulating a report the
appraiser has already fully submitted, so it stamps `uploadedAt` and locks
the form immediately.

Each `landTitles` entry `buildSampleAppraisalReport()` produces also
stamps a `photoFileUrl`/`photoFileName`/`photoUploadedAt` — a
`SAMPLE_COLLATERAL_PHOTO` inline SVG data URI, same
data-URI-placeholder convention `sample-application.ts` uses for its own
ID/selfie photos — so a sample-filled land title's Collateral Photo
dropzone (`ReportFileDropzone`, see `docs/170-request-appraiser.md`'s "Land
Title Fields") renders an actual photo preview once locked/read-only,
instead of the empty "Choose a photo" uploader state. This matters most on
read-only views of an already-submitted report — the Head/Approver's "My
Approvals" detail page in particular, which has no way to attach a real
photo itself and would otherwise show every sample bundle's Collateral
Photo as perpetually unset. Getting `FileThumbnail` to actually render the
image (rather than fall back to a generic file-type icon) requires a real
file extension at the tail of the URL — `FileThumbnail`'s format check
(`fileTypeByUrl`) naively does `url.split('.').pop()`, which fails on a
raw `data:image/svg+xml` URI (the closest `.` sits deep inside the
encoded markup); appending an inert `#.jpg` fragment (harmless to how the
browser resolves a `data:` URI, but present at the very end of the
string) gives that naive check a real extension to find.

`page-actions-context.tsx` keys registered actions by a stable per-caller
id and merges them (`Object.values(actionsByRegistrant).flat()`) rather
than one `useRegisterPageActions` caller's `setActions(...)` replacing
whatever another caller registered — a real bug this page surfaced back
when `AppraisalTctTable` and the old standalone `AppraisalFeeCard` briefly
co-mounted on the same page (`appraisal-view.tsx`), where the second one to
run its effect silently erased the first's entries from the popover. The
merge fix itself is still load-bearing today for `AppraisalTctTable`'s own
three entries co-existing with each other, even though the specific
two-different-cards scenario that surfaced the bug no longer occurs on this
page. It is also what lets the Appraiser pages' own simulate entries
coexist with these (see `docs/170-request-appraiser.md`).

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
**left side** of each row stacks three lines: the bundle's TCT number(s),
then `bundle.appraiserName` directly beneath it (or a muted "No appraiser
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
a single status/action element (see below); the name reads more naturally
directly under its own TCT number than floating next to an unrelated
status pill anyway. (The name previously sat on the right next to the
status pill — see `## History`.)

Nothing on this card is editable — reassigning an appraiser, or changing
the target completion date, still only happens through the Collateral
titles table's Assign Appraiser modal. This card is purely a summary
surface layered on top of the same `reportBundles` data every other card
on this page reads.

The **right side** of each row shows a status pill computed per bundle by
`getAppraisalBundleStatus(bundle, feeSettled)` from that bundle's own
`feeApprovalStatus` + `feeSettled` + that specific bundle's own
`report.uploadedAt` (in that priority order: a submitted report always
wins, overriding whatever the fee state would otherwise imply). Fee
approval is per-bundle (see
`docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`),
so this status is entirely this bundle's own — a sibling bundle on the
same application can be at a completely different stage:

- **On Process** (neutral gray pill) — this bundle's own
  `feeApprovalStatus === 'not-submitted'`. The appraiser is assigned but
  hasn't requested their fee yet.
- **For Approval** (warning/amber pill) — this bundle's own
  `feeApprovalStatus === 'pending-approval'`. The Appraiser has submitted
  this bundle's fee from their own page; waiting on the Head/Approver.
- **For Report** (info/blue pill) — this bundle's own
  `feeApprovalStatus === 'approved' && feeSettled` but this bundle's
  `report.uploadedAt` is still `null`. The fee is cleared; the appraiser
  should now be doing the on-site work and filling in/uploading the
  report.
- **`bundle.report.uploadedAt` set** → a green **"Report submitted"** pill
  plus a chevron toggle, and the full read-only `AppraisalReportView` for
  that bundle rendered **inline** — a `Collapse` panel below the row,
  **expanded by default**, that the whole row header toggles. Each
  reported bundle's collapsed/expanded state is tracked in a local
  `Set<string>`. No "View Report" button, no `Dialog`, no scroll target —
  the reviewer sees the report without a click.

`AppraisalReportView` itself — its letterhead/section/"At a Glance"
structure, per-title Collateral Photo blocks, and collapsible sections —
is documented in `docs/170-request-appraiser.md`, since the Appraiser owns the
form that produces it. This page renders it inside the inline `Collapse`
panel described above.

**Status derivation is shared, not local.** `getAppraisalBundleStatus()`
(`src/sections/admin/appraisal/appraisal-bundle-status.ts`) is the single
source of truth for a bundle's On Process / For Approval / For Report /
Reported stage. Its call sites — this card, `appraisal-appraiser-view.tsx`'s
table, and the Appraisal - Request list (see
`docs/180-request-appraisal-request.md`) — each decide for themselves how to
render the `'reported'` case: this card shows a "Report submitted" pill +
the inline `AppraisalReportView` panel; `appraisal-appraiser-view.tsx`'s
table shows a plain "Reported" pill.

## Head Approval

`HeadApprovalCard` (`src/sections/admin/appraisal/head-approval-card.tsx`)
is rendered by `appraisal-view.tsx` only when `reportSubmitted` —
`{reportSubmitted && <HeadApprovalCard />}` — i.e. every pledged
property's report is submitted. There is **no intermediate officer-review
step**; the card renders directly off `reportSubmitted` alone. Otherwise
nothing renders in its place. (A short-lived officer-forward step, and a
locked dashed placeholder, once sat in this slot — see `## History`.)

The Head/Approver's own dedicated screens at `/admin/appraisal-approver`
render the same decision against the same fields, alongside the actual
submitted reports — see `docs/200-request-appraisal-report-approval.md`.

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
`appraisal-approver-bundle-view.tsx`) — a small italic disclaimer line
under the buttons ("There's no real Head login in this prototype…")
makes the simulated nature explicit, same wording
`appraisal-approver-bundle-view.tsx` already used:

- **"Simulate: Head Approves"** — sets `headApprovalStatus: 'approved'`
  directly.
- **"Simulate: Head Declines"** — `ConfirmDialog` requiring a typed reason;
  confirming resets `headApprovalStatus: 'pending'`, records the reason in
  `headApprovalDeclineReason`, **and calls `clearAllAppraisalBundleReports()`**
  — wiping every bundle's `uploadedAt`/`fileName`/`fileUrl` back to `null`
  so every assigned appraiser (in-house or external) has to resubmit from
  scratch, even when the decline reason had nothing to do with the report
  contents themselves. Each bundle's `appraiserType` and TCT membership are
  preserved — only report contents are cleared. (A short-lived variant
  reset a forward-to-Head boolean instead of clearing reports — see
  `## History`.)

While `headApprovalStatus === 'pending'` and a decline reason exists from a
previous round, the card shows "Last decline reason: …" beneath the
"Awaiting Head Approval" status line, so whoever revisits this card (the
Officer here, or the Head/Approver on `appraisal-approver-bundle-view.tsx`,
which shows the same field) can see why the last round was declined.

## Decision Gate

**Pass/Fail** (the Officer's terminal decision on this page).

Rendered by `appraisal-view.tsx` only once `headApprovalStatus === 'approved'`
**and** a report is still submitted (`headApproved && reportSubmitted`) —
the `reportSubmitted` half is a belt-and-suspenders re-lock so Pass/Fail
can't stay open if a report is ever cleared after approval through some
other path. Otherwise nothing renders in its place; the card above it
(`HeadApprovalCard`) already makes clear what's still pending. (A locked
dashed placeholder that used to sit here was removed — see `## History`.)

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

`application-list-view.tsx` now sets the live application's row
`isActionable: true` for **every** pipeline step, with no exception — an
admin can reach this page (or any other step's page) directly from the
queue at any time, regardless of where the live application actually is.
Financial Evaluation was the last step-specific exception; it now has its
own built workspace (`docs/120-financial-evaluation.md`) and is actionable
too. Sample (demo) rows are always non-actionable.

## Fabricated Claims — Real vs. Simulated

- **`APPRAISER_ROSTER`** is a fixed sample list of names/companies, not a
  real appraiser directory looked up from any system.
- **Head Approval / Fee Approval** — no real second-officer or Head login
  in this prototype; approving stamps a fixed dummy name. The Officer's
  `HeadApprovalCard` decline resets `headApprovalStatus` back to `'pending'`
  (never forward to a `'declined'` value that exists only at the type
  level).
- **In-house Appraisal Report** — no real photo capture or lot-plotting;
  each card's dashed note flags that as future integration work.
- **Sendit/Odoo integrations** (payment link, "advise client to settle")
  are simulated button clicks, triggered from the Appraiser page, not real
  service calls.
- **Pass/Fail** is a manual officer judgment call — the app has no
  automated appraised-value-vs-loan-amount comparison anywhere.
- All appraisal state (bundles, fee status, report contents, Head-approval
  status, Pass/Fail) is **local state persisted to `localStorage` only** —
  no backend.

## Non-Goals / Open Items

- **Credit Scoring remains unbuilt** beyond its existing stub page — Pass
  routes there, but there is no real Credit Scoring workspace yet.
- **`targetCompletionDate` is informational only** — nothing reads it for
  reminders, overdue flags, or sorting; it is simply stored and never
  surfaced elsewhere on this page.
- **No merging two existing report bundles** — if a selection spans TCTs
  from two different bundles, the Collateral titles table blocks the
  action rather than combining them.
- **No role/permission system** — `AdminUser` has no role field, so nothing
  mechanically gates who can open the Appraiser/Approver screens
  documented in the sibling files; the personal "my workspace" framing
  there is a UI/workflow choice, not access control.

## History

### 2026-09-07

- **Submitted report shown inline.** `AssignedAppraiserCard` renders a
  submitted bundle's `AppraisalReportView` in a `Collapse` panel
  (expanded by default) instead of behind a "View Report" button +
  `Dialog`.

### Date not confirmed

- **Per-bundle Appraisal Report cards removed.** A loop on
  `appraisal-view.tsx` once rendered one card per bundle between Assigned
  Appraiser and Head Approval — a completed read-only `AppraisalReportView`
  or a locked "waiting for appraiser" placeholder. It was deleted; the
  report moved to a `Dialog` opened from `AssignedAppraiserCard`, then
  (2026-09-07) to the inline panel above.
- **Officer-forward-to-Head step added, then reverted.** An officer-review
  card gated on `reportSubmitted` plus a forward-to-Head boolean briefly
  sat between Appraiser submission and Head Approval, requiring the Officer
  to explicitly forward the batch. The card, its boolean field, and the
  matching Head-decline behaviour (resetting that boolean instead of
  clearing reports) were all fully reverted — `HeadApprovalCard` renders
  directly off `reportSubmitted`, and Head decline clears every bundle's
  report via `clearAllAppraisalBundleReports()`.
- **Locked dashed placeholders removed.** Both Head Approval and the
  Pass/Fail slot once showed a locked "unlock once the reports below are
  submitted" placeholder while gated. Both were removed once per-bundle
  report cards stopped rendering inline — "the reports below" no longer
  described anything on the page.
- **Standalone "Appraisal status" card removed**, along with the shared
  `ProgressTracker` / `appraisalProgressIndex`
  (`appraisal/progress-tracker.tsx`) and a per-assignment progress display
  on `/admin/appraisal-appraiser` — redundant with `AssignedAppraiserCard`
  and the Collateral titles table's Appraiser column.
- **Assign Appraiser modal no longer collects the fee.** It once showed a
  "Does this application need an Appraisal fee?" section
  (`FeeNeededOption` + amount/description/remarks) and an "Assign with Fee"
  confirm label; both were removed — requesting the Appraisal Fee is the
  Appraiser's job now (`/admin/appraisal-appraiser`).
- **Assigned-appraiser name moved to the left column** of each
  `AssignedAppraiserCard` row (it previously sat on the right next to the
  status pill) so the right side could carry a report-submission *button*.
- **Collateral-titles table auto-collapse trigger changed** from
  `feeApprovalStatus === 'pending-approval'` to `allGroupsAssigned` —
  fee submission moved to the Appraiser's own page and no longer fired at
  the moment that matters here (every property having an appraiser).
- **Live application's queue row became unconditionally actionable** for
  every step; Financial Evaluation was the last exception and now has its
  own workspace.
