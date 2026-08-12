# Appraisal TCT Report Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Appraisal page's single whole-application appraiser assignment with a TCT-selection table + per-bundle "Appraisal Report" cards, so an officer can select one or more pledged properties (TCT Nos.), assign one appraiser (in-house/external) to that selection as a single/consolidated report, and repeat for any remaining TCTs — while Head Approval and Pass/Fail stay single, whole-application decisions gated on every TCT being covered by a submitted report.

**Architecture:** Data model changes live in `src/auth/admin-context.tsx` (new `AppraisalReportBundle` type, `reportId` on `AppraisalTctGroup`, `reportBundles` on `Appraisal` replacing its old singular `appraiserType`/`report` fields, plus new setters). UI changes live in `src/sections/admin/appraisal/` (new `AppraisalTctTable` component with checkboxes + selection action bar, `AppraiserAssignmentCard` reworked to take a `bundleId` prop instead of reading `review.appraisal` directly) and `src/sections/admin/appraisal-view.tsx` (renders the table + one card per bundle, updated gating math).

**Tech Stack:** Next.js (App Router), React, TypeScript, MUI v5 (`Table`/`TableRow`/`Checkbox`/`Popover`/`Button`), `react-dropzone` (existing external-report dropzone, unchanged). No test runner exists in this repo (confirmed: no jest/vitest/playwright config or `*.test.*` files anywhere) — verification in this plan is manual (`npm run dev` + browser interaction + `tsc`/lint), matching the codebase's existing convention of no automated tests.

## Global Constraints

