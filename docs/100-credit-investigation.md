# Credit Investigation (Step 4)

> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-docs.ts`,
> `credit-investigation-risk.ts`, `credit-investigation-transcript.ts`,
> `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/credit-investigation-doc-row.tsx`,
> `components/rich-text-field/rich-text-field.tsx`) change. Companion to
> `docs/230-project-overview.md` and
> `docs/090-account-solicitation-requirement-checklist.md` (the step
> immediately before this one in the pipeline), and
> `docs/140-request-credit-investigation-fee.md` (the CI Fee card rendered on
> this same page, now documented separately).

## What this is

"Step 4 · Credit Investigation" in the admin application-review pipeline
(`src/sections/admin/credit-investigation-view.tsx`, rendered at
`/admin/applications/[id]/credit-investigation`). This is the detail
workspace for the `creditInvestigation` step under the sidebar's
"Application" section (its Comprehensive Credit Checking sub-items) — that
nav entry and the `ReviewStep` type value existed before this page did,
deliberately scaffolded ahead of their workspace (see
`docs/230-project-overview.md`'s admin flow section); this page is that
workspace.

Pipeline position: Initial Credit Checking → Call Report → Requirement
Checklist → **Credit Investigation** → Appraisal → Financial Evaluation (see
`docs/120-financial-evaluation.md`). The live application's Credit
Investigation queue row is always actionable, same as every other step in
this pipeline — an admin can inspect/act on the live application at any step
at will, regardless of whether Requirement Checklist has been endorsed yet.

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
5. **CI Fee** card (see `docs/140-request-credit-investigation-fee.md`).
6. **CI Report** card (visible once CI Fee is approved; otherwise a locked
   placeholder).
7. **Proceed application?** decision card.
8. Dialogs mounted outside the stack: Disapprove reason,
   `RequestDocumentsDrawer`.

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

Now documented in its own file — see `docs/140-request-credit-investigation-fee.md`
(the request-side `CiFeeCard`) and `docs/150-request-credit-investigation-fee-approval.md`
(the dedicated Credit Investigation - Fee Approval screens). The CI Report card below is
locked (shown as a dashed placeholder) until `ciFeeStatus === 'approved'`
or `'not-applicable'`.

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
  `docs/080-account-solicitation-call-report.md`'s "The 12 section cards"
  table, section 12.
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
(same "default once" convention as Call Report's
`proposed-loan-package-card.tsx`/`endorsement-declaration-card.tsx` prefill
fields). Every other field starts genuinely blank (or an empty
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

## Decision Gate — Proceed application?

Two actions, both requiring no document/report completeness gate (matching
this app's generally permissive decision-gate style elsewhere):

- **Proceed** — records `creditInvestigation.decision: 'approved'`, routes
  to Appraisal (`paths.admin.appraisal`, see `docs/110-appraisal.md`).
- **Disapprove** — `ConfirmDialog` with a required typed reason, records
  `decision: 'rejected'` + `decisionReason`, routes to Reconsideration
  (see `docs/130-sales-reject-application.md`). *(Placeholder routing.)*

## Queue unlocking

`application-list-view.tsx`'s live-row `isActionable` is unconditionally
`true` for every step in this pipeline (`creditChecking` through
`financialEvaluation`) — the row is always clickable in the "Application →
Credit Investigation" queue, regardless of Requirement Checklist's
endorsement status. An earlier version of this page gated the row behind
`review.requirementChecklist.endorsed`, but that broke the established "the
live application's row is always actionable on every step" convention every
other step in this list follows — reverted so an admin can reach this page
directly at any time, same as any other step.

Requirement Checklist's "Endorsed for comprehensive process" success screen
gains a **"Continue to Credit Investigation"** button (above the existing
"Back to Application List") linking to this page — the "Returned to
applicant" success screen is unaffected.

## Fabricated Claims — Real vs. Simulated

- **AI Summary / Recommendation** — deterministic template text, no LLM.
- **Transcript upload → auto-fill** — the uploaded file is not parsed;
  auto-fill writes fixed derived values shaped to look extracted.
- **CI Fee approval** — a second simulated click by the same officer, no
  separate approver login.
- **Document Checklist outreach** (email / WhatsApp / Viber) — simulated,
  no real delivery.
- All state lives in `review.creditInvestigation` in `localStorage`.

## Non-Goals / Open Items

- **Exact post-decision routing for Disapprove is a placeholder**
  (Disapprove → Reconsideration), chosen for a functionally complete first
  build. Proceed now routes to the real Appraisal page. Revisit Disapprove's
  routing before considering this feature fully settled.
- **No real file parsing, real AI/LLM, or real transcription anywhere** —
  every "AI Summary" and auto-fill is deterministic template text engineered
  to look the same shape as Requirement Checklist's/Initial Credit
  Checking's existing "AI" cards.
- **No real outreach delivery** on email/WhatsApp/Viber — same
  simulated-only convention as every other `RequestDocumentsDrawer` instance.
- **No separate CI Fee approver persona/login** — approval is a second
  simulated action for the same officer, not a distinct workflow role.

## History

### Earlier

- **Queue row gating reverted.** The live row was briefly gated behind
  `review.requirementChecklist.endorsed`; reverted to the standard
  "always actionable on every step" convention. Requirement Checklist's
  endorsed success screen gained a "Continue to Credit Investigation"
  button instead.
- **Document-based sample-data fill/clear removed** in favour of the
  current form-field model; some field sizing was tightened from an
  earlier oversized layout.
- **Proceed routing** moved from a placeholder to the real Appraisal
  page; Disapprove → Reconsideration is still placeholder routing.
