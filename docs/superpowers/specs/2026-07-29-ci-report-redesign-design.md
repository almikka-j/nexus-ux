# CI Report redesign — design spec

Date: 2026-07-29

## Context

`CiReportCard` (`src/sections/admin/credit-investigation/ci-report-card.tsx`) is
the last card in Credit Investigation's flow, currently a flat 5-section form:
Site Visit Details, Borrower/Residence Verification, Neighborhood Check,
Findings & Assessment, Recommendation.

The user shared a screenshot of PG Finance's actual printed CI report form,
which is far richer — Date Inspected/Subject As Of, Spouse, Children,
Residence/Neighborhood, Employment, Trade Checking (Suppliers/Customers),
Assets, Other Source of Income, Loan Purpose, Bank Verification, Negative
Record, Comaker, Health and Habits, Comments, Additional Documents — and asked
for a version that captures the needed fields with better UX, styled with this
app's existing design system rather than the plain print layout.

Decisions confirmed with the user:
- **Full rebuild**, not a restyle — replace `CiReportCard`'s fields with the
  complete field set from the screenshot.
- **Auto-pull read-only** for data that already exists elsewhere in the app
  (residence, spouse, loan purpose, negative record), with a link back to the
  source instead of re-entering it.
- **Section order**: Date Inspected/Subject As Of → Spouse → Children →
  Residence/Neighborhood → Employment → Trade Checking → Assets → Other
  Source of Income → Loan Purpose → Bank Verification → Negative Record →
  Comaker → Health and Habits → Comments → Additional Documents →
  Recommendation.
- **Layout**: each major section is its own collapsible sub-block inside the
  CI Report card (same visual pattern as `NegativeCreditReportCard`'s
  `SpecialSection`), collapsed by default, so a 16-section card stays
  scannable instead of one long scroll.
