# Financial Statement modal details and per-period reports

**Date:** 2026-09-09
**Status:** Design — approved
**Area:** Admin → Financial Evaluation → Financial Summary → Financial Statement

## Goal

Update the Financial Statement data-entry modal to match the supplied legacy
screen's information architecture while retaining this app's existing admin
design language and calculations. The screenshot is a visual reference only;
the requirements in this design are authoritative.

> **Later UI revisions (2026-09-10):**
> 1. Landing level: Applicant Name / Amount Applied render as a read-only
>    `FactChip` strip; each period row is **Manage then View** (Manage
>    first).
> 2. **Product Line and AMD were removed from the UI entirely** and
>    Product Line is **no longer a required Submit gate** — Submit just
>    stamps `submittedAt`. `submitFinancialStatementDetails` no longer
>    returns `null`. The `productLine` / `amd` fields remain on
>    `FinancialStatementDetails` (sample data sets one) but nothing edits
>    them.
> 3. The period form is now **two sub-steps**: Manage opens on Income
>    Statement with a **Proceed to Balance Sheet** button; the Balance
>    Sheet sub-step has **Back to Income Statement** + **Save**. **Save**
>    sets a new per-period `balanceSheetSaved` flag; once set, Manage opens
>    that period straight to the Balance Sheet sub-step. (This supersedes
>    the earlier "Balance Sheet removed" revision — the Balance Sheet
>    inputs are back, just behind the Proceed step.)
> 4. The Balance Sheet is now **five dynamic line-item categories**
>    (Current / Non-Current Assets, Current / Non-Current Liabilities,
>    Equity), rendered as a **flat full-width list** — plain text heading
>    per category, one horizontal row per line item, an outlined-navy
>    "Add {Category}" button. No "Balance Sheet" banner, no per-category
>    total, no Assets = Liabilities + Equity tally row. Each category on
>    `FinancialStatementPeriod` is a `BalanceSheetLine[]`
>    (`{ id, label, value }`), not a flat string total. Each line is a
>    fixed-option label dropdown + a `Php` value + remove.
>    `computeBalanceSheet` sums the lines (`sumBalanceSheetLines`) and
>    keeps its old output shape, so the report / ratios / Financial
>    Highlights are unchanged. New context setters `addBalanceSheetLine` /
>    `updateBalanceSheetLine` / `removeBalanceSheetLine`; hydration wraps a
>    legacy string total as one line.
> 5. Each Balance Sheet category's "Add {Category}" button moved to the
>    **right** edge of its inset. The Income Statement sub-step's section
>    banner was removed (the dialog title already names it). A new
>    **third sub-step, `combined`**: once a period's `balanceSheetSaved` is
>    true, Manage opens it with Income Statement and Balance Sheet
>    rendered **together** in one scroll — no Proceed/Save gating — with a
>    **Back to periods** + **Done** footer (both just exit; every field
>    already persists on keystroke). A period whose Balance Sheet has not
>    yet been saved still gets the original two-step flow (Income
>    Statement → Proceed → Balance Sheet → Save).
>
> The rest of this document describes the original design.

The landing level of the modal must show:

- Applicant Name (read-only, from registration data)
- Amount Applied (read-only, from the submitted application)
- Product Line (required, editable, persisted)
- AMD (optional, editable, persisted)
- five period rows: 2023, 2024, 2025, Interim, and Projected
- View and Manage actions for every period
- Remarks (optional rich text, editable, persisted)
- Submit

## State and persistence

Keep the existing `review.financialStatement` period record unchanged so the
calculation helpers, Financial Highlights, sample data, and comparative report
continue to consume the same shape.

Add a sibling state slot:

```ts
type FinancialStatementDetails = {
  productLine: string;
  amd: string;
  remarks: string;       // Tiptap HTML
  submittedAt: string | null;
};
```

Add `financialStatementDetails` to `ApplicationReview`, initialize it with
blank strings and `submittedAt: null`, and merge safe defaults when loading
older local-storage records. Add a focused setter that accepts a partial
details update. The whole-page Financial Evaluation sample fill/clear actions
must seed/reset the new slot alongside the period records.

Applicant Name is derived from `signUpData.firstName` and `lastName`. Amount
Applied is derived from `application.financialInfo.desiredLoanAmount`. Neither
derived value is duplicated in admin state.

## Modal behavior

The existing two-level `FinancialStatementModal` remains:

1. Landing level contains the metadata, period rows, Remarks, and Submit.
2. Manage opens the existing editable income-statement and balance-sheet form
   for that period. Back returns to the landing level without closing the
   modal. Period values continue to persist on every keystroke.

Product Line, AMD, and Remarks also persist as they change. Submit remains
available; an attempt with a blank Product Line keeps the modal open and shows
the field's required error. A valid submission trims Product Line and AMD,
stamps `submittedAt`, resets the selected period/report state, and closes the modal.
Closing through the X or backdrop does not fabricate a submission timestamp;
already-entered draft values remain persisted.

Use the shared `RichTextField` for Remarks so its bold, italic, bulleted-list,
and numbered-list controls match existing admin rich-text inputs.

## Per-period View

Each landing row receives a View button before Manage. View opens the existing
`FinancialStatementReport` in read-only mode, restricted to the selected
period. The report component therefore accepts an optional period filter:

- period supplied: render only that period's report column and identify the
  period in the title;
- period omitted: preserve the current five-period comparative report opened
  from the Financial Summary card.

Closing a per-period report returns to the Financial Statement landing modal,
not to the Financial Evaluation page. Only one dialog is visually active at a
time to avoid nested-dialog focus conflicts.

## Layout and responsive behavior

Use the app's existing MUI/admin styling rather than copying the legacy pixels:

- responsive two-column metadata grid, stacking on narrow screens;
- read-only values use the existing muted field treatment;
- period rows remain bordered and compact, with View and Manage grouped at the
  trailing edge;
- Remarks spans the modal width;
- Submit is the primary footer action.

No XLS/PDF export and no new dependency are introduced.

## Validation and error handling

- Product Line is the only required new field.
- Its field shows an inline required error after an attempted invalid submit.
- Missing registration/application data renders `—` in the read-only fields.
- Existing numeric parsing and divide-by-zero behavior remain unchanged.
- Older saved reviews without `financialStatementDetails` receive defaults at
  hydration and must not crash.

## Verification

- Add a focused failing regression test for details defaults/merge and setter
  persistence before implementing state changes.
- Add a focused failing UI contract test for the landing fields, five View and
  Manage actions, Product Line validation, and per-period report selection if
  the existing test setup supports component rendering; otherwise use a small
  executable regression harness plus browser verification.
- Run TypeScript, ESLint on touched files, the regression checks, and a full
  production build.
- Manually verify the modal at desktop and narrow viewport widths.

## Expected files

- `src/auth/admin-context.tsx`
- `src/sections/admin/financial-statement-modal.tsx`
- `src/sections/admin/financial-statement-report.tsx`
- `docs/120-financial-evaluation.md`
- focused regression-test files or harness, depending on available test setup

## Non-goals

- Changing Financial Statement formulas or period input fields
- Removing the comparative all-period report
- Adding export/print functionality
- Copying the legacy page's typography, colors, or full-page layout literally
