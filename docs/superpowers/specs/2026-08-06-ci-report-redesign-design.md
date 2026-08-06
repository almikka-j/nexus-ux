# CI Report Redesign — Design Spec

**Date:** 2026-08-06
**Status:** Draft — pending approval

## Summary

Replace `CiReportCard`'s current 5-section CI Report (Site Visit Details,
Borrower/Residence Verification, Neighborhood Check, Findings & Assessment,
Recommendation) with a much more detailed ~15-section report, matching a
reference screenshot of an older CI Report design. The new report is
rebuilt on this app's design system (`adminCardSx`, `outlinedNavyButtonSx`,
existing field-label conventions) rather than reusing the reference's own
styling. A companion change adds a real **Comaker** section to Call Report
(section 12, alongside the existing 11), since the reference CI Report's
Comaker section reads comaker data that must be entered somewhere upstream
— and the user specified Call Report as that source.

## Goals

- Replace the CI Report's data model and UI with the fuller structure below.
- Pre-fill whatever the report can from data the borrower/officer already
  entered earlier in the pipeline (application data, Call Report), so the
  officer isn't re-typing information the system already has.
- Keep the existing transcript-upload auto-fill mechanism
  (`buildTranscriptAutoFill`), extended to populate the new fields it can
  plausibly infer.
- Add real rich-text editing (bold/italic/bulleted and numbered lists) for
  the narrative sections that need it, as a small reusable component.
- Add array-based sub-sections (Children, Trade Checking Suppliers/
  Customers, Other Source of Income, Bank Verification) using the same
  entry-array pattern Call Report's Collateral Information already uses.
- Add a Comaker section to Call Report (new, structured, array-based) and
  have CI Report's Comaker section display that data read-only.

## Non-goals

- **Preview Report** (a read-only/print-style summary view) — reference
  screenshot has a "Preview Report" button; out of scope for this pass.
- **Additional Documents upload inside CI Report** — Credit Investigation's
  page already has its own Additional Documents upload section
  (`credit-investigation-view.tsx`); the reference screenshot's own
  "Additional Documents" upload box at the bottom is not duplicated inside
  `CiReportCard`.
- Any change to the CI Fee card, Document Checklist, or the rest of
  `credit-investigation-view.tsx` outside `CiReportCard` itself.
- Any change to the Proceed/Disapprove/Return-to-AMD decision flow.

## Data model changes

### 1. New shared rich-text component

New file `src/components/rich-text-field/rich-text-field.tsx`, exported via
`src/components/rich-text-field/index.ts` (matching this codebase's
component-folder convention, e.g. `src/components/custom-dialog/`).

- New dependencies: `@tiptap/react`, `@tiptap/starter-kit` (no rich-text
  library exists in this project today — this is the only new runtime
  dependency this spec introduces).
- `RichTextField({ label, value, onChange, placeholder })`: a bordered box
  matching `fieldSx`'s rounded-border look, with a small toolbar (Bold,
  Italic, bullet list, numbered list — same 4 controls the reference
  screenshot's editors show) above a Tiptap `EditorContent` area.
