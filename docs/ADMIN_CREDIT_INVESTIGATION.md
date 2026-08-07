# Admin — Credit Investigation

> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-docs.ts`,
> `credit-investigation-risk.ts`, `credit-investigation-transcript.ts`,
> `credit-investigation/ci-fee-card.tsx`, `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/credit-investigation-doc-row.tsx`) change. Companion to
> `PROJECT_OVERVIEW.md` and `docs/ADMIN_REQUIREMENT_CHECKLIST.md` (the step
> immediately before this one in the pipeline).

## What this is

"Step 4 · Credit Investigation" in the admin application-review pipeline
(`src/sections/admin/credit-investigation-view.tsx`, rendered at
`/admin/applications/[id]/credit-investigation`). This is the detail
workspace for the `creditInvestigation` step under the sidebar's
"Comprehensive Credit Checking" section — that nav entry and the
`ReviewStep` type value existed before this page did, deliberately scaffolded
ahead of their workspace (see `PROJECT_OVERVIEW.md`'s admin flow section);
this page is that workspace.

Pipeline position: Initial Credit Checking → Call Report → Requirement
Checklist → **Credit Investigation** → *(next step not yet built — Appraisal
and Financial Evaluation remain non-actionable placeholders)*. The live
application's Credit Investigation queue row is always actionable, same as
every other built step in this pipeline (Initial Credit Checking through
Requirement Checklist) — an admin can inspect/act on the live application at
any step at will, regardless of whether Requirement Checklist has been
endorsed yet.

There is no real backend and no real AI — every document's status, every
"AI Summary"/recommendation, and the transcript auto-fill are deterministic,
canned content, not a call to any external service, OCR, or LLM.

## Page order

The page `Container` is `maxWidth="lg"` (widened from `"md"`) so the
collapsible `ApplicationDetailsCard`'s header (full name, email/mobile
beneath, and the Officer pill + App No. pill grouped on the right) has room
to breathe without wrapping awkwardly.

1. `ApplicationReviewHeader` (`step="Step 4 · Credit Investigation"`,
   `reviewStep="creditInvestigation"`, `hideApplicationCard`).
2. `ApplicationDetailsCard` (collapsible, with Credit Checking Result and
   Call Report actions, `officerNotesProcess="Credit Investigation"`).
3. **Document Checklist** card. Collapsible; starts collapsed on open
   whenever `ciFeeStatus` is already `'pending-approval'`/`'approved'` (e.g.
   reopening an application that reached that stage in an earlier session),
   and also auto-collapses live the moment `ciFeeStatus` transitions to
   either status while the page is mounted (re-fires on `'approved'` even if
   the officer had manually reopened it while waiting) — so it doesn't fight
   the officer's own toggle otherwise.
4. **AI review, summary & recommendation** card. Also collapsible; same
   start-collapsed-on-open plus live-transition behavior as Document
   Checklist above, gated on `ciFeeStatus === 'approved'`
   (`credit-investigation-view.tsx`).
5. **CI Fee** card.
6. **CI Report** card (visible once CI Fee is approved; otherwise a locked
   placeholder).
7. **Proceed application?** decision card.
8. Dialogs mounted outside the stack: Disapprove reason, Return to AMD
   reason, `RequestDocumentsDrawer`.

## Fill/Remove Sample Data

Registered into the floating settings popover (bottom-right gear icon → Page
actions) via `useRegisterPageActions`, same convention as Initial Credit
Checking's/Call Report's/Requirement Checklist's own sample-data toggle.
Label and behavior are driven by `isSampleFilled` (`ciFeeStatus !==
'not-requested'`):

- **Fill with Sample Data** (shown while `!isSampleFilled`) sets CI Fee to
  `approved` with a sample amount (₱2,500, "Site visit + verification fee")
  and fills every CI Report field via `buildTranscriptAutoFill` (the same
  deterministic auto-fill `CiReportCard`'s transcript upload uses), plus a
  synthetic `transcriptFileName`/`transcriptUploadedAt` so the report reads
  as already reviewed.
- **Remove Sample Data** (shown while `isSampleFilled`) resets `ciFeeStatus`
  to `not-requested`, clears the CI Fee amount/description/remarks, and
  blanks every CI Report field (including the transcript filename), scoped
  to exactly what Fill sets — not a full `resetReview()`, which would also
  wipe unrelated steps (Reconsideration, Call Report, Requirement Checklist)
  this button has no business touching.

This button only fills/clears what this page actually owns — **CI Fee** and
**CI Report**. The Document Checklist above is read-only here (see its own
section below); it's collected one step earlier, in Requirement Checklist,
so an officer who also wants that section pre-filled uses Requirement
Checklist's own Fill Sample Data action first.

## Document Checklist

One card, documents grouped into 5 subgroups
(`credit-investigation-docs.ts`'s `CI_SUBGROUP_ORDER`/`CI_SUBGROUP_LABELS`),
each rendered with the shared `RequirementDocRow` component, sorted
outstanding-first within each subgroup:

- **Principal/Consumer**: Primary ID (required). Once filled (via Upload or
  "Fill with Sample Data"), its AI note dynamically appends the applicant's
  actual `personalInfo.idType`/`idNumber` from onboarding (e.g. "ID on file:
  PhilSys / National ID (1234-5678-9012)."); this is the only row of the four
  "Primary ID"-labeled rows with per-application ID-type data to draw from —
  Spouse/Mortgagor/Borrowers have no modeled ID type field, so their notes
  stay generic.
- **Spouse**: Primary ID (not required), Secondary ID (not required).
- **Mortgagor**: Primary IDs of Mortgagor with 3 specimen signature (not
  required).
- **Borrowers**: Primary IDs Borrowers with 3 specimen signature (required).
- **General Requirements**: Bank Authorization Form – signed (required),
  Registration of Business Name (not required), Proof of Billing (required),
  Additional/Other Documents (not required). Shown unconditionally for every
  applicant regardless of `application.loanType`.

Plus two groups outside the fixed metadata:

- **Bureau & Verification Checks** — CIC, CMAP, NFIS/BAP. **View-only.**
  These are required earlier, during Requirement Checklist
  (`cicCheck`/`cmapCheck`/`nfisBapCheck`); this page reads
  `review.requirementChecklist.documents` directly by key and renders each
  with `ReadOnlyRequirementDocRow` (`credit-investigation-doc-row.tsx`) — a
  status chip and a **View** button opening the existing `fileUrl`, no
  Upload/Remove/Mark-as-reviewed controls. This page never maintains
  independent state for these three documents. Once a doc is non-missing,
  the row also shows the same AI-note sentence as `RequirementDocRow`'s
  ("The {label} for {applicantName} was reviewed. {doc.aiNote}") — e.g.
  "The CIC Check for Maria Reyes Santos was reviewed. No adverse records
  found." — previously this read-only row silently dropped `aiNote`
  entirely.
- **Additional Documents** (only rendered once at least one exists) — ad
  hoc rows the officer adds via **"+ Add document"**, which toggles to a
  compact inline form in place of the button (not a modal — same
  expand-in-place convention as Requirement Checklist's "Add Property"
  row). It's a tinted sub-card (`borderRadius: '13px'`, `p: 2`, `bgcolor:
  '#F9FAFC'`, `border: 1px solid #EEF0F5`, no `boxShadow` — a sub-section,
  not a top-level card) rather than plain white, matching the borrower
  sign-up flow's own conditional "Business information" sub-box
  (`preliminary-application-view.tsx`) and the same light-gray sub-card
  convention used for CI Fee's request-amount box and CI Report's
  transcript-upload row elsewhere in this app — so the form visually stands
  apart from the white document rows around it while it's open. Its own
  title ("Add document", `14px` bold) and subtitle ("Attach a document that
  isn't part of the standard checklist above.", `12.5px` gray) sit above a
  tight `spacing={1.5}` field stack — deliberately smaller type/spacing
  than a full top-level card header (`adminCardSx`'s `16px`/`13.5px`, an
  earlier version of this form used and which read as oversized for a
  two-field form squeezed between compact document rows). Document label
  and File sit side by side on one row (`direction: { xs: 'column', sm:
  'row' }`, each `flex: 1` — stacked only on `xs`) instead of two full-width
  rows stacked vertically, since neither field needs the full card width on
  its own. Each field still has its own bold static label above it
  (`fontSize: 12, fontWeight: 700, color: '#14172A', mb: 0.5`) rather than
  relying on `TextField`'s floating label. The `TextField` and
  `AddDocFileDropzone` stay white (`bgcolor:
  'common.white'`) for contrast against the gray card, and **Cancel**/**Add**
  are `size="small"` to match the tighter footprint.

  Inside that shell, it requires a label (`TextField`) and a real file,
  attached via `AddDocFileDropzone` — a local component mirroring
  `preliminary-application-view.tsx`'s private `CompactDropzone` (the same
  dashed single-line dropzone behind the borrower sign-up flow's "Upload
  your business document"): a click-or-drag dashed box reading "Choose a
  file — document to attach" while empty, swapping to a `FileThumbnail` +
  filename + remove (×) `IconButton` once a file is picked. Same
  `accept: { 'image/*': [], 'application/pdf': [] }` via `react-dropzone`
  as `CompactDropzone`. Each field has its own bold static label above it
  (`fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75`) rather than
  relying on `TextField`'s floating label, and the two field groups sit at
  `spacing={2.5}` — the same label treatment and spacing rhythm
  `EmploymentBusinessCard`'s `RadioRow` fields use. **Add** stays disabled
  until both the label and file are present; **Cancel** collapses the form
  back to the trigger button and clears the draft. `addCreditInvestigationDocument`
  (`src/auth/admin-context.tsx`) takes the label, the officer's name, and the
  picked file's `{ fileName, fileUrl }` (an object URL, same
  `URL.createObjectURL` convention as every other upload in this app), and
  creates a `CreditInvestigationDoc` with `isCustom: true`, that real
  `fileName`/`fileUrl`, `status: 'verified'`, `uploadedAt: now`,
  `uploadedBy: officerName`, and `aiNote: 'Reviewed, no issues found.'` — it
  previously hardcoded a canned `sample-local-pdf.pdf` regardless of officer
  intent, so a document could read as "on file" without the officer ever
  actually attaching anything; the form now makes a real attachment part of
  adding the row instead of a separate step after. Upload (to replace the
  file) and Delete (via the row's "…" menu) remain available afterward, same
  as any other non-missing row.

The page action **"Fill with Sample Data"/"Remove Sample Data"** (its label
toggles based on whether every fixed document is received) only fills or
clears the fixed metadata document list — officer-added custom documents are
always preserved untouched by both directions of that toggle. This is a
deliberate contract, not an oversight: a bug where "Remove Sample Data"
destructively deleted custom documents was caught and fixed earlier in this
feature's development, so any future change to
`handleFillSampleData`/`handleClearSampleData` in
`credit-investigation-view.tsx` must keep skipping `doc.isCustom` documents.

**Request Documents** opens `RequestDocumentsDrawer`, reusing the existing
component but scoped to this page's own
`review.creditInvestigation.outreachMessages` — independent history from
Requirement Checklist's.

## AI review, summary & recommendation

`buildCreditInvestigationSummary()` (`credit-investigation-risk.ts`) is a
pure function, recomputed at render time, never stored — same pattern as
`requirement-checklist-risk.ts`. It counts **only the fixed (non-custom)
document list's** verified/needs-review/missing documents — deliberately
excluding officer-added custom documents, so this card's completeness math
always agrees with `allFixedReceived` in `credit-investigation-view.tsx`
(the same fixed-list-only check that drives the "Fill with Sample
Data"/"Remove Sample Data" page action label) — and factors in whether the
3 Bureau & Verification checks are complete (read from Requirement
Checklist's state, passed in as a plain boolean) to decide the risk level
(`'good' | 'watch' | 'high'`) and recommendation text.

Risk level rules: `'high'` only when a required fixed document is missing;
`'watch'` when there's no missing required fixed document but either a
fixed document needs review or the bureau checks are incomplete (since this
page can only read those bureau checks, never fix them — Requirement
Checklist owns that gate); `'good'` only when every fixed document is
verified and the bureau checks are complete. When the bureau-check gap is
the *only* outstanding item, the recommendation explicitly points the
officer back to Requirement Checklist rather than implying there's an
action available on this page.

## CI Fee

`CiFeeCard` has no separate "CI Fee" title row — every `STATUS_COPY` title
already leads with "CI Fee" context ("CI Fee not yet requested", "CI Fee
awaiting approval", "CI Fee approved", "No CI Fee for this application"), so
a standalone title above it was a redundant near-empty line. Instead the
card opens directly with a **full-width tinted status banner** (`p: 2`,
`borderRadius: '12px'`, tone `bg`) — the status icon (`copy.icon`, e.g.
wallet/hourglass/check/forbidden-circle) beside the title + body
(`STATUS_COPY[ciFeeStatus]`), with the current action(s) right-aligned on
the same row on `sm`+ screens (stacks below on `xs`): **"Yes, Request CI
Fee"** + **"No CI Fee"** while `not-requested`; **"Actually, this has a CI
Fee"** while `not-applicable`; no actions while `pending-approval`/`approved`
(those states have no self-serve action, so the banner is status-only). This
gives the banner the same visual weight as the "AI review, summary &
recommendation" card's own tinted recommendation banner directly above it on
the page, instead of a thin single-line status row that read as an
afterthought next to it.

Each status maps to a `SemanticTone` — matching the same
status→tone convention `RequirementDocRow` already uses for document status
chips (`missing` → neutral, `needs-review` → warning, `verified` → success):
`not-requested` → **neutral** (nothing has happened yet, same as a missing
document), `pending-approval` → **warning**, `approved` → **success**,
`not-applicable` → **info** (a deliberate "this doesn't apply" marker,
distinct from neutral's "nothing yet") — resolved through the shared
`TONE_COLORS` palette (`admin-tokens.ts`) rather than the banner
hard-coding its own hex per status. While `pending-approval`/`approved`,
the request-amount detail box below (`REQUEST AMOUNT` + a navy
`#1C2A6E`-filled money-icon badge, side-by-side with Description/Remarks on
`sm`+, stacked with a divider on `xs`) sits directly beneath the banner with
tight spacing, reading as one connected "here's the fee, and here's its
status" block rather than disconnected pieces. The "No CI Fee"/"Actually,
this has a CI Fee" buttons use the shared `outlinedNavyButtonSx`, the same
palette/button-style convention used everywhere else in the admin app
instead of each card picking its own near-identical values.

`review.creditInvestigation.ciFeeStatus: 'not-requested' | 'pending-approval'
| 'approved' | 'not-applicable'`. On `'not-requested'`, the officer picks
**"Yes, Request CI Fee"** (opens a form for Request Amount, Request Amount
Description, and Remarks, then moves the status to `'pending-approval'`) or
**"No CI Fee"** (moves straight to `'not-applicable'`). There is no separate
approver role or login in this prototype, so approval/decline can't be
self-served by the same officer who made the request — while `ciFeeStatus
=== 'pending-approval'`, the page registers two actions (via
`useRegisterPageActions`) into the floating settings popover (bottom-right
gear icon → Page actions), same convention as "Force Clean/Negative Bureau
Finding" elsewhere in this app:

- **"Simulate: Another Officer Approves CI Fee"** — sets
  `ciFeeStatus: 'approved'` directly, no confirmation dialog.
- **"Simulate: Another Officer Declines CI Fee"** — opens a `ConfirmDialog`
  ("Reason for declining CI Fee") requiring a typed reason before its
  Confirm button enables (same confirm-before-mutating,
  reason-required convention as Disapprove/Return to AMD elsewhere on this
  page); confirming resets `ciFeeStatus: 'not-requested'`, clears the
  amount/description/remarks fields, and records the typed reason in
  `ciFeeDeclineReason` — the same re-entry point as an application that
  never requested a fee, so the officer can re-request from the CI Fee card
  with corrected terms.

The CI Report card is locked (shown as a dashed placeholder) until
`ciFeeStatus === 'approved'` or `'not-applicable'`.

**Dedicated CI Fee Approval screen** (`/admin/ci-fee-approval`,
`src/sections/admin/ci-fee-approval-view.tsx`) offers a second, fuller-review
way to trigger the same two outcomes — a standalone top-level nav item
(placed last in `adminNavData`, `config-nav-admin.tsx`, flat/no `children`
like "Dashboard") rather than a page action buried in the settings popover.
It reads the same single live `review.creditInvestigation` state and, while
`ciFeeStatus === 'pending-approval'`, shows the applicant identity, the same
request amount/description/remarks detail box as `ci-fee-card.tsx`, and the
same **"Approve CI Fee"** / **"Decline CI Fee"** pair, each behind its own
`ConfirmDialog` — Approve's ("Approve CI Fee?") just names the
applicant/amount; Decline's ("Reason for declining") requires the same typed
reason as the inline page action above. An officer can act from whichever
surface they're already on; both write the same
`review.creditInvestigation` fields.

`ciFeeDeclineReason: string` on `CreditInvestigation` (`admin-context.tsx`)
follows the same per-decision-reason convention as
`decisionReason`/`returnToAmdReason`.

Either action — instead of redirecting away — flips a local `justApproved`
or `justDeclined` flag that swaps the whole screen to a one-time
completed/outcome state (shared `OutcomeScreen` component, local to
`ci-fee-approval-view.tsx`): centered icon, heading, body copy naming the
applicant, a **"Continue to Credit Investigation"** primary action, and a
**"Back to Application List"** secondary one — green check icon for
approved, amber X icon for declined. This mirrors Requirement Checklist's
local `SuccessState` component (`requirement-checklist-view.tsx`, shown on
`endorsed`) so completing this screen reads the same way as completing any
other step/decision in the pipeline, rather than a card quietly changing
its own text in place. Both flags are deliberately separate from the
persisted `ciFeeStatus`: that status can independently become `'approved'`
via the inline page action or from an earlier session, and a decline
resets to `'not-requested'` — indistinguishable from an application that
never requested a fee at all — so treating every render of either
resulting status as a fresh completion would be wrong. A stale `'approved'`
status (both flags still `false`) instead falls through to the plain
"already approved" info card described below; a stale `'not-requested'`
status falls through to that same info card with its own copy.

For any other `ciFeeStatus` (and no fresh `justApproved` completion), it
shows a non-actionable empty state with a link back to Credit
Investigation. If there is no live application at all in this session
(`!signUpData` — e.g. fresh browser state, no borrower has gone through
onboarding yet), it shows a distinct "No application in progress" empty
state with a **"Go to Application List"** button, rather than rendering
nothing — unlike `credit-investigation-view.tsx`'s
`if (!signUpData) return null;` guard, which is fine there since every
other section on that page genuinely needs applicant data to render
anything at all; this screen has a real "nothing to show yet" state worth
surfacing (with a way forward) instead of going blank. The existing page
action on Credit Investigation is unchanged and still works independently
— this screen is additive, not a replacement.

**Styled as a real per-step queue/list**, matching every other queue in
this app (`application-list-view.tsx`'s per-step filtered list for
Initial Credit Checking, Call Report, Requirement Checklist, Credit
Investigation) — one row per application currently relevant to this
screen, not a single isolated card. Reuses the exact row shape from that
page: a `QueueRow` local component (icon box, name + optional **"Sample"**
badge, "App No. X" subtext, a `StatusBadge tone="warning" label="Pending
approval"`).

This required a genuine data-model addition, not just a restyle: unlike
`ReviewStep` (a real per-application concept — every `SampleApplicationEntry`
already carries its own `step`), `ciFeeStatus` lives on a single flat
`review.creditInvestigation` object in `AdminContext` — there is exactly
one `ciFeeStatus` in the whole app, belonging to the one live application.
`SampleApplicationEntry` had no CI-fee-related fields at all, so nothing
else in the data model could ever produce a second "pending" row. Fixed by
adding an optional `ciFee?: { status: 'pending-approval'; amount: string;
amountDescription: string; remarks?: string }` field to
`SampleApplicationEntry` (`sample-applications.ts`) and setting it on two
existing entries (Ramil Dela Cruz, Cristina Villanueva) — same read-only
convention as every other sample in this app (no working Approve/Decline;
these rows are non-actionable filler, no click handler, no navigation).

The list combines:
- **The live application's row — only when actually pending**
  (`ciFeeStatus === 'pending-approval'`). Unlike `application-list-view.tsx`
  (where the live row always appears on every step, non-actionable where
  irrelevant), this row is omitted entirely otherwise, since most
  `ciFeeStatus` values aren't meaningfully "at this queue" the way an
  unstarted pipeline step still is.
- **Sample rows** — every `SAMPLE_APPLICATIONS` entry with `ciFee` set.

If neither the live row nor any sample row applies, an empty-state card
("No CI Fee pending approval", `NOT_PENDING_COPY[ciFeeStatus]`) renders
instead of an empty list, with a link back to Credit Investigation.

**The live application's detail card + Approve/Decline actions render
directly below the list whenever its row is present — no click or expand
needed.** This was a deliberate simplicity choice (confirmed with the
user) over making the row itself clickable/expandable, since this screen
has no per-application URL to route a row-click to (unlike the other
queues, which route to a dedicated page per application) and there's only
ever one live row to show detail for.

If there is no live application at all in this session (`!signUpData` —
e.g. fresh browser state, no borrower has gone through onboarding yet), a
distinct "No application in progress" empty state renders instead of the
list entirely, with a **"Go to Application List"** button — unlike
`credit-investigation-view.tsx`'s `if (!signUpData) return null;` guard,
which is fine there since every other section on that page genuinely needs
applicant data to render anything at all.

## CI Report

`review.creditInvestigation.report: CiReport`
(`src/auth/admin-context.tsx`). Structured, Call-Report-style sections, all
directly editable regardless of transcript state:

- **Site Visit Details** — visit date, visit time, location visited,
  visiting officer.
- **Borrower/Residence Verification** — identity confirmed, residence
  confirmed, business confirmed (each `'yes' | 'no' | ...`).
- **Neighborhood Check** — neighbor/community feedback (free text) +
  standing select.
- **Findings & Assessment** — free text.
- **Recommendation** — preliminary recommendation select + notes.

### Transcript upload → auto-fill

Officer uploads a transcript file (stands in for a PLAUD.ai export) via a
file input in the CI Report card. Same "store filename + timestamp only,
never read file contents" convention as every other upload in this app.
Uploading triggers `buildTranscriptAutoFill()`
(`credit-investigation-transcript.ts`) — a deterministic, hash-seeded
function (same technique as `simulateBureauFinding`) keyed on the
applicant's email + transcript filename — which fills every CI Report field
above with fixed template content and produces a read-only **AI Summary**
block. Auto-fill is a convenience, not a lock: every field stays editable
before and after upload, and re-uploading a new transcript re-runs auto-fill
and overwrites current values.

## Proceed application?

Three actions, all requiring no document/report completeness gate (matching
this app's generally permissive decision-gate style elsewhere):

- **Proceed** — records `creditInvestigation.decision: 'approved'`, routes
  to the Application List. *(Placeholder routing — see Non-goals below.)*
- **Disapprove** — `ConfirmDialog` with a required typed reason, records
  `decision: 'rejected'` + `decisionReason`, routes to Reconsideration.
  *(Placeholder routing.)*
- **Return to AMD** — `ConfirmDialog` with a required typed reason, records
  `returnedToAmd: true` + `returnToAmdReason`, routes back to Requirement
  Checklist. *(Placeholder routing.)*

## Queue unlocking

`application-list-view.tsx`'s live-row `isActionable` for the
`creditInvestigation` step is unconditionally `true`, matching every other
built step in this pipeline (`creditChecking` through
`requirementChecklist`) — the row is always clickable in the "Comprehensive
Credit Checking → Credit Investigation" queue, regardless of Requirement
Checklist's endorsement status. An earlier version of this page gated the
row behind `review.requirementChecklist.endorsed`, but that broke the
established "the live application's row is always actionable on every
step" convention every other step in this list follows — reverted so an
admin can reach this page directly at any time, same as any other step.
Appraisal and Financial Evaluation remain always non-actionable (unbuilt).

Requirement Checklist's "Endorsed for comprehensive process" success screen
gains a **"Continue to Credit Investigation"** button (above the existing
"Back to Application List") linking to this page — the "Returned to
applicant" success screen is unaffected.

## Non-goals / Open items

- **Exact post-decision routing for Proceed/Disapprove/Return to AMD is a
  placeholder**, chosen for a functionally complete first build (Proceed →
  Application List, Disapprove → Reconsideration, Return to AMD →
  Requirement Checklist). Revisit before considering this feature fully
  settled.
- **Appraisal and Financial Evaluation** remain scaffolded-only, unbuilt.
- **No real file parsing, real AI/LLM, or real transcription anywhere** —
  every "AI Summary" and auto-fill is deterministic template text engineered
  to look the same shape as Requirement Checklist's/Initial Credit
  Checking's existing "AI" cards.
- **No real outreach delivery** on email/WhatsApp/Viber — same
  simulated-only convention as every other `RequestDocumentsDrawer` instance.
- **No separate CI Fee approver persona/login** — approval is a second
  simulated action for the same officer, not a distinct workflow role.
