# Call Report → NEXUS KYC & Call Validation Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully replace the Call Report form (`src/sections/admin/call-report-view.tsx` + `src/sections/admin/call-report/*`) with a new form matching the "NEXUS Customer KYC & Call Validation Report" PDF template, section by section.

**Architecture:** Full state replacement — `AdminContext.review.callReport`'s type, initial value, and array mutators are rewritten from scratch. The page's 12 old card components are deleted and replaced with 8 new ones, one per PDF section, following this codebase's existing convention: each card is its own file, imports shared option lists/helpers from `call-report-types.ts`, and reads/writes `review.callReport` via `useAdmin().setCallReport(partial)` directly (no form library anywhere in this app). The outer page shell (`ApplicationReviewHeader`, `ApplicationDetailsCard`, the Sales Reject dialog, the Proceed decision card) keeps its current structure and only has its internal field references swapped to the new state shape.

**Tech Stack:** Next.js (App Router), React, MUI (Material UI v5/v6 components — `Box`, `Stack`, `TextField`, `RadioGroup`, `Chip`, etc.), TypeScript, no form library, no test runner (this codebase has zero test files or test scripts — verification is `tsc --noEmit`, `eslint`, and manual browser checks via a Playwright driver script, same as every other task in this session).

**Spec:** `docs/superpowers/specs/2026-08-24-call-report-nexus-kyc-design.md`

## Global Constraints

- No real backend, PDF export, or e-signature anywhere — every value is client-side state persisted through the existing localStorage-backed `AdminContext`.
- `review.callReport.comakers: CiComakerEntry[]` must keep existing and keep being populated (from the new Co-maker/Guarantor "Changed Information" sub-form instead of a dedicated top-level card), because `src/sections/admin/credit-investigation/ci-report-card.tsx` reads `review.callReport.comakers` directly to pre-fill Credit Investigation's own comaker section.
- Follow the existing `setCallReport(partial)` / per-array-mutator pattern already used by `collateralEntries`/`comakers` — do not introduce a form library or new state-management pattern.
- Every enum field's `{value, label}` option list lives in `call-report-types.ts`, matching how every existing enum in that file is declared — no inline option arrays inside card components.
- Match this app's existing visual language exactly: `cardSx` (= `adminCardSx`) for every top-level card, `fieldSx` for every `TextField`, the existing `RadioRow`/`ChipToggleGroup` helper shapes for radios/multi-selects.
- `Container maxWidth="md"` on the page — do not widen it.
- No test runner exists in this repo. Every task's verification step is `npx tsc --noEmit -p .` + `npx eslint <touched files>` + (for tasks that change rendered output) a live browser check via a Playwright driver script, following the exact pattern used throughout this session: launch chromium, log in with `admin@pgfinance.com.ph` / `Admin123`, navigate, screenshot, check `console` for errors.

---

## File Structure

**Deleted** (old 12-card structure, fully superseded):
- `src/sections/admin/call-report/call-details-card.tsx`
- `src/sections/admin/call-report/loan-discussion-card.tsx`
- `src/sections/admin/call-report/residence-household-card.tsx`
- `src/sections/admin/call-report/employment-business-card.tsx`
- `src/sections/admin/call-report/organization-membership-card.tsx`
- `src/sections/admin/call-report/quick-financial-info-card.tsx`
- `src/sections/admin/call-report/payment-behavior-card.tsx`
- `src/sections/admin/call-report/officer-observation-card.tsx`
- `src/sections/admin/call-report/collateral-information-card.tsx`
- `src/sections/admin/call-report/collateral-entry-fields.tsx`
- `src/sections/admin/call-report/agreed-next-steps-card.tsx`
- `src/sections/admin/call-report/loan-package-proposal-card.tsx`
- `src/sections/admin/call-report/comaker-information-card.tsx`
- `src/sections/admin/call-report/call-report-computations.ts`

**Rewritten in place:**
- `src/auth/admin-context.tsx` — `CallReport` type, `createInitialReview()`'s `callReport` slice, `setCallReport` (signature unchanged), remove old `addCollateralEntry`/`updateCollateralEntry`/`removeCollateralEntry`/`addComakerEntry`/`updateComakerEntry`/`removeComakerEntry`, add new `addExistingLoanRow`/`updateExistingLoanRow`/`removeExistingLoanRow`/`setCallReportComakerChange`.
- `src/sections/admin/call-report/call-report-types.ts` — all new option lists; export `RadioRow` (currently unexported); keep `ChipToggleGroup`, `fieldSx`, `cardSx`, `labelFor`, `Option<T>`.
- `src/sections/admin/call-report/call-report-summary.ts` — rewritten `buildCallSummary()` against new fields.
- `src/sections/admin/call-report/call-report-risk.ts` — rewritten `buildCallReportAiRecommendation()` against new fields.
- `src/sections/admin/call-report/call-report-result-modal.tsx` — rewritten body, same `ResultField`/`NarrativeBlock`/`SectionHeading`/`FieldGrid`/`formatCurrency` helpers, same `{open, onClose}` props.
- `src/sections/admin/call-report-view.tsx` — swap card imports, rewrite `handleFillSampleData`/`handleClearSampleData`, rewrite `canProceed`.
- `docs/ADMIN_CALL_REPORT.md` — rewritten to describe the new structure.

**New files** (one per PDF section, in `src/sections/admin/call-report/`):
- `interaction-record-card.tsx`
- `application-validation-card.tsx` (contains its own internal `ValidationRow` component — not split into a separate file; the design spec's "possibly a co-located file" is resolved here as "no," since the whole card is under 400 lines even with all 9 rows' conditional detail inline, consistent with how `call-details-card.tsx` already hosts multiple exported helpers in one file)
- `aml-kyc-card.tsx`
- `customer-understanding-card.tsx`
- `proposed-loan-package-card.tsx`
- `risk-disposition-card.tsx`
- `system-validation-card.tsx`
- `endorsement-declaration-card.tsx`

**Unchanged:** `application-review-header.tsx`, `application-details-card.tsx`, `credit-checking-result-modal.tsx`, everything under `credit-investigation/` (only verified, not edited), `src/routes/paths.ts`, `src/app/admin/applications/[id]/call-report/page.tsx`, `src/layouts/admin/config-nav-admin.tsx`.

---

## Task 1: Replace `CallReport` type and initial state in `admin-context.tsx`

**Files:**
- Modify: `src/auth/admin-context.tsx` (the `CallReport` type at lines 391–530, the `callReport` initial-state block inside `createInitialReview()` at lines 1407–1505, `setCallReport`/collateral/comaker mutators at lines 1853–1953)

**Interfaces:**
- Produces: the full `CallReport` type (all fields below), `createExistingLoanRow(): ExistingLoanRow`, `createEmptyLoanTakeOutInfo(): LoanTakeOutInfo`, `createEmptyComakerChange(): CallReportComakerChange`, `setCallReport: (data: Partial<CallReport>) => void` (signature unchanged from today), `addExistingLoanRow: () => void`, `updateExistingLoanRow: (id: string, data: Partial<ExistingLoanRow>) => void`, `removeExistingLoanRow: (id: string) => void`, `setCallReportComakerChange: (data: Partial<CallReportComakerChange>) => void`.
- Consumes: `CiComakerEntry` (existing type, unchanged, still exported from this same file at line 274).

- [ ] **Step 1: Read the current `CallReport` type and note its exact line range**

Run: `grep -n "^export type CallReport = {" -A 1 "src/auth/admin-context.tsx"` and `grep -n "^};" src/auth/admin-context.tsx | awk -F: '$1 > 391' | head -1` to confirm the type's closing line (391–530 per this plan's research; re-verify since line numbers shift as you edit).

- [ ] **Step 2: Replace the enum type declarations directly above `CallReport`**

Find the block of enum `export type` declarations that currently precede `CallReport` (e.g. `ClientType`, `CallType`, `PlaceOfCall`, etc. — these are declared earlier in the file, not immediately above `CallReport`; use `grep -n "^export type CallType\b"` to locate them). Do NOT delete these old enum types yet if any other part of the file references them outside `CallReport` and its dependents — first run:

```bash
grep -rn "CallType\b\|PlaceOfCall\b\|LoanPurposeConfirmation\b\|ClientUnderstandingItem\b\|ClientConcernItem\b\|ResidenceYears\b\|ResidenceStatus\b\|YesNoPreferNot\b\|MainIncomeSource\b\|TenureRange\b\|IncomeStability\b\|IncomeTrend\b\|IncomeChange\b\|MembershipType\b\|MembershipStanding\b\|SupportingDocItem\b\|ElectricityPayment\b\|CreditCardPayment\b\|OtherLoanRepayment\b\|OfficerObservationItem\b\|CollateralOffered\b\|CollateralType\b\|DocsAvailable\b\|ExistingLien\b\|RequiresAppraisal\b\|NextStepItem\b\|ResponsibleParty\b\|InterestRateBasis\b\|ComputationType\b\|PaymentFrequency\b\|AdjustmentReason\b\|RequiredDocItem\b\|ConditionItem\b\|PreliminaryRecommendation\b" src/auth/admin-context.tsx src/sections/admin/call-report/*.tsx src/sections/admin/call-report/*.ts
```

Every hit outside `call-report-types.ts`/the old card files (which are being deleted in Task 10) and outside `admin-context.tsx` itself means that type is used elsewhere — do not delete it if so. Based on this plan's own research, `CollateralEntry` (a separate type from `CollateralType`) is confirmed unused outside `call-report`/`admin-context.tsx`; the old enum types listed above are only used by the old call-report cards, so they can all be deleted once this grep confirms no other hits.

Delete every one of those now-orphaned `export type` declarations (they live above `CallReport`, likely in a contiguous block — read `src/auth/admin-context.tsx` around line 340–391 to find the exact range before deleting).

- [ ] **Step 3: Insert the new enum types in the same place**

Insert this block where the old enum types were (same file, same general location — directly before `CallReport`):

```ts
export type InteractionType = 'in-person' | 'phone' | 'video';
export type IdentityStatus = 'confirmed' | 'for-verification' | 'unable-to-confirm';
export type IdentityBasisItem = 'app-data-matched' | 'valid-government-id' | 'verification-questions' | 'other';

export type ValidationStatus = 'confirmed' | 'changed' | 'unable-to-verify' | '';

export type LoanFacilityType = 'sme-business' | 'clean-loan' | 'sangla-titulo' | 'clubflex-direct' | 'clubflex-financing';

export type LoanPurposeType =
  | 'additional-working-capital'
  | 'new-business-venture'
  | 'loan-take-out-refinancing'
  | 'home-renovation-construction'
  | 'residential-property-acquisition'
  | 'commercial-property-acquisition'
  | 'machinery-equipment-acquisition'
  | 'club-share-acquisition'
  | 'raw-land-acquisition-development'
  | 'bridge-financing'
  | 'other';

export type WorkingCapitalUse =
  | 'inventory-stock'
  | 'raw-materials'
  | 'supplier-payments'
  | 'payroll-employee-costs'
  | 'operating-expenses'
  | 'seasonal-working-capital'
  | 'contract-project-financing'
  | 'cash-flow-support'
  | 'business-expansion'
  | 'other';

export type RepaymentSourceType =
  | 'employment-salary'
  | 'business-income'
  | 'rental-income'
  | 'remittance'
  | 'pension'
  | 'professional-fees'
  | 'commission-based'
  | 'dividend-investment-income'
  | 'other';

export type EmploymentTenureRange = 'lt-1' | '1-3' | '3-5' | 'gt-5';

export type CollateralDeclarationType =
  | 'real-estate'
  | 'club-share'
  | 'vehicle'
  | 'equipment'
  | 'inventory'
  | 'receivables'
  | 'unsecured'
  | 'corporate-guarantee'
  | 'other';

export type YesNoVerify = 'yes' | 'no' | 'for-verification';
export type PaymentHistoryDescriptor = 'on-time' | 'minor-delays' | 'major-delays' | 'for-verification';

export type UnderstandingLevel = 'fully-understood' | 'clarification-required' | 'not-yet-discussed';
export type LoanTermItem =
  | 'interest-rate'
  | 'loan-amount'
  | 'loan-term'
  | 'monthly-amortization'
  | 'processing-fees'
  | 'documentary-requirements'
  | 'collateral-requirements'
  | 'loan-release-process'
  | 'pre-termination-prepayment-policy';

export type ProposalInterestRateBasis = 'monthly' | 'annual';
export type ProposalComputationType = 'diminishing-balance' | 'add-on' | 'other';

export type RiskDriverItem = 'character' | 'capacity' | 'collateral' | 'kyc' | 'documentation' | 'information-consistency';
export type CallDispositionType =
  | 'proceed-to-next-process'
  | 'proceed-subject-to-requirements'
  | 'additional-verification'
  | 'follow-up-call'
  | 'sales-reject-decline';

export type SystemVarianceStatus = 'none' | 'noted' | '';

export type ValidationItemKey =
  | 'identityAuthorizedRep'
  | 'loanFacility'
  | 'loanPurpose'
  | 'primaryRepaymentSource'
  | 'businessEmploymentInfo'
  | 'existingLoansObligations'
  | 'residenceBusinessAddress'
  | 'collateralSecurityDeclaration'
  | 'comakerGuarantee';

export type ExistingLoanRow = {
  id: string;
  lender: string;
  loanType: string;
  outstandingBalance: string;
  monthlyPayment: string;
};

export type LoanTakeOutInfo = {
  currentLender: string;
  outstandingBalance: string;
  estimatedPayoffAmount: string;
  remainingLoanTerm: string;
  reasonForTakeOut: string;
  status: string;
};

export type CallReportComakerChange = {
  completeName: string;
  completeAddress: string;
  contactNumber: string;
  relationshipToBorrower: string;
  occupationEmployerName: string;
  yearsInEmploymentBusiness: string;
  primaryIdTypeAndNumber: string;
  secondaryIdTypeAndNumber: string;
  remarks: string;
};
```

- [ ] **Step 4: Replace the `CallReport` type body**

Replace the entire `export type CallReport = { ... }` block with:

