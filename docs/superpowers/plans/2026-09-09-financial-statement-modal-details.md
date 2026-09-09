# Financial Statement Modal Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the screenshot-referenced metadata, per-period View/Manage actions, rich-text Remarks, and validated Submit flow to the Financial Statement modal without changing existing calculations.

**Architecture:** Preserve `review.financialStatement` as the existing five-period numeric record and add a sibling `review.financialStatementDetails` object for shared metadata. Put defaulting, hydration, immutable patching, submission normalization, and report-period selection in a dependency-free TypeScript helper covered by Node's built-in test runner. Extend the current report with an optional period filter and open that filtered report from each landing row.

**Tech Stack:** Next.js 14, React 18, TypeScript, MUI 5, existing Tiptap `RichTextField`, Node 22 test runner.

**Spec:** `docs/superpowers/specs/2026-09-09-financial-statement-modal-details-design.md`

## Global Constraints

- The screenshot is a visual reference only; the approved spec defines behavior.
- Applicant Name and Amount Applied are derived and read-only.
- Product Line is required; AMD and Remarks are optional.
- Card-level View remains the five-period comparative report.
- Do not change formulas, period inputs, or add export/print/dependencies.
- Preserve all pre-existing uncommitted work and stage only feature-owned hunks.

---

### Task 1: Dependency-free details model

**Files:**
- Create: `src/auth/financial-statement-details.ts`
- Create: `tests/financial-statement-details.test.mjs`

**Interfaces:**
- Produces: `FinancialStatementDetails`, `createInitialFinancialStatementDetails()`, `hydrateFinancialStatementDetails(value)`, `patchFinancialStatementDetails(current, patch)`, `submitFinancialStatementDetails(current, submittedAt)`, `selectFinancialStatementReportPeriods(all, selected)`.
- Consumes: no app modules or browser APIs.

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialFinancialStatementDetails,
  hydrateFinancialStatementDetails,
  patchFinancialStatementDetails,
  submitFinancialStatementDetails,
  selectFinancialStatementReportPeriods,
} from '../src/auth/financial-statement-details.ts';

test('creates blank details', () => {
  assert.deepEqual(createInitialFinancialStatementDetails(), {
    productLine: '', amd: '', remarks: '', submittedAt: null,
  });
});

test('hydrates legacy state with safe defaults', () => {
  assert.deepEqual(hydrateFinancialStatementDetails({ productLine: 'Retail' }), {
    productLine: 'Retail', amd: '', remarks: '', submittedAt: null,
  });
  assert.deepEqual(hydrateFinancialStatementDetails(undefined), {
    productLine: '', amd: '', remarks: '', submittedAt: null,
  });
});

test('patches without mutation', () => {
  const current = createInitialFinancialStatementDetails();
  const next = patchFinancialStatementDetails(current, { amd: 'AMD-07' });
  assert.equal(current.amd, '');
  assert.equal(next.amd, 'AMD-07');
});

test('validates and normalizes submission', () => {
  const next = submitFinancialStatementDetails(
    { productLine: '  Wholesale  ', amd: '  AMD-07  ', remarks: '<p>Stable</p>', submittedAt: null },
    '2026-09-09T03:00:00.000Z'
  );
  assert.deepEqual(next, {
    productLine: 'Wholesale', amd: 'AMD-07', remarks: '<p>Stable</p>',
    submittedAt: '2026-09-09T03:00:00.000Z',
  });
  assert.equal(submitFinancialStatementDetails({ ...next, productLine: '   ' }, 'later'), null);
});

test('selects one report period without changing comparative mode', () => {
  const all = ['2023', '2024', '2025', 'interim', 'projected'];
  assert.deepEqual(selectFinancialStatementReportPeriods(all), all);
  assert.deepEqual(selectFinancialStatementReportPeriods(all, '2025'), ['2025']);
});
```

- [ ] **Step 2: Run RED**

```bash
node --experimental-strip-types --test tests/financial-statement-details.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the model**

```ts
export type FinancialStatementDetails = {
  productLine: string;
  amd: string;
  remarks: string;
  submittedAt: string | null;
};

export function createInitialFinancialStatementDetails(): FinancialStatementDetails {
  return { productLine: '', amd: '', remarks: '', submittedAt: null };
}

export function hydrateFinancialStatementDetails(
  value?: Partial<FinancialStatementDetails> | null
): FinancialStatementDetails {
  return { ...createInitialFinancialStatementDetails(), ...value };
}

export function patchFinancialStatementDetails(
  current: FinancialStatementDetails,
  patch: Partial<FinancialStatementDetails>
): FinancialStatementDetails {
  return { ...current, ...patch };
}

export function submitFinancialStatementDetails(
  current: FinancialStatementDetails,
  submittedAt: string
): FinancialStatementDetails | null {
  const productLine = current.productLine.trim();
  if (!productLine) return null;
  return { ...current, productLine, amd: current.amd.trim(), submittedAt };
}

export function selectFinancialStatementReportPeriods<T>(
  all: readonly T[], selected?: T
): readonly T[] {
  return selected === undefined ? all : [selected];
}
```

