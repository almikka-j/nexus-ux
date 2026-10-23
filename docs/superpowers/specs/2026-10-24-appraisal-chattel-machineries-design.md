# Appraisal Report — Chattel & Machineries Kinds (Design)

**Date:** 2026-10-24
**Status:** Draft, pending user approval
**Companion docs:** `docs/110-appraisal.md` (if present — the Appraisal
process page this builds on; verify/update on implementation),
`docs/superpowers/specs/2026-10-05-ci-report-commercial-consumer-types-design.md`
(closest prior art in this app — a "pick a type, render a different
section set" report), `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`
(the per-bundle appraisal architecture this extends).

## Problem

The Appraisal Report (`AppraiserAssignmentCard`,
`src/sections/admin/appraisal/appraiser-assignment-card.tsx`, 1871 lines)
and its read-only counterpart (`AppraisalReportView`,
`src/sections/admin/appraisal/appraisal-report-view.tsx`) only ever render
one fixed shape: a Real Estate Mortgage (REM) appraisal — Land, Technical
Specification, Source or Kind of Utilities, Improvement, General
Construction Features, Particular Description, Basis of Valuation (Land),
Remarks/Conditions, Appraisal Summary.

This app already tracks `AppraisalCollateralType = 'real-estate' | 'chattel'`
per pledged property (`AppraisalTctGroup.collateralType`, set in
Requirement Checklist's Collateral table) — but today that field only
drives a cosmetic label ("Real Estate" / "Chattel" chip) in the TCT table
and Appraisal Appraiser bundle view. The actual Appraisal Report form
ignores it entirely and always renders the real-estate-shaped fields,
regardless of what kind of collateral the bundle is actually appraising.

The user supplied two reference screenshots of a legacy appraisal tool
showing the two missing report shapes:

- **Chattel Appraisal** — a vehicle-appraisal form: header fields (Account
  Name, Requested By, Purpose of Report, Report Date, Eqpt. Under app.,
  Date Inspected, Registered Owner, Address), Description of Equipment
  (Make, MVF No., Series, C.R No., Type of Body/Denomination, Registration
  Date, Year Model, Place Registered, Color, Chassis Number, Odometer
  Reading, Engine No., Plate No., Fuel), two checkbox-with-comments
  checklists (Accessories; Power Features), two condition-rating
  checklists (General Condition — Good/Bad per item; Instrument Panel &
  Lighting — Functioning Well/Not Functioning Well per item), a Market
  Survey table (repeatable rows: Source, Date, Type, Gen. Condition,
  Selling Price), Appraised Value / Loanable Percent / Appraised Value
  (Round Off) / Loanable Amount, Encumbrances/Remarks (rich text), a File
  Attachment dropzone.
- **Machineries Appraisal** — a memo-style form: a memo header (To, Thru,
  From, Date Report, Date Inspected, Subject), a free-text "I. Description
  of Equipments" block, a repeatable **Machineries** list (Unit(s),
  Description, Serial No, Acquisition Price(s) in PHP, Date of Proforma
  Invoice, Appraised Value (Less % Depreciation of 10% per year) — each
  entry editable via a pencil icon, collapsing to a summary line
  otherwise, same UX convention as this app's own Bank Loans modal
  row-collapse pattern), Total Appraised Value / Total Appraised Value
  (Round Off) / Loanable Percent / Loanable Amount, "II. Qualification &
  Remarks" (rich text), a File Attachment dropzone.

Both reference screenshots are reproduced faithfully here as the field
list this design commits to; neither was reinterpreted or trimmed.

Separately, the Collateral/TCT table (`appraisal-tct-table.tsx`) currently
lets an officer select **any mix** of collateral types into one Appraisal
Report bundle (a selection of TCT-group checkboxes with no type
restriction) — only "already assigned to another bundle" and "documents
incomplete" lock a row today. Per the user's explicit ruling, a single
appraisal bundle must be collateral-type-homogeneous: once a selection
contains one type, rows of a different type must disable until the
selection clears.

## Goals

1. **Add `'machineries'` to `AppraisalCollateralType`** (now
   `'real-estate' | 'chattel' | 'machineries'`), with a `COLLATERAL_TYPE_LABEL`
   entry everywhere that `Record<AppraisalCollateralType, string>` is
   currently exhaustively typed (TypeScript will flag every missing site).
2. **New stored report shapes** for Chattel and Machineries, added
   alongside (not replacing) the existing Real Estate `AppraisalReport`
   shape, matching the two reference screenshots' fields exactly (see
   "Data model" below).
