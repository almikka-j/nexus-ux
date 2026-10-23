# Appraisal Chattel & Machineries Kinds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Appraisal Report form and its read-only view render
three different field sets (Real Estate / Chattel / Machineries)
depending on the bundle's actual collateral kind, with a kebab-menu
preview switch on the form and a same-kind selection rule in the
Collateral/TCT table.

**Architecture:** `AppraisalCollateralType` gains `'machineries'`.
`AppraisalReportBundle.report` (one fixed Real-Estate shape today)
becomes three parallel fields — `realEstateReport` / `chattelReport` /
`machineriesReport` — so every existing `bundle.report.uploadedAt`
submission check becomes a tiny `getBundleUploadedAt(bundle)` helper
call, while the handful of files that actually render report *content*
switch on the bundle's real kind. Two new field-set components
(`ChattelReportFields`, `MachineriesReportFields`) render inside
`AppraiserAssignmentCard`; two new read-only view components render
inside `AppraisalReportView`. `appraisal-tct-table.tsx` gets one more
disable condition on its row checkboxes.

**Tech Stack:** Next.js 14 / React / TypeScript / MUI v5, same
conventions as the rest of this admin app — no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-24-appraisal-chattel-machineries-design.md`

## Global Constraints

- `AppraisalCollateralType = 'real-estate' | 'chattel' | 'machineries'` —
  every `Record<AppraisalCollateralType, string>` site must have a
  `machineries` entry (TypeScript enforces this; confirmed exactly 3
  sites exist — see Task 1).
- The kebab-menu "Kind of Appraisal" switch is **view-only** — it must
  never call any `set*`/`update*` context setter, and must never change
  `bundle.collateralType`-derived data. Only `previewKind` component
  state changes.
- The TCT table's new same-kind disable rule must **not** affect
  `confirmAssign()` or bundle creation — only which checkboxes are
  clickable.
- Every new editable field persists via a `useAdmin()` setter on every
  keystroke (this app's universal convention — no separate "save" step
  except the existing "Submit Appraisal Report" action already in place).
- File attachments reuse the existing `CollateralPhoto { fileName,
  fileUrl, uploadedAt }` array shape and the existing (currently
  file-local) `MultiPhotoDropzone` component — **not** a new single-file
  nullable triplet. This is a deliberate deviation from the spec
  document's `AppraisalChattelReport`/`AppraisalMachineriesReport`
  draft types, which proposed `fileName: string | null` /
  `fileUrl: string | null` / `uploadedAt: string | null`. Ruling: this
  app already has a generic multi-file array type (`CollateralPhoto[]`)
  and a working dropzone component for it (`feeAttachments` on the
  existing Real Estate report); reusing it is less new code than
  introducing a second file-upload shape, and both reference
  screenshots' single "Upload Document" box work identically well
  rendered as a (possibly single-item) `CollateralPhoto[]` gallery. Each
  new report type gets `fileAttachments: CollateralPhoto[]` instead of
  the three nullable fields.
- Do not perpetuate the pre-existing field drift found in
  `readStoredState()`'s appraisal hydration block (`admin-context.tsx`
  ~line 3281): it currently hydrates several fields
  (`highestAndBestUse`, `preparedBy`/`preparedAt`, `subdivisionPlan*`,
  `taxMap*`, `notedBy`/`notedAt`, etc.) that do not exist on the current
  `AppraisalReport` type. This is a pre-existing bug, out of scope to
  fully fix here, but Task 2's rewritten hydration block must be built
  from the **current real `AppraisalReport` type** (lines 1259-1328),
  not copied from the stale hydration code — do not carry the drift
  forward into the new `realEstateReport` hydration.

## Review Focus

- **Bundle whose `collateralType` is somehow not one of the 3 valid
  values** (corrupted `localStorage`, or a pre-existing mixed-kind
  bundle per the design's Non-Goals) — `appraiser-assignment-card.tsx`
  and `appraisal-report-view.tsx` must not crash; fall back to the Real
  Estate shape rather than throwing. Covered by Task 6 Step 2's
  `realCollateralType` fallback (`titleGroups[0]?.collateralType ??
  'real-estate'`) and Task 7 Step 1's identical fallback; Task 6 Step 9
  and Task 7 Step 7's manual verifications must include exercising a
  bundle with no matching TCT groups, not just the happy path.
- **A bundle's `collateralType` at render time** — since `collateralType`
  lives on `AppraisalTctGroup`, not `AppraisalReportBundle`, a bundle
  with zero matching TCT groups (deleted from Requirement Checklist
  after assignment, if that's even possible) has no derivable kind.
  Same fallback as above (Task 6 Step 2 / Task 7 Step 1) — reasonable
  default: Real Estate, matching today's only-ever behavior.
- **Existing stored sessions** (a session saved before this ships) must
  hydrate without throwing and without silently losing the old Real
  Estate report data — Task 2 Step 11's manual verification must
  include loading a `localStorage` value shaped like the pre-this-plan
  `AppraisalReportBundle` (with `report` instead of `realEstateReport`)
  and confirming it hydrates into `realEstateReport` correctly, not just
  a fresh-session smoke test.
- **The preview dropdown must never leak into saved state** — covered
  by Task 6 Step 9's manual verification (select "Chattel" in the kebab
  menu while the bundle's real kind is Real Estate, type into a Chattel
  field, confirm `bundle.collateralType`-derived data is untouched and
  the typed value lands in `bundle.chattelReport` — which is correct:
  only the bundle's own real kind is uneditable via this menu, not the
  ability to fill in a different kind's fields while previewing them).
- **Same-kind TCT selection disable must re-enable on clear** — covered
  by Task 8 Step 4's manual verification (select one row, confirm other
  kinds disable, clear the selection both via explicit uncheck and via
  a successful "Assign Appraiser", confirm all rows re-enable each
  time).

---

## Task 1: Add `'machineries'` to `AppraisalCollateralType` and its 3 label maps

**Files:**
- Modify: `src/auth/admin-context.tsx:833` (`AppraisalCollateralType` definition)
- Modify: `src/sections/admin/requirement-checklist-view.tsx:58` (`COLLATERAL_TYPE_LABEL`)
- Modify: `src/sections/admin/appraisal-appraiser-bundle-view.tsx:282` (`COLLATERAL_TYPE_LABEL`)
- Modify: `src/sections/admin/appraisal/appraisal-tct-table.tsx:110` (`COLLATERAL_TYPE_LABEL`)
- Test: manual (`npx tsc --noEmit` — no test framework in this repo; see
  Task 1's own verification step)

**Interfaces:**
- Produces: `AppraisalCollateralType = 'real-estate' | 'chattel' | 'machineries'`,
  consumed by every later task.

- [ ] **Step 1: Run `npx tsc --noEmit` before any change, to get a clean baseline**

Run: `npx tsc --noEmit`
Expected: no errors (confirms the baseline is clean before this task's
change; if it's not clean, stop and report rather than attributing
pre-existing errors to this task).

- [ ] **Step 2: Add `'machineries'` to the union**

In `src/auth/admin-context.tsx`, change:
```ts
export type AppraisalCollateralType = 'real-estate' | 'chattel';
```
to:
```ts
export type AppraisalCollateralType = 'real-estate' | 'chattel' | 'machineries';
```

- [ ] **Step 3: Run `npx tsc --noEmit` to find every now-incomplete `Record<AppraisalCollateralType, …>`**

Run: `npx tsc --noEmit`
Expected: exactly 3 errors, one per `COLLATERAL_TYPE_LABEL` declaration
(requirement-checklist-view.tsx, appraisal-appraiser-bundle-view.tsx,
appraisal-tct-table.tsx), each "Property 'machineries' is missing in
type". If any other error appears, note the file/line — it means
another `Record<AppraisalCollateralType, …>` site exists that this plan
did not find; add a step to fix it too before continuing.

- [ ] **Step 4: Add the `machineries: 'Machineries'` entry to all 3 label maps**

Each is:
```ts
const COLLATERAL_TYPE_LABEL: Record<AppraisalCollateralType, string> = {
  'real-estate': 'Real Estate',
  chattel: 'Chattel',
  machineries: 'Machineries',
};
```

- [ ] **Step 5: Run `npx tsc --noEmit` to confirm zero errors**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/auth/admin-context.tsx src/sections/admin/requirement-checklist-view.tsx src/sections/admin/appraisal-appraiser-bundle-view.tsx src/sections/admin/appraisal/appraisal-tct-table.tsx
git commit -m "feat: add Machineries to AppraisalCollateralType"
```

