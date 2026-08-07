# Admin — Credit Investigation

> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-docs.ts`,
> `credit-investigation-risk.ts`, `credit-investigation-transcript.ts`,
> `credit-investigation/ci-fee-card.tsx`, `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/credit-investigation-doc-row.tsx`,
> `components/rich-text-field/rich-text-field.tsx`) change. Companion to
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

## Document Checklist

One card, documents grouped into 5 subgroups
(`credit-investigation-docs.ts`'s `CI_SUBGROUP_ORDER`/`CI_SUBGROUP_LABELS`),
each rendered with the shared `RequirementDocRow` component, sorted
outstanding-first within each subgroup:

- **Principal/Consumer**: Primary ID (required). Once filled (via Requirement
  Checklist's own Upload, since this row is read-only here), its AI note
  dynamically appends the applicant's
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
  hoc rows the officer adds via **"+ Add document"** (a label text field);
  each becomes a `CreditInvestigationDoc` with `isCustom: true` and its own
  `label`. Unlike the fixed checklist rows, a newly-added custom document
  starts pre-filled as already uploaded and verified by
  `addCreditInvestigationDocument` (`admin-context.tsx`) — `status:
  'verified'`, a sample `fileName`/`fileUrl`, `uploadedAt: now`,
  `uploadedBy: officerName`, and `aiNote: 'Reviewed, no issues found.'` —
  so it reads like the Bureau & Verification Checks rows (already on file)
  rather than starting as "missing" and requiring a manual Upload click.
  Upload (to replace the
  file) and Delete (via the row's "…" menu) remain available afterward,
  same as any other non-missing row.

The page action **"Fill with Sample Data"/"Remove Sample Data"** has no
effect on this card at all — Document Checklist is fully read-only on this
page (sourced from Requirement Checklist, see above), so there is nothing
here for a sample-data action to fill or clear, and officer-added custom
documents are likewise untouched by either direction of that toggle. This
action is scoped entirely to CI Fee + CI Report instead (see below); an
earlier version of this feature had a document-based sample-data fill/clear
here, but that whole document-list feature was removed and Document
Checklist's own fill/clear was never rebuilt after it moved to a read-only
mirror of Requirement Checklist.

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
(used only to drive this card's `completeIcon`/badge state; it no longer
drives any page-action label — see below) — and factors in whether the
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

`review.creditInvestigation.ciFeeStatus: 'not-requested' | 'pending-approval'
| 'approved' | 'not-applicable'`. On `'not-requested'`, the officer picks
**"Yes, Request CI Fee"** (opens a form for Request Amount, Request Amount
Description, and Remarks, then moves the status to `'pending-approval'`) or
**"No CI Fee"** (moves straight to `'not-applicable'`). There is no separate
approver role or login in this prototype, so approval can't be self-served
inline — while `ciFeeStatus === 'pending-approval'`, the page registers a
**"Simulate: Another Officer Approves CI Fee"** action (via
`useRegisterPageActions`) into the floating settings popover (bottom-right
gear icon → Page actions), same convention as "Force Clean/Negative Bureau
Finding" elsewhere in this app. Clicking it sets `ciFeeStatus: 'approved'`.
The CI Report card is locked (shown as a dashed placeholder) until
`ciFeeStatus === 'approved'` or `'not-applicable'`.

The page action **"Fill with Sample Data"/"Remove Sample Data"** is scoped
to CI Fee + CI Report only — its label toggles on `isSampleFilled`
(`ciFeeStatus !== 'not-requested'`), not on document completeness. Filling
sets `ciFeeStatus: 'approved'` with a sample amount/description, then
populates a subset of `CiReport`: `subjectAsOf`, `residenceLeasedType`,
`residenceLengthOfStay`, `employmentType`, `lengthOfService`, and
`negativeRecordFinding` come from `buildTranscriptAutoFill()` (same
deterministic helper the real transcript upload uses, seeded with a fixed
`'sample-transcript.pdf'` filename); `employerName` ('Sample Employer
Corp.'), `position` ('Staff Supervisor'), and `salary` ('35000') are
hardcoded sample literals directly in `handleFillSampleData` — fields the
auto-fill simulator doesn't cover; and `visitDate` (today's date),
`recommendation` ('proceed-as-requested'), `recommendationNotes`, and the
`transcriptFileName`/`transcriptUploadedAt` pair are also set directly by
`handleFillSampleData` rather than sourced from `autoFill` (so the CI
Report card shows the same "transcript uploaded" state and AI Summary
block a real upload would produce). Clearing resets exactly those same
fields back to blank plus `ciFeeStatus: 'not-requested'`. Both directions
deliberately leave `employmentStatus`, `loanPurposeNotes`, and
`residencePermanentAddress` untouched — those are owned by `CiReportCard`'s
own one-time pre-fill effect (see CI Report below), not by this page
action, so toggling sample data on and off can never fight that effect.

**Dedicated CI Fee Approval screen** (`/admin/ci-fee-approval`,
`src/sections/admin/ci-fee-approval-view.tsx`) offers a second way to
trigger the same approval — a standalone top-level nav item (placed last in
`adminNavData`, `config-nav-admin.tsx`, flat/no `children` like
"Dashboard") rather than a page action buried in the settings popover. It
reads the same single live `review.creditInvestigation` state and, while
`ciFeeStatus === 'pending-approval'`, shows the applicant identity, the
same request amount/description/remarks detail box as `ci-fee-card.tsx`,
and — matching how a real decision looks elsewhere on this page (Credit
Investigation's own "Proceed application?" always offers Proceed +
Disapprove + Return to AMD, never a single lone action) — **two**
outcomes: **"Approve CI Fee"** and **"Decline CI Fee"**. Both open a
`ConfirmDialog` first rather than mutating on click — same
confirm-before-mutating convention as Disapprove/Return to AMD elsewhere
on this page. Approve's dialog ("Approve CI Fee?") just names the
applicant/amount; Decline's ("Reason for declining") requires a typed
reason before its Confirm button enables, mirroring
`credit-investigation-view.tsx`'s `confirmReturnToAmd` exactly.

Confirming **Approve** sets `ciFeeStatus: 'approved'`. Confirming
**Decline** resets the request back to `ciFeeStatus: 'not-requested'`
(clearing `ciFeeAmount`/`ciFeeAmountDescription`/`ciFeeRemarks` — same
re-entry point as an application that never requested a fee, so the
officer can re-request with corrected terms from the CI Fee card) while
recording the typed reason in a new **`ciFeeDeclineReason: string`** field
on `CreditInvestigation` (`admin-context.tsx`), the same
per-decision-reason convention as `decisionReason`/`returnToAmdReason`.

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

`review.creditInvestigation.report: CiReport` (`src/auth/admin-context.tsx`),
rendered by `CiReportCard`
(`src/sections/admin/credit-investigation/ci-report-card.tsx`). This card
was substantially redesigned from an earlier 5-section version (Site Visit
Details, Borrower/Residence Verification, Neighborhood Check, Findings &
Assessment, Recommendation) into a much fuller ~15-section report, matching
a reference CI Report layout. Full rationale and section-by-section spec:
`docs/superpowers/specs/2026-08-06-ci-report-redesign-design.md`. In order:

- **Header** — read-only Residence Address + Business/Work Address, shown
  side by side in a two-column block. Sourced entirely from
  `application.personalInfo`/`financialInfo`, never edited on this card;
  Business/Work Address reads "Not applicable" whenever
  `financialInfo.employmentStatus !== 'Business Owner'`.
- **Date Inspected** — single date field (`report.visitDate`).
- **Subject As Of** — `RichTextField`, blank until the officer types or a
  transcript is uploaded.
- **Spouse** — `RichTextField`, pre-filled once with a plain-text scaffold
  (name + birthday) built from `personalInfo.spouse*` fields when
  `civilStatus === 'Married'`; blank otherwise. Free-text afterward, not a
  locked value.
- **Children** — repeatable `CiChildEntry` array (Name, Age,
  Occupation/School), same add/remove-per-entry pattern as Call Report's
  Collateral Information.
- **Residence/Neighborhood** — structured fields in a bordered box:
  Permanent address (read-only, from `personalInfo`), Leased type, Length
  of stay, Landmark, Remarks, followed by a **"PRESENT ADDRESS (if
  different)"** sub-block mirroring the same five fields for when the
  applicant's current residence differs from the address on file.
- **Employment** — structured fields in a bordered box. Employment Status
  is pre-filled read-only from `financialInfo.employmentStatus`; Employment
  Type, Employer/Business Name, Position, Address, Tel./Email, Salary,
  Annual Income, Length of Service, employee counts, Unionized, SEC/DTI
  registration, and Remarks are officer-entered or transcript-filled. The
  Business/Employer Name and Address labels switch to "Business"
  terminology when `financialInfo.employmentStatus === 'Business Owner'`.
- **Trade Checking** — two independent repeatable `CiTradeEntry` arrays,
  **Suppliers** and **Customers**, each with its own "Add Supplier"/"Add
  Customer" trigger (Name, Address, Contact Number, Nature of Dealing,
  Years of Dealing).
- **Assets** — `RichTextField`, blank by default.
- **Other Source of Income** — repeatable `CiIncomeSourceEntry` array
  (Source, Monthly Amount, Remarks).
- **Loan Purpose (Required)** — `RichTextField`, pre-filled once from
  `financialInfo.loanPurpose` if present. Labeled required to match the
  reference layout, but nothing on this page currently blocks "Proceed" on
  CI Report field completeness — same permissive-gate convention as the
  rest of this page's decision flow.
- **Bank Verification** — repeatable `CiBankAccountEntry` array (Bank Name,
  Account Type, Account Number, Average Monthly Balance).
- **Negative Record** — a fixed, non-editable disclosure line
  (`negativeRecordSourceNote`, naming BAP/CMAP as the source and the visit
  date), a `RadioRow` finding ("No negative findings both CMAP & NFIS" /
  "Negative findings found") next to the applicant's own name, and a
  `RichTextField` for Remarks.
- **Comaker** — **read-only**, sourced directly from
  `review.callReport.comakers` (no local `CiReport` fields of its own).
  Renders each comaker as a compact row (name, relationship, address,
  contact); shows "No data found. Please add comaker information on Call
  Report." when the array is empty. The write side of this data lives on
  Call Report's own Comaker card — see
  `docs/ADMIN_CALL_REPORT.md`'s "The 12 section cards" table, section 12.
- **Health and Habits** — `RichTextField`, blank by default.
- **Comments** — `RichTextField`, blank by default.
- **Recommendation** — kept unchanged from the original CI Report:
  preliminary recommendation select (`'proceed-as-requested' |
  'proceed-with-conditions' | 'needs-additional-verification'`) + notes,
  placed last. This is the only CI Report field
  `credit-investigation-risk.ts` doesn't read at all — `report` isn't
  consulted by `buildCreditInvestigationSummary` in the first place, which
  reads solely from the Document Checklist.

**Pre-fill vs. blank on first open:** only fields with a clear existing
source pre-fill automatically — header address, Employment Status, Loan
Purpose, and the Spouse scaffold — each via a one-time `useEffect` in
`CiReportCard` that patches a field only while it's still at its untouched
default, so it can never clobber an officer's own edit on a later render
(same "default once" convention as `loan-discussion-card.tsx`'s Final Loan
Purpose default). Every other field starts genuinely blank (or an empty
array) until the officer types something or uploads a transcript.

**`RichTextField`** (`src/components/rich-text-field/rich-text-field.tsx`,
exported via `src/components/rich-text-field/index.ts`) is a new shared
component — a bordered box matching this app's `fieldSx` look, with a small
Bold/Italic/bulleted-list/numbered-list toolbar over a Tiptap
(`@tiptap/react` + `@tiptap/starter-kit`) editor area, storing its value as
an HTML string. It backs six narrative sections above: Subject As Of,
Spouse, Assets, Negative Record's Remarks, Health and Habits, and Comments.

### Transcript upload → auto-fill

Officer uploads a transcript file (stands in for a PLAUD.ai export) via a
file input in the CI Report card. Same "store filename + timestamp only,
never read file contents" convention as every other upload in this app.
Uploading triggers `buildTranscriptAutoFill()`
(`credit-investigation-transcript.ts`) — a deterministic, hash-seeded
function (same technique as `simulateBureauFinding`) keyed on the
applicant's email + transcript filename — which produces fixed template
content and a read-only **AI Summary** block. Auto-fill only ever touches
the fields a transcript could plausibly attest to: residence lease
type/length of stay, Present Address (mirrored from the permanent address
when `autoFill.presentAddressSameAsPermanent` is true, otherwise left
unchanged), employment type/length of service, negative-record finding, and
the Subject As Of narrative. It never touches the header block, Loan
Purpose, or Comaker — those are sourced from application data or Call
Report, and a transcript re-upload must not clobber them. Auto-fill is a
convenience, not a lock: every field stays editable before and after
upload, and re-uploading a new transcript re-runs auto-fill and overwrites
the fields it covers.

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