- No named-appraiser roster — "assign appraiser" only ever picks between `'inhouse'` and `'external'` (`AppraiserType`), never a person. (Confirmed against source process diagram.)
- No per-bundle Head Approval or Pass/Fail — both remain single, whole-application decisions on `review.appraisal.headApprovalStatus` / `review.appraisal.passed`.
- Head Approval unlocks only once **every** `appraisalGroup` has `reportId !== null` **and every** bundle in `reportBundles` has `report.uploadedAt` set (unless `appraisalNotApplicable` is true, in which case it's independent of TCT/bundle state, unchanged from today).
- A TCT row's checkbox is disabled once it belongs to a bundle whose `report.uploadedAt` is set (locked).
- Switching a bundle's `appraiserType` before that bundle's report is submitted clears the other path's partial `report` data (mutual exclusivity), scoped to that one bundle only.
- Head Approval decline clears `uploadedAt`/`fileName`/`fileUrl` on **every** bundle, preserving each bundle's `appraiserType` and `tctGroupIds`.
- Seed 5 `AppraisalTctGroup` entries (`TCT-2024-00981` through `TCT-2024-00985`) in initial state, all starting `reportId: null`.
- Follow existing styling conventions exactly: `adminCardSx`, `outlinedNavyButtonSx`, `TONE_COLORS`/`StatusBadge` from `src/components/admin-ui` (barrel export at `src/components/admin-ui/index.ts`); MUI `Checkbox` styled via the existing theme override (`src/theme/core/components/checkbox.tsx`) — no custom checkbox styling needed.
- Update `docs/ADMIN_APPRAISAL.md` to match the new behavior as part of this work (per this project's standing "always update docs" rule) — do this in the final task, not incrementally, so it's written once against the finished behavior.

---

### Task 1: Data model — `AppraisalReportBundle` type, `reportId` on `AppraisalTctGroup`, `reportBundles` on `Appraisal`

**Files:**
- Modify: `src/auth/admin-context.tsx:556-560` (`AppraisalTctGroup`)
- Modify: `src/auth/admin-context.tsx:696-723` (`AppraisalReport`, `Appraisal`)
- Modify: `src/auth/admin-context.tsx:1001-1036` (`createAppraisalGroupDocuments`, `createAppraisalGroup`)
- Modify: `src/auth/admin-context.tsx:966-991` (`createInitialAppraisal`)
- Modify: `src/auth/admin-context.tsx:1191` (seed call site)
- Modify: `src/auth/admin-context.tsx:1308-1315` (`readStoredState` hydration)

**Interfaces:**
- Produces: `AppraisalReportBundle` type — `{ id: string; tctGroupIds: string[]; appraiserType: AppraiserType | null; report: AppraisalReport }`. `AppraisalTctGroup.reportId: string | null` (new field). `Appraisal.reportBundles: AppraisalReportBundle[]` (new field, replaces removed `appraiserType`/`report` fields on `Appraisal`). `createAppraisalGroup(tctNumber, seeded?)` now returns a group with `reportId: null`.
- Consumes: nothing from other tasks (this is the foundation task).

- [ ] **Step 1: Update `AppraisalTctGroup` to add `reportId`**

In `src/auth/admin-context.tsx`, replace:

```ts
export type AppraisalTctGroup = {
  id: string;
  tctNumber: string;
  documents: RequirementDoc[];
};
```

with:

```ts
export type AppraisalTctGroup = {
  id: string;
  tctNumber: string;
  documents: RequirementDoc[];
  // Points at the AppraisalReportBundle (below) this property has been
  // folded into, if any. null = not yet selected into any report — the
  // TCT table's checkbox is only selectable while this is null or while
  // it points at a bundle whose report is not yet submitted.
  reportId: string | null;
};
```

- [ ] **Step 2: Add `AppraisalReportBundle` type, remove `appraiserType`/`report` from `Appraisal`, add `reportBundles`**

Still in `src/auth/admin-context.tsx`, replace:

```ts
export type AppraiserType = 'inhouse' | 'external';

export type AppraisalReport = {
  propertyDetails: string;
  appraisedValue: string;
  remarks: string;
  recommendation: string;
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};

export type HeadApprovalStatus = 'pending' | 'approved' | 'declined';

export type Appraisal = {
  feeStatus: AppraisalFeeStatus;
  feeAmount: string;
  feeDescription: string;
  feeRemarks: string;
  feeDeclineReason: string;
  clientNotifiedAt: string | null;
  sentToOdooAt: string | null;
  paymentReceivedAt: string | null;
  appraiserType: AppraiserType | null;
  report: AppraisalReport;
  headApprovalStatus: HeadApprovalStatus;
  headApprovalDeclineReason: string;
  passed: boolean | null;
  failReason: string;
};
```

with:

```ts
export type AppraiserType = 'inhouse' | 'external';

export type AppraisalReport = {
  propertyDetails: string;
  appraisedValue: string;
  remarks: string;
  recommendation: string;
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};

// One "Appraisal Report" the officer creates by selecting one or more
// pledged properties (AppraisalTctGroup) from the TCT table and assigning
// a single appraiser to that selection — tctGroupIds.length === 1 is a
// "single" report, 2+ is "consolidated", matching the source process
// diagram's "Prepare/upload document for Single/consolidated appraisal
// report" step. Replaces the old single whole-application
// Appraisal.appraiserType/Appraisal.report fields below.
export type AppraisalReportBundle = {
  id: string;
  tctGroupIds: string[];
  appraiserType: AppraiserType | null;
  report: AppraisalReport;
};

export type HeadApprovalStatus = 'pending' | 'approved' | 'declined';

export type Appraisal = {
  feeStatus: AppraisalFeeStatus;
  feeAmount: string;
  feeDescription: string;
  feeRemarks: string;
  feeDeclineReason: string;
  clientNotifiedAt: string | null;
  sentToOdooAt: string | null;
  paymentReceivedAt: string | null;
  reportBundles: AppraisalReportBundle[];
  headApprovalStatus: HeadApprovalStatus;
  headApprovalDeclineReason: string;
  passed: boolean | null;
  failReason: string;
};
```

- [ ] **Step 3: Update `createAppraisalGroup`/`createAppraisalGroupDocuments` to seed `reportId: null`, add `createAppraisalReportBundle` factory**

Replace:

```ts
function createAppraisalGroup(tctNumber: string, seeded = false): AppraisalTctGroup {
  return {
    id: crypto.randomUUID(),
    tctNumber,
    documents: createAppraisalGroupDocuments(seeded),
  };
}
```

with:

```ts
function createAppraisalGroup(tctNumber: string, seeded = false): AppraisalTctGroup {
  return {
    id: crypto.randomUUID(),
    tctNumber,
    documents: createAppraisalGroupDocuments(seeded),
    reportId: null,
  };
}

function createAppraisalReportBundle(tctGroupIds: string[], appraiserType: AppraiserType): AppraisalReportBundle {
  return {
    id: crypto.randomUUID(),
    tctGroupIds,
    appraiserType,
    report: {
      propertyDetails: '',
      appraisedValue: '',
      remarks: '',
      recommendation: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
    },
  };
}
```

(`createAppraisalGroupDocuments` itself is unchanged — leave it exactly as-is.)

- [ ] **Step 4: Update `createInitialAppraisal` to seed `reportBundles: []`**

Replace:

```ts
function createInitialAppraisal(): Appraisal {
  return {
    feeStatus: 'not-requested',
    feeAmount: '',
    feeDescription: '',
    feeRemarks: '',
    feeDeclineReason: '',
    clientNotifiedAt: null,
    sentToOdooAt: null,
    paymentReceivedAt: null,
    appraiserType: null,
    report: {
      propertyDetails: '',
      appraisedValue: '',
      remarks: '',
      recommendation: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
    },
    headApprovalStatus: 'pending',
    headApprovalDeclineReason: '',
    passed: null,
    failReason: '',
  };
}
```

with:

```ts
function createInitialAppraisal(): Appraisal {
  return {
    feeStatus: 'not-requested',
    feeAmount: '',
    feeDescription: '',
    feeRemarks: '',
    feeDeclineReason: '',
    clientNotifiedAt: null,
    sentToOdooAt: null,
    paymentReceivedAt: null,
    reportBundles: [],
    headApprovalStatus: 'pending',
    headApprovalDeclineReason: '',
    passed: null,
    failReason: '',
  };
}
```

- [ ] **Step 5: Seed 5 TCT groups instead of 1**

At the seed call site (`requirementChecklist.appraisalGroups` inside `createInitialReview`), replace:

```ts
      appraisalGroups: [createAppraisalGroup('TCT-2024-00981', true)],
```

with:

```ts
      appraisalGroups: [
        createAppraisalGroup('TCT-2024-00981', true),
        createAppraisalGroup('TCT-2024-00982', true),
        createAppraisalGroup('TCT-2024-00983', true),
        createAppraisalGroup('TCT-2024-00984', true),
        createAppraisalGroup('TCT-2024-00985', true),
      ],
```

- [ ] **Step 6: Fix `readStoredState()`'s `appraisal` hydration block**

Find the block (currently deep-merging the old singular `report` field):

```ts
        appraisal: {
          ...initialState.review.appraisal,
          ...storedReview.appraisal,
          report: {
            ...initialState.review.appraisal.report,
            ...storedReview.appraisal?.report,
          },
        },
```

Replace with a version that hydrates `reportBundles` (an array of objects each with their own nested `report`, so each stored bundle needs its own `report` defaulted, not just the top-level object):

```ts
        appraisal: {
          ...initialState.review.appraisal,
          ...storedReview.appraisal,
          reportBundles: (storedReview.appraisal?.reportBundles ?? []).map((bundle: AppraisalReportBundle) => ({
            id: bundle.id,
            tctGroupIds: bundle.tctGroupIds ?? [],
            appraiserType: bundle.appraiserType ?? null,
            report: {
              propertyDetails: '',
              appraisedValue: '',
              remarks: '',
              recommendation: '',
              fileName: null,
              fileUrl: null,
              uploadedAt: null,
              ...bundle.report,
            },
          })),
        },
```

- [ ] **Step 7: Verify TypeScript compiles (expect errors in dependent files — that's expected at this point)**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: errors in `appraisal-view.tsx`, `appraiser-assignment-card.tsx`, and `head-approval-card.tsx` (they still reference the removed `review.appraisal.appraiserType`/`review.appraisal.report`/`setAppraisalReport`) — these are fixed in later tasks. Confirm there are **no** errors reported inside `admin-context.tsx` itself; if there are, fix them before proceeding.

- [ ] **Step 8: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx
git commit -m "Move appraiser assignment from single Appraisal fields to per-TCT report bundles

Adds AppraisalReportBundle and AppraisalTctGroup.reportId so appraiser
assignment can happen per-selection of TCTs instead of once for the
whole application. UI call sites are updated in follow-up commits."
```

---

### Task 2: Data model — setters for report bundles

**Files:**
- Modify: `src/auth/admin-context.tsx` (type block containing `AdminContextValue`, and the setter implementations near `addAppraisalGroup`/`setAppraisalReport`)

**Interfaces:**
- Consumes: `AppraisalReportBundle`, `createAppraisalReportBundle`, `AppraiserType` from Task 1.
- Produces: `createAppraisalReportBundle(tctGroupIds: string[], appraiserType: AppraiserType): void`, `addTctGroupsToReportBundle(bundleId: string, tctGroupIds: string[]): void`, `setAppraisalBundleAppraiserType(bundleId: string, appraiserType: AppraiserType): void`, `setAppraisalBundleReport(bundleId: string, data: Partial<AppraisalReport>): void`, `deleteAppraisalReportBundle(bundleId: string): void` — all exposed on `useAdmin()`.

Note: the context-level setter is also named `createAppraisalReportBundle`, same name as the internal factory function added in Task 1 — this is fine since the factory (module-private, not exported) is only ever called from inside this new setter, exactly like `createAppraisalGroup` is only called from inside `addAppraisalGroup`.

- [ ] **Step 1: Remove `setAppraisal`'s appraiserType/report and `setAppraisalReport` from `AdminContextValue`, add new bundle setter signatures**

In the `AdminContextValue` type block, find:

```ts
  setAppraisal: (data: Partial<Appraisal>) => void;
  setAppraisalReport: (data: Partial<AppraisalReport>) => void;
```

Replace with:

```ts
  setAppraisal: (data: Partial<Appraisal>) => void;
  createAppraisalReportBundle: (tctGroupIds: string[], appraiserType: AppraiserType) => void;
  addTctGroupsToReportBundle: (bundleId: string, tctGroupIds: string[]) => void;
  setAppraisalBundleAppraiserType: (bundleId: string, appraiserType: AppraiserType) => void;
  setAppraisalBundleReport: (bundleId: string, data: Partial<AppraisalReport>) => void;
  deleteAppraisalReportBundle: (bundleId: string) => void;
```

(`setAppraisal` itself is unchanged in signature — it still merges into `review.appraisal` for the fee/head-approval/pass-fail fields that remain there. Only `setAppraisalReport` is removed, since its job is now split across the four new setters.)

- [ ] **Step 2: Remove the old `setAppraisalReport` implementation, add the five new setter implementations**

Find (in the setter-implementations block, next to `setAppraisal`):

```ts
      setAppraisal: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: { ...prev.review.appraisal, ...data },
          },
        })),
      setAppraisalReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              report: { ...prev.review.appraisal.report, ...data },
            },
          },
        })),