---

## Task 2: New `AppraisalChattelReport` / `AppraisalMachineriesReport` types, factories, and bundle field rename

**Files:**
- Modify: `src/auth/admin-context.tsx` — add new types near
  `AppraisalReport` (after line 1328), rename `AppraisalReportBundle.report`
  to 3 fields (~line 1373), update `createAppraisalReportBundle` (~line
  2711-2735), rewrite the appraisal hydration block in
  `readStoredState()` (~lines 3259-3344)
- Test: manual (`npx tsc --noEmit`; this repo has no test runner — every
  task's "test" step in this plan is a `tsc`/`eslint`/manual
  verification, per this project's own convention documented in
  `docs/230-project-overview.md`)

**Interfaces:**
- Consumes: `AppraisalCollateralType` (Task 1), `CollateralPhoto` (existing,
  `admin-context.tsx:1089`), `AppraisalReportLandTitle` (existing).
- Produces:
  - `AppraisalChecklistItem { id: string; label: string; checked: boolean; comments: string }`
  - `AppraisalConditionItem { id: string; label: string; rating: '' | 'good' | 'bad'; comments: string }`
  - `AppraisalFunctionItem { id: string; label: string; rating: '' | 'functioning' | 'not-functioning' }`
  - `AppraisalMarketSurveyEntry { id: string; source: string; date: string; type: string; generalCondition: string; sellingPrice: string }`
  - `AppraisalChattelReport` (full shape below)
  - `AppraisalMachineryEntry { id: string; units: string; description: string; serialNo: string; acquisitionPricePhp: string; dateOfProformaInvoice: string; appraisedValueLessDepreciation: string }`
  - `AppraisalMachineriesReport` (full shape below)
  - `createAppraisalMarketSurveyEntry(): AppraisalMarketSurveyEntry`
  - `createAppraisalChattelReport(): AppraisalChattelReport`
  - `createAppraisalMachineriesReport(): AppraisalMachineriesReport`
  - `AppraisalReportBundle.realEstateReport: AppraisalReport` (renamed
    from `.report`), `.chattelReport: AppraisalChattelReport`,
    `.machineriesReport: AppraisalMachineriesReport` — all three always
    present on every bundle.
  - `getBundleUploadedAt(bundle: AppraisalReportBundle): string | null` —
    used by Task 9's rename pass; returns whichever of the 3 reports'
    `uploadedAt` is non-null (only one ever is, since a bundle only ever
    has data in the report matching its real kind), or `null`.

- [ ] **Step 1: Add the 4 small item types + `AppraisalChattelReport` type**

After line 1328 (end of `AppraisalReport`), add:

```ts
export type AppraisalChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  comments: string;
};

export type AppraisalConditionItem = {
  id: string;
  label: string;
  rating: '' | 'good' | 'bad';
  comments: string;
};

export type AppraisalFunctionItem = {
  id: string;
  label: string;
  rating: '' | 'functioning' | 'not-functioning';
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
  accountName: string;
  requestedBy: string;
  purposeOfReport: string;
  reportDate: string;
  eqptUnderApp: string;
  dateInspected: string;
  registeredOwner: string;
  address: string;

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

  accessories: AppraisalChecklistItem[];
  powerFeatures: AppraisalChecklistItem[];
  generalCondition: AppraisalConditionItem[];
  instrumentPanelLighting: AppraisalFunctionItem[];

  marketSurvey: AppraisalMarketSurveyEntry[];

  appraisedValue: string;
  loanablePercent: string;
  appraisedValueRoundOff: string;
  loanableAmount: string;

  encumbrancesRemarks: string;

  fileAttachments: CollateralPhoto[];
  uploadedAt: string | null;
};
```

- [ ] **Step 2: Add `createAppraisalChattelReport()`**

```ts
const CHATTEL_ACCESSORIES_LABELS = [
  'Air conditioning unit', 'Radio/Stereo', 'CD Player', 'ABS', 'Airbags',
  'Defogger', 'Mags', 'Spoiler', 'Tools/Warning Kit', 'Spare Tires',
];
const CHATTEL_POWER_FEATURES_LABELS = [
  'Door Lock', 'Steering', 'Windows', 'Side Mirror', 'Antenna',
];
const CHATTEL_GENERAL_CONDITION_LABELS = [
  'Engine', 'Chassis', 'Body', 'Doors', 'Glasses', 'Upholstery',
  'Tire/Wheel', 'Paint', 'Bumper',
];
const CHATTEL_INSTRUMENT_PANEL_LABELS = [
  'Instrument Panel', 'Head Light', 'Tail Light', 'Signal Light',
];

export function createAppraisalMarketSurveyEntry(): AppraisalMarketSurveyEntry {
  return {
    id: crypto.randomUUID(), source: '', date: '', type: '',
    generalCondition: '', sellingPrice: '',
  };
}

function createAppraisalChattelReport(): AppraisalChattelReport {
  return {
    accountName: '', requestedBy: '', purposeOfReport: '', reportDate: '',
    eqptUnderApp: '', dateInspected: '', registeredOwner: '', address: '',
    make: '', mvfNo: '', series: '', crNo: '', typeOfBodyDenomination: '',
    registrationDate: '', yearModel: '', placeRegistered: '', color: '',
    chassisNumber: '', odometerReading: '', engineNo: '', plateNo: '', fuel: '',
    accessories: CHATTEL_ACCESSORIES_LABELS.map((label) => ({
      id: crypto.randomUUID(), label, checked: false, comments: '',
    })),
    powerFeatures: CHATTEL_POWER_FEATURES_LABELS.map((label) => ({
      id: crypto.randomUUID(), label, checked: false, comments: '',
    })),
    generalCondition: CHATTEL_GENERAL_CONDITION_LABELS.map((label) => ({
      id: crypto.randomUUID(), label, rating: '' as const, comments: '',
    })),
    instrumentPanelLighting: CHATTEL_INSTRUMENT_PANEL_LABELS.map((label) => ({
      id: crypto.randomUUID(), label, rating: '' as const,
    })),
    marketSurvey: [],
    appraisedValue: '', loanablePercent: '', appraisedValueRoundOff: '',
    loanableAmount: '', encumbrancesRemarks: '',
    fileAttachments: [], uploadedAt: null,
  };
}
```

Place the 4 label constant arrays as module-level `const`s (not exported
— only the factory needs them) directly above this factory, near the
other `create*` factories in this file (e.g. near
`createBasisOfValuationComparable` at line 1175).

- [ ] **Step 3: Add `AppraisalMachineryEntry` / `AppraisalMachineriesReport` types + factories**

