# Admin — Financial Evaluation

> **Maintenance rule:** update this file whenever `financial-evaluation-view.tsx`,
> `financial-evaluation-docs.ts`, `cash-flow-statement.ts`,
> `cash-flow-statement-card.tsx`, `bank-statement.ts`, `bank-statement-card.tsx`,
> `bank-statement-modal.tsx`, `financial-summary-card.tsx`,
> `financial-summary-calcs.ts`, `financial-statement-modal.tsx`,
> `financial-statement-report.tsx`, `bank-loans-modal.tsx`,
> `bank-loan-report.tsx`, `financial-highlights-modal.tsx`, or
> `financial-highlights-report.tsx` change. (`additional-financial-files-card.tsx`
> still exists on disk but is no longer rendered on this page as of
> 2026-10-21 — see History.) Companion to `docs/230-project-overview.md`,
> `docs/090-account-solicitation-requirement-checklist.md` (the screen that actually collects
> these documents), `docs/100-credit-investigation.md` (the sibling
> process-stage detail page this one follows the same pattern as), and
> `docs/225-admin-design-system.md` (the admin design system — the four
> cards on this page follow its `CollapsibleSection` header contract:
> `subtitle` under the title, primary action in `headerAction`, and the
> header-only mode for the Cash Flow Statement card).

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
4. **"AI review, summary & recommendation" card** — the shared `AiReviewCard`
   (`src/components/admin-ui/ai-review-card.tsx`, compact variant), fed by
   `buildCreditInvestigationSummary()` from `credit-investigation-risk.ts`
   unchanged. The 3-level `AI_REVIEW_RISK_STYLES` readiness scale it maps
   through now lives in `src/components/admin-ui/ai-review-tokens.ts`
   (previously exported from `credit-investigation-risk.ts`, and before that
   a private `RISK_STYLES` in `credit-investigation-view.tsx`) — one copy
   shared by all four AI-review screens. Same constraint as Credit
   Investigation's: this page is read-only, so the computed level can only
   ever be `'good'` or `'watch'`, never `'high'` — there is no in-page
   action able to clear an outstanding item, only Requirement Checklist can.
   Card is collapsible, expanded by default (no fee gate to collapse it
   behind, unlike Credit Investigation's), magic-stick header icon, shared
   AI Control Statement footnote, risk shown as a white risk pill.
5. **Financial Summary card** (`financial-summary-card.tsx`) — see its own
   section below.
6. **Cash Flow Statement card** (`cash-flow-statement-card.tsx`) — see its
   own section below.
7. **Bank Statement card** (`bank-statement-card.tsx`) — see its own section
   below.
8. **"Proceed application?" decision card** — same shape as Credit
   Investigation's Proceed/Disapprove, see "Decision" below.

(An **Additional Financial Files card** used to sit here, between Bank
Statement and the decision card — removed from the page 2026-10-21; see
"Additional Financial Files (removed)" below and the History entry.)

## Financial Summary

A card (`FinancialSummaryCard` in `financial-summary-card.tsx`) — same
`adminCardSx` + `CollapsibleSection` shell as the other cards
(`docs/225-admin-design-system.md` §6), `subtitle` under the title,
defaults expanded. It hosts the three legacy sub-tools — **Financial
Statement**,
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

The modal-level metadata is stored separately as
`review.financialStatementDetails: FinancialStatementDetails` with four
fields: `productLine`, `amd`, rich-text HTML `remarks`, and nullable ISO
`submittedAt`. It is initialized and backward-compatibly hydrated with safe
defaults, and partial edits persist through `setFinancialStatementDetails()`.
The sample-data action seeds these details; Remove Sample Data resets them.

**Form** (`financial-statement-modal.tsx`) — as of 2026-10-21, a single
scrollable `<Dialog maxWidth="md">` with **every period inline**, no
separate "Manage" click per period and no income→balance step gating:
- A read-only **`InfoChip1`** strip (bordered `#FAFBFD`, a flexbox strip
  with simple right-hand borders — this file's original local chip
  component) with **Applicant Name** and **Amount Applied** (from
  registration/application state) sits at the top.
- Each of the 5 periods (2023 … Projected) is its own
  `CollapsibleSection` (the same shared header component
  `BankStatementCard`/`FinancialSummaryCard` use elsewhere on this page),
  collapsed by default — the officer expands whichever period they want
  to work on; there's nothing to navigate into. The section header
  carries a "Filled" / "Empty" `badge` chip and a **View** button (→ that
  one period's single-period report, `FinancialStatementReport` with
  `period` set) in `headerAction`.
- Expanding a period reveals its **Income Statement** and **Balance
  Sheet** together (`PeriodForm`), separated by **"Income Statement"** /
  **"Balance Sheet"** title banners (`sectionBannerSx`) styled to match
  the Initial Credit Checking Result's own section header pill
  (`credit-checking-result-modal.tsx`'s `NumberedSectionHeader`) —
  light-blue `#EEF1FE` background, uppercase navy `#1C2A6E` text,
  `10px` radius — rather than the solid navy banner this used before
  2026-10-21. Both sections always show together — no more staged
  `income`/`balance`/`combined` steps.
  Income Statement (restyled 2026-10-21): the **7 live computed values**
  (Net Sale, Gross Profit, Operating Income Before Other Income
  (Expenses), Operating Income, Net Income Before Tax, Net Income After
  Tax, EBITDA) sit **above** the inputs, as **`InfoChip2`**/`InfoChip2Row`
  — a second, distinct chip component in this same file matching Credit
  Investigation's own `CommercialInfoChips` grid exactly
  (`ci-report-card.tsx`'s exported `FactChip`/`FactChipRow`, renamed
  locally to `InfoChip2` to avoid colliding with this file's own
  `InfoChip1` above) — reimplemented the same way
  `credit-checking-result-modal.tsx` does (see
  `docs/080-account-solicitation-call-report.md`'s 2026-10-20 "fourth
  later revision" entry for that precedent). Same CSS-grid-with-
  box-shadow-dividers construction: cells divide with `boxShadow` insets
  rather than borders, only the strip's own outer corners round. A
  single `cols={3}` `FactChipRow` (`position="only"`, the default) —
  matching exactly how Credit Investigation's own `CommercialInfoChips`
  handles its one long-labeled cell: the long-labeled "Op. Income Before
  Other Inc. (Exp.)" cell is `wide` and placed **first**, so it takes a
  full row by itself (a `wide` cell always starts its own row), then the
  remaining 6 short-labeled values pack cleanly into two 3-column rows
  after it — the grid adapts to content the same way Credit
  Investigation's does, rather than a fixed 4-column grid with a blank
  filler cell (an earlier, same-day attempt that didn't actually fix the
  underlying misalignment). The **7 editable ₱ inputs** (Gross Sales, Cost of Goods Sold,
  Operating Expenses, Other Income (Expense), Interest Expense
  (Expense), Provision for Taxes, Depreciation) sit below the strip, in
  a plain 2-column grid (`sm:` 2 cols, `xs:` 1 col) rather than a
  label/computed-value pairing. Balance Sheet: the same **flat
  full-width list** of five dynamic line-item categories — Current
  Assets, Non-Current Asset, Current Liabilities, Non-Current
  Liabilities, Equity (`BalanceCategoryBlock`, stacked) — unchanged from
  before: each category is a §4.4 **sub-section label**
  (`12/700/#8891A6` uppercase) above a `#F9FAFC` / `1px #EEF0F5` /
  `11px`-radius inset holding its line rows; each row is inline on `sm+`
  (item dropdown + `Php` value input + red-× remove, stacking full-width
  on `xs`); an empty category shows a dashed-border empty-state box
  (§9); an outlined-navy **"Add {Category}"** button sits below each
  inset, right-aligned.
- A rich-text **Remarks** field sits below all 5 periods. **Save Record**
  (renamed from "Submit" 2026-10-24 — there's no backend to submit to;
  matches Cash Flow Statement's own "Save Record" button, the app's
  "I'm done for now" marker convention) simply stamps `submittedAt` with
  the current ISO timestamp and closes — there is no required-field gate,
  and it is the dialog's only footer button now (no more period-specific
  Back/Proceed/Save/Done buttons, since every field already persists on
  keystroke and there's no screen to navigate out of).

**Balance Sheet data model.** The five categories on
`FinancialStatementPeriod` are `BalanceSheetLine[]` (`{ id, label, value }`)
rather than flat string totals. `computeBalanceSheet` sums each category's
line values via `sumBalanceSheetLines`; its `BalanceSheetTotals` output
shape is unchanged, so the comparative report, `computeRatios`, and
Financial Highlights are untouched. Context setters:
`addBalanceSheetLine` / `updateBalanceSheetLine` / `removeBalanceSheetLine`
(keyed by `BalanceSheetCategory`). Hydration converts an older stored
string total into a single `{ label: 'Opening balance', value }` line.
`FinancialStatementField` is now the income-statement string keys only.
`balanceSheetSaved: boolean` is still on the stored shape (default `false`;
sample data sets it `true` for all 5 periods) but is no longer read by the
Manage UI as of 2026-10-21 — it only ever controlled which step the old
two-level modal opened to, and there are no more steps to open to. Product
Line / AMD were removed from this modal (2026-09-10) and there is no
required Submit gate.

**Report** (`financial-statement-report.tsx`) — two distinct layouts,
branched on whether a `period` is passed in:

- **Single-period** (period-row **View**, `maxWidth="sm"`) — styled like
  the Cash Flow Statement Report: a navy **`INCOME STATEMENT`** /
  **`BALANCE SHEET`** banner (with `(period)` on the right) above a
  rounded `1px #EBEDF3` / `13px` bordered table of single-value
  `label : ₱ amount` rows (`SingleLineRow`), zebra-striped, with tinted
  `#EEF1FE` total rows (`SingleTotalRow` — Net Sale, Net Income After
  Tax, and each Balance Sheet category's `Total {Category}`). The
  Balance Sheet section renders each category's actual **line items**
  (label + value from `BalanceSheetLine[]`, e.g. "Cash", "Account
  Receivable – Trade") under a plain category heading, not just a
  category total. No % of Sales, Growth, or Ratios in this view — it is
  a single point-in-time statement, not a comparison. Closing returns to
  the modal landing.
- **Comparative** (Financial Summary card's **View**, no `period`,
  `maxWidth="lg"`) — restyled (2026-09-11) to the Cash Flow Statement
  Report's visual language, same content as before:
  - Header carries a disabled download icon (`solar:file-download-bold`,
    "PDF export coming soon" tooltip), same placeholder as the other
    reports.
  - A read-only `FactChip` meta strip (bordered `#FAFBFD`) — **Applicant
    Name**, **Amount Applied** (`application.financialInfo.desiredLoanAmount`),
    **Product Line**, **AMD** (the latter two from
    `financialStatementDetails`).
  - The matrix table sits in a rounded `1px #EBEDF3` / `13px`-radius
    frame (previously just `overflowX: auto`).
  - **Income Statement** section — unchanged content: Gross Sales, Net
    Sales, Cost of Goods Sold, Gross Profit, Operating Expenses,
    Operating Income Before Other Income (Expenses)
    (`grossProfit − opex`), Other Income (Expense), Operating Income
    (`+ otherInc`), Interest Expense, Net Income Before Tax
    (`opInc − interest`), Provision for Taxes, Net Income After Tax
    (`NIBT − tax`), Depreciation, EBITDA
    (`opInc + interest + depreciation`) — ₱ value, **% of Sales**
    (÷ grossSales), **Growth** vs. the prior actual period
    (`cur/prior − 1`; blank for 2023 and for Interim/Projected).
  - **Balance Sheet** section now has three `GroupHeaderRow` sub-bands
    (lighter tint than the section band, not uppercase) — **Assets**
    (Total Current Assets, Total Assets), **Liabilities** (Total Current
    Liabilities, Total Liabilities), **Equity** (Total Equity, Total
    Liabilities & Stockholders' Equity) — then the tally row, relabelled
    "Assets and Liabilities & Stockholders' Equity Tally" ("Matched" /
    "Off by ₱X").
  - **Ratios** section — unchanged: Net Working Capital, Net Worth,
    Current Ratio, Quick Ratio, Days' Receivable / Inventory / Payable,
    ROE, ROA, GPM, Operating Margin, Return on Sales, Total
    Assets/Equity, Debt/Equity, Debt/Asset, Interest Coverage, Debt
    Service Coverage. Divide-by-zero → `—`.
  - **Approximations** footnote — unchanged: **Quick Ratio = Current
    Ratio** (no inventory balance field); **Days' Receivable / Inventory
    / Payable = 0** (no receivable/inventory/payable balance fields);
    **Debt Service Coverage ≈ `(NIAT + interest) / interest`** (no
    principal-due field).
  - New **Remarks** box (bordered, `financialStatementDetails.remarks`
    HTML rendered read-only; "No remarks recorded." when blank) and a
    **Prepared by** / **Noted by** footer (two bordered cards — Prepared
    by shows `application.assignedOfficer` + `Credit Officer · {timestamp}`;
    Noted by shows `—` / `Pending review`), matching the Cash Flow
    Statement Report's footer.

Both layouts read `computeBalanceSheet` / `computeIncomeStatement` —
nothing is recomputed differently between the two.

### Bank Loans (sub-tool 2)

**State** — `review.bankLoans: BankLoans` =
`{ bankRows: BankLoanRow[], pgfcRows: BankLoanRow[], proposed: PgfcProposedLoan }`.
`BankLoanRow` = `{ id, institution, facility, approvedAmount,
amountPreviousYear, amountOutstanding, balanceAsOfDate, projectionAmount,
security, dateGranted, expiry, term, interestRate, principalPaid,
paymentHandling, principalAmortizationPerMonth,
interestAmortizationPerMonth, principalPaymentAsOf, interestPaymentAsOf,
projectedPrincipalPaymentDec, projectedInterestDec }` (the last 7 fields
added 2026-09-11; used identically by both bank and PGFC rows). Hydration
deep-merges each stored row over a blank `BankLoanRow` so a session saved
before these fields existed still fills the gap.
`PgfcProposedLoan` = `{ projectionAmount, interestRate,
principalPaymentAsOfDate, interestPaymentAsOfDate,
projectedPrincipalPaymentDec, projectedInterestDec }` (unchanged — a
separate, smaller struct for the one proposed-loan block, not a row).
Setters: `addBankLoanRow(kind)` / `updateBankLoanRow(kind, id, data)` /
`removeBankLoanRow(kind, id)` (`kind: 'bank' | 'pgfc'`) and
`setPgfcProposedLoan(data)`.

**Form** (`bank-loans-modal.tsx`, restyled 2026-09-11) — `<Dialog
maxWidth="md">`, three sections: **Bank Loans** and **PGFC Loan Balance**
(each supports adding multiple rows) and the **PGFC Proposed Loan**
6-field grid — no `<Divider />` between the three sections (removed
2026-09-11); the section spacing alone separates them. **Bank Loans** and
**PGFC Loan Balance** now follow the same flat-list pattern as the
Financial Statement modal's Balance Sheet
sub-step: a plain uppercase section label above one shared `#F9FAFC` /
`1px #EEF0F5` / `11px`-radius inset box holding all of that section's
loans. Each loan collapses to a single **summary line**
(`LoanSummaryLine` — `Institution — Facility` + the Amount Outstanding,
falling back to "PGFC Loan" for a PGFC row with neither field filled in,
a pencil, and a red-×); clicking the pencil expands that line in place
into the full field form (`LoanRowForm`, fields 3–4 per line — `md={4}`
on most money-and-date fields, `md={3}` on the Payment as of Date /
Payment Projected sub-groups, which now sit **side by side** on one row
instead of stacked), and the pencil becomes a collapse chevron.
**`LoanRowForm` takes a `kind` prop** — Bank Loan rows show "Bank /
Financial Institution" and "Facilities"; **PGFC rows skip both fields
entirely** (every PGFC loan is from PGFC by definition, matching the
legacy PGFC form, which starts straight at Approved Amount). Newly added
rows (`addBankLoanRow`) start expanded. Rows are separated by a plain
divider inside the shared box; an empty section shows a dashed-border
"No {section} recorded yet." box, matching the Balance Sheet's
empty-category state. The Add button ("Add Bank Loan" / "Add PGFC Loan")
sits below the inset box, right-aligned — outside the box, not inside it
and not in the section header. Each loan also has **Payment Handling**
(text), **Principal /
Interest Amortization per Month**, a
**"Payment as of Date"** sub-group
(Principal Payment + Interest, side by side), and a **"Payment Projected"**
sub-group (Principal Payment + Interest December, side by side).

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
  Horizontal-scroll container. `LOAN_COLUMNS` now has 20 columns (was 13) —
  the 7 new `BankLoanRow` fields are appended after Principal Paid.

### Financial Highlights (sub-tool 3)

**State** — `review.financialHighlights: FinancialHighlights`
(`Record<FinancialPeriod, FinancialHighlightsPeriod>`). Each period record is
the **officer-typed** fields only: `daysInventory`, `daysReceivable`,
`daysPayable`, `ebitda`, `totalLoans`, `annualDebtService`, `rating` (free
text), `adjustedRate` (%). Setter: `setFinancialHighlightsField(period,
field, value)`. `review.financialHighlightsRemarks: string` (Tiptap HTML,
new 2026-09-11) is a single top-level field — not per-period, like
`financialStatementDetails.remarks`. Setter:
`setFinancialHighlightsRemarks(value)`.

**Derived rows** (`deriveHighlightsRow` in `financial-summary-calcs.ts`, not
stored) — Gross Sales, Net Income, Current/Total Assets, Current/Total
Liabilities, Equity, Current Ratio, Debt-Equity Ratio, Acid Ratio, GPM, NPM
come straight from `FinancialStatement[period]`; Revenue Over Total Loans =
`grossSales / totalLoans`; Debt Service Coverage Ratio =
`ebitda / annualDebtService`.

**Form** (`financial-highlights-modal.tsx`, restyled 2026-09-11) — a
narrow `<Dialog maxWidth="md">`, **one wide comparative
table** (rows = every metric, columns = the 5 periods), matching the Cash
Flow / Financial Statement report layout — dropped the old period-tab
selector and the separate "Derived from Financial Statement" preview
sidebar. **Every row in the table is plain display text** — Gross Sales,
Net Income, Current/Total Assets, Current/Total Liabilities, Equity,
Current Ratio, Debt-Equity Ratio, Acid Ratio, Days Inventory / Receivable
/ Payable, GPM, NPM, EBITDA, Revenue Over Total Loans, Debt Service
Coverage Ratio, Rating, Adjusted Rate — nothing in the table is editable.
A single **Remarks** rich-text field sits below the table (bound to
`financialHighlightsRemarks`, not per-period) — the **only** editable
control in this screen. Footer button reads "Save Record" (remarks
persists on keystroke like every other field in this app; the button is
the same "done for now" marker convention).

**Report** (`financial-highlights-report.tsx`, restyled 2026-09-11) — the
full wide metrics table (rows = every metric, columns = the 5 periods),
read-only, in a rounded `1px #EBEDF3` / `13px`-radius bordered frame
(previously bare `overflowX: auto`). **Gross Sales** and **Net Income**
now have a **% Sale** sub-column (÷ that period's Gross Sales), matching
the Financial Statement Report's `% of Sales` treatment. Header carries a
disabled download icon placeholder (`solar:file-download-bold`, "PDF
export coming soon"). Footer is now two bordered **Prepared by** /
**Noted by** cards (Prepared by: `application.assignedOfficer` + `Credit
Officer · {timestamp}`; Noted by: `—` / `Pending review`) — replacing the
single centered "Prepared by · {timestamp}" line, matching the Cash Flow
/ Financial Statement reports' footer.

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
1. **Upload** (added 2026-10-21) — a single bordered row (`#F9FAFC` /
   `#EEF0F5`, `11px` radius) at the top of the dialog, laid out identically
   to CI Report's own transcript-upload row
   (`ci-report-card.tsx`'s "Upload transcript" — see
   `docs/100-credit-investigation.md`): a leading icon, the filename (or
   "No bank statement uploaded") + an "Uploaded {date}" sub-line once one
   exists, an outlined **Upload bank statement** / **Replace statement**
   button, and a red text-only **Remove** button shown only once a file
   exists. Reused the exact same row component shape rather than
   designing a new upload UI, per feedback that the first attempt (a
   multi-file list with its own per-file delete icons) wasn't cohesive
   with the rest of the design system.
   - **Auto-fill.** Uploading a file (`uploadBankStatementFile`) simulates
     an extraction: if the statement's own fields (Depository Bank,
     Account Name, Account Number, Month Range, Deposits, Daily Balances)
     are still completely blank, they're filled in with the same
     deterministic sample values "Fill with Sample Data" uses
     (`sampleBankStatementFields()`, shared by both so they can never
     drift apart) — not a real OCR/parse, consistent with every other
     "AI" feature in this app. It never overwrites fields the officer
     already typed in by hand. Only the filename + upload timestamp are
     stored (`statementFileName` / `statementUploadedAt`) — no file data
     is kept and there is no "View" action, matching the transcript
     upload's own scope exactly. **Remove** (`removeBankStatementFile`)
     clears only the filename/timestamp — it does not revert the
     auto-filled fields, the same ruling CI Report's own
     `handleRemoveTranscript` makes, since those are now just regular
     editable fields the officer may have built on.
2. **Account details** — **Depository Bank** is a `select` of the major
   Philippine banks (`PHILIPPINE_BANKS` in `bank-statement.ts`; a stored
   value not in the list still renders as its own option so it isn't
   blanked). **Account Name** and **Account Number** share one row
   (`xs=12 sm=6` each). **Month Range** (From / To) sits below as two
   `select` dropdowns (January–December, blank "Select…" first item).
3. **Deposits** — `SubsectionLabel` + outlined **Add deposit** button; each
   deposit is an *inline editable row* (Date `type="date"`, Amount
   ₱-`NumericFormat`, trailing ✕) appended empty and filled in place — the
   app's `CashFlowStatementCard` "Add Other Loan" pattern, no staging row.
   Right-aligned running `Total deposits: {₱}`.
4. **Account Daily Balance** — same pattern: **Add balance** button; each row
   = Period From (`date`), Period To (`date`), Balance (₱), ✕. Running
   `Average daily balance: {₱ | —}` (arithmetic mean of entered balances).

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
`BankStatement { id, statementFileName: string | null, statementUploadedAt:
string | null, depositoryBank, accountName, accountNumber, monthFrom,
monthTo, deposits: BankStatementDeposit[], dailyBalances:
BankStatementDailyBalance[] }`; `deposits` rows are `{ id, date, amount }`,
`dailyBalances` rows `{ id, periodFrom, periodTo, balance }`. All
amounts/balances are free-text strings (blank/non-numeric → 0 for
arithmetic). `statementFileName`/`statementUploadedAt` are backfilled to
`null` in `readStoredState()` for a session saved before they existed.

**Setters** (`useAdmin()`) — `addBankStatement(id)` (the **card** generates
the id via `crypto.randomUUID()` and passes it in, then opens the modal on
that id — keeps setters side-effect-only), `updateBankStatement(id, data)`
(header fields only), `removeBankStatement(id)`, the nested
`add/update/removeBankStatementDeposit` /
`add/update/removeBankStatementDailyBalance`, and
`uploadBankStatementFile(id, fileName)` / `removeBankStatementFile(id)` (the
Upload row — see "Add / edit modal" above). The nested mutations all route
through one private `updateOneBankStatement(review, id, updater)` helper
(mirrors `updateBureauFiles` from the bureau-reports work).

### Fill with Sample Data (whole page)

Two dev/QA setters — `fillFinancialEvaluationSample()` /
`clearFinancialEvaluationSample()` — back the Financial Evaluation page's
**Fill with Sample Data** / **Remove Sample Data** floating-settings action
(toggled by `review.bankStatements.length > 0 || cashFlowStatement.savedAt`).
Fill seeds **every** workspace still on the page in one shot: one bank
statement (BDO, 6 deposits, 3 balance rows), the Cash Flow Statement
(income/expense figures + one Other Loan + a proposed-loan block, `savedAt`
stamped), the Financial Statement (all 5 periods — growing 2023→2025
actuals, a half-year Interim, a Projected), Bank Loans (2 bank rows + 1
PGFC row + the PGFC proposed loan), and Financial Highlights (per-period
days ratios, EBITDA, total loans, debt service, rating). Remove resets each
of those to its empty factory default. (It no longer seeds/clears
Additional Financial Files — see "Additional Financial Files (removed)"
below.)

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
app's own visual language (₱-prefixed `NumericFormat` inputs, `TONE_COLORS`).

**Manage form layout** (`maxWidth="md"` dialog). The whole form is **one
`<table>`** (`CfsFormTable`) in a single light-bordered panel. There is no
separate table head — each of the four sections (Source of Income, Less
Expenses, Other Loans, Proposed Amount) opens with a `SectionRow`: a
`#F1F3F8` tinted band (same tone as a total row) carrying the section name
on the left **and** the "COMBINED" / "BORROWER ONLY" column labels on the
right. The sections are **not** separate cards. Editable lines are `InputRow` (`kind: 'currency' |
'percent' | 'integer'`, light `#FAFBFD` zebra) — one label cell + two
input cells; computed lines are `ValueRow` with three tones: `subtotal`
(plain row), `total` (bold, `#F9FAFC` row — Total Income / Total Expenses
/ Income Available / Total of Other Loans / Net Income), and `headline`
(bold, `#EEF1FE` row, value in `#3448B0` — Debt Service Ratio). Monthly
Amortization is a `DisabledCurrencyRow` (two disabled `₱` cells). The
table has just three columns (label + two value columns, `tableLayout:
fixed` so the value columns stay 180px and the label column absorbs the
slack — no empty gutter on the right). In the Other Loans section each
loan row's remove-`×` sits inline at the end of the Lender cell; below the
rows is a status row with the count ("No other loans recorded." / "N
other loans recorded.") on the left and the "Add Other Loan" button on
the right. The table scrolls horizontally on narrow screens (same as the
read-only Report). No full-bleed navy banner, no bare `<Divider />`
separators.

`cash-flow-statement-card.tsx` exports three components:
- `CashFlowStatementCard` — an expandable card (`adminCardSx` +
  `CollapsibleSection` "Cash Flow Statement", `subtitle` under the title,
  "Saved" badge once `savedAt` is set). Its original bordered work row stays
  in the section body with the **Manage** and **View report** buttons.
  Card-local `mode: 'manage' | 'view' | null` drives the two modals.
- `CashFlowStatementModal` — the full data-entry form
  (`<Dialog maxWidth="lg" scroll="paper">`). It opens with a read-only
  **`FactChip` strip** (Borrower's Name / Amount of Loan — same bordered
  `#FAFBFD` strip the Report uses), then the **Computation Type** dropdown
  on the row below it. Its `DialogActions` carry a **Save Record** button
  (stamps `savedAt`) and a **Done** close.
- `CashFlowStatementReport` — a read-only `<Dialog maxWidth="md">` that
  **reuses the Cash Flow form's own layout components** rather than a
  separate table style: a **`FactChip` strip** (the horizontal
  label-over-value cells from `application-details-card.tsx` — `#EEF0F5`
  border, `#FAFBFD` fill, per-cell dividers) for Borrower's Name / Amount
  of Loan / Computation Type, then `SubsectionLabel` +
  `ColumnHeaders` + `SubtotalRow` / `TotalRow` (label + two info-tone
  `StatusBadge` pills) separated by `<Divider />`, exactly as the Manage
  form renders its results. The results table sits in a rounded
  `1px #EBEDF3` / `13px`-radius `overflowX:auto` frame, matching the Manage
  form's `CfsFormTable`. Sections: Source of Income → Total Income; Less Expenses →
  Sub-total, Add: Adjusted Expense (with the entered %s), Total Expenses,
  Income Available for Debt Service; Other Loans → Total of Other Loans,
  PGFC Loan – Principal & Interest (proposed monthly amortization
  annualised), Total Loans; then Net Income, Debt Service Ratio, and
  Percentage of Net Income Over Gross. The footer is two bordered
  `12px`-radius cards side by side — **Prepared by** (the
  `application.assignedOfficer`, then `Credit Officer · {timestamp}`) and
  **Noted by** (`—`, `Pending review`) — matching the Initial Credit
  Checking Result modal's Prepared-by card. Blank inputs render as `—`;
  computed totals show `₱0.00`. Its header carries a **disabled download
  icon** (`solar:file-download-bold`, "PDF export coming soon" tooltip) —
  the same placeholder the Initial Credit Checking Result modal uses;
  there is no real file export in this prototype.

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

## Additional Financial Files (removed)

**Removed from this page 2026-10-21** — the `AdditionalFinancialFilesCard`
(`additional-financial-files-card.tsx`) is no longer rendered on Financial
Evaluation; see this file's own History entry for why. The card component,
its `review.additionalFinancialFiles: AdditionalFinancialFile[]` state slot
(`{ id, fileName, fileData, remarks, uploadedAt }`), and its setters
(`addAdditionalFinancialFiles(files)`, `updateAdditionalFinancialFile(id, {
remarks })`, `removeAdditionalFinancialFile(id)`) all still exist in
`admin-context.tsx` and `additional-financial-files-card.tsx` — only the
page-level usage was removed, so the underlying feature can be re-added
without rebuilding it from scratch. The whole-page **Fill with Sample
Data** / **Remove Sample Data** actions no longer seed/clear this state
(previously seeded two sample files, `supplier-contract-2026.pdf` with a
remark and `warehouse-lease.pdf` without, both pointing at the bundled
`/assets/documents/sample-local-pdf.pdf`).

For reference, before removal this card was: free-form supporting-document
uploads beyond the fixed Document Checklist (supplier contracts, leases,
bank certifications, etc.), same `adminCardSx` + `CollapsibleSection` shell
as the other cards on this page, a `{count}` badge next to the title once
anything was uploaded, an **Upload files** button
(`<input multiple accept="image/*,.pdf">`) in the `headerAction` slot, one
bordered row per file (filename + upload timestamp, optional `Remarks: …`
line, an outlined **View** opening the data URL in a new tab, and a **⋮
menu** with **Add/Edit remarks** / **Delete file**). Data URLs only — no
parsing, no OCR. Informational — never gated the Endorse decision.

## Decision Gate

**Proceed → Credit Scoring, Disapprove → Reconsideration.**

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

Neither button is blocked by the Document Checklist, the AI review, the
Financial Summary sub-tools, the Bank Statement card, or the Cash Flow
Statement — those are all supporting evidence, **informational only**, and
never gate the decision. The only condition is a typed reason for
Disapprove.

## Fabricated Claims — Real vs. Simulated

Consistent with the rest of this prototype (`docs/230-project-overview.md`'s
"no real backend" note):

- **Document Checklist** — a read-only mirror of `RequirementDoc` state
  collected on Requirement Checklist; this page never writes it.
- **AI review** — `buildCreditInvestigationSummary()` is a template-string
  computation over the checklist's own completeness, not a model inference.
  Because this page is read-only, the level can only ever be `'good'` or
  `'watch'`, never `'high'`.
- **Bank Statement upload** — stores only the filename + upload
  timestamp, no file data at all (same scope as CI Report's own
  transcript upload). "Auto-fill" on upload writes deterministic sample
  values into the statement's own fields when they're still blank; no
  file is ever parsed, OCR'd, or verified against anything.
- **Financial Summary sub-tools** — every report figure (income statement,
  balance sheet, ~15 ratios, growth, % of sales, DSCR, the Highlights table)
  is **pure client-side arithmetic** in `financial-summary-calcs.ts`,
  recomputed on render; nothing derived is stored. There is no XLS/PDF
  export (the legacy reports' export buttons are not reproduced).
- **Documented approximations** (this build has no source field for them;
  the legacy screens also show `0`): Quick Ratio = Current Ratio; Days'
  Receivable / Inventory / Payable = `0`; the DSCR engine uses an
  interest-only debt-service proxy with a percentage-scaled numerator.
  Depreciation and EBITDA **are** real — Depreciation is an entered Income
  Statement field.
- **Cash Flow Statement** — all figures are officer-typed; the results
  (Total Income, Total Expenses, Monthly Amortization, Net Income, Debt
  Service Ratio) are pure functions in `cash-flow-statement.ts`. `savedAt`
  is stamped by "Save Record" but every field already persists on keystroke.
- **"Fill with Sample Data"** — writes deterministic sample values directly
  into state; it does not simulate any workflow or backend call.
- All of the above is **local state persisted to `localStorage` only** — no
  backend, no API.

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

## Non-Goals / Open Items

- **No fee/report flow** — Financial Evaluation has no fee concept of its
  own in this build. If it later needs one, that's a follow-up build
  mirroring Credit Investigation's CI Fee/CI Report sections.
- **Credit Scoring is a "coming soon" stub** — Endorsing here doesn't yet
  land on a real workspace, same as Appraisal's Passed branch.
- **Bank Statement data doesn't feed the Cash Flow Statement** — the two
  cards are independent for now. Rolling entered deposits/balances into the
  Cash Flow computation is a possible follow-up.
- **Financial Summary reports are on-screen only** — no XLS/PDF export, and
  the Quick Ratio / Days' ratios / DSCR approximations noted under
  "Fabricated Claims" would need real source fields (inventory / receivable
  / payable balances, a principal-due figure, a documented DSCR formula) to
  become exact.

## History

### 2026-10-24

- **Financial Statement Manage's footer button renamed "Submit" →
  "Save Record"** — nothing is ever submitted to a backend (every field
  already persists on keystroke), so "Submit" was misleading; this app's
  own equivalent action elsewhere (Cash Flow Statement's footer button)
  is already labeled "Save Record", so this just matches the existing
  convention instead of inventing a different label for the same
  behavior (stamping `financialStatementDetails.submittedAt`). The local
  click-handler was renamed `handleSubmit` → `handleSaveRecord` to match.

### 2026-10-21 (later)

- **Added "Upload bank statement" to the Bank Statement add/edit modal**,
  which auto-fills the statement's fields on upload. `BankStatement`
  gained `statementFileName: string | null` / `statementUploadedAt:
  string | null` (filename + timestamp only, no file data — same scope
  as CI Report's own transcript upload). New setters
  `uploadBankStatementFile(id, fileName)` / `removeBankStatementFile(id)`
  in `admin-context.tsx`; uploading simulates an extraction by filling
  in Depository Bank / Account Name / Account Number / Month Range /
  Deposits / Daily Balances with the same deterministic sample values
  "Fill with Sample Data" uses (`sampleBankStatementFields()`, now
  shared by both so they can't drift apart) — but only when the
  statement's own fields are still completely blank; it never overwrites
  fields the officer already typed in. **First attempt** built a
  multi-file list with its own per-file delete icons, which didn't match
  the rest of the design system; **corrected** to reuse CI Report's own
  transcript-upload row layout exactly (`ci-report-card.tsx`'s "Upload
  transcript" — icon + filename/status + Upload/Replace + Remove, one
  bordered row) instead of inventing a new upload UI. `BankStatementRow`'s
  own "Empty" check (`bank-statement-card.tsx`) now also treats an
  uploaded-but-otherwise-blank statement as non-empty.

### 2026-10-21

- **Removed the Additional Financial Files card from the page** —
  `financial-evaluation-view.tsx` no longer imports or renders
  `AdditionalFinancialFilesCard`. The `sampleFilled` toggle and the
  `fillFinancialEvaluationSample()` / `clearFinancialEvaluationSample()`
  setters in `admin-context.tsx` no longer reference
  `additionalFinancialFiles` either, so "Fill with Sample Data" doesn't
  seed files nobody can see. The underlying card component, state slot,
  and setters are untouched (just unused from this page) — see
  "Additional Financial Files (removed)".
- **Financial Statement Manage no longer requires clicking "Manage" per
  period.** `financial-statement-modal.tsx`'s old two-level flow (a period
  list, each row opening into its own `income`/`balance`/`combined`
  staged sub-steps) was replaced with a single scrollable dialog showing
  all 5 periods inline as `CollapsibleSection`s (collapsed by default),
  each expanding to that period's full Income Statement + Balance Sheet
  together (`PeriodForm`), reusing the design system's existing
  collapsible-card pattern rather than inventing a new one. Each period's
  own **View** button (→ its single-period report) moved into the
  section's `headerAction`; the dialog's only footer button is now
  **Submit** (stamps `submittedAt`). `balanceSheetSaved` is no longer read
  by this UI — it only ever drove which step the old modal opened to.
- **Income Statement's 7 computed values moved into an infochip strip
  above the inputs**, instead of sitting in a second column beside them.
  `PeriodForm` now renders a `FactChip`-based strip (Net Sale, Gross
  Profit, Operating Income Before Other Income (Expenses), Operating
  Income, Net Income Before Tax, Net Income After Tax, EBITDA) matching
  the Applicant Name / Amount Applied strip already at the top of the
  dialog, then the 7 editable ₱ inputs below it in a plain 2-column
  grid. The now-unused `ComputedField` component was removed from
  `financial-statement-modal.tsx`. **Later the same day**, both strips'
  `FactChip` was rebuilt to match Credit Investigation's own
  `CommercialInfoChips` grid exactly (box-shadow dividers, `FactChipRow`
  segments) rather than the flexbox approximation this entry originally
  described — see the "Form" section above for the current
  implementation.
- **Still the same day**, the Applicant Name / Amount Applied strip was
  reverted back to its original flexbox `FactChip` (renamed `InfoChip1`)
  — only the Income Statement computed-values strip keeps the grid-based
  chip, renamed `InfoChip2`/`InfoChip2Row` to avoid name-colliding with
  `InfoChip1` in the same file. `InfoChip2`'s two rows were changed from
  a 4-col + 3-col split to two 4-col rows (the last cell of row 2 is a
  blank filler), so column widths — and their dividers — line up
  vertically between rows; the mismatched 4-vs-3 column widths had been
  the "ayusin yung lines" issue. The **"Income Statement"** / **"Balance
  Sheet"** section banners (`sectionBannerSx`) were also restyled from a
  solid navy bar to the same light-blue pill
  (`credit-checking-result-modal.tsx`'s `NumberedSectionHeader` style)
  the Initial Credit Checking Result page uses for its own section
  headers.
- **Still the same day**, fixed a second misalignment in `InfoChip2`:
  the long label "Op. Income Before Other Inc. (Exp.)" wraps to 2 lines
  while every other label in its row fits on 1, so that cell's value
  rendered lower than its row-mates'. `InfoChip2`'s label now reserves a
  fixed `minHeight` (2 lines' worth), so every cell's value starts at
  the same vertical position regardless of whether its own label wraps.
- **Still the same day**, replaced the fixed 4-column-with-filler-cell
  layout with the actual adaptive pattern Credit Investigation's
  `CommercialInfoChips` uses: a single `cols={3}` `FactChipRow`, with the
  one long-labeled cell ("Op. Income Before Other Inc. (Exp.)") marked
  `wide` and placed first so it takes its own full row, then the
  remaining 6 short values pack into two clean 3-column rows — the grid
  now adapts to content instead of using a fixed column count with a
  blank filler. Also removed a doubled top padding above the "Income
  Statement" banner: `CollapsibleSection` already wraps its `children` in
  `pt: 2.5`, and `financial-statement-modal.tsx` was wrapping
  `PeriodForm` in a second `pt: 2.5` Box — removed the redundant one.
- **Still the same day**, fixed the `InfoChip2`/`InfoChip2Row` `edge`
  props themselves, which had the right/bottom-divider logic backwards —
  `edge.right: true` means "this cell sits on the strip's own outer right
  edge, skip its divider" (per `InfoChip2`'s own shadow logic), but the
  middle cells (Net Sale, Gross Profit, Net Income Before Tax, Net Income
  After Tax) had been marked `edge.right: true`, which suppressed their
  dividers instead of the true last-column cells (Operating Income,
  EBITDA). The result was a strip with no vertical dividers between
  cells at all — matching neither Credit Investigation's own rendering
  nor the intent. Corrected so only the real outer-edge cells (the last
  column of each row, and the `wide` cell which has nothing to its right)
  suppress their divider; every other cell keeps its right-hand line,
  same as Credit Investigation's `CommercialInfoChips`.
- **Still the same day**, removed the per-cell label `minHeight`
  reservation added earlier — since the long-labeled `wide` cell now
  always sits alone on its own full-width row, nothing shares a row with
  it anymore, so the 2-line reservation was just adding uneven, unused
  vertical padding to every short-labeled cell. `InfoChip2` is now
  byte-for-byte identical to Credit Investigation's own `FactChip`
  again. Also moved the `wide` "Op. Income Before Other Inc. (Exp.)"
  cell from the **first** row to the **last** row — the 6 short values
  (Net Sale, Gross Profit, Operating Income, Net Income Before Tax, Net
  Income After Tax, EBITDA) now pack into the first two 3-column rows,
  with the long-labeled cell's own full-width row at the bottom.
- **Still the same day**, the Balance Sheet line-item remove button's
  "×" icon changed from `TONE_COLORS.error.solid` (a bright red,
  reads as more alarming than a plain "remove a draft row" action
  warrants) to a muted `#8891A6` gray, matching the app's other inline
  icon-only controls.

- Added the **Bank Statement card** — multi-statement entry in a centered
  modal (Depository Bank dropdown of PH banks, account name/number, month
  range, inline-editable Deposit and Daily Balance rows).
- Added the **Financial Summary card** and its three sub-tools end-to-end
  (Financial Statement, Bank Loans, Financial Highlights) — a Manage
  data-entry modal + a View on-screen report each. Later removed the card's
  per-row status pill and Remarks (the card holds no state of its own).
- Reworked the **Cash Flow Statement** card to the same Manage / View-report
  pattern (`CashFlowStatementModal` + `CashFlowStatementReport`).
- Added a real `depreciation` field to the Financial Statement so EBITDA and
  the Bank Loan report's Depreciation row are computed, not approximated.
- Added the **Additional Financial Files card** (free-form supporting-doc
  uploads beyond the checklist) and reordered the page cards to Financial
  Summary → Cash Flow Statement → Bank Statement → Additional Financial
  Files.
- Extended the **Fill with Sample Data** page action to seed every workspace
  on the page at once.

### Later

- Normalized the four Financial Evaluation card headers to the design-system
  `CollapsibleSection` contract: the primary action (Manage / View report,
  Add bank statement, Upload files) moved into `headerAction` at the header
  row's trailing edge, and each card's description moved into the new
  `subtitle` prop — rendered under the title, part of the header, visible
  when collapsed — instead of being a line in the body / a nested titled
  box. The Cash Flow Statement card keeps its original expandable bordered
  work row; only its description moves to the header subtitle.
- **Fill with Sample Data** now also seeds two **Additional Financial Files**
  (and clears them on Remove); the `sampleFilled` toggle checks
  `additionalFinancialFiles.length` too.