```ts
export type CallReport = {
  approved: boolean;
  decisionReason: string;

  // 1. Interaction Record
  interactionType: InteractionType | '';
  callVisitDate: string;
  callTime: string;
  interviewedPerson: string;
  relationshipToBorrower: string;
  identityStatus: IdentityStatus | '';
  identityBasis: IdentityBasisItem[];
  identityBasisOther: string;

  // 2. Application Validation
  validation: Record<ValidationItemKey, ValidationStatus>;
  materialChangesNotes: string;

  loanFacilityChangedTo: LoanFacilityType | '';
  loanFacilityChangeReason: string;

  loanPurposeChangedTo: LoanPurposeType | '';
  loanPurposeOtherText: string;
  workingCapitalUse: WorkingCapitalUse | '';
  workingCapitalUseOtherText: string;
  loanTakeOutInfo: LoanTakeOutInfo;

  primaryRepaymentSourceChangedTo: RepaymentSourceType | '';
  repaymentSourceOtherText: string;

  employerBusinessNameChanged: string;
  employmentBusinessAddressChanged: string;
  declaredMonthlyIncomeChanged: string;
  employmentBusinessTenureChanged: EmploymentTenureRange | '';
  businessEmploymentOtherChange: string;

  existingLoanRows: ExistingLoanRow[];

  residenceBusinessAddressChangedTo: string;
  residenceBusinessAddressChangeReason: string;

  collateralDeclarationChangedTo: CollateralDeclarationType[];
  collateralDeclarationOtherText: string;

  comakerChange: CallReportComakerChange;
  comakers: CiComakerEntry[];

  // 3. AML / KYC Questions
  amlIsPep: YesNoVerify | '';
  amlIsPgfcRelatedParty: YesNoVerify | '';
  amlHasExistingLoans: YesNoVerify | '';
  amlPaymentHistory: PaymentHistoryDescriptor | '';
  amlHasReturnedChecks: YesNoVerify | '';
  amlHasPastDueObligations: YesNoVerify | '';

  // 4. Customer Understanding of Loan Terms & Requirements
  understandingLevel: UnderstandingLevel | '';
  termsUnderstood: LoanTermItem[];
  concernsClarifications: string;

  // 6. Proposed Loan Package (PDF's own section number — see source PDF)
  originalRequestedAmount: string;
  proposalInterestRate: string;
  proposalInterestRateBasis: ProposalInterestRateBasis | '';
  proposedFacilityProduct: string;
  proposalComputationType: ProposalComputationType | '';
  proposalComputationTypeOther: string;
  proposedLoanAmount: string;
  estimatedMonthlyAmortization: string;
  proposedLoanTermMonths: string;
  otherRequest: string;

  // 7. AO Preliminary Risk & Call Disposition
  primaryRiskDrivers: RiskDriverItem[];
  callDisposition: CallDispositionType | '';
  reasonKeyCondition: string;

  // 8. NEXUS System Validation / Exception Handoff
  aiSummary: string;
  aiExceptions: string;
  aiRecommendation: string;
  aoVsSystemVariance: SystemVarianceStatus;
  varianceExplanation: string;

  // Account Officer Endorsement Declaration
  accountOfficerName: string;
  accountOfficerDateTime: string;
  reviewedByHeadName: string;
  reviewedByHeadDateTime: string;
};

export function createExistingLoanRow(): ExistingLoanRow {
  return { id: crypto.randomUUID(), lender: '', loanType: '', outstandingBalance: '', monthlyPayment: '' };
}

function createEmptyLoanTakeOutInfo(): LoanTakeOutInfo {
  return {
    currentLender: '',
    outstandingBalance: '',
    estimatedPayoffAmount: '',
    remainingLoanTerm: '',
    reasonForTakeOut: '',
    status: '',
  };
}

function createEmptyComakerChange(): CallReportComakerChange {
  return {
    completeName: '',
    completeAddress: '',
    contactNumber: '',
    relationshipToBorrower: '',
    occupationEmployerName: '',
    yearsInEmploymentBusiness: '',
    primaryIdTypeAndNumber: '',
    secondaryIdTypeAndNumber: '',
    remarks: '',
  };
}

function createEmptyValidation(): Record<ValidationItemKey, ValidationStatus> {
  return {
    identityAuthorizedRep: '',
    loanFacility: '',
    loanPurpose: '',
    primaryRepaymentSource: '',
    businessEmploymentInfo: '',
    existingLoansObligations: '',
    residenceBusinessAddress: '',
    collateralSecurityDeclaration: '',
    comakerGuarantee: '',
  };
}
```

Place the three `create...` factory functions immediately after the `CallReport` type, matching where `createAppraisalReportLandTitle()` sits relative to `AppraisalReportLandTitle` in this same file (search `function createAppraisalReportLandTitle` to see the convention).

- [ ] **Step 5: Replace the `callReport` initial-state block inside `createInitialReview()`**

Find the `callReport: { ... }` object inside `createInitialReview()` (currently lines 1407–1505) and replace it with:

```ts
    callReport: {
      approved: false,
      decisionReason: '',

      interactionType: '',
      callVisitDate: '',
      callTime: '',
      interviewedPerson: '',
      relationshipToBorrower: '',
      identityStatus: '',
      identityBasis: [],
      identityBasisOther: '',

      validation: createEmptyValidation(),
      materialChangesNotes: '',

      loanFacilityChangedTo: '',
      loanFacilityChangeReason: '',

      loanPurposeChangedTo: '',
      loanPurposeOtherText: '',
      workingCapitalUse: '',
      workingCapitalUseOtherText: '',
      loanTakeOutInfo: createEmptyLoanTakeOutInfo(),

      primaryRepaymentSourceChangedTo: '',
      repaymentSourceOtherText: '',

      employerBusinessNameChanged: '',
      employmentBusinessAddressChanged: '',
      declaredMonthlyIncomeChanged: '',
      employmentBusinessTenureChanged: '',
      businessEmploymentOtherChange: '',

      existingLoanRows: [],

      residenceBusinessAddressChangedTo: '',
      residenceBusinessAddressChangeReason: '',

      collateralDeclarationChangedTo: [],
      collateralDeclarationOtherText: '',

      comakerChange: createEmptyComakerChange(),
      comakers: [],

      amlIsPep: '',
      amlIsPgfcRelatedParty: '',
      amlHasExistingLoans: '',
      amlPaymentHistory: '',
      amlHasReturnedChecks: '',
      amlHasPastDueObligations: '',

      understandingLevel: '',
      termsUnderstood: [],
      concernsClarifications: '',

      originalRequestedAmount: '',
      proposalInterestRate: '',
      proposalInterestRateBasis: '',
      proposedFacilityProduct: '',
      proposalComputationType: '',
      proposalComputationTypeOther: '',
      proposedLoanAmount: '',
      estimatedMonthlyAmortization: '',
      proposedLoanTermMonths: '',
      otherRequest: '',

      primaryRiskDrivers: [],
      callDisposition: '',
      reasonKeyCondition: '',

      aiSummary: '',
      aiExceptions: '',
      aiRecommendation: '',
      aoVsSystemVariance: '',
      varianceExplanation: '',

      accountOfficerName: '',
      accountOfficerDateTime: '',
      reviewedByHeadName: '',
      reviewedByHeadDateTime: '',
    },
```

- [ ] **Step 6: Replace the collateral/comaker array mutators with the new `existingLoanRows`/`comakerChange` mutators**

Find the `AdminContextValue` interface declarations for `addCollateralEntry`/`updateCollateralEntry`/`removeCollateralEntry`/`addComakerEntry`/`updateComakerEntry`/`removeComakerEntry` (around line 1001–1006) and replace with:

```ts
  addExistingLoanRow: () => void;
  updateExistingLoanRow: (id: string, data: Partial<ExistingLoanRow>) => void;
  removeExistingLoanRow: (id: string) => void;
  setCallReportComakerChange: (data: Partial<CallReportComakerChange>) => void;
```

Find the implementations (around lines 1858–1953, `addCollateralEntry: () => ...` through `removeComakerEntry: (id) => ...`) and replace the whole block with:

```ts
      addExistingLoanRow: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              existingLoanRows: [...prev.review.callReport.existingLoanRows, createExistingLoanRow()],
            },
          },
        })),
      updateExistingLoanRow: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              existingLoanRows: prev.review.callReport.existingLoanRows.map((row) =>
                row.id === id ? { ...row, ...data } : row
              ),
            },
          },
        })),
      removeExistingLoanRow: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              existingLoanRows: prev.review.callReport.existingLoanRows.filter((row) => row.id !== id),
            },
          },
        })),
      setCallReportComakerChange: (data) =>
        setState((prev) => {
          const nextChange = { ...prev.review.callReport.comakerChange, ...data };
          // Keep the CiComakerEntry array CI's own pre-fill reads in sync —
          // one entry once a name exists, none before that. Only the fields
          // that have a direct PDF equivalent are mapped; monthlyIncome has
          // no equivalent in the new Co-maker/Guarantor block and stays ''.
          const nextComakers = nextChange.completeName.trim()
            ? [
                {
                  id: prev.review.callReport.comakers[0]?.id ?? crypto.randomUUID(),
                  name: nextChange.completeName,
                  relationshipToBorrower: nextChange.relationshipToBorrower,
                  address: nextChange.completeAddress,
                  contactNumber: nextChange.contactNumber,
                  occupation: nextChange.occupationEmployerName,
                  monthlyIncome: prev.review.callReport.comakers[0]?.monthlyIncome ?? '',
                },
              ]
            : [];
          return {
            ...prev,
            review: {
              ...prev.review,
              callReport: {
                ...prev.review.callReport,
                comakerChange: nextChange,
                comakers: nextComakers,
              },
            },
          };
        }),
```

Note `setCallReport` itself (the plain `Partial<CallReport>` merge setter) needs no change — verify it still reads exactly:

```ts
      setCallReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, callReport: { ...prev.review.callReport, ...data } },
        })),
```