```ts
export type AppraisalMachineryEntry = {
  id: string;
  units: string;
  description: string;
  serialNo: string;
  acquisitionPricePhp: string;
  dateOfProformaInvoice: string;
  appraisedValueLessDepreciation: string;
};

export function createAppraisalMachineryEntry(): AppraisalMachineryEntry {
  return {
    id: crypto.randomUUID(), units: '', description: '', serialNo: '',
    acquisitionPricePhp: '', dateOfProformaInvoice: '',
    appraisedValueLessDepreciation: '',
  };
}

export type AppraisalMachineriesReport = {
  to: string;
  thru: string;
  from: string;
  dateReport: string;
  dateInspected: string;
  subject: string;
  descriptionOfEquipments: string;
  machineries: AppraisalMachineryEntry[];
  totalAppraisedValueRoundOff: string;
  loanablePercent: string;
  loanableAmount: string;
  qualificationRemarks: string;
  fileAttachments: CollateralPhoto[];
  uploadedAt: string | null;
};

function createAppraisalMachineriesReport(): AppraisalMachineriesReport {
  return {
    to: 'Credit Committee',
    thru: '',
    from: 'Credit and Collection Department',
    dateReport: '', dateInspected: '', subject: '',
    descriptionOfEquipments: '',
    machineries: [],
    totalAppraisedValueRoundOff: '',
    loanablePercent: '', loanableAmount: '',
    qualificationRemarks: '',
    fileAttachments: [], uploadedAt: null,
  };
}
```

Note: per the spec's open Review-Focus question (manual vs. computed
round-off), `totalAppraisedValueRoundOff` is a **manually-typed field**
here — matching Real Estate's own `roundedFigures` precedent. Only
`machineries[].appraisedValueLessDepreciation`'s **sum** (the live,
un-rounded "Total Appraised Value" display) is computed — that
computation lives in Task 6's component, not stored state at all (no
field for it on this type).

- [ ] **Step 4: Rename `AppraisalReportBundle.report` to 3 fields**

At `AppraisalReportBundle`'s definition (~line 1373), change:
```ts
report: AppraisalReport;
```
to:
```ts
realEstateReport: AppraisalReport;
chattelReport: AppraisalChattelReport;
machineriesReport: AppraisalMachineriesReport;
```

- [ ] **Step 5: Add `getBundleUploadedAt` helper**

Place near `updateOneBankStatement`-style small helpers, or directly
above `createAppraisalReportBundle`:

```ts
export function getBundleUploadedAt(bundle: AppraisalReportBundle): string | null {
  return (
    bundle.realEstateReport.uploadedAt ??
    bundle.chattelReport.uploadedAt ??
    bundle.machineriesReport.uploadedAt ??
    null
  );
}
```

- [ ] **Step 6: Update `createAppraisalReportBundle`'s return value**

At ~line 2711-2735, change the final line:
```ts
report: createBlankAppraisalReport(tctGroupIds),
```
to:
```ts
realEstateReport: createBlankAppraisalReport(tctGroupIds),
chattelReport: createAppraisalChattelReport(),
machineriesReport: createAppraisalMachineriesReport(),
```

(Confirm `createBlankAppraisalReport` is the existing Real Estate
factory's real name by reading `admin-context.tsx` around where
`createAppraisalReportBundle` calls it today — the plan infers this name
from the call site already quoted in the spec; if it differs, use the
real name found in the file.)

- [ ] **Step 7: Run `npx tsc --noEmit` to find every broken call site**

Run: `npx tsc --noEmit`
Expected: many errors across the files that read `.report` — this is
expected and is the authoritative list for Task 9 (the rename pass).
**Do not fix these call sites in this task** — only
`admin-context.tsx`'s own internal uses (Step 8 below) get fixed here;
every other file's fix is Task 9, kept separate so this task's diff
stays reviewable on its own.

- [ ] **Step 8: Fix `admin-context.tsx`'s own remaining internal `.report` references**

This file itself has setters (`setAppraisalBundleReport`,
`setAppraisalBundleLandTitle`, `addAppraisalBundleComparable`,
`updateAppraisalBundleComparable`, `removeAppraisalBundleComparable`,
`resetAppraisalBundleReport`) that currently read/write `bundle.report`.
Change every one of these (they only ever touch Real Estate fields
today — `landTitles`, `basisOfValuationComparables`, etc. — so each
becomes `bundle.realEstateReport` consistently, no new setters needed
yet; Task 3 adds the Chattel/Machineries setters separately). Also fix
the hydration block (Step 9 below — tracked as its own step since it's
substantial).

- [ ] **Step 9: Rewrite the appraisal hydration block in `readStoredState()`**

