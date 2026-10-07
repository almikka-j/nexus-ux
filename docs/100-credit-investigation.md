# Credit Investigation (Step 4)

> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-docs.ts`,
> `credit-investigation-risk.ts`, `credit-investigation-transcript.ts`,
> `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/ci-report-commercial-sections.tsx`,
> `credit-investigation/credit-investigation-doc-row.tsx`,
> `components/rich-text-field/rich-text-field.tsx`) change. Companion to
> `docs/230-project-overview.md`,
> `docs/090-account-solicitation-requirement-checklist.md` (the step
> immediately before this one in the pipeline),
> `docs/140-request-credit-investigation-fee.md` (the CI Fee card rendered on
> this same page, now documented separately), and
> `docs/225-admin-design-system.md` (the admin design system —
> `adminCardSx`, `CollapsibleSection`, `ConfirmDialog`, and the §10
> decision-gate pattern are all used here).

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
4. **AI review, summary & recommendation** card — the shared `AiReviewCard`
   (compact variant). Also collapsible; same start-collapsed-on-open plus
   live-transition behavior as Document Checklist above, gated on
   `ciFeeStatus === 'approved'` (`credit-investigation-view.tsx`).
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
  than a full top-level card header (the `docs/225-admin-design-system.md`
  §4.4 card-title / section-subtitle sizes, `16px`/`13.5px`, which an
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

Its `{ level, summary, recommendation }` is rendered by the shared
**`AiReviewCard`** (`src/components/admin-ui/ai-review-card.tsx`) in its
**compact** variant, with a magic-stick header icon, the shared
**AI Control Statement** footnote, and the risk level shown as a
consistent white risk pill. The 3-level `AI_REVIEW_RISK_STYLES` readiness
scale it maps `level` through now lives in
`src/components/admin-ui/ai-review-tokens.ts` (it used to be exported from
`credit-investigation-risk.ts`; the builder itself is unchanged). The
card's collapse-on-open / auto-collapse-on-`ciFeeStatus === 'approved'`
behaviour is preserved — `AiReviewCard` takes the same
`expanded`/`onToggle` props (`expanded={ciFeeStatus !== 'approved'}` seed).

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
(the CI Fee Approval detail page — its list is now the merged "Fee
Approvals" page, `docs/155-request-fee-approvals.md`). The CI Report card below is
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
`docs/superpowers/specs/2026-08-06-ci-report-redesign-design.md`.

**Report Type.** Before any section renders, the officer must pick a
**Report Type** — Commercial or Consumer — via a `ToggleButtonGroup` placed
beside the card's title/description in its header row (`report.type:
CiReportType`, `'' | 'commercial' | 'consumer'`, defaults to
`''`/undecided). While `type === ''`, only the header and a plain "Select a
report type to continue." message render — no transcript upload row, no
sections. This is a manually-picked field, not inferred from any existing
application data (loan type, employment status, etc.).

Switching the type later only changes which section set is visible —
nothing is cleared. Both types' fields coexist on the same `CiReport`
object; whichever type isn't currently selected simply isn't rendered, so
an officer can switch back and forth without losing previously-entered
data on either side.

**Consumer** was restructured (2026-10-07) from its earlier flat ~15-item
list into 8 collapsible card-sections matching a reference "Field
Investigation" tool exactly, each a `CollapsibleSection` inside its own
`adminCardSx` box — same pattern as Commercial (see below) and as
Requirement Checklist's own Credit Investigation/Appraisal/Financial
Evaluation groups. A sticky left `CiSectionNav` (shared component, see
Commercial's own description below) lists these 8 sections and
scroll-jumps/expands on click, same mechanism as Commercial's nav. Shared
header fields (transcript upload, AI Summary, Inspection/Date Inspected)
still render once, above the Consumer/Commercial branch, same as always;
the read-only Residence Address + Business/Work Address block remains
Consumer-only, rendered just above these 8 sections. In order:

- **Family** — subtitled "The applicant's spouse and children." Spouse
  (`RichTextField`, pre-filled once with a plain-text scaffold — name +
  birthday — built from `personalInfo.spouse*` fields when
  `civilStatus === 'Married'`; blank otherwise, free-text afterward, not a
  locked value) and Children (repeatable `CiChildEntry` array: Name, Age,
  Occupation/School).
- **Residence/Neighborhood** — subtitled "The permanent address on file,
  and the present address if the applicant lives elsewhere." Permanent
  address (read-only, from `personalInfo`), Leased type, Length of stay,
  Landmark, Remarks, followed by a **"PRESENT ADDRESS (if different)"**
  sub-block mirroring the same five fields for when the applicant's
  current residence differs from the address on file.
- **Employment** — subtitled "Employer or business, income, workforce and
  registration details." Employment Status (pre-filled read-only from
  `financialInfo.employmentStatus`), Employment Type, Employer/Business
  Name, Position, Address, Tel./Email, Salary, Annual Income, Length of
  Service, employee counts, Unionized, SEC/DTI registration, and Remarks.
  The Business/Employer Name and Address labels switch to "Business"
  terminology when `financialInfo.employmentStatus === 'Business Owner'`.
- **Trade Checking** — subtitled "Customers and suppliers verified during
  the visit." Two independent repeatable `CiTradeEntry` arrays, in
  order **Customers** first then **Suppliers** (reordered to match the
  reference, same Customers-before-Suppliers order as the Commercial
  branch) — each with its own "Add Customer"/"Add Supplier" trigger
  (Name, Address, Contact Number, Nature of Dealing, Years of Dealing).
- **Financial Information** — subtitled "Assets, other sources of income
  and bank accounts." Assets (`RichTextField`), Other Source of Income
  (repeatable `CiIncomeSourceEntry` array: Source, Monthly Amount,
  Remarks), Bank Verification (repeatable `CiBankAccountEntry` array:
  Bank Name, Account Type, Account Number, Average Monthly Balance) — all
  three previously separate top-level items, now one grouped section.
- **Loan Purpose** — subtitled "Required. What the loan proceeds will be
  used for." `RichTextField`, pre-filled once from
  `financialInfo.loanPurpose` if present. Nothing on this page currently
  blocks "Proceed" on CI Report field completeness — same permissive-gate
  convention as the rest of this page's decision flow.
- **Comaker** — subtitled "The comakers backing this loan." Still
  **read-only**, sourced directly from `review.callReport.comakers` (no
  local `CiReport` fields of its own); display unchanged for now (renders
  each comaker as a compact row — name, relationship, address, contact —
  or "No data found. Please add comaker information on Call Report." when
  empty). The write side of this data lives on Call Report's own Comaker
  card — see `docs/080-account-solicitation-call-report.md`'s "The 12
  section cards" table, section 12. **Known gap:** the reference tool's
  Comaker section shows substantially more fields (Prefix/Suffix, Civil
  status, Birth date, Age, Birth place, Citizenship, Job title, Business
  name, Office address, Length of service) and multiple comakers, none of
  which `CiComakerEntry`/Call Report's single-comaker `comakerChange` form
  currently capture — tracked as a separate follow-up task, not yet
  implemented.
- **Investigation Findings / Observations** — subtitled "The officer's
  assessment from the field visit, document review, and the preliminary
  recommendation." Subject As Of, Health and Habits, and Comments
  (`RichTextField`s, previously three separate top-level items), plus
  Recommendation (preliminary recommendation select —
  `'proceed-as-requested' | 'proceed-with-conditions' |
  'needs-additional-verification'` — + notes, kept last within this
  section). This is the only CI Report field `credit-investigation-risk.ts`
  doesn't read at all — `report` isn't consulted by
  `buildCreditInvestigationSummary` in the first place, which reads
  solely from the Document Checklist.

**Negative Record removed from view.** The reference tool has no Negative
Record section at all, so it no longer renders in the Consumer branch (nor
did it ever render in Commercial). Its `CiReport` fields
(`negativeRecordSourceNote`/`negativeRecordFinding`/`negativeRecordRemarks`)
are untouched in the data model — existing reports with this data keep it,
simply no longer editable or visible from this page. The `NegativeRecordSection`
component and its `NEGATIVE_FINDING_OPTIONS` constant were deleted from
`ci-report-card.tsx` as genuinely dead code once nothing called them.

### Commercial CI Report sections

**Commercial** renders a different, smaller section set instead (moved into
its own file, `credit-investigation/ci-report-commercial-sections.tsx`, to
keep `ci-report-card.tsx` from growing further — it was already ~960 lines
before this). The transcript upload row, AI Summary, and Date Inspected
(`report.visitDate`) are shared — rendered once in `CiReportCard` itself,
above the type branch, same for both Consumer and Commercial. The
read-only Residence Address + Business/Work Address header block is
**Consumer-only** — it does not appear in the reference "Field
Investigation — Commercial" layout this branch matches, so it renders
only inside the `report.type === 'consumer'` branch, directly above
`ConsumerReportSections`.

The reference tool itself is a separate multi-page app (its own left
sidebar, one page per section, a "Download Report" button) — this app
keeps the single-card, long-scrolling CI Report convention instead, so
`CommercialReportSections` reproduces the reference's four groupings as
four `CollapsibleSection`s (`src/components/collapsible-section`), each in
its own `adminCardSx` box — the exact same pattern Requirement
Checklist's own Credit Investigation/Appraisal/Financial Evaluation
groups use, not MUI Tabs: **Field Investigation**, **Trade Checking**,
**Management and Ownership**, **Comments**, each with its own
`useState`-backed expanded/collapsed toggle, all expanded by default.

A `CiSectionNav<K>` component (generic over the section-key type, shared
by both report types — see the Consumer section above) — a sticky left
sidebar, one row per section, scroll-jump on click, active-section
highlight on normal scroll — sits beside the **entire CI Report card**,
not inside it: `CiReportCard`'s own `return` is a row `Stack` (nav column,
rendered for whichever type is active, plus the `adminCardSx` card as a
sibling column holding the title, the type toggle, the transcript row,
Date Inspected, and the Consumer/Commercial branch). This mirrors exactly
how Requirement Checklist's own `RequirementChecklistSectionNav` sits in
`requirement-checklist-view.tsx` as a sibling to the cards it jumps
between — outside every card, not nested inside one, same as here.
`CiReportCard` owns both types' section-expanded state, ref maps, and
active-section tracking (`commercialExpanded`/`commercialSectionRefs`/
`commercialActiveKey` and `consumerExpanded`/`consumerSectionRefs`/
`consumerActiveKey`, same shape, kept separate since the two types have
different section sets), and passes `sectionRefs`/`expandedSections`/
`onToggleSection` down into `CommercialReportSections`/
`ConsumerReportSections` as props, so neither component carries its own
nav logic. It reuses `useActiveSection()`
(`requirement-checklist-section-nav.tsx`, IntersectionObserver-based)
exactly as Requirement Checklist's own nav does, but is its own slimmer
component rather than that one reused directly — Requirement Checklist's
nav is tightly coupled to a document received/total progress bar and
per-item status dot that don't apply here, since both report types are
just form fields with nothing to count. Clicking a nav item expands that
section (if collapsed) and smooth-scrolls to it.

Collapsing a section (or navigating away from it) never clears its
data — every section's fields live on the
same `CiReport` object regardless of which sections are expanded, same
principle as switching the Commercial/Consumer type itself.

**Info chips header.** Above the transcript upload row (so it's the very
first thing under the CI Report title/type toggle, for Commercial only),
a `CommercialInfoChips` block (`ci-report-card.tsx`) renders two parts:

- **12 read-only fields as a `FactChipRow`/`FactChip` grid** — this
  app's existing label-over-value quick-read summary pattern (see
  `docs/225-admin-design-system.md` §6 and its live showcase on
  `/admin/design-system`), reused here with a local copy (not a shared
  component yet anywhere in this app) instead of inventing a new layout.
  Company Name, Business Address, Contact No., Email Address, Website,
  TIN No., Loan Type, Amount Applied, Loan Purpose, Organization Type,
  Registration Number, Registration Date, and a Negative Records link
  ("See report"), in that order — 12 cells total, deliberately a multiple
  of 3 (with Business Address as the one `wide` cell spanning the full
  row on its own), so the grid always fills completely with no leftover
  cells in a final partial row. Unlike every other screen's `FactChip`
  copy (a flex-wrap row), this one is a **3-column CSS grid** (1 column
  on mobile) — flex-wrap has no way to know which cell starts a new
  visual line, so a per-cell divider either doubled up or went missing
  depending on wrap position. Each cell paints its own white background
  and draws only its **right + bottom** edge as a 1px inset `boxShadow`
  divider — not all 4 sides (an earlier version used a 4-side `outline`
  per cell, which doubled every internal line, since two adjacent cells
  each drew their own copy of the shared edge), and not a `border`
  (which would consume grid track space), and not a `gap`+
  background-colour trick (which left a visible gray gap in any row that
  didn't fully fill). The row container's own border supplies the top +
  left edge of the whole strip; the bottom-right cell's shadow coincides
  with — not duplicates — the container's own border on those two sides,
  since it's the same line, same position. None of these
  fields are user-editable; most have no equivalent anywhere in this
  app's data model (no company-profile backend exists), so they render
  fixed sample data (`COMMERCIAL_SAMPLE_INFO`) — same "fabricated but
  consistent" AI/derived value convention as the rest of this app —
  except Loan Type and Amount Applied/Loan Purpose, which prefer the real
  `application.loanType`/`financialInfo.desiredLoanAmount`/
  `financialInfo.loanPurpose` when present, falling back to the sample
  value otherwise. Business Address passes `wide` (a `FactChip` prop
  added here, not present in any other screen's copy) so it spans all 3
  grid columns instead of competing for one — a full street address is
  routinely long enough that a single grid cell reads as cramped. Every
  `FactChip` value wraps long text (`overflowWrap`/`wordBreak`) rather
  than clipping it, so an unusually long value in any non-`wide` cell
  still degrades gracefully instead of breaking the layout.
- **6 fillable rows below the strip** (`InfoChipFieldRow`, red required
  asterisk where the
  reference shows one) — Authorized Capital Stock*, Line of Business
  (read-only row, not fillable — matches the reference, which shows it
  without an input box), Territory*, Regular Employees, Contractual
  Employees, Owner*, Date Inspected* — all real, editable `CiReport`
  fields (`businessAuthorizedCapitalStock`/`businessLineOfBusiness`/
  `businessTerritory`/`businessRegularEmployees`/
  `businessContractualEmployees`/`businessOwner`/`visitDate`). These are
  the **only** place these fields are editable — removed from Commercial's
  own Business Profile section (which used to duplicate Owner/Territory/
  employee counts) and from the shared Inspection block (Date
  Inspected is now Commercial-only here; Consumer still has its own
  Inspection section with the same `visitDate` field, unchanged).
- **Negative Records** — a link ("See initial credit checking report") to
  `paths.admin.creditChecking(applicantEmail)`, not a field — the
  underlying negative-record data already lives on a different page
  (Initial Credit Checking), so this is scoped to navigation rather than
  display.

In order, each implemented in `CommercialReportSections`
(`credit-investigation/ci-report-commercial-sections.tsx`):

- **Field Investigation section** — Business profile, subtitled "From the
  business applied on the Call Report.", now holding only **Line of
  Business** (`businessLineOfBusiness`) — Authorized Capital Stock,
  Territory, Regular/Contractual Employees, and Owner moved up into the
  info chips header above (see "Info chips header" above) once those
  became that header's own fillable rows, since this app shows each field
  once, not twice. Then Location and facility (plain fields, no bordered
  gray sub-box — same
  flat treatment as every grouped field in both report types now;
  Residence/Neighborhood and Employment's own bordered boxes were removed
  in the same pass, once each section already got its own `adminCardSx`
  card from the restructure, making the inner gray box redundant)
  holding: Premises (Construction description, Area description), a
  "Location owned?" Yes/No `RadioRow` next to "Own or rent (details)"
  (`locationOwned`/`locationOwnRentDetails`), then Equipment (a
  description field), and an "Equipment owned?" Yes/No `RadioRow` next to
  "Equipment lease price" (`equipmentOwned`/`equipmentLeasePrice`).
- **Trade Checking section** — subtitled "Customers and suppliers verified
  during the visit.", holding two independent repeatable arrays in order
  — **Customers** first, then **Suppliers**
  (`commercialCustomers`/`commercialSuppliers:
  CiCommercialTradeEntry[]`) — a **new, separate entry type** from the
  Consumer branch's own `CiTradeEntry`, since the Commercial shape is
  company-level (Company name, Contact person, Position, Mobile number,
  Email, Telephone no., Local/extension, Transaction details, Payment
  terms, Years of contract, Remarks) rather than Consumer's individual
  name/address/dealing shape. Add buttons read "Add customer"/"Add
  supplier" (lowercase, matching the reference tool). Same
  add/remove-per-entry UX as every other repeatable section in this card.
- **Management and Ownership section** — subtitled "Who runs the business and
  who owns it.", holding two repeatable sub-sections:
  - **Management** (`management: CiManagementEntry[]`) — Full name,
    Birthdate, Birth place, Nationality, Spouse/partner, Home address,
    Job title, Education, Other business, TIN, Mobile number per entry.
    "Add management" trigger.
  - **Major stockholders** (`stockholders: CiStockholderEntry[]`) —
    Stockholder name, Amount subscribed, Amount paid-up, then an "Is the
    stockholder a corporation?" Yes/No `RadioRow`
    (`isCorporation: 'yes' | 'no' | ''`). When `'yes'`, a nested
    **Sub-stockholders** list (`subStockholders: CiSubStockholderEntry[]`,
    Sub-stockholder name/Amount subscribed/Amount paid-up per entry)
    renders directly below that one stockholder, with its own "Add
    sub-stockholder" trigger scoped to that stockholder only. This is the
    one genuinely nested array in this app's `CiReport` — mutations locate
    the parent stockholder by id before touching its own
    `subStockholders` array, so a sibling stockholder's own
    sub-stockholders are never affected. Toggling "Is the stockholder a
    corporation?" from Yes back to No only hides the Sub-stockholders
    block (the data is not cleared), so toggling back to Yes restores
    whatever was already entered. "Add stockholder" trigger.
- **Comments section** — subtitled "Overall remarks from the investigation.",
  `commentsNotes`, the same shared `RichTextField` field the Consumer
  branch's own Comments section uses (so text typed here survives
  switching to Consumer and back).

No Recommendation section inside the Commercial branch — the page's own
Decision Gate ("Proceed application?", outside `CiReportCard`) already
serves that role for both types, same as it always has.

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

### 2026-10-07 (Commercial info-chips header)

- **Added `CommercialInfoChips`**, matching a reference tool's own
  info-chip layout exactly: a single vertical "LABEL : value" list,
  rendered above the transcript upload row (the very top of the
  Commercial branch), not two columns.
- **12 read-only rows** with fixed sample data (Company Name, Business
  Address, Contact No., Email Address, Website, TIN No., Loan Type,
  Amount Applied, Loan Purpose, Organization Type, Registration Number,
  Registration Date) — this app has no company-profile backend, so these
  are fabricated-but-consistent sample values, same convention as every
  other AI/derived value elsewhere; Loan Type/Amount Applied/Loan Purpose
  prefer real application data when present.
- **6 fillable rows** (Authorized Capital Stock*, Territory*, Regular
  Employees, Contractual Employees, Owner*, Date Inspected* — asterisk
  matching the reference's own required markers), plus one more read-only
  row, Line of Business, interleaved among them exactly as the reference
  shows it. These are real `CiReport` fields, and this header is now the
  **only** place they're editable — removed the now-duplicate Owner/
  Territory/employee-count fields from Commercial's own Business Profile
  section, and made the shared Inspection block (Date Inspected)
  Consumer-only, since Commercial has its own Date Inspected in this
  header instead.
- Added 6 new `CiReport` fields:
  `businessAuthorizedCapitalStock`/`businessLineOfBusiness` (new) plus
  reusing the already-existing `businessTerritory`/
  `businessRegularEmployees`/`businessContractualEmployees`/
  `businessOwner`/`visitDate`. (An earlier version of this header made
  Company Name/Contact No./Email/Website directly editable with their
  own new `CiReport` fields — corrected to match the reference's
  read-only treatment once it became clear those 4 fields are meant to
  show sample data too, not be officer-entered.)
- A Negative Records link ("See initial credit checking report") to
  `paths.admin.creditChecking(applicantEmail)` closes out the list.

### 2026-10-07

- **Consumer CI Report restructured into 8 collapsible sections + sticky
  nav, matching a reference "Field Investigation" tool.** Previously a
  flat list of ~15 top-level items; now grouped as Family, Residence/
  Neighborhood, Employment, Trade Checking, Financial Information, Loan
  Purpose, Comaker, Investigation Findings / Observations — each a
  `CollapsibleSection` in its own `adminCardSx` box, same pattern as
  Commercial. The `CommercialSectionNav` component was generalized into
  `CiSectionNav<K>` and is now shared by both report types; `CiReportCard`
  tracks each type's own section-expanded state and active-section
  separately. Trade Checking's Customers/Suppliers order flipped to match
  the reference (Customers first). Negative Record no longer renders in
  either report type — its `CiReport` fields are untouched, just no
  longer shown; the now-dead `NegativeRecordSection` component and
  `NEGATIVE_FINDING_OPTIONS` constant were deleted. Comaker's display is
  unchanged for now — the reference tool's much larger Comaker field set
  (Prefix/Suffix, Civil status, Birth date, Job title, Business name,
  etc., across multiple comakers) is a known, tracked gap, deferred to a
  separate follow-up since it requires expanding Call Report's own
  single-comaker `comakerChange` write form first.

### 2026-10-06

- **Commercial/Consumer Report Types added.** `CiReportCard` now starts
  with a manually-picked Report Type selector (`report.type:
  CiReportType`); nothing else renders until a type is picked. Consumer
  renders the existing ~15-section structure unchanged. Commercial renders
  a new, smaller section set (Business Profile, Location and Facility,
  Trade Checking with a new `CiCommercialTradeEntry` shape, Management and
  Ownership with a nested Stockholder → Sub-stockholder structure,
  Comments), moved into a new file
  (`credit-investigation/ci-report-commercial-sections.tsx`) to keep
  `ci-report-card.tsx`'s size in check. Switching type never clears data
  on either side. See `docs/superpowers/specs/2026-10-05-ci-report-
  commercial-consumer-types-design.md` for the full design rationale.

### Date not confirmed

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
