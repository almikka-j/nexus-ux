# Admin — Financial Evaluation

> **Maintenance rule:** update this file whenever `financial-evaluation-view.tsx`,
> `financial-evaluation-docs.ts`, `cash-flow-statement.ts`,
> `cash-flow-statement-card.tsx`, `bank-statement.ts`, `bank-statement-card.tsx`,
> `bank-statement-modal.tsx`, `financial-summary-card.tsx`,
> `financial-summary-calcs.ts`, `financial-statement-modal.tsx`,
> `financial-statement-report.tsx`, `bank-loans-modal.tsx`,
> `bank-loan-report.tsx`, `financial-highlights-modal.tsx`, or
> `financial-highlights-report.tsx` change. Companion to `docs/230-project-overview.md`
> and `docs/090-account-solicitation-requirement-checklist.md` (the screen that actually collects
> these documents) and `docs/100-credit-investigation.md` (the sibling
> process-stage detail page this one follows the same pattern as).

## What this is

"Financial Evaluation" in the admin application-review pipeline
(`src/sections/admin/financial-evaluation-view.tsx`, rendered at
`/admin/applications/[id]/financial-evaluation`). This is the detail
workspace for the `financialEvaluation` step under the sidebar's
"Application" section.

Pipeline position: Initial Credit Checking → Call Report → Requirement
Checklist → Credit Investigation → Appraisal → **Financial Evaluation**. The
live application's Financial Evaluation queue row is actionable, same as
every other step in this pipeline — an admin can inspect the live
application at any step at will.

There is no real backend and no real AI — every document's status and note
are deterministic, canned content sourced from Requirement Checklist, not a
call to any external service, OCR, or LLM.

## Page layout

Unlike Credit Investigation's page, this one has **no** fee request/approval
flow and no report — Financial Evaluation has no fee concept of its own in
this build. The page is:

1. `ApplicationReviewHeader` — `step="Financial Evaluation"`,
   `reviewStep="financialEvaluation"`, `hideApplicationCard` (handles
   back-to-list navigation, step-entry tracking, and the step badge).
2. `ApplicationDetailsCard` — collapsible, `officerNotesProcess="Financial
   Evaluation"`. No CI-specific action props (`showCreditCheckingResultAction`,
   `showCallReportAction`) since those belong to Credit Investigation only.
3. **Document Checklist card** — a read-only mirror of Financial Evaluation's
   10 documents, sourced from `review.requirementChecklist.documents` (the
   one screen that actually collects/edits them — see
   `docs/090-account-solicitation-requirement-checklist.md`) and rendered via
   `ReadOnlyRequirementDocRow` (shared with Credit Investigation's page, at
   `credit-investigation/credit-investigation-doc-row.tsx` — a generic
   presentational component despite the CI-named path). Flat list, no
   subgroup nesting, matching how Requirement Checklist itself renders this
   tab. All 10 documents start already received/reviewed on a fresh session
   (`createInitialRequirementDocuments()` in `admin-context.tsx` — see
   `docs/090-account-solicitation-requirement-checklist.md`'s "RequirementDoc state shape"
   section), so this card shows 10/10 on file by default rather than
   surfacing a missing document.
