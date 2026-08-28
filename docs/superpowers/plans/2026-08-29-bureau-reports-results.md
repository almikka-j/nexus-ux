# Bureau Reports → Initial Credit Checking Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Initial Credit Checking's Bureau Reports card so CMAP, BAP/NFIS, CIBI, CIC, and LOANDEX each reveal a real editable results table once their file is uploaded, add a new always-visible PGFC Existing Exposure table, and rebuild the AI review card into a 5-level risk engine computed from all six tables.

**Architecture:** Six new repeatable-row arrays live on the existing `CreditChecking` state slice (`admin-context.tsx`), each with an add/remove/update setter triple following the exact pattern already proven by Financial Evaluation's `addCashFlowOtherLoan`/`removeCashFlowOtherLoan`/`updateCashFlowOtherLoan`. A new file, `bureau-results-tables.tsx`, holds one small table component per bureau (they share a row-rendering shape but differ in exact columns, so each gets its own component rather than one generic table forcing a union of all fields). `bureau-reports-card.tsx` renders each table conditionally below its bureau's existing upload row. `initial-credit-checking-risk.ts` gains `buildInitialCreditCheckingResult()`, a pure function replacing the current 3-level `buildInitialAiRecommendation()`, consumed by both `initial-credit-checking-view.tsx` and `credit-checking-result-modal.tsx` so the two screens never disagree.

**Tech Stack:** Next.js 14 (App Router), React 18, MUI v5, TypeScript. No test framework exists in this repo — verification is `npx tsc --noEmit` + `npx eslint <files>` per task, plus a final manual Playwright smoke walk (matching every prior plan in `docs/superpowers/plans/`).

**Spec:** `docs/superpowers/specs/2026-08-29-bureau-reports-results-design.md`

## Global Constraints

- Every new field is a free-text `string` (no numeric coercion at the type level) — matches every existing admin form field in this codebase.
- Every new row type has an `id: string` field, generated via `crypto.randomUUID()` on add — matches `CashFlowOtherLoan`, `AppraisalTctGroup`, etc.
- No new stored fields for AI Risk Level / AI Summary / AI Recommended Action / AI Review Basis — all four are computed at render time, never persisted, matching `buildInitialAiRecommendation()`'s existing convention.
- No PDF export, no per-row file attachment, no OCR/parsing of uploaded bureau files. Every row is officer-typed.
- `readStoredState()`'s `creditChecking` merge is already a plain shallow spread (`admin-context.tsx:1641-1644`) — the six new arrays need zero additional migration code; confirmed in the spec.
- Tables render as this app's label-above-field row pattern (the `Field`/`CurrencyField` convention from `cash-flow-statement-card.tsx`), never the PDF's literal spreadsheet grid.

---

## File Structure

```
src/auth/admin-context.tsx                              — MODIFY: 6 new row types, 6 new CreditChecking array fields, 18 new setters (6×3), initial-state seeding (Task 1)
src/sections/admin/initial-credit-checking-risk.ts       — MODIFY: add buildInitialCreditCheckingResult(), remove buildInitialAiRecommendation() (Task 2)
src/sections/admin/bureau-results-tables.tsx             — CREATE: 6 table components (CmapCasesTable, BapNfisRecordsTable, CibiResultsTable, CicContractsTable, LoandexRecordsTable, PgfcExposureTable) + shared Field/row helpers (Task 3)
src/sections/admin/bureau-reports-card.tsx               — MODIFY: wire each SimpleBureauRow to its results table; add PGFC Existing Exposure as a 6th always-visible row; wire CIBI's results table into CibiRow (Task 4)
src/sections/admin/initial-credit-checking-view.tsx      — MODIFY: replace buildAiSummary/buildAiRecommendation/buildInitialAiRecommendation calls with buildInitialCreditCheckingResult(); rebuild AI card JSX with 5-level risk pill + AI Review Basis tags (Task 5)
src/sections/admin/call-report/credit-checking-result-modal.tsx — MODIFY: swap buildInitialAiRecommendation() for buildInitialCreditCheckingResult(); fix isCleared's 'good' → 'low' comparison (Task 6)
docs/ADMIN_INITIAL_CREDIT_CHECKING.md                    — MODIFY: document all of the above (Task 7)
```

---

### Task 1: State — six new row types, array fields, and setters on `admin-context.tsx`

**Files:**
- Modify: `src/auth/admin-context.tsx:80` (insert new types after `CreditChecking` type closes)
- Modify: `src/auth/admin-context.tsx:36-80` (add six array fields to `CreditChecking`)
- Modify: `src/auth/admin-context.tsx:1048` (add 18 setter signatures to `AdminContextValue`)
- Modify: `src/auth/admin-context.tsx:1459-1470` (seed six empty arrays in `createInitialReview()`)
- Modify: `src/auth/admin-context.tsx:1851-1855` (implement 18 setters, adjacent to `setCreditChecking`)

**Interfaces:**
- Produces: `CmapCase`, `BapNfisRecord`, `CibiResult`, `CicContract`, `LoandexRecord`, `PgfcExposureRecord` types (all exported). `CreditChecking.cmapCases: CmapCase[]`, `.bapNfisRecords: BapNfisRecord[]`, `.cibiResults: CibiResult[]`, `.cicContracts: CicContract[]`, `.loandexRecords: LoandexRecord[]`, `.pgfcExposureRecords: PgfcExposureRecord[]`. Setters: `addCmapCase()/removeCmapCase(id)/updateCmapCase(id, data)` and the same triple named for each of the other five arrays (`addBapNfisRecord`/`removeBapNfisRecord`/`updateBapNfisRecord`, `addCibiResult`/`removeCibiResult`/`updateCibiResult`, `addCicContract`/`removeCicContract`/`updateCicContract`, `addLoandexRecord`/`removeLoandexRecord`/`updateLoandexRecord`, `addPgfcExposureRecord`/`removePgfcExposureRecord`/`updatePgfcExposureRecord`).

- [ ] **Step 1: Add the six row types**

Open `src/auth/admin-context.tsx`. Find the `CreditChecking` type (starts at line 36, closes with `};` at line 80). Insert these six type definitions immediately after that closing `};` (i.e., right before `export type CibiForm = {` at line 82):

```ts
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

- [ ] **Step 2: Add the six array fields to `CreditChecking`**

In the same file, find the `CreditChecking` type's last field before its closing `};` (currently `justificationDocument: { fileName: string; fileData: string } | null;` at line 79). Add six new fields right after it, before the closing brace:

```ts
  justificationDocument: { fileName: string; fileData: string } | null;
  /**
   * Six new repeatable-row results tables, one per bureau report section
   * plus PGFC's own internal exposure record — see
   * docs/superpowers/specs/2026-08-29-bureau-reports-results-design.md.
   * Each is populated by the officer once that bureau's report file is
   * uploaded (pgfcExposureRecords has no upload gate — it's an internal
   * record, not a third-party bureau report).
   */
  cmapCases: CmapCase[];
  bapNfisRecords: BapNfisRecord[];
  cibiResults: CibiResult[];
  cicContracts: CicContract[];
  loandexRecords: LoandexRecord[];
  pgfcExposureRecords: PgfcExposureRecord[];
};
```

(Remove the old standalone `justificationDocument` line's own closing `};` — it now has six new siblings before the type's real closing brace.)

- [ ] **Step 3: Typecheck to confirm the type-only change compiles**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: **errors** — `createInitialReview()`'s `creditChecking: {...}` object literal (line 1459) is now missing six required fields. This is expected; Step 4 fixes it.

- [ ] **Step 4: Seed the six empty arrays in `createInitialReview()`**

Find `createInitialReview()`'s `creditChecking: {` object literal (starts at line 1459). It currently ends with `justificationDocument: null,` right before the closing `},`. Add the six new fields there:

```ts
    creditChecking: {
      documentUploaded: false,
      documentName: null,
      decision: 'pending',
      bureauFindingStatus: 'pending',
      bureauFindingBureau: null,
      bureauFindingReason: null,
      notes: '',
      decisionReason: '',
      officerRecommendation: '',
      justificationDocument: null,
      cmapCases: [],
      bapNfisRecords: [],
      cibiResults: [],
      cicContracts: [],
      loandexRecords: [],
      pgfcExposureRecords: [],
    },
```

- [ ] **Step 5: Typecheck again**

Run: `npx tsc --noEmit`
Expected: no errors related to `CreditChecking`/`createInitialReview` (there should be zero errors overall at this point, since Steps 1-2-4 form one complete, self-consistent change).

- [ ] **Step 6: Add 18 setter signatures to `AdminContextValue`**

Find `setCreditChecking: (data: Partial<CreditChecking>) => void;` (line 1048). Add these 18 lines immediately after it:

```ts
  setCreditChecking: (data: Partial<CreditChecking>) => void;
  addCmapCase: () => void;
  removeCmapCase: (id: string) => void;
  updateCmapCase: (id: string, data: Partial<CmapCase>) => void;
  addBapNfisRecord: () => void;
  removeBapNfisRecord: (id: string) => void;
  updateBapNfisRecord: (id: string, data: Partial<BapNfisRecord>) => void;
  addCibiResult: () => void;
  removeCibiResult: (id: string) => void;
  updateCibiResult: (id: string, data: Partial<CibiResult>) => void;
  addCicContract: () => void;
  removeCicContract: (id: string) => void;
  updateCicContract: (id: string, data: Partial<CicContract>) => void;
  addLoandexRecord: () => void;
  removeLoandexRecord: (id: string) => void;
  updateLoandexRecord: (id: string, data: Partial<LoandexRecord>) => void;
  addPgfcExposureRecord: () => void;
  removePgfcExposureRecord: (id: string) => void;
  updatePgfcExposureRecord: (id: string, data: Partial<PgfcExposureRecord>) => void;
