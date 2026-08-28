# Bureau Reports → Integrated Initial Credit Checking Results — Design Spec

Date: 2026-08-29

## Purpose

Expand Initial Credit Checking's Bureau Reports section
(`src/sections/admin/bureau-reports-card.tsx`) so each bureau's report
becomes a real editable results table once its file is uploaded, matching
the supplied "PGFC – Integrated Initial Credit Checking Results" PDF
template's six report sections (CMAP, BAP/NFIS, CIBI, CIC, LOANDEX, PGFC
Existing Exposure), and rebuild the page's AI review card into the PDF's
structured AI Recommendation shape (risk level, summary, recommended
action, review-basis tags) — computed automatically from the new bureau
table data, continuing this app's existing "no manual AI fields" convention
rather than turning the section into officer data entry.

## Scope & Non-Goals

- Covers only Initial Credit Checking's Bureau Reports card and its AI
  review card (`initial-credit-checking-view.tsx`). Does not touch Call
  Report, Requirement Checklist, Credit Investigation, or any other step.
- The existing CIBI **intake** form (name/DOB/address/loan terms — the
  request sent out) is untouched. This spec adds a new **results** table
  after it (Provider/Facility Type/Original Amount/etc. — what CIBI reports
  back), following the same "collect once submitted" flow CIBI already has.
- CMAP, BAP/NFIS, CIC, and LOANDEX stay upload-only for the file itself
  (`BureauUpload`, unchanged) — this spec adds a repeatable-row results
  table alongside each upload, revealed once that bureau's file is present.
  No change to the upload mechanism itself.
- PGFC Existing Exposure is new: an internal record (not a third-party
  upload), always visible, one repeatable-row table, no upload/file concept
  at all since it isn't sourced from an external bureau.
- The PDF's "8. AUTOMATED DECISION LOGIC" table is **not** displayed on the
  page — its six conditions become the real if/else logic behind the AI
  Recommendation section (Risk Level + Recommended Action), matching how
  the current AI card already just shows a computed result, not its
  derivation rules.
- AI Risk Level, AI Summary, AI Recommended Action, and AI Review Basis are
  **entirely computed**, no new stored fields for them — same convention as
  today's `buildInitialAiRecommendation()`. The officer never checks a Risk
  Level box or an AI Review Basis box by hand.
- No real bureau APIs, no real AI/LLM, no PDF export or document generation
  — same prototype conventions as every other admin screen. Every bureau
  table row is officer-typed data entry (there is no OCR/parsing of the
  uploaded file itself, same as today).
- Tables render as this app's own label-above-field row pattern (per the
  Financial Evaluation Cash Flow Statement precedent), not the PDF's literal
  spreadsheet/checkbox visual style — visual consistency with the rest of
  the admin app takes priority over matching the reference document's look.

## Data model: six new repeatable-row arrays

Each bureau's row type mirrors that section's exact PDF columns. All row
types share the shape convention `{ id: string; ...fields: string }` — every
field a free-text string, matching this app's existing convention for
every other admin form (no numeric coercion at the type level; computation
functions parse as needed, same as `cash-flow-statement.ts`).

```ts
// src/auth/admin-context.tsx additions

export type CmapCase = {
  id: string;
  defendantSubject: string;
  plaintiff: string;
  natureOfCase: string;
  amountInvolved: string;
  caseNo: string;
  dateFiled: string;
  status: string;
  creditRiskRemarks: string;
};

export type BapNfisRecord = {
  id: string;
  lendingInstitution: string;
  facility: string;
  originalLoanAmount: string;
  dateGranted: string;
  maturityDate: string;
  outstandingBalance: string;
  paymentHistory: string;
  statusRemarks: string;
};

export type CibiResult = {
  id: string;
  provider: string;
  facilityType: string;
  originalAmount: string;
  outstandingBalance: string;
  overdueAmount: string;
  monthlyAmortization: string;
  paymentStatus: string;
  remarks: string;
};

export type CicContract = {
  id: string;
  contractCode: string;
  contractType: string;
  maturityDate: string;
  outstandingBalance: string;
  overdueAmount: string;
  monthlyAmortization: string;
  contractStatus: string;
  remarks: string;
};

export type LoandexRecord = {
  id: string;
  bankInstitution: string;
  loanFacility: string;
  maturityDate: string;
  outstandingBalance: string;
  overdueAmount: string;
  monthlyAmortization: string;
  accountStatus: string;
  remarks: string;
};

export type PgfcExposureRecord = {
  id: string;
  principalBalance: string;
  interestBalance: string;
  maturityDate: string;
  remainingTerm: string;
  lastPaymentDate: string;
  monthlyAmortization: string;
  paymentStatus: string;
  remarks: string;
};
```