- [ ] **Step 4: Run GREEN**

Run the Step 2 command. Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit the two new files**

```bash
git add src/auth/financial-statement-details.ts tests/financial-statement-details.test.mjs
git commit -m "test: define financial statement details model"
```

---

### Task 2: AdminContext persistence

**Files:**
- Modify: `src/auth/admin-context.tsx`

**Interfaces:**
- Consumes: Task 1 details type/default/hydration/patch helpers.
- Produces: `review.financialStatementDetails` and `setFinancialStatementDetails(data: Partial<FinancialStatementDetails>): void`.

- [ ] **Step 1: Add state and context contracts**

Import Task 1 exports. Add `financialStatementDetails: FinancialStatementDetails` to `ApplicationReview` and this setter to `AdminContextValue`:

```ts
setFinancialStatementDetails: (data: Partial<FinancialStatementDetails>) => void;
```

- [ ] **Step 2: Add defaults, stored-state migration, sample, and clear**

Use these exact values:

```ts
financialStatementDetails: createInitialFinancialStatementDetails(),
financialStatementDetails: hydrateFinancialStatementDetails(storedReview.financialStatementDetails),
```

Sample fill:

```ts
financialStatementDetails: {
  productLine: 'Wholesale and Retail Trade',
  amd: '',
  remarks: '<p>Financial statements reviewed for the five reporting periods.</p>',
  submittedAt: new Date().toISOString(),
},
```

Clear with `createInitialFinancialStatementDetails()`.

- [ ] **Step 3: Implement immutable patch setter beside `setFinancialStatementField`**

```ts
setFinancialStatementDetails: (data) =>
  setState((prev) => ({
    ...prev,
    review: {
      ...prev.review,
      financialStatementDetails: patchFinancialStatementDetails(
        prev.review.financialStatementDetails,
        data
      ),
    },
  })),
```

- [ ] **Step 4: Verify**