Replace the existing `reportBundles: (storedReview.appraisal?.reportBundles ?? []).map(...)`
block (~lines 3259-3344) so it hydrates all 3 report fields. Build the
Real Estate default object **fresh from the current `AppraisalReport`
type** (lines 1259-1328 — do NOT copy the stale field list from the old
hydration code, which includes fields like `highestAndBestUse`,
`preparedBy`, `subdivisionPlanFileName` that do not exist on the type
today; see this plan's Global Constraints). Concretely:

```ts
reportBundles: (storedReview.appraisal?.reportBundles ?? []).map((bundle: any) => {
  const tctGroupIds = bundle.tctGroupIds ?? [];
  // Old sessions stored the Real Estate report at `bundle.report`;
  // migrate it to `realEstateReport`. New sessions already have
  // `realEstateReport` directly.
  const storedRealEstate = bundle.realEstateReport ?? bundle.report ?? {};
  const storedLandTitles = storedRealEstate.landTitles ?? [];
  const landTitles = tctGroupIds.map((tctGroupId: string) => ({
    ...createAppraisalReportLandTitle(tctGroupId),
    ...storedLandTitles.find((title: any) => title.tctGroupId === tctGroupId),
  }));
  return {
    id: bundle.id,
    tctGroupIds,
    appraiserType: bundle.appraiserType ?? null,
    appraiserName: bundle.appraiserName ?? null,
    targetCompletionDate: bundle.targetCompletionDate ?? null,
    feeNeeded: bundle.feeNeeded ?? null,
    feeAmount: bundle.feeAmount ?? '',
    feeDescription: bundle.feeDescription ?? '',
    feeRemarks: bundle.feeRemarks ?? '',
    feeApprovalStatus: bundle.feeApprovalStatus ?? 'not-submitted',
    feeDeclineReason: bundle.feeDeclineReason ?? '',
    feeSubmittedAt: bundle.feeSubmittedAt ?? null,
    feeApprovedAt: bundle.feeApprovedAt ?? null,
    feePayment: bundle.feePayment ?? createEmptyPaymentDetails(),
    realEstateReport: {
      dateReport: '', dateInspected: '', requestingOfficer: '', branch: '',
      accountName: '', accountAddress: '', registeredOwner: '',
      locationOfProperty: '', encumbrancesRemarks: '', streetFrontage: '',
      streetWidth: '', surfacing: '', averageDepth: '', approxShape: '',
      topography: '', neighborhood: '', presentUse: '',
      utilityPublicConveyance: '', utilityElectricity: '', utilityWater: '',
      utilityGasOthers: '', improvements: [], generalConstructionFeatures: '',
      particularDescriptions: [], basisOfValuationComparables: [],
      fairMarketValuePerSqm: '', fairMarketValueTotal: '', valuationRemarks: '',
      remarksAdditionalInfo: '', conditionsForAcceptance: [],
      appraisedValue: '', roundedFigures: '', amountInWords: '',
      leasablePercent: '', leasableAmount: '', feeAttachments: [],
      fileName: null, fileUrl: null, uploadedAt: null,
      ...storedRealEstate,
      landTitles,
    },
    chattelReport: { ...createAppraisalChattelReport(), ...bundle.chattelReport },
    machineriesReport: { ...createAppraisalMachineriesReport(), ...bundle.machineriesReport },
  };
}),
```

(The `bundle: any` / `title: any` typings here match this file's existing
convention at this exact hydration site, which already receives
loosely-typed `storedReview` JSON — do not introduce stricter typing
here that the surrounding code doesn't have, but don't widen it further
either.)

- [ ] **Step 10: Run `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: errors remain only in the files Task 9 will fix (every file
other than `admin-context.tsx`) — confirm `admin-context.tsx` itself
reports zero errors.

- [ ] **Step 11: Manual verification — fresh load, and old-shape migration**

Start the dev server (`npm run dev`), open the Appraisal flow fresh (no
existing `localStorage` for this app, or clear it first), navigate to an
application's Appraisal page, and confirm the page loads without a
console error. This confirms `createAppraisalReportBundle`'s new return
shape doesn't break bundle creation at the one call site that still
compiles cleanly after this task (Task 9 isn't done yet, so other pages
may still error — only confirm this specific flow).

Then, in the browser's devtools console, manually seed a pre-this-plan-shaped
bundle into this app's `localStorage` key (find the key name by
inspecting what the app already wrote after the step above), with a
`reportBundles` entry using the **old** `report: {...}` field (not
`realEstateReport`) populated with a couple of real-estate field values
(e.g. `registeredOwner: 'Test Migration Owner'`). Reload the page and
confirm: no console error, and the bundle's `realEstateReport.registeredOwner`
now reads `'Test Migration Owner'` (inspect via React DevTools or a
temporary `console.log` in `readStoredState()`) — proving Step 9's
migration path actually runs, not just compiles.

- [ ] **Step 12: Commit**

```bash
git add src/auth/admin-context.tsx
git commit -m "feat: add AppraisalChattelReport/AppraisalMachineriesReport types and bundle fields"
```

---

## Task 3: Context setters for Chattel and Machineries report fields

**Files:**
- Modify: `src/auth/admin-context.tsx` — add setter type declarations
  near the existing `setAppraisalBundleReport` block (~line 1923), add
  implementations near the existing ones (~line 4349)

**Interfaces:**
- Consumes: `AppraisalChattelReport`, `AppraisalMachineriesReport`,
  `AppraisalMarketSurveyEntry`, `AppraisalMachineryEntry` (Task 2).
- Produces (all on the `useAdmin()` context value):
  - `setAppraisalBundleChattelReport(bundleId: string, data: Partial<Omit<AppraisalChattelReport, 'accessories' | 'powerFeatures' | 'generalCondition' | 'instrumentPanelLighting' | 'marketSurvey'>>): void`
  - `setAppraisalChecklistItem(bundleId: string, listKey: 'accessories' | 'powerFeatures', itemId: string, data: Partial<Pick<AppraisalChecklistItem, 'checked' | 'comments'>>): void`
  - `setAppraisalConditionItem(bundleId: string, itemId: string, data: Partial<Pick<AppraisalConditionItem, 'rating' | 'comments'>>): void`
  - `setAppraisalFunctionItem(bundleId: string, itemId: string, data: Partial<Pick<AppraisalFunctionItem, 'rating'>>): void`
  - `addAppraisalMarketSurveyEntry(bundleId: string): void`
  - `updateAppraisalMarketSurveyEntry(bundleId: string, entryId: string, data: Partial<Omit<AppraisalMarketSurveyEntry, 'id'>>): void`
  - `removeAppraisalMarketSurveyEntry(bundleId: string, entryId: string): void`
  - `setAppraisalBundleMachineriesReport(bundleId: string, data: Partial<Omit<AppraisalMachineriesReport, 'machineries'>>): void`
  - `addAppraisalMachineryEntry(bundleId: string): void`
  - `updateAppraisalMachineryEntry(bundleId: string, entryId: string, data: Partial<Omit<AppraisalMachineryEntry, 'id'>>): void`
  - `removeAppraisalMachineryEntry(bundleId: string, entryId: string): void`

- [ ] **Step 1: Add the type declarations to the `AdminContextValue` interface**

Place directly after the existing `removeAppraisalBundleComparable`
declaration (~line 1937):

```ts
setAppraisalBundleChattelReport: (
  bundleId: string,
  data: Partial<Omit<AppraisalChattelReport, 'accessories' | 'powerFeatures' | 'generalCondition' | 'instrumentPanelLighting' | 'marketSurvey'>>
) => void;
setAppraisalChecklistItem: (
  bundleId: string,
  listKey: 'accessories' | 'powerFeatures',
  itemId: string,
  data: Partial<Pick<AppraisalChecklistItem, 'checked' | 'comments'>>
) => void;
setAppraisalConditionItem: (
  bundleId: string,
  itemId: string,
  data: Partial<Pick<AppraisalConditionItem, 'rating' | 'comments'>>
) => void;
setAppraisalFunctionItem: (
  bundleId: string,
  itemId: string,
  data: Partial<Pick<AppraisalFunctionItem, 'rating'>>
) => void;
addAppraisalMarketSurveyEntry: (bundleId: string) => void;
updateAppraisalMarketSurveyEntry: (
  bundleId: string,
  entryId: string,
  data: Partial<Omit<AppraisalMarketSurveyEntry, 'id'>>
) => void;
removeAppraisalMarketSurveyEntry: (bundleId: string, entryId: string) => void;
setAppraisalBundleMachineriesReport: (
  bundleId: string,
  data: Partial<Omit<AppraisalMachineriesReport, 'machineries'>>
) => void;
addAppraisalMachineryEntry: (bundleId: string) => void;
updateAppraisalMachineryEntry: (
  bundleId: string,
  entryId: string,
  data: Partial<Omit<AppraisalMachineryEntry, 'id'>>
) => void;
removeAppraisalMachineryEntry: (bundleId: string, entryId: string) => void;
```

- [ ] **Step 2: Implement `setAppraisalBundleChattelReport`**

Mirror `setAppraisalBundleReport`'s own shape exactly
(`updateOneBankStatement`-style single-bundle map), targeting
`chattelReport` instead of `report`:

```ts
setAppraisalBundleChattelReport: (bundleId, data) =>
  setState((prev) => ({
    ...prev,
    review: {
      ...prev.review,
      appraisal: {
        ...prev.review.appraisal,
        reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
          bundle.id !== bundleId
            ? bundle
            : { ...bundle, chattelReport: { ...bundle.chattelReport, ...data } }
        ),
      },
    },
  })),
```

- [ ] **Step 3: Implement `setAppraisalChecklistItem`**

```ts
setAppraisalChecklistItem: (bundleId, listKey, itemId, data) =>
  setState((prev) => ({
    ...prev,
    review: {
      ...prev.review,
      appraisal: {
        ...prev.review.appraisal,
        reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
          bundle.id !== bundleId
            ? bundle
            : {
                ...bundle,
                chattelReport: {
                  ...bundle.chattelReport,
                  [listKey]: bundle.chattelReport[listKey].map((item) =>
                    item.id !== itemId ? item : { ...item, ...data }
                  ),
                },
              }
        ),
      },
    },
  })),