```

- [ ] **Step 7: Typecheck to confirm interface-only addition compiles**

Run: `npx tsc --noEmit`
Expected: **errors** — the object literal implementing `AdminContextValue` (the `value = useMemo(() => ({ ... }), [...])` block, same one containing `setCreditChecking: (data) => ...` at line 1851) is now missing 18 required properties. Expected; Step 8 fixes it.

- [ ] **Step 8: Implement the 18 setters**

Find the existing `setCreditChecking: (data) => setState((prev) => ({ ...prev, review: { ...prev.review, creditChecking: { ...prev.review.creditChecking, ...data } } })),` block (starts line 1851). Add these 18 setter implementations immediately after it, inside the same object literal:

```ts
      setCreditChecking: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, creditChecking: { ...prev.review.creditChecking, ...data } },
        })),
      addCmapCase: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cmapCases: [
                ...prev.review.creditChecking.cmapCases,
                {
                  id: crypto.randomUUID(),
                  defendantSubject: '',
                  plaintiff: '',
                  natureOfCase: '',
                  amountInvolved: '',
                  caseNo: '',
                  dateFiled: '',
                  status: '',
                  creditRiskRemarks: '',
                },
              ],
            },
          },
        })),
      removeCmapCase: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cmapCases: prev.review.creditChecking.cmapCases.filter((row) => row.id !== id),
            },
          },
        })),
      updateCmapCase: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cmapCases: prev.review.creditChecking.cmapCases.map((row) =>
                row.id === id ? { ...row, ...data } : row
              ),
            },
          },
        })),
      addBapNfisRecord: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              bapNfisRecords: [
                ...prev.review.creditChecking.bapNfisRecords,
                {
                  id: crypto.randomUUID(),
                  lendingInstitution: '',
                  facility: '',
                  originalLoanAmount: '',
                  dateGranted: '',
                  maturityDate: '',
                  outstandingBalance: '',
                  paymentHistory: '',
                  statusRemarks: '',
                },
              ],
            },
          },
        })),
      removeBapNfisRecord: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              bapNfisRecords: prev.review.creditChecking.bapNfisRecords.filter((row) => row.id !== id),
            },
          },
        })),
      updateBapNfisRecord: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              bapNfisRecords: prev.review.creditChecking.bapNfisRecords.map((row) =>
                row.id === id ? { ...row, ...data } : row
              ),
            },
          },
        })),
      addCibiResult: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cibiResults: [
                ...prev.review.creditChecking.cibiResults,
                {
                  id: crypto.randomUUID(),
                  provider: '',
                  facilityType: '',
                  originalAmount: '',
                  outstandingBalance: '',
                  overdueAmount: '',
                  monthlyAmortization: '',
                  paymentStatus: '',
                  remarks: '',
                },
              ],
            },
          },
        })),
      removeCibiResult: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cibiResults: prev.review.creditChecking.cibiResults.filter((row) => row.id !== id),
            },
          },
        })),
      updateCibiResult: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cibiResults: prev.review.creditChecking.cibiResults.map((row) =>
                row.id === id ? { ...row, ...data } : row
              ),
            },
          },
        })),
      addCicContract: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cicContracts: [
                ...prev.review.creditChecking.cicContracts,
                {
                  id: crypto.randomUUID(),
                  contractCode: '',
                  contractType: '',
                  maturityDate: '',
                  outstandingBalance: '',
                  overdueAmount: '',
                  monthlyAmortization: '',
                  contractStatus: '',
                  remarks: '',
                },
              ],
            },
          },
        })),
      removeCicContract: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cicContracts: prev.review.creditChecking.cicContracts.filter((row) => row.id !== id),
            },
          },
        })),
      updateCicContract: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              cicContracts: prev.review.creditChecking.cicContracts.map((row) =>
                row.id === id ? { ...row, ...data } : row
              ),
            },
          },
        })),
      addLoandexRecord: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              loandexRecords: [
                ...prev.review.creditChecking.loandexRecords,
                {
                  id: crypto.randomUUID(),
                  bankInstitution: '',
                  loanFacility: '',
                  maturityDate: '',
                  outstandingBalance: '',
                  overdueAmount: '',
                  monthlyAmortization: '',
                  accountStatus: '',
                  remarks: '',
                },
              ],
            },
          },
        })),
      removeLoandexRecord: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              loandexRecords: prev.review.creditChecking.loandexRecords.filter((row) => row.id !== id),
            },
          },
        })),
      updateLoandexRecord: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              loandexRecords: prev.review.creditChecking.loandexRecords.map((row) =>
                row.id === id ? { ...row, ...data } : row
              ),
            },
          },
        })),
      addPgfcExposureRecord: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              pgfcExposureRecords: [
                ...prev.review.creditChecking.pgfcExposureRecords,
                {
                  id: crypto.randomUUID(),
                  principalBalance: '',
                  interestBalance: '',
                  maturityDate: '',
                  remainingTerm: '',
                  lastPaymentDate: '',
                  monthlyAmortization: '',
                  paymentStatus: '',
                  remarks: '',
                },
              ],
            },
          },
        })),
      removePgfcExposureRecord: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              pgfcExposureRecords: prev.review.creditChecking.pgfcExposureRecords.filter((row) => row.id !== id),
            },
          },
        })),
      updatePgfcExposureRecord: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditChecking: {
              ...prev.review.creditChecking,
              pgfcExposureRecords: prev.review.creditChecking.pgfcExposureRecords.map((row) =>
                row.id === id ? { ...row, ...data } : row
              ),
            },
          },
        })),
```

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Lint**

Run: `npx eslint src/auth/admin-context.tsx`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx
git commit -m "$(cat <<'EOF'
Add six bureau-results row types and setters to CreditChecking state

Adds CmapCase/BapNfisRecord/CibiResult/CicContract/LoandexRecord/
PgfcExposureRecord arrays plus their add/remove/update setter triples,
following the pattern established by Financial Evaluation's Cash Flow
Statement Other Loans.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: AI engine — `buildInitialCreditCheckingResult()` in `initial-credit-checking-risk.ts`

**Files:**
- Modify: `src/sections/admin/initial-credit-checking-risk.ts` (full rewrite — currently 37 lines)

**Interfaces:**
- Consumes: `CmapCase`, `BapNfisRecord`, `CibiResult`, `CicContract`, `LoandexRecord`, `PgfcExposureRecord` (from Task 1, `src/auth/admin-context.tsx`).
- Produces: `InitialCreditCheckingRiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'unable-to-determine'`, `ReviewBasisTag` (9-member union, see below), `REVIEW_BASIS_LABELS: Record<ReviewBasisTag, string>`, and `buildInitialCreditCheckingResult(input): { riskLevel, overallAssessment, summary, recommendedAction, reviewBasis }`. Task 5 and Task 6 both import these.

- [ ] **Step 1: Write the full replacement file**

Replace the entire contents of `src/sections/admin/initial-credit-checking-risk.ts` with:

```ts
// Shared with initial-credit-checking-view.tsx (renders the risk callout)
// and call-report/credit-checking-result-modal.tsx (uses the level to decide
// the report's Cleared/not-Cleared tone) — a single source of truth so the
// two screens never disagree on what counts as "negative."
//
// Translates the PDF template's "8. AUTOMATED DECISION LOGIC" 6-condition
// table into real if/else branches (see
// docs/superpowers/specs/2026-08-29-bureau-reports-results-design.md).
// Entirely computed, never stored — same "pure derivation" convention as
// every other AI output in this app.

import type {
  CmapCase,
  BapNfisRecord,
  CibiResult,
  CicContract,
  LoandexRecord,
  PgfcExposureRecord,
} from 'src/auth/admin-context';

export type InitialCreditCheckingRiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'unable-to-determine';

export type ReviewBasisTag =
  | 'bureau-consistency'
  | 'existing-exposure'
  | 'delinquency-overdue-history'
  | 'court-legal-findings'
  | 'pgfc-payment-history'
  | 'credit-scoring'
  | 'policy-rac-alignment'
  | 'kyc-aml-fraud-indicators'
  | 'data-completeness';

export const REVIEW_BASIS_LABELS: Record<ReviewBasisTag, string> = {
  'bureau-consistency': 'Bureau consistency',
  'existing-exposure': 'Existing exposure',
  'delinquency-overdue-history': 'Delinquency / overdue history',
  'court-legal-findings': 'Court / legal findings',
  'pgfc-payment-history': 'PGFC payment history',
  'credit-scoring': 'Credit scoring',
  'policy-rac-alignment': 'Policy / RAC alignment',
  'kyc-aml-fraud-indicators': 'KYC / AML / fraud indicators',
  'data-completeness': 'Data completeness',
};