- Value stored as an HTML string (Tiptap's default serialization) on the
  `CiReport` type — simplest persistence path, consistent with how the rest
  of this app stores everything as plain strings in `AdminContext`.
- Used for: Subject As Of, Spouse (narrative portion), Assets, Negative
  Record (remarks), Health and Habits, Comments.

### 2. `CiReport` type — full replacement

Replace the current `CiReport` type (`src/auth/admin-context.tsx`) with:

```ts
export type CiChildEntry = {
  id: string;
  name: string;
  age: string;
  occupationOrSchool: string;
};

export type CiTradeEntry = {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  natureOfDealing: string;
  yearsOfDealing: string;
};

export type CiIncomeSourceEntry = {
  id: string;
  source: string;
  monthlyAmount: string;
  remarks: string;
};

export type CiBankAccountEntry = {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  averageMonthlyBalance: string;
};

export type CiReport = {
  // Site visit
  visitDate: string; // "Date Inspected"
  subjectAsOf: string; // rich text (HTML)

  // Spouse — narrative, pre-filled with a scaffold from
  // application.personalInfo.spouse* when civilStatus === 'Married'
  spouseNotes: string; // rich text (HTML)

  // Children
  children: CiChildEntry[];

  // Residence/Neighborhood
  residencePermanentAddress: string; // read-only, from personalInfo
  residenceLeasedType: 'owned' | 'leased' | 'rent-free' | '';
  residenceLengthOfStay: string;
  residenceLandmark: string;
  residenceRemarks: string;
  presentAddress: string;
  presentLeasedType: 'owned' | 'leased' | 'rent-free' | '';
  presentLengthOfStay: string;
  presentLandmark: string;
  presentRemarks: string;

  // Employment
  employmentStatus: string; // pre-filled from financialInfo.employmentStatus
  employmentType: 'direct' | 'agency' | 'self-employed' | '';
  employerName: string;
  position: string;
  employerAddress: string;
  employerTelNo: string;
  employerEmail: string;
  salary: string;
  annualIncome: string;
  lengthOfService: string;
  numberOfRegEmployees: string;
  numberOfContrEmployees: string;
  isUnionized: 'yes' | 'no' | '';
  secDtiRegNo: string;
  secDtiRegDate: string;
  secDtiExpDate: string;
  employmentRemarks: string;

  // Trade Checking
  suppliers: CiTradeEntry[];
  customers: CiTradeEntry[];

  // Assets
  assetsNotes: string; // rich text (HTML)

  // Other Source of Income
  otherIncomeSources: CiIncomeSourceEntry[];

  // Loan Purpose — pre-filled from financialInfo.loanPurpose
  loanPurposeNotes: string; // rich text (HTML)

  // Bank Verification
  bankAccounts: CiBankAccountEntry[];

  // Negative Record
  negativeRecordSourceNote: string; // fixed disclosure line, not user-edited
  negativeRecordFinding: 'no-negative-findings-both-cmap-nfis' | 'negative-findings-found' | '';
  negativeRecordRemarks: string; // rich text (HTML)

  // Comaker — read-only here, sourced from review.callReport.comakers
  // (no local fields; rendered directly from Call Report data)

  // Health and Habits
  healthAndHabitsNotes: string; // rich text (HTML)

  // Comments
  commentsNotes: string; // rich text (HTML)

  // Recommendation (kept from the current model — still needed to drive
  // buildCreditInvestigationSummary / the rest of the Credit Investigation
  // page, which reads report.recommendation today)
  recommendation: 'proceed-as-requested' | 'proceed-with-conditions' | 'needs-additional-verification' | '';
  recommendationNotes: string;

  // Transcript (kept from current model)
  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};
```

Notes:
- `visitTime`, `visitLocation`, `visitingOfficer`, `identityConfirmed`,
  `residenceConfirmed`, `businessConfirmed`, `neighborhoodFeedback`,
  `neighborhoodStanding`, `findings` are **removed** — the reference
  screenshot has no equivalent "Site Visit Details"/"Borrower/Residence
  Verification"/"Neighborhood Check"/"Findings & Assessment" grouping; that
  information is now covered by Subject As Of, Residence/Neighborhood, and
  Employment instead. Verified: every one of these fields (plus
  `report.recommendation`/`recommendationNotes`) is read **only** inside
  `ci-report-card.tsx` itself — `credit-investigation-risk.ts`'s
  `buildCreditInvestigationSummary` reads solely from the Document
  Checklist (`fixedDocs`/`docMeta`), not from `report` at all — so this
  removal has zero external blast radius. `recommendation`/
  `recommendationNotes` are kept anyway (see UI section 17) since they're
  still meaningful fields, not because anything downstream depends on them.
- `createInitialCreditInvestigation()`'s `report` default needs a matching
  full rewrite (all strings `''`, all arrays `[]`).

### 3. `CallReport` — add Comaker (new section 12)

```ts
export type CiComakerEntry = {
  id: string;
  name: string;
  relationshipToBorrower: string;
  address: string;
  contactNumber: string;
  occupation: string;
  monthlyIncome: string;
};
```

Add to `CallReport`:
```ts
// 12. Comaker
comakers: CiComakerEntry[];
```

Add to `AdminContextValue`:
```ts
addComakerEntry: () => void;
updateComakerEntry: (id: string, data: Partial<CiComakerEntry>) => void;
removeComakerEntry: (id: string) => void;
```

Implemented exactly like `addCollateralEntry`/`updateCollateralEntry`/
`removeCollateralEntry` (same `setState` shape, targeting
`review.callReport.comakers` instead of `.collateralEntries`).

New UI: `src/sections/admin/call-report/comaker-information-card.tsx`,
mounted as card 12 in `call-report-view.tsx`'s section list, styled exactly
like `CollateralInformationCard` (title/subtitle, per-entry bordered box
with a "Comaker N" chip + Remove button, "Add Another Comaker" trigger) —
no conditional gate (unlike Collateral's `collateralOffered` radio), since
having zero comakers is a valid, common end state and doesn't need an
explicit yes/no first.

`docs/ADMIN_CALL_REPORT.md` needs a new numbered-section entry (12.
Comaker) added to its section list.

## CI Report UI — section-by-section

`CiReportCard` (`src/sections/admin/credit-investigation/ci-report-card.tsx`)
keeps its outer card shell (`adminCardSx`, title "CI Report", subtitle,
transcript-upload row, AI Summary box — all unchanged) and replaces
everything from the current `<Stack spacing={2.5}>` downward.

1. **Header block** (read-only, blue-bordered like the reference's
   two-column address block, adapted to `adminCardSx`'s palette instead of
   navy-on-white): Residence Address + Business/Work Address side by side
   on `sm`+, stacked on `xs`. Sourced entirely from
   `application.personalInfo`/`financialInfo` — never edited here. If
   `financialInfo?.employmentStatus !== 'Business Owner'`, the
   Business/Work Address column reads "Not applicable" instead of blank.
2. **Date Inspected** — single date field (`report.visitDate`).
3. **Subject As Of** — `RichTextField`.
4. **Spouse** — `RichTextField`, pre-filled once (not re-fired on every
   render) with a plain-text scaffold built from
   `personalInfo.spouseFirstName/spouseLastName/spouseBirthday` when
   `civilStatus === 'Married'`; empty otherwise. Officer edits freely
   afterward — this is a starting point, not a locked value.
5. **Children** — array section (`CiChildEntry[]`), same
   add/remove-per-entry pattern as Collateral. Fields: Name, Age,
   Occupation/School.
6. **Residence/Neighborhood** — structured fields in a bordered box with a
   pencil-edit affordance (matches the reference's small edit icon):
   Permanent address (read-only, from `personalInfo`), Leased type, Length
   of stay, Landmark, Remarks; then Present address, Leased type, Length of
   stay, Landmark, Remarks (mirrors permanent-address fields, for when the
   applicant's present residence differs from their address on file).
7. **Employment** — structured fields in a bordered box, same edit-icon
   affordance. `employmentStatus` pre-filled read-only from
   `financialInfo.employmentStatus`; the rest (`employmentType` through
   `employmentRemarks`) officer-entered/transcript-filled.
8. **Trade Checking** — two array sub-sections, **Suppliers** and
   **Customers**, each its own `CiTradeEntry[]` with its own "Add Supplier"
   / "Add Customer" trigger (matches the reference showing them as two
   independent lists under one section heading).
9. **Assets** — `RichTextField`.
10. **Other Source of Income** — array section (`CiIncomeSourceEntry[]`).
11. **Loan Purpose (required)** — `RichTextField`, pre-filled once from
    `financialInfo.loanPurpose` if present, editable afterward. Marked
    required (reference shows "(REQUIRED)" in the header) — validation:
    the existing Credit Investigation "Proceed" gate does not currently
    check CI Report field completeness at all (only Document
    Checklist/CI Fee gate it), so this spec does **not** add new blocking
    validation; "(REQUIRED)" is a label/expectation only, matching how the
    rest of this app treats required-but-unenforced fields (see e.g.
    Call Report's own free-text fields).
12. **Bank Verification** — array section (`CiBankAccountEntry[]`).
13. **Negative Record** — a fixed, non-editable disclosure line
    (`negativeRecordSourceNote`, hardcoded copy: "Source of information:
    BAP Credit Bureau / CMAP report on accounts under watch lists,
    cancelled credit cards, adverse classified loan file, closed current
    account and court case file as of [visitDate]"), then a
    borrower-name-plus-finding row rendering the applicant's own name
    (from `signUpData`) beside a `RadioRow` for `negativeRecordFinding`
    ("No negative findings both CMAP & NFIS" / "Negative findings found" —
    matching the reference's exact wording rather than a generic
    paraphrase), then a `RichTextField` for Remarks.
14. **Comaker** — read-only, sourced from `review.callReport.comakers`.
    Renders each comaker as a compact read-only row (name, relationship,
    address, contact) inside a bordered box, same visual language as
    `ReadOnlyRequirementDocRow`. If `comakers.length === 0`: display
    "No data found. Please add comaker information on Call Report." (same
    message as the reference, pointed at this app's actual Call Report
    page instead of a generic "profile").
15. **Health and Habits** — `RichTextField`.
16. **Comments** — `RichTextField`.
17. **Recommendation** — kept from the current CI Report, unchanged
    (`recommendation` select + `recommendationNotes` text field), placed
    last, matching its current position and its role driving the page's
    risk/summary logic.

## Auto-fill (transcript upload)

`buildTranscriptAutoFill` (`credit-investigation-transcript.ts`) is
extended to also return values for the fields the deterministic
positive/negative branches can plausibly cover: `residenceLeasedType`,
`residenceLengthOfStay`, `presentAddress`-equals-permanent-when-positive,
`employmentType`, `lengthOfService`, `negativeRecordFinding`, and a
`findingsNarrative` string reused across Subject As Of / Assets / Health
and Habits' rich-text defaults (assigned as plain-text HTML, e.g.
`<p>...</p>`, since `RichTextField` stores HTML). The header block, Loan
Purpose, and Comaker are **not** touched by transcript auto-fill — they're
sourced from application data / Call Report, and a transcript re-upload
should not clobber those.

## Pre-fill vs. blank on first open

Confirmed with the user: fields with a clear source in existing data
(header block, Spouse scaffold, Employment status, Loan Purpose) pre-fill
immediately on first render, before any transcript is uploaded. Everything
else starts blank until the officer types something or uploads a
transcript. Pre-fill only fires once (e.g. via a `useEffect` keyed on
whether the target field is still at its default empty value) — it must
never overwrite an officer's own edit on a later re-render.

## Testing

No test suite exists in this codebase to extend (confirm during
implementation) — verification is via `tsc --noEmit`, `eslint`, and manual
click-through matching this app's existing convention for prior CI
Investigation work in this session.

## Open questions for implementation

- Exact styling of the read-only header address block (reference uses a
  literal blue/white two-tone box) — implementation should adapt this to
  `adminCardSx`'s established sub-card tokens (`#F9FAFC`/`#EEF0F5`, or
  `TONE_COLORS.info` if a tint is wanted) rather than copy the reference's
  raw colors, consistent with how every other CI Fee/CI Report sub-box in
  this session was adapted rather than pixel-copied.
