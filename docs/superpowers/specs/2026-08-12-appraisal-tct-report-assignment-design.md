# Appraisal — TCT-based Report Assignment — Design Spec

Date: 2026-08-12

## What this is

A revision to the existing Appraisal page (`src/sections/admin/appraisal-view.tsx`,
documented in `docs/ADMIN_APPRAISAL.md`). Today, appraiser assignment
(`review.appraisal.appraiserType` / `review.appraisal.report`) is a single
whole-application decision, even though the page already lists multiple
pledged properties by TCT/CCT number (`review.requirementChecklist.appraisalGroups`,
one `AppraisalTctGroup` per property).

This matches the source swimlane diagram's "Assign Appraiser" step more
closely: an officer reviews the endorsed appraisal documents, prepares a
**single or consolidated appraisal report** (one report can cover one TCT or
several bundled together), assigns **one appraiser (in-house/external)** to
that report, and that appraiser creates one report for everything bundled
into it. A loan with several pledged properties can therefore end up with
several independent report bundles, each with its own appraiser and its own
submission — e.g. TCT A+B consolidated into one in-house report, TCT C on
its own with an external report.

## Non-goals

- **No named-appraiser roster.** "Assign Appraiser" still only picks between
  In-house and External (`AppraiserType`), same as today — not a person
  picker like Application List's "Assign Officer". Confirmed directly by the
  user against the source diagram, which only branches on "Inhouse Appraiser?
  Yes/No", not a name.
- **No automated bundling suggestions.** The officer manually checks which
  TCTs go into a bundle; nothing infers "these should be consolidated."
- **No per-bundle Head Approval or Pass/Fail.** Both stay single,
  whole-application decisions exactly as they are today
  (`review.appraisal.headApprovalStatus`, `review.appraisal.passed`) — only
  appraiser assignment and report submission move to per-bundle.
- **Sample data is illustrative, not a real backing dataset.** 5 seeded TCT
  groups is a demo starting point, matching this prototype's existing
  local-state-only convention (no backend anywhere in this app).

## Data model changes (`src/auth/admin-context.tsx`)

`AppraisalTctGroup` gains a pointer to the bundle (if any) it belongs to:

```ts
export type AppraisalTctGroup = {
  id: string;
  tctNumber: string;
  documents: RequirementDoc[];
  reportId: string | null; // null = not yet part of any Appraisal Report bundle
};
```

New type, one per "Appraisal Report" the officer creates:

```ts
export type AppraisalReportBundle = {
  id: string;
  tctGroupIds: string[]; // 1 entry = single report, 2+ = consolidated
  appraiserType: AppraiserType | null;
  report: AppraisalReport; // unchanged shape: propertyDetails, appraisedValue,
                            // remarks, recommendation, fileName, fileUrl, uploadedAt
};
```

`Appraisal` drops its singular `appraiserType` / `report` fields and gains:

```ts
export type Appraisal = {
  feeStatus: AppraisalFeeStatus;
  feeAmount: string;
  feeDescription: string;
  feeRemarks: string;
  feeDeclineReason: string;
  clientNotifiedAt: string | null;
  sentToOdooAt: string | null;
  paymentReceivedAt: string | null;
  reportBundles: AppraisalReportBundle[]; // was: appraiserType, report
  headApprovalStatus: HeadApprovalStatus;
  headApprovalDeclineReason: string;
  passed: boolean | null;
  failReason: string;
};
```

`createInitialAppraisal()` seeds `reportBundles: []`.

New setters/mutators, alongside the existing `addAppraisalGroup` /
`removeAppraisalGroup` / `updateAppraisalGroupDoc`:

- `createAppraisalReportBundle(tctGroupIds: string[], appraiserType: AppraiserType)`
  — creates a new `AppraisalReportBundle` with a blank `report`, appends it
  to `reportBundles`, and stamps `reportId` on each named `AppraisalTctGroup`.
  Only callable with TCT groups whose `reportId` is currently `null`
  (guarded in the UI by disabling already-assigned rows' checkboxes).
- `setAppraisalBundleAppraiserType(bundleId, type)` — switches a bundle's
  in-house/external choice; same mutual-exclusivity reset as today (clears
  the other path's partial `report` data), scoped to that one bundle.
- `setAppraisalBundleReport(bundleId, data: Partial<AppraisalReport>)` —
  shallow-merges into that bundle's `report`, replacing today's
  `setAppraisalReport`.
- `deleteAppraisalReportBundle(bundleId)` — only allowed while
  `report.uploadedAt` is null (i.e. before submission); clears `reportId`
  back to `null` on every TCT group that referenced it, freeing them to be
  re-selected into a different bundle. Exists so an officer can undo an
  accidental grouping before any report work has started.

`createAppraisalGroup()` seeds `reportId: null`.

### Sample data

Seed 5 `AppraisalTctGroup` entries (`TCT-2024-00981` through `TCT-2024-00985`)
in `initialState`, all starting `reportId: null`, in place of today's single
seeded group — giving the page 5 example rows to demonstrate the
select-and-assign flow out of the box.

## Page UI (`src/sections/admin/appraisal-view.tsx` + new subcomponents)

The "Pledged Properties" card is replaced by two pieces:

### 1. TCT table

A table (or `appraisalNotApplicable`'s existing single-line message if that
flag is set, unchanged) listing every `appraisalGroups` entry as a row:

| ☐ | TCT No. | Documents | Status |
|---|---------|-----------|--------|

- **Checkbox** — disabled once that row's `reportId` points at a bundle
  whose `report.uploadedAt` is set (locked, matching today's "submitted
  report locks the card" convention). Enabled otherwise, including while
  it belongs to an *unsubmitted* bundle (lets the officer add more TCTs to
  a bundle-in-progress by re-selecting — see "Adding to an existing bundle"
  below).
- **Documents** — reuses the existing per-TCT document summary (the 8
  `APPRAISAL_DOC_META` rows), likely collapsed to a count/expand affordance
  since it now sits in a table row rather than its own full card. Expanding
  a row shows the same `ReadOnlyRequirementDocRow` list as today.
- **Status** — `Unassigned` (no `reportId`), or `In Report — In-house` /
  `In Report — External` (reads the owning bundle's `appraiserType`; shows
  "Pending appraiser type" if the bundle exists but the type hasn't been
  picked yet — see note below on bundle creation order).

### 2. Selection action bar

Appears above the table whenever ≥1 row with `reportId === null` is checked:
a small bar reading "N property(ies) selected" with an **"Assign Appraiser"**
button (visually modeled on Application List's "Assign Officer" button —
`solar:user-plus-rounded-bold-duotone` icon, navy outline, same sizing).
Clicking it opens a small dialog/popover to choose In-house or External
(the existing `ButtonGroup` toggle, lifted out of `AppraiserAssignmentCard`),
and confirming calls `createAppraisalReportBundle(selectedIds, type)`,
clearing the selection and scrolling to the new bundle's card below.

### 3. Appraisal Report cards

One card per `reportBundles` entry, rendered below the table in creation
order. Title: **"Appraisal Report"**, subtitle listing the TCT numbers it
covers (e.g. "Covers TCT-2024-00981, TCT-2024-00982"). Body reuses today's
`AppraiserAssignmentCard` internals verbatim (in-house structured form /
external dropzone, the dashed future-integration note, the lock-once-submitted
behavior) — just re-pointed from `review.appraisal.{appraiserType,report}` to
`bundle.{appraiserType,report}` via `setAppraisalBundleAppraiserType` /
`setAppraisalBundleReport`.

A checked row is selectable whether it's `Unassigned` or already in an
**unsubmitted** bundle (rows in a submitted bundle stay checkbox-disabled,
per the table rule above). This lets one selection cut across an existing
bundle-in-progress and fresh TCTs at once:

- If every checked row is `Unassigned`, the action bar's button reads
  **"Assign Appraiser"** and, on confirm, calls `createAppraisalReportBundle`
  to start a new bundle.
- If the checked rows all belong to the **same single** unsubmitted bundle
  plus zero or more `Unassigned` rows, the button reads **"Add to Report"**
  (no appraiser-type dialog — the bundle's type is already set) and appends
  the newly-checked `Unassigned` rows' IDs to that bundle's `tctGroupIds`,
  stamping their `reportId`.
- If the checked rows span **two or more different** existing bundles, the
  action bar disables its button with a short inline note ("Select
  properties from only one report at a time") — merging two bundles is not
  supported.

A bundle with no TCTs left (all removed) is not a reachable state in normal
use (removal only happens via `deleteAppraisalReportBundle`, which deletes
the whole bundle at once) — no empty-bundle handling is needed.

## Gating changes

- Appraiser assignment (table + bundle cards) stays gated on `feeResolved`
  exactly as today — locked placeholder shown until the fee is resolved.
- **Head Approval** unlocks once every `appraisalGroup` has a non-null
  `reportId` **and** every `reportBundles` entry has `report.uploadedAt` set
  — i.e. all pledged properties are accounted for in some bundle, and every
  bundle's report is submitted. Computed as:
  ```ts
  const allGroupsAssigned = appraisalGroups.every((g) => g.reportId !== null);
  const allBundlesSubmitted = reportBundles.every((b) => !!b.report.uploadedAt);
  const reportSubmitted = !appraisalNotApplicable && allGroupsAssigned && allBundlesSubmitted;
  ```
  (When `appraisalNotApplicable` is true, Head Approval unlocks the same way
  it does today — independent of any TCT/bundle state.)
- **Head Approval decline** clears `uploadedAt` / `fileName` / `fileUrl` on
  **every** bundle (not just one), looping all of them back to resubmission;
  each bundle's `appraiserType` and TCT membership is preserved, same
  preserve-the-assignment convention as today, just applied across all
  bundles at once.
- **Pass/Fail** is unchanged — still a single whole-application decision
  gated on `headApprovalStatus === 'approved'`.

## Edge cases

- Switching a bundle's in-house ↔ external before that bundle's report is
  submitted clears the other path's partial data — same rule as today,
  scoped per bundle instead of applying to the whole application.
- A TCT row can only be checked for selection while `reportId === null`;
  once bundled, it's only removable by deleting that entire bundle (which
  must not yet have a submitted report).
- If `appraisalNotApplicable` is true, the table/selection UI does not
  render at all (same as today's single-line message state) — appraiser
  assignment has no meaning without pledged properties.

## Docs

- `docs/ADMIN_APPRAISAL.md` — rewrite the "Pledged Properties" and
  "Appraiser Assignment" sections to describe the table + selection-bar +
  per-bundle-card structure, update "Head Approval"'s gating description to
  the all-groups-assigned-and-all-bundles-submitted rule, and update the
  Head Approval decline description to "clears every bundle's submitted
  report."
- `PROJECT_OVERVIEW.md` — no structural change expected (still references
  Appraisal only at a high level), but check for any stray mention of
  singular appraiser assignment.