```

Replace with:

```ts
      setAppraisal: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: { ...prev.review.appraisal, ...data },
          },
        })),
      createAppraisalReportBundle: (tctGroupIds, appraiserType) =>
        setState((prev) => {
          const bundle = createAppraisalReportBundle(tctGroupIds, appraiserType);
          return {
            ...prev,
            review: {
              ...prev.review,
              appraisal: {
                ...prev.review.appraisal,
                reportBundles: [...prev.review.appraisal.reportBundles, bundle],
              },
              requirementChecklist: {
                ...prev.review.requirementChecklist,
                appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                  tctGroupIds.includes(group.id) ? { ...group, reportId: bundle.id } : group
                ),
              },
            },
          };
        }),
      addTctGroupsToReportBundle: (bundleId, tctGroupIds) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId
                  ? bundle
                  : { ...bundle, tctGroupIds: [...bundle.tctGroupIds, ...tctGroupIds] }
              ),
            },
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                tctGroupIds.includes(group.id) ? { ...group, reportId: bundleId } : group
              ),
            },
          },
        })),
      setAppraisalBundleAppraiserType: (bundleId, appraiserType) =>
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
                      appraiserType,
                      report: {
                        propertyDetails: '',
                        appraisedValue: '',
                        remarks: '',
                        recommendation: '',
                        fileName: null,
                        fileUrl: null,
                        uploadedAt: null,
                      },
                    }
              ),
            },
          },
        })),
      setAppraisalBundleReport: (bundleId, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId ? bundle : { ...bundle, report: { ...bundle.report, ...data } }
              ),
            },
          },
        })),
      deleteAppraisalReportBundle: (bundleId) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.filter((bundle) => bundle.id !== bundleId),
            },
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                group.reportId === bundleId ? { ...group, reportId: null } : group
              ),
            },
          },
        })),
```

- [ ] **Step 3: Also add a whole-application "clear all bundle reports" setter for Head Approval decline**

Add this setter to both the type block and implementation block, alongside the ones above:

Type (`AdminContextValue`):

```ts
  clearAllAppraisalBundleReports: () => void;