3. **Appraiser-facing form** (`AppraiserAssignmentCard`) renders the field
   set matching the bundle's own, real, assignment-derived collateral
   type — Real Estate renders exactly what exists today (unchanged),
   Chattel and Machineries render their own new field sets.
4. **A "⋮" (kebab) menu on the Appraisal Report card header**, opening a
   3-option dropdown (Real Estate / Chattel / Machineries). Selecting an
   option switches which form **layout is displayed** — this is a
   **view-only preview switch**, not a data edit: it never changes the
   bundle's actual stored collateral type, and never clears or moves any
   entered data. The menu's default/pre-selected option on open is always
   the bundle's real, assignment-derived kind. Previewing a different
   kind shows that kind's (likely blank, since this bundle isn't that
   kind) field layout; navigating back to the real kind shows whatever
   the appraiser has actually entered.
5. **Read-only report view** (`AppraisalReportView`) renders the matching
   read-only layout for whichever kind the bundle actually is, once
   submitted — same "At a Glance summary + View Full Report toggle"
   pattern as today's Real Estate view, adapted per kind (see "Read-only
   view" below).
6. **Collateral/TCT table same-kind selection rule**: once a selection
   (`selectedIds`) contains a TCT group of one `collateralType`, every
   unselected row of a *different* `collateralType` disables (checkbox
   `disabled`) until the selection clears (`clearSelection()` on cancel,
   or `confirmAssign()` on successful assignment) — extending the
   existing `isRowLocked`/`docsIncomplete` disable logic with one more
   condition.
7. **Sample data** (`buildSampleAppraisalReport` or equivalent) extended
   so "Fill with Sample Data" can seed a realistic Chattel and a
   realistic Machineries report, matching the existing convention that
   every data-entry screen in this app has a deterministic sample-fill
   path.

## Non-Goals

- **No automatic inference** of collateral kind from any other field —
  it is set once, at Assign Appraiser time, by which TCT groups the
  officer selected (via their own, already-set `collateralType`), exactly
  as today.
- **No migration/merge of existing mixed-kind bundles.** If any bundle
  already stored today happens to span TCT groups of different kinds
  (possible today since no restriction exists yet), this design does not
  retroactively validate or fix that data — the new selection restriction
  only applies going forward, to new selections made after this ships.
  (Reasoning: no real users/data exist in this prototype's `localStorage`
  state that this would need to migrate; if that assumption is wrong,
  flag it before implementation.)
- **No PDF/export changes** beyond what's needed to keep the existing
  Real Estate PDF-shaped structure correct — Chattel/Machineries are new
  on-screen forms only; this app has no real PDF export for any appraisal
  kind today (`docs/230-project-overview.md`'s "no real backend" note),
  so none is added here either.
- **No change to the Appraisal Approver's own review flow structure**
  (`appraisal-approver-bundle-view.tsx`) beyond it rendering the correct
  kind-specific read-only view — its approve/decline/fee logic is
  collateral-kind-agnostic already and stays that way.
- **The External appraiser path is unaffected.** External appraisers
  always just upload a finished file regardless of collateral kind — see
  `AppraiserAssignmentCard`'s existing `appraiserType === 'external'`
  branch, which this design does not touch.
- **Does not touch `appraisal-tct-table.tsx`'s "spanning two existing
  bundles is blocked" rule** — that's a separate, already-existing
  restriction; this design only adds the new same-kind restriction
  alongside it.

## Data model (`src/auth/admin-context.tsx`)

### Collateral type

```ts
export type AppraisalCollateralType = 'real-estate' | 'chattel' | 'machineries';
```

Every exhaustive `Record<AppraisalCollateralType, string>` site needs its
`machineries` entry added — at minimum:
`appraisal-appraiser-bundle-view.tsx`'s `COLLATERAL_TYPE_LABEL`,
`requirement-checklist-view.tsx`'s `COLLATERAL_TYPE_LABEL`,
`appraisal-tct-table.tsx`'s `COLLATERAL_TYPE_LABEL`. (TypeScript's
exhaustiveness checking on `Record<K, V>` surfaces every missing site at
compile time — a plan task should grep for `COLLATERAL_TYPE_LABEL` and
any other `Record<AppraisalCollateralType, …>` to confirm this list is
complete before implementation.)

### `AppraisalReportBundle.report` becomes kind-shaped

Today, `AppraisalReportBundle` has one fixed `report: AppraisalReport`
field. This design changes it to hold the kind-appropriate shape. Two
reasonable approaches, in order of preference:

**Preferred: three parallel optional fields on the bundle**, one per
kind, all present on every bundle (only one is ever meaningfully filled,
matching the bundle's real `collateralType`), e.g.:

```ts
export type AppraisalReportBundle = {
  // ...existing fields unchanged...
  realEstateReport: AppraisalReport;       // renamed from `report`
  chattelReport: AppraisalChattelReport;   // new
  machineriesReport: AppraisalMachineriesReport; // new
};
```

This avoids a discriminated-union refactor across every call site that
currently reads `bundle.report.*` (there are many — `appraisal-report-view.tsx`,
`appraisal-report-preview.tsx`, `appraisal-approver-bundle-view.tsx`,
`appraisal-appraiser-bundle-view.tsx`, the Fee/Report approval flows, the
PDF/export paths, sample-data builders). A small helper,
e.g. `getActiveAppraisalReport(bundle, collateralType)`, picks the right
one of the three by the bundle's real kind, and every call site that
currently does `bundle.report` switches to that helper. `fileName` /
`fileUrl` / `uploadedAt` (the External-appraiser upload fields, and the
"has this been submitted" check) likely need to stay on the bundle
itself, not duplicated three times — confirm during planning which fields
are truly kind-specific vs. shared.

Rejected alternative: a discriminated union
(`report: RealEstateReport | ChattelReport | MachineriesReport`, tagged by
`kind`). Cleaner in principle, but every one of the many existing
`bundle.report.fieldName` reads throughout the codebase would need a type
narrow first — a much larger diff for the same outcome, and this
prototype's convention (per `docs/230-project-overview.md`) favors
flat, directly-readable state over type-safety machinery. The plan should
still flag this as the alternative considered, and switch to it only if
the "three parallel fields" approach proves awkward once implementation
starts finding the real call-site count.

### New: `AppraisalChattelReport`

```ts
export type AppraisalChecklistItem = {
  id: string;
  label: string;        // fixed per item, not user-editable
  checked: boolean;
  comments: string;
};

export type AppraisalConditionItem = {
  id: string;
  label: string;         // fixed per item
  rating: '' | 'good' | 'bad';   // General Condition checklist
  comments: string;
};

export type AppraisalFunctionItem = {
  id: string;
  label: string;          // fixed per item
  rating: '' | 'functioning' | 'not-functioning'; // Instrument Panel & Lighting
};

export type AppraisalMarketSurveyEntry = {
  id: string;
  source: string;
  date: string;
  type: string;
  generalCondition: string;
  sellingPrice: string;
};

export type AppraisalChattelReport = {
  // Header
  accountName: string;
  requestedBy: string;
  purposeOfReport: string;
  reportDate: string;
  eqptUnderApp: string;
  dateInspected: string;
  registeredOwner: string;
  address: string;

  // Description of Equipment
  make: string;
  mvfNo: string;
  series: string;
  crNo: string;
  typeOfBodyDenomination: string;
  registrationDate: string;
  yearModel: string;
  placeRegistered: string;
  color: string;
  chassisNumber: string;
  odometerReading: string;
  engineNo: string;
  plateNo: string;
  fuel: string;

  // Fixed-item checklists — the reference screenshot's item lists are the
  // literal, fixed set; not user-addable/removable.
  accessories: AppraisalChecklistItem[];       // Air conditioning unit, Radio/Stereo,
                                                 // CD Player, ABS, Airbags, Defogger,
                                                 // Mags, Spoiler, Tools/Warning Kit,
                                                 // Spare Tires
  powerFeatures: AppraisalChecklistItem[];     // Door Lock, Steering, Windows,
                                                 // Side Mirror, Antenna
  generalCondition: AppraisalConditionItem[];  // Engine, Chassis, Body, Doors,
                                                 // Glasses, Upholstery, Tire/Wheel,
                                                 // Paint, Bumper
  instrumentPanelLighting: AppraisalFunctionItem[]; // Instrument Panel, Head Light,
                                                       // Tail Light, Signal Light

  marketSurvey: AppraisalMarketSurveyEntry[];  // repeatable, "+ Add Market Survey"

  appraisedValue: string;
  loanablePercent: string;       // dropdown in the reference (e.g. "50%")
  appraisedValueRoundOff: string;
  loanableAmount: string;

  encumbrancesRemarks: string;    // rich text

  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};
```

`createAppraisalChattelReport()` factory seeds the four fixed checklists
with their literal item labels (`checked: false`, `comments: ''`,
`rating: ''` as appropriate) and empty header/value fields, empty
`marketSurvey: []`.

### New: `AppraisalMachineriesReport`

```ts
export type AppraisalMachineryEntry = {
  id: string;
  units: string;              // "Unit(s)" — e.g. "3243 unit - 234"
  description: string;
  serialNo: string;
  acquisitionPricePhp: string;
  dateOfProformaInvoice: string;
  appraisedValueLessDepreciation: string; // "Appraised Value (Less % Depreciation of 10% per year)"
};

export type AppraisalMachineriesReport = {
  // Memo header
  to: string;            // defaults 'Credit Committee', editable
  thru: string;
  from: string;           // defaults 'Credit and Collection Department', editable
  dateReport: string;
  dateInspected: string;
  subject: string;

  descriptionOfEquipments: string; // "I. Description of Equipments" — free text

  machineries: AppraisalMachineryEntry[]; // repeatable, "+ Add Machinery",
                                            // row collapses to summary line + edit
                                            // pencil, same UX as Bank Loans modal

  // Totals are DISPLAYED as computed (sum of each entry's own appraised
  // value), per the reference screenshot's "=" sign — not independently
  // editable fields. Only loanablePercent/loanableAmount are inputs.
  loanablePercent: string;
  loanableAmount: string;

  qualificationRemarks: string; // "II. Qualification & Remarks" — rich text

  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};
```

`createAppraisalMachineriesReport()` factory seeds the memo defaults
("Credit Committee" / "Credit and Collection Department"), empty
`machineries: []`, everything else blank.

**Total Appraised Value / Total Appraised Value (Round Off)** are pure
computed values (sum of `machineries[].appraisedValueLessDepreciation`,
then rounded) — a small pure function alongside the existing
`financial-summary-calcs.ts`-style computation modules, not stored state.
Confirm the exact depreciation/rounding formula with the user during
planning — the reference screenshot shows the result but not the
underlying per-year depreciation calculation; "10% per year" appears in
the field label itself, suggesting the depreciation math already lives in
each entry's manually-entered `appraisedValueLessDepreciation` (i.e. the
appraiser computes and types it in per machine, same as the legacy tool
appears to do), with only the grand total computed. Flag this as a
"theirs" question if the plan can't resolve it from the screenshot alone.

