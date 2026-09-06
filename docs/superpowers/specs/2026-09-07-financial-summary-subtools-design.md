# Financial Summary sub-tools — Financial Statement, Bank Loans, Financial Highlights

**Date:** 2026-09-07
**Status:** Design — pending review
**Area:** Admin → Financial Evaluation → Financial Summary card
(`src/sections/admin/financial-summary-card.tsx`)

## Problem / goal

The Financial Summary card currently tracks only a status + Remarks note per
legacy sub-tool. The user wants the three sub-tools built **end-to-end** —
data-entry form **and** on-screen report view for each:

1. **Financial Statement** — per-period income-statement + balance-sheet
   line items across 5 periods (2023, 2024, 2025, Interim, Projected), plus
   the **Financial Statement Report** (income statement with % of sales and
   growth, balance sheet with tally check, a ratios block — legacy
   screenshot 4).
2. **Bank Loans** — repeatable existing-loan rows (bank + PGFC) and a PGFC
   Proposed Loan block, plus the **Bank Loan Report** (DSCR computation
   table + bank-loan totals table — legacy screenshot 5).
3. **Financial Highlights** — a wide key-metrics table across the 5 periods
   (gross sales, net income, assets/liabilities/equity, ~15 ratios, rating,
   adjusted rate) + Remarks, plus its **report view** (same table, read-only
   — legacy screenshots 2 & 6).

**Report export:** on-screen views only. No XLS/PDF generation, no new
dependencies — consistent with this prototype having no real backend (same
as every other "report" in the app). The legacy XLS/PDF buttons are simply
not reproduced.

## Non-goals

- No real file export (XLS/PDF/print).
- No real backend, OCR, or AI — all figures are officer-typed; all report
  numbers are pure client-side arithmetic recomputed on render.
- No cross-tool data flow beyond what's specced (Financial Highlights reads
  a few Financial Statement figures; Bank Loan DSCR reads Financial
  Highlights' EBITDA / net income — see "Cross-tool reads" below). Cash Flow
  Statement stays independent.
- The Financial Summary card's existing **status pill + Remarks** per item
  is *kept* — it becomes the row header, with the deep tool opened from a
  new **Manage** button and the report from a **View** button.

## The 5 periods

Every tool works across the same fixed period set:

```ts
export const FINANCIAL_PERIODS = ['2023', '2024', '2025', 'interim', 'projected'] as const;
export type FinancialPeriod = (typeof FINANCIAL_PERIODS)[number];
export const FINANCIAL_PERIOD_LABELS: Record<FinancialPeriod, string> = {
  '2023': '2023', '2024': '2024', '2025': '2025',
  interim: 'Interim', projected: 'Projected',
};
```

Each period is labelled "12 Mos." in the reports (legacy convention).

---

## 1. Financial Statement

### State (`admin-context.tsx`)

One record per period. Every value is a free-text numeric string (app
convention — blank/garbage → 0 for arithmetic).

```ts
export type FinancialStatementPeriod = {
  // Income statement
  grossSales: string;
  salesReturns: string;          // subtracted → Net Sales
  costOfGoodsSold: string;
  operatingExpenses: string;
  otherIncomeExpense: string;    // signed: negative allowed
  interestExpense: string;
  provisionForTaxes: string;
  // Balance sheet — assets
  currentAssets: string;
  nonCurrentAssets: string;
  // Balance sheet — liabilities
  currentLiabilities: string;
  nonCurrentLiabilities: string;
  // Balance sheet — equity
  equity: string;
};

export type FinancialStatement = Record<FinancialPeriod, FinancialStatementPeriod>;
```

`createInitialFinancialStatement()` seeds every field `''` for all 5 periods.

### Form — `financial-statement-modal.tsx`

Opened from the Financial Statement row's **Manage** button. Centered
`<Dialog fullWidth maxWidth="lg" scroll="paper">` (admin convention).

- A period **Tab** row (`2023 / 2024 / 2025 / Interim / Projected`) — one
  period's fields visible at a time (the legacy "Manage per year" model,
  minus the separate page).
- Two sections per period: **Income Statement** (grossSales, salesReturns,
  costOfGoodsSold, operatingExpenses, otherIncomeExpense, interestExpense,
  provisionForTaxes) and **Balance Sheet** (currentAssets,
  nonCurrentAssets, currentLiabilities, nonCurrentLiabilities, equity).