- [ ] **Step 7: Verify the file typechecks in isolation**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -c "call-report\|admin-context"`

Expected: a non-zero number of errors, ALL of them originating from `src/sections/admin/call-report/*` and `src/sections/admin/call-report-view.tsx` and `src/sections/admin/credit-investigation/ci-report-card.tsx` (files not yet updated to match the new type) — the `admin-context.tsx` file itself should show zero errors. Run `npx tsc --noEmit -p . 2>&1 | grep "admin-context.tsx"` on its own and confirm it is empty.

- [ ] **Step 8: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx
git commit -m "$(cat <<'EOF'
Replace CallReport state shape with NEXUS KYC template fields

Full replacement of the 97-field CallReport type and its collateral/
comaker array mutators, matching the new NEXUS Customer KYC & Call
Validation Report structure. Downstream card components are updated
in following commits — this commit alone leaves call-report/*.tsx and
call-report-view.tsx failing to typecheck against the old shape,
expected until those files are rewritten.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Rewrite `call-report-types.ts` with new option lists

**Files:**
- Modify: `src/sections/admin/call-report/call-report-types.ts` (full rewrite of its content, same file)

**Interfaces:**
- Consumes: every enum type from Task 1 (`InteractionType`, `IdentityStatus`, `IdentityBasisItem`, `LoanFacilityType`, `LoanPurposeType`, `WorkingCapitalUse`, `RepaymentSourceType`, `EmploymentTenureRange`, `CollateralDeclarationType`, `YesNoVerify`, `PaymentHistoryDescriptor`, `UnderstandingLevel`, `LoanTermItem`, `ProposalInterestRateBasis`, `ProposalComputationType`, `RiskDriverItem`, `CallDispositionType`).
- Produces: `RadioRow` (now exported), `ChipToggleGroup` (already exported, unchanged), `fieldSx`, `cardSx`, `labelFor`, `Option<T>` (all unchanged), plus one `Option<T>[]` constant per new enum: `INTERACTION_TYPE_OPTIONS`, `IDENTITY_STATUS_OPTIONS`, `IDENTITY_BASIS_OPTIONS`, `LOAN_FACILITY_OPTIONS`, `LOAN_PURPOSE_OPTIONS`, `WORKING_CAPITAL_USE_OPTIONS`, `REPAYMENT_SOURCE_TYPE_OPTIONS`, `EMPLOYMENT_TENURE_RANGE_OPTIONS`, `COLLATERAL_DECLARATION_OPTIONS`, `YES_NO_VERIFY_OPTIONS` (kept, same values as before), `PAYMENT_HISTORY_DESCRIPTOR_OPTIONS`, `UNDERSTANDING_LEVEL_OPTIONS`, `LOAN_TERM_ITEM_OPTIONS`, `PROPOSAL_INTEREST_RATE_BASIS_OPTIONS`, `PROPOSAL_COMPUTATION_TYPE_OPTIONS`, `RISK_DRIVER_OPTIONS`, `CALL_DISPOSITION_OPTIONS`.

- [ ] **Step 1: Write the new file content**

Replace the entire content of `src/sections/admin/call-report/call-report-types.ts` with:

```ts
import type {
  InteractionType,
  IdentityStatus,
  IdentityBasisItem,
  LoanFacilityType,
  LoanPurposeType,
  WorkingCapitalUse,
  RepaymentSourceType,
  EmploymentTenureRange,
  CollateralDeclarationType,
  YesNoVerify,
  PaymentHistoryDescriptor,
  UnderstandingLevel,
  LoanTermItem,
  ProposalInterestRateBasis,
  ProposalComputationType,
  RiskDriverItem,
  CallDispositionType,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Every enum field in the NEXUS-KYC CallReport shape has its {value,label}
// option list here, so every card component imports labels from one place
// instead of repeating display strings inline. Rewritten from scratch to
// match the new PDF template's own field set — see
// docs/superpowers/specs/2026-08-24-call-report-nexus-kyc-design.md.
// ----------------------------------------------------------------------

export type Option<T extends string> = { value: T; label: string };

export const INTERACTION_TYPE_OPTIONS: Option<InteractionType>[] = [
  { value: 'in-person', label: 'In Person' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'video', label: 'Video Call' },
];

export const IDENTITY_STATUS_OPTIONS: Option<IdentityStatus>[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'for-verification', label: 'For Verification' },
  { value: 'unable-to-confirm', label: 'Unable to Confirm' },
];

export const IDENTITY_BASIS_OPTIONS: Option<IdentityBasisItem>[] = [
  { value: 'app-data-matched', label: 'Application Data Matched' },
  { value: 'valid-government-id', label: 'Valid Government ID' },
  { value: 'verification-questions', label: 'Verification Questions' },
  { value: 'other', label: 'Other' },
];

export const LOAN_FACILITY_OPTIONS: Option<LoanFacilityType>[] = [
  { value: 'sme-business', label: 'SME/Business Loan' },
  { value: 'clean-loan', label: 'Clean Loan' },
  { value: 'sangla-titulo', label: 'Sangla Titulo' },
  { value: 'clubflex-direct', label: 'Clubflex Direct Loan' },
  { value: 'clubflex-financing', label: 'Clubflex Financing' },
];

export const LOAN_PURPOSE_OPTIONS: Option<LoanPurposeType>[] = [
  { value: 'additional-working-capital', label: 'Additional Working Capital' },
  { value: 'new-business-venture', label: 'New Business Venture' },
  { value: 'loan-take-out-refinancing', label: 'Loan Take-out / Refinancing' },
  { value: 'home-renovation-construction', label: 'Home Renovation / Construction' },
  { value: 'residential-property-acquisition', label: 'Residential Property Acquisition' },
  { value: 'commercial-property-acquisition', label: 'Commercial Property Acquisition' },
  { value: 'machinery-equipment-acquisition', label: 'Machinery / Equipment Acquisition' },
  { value: 'club-share-acquisition', label: 'Club Share Acquisition' },
  { value: 'raw-land-acquisition-development', label: 'Raw Land Acquisition / Development' },
  { value: 'bridge-financing', label: 'Bridge Financing' },
  { value: 'other', label: 'Other' },
];

export const WORKING_CAPITAL_USE_OPTIONS: Option<WorkingCapitalUse>[] = [
  { value: 'inventory-stock', label: 'Inventory / Stock Replenishment' },
  { value: 'raw-materials', label: 'Raw Materials' },
  { value: 'supplier-payments', label: 'Supplier Payments' },
  { value: 'payroll-employee-costs', label: 'Payroll / Employee Costs' },
  { value: 'operating-expenses', label: 'Operating Expenses' },
  { value: 'seasonal-working-capital', label: 'Seasonal Working Capital' },
  { value: 'contract-project-financing', label: 'Contract / Project Financing' },
  { value: 'cash-flow-support', label: 'Cash Flow Support' },
  { value: 'business-expansion', label: 'Business Expansion' },
  { value: 'other', label: 'Other' },
];

export const REPAYMENT_SOURCE_TYPE_OPTIONS: Option<RepaymentSourceType>[] = [
  { value: 'employment-salary', label: 'Employment / Salary' },
  { value: 'business-income', label: 'Business Income' },
  { value: 'rental-income', label: 'Rental Income' },
  { value: 'remittance', label: 'Remittance' },
  { value: 'pension', label: 'Pension' },
  { value: 'professional-fees', label: 'Professional Fees' },
  { value: 'commission-based', label: 'Commission-Based' },
  { value: 'dividend-investment-income', label: 'Dividend / Investment Income' },
  { value: 'other', label: 'Other' },
];

export const EMPLOYMENT_TENURE_RANGE_OPTIONS: Option<EmploymentTenureRange>[] = [
  { value: 'lt-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-5', label: '3–5 years' },
  { value: 'gt-5', label: 'More than 5 years' },
];

export const COLLATERAL_DECLARATION_OPTIONS: Option<CollateralDeclarationType>[] = [
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'club-share', label: 'Club Share' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'receivables', label: 'Receivables' },
  { value: 'unsecured', label: 'Unsecured' },
  { value: 'corporate-guarantee', label: 'Corporate Guarantee' },
  { value: 'other', label: 'Other' },
];

export const YES_NO_VERIFY_OPTIONS: Option<YesNoVerify>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'for-verification', label: 'For Verification' },
];

export const PAYMENT_HISTORY_DESCRIPTOR_OPTIONS: Option<PaymentHistoryDescriptor>[] = [
  { value: 'on-time', label: 'On Time' },
  { value: 'minor-delays', label: 'With Minor Delays' },
  { value: 'major-delays', label: 'With Major Delays' },
  { value: 'for-verification', label: 'For Verification' },
];

export const UNDERSTANDING_LEVEL_OPTIONS: Option<UnderstandingLevel>[] = [
  { value: 'fully-understood', label: 'Fully Understood' },
  { value: 'clarification-required', label: 'Clarification Required' },
  { value: 'not-yet-discussed', label: 'Not Yet Discussed' },
];

export const LOAN_TERM_ITEM_OPTIONS: Option<LoanTermItem>[] = [
  { value: 'interest-rate', label: 'Interest Rate' },
  { value: 'loan-amount', label: 'Loan Amount' },
  { value: 'loan-term', label: 'Loan Term' },
  { value: 'monthly-amortization', label: 'Monthly Amortization' },
  { value: 'processing-fees', label: 'Processing Fees' },
  { value: 'documentary-requirements', label: 'Documentary Requirements' },
  { value: 'collateral-requirements', label: 'Collateral Requirements' },
  { value: 'loan-release-process', label: 'Loan Release Process' },
  { value: 'pre-termination-prepayment-policy', label: 'Pre-termination / Prepayment Policy' },
];

export const PROPOSAL_INTEREST_RATE_BASIS_OPTIONS: Option<ProposalInterestRateBasis>[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export const PROPOSAL_COMPUTATION_TYPE_OPTIONS: Option<ProposalComputationType>[] = [
  { value: 'diminishing-balance', label: 'Diminishing Balance' },
  { value: 'add-on', label: 'Add-on' },
  { value: 'other', label: 'Other' },
];

export const RISK_DRIVER_OPTIONS: Option<RiskDriverItem>[] = [
  { value: 'character', label: 'Character' },
  { value: 'capacity', label: 'Capacity' },
  { value: 'collateral', label: 'Collateral' },
  { value: 'kyc', label: 'KYC' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'information-consistency', label: 'Information Consistency' },
];

export const CALL_DISPOSITION_OPTIONS: Option<CallDispositionType>[] = [
  { value: 'proceed-to-next-process', label: 'Proceed to Next Process' },
  { value: 'proceed-subject-to-requirements', label: 'Proceed Subject to Requirements' },
  { value: 'additional-verification', label: 'Additional Verification' },
  { value: 'follow-up-call', label: 'Follow-up Call' },
  { value: 'sales-reject-decline', label: 'Sales Reject/Decline' },
];

// Shared MUI sx used by every text/select field across all Call Report cards.
export const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
};

// Shared card container sx, matching this app's standard rounded white card.
export { adminCardSx as cardSx } from 'src/components/admin-ui';

export function labelFor<T extends string>(options: Option<T>[], value: T | ''): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}
```

- [ ] **Step 2: Move `RadioRow` and `ChipToggleGroup` into this file, exporting both**

`RadioRow` currently lives unexported inside `call-details-card.tsx` (a file being deleted in Task 10) and `ChipToggleGroup` is already exported from the same file. Since `call-details-card.tsx` is deleted before the new cards need these helpers, move both function definitions into `call-report-types.ts` now, appended after `labelFor`:

```ts
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

export function RadioRow<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T | '';
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <FormControl disabled={disabled}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
        {label}
      </Typography>
      <RadioGroup row value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: 13.5 }}>{option.label}</Typography>}
            disabled={disabled}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

export function ChipToggleGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Chip
            key={option.value}
            label={option.label}
            onClick={() => onToggle(option.value)}
            variant={isSelected ? 'filled' : 'outlined'}
            sx={{
              borderRadius: '8px',
              fontSize: 13,
              bgcolor: isSelected ? '#1C2A6E' : 'transparent',
              color: isSelected ? 'common.white' : '#3B4256',
              borderColor: '#D2D6E0',
              '&:hover': { bgcolor: isSelected ? '#14205A' : '#F5F7FE' },
            }}
          />
        );
      })}
    </Stack>
  );
}
```

Add the `Box` import too even though this file's other exports don't need it directly — omit it if unused (check with lint in Step 3; MUI's `Box` is not actually referenced by `RadioRow`/`ChipToggleGroup` above, so do NOT import it — only import `Chip`, `Stack`, `Typography`, `FormControl`, `RadioGroup`, `FormControlLabel`, `Radio`).

- [ ] **Step 3: Verify typecheck and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep "call-report-types.ts"`
Expected: empty output (no errors in this file itself; errors in other not-yet-updated files are expected and checked separately).

Run: `npx eslint src/sections/admin/call-report/call-report-types.ts 2>&1`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/call-report-types.ts
git commit -m "$(cat <<'EOF'
Rewrite call-report-types.ts option lists for NEXUS KYC fields

New {value,label} option lists for every enum in the rebuilt
CallReport shape. RadioRow and ChipToggleGroup move here from the
old call-details-card.tsx (being deleted) and RadioRow is now
exported, since multiple new cards need it directly.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `interaction-record-card.tsx` (PDF section 1)

**Files:**
- Create: `src/sections/admin/call-report/interaction-record-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` → `review.callReport`, `setCallReport`; `useRegistration()` → `signUpData`; `getLoanNumber` from `src/utils/get-loan-number`; `cardSx`, `fieldSx`, `RadioRow`, `ChipToggleGroup`, `INTERACTION_TYPE_OPTIONS`, `IDENTITY_STATUS_OPTIONS`, `IDENTITY_BASIS_OPTIONS` from `./call-report-types`.
- Produces: `InteractionRecordCard` (exported component, no props — reads/writes context directly, same convention every other call-report card uses).

- [ ] **Step 1: Write the component**

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { getLoanNumber } from 'src/utils/get-loan-number';

import {
  cardSx,
  fieldSx,
  RadioRow,
  ChipToggleGroup,
  INTERACTION_TYPE_OPTIONS,
  IDENTITY_STATUS_OPTIONS,
  IDENTITY_BASIS_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 1: Interaction Record. Application No./Customer Name are
// NEXUS "auto-populate" fields per the PDF's own system rule — shown
// read-only from signUpData/getLoanNumber, not officer-entered, matching
// how ApplicationDetailsCard already surfaces this same data elsewhere.
// ----------------------------------------------------------------------

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6', mb: 0.4 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Box>
  );
}

export function InteractionRecordCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;
  const { signUpData } = useRegistration();

  const applicationNo = signUpData ? getLoanNumber(signUpData.email) : '';
  const customerName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  const toggleIdentityBasis = (value: (typeof IDENTITY_BASIS_OPTIONS)[number]['value']) => {
    const next = callReport.identityBasis.includes(value)
      ? callReport.identityBasis.filter((entry) => entry !== value)
      : [...callReport.identityBasis, value];
    setCallReport({ identityBasis: next });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        1. Interaction Record
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Basic details about this call or visit.
      </Typography>

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <ReadOnlyField label="Application No." value={applicationNo} />
          <ReadOnlyField label="Customer Name" value={customerName} />
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField
            label="Call / Visit Date"
            type="date"
            value={callReport.callVisitDate}
            onChange={(event) => setCallReport({ callVisitDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Time"
            type="time"
            value={callReport.callTime}
            onChange={(event) => setCallReport({ callTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField
            label="Interviewed Person"
            value={callReport.interviewedPerson}
            onChange={(event) => setCallReport({ interviewedPerson: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Relationship to Borrower"
            value={callReport.relationshipToBorrower}
            onChange={(event) => setCallReport({ relationshipToBorrower: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <RadioRow
          label="Interaction Type"
          value={callReport.interactionType}
          options={INTERACTION_TYPE_OPTIONS}
          onChange={(value) => setCallReport({ interactionType: value })}
        />

        <RadioRow
          label="Identity Status"
          value={callReport.identityStatus}
          options={IDENTITY_STATUS_OPTIONS}
          onChange={(value) => setCallReport({ identityStatus: value })}
        />

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
            Basis of Identity Confirmation
          </Typography>
          <ChipToggleGroup
            options={IDENTITY_BASIS_OPTIONS}
            selected={callReport.identityBasis}
            onToggle={toggleIdentityBasis}
          />
          {callReport.identityBasis.includes('other') && (
            <TextField
              fullWidth
              label="Other"
              value={callReport.identityBasisOther}
              onChange={(event) => setCallReport({ identityBasisOther: event.target.value })}
              sx={{ ...fieldSx, mt: 1.5 }}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep "interaction-record-card.tsx"`
Expected: empty.

Run: `npx eslint src/sections/admin/call-report/interaction-record-card.tsx`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/sections/admin/call-report/interaction-record-card.tsx
git commit -m "$(cat <<'EOF'
Add InteractionRecordCard (NEXUS KYC PDF section 1)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `application-validation-card.tsx` (PDF section 2) — the core new component

**Files:**
- Create: `src/sections/admin/call-report/application-validation-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` → `review.callReport`, `setCallReport`, `addExistingLoanRow`, `updateExistingLoanRow`, `removeExistingLoanRow`, `setCallReportComakerChange`; `useRegistration()` → `application`; all validation-related option lists from `./call-report-types`; `ValidationItemKey`, `ValidationStatus` types from `src/auth/admin-context`.
- Produces: `ApplicationValidationCard` (exported component, no props).

This is the largest and most novel card. Build it in three steps within this one task so each piece can be checked before moving on.

- [ ] **Step 1: Write the row shell and the 9-row table (status buttons only, no "Changed" detail yet)**

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { ValidationItemKey, ValidationStatus } from 'src/auth/admin-context';

import {
  cardSx,
  fieldSx,
  RadioRow,
  ChipToggleGroup,
  LOAN_FACILITY_OPTIONS,
  LOAN_PURPOSE_OPTIONS,
  WORKING_CAPITAL_USE_OPTIONS,
  REPAYMENT_SOURCE_TYPE_OPTIONS,
  EMPLOYMENT_TENURE_RANGE_OPTIONS,
  COLLATERAL_DECLARATION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 2: Application Validation. One ValidationRow per fixed line
// item (9 total, per the PDF's own — inconsistently numbered — table).
// Each row shows the current application data read-only, a three-way
// status control, and — only when marked "Changed" — that row's own
// "Changed Information" detail panel inline beneath it. No literal MUI
// Table is used: several rows (Loan Purpose especially) have 2-3 levels
// of nested conditional fields that don't fit table cells, and no other
// page in this app nests expandable form content inside a table row.
// ----------------------------------------------------------------------

const STATUS_BUTTONS: { value: ValidationStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'changed', label: 'Changed' },
  { value: 'unable-to-verify', label: 'Unable to Verify' },
];

function StatusControl({
  value,
  onChange,
}: {
  value: ValidationStatus;
  onChange: (value: ValidationStatus) => void;
}) {
  return (
    <ButtonGroup size="small" sx={{ flexShrink: 0 }}>
      {STATUS_BUTTONS.map((option) => (
        <Button
          key={option.value}
          onClick={() => onChange(option.value)}
          variant={value === option.value ? 'contained' : 'outlined'}
          sx={
            value === option.value
              ? { bgcolor: '#1C2A6E', borderColor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } }
              : { color: '#5A6273', borderColor: '#D2D6E0' }
          }
        >
          {option.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function ValidationRow({
  label,
  currentValue,
  status,
  onStatusChange,
  children,
}: {
  label: string;
  currentValue: string;
  status: ValidationStatus;
  onStatusChange: (value: ValidationStatus) => void;
  children?: React.ReactNode;
}) {
  return (
    <Box sx={{ py: 1.5, borderBottom: '1px solid #EEF0F5' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{label}</Typography>
          {currentValue && (
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }} noWrap title={currentValue}>
              {currentValue}
            </Typography>
          )}
        </Box>
        <StatusControl value={status} onChange={onStatusChange} />
      </Stack>
      {status === 'changed' && children && (
        <Box sx={{ mt: 1.5, p: 1.75, borderRadius: '10px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

export function ApplicationValidationCard() {
  const { review, setCallReport, addExistingLoanRow, updateExistingLoanRow, removeExistingLoanRow, setCallReportComakerChange } =
    useAdmin();
  const { callReport } = review;
  const { application } = useRegistration();

  const setStatus = (key: ValidationItemKey, value: ValidationStatus) =>
    setCallReport({ validation: { ...callReport.validation, [key]: value } });

  const currentIdentity = application.personalInfo
    ? `${application.personalInfo.firstName} ${application.personalInfo.lastName}`
    : '';
  const currentLoanFacility = application.financialInfo?.loanPurpose ?? '';
  const currentLoanPurpose = application.financialInfo?.loanPurpose ?? '';
  const currentRepaymentSource = '';
  const currentBusinessEmployment = application.personalInfo?.occupation ?? '';
  const currentResidenceAddress = application.personalInfo
    ? [application.personalInfo.address, application.personalInfo.city].filter(Boolean).join(', ')
    : '';

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        2. Application Validation — Confirm, Change or Verify
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Validate only relevant information discussed during the call.
      </Typography>

      <Stack>
        <ValidationRow
          label="1. Identity / Authorized Representative"
          currentValue={currentIdentity}
          status={callReport.validation.identityAuthorizedRep}
          onStatusChange={(value) => setStatus('identityAuthorizedRep', value)}
        />

        <ValidationRow
          label="2. Loan Facility"
          currentValue={currentLoanFacility}
          status={callReport.validation.loanFacility}
          onStatusChange={(value) => setStatus('loanFacility', value)}
        >
          <Stack spacing={1.5}>
            <RadioRow
              label="Loan Facility — Changed To"
              value={callReport.loanFacilityChangedTo}
              options={LOAN_FACILITY_OPTIONS}
              onChange={(value) => setCallReport({ loanFacilityChangedTo: value })}
            />
            <TextField
              fullWidth
              label="Reason for Change"
              value={callReport.loanFacilityChangeReason}
              onChange={(event) => setCallReport({ loanFacilityChangeReason: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="3. Loan Purpose"
          currentValue={currentLoanPurpose}
          status={callReport.validation.loanPurpose}
          onStatusChange={(value) => setStatus('loanPurpose', value)}
        >
          <Stack spacing={1.5}>
            <RadioRow
              label="Purpose of Loan — Changed To"
              value={callReport.loanPurposeChangedTo}
              options={LOAN_PURPOSE_OPTIONS}
              onChange={(value) => setCallReport({ loanPurposeChangedTo: value })}
            />
            {callReport.loanPurposeChangedTo === 'other' && (
              <TextField
                fullWidth
                label="Other"
                value={callReport.loanPurposeOtherText}
                onChange={(event) => setCallReport({ loanPurposeOtherText: event.target.value })}
                sx={fieldSx}
              />
            )}
            {callReport.loanPurposeChangedTo === 'additional-working-capital' && (
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
                  Specific Use
                </Typography>
                <RadioRow
                  label=""
                  value={callReport.workingCapitalUse}
                  options={WORKING_CAPITAL_USE_OPTIONS}
                  onChange={(value) => setCallReport({ workingCapitalUse: value })}
                />
                {callReport.workingCapitalUse === 'other' && (
                  <TextField
                    fullWidth
                    label="Other"
                    value={callReport.workingCapitalUseOtherText}
                    onChange={(event) => setCallReport({ workingCapitalUseOtherText: event.target.value })}
                    sx={{ ...fieldSx, mt: 1 }}
                  />
                )}
              </Box>
            )}
            {callReport.loanPurposeChangedTo === 'loan-take-out-refinancing' && (
              <Stack spacing={1.5}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                  Loan Take-out Information
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Current Lender"
                    value={callReport.loanTakeOutInfo.currentLender}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, currentLender: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label="Outstanding Balance"
                    value={callReport.loanTakeOutInfo.outstandingBalance}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, outstandingBalance: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Estimated Payoff Amount"
                    value={callReport.loanTakeOutInfo.estimatedPayoffAmount}
                    onChange={(event) =>
                      setCallReport({
                        loanTakeOutInfo: { ...callReport.loanTakeOutInfo, estimatedPayoffAmount: event.target.value },
                      })
                    }
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label="Remaining Loan Term"
                    value={callReport.loanTakeOutInfo.remainingLoanTerm}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, remainingLoanTerm: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Reason for Take-Out"
                    value={callReport.loanTakeOutInfo.reasonForTakeOut}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, reasonForTakeOut: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    label="Status"
                    value={callReport.loanTakeOutInfo.status}
                    onChange={(event) =>
                      setCallReport({ loanTakeOutInfo: { ...callReport.loanTakeOutInfo, status: event.target.value } })
                    }
                    sx={fieldSx}
                  />
                </Stack>
              </Stack>
            )}
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="4. Primary Source of Repayment"
          currentValue={currentRepaymentSource}
          status={callReport.validation.primaryRepaymentSource}
          onStatusChange={(value) => setStatus('primaryRepaymentSource', value)}
        >
          <Stack spacing={1.5}>
            <RadioRow
              label="Primary Source of Repayment — Changed To"
              value={callReport.primaryRepaymentSourceChangedTo}
              options={REPAYMENT_SOURCE_TYPE_OPTIONS}
              onChange={(value) => setCallReport({ primaryRepaymentSourceChangedTo: value })}
            />
            {callReport.primaryRepaymentSourceChangedTo === 'other' && (
              <TextField
                fullWidth
                label="Other"
                value={callReport.repaymentSourceOtherText}
                onChange={(event) => setCallReport({ repaymentSourceOtherText: event.target.value })}
                sx={fieldSx}
              />
            )}
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="5. Business / Employment Information"
          currentValue={currentBusinessEmployment}
          status={callReport.validation.businessEmploymentInfo}
          onStatusChange={(value) => setStatus('businessEmploymentInfo', value)}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Employer / Business Name"
                value={callReport.employerBusinessNameChanged}
                onChange={(event) => setCallReport({ employerBusinessNameChanged: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Employment / Business Address"
                value={callReport.employmentBusinessAddressChanged}
                onChange={(event) => setCallReport({ employmentBusinessAddressChanged: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <TextField
              fullWidth
              label="Declared Monthly Income"
              value={callReport.declaredMonthlyIncomeChanged}
              onChange={(event) => setCallReport({ declaredMonthlyIncomeChanged: event.target.value })}
              sx={fieldSx}
            />
            <RadioRow
              label="Employment / Business Tenure"
              value={callReport.employmentBusinessTenureChanged}
              options={EMPLOYMENT_TENURE_RANGE_OPTIONS}
              onChange={(value) => setCallReport({ employmentBusinessTenureChanged: value })}
            />
            <TextField
              fullWidth
              label="Other Change"
              value={callReport.businessEmploymentOtherChange}
              onChange={(event) => setCallReport({ businessEmploymentOtherChange: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="6. Existing Loans / Material Obligations"
          currentValue=""
          status={callReport.validation.existingLoansObligations}
          onStatusChange={(value) => setStatus('existingLoansObligations', value)}
        >
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
              Existing Loans with Banks / Financing Companies
            </Typography>
            {callReport.existingLoanRows.map((row) => (
              <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Lender"
                  value={row.lender}
                  onChange={(event) => updateExistingLoanRow(row.id, { lender: event.target.value })}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Loan Type"
                  value={row.loanType}
                  onChange={(event) => updateExistingLoanRow(row.id, { loanType: event.target.value })}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Outstanding Balance"
                  value={row.outstandingBalance}
                  onChange={(event) => updateExistingLoanRow(row.id, { outstandingBalance: event.target.value })}
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Monthly Payment"
                  value={row.monthlyPayment}
                  onChange={(event) => updateExistingLoanRow(row.id, { monthlyPayment: event.target.value })}
                  sx={fieldSx}
                />
                <Button onClick={() => removeExistingLoanRow(row.id)} color="error" size="small" sx={{ flexShrink: 0 }}>
                  Remove
                </Button>
              </Stack>
            ))}
            <Button onClick={addExistingLoanRow} variant="outlined" size="small" sx={{ alignSelf: 'flex-start', borderRadius: '8px' }}>
              + Add Existing Loan
            </Button>
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="7. Residence / Business Address"
          currentValue={currentResidenceAddress}
          status={callReport.validation.residenceBusinessAddress}
          onStatusChange={(value) => setStatus('residenceBusinessAddress', value)}
        >
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              label="Changed Residence / Business Address To"
              value={callReport.residenceBusinessAddressChangedTo}
              onChange={(event) => setCallReport({ residenceBusinessAddressChangedTo: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Reason"
              value={callReport.residenceBusinessAddressChangeReason}
              onChange={(event) => setCallReport({ residenceBusinessAddressChangeReason: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="8. Collateral / Security Declaration"
          currentValue=""
          status={callReport.validation.collateralSecurityDeclaration}
          onStatusChange={(value) => setStatus('collateralSecurityDeclaration', value)}
        >
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
              Collateral / Security Declaration — Changed To
            </Typography>
            <ChipToggleGroup
              options={COLLATERAL_DECLARATION_OPTIONS}
              selected={callReport.collateralDeclarationChangedTo}
              onToggle={(value) => {
                const next = callReport.collateralDeclarationChangedTo.includes(value)
                  ? callReport.collateralDeclarationChangedTo.filter((entry) => entry !== value)
                  : [...callReport.collateralDeclarationChangedTo, value];
                setCallReport({ collateralDeclarationChangedTo: next });
              }}
            />
            {callReport.collateralDeclarationChangedTo.includes('other') && (
              <TextField
                fullWidth
                label="Other"
                value={callReport.collateralDeclarationOtherText}
                onChange={(event) => setCallReport({ collateralDeclarationOtherText: event.target.value })}
                sx={fieldSx}
              />
            )}
          </Stack>
        </ValidationRow>

        <ValidationRow
          label="9. Co-maker/Guarantee"
          currentValue={callReport.comakers[0]?.name ?? ''}
          status={callReport.validation.comakerGuarantee}
          onStatusChange={(value) => setStatus('comakerGuarantee', value)}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Co-maker Complete Name"
                value={callReport.comakerChange.completeName}
                onChange={(event) => setCallReportComakerChange({ completeName: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Co-maker Complete Address"
                value={callReport.comakerChange.completeAddress}
                onChange={(event) => setCallReportComakerChange({ completeAddress: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Co-maker Contact Number"
                value={callReport.comakerChange.contactNumber}
                onChange={(event) => setCallReportComakerChange({ contactNumber: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Relationship to Client/Borrower"
                value={callReport.comakerChange.relationshipToBorrower}
                onChange={(event) => setCallReportComakerChange({ relationshipToBorrower: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Occupation: Employer / Business Name"
                value={callReport.comakerChange.occupationEmployerName}
                onChange={(event) => setCallReportComakerChange({ occupationEmployerName: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Years in Employment / Business"
                value={callReport.comakerChange.yearsInEmploymentBusiness}
                onChange={(event) => setCallReportComakerChange({ yearsInEmploymentBusiness: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Primary ID – Type & ID No."
                value={callReport.comakerChange.primaryIdTypeAndNumber}
                onChange={(event) => setCallReportComakerChange({ primaryIdTypeAndNumber: event.target.value })}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Secondary ID – Type & ID No."
                value={callReport.comakerChange.secondaryIdTypeAndNumber}
                onChange={(event) => setCallReportComakerChange({ secondaryIdTypeAndNumber: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Co-maker Remarks / Others"
              value={callReport.comakerChange.remarks}
              onChange={(event) => setCallReportComakerChange({ remarks: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </ValidationRow>
      </Stack>

      <Divider sx={{ my: 2.5, borderColor: '#EEF0F5' }} />

      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Material Changes / Clarifications / Information Requiring Verification"
        value={callReport.materialChangesNotes}
        onChange={(event) => setCallReport({ materialChangesNotes: event.target.value })}
        sx={fieldSx}
      />
    </Box>
  );
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep "application-validation-card.tsx"`
Expected: empty.

Run: `npx eslint src/sections/admin/call-report/application-validation-card.tsx`
Expected: no output. If it flags the empty `label=""` prop passed to the nested `RadioRow` inside the Working Capital branch, remove that empty label prop entirely (make `label` optional on `RadioRow` — update its type in `call-report-types.tsx` to `label?: string` and skip rendering the `Typography` when `label` is falsy) rather than passing an empty string.

**Note on `call-report-types.ts`:** Task 2 renamed this file to `call-report-types.tsx` (required — the file contains JSX, which `.ts` files cannot compile under this project's `tsconfig`). Every reference to `call-report-types.ts` from Task 3 onward means `call-report-types.tsx`; extensionless `from './call-report-types'` imports are unaffected and need no change. Use the `.tsx` filename in any literal shell command (e.g. `git add`) that touches this file.

- [ ] **Step 3: Commit**

```bash
git add src/sections/admin/call-report/application-validation-card.tsx src/sections/admin/call-report/call-report-types.tsx
git commit -m "$(cat <<'EOF'
Add ApplicationValidationCard (NEXUS KYC PDF section 2)

The core new piece of this rebuild: a 9-row Confirm/Changed/Unable-to-
Verify table with each row's own conditional "Changed Information"
detail rendered inline when marked Changed, matching the PDF's own
per-item validation + changed-info structure.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `aml-kyc-card.tsx`, `customer-understanding-card.tsx` (PDF sections 3–4)

**Files:**
- Create: `src/sections/admin/call-report/aml-kyc-card.tsx`
- Create: `src/sections/admin/call-report/customer-understanding-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` → `review.callReport`, `setCallReport`; `YES_NO_VERIFY_OPTIONS`, `PAYMENT_HISTORY_DESCRIPTOR_OPTIONS`, `UNDERSTANDING_LEVEL_OPTIONS`, `LOAN_TERM_ITEM_OPTIONS`, `RadioRow`, `ChipToggleGroup`, `cardSx`, `fieldSx` from `./call-report-types`.
- Produces: `AmlKycCard`, `CustomerUnderstandingCard` (both exported, no props).

- [ ] **Step 1: Write `aml-kyc-card.tsx`**

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { cardSx, RadioRow, YES_NO_VERIFY_OPTIONS, PAYMENT_HISTORY_DESCRIPTOR_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 3: AML / KYC Questions. Six declarations retained because
// they are not explicitly captured elsewhere in the application form.
// ----------------------------------------------------------------------

export function AmlKycCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        3. AML / KYC Questions
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Record customer declarations. Positive responses or uncertainty should be routed for
        independent verification under the applicable PGFC AML/KYC policy.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Are you a Politically Exposed Person (PEP) or a close family member?"
          value={callReport.amlIsPep}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlIsPep: value })}
        />
        <RadioRow
          label="Are you an officer, director, shareholder, employee, or related party of PGFC?"
          value={callReport.amlIsPgfcRelatedParty}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlIsPgfcRelatedParty: value })}
        />
        <RadioRow
          label="Do you currently have loans with banks or other financing companies?"
          value={callReport.amlHasExistingLoans}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasExistingLoans: value })}
        />
        <RadioRow
          label="How would you describe your payment history?"
          value={callReport.amlPaymentHistory}
          options={PAYMENT_HISTORY_DESCRIPTOR_OPTIONS}
          onChange={(value) => setCallReport({ amlPaymentHistory: value })}
        />
        <RadioRow
          label="Have you ever issued a check that was returned due to insufficient funds or other reasons?"
          value={callReport.amlHasReturnedChecks}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasReturnedChecks: value })}
        />
        <RadioRow
          label="Do you currently have any Past Due Obligations or unpaid financial obligations?"
          value={callReport.amlHasPastDueObligations}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ amlHasPastDueObligations: value })}
        />
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Write `customer-understanding-card.tsx`**

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { cardSx, fieldSx, RadioRow, ChipToggleGroup, UNDERSTANDING_LEVEL_OPTIONS, LOAN_TERM_ITEM_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 4: Customer Understanding of Loan Terms & Requirements.
// ----------------------------------------------------------------------

export function CustomerUnderstandingCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const toggleTerm = (value: (typeof LOAN_TERM_ITEM_OPTIONS)[number]['value']) => {
    const next = callReport.termsUnderstood.includes(value)
      ? callReport.termsUnderstood.filter((entry) => entry !== value)
      : [...callReport.termsUnderstood, value];
    setCallReport({ termsUnderstood: next });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        4. Customer Understanding of Loan Terms &amp; Requirements
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Confirm that the customer understands and is aware of the loan terms discussed.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Customer Level of Understanding"
          value={callReport.understandingLevel}
          options={UNDERSTANDING_LEVEL_OPTIONS}
          onChange={(value) => setCallReport({ understandingLevel: value })}
        />

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
            Terms and Requirements Understood
          </Typography>
          <ChipToggleGroup options={LOAN_TERM_ITEM_OPTIONS} selected={callReport.termsUnderstood} onToggle={toggleTerm} />
        </Box>

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Concerns / Clarifications"
          value={callReport.concernsClarifications}
          onChange={(event) => setCallReport({ concernsClarifications: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep "aml-kyc-card.tsx\|customer-understanding-card.tsx"`
Expected: empty.

Run: `npx eslint src/sections/admin/call-report/aml-kyc-card.tsx src/sections/admin/call-report/customer-understanding-card.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/call-report/aml-kyc-card.tsx src/sections/admin/call-report/customer-understanding-card.tsx
git commit -m "$(cat <<'EOF'
Add AmlKycCard and CustomerUnderstandingCard (NEXUS KYC sections 3-4)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `proposed-loan-package-card.tsx`, `risk-disposition-card.tsx` (PDF sections 6–7)

**Files:**
- Create: `src/sections/admin/call-report/proposed-loan-package-card.tsx`
- Create: `src/sections/admin/call-report/risk-disposition-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` → `review.callReport`, `setCallReport`; `useRegistration()` → `application`; `PROPOSAL_INTEREST_RATE_BASIS_OPTIONS`, `PROPOSAL_COMPUTATION_TYPE_OPTIONS`, `RISK_DRIVER_OPTIONS`, `CALL_DISPOSITION_OPTIONS`, `RadioRow`, `ChipToggleGroup`, `cardSx`, `fieldSx` from `./call-report-types`; `useEffect`/`useRef` from `react` for the one-time default.
- Produces: `ProposedLoanPackageCard`, `RiskDispositionCard` (both exported, no props).

- [ ] **Step 1: Write `proposed-loan-package-card.tsx`**

```tsx
'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { cardSx, fieldSx, RadioRow, PROPOSAL_INTEREST_RATE_BASIS_OPTIONS, PROPOSAL_COMPUTATION_TYPE_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 6 (the PDF's own section number): Proposed Loan Package.
// Original Requested Amount defaults once from the application's own
// desired loan amount, same "default once, never overwrite an edit"
// convention this codebase already uses elsewhere for prefilled fields.
// ----------------------------------------------------------------------

export function ProposedLoanPackageCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;
  const { application } = useRegistration();

  const didDefault = useRef(false);
  useEffect(() => {
    if (didDefault.current) return;
    if (callReport.originalRequestedAmount) {
      didDefault.current = true;
      return;
    }
    const desired = application.financialInfo?.desiredLoanAmount;
    if (desired) {
      didDefault.current = true;
      setCallReport({ originalRequestedAmount: String(desired) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.financialInfo?.desiredLoanAmount]);

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        6. Proposed Loan Package
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        The preliminary package the officer is proposing based on this call.
      </Typography>

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Original Requested Amount"
            value={callReport.originalRequestedAmount}
            onChange={(event) => setCallReport({ originalRequestedAmount: event.target.value })}
            InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Interest Rate"
            value={callReport.proposalInterestRate}
            onChange={(event) => setCallReport({ proposalInterestRate: event.target.value })}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            sx={fieldSx}
          />
        </Stack>

        <RadioRow
          label="Interest Rate Basis"
          value={callReport.proposalInterestRateBasis}
          options={PROPOSAL_INTEREST_RATE_BASIS_OPTIONS}
          onChange={(value) => setCallReport({ proposalInterestRateBasis: value })}
        />

        <TextField
          fullWidth
          label="Proposed Facility / Product"
          value={callReport.proposedFacilityProduct}
          onChange={(event) => setCallReport({ proposedFacilityProduct: event.target.value })}
          sx={fieldSx}
        />

        <Box>
          <RadioRow
            label="Computation Type"
            value={callReport.proposalComputationType}
            options={PROPOSAL_COMPUTATION_TYPE_OPTIONS}
            onChange={(value) => setCallReport({ proposalComputationType: value })}
          />
          {callReport.proposalComputationType === 'other' && (
            <TextField
              fullWidth
              label="Other"
              value={callReport.proposalComputationTypeOther}
              onChange={(event) => setCallReport({ proposalComputationTypeOther: event.target.value })}
              sx={{ ...fieldSx, mt: 1.5 }}
            />
          )}
        </Box>

        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Proposed Loan Amount"
            value={callReport.proposedLoanAmount}
            onChange={(event) => setCallReport({ proposedLoanAmount: event.target.value })}
            InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Estimated Monthly Amortization"
            value={callReport.estimatedMonthlyAmortization}
            onChange={(event) => setCallReport({ estimatedMonthlyAmortization: event.target.value })}
            InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
            sx={fieldSx}
          />
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Proposed Loan Term"
            value={callReport.proposedLoanTermMonths}
            onChange={(event) => setCallReport({ proposedLoanTermMonths: event.target.value })}
            InputProps={{ endAdornment: <InputAdornment position="end">months</InputAdornment> }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Other Request"
            value={callReport.otherRequest}
            onChange={(event) => setCallReport({ otherRequest: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Write `risk-disposition-card.tsx`**

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { cardSx, fieldSx, RadioRow, ChipToggleGroup, RISK_DRIVER_OPTIONS, CALL_DISPOSITION_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 7: AO Preliminary Risk & Call Disposition. Primary Risk
// Driver is multi-select (more than one driver can genuinely apply, e.g.
// both Capacity and Collateral); Call Disposition is single-select even
// though the PDF renders both with the same checkbox glyph — the five
// disposition outcomes are mutually exclusive results of one call. See
// the design spec's own note on this interpretive call.
// ----------------------------------------------------------------------

export function RiskDispositionCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const toggleRiskDriver = (value: (typeof RISK_DRIVER_OPTIONS)[number]['value']) => {
    const next = callReport.primaryRiskDrivers.includes(value)
      ? callReport.primaryRiskDrivers.filter((entry) => entry !== value)
      : [...callReport.primaryRiskDrivers, value];
    setCallReport({ primaryRiskDrivers: next });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        7. AO Preliminary Risk &amp; Call Disposition
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        The officer's own preliminary read on this application, based on the call.
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
            Primary Risk Driver
          </Typography>
          <ChipToggleGroup options={RISK_DRIVER_OPTIONS} selected={callReport.primaryRiskDrivers} onToggle={toggleRiskDriver} />
        </Box>

        <RadioRow
          label="Call Disposition"
          value={callReport.callDisposition}
          options={CALL_DISPOSITION_OPTIONS}
          onChange={(value) => setCallReport({ callDisposition: value })}
        />

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Reason / Key Condition"
          value={callReport.reasonKeyCondition}
          onChange={(event) => setCallReport({ reasonKeyCondition: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep "proposed-loan-package-card.tsx\|risk-disposition-card.tsx"`
Expected: empty.

Run: `npx eslint src/sections/admin/call-report/proposed-loan-package-card.tsx src/sections/admin/call-report/risk-disposition-card.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/call-report/proposed-loan-package-card.tsx src/sections/admin/call-report/risk-disposition-card.tsx
git commit -m "$(cat <<'EOF'
Add ProposedLoanPackageCard and RiskDispositionCard (sections 6-7)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Rewrite `call-report-summary.ts` and `call-report-risk.ts`

**Files:**
- Modify: `src/sections/admin/call-report/call-report-summary.ts` (full rewrite)
- Modify: `src/sections/admin/call-report/call-report-risk.ts` (full rewrite)

**Interfaces:**
- Consumes: `CallReport` type from `src/auth/admin-context`; `labelFor`, `RISK_DRIVER_OPTIONS`, `CALL_DISPOSITION_OPTIONS`, `YES_NO_VERIFY_OPTIONS`, `PAYMENT_HISTORY_DESCRIPTOR_OPTIONS`, `LOAN_PURPOSE_OPTIONS` from `./call-report-types`.
- Produces: `buildCallSummary(callReport, signUpData): string` (same signature as before), `buildCallReportAiExceptions(callReport): string` (new), `CallReportRiskLevel = 'good' | 'watch' | 'high'` (unchanged type name/values), `buildCallReportAiRecommendation(callReport): { level: CallReportRiskLevel; text: string }` (same signature as before).

- [ ] **Step 1: Rewrite `call-report-summary.ts`**

```ts
import type { CallReport } from 'src/auth/admin-context';

import {
  labelFor,
  INTERACTION_TYPE_OPTIONS,
  IDENTITY_STATUS_OPTIONS,
  LOAN_PURPOSE_OPTIONS,
  RISK_DRIVER_OPTIONS,
  CALL_DISPOSITION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// Pure function: reads the structured CallReport answers and composes a
// plain-text summary for the "NEXUS System Validation" card's AI Summary
// field, skipping any section whose relevant fields are still empty.
// Recomputed fresh whenever the officer clicks "Refresh AI Review" (see
// system-validation-card.tsx) rather than on every render, so an officer
// can see exactly what changed since the last refresh.
// ----------------------------------------------------------------------

export function buildCallSummary(
  callReport: CallReport,
  signUpData: { firstName: string; lastName: string } | null
): string {
  const lines: string[] = [];
  const name = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : 'the borrower';

  const interactionLabel = labelFor(INTERACTION_TYPE_OPTIONS, callReport.interactionType);
  if (callReport.callVisitDate || interactionLabel) {
    const parts = [`Call with ${name}`];
    if (callReport.callVisitDate) parts.push(`on ${callReport.callVisitDate}`);
    if (callReport.callTime) parts.push(callReport.callTime);
    if (interactionLabel) parts.push(`(${interactionLabel})`);
    lines.push(`${parts.join(' ')}.`);
  }

  const identityLabel = labelFor(IDENTITY_STATUS_OPTIONS, callReport.identityStatus);
  if (identityLabel) lines.push(`Identity status: ${identityLabel}.`);

  const changedItems = Object.entries(callReport.validation).filter(([, status]) => status === 'changed');
  const unableItems = Object.entries(callReport.validation).filter(([, status]) => status === 'unable-to-verify');
  if (changedItems.length > 0) {
    lines.push(`${changedItems.length} application item(s) marked Changed during this call.`);
  }
  if (unableItems.length > 0) {
    lines.push(`${unableItems.length} application item(s) Unable to Verify.`);
  }

  const loanPurposeLabel = labelFor(LOAN_PURPOSE_OPTIONS, callReport.loanPurposeChangedTo);
  if (loanPurposeLabel) lines.push(`Loan purpose changed to: ${loanPurposeLabel}.`);

  const riskDriverLabels = callReport.primaryRiskDrivers
    .map((value) => labelFor(RISK_DRIVER_OPTIONS, value))
    .filter((label): label is string => !!label);
  if (riskDriverLabels.length > 0) {
    lines.push(`Primary risk driver(s): ${riskDriverLabels.join(', ')}.`);
  }

  const dispositionLabel = labelFor(CALL_DISPOSITION_OPTIONS, callReport.callDisposition);
  if (dispositionLabel) lines.push(`Call disposition: ${dispositionLabel}.`);

  if (callReport.proposedLoanAmount) {
    const term = callReport.proposedLoanTermMonths ? ` over ${callReport.proposedLoanTermMonths} months` : '';
    lines.push(`Proposed: ₱${Number(callReport.proposedLoanAmount).toLocaleString()}${term}.`);
  }

  return lines.join(' ');
}

// ----------------------------------------------------------------------
// AI Exceptions / Inconsistencies field — flags AML/KYC "for verification"
// or "yes" answers to red-flag questions, and any Application Validation
// row marked Unable to Verify, since those are exactly what the PDF's own
// "8. NEXUS System Validation" section is meant to surface.
// ----------------------------------------------------------------------

export function buildCallReportAiExceptions(callReport: CallReport): string {
  const exceptions: string[] = [];

  if (callReport.amlIsPep === 'yes' || callReport.amlIsPep === 'for-verification') {
    exceptions.push('Customer flagged as a possible Politically Exposed Person (PEP).');
  }
  if (callReport.amlIsPgfcRelatedParty === 'yes' || callReport.amlIsPgfcRelatedParty === 'for-verification') {
    exceptions.push('Customer flagged as a possible PGFC-related party.');
  }
  if (callReport.amlHasReturnedChecks === 'yes' || callReport.amlHasReturnedChecks === 'for-verification') {
    exceptions.push('Customer has a history of returned checks.');
  }
  if (callReport.amlHasPastDueObligations === 'yes' || callReport.amlHasPastDueObligations === 'for-verification') {
    exceptions.push('Customer has past due or unpaid financial obligations.');
  }
  if (callReport.amlPaymentHistory === 'major-delays' || callReport.amlPaymentHistory === 'for-verification') {
    exceptions.push('Payment history shows major delays or needs verification.');
  }

  const unableCount = Object.values(callReport.validation).filter((status) => status === 'unable-to-verify').length;
  if (unableCount > 0) {
    exceptions.push(`${unableCount} application validation item(s) could not be verified during this call.`);
  }

  return exceptions.length > 0 ? exceptions.join(' ') : 'No exceptions or inconsistencies flagged.';
}
```

- [ ] **Step 2: Rewrite `call-report-risk.ts`**

```ts
import type { CallReport } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Mirrors initial-credit-checking-risk.ts's shape (level + text). Driven
// by the officer's own Call Disposition answer first (section 7's
// explicit judgment call), falling back to a simple AML/KYC exception
// count when no disposition has been entered yet.
// ----------------------------------------------------------------------

export type CallReportRiskLevel = 'good' | 'watch' | 'high';

const DISPOSITION_LEVELS: Partial<Record<CallReport['callDisposition'], CallReportRiskLevel>> = {
  'proceed-to-next-process': 'good',
  'proceed-subject-to-requirements': 'watch',
  'additional-verification': 'watch',
  'follow-up-call': 'watch',
  'sales-reject-decline': 'high',
};

function countAmlFlags(callReport: CallReport): number {
  const flagged: (CallReport['amlIsPep'] | CallReport['amlHasReturnedChecks'])[] = [
    callReport.amlIsPep,
    callReport.amlIsPgfcRelatedParty,
    callReport.amlHasReturnedChecks,
    callReport.amlHasPastDueObligations,
  ];
  return flagged.filter((value) => value === 'yes' || value === 'for-verification').length;
}

export function buildCallReportAiRecommendation(callReport: CallReport): {
  level: CallReportRiskLevel;
  text: string;
} {
  const amlFlagCount = countAmlFlags(callReport);
  const amlClause = amlFlagCount > 0 ? ` ${amlFlagCount} AML/KYC item(s) flagged for review.` : '';

  if (callReport.callDisposition) {
    const level = DISPOSITION_LEVELS[callReport.callDisposition] ?? 'watch';
    const reasonClause = callReport.reasonKeyCondition ? ` ${callReport.reasonKeyCondition}` : '';
    switch (level) {
      case 'good':
        return { level, text: `Officer recommends proceeding to the next process.${amlClause}${reasonClause}` };
      case 'high':
        return { level, text: `Officer recommends against proceeding as currently proposed.${amlClause}${reasonClause}` };
      default:
        return {
          level,
          text: `Officer recommends proceeding with conditions or further verification before this moves forward.${amlClause}${reasonClause}`,
        };
    }
  }

  if (amlFlagCount === 0) {
    return {
      level: 'watch',
      text: 'Call disposition has not been entered yet, and no AML/KYC items are flagged so far — complete the sections above to generate a fuller read.',
    };
  }
  if (amlFlagCount <= 1) {
    return {
      level: 'watch',
      text: `${amlFlagCount} AML/KYC item(s) flagged for review. No call disposition has been entered yet.`,
    };
  }
  return {
    level: 'high',
    text: `${amlFlagCount} AML/KYC items flagged for review — worth a closer look. No call disposition has been entered yet.`,
  };
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep "call-report-summary.ts\|call-report-risk.ts"`
Expected: empty.

Run: `npx eslint src/sections/admin/call-report/call-report-summary.ts src/sections/admin/call-report/call-report-risk.ts`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/call-report/call-report-summary.ts src/sections/admin/call-report/call-report-risk.ts
git commit -m "$(cat <<'EOF'
Rewrite call report AI summary/risk logic for NEXUS KYC fields

buildCallSummary and buildCallReportAiRecommendation now read the new
CallReport shape (interaction, validation status counts, AML/KYC
flags, call disposition) instead of the old DTI/payment-behavior
fields. Adds buildCallReportAiExceptions, a new derived field matching
the PDF's own "AI Exceptions / Inconsistencies" box.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `system-validation-card.tsx`, `endorsement-declaration-card.tsx` (PDF section 8, both halves)

**Files:**
- Create: `src/sections/admin/call-report/system-validation-card.tsx`
- Create: `src/sections/admin/call-report/endorsement-declaration-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` → `review.callReport`, `setCallReport`; `useRegistration()` → `signUpData`, `application`; `buildCallSummary` from `./call-report-summary`; `buildCallReportAiExceptions`, from the same; `buildCallReportAiRecommendation` from `./call-report-risk`; `RadioRow`, `cardSx`, `fieldSx` from `./call-report-types`; `Iconify` from `src/components/iconify`.
- Produces: `SystemValidationCard`, `EndorsementDeclarationCard` (both exported, no props).

- [ ] **Step 1: Write `system-validation-card.tsx`**

This card both displays the derived AI fields AND provides the button that (re)computes and stores them onto `callReport.aiSummary`/`aiExceptions`/`aiRecommendation` — following the spec's choice to persist these like every other field rather than recompute on every render (so a "Refresh AI Review" action is explicit, matching how nothing else in this app auto-recomputes derived state silently).

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { cardSx, fieldSx, RadioRow } from './call-report-types';
import { buildCallSummary, buildCallReportAiExceptions } from './call-report-summary';
import { buildCallReportAiRecommendation, type CallReportRiskLevel } from './call-report-risk';

// ----------------------------------------------------------------------
// PDF section 8: NEXUS System Validation / Exception Handoff. AI Summary
// / AI Exceptions / AI Recommendation are computed on demand (via
// "Refresh AI Review") and stored on CallReport, same convention as
// every other field on this page, rather than recomputed silently on
// every render.
// ----------------------------------------------------------------------

const RISK_STYLES: Record<CallReportRiskLevel, { bg: string; color: string; icon: string; label: string }> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low risk' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Needs a closer look' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High risk' },
};

export function SystemValidationCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;
  const { signUpData } = useRegistration();

  const refreshAiReview = () => {
    const summary = buildCallSummary(callReport, signUpData);
    const exceptions = buildCallReportAiExceptions(callReport);
    const recommendation = buildCallReportAiRecommendation(callReport);
    setCallReport({ aiSummary: summary, aiExceptions: exceptions, aiRecommendation: recommendation.text });
  };

  const currentRecommendation = buildCallReportAiRecommendation(callReport);
  const riskStyle = RISK_STYLES[currentRecommendation.level];

  return (
    <Box sx={cardSx}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
          8. NEXUS System Validation / Exception Handoff
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        System-generated validation only. AI / automated rules are advisory and must not replace
        authorized credit, compliance, or approval judgment.
      </Typography>

      <Button
        onClick={refreshAiReview}
        variant="outlined"
        startIcon={<Iconify icon="solar:refresh-bold" width={18} />}
        sx={{
          mb: 2.5,
          color: '#1C2A6E',
          borderColor: '#C7CEEA',
          borderRadius: '10px',
          px: 2,
          '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
        }}
      >
        Refresh AI Review
      </Button>

      <Stack spacing={2}>
        <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>AI Summary</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
            {callReport.aiSummary || 'Click "Refresh AI Review" to generate a summary.'}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>
            AI Exceptions / Inconsistencies
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
            {callReport.aiExceptions || 'Click "Refresh AI Review" to check for exceptions.'}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Iconify icon={riskStyle.icon} width={16} sx={{ color: riskStyle.color }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color }}>
              AI Recommendation / Risk Level · {riskStyle.label}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>
            {callReport.aiRecommendation || currentRecommendation.text}
          </Typography>
        </Box>

        <Box>
          <RadioRow
            label="AO vs. System Assessment Variance"
            value={callReport.aoVsSystemVariance}
            options={[
              { value: 'none', label: 'None' },
              { value: 'noted', label: 'Variance Noted' },
            ]}
            onChange={(value) => setCallReport({ aoVsSystemVariance: value })}
          />
          {callReport.aoVsSystemVariance === 'noted' && (
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Explanation"
              value={callReport.varianceExplanation}
              onChange={(event) => setCallReport({ varianceExplanation: event.target.value })}
              sx={{ ...fieldSx, mt: 1.5 }}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Write `endorsement-declaration-card.tsx`**

```tsx
'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { cardSx, fieldSx } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 8 (second occurrence — the source PDF numbers both this
// and NEXUS System Validation as "8"): Account Officer Endorsement
// Declaration. The declaration paragraphs are the PDF's own fixed
// attestation text, rendered read-only — not something an officer edits.
// Account Officer name defaults once from the assigned officer, same
// "default once" convention every other prefilled field on this page
// follows.
// ----------------------------------------------------------------------

const DECLARATION_PARAGRAPHS = [
  'I hereby confirm that I have conducted the required pre-screening of the borrower/applicant in accordance with the Company’s established policies and procedures, including full compliance with Know Your Customer (KYC) requirements and applicable regulatory standards.',
  'I attest that all information, documents, and representations submitted in support of this application have been obtained through appropriate due diligence/KYC and are, to the best of my knowledge, complete, accurate, and truthful. I confirm that no material information has been knowingly omitted, withheld, or misrepresented.',
  'I further declare that I have not engaged in, and will not engage in, any form of connivance, collusion, or undisclosed arrangement with the borrower/applicant or any related party that may influence, circumvent, or compromise the integrity of the application or the Company’s policies.',
  'I affirm that this application has been prepared and endorsed in good faith, in accordance with Company policies, and within the scope of my responsibilities.',
  'I understand that any false declaration, material omission, or breach of this statement may subject me to disciplinary action, up to and including termination, and may expose me to legal liability.',
];

export function EndorsementDeclarationCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;
  const { application } = useRegistration();

  const didDefault = useRef(false);
  useEffect(() => {
    if (didDefault.current || callReport.accountOfficerName) return;
    if (application.assignedOfficer) {
      didDefault.current = true;
      setCallReport({ accountOfficerName: application.assignedOfficer });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.assignedOfficer]);

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 2 }}>
        Account Officer Endorsement Declaration
      </Typography>

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {DECLARATION_PARAGRAPHS.map((paragraph) => (
          <Typography key={paragraph.slice(0, 24)} sx={{ fontSize: 13, color: '#3B4256', lineHeight: 1.65 }}>
            {paragraph}
          </Typography>
        ))}
      </Stack>

      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Account Officer"
            value={callReport.accountOfficerName}
            onChange={(event) => setCallReport({ accountOfficerName: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Date / Time"
            type="datetime-local"
            value={callReport.accountOfficerDateTime}
            onChange={(event) => setCallReport({ accountOfficerDateTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Reviewed by Head"
            value={callReport.reviewedByHeadName}
            onChange={(event) => setCallReport({ reviewedByHeadName: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Date / Time"
            type="datetime-local"
            value={callReport.reviewedByHeadDateTime}
            onChange={(event) => setCallReport({ reviewedByHeadDateTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep "system-validation-card.tsx\|endorsement-declaration-card.tsx"`
Expected: empty.

Run: `npx eslint src/sections/admin/call-report/system-validation-card.tsx src/sections/admin/call-report/endorsement-declaration-card.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/call-report/system-validation-card.tsx src/sections/admin/call-report/endorsement-declaration-card.tsx
git commit -m "$(cat <<'EOF'
Add SystemValidationCard and EndorsementDeclarationCard (section 8)

AI Summary/Exceptions/Recommendation are computed on demand via a
"Refresh AI Review" button and persisted on CallReport, rather than
recomputed silently on every render. Endorsement Declaration renders
the PDF's own fixed attestation paragraphs read-only, with AO/Reviewed
by Head name + date/time fields.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Rewrite `call-report-result-modal.tsx`

**Files:**
- Modify: `src/sections/admin/call-report/call-report-result-modal.tsx` (full rewrite of the body; keep `{open, onClose}` props and the `ResultField`/`NarrativeBlock`/`SectionHeading`/`FieldGrid`/`formatCurrency` helper functions unchanged)

**Interfaces:**
- Consumes: `useAdmin()` → `review.callReport`; every new option-list export from `./call-report-types`.
- Produces: `CallReportResultModal({ open, onClose }: { open: boolean; onClose: () => void })` (same signature as before — `call-report-view.tsx` mounts it unchanged).

- [ ] **Step 1: Replace the file content**

Keep the top-of-file helper functions (`ResultField`, `NarrativeBlock`, `SectionHeading`, `FieldGrid`, `formatCurrency`) exactly as they are today (lines 61–112 of the current file) — only the imports and the `CallReportResultModal` component body change:

```tsx
'use client';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

import {
  labelFor,
  INTERACTION_TYPE_OPTIONS,
  IDENTITY_STATUS_OPTIONS,
  IDENTITY_BASIS_OPTIONS,
  LOAN_FACILITY_OPTIONS,
  LOAN_PURPOSE_OPTIONS,
  REPAYMENT_SOURCE_TYPE_OPTIONS,
  YES_NO_VERIFY_OPTIONS,
  PAYMENT_HISTORY_DESCRIPTOR_OPTIONS,
  UNDERSTANDING_LEVEL_OPTIONS,
  LOAN_TERM_ITEM_OPTIONS,
  PROPOSAL_INTEREST_RATE_BASIS_OPTIONS,
  PROPOSAL_COMPUTATION_TYPE_OPTIONS,
  RISK_DRIVER_OPTIONS,
  CALL_DISPOSITION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

function ResultField({ label, value }: { label: string; value: string | null }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6', mb: 0.4 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Box>
  );
}

function NarrativeBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#8891A6', mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#14172A', mb: 1.5 }}>
      {children}
    </Typography>
  );
}

function FieldGrid({ children, columns = 3 }: { children: React.ReactNode; columns?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: `repeat(${columns}, minmax(0, 1fr))` },
        gap: 2,
        p: 2,
        borderRadius: '12px',
        bgcolor: '#F9FAFC',
        border: '1px solid #EEF0F5',
      }}
    >
      {children}
    </Box>
  );
}

function formatCurrency(value: string): string {
  if (!value) return '';
  return `₱${Number(value).toLocaleString()}`;
}

export function CallReportResultModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { review } = useAdmin();
  const { callReport } = review;

  const identityBasisLabels = callReport.identityBasis
    .map((value) => labelFor(IDENTITY_BASIS_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const termsUnderstoodLabels = callReport.termsUnderstood
    .map((value) => labelFor(LOAN_TERM_ITEM_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const riskDriverLabels = callReport.primaryRiskDrivers
    .map((value) => labelFor(RISK_DRIVER_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const validationLabels: Record<string, string> = {
    confirmed: 'Confirmed',
    changed: 'Changed',
    'unable-to-verify': 'Unable to Verify',
    '': '—',
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ px: 2.5, py: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>Call report</Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Read-only record of the NEXUS Customer KYC &amp; Call Validation Report.
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close call report">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={2.5}>
          <Box>
            <SectionHeading>1. Interaction Record</SectionHeading>
            <FieldGrid columns={4}>
              <ResultField label="Call / Visit Date" value={callReport.callVisitDate} />
              <ResultField label="Time" value={callReport.callTime} />
              <ResultField label="Interviewed Person" value={callReport.interviewedPerson} />
              <ResultField label="Relationship to Borrower" value={callReport.relationshipToBorrower} />
              <ResultField label="Interaction Type" value={labelFor(INTERACTION_TYPE_OPTIONS, callReport.interactionType)} />
              <ResultField label="Identity Status" value={labelFor(IDENTITY_STATUS_OPTIONS, callReport.identityStatus)} />
              <ResultField label="Basis of Identity Confirmation" value={identityBasisLabels} />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>2. Application Validation</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField label="Identity / Authorized Representative" value={validationLabels[callReport.validation.identityAuthorizedRep]} />
              <ResultField label="Loan Facility" value={validationLabels[callReport.validation.loanFacility]} />
              <ResultField label="Loan Purpose" value={validationLabels[callReport.validation.loanPurpose]} />
              <ResultField label="Primary Source of Repayment" value={validationLabels[callReport.validation.primaryRepaymentSource]} />
              <ResultField label="Business / Employment Info" value={validationLabels[callReport.validation.businessEmploymentInfo]} />
              <ResultField label="Existing Loans / Obligations" value={validationLabels[callReport.validation.existingLoansObligations]} />
              <ResultField label="Residence / Business Address" value={validationLabels[callReport.validation.residenceBusinessAddress]} />
              <ResultField label="Collateral / Security Declaration" value={validationLabels[callReport.validation.collateralSecurityDeclaration]} />
              <ResultField label="Co-maker/Guarantee" value={validationLabels[callReport.validation.comakerGuarantee]} />
            </FieldGrid>
            {callReport.validation.loanFacility === 'changed' && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="LOAN FACILITY CHANGED TO"
                  value={`${labelFor(LOAN_FACILITY_OPTIONS, callReport.loanFacilityChangedTo) || ''} — ${callReport.loanFacilityChangeReason}`}
                />
              </Box>
            )}
            {callReport.validation.loanPurpose === 'changed' && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="LOAN PURPOSE CHANGED TO"
                  value={labelFor(LOAN_PURPOSE_OPTIONS, callReport.loanPurposeChangedTo) || ''}
                />
              </Box>
            )}
            {callReport.validation.primaryRepaymentSource === 'changed' && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="PRIMARY REPAYMENT SOURCE CHANGED TO"
                  value={labelFor(REPAYMENT_SOURCE_TYPE_OPTIONS, callReport.primaryRepaymentSourceChangedTo) || ''}
                />
              </Box>
            )}
            {callReport.existingLoanRows.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="EXISTING LOANS DECLARED"
                  value={callReport.existingLoanRows
                    .map((row) => `${row.lender} (${row.loanType}) — ${formatCurrency(row.outstandingBalance)}`)
                    .join('\n')}
                />
              </Box>
            )}
            {callReport.comakerChange.completeName && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="CO-MAKER/GUARANTOR"
                  value={`${callReport.comakerChange.completeName} — ${callReport.comakerChange.relationshipToBorrower}`}
                />
              </Box>
            )}
            {callReport.materialChangesNotes && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="MATERIAL CHANGES / CLARIFICATIONS" value={callReport.materialChangesNotes} />
              </Box>
            )}
          </Box>

          <Box>
            <SectionHeading>3. AML / KYC Questions</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField label="Politically Exposed Person" value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlIsPep)} />
              <ResultField
                label="PGFC-related Party"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlIsPgfcRelatedParty)}
              />
              <ResultField
                label="Has Existing Loans"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasExistingLoans)}
              />
              <ResultField
                label="Payment History"
                value={labelFor(PAYMENT_HISTORY_DESCRIPTOR_OPTIONS, callReport.amlPaymentHistory)}
              />
              <ResultField
                label="Returned Checks"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasReturnedChecks)}
              />
              <ResultField
                label="Past Due Obligations"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasPastDueObligations)}
              />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>4. Customer Understanding</SectionHeading>
            <FieldGrid columns={2}>
              <ResultField
                label="Level of Understanding"
                value={labelFor(UNDERSTANDING_LEVEL_OPTIONS, callReport.understandingLevel)}
              />
              <ResultField label="Terms Understood" value={termsUnderstoodLabels} />
            </FieldGrid>
            {callReport.concernsClarifications && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="CONCERNS / CLARIFICATIONS" value={callReport.concernsClarifications} />
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Box>
            <SectionHeading>6. Proposed Loan Package</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField label="Original Requested Amount" value={formatCurrency(callReport.originalRequestedAmount)} />
              <ResultField
                label="Interest Rate"
                value={callReport.proposalInterestRate ? `${callReport.proposalInterestRate}%` : ''}
              />
              <ResultField
                label="Interest Rate Basis"
                value={labelFor(PROPOSAL_INTEREST_RATE_BASIS_OPTIONS, callReport.proposalInterestRateBasis)}
              />
              <ResultField label="Proposed Facility / Product" value={callReport.proposedFacilityProduct} />
              <ResultField
                label="Computation Type"
                value={
                  callReport.proposalComputationType === 'other'
                    ? callReport.proposalComputationTypeOther
                    : labelFor(PROPOSAL_COMPUTATION_TYPE_OPTIONS, callReport.proposalComputationType)
                }
              />
              <ResultField label="Proposed Loan Amount" value={formatCurrency(callReport.proposedLoanAmount)} />
              <ResultField
                label="Estimated Monthly Amortization"
                value={formatCurrency(callReport.estimatedMonthlyAmortization)}
              />
              <ResultField
                label="Proposed Loan Term"
                value={callReport.proposedLoanTermMonths ? `${callReport.proposedLoanTermMonths} months` : ''}
              />
              <ResultField label="Other Request" value={callReport.otherRequest} />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>7. AO Preliminary Risk &amp; Call Disposition</SectionHeading>
            <FieldGrid columns={2}>
              <ResultField label="Primary Risk Driver" value={riskDriverLabels} />
              <ResultField label="Call Disposition" value={labelFor(CALL_DISPOSITION_OPTIONS, callReport.callDisposition)} />
            </FieldGrid>
            {callReport.reasonKeyCondition && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="REASON / KEY CONDITION" value={callReport.reasonKeyCondition} />
              </Box>
            )}
          </Box>

          <Box>
            <SectionHeading>8. NEXUS System Validation</SectionHeading>
            <Stack spacing={1.5}>
              <NarrativeBlock label="AI SUMMARY" value={callReport.aiSummary} />
              <NarrativeBlock label="AI EXCEPTIONS / INCONSISTENCIES" value={callReport.aiExceptions} />
              <NarrativeBlock label="AI RECOMMENDATION / RISK LEVEL" value={callReport.aiRecommendation} />
              <ResultField
                label="AO vs. System Assessment Variance"
                value={callReport.aoVsSystemVariance === 'noted' ? `Variance Noted — ${callReport.varianceExplanation}` : 'None'}
              />
            </Stack>
          </Box>

          <Box>
            <SectionHeading>Account Officer Endorsement Declaration</SectionHeading>
            <FieldGrid columns={2}>
              <ResultField label="Account Officer" value={callReport.accountOfficerName} />
              <ResultField label="Date / Time" value={callReport.accountOfficerDateTime} />
              <ResultField label="Reviewed by Head" value={callReport.reviewedByHeadName} />
              <ResultField label="Date / Time" value={callReport.reviewedByHeadDateTime} />
            </FieldGrid>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep "call-report-result-modal.tsx"`
Expected: empty.

Run: `npx eslint src/sections/admin/call-report/call-report-result-modal.tsx`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/sections/admin/call-report/call-report-result-modal.tsx
git commit -m "$(cat <<'EOF'
Rewrite CallReportResultModal for the NEXUS KYC field shape

Same {open, onClose} signature and same ResultField/NarrativeBlock/
SectionHeading/FieldGrid helpers as before — only the rendered
sections change, now mirroring the 8-section PDF structure.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Rewrite `call-report-view.tsx`, delete old cards, update `ci-report-card.tsx` type reference, rewrite docs

**Files:**
- Modify: `src/sections/admin/call-report-view.tsx` (full rewrite of imports, sample-data handlers, `canProceed`)
- Delete: `src/sections/admin/call-report/call-details-card.tsx`, `loan-discussion-card.tsx`, `residence-household-card.tsx`, `employment-business-card.tsx`, `organization-membership-card.tsx`, `quick-financial-info-card.tsx`, `payment-behavior-card.tsx`, `officer-observation-card.tsx`, `collateral-information-card.tsx`, `collateral-entry-fields.tsx`, `agreed-next-steps-card.tsx`, `loan-package-proposal-card.tsx`, `comaker-information-card.tsx`, `call-report-computations.ts`
- Verify (no edit expected): `src/sections/admin/credit-investigation/ci-report-card.tsx` — confirm `review.callReport.comakers` still typechecks
- Modify: `docs/ADMIN_CALL_REPORT.md` (full rewrite)

**Interfaces:**
- Consumes: `InteractionRecordCard`, `ApplicationValidationCard`, `AmlKycCard`, `CustomerUnderstandingCard`, `ProposedLoanPackageCard`, `RiskDispositionCard`, `SystemValidationCard`, `EndorsementDeclarationCard` from Tasks 3–8; `buildCallReportAiRecommendation` from `./call-report/call-report-risk`.
- Produces: `CallReportView` (same export name, no props — unchanged from today).

- [ ] **Step 1: Delete the 13 old files**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git rm src/sections/admin/call-report/call-details-card.tsx
git rm src/sections/admin/call-report/loan-discussion-card.tsx
git rm src/sections/admin/call-report/residence-household-card.tsx
git rm src/sections/admin/call-report/employment-business-card.tsx
git rm src/sections/admin/call-report/organization-membership-card.tsx
git rm src/sections/admin/call-report/quick-financial-info-card.tsx
git rm src/sections/admin/call-report/payment-behavior-card.tsx
git rm src/sections/admin/call-report/officer-observation-card.tsx
git rm src/sections/admin/call-report/collateral-information-card.tsx
git rm src/sections/admin/call-report/collateral-entry-fields.tsx
git rm src/sections/admin/call-report/agreed-next-steps-card.tsx
git rm src/sections/admin/call-report/loan-package-proposal-card.tsx
git rm src/sections/admin/call-report/comaker-information-card.tsx
git rm src/sections/admin/call-report/call-report-computations.ts
```

- [ ] **Step 2: Rewrite `call-report-view.tsx`**

Replace the entire file content:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { CallReportComakerChange, ExistingLoanRow } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { CreditCheckingResultModal } from './call-report/credit-checking-result-modal';
import { CallReportResultModal } from './call-report/call-report-result-modal';
import { InteractionRecordCard } from './call-report/interaction-record-card';
import { ApplicationValidationCard } from './call-report/application-validation-card';
import { AmlKycCard } from './call-report/aml-kyc-card';
import { CustomerUnderstandingCard } from './call-report/customer-understanding-card';
import { ProposedLoanPackageCard } from './call-report/proposed-loan-package-card';
import { RiskDispositionCard } from './call-report/risk-disposition-card';
import { SystemValidationCard } from './call-report/system-validation-card';
import { EndorsementDeclarationCard } from './call-report/endorsement-declaration-card';
import { cardSx } from './call-report/call-report-types';

// ----------------------------------------------------------------------

const SALES_REJECT_REASONS = [
  'Insufficient income',
  'Poor credit history',
  'Incomplete documents',
  'Employment not verifiable',
  'Requested amount too high',
  'Other',
];

export function CallReportView() {
  const router = useRouter();
  const { signUpData, application } = useRegistration();
  const { review, setCallReport } = useAdmin();
  const [creditCheckingResultModalOpen, setCreditCheckingResultModalOpen] = useState(false);
  const [callReportResultModalOpen, setCallReportResultModalOpen] = useState(false);
  const [disapproveDialogOpen, setDisapproveDialogOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonRemarks, setReasonRemarks] = useState('');

  const { callReport } = review;

  const canProceed = !!callReport.interactionType && !!callReport.identityStatus && !!callReport.callDisposition;

  const handleProceed = () => {
    if (!signUpData) return;
    setCallReport({ approved: true });
    router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
  };

  const closeReasonDialog = () => {
    setDisapproveDialogOpen(false);
    setReasonCategory('');
    setReasonRemarks('');
  };

  const confirmReasonDialog = () => {
    if (!signUpData || !reasonCategory) return;
    const decisionReason = reasonRemarks.trim() ? `${reasonCategory} — ${reasonRemarks.trim()}` : reasonCategory;
    setCallReport({ approved: false, decisionReason });
    closeReasonDialog();
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  const handleFillSampleData = () => {
    if (!signUpData) return;
    const loanAmount = application.financialInfo?.desiredLoanAmount ?? 0;
    const loanTerm = application.financialInfo?.loanTermMonths ?? 0;

    const sampleExistingLoan: ExistingLoanRow = {
      id: crypto.randomUUID(),
      lender: 'BDO Unibank',
      loanType: 'Personal Loan',
      outstandingBalance: '50000',
      monthlyPayment: '5000',
    };

    const sampleComakerChange: CallReportComakerChange = {
      completeName: 'Juan Dela Cruz',
      completeAddress: 'Quezon City, Metro Manila',
      contactNumber: '09171234567',
      relationshipToBorrower: 'Sibling',
      occupationEmployerName: 'ABC Corporation',
      yearsInEmploymentBusiness: '5',
      primaryIdTypeAndNumber: "Driver's License — N01-23-456789",
      secondaryIdTypeAndNumber: 'UMID — 1234-5678901-2',
      remarks: '',
    };

    setCallReport({
      interactionType: 'phone',
      callVisitDate: new Date().toISOString().slice(0, 10),
      callTime: '14:30',
      interviewedPerson: signUpData.firstName,
      relationshipToBorrower: 'Self',
      identityStatus: 'confirmed',
      identityBasis: ['app-data-matched', 'valid-government-id'],
      identityBasisOther: '',
      validation: {
        identityAuthorizedRep: 'confirmed',
        loanFacility: 'confirmed',
        loanPurpose: 'changed',
        primaryRepaymentSource: 'confirmed',
        businessEmploymentInfo: 'confirmed',
        existingLoansObligations: 'changed',
        residenceBusinessAddress: 'confirmed',
        collateralSecurityDeclaration: 'confirmed',
        comakerGuarantee: 'changed',
      },
      materialChangesNotes: 'Client clarified the loan purpose and confirmed one existing loan not previously on file.',
      loanFacilityChangedTo: '',
      loanFacilityChangeReason: '',
      loanPurposeChangedTo: 'home-renovation-construction',
      loanPurposeOtherText: '',
      workingCapitalUse: '',
      workingCapitalUseOtherText: '',
      loanTakeOutInfo: {
        currentLender: '',
        outstandingBalance: '',
        estimatedPayoffAmount: '',
        remainingLoanTerm: '',
        reasonForTakeOut: '',
        status: '',
      },
      primaryRepaymentSourceChangedTo: '',
      repaymentSourceOtherText: '',
      employerBusinessNameChanged: '',
      employmentBusinessAddressChanged: '',
      declaredMonthlyIncomeChanged: '',
      employmentBusinessTenureChanged: '',
      businessEmploymentOtherChange: '',
      existingLoanRows: [sampleExistingLoan],
      residenceBusinessAddressChangedTo: '',
      residenceBusinessAddressChangeReason: '',
      collateralDeclarationChangedTo: [],
      collateralDeclarationOtherText: '',
      comakerChange: sampleComakerChange,
      comakers: [
        {
          id: crypto.randomUUID(),
          name: sampleComakerChange.completeName,
          relationshipToBorrower: sampleComakerChange.relationshipToBorrower,
          address: sampleComakerChange.completeAddress,
          contactNumber: sampleComakerChange.contactNumber,
          occupation: sampleComakerChange.occupationEmployerName,
          monthlyIncome: '',
        },
      ],
      amlIsPep: 'no',
      amlIsPgfcRelatedParty: 'no',
      amlHasExistingLoans: 'yes',
      amlPaymentHistory: 'on-time',
      amlHasReturnedChecks: 'no',
      amlHasPastDueObligations: 'no',
      understandingLevel: 'fully-understood',
      termsUnderstood: [
        'interest-rate',
        'loan-amount',
        'loan-term',
        'monthly-amortization',
        'documentary-requirements',
        'collateral-requirements',
      ],
      concernsClarifications: '',
      originalRequestedAmount: String(loanAmount),
      proposalInterestRate: '1.5',
      proposalInterestRateBasis: 'monthly',
      proposedFacilityProduct: 'Clean Loan',
      proposalComputationType: 'diminishing-balance',
      proposalComputationTypeOther: '',
      proposedLoanAmount: String(loanAmount),
      estimatedMonthlyAmortization: loanTerm ? String(Math.round(loanAmount / loanTerm)) : '',
      proposedLoanTermMonths: String(loanTerm),
      otherRequest: '',
      primaryRiskDrivers: ['character'],
      callDisposition: 'proceed-to-next-process',
      reasonKeyCondition: 'Client cooperative, consistent answers, no major exceptions noted.',
      aiSummary: '',
      aiExceptions: '',
      aiRecommendation: '',
      aoVsSystemVariance: 'none',
      varianceExplanation: '',
      accountOfficerName: application.assignedOfficer ?? 'Ramon Cruz',
      accountOfficerDateTime: new Date().toISOString().slice(0, 16),
      reviewedByHeadName: 'Maria Santos',
      reviewedByHeadDateTime: new Date().toISOString().slice(0, 16),
    });
  };

  const handleClearSampleData = () => {
    setCallReport({
      interactionType: '',
      callVisitDate: '',
      callTime: '',
      interviewedPerson: '',
      relationshipToBorrower: '',
      identityStatus: '',
      identityBasis: [],
      identityBasisOther: '',
      validation: {
        identityAuthorizedRep: '',
        loanFacility: '',
        loanPurpose: '',
        primaryRepaymentSource: '',
        businessEmploymentInfo: '',
        existingLoansObligations: '',
        residenceBusinessAddress: '',
        collateralSecurityDeclaration: '',
        comakerGuarantee: '',
      },
      materialChangesNotes: '',
      loanFacilityChangedTo: '',
      loanFacilityChangeReason: '',
      loanPurposeChangedTo: '',
      loanPurposeOtherText: '',
      workingCapitalUse: '',
      workingCapitalUseOtherText: '',
      loanTakeOutInfo: {
        currentLender: '',
        outstandingBalance: '',
        estimatedPayoffAmount: '',
        remainingLoanTerm: '',
        reasonForTakeOut: '',
        status: '',
      },
      primaryRepaymentSourceChangedTo: '',
      repaymentSourceOtherText: '',
      employerBusinessNameChanged: '',
      employmentBusinessAddressChanged: '',
      declaredMonthlyIncomeChanged: '',
      employmentBusinessTenureChanged: '',
      businessEmploymentOtherChange: '',
      existingLoanRows: [],
      residenceBusinessAddressChangedTo: '',
      residenceBusinessAddressChangeReason: '',
      collateralDeclarationChangedTo: [],
      collateralDeclarationOtherText: '',
      comakerChange: {
        completeName: '',
        completeAddress: '',
        contactNumber: '',
        relationshipToBorrower: '',
        occupationEmployerName: '',
        yearsInEmploymentBusiness: '',
        primaryIdTypeAndNumber: '',
        secondaryIdTypeAndNumber: '',
        remarks: '',
      },
      comakers: [],
      amlIsPep: '',
      amlIsPgfcRelatedParty: '',
      amlHasExistingLoans: '',
      amlPaymentHistory: '',
      amlHasReturnedChecks: '',
      amlHasPastDueObligations: '',
      understandingLevel: '',
      termsUnderstood: [],
      concernsClarifications: '',
      originalRequestedAmount: '',
      proposalInterestRate: '',
      proposalInterestRateBasis: '',
      proposedFacilityProduct: '',
      proposalComputationType: '',
      proposalComputationTypeOther: '',
      proposedLoanAmount: '',
      estimatedMonthlyAmortization: '',
      proposedLoanTermMonths: '',
      otherRequest: '',
      primaryRiskDrivers: [],
      callDisposition: '',
      reasonKeyCondition: '',
      aiSummary: '',
      aiExceptions: '',
      aiRecommendation: '',
      aoVsSystemVariance: '',
      varianceExplanation: '',
      accountOfficerName: '',
      accountOfficerDateTime: '',
      reviewedByHeadName: '',
      reviewedByHeadDateTime: '',
    });
  };

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'sample-data',
          label: canProceed ? 'Remove Sample Data' : 'Fill with Sample Data',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: canProceed ? handleClearSampleData : handleFillSampleData,
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [canProceed]
    )
  );

  if (!signUpData || !application.financialInfo || !application.personalInfo) return null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 2 · Call Report" reviewStep="callReport" hideApplicationCard />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard
          collapsible
          onViewCreditCheckingResult={() => setCreditCheckingResultModalOpen(true)}
          officerNotesProcess="Call Report"
        />

        <InteractionRecordCard />
        <ApplicationValidationCard />
        <AmlKycCard />
        <CustomerUnderstandingCard />
        <ProposedLoanPackageCard />
        <RiskDispositionCard />
        <SystemValidationCard />
        <EndorsementDeclarationCard />

        <Box sx={cardSx}>
          <Button
            onClick={() => setCallReportResultModalOpen(true)}
            variant="outlined"
            startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
            sx={{
              color: '#1C2A6E',
              borderColor: '#C7CEEA',
              borderRadius: '10px',
              px: 2,
              '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
            }}
          >
            View Call Report Result
          </Button>
        </Box>

        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {canProceed
              ? 'Approve the call report and decide whether to continue this application.'
              : 'Complete Interaction Type, Identity Status, and Call Disposition before proceeding.'}
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleProceed}
              disabled={!canProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Proceed to Requirement Checklist
            </Button>
            <Button
              onClick={() => setDisapproveDialogOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{
                color: '#5A6273',
                borderColor: '#C7CCDA',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
              }}
            >
              Sales Reject
            </Button>
          </Stack>

          {review.callReport.approved && (
            <Typography sx={{ fontSize: 12.5, color: '#12B76A', fontWeight: 600, mt: 2 }}>
              Call report approved.
            </Typography>
          )}
        </Box>
      </Stack>

      <CreditCheckingResultModal
        open={creditCheckingResultModalOpen}
        onClose={() => setCreditCheckingResultModalOpen(false)}
        recommendationEditable={false}
      />
      <CallReportResultModal open={callReportResultModalOpen} onClose={() => setCallReportResultModalOpen(false)} />

      <ConfirmDialog
        open={disapproveDialogOpen}
        onClose={closeReasonDialog}
        title="Reason for sales reject"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              autoFocus
              fullWidth
              label="Reason"
              value={reasonCategory}
              onChange={(event) => setReasonCategory(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            >
              {SALES_REJECT_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Remarks"
              placeholder="Add any additional details…"
              value={reasonRemarks}
              onChange={(event) => setReasonRemarks(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!reasonCategory}
            onClick={confirmReasonDialog}
            sx={{ bgcolor: '#F04438', '&:hover': { bgcolor: '#B32C22' } }}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
```

- [ ] **Step 3: Verify `ci-report-card.tsx` still typechecks against the new `comakers` field**

Run: `npx tsc --noEmit -p . 2>&1 | grep "ci-report-card.tsx"`
Expected: empty — `review.callReport.comakers` is still `CiComakerEntry[]` in the new shape (Task 1 kept this field), so no code change is needed in this file. If this grep is NOT empty, read the error and fix `ci-report-card.tsx`'s usage to match (do not change `CiComakerEntry` itself — the design spec requires it stay compatible).

- [ ] **Step 4: Full project typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | tail -60`
Expected: no output at all (clean full-project typecheck). This is the first point in the plan where the ENTIRE project should be clean — every prior task's "grep for this file" checks were partial by design, since earlier tasks left other not-yet-updated files still failing.

- [ ] **Step 5: Full project lint**

Run: `npx eslint src/sections/admin/call-report-view.tsx src/sections/admin/call-report/*.ts src/sections/admin/call-report/*.tsx 2>&1`
Expected: no output.

- [ ] **Step 6: Rewrite `docs/ADMIN_CALL_REPORT.md`**

Replace the file's content to describe the new 8-section structure (Interaction Record, Application Validation, AML/KYC Questions, Customer Understanding, Proposed Loan Package, AO Risk & Disposition, NEXUS System Validation, AO Endorsement Declaration), the new `CallReport` type location and shape, the `comakers` sync behavior with `ci-report-card.tsx`, the new `canProceed` gate, and the deleted/new file list — following the same structure and maintenance-rule header convention the current file already uses (re-read the current file's header block for the exact wording pattern, and update the file list in that maintenance rule to name the new files instead of the old ones).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Replace CallReportView with the NEXUS KYC 8-section page

Deletes the old 13 files (12 section cards + computations helper).
CallReportView now renders InteractionRecordCard,
ApplicationValidationCard, AmlKycCard, CustomerUnderstandingCard,
ProposedLoanPackageCard, RiskDispositionCard, SystemValidationCard,
and EndorsementDeclarationCard in place of the old 12-card stack.
canProceed now gates on interactionType/identityStatus/callDisposition
instead of the old callStatus/identityConfirmed/preliminaryRecommendation
fields. Rewrites docs/ADMIN_CALL_REPORT.md to match.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: End-to-end manual verification via browser

**Files:** none (verification only — no code changes)

**Interfaces:** none

- [ ] **Step 1: Confirm the dev server is running**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5`
Expected: `200`. If not 200, start it: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npm run dev &` then poll with `curl` until it returns 200 (do not sleep-guess).

- [ ] **Step 2: Write and run a Playwright driver script**

If a scratchpad directory with a local `playwright` install doesn't already exist from a prior session, create one:

```bash
mkdir -p /tmp/call-report-verify && cd /tmp/call-report-verify && npm init -y >/dev/null 2>&1 && npm install playwright@1.62.1 2>&1 | tail -5 && npx playwright install chromium 2>&1 | tail -5
```

Write `/tmp/call-report-verify/drive.mjs`:

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', 'admin@pgfinance.com.ph');
await page.fill('input[name="password"]', 'Admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

// Navigate to Account Solicitation, open (or seed) an application, go to Call Report.
await page.goto('http://localhost:3000/admin/account-solicitation', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const row = page.locator('table tbody tr').first();
if (await row.count() > 0) {
  await row.click();
  await page.waitForTimeout(1500);
}
console.log('URL after opening application:', page.url());

await page.screenshot({ path: '/tmp/call-report-verify/1-page.png', fullPage: true });

// Use the settings/page-actions popover to fill sample data, same convention
// every other page in this session used.
const gearBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
await gearBtn.click();
await page.waitForTimeout(700);
const fillBtn = page.getByText('Fill with Sample Data', { exact: false });
console.log('fill sample data button count:', await fillBtn.count());
if (await fillBtn.count() > 0) {
  await fillBtn.first().click();
  await page.waitForTimeout(1000);
}
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);

await page.screenshot({ path: '/tmp/call-report-verify/2-filled.png', fullPage: true });

// Mark one Application Validation row "Changed" and confirm its detail panel appears.
const changedButtons = page.getByRole('button', { name: 'Changed' });
console.log('Changed button count:', await changedButtons.count());
if (await changedButtons.count() > 1) {
  await changedButtons.nth(1).click(); // row 2, Loan Facility
  await page.waitForTimeout(500);
}
await page.screenshot({ path: '/tmp/call-report-verify/3-changed-row.png', fullPage: true });

// Click "Refresh AI Review" and confirm AI Summary populates.
const refreshBtn = page.getByRole('button', { name: 'Refresh AI Review' });
console.log('Refresh AI Review button count:', await refreshBtn.count());
if (await refreshBtn.count() > 0) {
  await refreshBtn.click();
  await page.waitForTimeout(500);
}
const bodyText = await page.locator('body').innerText();
console.log('AI Summary populated:', !bodyText.includes('Click "Refresh AI Review" to generate a summary.'));

// Open the Call Report Result modal.
const viewResultBtn = page.getByRole('button', { name: 'View Call Report Result' });
if (await viewResultBtn.count() > 0) {
  await viewResultBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/call-report-verify/4-result-modal.png', fullPage: true });
}

console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 2));
await browser.close();
```

Run: `cd /tmp/call-report-verify && node drive.mjs 2>&1`

- [ ] **Step 3: Inspect the output and screenshots**

Confirm from the script's stdout:
- `fill sample data button count: 1` (the page action exists and was clicked)
- `Changed button count` is 27 (9 rows × 3 buttons each) or similar non-zero number
- `Refresh AI Review button count: 1`
- `AI Summary populated: true`
- `CONSOLE ERRORS: []` (empty array — no runtime errors)

Read each of the 4 screenshots (`1-page.png` through `4-result-modal.png`) with the Read tool and visually confirm:
- `1-page.png`: the page renders all 8 new section cards in order, no visibly broken layout, no raw error text on screen.
- `2-filled.png`: sample data appears in the Interaction Record fields, the Application Validation table shows some rows marked Changed with their detail panels open, AML/KYC radios are set.
- `3-changed-row.png`: clicking "Changed" on the Loan Facility row revealed its own "Loan Facility — Changed To" detail panel inline.
- `4-result-modal.png`: the read-only result modal opens and shows populated data matching the 8-section structure, not blank/placeholder text.

If any of these checks fail, fix the underlying issue in the relevant task's file and re-run this task's Step 2 script from scratch (do not proceed to declare the plan complete with a known visual or functional defect).

- [ ] **Step 4: Test the Proceed flow end-to-end**

Add to the same script (or run a second short script) confirming: with sample data filled (`interactionType`/`identityStatus`/`callDisposition` all set), the "Proceed to Requirement Checklist" button is enabled and clicking it navigates to a URL containing `/requirement-checklist`. This confirms `canProceed`'s new gate works correctly against the new field names.

- [ ] **Step 5: No commit for this task** — verification only. If Step 3 or Step 4 surfaced a bug, the fix belongs in the task that owns the broken file, as a follow-up commit to that task, not a new task.

---

## Self-Review Notes

- **Spec coverage:** all 8 PDF sections have a dedicated task and file (Tasks 3–8); the `comakers` sync requirement is covered in Task 1 Step 6; the `canProceed` gate change is covered in Task 10 Step 2; sample data is covered in Task 10 Step 2; the result modal rewrite is covered in Task 9; docs are covered in Task 10 Step 6.
- **Placeholder scan:** no TBD/TODO markers; every step has literal code, not descriptions of code.
- **Type consistency:** `ExistingLoanRow`, `LoanTakeOutInfo`, `CallReportComakerChange`, `ValidationItemKey`, `ValidationStatus` are defined once in Task 1 and referenced by the same names in every later task (Tasks 4, 9, 10) — verified no renaming drift across tasks. `setCallReportComakerChange`, `addExistingLoanRow`, `updateExistingLoanRow`, `removeExistingLoanRow` are defined in Task 1 Step 6 and consumed with matching names in Task 4 and Task 10.