## Form (data-entry) — `appraiser-assignment-card.tsx`

The card gains a **kebab ("⋮") IconButton** in its header, opening a
`Menu` with 3 `MenuItem`s: "Real Estate", "Chattel", "Machineries" —
same `Menu`/`MenuItem` pattern this app already uses elsewhere (e.g.
`ApplicationDetailsCard`'s own overflow menu). Local component state
(`previewKind: AppraisalCollateralType`, initialized to the bundle's real
`collateralType` on mount) drives which field-set section renders below;
selecting a menu item only updates `previewKind`, never writes to the
bundle. A small banner or label should make clear when `previewKind !==`
the bundle's real kind that this is a preview, not the active data (exact
copy to be decided during planning/review — e.g. "Previewing Chattel
layout — this bundle's actual kind is Real Estate").

Three new sibling components alongside the existing Real Estate field
sections (which stay exactly as they are today, selected when
`previewKind === 'real-estate'`):

- `ChattelReportFields` — renders the header fields, Description of
  Equipment (2-column `Grid`, matching this app's existing 2-column field
  layout convention), the four checklists (each its own small card/section
  — checkbox + inline comments field for Accessories/Power Features;
  radio-pair + inline comments for General Condition; radio-pair, no
  comments, for Instrument Panel & Lighting), the Market Survey table
  (add/remove rows, same inline-editable-row convention as Cash Flow
  Statement's "Add Other Loan" / Bank Statement's Deposits), Appraised
  Value block, `RichTextField` for Encumbrances/Remarks, a file dropzone
  (reusing the existing `FileThumbnail`/upload-input pattern this app
  already has, e.g. from Additional Financial Files or Bank Statement's
  pattern before its own simplification).
- `MachineriesReportFields` — renders the memo-style header (plain
  `TextField`s, not styled as an actual interoffice-memo banner, to match
  this form's own house style, not the different design request two
  weeks ago for Credit Checking Result's memo banner elsewhere in this
  app — confirm during review that a plain field-grid header, not a navy
  banner, is wanted here too), the free-text Description of Equipments
  box, the repeatable Machineries list (collapsed summary line + pencil to
  expand, "+ Add Machinery" button below, same row-collapse UX as Bank
  Loans' `LoanRowForm`/`LoanSummaryLine`), the computed Total Appraised
  Value / Round Off read-only display, Loanable Percent/Amount inputs,
  `RichTextField` for Qualification & Remarks, file dropzone.

All new field components live in new files under
`src/sections/admin/appraisal/` — `appraisal-chattel-report-fields.tsx`,
`appraisal-machineries-report-fields.tsx` — rather than growing the
already-1871-line `appraiser-assignment-card.tsx` further; it imports and
renders whichever one matches `previewKind`.

## Read-only view — `appraisal-report-view.tsx`

Same "At a Glance summary + View Full Report toggle" shape as today's
Real Estate view, but with kind-appropriate content:

- **Chattel At-a-Glance**: Appraised Value hero (reused as-is), Registered
  Owner / Make+Model+Plate No. summary chips, a condensed condition
  indicator (e.g. a count of "Bad"-rated items, if any). Full report:
  every section from the form, read-only (`Field`/`FieldGrid`, matching
  the existing Real Estate view's own presentational components).
- **Machineries At-a-Glance**: Appraised Value hero, a "{n} machineries"
  count, Subject line. Full report: the memo header fields, Description
  of Equipments, the machineries list (same collapsed-row pattern as the
  reference screenshot's read-only rendering — label/value pairs, pencil
  replaced by nothing since this is read-only), Qualification & Remarks.

`AppraisalReportView`'s existing `appraiserType === 'external'` branch
(file-upload-only path) is unaffected by collateral kind and stays as-is
for all three kinds.

## Collateral/TCT table — same-kind selection restriction

In `appraisal-tct-table.tsx`, alongside the existing `isRowLocked`
(already-assigned) and `docsIncomplete` (documents not verified) checks
that disable a row's checkbox:

```ts
const selectionKind: AppraisalCollateralType | null =
  selectedIds.length === 0
    ? null
    : (appraisalGroups.find((g) => g.id === selectedIds[0])?.collateralType ?? null);

const isWrongKind = (groupId: string) => {
  if (selectionKind === null) return false;
  const group = appraisalGroups.find((g) => g.id === groupId);
  return group?.collateralType !== selectionKind;
};
```

Checkbox `disabled={locked || incomplete || isWrongKind(group.id)}`. A
`Tooltip` on the disabled state should explain why (e.g. "This selection
is already Real Estate — Chattel/Machineries can't be mixed into the same
report"), matching this app's existing convention of explaining disabled
controls rather than leaving them silently unclickable.

This restriction only affects **row selection** (building up
`selectedIds` before "Assign Appraiser"); it does not touch
`confirmAssign()` or the created bundle's own fields, since the
restriction already guarantees every id in `selectedIds` shares one kind
by the time assignment happens.

## Sample data

`buildSampleAppraisalReport()` (or wherever "Fill with Sample Data"
currently seeds the Real Estate report) gains two sibling builders,
`buildSampleChattelReport()` / `buildSampleMachineriesReport()`, each
producing a fully-filled example matching the new shapes — realistic
vehicle details for Chattel, 2-3 sample machinery entries for
Machineries — following this app's existing "deterministic, not random"
sample-data convention (`docs/230-project-overview.md`).

## Review Focus

(Per `superpowers:writing-plans`' own convention — these are the known
soft spots a plan's own tests should specifically cover, not yet
resolved here:)

- **What happens to a bundle's preview-mode UI state on remount /
  navigation away and back** — does `previewKind` reset to the real kind
  (acceptable, probably expected) or persist? Should default to resetting
  (component-local `useState`, not written to context) unless the plan
  finds a reason to persist it.
- **A bundle whose `collateralType` somehow isn't one of the 3 valid
  values** (shouldn't happen given the TypeScript union, but defensive
  code elsewhere in this app often guards against corrupted
  `localStorage` state) — confirm the "render nothing / fall back to
  Real Estate" behavior during planning.
- **Existing stored sessions**: a `localStorage` session saved before
  this ships has `bundle.report` in the old shape. `readStoredState()`'s
  hydration needs a migration path — likely: existing `report` data
  becomes `realEstateReport`, and `chattelReport`/`machineriesReport` are
  freshly created via their factories. Flag this explicitly as a required
  plan task, not an afterthought — this app's own hydration convention
  (seen throughout `admin-context.tsx`) always backfills missing fields
  rather than assuming fresh state.
- **Locking.** The existing Real Estate form uses `locked = headApprovalStatus
  !== 'pending' || !!report.uploadedAt` to freeze fields post-submission.
  Confirm this same locking rule applies identically to Chattel/Machineries
  (reading from whichever of the three report fields is "active"), not
  just copy-pasted with a stale reference to the old single `report` field.