- Each field is a ₱-prefixed `NumericFormat` (reuse the `CurrencyInput`
  pattern from `bank-statement-modal.tsx`; `otherIncomeExpense` allows
  negative).
- A live mini-summary under each section: Net Sales, Gross Profit,
  Net Income Before Tax, Net Income After Tax; and Total Assets, Total
  Liabilities, Total Equity, plus a **Tally** chip (Assets ==
  Liabilities + Equity → "Matched" green / "Off by ₱X" amber).
- Footer: **Done** (`onClose`). Persists on every keystroke via
  `setFinancialStatementField(period, field, value)`.

### Report — `financial-statement-report.tsx`

Opened from the row's **View** button. Centered
`<Dialog fullWidth maxWidth="lg" scroll="paper">`, read-only table matching
legacy screenshot 4:

**Income Statement** rows, columns per period showing the ₱ value, its
**% of Sales** (value ÷ grossSales × 100), and **Growth** vs. the prior
period (currentYear ÷ priorYear − 1, ×100; blank for the first column and
for Interim/Projected which have no direct prior):

| Row | Formula |
|---|---|
| Gross Sales | `grossSales` |
| Net Sales | `grossSales − salesReturns` |
| Cost of Goods Sold | `costOfGoodsSold` |
| Gross Profit | `netSales − costOfGoodsSold` |
| Operating Expenses | `operatingExpenses` |
| Operating Income | `grossProfit − operatingExpenses` |
| Other Income (Expense) | `otherIncomeExpense` |
| Net Income Before Tax | `operatingIncome + otherIncomeExpense − interestExpense` |
| Interest Expense | `interestExpense` |
| Provision for Taxes | `provisionForTaxes` |
| Net Income After Tax | `netIncomeBeforeTax − provisionForTaxes` |

**Balance Sheet** rows (₱ + growth per period; no % of sales):

| Row | Formula |
|---|---|
| Total Current Assets | `currentAssets` |
| Total Assets | `currentAssets + nonCurrentAssets` |
| Total Current Liabilities | `currentLiabilities` |
| Total Liabilities | `currentLiabilities + nonCurrentLiabilities` |
| Total Equity | `equity` |
| Total Liabilities & Equity | `totalLiabilities + equity` |
| Assets vs Liab+Equity Tally | "Matched" if `totalAssets === totalLiabEquity` else "Off by {₱}" |