- **Completion badge** on the CI Report card header (e.g. "9/16 sections
  filled"), same badge pattern as Document Checklist.

## Non-goals

- No changes to Document Checklist, CI Fee, AI review/summary, or the
  Proceed/Disapprove/Return to AMD decision card — only `CiReportCard` and its
  backing `CiReport` state change.
- No changes to the transcript upload/auto-fill mechanism's existence — it
  still exists, but its auto-fill payload must grow to cover the new fields
  it can plausibly fill (see below). No real parsing/AI — still deterministic
  canned content, same convention as today.
- Not rebuilding `NegativeCreditReport` — Negative Record in the new CI
  Report only reads and links to it, never duplicates or edits its fields.
- No PDF/print export of the report (the screenshot's layout was a printed
  artifact of a different, non-web system) — this stays a web form.

## Data model changes

All changes are in `src/auth/admin-context.tsx`. `CiReport` grows from 14
flat fields to a much larger structured shape. New sub-types and list-entry
types are added, following the existing `NegativeReportEntry` +
`addNegativeReportEntry`/`updateNegativeReportEntry`/`removeNegativeReportEntry`
pattern for every repeatable list.

```ts
// Existing types reused as-is, referenced below:
// MembershipStanding = 'good-standing' | 'with-concern' | 'not-verified'

export type CiChildEntry = {
  id: string;
  name: string;
  age: string;
  notes: string;
};

export type CiIncomeSourceEntry = {
  id: string;
  source: string;
  monthlyAmount: string;
  notes: string;
};

export type CiTradeEntry = {
  id: string;
  name: string; // supplier or customer name
  relationshipLength: string;
  findings: string;
};

export type CiBankAccountEntry = {
  id: string;
  bankName: string;
  accountType: string;
  accountStanding: MembershipStanding | '';
  remarks: string;
};

export type CiTradeListKey = 'tradeSuppliers' | 'tradeCustomers';

export type CiComaker = {
  onFile: boolean;
  name: string;
  relationship: string;
  address: string;
  notes: string;
};

export type CiReport = {
  // Date Inspected / Subject As Of (replaces visitDate/visitTime/visitLocation)
  dateInspected: string;
  subjectAsOf: string;

  // Spouse — read-only display computed from PersonalInfo at render time,
  // NOT stored here. (No new fields.)

  // Children — new, repeatable
  children: CiChildEntry[];

  // Residence/Neighborhood — permanent address is read-only from
  // PersonalInfo; these are the new editable fields, split present/permanent
  residencePermanentLeasedType: string;
  residencePermanentLengthOfStay: string;
  residencePermanentLandmark: string;
  residencePermanentRemarks: string;
  residencePresentAddress: string;
  residencePresentLeasedType: string;
  residencePresentLengthOfStay: string;
  residencePresentLandmark: string;
  residencePresentRemarks: string;

  // Employment — employmentStatus comes from FinancialInfo read-only;
  // these are the new editable fields
  employmentType: string; // e.g. Direct, Self-Employed
  employerName: string;
  position: string;
  employerAddress: string;
  employerTelNo: string;
  employerEmail: string;
  salary: string;
  annualIncome: string;
  lengthOfService: string;
  noRegularEmployees: string;
  noContractualEmployees: string;
  unionized: 'yes' | 'no' | '';
  secDtiRegDate: string;
  secDtiExpDate: string;
  employmentRemarks: string;

  // Trade Checking
  tradeSuppliers: CiTradeEntry[];
  tradeCustomers: CiTradeEntry[];

  // Assets
  assets: string;

  // Other Source of Income
  otherIncomeSources: CiIncomeSourceEntry[];

  // Loan Purpose — read-only from FinancialInfo.loanPurpose, no new field

  // Bank Verification
  bankAccounts: CiBankAccountEntry[];

  // Negative Record — read-only summary from NegativeCreditReport;
  // this is the only new editable field in that section
  negativeRecordRemarks: string;

  // Comaker
  comaker: CiComaker;

  // Health and Habits
  healthAndHabits: string;

  // Comments (renamed from `findings`)
  comments: string;

  // Additional Documents — reuses CreditInvestigationDoc[] pattern via a new
  // dedicated list on CreditInvestigation (see below), not stored on CiReport

  // Recommendation (unchanged)
  recommendation: PreliminaryRecommendation | '';
  recommendationNotes: string;

  // Transcript upload (unchanged)
  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};
```

Removed from `CiReport`: `visitDate`, `visitTime`, `visitLocation`,
`visitingOfficer`, `identityConfirmed`, `residenceConfirmed`,
`businessConfirmed`, `neighborhoodFeedback`, `neighborhoodStanding`,
`findings`. (`visitingOfficer`/identity-residence-business confirmation
booleans are dropped — the officer identity is already known from
`adminUser`, and confirmation is superseded by the richer
Residence/Employment sections. `findings` is renamed `comments`.
`neighborhoodFeedback`/`neighborhoodStanding` are dropped as a distinct
section — landmark/remarks on Residence now covers neighborhood context,
consistent with the screenshot which has no separate neighborhood block.)

**Additional Documents**: adds `additionalDocuments: CreditInvestigationDoc[]`
directly to `CreditInvestigation` (sibling to the existing `documents` array),
reusing the existing `CreditInvestigationDoc` type and upload-row component
rather than inventing a new document shape.

**New context actions** on `AdminContextValue`, mirroring the existing
`setCiReport`/`addNegativeReportEntry` pattern exactly:
- `setCiReport(data: Partial<CiReport>)` — unchanged signature, now covers
  the larger shape.
- Two separate function pairs, not one generic-over-heterogeneous-shapes
  helper (a single `CiListKey`-keyed generic can't stay type-safe across
  `CiChildEntry`/`CiIncomeSourceEntry`/`CiTradeEntry`/`CiBankAccountEntry`,
  which have different fields):
  - `addCiTradeEntry(listKey: 'tradeSuppliers' | 'tradeCustomers')`,
    `updateCiTradeEntry(listKey, id, data: Partial<CiTradeEntry>)`,
    `removeCiTradeEntry(listKey, id)` — covers the two same-shaped trade
    lists, mirroring `NegativeReportEntryListKey`'s pattern exactly.
  - Four single-purpose triples for the remaining, differently-shaped lists:
    `addCiChild`/`updateCiChild`/`removeCiChild`,
    `addCiIncomeSource`/`updateCiIncomeSource`/`removeCiIncomeSource`,
    `addCiBankAccount`/`updateCiBankAccount`/`removeCiBankAccount`. Each
    triple follows the same add/update/remove shape as
    `addNegativeReportEntry` but is typed to its own entry shape rather than
    sharing one generic across incompatible types.
  - `CiListKey` (as a type covering all five keys) is dropped — it implied a
    single generic handler that the type differences above make unsafe.
- `setCiComaker(data: Partial<CiComaker>)` — single-object patch, same
  pattern as `setCiReport`.
- `addCiAdditionalDocument`, `removeCiAdditionalDocument` — mirrors the
  existing `addCreditInvestigationDocument`/`removeCreditInvestigationDocument`
  pair already used for the Document Checklist's custom docs, applied to the
  new `additionalDocuments` array.

## Component structure

`ci-report-card.tsx` becomes a thin shell: header, transcript upload, AI
summary (unchanged), then renders an ordered list of new sub-section
components, each collapsible, each living in its own file under
`src/sections/admin/credit-investigation/ci-report-sections/`:

1. `ci-report-inspection-section.tsx` — Date Inspected + Subject As Of (not
   collapsible — always visible, it's the report's dateline, same treatment
   as a card header field rather than a collapsible block).
2. `ci-report-spouse-section.tsx` — read-only, pulls `signUpData.application
   .personalInfo`. If `civilStatus !== 'Married'`, shows "No spouse on file."
3. `ci-report-children-section.tsx` — `SpecialSection`-style list.
4. `ci-report-residence-section.tsx` — permanent address read-only header +
   editable fields for both permanent and present.
5. `ci-report-employment-section.tsx` — read-only `employmentStatus` +
   `loanPurpose` header + editable fields.
6. `ci-report-trade-checking-section.tsx` — two `SpecialSection` lists
   (Suppliers, Customers) side by side under one collapsible header, or
   stacked on narrow screens.
7. `ci-report-assets-section.tsx` — single multiline `TextField`.
8. `ci-report-other-income-section.tsx` — `SpecialSection` list.
9. `ci-report-loan-purpose-section.tsx` — read-only, non-collapsible row
   (`FinancialInfo.loanPurpose`) in its confirmed position between Other
   Source of Income and Bank Verification. Not folded into Employment, so
   the rendered order matches the confirmed section order exactly.
10. `ci-report-bank-verification-section.tsx` — `SpecialSection` list.
11. `ci-report-negative-record-section.tsx` — read-only summary card (counts
    per `NegativeReportEntryListKey`, `negativeRecordText` excerpt) + "View
    full Negative Credit Report" button (scrolls to / opens
    `NegativeCreditReportCard` if present on the page, else navigates to
    Initial Credit Checking) + editable `negativeRecordRemarks`.
