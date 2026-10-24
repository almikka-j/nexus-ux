# Credit Investigation (Step 4)

> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-docs.ts`,
> `credit-investigation-risk.ts`, `credit-investigation-transcript.ts`,
> `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/ci-report-commercial-sections.tsx`,
> `credit-investigation/ci-report-preview.tsx`,
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
   Directly under it (only while unlocked), a small **Preview Report**
   footer card — see "CI Report preview" below.
7. **Proceed application?** decision card.
8. Dialogs mounted outside the stack: Disapprove reason, CI Report
   preview, `RequestDocumentsDrawer`.

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

**Consumer** (rebuilt 2026-10-11, mirroring Commercial's own file/plain-card
structure — see `ci-report-consumer-sections.tsx`) renders 10 always-visible
`adminCardSx` cards, no `CollapsibleSection` anywhere (Consumer dropped its
own `CollapsibleSection` usage to match Commercial). A sticky left
`CiSectionNav` lists these 10 sections and scroll-jumps on click (no
expand/collapse step, since nothing is ever collapsed). An **info chips
header** (`ConsumerInfoHeader`, the same `FactChip`/`FactChipRow` grid
Commercial's own `CommercialInfoChips` uses) renders once, above the
transcript upload row: Applicant Name (wide), Residence Address (wide,
`residencePermanentAddress`), Tel. Number/Mobile Number/Email Address
(fixed sample placeholders — this app has no real residence-contact-info
backend), Business/Work Address (wide, `employerAddress` when the
applicant is a Business Owner), then its own Tel. No./Email Address (the
real, editable `employerTelNo`/`employerEmail` fields from the Employment
section). Date Inspected (`report.visitDate`) and Subject As Of
(`report.subjectAsOf`, `RichTextField`) render just below the header, same
as before Subject As Of moved out of "Investigation Findings /
Observations" (see History). In order:

- **Family** — subtitled "The applicant's spouse and children." Spouse
  (`RichTextField`, pre-filled once with a plain-text scaffold — name +
  birthday — built from `personalInfo.spouse*` fields when
  `civilStatus === 'Married'`; blank otherwise, free-text afterward, not a
  locked value) and Children (repeatable `CiChildEntry` array: Name, Age,
  Occupation/School).
- **Residence/Neighborhood** — subtitled "The permanent address on file,
  and the present address if the applicant lives elsewhere." **Permanent
  Address** stacked above **Present Address** (not side-by-side columns),
  each with its own structured `AddressFields`, packed three fields per
  row where it fits (Province\*/City\*/Barangay\*, then Street
  Address\*/Address Type\*/Length of Stay), Landmark/Remarks as a final
  two-up row of single-line multiline fields. Province/City/Barangay are
  cascading dropdowns backed by
  `src/utils/ph-address.ts`'s `PROVINCES`/`PROVINCE_CITIES`/
  `barangaysFor()` — the same sample PH province→city→barangay data the
  onboarding Personal Info step's own zip lookup uses, extracted there
  into this shared module and extended with Bulacan/Ilocos Norte entries;
  City/Barangay fall back to free text once a province/city pair isn't in
  the sample table. Address Type is Own/Rent/Rent-free (replaces the old
  `residenceLeasedType`/`presentLeasedType` radio fields). Present
  Address has its own **"Same as Permanent"** checkbox
  (`presentSameAsPermanent`) that hides its own fields entirely when
  checked — replaces the old free-text `presentAddress` field and its own
  "PRESENT ADDRESS (if different)" sub-block.
- **Employment** — subtitled "Employer or business, income, workforce and
  registration details." Unchanged: Employment Status (pre-filled
  read-only from `financialInfo.employmentStatus`), Employment Type,
  Employer/Business Name, Position, Address, Tel./Email, Salary, Annual
  Income, Length of Service, employee counts, Unionized, SEC/DTI
  registration, and Remarks. The Business/Employer Name and Address
  labels switch to "Business" terminology when
  `financialInfo.employmentStatus === 'Business Owner'`.
- **Financial Information** — subtitled "Assets and other sources of
  income." Assets (`RichTextField`), then **Other Source of Income**
  (repeatable `CiIncomeSourceEntry` array, rewritten to match a reference
  tool's own form: Income Type\* (select — Business Income/Rental
  Income/Freelance-Commission/Pension/Other), Company Name\*, Owner\*,
  Percent Of Share\* (0–100), Remarks\* — replaces the old
  Source/Monthly Amount/Remarks shape entirely, no production data
  existed to migrate). Bank Verification was moved out into its own card
  below Loan Purpose (see below) — no longer grouped under Financial
  Information.
- **Loan Purpose** — subtitled "What the loan proceeds will be used for."
  Card title itself carries the red required asterisk (`requiredLabel`).
  `RichTextField`, pre-filled once from `financialInfo.loanPurpose` if
  present. Nothing on this page currently blocks "Proceed" on CI Report
  field completeness — same permissive-gate convention as the rest of
  this page's decision flow.
- **Bank Verification** — its own card, below Loan Purpose. Repeatable
  `CiBankAccountEntry` array: Bank Name, Account Type, Account Number,
  Average Monthly Balance.
- **Comaker** — subtitled "The comakers backing this loan." Still
  **read-only**, sourced directly from `review.callReport.comakers` (no
  local `CiReport` fields of its own); renders each comaker as a compact
  row — name, relationship, address, contact — or "No data found. Please
  add comaker information on Call Report." when empty. The write side of
  this data lives on Call Report's own Comaker card — see
  `docs/080-account-solicitation-call-report.md`'s "The 12 section cards"
  table, section 12. **Known gap:** the reference tool's Comaker section
  shows substantially more fields (Prefix/Suffix, Civil status, Birth
  date, Age, Birth place, Citizenship, Job title, Business name, Office
  address, Length of service) and multiple comakers, none of which
  `CiComakerEntry`/Call Report's single-comaker `comakerChange` form
  currently capture — tracked as a separate follow-up task, not yet
  implemented.
- **Health and Habits** — its own card (previously grouped under
  "Investigation Findings / Observations"). `RichTextField`.
- **Comments** — its own card (previously grouped under "Investigation
  Findings / Observations"). `RichTextField`.
- **Additional Documents** — its own card, at the very end. Repeatable
  `consumerDocuments: CiConsumerDocumentEntry[]`, multi-file upload via an
  always-open dropzone that appends on every drop (same pattern as the
  Commercial branch's own Additional Documents card) — see "Document
  preview" note under Commercial's own History entry, which applies here
  identically (image files get a direct `<img>` preview via their
  filename extension, since the stored `fileUrl` is a `blob:` object URL
  with none of its own).

**Trade Checking removed from the Consumer branch entirely** — no
reference-tool equivalent. `report.customers`/`suppliers` (`CiTradeEntry[]`)
and the now-dead `TradeCheckingSection` component were deleted from the UI
layer; the `CiReport` fields themselves are untouched in the data model
(existing reports keep any prior entries), simply no longer editable or
visible from this page. Commercial's own Trade Checking card (Customer/
Supplier, different `CiCommercialTradeEntry` shape) is unaffected.

**Recommendation removed, Subject As Of relocated.** The old
"Investigation Findings / Observations" section's Preliminary
Recommendation select/notes are no longer rendered anywhere in the
Consumer branch — the reference tool this rebuild matches has no
equivalent field. `report.recommendation`/`recommendationNotes` are
untouched in the data model (existing reports keep any prior value),
simply no longer editable or visible from this page. **Subject As Of**
moved out of that section entirely and now renders directly in
`CiReportCard` itself, right below Date Inspected, above
`ConsumerReportSections` — still a `RichTextField` bound to
`report.subjectAsOf`, still written by the transcript auto-fill
(`buildTranscriptAutoFill().findingsNarrativeHtml`).

**Negative Record removed from view.** The reference tool has no Negative
Record section at all, so it no longer renders in the Consumer branch (nor
did it ever render in Commercial). Its `CiReport` fields
(`negativeRecordSourceNote`/`negativeRecordFinding`/`negativeRecordRemarks`)
are untouched in the data model — existing reports with this data keep it,
simply no longer editable or visible from this page.

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
`CommercialReportSections` reproduces the reference's groupings as plain
`adminCardSx` boxes (title + subtitle header, no chevron, no
collapse/expand) — **Management and Ownership**, **Location /
Facilities**, **Trade Checking**, **Bank Verification**, **Comments**,
**Additional Documents**, all always fully visible. (Field Investigation
was removed as its own card — its only remaining field, Line of
Business, is already covered read-only by the info chips header; see
"Info chips header" below.)
These were originally `CollapsibleSection`s; Consumer was later rebuilt
to match this same plain-card convention (see above) — neither branch
uses `CollapsibleSection` anymore. The
`expandedSections`/`onToggleSection` props still exist on
`CommercialReportSections` and `CiReportCard` still threads
`commercialExpanded`/`handleToggleCommercialSection` through them, even
though nothing in Commercial's own render reads `expandedSections`
anymore — left in place deliberately rather than torn out, in case a
later change needs collapsibility back.

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
just form fields with nothing to count. Clicking a nav item smooth-scrolls
to that section (and, for Consumer, expands it if collapsed — Commercial
has nothing to expand, every Commercial section is always visible).

Switching between Commercial and Consumer (or, for Consumer, collapsing a
section) never clears data — every section's fields live on the
same `CiReport` object regardless of which sections are expanded/visible,
same principle as switching the Commercial/Consumer type itself.

**Info chips header.** Above the transcript upload row (so it's the very
first thing under the CI Report title/type toggle, for Commercial only),
a `CommercialInfoChips` block (`ci-report-card.tsx`) renders two parts:

- **13 read-only fields as a `FactChipRow`/`FactChip` grid** — this
  app's existing label-over-value quick-read summary pattern (see
  `docs/225-admin-design-system.md` §6 and its live showcase on
  `/admin/design-system`), reused here with a local copy (not a shared
  component yet anywhere in this app) instead of inventing a new layout.
  Company Name, Business Address, Contact No., Email Address, Website,
  TIN No., Loan Type, Amount Applied, Loan Purpose, Organization Type,
  Registration Number, Registration Date, a Negative Records link ("See
  report"), and Line of Business, in that order. Unlike every other
  screen's `FactChip`
  copy (a flex-wrap row), this one is a **3-column CSS grid** (1 column
  on mobile) — flex-wrap has no way to know which cell starts a new
  visual line, so a per-cell divider either doubled up or went missing
  depending on wrap position. Each cell draws only its own **right +
  bottom** edge as a 1px inset `boxShadow` divider, not all 4 sides —
  two adjacent cells never both draw the same shared edge, so no line is
  ever doubled — and not a `border` (which would consume grid track
  space) or a `gap`+background-colour trick (which left a visible gray
  gap behind any unfilled cell). The row container's own border supplies
  the top + left edge of the whole strip.

  Because the divider belongs to the cell, not the row, a row left with
  only 1 or 2 filled cells out of N columns leaves a stray vertical line
  floating in otherwise-empty space (no sibling cell there to explain
  it). `FactChipRow` takes a `cols` prop (default 3) and a `position`
  prop (`'only' | 'first' | 'last'`, controlling which corners round and
  whether the segment draws its own top border) so a field count that
  doesn't divide evenly into the main grid can get its own segment with
  a different column count instead of leaving a stray cell. This header
  renders **two segments** that read as one continuous strip:
  - **`position="first"`, 3 columns:** Company Name and Business Address
    pass `wide` (`gridColumn: '1 / -1'`) — Company Name because it would
    otherwise sit alone before Business Address breaks to a new row,
    Business Address because it's also genuinely long (a full street
    address) — followed by the remaining 9 chips (Contact No. through
    Registration Number), exactly 3 complete rows of 3.
  - **`position="last"`, 3 columns (default):** Registration Date,
    Negative Records (the link, "See report"), and **Line of Business**
    (`report.businessLineOfBusiness`, read-only here — matches the
    reference, which shows it without an input box) — exactly 3 chips,
    one complete row, so no `wide`/leftover-cell handling is needed for
    this segment at all.

  Changing this field list must keep the running chip count divisible by
  whichever segment it lands in, or add/adjust a segment boundary —
  `wide`/`cols`/`position` all exist specifically to keep every segment's
  grid exactly full. Every `edge={{ right, bottom }}` on a chip marks
  that it sits on the *strip's own* outer edge on that side (last column
  of a row, or last row of its segment) — its divider is skipped there,
  since the segment's own border already draws that edge; without this,
  the cell's divider and the segment border occupy the same pixel and
  visibly double up.

  None of these fields are user-editable; most have no equivalent
  anywhere in this app's data model (no company-profile backend exists),
  so they render fixed sample data (`COMMERCIAL_SAMPLE_INFO`) — same
  "fabricated but consistent" AI/derived value convention as the rest of
  this app — except Loan Type and Amount Applied/Loan Purpose, which
  prefer the real `application.loanType`/
  `financialInfo.desiredLoanAmount`/`financialInfo.loanPurpose` when
  present, falling back to the sample value otherwise. Every `FactChip`
  value also wraps long text (`overflowWrap`/`wordBreak`) rather than
  clipping it.
- **6 fillable fields below the strip**, in a plain label-above-input
  layout (no gray box, no bordered card — same convention as every other
  grouped field elsewhere in this card, e.g. Location and Facility) —
  Authorized Capital Stock\*, Territory\*, Regular Employees, Contractual
  Employees, Owner\*, Date Inspected\* (`\*` via a `requiredLabel()`
  helper that embeds this app's standard red asterisk span into the
  `TextField` `label` prop, not MUI's own `required` boolean, which
  renders an unstyled default asterisk). All real, editable `CiReport`
  fields (`businessAuthorizedCapitalStock`/`businessTerritory`/
  `businessRegularEmployees`/`businessContractualEmployees`/
  `businessOwner`/`visitDate`). These are the **only** place these fields
  are editable — removed from Commercial's own Business Profile section
  (which used to duplicate Owner/Territory/employee counts) and from the
  shared Inspection block (Date Inspected is now Commercial-only here;
  Consumer still has its own Inspection section with the same
  `visitDate` field, unchanged).

In order, each implemented in `CommercialReportSections`
(`credit-investigation/ci-report-commercial-sections.tsx`) — **Management
and Ownership first**, then **Location / Facilities**, Trade Checking,
**Bank Verification**, Comments, **Additional Documents**:

- **Management and Ownership section** — subtitled "Who runs the business
  and who owns it.", with a "⋮" menu (`BusinessTypeMenu`) in its own
  header, next to the title/subtitle — picks which of Board of Trustees
  or Stockholders renders below, overriding
  `financialInfo.businessType` (`resolveCommercialBusinessType()`: the
  card's own `report.businessTypeOverride` wins if set, otherwise falls
  back to the application's own business type — `'Cooperative'` →
  Trustees, `'Corporation'`/`'Partnership'` → Stockholders, anything else
  — including `'Sole Proprietorship'`, a single owner already covered by
  Business Profile's own Owner field — shows neither, with a prompt to
  pick one via the ⋮ menu). Holds:
  - **Management** (`management: CiManagementEntry[]`) — one `TextField`
    per line (not grouped into a 2-3-column grid), matching a reference
    tool's own form exactly, in order: Name\*, then Current Title\* next
    to Nationality\*, then Educational Attainment\*, Other Business
    Affiliations (not required), Residence Address\*, then Birthday\*
    next to Place of Birth\*, then Spouse / Partner (not required), then
    Mobile Number\* next to Tax Identification Number\*. (`\*` via
    `requiredLabel()`, same helper the info chips header's fillable
    fields use.) Maps to `CiManagementEntry`'s existing fields —
    `fullName`/`jobTitle`/`nationality`/`education`/`otherBusiness`/
    `homeAddress`/`birthdate`/`birthPlace`/`spousePartner`/
    `mobileNumber`/`tin`. "Add management" trigger.
  - **Board of Trustees** (`trustees: CiTrusteeEntry[]`, Cooperative
    only) — Full Name\*, Position\*, Birthdate\*. "Add Trustee" trigger.
  - **Stockholders** (`stockholders: CiStockholderEntry[]`, Corporation
    or Partnership only) — Stockholder Type\* (Individual/Corporation,
    `RadioRow`, `stockholderType: CiStockholderType`), then a Name/Company
    Name\* field whose label swaps based on that type
    (`stockholderNameLabel()`), Amount Subscribed\*/Amount Paid\*
    (`CurrencyField` — `NumericFormat` + a ₱ adornment, same convention
    as the Design System page's own "Currency field" showcase) and
    Percentage Share\* (`PercentageField` — `NumericFormat` clamped to
    0–100 via `isAllowed`). When Stockholder Type is Corporation, a
    nested **Sub-stockholders** list
    (`subStockholders: CiSubStockholderEntry[]`, identical field set:
    Stockholder Type, Name/Company Name, Amount Subscribed, Amount Paid,
    Percentage Share) renders directly below that one stockholder, with
    its own "Add Sub-stockholder" trigger scoped to that stockholder
    only — same "mutations locate the parent stockholder by id" pattern
    as before (a sibling stockholder's own sub-stockholders are never
    affected), and toggling Stockholder Type away from Corporation only
    hides the Sub-stockholders block without clearing it. "Add
    Stockholder" trigger. (Replaces the earlier
    `isCorporation: 'yes' | 'no'` boolean and the "Major stockholders"
    section title/shape entirely — no production data existed to
    migrate, since this app's state is per-browser `localStorage`.)
- **Location / Facilities section** — its own card (previously a
  sub-section inside Field Investigation), no subtitle, matching a
  reference tool's own card exactly: Type of Construction /
  Description\* (`premisesConstructionDescription`, now `multiline`),
  Area Description\* (`premisesAreaDescription`, now `multiline`),
  "Location Owned or rented? If rented, how much?" as an Owned/Rented
  **checkbox pair** (`CheckboxPairRow`, `locationOwned: 'owned' |
  'rented' | ''` — visually two checkboxes but still mutually exclusive
  under the hood, same single-value-union shape every other either/or
  field in this app uses), "Equipment owned or leased" as an
  Owned/Leased checkbox pair (`equipmentOwned: 'owned' | 'leased' |
  ''`), then a single shared **Description\*** `RichTextField`
  (`facilitiesDescription`) covering both location and equipment detail.
  Replaces the earlier `locationOwnRentDetails`/`equipmentLeasePrice`
  free-text amount fields and the separate `equipmentDescription`
  field — the reference tool has no rent/lease amount field and only
  one shared Description box, not two.
- **Field Investigation as its own card was removed.** Line of Business
  (`businessLineOfBusiness`) — its only remaining field — is shown
  read-only in the info chips header (see "Info chips header" above);
  Authorized Capital Stock, Territory, Regular/Contractual Employees, and
  Owner already moved there too, and Location and facility live in their
  own Location / Facilities card above.
- **Trade Checking section** — subtitled "Customers and suppliers verified
  during the visit.", holding two independent repeatable arrays in order
  — **Customers** first, then **Suppliers**
  (`commercialCustomers`/`commercialSuppliers:
  CiCommercialTradeEntry[]`) — a **new, separate entry type** from the
  Consumer branch's own `CiTradeEntry`, since the Commercial shape is
  company-level rather than Consumer's individual name/address/dealing
  shape. Per-entry fields and layout now match a reference tool's own
  form exactly: Company Name\* (full width), Representative's Name\*/
  Representative's Position\* side by side, Company's Tel No.\*/Local No
  (not required) side by side, Representative's Mobile No./Email Address
  (neither required) side by side, then Transaction Details\*, Payment
  Terms\*, Years of Business Contract\*, and Remarks\* each as its own
  multiline textarea. (Maps to the same underlying
  `CiCommercialTradeEntry` fields as before —
  `companyName`/`contactPerson`/`position`/`telephoneNo`/
  `localExtension`/`mobileNumber`/`email`/`transactionDetails`/
  `paymentTerms`/`yearsOfContract`/`remarks` — only labels, required
  markers, and layout changed, not the data shape.) Add buttons read
  "Add customer"/"Add supplier" (lowercase, matching the reference
  tool). Same add/remove-per-entry UX as every other repeatable section
  in this card.
- **Bank Verification section** — its own card, below Trade Checking, no
  subtitle, repeatable array `commercialBankAccounts:
  CiCommercialBankAccountEntry[]` — a separate, fuller shape from the
  Consumer branch's own `CiBankAccountEntry` (adds Branch, Date Verified,
  Experience, and a bank contact), same reasoning as
  `CiCommercialTradeEntry` being its own type instead of reusing
  `CiTradeEntry`. Fields per entry, matching a reference tool's own form:
  Bank Name\*, Branch\*, then Account No.\*/Account Type\* side by side,
  then Ave. Daily Balance (not required, `CurrencyField`)/Date Verified\*
  (date input) side by side, Experience\*, then Contact Person\*/Contact
  No.\* side by side. "Add Bank" trigger.
- **Comments section** — subtitled "Overall remarks from the investigation.",
  `commentsNotes`, the same shared `RichTextField` field the Consumer
  branch's own Comments section uses (so text typed here survives
  switching to Consumer and back).
- **Additional Documents section** — its own card, below Comments, no
  subtitle beyond "Attach any other supporting documents for this
  investigation.". Repeatable array `commercialDocuments:
  CiCommercialDocumentEntry[]`, an open-ended, officer-labelled
  attachment list distinct from the fixed Document Checklist elsewhere in
  this app — no status/review tracking, just "what is this file" + the
  file itself. Multi-file upload via an always-open dropzone
  (`react-dropzone`, `multiple: true`, same `MultiPhotoDropzone` pattern
  as the Appraisal Report's own Collateral Photo upload) that appends new
  entries on every drop rather than replacing; each uploaded file shows a
  `FileThumbnail` preview, an optional label `TextField`, and a remove
  button. Same "store filename + object URL only, no real
  upload/parsing" convention as every other file field in this app.

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

Once a transcript exists, the upload row shows two actions: **Replace
transcript** (pick a different file; re-runs auto-fill) and **Remove**
(red, trash icon) — clears `transcriptFileName`/`transcriptUploadedAt`
with no replacement file needed, for when an officer wants the transcript
record gone with nothing to put in its place. Remove does not revert the
fields auto-fill already wrote; they stay as regular editable fields.

### CI Report preview

A footer card right after `CiReportCard` (rendered only while the CI
Report is unlocked) reads "View the full formatted report generated from
everything above." with an outlined-navy **Preview Report** button — the
same row shape as Appraisal's "Preview Appraisal Report" and Initial
Credit Checking's result footer. The button is disabled (and the text
asks for a type) until `report.type` is picked. It opens a `maxWidth="md"`
`Dialog` (header: "CI Report" + type and applicant-name pills) containing
`CiReportPreview` (`credit-investigation/ci-report-preview.tsx`) — a
plain, always-expanded, read-only renderer modeled on
`appraisal-report-preview.tsx` (local `SectionCard`/`FieldRow`/
`FactChip` helpers). It never writes state.

- Branches on `report.type` like `CiReportCard`, covering the same
  sections in `COMMERCIAL_SECTION_NAV_ITEMS`/`CONSUMER_SECTION_NAV_ITEMS`
  order, plus each type's header (Commercial info chips + Business
  Profile fields; Consumer info chips + Subject As Of) and the transcript
  filename/upload date + AI Summary.
- Rich-text fields render their stored HTML via `dangerouslySetInnerHTML`
  (same convention as `appraisal-report-view.tsx`); an empty editor
  document shows "—".
- Commercial Trustees vs. Stockholders follows the same
  `resolveCommercialBusinessType()` gate as the form; Commercial header
  values reuse the now-exported `COMMERCIAL_SAMPLE_INFO`.
- Fields on `CiReport` the live form never renders
  (`negativeRecord*`, `recommendation*`, Consumer `suppliers`/
  `customers`) are deliberately not shown.

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

### 2026-10-11 (Consumer form space-saving pass, Trade Checking removed)

- **Removed the Trade Checking card** from the Consumer branch entirely
  — no reference-tool equivalent. Deleted the dead `TradeCheckingSection`
  component and `tradeChecking` from `ConsumerSectionKey`/
  `CONSUMER_SECTION_NAV_ITEMS`. `report.customers`/`suppliers` are
  untouched in the data model, just no longer rendered — Consumer now
  renders 10 cards, not 11.
- **Space-saving pass across the rest of the Consumer form**, matching
  the same pass already done on Commercial: Employment packed
  Employment Status/Employment Type onto one row and Employer
  Address/Tel. No./Email Address onto one row, folded Unionized? into
  the Reg./Contr. Employees row, cut Remarks to single-line (10 rows →
  7); Other Source of Income packed Income Type/Company Name/Owner onto
  one row and Percent Of Share/Remarks onto one row (5 rows → 2); Bank
  Verification packed all 4 fields onto a single row (2 rows → 1).

### 2026-10-11 (Subject As Of restored to header, Residence/Neighborhood layout follow-up)

- **Re-added Subject As Of** as a `RichTextField` comment box, rendered in
  `CiReportCard` directly below Date Inspected (above
  `ConsumerReportSections`) — it had been dropped from the UI entirely in
  the Consumer rebuild below; still bound to the same `report.subjectAsOf`
  field, still written by the transcript auto-fill.
- **Fixed Residence/Neighborhood's layout** in three follow-up passes:
  (1) paired the fields inside each address block two per row instead of
  one full-width field per row; (2) reverted Permanent Address and
  Present Address to stack vertically (one below the other, with a
  divider) rather than side-by-side columns — an intermediate version of
  this rebuild had tried the side-by-side layout, which was explicitly
  rejected; (3) repacked to three fields per row where it fits
  (Province/City/Barangay, then Street Address/Address Type/Length of
  Stay), Landmark/Remarks down to single-line `minRows={1}`, and tighter
  spacing throughout — an explicit "make it more space-saving" pass.

### 2026-10-11 (Consumer CI Report rebuilt to match Commercial's plain-card pattern)

- **Moved all Consumer section bodies into their own file**,
  `ci-report-consumer-sections.tsx`, mirroring Commercial's own
  `ci-report-commercial-sections.tsx` — `ci-report-card.tsx` no longer
  holds any Consumer section JSX directly, only the shared transcript
  upload/AI Summary row, the type toggle, and per-type wiring.
- **Dropped `CollapsibleSection` from Consumer** — all 11 sections are
  now plain always-visible `adminCardSx` cards, same as Commercial.
- **Added a FactChip info-chips header** (`ConsumerInfoHeader`, reusing
  Commercial's own `FactChip`/`FactChipRow` grid) above the transcript
  row: Applicant Name, Residence Address, Tel./Mobile/Email (sample
  placeholders), Business/Work Address, Tel. No./Email (the real
  `employerTelNo`/`employerEmail` fields). Replaces the old plain
  2-box "Residence Address / Business-Work Address" header.
- **Rebuilt Residence/Neighborhood's address fields as structured
  Province/City/Barangay/Street Address/Address Type**, replacing the
  single read-only `residencePermanentAddress` string and the old
  `residenceLeasedType`/`presentLeasedType` radio fields. Backed by a new
  shared `src/utils/ph-address.ts` module (`PROVINCES`, `ZIP_LOCATIONS`,
  `PROVINCE_CITIES`, `barangaysFor()`) — the same sample PH
  province/city/barangay data the onboarding Personal Info step's own
  zip-code lookup already used, extracted there into this shared file
  and extended with Bulacan (Obando, Malolos) and Ilocos Norte (Laoag
  City, Batac) entries so the CI Report's own Province dropdown has
  real options beyond the original 5 provinces. Present Address gets a
  **"Same as Permanent"** checkbox (`presentSameAsPermanent`) instead of
  the old always-shown "PRESENT ADDRESS (if different)" sub-block; the
  old free-text `presentAddress` field was removed.
- **Rewrote Other Source of Income's fields** to match a reference
  tool's own form: Income Type (select), Company Name, Owner, Percent Of
  Share (0–100), Remarks — replaces the old Source/Monthly
  Amount/Remarks shape entirely (`CiIncomeSourceEntry`'s fields changed;
  no production data existed to migrate, same reasoning as the
  Commercial Stockholders rework).
- **Split "Investigation Findings / Observations" into separate
  cards** — Health and Habits, Comments — each its own card now;
  the Preliminary Recommendation select/notes were dropped from the UI
  entirely (no reference-tool equivalent) — the underlying
  `recommendation`/`recommendationNotes` fields are untouched in the data
  model, just no longer rendered. Subject As Of was relocated, not
  dropped — see the follow-up History entry below.
- **Moved Bank Verification out of Financial Information into its own
  card**, below Loan Purpose.
- **Added a new Additional Documents card** at the very end — multi-file
  upload via an always-open dropzone (same pattern as Commercial's own
  Additional Documents card), new `consumerDocuments:
  CiConsumerDocumentEntry[]` field.
- **Moved the transcript upload row + AI Summary to render once, shared,
  above both type branches** — previously Commercial rendered its info
  chips header before the transcript row; now the transcript row is
  always the very first thing under the title/type toggle for both
  report types.

### 2026-10-11 (Trade Checking fields matched to reference form)

- **Rewrote the Customer/Supplier entry form** in Trade Checking to match
  a reference tool's own layout and labels exactly: Company Name\* (full
  width), Representative's Name\*/Representative's Position\* side by
  side, Company's Tel No.\*/Local No (not required) side by side,
  Representative's Mobile No./Email Address (neither required) side by
  side, then Transaction Details\*, Payment Terms\*, Years of Business
  Contract\*, Remarks\* each as its own multiline textarea. No data-shape
  change — same `CiCommercialTradeEntry` fields, only labels/required
  markers/layout updated.

### 2026-10-11 (Field Investigation removed, Commercial form compacted, document preview fix)

- **Removed the Field Investigation card** from the Commercial branch —
  its only remaining field, Line of Business, was already shown
  read-only in the info chips header, making the card redundant. Dropped
  `fieldInvestigation` from `CommercialSectionKey`,
  `COMMERCIAL_SECTION_NAV_ITEMS`, and `CiReportCard`'s
  `commercialExpanded` state.
- **Compacted spacing across the whole Commercial form** — tighter card
  padding/gaps (`p: 2` → `1.5`, `spacing={1.5}`/`{2.5}` → `{1.25}`/
  `{1.75}` throughout), and grouped several previously one-field-per-row
  fields into 2–3 column rows: Management's Name/Current Title/
  Nationality, Educational Attainment/Other Business Affiliations,
  Residence Address/Spouse-Partner; Stockholders' Stockholder Type/Name;
  Trade Checking's Mobile/Email/Telephone/Local-ext.; Bank Verification's
  Bank Name/Branch and Experience/Contact Person/Contact No.; Location /
  Facilities' two description fields and two checkbox pairs side by side.
- **Fixed Additional Documents not previewing image uploads** —
  `FileThumbnail` infers file type from an extension on the file's own
  URL, but `commercialDocuments` stores a `blob:` object URL with no
  extension, so it always fell back to a generic file icon. Now checks
  `entry.fileName`'s own extension (`isImageFile()`) and renders a direct
  `<img>` preview for image files, `FileThumbnail` (by filename, so
  format detection still works) for everything else.

### 2026-10-11 (Bank Verification + Additional Documents cards)

- **Added a new Bank Verification card** to the Commercial branch, between
  Trade Checking and Comments — repeatable `commercialBankAccounts:
  CiCommercialBankAccountEntry[]` (Bank Name, Branch, Account No., Account
  Type, Ave. Daily Balance (not required), Date Verified, Experience,
  Contact Person, Contact No.), matching a reference tool's own form.
- **Added a new Additional Documents card**, below Comments (end of the
  Commercial sections) — repeatable `commercialDocuments:
  CiCommercialDocumentEntry[]`, multi-file upload via an always-open
  dropzone that appends on every drop (same pattern as the Appraisal
  Report's Collateral Photo upload), with a `FileThumbnail` preview and
  optional label per file.
- Added `bankVerification`/`additionalDocuments` to `CommercialSectionKey`
  and `COMMERCIAL_SECTION_NAV_ITEMS`, and to `CiReportCard`'s
  `commercialExpanded` state.

### 2026-10-11 (Business-type-conditional Trustees/Stockholders, Location / Facilities card)

- **Replaced the fixed "Major stockholders" section with a
  business-type-conditional card**: Board of Trustees (Cooperative) or
  Stockholders (Corporation/Partnership), picked by
  `resolveCommercialBusinessType()` — the card's own `businessTypeOverride`
  (set via a new "⋮" `BusinessTypeMenu` in the Management and Ownership
  header) if present, else `financialInfo.businessType` from the
  application. Sole Proprietorship / unset shows neither, with a prompt.
- Added `CiTrusteeEntry` (Full Name, Position, Birthdate) and a new
  `trustees: CiTrusteeEntry[]` field.
- Reworked `CiStockholderEntry`/`CiSubStockholderEntry`: replaced
  `isCorporation: 'yes' | 'no'` with `stockholderType: 'individual' |
  'corporation' | ''`; renamed `stockholderName` to `name` (label swaps
  to "Company Name" when the type is Corporation); added
  `percentageShare` to both; `CiSubStockholderEntry` also gained its own
  `stockholderType` (previously sub-stockholders had no type at all).
  Amount Subscribed/Paid are now `CurrencyField` (₱-prefixed
  `NumericFormat`), Percentage Share a `PercentageField` (0–100 clamped
  `NumericFormat`).
- **Added a new Location / Facilities card**, its own section (between
  Management and Ownership and Field Investigation), moved out of Field
  Investigation entirely. Construction/Area Description are now
  `multiline`; "Location owned?"/"Equipment owned?" `RadioRow`s became
  `CheckboxPairRow`s (Owned/Rented, Owned/Leased); dropped
  `locationOwnRentDetails`/`equipmentLeasePrice`/`equipmentDescription`
  in favor of one new shared `facilitiesDescription` `RichTextField`.
- No real `CiReport` data existed to migrate for any of the above — this
  app's state is per-browser `localStorage`, same reasoning every prior
  Commercial CI Report change has relied on.

### 2026-10-11 (Management field layout + section order)

- **Management and Ownership moved above Field Investigation** — now the
  first Commercial section (was third, after Trade Checking). Updated
  `COMMERCIAL_SECTION_NAV_ITEMS` to match, so the sticky left nav lists
  it first too.
- **Rewrote the Management entry form** to match a reference tool
  exactly: one field per line (Name\*, Current Title\*/Nationality\*,
  Educational Attainment\*, Other Business Affiliations, Residence
  Address\*, Birthday\*/Place of Birth\*, Spouse / Partner, Mobile
  Number\*/Tax Identification Number\*) in place of the previous
  3-column "Personal"/"Position and Business"/"Identification and
  Contact" grouped layout. No `CiManagementEntry` field was added or
  removed — only the order, grouping, labels (Current Title, Residence
  Address, Tax Identification Number replace the previous Job title,
  Home address, TIN wording), and required-asterisk markers changed.
  Exported `requiredLabel()` from `ci-report-card.tsx` so this file could
  reuse it instead of re-implementing the same red-asterisk helper.

### 2026-10-07 (Commercial sections made non-collapsible)

- **Field Investigation, Trade Checking, Management and Ownership, and
  Comments are no longer `CollapsibleSection`s for Commercial** — each is
  now a plain `adminCardSx` box with a title/subtitle header, always
  fully visible, no chevron, no collapse/expand. Consumer's own 8
  sections are unaffected and still use `CollapsibleSection`.
- `expandedSections`/`onToggleSection` still exist as props on
  `CommercialReportSections`, and `CiReportCard` still maintains
  `commercialExpanded`/`handleToggleCommercialSection` state and threads
  them through — deliberately left in place as unused rather than torn
  out, in case collapsibility is wanted back later.
- The sticky left nav (`CiSectionNav`) still works for Commercial —
  clicking a section still smooth-scrolls to it; there's just nothing
  left to expand once there, since every section is already visible.

### 2026-10-07 (info-chips/fillable-fields follow-up, transcript Remove)

- Moved **Line of Business** from the fillable-fields section into the
  `FactChip` info header (now a 3-chip final segment: Registration Date,
  Negative Records, Line of Business — all read-only, Line of Business
  still reads `report.businessLineOfBusiness`).
- Converted the 6 remaining fillable fields (Authorized Capital Stock,
  Territory, Regular Employees, Contractual Employees, Owner, Date
  Inspected) from the bordered-gray-card `InfoChipFieldRow` layout to a
  plain label-above-input layout, matching every other grouped field in
  this card — no gray box. Deleted the now-unused `InfoChipRow`/
  `InfoChipFieldRow` components; added a `requiredLabel()` helper that
  embeds this app's standard red asterisk span into a `TextField`
  `label`, replacing MUI's own `required` prop (which renders an
  unstyled default asterisk).
- Fixed stray/doubled divider lines in the `FactChip` grid: added a
  per-chip `edge={{ right, bottom }}` prop so a chip on the strip's own
  outer edge skips its divider on that side instead of drawing it right
  on top of the segment's own border.
- **Transcript upload row:** added a "Remove" action (red, trash icon,
  shown only once a transcript exists) that clears
  `transcriptFileName`/`transcriptUploadedAt` without needing a
  replacement file — previously the only way to clear a transcript was
  to upload a different file over it ("Replace transcript"), with no way
  to delete one outright. Does not revert fields auto-fill already
  wrote; those stay as regular editable fields the officer may have
  built on since.

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