```

- [ ] **Step 4: Implement `setAppraisalConditionItem` and `setAppraisalFunctionItem`**

Same shape as Step 3, each targeting its own fixed field
(`generalCondition` / `instrumentPanelLighting`) instead of a `listKey`
parameter (these two lists aren't interchangeable the way
accessories/powerFeatures are, since they have different item shapes).

- [ ] **Step 5: Implement the 3 Market Survey setters**

`addAppraisalMarketSurveyEntry` appends `createAppraisalMarketSurveyEntry()`
(defined in Task 2, Step 1 area) to `bundle.chattelReport.marketSurvey`.
`updateAppraisalMarketSurveyEntry`/`removeAppraisalMarketSurveyEntry`
mirror `updateAppraisalBundleComparable`/`removeAppraisalBundleComparable`'s
own shape exactly, targeting `chattelReport.marketSurvey`.

- [ ] **Step 6: Implement `setAppraisalBundleMachineriesReport` and the 3 Machinery-entry setters**

Same pattern as Steps 2 and 5, targeting `machineriesReport` and
`machineriesReport.machineries` respectively.
`addAppraisalMachineryEntry` appends `createAppraisalMachineryEntry()`
(already defined in Task 2, Step 3).

- [ ] **Step 7: Run `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this task (errors from Task 2's
still-unfixed call sites may remain — that's expected until Task 9).

- [ ] **Step 8: Commit**

```bash
git add src/auth/admin-context.tsx
git commit -m "feat: add Chattel/Machineries report setters"
```

---

## Task 4: `ChattelReportFields` component

**Files:**
- Create: `src/sections/admin/appraisal/appraisal-chattel-report-fields.tsx`

**Interfaces:**
- Consumes: `AppraisalChattelReport`, the Task 3 setters, `Field`/
  `FieldGrid`/`SectionLabel` (`src/components/admin-ui`), `RichTextField`
  (`src/components/rich-text-field`), `MultiPhotoDropzone` (exported from
  `appraiser-assignment-card.tsx` by Task 6, Step 1 — if this task runs
  before Task 6 in practice, write against the planned export name and
  signature below; it doesn't yet need to exist to write this file, only
  to compile once Task 6 exports it).
- Produces: `export function ChattelReportFields({ bundleId, report, editable }: { bundleId: string; report: AppraisalChattelReport; editable: boolean }): JSX.Element`

- [ ] **Step 1: Write the component shell with header fields**

Create the file with a `'use client'` directive, imports, and
`ChattelReportFields`'s signature. Render the 8 header fields
(Account Name, Requested By, Purpose of Report, Report Date, Eqpt. Under
app., Date Inspected, Registered Owner, Address) as plain MUI
`TextField`s in a 2-column `Grid`, each bound to
`setAppraisalBundleChattelReport(bundleId, { <field>: value })`,
`disabled={!editable}` — same `fieldSx`/disabled-styling convention as
`appraiser-assignment-card.tsx`'s own existing fields (copy that file's
`fieldSx` constant into this new file, or export it from
`appraiser-assignment-card.tsx` if Task 6 already needs to for another
reason — prefer a local copy to minimize cross-file coupling, matching
this app's established "small presentational constants get duplicated
per file" convention).

- [ ] **Step 2: Add Description of Equipment fields**

Same 2-column `Grid` pattern, the 14 fields listed in the spec (Make,
MVF No., Series, C.R No., Type of Body/Denomination, Registration Date,
Year Model, Place Registered, Color, Chassis Number, Odometer Reading,
Engine No., Plate No., Fuel) under a `SectionLabel` reading "Description
of Equipment".

- [ ] **Step 3: Add the Accessories and Power Features checklists**

A small local component, `ChecklistSection`, taking `{ title, items,
onItemChange }`: renders a `SectionLabel`, then one row per item — a
`Checkbox` bound to `item.checked`, the item's own `label` (not
editable), and a `TextField` for `item.comments` (disabled unless
`item.checked`, matching the reference screenshot's layout where
comments are entered per checked accessory). `onItemChange(itemId,
data)` calls `setAppraisalChecklistItem(bundleId, 'accessories' |
'powerFeatures', itemId, data)`. Render two instances: one for
`report.accessories` (listKey `'accessories'`), one for
`report.powerFeatures` (listKey `'powerFeatures'`).

- [ ] **Step 4: Add the General Condition and Instrument Panel & Lighting checklists**

Two more local components (or one shared one parameterized by whether
comments are shown): `ConditionSection` for `report.generalCondition`
(radio pair Good/Bad + comments per row, calling
`setAppraisalConditionItem`) and `FunctionSection` for
`report.instrumentPanelLighting` (radio pair Functioning
Well/Not Functioning Well, no comments, calling
`setAppraisalFunctionItem`). Use MUI `RadioGroup`/`FormControlLabel`
with `Radio`, matching the existing radio-row pattern in
`src/sections/admin/call-report/call-report-types.tsx` (`row` layout).

- [ ] **Step 5: Add the Market Survey table**