4. **"AI review, summary & recommendation" card** — reuses
   `buildCreditInvestigationSummary()` and `AI_REVIEW_RISK_STYLES` from
   `credit-investigation-risk.ts` unchanged (both were generalized/renamed
   there — `AI_REVIEW_RISK_STYLES` was lifted out of
   `credit-investigation-view.tsx`'s former private `RISK_STYLES` — precisely
   so both pages could share one implementation instead of two copies drifting
   out of sync). Same constraint as Credit Investigation's: this page is
   read-only, so the computed level can only ever be `'good'` or `'watch'`,
   never `'high'` — there is no in-page action able to clear an outstanding
   item, only Requirement Checklist can. Defaults expanded (no fee gate to
   collapse it behind, unlike Credit Investigation's).
5. **Financial Summary card** (`financial-summary-card.tsx`) — see its own
   section below.
6. **Bank Statement card** (`bank-statement-card.tsx`) — see its own section
   below.
7. **Cash Flow Statement card** (`cash-flow-statement-card.tsx`) — see its
   own section below.
8. **"Proceed application?" decision card** — same shape as Credit
   Investigation's Proceed/Disapprove, see "Decision" below.

## Financial Summary

A card (`FinancialSummaryCard` in `financial-summary-card.tsx`) — same
`adminCardSx` + `CollapsibleSection` shell as the other cards, defaults
expanded. It hosts the three legacy sub-tools — **Financial Statement**,
**Bank Loans**, **Financial Highlights** — each a bordered row with just its
name, a one-line description, and a **Manage** button (→ the sub-tool's
data-entry modal) and a **View** button (→ the sub-tool's on-screen report
modal). No per-row status pill or Remarks — the card holds **no state** of
its own; card-local `{ activeTool, activeMode }` only tracks which of the 6
modals is open. **Not a decision gate** — the "Endorse to Credit Scoring" /
"Disapprove" buttons stay always-clickable.

**No XLS/PDF export.** The legacy reports had XLS + PDF buttons; those are
not reproduced. All report figures are pure client-side arithmetic
recomputed on render — nothing derived is stored.

### The 5-period model

Every sub-tool works across a fixed period set
(`FINANCIAL_PERIODS` in `admin-context.tsx`): `2023`, `2024`, `2025`,
`interim`, `projected` (labelled "Interim" / "Projected", each "12 Mos." in
reports). `FinancialStatement` and `FinancialHighlights` are
`Record<FinancialPeriod, …>`; the modals switch periods with a button-group
selector (the app has no `Tabs` component).

### Financial Statement (sub-tool 1)

**State** — `review.financialStatement: FinancialStatement`
(`Record<FinancialPeriod, FinancialStatementPeriod>`). Each period record is
13 free-text numeric strings: `grossSales`, `salesReturns` (kept for the Net
Sales formula but not surfaced in the form — legacy flows Gross Sales
straight to Net Sale), `costOfGoodsSold`, `operatingExpenses`,
`otherIncomeExpense` (signed — negatives allowed), `interestExpense`,
`provisionForTaxes`, `depreciation` (feeds a real EBITDA), `currentAssets`,
`nonCurrentAssets`, `currentLiabilities`, `nonCurrentLiabilities`, `equity`.
Setter: `setFinancialStatementField(period, field, value)`.

**Form** (`financial-statement-modal.tsx`) — a **two-level** `<Dialog
maxWidth="lg">` matching the legacy period-row model (minus the
separate-page navigation):
- *Level 1 (landing):* the 5 period rows (2023 … Projected), each with a
  "Filled / Empty" chip and a **Manage** button.
- *Level 2 (period form):* a back arrow, then **INCOME STATEMENT** —
  7 editable ₱ inputs on the left (Gross Sales, Cost of Goods Sold,
  Operating Expenses, Other Income (Expense), Interest Expense (Expense),
  Provision for Taxes, Depreciation) with the **live computed** column on the
  right (Net Sale, Gross Profit, Operating Income Before Other Income
  (Expenses), Operating Income, Net Income Before Tax, Net Income After Tax,
  EBITDA) — and **BALANCE SHEET** — 5 editable ₱ inputs, each paired with its
  computed total, plus an Assets = Liabilities + Equity **tally chip**.
  Everything persists on keystroke — no "save income statement first"
  gating (that legacy staged-save constraint is dropped).

**Report** (`financial-statement-report.tsx`) — read-only comparative wide
table (opened from the card's **View**):
- **Income Statement** — Gross Sales, Net Sales, Cost of Goods Sold, Gross
  Profit, Operating Expenses, Operating Income Before Other Income
  (Expenses) (`grossProfit − opex`), Other Income (Expense), Operating
  Income (`+ otherInc`), Interest Expense, Net Income Before Tax
  (`opInc − interest`), Provision for Taxes, Net Income After Tax
  (`NIBT − tax`), Depreciation, EBITDA (`opInc + interest + depreciation`)
  — each column shows the ₱ value, **% of Sales** (÷ grossSales), and
  **Growth** vs. the prior actual period (`cur/prior − 1`; blank for 2023
  and for Interim/Projected which have no direct prior).
- **Balance Sheet** — Total Current Assets, Total Assets, Total Current
  Liabilities, Total Liabilities, Total Equity, Total Liabilities & Equity,
  plus a tally row ("Matched" / "Off by ₱X").
- **Ratios** — Net Working Capital, Net Worth, Current Ratio, Quick Ratio,
  Days' Receivable / Inventory / Payable, ROE, ROA, GPM, Operating Margin,
  Return on Sales, Total Assets/Equity, Debt/Equity, Debt/Asset, Interest
  Coverage, Debt Service Coverage. Divide-by-zero → `—`.
- **Approximations** (documented on the report footer, matching legacy which
  also shows 0): **Quick Ratio = Current Ratio** (no inventory balance
  field); **Days' Receivable / Inventory / Payable = 0** (no
  receivable/inventory/payable balance fields); **Debt Service Coverage ≈
  `(NIAT + interest) / interest`** (no principal-due field). Depreciation and
  EBITDA are now real (Depreciation is an entered field).

### Bank Loans (sub-tool 2)

**State** — `review.bankLoans: BankLoans` =
`{ bankRows: BankLoanRow[], pgfcRows: BankLoanRow[], proposed: PgfcProposedLoan }`.
`BankLoanRow` = `{ id, institution, facility, approvedAmount,
amountPreviousYear, amountOutstanding, balanceAsOfDate, projectionAmount,
security, dateGranted, expiry, term, interestRate, principalPaid }`.
`PgfcProposedLoan` = `{ projectionAmount, interestRate,
principalPaymentAsOfDate, interestPaymentAsOfDate,
projectedPrincipalPaymentDec, projectedInterestDec }`. Setters:
`addBankLoanRow(kind)` / `updateBankLoanRow(kind, id, data)` /
`removeBankLoanRow(kind, id)` (`kind: 'bank' | 'pgfc'`) and
`setPgfcProposedLoan(data)`.

**Form** (`bank-loans-modal.tsx`) — `<Dialog maxWidth="lg">`, three
sections: **Bank Loans** and **PGFC Loan Balance** (each an inline-editable
row list with an Add button, same pattern as Bank Statement's deposits) and
the **PGFC Proposed Loan** 6-field grid.

**Report** (`bank-loan-report.tsx`) — read-only:
- **Computation of DSCR** — rows "DSCR 100% / 50% / 20% / Based on
  Amortization" with an *as of Date* and *Projection* column, plus a
  **"Depreciation"** row (the 2025 Financial Statement's `depreciation`).
  `serviceableIncome` = latest actual EBITDA
  (`financialHighlights['2025'].ebitda` when entered, else the 2025 Financial
  Statement's `operating income + interest + depreciation`). Debt service is
  an **interest-only proxy** (`Σ amountOutstanding × interestRate/100`);
  `DSCR X% = serviceableIncome × X/100 ÷ debtService`. "Based on
  Amortization" uses an add-on proxy (`Σ approvedAmount/term × 12`).
  Legacy `NaN` cells become `—`.
- **Bank Loan** wide table — one row per `bankRows` entry + a **Total**, one
  per `pgfcRows` + a **Total**, a **Grand Total (balance)**, a **PGFC
  (proposed)** row, and a **Grand Total** (balances + proposed projection).
  Horizontal-scroll container.

### Financial Highlights (sub-tool 3)

**State** — `review.financialHighlights: FinancialHighlights`
(`Record<FinancialPeriod, FinancialHighlightsPeriod>`). Each period record is
the **officer-typed** fields only: `daysInventory`, `daysReceivable`,
`daysPayable`, `ebitda`, `totalLoans`, `annualDebtService`, `rating` (free
text), `adjustedRate` (%). Setter: `setFinancialHighlightsField(period,
field, value)`.

**Derived rows** (`deriveHighlightsRow` in `financial-summary-calcs.ts`, not
stored) — Gross Sales, Net Income, Current/Total Assets, Current/Total
Liabilities, Equity, Current Ratio, Debt-Equity Ratio, Acid Ratio, GPM, NPM
come straight from `FinancialStatement[period]`; Revenue Over Total Loans =
`grossSales / totalLoans`; Debt Service Coverage Ratio =
`ebitda / annualDebtService`.

**Form** (`financial-highlights-modal.tsx`) — `<Dialog maxWidth="lg">`,
period selector, the 8 typed fields plus a read-only **"Derived from
Financial Statement"** preview strip so the officer sees the whole row.

**Report** (`financial-highlights-report.tsx`) — the full wide metrics table
(rows = every metric, columns = the 5 periods), read-only,
horizontal-scroll, with a "Prepared by · {timestamp}" footer.

### Cross-tool reads

- Financial Highlights derives ~12 of its rows from `FinancialStatement`;
  cells with no source data show `0` / `—` (never NaN).
- Bank Loan DSCR reads `FinancialHighlights['2025'].ebitda` with a Financial
  Statement fallback.
- No writes across tools; no effect hooks — all render-time computation.

### Pure computation — `financial-summary-calcs.ts`

`parseNum` (tolerant), `safeDiv` (null on ÷0), `computeIncomeStatement`,
`computeBalanceSheet`, `computeRatios`, `computeGrowth`, `computePctOfSales`,
`computeBankLoanTotals`, `computeDscr`, `deriveHighlightsRow`, and the
formatters `fRatio` (`0.00` / `—`), `fPct` (`15.00%` / `—`), `fDays`.

## Bank Statement

A card (`BankStatementCard` in `bank-statement-card.tsx`) where the officer
records each of the applicant's bank statements. Same `adminCardSx` +
`CollapsibleSection` shell as the Cash Flow Statement card, defaults
expanded, with a count badge next to the title once ≥1 statement exists.

**Purpose / rationale.** Replaces a legacy source-system flow (add a bare
bank name on a card → click an edit pencil → navigate to a *separate full
page* to enter Depository Bank / Account Name / Account Number / Month Range
plus Deposit and Daily Balance rows via a "type into a staging row, click +
to commit" pattern → repeat per bank). The two fixed problems: the
separate-page round trip, and the two-step "name first, then edit" add.

**Card layout.** A primary **Add bank statement** button + one row per
statement:
- Left: a `#EEF1FB` rounded avatar showing the bank's first 3 letters
  (generic card icon when the bank name is blank), the bank name, and a
  muted line `Acct ••••{last 4 digits} · {monthFrom}–{monthTo}` (each piece
  omitted when unset; reads "Details not entered yet" when the row has no
  account number/name and no deposit/balance rows).
- Right: summary chips — `{n} deposits · {₱ total}` and `{n} balances` — or
  a single dashed **Empty** chip when nothing's entered; then an edit
  `IconButton` and a delete `IconButton` (`#E23E3E`).
- Clicking the row body also opens the modal.
- Delete opens a `ConfirmDialog` ("Remove this bank statement?").
- Empty state: a dashed-border "No bank statements added yet." box.

**Add / edit modal** (`BankStatementModal` in `bank-statement-modal.tsx`)
— a centered `<Dialog fullWidth maxWidth="md" scroll="paper">` with
`DialogTitle` / `DialogContent` / `DialogActions`, the same convention as
`CreditCheckingResultModal` and the "Full application" modal. **Add bank
statement** and a row's edit icon both open it — no separate route.
Sections:
1. **Account details** — **Depository Bank** is a `select` of the major
   Philippine banks (`PHILIPPINE_BANKS` in `bank-statement.ts`; a stored
   value not in the list still renders as its own option so it isn't
   blanked). **Account Name** and **Account Number** share one row
   (`xs=12 sm=6` each). **Month Range** (From / To) sits below as two
   `select` dropdowns (January–December, blank "Select…" first item).
2. **Deposits** — `SubsectionLabel` + outlined **Add deposit** button; each
   deposit is an *inline editable row* (Date `type="date"`, Amount
   ₱-`NumericFormat`, trailing ✕) appended empty and filled in place — the
   app's `CashFlowStatementCard` "Add Other Loan" pattern, no staging row.
   Right-aligned running `Total deposits: {₱}`.
3. **Account Daily Balance** — same pattern: **Add balance** button; each row
   = Period From (`date`), Period To (`date`), Balance (₱), ✕. Running
   `Average daily balance: {₱ | —}` (arithmetic mean of entered balances).

Data-entry only — there is no file-attachment section (the legacy screen's
File Attachment card was dropped as unused).

**Footer** (`DialogActions`) — a single **Done** button (`onClose`). Every
field already persists on change via the `useAdmin()` setters (app
convention — same as every other admin form), so there is no separate save.

**Delete-if-blank on close.** If the modal is closed while the statement is
*completely* blank (blank bank/account/months, no deposits, no balances) —
the common case of "Add bank statement" then immediate close — it calls
`removeBankStatement(id)` so no empty ghost row is left. Editing an existing
populated statement never auto-deletes.

**State** — `review.bankStatements: BankStatement[]` (`admin-context.tsx`),
a new top-level `ApplicationReview` slot, seeded `[]` by
`createInitialReview()` and array-merged in `readStoredState()`
(`Array.isArray(...) ? ... : []`, same as the bureau file arrays). Shape:
`BankStatement { id, depositoryBank, accountName, accountNumber, monthFrom,
monthTo, deposits: BankStatementDeposit[], dailyBalances:
BankStatementDailyBalance[] }`; `deposits` rows are `{ id, date, amount }`,
`dailyBalances` rows `{ id, periodFrom, periodTo, balance }`. All
amounts/balances are free-text strings (blank/non-numeric → 0 for
arithmetic).

**Setters** (`useAdmin()`) — `addBankStatement(id)` (the **card** generates
the id via `crypto.randomUUID()` and passes it in, then opens the modal on
that id — keeps setters side-effect-only), `updateBankStatement(id, data)`
(header fields only), `removeBankStatement(id)`, and the nested
`add/update/removeBankStatementDeposit` /
`add/update/removeBankStatementDailyBalance`. The 6 nested mutations all
route through one private `updateOneBankStatement(review, id, updater)`
helper (mirrors `updateBureauFiles` from the bureau-reports work).

### Fill with Sample Data (whole page)

Two dev/QA setters — `fillFinancialEvaluationSample()` /
`clearFinancialEvaluationSample()` — back the Financial Evaluation page's
**Fill with Sample Data** / **Remove Sample Data** floating-settings action
(toggled by `review.bankStatements.length > 0 || cashFlowStatement.savedAt`).
Fill seeds **every** workspace on the page in one shot: one bank statement
(BDO, 6 deposits, 3 balance rows), the Cash Flow Statement (income/expense
figures + one Other Loan + a proposed-loan block, `savedAt` stamped),
the Financial Statement (all 5 periods — growing 2023→2025 actuals, a
half-year Interim, a Projected), Bank Loans (2 bank rows + 1 PGFC row + the
PGFC proposed loan), and Financial Highlights (per-period days ratios,
EBITDA, total loans, debt service, rating). Remove resets each of those to
its empty factory default.

**Computation** (`bank-statement.ts`, pure, nothing stored) —
`computeTotalDeposits(deposits)` = Σ amounts; `computeAvgDailyBalance(balances)`
= mean of balances, `null` when there are none (rendered `—`);
`formatMonthRange(from, to)` → `"{from}–{to}"`, or just the one set side, or
`""`. `parseNumber` tolerates blanks/commas/garbage → 0.

**Not a decision gate.** Bank statements are supporting evidence; the
"Endorse to Credit Scoring" / "Disapprove" buttons stay always-clickable,
consistent with Initial Credit Checking's Bureau Reports.

## Cash Flow Statement

An editable **Combined / Borrower Only** two-column form computing Total
Income, Total Expenses, Income Available for Debt Service, Monthly
Amortization, Net Income, and Debt Service Ratio for the proposed loan —
spec'd from a reference screen from a different system, then adapted to this
app's own visual language (label-above-field, ₱-prefixed `NumericFormat`
inputs, `StatusBadge` pills for totals, `TONE_COLORS`).

`cash-flow-statement-card.tsx` exports three components:
- `CashFlowStatementCard` — a thin card (`adminCardSx` + `CollapsibleSection`
  "Cash Flow Statement", "Saved" badge once `savedAt` is set) with one row
  carrying a **Manage** and a **View report** button. Matches the Financial
  Summary card's Manage / View pattern. Card-local `mode: 'manage' | 'view'
  | null` drives the two modals.
- `CashFlowStatementModal` — the full data-entry form
  (`<Dialog maxWidth="lg" scroll="paper">`). Its `DialogActions` carry a
  **Save Record** button (stamps `savedAt`) and a **Done** close.
- `CashFlowStatementReport` — a read-only `<Dialog maxWidth="md">` matching
  the legacy report layout: a Borrower's Name / Amount of Loan / Computation
  Type meta block, a **"PERSONAL INCOME & EXPENSES"** banner, then the full
  line-item table (every Source-of-Income and Less-Expenses input row plus
  Sub-total, Add: Adjusted Expense (with the entered %s), Total Expenses,
  Income Available for Debt Service, each Other Loan, Total of Other Loans,
  PGFC Loan – Principal & Interest (proposed monthly amortization annualised),
  Total Loans, Net Income, Debt Service Ratio, Percentage of Net Income Over
  Gross) for both Combined / Borrower Only columns, with a "Prepared by
  {timestamp}" / "Noted by" footer. Zero values render as `—`.

**State** — `review.cashFlowStatement: CashFlowStatement` (`admin-context.tsx`),
a new top-level `ApplicationReview` slot alongside `creditInvestigation`/
`appraisal`, seeded by `createInitialCashFlowStatement()`. Every raw input is
a free-text string field (`fixedIncomeCombined`, `fixedIncomeBorrowerOnly`,
etc. — one pair per Combined/Borrower Only row), persisted via
`setCashFlowStatement(data)` on every keystroke, same pattern as every other
admin form in this app. `otherLoans: CashFlowOtherLoan[]` (`{ id, lender,
monthlyAmortizationCombined, monthlyAmortizationBorrowerOnly }`) is a
separate array, mutated via `addCashFlowOtherLoan()` /
`removeCashFlowOtherLoan(id)` / `updateCashFlowOtherLoan(id, data)`.
`savedAt: string | null` is stamped only by the "Save Record" button — there
is no separate draft/saved split, since every field already persists on
every keystroke; the button exists to give the officer an explicit
"I'm done for now" moment, and its presence renders a "Saved" `StatusBadge`
in the card header once set.

**Computation** (`cash-flow-statement.ts`, pure functions, nothing stored) —
run independently per column:
- `Total Income` = Fixed + Variable + Other Income − Less: Deductions.
- `Sub-total` = Fixed + Utilities + Transport + Other + Miscellaneous Expenses;
  `Adjusted Expense Amount` = Sub-total × (Adjusted Expense Percent ÷ 100);
  `Total Expenses` = Sub-total + Adjusted Expense Amount.
- `Income Available for Debt Service` = Total Income − Total Expenses.
- `Total of Other Loans` = sum of `otherLoans[]`'s monthly amortization for
  that column.
- `Monthly Amortization`, per **Computation Type** (`computationType:
  'add-on' | 'diminishing'`, a dropdown on the card — "Add On" is the
  default):
  - **Diminishing** (declining-balance): `M = P × r(1+r)^n / ((1+r)^n − 1)`,
    `r` = monthly rate = annual Interest Rate ÷ 100 ÷ 12, `n` = Term in
    months (`computeDiminishingAmortization`).
  - **Add-On**: `M = (P + P × (annualRate/100) × (term/12)) / term` — total
    interest added to principal up front, divided evenly, no compounding
    (`computeAddOnAmortization`).
  - Returns `null` (rendered as `—`, never `∞`/`NaN`) when Principal/Interest
    Rate/Term aren't all present as valid positive numbers.
  - Interest Rate is **annual**; Term is in **months** (confirmed against the
    reference design — the reference itself didn't label the unit).
- `Principal & Interest` mirrors `Monthly Amortization` (single loan, no
  separate breakdown at this level).
- `Net Income` = Income Available for Debt Service − Total of Other Loans −
  Monthly Amortization (`0` when amortization is `null`).
- `Debt Service Ratio` = (Monthly Amortization + Total of Other Loans) ÷
  Income Available for Debt Service × 100. `null` (rendered `—`) when there's
  no amortization yet, or Income Available for Debt Service is zero/negative
  — a ratio against non-positive income isn't a meaningful percentage.

**Borrower's Name**/**Amount of Loan** at the top of the card are read-only,
sourced from `signUpData`/`application.financialInfo.desiredLoanAmount` (the
`RegistrationState` from the loan application itself) — not part of
`CashFlowStatement`'s own stored state.

## Decision: Proceed → Credit Scoring, Disapprove → Reconsideration

Same shape as Credit Investigation's Proceed/Disapprove card
(`docs/100-credit-investigation.md`'s "Proceed / Disapprove decision"),
stored on `review.cashFlowStatement.decision`/`decisionReason`
(`CreditCheckDecision`, reused from `admin-context.tsx` — same type
`creditInvestigation.decision` uses) rather than a separate slot, since Cash
Flow Statement is currently the only content on this page a decision would
gate on:
- **Proceed** (labeled **"Endorse to Credit Scoring"** on the button, not
  the generic "Proceed" CI uses — Financial Evaluation only ever has one
  forward destination) sets `decision: 'approved'` and routes to
  `paths.admin.creditScoring(id)` — currently a "coming soon" stub page
  (`src/app/admin/applications/[id]/credit-scoring/page.tsx`), the same
  placeholder destination Appraisal's own Passed branch routes to.
- **Disapprove** opens a `ConfirmDialog` requiring a typed reason, then sets
  `decision: 'rejected'` + `decisionReason` and routes to
  `paths.admin.reconsideration(id)` — same destination every other
  disapprove path in this pipeline uses.

## Document metadata: `financial-evaluation-docs.ts`

`FINANCIAL_EVALUATION_DOC_META` is its own independent array (not filtered
out of a combined list) — see `docs/090-account-solicitation-requirement-checklist.md`'s "The
fixed document list" section for the full split rationale. This page imports
it directly rather than filtering `REQUIREMENT_DOC_META` by tab.

## Routing and queue wiring

- `paths.admin.financialEvaluation(id)` → `/admin/applications/${id}/financial-evaluation`
  (`src/routes/paths.ts`).
- `application-list-view.tsx`'s `STEP_TO_PATH` maps `financialEvaluation` to
  this path, and the live row's `isActionable` is unconditionally `true` for
  every step in the pipeline (this page's addition removed the last
  step-specific exception).
- `ReviewStep` (`admin-context.tsx`) and `STEP_TONE` (`admin-tokens.ts`)
  already included `financialEvaluation` before this page existed — it was
  scaffolded ahead of its workspace, the same pattern Credit Investigation
  went through.

## Non-goals / Open items

- **No fee/report flow** — Financial Evaluation has no fee concept of its
  own in this build. If it later needs one, that's a follow-up build
  mirroring Credit Investigation's CI Fee/CI Report sections.
- **Credit Scoring is a "coming soon" stub** — Endorsing here doesn't yet
  land on a real workspace, same as Appraisal's Passed branch.
- **No real file parsing, real AI/LLM** — same as every other admin
  screen in this app.
- **Bank Statement data doesn't feed the Cash Flow Statement** — the two
  cards are independent for now. Rolling entered deposits/balances into the
  Cash Flow computation is a possible follow-up.
- **Financial Summary reports are on-screen only** — the three sub-tools'
  forms and report views are fully built, but the legacy XLS/PDF export
  buttons are not reproduced (no real backend). A few legacy ratios (Quick
  Ratio, Days' Receivable/Inventory/Payable, and the DSCR engine) are
  approximated because this build lacks the source fields — documented
  inline on the reports and in the Financial Summary section above.
  Depreciation / EBITDA are real (Depreciation is an entered Income
  Statement field).