`CreditChecking` gains six new array fields, one per table above, each
starting `[]`:

```ts
export type CreditChecking = {
  // ...existing fields unchanged...
  cmapCases: CmapCase[];
  bapNfisRecords: BapNfisRecord[];
  cibiResults: CibiResult[];
  cicContracts: CicContract[];
  loandexRecords: LoandexRecord[];
  pgfcExposureRecords: PgfcExposureRecord[];
};
```

Placed on `CreditChecking` (not a new top-level slot) since every one of
these is conceptually part of Initial Credit Checking's own results, same
step `bureauFindingStatus`/`bureauFindingBureau` already live on.

### Setters

One generic add/remove/update triple per array (six triples total),
following the exact pattern `addCashFlowOtherLoan`/`removeCashFlowOtherLoan`/
`updateCashFlowOtherLoan` established in Financial Evaluation:

```ts
addCmapCase: () => void;
removeCmapCase: (id: string) => void;
updateCmapCase: (id: string, data: Partial<CmapCase>) => void;
// ...same triple for bapNfisRecords, cibiResults, cicContracts, loandexRecords, pgfcExposureRecords
```

Each `add*` appends a blank row (`{ id: crypto.randomUUID(), ...allFieldsBlank }`)
via `setCreditChecking`'s existing merge pattern.

## UI: per-bureau results table, revealed on upload

`bureau-reports-card.tsx`'s `SimpleBureauRow` (used for CMAP/BAP-NFIS/CIC/
LOANDEX today, `bureau-reports-card.tsx:215-314`) takes new props for its
array/add/remove/update triple and renders the results table as a sibling
`Box` **after** its existing `<BureauRow>...</BureauRow>` return (not via
`BureauRow`'s `children` prop, which is a header-row action slot for
View/Menu/Upload buttons only — a results table is a separate block below
the whole row, same relationship `RequirementDocRow`'s parent `Stack`
already has between the row itself and any following content). Once
`upload.fileName !== null`, a "View details" `CollapsibleSection` (default
expanded) appears in that sibling `Box`, containing:

- A `Stack` of rows, one per array entry, each row a `Grid` of label-above
  fields (this app's `Field`/`bureau-reports-card.tsx`-style convention —
  NOT the PDF's literal table grid) matching that bureau's columns.
- A trailing icon-button per row to remove it (`removeCmapCase(id)` etc.),
  matching Cash Flow Statement's Other Loans row-remove pattern.
- A trailing "+ Add [Case/Record/Result/Contract]" button (`outlinedNavyButtonSx`)
  that calls the corresponding `add*` setter.
- Empty state (`rows.length === 0`): a short dashed-border prompt ("No CMAP
  cases recorded yet.") plus the Add button — same convention as
  Requirement Checklist's empty-collateral-list state.

CIBI's results table (`cibiResults`) is a new `<Collapse>` block, sibling to
the existing intake-form `Collapse` at `bureau-reports-card.tsx:531`
(both live inside `CibiRow`'s outer `Box` opened at line 395, after the
header `Stack` closes at line 529) — gated on `cibiForm.reportFileName !== null`,
matching the "reveal once the report is back" requirement uniformly with
the other four bureaus' `upload.fileName !== null` gate (CIBI's own report
upload, distinct from the intake form, already exists at
`bureau-reports-card.tsx:452-528`).

PGFC Existing Exposure is a new sixth row in the card, always visible (no
upload gate at all, since it has no file/bureau source) — same visual shell
as the other rows (icon, title, `StatusBadge` count) but its body (the
`pgfcExposureRecords` table + Add button) is never collapsed behind an
upload check.

## AI Recommendation: rebuilt on top of the new tables

`initial-credit-checking-risk.ts` gains a new export,
`buildInitialCreditCheckingResult()`, replacing the current
`buildInitialAiRecommendation(loanAmount, monthlyIncome, employmentStatus)`
— called today from `initial-credit-checking-view.tsx:383-387` (passing
`application.financialInfo?.desiredLoanAmount ?? 0`,
`?.monthlyIncome ?? 0`, `?.employmentStatus ?? 'Unknown'`) and from
`credit-checking-result-modal.tsx:195` (same three args, read from
`application` there too). Both call sites switch to the new function; the
old one is deleted rather than kept alongside, since every consumer moves
to the superset function together in the same change.

```ts
export type InitialCreditCheckingRiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'unable-to-determine';

export type ReviewBasisTag =
  | 'bureau-consistency' | 'existing-exposure' | 'delinquency-overdue-history'
  | 'court-legal-findings' | 'pgfc-payment-history' | 'credit-scoring'
  | 'policy-rac-alignment' | 'kyc-aml-fraud-indicators' | 'data-completeness';

export function buildInitialCreditCheckingResult(input: {
  cmapCases: CmapCase[];
  bapNfisRecords: BapNfisRecord[];
  cibiResults: CibiResult[];
  cicContracts: CicContract[];
  loandexRecords: LoandexRecord[];
  pgfcExposureRecords: PgfcExposureRecord[];
  allBureauReportsUploaded: boolean;
  // same three debt-to-income inputs the current function already takes,
  // grouped into the input object instead of positional args
  desiredLoanAmount: number;
  monthlyIncome: number;
  employmentStatus: string;
}): {
  riskLevel: InitialCreditCheckingRiskLevel;
  overallAssessment: string;   // "The applicant is assessed as {LEVEL} credit risk based on..."
  summary: string;
  recommendedAction: string;
  reviewBasis: ReviewBasisTag[];
};
```

### Derivation rules (translating the PDF's 6-condition decision table)

Evaluated in this order (first match wins, mirroring the PDF's table
top-to-bottom priority):

1. **`ON HOLD`** → `riskLevel: 'unable-to-determine'` — when
   `!allBureauReportsUploaded` (missing bureau result). `allBureauReportsUploaded`
   is the existing boolean already computed identically in both call sites
   (`initial-credit-checking-view.tsx:192-197` and
   `credit-checking-result-modal.tsx:189-193`:
   `!!cibiForm.reportFileName && !!loandexUpload.fileName && !!cicUpload.fileName
   && !!cmapUpload.fileName && !!nfisBapUpload.fileName`) — unchanged by this
   spec; PGFC Existing Exposure is deliberately excluded from it since it
   has no upload/file to check. `reviewBasis` includes `'data-completeness'`.
2. **`DOES NOT MEET INITIAL RAC`** / **`FOR FURTHER CREDIT REVIEW`** →
   `riskLevel: 'high'` — when any `cmapCases` entry exists (court/legal
   finding) or any `status`/`paymentHistory`/`paymentStatus`/`accountStatus`/
   `contractStatus` field across the five bureau tables contains a
   negative-status marker (case-insensitive match against a small keyword
   set: "overdue", "delinquent", "default", "past due", "negative", "closed
   with balance" — same deterministic-keyword-match spirit as
   `simulateBureauFinding()`'s existing hash-based negative-finding logic,
   not real NLP). `reviewBasis` includes whichever of
   `'court-legal-findings'`/`'delinquency-overdue-history'`/
   `'existing-exposure'` actually matched.
3. **`FOR FURTHER CREDIT REVIEW`** → `riskLevel: 'elevated'` — when
   `pgfcExposureRecords` is non-empty (existing PGFC exposure, not
   necessarily adverse) or total outstanding balances across tables exceed
   a proportion of the applied loan amount (reusing the existing
   debt-to-income-style comparison already in
   `buildInitialAiRecommendation()`). `reviewBasis` includes
   `'existing-exposure'`/`'credit-scoring'`.
4. **`PROCEED SUBJECT TO VERIFICATION`** → `riskLevel: 'moderate'` — when
   any bureau table has at least one row but none trigger the above (minor
   discrepancy / present but clean). `reviewBasis` includes
   `'bureau-consistency'`.
5. **`CLEAR TO PROCEED`** → `riskLevel: 'low'` — default, when
   `allBureauReportsUploaded` and no rows across any table trigger the
   above. `reviewBasis` includes `'data-completeness'`,
   `'bureau-consistency'`.

`overallAssessment`/`summary`/`recommendedAction` are template strings
parameterized by which rule fired and row counts (e.g. "AI verified 5 of 5
bureau reports on file across 3 recorded findings; no adverse court or
delinquency records found.") — same canned-narrative convention as every
other "AI Summary" in this app, not real generation.

## UI: AI review card rebuild

`initial-credit-checking-view.tsx`'s current "AI review, summary &
recommendation" card is restructured to:

1. **Overall Assessment** — one sentence, plain text.
2. **AI Risk Level** — a `StatusBadge`-style single pill (not literal PDF
   checkboxes) showing the resolved level, colored via a 5-level tone map
   (`low`→success, `moderate`→info, `elevated`→warning, `high`→error,
   `unable-to-determine`→neutral) replacing the current 3-level
   `INITIAL_RISK_STYLES`.
3. **AI Summary** — existing box, unchanged visual shell, new computed text.
4. **AI Recommended Action** — existing "AI Recommendation" box, unchanged
   visual shell, new computed text (renamed field, same slot).
5. **AI Review Basis** — a `Stack` of small read-only `Chip`/`StatusBadge`
   tags, one per matched `ReviewBasisTag`, neutral tone, non-interactive
   (computed, not officer-toggled) — visually similar to
   `ChipToggleGroup`'s selected-chip styling but without the toggle
   interaction, since these are never manually changed.

The existing "View Initial Credit Checking Result" button/modal
(`credit-checking-result-modal.tsx`) also switches from
`buildInitialAiRecommendation()` to `buildInitialCreditCheckingResult()` so
the modal and the inline card never disagree — same shared-function
convention the current code already follows.

**Breaking change to fix at this call site:** `credit-checking-result-modal.tsx:201`
currently does `const isCleared = initialRiskLevel === 'good' && allBureauReportsUploaded`
— a binary Cleared/not-Cleared gate keyed to the old 3-level type's
`'good'` value, which no longer exists in the 5-level
`InitialCreditCheckingRiskLevel`. Replace with
`isCleared = riskLevel === 'low' && allBureauReportsUploaded` (the new
type's equivalent "clean" value) — same threshold meaning, updated to the
new level name.

Confirmed exhaustively (repo-wide grep for
`InitialRiskLevel|initialRiskLevel|initialAiRecommendation|buildInitialAiRecommendation`):
every reference to the old type/function lives in exactly these three
files — `initial-credit-checking-risk.ts` (the definition, being replaced),
`initial-credit-checking-view.tsx:38-39,150,383,388` (`INITIAL_RISK_STYLES`
keyed by the old type — becomes the new 5-level tone map described in "UI:
AI review card rebuild" above), and `credit-checking-result-modal.tsx:22,35,195,201`
(the one `=== 'good'` comparison above — no other `=== 'watch'`/`=== 'high'`
comparisons exist anywhere). No other consumer exists.

## Non-goals / Open items

- No PDF export/print view matching the reference document's literal
  layout — this expands the existing in-app card/modal, not a document
  generator.
- No per-row file attachment (e.g. attaching a specific case document to
  one CMAP row) — only the bureau-level upload (`BureauUpload`) exists, same
  as today.
- No validation beyond required-field styling parity with existing forms —
  a blank bureau table is a valid state (nothing recorded yet), same as an
  application with no Appraisal groups.
- `localStorage` migration: confirmed at `admin-context.tsx:1641-1644` —
  `creditChecking` already merges via plain shallow spread
  (`{ ...initialState.review.creditChecking, ...storedReview.creditChecking }`),
  so any session saved before this change automatically gets the six new
  arrays defaulted to `[]` from `initialState` with zero additional
  migration code, same as every other plain-field addition to this slice
  has worked before.