```

Implementation:

```ts
      clearAllAppraisalBundleReports: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) => ({
                ...bundle,
                report: { ...bundle.report, uploadedAt: null, fileName: null, fileUrl: null },
              })),
            },
          },
        })),
```

- [ ] **Step 4: Verify TypeScript — `admin-context.tsx` itself should now compile clean**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit 2>&1 | grep "admin-context.tsx"`
Expected: no output (no errors in this file). Errors in `appraisal-view.tsx`/`appraiser-assignment-card.tsx`/`head-approval-card.tsx` are still expected and fixed in Tasks 3-5.

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx
git commit -m "Add setters for creating, extending, and clearing appraisal report bundles"
```

---

### Task 3: Rework `AppraiserAssignmentCard` to take a `bundleId` prop

**Files:**
- Modify: `src/sections/admin/appraisal/appraiser-assignment-card.tsx`

**Interfaces:**
- Consumes: `review.appraisal.reportBundles: AppraisalReportBundle[]` (Task 1), `setAppraisalBundleAppraiserType(bundleId, type)`, `setAppraisalBundleReport(bundleId, data)` (Task 2). `review.appraisal.headApprovalStatus` (unchanged, already exists).
- Produces: `AppraiserAssignmentCard({ bundleId, tctNumbers }: { bundleId: string; tctNumbers: string[] })` — a named export taking two props instead of none. `tctNumbers` is passed in purely for display (the card's own subtitle), not looked up internally, so this component stays decoupled from `requirementChecklist`.

- [ ] **Step 1: Change the component signature and internal state lookups**

Replace the top of the component (currently):

```tsx
export function AppraiserAssignmentCard() {
  const { review, setAppraisal, setAppraisalReport } = useAdmin();
  const { appraiserType, report, headApprovalStatus } = review.appraisal;
  const locked = headApprovalStatus !== 'pending' || !!report.uploadedAt;
  const editable = !locked;

  const selectType = (type: AppraiserType) => {
    if (type === appraiserType) return;
    setAppraisal({ appraiserType: type });
    setAppraisalReport({
      propertyDetails: '',
      appraisedValue: '',
      remarks: '',
      recommendation: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
    });
  };

  const handleExternalFile = (file: File | null) => {
    if (!file) {
      setAppraisalReport({ fileName: null, fileUrl: null, uploadedAt: null });
      return;
    }
    setAppraisalReport({
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    });
  };

  const submitInhouseReport = () => {
    if (!report.propertyDetails.trim() || !report.appraisedValue.trim()) return;
    setAppraisalReport({ uploadedAt: new Date().toISOString() });
  };
```

with:

```tsx
export function AppraiserAssignmentCard({
  bundleId,
  tctNumbers,
}: {
  bundleId: string;
  tctNumbers: string[];
}) {
  const { review, setAppraisalBundleAppraiserType, setAppraisalBundleReport } = useAdmin();
  const { headApprovalStatus } = review.appraisal;
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);
  if (!bundle) return null;
  const { appraiserType, report } = bundle;
  const locked = headApprovalStatus !== 'pending' || !!report.uploadedAt;
  const editable = !locked;

  const selectType = (type: AppraiserType) => {
    if (type === appraiserType) return;
    setAppraisalBundleAppraiserType(bundleId, type);
  };

  const handleExternalFile = (file: File | null) => {
    if (!file) {
      setAppraisalBundleReport(bundleId, { fileName: null, fileUrl: null, uploadedAt: null });
      return;
    }
    setAppraisalBundleReport(bundleId, {
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    });
  };

  const submitInhouseReport = () => {
    if (!report.propertyDetails.trim() || !report.appraisedValue.trim()) return;
    setAppraisalBundleReport(bundleId, { uploadedAt: new Date().toISOString() });
  };
```

- [ ] **Step 2: Update the remaining `setAppraisalReport` calls inside the in-house form's `onChange` handlers**

Find each of the four `TextField`s' `onChange` handlers:

```tsx
            onChange={(event) => setAppraisalReport({ propertyDetails: event.target.value })}
```
```tsx
            onChange={(event) => setAppraisalReport({ appraisedValue: event.target.value })}
```
```tsx
            onChange={(event) => setAppraisalReport({ remarks: event.target.value })}
```
```tsx
            onChange={(event) => setAppraisalReport({ recommendation: event.target.value })}
```

Replace each with the bundle-scoped equivalent, e.g.:

```tsx
            onChange={(event) => setAppraisalBundleReport(bundleId, { propertyDetails: event.target.value })}
```
```tsx
            onChange={(event) => setAppraisalBundleReport(bundleId, { appraisedValue: event.target.value })}
```
```tsx
            onChange={(event) => setAppraisalBundleReport(bundleId, { remarks: event.target.value })}
```
```tsx
            onChange={(event) => setAppraisalBundleReport(bundleId, { recommendation: event.target.value })}
```

- [ ] **Step 3: Update the card's title/subtitle to show which TCTs it covers**

Find:

```tsx
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Appraiser Assignment
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Assign an in-house appraiser or upload an external appraiser&apos;s finished report.
      </Typography>
```

Replace with:

```tsx
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Appraisal Report
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Covers {tctNumbers.join(', ')}. Assign an in-house appraiser or upload an external
        appraiser&apos;s finished report.
      </Typography>
```

- [ ] **Step 4: Verify TypeScript — this file should now compile clean**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit 2>&1 | grep "appraiser-assignment-card.tsx"`
Expected: no output. (`appraisal-view.tsx` will still error since it renders `<AppraiserAssignmentCard />` with no props — fixed in Task 6.)

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/appraisal/appraiser-assignment-card.tsx
git commit -m "Rework AppraiserAssignmentCard to operate on a single report bundle"
```

---

### Task 4: Update `HeadApprovalCard` to clear all bundles on decline

**Files:**
- Modify: `src/sections/admin/appraisal/head-approval-card.tsx`

**Interfaces:**
- Consumes: `clearAllAppraisalBundleReports()` (Task 2).
- Produces: no change to this component's own exported signature (`HeadApprovalCard()` still takes no props).

- [ ] **Step 1: Replace the single-report clear with the all-bundles clear**

Find:

```tsx
  const { review, setAppraisal, setAppraisalReport } = useAdmin();
  const { headApprovalStatus, headApprovalDeclineReason } = review.appraisal;
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const approve = () => setAppraisal({ headApprovalStatus: 'approved' });

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setAppraisal({ headApprovalStatus: 'pending', headApprovalDeclineReason: declineReason.trim() });
    setAppraisalReport({ uploadedAt: null, fileName: null, fileUrl: null });
    setDeclineOpen(false);
    setDeclineReason('');
  };
