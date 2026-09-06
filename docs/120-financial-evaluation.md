# Admin — Financial Evaluation

> **Maintenance rule:** update this file whenever `financial-evaluation-view.tsx`,
> `financial-evaluation-docs.ts`, `cash-flow-statement.ts`,
> `cash-flow-statement-card.tsx`, `bank-statement.ts`, `bank-statement-card.tsx`,
> `bank-statement-modal.tsx`, or `financial-summary-card.tsx` change. Companion to `docs/230-project-overview.md`
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
expanded, with a `{completeCount} / 3` badge once any item is past
not-started.

**Purpose / rationale.** The legacy source system has a "Financial Summary"
screen with three sub-tools — **Financial Statement** (per-period income
statement / balance sheet / ratios, with its own big report view), **Bank
Loans** (existing bank + PGFC loan balances, proposed loan, DSCR
computation, report view), and **Financial Highlights** (a wide key-metrics
table, report view). Building all three end-to-end is a large,
multi-spec effort. This card is the **scoped first slice**: it tracks, per
item, a **status** the officer sets and a **Remarks** note — no deep
data-entry forms, no XLS/PDF report views (those are a future follow-up, and
there are no "Manage" / "View" actions on the card).

**Layout** (always-expanded sub-cards). Three bordered rows
(`#EBEDF3`, 13px), one per item: name, a compact `TextField select` styled as
a status pill — **Not started** (neutral / gray), **In progress** (info /
blue), **Complete** (success / green), tone-colored from `TONE_COLORS` — a
muted one-line description, and an always-visible multi-line Remarks
`TextField` (`minRows={2}`). Everything persists on change.

**State** — `review.financialSummary: FinancialSummary` (`admin-context.tsx`),
a new top-level `ApplicationReview` slot, seeded by
`createInitialFinancialSummary()` (all three items
`{ status: 'not-started', remarks: '' }`) and per-item deep-merged in
`readStoredState()`. Shape:
`FinancialSummary { financialStatement, bankLoans, financialHighlights }`,
each a `FinancialSummaryItem { status: 'not-started' | 'in-progress' |
'complete'; remarks: string }`.

**Setter** — one, `setFinancialSummaryItem(key, data)` on `useAdmin()`,
merging `Partial<FinancialSummaryItem>` into the named item.

**Not a decision gate.** Informational only — the "Endorse to Credit
Scoring" / "Disapprove" buttons stay always-clickable, consistent with the
Bank Statement and Bureau Reports cards.

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
helper (mirrors `updateBureauFiles` from the bureau-reports work). Two
dev/QA setters — `fillBankStatementSample()` (appends one fully-populated
sample statement — BDO, 6 monthly deposits, 3 quarterly average-balance
rows, via `createSampleBankStatement()`) and `clearBankStatements()` (drops
all) — back the Financial Evaluation page's **Fill with Sample Data** /
**Remove Sample Data** floating-settings action, toggled by whether
`review.bankStatements` is non-empty.

**Computation** (`bank-statement.ts`, pure, nothing stored) —
`computeTotalDeposits(deposits)` = Σ amounts; `computeAvgDailyBalance(balances)`
= mean of balances, `null` when there are none (rendered `—`);
`formatMonthRange(from, to)` → `"{from}–{to}"`, or just the one set side, or
`""`. `parseNumber` tolerates blanks/commas/garbage → 0.

**Not a decision gate.** Bank statements are supporting evidence; the
"Endorse to Credit Scoring" / "Disapprove" buttons stay always-clickable,
consistent with Initial Credit Checking's Bureau Reports.

## Cash Flow Statement

An editable **Combined / Borrower Only** two-column form (`CashFlowStatementCard`
in `cash-flow-statement-card.tsx`) computing Total Income, Total Expenses,
Income Available for Debt Service, Monthly Amortization, Net Income, and
Debt Service Ratio for the proposed loan — spec'd from a reference screen
from a different system, then adapted to this app's own visual language
(label-above-field, ₱-prefixed `NumericFormat` inputs, `StatusBadge` pills
for totals, `TONE_COLORS` — not the reference's spreadsheet-style
label-beside-field layout or solid navy section banner).

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
- **Financial Summary is status + remarks only** — the legacy Financial
  Statement / Bank Loans / Financial Highlights deep data-entry forms and
  their XLS/PDF report views are not built. Each is a large sub-feature
  (its own spec/plan) when it's picked up.