```bash
node --experimental-strip-types --test tests/financial-statement-details.test.mjs
npx tsc --noEmit
npx eslint src/auth/admin-context.tsx src/auth/financial-statement-details.ts
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit only Task 2 hunks**

Inspect `git diff -- src/auth/admin-context.tsx`, preserve existing Additional Financial Files edits, stage only new details hunks, then commit `feat: persist financial statement details`.

---

### Task 3: Single-period report mode

**Files:**
- Modify: `src/sections/admin/financial-statement-report.tsx`
- Test: `tests/financial-statement-details.test.mjs`

**Interfaces:**
- Consumes: `selectFinancialStatementReportPeriods` and `FinancialPeriod`.
- Produces: `FinancialStatementReport({ open, onClose, period? })`; omitted `period` preserves comparative mode.

- [ ] **Step 1: Mutation-check the selector test**

Temporarily return `all` even when a period is selected, run the Node tests and verify the single-period assertion fails; restore the correct helper and rerun to green.

- [ ] **Step 2: Add the optional prop and selected list**

```ts
export function FinancialStatementReport({ open, onClose, period }: {
  open: boolean;
  onClose: () => void;
  period?: FinancialPeriod;
}) {
  const periods = selectFinancialStatementReportPeriods(FINANCIAL_PERIODS, period);
```

Replace every report-rendering `FINANCIAL_PERIODS.map(...)` and colspan calculation with `periods`. Keep `priorPeriod()` based on all fixed periods. Set table `minWidth: period ? 560 : 900` and title:

```tsx
Financial Statement Report{period ? ` · ${FINANCIAL_PERIOD_LABELS[period]}` : ''}
```

- [ ] **Step 3: Verify and commit**

```bash
node --experimental-strip-types --test tests/financial-statement-details.test.mjs
npx tsc --noEmit
npx eslint src/sections/admin/financial-statement-report.tsx
git add src/sections/admin/financial-statement-report.tsx
git commit -m "feat: support per-period financial reports"
```

Expected: tests and static checks exit 0 before commit.

---

### Task 4: Screenshot-referenced modal landing view

**Files:**
- Modify: `src/sections/admin/financial-statement-modal.tsx`

**Interfaces:**
- Consumes: details state/setter/submission helper, registration data, `RichTextField`, and filtered `FinancialStatementReport`.
- Preserves: current per-period Manage form and calculations.

- [ ] **Step 1: Add derived values and UI state**

```ts
const { signUpData, application } = useRegistration();
const { review, setFinancialStatementField, setFinancialStatementDetails } = useAdmin();
const [reportPeriod, setReportPeriod] = useState<FinancialPeriod | null>(null);
const [productLineError, setProductLineError] = useState(false);
const details = review.financialStatementDetails;
const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '—';
const amountApplied = application.financialInfo?.desiredLoanAmount;
```

Reset `editing`, `reportPeriod`, and the error in `handleClose`. Implement Submit:

```ts
const handleSubmit = () => {
  const submitted = submitFinancialStatementDetails(details, new Date().toISOString());
  if (!submitted) {
    setProductLineError(true);
    return;
  }
  setFinancialStatementDetails(submitted);
  setProductLineError(false);
  handleClose();
};
```

- [ ] **Step 2: Add the metadata grid above period rows**

Use a responsive 8/4 MUI Grid for Applicant Name/Amount Applied and Product Line/AMD. Disabled fields render `applicantName` and `amountApplied == null ? '—' : amountApplied.toLocaleString('en-PH')`. Product Line is `required`, controlled by `details.productLine`, and shows `Product Line is required.` when `productLineError`; AMD is controlled by `details.amd`.

- [ ] **Step 3: Add View before Manage on every period row**

```tsx
<Button
  onClick={() => setReportPeriod(p)}
  variant="outlined"
  size="small"
  startIcon={<Iconify icon="solar:eye-bold-duotone" width={15} />}
  sx={{ ...outlinedNavyButtonSx, px: 2 }}
>
  View
</Button>
```

Keep the Filled/Empty chip and Manage button; group actions in a wrapping trailing Stack.

- [ ] **Step 4: Add shared Remarks and valid Submit behavior**

```tsx
<RichTextField
  label="Remarks"
  value={details.remarks}
  onChange={(remarks) => setFinancialStatementDetails({ remarks })}
  placeholder="Enter financial statement remarks…"
/>
```

When not editing, the primary footer action reads `Submit` and calls `handleSubmit`. When editing, preserve Back to periods and Done.

- [ ] **Step 5: Compose filtered report without nested active dialogs**

Set main dialog `open={open && reportPeriod === null}` and render:

```tsx
<FinancialStatementReport
  open={open && reportPeriod !== null}
  period={reportPeriod ?? undefined}
  onClose={() => setReportPeriod(null)}
/>
```

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit
npx eslint src/sections/admin/financial-statement-modal.tsx src/sections/admin/financial-statement-report.tsx
git add src/sections/admin/financial-statement-modal.tsx
git commit -m "feat: add financial statement modal details"
```

Expected: static checks exit 0 before commit.

---

### Task 5: DM 120 and end-to-end verification

**Files:**
- Modify: `docs/120-financial-evaluation.md`

**Interfaces:**
- Documents Tasks 1–4; introduces no runtime interface.

- [ ] **Step 1: Update DM 120**

Document `financialStatementDetails`, the four metadata fields, five View/Manage rows, rich-text Remarks, Product Line validation, Submit timestamp, single-period report mode, and preserved comparative report. Remove the obsolete claim that landing rows only have Filled/Empty and Manage.

- [ ] **Step 2: Run full verification**

```bash
node --experimental-strip-types --test tests/financial-statement-details.test.mjs
npx tsc --noEmit
npx eslint src/auth/admin-context.tsx src/auth/financial-statement-details.ts src/sections/admin/financial-statement-modal.tsx src/sections/admin/financial-statement-report.tsx
git diff --check
npm run build
```

Expected: 5 Node tests pass, all static checks exit 0, diff check prints nothing, and Next reports a successful build.

- [ ] **Step 3: Browser verification**

Open Admin → Financial Evaluation → Financial Summary → Financial Statement → Manage. Verify read-only Applicant Name/Amount, persisted Product Line/AMD/Remarks, invalid-submit error, five View/Manage rows, selected-only 2025 report returning to landing, unchanged card-level comparative View, working Manage calculations, and no desktop/narrow overflow.

- [ ] **Step 4: Commit only the Financial Statement DM 120 hunk**

Inspect the existing diff first and retain Cash Flow/Additional Financial Files edits. Stage only this feature's documentation hunk, then commit `docs: update financial statement modal flow`.

- [ ] **Step 5: Final scope review**

Run `git status --short` and `git diff --stat`. Confirm no unrelated file was staged, reverted, or reformatted; report pre-existing dirty files separately.