```

Replace with:

```tsx
  const { review, setAppraisal, clearAllAppraisalBundleReports } = useAdmin();
  const { headApprovalStatus, headApprovalDeclineReason } = review.appraisal;
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const approve = () => setAppraisal({ headApprovalStatus: 'approved' });

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setAppraisal({ headApprovalStatus: 'pending', headApprovalDeclineReason: declineReason.trim() });
    clearAllAppraisalBundleReports();
    setDeclineOpen(false);
    setDeclineReason('');
  };
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit 2>&1 | grep "head-approval-card.tsx"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/appraisal/head-approval-card.tsx
git commit -m "Clear every report bundle's submitted report on Head Approval decline"
```

---

### Task 5: New `AppraisalTctTable` component (checkbox table + selection action bar)

**Files:**
- Create: `src/sections/admin/appraisal/appraisal-tct-table.tsx`

**Interfaces:**
- Consumes: `review.requirementChecklist.appraisalGroups: AppraisalTctGroup[]`, `review.appraisal.reportBundles: AppraisalReportBundle[]` (Task 1), `createAppraisalReportBundle(tctGroupIds, appraiserType)`, `addTctGroupsToReportBundle(bundleId, tctGroupIds)` (Task 2), `APPRAISAL_DOC_META` (existing, `src/sections/admin/requirement-checklist-docs.ts`), `ReadOnlyRequirementDocRow` (existing, `src/sections/admin/credit-investigation/credit-investigation-doc-row.tsx`), `adminCardSx`/`outlinedNavyButtonSx`/`TONE_COLORS` (existing, `src/components/admin-ui`).
- Produces: `AppraisalTctTable({ applicantName }: { applicantName: string })` — self-contained component owning its own selection state; renders the table, the selection action bar, and the assign/add-to-report dialog. Takes no bundle-related props since it reads/writes `useAdmin()` directly (matching this codebase's convention of admin-context-connected section components, e.g. `AppraisalFeeCard`).

- [ ] **Step 1: Write the component's state, derived data, and row-selection logic**

Create `src/sections/admin/appraisal/appraisal-tct-table.tsx`:

```tsx
'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import TableContainer from '@mui/material/TableContainer';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx, TONE_COLORS } from 'src/components/admin-ui';

import { APPRAISAL_DOC_META } from '../requirement-checklist-docs';
import { ReadOnlyRequirementDocRow } from '../credit-investigation/credit-investigation-doc-row';

import type { AppraiserType } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Lets an officer select one or more pledged properties (TCT Nos.) and
// fold them into a single "Appraisal Report" bundle with one appraiser —
// or add more properties to a report bundle that hasn't been submitted
// yet. A selection spanning two different existing bundles is blocked
// (merging bundles isn't supported); see the source process diagram's
// "Prepare/upload document for Single/consolidated appraisal report" step,
// which this table implements the selection side of.
// ----------------------------------------------------------------------