**Ratios** block (from screenshot 4's lower table — computed, per period):

| Ratio | Formula |
|---|---|
| Net Working Capital | `currentAssets − currentLiabilities` |
| Net Worth | `totalAssets − totalLiabilities` |
| Current Ratio | `currentAssets / currentLiabilities` |
| Quick (Acid) Ratio | `(currentAssets − inventoryProxy) / currentLiabilities` — no inventory field, so **Quick Ratio = Current Ratio** here (documented approximation) |
| Days' Receivable / Inventory / Payable | no receivable/inventory/payable balance fields → **0** (shown, matching legacy which also shows 0) |
| Return on Equity | `netIncomeAfterTax / equity × 100` |
| Return on Assets | `netIncomeAfterTax / totalAssets × 100` |
| Gross Profit Margin | `grossProfit / netSales × 100` |
| Operating Margin | `operatingIncome / netSales × 100` |
| Return on Sales | `netIncomeAfterTax / netSales × 100` |
| Total Assets / Equity | `totalAssets / equity` |
| Debt / Equity | `totalLiabilities / equity` |
| Debt / Asset | `totalLiabilities / totalAssets` |
| Interest Coverage | `operatingIncome / interestExpense` |
| Debt Service Coverage | `(netIncomeAfterTax + interestExpense) / interestExpense` (approx — no principal-due field) |

All ratio helpers return `null` on divide-by-zero → rendered `—` or `0.00`
per legacy (legacy shows `0.00`; we render `0.00` for consistency).

---

## 2. Bank Loans

### State (`admin-context.tsx`)

```ts
export type BankLoanRow = {
  id: string;
  institution: string;
  facility: string;
  approvedAmount: string;
  amountPreviousYear: string;
  amountOutstanding: string;      // "Amount" column, current balance
  balanceAsOfDate: string;        // 'yyyy-mm-dd'
  projectionAmount: string;
  security: string;
  dateGranted: string;            // 'yyyy-mm-dd'
  expiry: string;                 // 'yyyy-mm-dd'
  term: string;                   // months
  interestRate: string;           // %
  principalPaid: string;          // principal payment history
};

export type PgfcProposedLoan = {
  projectionAmount: string;
  interestRate: string;                 // %
  principalPaymentAsOfDate: string;     // 'yyyy-mm-dd'
  interestPaymentAsOfDate: string;      // 'yyyy-mm-dd'
  projectedPrincipalPaymentDec: string;
  projectedInterestDec: string;
};

export type BankLoans = {
  bankRows: BankLoanRow[];        // "Add Bank Loan"
  pgfcRows: BankLoanRow[];        // "Add PGFC Loan" (same shape)
  proposed: PgfcProposedLoan;
};
```

`createInitialBankLoans()` → `{ bankRows: [], pgfcRows: [], proposed: <all ''> }`.

### Form — `bank-loans-modal.tsx`

Opened from the Bank Loans row's **Manage** button.
`<Dialog fullWidth maxWidth="lg" scroll="paper">`.

- **Bank Loans** section: `SubsectionLabel` + **Add bank loan** button; each
  row is an inline editable card (all `BankLoanRow` fields, laid out in a
  responsive grid; ✕ removes). Same inline-row pattern as Bank Statement's
  deposits.
- **PGFC Loan Balance** section: identical, **Add PGFC loan** button →
  `pgfcRows`.
- **PGFC Proposed Loan** section: the 6 `PgfcProposedLoan` fields in a
  2-col grid (Projection Amount, Interest Rate, Principal Payment as of
  Date, Interest Payment as of Date, Projected Principal Payment on
  December, Projected Interest on December).
- Footer: **Done**. Persists on change via
  `addBankLoanRow(kind)` / `updateBankLoanRow(kind, id, data)` /
  `removeBankLoanRow(kind, id)` and `setPgfcProposedLoan(data)`.

### Report — `bank-loan-report.tsx`

Opened from the row's **View**. `<Dialog fullWidth maxWidth="lg"
scroll="paper">`, matching legacy screenshot 5:

**Computation of DSCR** table — rows "DSCR 100%", "DSCR 50%", "DSCR 20%",
"DSCR Based on Amortization", "Depreciation" — each with an **as of Date**
and **Projection** column. Formulas (approximations, since the legacy engine
isn't fully documented):

- `serviceableIncome = FinancialHighlights.ebitda` for the latest actual
  period (falls back to Financial Statement's Net Income After Tax +
  Interest Expense for 2025 when EBITDA is 0).
- `annualDebtServiceAsOf = Σ bankRows.amountOutstanding × (interestRate/100)
  + Σ pgfcRows.amountOutstanding × (interestRate/100)` (interest-only proxy).
- `annualDebtServiceProjection = proposed.projectionAmount ×
  (proposed.interestRate/100) + proposed.projectedPrincipalPaymentDec`.
- `DSCR 100% (as of) = serviceableIncome / annualDebtServiceAsOf`;
  `DSCR 50% = serviceableIncome / (annualDebtServiceAsOf × 0.5)` — wait,
  legacy shows the *percentage* in the middle column as a fixed label
  (100% / 50% / 20%) and the ratio in the value columns. So:
  `DSCR X% = (serviceableIncome × X/100) / annualDebtService`. Renders
  `0.00` / `NaN` exactly as legacy when the denominator is 0 (legacy
  literally shows "NaN" — we render `—` instead, cleaner).
- `DSCR Based on Amortization = serviceableIncome / (Σ monthlyAmort × 12)`
  where `monthlyAmort` per row = a simple `approvedAmount / term` (add-on,
  no interest) — `0.00` when no rows.
- `Depreciation` row: no depreciation field → shows `—` / `0.00`.

**Bank Loan** table — columns: Bank/Financial Institution, Facilities,
Approved Amount, Amount Previous Year, Amount, Balance Date as of,
Projection Amount, Security, Date Granted, Expiry, Term, Interest Rate,
Principal Paid. One row per `bankRows` entry, then a **Total** row (Σ of the
₱ columns), one per `pgfcRows` entry + its **Total**, a
**Grand Total (balance)** row (bank + PGFC), a **PGFC** row (the proposed
loan's projectionAmount / interestRate), and a **Grand Total** row
(balances + proposed). Horizontal scroll container (wide table).

---

## 3. Financial Highlights

### State (`admin-context.tsx`)

The legacy Financial Highlights table (screenshots 2 & 6) has these rows per
period. Several are **derived** from Financial Statement; the rest are
officer-typed here.

Officer-typed (per period):
```ts
export type FinancialHighlightsPeriod = {
  daysInventory: string;
  daysReceivable: string;
  daysPayable: string;
  ebitda: string;
  totalLoans: string;          // for "Revenue Over Total Loans" & DSCR
  annualDebtService: string;   // for "Debt Service Coverage Ratio"
  rating: string;              // free text, e.g. "BBB"
  adjustedRate: string;        // %, free text
};
export type FinancialHighlights = Record<FinancialPeriod, FinancialHighlightsPeriod>;
```

Derived at render (from `FinancialStatement[period]`, not stored):
- Gross Sales, Net Income (after tax), Current Assets, Total Assets,
  Current Liabilities, Total Liabilities, Equity — straight from Financial
  Statement.
- Current Ratio, Debt-Equity Ratio, Acid Ratio, GPM, NPM — same formulas as
  the Financial Statement report's ratio block.
- Revenue Over Total Loans = `grossSales / totalLoans`.
- Debt Service Coverage Ratio = `ebitda / annualDebtService`.

### Form — `financial-highlights-modal.tsx`

Opened from the Financial Highlights row's **Manage**.
`<Dialog fullWidth maxWidth="lg" scroll="paper">`. A period **Tab** row;
per period, the 8 officer-typed fields (Days Inventory/Receivable/Payable
as integer inputs, EBITDA / Total Loans / Annual Debt Service as ₱ inputs,
Rating as text, Adjusted Rate as % input). A read-only preview strip shows
the derived Gross Sales / Net Income / key ratios pulled from Financial
Statement so the officer sees the full row. Footer **Done**; persists via
`setFinancialHighlightsField(period, field, value)`.

### Report — `financial-highlights-report.tsx`

Opened from the row's **View**. The full wide table (rows = every metric,
columns = the 5 periods) exactly as screenshots 2 & 6, read-only, in a
horizontal-scroll container. "Prepared by / {timestamp}" footer line.

---

## Cross-tool reads (documented dependencies)

- **Financial Highlights report** derives ~12 of its rows from
  `FinancialStatement`. If a period has no Financial Statement data, those
  cells show `0` / `0.00` (never NaN).
- **Bank Loan report** DSCR reads `FinancialHighlights.ebitda` (latest
  actual period), falling back to a Financial-Statement-derived figure.
- No writes across tools. No effect hooks — everything is render-time
  computation, same "pure, nothing stored" convention as
  `cash-flow-statement.ts`.

## State plumbing (`admin-context.tsx`)

`ApplicationReview` gains three slots alongside `financialSummary`:

```ts
financialStatement: FinancialStatement;
bankLoans: BankLoans;
financialHighlights: FinancialHighlights;
```

- Seeded by `createInitialFinancialStatement()` / `createInitialBankLoans()`
  / `createInitialFinancialHighlights()`.
- `readStoredState()` deep-merges each: `FinancialStatement` /
  `FinancialHighlights` per-period (`{ ...initial[p], ...stored?.[p] }` for
  every period key); `BankLoans` merges `bankRows`/`pgfcRows` as
  `Array.isArray(...) ? ... : []` and `proposed` field-wise.
- Setters (all side-effect-free `setState` reducers):
  - `setFinancialStatementField(period, field, value)`
  - `addBankLoanRow(kind: 'bank' | 'pgfc')` /
    `updateBankLoanRow(kind, id, data)` / `removeBankLoanRow(kind, id)` /
    `setPgfcProposedLoan(data)`
  - `setFinancialHighlightsField(period, field, value)`
- `resetReview()` covers them automatically (uses `createInitialReview()`).

## Pure computation module — `financial-summary-calcs.ts`

New file. All formulas above as pure functions over the raw string state:
- `parseNum(raw): number` (tolerant, shared)
- `computeIncomeStatement(period: FinancialStatementPeriod)` → `{ netSales,
  grossProfit, operatingIncome, netIncomeBeforeTax, netIncomeAfterTax }`
- `computeBalanceSheet(period)` → `{ totalCurrentAssets, totalAssets,
  totalCurrentLiabilities, totalLiabilities, totalLiabEquity, tallyMatched,
  tallyDelta }`
- `computeRatios(period)` → the ~15 ratios, each `number | null`
- `computeGrowth(current, prior): number | null`
- `computePctOfSales(value, grossSales): number | null`
- `computeDscr(bankLoans, highlights, statement)` → the DSCR report rows
- `deriveHighlightsRow(period, statement, highlights)` → the full merged row

`financial-summary-card.tsx` keeps its status pill + Remarks per row, and
each row gains **Manage** (opens the form modal) and **View** (opens the
report modal) buttons. Card-local state tracks which modal is open
(`{ tool: 'financialStatement' | 'bankLoans' | 'financialHighlights' | null,
mode: 'manage' | 'view' }`).

## Files

### New
| File | Responsibility |
|---|---|
| `src/sections/admin/financial-summary-calcs.ts` | All pure formulas + period constants. |
| `src/sections/admin/financial-statement-modal.tsx` | Per-period income-statement / balance-sheet entry form. |
| `src/sections/admin/financial-statement-report.tsx` | Read-only income statement + balance sheet + ratios report. |
| `src/sections/admin/bank-loans-modal.tsx` | Bank / PGFC loan rows + PGFC Proposed Loan entry form. |
| `src/sections/admin/bank-loan-report.tsx` | DSCR computation + bank-loan totals report. |
| `src/sections/admin/financial-highlights-modal.tsx` | Per-period highlights entry form (typed fields + derived preview). |
| `src/sections/admin/financial-highlights-report.tsx` | Full wide metrics table, read-only. |

### Changed
| File | Change |
|---|---|
| `src/auth/admin-context.tsx` | 3 state type groups + slots + factories + rehydrate merges + ~7 setters. |
| `src/sections/admin/financial-summary-card.tsx` | Each row gains **Manage** + **View** buttons; card-local modal state. Status pill + Remarks unchanged. |
| `docs/120-financial-evaluation.md` | Rewrite the Financial Summary section; add the 3 sub-tools; update maintenance header. |
| `docs/230-project-overview.md` | Expand the Financial Evaluation summary line. |
| `docs/240-tasks.md` | Day entry (gitignored). |

## Error handling / edge cases

- Every parse is tolerant → 0. No total ever renders `NaN`/`Infinity`;
  divide-by-zero ratios render `—` (or `0.00` in the Financial Statement
  ratio block to match legacy).
- Growth / % of sales blank where there's no prior period or no sales.
- Balance-sheet tally: "Matched" only on exact equality of the parsed
  numbers; otherwise "Off by {fCurrency(delta)}".
- A report opened with all-blank state renders a full table of `0` / `—` —
  not an empty state (matches legacy).
- Modals opened when their tool's state somehow missing a period key →
  factories guarantee all 5 keys exist, so this can't happen post-merge.

## Testing

No automated suite (prototype). Verify:
1. `npm run lint`, `npm run build`, `npx tsc --noEmit` clean.
2. Manual on `/admin/applications/[id]/financial-evaluation`:
   - Financial Summary card shows 3 rows, each with status pill, Remarks,
     **Manage**, **View**.
   - Financial Statement: Manage → type figures for 2023 & 2024 → live
     mini-summaries + tally chip update → View → report shows correct Net
     Sales / Gross Profit / growth / % of sales / ratios; tally row matches.
   - Bank Loans: Manage → add 2 bank rows + 1 PGFC row + proposed loan →
     View → DSCR table + Bank Loan totals + grand totals correct.
   - Financial Highlights: Manage → type the 8 fields for a period → derived
     preview pulls Financial Statement figures → View → full table renders
     across all 5 periods.
   - Reload page → all three tools' data persists (localStorage).
   - Endorse / Disapprove stay always-clickable (no new gate).
   - `pure` sanity: a Node script exercising `financial-summary-calcs.ts`
     formulas against known inputs.

## Open decisions (resolved)

- **Report export:** on-screen only, no XLS/PDF, no print. (User choice.)
- **Ratios with no source field** (Quick Ratio inventory, Days'
  Receivable/Inventory/Payable balances): approximated or shown as 0,
  documented inline — legacy shows 0 for these too.
- **DSCR engine:** approximated with interest-only debt service + a
  percentage-scaled numerator, since the legacy formula isn't fully
  documented. `NaN` cells in legacy become `—`.
