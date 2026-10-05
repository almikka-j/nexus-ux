# CI Report — Commercial / Consumer Report Types (Design)

**Date:** 2026-10-05
**Status:** Approved, pending implementation plan
**Companion docs:** `docs/100-credit-investigation.md` (the page this CI Report
card lives on), `docs/superpowers/specs/2026-08-06-ci-report-redesign-design.md`
(the original ~15-section CI Report redesign this builds on)

## Problem

The CI Report (`CiReportCard`, `src/sections/admin/credit-investigation/ci-report-card.tsx`)
currently has one fixed shape — the ~15-section structure documented in
`docs/100-credit-investigation.md`'s "CI Report" section. The user supplied
two reference screenshots of a real field investigation report tool showing
two genuinely different report layouts depending on whether the subject is a
business ("Field Investigation — Commercial") or an individual ("Field
Investigation", i.e. Consumer):

- **Commercial**: Business Profile, Location and Facility (Premises +
  Equipment, each with an owned/rented Yes/No + details), Trade Checking
  (Customers/Suppliers with company-level contact fields), Management and
  Ownership (a list of Management personnel, and a list of Major
  Stockholders — each stockholder optionally a corporation with its own
  nested list of Sub-stockholders), Comments.
- **Consumer**: matches the CI Report's current ~15-section structure
  exactly (Spouse, Children, Residence/Neighborhood, Employment, Trade
  Checking, Assets, Other Source of Income, Loan Purpose, Bank
  Verification, Negative Record, Comaker, Health and Habits, Comments,
  Recommendation) — no changes needed to that structure.

There is currently no field anywhere in this app cleanly distinguishing
"this application is for a business" vs. "this application is for an
individual" in a way suitable for driving report shape — per explicit
direction, this is a new, manually-picked field on the CI Report itself,
not inferred from existing application data.

## Goals

- Add a `type: 'commercial' | 'consumer' | ''` field to `CiReport`,
  officer-picked, defaulting to undecided (`''`).
- Before a type is picked, the rest of the CI Report card shows a
  placeholder — no section renders.
- `'consumer'` renders exactly today's existing ~15-section structure,
  unchanged.
- `'commercial'` renders a new, smaller set of sections matching the
  reference screenshot.
- Switching the type later only changes which sections are visible — no
  data is cleared, no confirmation prompt. Both types' data coexist in the
  same `CiReport` object; whichever type is deselected simply isn't
  rendered.
- Recommendation/decision-gate section (bottom of the page, outside
  `CiReportCard`) is unaffected and shared by both types.

## Non-Goals

- No automatic inference of Commercial vs. Consumer from existing
  application data (loan type, employment status, etc.) — explicitly a
  manual officer choice.
- No change to `credit-investigation-risk.ts` (`buildCreditInvestigationSummary`)
  — it already only reads the Document Checklist, not `CiReport` fields,
  and that stays true for both types.
- No change to transcript auto-fill (`credit-investigation-transcript.ts`)
  — it stays Consumer-only in this pass; Commercial reports do not get
  transcript auto-fill (no equivalent source data modeled for it yet).
- No warning/confirm dialog when switching type — explicitly simple
  switch-only-the-view behavior per direction.
- No merging of the new Commercial-only Trade Checking shape with the
  existing `CiTradeEntry` (Consumer's Suppliers/Customers) — a new,
  separate type is added instead of widening the existing one, since the
  two shapes diverge enough (company-level contact fields vs. individual
  name/address/dealing fields) that a shared type would need many
  Commercial-only optional fields bolted onto Consumer's entries.

## Data Model

### New type: `CiReportType`

```ts
export type CiReportType = 'commercial' | 'consumer' | '';
```

### New entry types (Commercial-only)

```ts
export type CiCommercialTradeEntry = {
  id: string;
  companyName: string;
  contactPerson: string;
  position: string;
  mobileNumber: string;
  email: string;
  telephoneNo: string;
  localExtension: string;
  transactionDetails: string;
  paymentTerms: string;
  yearsOfContract: string;
  remarks: string;
};

export type CiManagementEntry = {
  id: string;
  fullName: string;
  birthdate: string;
  birthPlace: string;
  nationality: string;
  spousePartner: string;
  homeAddress: string;
  jobTitle: string;
  education: string;
  otherBusiness: string;
  tin: string;
  mobileNumber: string;
};

export type CiSubStockholderEntry = {
  id: string;
  name: string;
  amountSubscribed: string;
  amountPaidUp: string;
};

export type CiStockholderEntry = {
  id: string;
  stockholderName: string;
  amountSubscribed: string;
  amountPaidUp: string;
  isCorporation: 'yes' | 'no' | '';
  subStockholders: CiSubStockholderEntry[];
};
```

Each array-entry type follows this app's existing convention
(`CiChildEntry`, `CiTradeEntry`, etc.) — a `crypto.randomUUID()` `id`, all
other fields plain strings, created via a small `createCi*Entry()` factory
function returning blank defaults, same as `createCiChildEntry()` and
siblings already do.

### `CiReport` additions

Added to the existing `CiReport` type (`src/auth/admin-context.tsx`),
grouped by new section, alongside (not replacing) all existing fields:

```ts
// Report type — manually picked, gates which sections render.
type: CiReportType;

// Business profile (Commercial only)
businessOwner: string;
businessTerritory: string;
businessRegularEmployees: string;
businessContractualEmployees: string;

// Location and facility (Commercial only)
premisesConstructionDescription: string;
premisesAreaDescription: string;
locationOwned: 'yes' | 'no' | '';
locationOwnRentDetails: string;
equipmentDescription: string;
equipmentOwned: 'yes' | 'no' | '';
equipmentLeasePrice: string;

// Trade Checking (Commercial only) — parallel to existing
// suppliers/customers: CiTradeEntry[] used by Consumer.
commercialSuppliers: CiCommercialTradeEntry[];
commercialCustomers: CiCommercialTradeEntry[];

// Management and Ownership (Commercial only)
management: CiManagementEntry[];
stockholders: CiStockholderEntry[];
```

`visitDate` (Date Inspected) and `commentsNotes` (Comments) are shared —
both report types use the same fields for these, no duplication.

### Factory / defaults

`createEmptyCiReport()` (or wherever `CiReport`'s initial state currently
lives — likely inline in `admin-context.tsx`'s initial state / rehydrate
path, same place the existing `CiReport` fields are defaulted) gains the
new fields: `type: ''`, all new Commercial strings `''`, all new arrays
`[]`. Existing rehydrate/top-up logic (spreading stored data over fresh
defaults) picks these up automatically the same way it already does for
every other `CiReport` field — no special-casing needed since the pattern
is identical to the rest of the type.

### Setters

- `setCiReport(data: Partial<CiReport>)` — existing setter, already a
  generic merge; used for `type` and every top-level Commercial field, no
  change needed.
- New array setters, mirroring the existing `addCiChild`/`updateCiChild`/
  `removeCiChild`-style triplets already in `admin-context.tsx` for every
  other `CiReport` array field:
  - `addCiCommercialTrade(kind: 'supplier' | 'customer')`,
    `updateCiCommercialTrade(kind, id, data)`, `removeCiCommercialTrade(kind, id)`
  - `addCiManagement()`, `updateCiManagement(id, data)`, `removeCiManagement(id)`
  - `addCiStockholder()`, `updateCiStockholder(id, data)`, `removeCiStockholder(id)`
  - `addCiSubStockholder(stockholderId)`, `updateCiSubStockholder(stockholderId, subId, data)`,
    `removeCiSubStockholder(stockholderId, subId)` — the only genuinely new
    *nested*-array shape in this app; the sub-stockholder setters reach one
    level deeper than any existing `CiReport` array setter (they locate the
    parent stockholder by id, then operate on its own `subStockholders`
    array), but follow the same "map over bundleId/entry id, replace matched
    entry" pattern used throughout `admin-context.tsx` for every other
    nested update (e.g. `setAppraisalBundleLandTitle` already does one level
    of this for `landTitles`).

## UI (`CiReportCard`)

### Type selector

At the very top of the card, above the existing "Upload the site-visit
transcript…" subtitle line: a `RadioRow`-style control (reusing the
existing `RadioRow` component already imported from
`'../call-report/call-report-types'` for Negative Record's finding toggle)
with two options, **Commercial** and **Consumer**, bound to
`report.type`/`setCiReport({ type })`.

While `report.type === ''`: render only the type selector plus a plain
placeholder message ("Select a report type to continue.") — no other
section, no transcript upload row, nothing else. This matches the "every
section after Land..." style placeholder-gating convention already used
elsewhere in this app (e.g. the Appraisal Report form's locked-until-fee-
settled message).

Once a type is picked, the transcript-upload row and all sections render
as described below, keyed off `report.type`.

### Consumer branch

Unchanged — every existing section (Date Inspected, Subject As Of, Spouse,
Children, Residence/Neighborhood, Employment, Trade Checking, Assets,
Other Source of Income, Loan Purpose, Bank Verification, Negative Record,
Comaker, Health and Habits, Comments) renders exactly as today, same
components, same pre-fill/transcript-auto-fill behavior.

### Commercial branch (new)

In order, each under its own `SectionLabel` (reusing the card's existing
local `SectionLabel` component):

1. **Header** — Date Inspected (`report.visitDate`, shared field, same
   single date `TextField` already used in the Consumer branch).
2. **Business profile** — a 2-column field grid: Owner
   (`businessOwner`), Territory (`businessTerritory`), No. of regular
   employees (`businessRegularEmployees`), No. of contractual employees
   (`businessContractualEmployees`).
3. **Location and facility** — a bordered sub-box (matching the existing
   Residence/Neighborhood bordered-box convention in this same card):
   - PREMISES: Construction description (`premisesConstructionDescription`),
     Area description (`premisesAreaDescription`).
   - "Location owned?" `RadioRow` (Yes/No, `locationOwned`) next to "Own or
     rent (details)" (`locationOwnRentDetails`) — same side-by-side
     radio+detail-field layout the reference screenshot shows.
   - EQUIPMENT: Equipment (`equipmentDescription`, full-width text), then
     "Equipment owned?" `RadioRow` (`equipmentOwned`) next to "Equipment
     lease price" (`equipmentLeasePrice`).
4. **Trade Checking** — two independent repeatable sections, **Customers**
   and **Suppliers** (same order as the reference screenshot and the
   existing Consumer Trade Checking section), each row showing Company
   Name as a bold entry header (matching the existing `CiTradeEntry` row
   header convention) plus grouped sub-fields: COMPANY (Company name,
   Contact person, Position), CONTACT DETAILS (Mobile number, Email
   address, Telephone no., Local/extension), TRANSACTION (Transaction
   details, Payment terms, Years of contract), NOTES (Remarks). "Add
   customer"/"Add supplier" triggers, "Remove" per entry — same
   add/remove-per-entry UX as every other repeatable array section in this
   card.
5. **Management and Ownership** — two repeatable sub-sections:
   - **Management**: each entry header "Manager N", fields grouped
     PERSONAL (Full name, Birthdate, Birth place, Nationality, Spouse/
     partner, Home address), POSITION AND BUSINESS (Job title, Education,
     Other business), IDENTIFICATION AND CONTACT (TIN, Mobile number).
     "Add management" trigger.
   - **Major stockholders**: each entry header "Stockholder N", fields
     STOCKHOLDER (Stockholder name, Amount subscribed, Amount paid-up),
     then "Is the stockholder a corporation?" `RadioRow` (`isCorporation`).
     When `isCorporation === 'yes'`, a nested "Sub-stockholders" block
     appears directly below (same bordered-sub-box convention, slightly
     indented to read as nested) — each sub-entry header "Sub N", fields
     SUB-STOCKHOLDER (Sub-stockholder name, Amount subscribed, Amount
     paid-up), "Remove" per sub-entry, "Add sub-stockholder" trigger
     scoped to that one stockholder. "Add stockholder" trigger for the
     outer list.
6. **Comments** — `commentsNotes`, same shared `RichTextField` the
   Consumer branch's Comments section already uses.

No Recommendation section inside `CiReportCard` for Commercial — the
reference screenshot's Commercial view doesn't show one, and the page's
own Decision Gate ("Proceed application?", outside this card) already
serves this role for both types.

## Testing

- Manual: toggle the type selector back and forth with data filled on
  both sides; confirm no data loss and that only the active type's
  sections render.
- Manual: add/remove entries in each new repeatable array (Customers,
  Suppliers, Management, Stockholders, Sub-stockholders nested under a
  stockholder) and confirm each operates independently of sibling entries,
  matching the existing per-entry add/remove convention already proven for
  `CiChildEntry`/`CiTradeEntry`/etc.
- `tsc --noEmit`, `eslint`, and `next build` must all pass clean (per this
  project's own standing verification rule) before considering this done.

## Documentation

`docs/100-credit-investigation.md`'s "CI Report" section needs a rewrite
covering: the new type selector and placeholder-before-pick state, the
Consumer branch (reference "unchanged, see existing structure"), and the
new Commercial branch section-by-section, plus a maintenance-rule note
if any new supporting file is added. `docs/240-tasks.md` gets a same-day
entry per the standing daily-update rule.