const RISK_LEVEL_LABELS: Record<InitialCreditCheckingRiskLevel, string> = {
  low: 'LOW',
  moderate: 'MODERATE',
  elevated: 'ELEVATED',
  high: 'HIGH',
  'unable-to-determine': 'UNABLE TO DETERMINE',
};

// Deterministic keyword match against each row's own status-like field —
// same "hash/keyword, not real NLP" spirit as simulate-bureau-finding.ts's
// existing negative-finding logic, not a real classifier.
const NEGATIVE_STATUS_KEYWORDS = [
  'overdue',
  'delinquent',
  'default',
  'past due',
  'negative',
  'closed with balance',
];

function isNegativeStatus(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return NEGATIVE_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export type BuildInitialCreditCheckingResultInput = {
  cmapCases: CmapCase[];
  bapNfisRecords: BapNfisRecord[];
  cibiResults: CibiResult[];
  cicContracts: CicContract[];
  loandexRecords: LoandexRecord[];
  pgfcExposureRecords: PgfcExposureRecord[];
  allBureauReportsUploaded: boolean;
  desiredLoanAmount: number;
  monthlyIncome: number;
  employmentStatus: string;
};

export type InitialCreditCheckingResult = {
  riskLevel: InitialCreditCheckingRiskLevel;
  overallAssessment: string;
  summary: string;
  recommendedAction: string;
  reviewBasis: ReviewBasisTag[];
};

export function buildInitialCreditCheckingResult(
  input: BuildInitialCreditCheckingResultInput
): InitialCreditCheckingResult {
  const {
    cmapCases,
    bapNfisRecords,
    cibiResults,
    cicContracts,
    loandexRecords,
    pgfcExposureRecords,
    allBureauReportsUploaded,
    desiredLoanAmount,
    monthlyIncome,
    employmentStatus,
  } = input;

  const totalRows =
    cmapCases.length +
    bapNfisRecords.length +
    cibiResults.length +
    cicContracts.length +
    loandexRecords.length;

  const hasCourtCase = cmapCases.length > 0;
  const hasNegativeStatus =
    bapNfisRecords.some((row) => isNegativeStatus(row.statusRemarks) || isNegativeStatus(row.paymentHistory)) ||
    cibiResults.some((row) => isNegativeStatus(row.paymentStatus)) ||
    cicContracts.some((row) => isNegativeStatus(row.contractStatus)) ||
    loandexRecords.some((row) => isNegativeStatus(row.accountStatus)) ||
    pgfcExposureRecords.some((row) => isNegativeStatus(row.paymentStatus));

  const ratio = monthlyIncome > 0 ? desiredLoanAmount / (monthlyIncome * 12) : null;
  const hasExistingExposure = pgfcExposureRecords.length > 0;
  const highDebtRatio = ratio !== null && ratio > 0.6;

  const buildAssessment = (level: InitialCreditCheckingRiskLevel) =>
    `The applicant is assessed as ${RISK_LEVEL_LABELS[level]} credit risk based on consolidated bureau results, existing exposure, payment history, legal findings, and credit scoring.`;

  // 1. ON HOLD — missing bureau result / incomplete data.
  if (!allBureauReportsUploaded) {
    return {
      riskLevel: 'unable-to-determine',
      overallAssessment: buildAssessment('unable-to-determine'),
      summary:
        'One or more bureau reports have not been uploaded yet. Risk assessment cannot be completed until CIBI, LOANDEX, CIC, CMAP, and NFIS/BAP reports are all on file.',
      recommendedAction: 'Upload the remaining bureau reports above before proceeding.',
      reviewBasis: ['data-completeness'],
    };
  }

  // 2. DOES NOT MEET INITIAL RAC / FOR FURTHER CREDIT REVIEW — court/legal
  // findings or a negative status anywhere across the bureau tables.
  if (hasCourtCase || hasNegativeStatus) {
    const reviewBasis: ReviewBasisTag[] = [];
    if (hasCourtCase) reviewBasis.push('court-legal-findings');
    if (hasNegativeStatus) reviewBasis.push('delinquency-overdue-history');
    if (hasExistingExposure) reviewBasis.push('existing-exposure');
    return {
      riskLevel: 'high',
      overallAssessment: buildAssessment('high'),
      summary: `${totalRows} bureau record(s) reviewed across CIBI, LOANDEX, CIC, CMAP, and NFIS/BAP. ${hasCourtCase ? 'A court/legal case was found on record. ' : ''}${hasNegativeStatus ? 'One or more accounts show a delinquent, overdue, or negative status.' : ''}`.trim(),
      recommendedAction:
        'Recommend further credit review before proceeding — the finding(s) above require independent validation by authorized Credit personnel.',
      reviewBasis,
    };
  }

  // 3. FOR FURTHER CREDIT REVIEW — existing PGFC exposure, or a high
  // debt-to-income ratio relative to stated income.
  if (hasExistingExposure || highDebtRatio) {
    const reviewBasis: ReviewBasisTag[] = ['credit-scoring'];
    if (hasExistingExposure) reviewBasis.push('existing-exposure', 'pgfc-payment-history');
    return {
      riskLevel: 'elevated',
      overallAssessment: buildAssessment('elevated'),
      summary: `${hasExistingExposure ? 'The applicant has existing PGFC exposure on record. ' : ''}${highDebtRatio ? `Requested amount is high relative to stated income (${employmentStatus.toLowerCase()}), approximately ${((ratio ?? 0) * 100).toFixed(0)}% of annual income.` : ''}`.trim(),
      recommendedAction: 'Recommend proceeding with added scrutiny — review existing exposure and debt-to-income indicators before final decision.',
      reviewBasis,
    };
  }

  // 4. PROCEED SUBJECT TO VERIFICATION — at least one row on file, nothing
  // adverse found.
  if (totalRows > 0) {
    return {
      riskLevel: 'moderate',
      overallAssessment: buildAssessment('moderate'),
      summary: `${totalRows} bureau record(s) reviewed across CIBI, LOANDEX, CIC, CMAP, and NFIS/BAP. No adverse findings, but recorded activity should be verified against the application details before proceeding.`,
      recommendedAction: 'Recommend proceeding to Call Report preparation, subject to verification of the recorded bureau activity above.',
      reviewBasis: ['bureau-consistency'],
    };
  }

  // 5. CLEAR TO PROCEED — every report uploaded, nothing recorded, income
  // ratio acceptable.
  return {
    riskLevel: 'low',
    overallAssessment: buildAssessment('low'),
    summary: `All 5 bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP) are on file with no adverse findings, court/legal records, or existing PGFC exposure. Requested amount is within an acceptable range for stated income (${employmentStatus.toLowerCase()}).`,
    recommendedAction: 'Debt-to-income and bureau indicators are within an acceptable range. Recommend proceeding to Call Report preparation.',
    reviewBasis: ['data-completeness', 'bureau-consistency'],
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: **errors** — `initial-credit-checking-view.tsx` and `credit-checking-result-modal.tsx` still import the now-deleted `buildInitialAiRecommendation`/`InitialRiskLevel`. Expected; Tasks 5 and 6 fix these call sites. Confirm the errors are *only* in those two files (no errors inside `initial-credit-checking-risk.ts` itself) before moving on.

- [ ] **Step 3: Lint the new file in isolation**

Run: `npx eslint src/sections/admin/initial-credit-checking-risk.ts`
Expected: no errors (this ignores the two files with expected pending errors from Step 2).

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/initial-credit-checking-risk.ts
git commit -m "$(cat <<'EOF'
Replace buildInitialAiRecommendation with buildInitialCreditCheckingResult

Rebuilds the risk engine as a 5-level (low/moderate/elevated/high/
unable-to-determine) computation over the new bureau results tables,
translating the PDF template's 6-condition automated decision logic
into real if/else branches. Consumers updated in the next two tasks.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(This commit intentionally leaves the repo in a temporarily broken typecheck state — the two consumer files are fixed in Tasks 5-6, committed separately, matching this app's convention of one focused commit per file/concern rather than one giant commit.)

---

### Task 3: `bureau-results-tables.tsx` — six table components

**Files:**
- Create: `src/sections/admin/bureau-results-tables.tsx`

**Interfaces:**
- Consumes: `CmapCase`, `BapNfisRecord`, `CibiResult`, `CicContract`, `LoandexRecord`, `PgfcExposureRecord` types (Task 1). `outlinedNavyButtonSx` (`src/components/admin-ui`). `Iconify` (`src/components/iconify`).
- Produces: `CmapCasesTable`, `BapNfisRecordsTable`, `CibiResultsTable`, `CicContractsTable`, `LoandexRecordsTable`, `PgfcExposureTable` — each `({ rows, onAdd, onRemove, onUpdate }) => JSX.Element`, consumed by Task 4.

- [ ] **Step 1: Write the file**

```tsx
'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';

import type {
  CmapCase,
  BapNfisRecord,
  CibiResult,
  CicContract,
  LoandexRecord,
  PgfcExposureRecord,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// One small editable-rows table per bureau report section, matching the
// "PGFC – Integrated Initial Credit Checking Results" PDF template's exact
// columns for that section. Rendered below each bureau's upload row in
// bureau-reports-card.tsx once that bureau's file is uploaded (PGFC
// Existing Exposure has no upload gate — see that file). Each table is its
// own component rather than one generic table, since the six sections'
// columns don't share a common shape.
//
// Label-above-field row layout (this app's Field convention from
// cash-flow-statement-card.tsx / bureau-reports-card.tsx's CIBI intake
// form), NOT the PDF's literal spreadsheet grid — visual consistency with
// the rest of the admin app over matching the reference document's look.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13.5, bgcolor: 'common.white' },
};

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Stack spacing={0.6}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#3B4256' }}>{label}</Typography>
      <TextField
        fullWidth
        size="small"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        sx={fieldSx}
      />
    </Stack>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Box
      sx={{
        py: 2.5,
        px: 2,
        textAlign: 'center',
        borderRadius: '10px',
        border: '1px dashed #E1E4ED',
      }}
    >
      <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>{label}</Typography>
    </Box>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="outlined"
      size="small"
      startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
      sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
    >
      {label}
    </Button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton size="small" onClick={onClick} sx={{ mt: { xs: 0, sm: 2.75 } }}>
      <Iconify icon="mingcute:close-line" width={16} />
    </IconButton>
  );
}

export function CmapCasesTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: CmapCase[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<CmapCase>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CMAP court/legal cases recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Defendant / Subject" value={row.defendantSubject} onChange={(v) => onUpdate(row.id, { defendantSubject: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Plaintiff" value={row.plaintiff} onChange={(v) => onUpdate(row.id, { plaintiff: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Nature of Case" value={row.natureOfCase} onChange={(v) => onUpdate(row.id, { natureOfCase: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Amount Involved" value={row.amountInvolved} onChange={(v) => onUpdate(row.id, { amountInvolved: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Case No." value={row.caseNo} onChange={(v) => onUpdate(row.id, { caseNo: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Date Filed" value={row.dateFiled} onChange={(v) => onUpdate(row.id, { dateFiled: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Status" value={row.status} onChange={(v) => onUpdate(row.id, { status: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Credit Risk Remarks" value={row.creditRiskRemarks} onChange={(v) => onUpdate(row.id, { creditRiskRemarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Case" onClick={onAdd} />
    </Stack>
  );
}

export function BapNfisRecordsTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: BapNfisRecord[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<BapNfisRecord>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No BAP/NFIS credit history records yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Lending Institution / Source" value={row.lendingInstitution} onChange={(v) => onUpdate(row.id, { lendingInstitution: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Facility" value={row.facility} onChange={(v) => onUpdate(row.id, { facility: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Original Loan Amount" value={row.originalLoanAmount} onChange={(v) => onUpdate(row.id, { originalLoanAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Date Granted / Reported" value={row.dateGranted} onChange={(v) => onUpdate(row.id, { dateGranted: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity / Date Closed" value={row.maturityDate} onChange={(v) => onUpdate(row.id, { maturityDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} onChange={(v) => onUpdate(row.id, { outstandingBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment History" value={row.paymentHistory} onChange={(v) => onUpdate(row.id, { paymentHistory: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Status / Remarks" value={row.statusRemarks} onChange={(v) => onUpdate(row.id, { statusRemarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Record" onClick={onAdd} />
    </Stack>
  );
}

export function CibiResultsTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: CibiResult[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<CibiResult>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CIBI results recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Provider" value={row.provider} onChange={(v) => onUpdate(row.id, { provider: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Facility Type" value={row.facilityType} onChange={(v) => onUpdate(row.id, { facilityType: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Original / Finance Amount" value={row.originalAmount} onChange={(v) => onUpdate(row.id, { originalAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} onChange={(v) => onUpdate(row.id, { outstandingBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} onChange={(v) => onUpdate(row.id, { overdueAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} onChange={(v) => onUpdate(row.id, { monthlyAmortization: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment Status" value={row.paymentStatus} onChange={(v) => onUpdate(row.id, { paymentStatus: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Remarks" value={row.remarks} onChange={(v) => onUpdate(row.id, { remarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Result" onClick={onAdd} />
    </Stack>
  );
}

export function CicContractsTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: CicContract[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<CicContract>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No CIC contracts recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Code" value={row.contractCode} onChange={(v) => onUpdate(row.id, { contractCode: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Type" value={row.contractType} onChange={(v) => onUpdate(row.id, { contractType: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} onChange={(v) => onUpdate(row.id, { maturityDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} onChange={(v) => onUpdate(row.id, { outstandingBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} onChange={(v) => onUpdate(row.id, { overdueAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} onChange={(v) => onUpdate(row.id, { monthlyAmortization: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Contract Status" value={row.contractStatus} onChange={(v) => onUpdate(row.id, { contractStatus: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Remarks" value={row.remarks} onChange={(v) => onUpdate(row.id, { remarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Contract" onClick={onAdd} />
    </Stack>
  );
}

export function LoandexRecordsTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: LoandexRecord[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<LoandexRecord>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No LOANDEX records recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Bank / Institution" value={row.bankInstitution} onChange={(v) => onUpdate(row.id, { bankInstitution: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Loan Facility" value={row.loanFacility} onChange={(v) => onUpdate(row.id, { loanFacility: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} onChange={(v) => onUpdate(row.id, { maturityDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Outstanding Balance" value={row.outstandingBalance} onChange={(v) => onUpdate(row.id, { outstandingBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Overdue Amount" value={row.overdueAmount} onChange={(v) => onUpdate(row.id, { overdueAmount: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} onChange={(v) => onUpdate(row.id, { monthlyAmortization: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Account Status" value={row.accountStatus} onChange={(v) => onUpdate(row.id, { accountStatus: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Remarks" value={row.remarks} onChange={(v) => onUpdate(row.id, { remarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Record" onClick={onAdd} />
    </Stack>
  );
}

export function PgfcExposureTable({
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rows: PgfcExposureRecord[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<PgfcExposureRecord>) => void;
}) {
  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <EmptyState label="No existing PGFC exposure recorded yet." />
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Principal Balance" value={row.principalBalance} onChange={(v) => onUpdate(row.id, { principalBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Interest Balance" value={row.interestBalance} onChange={(v) => onUpdate(row.id, { interestBalance: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Maturity Date" value={row.maturityDate} onChange={(v) => onUpdate(row.id, { maturityDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Remaining Term" value={row.remainingTerm} onChange={(v) => onUpdate(row.id, { remainingTerm: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Last Payment Date" value={row.lastPaymentDate} onChange={(v) => onUpdate(row.id, { lastPaymentDate: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Monthly Amortization" value={row.monthlyAmortization} onChange={(v) => onUpdate(row.id, { monthlyAmortization: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Field label="Payment Status" value={row.paymentStatus} onChange={(v) => onUpdate(row.id, { paymentStatus: v })} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Field label="Remarks" value={row.remarks} onChange={(v) => onUpdate(row.id, { remarks: v })} />
              </Grid>
              <Grid item xs={12} md={1}>
                <RemoveButton onClick={() => onRemove(row.id)} />
              </Grid>
            </Grid>
          ))}
        </Stack>
      )}
      <AddButton label="Add Exposure Record" onClick={onAdd} />
    </Stack>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file (the two pre-existing errors from Task 2 in `initial-credit-checking-view.tsx`/`credit-checking-result-modal.tsx` are still present and expected until Tasks 5-6).

- [ ] **Step 3: Lint**

Run: `npx eslint src/sections/admin/bureau-results-tables.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/bureau-results-tables.tsx
git commit -m "$(cat <<'EOF'
Add six bureau-results table components

CmapCasesTable/BapNfisRecordsTable/CibiResultsTable/CicContractsTable/
LoandexRecordsTable/PgfcExposureTable — one per PDF template section,
each its own component since the six sections' columns don't share a
common shape. Not yet wired into bureau-reports-card.tsx.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire the six tables into `bureau-reports-card.tsx`

**Files:**
- Modify: `src/sections/admin/bureau-reports-card.tsx:215-314` (`SimpleBureauRow` — add results-table prop and conditional render)
- Modify: `src/sections/admin/bureau-reports-card.tsx:317-761` (`CibiRow` — add results table `Collapse`)
- Modify: `src/sections/admin/bureau-reports-card.tsx:763-785` (`BureauReportsCard` — pass new props to each row, add PGFC Existing Exposure row)

**Interfaces:**
- Consumes: `CmapCasesTable`, `BapNfisRecordsTable`, `CibiResultsTable`, `CicContractsTable`, `LoandexRecordsTable`, `PgfcExposureTable` (Task 3). All 18 setters + 6 arrays from `review.creditChecking` (Task 1).
- Produces: `BureauReportsCard` export unchanged in name/signature (still a zero-prop component) — only its internals and visual output change. Task 5/6 don't depend on anything new from this file.

- [ ] **Step 1: Add imports**

At the top of `src/sections/admin/bureau-reports-card.tsx`, add (near the existing `import { computeInstallment } from './cibi-form-card';` line):

```ts
import {
  CmapCasesTable,
  BapNfisRecordsTable,
  CibiResultsTable,
  CicContractsTable,
  LoandexRecordsTable,
  PgfcExposureTable,
} from './bureau-results-tables';
```

And add `Collapse` to the existing MUI import block if not already imported (check — `Collapse` is already imported at line 11, confirm and skip if present).

- [ ] **Step 2: Extend `SimpleBureauRow`'s props and render the results table**

Find `SimpleBureauRow` (currently `bureau-reports-card.tsx:215-223` for its signature). Replace the props type and add the results-table render as a sibling `Box` after the returned `<BureauRow>`:

```tsx
function SimpleBureauRow({
  title,
  upload,
  onUpload,
  resultsTable,
}: {
  title: string;
  upload: BureauUpload;
  onUpload: (data: Partial<BureauUpload>) => void;
  resultsTable?: React.ReactNode;
}) {
```

Then find this component's closing `return (<BureauRow ...>...</BureauRow>);` (the whole `SimpleBureauRow` function body ends at line 314 with `);` followed by `}`). Change the `return` statement to wrap the existing `<BureauRow>` and the new results table together:

```tsx
  return (
    <Stack spacing={1.5}>
      <BureauRow
        title={title}
        uploaded={!!upload.fileName}
        bureauFindingStatus={review.creditChecking.bureauFindingStatus}
        summary={upload.fileName ? BUREAU_SUMMARIES[title]?.(applicantName) : undefined}
        uploadDetails={
          upload.fileName
            ? `${upload.fileName} · Uploaded ${formatUploadedAt(upload.uploadedAt) ?? 'date unavailable'}`
            : undefined
        }
      >
        {/* ...existing children content (input, View/Menu/Upload buttons) unchanged... */}
      </BureauRow>
      {upload.fileName && resultsTable && (
        <Box sx={{ pl: { xs: 0, sm: 2 } }}>{resultsTable}</Box>
      )}
    </Stack>
  );
```

(Keep everything currently inside `<BureauRow>...</BureauRow>` — the `<input>`, `<Button>`s, `<Menu>` — exactly as-is; only the outer wrapping `Stack` and the trailing conditional `resultsTable` block are new.)

- [ ] **Step 3: Wire CIBI's results table into `CibiRow`**

Find `CibiRow`'s outer `<Box sx={{ borderRadius: '13px', ... }}>` (opens at line 395) and its existing intake-form `<Collapse in={formOpen} ...>` (starts at line 531, this is the last child before the outer `Box` closes). Add a new `<Collapse>` sibling immediately after that one, still inside the same outer `Box`, gated on `cibiForm.reportFileName`:

```tsx
      <Collapse in={!!cibiForm.reportFileName} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2.5, pt: 0 }}>
          <CibiResultsTable
            rows={review.creditChecking.cibiResults}
            onAdd={addCibiResult}
            onRemove={removeCibiResult}
            onUpdate={updateCibiResult}
          />
        </Box>
      </Collapse>
```

`CibiRow` will need `addCibiResult`/`removeCibiResult`/`updateCibiResult` and `review` destructured from `useAdmin()` at its top — check its existing `const { ... } = useAdmin();` destructure line near the top of the function and add these three setters to it (alongside whatever's already there, e.g. `setCibiForm`).

- [ ] **Step 4: Update `BureauReportsCard` — wire each row's table, add PGFC Existing Exposure**

Replace the whole `BureauReportsCard` function (currently lines 763-785) with:

```tsx
export function BureauReportsCard() {
  const {
    review,
    setLoandexUpload,
    setCicUpload,
    setCmapUpload,
    setNfisBapUpload,
    addCmapCase,
    removeCmapCase,
    updateCmapCase,
    addBapNfisRecord,
    removeBapNfisRecord,
    updateBapNfisRecord,
    addCicContract,
    removeCicContract,
    updateCicContract,
    addLoandexRecord,
    removeLoandexRecord,
    updateLoandexRecord,
    addPgfcExposureRecord,
    removePgfcExposureRecord,
    updatePgfcExposureRecord,
  } = useAdmin();
  const { loandexUpload, cicUpload, cmapUpload, nfisBapUpload, creditChecking } = review;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Bureau Reports
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the returned reports. All are required to make a decision.
      </Typography>

      <Stack spacing={1.5}>
        <CibiRow />
        <SimpleBureauRow
          title="LOANDEX"
          upload={loandexUpload}
          onUpload={setLoandexUpload}
          resultsTable={
            <LoandexRecordsTable
              rows={creditChecking.loandexRecords}
              onAdd={addLoandexRecord}
              onRemove={removeLoandexRecord}
              onUpdate={updateLoandexRecord}
            />
          }
        />
        <SimpleBureauRow
          title="CIC"
          upload={cicUpload}
          onUpload={setCicUpload}
          resultsTable={
            <CicContractsTable
              rows={creditChecking.cicContracts}
              onAdd={addCicContract}
              onRemove={removeCicContract}
              onUpdate={updateCicContract}
            />
          }
        />
        <SimpleBureauRow
          title="CMAP"
          upload={cmapUpload}
          onUpload={setCmapUpload}
          resultsTable={
            <CmapCasesTable
              rows={creditChecking.cmapCases}
              onAdd={addCmapCase}
              onRemove={removeCmapCase}
              onUpdate={updateCmapCase}
            />
          }
        />
        <SimpleBureauRow
          title="NFIS / BAP"
          upload={nfisBapUpload}
          onUpload={setNfisBapUpload}
          resultsTable={
            <BapNfisRecordsTable
              rows={creditChecking.bapNfisRecords}
              onAdd={addBapNfisRecord}
              onRemove={removeBapNfisRecord}
              onUpdate={updateBapNfisRecord}
            />
          }
        />
        <Box sx={{ borderRadius: '13px', border: '1px solid #EBEDF3', bgcolor: 'common.white', p: 2 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
            PGFC Existing Exposure
          </Typography>
          <PgfcExposureTable
            rows={creditChecking.pgfcExposureRecords}
            onAdd={addPgfcExposureRecord}
            onRemove={removePgfcExposureRecord}
            onUpdate={updatePgfcExposureRecord}
          />
        </Box>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file (the two pre-existing errors in `initial-credit-checking-view.tsx`/`credit-checking-result-modal.tsx` remain, expected until Tasks 5-6).

- [ ] **Step 6: Lint**

Run: `npx eslint src/sections/admin/bureau-reports-card.tsx`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/sections/admin/bureau-reports-card.tsx
git commit -m "$(cat <<'EOF'
Wire bureau-results tables into Bureau Reports card

Each of CMAP/BAP-NFIS/CIC/LOANDEX now reveals its results table once
that bureau's file is uploaded; CIBI's results table reveals once its
report is uploaded (separate from the intake form). PGFC Existing
Exposure is a new always-visible sixth row with no upload gate.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Rebuild the AI review card in `initial-credit-checking-view.tsx`

**Files:**
- Modify: `src/sections/admin/initial-credit-checking-view.tsx:38-39` (imports)
- Modify: `src/sections/admin/initial-credit-checking-view.tsx:112-154` (delete `buildAiSummary`/`buildAiRecommendation`/`INITIAL_RISK_STYLES`, add new 5-level tone map)
- Modify: `src/sections/admin/initial-credit-checking-view.tsx:383-399` (replace the three old computed-value blocks with one `buildInitialCreditCheckingResult()` call)
- Modify: `src/sections/admin/initial-credit-checking-view.tsx:517-564` (AI card JSX — add Risk Level pill + AI Review Basis tags)

**Interfaces:**
- Consumes: `buildInitialCreditCheckingResult`, `REVIEW_BASIS_LABELS`, `InitialCreditCheckingRiskLevel`, `ReviewBasisTag` (Task 2). `StatusBadge` (`src/components/admin-ui`, already used elsewhere in this app — check this file's existing imports and add if missing).

- [ ] **Step 1: Replace the risk-engine import**

Replace:
```ts
import { buildInitialAiRecommendation } from './initial-credit-checking-risk';
import type { InitialRiskLevel } from './initial-credit-checking-risk';
```
with:
```ts
import { buildInitialCreditCheckingResult, REVIEW_BASIS_LABELS } from './initial-credit-checking-risk';
import type { InitialCreditCheckingRiskLevel } from './initial-credit-checking-risk';
```

Also add `StatusBadge` to this file's import from `src/components/admin-ui` if not already present — check the existing `import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';` line and change it to `import { adminCardSx, outlinedNavyButtonSx, StatusBadge, TONE_COLORS } from 'src/components/admin-ui';`.

- [ ] **Step 2: Delete the two local builder functions, replace the risk style map**

Delete `buildAiSummary()` (lines 120-130) and `buildAiRecommendation()` (lines 132-148) entirely — both are fully superseded by `buildInitialCreditCheckingResult()`.

Replace `INITIAL_RISK_STYLES` (lines 150-154) with a 5-level version:

```ts
const RISK_LEVEL_STYLES: Record<InitialCreditCheckingRiskLevel, { bg: string; color: string; icon: string; label: string }> = {
  low: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low' },
  moderate: { bg: '#EEF1FE', color: '#3448B0', icon: 'solar:info-circle-bold', label: 'Moderate' },
  elevated: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Elevated' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High' },
  'unable-to-determine': { bg: '#F5F6FA', color: '#8891A6', icon: 'solar:question-circle-bold', label: 'Unable to Determine' },
};
```

- [ ] **Step 3: Replace the three computed-value blocks with one call**

Replace lines 383-399 (the `initialAiRecommendation`/`initialRiskStyle`/`aiSummary`/`aiRecommendation` block) with:

```ts
  const creditCheckingResult = buildInitialCreditCheckingResult({
    cmapCases: creditChecking.cmapCases,
    bapNfisRecords: creditChecking.bapNfisRecords,
    cibiResults: creditChecking.cibiResults,
    cicContracts: creditChecking.cicContracts,
    loandexRecords: creditChecking.loandexRecords,
    pgfcExposureRecords: creditChecking.pgfcExposureRecords,
    allBureauReportsUploaded,
    desiredLoanAmount: application.financialInfo?.desiredLoanAmount ?? 0,
    monthlyIncome: application.financialInfo?.monthlyIncome ?? 0,
    employmentStatus: application.financialInfo?.employmentStatus ?? 'Unknown',
  });
  const riskStyle = RISK_LEVEL_STYLES[creditCheckingResult.riskLevel];
```

(`creditChecking` must already be destructured from `review` near the top of this component — check the existing `const { creditChecking, cibiForm, loandexUpload, cicUpload, cmapUpload, nfisBapUpload } = review;` line and confirm `creditChecking` is present; it already is, per the current code.)

- [ ] **Step 4: Rebuild the AI card JSX**

Replace the whole AI card block (lines 517-564) with:

```tsx
        <Box sx={adminCardSx}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {allBureauReportsUploaded
              ? 'Based on the uploaded bureau reports and application details.'
              : 'Based on application details — upload the CIBI, LOANDEX, CIC, CMAP, and NFIS/BAP reports above to confirm with the full bureau review.'}
          </Typography>

          <Button
            onClick={() => setResultModalOpen(true)}
            variant="outlined"
            startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
            sx={{ ...outlinedNavyButtonSx, mb: 2.5, px: 2 }}
          >
            View Initial Credit Checking Result
          </Button>

          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon={riskStyle.icon} width={16} sx={{ color: riskStyle.color }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color }}>
                  AI Risk Level · {riskStyle.label}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>
                {creditCheckingResult.overallAssessment}
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon="solar:document-text-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  AI Summary
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                {creditCheckingResult.summary}
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon="solar:magic-stick-3-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  AI Recommended Action
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                {creditCheckingResult.recommendedAction}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>
                AI Review Basis
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {creditCheckingResult.reviewBasis.map((tag) => (
                  <StatusBadge key={tag} tone="neutral" label={REVIEW_BASIS_LABELS[tag]} />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `initial-credit-checking-view.tsx` (the one remaining pre-existing error is now only in `credit-checking-result-modal.tsx`, fixed in Task 6).

- [ ] **Step 6: Lint**

Run: `npx eslint src/sections/admin/initial-credit-checking-view.tsx`
Expected: no errors. If `TONE_COLORS` was added to the import in Step 1 but ends up unused, remove it from the import (only `StatusBadge` is actually referenced in this task's JSX).

- [ ] **Step 7: Commit**

```bash
git add src/sections/admin/initial-credit-checking-view.tsx
git commit -m "$(cat <<'EOF'
Rebuild Initial Credit Checking's AI review card on the new 5-level engine

Replaces the old 3-level risk banner + two ad-hoc summary/recommendation
builders with buildInitialCreditCheckingResult()'s output: an AI Risk
Level pill (low/moderate/elevated/high/unable-to-determine), AI Summary,
AI Recommended Action, and a new AI Review Basis tag list.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Fix `credit-checking-result-modal.tsx`'s risk-level call site

**Files:**
- Modify: `src/sections/admin/call-report/credit-checking-result-modal.tsx:22` (import)
- Modify: `src/sections/admin/call-report/credit-checking-result-modal.tsx:195-201` (risk computation + `isCleared`)

**Interfaces:**
- Consumes: `buildInitialCreditCheckingResult` (Task 2).

- [ ] **Step 1: Replace the import**

Replace:
```ts
import { buildInitialAiRecommendation } from '../initial-credit-checking-risk';
```
with:
```ts
import { buildInitialCreditCheckingResult } from '../initial-credit-checking-risk';
```

- [ ] **Step 2: Replace the risk computation and fix `isCleared`**

Replace lines 195-201:
```ts
  const initialRiskLevel = buildInitialAiRecommendation(
    application.financialInfo?.desiredLoanAmount ?? 0,
    application.financialInfo?.monthlyIncome ?? 0,
    application.financialInfo?.employmentStatus ?? 'Unknown'
  ).level;

  const isCleared = initialRiskLevel === 'good' && allBureauReportsUploaded;
```
with:
```ts
  const { riskLevel } = buildInitialCreditCheckingResult({
    cmapCases: creditChecking.cmapCases,
    bapNfisRecords: creditChecking.bapNfisRecords,
    cibiResults: creditChecking.cibiResults,
    cicContracts: creditChecking.cicContracts,
    loandexRecords: creditChecking.loandexRecords,
    pgfcExposureRecords: creditChecking.pgfcExposureRecords,
    allBureauReportsUploaded,
    desiredLoanAmount: application.financialInfo?.desiredLoanAmount ?? 0,
    monthlyIncome: application.financialInfo?.monthlyIncome ?? 0,
    employmentStatus: application.financialInfo?.employmentStatus ?? 'Unknown',
  });

  const isCleared = riskLevel === 'low' && allBureauReportsUploaded;
```

(`creditChecking` is already destructured from `review` at the top of this component — confirm via the existing `const { creditChecking, negativeCreditReport, cibiForm, loandexUpload, cicUpload, cmapUpload, nfisBapUpload } = review;` line.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project. This is the last of the two files that had a pending error since Task 2 — the whole codebase should be clean now.

- [ ] **Step 4: Lint**

Run: `npx eslint src/sections/admin/call-report/credit-checking-result-modal.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/sections/admin/call-report/credit-checking-result-modal.tsx
git commit -m "$(cat <<'EOF'
Fix credit-checking-result-modal's risk-level call site for the new engine

isCleared was keyed to the old 3-level type's 'good' value, which no
longer exists — now keyed to the new 5-level type's 'low' value, same
threshold meaning.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Manual verification + docs update

**Files:**
- Modify: `docs/ADMIN_INITIAL_CREDIT_CHECKING.md`

**Interfaces:**
- None (docs + manual browser verification only).

- [ ] **Step 1: Full-repo typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src`
Expected: no errors anywhere.

- [ ] **Step 2: Start the dev server**

Run (background): `npm run dev`
Wait until `http://localhost:3000` responds (poll with `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`, expect 200/30x — do not sleep-guess).

- [ ] **Step 3: Manual Playwright smoke walk**

Using a scratch Playwright script (Node + `playwright`, same pattern used throughout this session's prior verifications — a fresh `npm install playwright@1` in the scratchpad dir, headless Chromium with `--use-fake-device-for-media-stream`/`--use-fake-ui-for-media-stream` for the borrower selfie step):

1. Sign up a fresh borrower (`/auth/sign-up` → "Fill with Sample Data" → Continue → OTP `123456` at `/auth/verify`).
2. Submit a loan application (`/borrower/apply`, "Fill with Sample Data" through each step, selfie capture, Submit).
3. Log in as admin (`admin@pgfinance.com.ph` / `Admin123` at `/admin/login`).
4. Navigate to `/admin/applications/<email>/credit-checking`.
5. Confirm no console errors (`page.on('console', ...)`, `page.on('pageerror', ...)`).
6. Upload a file to the CMAP row (`input[type=file]` under that row) — confirm the CMAP results table (`CmapCasesTable`'s empty state, "No CMAP court/legal cases recorded yet.") appears immediately below.
7. Click "Add Case", fill in a few fields (Defendant/Subject, Nature of Case, Status), confirm the row persists after a page reload (re-navigate to the same URL, confirm the typed values are still there — proves the setter round-trips through `localStorage`).
8. Repeat a lighter version (upload + confirm table + add-one-row) for LOANDEX, CIC, NFIS/BAP, and CIBI (CIBI needs "Create Report" → submit the intake form → "Upload document" for its report first, before its results table appears).
9. Confirm the PGFC Existing Exposure table is visible with no upload needed, add one row, confirm it persists.
10. Scroll to the AI review card — confirm it shows an "AI Risk Level" pill, "AI Summary", "AI Recommended Action", and one or more "AI Review Basis" tags (e.g. after adding a CMAP case, confirm "Court / legal findings" appears as a tag and the Risk Level pill reads "High").
11. Click "View Initial Credit Checking Result" — confirm the modal opens with no console errors and its Cleared/not-Cleared styling reflects the same risk level as the inline card (e.g. if the card shows "High", the modal should not show its all-clear/"Cleared" state).

- [ ] **Step 4: Stop the dev server**

Run: `lsof -ti:3000 -sTCP:LISTEN | xargs -r kill`

- [ ] **Step 5: Update `docs/ADMIN_INITIAL_CREDIT_CHECKING.md`**

Read the file in full first. Update its "Bureau reports section" description (documented in the spec's research as: "CIBI is the only bureau with a (simulated) API integration; the other four are plain file-name uploads with no form behind them") to reflect that all five bureaus plus PGFC Existing Exposure now have real editable results tables, revealed on upload (PGFC Existing Exposure always visible). Update its "AI review card" description to document the new 5-level `buildInitialCreditCheckingResult()` engine (Risk Level pill, AI Summary, AI Recommended Action, AI Review Basis tags) replacing the old 3-level `buildInitialAiRecommendation()` + two ad-hoc builder functions. Add a note that `credit-checking-result-modal.tsx`'s `isCleared` now keys off `riskLevel === 'low'` instead of the old `'good'`. Follow this file's existing prose style and maintenance-rule header convention (add `bureau-results-tables.tsx` to the list of files that trigger a doc update, in the maintenance-rule banner at the top of the file).

- [ ] **Step 6: Commit**

```bash
git add docs/ADMIN_INITIAL_CREDIT_CHECKING.md
git commit -m "$(cat <<'EOF'
Document the Bureau Reports results-table expansion and new AI engine

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Addendum (2026-08-29, same day): Task 8 — read-only auto-filled rows, PGFC gets its own upload

After Tasks 1-7 were implemented, reviewed, and this plan's original scope
was fully verified working in-browser, the user reversed two of the
original spec's decisions (see
`docs/superpowers/specs/2026-08-29-bureau-reports-results-design.md`'s
"Addendum" section for full rationale):

1. No manual Add/Remove/edit — each of the six tables auto-populates with
   **exactly one realistic canned sample row** the moment that bureau's
   file is uploaded (by hand, or via "Fill with Sample Data").
2. PGFC Existing Exposure gets its own upload row (file input, View/
   Replace/Delete menu) exactly like the other five bureaus, instead of
   being always-visible with no gate.

### Task 8: Read-only auto-fill + PGFC upload row

**Files:**
- Modify: `src/auth/admin-context.tsx` — add `pgfcExposureUpload: BureauUpload`
  field + `setPgfcExposureUpload` setter (mirroring `cmapUpload`/
  `setCmapUpload` at lines ~1113, 1156, 1607, 2269 — copy that exact
  pattern for the new field/setter's declaration, initial-state seed, and
  `readStoredState()` merge entry). Delete all 18 `add*`/`remove*`/
  `update*` setters and their `AdminContextValue` signatures added in
  Task 1 (`addCmapCase`/`removeCmapCase`/`updateCmapCase` and the same
  triple for `bapNfisRecords`/`cibiResults`/`cicContracts`/
  `loandexRecords`/`pgfcExposureRecords`). Extend each of the six upload
  setters (`setCmapUpload`, `setNfisBapUpload`, `setCicUpload`,
  `setLoandexUpload`, `setPgfcExposureUpload`, and the CIBI report-upload
  path inside `setCibiForm`) so that when the incoming `data.fileName` is
  truthy AND the corresponding array is currently empty, the same state
  update also populates that bureau's one-row array with the canned
  sample row (see the spec addendum for each bureau's exact field values).
  When `data.fileName` is explicitly set to `null` (the existing "Delete
  file" action), also reset that bureau's array back to `[]`.
- Modify: `src/sections/admin/bureau-results-tables.tsx` — remove
  `AddButton`, `RemoveButton`, and the `onAdd`/`onRemove`/`onUpdate` props
  from all six components' signatures. Each `Field` becomes a disabled
  `TextField` (add `disabled` prop, drop the `onChange` wiring — keep the
  same visual shell/spacing).
- Modify: `src/sections/admin/bureau-reports-card.tsx` — add a sixth
  `SimpleBureauRow` for PGFC Existing Exposure (replacing the old
  always-visible `Box`), matching the other four bureaus' shape exactly:
  `title="PGFC Existing Exposure"`, `upload={pgfcExposureUpload}`,
  `onUpload={setPgfcExposureUpload}`, `resultsTable={<PgfcExposureTable rows={creditChecking.pgfcExposureRecords} />}`.
  Remove the now-deleted `onAdd`/`onRemove`/`onUpdate` props from every
  `SimpleBureauRow`/`CibiRow` results-table wiring (all six).
  `BureauReportsCard`'s `useAdmin()` destructure drops all 18 old
  setters, adds `pgfcExposureUpload` (from `review.creditChecking`) and
  `setPgfcExposureUpload`.
- Modify: `src/sections/admin/initial-credit-checking-view.tsx` —
  `handleFillSampleData` (~line 196-247) gains
  `setPgfcExposureUpload(sampleReport);` alongside its existing four
  bureau-upload calls (`setLoandexUpload`/`setCicUpload`/`setCmapUpload`/
  `setNfisBapUpload`), so "Fill with Sample Data" also uploads and
  populates PGFC Existing Exposure. The `allBureauReportsUploaded`
  boolean (~line 192-197) gains a sixth condition:
  `&& !!pgfcExposureUpload.fileName`. `handleClearSampleData` (the
  "Remove Sample Data" undo, right after `handleFillSampleData`) gains
  the matching reset for `pgfcExposureUpload` and, since arrays now
  auto-clear when `fileName` becomes `null` (per the setter change
  above), no separate array-clearing code is needed there — clearing the
  upload alone clears its row.
- Modify: `src/sections/admin/call-report/credit-checking-result-modal.tsx` —
  its own separate `allBureauReportsUploaded` computation (~line 188-193)
  gains the same sixth condition: `&& !!pgfcExposureUpload.fileName`.
  Needs `pgfcExposureUpload` added to its existing `review` destructure.

**Interfaces:**
- Consumes: `BureauUpload` type (existing, unchanged). `CmapCase`,
  `BapNfisRecord`, `CibiResult`, `CicContract`, `LoandexRecord`,
  `PgfcExposureRecord` types (existing, unchanged — only their setters
  change, not their shape).
- Produces: `pgfcExposureUpload: BureauUpload` field on `CreditChecking`,
  `setPgfcExposureUpload: (data: Partial<BureauUpload>) => void` on
  `AdminContextValue`. The six table components' new signature:
  `{ rows: T[] }` only (no callbacks).

- [ ] **Step 1: Add `pgfcExposureUpload` field + setter to `admin-context.tsx`**

Add the type field as a sibling top-level `review` field like
`cmapUpload` (NOT nested inside `CreditChecking`) — copy `cmapUpload`'s
exact location and pattern:

```ts
  pgfcExposureUpload: BureauUpload;
```

Add the setter signature to `AdminContextValue`:

```ts
  setPgfcExposureUpload: (data: Partial<BureauUpload>) => void;
```

Seed it in `createInitialReview()` alongside the other four uploads:

```ts
    pgfcExposureUpload: { fileName: null, fileData: null, uploadedAt: null },
```

Add it to `readStoredState()`'s merge block alongside the other four:

```ts
        pgfcExposureUpload: { ...initialState.review.pgfcExposureUpload, ...storedReview.pgfcExposureUpload },
```

- [ ] **Step 2: Delete the 18 add/remove/update setters and their signatures**

Remove all 18 setter implementations added in Task 1
(`addCmapCase`/`removeCmapCase`/`updateCmapCase`,
`addBapNfisRecord`/`removeBapNfisRecord`/`updateBapNfisRecord`,
`addCibiResult`/`removeCibiResult`/`updateCibiResult`,
`addCicContract`/`removeCicContract`/`updateCicContract`,
`addLoandexRecord`/`removeLoandexRecord`/`updateLoandexRecord`,
`addPgfcExposureRecord`/`removePgfcExposureRecord`/`updatePgfcExposureRecord`)
and their 18 corresponding lines in the `AdminContextValue` interface.

- [ ] **Step 3: Write the six canned sample-row constants**

In `admin-context.tsx`, near the six row types (or in a small local
helper near the setters — implementer's judgment on exact placement, as
long as it's colocated with where it's used), define one canned sample
row per bureau as literal objects matching each row type exactly,
following the spec addendum's exact field values:

```ts
function createCmapSampleCase(): CmapCase {
  return {
    id: crypto.randomUUID(),
    defendantSubject: '—',
    plaintiff: '—',
    natureOfCase: 'No matching record',
    amountInvolved: '—',
    caseNo: '—',
    dateFiled: '—',
    status: 'No Record Found',
    creditRiskRemarks: 'No adverse court or legal record found.',
  };
}

function createBapNfisSampleRecord(): BapNfisRecord {
  return {
    id: crypto.randomUUID(),
    lendingInstitution: 'N/A — no record found',
    facility: '—',
    originalLoanAmount: '—',
    dateGranted: '—',
    maturityDate: '—',
    outstandingBalance: '—',
    paymentHistory: '—',
    statusRemarks:
      'No cancelled credit card, adversely classified loan, or negative-file indicator found.',
  };
}

function createCibiSampleResult(facilityType: string, originalAmount: string, monthlyAmortization: string): CibiResult {
  return {
    id: crypto.randomUUID(),
    provider: 'CIBI',
    facilityType,
    originalAmount,
    outstandingBalance: '0.00',
    overdueAmount: '0.00',
    monthlyAmortization,
    paymentStatus: 'Current — No Delinquency',
    remarks: 'CIBI Bureau Score 600. One active account, payments made as agreed.',
  };
}

function createCicSampleContract(): CicContract {
  return {
    id: crypto.randomUUID(),
    contractCode: 'N/A',
    contractType: '—',
    maturityDate: '—',
    outstandingBalance: '—',
    overdueAmount: '—',
    monthlyAmortization: '—',
    contractStatus: 'No Record Found',
    remarks: 'Consistent borrower and account information, no material discrepancy found.',
  };
}

function createLoandexSampleRecord(): LoandexRecord {
  return {
    id: crypto.randomUUID(),
    bankInstitution: 'N/A — one active account on file',
    loanFacility: 'Personal Loan',
    maturityDate: '—',
    outstandingBalance: '0.00',
    overdueAmount: '0.00',
    monthlyAmortization: '—',
    accountStatus: 'Current — No Past-Due Exposure',
    remarks: 'Regular payment activity, no past-due exposure reported.',
  };
}

function createPgfcSampleExposureRecord(): PgfcExposureRecord {
  return {
    id: crypto.randomUUID(),
    principalBalance: '0.00',
    interestBalance: '0.00',
    maturityDate: '—',
    remainingTerm: '—',
    lastPaymentDate: '—',
    monthlyAmortization: '0.00',
    paymentStatus: 'No Existing Exposure',
    remarks: 'No prior or existing PGFC loan exposure on file.',
  };
}
```

`defendantSubject` uses a generic `'—'` placeholder rather than the
applicant's real name — `admin-context.tsx` is registration-agnostic and
has no access to `signUpData` anywhere else in the file either; threading
it in would require a much larger refactor out of this task's scope.

CIBI's sample needs `facilityType`/`originalAmount`/`monthlyAmortization`
passed in from the current `cibiForm` state at the moment its report is
uploaded (`creditType`, `financedAmount`, `installment` respectively) —
thread these through when calling `createCibiSampleResult(...)` from
inside `setCibiForm`'s implementation (Step 4 below).

- [ ] **Step 4: Wire auto-fill into the six upload setters**

Replace each of the four plain `BureauUpload` setters
(`setCmapUpload`/`setCicUpload`/`setLoandexUpload`/`setNfisBapUpload`)
with a version that also populates the array on upload and clears it on
delete. `cmapUpload` itself is a top-level `review` field (unchanged
location); `cmapCases` lives in `review.creditChecking`. Example for
CMAP — repeat the identical shape for CIC/LOANDEX/NFIS-BAP with their own
array/sample-row function:

```ts
      setCmapUpload: (data) =>
        setState((prev) => {
          const nextUpload = { ...prev.review.cmapUpload, ...data };
          const shouldSeed = !!nextUpload.fileName && prev.review.creditChecking.cmapCases.length === 0;
          const shouldClear = data.fileName === null;
          return {
            ...prev,
            review: {
              ...prev.review,
              cmapUpload: nextUpload,
              creditChecking: {
                ...prev.review.creditChecking,
                cmapCases: shouldSeed
                  ? [createCmapSampleCase()]
                  : shouldClear
                    ? []
                    : prev.review.creditChecking.cmapCases,
              },
            },
          };
        }),
```

Do the same shape for `setCicUpload`→`cicContracts`,
`setLoandexUpload`→`loandexRecords`, `setNfisBapUpload`→`bapNfisRecords`,
and the new `setPgfcExposureUpload`→`pgfcExposureRecords`.

For CIBI, find `setCibiForm`'s existing implementation and extend it the
same way: when `data.reportFileName` is truthy and
`prev.review.creditChecking.cibiResults.length === 0`, populate
`cibiResults` with one `createCibiSampleResult(...)` row, reading
`facilityType`/`originalAmount`/`monthlyAmortization` from the MERGED
form state (`{ ...prev.review.cibiForm, ...data }`, since `creditType`/
`financedAmount`/`installment` may already be set on `prev.review.cibiForm`
from the intake form, not necessarily present in this particular `data`
patch). When `data.reportFileName` is explicitly `null`, clear
`cibiResults` back to `[]`.

- [ ] **Step 5: Typecheck**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2/.worktrees/bureau-reports-results" && npx tsc --noEmit`
Expected: errors in `bureau-results-tables.tsx` and `bureau-reports-card.tsx`
(they still pass the now-deleted `onAdd`/`onRemove`/`onUpdate` props) —
expected at this intermediate point, fixed in Steps 6-7.

- [ ] **Step 6: Simplify `bureau-results-tables.tsx`**

For each of the six components: remove the `AddButton`/`RemoveButton`
function components (delete them outright — dead code once unused),
remove `onAdd`/`onRemove`/`onUpdate` from each component's prop type and
destructure, remove the trailing `<AddButton .../>` JSX line and the
`<RemoveButton .../>` grid cell in each row-map. Change `Field` to accept
and forward a `disabled` prop, and pass `disabled` from each row's
`<Field .../>` call (every field in every row becomes non-editable
display). Keep the `EmptyState` component and its per-table message
unchanged.

- [ ] **Step 7: Update `bureau-reports-card.tsx`**

Remove the `onAdd`/`onRemove`/`onUpdate` props from all six
`resultsTable={<XyzTable .../>}` call sites (LOANDEX, CIC, CMAP,
NFIS/BAP, CIBI, and the new PGFC row). Replace the old always-visible
PGFC `Box` (the one with a bare `<Typography>` heading + `<PgfcExposureTable>`,
no upload) with a sixth `<SimpleBureauRow>` call:

```tsx
        <SimpleBureauRow
          title="PGFC Existing Exposure"
          upload={pgfcExposureUpload}
          onUpload={setPgfcExposureUpload}
          resultsTable={<PgfcExposureTable rows={creditChecking.pgfcExposureRecords} />}
        />
```

Update `BureauReportsCard`'s `useAdmin()` destructure: remove the 18
deleted setters, add `setPgfcExposureUpload`; add `pgfcExposureUpload` to
the `const { loandexUpload, cicUpload, cmapUpload, nfisBapUpload, creditChecking } = review;`
destructure.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors remaining only in `initial-credit-checking-view.tsx` and
`credit-checking-result-modal.tsx` (Step 9 fixes these — they still need
`pgfcExposureUpload` wired into their `allBureauReportsUploaded`
computations and `handleFillSampleData`).

- [ ] **Step 9: Update `initial-credit-checking-view.tsx` and `credit-checking-result-modal.tsx`**

In `initial-credit-checking-view.tsx`: add `pgfcExposureUpload` to the
existing `const { creditChecking, cibiForm, loandexUpload, cicUpload, cmapUpload, nfisBapUpload } = review;`
destructure; add `&& !!pgfcExposureUpload.fileName` to
`allBureauReportsUploaded`'s computation; add
`setPgfcExposureUpload(sampleReport);` to `handleFillSampleData` right
after its existing `setNfisBapUpload(sampleReport);` line; add the
matching reset (`setPgfcExposureUpload({ fileName: null, fileData: null, uploadedAt: null })`,
or whatever shape `handleClearSampleData` uses for the other four
uploads — match its existing pattern exactly) to `handleClearSampleData`.

In `credit-checking-result-modal.tsx`: add `pgfcExposureUpload` to its
own `review` destructure; add the same `&& !!pgfcExposureUpload.fileName`
condition to its separate `allBureauReportsUploaded` computation.

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors anywhere in the project.

- [ ] **Step 11: Lint**

Run: `npx eslint src/auth/admin-context.tsx src/sections/admin/bureau-results-tables.tsx src/sections/admin/bureau-reports-card.tsx src/sections/admin/initial-credit-checking-view.tsx src/sections/admin/call-report/credit-checking-result-modal.tsx`
Expected: no errors.

- [ ] **Step 12: Manual verification**

Start the dev server (`npm run dev`, poll for readiness), drive a
Playwright smoke walk (same signup→apply→admin-login flow as Task 7):
navigate to Initial Credit Checking, click "Fill with Sample Data",
confirm ALL SIX bureau rows (including PGFC Existing Exposure) now show
`fileName` uploaded AND each table shows exactly one populated read-only
row (no Add/Remove buttons visible anywhere). Then clear localStorage /
start a fresh session, manually upload just the CMAP file, confirm ONLY
CMAP's table populates (one row, read-only) — the other five stay in
their empty state. Confirm zero console errors throughout. Stop the dev
server after.

- [ ] **Step 13: Commit**

Commit message: "Make bureau-results tables read-only auto-fill; give
PGFC its own upload" with body explaining the reversal (each of the six
tables now auto-populates with one realistic canned sample row on
upload, no officer data entry; PGFC Existing Exposure gets its own
upload row matching the other five bureaus), plus the standard
Co-Authored-By trailer this repo's commits use.

- [ ] **Step 14: Update docs**

Update `docs/ADMIN_INITIAL_CREDIT_CHECKING.md`'s Task 7 additions: change
"the officer can add/remove rows" language to describe the read-only
auto-fill behavior instead, and document PGFC Existing Exposure now
having its own upload gate like the other five bureaus. Commit as a
follow-up ("Update docs for read-only auto-fill and PGFC upload gate",
same Co-Authored-By trailer).