A small local component rendering `report.marketSurvey` as rows (Source,
Date `type="date"`, Type, Gen. Condition, Selling Price — each a
`TextField`, trailing remove `IconButton`), an empty state ("No market
survey entries yet.") when `report.marketSurvey.length === 0`, and a "+
Add Market Survey" `Button` calling `addAppraisalMarketSurveyEntry(bundleId)`.
Same inline-editable-row convention as Cash Flow Statement's "Add Other
Loan" (`cash-flow-statement-card.tsx`) — copy its row/remove-button
layout, not its field set.

- [ ] **Step 6: Add Appraised Value block, Remarks, and File Attachment**

`FieldGrid` with Appraised Value, Loanable Percent (plain `TextField`
per this plan's Global Constraints ruling — not a `Select`), Appraised
Value (Round Off), Loanable Amount — each bound to
`setAppraisalBundleChattelReport`. A `RichTextField` for
`encumbrancesRemarks`. A file-attachment section using
`MultiPhotoDropzone` bound to `report.fileAttachments`, `onChange={(fileAttachments) => setAppraisalBundleChattelReport(bundleId, { fileAttachments })}`.

- [ ] **Step 7: Manual verification**

Run `npx tsc --noEmit` and `npx eslint src/sections/admin/appraisal/appraisal-chattel-report-fields.tsx`.
Expected: no errors (aside from the still-pending `MultiPhotoDropzone`
export from Task 6 — if Task 4 is executed before Task 6, a type error
here is expected and should be noted, not treated as a Task 4 failure;
re-run this check after Task 6 lands).

- [ ] **Step 8: Commit**

```bash
git add src/sections/admin/appraisal/appraisal-chattel-report-fields.tsx
git commit -m "feat: add ChattelReportFields component"
```

---

## Task 5: `MachineriesReportFields` component

**Files:**
- Create: `src/sections/admin/appraisal/appraisal-machineries-report-fields.tsx`

**Interfaces:**
- Consumes: `AppraisalMachineriesReport`, Task 3's Machineries setters,
  `RichTextField`, `MultiPhotoDropzone` (Task 6).
- Produces: `export function MachineriesReportFields({ bundleId, report, editable }: { bundleId: string; report: AppraisalMachineriesReport; editable: boolean }): JSX.Element`

- [ ] **Step 1: Write the memo header fields**

Plain `TextField`s (not a navy-banner memo layout — confirmed by this
plan's own grounding in the existing Real Estate form's house style; see
spec's note on this) for To, Thru, From, Date Report, Date Inspected,
Subject, in a 2-column `Grid` under a `SectionLabel` or plain section
title "I. " is part of the field label text itself per the reference
screenshot (the screenshot's "I. DESCRIPTION OF EQUIPMENTS" /
"II. QUALIFICATION & REMARKS" banners are literal section titles — carry
the Roman numerals into the `SectionLabel` text, e.g.
`<SectionLabel>I. Description of Equipments</SectionLabel>`).

- [ ] **Step 2: Add the free-text Description of Equipments box**

A multiline `TextField` (not rich text — the reference screenshot shows
a plain textarea, unlike Encumbrances/Remarks and Qualification &
Remarks which the spec calls out as rich text) bound to
`report.descriptionOfEquipments`.

- [ ] **Step 3: Add the Machineries repeatable list**

Mirror `bank-loans-modal.tsx`'s `LoanSummaryLine`/`LoanRowForm`
row-collapse pattern exactly: a local `MachineryRow` component with
`expanded`/`onToggle` state (component-local `useState<Set<string>>`,
same as `BankLoanRowsSection`'s own `expandedIds`), a collapsed summary
line showing `Unit(s)` + `Description` (bold) per the reference
screenshot's own collapsed-row rendering, and an expand pencil revealing
the full `MachineryEntryForm` (Unit(s), Description, Serial No,
Acquisition Price(s) in PHP, Date of Proforma Invoice `type="date"`,
Appraised Value (Less % Depreciation of 10% per year)). New rows call
`addAppraisalMachineryEntry(bundleId)` and auto-expand (mirroring
`BankLoanRowsSection`'s `prevCountRef` auto-expand-on-add effect). Edits
call `updateAppraisalMachineryEntry(bundleId, entryId, data)`. Remove
calls `removeAppraisalMachineryEntry(bundleId, entryId)`.

- [ ] **Step 4: Add the computed Total Appraised Value display**

A small pure function in this same file (not a new shared calc module —
this is a 3-line sum, not worth a new file per this plan's proportion
principle):

```ts
function computeTotalAppraisedValue(machineries: AppraisalMachineryEntry[]): number {
  return machineries.reduce((sum, m) => sum + (Number(m.appraisedValueLessDepreciation) || 0), 0);
}
```

Render it as a read-only `Field`/`Typography` ("Total Appraised Value",
formatted via this app's existing `fCurrency` helper from
`src/utils/format-number`), directly above the manually-typed Total
Appraised Value (Round Off) field.

- [ ] **Step 5: Add Loanable Percent/Amount, Round Off field, Qualification & Remarks, File Attachment**

`Field`s for Loanable Percent (plain `TextField`) and Loanable Amount,
plus the manually-typed `totalAppraisedValueRoundOff` field (per Task
2's ruling), a `RichTextField` for `qualificationRemarks` (labeled
"II. Qualification & Remarks"), and a `MultiPhotoDropzone` bound to
`report.fileAttachments`.

- [ ] **Step 6: Manual verification**

Run `npx tsc --noEmit` and `npx eslint src/sections/admin/appraisal/appraisal-machineries-report-fields.tsx`.
Expected: no errors (same Task-6-dependency caveat as Task 4 Step 7).

- [ ] **Step 7: Commit**

```bash
git add src/sections/admin/appraisal/appraisal-machineries-report-fields.tsx
git commit -m "feat: add MachineriesReportFields component"
```

---

## Task 6: Kebab menu + kind-aware rendering in `AppraiserAssignmentCard`

**Files:**
- Modify: `src/sections/admin/appraisal/appraiser-assignment-card.tsx`

**Interfaces:**
- Consumes: `ChattelReportFields` (Task 4), `MachineriesReportFields`
  (Task 5), `AppraisalCollateralType` (Task 1), `bundle.realEstateReport`
  /`.chattelReport`/`.machineriesReport` (Task 2).
- Produces: exports `MultiPhotoDropzone` (newly exported, was file-local)
  for Tasks 4/5 to import; the card's own kebab-menu `previewKind` state
  is local, not exported.

- [ ] **Step 1: Export `MultiPhotoDropzone`**

At its existing definition (~line 309), change `function
MultiPhotoDropzone(` to `export function MultiPhotoDropzone(`. No
behavior change.

- [ ] **Step 2: Determine the bundle's real collateral kind**

Inside `AppraiserAssignmentCard`, after `titleGroups` is computed
(~line 784), add:

```ts
const realCollateralType: AppraisalCollateralType =
  titleGroups[0]?.collateralType ?? 'real-estate';
```

(Falls back to `'real-estate'` when `titleGroups` is empty — covers this
plan's Review Focus case of a bundle with no matching TCT groups. All
TCT groups in one bundle share one `collateralType` by construction once
Task 8 ships, so reading `titleGroups[0]` is safe — not an arbitrary
pick.)

- [ ] **Step 3: Add `previewKind` state, initialized to the real kind**

```ts
const [previewKind, setPreviewKind] = useState<AppraisalCollateralType>(realCollateralType);
```

Add a `useEffect` that resets `previewKind` back to `realCollateralType`
whenever the bundle's identity changes (`bundleId` changes) — so
switching between two different bundles' cards (if this component is
ever reused across bundles without remounting) doesn't leak a stale
preview:

```ts
useEffect(() => {
  setPreviewKind(realCollateralType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [bundleId]);
```

- [ ] **Step 4: Add the kebab `IconButton` + `Menu` to the card header**

Find the card's header `Stack` (near the top of the component's return,
alongside the existing title/subtitle). Add an `IconButton` with
`solar:menu-dots-bold` (matching this app's existing kebab-icon
convention, e.g. `application-details-card.tsx`'s own overflow menu),
opening a `Menu` with 3 `MenuItem`s ("Real Estate", "Chattel",
"Machineries"), each calling `setPreviewKind(...)` and closing the menu.
Local `anchorEl` state for the menu, same pattern as
`application-details-card.tsx`'s `actionsAnchor`.

- [ ] **Step 5: Add the preview banner**

Directly below the header, conditionally render (only when `previewKind
!== realCollateralType`):

```tsx
{previewKind !== realCollateralType && (
  <Box sx={{ p: 1.5, mb: 2, borderRadius: '10px', bgcolor: TONE_COLORS.warning.bg }}>
    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: TONE_COLORS.warning.text }}>
      Previewing {COLLATERAL_TYPE_LABEL_FOR_PREVIEW[previewKind]} layout — this bundle's actual
      kind is {COLLATERAL_TYPE_LABEL_FOR_PREVIEW[realCollateralType]}.
    </Typography>
  </Box>
)}
```

(`COLLATERAL_TYPE_LABEL_FOR_PREVIEW` — a local `Record<AppraisalCollateralType,
string>` matching the 3 other files' own `COLLATERAL_TYPE_LABEL`, added
to this file since it doesn't currently import one.)

- [ ] **Step 6: Branch the field-set rendering on `previewKind`**

Wrap the existing Real Estate field JSX (everything from Land through
Appraisal Summary — i.e. the bulk of this component's current return)
in `{previewKind === 'real-estate' && ( ... )}`. Add
`{previewKind === 'chattel' && <ChattelReportFields bundleId={bundleId} report={bundle.chattelReport} editable={editable} />}`
and the Machineries equivalent. The existing `locked`/`editable`
computation (~line 760-761) stays shared across all three — it already
reads `headApprovalStatus` and (today) `report.uploadedAt`; change that
one reference to `getBundleUploadedAt(bundle)` (Task 2's helper) so
locking works correctly regardless of which kind is real.

- [ ] **Step 7: Guard the existing `AppraisalReportPreview` call**

The existing `<AppraisalReportPreview report={report} titleGroups={titleGroups} />`
call (~line 1810) stays Real-Estate-only — wrap it in the same
`previewKind === 'real-estate'` condition as the rest of the Real Estate
section (it's already inside that section's JSX tree if Step 6 wraps the
whole section, so this step may already be satisfied — verify, don't
duplicate the guard).

- [ ] **Step 8: Run `npx tsc --noEmit` and `npx eslint`**

Run: `npx tsc --noEmit` then `npx eslint src/sections/admin/appraisal/appraiser-assignment-card.tsx`
Expected: no errors remaining in this file (other files' Task-9 errors
may still exist).

- [ ] **Step 9: Manual verification — preview switch doesn't write to the wrong kind, and the zero-TCT-groups fallback**

Start the dev server, open a bundle whose real kind is Real Estate, open
the kebab menu, select "Chattel", type into a Chattel field, confirm (via
React DevTools or by reopening the page) that `bundle.collateralType`-derived
data is untouched and `bundle.chattelReport` now holds the typed value —
satisfying this plan's Review Focus item on preview-vs-edit boundaries.

Separately, confirm `realCollateralType`'s fallback: temporarily edit
`titleGroups` to an empty array in the debugger (or find/construct a
bundle whose `tctGroupIds` don't match any existing
`appraisalGroups` entry) and confirm the card renders the Real Estate
field set without crashing, per this plan's Review Focus item on an
undeterminable collateral kind.

- [ ] **Step 10: Commit**

```bash
git add src/sections/admin/appraisal/appraiser-assignment-card.tsx
git commit -m "feat: add kind-preview kebab menu to AppraiserAssignmentCard"
```

---

## Task 7: Kind-aware rendering in `AppraisalReportView` (read-only)

**Files:**
- Modify: `src/sections/admin/appraisal/appraisal-report-view.tsx`

**Interfaces:**
- Consumes: `bundle.realEstateReport`/`.chattelReport`/`.machineriesReport`
  (Task 2), `Field`/`FieldGrid`/`SectionLabel` (existing import, already
  used in this file).
- Produces: two new local components, `ChattelReportSummary` and
  `MachineriesReportSummary`, used only within this file.

- [ ] **Step 1: Determine the bundle's real kind and the active report**

Near the top of `AppraisalReportView` (after `titleGroups`, ~line 303),
add:

```ts
const realCollateralType: AppraisalCollateralType =
  titleGroups[0]?.collateralType ?? 'real-estate';
```

Replace every remaining `report`/`bundle.report` reference in this file
with the correctly-kinded field (`bundle.realEstateReport`,
`bundle.chattelReport`, or `bundle.machineriesReport`) per the branch
below — the existing `const { appraiserType, appraiserName, report } =
bundle;` (~line 298) destructure is removed since `report` no longer
exists as a single field; existing `uploadedAt` destructure becomes
`getBundleUploadedAt(bundle)`.

- [ ] **Step 2: Branch on `realCollateralType` after the existing External-appraiser early return**

The existing `if (appraiserType === 'external') { ... }` block (~line
305-353) is unaffected — leave it exactly as-is (per the design's
Non-Goal). After it, instead of always rendering the Real Estate At-a-
Glance/Full-Report JSX, branch:

```tsx
if (realCollateralType === 'chattel') {
  return <ChattelReportSummary bundle={bundle} tctNumbers={tctNumbers} />;
}
if (realCollateralType === 'machineries') {
  return <MachineriesReportSummary bundle={bundle} tctNumbers={tctNumbers} />;
}
// falls through to the existing Real Estate JSX, using bundle.realEstateReport
// wherever it previously used `report`
```

- [ ] **Step 3: Replace every remaining `report.` reference below this branch with `bundle.realEstateReport.`**

Mechanical rename within the existing Real Estate JSX block (the bulk of
the file, lines ~357-608) — every `report.fieldName` becomes
`bundle.realEstateReport.fieldName`. No behavior change.

- [ ] **Step 4: Write `ChattelReportSummary`**

New local component (same file, or split to
`appraisal-chattel-report-summary.tsx` if this file is getting long —
builder's call per this plan's File Structure guidance; either is
acceptable). Takes `{ bundle, tctNumbers }`. At-a-Glance: reuse
`AppraisedValueHero` with `bundle.chattelReport.appraisedValue` (no
`amountInWords` field on this type — pass `''`), a `FieldGrid` with
Registered Owner, Make, Plate No. (from `bundle.chattelReport`), and a
computed "Bad-rated items" count
(`bundle.chattelReport.generalCondition.filter(c => c.rating === 'bad').length`)
shown as a `StatusBadge` when > 0. Full Report (behind the existing
`fullReportOpen` toggle pattern): every Chattel field read-only via
`Field`/`FieldGrid`, same section groupings as `ChattelReportFields`
(header, Description of Equipment, the 4 checklists rendered as
label/value rows, Market Survey as a read-only table, Encumbrances/Remarks,
file attachments as a thumbnail list).

- [ ] **Step 5: Write `MachineriesReportSummary`**

Takes `{ bundle, tctNumbers }`. At-a-Glance: `AppraisedValueHero`
fed the computed total (reuse Task 5's `computeTotalAppraisedValue`
logic — either import it if Task 5 exports it, or duplicate the 3-line
sum here per this app's small-helper-duplication convention; prefer
importing since it's identical logic that must never drift), a "{n}
machineries" count, the Subject line. Full Report: memo header fields,
Description of Equipments, the machineries list as read-only
label/value rows (no pencil, no collapse — just list every entry's
fields, matching this plan's Review Focus item on read-only row shape),
Qualification & Remarks, file attachments.

- [ ] **Step 6: Run `npx tsc --noEmit` and `npx eslint`**

Run: `npx tsc --noEmit` then `npx eslint src/sections/admin/appraisal/appraisal-report-view.tsx`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Start the dev server, use "Fill with Sample Data" (once Task 10 adds
Chattel/Machineries sample builders — if this task runs before Task 10,
defer this specific verification and note it; otherwise) on a Chattel
and a Machineries bundle, submit each, and confirm
`AppraisalReportView` renders both without error, matching the
reference screenshots' field content.

- [ ] **Step 8: Commit**

```bash
git add src/sections/admin/appraisal/appraisal-report-view.tsx
git commit -m "feat: add Chattel/Machineries read-only report views"
```

---

## Task 8: Same-kind selection restriction in the Collateral/TCT table

**Files:**
- Modify: `src/sections/admin/appraisal/appraisal-tct-table.tsx`

**Interfaces:**
- Consumes: `selectedIds`, `appraisalGroups`, `isRowLocked`,
  `docsIncomplete` (all existing in this file).
- Produces: `isWrongKind(groupId: string): boolean`, used only within
  this file's own row-rendering loop.

- [ ] **Step 1: Add `selectionKind` and `isWrongKind`**

Near `isRowLocked`/`docsIncomplete`'s own definitions (~line 299-317),
add:

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

- [ ] **Step 2: Wire into the row loop's `locked`/`incomplete` computation**

At the row-rendering loop (~line 532-536), add a third computed value:

```ts
const wrongKind = isWrongKind(group.id);
```

- [ ] **Step 3: Update the checkbox's `disabled` and `Tooltip`**

At the checkbox (~line 560-571), change:
```tsx
disabled={locked || incomplete}
```
to:
```tsx
disabled={locked || incomplete || wrongKind}
```
and extend the `Tooltip`'s `title` to cover the new case:
```tsx
title={
  !locked && incomplete
    ? 'Every document must be verified before this property can be assigned to an appraiser.'
    : !locked && !incomplete && wrongKind
      ? `This selection is already ${COLLATERAL_TYPE_LABEL[selectionKind!]} — a report can't mix collateral kinds.`
      : ''
}
```

- [ ] **Step 4: Manual verification — selection and clear**

Start the dev server, go to an application with at least one Real
Estate and one Chattel (or Machineries) collateral group in Requirement
Checklist's Collateral table. Select the Real Estate row's checkbox,
confirm the Chattel/Machineries rows' checkboxes become disabled with
the new tooltip. Clear the selection (uncheck the Real Estate row, or
use the existing "Clear selection" affordance if one exists in this
table's UI) and confirm all rows re-enable. Then select the Real Estate
row again, click through to "Assign Appraiser" and confirm, and verify
rows re-enable afterward too (since `selectedIds` resets via
`clearSelection()` inside `confirmAssign()`).

- [ ] **Step 5: Run `npx tsc --noEmit` and `npx eslint`**

Run: `npx tsc --noEmit` then `npx eslint src/sections/admin/appraisal/appraisal-tct-table.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/sections/admin/appraisal/appraisal-tct-table.tsx
git commit -m "feat: restrict Appraisal Report selection to one collateral kind"
```

---

## Task 9: Fix every remaining `bundle.report` call site (the rename pass)

**Files:**
- Modify: `src/sections/admin/appraisal-approver-bundle-view.tsx`
- Modify: `src/sections/admin/fee-approvals-view.tsx` (verify — Task 2's
  builder-check grep found this file imports `AppraisalReportBundle` but
  found no `.report.` usage; confirm and skip if truly unaffected)
- Modify: `src/sections/admin/appraisal-request-view.tsx` (same
  verify-and-skip-if-unaffected note)
- Modify: `src/sections/admin/report-approvals-view.tsx`
- Modify: `src/sections/admin/appraisal-view.tsx`
- Modify: `src/sections/admin/appraisal-appraiser-view.tsx`
- Modify: `src/sections/admin/appraisal/sample-appraisal-report.ts`
  (rename only in this task; Task 10 adds the new builders)
- Modify: `src/sections/admin/appraisal-appraiser-bundle-view.tsx`
- Modify: `src/sections/admin/appraisal/appraisal-bundle-status.ts`

**Interfaces:**
- Consumes: `getBundleUploadedAt` (Task 2).

- [ ] **Step 1: Re-run the full grep to get the authoritative, current list**

Run: `grep -rn '\.report\.\|bundle\.report\b' src/ --include=*.tsx --include=*.ts | grep -v node_modules`
Expected: a list of every remaining call site across all files above
(plus `appraiser-assignment-card.tsx`/`appraisal-report-view.tsx`/
`admin-context.tsx`, already fixed by Tasks 2/6/7 — confirm those show
zero remaining hits, or fix any stragglers Tasks 2/6/7 missed before
continuing).

- [ ] **Step 2: Fix every `bundle.report.uploadedAt` read**

For each file in the list whose only usage is `bundle.report.uploadedAt`
(confirmed in this plan's own reconnaissance to be
`appraisal-approver-bundle-view.tsx`, `report-approvals-view.tsx`,
`appraisal-view.tsx`, `appraisal-appraiser-view.tsx`,
`appraisal-tct-table.tsx` — already covered by Task 8's own file,
verify it doesn't also need this fix — `appraisal-appraiser-bundle-view.tsx`,
`appraisal-bundle-status.ts`): replace `bundle.report.uploadedAt` with
`getBundleUploadedAt(bundle)`, importing it from
`src/auth/admin-context`. Where the existing code does
`!!bundle.report.uploadedAt` or `!bundle.report.uploadedAt`, keep the
same boolean-coercion wrapper around the new call.

- [ ] **Step 3: Fix `sample-appraisal-report.ts`'s `bundle.report.landTitles` read**

At line 124 (per this plan's own grounding), change
`bundle.report.landTitles` to `bundle.realEstateReport.landTitles` (this
file's existing sample-builder is Real-Estate-specific, matching Task
10's planned split).

- [ ] **Step 4: Verify `fee-approvals-view.tsx` and `appraisal-request-view.tsx`**

If Step 1's grep shows no `.report.`/`bundle.report` hits in these two
files (only an `AppraisalReportBundle` type import with no field
access), no change needed — note this and move on. If a hit is found
that this plan didn't anticipate, fix it following the same pattern as
Step 2.

- [ ] **Step 5: Run `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: zero errors across the entire project.

- [ ] **Step 6: Run `npx eslint` on every file touched in this task**

Run: `npx eslint <every file listed in this task's Files section>`
Expected: no errors.

- [ ] **Step 7: Manual smoke test — the full Appraisal flow end to end**

Start the dev server. Walk through: Requirement Checklist's Collateral
table (add a Real Estate and a Chattel group), assign each to a separate
bundle, open each bundle's Appraisal Report form, fill a few fields in
each, submit each, open the Appraisal Approver's review page for each,
and confirm no console errors and correct kind-specific content renders
throughout.

- [ ] **Step 8: Commit**

```bash
git add src/sections/admin/appraisal-approver-bundle-view.tsx src/sections/admin/report-approvals-view.tsx src/sections/admin/appraisal-view.tsx src/sections/admin/appraisal-appraiser-view.tsx src/sections/admin/appraisal/sample-appraisal-report.ts src/sections/admin/appraisal-appraiser-bundle-view.tsx src/sections/admin/appraisal/appraisal-bundle-status.ts
git commit -m "refactor: migrate every bundle.report call site to the new per-kind fields"
```

---

## Task 10: Sample data for Chattel and Machineries

**Files:**
- Modify: `src/sections/admin/appraisal/sample-appraisal-report.ts`
- Modify: every call site that invokes the existing
  `buildSampleAppraisalReport` for "Fill with Sample Data" (confirm via
  `grep -rn "buildSampleAppraisalReport" src/` — the spec notes "3+"
  entry points; enumerate the exact list in this step before editing)

**Interfaces:**
- Consumes: `createAppraisalChattelReport`,
  `createAppraisalMachineriesReport` (Task 2, exported if not already),
  `AppraisalMarketSurveyEntry`, `AppraisalMachineryEntry` (Task 2).
- Produces: `buildSampleChattelReport(bundle: AppraisalReportBundle, submit: boolean): AppraisalChattelReport`,
  `buildSampleMachineriesReport(bundle: AppraisalReportBundle, submit: boolean): AppraisalMachineriesReport`
  (signatures mirror `buildSampleAppraisalReport`'s own exactly — confirm
  its real signature by reading the file first, since this plan infers
  the `(bundle, submit)` shape from the design spec's description
  without having read the function's own declaration line-by-line;
  adjust to match if the real signature differs).

- [ ] **Step 1: Read `buildSampleAppraisalReport`'s exact signature and every call site**

Run: `grep -n "function buildSampleAppraisalReport\|buildSampleAppraisalReport(" src/sections/admin/appraisal/sample-appraisal-report.ts src/sections/admin/*.tsx`
Record the exact parameter list and every call site found, to match in
Steps 2-3 below.

- [ ] **Step 2: Write `buildSampleChattelReport`**

Following the exact signature pattern found in Step 1, produce a fully
filled `AppraisalChattelReport`: realistic header values, Description of
Equipment values (a plausible vehicle — e.g. Toyota Hilux, with a
believable plate/engine/chassis number), all 4 checklists with a mix of
checked/unchecked and good/bad ratings (not all-true/all-good — a
believable sample has at least one "Bad" or unchecked item, matching
this app's "realistic, not placeholder" sample-data convention cited in
its own comments elsewhere), 2 Market Survey rows, and plausible
Appraised Value/Loanable Percent/Amount figures.

- [ ] **Step 3: Write `buildSampleMachineriesReport`**

Same convention: memo header filled in, Description of Equipments as a
sentence or two, 2-3 `AppraisalMachineryEntry` rows with plausible
unit/serial/price/depreciation values, Loanable Percent/Amount filled,
Qualification & Remarks with a sentence of text.

- [ ] **Step 4: Wire both into every "Fill with Sample Data" call site found in Step 1**

Each call site that currently calls `buildSampleAppraisalReport(...)`
and assigns the result to `bundle.realEstateReport` (per Task 9's
rename) needs a parallel call assigning
`buildSampleChattelReport(...)`/`buildSampleMachineriesReport(...)` to
`bundle.chattelReport`/`bundle.machineriesReport` — but **only when that
bundle's real kind matches** (a Real Estate bundle's "Fill Sample Data"
action should not also populate its unused Chattel/Machineries report
fields with sample data, since those stay meaningfully empty for a kind
the bundle isn't). Gate each new call on
`titleGroups[0]?.collateralType === 'chattel'` /`'machineries'`
respectively (same `titleGroups[0]` pattern as Task 6/7).

- [ ] **Step 5: Run `npx tsc --noEmit` and `npx eslint`**

Run: `npx tsc --noEmit` then `npx eslint src/sections/admin/appraisal/sample-appraisal-report.ts <every call site file from Step 1>`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Start the dev server, create a Chattel-kind bundle, click "Fill with
Sample Data" (or this app's equivalent entry point for this flow), and
confirm the Chattel form populates with the new sample values.  Repeat
for Machineries.

- [ ] **Step 7: Commit**

```bash
git add src/sections/admin/appraisal/sample-appraisal-report.ts <every call site file from Step 1>
git commit -m "feat: add Chattel/Machineries sample data"
```

---

## Final Verification (whole-plan)

- [ ] Run `npx tsc --noEmit` — zero errors.
- [ ] Run `npx eslint` across every file touched by this plan (the union
  of all tasks' Files sections) — zero errors.
- [ ] Run `npm run build` — succeeds (clear `.next` first if a stale dev
  server has corrupted it, per this project's own known quirk; `find
  .next -mindepth 1 -delete` then retry if `next build` reports a
  spurious `PageNotFoundError`/`MODULE_NOT_FOUND`).
- [ ] Manual smoke test covering every item in this plan's own Review
  Focus section (corrupted/missing collateral kind fallback, bundle
  with zero TCT groups, old-shape `localStorage` migration, preview
  switch not leaking into saved state, same-kind selection disable and
  re-enable).