export function AppraisalTctTable({ applicantName }: { applicantName: string }) {
  const { review, createAppraisalReportBundle, addTctGroupsToReportBundle } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { reportBundles } = review.appraisal;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignType, setAssignType] = useState<AppraiserType>('inhouse');

  const bundleForGroup = (groupId: string) =>
    reportBundles.find((bundle) => bundle.tctGroupIds.includes(groupId)) ?? null;

  const isRowLocked = (groupId: string) => {
    const bundle = bundleForGroup(groupId);
    return !!bundle?.report.uploadedAt;
  };

  const toggleRow = (groupId: string) => {
    setSelectedIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const selectedBundleIds = Array.from(
    new Set(
      selectedIds
        .map((id) => bundleForGroup(id)?.id)
        .filter((id): id is string => !!id)
    )
  );
  const spansMultipleBundles = selectedBundleIds.length > 1;
  const targetExistingBundleId = selectedBundleIds.length === 1 ? selectedBundleIds[0] : null;

  const clearSelection = () => setSelectedIds([]);

  const confirmAssign = () => {
    createAppraisalReportBundle(selectedIds, assignType);
    clearSelection();
    setAssignOpen(false);
  };

  const confirmAddToExisting = () => {
    if (!targetExistingBundleId) return;
    const newIds = selectedIds.filter((id) => bundleForGroup(id)?.id !== targetExistingBundleId);
    if (newIds.length > 0) addTctGroupsToReportBundle(targetExistingBundleId, newIds);
    clearSelection();
  };
```

- [ ] **Step 2: Write the table markup and selection action bar (append inside the same function, before the closing brace)**

```tsx
  const statusFor = (groupId: string) => {
    const bundle = bundleForGroup(groupId);
    if (!bundle) return { label: 'Unassigned', tone: 'neutral' as const };
    if (!bundle.appraiserType) return { label: 'Pending appraiser type', tone: 'warning' as const };
    return {
      label: bundle.appraiserType === 'inhouse' ? 'In Report — In-house' : 'In Report — External',
      tone: 'info' as const,
    };
  };

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Pledged Properties
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Select one or more TCT/CCT numbers to assign an appraiser — a report can cover a single
        property or several bundled together.
      </Typography>

      {selectedIds.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2, p: 1.5, borderRadius: '12px', bgcolor: TONE_COLORS.info.bg }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TONE_COLORS.info.text }}>
            {selectedIds.length} propert{selectedIds.length === 1 ? 'y' : 'ies'} selected
          </Typography>
          {spansMultipleBundles ? (
            <Typography sx={{ fontSize: 12.5, color: '#B36A05' }}>
              Select properties from only one report at a time.
            </Typography>
          ) : targetExistingBundleId ? (
            <Button
              onClick={confirmAddToExisting}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Add to Report
            </Button>
          ) : (
            <Button
              onClick={() => {
                setAssignType('inhouse');
                setAssignOpen(true);
              }}
              variant="contained"
              size="small"
              startIcon={<Iconify icon="solar:user-plus-rounded-bold-duotone" width={16} />}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Assign Appraiser
            </Button>
          )}
        </Stack>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>TCT No.</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appraisalGroups.map((group) => {
              const status = statusFor(group.id);
              const locked = isRowLocked(group.id);
              const expanded = expandedId === group.id;
              return (
                <>
                  <TableRow key={group.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.includes(group.id)}
                        disabled={locked}
                        onChange={() => toggleRow(group.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
                        {group.tctNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpandedId(expanded ? null : group.id)}>
                        <Iconify
                          icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                          width={18}
                        />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          px: 1,
                          py: 0.5,
                          borderRadius: '999px',
                          bgcolor: TONE_COLORS[status.tone].bg,
                          color: TONE_COLORS[status.tone].text,
                          fontSize: 11.5,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status.label}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow key={`${group.id}-expand`}>
                    <TableCell colSpan={4} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
                      <Collapse in={expanded} unmountOnExit>
                        <Stack spacing={1.25} sx={{ py: 2 }}>
                          {APPRAISAL_DOC_META.map((meta) => {
                            const doc = group.documents.find((groupDoc) => groupDoc.key === meta.key);
                            if (!doc) return null;
                            return (
                              <ReadOnlyRequirementDocRow
                                key={meta.key}
                                label={meta.label}
                                doc={doc}
                                applicantName={applicantName}
                              />
                            );
                          })}
                        </Stack>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {assignOpen && (
        <Stack
          spacing={1.5}
          sx={{ mt: 2, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#F9FAFC' }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
            Assign appraiser to {selectedIds.length} propert{selectedIds.length === 1 ? 'y' : 'ies'}
          </Typography>
          <ButtonGroup>
            <Button
              onClick={() => setAssignType('inhouse')}
              variant={assignType === 'inhouse' ? 'contained' : 'outlined'}
              sx={assignType === 'inhouse' ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } } : outlinedNavyButtonSx}
            >
              In-house
            </Button>
            <Button
              onClick={() => setAssignType('external')}
              variant={assignType === 'external' ? 'contained' : 'outlined'}
              sx={assignType === 'external' ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } } : outlinedNavyButtonSx}
            >
              External
            </Button>
          </ButtonGroup>
          <Stack direction="row" spacing={1.25}>
            <Button
              onClick={confirmAssign}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Create Report
            </Button>
            <Button onClick={() => setAssignOpen(false)} variant="outlined" size="small" sx={outlinedNavyButtonSx}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit 2>&1 | grep "appraisal-tct-table.tsx"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/appraisal/appraisal-tct-table.tsx
git commit -m "Add AppraisalTctTable: checkbox selection + bulk appraiser assignment"
```

---

### Task 6: Wire `appraisal-view.tsx` to the new table and per-bundle cards, update gating

**Files:**
- Modify: `src/sections/admin/appraisal-view.tsx`

**Interfaces:**
- Consumes: `AppraisalTctTable` (Task 5), `AppraiserAssignmentCard({ bundleId, tctNumbers })` (Task 3), `review.appraisal.reportBundles` (Task 1).
- Produces: no exported change — `AppraisalView()` keeps its existing no-props signature.

- [ ] **Step 1: Replace the "Pledged Properties" inline block with `AppraisalTctTable`, remove the old imports it no longer needs**

Find the imports block:

```tsx
import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { AppraisalFeeCard } from './appraisal/appraisal-fee-card';
import { HeadApprovalCard } from './appraisal/head-approval-card';
import { PassFailCard } from './appraisal/pass-fail-card';
import { AppraiserAssignmentCard } from './appraisal/appraiser-assignment-card';
import { APPRAISAL_DOC_META } from './requirement-checklist-docs';
import { ReadOnlyRequirementDocRow } from './credit-investigation/credit-investigation-doc-row';
```

Replace with:

```tsx
import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { AppraisalFeeCard } from './appraisal/appraisal-fee-card';
import { HeadApprovalCard } from './appraisal/head-approval-card';
import { PassFailCard } from './appraisal/pass-fail-card';
import { AppraisalTctTable } from './appraisal/appraisal-tct-table';
import { AppraiserAssignmentCard } from './appraisal/appraiser-assignment-card';
```

- [ ] **Step 2: Replace the body's destructuring and gating math**

Find:

```tsx
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { feeStatus, paymentReceivedAt, headApprovalStatus, report, passed, failReason } =
    review.appraisal;

  if (!signUpData) return null;

  if (passed === false) {
    return <FailedOutcome reason={failReason} />;
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;

  const feeResolved = feeStatus === 'not-applicable' || (feeStatus === 'approved' && !!paymentReceivedAt);
  const reportSubmitted = !!report.uploadedAt;
  const headApproved = headApprovalStatus === 'approved';
```

Replace with:

```tsx
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { feeStatus, paymentReceivedAt, headApprovalStatus, reportBundles, passed, failReason } =
    review.appraisal;

  if (!signUpData) return null;

  if (passed === false) {
    return <FailedOutcome reason={failReason} />;
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;

  const feeResolved = feeStatus === 'not-applicable' || (feeStatus === 'approved' && !!paymentReceivedAt);
  const allGroupsAssigned = appraisalGroups.every((group) => group.reportId !== null);
  const allBundlesSubmitted = reportBundles.every((bundle) => !!bundle.report.uploadedAt);
  const reportSubmitted =
    appraisalNotApplicable || (allGroupsAssigned && reportBundles.length > 0 && allBundlesSubmitted);
  const headApproved = headApprovalStatus === 'approved';
```

- [ ] **Step 3: Replace the "Pledged Properties" card and the single `AppraiserAssignmentCard` render with the table + per-bundle cards**

Find:

```tsx
        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Pledged Properties
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Endorsed documents collected during Requirement Checklist, for reference during
            appraisal.
          </Typography>

          {appraisalNotApplicable ? (
            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
              This application has no pledged real-estate collateral.
            </Typography>
          ) : (
            <Stack spacing={3}>
              {appraisalGroups.map((group) => (
                <Stack key={group.id} spacing={1.25}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                    {group.tctNumber}
                  </Typography>
                  <Stack spacing={1.25}>
                    {APPRAISAL_DOC_META.map((meta) => {
                      const doc = group.documents.find((groupDoc) => groupDoc.key === meta.key);
                      if (!doc) return null;
                      return (
                        <ReadOnlyRequirementDocRow
                          key={meta.key}
                          label={meta.label}
                          doc={doc}
                          applicantName={applicantName}
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>

        <AppraisalFeeCard />

        {feeResolved ? (
          <AppraiserAssignmentCard />
        ) : (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Resolve the Appraisal Fee above to unlock appraiser assignment.
            </Typography>
          </Box>
        )}
```

Replace with:

```tsx
        {appraisalNotApplicable ? (
          <Box sx={adminCardSx}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Pledged Properties
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
              This application has no pledged real-estate collateral.
            </Typography>
          </Box>
        ) : (
          <AppraisalTctTable applicantName={applicantName} />
        )}

        <AppraisalFeeCard />

        {!appraisalNotApplicable && feeResolved ? (
          reportBundles.map((bundle) => (
            <AppraiserAssignmentCard
              key={bundle.id}
              bundleId={bundle.id}
              tctNumbers={appraisalGroups
                .filter((group) => bundle.tctGroupIds.includes(group.id))
                .map((group) => group.tctNumber)}
            />
          ))
        ) : !appraisalNotApplicable ? (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Resolve the Appraisal Fee above to unlock appraiser assignment.
            </Typography>
          </Box>
        ) : null}
```

- [ ] **Step 4: Verify TypeScript — the whole project should now compile clean**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: no errors anywhere.

- [ ] **Step 5: Manual verification in the browser**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npm run dev`

Navigate to an application's Appraisal page (`/admin/applications/[id]/appraisal`, reachable from the Application List queue's Appraisal-step row). Verify:
1. The Pledged Properties table shows 5 rows (`TCT-2024-00981` through `-00985`), each `Status: Unassigned`.
2. Checking 2 rows shows the selection bar with "2 properties selected" and an "Assign Appraiser" button.
3. Clicking "Assign Appraiser", picking "In-house", and clicking "Create Report" creates a new "Appraisal Report" card below showing "Covers TCT-2024-00981, TCT-2024-00982" (or whichever two were picked), and both rows' Status updates to "In Report — In-house".
4. Checking one of those two rows again plus a third, previously-unassigned row shows "Add to Report" (not "Assign Appraiser", since the selection includes one existing bundle plus one new row); clicking it adds the third TCT into the same card.
5. Checking one row from that bundle and one row from a different, not-yet-existing bundle (i.e. two unassigned rows plus try mixing with an assigned one from a different bundle once a second bundle exists) shows the "Select properties from only one report at a time" message with the button disabled.
6. Submitting that bundle's report (fill Property Details + Appraised Value, click "Create Appraisal Report") locks its checkboxes (can no longer be selected) and updates the row's Status pill to stay "In Report — In-house" but the checkbox is now disabled.
7. Head Approval stays a locked placeholder until every one of the 5 TCT rows is inside a submitted bundle — assign and submit reports for the remaining rows, confirm Head Approval unlocks only once the last one submits.
8. Trigger "Simulate: Head Declines" on Head Approval with a reason; confirm every Appraisal Report card's submitted state clears (back to editable) while each card's In-house/External choice and TCT coverage stays the same.

- [ ] **Step 6: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/appraisal-view.tsx
git commit -m "Render TCT table + one Appraisal Report card per bundle on the Appraisal page"
```

---

### Task 7: Update `docs/ADMIN_APPRAISAL.md`

**Files:**
- Modify: `docs/ADMIN_APPRAISAL.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing (documentation only).

- [ ] **Step 1: Rewrite the "Pledged Properties" section**

Replace the existing "## Pledged Properties" section body (lines 68-84) with:

```markdown
## Pledged Properties

A table of every `review.requirementChecklist.appraisalGroups` entry
(`AppraisalTctGroup`, `{ id, tctNumber, documents, reportId }`), one row per
pledged property (TCT/CCT), rendered by
`src/sections/admin/appraisal/appraisal-tct-table.tsx`. Each row has a
checkbox, the TCT number, an expand toggle revealing that property's 8
appraisal documents (`ReadOnlyRequirementDocRow`, read-only, same as before —
the write side of this data still lives entirely on Requirement Checklist),
and a Status pill: **Unassigned** (`reportId === null`), **Pending appraiser
type** (belongs to a bundle whose `appraiserType` hasn't been picked yet —
not reachable through the normal "Assign Appraiser" flow, which always sets a
type immediately, but kept as a defensive label), or **In Report —
In-house/External**.

Checking one or more `Unassigned` rows (or rows already in an *unsubmitted*
bundle) reveals a selection action bar above the table:

- If every checked row is `Unassigned`, the bar shows **"Assign
  Appraiser"**, opening an inline In-house/External picker. Confirming
  (**"Create Report"**) calls `createAppraisalReportBundle(tctGroupIds,
  appraiserType)`, creating a new `AppraisalReportBundle` and stamping every
  selected group's `reportId`.
- If the checked rows all belong to the same single unsubmitted bundle (plus
  optionally some `Unassigned` rows), the bar shows **"Add to Report"**
  instead — no appraiser-type picker, since the bundle's type is already
  set — calling `addTctGroupsToReportBundle(bundleId, newGroupIds)`.
- If the checked rows span two or more different bundles, the bar disables
  its action with "Select properties from only one report at a time" —
  merging two bundles isn't supported.

A row's checkbox is disabled once its bundle's report has been submitted
(`report.uploadedAt` set) — same lock convention as the old single-report
card, now per bundle.

When `review.requirementChecklist.appraisalNotApplicable` is `true`, this
table is replaced entirely by a single line, "This application has no
pledged real-estate collateral" — unchanged from before.
```

- [ ] **Step 2: Rewrite the "Appraiser Assignment" section**

Replace "## Appraiser Assignment" (lines 127-165) with:

```markdown
## Appraisal Report (per bundle)

`review.appraisal.reportBundles: AppraisalReportBundle[]` — each entry is
`{ id, tctGroupIds, appraiserType, report }`, created by selecting TCT rows
in the Pledged Properties table above and assigning an appraiser (see
above). `appraisal-view.tsx` renders one **"Appraisal Report"** card per
bundle (`AppraiserAssignmentCard`, now taking `{ bundleId, tctNumbers }`
props instead of reading a single whole-application `review.appraisal`
field), only once `feeResolved` is true — otherwise the same locked dashed
placeholder as before takes their place, and no bundle cards render at all
regardless of how many bundles exist (assignment itself, via the table
above, is not gated on the fee — only the report-creation cards are).

Each card's subtitle lists which TCT numbers it covers ("Covers
TCT-2024-00981, TCT-2024-00982"). The in-house/external toggle, structured
report form, external dropzone, dashed future-integration note, and
lock-once-submitted behavior are otherwise unchanged from the original
single-report design — every one of those now operates on that one bundle's
`appraiserType`/`report` via `setAppraisalBundleAppraiserType` /
`setAppraisalBundleReport`, instead of the old whole-application
`setAppraisal`/`setAppraisalReport`. Switching a bundle's in-house/external
choice before its report is submitted still clears the other path's partial
data, scoped to that one bundle.
```

- [ ] **Step 3: Update the "Head Approval" section's gating description**

In "## Head Approval" (around line 169), replace:

```markdown
Rendered by `appraisal-view.tsx` only when `feeResolved && reportSubmitted`
(`reportSubmitted = !!report.uploadedAt`); otherwise a locked dashed
placeholder ("Submit the appraisal report above to unlock Head Approval.")
appears once the fee is resolved, and nothing at all before that.
```

with:

```markdown
Rendered by `appraisal-view.tsx` only when `feeResolved && reportSubmitted`,
where `reportSubmitted` now means every pledged property is covered by some
report bundle **and** every bundle's report has been submitted:
`appraisalNotApplicable || (appraisalGroups.every(g => g.reportId !== null)
&& reportBundles.length > 0 && reportBundles.every(b =>
!!b.report.uploadedAt))`. Otherwise a locked dashed placeholder ("Submit the
appraisal report above to unlock Head Approval.") appears once the fee is
resolved, and nothing at all before that.
```

And update the decline description a few lines further down — replace:

```markdown
- **"Simulate: Head Declines"** — `ConfirmDialog` requiring a typed reason;
  confirming resets `headApprovalStatus: 'pending'`, records the reason in
  `headApprovalDeclineReason`, and clears the submitted report
  (`uploadedAt`/`fileName`/`fileUrl` all reset to `null`) so the assigned
  appraiser resubmits. The `appraiserType` choice itself is preserved — only
  the report contents are cleared, not the in-house/external selection.
```

with:

```markdown
- **"Simulate: Head Declines"** — `ConfirmDialog` requiring a typed reason;
  confirming resets `headApprovalStatus: 'pending'`, records the reason in
  `headApprovalDeclineReason`, and calls `clearAllAppraisalBundleReports()`,
  clearing the submitted report (`uploadedAt`/`fileName`/`fileUrl` all reset
  to `null`) on **every** bundle so each assigned appraiser resubmits. Each
  bundle's `appraiserType` and TCT membership are preserved — only report
  contents are cleared.
```

- [ ] **Step 4: Re-read the full file once and confirm no other stale references remain**

Run: `grep -n "review.appraisal.appraiserType\|review.appraisal.report\b\|setAppraisalReport" "/Users/almikkaj/Downloads/Gvtech Code/lms-v2/docs/ADMIN_APPRAISAL.md"`
Expected: no output. If anything matches, update that line to the new bundle-based wording following the same pattern as Steps 1-3.

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add docs/ADMIN_APPRAISAL.md
git commit -m "Update ADMIN_APPRAISAL.md for per-TCT report bundle assignment"
```

---

## Post-plan check

After Task 7, run `npx tsc --noEmit` once more from the repo root and confirm zero errors, then re-run the manual verification steps from Task 6 Step 5 end-to-end on a fresh page load (clear localStorage or open a new application) to confirm the full 5-TCT flow works from a clean initial state, not just the state accumulated during development.