12. `ci-report-comaker-section.tsx` — toggle "No comaker on file" / filled
    state, same shape as Children but single-entry.
13. `ci-report-health-habits-section.tsx` — single multiline `TextField`.
14. `ci-report-comments-section.tsx` — single multiline `TextField`.
15. `ci-report-additional-documents-section.tsx` — reuses
    `RequirementDocRow`'s custom-document add/upload/remove pattern
    (same as Document Checklist's "Additional Documents" today), against the
    new `additionalDocuments` array.
16. Recommendation — stays inline in `ci-report-card.tsx` (not collapsible),
    since it's the card's concluding decision-support field, same treatment
    as today.

Each collapsible section reuses the exact `SpecialSection` header shape
already defined in `negative-credit-report-card.tsx` (title, description,
`StatusBadge` showing fill-state, chevron) — that component will be
extracted into a shared file (`src/components/admin-ui/collapsible-subsection.tsx`)
so both `NegativeCreditReportCard` and the new CI Report sections import the
same implementation instead of two copies. List-only sections (Children,
Trade Checking, Other Income, Bank Verification) use it exactly as
`SpecialSection` does today (badge = "N added"/"None added"). Free-text and
structured-field sections (Residence, Employment, Assets, Health & Habits,
Comments, Comaker) use the same shell but with badge = "Filled"/"Empty" based
on whether any field in that section is non-blank.

The top-level `CI Report` `CollapsibleSection` header badge counts fill-state
across the 12 collapsible sub-sections only (Spouse, Children, Residence,
Employment, Trade Checking, Assets, Other Income, Bank Verification,
Negative Record, Comaker, Health & Habits, Comments) — how many have at
least one non-blank field, or for list sections, at least one entry — e.g.
"7/12 sections filled." The three always-visible rows (Date Inspected/Subject
As Of, Loan Purpose, Recommendation) and Additional Documents are excluded
from this count: the first three aren't collapsible sections to begin with,
and Additional Documents already has its own file-count display, same as
Document Checklist's separate badge — computed at render time
in `ci-report-card.tsx`, not stored.

## Read-only "pulled from application" fields

Spouse, permanent residence address, employment status, and Loan Purpose are
rendered read-only using the same compact label/value row style already used
in `ApplicationDetailsCard` (label in `#8891A6` 11.5px, value in `#14172A`
13.5px/600). Each read-only block gets a small "Sourced from application" or
"Sourced from Negative Credit Report" caption plus (where applicable, e.g.
Negative Record) a text button linking back to the source section, rather
than a plain static dump — so the officer always knows why a field isn't
editable here and where to change it if it's wrong.

## Transcript auto-fill

`buildTranscriptAutoFill()` (`credit-investigation-transcript.ts`) is
extended to also populate `dateInspected`, `subjectAsOf`, `assets`,
`healthAndHabits`, and `comments` with deterministic template content
(same hash-seeded technique as today), since those are the fields a real
site-visit transcript would plausibly speak to. Fields sourced from other
parts of the app (Spouse, Residence permanent address, Employment status,
Loan Purpose) and fields requiring structured list entry (Children, Trade
Checking, Other Income, Bank Verification, Comaker, Additional Documents,
Negative Record) are NOT touched by auto-fill — those stay manually entered,
consistent with "auto-fill is a convenience for free-text/date fields only,"
not a substitute for structured data entry.

## Documentation updates

Per this project's standing rule, the following get updated alongside the
implementation (not deferred):
- `docs/ADMIN_CREDIT_INVESTIGATION.md` — rewrite the "CI Report" section to
  describe the new 16-section structure, the read-only/editable split, and
  the extended transcript auto-fill scope.
- `PROJECT_OVERVIEW.md` — update the `CreditInvestigation`/`CiReport` data
  model summary to match the new shape.

## Testing

No committed automated test suite for admin views in this repo (Playwright is
dev-only manual verification per `PROJECT_OVERVIEW.md`). Verification is
manual: load the Credit Investigation page with sample data, confirm each of
the 16 sections renders, collapses/expands independently, persists edits via
`localStorage` on reload, and that the completion badge updates correctly.
Also verify the Negative Record section correctly reflects both a
`bureauFindingStatus: 'clean'` state (no negative report exists — section
shows "No negative findings on file") and a `'negative'` state (section
mirrors `NegativeCreditReportCard`'s data).
