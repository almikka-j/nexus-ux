# Call Report Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Call Report stub page with a full structured-interview form (13 sections, ~150 fields) the officer fills out live during a call with the borrower, using only structured inputs (radio/select/checkbox/chip/date/number) plus two free-text fields.

**Architecture:** One large typed `CallReport` object added to `AdminContext` (same `setCallReport(partial)` pattern already used for every other review step), rendered as a single long scrolling page (`CallReportView`) split across several focused card components — one file per 2-4 spec sections, plus dedicated files for the collateral-entry repeater, the computed-financials block, and the auto-generated call summary. No new libraries; plain MUI components wired directly to `useAdmin()`, matching every other admin review screen in this codebase (react-hook-form is deliberately NOT used here, per design decision).

**Tech Stack:** Next.js App Router, React, MUI v6 (CSS-variable theme), TypeScript, no new dependencies.

## Global Constraints

- No react-hook-form on this page — plain `useState`/`useAdmin()` setters only, consistent with every other admin review screen (Initial Credit Checking, Reconsideration, etc.).
- No auto-calculated Loan Computation fields (Estimated Amortization, Total Interest, Total Repayment, Maturity Value, Preliminary DTI in section 11) — manual entry only, since no approved formula exists in this codebase.
- Only Quick Financial Info ratios (section 6: Total Monthly Income, Total Monthly Obligations, Preliminary Disposable Income, Debt-to-Income Ratio) are auto-computed, via pure functions, never stored in state.
- Checklists that look similar across sections (e.g. "Bank Statements" in section 6 vs. section 11) are fully independent state — no cross-section deriving or sharing.
- `isRenewal: 'yes' | 'no' | ''` is a new field (not in the original written spec verbatim) added specifically to gate section 4's renewal-only fields, since `AdminContext.review.transactionType` isn't set until a later step in the flow.
- Collateral entries are entered once in section 9 and reused (rendered read-only, not re-entered) in section 11.
- Only 3 fields in the whole form are general free-text: `additionalRemarks`, `loanPackageNotes`, `callSummary`. Every other text field is either a short conditional "specify/other" field or a short conditional explanation field tied to one specific selection.
- Every enum field defaults to `''` (empty string, not `null`) for consistency with existing `AdminContext` patterns (e.g. `CreditChecking.decision` uses `'pending'` as its non-null default; here we use `''` since these fields have no natural "pending" value — `''` renders as an unselected `Select`/`RadioGroup`).
- Visual style matches Initial Credit Checking exactly: white rounded (`16px`) cards, `1px solid #EBEDF3` border, `boxShadow: '0 1px 2px rgba(20,23,42,0.04)'`, `p: { xs: 3, md: 4 }`, section heading `fontSize: 16, fontWeight: 700, color: '#14172A'`, helper text `fontSize: 13.5, color: '#8891A6'`.

---

## File Structure

```
src/auth/admin-context.tsx                          — MODIFY: new CallReport type + setters (Task 1)
src/sections/admin/call-report/
  call-report-types.ts                               — CREATE: shared UI constants (option lists for every enum, as {value,label} pairs) (Task 1)
  call-report-computations.ts                         — CREATE: pure functions (toNumber, computeTotalMonthlyIncome, computeTotalMonthlyObligations, computeDisposableIncome, computeDti, compareAmount, compareTerm) (Task 2)
  call-report-summary.ts                              — CREATE: buildCallSummary() pure function (Task 8)
  call-details-card.tsx                               — CREATE: section 1 (Task 3)
  loan-discussion-card.tsx                             — CREATE: section 2 (Task 3)
  residence-household-card.tsx                         — CREATE: section 3 (Task 4)
  employment-business-card.tsx                         — CREATE: section 4 (Task 4)
  organization-membership-card.tsx                     — CREATE: section 5 (Task 4)
  quick-financial-info-card.tsx                        — CREATE: section 6 (Task 5)
  payment-behavior-card.tsx                            — CREATE: section 7 (Task 5)
  officer-observation-card.tsx                         — CREATE: section 8 (Task 5)
  collateral-entry-fields.tsx                          — CREATE: one collateral entry's 10 fields, used by both section 9 (editable) and section 11 (read-only) (Task 6)
  collateral-information-card.tsx                      — CREATE: section 9, repeater using collateral-entry-fields.tsx (Task 6)
  agreed-next-steps-card.tsx                           — CREATE: section 10 (Task 7)
  loan-package-proposal-card.tsx                       — CREATE: section 11 (Task 9)
  call-summary-card.tsx                                — CREATE: section 12 (Task 8)
  additional-remarks-card.tsx                          — CREATE: section 13 (Task 7)
src/sections/admin/call-report-view.tsx               — MODIFY: replace stub, assemble all section cards (Task 10)
PROJECT_OVERVIEW.md                                    — MODIFY: document the new Call Report (Task 11)
```

Rationale for the split: each file maps to exactly one numbered section from the design spec (or, for sections 3-5 and 6-8, small logical groupings of adjacent small sections), so a reviewer can approve/reject one section's implementation independently of its neighbors. `collateral-entry-fields.tsx` is factored out because its field set is used twice (editable in section 9, read-only in section 11) — this is the one place spec reuse maps directly to code reuse.

---

## Task 1: `CallReport` type, state, and setters in `AdminContext`

**Files:**
- Modify: `src/auth/admin-context.tsx`
- Create: `src/sections/admin/call-report/call-report-types.ts`
- Test: manual (no test framework in this repo — verify via `npx tsc --noEmit` and a Playwright smoke walk in Task 10)

**Interfaces:**
- Produces: `CallReport` type (full shape below), `CollateralEntry` type, all enum types, `setCallReport(data: Partial<CallReport>)` (already exists, now typed against the new shape), `addCollateralEntry()`, `updateCollateralEntry(id, data)`, `removeCollateralEntry(id)`. Every later task consumes these exact names.

- [ ] **Step 1: Read the current `CallReport` type and its surrounding context**

Read `src/auth/admin-context.tsx` in full first (it was last read with `CallReport = { approved: boolean }` at the type definition, `callReport: { approved: false }` in `createInitialReview()`, and `setCallReport` already wired in the `useMemo` — confirm this is still accurate before editing, since other tasks may have touched this file since).

- [ ] **Step 2: Replace the `CallReport` type**

In `src/auth/admin-context.tsx`, find:

```ts
export type CallReport = {
  approved: boolean;
};
```

Replace with:

```ts
export type CallType = 'in-person' | 'phone' | 'video';
export type PlaceOfCall = 'branch' | 'residence' | 'business' | 'online' | 'other';
export type CallStatus = 'in-progress' | 'completed' | 'follow-up-needed' | 'unable-to-reach';
export type IdentityConfirmed = 'yes' | 'no' | 'for-verification';

export type LoanPurposeConfirmation = 'confirmed' | 'changed' | 'needs-clarification';
export type RepaymentSource = 'salary' | 'business-income' | 'rental-income' | 'pension' | 'other';

export type ClientUnderstandingItem =
  | 'interest-rate'
  | 'monthly-amortization'
  | 'loan-term'
  | 'processing-fees'
  | 'collateral-requirements'
  | 'required-documents';

export type ClientConcernItem =
  | 'interest-rate'
  | 'loan-amount'
  | 'loan-term'
  | 'monthly-amortization'
  | 'processing-fees'
  | 'collateral'
  | 'required-documents'
  | 'processing-time'
  | 'other';

export type ResidenceYears = 'lt-1' | '1-2' | '3-5' | 'gt-5';
export type ResidenceStatus =
  | 'owned'
  | 'mortgaged'
  | 'rented'
  | 'living-with-relatives'
  | 'company-provided'
  | 'other';
export type YesNoPreferNot = 'yes' | 'no' | 'prefer-not-to-answer';

export type MainIncomeSource = 'employment' | 'business' | 'both' | 'other';
export type TenureRange = 'lt-1' | '1-3' | '3-5' | 'gt-5';
export type IncomeStability = 'stable' | 'seasonal' | 'irregular' | 'undetermined';
export type IncomeTrend = 'increasing' | 'stable' | 'decreasing' | 'undetermined';
export type IncomeChange = 'increased' | 'no-change' | 'decreased' | 'not-verified';

export type MembershipType =
  | 'civic-social'
  | 'professional'
  | 'business'
  | 'cooperative'
  | 'community'
  | 'other';
export type MembershipStanding = 'good-standing' | 'with-concern' | 'not-verified';

export type SupportingDocItem =
  | 'payslip'
  | 'itr'
  | 'bir-2316'
  | 'coe'
  | 'bank-statement'
  | 'business-records'
  | 'utility-bills'
  | 'credit-card-statements'
  | 'none-yet';

export type ElectricityPayment =
  | 'fully-paid-on-time'
  | 'occasionally-delayed'
  | 'frequently-delayed'
  | 'with-unpaid-balance'
  | 'not-borrowers-name'
  | 'not-applicable'
  | 'for-verification';
export type CreditCardPayment =
  | 'fully-paid-on-time'
  | 'pays-more-than-minimum'
  | 'minimum-only'
  | 'occasionally-delayed'
  | 'frequently-delayed'
  | 'no-credit-card'
  | 'for-verification';
export type OtherLoanRepayment =
  | 'on-time'
  | 'minor-delays'
  | 'major-delays'
  | 'no-existing-loan'
  | 'for-verification';
export type YesNoVerify = 'yes' | 'no' | 'for-verification';

export type OfficerObservationItem =
  | 'cooperative'
  | 'responsive'
  | 'transparent'
  | 'prepared'
  | 'understands-request'
  | 'answers-clear'
  | 'answers-consistent'
  | 'hesitant'
  | 'info-incomplete'
  | 'answers-inconsistent'
  | 'requires-verification'
  | 'possible-risk';

export type CollateralOffered = 'yes' | 'no' | 'tbd';
export type CollateralType =
  | 'real-estate'
  | 'vehicle'
  | 'equipment'
  | 'inventory'
  | 'receivables'
  | 'deposit'
  | 'personal-guarantee'
  | 'corporate-guarantee'
  | 'other';
export type DocsAvailable = 'yes' | 'no' | 'pending';
export type ExistingLien = 'yes' | 'no' | 'unknown';
export type RequiresAppraisal = 'yes' | 'no' | 'tbd';

export type CollateralEntry = {
  id: string;
  type: CollateralType | '';
  description: string;
  quantity: string;
  registeredOwner: string;
  ownerRelationship: string;
  location: string;
  estimatedValue: string;
  ownershipDocsAvailable: DocsAvailable | '';
  existingLien: ExistingLien | '';
  requiresAppraisal: RequiresAppraisal | '';
};

export type NextStepItem =
  | 'submit-proof-of-income'
  | 'submit-bank-statements'
  | 'submit-business-documents'
  | 'submit-utility-bills'
  | 'submit-credit-card-statements'
  | 'verify-employment'
  | 'verify-business'
  | 'verify-residence'
  | 'conduct-site-visit'
  | 'submit-collateral-documents'
  | 'request-appraisal'
  | 'schedule-follow-up-call'
  | 'proceed-to-next-process'
  | 'other';

export type ResponsibleParty = 'borrower' | 'account-officer' | 'credit-officer' | 'other';

export type InterestRateBasis = 'monthly' | 'annual';
export type ComputationType = 'diminishing-balance' | 'add-on-rate' | 'other';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'other';

export type AdjustmentReason =
  | 'income-capacity'
  | 'existing-obligations'
  | 'collateral-value'
  | 'credit-risk'
  | 'exceeds-affordability'
  | 'borrower-requested'
  | 'officer-recommendation'
  | 'other';

export type RequiredDocItem =
  | 'latest-payslip'
  | 'itr'
  | 'bir-2316'
  | 'coe'
  | 'bank-statements'
  | 'business-registration'
  | 'financial-statements'
  | 'utility-bills'
  | 'credit-card-statements'
  | 'collateral-ownership-docs'
  | 'tax-declaration'
  | 'transfer-certificate-title'
  | 'vehicle-registration'
  | 'appraisal-report'
  | 'co-maker-documents'
  | 'guarantor-documents'
  | 'other';

export type ConditionItem =
  | 'income-verification'
  | 'employment-verification'
  | 'business-verification'
  | 'residence-verification'
  | 'satisfactory-bureau-checking'
  | 'collateral-appraisal'
  | 'complete-documents'
  | 'additional-collateral'
  | 'co-maker-or-guarantor'
  | 'reduction-of-amount'
  | 'adjustment-of-term'
  | 'other';

export type PreliminaryRecommendation =
  | 'proceed-as-requested'
  | 'proceed-with-revised-terms'
  | 'proceed-with-conditions'
  | 'needs-additional-verification'
  | 'schedule-follow-up'
  | 'hold'
  | 'do-not-proceed';

export type CallReport = {
  approved: boolean;

  // 1. Call Details
  callDate: string;
  callTime: string;
  callType: CallType | '';
  placeOfCall: PlaceOfCall | '';
  placeOfCallOther: string;
  clientRepresentative: string;
  pgRepresentative: string;
  callStatus: CallStatus | '';
  identityConfirmed: IdentityConfirmed | '';

  // 2. Loan Discussion
  loanPurposeConfirmation: LoanPurposeConfirmation | '';
  finalLoanPurpose: string;
  specificUseOfProceeds: string;
  targetReleaseDate: string;
  primaryRepaymentSource: RepaymentSource | '';
  otherRepaymentSource: string;
  clientUnderstanding: ClientUnderstandingItem[];
  clientConcerns: ClientConcernItem[];
  concernNotes: string;

  // 3. Residence and Household Information
  yearsAtResidence: ResidenceYears | '';
  residenceStatus: ResidenceStatus | '';
  residenceStatusOther: string;
  numberOfDependents: string;
  numberOfIncomeEarners: string;
  supportingMultipleFamilies: YesNoPreferNot | '';

  // 4. Employment or Business Information
  mainIncomeSource: MainIncomeSource | '';
  otherIncomeSource: string;
  employmentTenure: TenureRange | '';
  incomeStability: IncomeStability | '';
  incomeTrend: IncomeTrend | '';
  isRenewal: 'yes' | 'no' | '';
  incomeChangeSincePrevious: IncomeChange | '';
  previousMonthlyIncome: string;
  currentMonthlyIncome: string;
  incomeChangeEffectiveDate: string;

  // 5. Organization Membership
  isOrgMember: 'yes' | 'no' | '';
  membershipType: MembershipType | '';
  organizationName: string;
  membershipYears: string;
  membershipStanding: MembershipStanding | '';

  // 6. Quick Financial Information
  declaredGrossMonthlyIncome: string;
  declaredNetMonthlyIncome: string;
  otherRecurringMonthlyIncome: string;
  estimatedMonthlyHouseholdExpenses: string;
  existingMonthlyLoanPayments: string;
  monthlyCreditCardPayments: string;
  otherRecurringMonthlyObligations: string;
  supportingDocsAvailable: SupportingDocItem[];

  // 7. Payment Behavior
  electricityPayment: ElectricityPayment | '';
  creditCardPayment: CreditCardPayment | '';
  otherLoanRepayment: OtherLoanRepayment | '';
  hasReturnedChecks: YesNoVerify | '';
  hasPastDueObligations: YesNoVerify | '';
  hasPendingCases: YesNoVerify | '';
  paymentBehaviorExplanation: string;

  // 8. Officer Observation
  officerObservations: OfficerObservationItem[];
  additionalObservationNotes: string;

  // 9. Collateral Information
  collateralOffered: CollateralOffered | '';
  collateralEntries: CollateralEntry[];

  // 10. Agreed Next Steps
  nextSteps: NextStepItem[];
  responsibleParty: ResponsibleParty | '';
  nextStepsDueDate: string;
  followUpDate: string;
  nextStepsInstructions: string;

  // 11. Loan Package Proposal
  proposedLoanAmount: string;
  proposedLoanTerm: string;
  proposedLoanFacility: string;
  proposedInterestRate: string;
  interestRateBasis: InterestRateBasis | '';
  computationType: ComputationType | '';
  computationTypeOther: string;
  paymentFrequency: PaymentFrequency | '';
  paymentFrequencyOther: string;
  numberOfPayments: string;
  firstPaymentDate: string;
  proposedReleaseDate: string;
  gracePeriod: string;
  finalUseOfProceeds: string;
  proposalPrimaryRepaymentSource: RepaymentSource | '';
  secondaryRepaymentSource: string;
  estimatedAmortization: string;
  estimatedTotalInterest: string;
  estimatedTotalRepayment: string;
  estimatedMaturityValue: string;
  preliminaryDti: string;
  disposableIncomeAfterAmortization: string;
  adjustmentReason: AdjustmentReason | '';
  adjustmentReasonOther: string;
  collateralRequirement:
    | 'sufficient'
    | 'additional-required'
    | 'subject-to-appraisal'
    | 'tbd'
    | 'may-proceed-without'
    | '';
  requiredDocuments: RequiredDocItem[];
  conditionsBeforeProceeding: ConditionItem[];
  preliminaryRecommendation: PreliminaryRecommendation | '';
  recommendationReason: string;
  loanPackageNotes: string;

  // 12. Call Summary
  callSummary: string;
  callSummaryEdited: boolean;

  // 13. Additional Remarks
  additionalRemarks: string;
};
```

- [ ] **Step 3: Update `createInitialReview()`'s default `callReport` value**

Find in `src/auth/admin-context.tsx`:

```ts
callReport: { approved: false },
```

Replace with:

```ts
callReport: {
  approved: false,
  callDate: '',
  callTime: '',
  callType: '',
  placeOfCall: '',
  placeOfCallOther: '',
  clientRepresentative: '',
  pgRepresentative: '',
  callStatus: '',
  identityConfirmed: '',
  loanPurposeConfirmation: '',
  finalLoanPurpose: '',
  specificUseOfProceeds: '',
  targetReleaseDate: '',
  primaryRepaymentSource: '',
  otherRepaymentSource: '',
  clientUnderstanding: [],
  clientConcerns: [],
  concernNotes: '',
  yearsAtResidence: '',
  residenceStatus: '',
  residenceStatusOther: '',
  numberOfDependents: '',
  numberOfIncomeEarners: '',
  supportingMultipleFamilies: '',
  mainIncomeSource: '',
  otherIncomeSource: '',
  employmentTenure: '',
  incomeStability: '',
  incomeTrend: '',
  isRenewal: '',
  incomeChangeSincePrevious: '',
  previousMonthlyIncome: '',
  currentMonthlyIncome: '',
  incomeChangeEffectiveDate: '',
  isOrgMember: '',
  membershipType: '',
  organizationName: '',
  membershipYears: '',
  membershipStanding: '',
  declaredGrossMonthlyIncome: '',
  declaredNetMonthlyIncome: '',
  otherRecurringMonthlyIncome: '',
  estimatedMonthlyHouseholdExpenses: '',
  existingMonthlyLoanPayments: '',
  monthlyCreditCardPayments: '',
  otherRecurringMonthlyObligations: '',
  supportingDocsAvailable: [],
  electricityPayment: '',
  creditCardPayment: '',
  otherLoanRepayment: '',
  hasReturnedChecks: '',
  hasPastDueObligations: '',
  hasPendingCases: '',
  paymentBehaviorExplanation: '',
  officerObservations: [],
  additionalObservationNotes: '',
  collateralOffered: '',
  collateralEntries: [],
  nextSteps: [],
  responsibleParty: '',
  nextStepsDueDate: '',
  followUpDate: '',
  nextStepsInstructions: '',
  proposedLoanAmount: '',
  proposedLoanTerm: '',
  proposedLoanFacility: '',
  proposedInterestRate: '',
  interestRateBasis: '',
  computationType: '',
  computationTypeOther: '',
  paymentFrequency: '',
  paymentFrequencyOther: '',
  numberOfPayments: '',
  firstPaymentDate: '',
  proposedReleaseDate: '',
  gracePeriod: '',
  finalUseOfProceeds: '',
  proposalPrimaryRepaymentSource: '',
  secondaryRepaymentSource: '',
  estimatedAmortization: '',
  estimatedTotalInterest: '',
  estimatedTotalRepayment: '',
  estimatedMaturityValue: '',
  preliminaryDti: '',
  disposableIncomeAfterAmortization: '',
  adjustmentReason: '',
  adjustmentReasonOther: '',
  collateralRequirement: '',
  requiredDocuments: [],
  conditionsBeforeProceeding: [],
  preliminaryRecommendation: '',
  recommendationReason: '',
  loanPackageNotes: '',
  callSummary: '',
  callSummaryEdited: false,
  additionalRemarks: '',
},
```

- [ ] **Step 4: Add collateral-entry setters to `AdminContextValue` and the provider**

Find in `src/auth/admin-context.tsx`:

```ts
type AdminContextValue = AdminState & {
  setAdminUser: (user: AdminUser) => void;
  setCreditChecking: (data: Partial<CreditChecking>) => void;
  setCibiForm: (data: Partial<CibiForm>) => void;
  setLoandexUpload: (data: Partial<LoandexUpload>) => void;
  setCicUpload: (data: Partial<BureauUpload>) => void;
  setCmapUpload: (data: Partial<BureauUpload>) => void;
  setNfisBapUpload: (data: Partial<BureauUpload>) => void;
  setReconsideration: (data: Partial<Reconsideration>) => void;
  setCallReport: (data: Partial<CallReport>) => void;
  setTransactionType: (type: TransactionType) => void;
  setRequirementChecklist: (data: Partial<RequirementChecklist>) => void;
  markStepEntered: (step: ReviewStep) => void;
  addToNegativeList: (entry: Omit<NegativeListEntry, 'recordedAt'>) => void;
  resetReview: () => void;
  logout: () => void;
};
```

Replace with (adding three new setters after `setCallReport`):

```ts
type AdminContextValue = AdminState & {
  setAdminUser: (user: AdminUser) => void;
  setCreditChecking: (data: Partial<CreditChecking>) => void;
  setCibiForm: (data: Partial<CibiForm>) => void;
  setLoandexUpload: (data: Partial<LoandexUpload>) => void;
  setCicUpload: (data: Partial<BureauUpload>) => void;
  setCmapUpload: (data: Partial<BureauUpload>) => void;
  setNfisBapUpload: (data: Partial<BureauUpload>) => void;
  setReconsideration: (data: Partial<Reconsideration>) => void;
  setCallReport: (data: Partial<CallReport>) => void;
  addCollateralEntry: () => void;
  updateCollateralEntry: (id: string, data: Partial<CollateralEntry>) => void;
  removeCollateralEntry: (id: string) => void;
  setTransactionType: (type: TransactionType) => void;
  setRequirementChecklist: (data: Partial<RequirementChecklist>) => void;
  markStepEntered: (step: ReviewStep) => void;
  addToNegativeList: (entry: Omit<NegativeListEntry, 'recordedAt'>) => void;
  resetReview: () => void;
  logout: () => void;
};
```

Find the existing `setCallReport` implementation inside the `useMemo`:

```ts
      setCallReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, callReport: { ...prev.review.callReport, ...data } },
        })),
```

Immediately after it, add:

```ts
      addCollateralEntry: () =>
        setState((prev) => {
          const newEntry: CollateralEntry = {
            id: crypto.randomUUID(),
            type: '',
            description: '',
            quantity: '',
            registeredOwner: '',
            ownerRelationship: '',
            location: '',
            estimatedValue: '',
            ownershipDocsAvailable: '',
            existingLien: '',
            requiresAppraisal: '',
          };
          return {
            ...prev,
            review: {
              ...prev.review,
              callReport: {
                ...prev.review.callReport,
                collateralEntries: [...prev.review.callReport.collateralEntries, newEntry],
              },
            },
          };
        }),
      updateCollateralEntry: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              collateralEntries: prev.review.callReport.collateralEntries.map((entry) =>
                entry.id === id ? { ...entry, ...data } : entry
              ),
            },
          },
        })),
      removeCollateralEntry: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              collateralEntries: prev.review.callReport.collateralEntries.filter(
                (entry) => entry.id !== id
              ),
            },
          },
        })),
```

- [ ] **Step 5: Create the UI option-list constants file**

Create `src/sections/admin/call-report/call-report-types.ts`:

```ts
import type {
  CallType,
  PlaceOfCall,
  CallStatus,
  IdentityConfirmed,
  LoanPurposeConfirmation,
  RepaymentSource,
  ClientUnderstandingItem,
  ClientConcernItem,
  ResidenceYears,
  ResidenceStatus,
  YesNoPreferNot,
  MainIncomeSource,
  TenureRange,
  IncomeStability,
  IncomeTrend,
  IncomeChange,
  MembershipType,
  MembershipStanding,
  SupportingDocItem,
  ElectricityPayment,
  CreditCardPayment,
  OtherLoanRepayment,
  YesNoVerify,
  OfficerObservationItem,
  CollateralOffered,
  CollateralType,
  DocsAvailable,
  ExistingLien,
  RequiresAppraisal,
  NextStepItem,
  ResponsibleParty,
  InterestRateBasis,
  ComputationType,
  PaymentFrequency,
  AdjustmentReason,
  RequiredDocItem,
  ConditionItem,
  PreliminaryRecommendation,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Every enum field in CallReport has its {value,label} option list here, so
// every card component imports labels from one place instead of repeating
// display strings inline.
// ----------------------------------------------------------------------

export type Option<T extends string> = { value: T; label: string };

export const CALL_TYPE_OPTIONS: Option<CallType>[] = [
  { value: 'in-person', label: 'In Person' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'video', label: 'Video Call' },
];

export const PLACE_OF_CALL_OPTIONS: Option<PlaceOfCall>[] = [
  { value: 'branch', label: 'PG Finance Branch' },
  { value: 'residence', label: 'Client Residence' },
  { value: 'business', label: 'Business Address' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

export const CALL_STATUS_OPTIONS: Option<CallStatus>[] = [
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'follow-up-needed', label: 'Follow-up Needed' },
  { value: 'unable-to-reach', label: 'Unable to Reach' },
];

export const IDENTITY_CONFIRMED_OPTIONS: Option<IdentityConfirmed>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'for-verification', label: 'For Verification' },
];

export const LOAN_PURPOSE_CONFIRMATION_OPTIONS: Option<LoanPurposeConfirmation>[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'changed', label: 'Changed' },
  { value: 'needs-clarification', label: 'Needs Clarification' },
];

export const REPAYMENT_SOURCE_OPTIONS: Option<RepaymentSource>[] = [
  { value: 'salary', label: 'Salary' },
  { value: 'business-income', label: 'Business Income' },
  { value: 'rental-income', label: 'Rental Income' },
  { value: 'pension', label: 'Pension' },
  { value: 'other', label: 'Other' },
];

export const CLIENT_UNDERSTANDING_OPTIONS: Option<ClientUnderstandingItem>[] = [
  { value: 'interest-rate', label: 'Interest Rate' },
  { value: 'monthly-amortization', label: 'Estimated Monthly Amortization' },
  { value: 'loan-term', label: 'Loan Term' },
  { value: 'processing-fees', label: 'Processing Fees' },
  { value: 'collateral-requirements', label: 'Collateral Requirements' },
  { value: 'required-documents', label: 'Required Documents' },
];

export const CLIENT_CONCERN_OPTIONS: Option<ClientConcernItem>[] = [
  { value: 'interest-rate', label: 'Interest Rate' },
  { value: 'loan-amount', label: 'Loan Amount' },
  { value: 'loan-term', label: 'Loan Term' },
  { value: 'monthly-amortization', label: 'Monthly Amortization' },
  { value: 'processing-fees', label: 'Processing Fees' },
  { value: 'collateral', label: 'Collateral' },
  { value: 'required-documents', label: 'Required Documents' },
  { value: 'processing-time', label: 'Processing Time' },
  { value: 'other', label: 'Other' },
];

export const RESIDENCE_YEARS_OPTIONS: Option<ResidenceYears>[] = [
  { value: 'lt-1', label: 'Less than 1 year' },
  { value: '1-2', label: '1–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: 'gt-5', label: 'More than 5 years' },
];

export const RESIDENCE_STATUS_OPTIONS: Option<ResidenceStatus>[] = [
  { value: 'owned', label: 'Owned' },
  { value: 'mortgaged', label: 'Mortgaged' },
  { value: 'rented', label: 'Rented' },
  { value: 'living-with-relatives', label: 'Living with Relatives' },
  { value: 'company-provided', label: 'Company-provided' },
  { value: 'other', label: 'Other' },
];

export const YES_NO_PREFER_NOT_OPTIONS: Option<YesNoPreferNot>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'prefer-not-to-answer', label: 'Prefer Not to Answer' },
];

export const MAIN_INCOME_SOURCE_OPTIONS: Option<MainIncomeSource>[] = [
  { value: 'employment', label: 'Employment' },
  { value: 'business', label: 'Business' },
  { value: 'both', label: 'Both' },
  { value: 'other', label: 'Other' },
];

export const TENURE_RANGE_OPTIONS: Option<TenureRange>[] = [
  { value: 'lt-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-5', label: '3–5 years' },
  { value: 'gt-5', label: 'More than 5 years' },
];

export const INCOME_STABILITY_OPTIONS: Option<IncomeStability>[] = [
  { value: 'stable', label: 'Stable' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'undetermined', label: 'Cannot Be Determined' },
];

export const INCOME_TREND_OPTIONS: Option<IncomeTrend>[] = [
  { value: 'increasing', label: 'Increasing' },
  { value: 'stable', label: 'Stable' },
  { value: 'decreasing', label: 'Decreasing' },
  { value: 'undetermined', label: 'Cannot Be Determined' },
];

export const INCOME_CHANGE_OPTIONS: Option<IncomeChange>[] = [
  { value: 'increased', label: 'Increased' },
  { value: 'no-change', label: 'No Change' },
  { value: 'decreased', label: 'Decreased' },
  { value: 'not-verified', label: 'Not Verified' },
];

export const MEMBERSHIP_TYPE_OPTIONS: Option<MembershipType>[] = [
  { value: 'civic-social', label: 'Civic or Social Club' },
  { value: 'professional', label: 'Professional Organization' },
  { value: 'business', label: 'Business Organization' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'community', label: 'Community Organization' },
  { value: 'other', label: 'Other' },
];

export const MEMBERSHIP_STANDING_OPTIONS: Option<MembershipStanding>[] = [
  { value: 'good-standing', label: 'Good Standing' },
  { value: 'with-concern', label: 'With Concern' },
  { value: 'not-verified', label: 'Not Verified' },
];

export const SUPPORTING_DOC_OPTIONS: Option<SupportingDocItem>[] = [
  { value: 'payslip', label: 'Payslip' },
  { value: 'itr', label: 'ITR' },
  { value: 'bir-2316', label: 'BIR Form 2316' },
  { value: 'coe', label: 'Certificate of Employment' },
  { value: 'bank-statement', label: 'Bank Statement' },
  { value: 'business-records', label: 'Business Records' },
  { value: 'utility-bills', label: 'Utility Bills' },
  { value: 'credit-card-statements', label: 'Credit-card Statements' },
  { value: 'none-yet', label: 'None Yet' },
];

export const ELECTRICITY_PAYMENT_OPTIONS: Option<ElectricityPayment>[] = [
  { value: 'fully-paid-on-time', label: 'Fully Paid On or Before Due Date' },
  { value: 'occasionally-delayed', label: 'Occasionally Delayed' },
  { value: 'frequently-delayed', label: 'Frequently Delayed' },
  { value: 'with-unpaid-balance', label: 'With Unpaid Balance' },
  { value: 'not-borrowers-name', label: "Not Under Borrower's Name" },
  { value: 'not-applicable', label: 'Not Applicable' },
  { value: 'for-verification', label: 'For Verification' },
];

export const CREDIT_CARD_PAYMENT_OPTIONS: Option<CreditCardPayment>[] = [
  { value: 'fully-paid-on-time', label: 'Fully Paid On Time' },
  { value: 'pays-more-than-minimum', label: 'Pays More Than the Minimum' },
  { value: 'minimum-only', label: 'Minimum Payment Only' },
  { value: 'occasionally-delayed', label: 'Occasionally Delayed' },
  { value: 'frequently-delayed', label: 'Frequently Delayed' },
  { value: 'no-credit-card', label: 'No Credit Card' },
  { value: 'for-verification', label: 'For Verification' },
];

export const OTHER_LOAN_REPAYMENT_OPTIONS: Option<OtherLoanRepayment>[] = [
  { value: 'on-time', label: 'On Time' },
  { value: 'minor-delays', label: 'With Minor Delays' },
  { value: 'major-delays', label: 'With Major Delays' },
  { value: 'no-existing-loan', label: 'No Existing Loan' },
  { value: 'for-verification', label: 'For Verification' },
];

export const YES_NO_VERIFY_OPTIONS: Option<YesNoVerify>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'for-verification', label: 'For Verification' },
];

export const OFFICER_OBSERVATION_POSITIVE_OPTIONS: Option<OfficerObservationItem>[] = [
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'responsive', label: 'Responsive' },
  { value: 'transparent', label: 'Transparent' },
  { value: 'prepared', label: 'Prepared with Information' },
  { value: 'understands-request', label: 'Understands the Loan Request' },
  { value: 'answers-clear', label: 'Answers Are Clear' },
  { value: 'answers-consistent', label: 'Answers Are Consistent' },
];

export const OFFICER_OBSERVATION_ATTENTION_OPTIONS: Option<OfficerObservationItem>[] = [
  { value: 'hesitant', label: 'Hesitant' },
  { value: 'info-incomplete', label: 'Information Incomplete' },
  { value: 'answers-inconsistent', label: 'Answers Are Inconsistent' },
  { value: 'requires-verification', label: 'Requires Additional Verification' },
  { value: 'possible-risk', label: 'Possible Risk Concern' },
];

export const COLLATERAL_OFFERED_OPTIONS: Option<CollateralOffered>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'tbd', label: 'To Be Determined' },
];

export const COLLATERAL_TYPE_OPTIONS: Option<CollateralType>[] = [
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'receivables', label: 'Receivables' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'personal-guarantee', label: 'Personal Guarantee' },
  { value: 'corporate-guarantee', label: 'Corporate Guarantee' },
  { value: 'other', label: 'Other' },
];

export const DOCS_AVAILABLE_OPTIONS: Option<DocsAvailable>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'pending', label: 'Pending' },
];

export const EXISTING_LIEN_OPTIONS: Option<ExistingLien>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];

export const REQUIRES_APPRAISAL_OPTIONS: Option<RequiresAppraisal>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'tbd', label: 'To Be Determined' },
];

export const NEXT_STEP_OPTIONS: Option<NextStepItem>[] = [
  { value: 'submit-proof-of-income', label: 'Submit Proof of Income' },
  { value: 'submit-bank-statements', label: 'Submit Bank Statements' },
  { value: 'submit-business-documents', label: 'Submit Business Documents' },
  { value: 'submit-utility-bills', label: 'Submit Utility Bills' },
  { value: 'submit-credit-card-statements', label: 'Submit Credit-card Statements' },
  { value: 'verify-employment', label: 'Verify Employment' },
  { value: 'verify-business', label: 'Verify Business' },
  { value: 'verify-residence', label: 'Verify Residence' },
  { value: 'conduct-site-visit', label: 'Conduct Site Visit' },
  { value: 'submit-collateral-documents', label: 'Submit Collateral Documents' },
  { value: 'request-appraisal', label: 'Request Appraisal' },
  { value: 'schedule-follow-up-call', label: 'Schedule Follow-up Call' },
  { value: 'proceed-to-next-process', label: 'Proceed to Next Process' },
  { value: 'other', label: 'Other' },
];

export const RESPONSIBLE_PARTY_OPTIONS: Option<ResponsibleParty>[] = [
  { value: 'borrower', label: 'Borrower' },
  { value: 'account-officer', label: 'Account Officer' },
  { value: 'credit-officer', label: 'Credit Officer' },
  { value: 'other', label: 'Other' },
];

export const INTEREST_RATE_BASIS_OPTIONS: Option<InterestRateBasis>[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export const COMPUTATION_TYPE_OPTIONS: Option<ComputationType>[] = [
  { value: 'diminishing-balance', label: 'Diminishing Balance' },
  { value: 'add-on-rate', label: 'Add-on Rate' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_FREQUENCY_OPTIONS: Option<PaymentFrequency>[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'other', label: 'Other' },
];

export const ADJUSTMENT_REASON_OPTIONS: Option<AdjustmentReason>[] = [
  { value: 'income-capacity', label: 'Income Capacity' },
  { value: 'existing-obligations', label: 'Existing Obligations' },
  { value: 'collateral-value', label: 'Collateral Value' },
  { value: 'credit-risk', label: 'Credit Risk' },
  { value: 'exceeds-affordability', label: 'Requested Amount Exceeds Preliminary Affordability' },
  { value: 'borrower-requested', label: 'Borrower Requested an Adjustment' },
  { value: 'officer-recommendation', label: 'Officer Recommendation' },
  { value: 'other', label: 'Other' },
];

export const REQUIRED_DOC_OPTIONS: Option<RequiredDocItem>[] = [
  { value: 'latest-payslip', label: 'Latest Payslip' },
  { value: 'itr', label: 'ITR' },
  { value: 'bir-2316', label: 'BIR Form 2316' },
  { value: 'coe', label: 'Certificate of Employment' },
  { value: 'bank-statements', label: 'Bank Statements' },
  { value: 'business-registration', label: 'Business Registration Documents' },
  { value: 'financial-statements', label: 'Financial Statements' },
  { value: 'utility-bills', label: 'Utility Bills' },
  { value: 'credit-card-statements', label: 'Credit-card Statements' },
  { value: 'collateral-ownership-docs', label: 'Collateral Ownership Documents' },
  { value: 'tax-declaration', label: 'Tax Declaration' },
  { value: 'transfer-certificate-title', label: 'Transfer Certificate of Title' },
  { value: 'vehicle-registration', label: 'Vehicle Registration Documents' },
  { value: 'appraisal-report', label: 'Appraisal Report' },
  { value: 'co-maker-documents', label: 'Co-maker Documents' },
  { value: 'guarantor-documents', label: 'Guarantor Documents' },
  { value: 'other', label: 'Other' },
];

export const CONDITION_OPTIONS: Option<ConditionItem>[] = [
  { value: 'income-verification', label: 'Subject to Income Verification' },
  { value: 'employment-verification', label: 'Subject to Employment Verification' },
  { value: 'business-verification', label: 'Subject to Business Verification' },
  { value: 'residence-verification', label: 'Subject to Residence Verification' },
  { value: 'satisfactory-bureau-checking', label: 'Subject to Satisfactory Bureau Checking' },
  { value: 'collateral-appraisal', label: 'Subject to Collateral Appraisal' },
  { value: 'complete-documents', label: 'Subject to Submission of Complete Documents' },
  { value: 'additional-collateral', label: 'Subject to Additional Collateral' },
  { value: 'co-maker-or-guarantor', label: 'Subject to Co-maker or Guarantor' },
  { value: 'reduction-of-amount', label: 'Subject to Reduction of Loan Amount' },
  { value: 'adjustment-of-term', label: 'Subject to Adjustment of Loan Term' },
  { value: 'other', label: 'Other' },
];

export const COLLATERAL_REQUIREMENT_OPTIONS: {
  value: 'sufficient' | 'additional-required' | 'subject-to-appraisal' | 'tbd' | 'may-proceed-without';
  label: string;
}[] = [
  { value: 'sufficient', label: 'Existing Collateral Appears Sufficient' },
  { value: 'additional-required', label: 'Additional Collateral Required' },
  { value: 'subject-to-appraisal', label: 'Subject to Appraisal' },
  { value: 'tbd', label: 'Collateral Still to Be Determined' },
  { value: 'may-proceed-without', label: 'May Proceed Without Collateral' },
];

export const PRELIMINARY_RECOMMENDATION_OPTIONS: Option<PreliminaryRecommendation>[] = [
  { value: 'proceed-as-requested', label: 'Proceed as Requested' },
  { value: 'proceed-with-revised-terms', label: 'Proceed with Revised Terms' },
  { value: 'proceed-with-conditions', label: 'Proceed with Conditions' },
  { value: 'needs-additional-verification', label: 'Needs Additional Verification' },
  { value: 'schedule-follow-up', label: 'Schedule Follow-up' },
  { value: 'hold', label: 'Hold' },
  { value: 'do-not-proceed', label: 'Do Not Proceed' },
];

// Shared MUI sx used by every text/select field across all Call Report cards,
// matching the rounded-field style already used on Initial Credit Checking.
export const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
};

// Shared card container sx, matching Initial Credit Checking's white rounded cards.
export const cardSx = {
  p: { xs: 3, md: 4 },
  borderRadius: '16px',
  bgcolor: 'common.white',
  border: '1px solid #EBEDF3',
  boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
};
```

- [ ] **Step 4: Typecheck**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: no errors. (`call-report-types.ts` isn't imported anywhere yet, so it can't produce errors on its own; this run mainly confirms the `admin-context.tsx` edits compile — e.g. no leftover reference to the old `CallReport = { approved: boolean }` shape anywhere else in the codebase.)

- [ ] **Step 5: Lint**

Run: `npx eslint src/auth/admin-context.tsx src/sections/admin/call-report/call-report-types.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx src/sections/admin/call-report/call-report-types.ts
git commit -m "Add full CallReport type, collateral setters, and shared option lists"
```

---

## Task 2: Computed-values module (section 6 + section 11 comparisons)

**Files:**
- Create: `src/sections/admin/call-report/call-report-computations.ts`

**Interfaces:**
- Consumes: `CallReport` type from Task 1.
- Produces: `toNumber(value: string): number`, `computeTotalMonthlyIncome(cr: CallReport): number`, `computeTotalMonthlyObligations(cr: CallReport): number`, `computeDisposableIncome(cr: CallReport): number`, `computeDti(cr: CallReport): number`, `compareAmount(requested: number, proposed: number): 'same' | 'lower' | 'higher'`, `compareTerm(requested: number, proposed: number): 'same' | 'shorter' | 'longer'`. Tasks 5 and 9 consume these exact names.

- [ ] **Step 1: Create the file**

Create `src/sections/admin/call-report/call-report-computations.ts`:

```ts
import type { CallReport } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Pure functions only — no React, no state. Section 6's four ratios and
// section 11's requested-vs-proposed comparisons are always derived at
// render time from CallReport's raw string fields, never stored, so they
// can never drift out of sync with their inputs.
// ----------------------------------------------------------------------

export function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function computeTotalMonthlyIncome(cr: CallReport): number {
  return toNumber(cr.declaredNetMonthlyIncome) + toNumber(cr.otherRecurringMonthlyIncome);
}

export function computeTotalMonthlyObligations(cr: CallReport): number {
  return (
    toNumber(cr.estimatedMonthlyHouseholdExpenses) +
    toNumber(cr.existingMonthlyLoanPayments) +
    toNumber(cr.monthlyCreditCardPayments) +
    toNumber(cr.otherRecurringMonthlyObligations)
  );
}

export function computeDisposableIncome(cr: CallReport): number {
  return Math.max(0, computeTotalMonthlyIncome(cr) - computeTotalMonthlyObligations(cr));
}

export function computeDti(cr: CallReport): number {
  const income = computeTotalMonthlyIncome(cr);
  if (income <= 0) return 0;
  return Math.min(100, (computeTotalMonthlyObligations(cr) / income) * 100);
}

export function compareAmount(requested: number, proposed: number): 'same' | 'lower' | 'higher' {
  if (proposed === requested) return 'same';
  return proposed < requested ? 'lower' : 'higher';
}

export function compareTerm(requested: number, proposed: number): 'same' | 'shorter' | 'longer' {
  if (proposed === requested) return 'same';
  return proposed < requested ? 'shorter' : 'longer';
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification via Node**

Run:
```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsx -e "
const { toNumber, computeDti } = require('./src/sections/admin/call-report/call-report-computations.ts');
" 2>&1 | head -5
```
This will likely fail (no `tsx`/direct-require of a `.ts` file with `export` syntax outside a bundler) — that's expected and fine; this module gets its real exercise in Task 5's UI (Quick Financial Info card) and is simple enough (7 pure arithmetic functions) that a manual code read is sufficient verification at this stage. Skip to Step 4.

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/call-report-computations.ts
git commit -m "Add pure computation functions for Call Report financial ratios"
```

---

## Task 3: Section 1 (Call Details) and Section 2 (Loan Discussion) cards

**Files:**
- Create: `src/sections/admin/call-report/call-details-card.tsx`
- Create: `src/sections/admin/call-report/loan-discussion-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` (`review.callReport`, `setCallReport`), `useRegistration()` (`application.financialInfo.loanPurpose` for the Final Loan Purpose default), option constants + `fieldSx`/`cardSx` from Task 1's `call-report-types.ts`.
- Produces: `CallDetailsCard` (no props), `LoanDiscussionCard` (no props). Task 10 imports and renders both directly.

- [ ] **Step 1: Create `CallDetailsCard`**

Create `src/sections/admin/call-report/call-details-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

import { useAdmin } from 'src/auth/admin-context';

import {
  cardSx,
  fieldSx,
  CALL_TYPE_OPTIONS,
  PLACE_OF_CALL_OPTIONS,
  CALL_STATUS_OPTIONS,
  IDENTITY_CONFIRMED_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

function RadioRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <FormControl>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
        {label}
      </Typography>
      <RadioGroup
        row
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: 13.5 }}>{option.label}</Typography>}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

export function CallDetailsCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        1. Call Details
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Basic details about this call.
      </Typography>

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Call Date"
            type="date"
            value={callReport.callDate}
            onChange={(event) => setCallReport({ callDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Call Time"
            type="time"
            value={callReport.callTime}
            onChange={(event) => setCallReport({ callTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <RadioRow
          label="Call Type"
          value={callReport.callType}
          options={CALL_TYPE_OPTIONS}
          onChange={(value) => setCallReport({ callType: value })}
        />

        <RadioRow
          label="Place of Call"
          value={callReport.placeOfCall}
          options={PLACE_OF_CALL_OPTIONS}
          onChange={(value) => setCallReport({ placeOfCall: value })}
        />

        {callReport.placeOfCall === 'other' && (
          <TextField
            label="Specify Place of Call"
            value={callReport.placeOfCallOther}
            onChange={(event) => setCallReport({ placeOfCallOther: event.target.value })}
            sx={fieldSx}
          />
        )}

        <Stack direction="row" spacing={2}>
          <TextField
            label="Client Representative"
            value={callReport.clientRepresentative}
            onChange={(event) => setCallReport({ clientRepresentative: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="PG Finance Representative"
            value={callReport.pgRepresentative}
            onChange={(event) => setCallReport({ pgRepresentative: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <RadioRow
          label="Call Status"
          value={callReport.callStatus}
          options={CALL_STATUS_OPTIONS}
          onChange={(value) => setCallReport({ callStatus: value })}
        />

        <RadioRow
          label="Identity Confirmed"
          value={callReport.identityConfirmed}
          options={IDENTITY_CONFIRMED_OPTIONS}
          onChange={(value) => setCallReport({ identityConfirmed: value })}
        />
      </Stack>
    </Box>
  );
}

export { RadioRow };
```

- [ ] **Step 2: Create `LoanDiscussionCard`**

Create `src/sections/admin/call-report/loan-discussion-card.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import type {
  ClientUnderstandingItem,
  ClientConcernItem,
} from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  LOAN_PURPOSE_CONFIRMATION_OPTIONS,
  REPAYMENT_SOURCE_OPTIONS,
  CLIENT_UNDERSTANDING_OPTIONS,
  CLIENT_CONCERN_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

function ChipToggleGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
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

export function LoanDiscussionCard() {
  const { review, setCallReport } = useAdmin();
  const { application } = useRegistration();
  const { callReport } = review;

  // Default Final Loan Purpose from the borrower's original stated purpose,
  // once, the first time this card sees an empty value — a plain `useEffect`
  // guard rather than a form `defaultValues` prop, since this page has no
  // form library (see Global Constraints).
  useEffect(() => {
    if (!callReport.finalLoanPurpose && application.financialInfo?.loanPurpose) {
      setCallReport({ finalLoanPurpose: application.financialInfo.loanPurpose });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.financialInfo?.loanPurpose]);

  const toggleUnderstanding = (value: ClientUnderstandingItem) => {
    const has = callReport.clientUnderstanding.includes(value);
    setCallReport({
      clientUnderstanding: has
        ? callReport.clientUnderstanding.filter((item) => item !== value)
        : [...callReport.clientUnderstanding, value],
    });
  };

  const toggleConcern = (value: ClientConcernItem) => {
    const has = callReport.clientConcerns.includes(value);
    setCallReport({
      clientConcerns: has
        ? callReport.clientConcerns.filter((item) => item !== value)
        : [...callReport.clientConcerns, value],
    });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        2. Loan Discussion
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Confirm the loan purpose and gauge the client's understanding and concerns.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Loan Purpose Confirmation"
          value={callReport.loanPurposeConfirmation}
          options={LOAN_PURPOSE_CONFIRMATION_OPTIONS}
          onChange={(value) => setCallReport({ loanPurposeConfirmation: value })}
        />

        <TextField
          label="Final Loan Purpose"
          value={callReport.finalLoanPurpose}
          onChange={(event) => setCallReport({ finalLoanPurpose: event.target.value })}
          sx={fieldSx}
        />

        <TextField
          label="Specific Use of Proceeds"
          value={callReport.specificUseOfProceeds}
          onChange={(event) => setCallReport({ specificUseOfProceeds: event.target.value })}
          sx={fieldSx}
        />

        <TextField
          label="Target Release Date"
          type="date"
          value={callReport.targetReleaseDate}
          onChange={(event) => setCallReport({ targetReleaseDate: event.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />

        <RadioRow
          label="Primary Source of Repayment"
          value={callReport.primaryRepaymentSource}
          options={REPAYMENT_SOURCE_OPTIONS}
          onChange={(value) => setCallReport({ primaryRepaymentSource: value })}
        />

        {callReport.primaryRepaymentSource === 'other' && (
          <TextField
            label="Other Source of Repayment"
            value={callReport.otherRepaymentSource}
            onChange={(event) => setCallReport({ otherRepaymentSource: event.target.value })}
            sx={fieldSx}
          />
        )}

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Client Understanding
          </Typography>
          <ChipToggleGroup
            options={CLIENT_UNDERSTANDING_OPTIONS}
            selected={callReport.clientUnderstanding}
            onToggle={toggleUnderstanding}
          />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Client Concerns
          </Typography>
          <ChipToggleGroup
            options={CLIENT_CONCERN_OPTIONS}
            selected={callReport.clientConcerns}
            onToggle={toggleConcern}
          />
        </Box>

        {callReport.clientConcerns.length > 0 && (
          <TextField
            label="Concern Notes"
            multiline
            minRows={2}
            value={callReport.concernNotes}
            onChange={(event) => setCallReport({ concernNotes: event.target.value })}
            sx={fieldSx}
          />
        )}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Both components are unused until Task 10 wires them into the page — TypeScript won't flag unused exported components, only unused local variables, so this should be clean.)

- [ ] **Step 4: Lint**

Run: `npx eslint src/sections/admin/call-report/call-details-card.tsx src/sections/admin/call-report/loan-discussion-card.tsx`
Expected: no errors. If `Chip` import in `call-details-card.tsx` is flagged unused, remove it (it's not actually used there — only in `loan-discussion-card.tsx`'s `ChipToggleGroup`).

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/call-details-card.tsx src/sections/admin/call-report/loan-discussion-card.tsx
git commit -m "Add Call Details and Loan Discussion cards for Call Report"
```

---

## Task 4: Section 3 (Residence), Section 4 (Employment), Section 5 (Organization) cards

**Files:**
- Create: `src/sections/admin/call-report/residence-household-card.tsx`
- Create: `src/sections/admin/call-report/employment-business-card.tsx`
- Create: `src/sections/admin/call-report/organization-membership-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()`, `RadioRow` from `call-details-card.tsx` (Task 3), option constants from Task 1.
- Produces: `ResidenceHouseholdCard`, `EmploymentBusinessCard`, `OrganizationMembershipCard` (no props each). Task 10 consumes.

- [ ] **Step 1: Create `ResidenceHouseholdCard`**

Create `src/sections/admin/call-report/residence-household-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  RESIDENCE_YEARS_OPTIONS,
  RESIDENCE_STATUS_OPTIONS,
  YES_NO_PREFER_NOT_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

export function ResidenceHouseholdCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        3. Residence and Household Information
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Living situation and household composition.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Years Living at Current Residence"
          value={callReport.yearsAtResidence}
          options={RESIDENCE_YEARS_OPTIONS}
          onChange={(value) => setCallReport({ yearsAtResidence: value })}
        />

        <RadioRow
          label="Residence Status"
          value={callReport.residenceStatus}
          options={RESIDENCE_STATUS_OPTIONS}
          onChange={(value) => setCallReport({ residenceStatus: value })}
        />

        {callReport.residenceStatus === 'other' && (
          <TextField
            label="Other Residence Status"
            value={callReport.residenceStatusOther}
            onChange={(event) => setCallReport({ residenceStatusOther: event.target.value })}
            sx={fieldSx}
          />
        )}

        <Stack direction="row" spacing={2}>
          <TextField
            label="Number of Dependents"
            type="number"
            value={callReport.numberOfDependents}
            onChange={(event) => setCallReport({ numberOfDependents: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Number of Household Income Earners"
            type="number"
            value={callReport.numberOfIncomeEarners}
            onChange={(event) => setCallReport({ numberOfIncomeEarners: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <RadioRow
          label="Supporting More Than One Family"
          value={callReport.supportingMultipleFamilies}
          options={YES_NO_PREFER_NOT_OPTIONS}
          onChange={(value) => setCallReport({ supportingMultipleFamilies: value })}
        />
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Create `EmploymentBusinessCard`**

Create `src/sections/admin/call-report/employment-business-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  MAIN_INCOME_SOURCE_OPTIONS,
  TENURE_RANGE_OPTIONS,
  INCOME_STABILITY_OPTIONS,
  INCOME_TREND_OPTIONS,
  INCOME_CHANGE_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function EmploymentBusinessCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        4. Employment or Business Information
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Income source, stability, and trend.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Main Source of Income"
          value={callReport.mainIncomeSource}
          options={MAIN_INCOME_SOURCE_OPTIONS}
          onChange={(value) => setCallReport({ mainIncomeSource: value })}
        />

        {callReport.mainIncomeSource === 'other' && (
          <TextField
            label="Other Income Source"
            value={callReport.otherIncomeSource}
            onChange={(event) => setCallReport({ otherIncomeSource: event.target.value })}
            sx={fieldSx}
          />
        )}

        <RadioRow
          label="Employment or Business Tenure"
          value={callReport.employmentTenure}
          options={TENURE_RANGE_OPTIONS}
          onChange={(value) => setCallReport({ employmentTenure: value })}
        />

        <RadioRow
          label="Income Stability"
          value={callReport.incomeStability}
          options={INCOME_STABILITY_OPTIONS}
          onChange={(value) => setCallReport({ incomeStability: value })}
        />

        <RadioRow
          label="Income Trend"
          value={callReport.incomeTrend}
          options={INCOME_TREND_OPTIONS}
          onChange={(value) => setCallReport({ incomeTrend: value })}
        />

        <RadioRow
          label="Is this a loan renewal?"
          value={callReport.isRenewal}
          options={YES_NO_OPTIONS}
          onChange={(value) => setCallReport({ isRenewal: value })}
        />

        {callReport.isRenewal === 'yes' && (
          <>
            <RadioRow
              label="Income Change Since Previous Loan"
              value={callReport.incomeChangeSincePrevious}
              options={INCOME_CHANGE_OPTIONS}
              onChange={(value) => setCallReport({ incomeChangeSincePrevious: value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Previous Monthly Income"
                type="number"
                value={callReport.previousMonthlyIncome}
                onChange={(event) => setCallReport({ previousMonthlyIncome: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Current Monthly Income"
                type="number"
                value={callReport.currentMonthlyIncome}
                onChange={(event) => setCallReport({ currentMonthlyIncome: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
            <TextField
              label="Effective Date of Income Change"
              type="date"
              value={callReport.incomeChangeEffectiveDate}
              onChange={(event) => setCallReport({ incomeChangeEffectiveDate: event.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
          </>
        )}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Create `OrganizationMembershipCard`**

Create `src/sections/admin/call-report/organization-membership-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  MEMBERSHIP_TYPE_OPTIONS,
  MEMBERSHIP_STANDING_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function OrganizationMembershipCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        5. Organization Membership
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Civic, professional, or community affiliations.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Member of an Organization"
          value={callReport.isOrgMember}
          options={YES_NO_OPTIONS}
          onChange={(value) => setCallReport({ isOrgMember: value })}
        />

        {callReport.isOrgMember === 'yes' && (
          <>
            <RadioRow
              label="Membership Type"
              value={callReport.membershipType}
              options={MEMBERSHIP_TYPE_OPTIONS}
              onChange={(value) => setCallReport({ membershipType: value })}
            />
            <TextField
              label="Organization Name"
              value={callReport.organizationName}
              onChange={(event) => setCallReport({ organizationName: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              label="Years of Membership"
              type="number"
              value={callReport.membershipYears}
              onChange={(event) => setCallReport({ membershipYears: event.target.value })}
              sx={fieldSx}
            />
            <RadioRow
              label="Membership Standing"
              value={callReport.membershipStanding}
              options={MEMBERSHIP_STANDING_OPTIONS}
              onChange={(value) => setCallReport({ membershipStanding: value })}
            />
          </>
        )}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npx eslint src/sections/admin/call-report/residence-household-card.tsx src/sections/admin/call-report/employment-business-card.tsx src/sections/admin/call-report/organization-membership-card.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/residence-household-card.tsx src/sections/admin/call-report/employment-business-card.tsx src/sections/admin/call-report/organization-membership-card.tsx
git commit -m "Add Residence, Employment, and Organization Membership cards for Call Report"
```

---

## Task 5: Section 6 (Quick Financial Info), Section 7 (Payment Behavior), Section 8 (Officer Observation) cards

**Files:**
- Create: `src/sections/admin/call-report/quick-financial-info-card.tsx`
- Create: `src/sections/admin/call-report/payment-behavior-card.tsx`
- Create: `src/sections/admin/call-report/officer-observation-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()`, `RadioRow` (Task 3), `ChipToggleGroup` — needs exporting from `loan-discussion-card.tsx` (see Step 0 below) — computation functions from Task 2, option constants from Task 1.
- Produces: `QuickFinancialInfoCard`, `PaymentBehaviorCard`, `OfficerObservationCard` (no props each). Task 10 consumes.

- [ ] **Step 0: Export `ChipToggleGroup` from `loan-discussion-card.tsx`**

Open `src/sections/admin/call-report/loan-discussion-card.tsx` (created in Task 3) and change:

```tsx
function ChipToggleGroup<T extends string>({
```

to:

```tsx
export function ChipToggleGroup<T extends string>({
```

(It's a module-private helper today; this task and Task 6/7 need it too, so it becomes a shared export — same pattern as `RadioRow` already being exported from `call-details-card.tsx`.)

- [ ] **Step 1: Create `QuickFinancialInfoCard`**

Create `src/sections/admin/call-report/quick-financial-info-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { SupportingDocItem } from 'src/auth/admin-context';

import { ChipToggleGroup } from './loan-discussion-card';
import {
  computeTotalMonthlyIncome,
  computeTotalMonthlyObligations,
  computeDisposableIncome,
  computeDti,
} from './call-report-computations';
import { cardSx, fieldSx, SUPPORTING_DOC_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function ComputedRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontSize: 13, color: '#667085' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value}</Typography>
    </Stack>
  );
}

export function QuickFinancialInfoCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const totalIncome = computeTotalMonthlyIncome(callReport);
  const totalObligations = computeTotalMonthlyObligations(callReport);
  const disposableIncome = computeDisposableIncome(callReport);
  const dti = computeDti(callReport);

  const toggleDoc = (value: SupportingDocItem) => {
    const has = callReport.supportingDocsAvailable.includes(value);
    setCallReport({
      supportingDocsAvailable: has
        ? callReport.supportingDocsAvailable.filter((item) => item !== value)
        : [...callReport.supportingDocsAvailable, value],
    });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        6. Quick Financial Information
      </Typography>
      <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#FEF0D6', mb: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, color: '#B36A05' }}>
          Declared during the call — subject to document and financial verification.
        </Typography>
      </Box>

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Declared Gross Monthly Income"
            type="number"
            value={callReport.declaredGrossMonthlyIncome}
            onChange={(event) => setCallReport({ declaredGrossMonthlyIncome: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Declared Net Monthly Income"
            type="number"
            value={callReport.declaredNetMonthlyIncome}
            onChange={(event) => setCallReport({ declaredNetMonthlyIncome: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <TextField
          label="Other Recurring Monthly Income"
          type="number"
          value={callReport.otherRecurringMonthlyIncome}
          onChange={(event) => setCallReport({ otherRecurringMonthlyIncome: event.target.value })}
          sx={fieldSx}
        />

        <TextField
          label="Estimated Monthly Household Expenses"
          type="number"
          value={callReport.estimatedMonthlyHouseholdExpenses}
          onChange={(event) =>
            setCallReport({ estimatedMonthlyHouseholdExpenses: event.target.value })
          }
          sx={fieldSx}
        />

        <Stack direction="row" spacing={2}>
          <TextField
            label="Existing Monthly Loan Payments"
            type="number"
            value={callReport.existingMonthlyLoanPayments}
            onChange={(event) => setCallReport({ existingMonthlyLoanPayments: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Monthly Credit-card Payments"
            type="number"
            value={callReport.monthlyCreditCardPayments}
            onChange={(event) => setCallReport({ monthlyCreditCardPayments: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <TextField
          label="Other Recurring Monthly Obligations"
          type="number"
          value={callReport.otherRecurringMonthlyObligations}
          onChange={(event) =>
            setCallReport({ otherRecurringMonthlyObligations: event.target.value })
          }
          sx={fieldSx}
        />

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1} sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC' }}>
          <ComputedRow label="Total Monthly Income" value={formatCurrency(totalIncome)} />
          <ComputedRow label="Total Monthly Obligations" value={formatCurrency(totalObligations)} />
          <ComputedRow
            label="Preliminary Disposable Income"
            value={formatCurrency(disposableIncome)}
          />
          <ComputedRow label="Estimated Debt-to-Income Ratio" value={`${dti.toFixed(1)}%`} />
        </Stack>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Supporting Documents Available
          </Typography>
          <ChipToggleGroup
            options={SUPPORTING_DOC_OPTIONS}
            selected={callReport.supportingDocsAvailable}
            onToggle={toggleDoc}
          />
        </Box>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Create `PaymentBehaviorCard`**

Create `src/sections/admin/call-report/payment-behavior-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  ELECTRICITY_PAYMENT_OPTIONS,
  CREDIT_CARD_PAYMENT_OPTIONS,
  OTHER_LOAN_REPAYMENT_OPTIONS,
  YES_NO_VERIFY_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

export function PaymentBehaviorCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const showExplanation =
    callReport.hasReturnedChecks === 'yes' ||
    callReport.hasPastDueObligations === 'yes' ||
    callReport.hasPendingCases === 'yes';

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        7. Payment Behavior
      </Typography>
      <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#FEF0D6', mb: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, color: '#B36A05' }}>
          These answers are borrower declarations and are subject to verification.
        </Typography>
      </Box>

      <Stack spacing={2.5}>
        <RadioRow
          label="Electricity Bill Payment"
          value={callReport.electricityPayment}
          options={ELECTRICITY_PAYMENT_OPTIONS}
          onChange={(value) => setCallReport({ electricityPayment: value })}
        />

        <RadioRow
          label="Credit-card Payment"
          value={callReport.creditCardPayment}
          options={CREDIT_CARD_PAYMENT_OPTIONS}
          onChange={(value) => setCallReport({ creditCardPayment: value })}
        />

        <RadioRow
          label="Other Loan Repayment"
          value={callReport.otherLoanRepayment}
          options={OTHER_LOAN_REPAYMENT_OPTIONS}
          onChange={(value) => setCallReport({ otherLoanRepayment: value })}
        />

        <RadioRow
          label="Returned Checks"
          value={callReport.hasReturnedChecks}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ hasReturnedChecks: value })}
        />

        <RadioRow
          label="Past-due Obligations"
          value={callReport.hasPastDueObligations}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ hasPastDueObligations: value })}
        />

        <RadioRow
          label="Pending Financial or Court Cases"
          value={callReport.hasPendingCases}
          options={YES_NO_VERIFY_OPTIONS}
          onChange={(value) => setCallReport({ hasPendingCases: value })}
        />

        {showExplanation && (
          <TextField
            label="Explanation"
            multiline
            minRows={2}
            value={callReport.paymentBehaviorExplanation}
            onChange={(event) =>
              setCallReport({ paymentBehaviorExplanation: event.target.value })
            }
            sx={fieldSx}
          />
        )}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Create `OfficerObservationCard`**

Create `src/sections/admin/call-report/officer-observation-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { OfficerObservationItem } from 'src/auth/admin-context';

import { ChipToggleGroup } from './loan-discussion-card';
import {
  cardSx,
  fieldSx,
  OFFICER_OBSERVATION_POSITIVE_OPTIONS,
  OFFICER_OBSERVATION_ATTENTION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

export function OfficerObservationCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const toggleObservation = (value: OfficerObservationItem) => {
    const has = callReport.officerObservations.includes(value);
    setCallReport({
      officerObservations: has
        ? callReport.officerObservations.filter((item) => item !== value)
        : [...callReport.officerObservations, value],
    });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        8. Officer Observation
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Select everything that applies to how this call went.
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0C8A4F', mb: 1 }}>
            Positive or neutral
          </Typography>
          <ChipToggleGroup
            options={OFFICER_OBSERVATION_POSITIVE_OPTIONS}
            selected={callReport.officerObservations}
            onToggle={toggleObservation}
          />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#B32C22', mb: 1 }}>
            Needs attention
          </Typography>
          <ChipToggleGroup
            options={OFFICER_OBSERVATION_ATTENTION_OPTIONS}
            selected={callReport.officerObservations}
            onToggle={toggleObservation}
          />
        </Box>

        <TextField
          label="Additional Observation Notes"
          multiline
          minRows={2}
          value={callReport.additionalObservationNotes}
          onChange={(event) => setCallReport({ additionalObservationNotes: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npx eslint src/sections/admin/call-report/quick-financial-info-card.tsx src/sections/admin/call-report/payment-behavior-card.tsx src/sections/admin/call-report/officer-observation-card.tsx src/sections/admin/call-report/loan-discussion-card.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/quick-financial-info-card.tsx src/sections/admin/call-report/payment-behavior-card.tsx src/sections/admin/call-report/officer-observation-card.tsx src/sections/admin/call-report/loan-discussion-card.tsx
git commit -m "Add Quick Financial Info, Payment Behavior, and Officer Observation cards"
```

---

## Task 6: Section 9 (Collateral Information) — repeater + shared entry fields

**Files:**
- Create: `src/sections/admin/call-report/collateral-entry-fields.tsx`
- Create: `src/sections/admin/call-report/collateral-information-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` (`addCollateralEntry`, `updateCollateralEntry`, `removeCollateralEntry` from Task 1), `RadioRow` (Task 3), `CollateralEntry` type (Task 1), option constants from Task 1.
- Produces: `CollateralEntryFields` (props: `entry: CollateralEntry`, `onChange: (data: Partial<CollateralEntry>) => void`, `readOnly?: boolean`), `CollateralInformationCard` (no props). Task 9 (Loan Package Proposal) consumes `CollateralEntryFields` in read-only mode; Task 10 consumes `CollateralInformationCard`.

- [ ] **Step 1: Create `CollateralEntryFields`**

Create `src/sections/admin/call-report/collateral-entry-fields.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import type { CollateralEntry } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  fieldSx,
  COLLATERAL_TYPE_OPTIONS,
  DOCS_AVAILABLE_OPTIONS,
  EXISTING_LIEN_OPTIONS,
  REQUIRES_APPRAISAL_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// Used twice: editable in Collateral Information (section 9, where entries
// are first entered) and read-only in Loan Package Proposal (section 11,
// which reuses the same entries rather than asking the officer to re-enter
// collateral details a second time).
// ----------------------------------------------------------------------

export function CollateralEntryFields({
  entry,
  onChange,
  readOnly = false,
}: {
  entry: CollateralEntry;
  onChange: (data: Partial<CollateralEntry>) => void;
  readOnly?: boolean;
}) {
  return (
    <Stack spacing={2}>
      <RadioRow
        label="Collateral Type"
        value={entry.type}
        options={COLLATERAL_TYPE_OPTIONS}
        onChange={(value) => onChange({ type: value })}
      />

      <Stack direction="row" spacing={2}>
        <TextField
          label="Description"
          value={entry.description}
          onChange={(event) => onChange({ description: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 2 }}
        />
        <TextField
          label="Quantity"
          type="number"
          value={entry.quantity}
          onChange={(event) => onChange({ quantity: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Registered Owner"
          value={entry.registeredOwner}
          onChange={(event) => onChange({ registeredOwner: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Relationship of Owner to Borrower"
          value={entry.ownerRelationship}
          onChange={(event) => onChange({ ownerRelationship: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Location"
          value={entry.location}
          onChange={(event) => onChange({ location: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Estimated Value"
          type="number"
          value={entry.estimatedValue}
          onChange={(event) => onChange({ estimatedValue: event.target.value })}
          disabled={readOnly}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>

      <RadioRow
        label="Ownership Documents Available"
        value={entry.ownershipDocsAvailable}
        options={DOCS_AVAILABLE_OPTIONS}
        onChange={(value) => onChange({ ownershipDocsAvailable: value })}
      />

      <RadioRow
        label="Existing Lien or Mortgage"
        value={entry.existingLien}
        options={EXISTING_LIEN_OPTIONS}
        onChange={(value) => onChange({ existingLien: value })}
      />

      <RadioRow
        label="Requires Appraisal"
        value={entry.requiresAppraisal}
        options={REQUIRES_APPRAISAL_OPTIONS}
        onChange={(value) => onChange({ requiresAppraisal: value })}
      />
    </Stack>
  );
}
```

Note: `readOnly` disables the text fields but the `RadioRow` radios stay interactive even in read-only mode (no `disabled` prop wired through `RadioRow` in Task 3's implementation). Add read-only support to `RadioRow` now:

Open `src/sections/admin/call-report/call-details-card.tsx` and change the `RadioRow` function signature and usage:

```tsx
function RadioRow<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <FormControl disabled={disabled}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
        {label}
      </Typography>
      <RadioGroup
        row
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
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
```

Then in `collateral-entry-fields.tsx`, pass `disabled={readOnly}` to each `RadioRow` call.

- [ ] **Step 2: Create `CollateralInformationCard`**

Create `src/sections/admin/call-report/collateral-information-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

import { RadioRow } from './call-details-card';
import { CollateralEntryFields } from './collateral-entry-fields';
import { cardSx, COLLATERAL_OFFERED_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------

export function CollateralInformationCard() {
  const {
    review,
    setCallReport,
    addCollateralEntry,
    updateCollateralEntry,
    removeCollateralEntry,
  } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        9. Collateral Information
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Whether collateral is offered, and details for each item.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Collateral Offered"
          value={callReport.collateralOffered}
          options={COLLATERAL_OFFERED_OPTIONS}
          onChange={(value) => setCallReport({ collateralOffered: value })}
        />

        {callReport.collateralOffered === 'yes' && (
          <Stack spacing={2}>
            {callReport.collateralEntries.map((entry, index) => (
              <Box
                key={entry.id}
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  border: '1px solid #EEF0F5',
                  bgcolor: '#FAFBFD',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Chip
                    label={`Collateral ${index + 1}`}
                    size="small"
                    sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
                  />
                  <Button
                    onClick={() => removeCollateralEntry(entry.id)}
                    size="small"
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                    sx={{ color: '#F04438' }}
                  >
                    Remove Collateral
                  </Button>
                </Stack>
                <CollateralEntryFields
                  entry={entry}
                  onChange={(data) => updateCollateralEntry(entry.id, data)}
                />
              </Box>
            ))}

            <Button
              onClick={addCollateralEntry}
              variant="outlined"
              startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
              sx={{ borderRadius: '10px', alignSelf: 'flex-start' }}
            >
              Add Another Collateral
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npx eslint src/sections/admin/call-report/collateral-entry-fields.tsx src/sections/admin/call-report/collateral-information-card.tsx src/sections/admin/call-report/call-details-card.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/collateral-entry-fields.tsx src/sections/admin/call-report/collateral-information-card.tsx src/sections/admin/call-report/call-details-card.tsx
git commit -m "Add Collateral Information card with repeatable entries"
```

---

## Task 7: Section 10 (Agreed Next Steps) and Section 13 (Additional Remarks) cards

**Files:**
- Create: `src/sections/admin/call-report/agreed-next-steps-card.tsx`
- Create: `src/sections/admin/call-report/additional-remarks-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()`, `RadioRow` (Task 3), `ChipToggleGroup` (Task 5), option constants from Task 1.
- Produces: `AgreedNextStepsCard`, `AdditionalRemarksCard` (no props each). Task 10 consumes.

- [ ] **Step 1: Create `AgreedNextStepsCard`**

Create `src/sections/admin/call-report/agreed-next-steps-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { NextStepItem } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import { ChipToggleGroup } from './loan-discussion-card';
import { cardSx, fieldSx, NEXT_STEP_OPTIONS, RESPONSIBLE_PARTY_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------

export function AgreedNextStepsCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const followUpRequired =
    callReport.callStatus === 'follow-up-needed' ||
    callReport.nextSteps.includes('schedule-follow-up-call');

  const toggleStep = (value: NextStepItem) => {
    const has = callReport.nextSteps.includes(value);
    setCallReport({
      nextSteps: has
        ? callReport.nextSteps.filter((item) => item !== value)
        : [...callReport.nextSteps, value],
    });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        10. Agreed Next Steps
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        What happens after this call.
      </Typography>

      <Stack spacing={2.5}>
        <ChipToggleGroup
          options={NEXT_STEP_OPTIONS}
          selected={callReport.nextSteps}
          onToggle={toggleStep}
        />

        <RadioRow
          label="Responsible Party"
          value={callReport.responsibleParty}
          options={RESPONSIBLE_PARTY_OPTIONS}
          onChange={(value) => setCallReport({ responsibleParty: value })}
        />

        <Stack direction="row" spacing={2}>
          <TextField
            label="Due Date"
            type="date"
            value={callReport.nextStepsDueDate}
            onChange={(event) => setCallReport({ nextStepsDueDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Follow-up Date"
            type="date"
            required={followUpRequired}
            error={followUpRequired && !callReport.followUpDate}
            helperText={
              followUpRequired && !callReport.followUpDate
                ? 'Required — call status is Follow-up Needed or a follow-up call was scheduled.'
                : ' '
            }
            value={callReport.followUpDate}
            onChange={(event) => setCallReport({ followUpDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <TextField
          label="Short Instructions"
          multiline
          minRows={2}
          value={callReport.nextStepsInstructions}
          onChange={(event) => setCallReport({ nextStepsInstructions: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Create `AdditionalRemarksCard`**

Create `src/sections/admin/call-report/additional-remarks-card.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { cardSx, fieldSx } from './call-report-types';

// ----------------------------------------------------------------------

export function AdditionalRemarksCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        13. Additional Remarks
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Anything else worth noting that isn't covered above.
      </Typography>

      <TextField
        label="Additional Remarks"
        multiline
        minRows={3}
        value={callReport.additionalRemarks}
        onChange={(event) => setCallReport({ additionalRemarks: event.target.value })}
        sx={fieldSx}
      />
    </Box>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npx eslint src/sections/admin/call-report/agreed-next-steps-card.tsx src/sections/admin/call-report/additional-remarks-card.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/agreed-next-steps-card.tsx src/sections/admin/call-report/additional-remarks-card.tsx
git commit -m "Add Agreed Next Steps and Additional Remarks cards"
```

---

## Task 8: Section 12 (Call Summary) — summary generator + card

**Files:**
- Create: `src/sections/admin/call-report/call-report-summary.ts`
- Create: `src/sections/admin/call-report/call-summary-card.tsx`

**Interfaces:**
- Consumes: `CallReport` type (Task 1), `RegistrationState`/`SignUpData` from `src/auth/registration-context.tsx`, computation functions (Task 2), option label lookups from Task 1 (for turning enum values back into human-readable text in the generated summary).
- Produces: `buildCallSummary(callReport: CallReport, signUpData: { firstName: string; lastName: string } | null): string`, `CallSummaryCard` (no props). Task 10 consumes `CallSummaryCard`.

- [ ] **Step 1: Add a label-lookup helper to `call-report-types.ts`**

Open `src/sections/admin/call-report/call-report-types.ts` (Task 1) and append at the end:

```ts
export function labelFor<T extends string>(options: Option<T>[], value: T | ''): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}
```

- [ ] **Step 2: Create the summary generator**

Create `src/sections/admin/call-report/call-report-summary.ts`:

```ts
import type { CallReport } from 'src/auth/admin-context';

import {
  computeTotalMonthlyIncome,
  computeTotalMonthlyObligations,
  computeDisposableIncome,
  computeDti,
} from './call-report-computations';
import {
  labelFor,
  CALL_TYPE_OPTIONS,
  IDENTITY_CONFIRMED_OPTIONS,
  REPAYMENT_SOURCE_OPTIONS,
  RESIDENCE_YEARS_OPTIONS,
  RESIDENCE_STATUS_OPTIONS,
  INCOME_STABILITY_OPTIONS,
  INCOME_TREND_OPTIONS,
  ELECTRICITY_PAYMENT_OPTIONS,
  CREDIT_CARD_PAYMENT_OPTIONS,
  OTHER_LOAN_REPAYMENT_OPTIONS,
  OFFICER_OBSERVATION_POSITIVE_OPTIONS,
  OFFICER_OBSERVATION_ATTENTION_OPTIONS,
  NEXT_STEP_OPTIONS,
  PRELIMINARY_RECOMMENDATION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// Pure function: reads the structured CallReport answers and composes a
// plain-text summary, skipping any section whose relevant fields are still
// empty ("include when available" per the design spec). Never called
// automatically on every keystroke — only when the officer opens the Call
// Summary card for the first time (empty callSummary) or clicks Regenerate.
// ----------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function buildCallSummary(
  callReport: CallReport,
  signUpData: { firstName: string; lastName: string } | null
): string {
  const lines: string[] = [];
  const name = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : 'the borrower';

  const callTypeLabel = labelFor(CALL_TYPE_OPTIONS, callReport.callType);
  if (callReport.callDate || callTypeLabel) {
    const parts = [`Call with ${name}`];
    if (callReport.callDate) parts.push(`on ${callReport.callDate}`);
    if (callReport.callTime) parts.push(`${callReport.callTime}`);
    if (callTypeLabel) parts.push(`(${callTypeLabel})`);
    lines.push(`${parts.join(' ')}.`);
  }

  const identityLabel = labelFor(IDENTITY_CONFIRMED_OPTIONS, callReport.identityConfirmed);
  if (identityLabel) lines.push(`Identity confirmed: ${identityLabel}.`);

  if (callReport.finalLoanPurpose) {
    lines.push(`Loan purpose: ${callReport.finalLoanPurpose}.`);
  }
  const repaymentLabel = labelFor(REPAYMENT_SOURCE_OPTIONS, callReport.primaryRepaymentSource);
  if (repaymentLabel) lines.push(`Primary source of repayment: ${repaymentLabel}.`);

  const residenceYearsLabel = labelFor(RESIDENCE_YEARS_OPTIONS, callReport.yearsAtResidence);
  const residenceStatusLabel = labelFor(RESIDENCE_STATUS_OPTIONS, callReport.residenceStatus);
  if (residenceYearsLabel || residenceStatusLabel || callReport.numberOfDependents) {
    const parts: string[] = [];
    if (residenceYearsLabel) parts.push(`residing at current address for ${residenceYearsLabel.toLowerCase()}`);
    if (residenceStatusLabel) parts.push(`${residenceStatusLabel.toLowerCase()} residence`);
    if (callReport.numberOfDependents) parts.push(`${callReport.numberOfDependents} dependents`);
    if (parts.length) lines.push(`Household: ${parts.join(', ')}.`);
  }

  const stabilityLabel = labelFor(INCOME_STABILITY_OPTIONS, callReport.incomeStability);
  const trendLabel = labelFor(INCOME_TREND_OPTIONS, callReport.incomeTrend);
  if (stabilityLabel || trendLabel) {
    const parts: string[] = [];
    if (stabilityLabel) parts.push(`income stable: ${stabilityLabel.toLowerCase()}`);
    if (trendLabel) parts.push(`trend: ${trendLabel.toLowerCase()}`);
    lines.push(`Employment/business: ${parts.join(', ')}.`);
  }

  if (callReport.declaredNetMonthlyIncome) {
    const income = computeTotalMonthlyIncome(callReport);
    const obligations = computeTotalMonthlyObligations(callReport);
    const disposable = computeDisposableIncome(callReport);
    const dti = computeDti(callReport);
    lines.push(
      `Declared net monthly income ${formatCurrency(income)}; total obligations ${formatCurrency(
        obligations
      )}; preliminary disposable income ${formatCurrency(disposable)} (DTI ${dti.toFixed(0)}%).`
    );
  }

  const electricityLabel = labelFor(ELECTRICITY_PAYMENT_OPTIONS, callReport.electricityPayment);
  const creditCardLabel = labelFor(CREDIT_CARD_PAYMENT_OPTIONS, callReport.creditCardPayment);
  const otherLoanLabel = labelFor(OTHER_LOAN_REPAYMENT_OPTIONS, callReport.otherLoanRepayment);
  if (electricityLabel || creditCardLabel || otherLoanLabel) {
    const parts: string[] = [];
    if (electricityLabel) parts.push(`electricity: ${electricityLabel.toLowerCase()}`);
    if (creditCardLabel) parts.push(`credit card: ${creditCardLabel.toLowerCase()}`);
    if (otherLoanLabel) parts.push(`other loans: ${otherLoanLabel.toLowerCase()}`);
    lines.push(`Payment behavior — ${parts.join('; ')}.`);
  }

  const allObservationOptions = [
    ...OFFICER_OBSERVATION_POSITIVE_OPTIONS,
    ...OFFICER_OBSERVATION_ATTENTION_OPTIONS,
  ];
  if (callReport.officerObservations.length > 0) {
    const labels = callReport.officerObservations
      .map((value) => labelFor(allObservationOptions, value))
      .filter((label): label is string => !!label);
    lines.push(`Officer observations: ${labels.join(', ').toLowerCase()}.`);
  }

  if (callReport.collateralOffered === 'yes' && callReport.collateralEntries.length > 0) {
    lines.push(
      `Collateral: ${callReport.collateralEntries.length} item(s) offered.`
    );
  } else if (callReport.collateralOffered === 'no') {
    lines.push('No collateral offered.');
  }

  if (callReport.nextSteps.length > 0) {
    const labels = callReport.nextSteps
      .map((value) => labelFor(NEXT_STEP_OPTIONS, value))
      .filter((label): label is string => !!label);
    const dueSuffix = callReport.nextStepsDueDate ? ` Due ${callReport.nextStepsDueDate}.` : '';
    lines.push(`Agreed next steps: ${labels.join(', ').toLowerCase()}.${dueSuffix}`);
  }

  if (callReport.proposedLoanAmount) {
    const term = callReport.proposedLoanTerm ? ` over ${callReport.proposedLoanTerm} months` : '';
    lines.push(`Proposed: ₱${Number(callReport.proposedLoanAmount).toLocaleString()}${term}.`);
  }

  const recommendationLabel = labelFor(
    PRELIMINARY_RECOMMENDATION_OPTIONS,
    callReport.preliminaryRecommendation
  );
  if (recommendationLabel) {
    lines.push(`Preliminary recommendation: ${recommendationLabel}.`);
  }

  return lines.join(' ');
}
```

- [ ] **Step 3: Create `CallSummaryCard`**

Create `src/sections/admin/call-report/call-summary-card.tsx`:

```tsx
'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { buildCallSummary } from './call-report-summary';
import { cardSx, fieldSx } from './call-report-types';

// ----------------------------------------------------------------------

export function CallSummaryCard() {
  const { review, setCallReport } = useAdmin();
  const { signUpData } = useRegistration();
  const { callReport } = review;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const generate = () => {
    setCallReport({
      callSummary: buildCallSummary(callReport, signUpData),
      callSummaryEdited: false,
    });
  };

  const handleRegenerateClick = () => {
    if (callReport.callSummaryEdited) {
      setConfirmOpen(true);
    } else {
      generate();
    }
  };

  const confirmRegenerate = () => {
    generate();
    setConfirmOpen(false);
  };

  return (
    <Box sx={cardSx}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
          12. Call Summary
        </Typography>
        <Button
          onClick={handleRegenerateClick}
          size="small"
          startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
          sx={{ color: 'text.disabled' }}
        >
          {callReport.callSummary ? 'Regenerate Summary' : 'Generate Summary'}
        </Button>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Generated from the structured answers above — you can edit it directly.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={5}
        placeholder="Click Generate Summary to build this from your answers above…"
        value={callReport.callSummary}
        onChange={(event) =>
          setCallReport({ callSummary: event.target.value, callSummaryEdited: true })
        }
        sx={fieldSx}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Replace edited summary?"
        content="You've made manual edits to this summary. Regenerating will replace your edits with a fresh summary built from the current answers."
        action={
          <Button variant="contained" onClick={confirmRegenerate} sx={{ bgcolor: '#F04438', '&:hover': { bgcolor: '#B32C22' } }}>
            Replace
          </Button>
        }
      />
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npx eslint src/sections/admin/call-report/call-report-summary.ts src/sections/admin/call-report/call-summary-card.tsx src/sections/admin/call-report/call-report-types.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/call-report-summary.ts src/sections/admin/call-report/call-summary-card.tsx src/sections/admin/call-report/call-report-types.ts
git commit -m "Add Call Summary generator and editable summary card"
```

---

## Task 9: Section 11 (Loan Package Proposal) card

**Files:**
- Create: `src/sections/admin/call-report/loan-package-proposal-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()`, `useRegistration()` (`application.financialInfo` for Original Loan Request read-only block), `RadioRow` (Task 3), `ChipToggleGroup` (Task 5), `CollateralEntryFields` in read-only mode (Task 6), `compareAmount`/`compareTerm`/`computeDisposableIncome` (Task 2), option constants (Task 1).
- Produces: `LoanPackageProposalCard` (no props). Task 10 consumes.

- [ ] **Step 1: Add a `useEffect` default-fill pattern and build the card**

Create `src/sections/admin/call-report/loan-package-proposal-card.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { RequiredDocItem, ConditionItem } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import { ChipToggleGroup } from './loan-discussion-card';
import { compareAmount, compareTerm, computeDisposableIncome, toNumber } from './call-report-computations';
import {
  cardSx,
  fieldSx,
  REPAYMENT_SOURCE_OPTIONS,
  INTEREST_RATE_BASIS_OPTIONS,
  COMPUTATION_TYPE_OPTIONS,
  PAYMENT_FREQUENCY_OPTIONS,
  ADJUSTMENT_REASON_OPTIONS,
  COLLATERAL_REQUIREMENT_OPTIONS,
  REQUIRED_DOC_OPTIONS,
  CONDITION_OPTIONS,
  PRELIMINARY_RECOMMENDATION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.4}>
      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Stack>
  );
}

function ComparisonChip({ label }: { label: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, fontSize: 12 }}
    />
  );
}

const COMPARE_AMOUNT_LABEL: Record<'same' | 'lower' | 'higher', string> = {
  same: 'Same as Requested',
  lower: 'Lower Amount',
  higher: 'Higher Amount',
};
const COMPARE_TERM_LABEL: Record<'same' | 'shorter' | 'longer', string> = {
  same: 'Same as Requested',
  shorter: 'Shorter Term',
  longer: 'Longer Term',
};

export function LoanPackageProposalCard() {
  const { review, setCallReport } = useAdmin();
  const { application } = useRegistration();
  const { callReport } = review;

  const requestedAmount = application.financialInfo?.desiredLoanAmount ?? 0;
  const requestedTerm = application.financialInfo?.loanTermMonths ?? 0;

  // Default Proposed Loan Amount/Term from the original request, once.
  useEffect(() => {
    if (!callReport.proposedLoanAmount && requestedAmount) {
      setCallReport({ proposedLoanAmount: String(requestedAmount) });
    }
    if (!callReport.proposedLoanTerm && requestedTerm) {
      setCallReport({ proposedLoanTerm: String(requestedTerm) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedAmount, requestedTerm]);

  // Default Final Use of Proceeds / proposal repayment source from section 2,
  // once, so the officer doesn't retype what they already said in Loan Discussion.
  useEffect(() => {
    if (!callReport.finalUseOfProceeds && callReport.specificUseOfProceeds) {
      setCallReport({ finalUseOfProceeds: callReport.specificUseOfProceeds });
    }
    if (!callReport.proposalPrimaryRepaymentSource && callReport.primaryRepaymentSource) {
      setCallReport({ proposalPrimaryRepaymentSource: callReport.primaryRepaymentSource });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callReport.specificUseOfProceeds, callReport.primaryRepaymentSource]);

  const proposedAmount = toNumber(callReport.proposedLoanAmount);
  const proposedTerm = toNumber(callReport.proposedLoanTerm);
  const amountComparison = compareAmount(requestedAmount, proposedAmount);
  const termComparison = compareTerm(requestedTerm, proposedTerm);
  const amountOrTermChanged = amountComparison !== 'same' || termComparison !== 'same';

  const disposableBefore = computeDisposableIncome(callReport);
  const disposableAfter = Math.max(
    0,
    disposableBefore - toNumber(callReport.estimatedAmortization)
  );

  const toggleRequiredDoc = (value: RequiredDocItem) => {
    const has = callReport.requiredDocuments.includes(value);
    setCallReport({
      requiredDocuments: has
        ? callReport.requiredDocuments.filter((item) => item !== value)
        : [...callReport.requiredDocuments, value],
    });
  };

  const toggleCondition = (value: ConditionItem) => {
    const has = callReport.conditionsBeforeProceeding.includes(value);
    setCallReport({
      conditionsBeforeProceeding: has
        ? callReport.conditionsBeforeProceeding.filter((item) => item !== value)
        : [...callReport.conditionsBeforeProceeding, value],
    });
  };

  const showRecommendationReason =
    !!callReport.preliminaryRecommendation &&
    callReport.preliminaryRecommendation !== 'proceed-as-requested';

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        11. Loan Package Proposal
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        This is only a preliminary recommendation and must not be treated as the final Credit
        Scoring or Credit Approval decision.
      </Typography>

      <Stack spacing={3}>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1.5 }}>
            Original Loan Request
          </Typography>
          <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={2}>
            <ReadOnlyField label="Requested Loan Amount" value={requestedAmount ? `₱${requestedAmount.toLocaleString()}` : ''} />
            <ReadOnlyField label="Requested Loan Term" value={requestedTerm ? `${requestedTerm} months` : ''} />
            <ReadOnlyField label="Original Loan Purpose" value={application.financialInfo?.loanPurpose ?? ''} />
            <ReadOnlyField label="Primary Source of Repayment" value={callReport.primaryRepaymentSource} />
            <ReadOnlyField label="Collateral Offered" value={callReport.collateralOffered} />
          </Stack>
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1.5 }}>
            Proposed Loan Terms
          </Typography>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Proposed Loan Amount"
                type="number"
                value={callReport.proposedLoanAmount}
                onChange={(event) => setCallReport({ proposedLoanAmount: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Proposed Loan Term (months)"
                type="number"
                value={callReport.proposedLoanTerm}
                onChange={(event) => setCallReport({ proposedLoanTerm: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>

            <TextField
              label="Proposed Loan Facility"
              value={callReport.proposedLoanFacility}
              onChange={(event) => setCallReport({ proposedLoanFacility: event.target.value })}
              sx={fieldSx}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Proposed Interest Rate"
                type="number"
                value={callReport.proposedInterestRate}
                onChange={(event) => setCallReport({ proposedInterestRate: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <Box sx={{ flex: 1 }}>
                <RadioRow
                  label="Interest-rate Basis"
                  value={callReport.interestRateBasis}
                  options={INTEREST_RATE_BASIS_OPTIONS}
                  onChange={(value) => setCallReport({ interestRateBasis: value })}
                />
              </Box>
            </Stack>

            <RadioRow
              label="Computation Type"
              value={callReport.computationType}
              options={COMPUTATION_TYPE_OPTIONS}
              onChange={(value) => setCallReport({ computationType: value })}
            />
            {callReport.computationType === 'other' && (
              <TextField
                label="Specify Computation Type"
                value={callReport.computationTypeOther}
                onChange={(event) => setCallReport({ computationTypeOther: event.target.value })}
                sx={fieldSx}
              />
            )}

            <RadioRow
              label="Payment Frequency"
              value={callReport.paymentFrequency}
              options={PAYMENT_FREQUENCY_OPTIONS}
              onChange={(value) => setCallReport({ paymentFrequency: value })}
            />
            {callReport.paymentFrequency === 'other' && (
              <TextField
                label="Specify Payment Frequency"
                value={callReport.paymentFrequencyOther}
                onChange={(event) => setCallReport({ paymentFrequencyOther: event.target.value })}
                sx={fieldSx}
              />
            )}

            <Stack direction="row" spacing={2}>
              <TextField
                label="Number of Payments"
                type="number"
                value={callReport.numberOfPayments}
                onChange={(event) => setCallReport({ numberOfPayments: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="First Payment Date"
                type="date"
                value={callReport.firstPaymentDate}
                onChange={(event) => setCallReport({ firstPaymentDate: event.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Proposed Release Date"
                type="date"
                value={callReport.proposedReleaseDate}
                onChange={(event) => setCallReport({ proposedReleaseDate: event.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Grace Period"
                value={callReport.gracePeriod}
                onChange={(event) => setCallReport({ gracePeriod: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>

            <TextField
              label="Final Use of Proceeds"
              value={callReport.finalUseOfProceeds}
              onChange={(event) => setCallReport({ finalUseOfProceeds: event.target.value })}
              sx={fieldSx}
            />

            <RadioRow
              label="Primary Source of Repayment"
              value={callReport.proposalPrimaryRepaymentSource}
              options={REPAYMENT_SOURCE_OPTIONS}
              onChange={(value) => setCallReport({ proposalPrimaryRepaymentSource: value })}
            />

            <TextField
              label="Secondary Source of Repayment"
              value={callReport.secondaryRepaymentSource}
              onChange={(event) => setCallReport({ secondaryRepaymentSource: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1.5 }}>
            Loan Computation
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1.5 }}>
            Manual entry — no formula is applied automatically.
          </Typography>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Estimated Amortization"
                type="number"
                value={callReport.estimatedAmortization}
                onChange={(event) => setCallReport({ estimatedAmortization: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Estimated Total Interest"
                type="number"
                value={callReport.estimatedTotalInterest}
                onChange={(event) => setCallReport({ estimatedTotalInterest: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Estimated Total Repayment"
                type="number"
                value={callReport.estimatedTotalRepayment}
                onChange={(event) => setCallReport({ estimatedTotalRepayment: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Estimated Maturity Value"
                type="number"
                value={callReport.estimatedMaturityValue}
                onChange={(event) => setCallReport({ estimatedMaturityValue: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Preliminary Debt-to-Income Ratio (%)"
                type="number"
                value={callReport.preliminaryDti}
                onChange={(event) => setCallReport({ preliminaryDti: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Disposable Income After Proposed Amortization"
                type="number"
                value={callReport.disposableIncomeAfterAmortization}
                onChange={(event) =>
                  setCallReport({ disposableIncomeAfterAmortization: event.target.value })
                }
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1.5 }}>
            Requested vs. Proposed
          </Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 13, color: '#667085', minWidth: 160 }}>Amount</Typography>
              <ComparisonChip label={COMPARE_AMOUNT_LABEL[amountComparison]} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 13, color: '#667085', minWidth: 160 }}>Term</Typography>
              <ComparisonChip label={COMPARE_TERM_LABEL[termComparison]} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={1}>
              <ReadOnlyField
                label="Disposable Income Before Amortization"
                value={`₱${disposableBefore.toLocaleString()}`}
              />
              <ReadOnlyField
                label="Disposable Income After Amortization"
                value={`₱${disposableAfter.toLocaleString()}`}
              />
            </Stack>
          </Stack>

          {amountOrTermChanged && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <RadioRow
                label="Adjustment Reason"
                value={callReport.adjustmentReason}
                options={ADJUSTMENT_REASON_OPTIONS}
                onChange={(value) => setCallReport({ adjustmentReason: value })}
              />
              {callReport.adjustmentReason === 'other' && (
                <TextField
                  label="Specify Adjustment Reason"
                  value={callReport.adjustmentReasonOther}
                  onChange={(event) => setCallReport({ adjustmentReasonOther: event.target.value })}
                  sx={fieldSx}
                />
              )}
            </Stack>
          )}
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <RadioRow
          label="Collateral Requirement"
          value={callReport.collateralRequirement}
          options={COLLATERAL_REQUIREMENT_OPTIONS}
          onChange={(value) => setCallReport({ collateralRequirement: value })}
        />

        {callReport.collateralEntries.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
              Collateral entries (from section 9, read-only here)
            </Typography>
            <Stack spacing={2}>
              {callReport.collateralEntries.map((entry, index) => (
                <Box
                  key={entry.id}
                  sx={{ p: 2, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}
                >
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#8891A6', mb: 1 }}>
                    Collateral {index + 1}
                  </Typography>
                  <CollateralEntryFieldsReadOnly entry={entry} />
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Required Documents
          </Typography>
          <ChipToggleGroup
            options={REQUIRED_DOC_OPTIONS}
            selected={callReport.requiredDocuments}
            onToggle={toggleRequiredDoc}
          />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Conditions Before Proceeding
          </Typography>
          <ChipToggleGroup
            options={CONDITION_OPTIONS}
            selected={callReport.conditionsBeforeProceeding}
            onToggle={toggleCondition}
          />
        </Box>

        <RadioRow
          label="Preliminary Recommendation"
          value={callReport.preliminaryRecommendation}
          options={PRELIMINARY_RECOMMENDATION_OPTIONS}
          onChange={(value) => setCallReport({ preliminaryRecommendation: value })}
        />

        {showRecommendationReason && (
          <TextField
            label="Recommendation Reason"
            multiline
            minRows={2}
            required
            value={callReport.recommendationReason}
            onChange={(event) => setCallReport({ recommendationReason: event.target.value })}
            sx={fieldSx}
          />
        )}

        <TextField
          label="Loan Package Notes"
          multiline
          minRows={2}
          value={callReport.loanPackageNotes}
          onChange={(event) => setCallReport({ loanPackageNotes: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}

// Small read-only renderer for reused collateral entries — deliberately not
// importing CollateralEntryFields' interactive RadioRow version here, since
// this needs to render plain text, not disabled radio buttons, to look
// clearly like a summary rather than a second edit surface.
function CollateralEntryFieldsReadOnly({ entry }: { entry: import('src/auth/admin-context').CollateralEntry }) {
  return (
    <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={1}>
      <ReadOnlyField label="Type" value={entry.type} />
      <ReadOnlyField label="Description" value={entry.description} />
      <ReadOnlyField label="Estimated Value" value={entry.estimatedValue ? `₱${Number(entry.estimatedValue).toLocaleString()}` : ''} />
      <ReadOnlyField label="Registered Owner" value={entry.registeredOwner} />
    </Stack>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint src/sections/admin/call-report/loan-package-proposal-card.tsx`
Expected: no errors. If `Chip` is flagged unused (it's used inside `ComparisonChip`), verify the import path is correct — it should not be flagged since it's used.

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/loan-package-proposal-card.tsx
git commit -m "Add Loan Package Proposal card with requested-vs-proposed comparison"
```

---

## Task 10: Assemble `CallReportView` and wire the Proceed gate

**Files:**
- Modify: `src/sections/admin/call-report-view.tsx`

**Interfaces:**
- Consumes: every card component from Tasks 3-9 (`CallDetailsCard`, `LoanDiscussionCard`, `ResidenceHouseholdCard`, `EmploymentBusinessCard`, `OrganizationMembershipCard`, `QuickFinancialInfoCard`, `PaymentBehaviorCard`, `OfficerObservationCard`, `CollateralInformationCard`, `AgreedNextStepsCard`, `AdditionalRemarksCard`, `CallSummaryCard`, `LoanPackageProposalCard`), `ApplicationReviewHeader`, `ApplicationDetailsCard` (both already existed and are unchanged).
- Produces: `CallReportView` (no props) — this is the page component imported by `src/app/admin/applications/[id]/call-report/page.tsx` (already exists and needs no changes, since it already just renders `<CallReportView />`).

- [ ] **Step 1: Confirm the page route file needs no changes**

Read `src/app/admin/applications/[id]/call-report/page.tsx` and confirm it's a thin wrapper that just renders `<CallReportView />` with no props — if so, no changes needed there.

- [ ] **Step 2: Replace `call-report-view.tsx`**

Replace the full contents of `src/sections/admin/call-report-view.tsx` with:

```tsx
'use client';

import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { CallDetailsCard } from './call-report/call-details-card';
import { LoanDiscussionCard } from './call-report/loan-discussion-card';
import { ResidenceHouseholdCard } from './call-report/residence-household-card';
import { EmploymentBusinessCard } from './call-report/employment-business-card';
import { OrganizationMembershipCard } from './call-report/organization-membership-card';
import { QuickFinancialInfoCard } from './call-report/quick-financial-info-card';
import { PaymentBehaviorCard } from './call-report/payment-behavior-card';
import { OfficerObservationCard } from './call-report/officer-observation-card';
import { CollateralInformationCard } from './call-report/collateral-information-card';
import { AgreedNextStepsCard } from './call-report/agreed-next-steps-card';
import { LoanPackageProposalCard } from './call-report/loan-package-proposal-card';
import { CallSummaryCard } from './call-report/call-summary-card';
import { AdditionalRemarksCard } from './call-report/additional-remarks-card';
import { cardSx } from './call-report/call-report-types';

// ----------------------------------------------------------------------

export function CallReportView() {
  const router = useRouter();
  const { signUpData, application } = useRegistration();
  const { review, setCallReport } = useAdmin();

  if (!signUpData || !application.financialInfo || !application.personalInfo) return null;

  const { callReport } = review;

  const followUpRequired =
    callReport.callStatus === 'follow-up-needed' ||
    callReport.nextSteps.includes('schedule-follow-up-call');

  const canProceed =
    !!callReport.callStatus &&
    !!callReport.identityConfirmed &&
    !!callReport.preliminaryRecommendation &&
    (!followUpRequired || !!callReport.followUpDate);

  const handleProceed = (proceed: boolean) => {
    setCallReport({ approved: true });

    if (proceed) {
      router.push(paths.admin.transactionType(encodeURIComponent(signUpData.email)));
    } else {
      router.push(paths.admin.applications);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 2 · Call Report" reviewStep="callReport" />

      <Stack spacing={2.5}>
        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Call Report &amp; Loan Package Proposal
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            Complete this structured interview live while on the call with the borrower.
          </Typography>
        </Box>

        <ApplicationDetailsCard />

        <CallDetailsCard />
        <LoanDiscussionCard />
        <ResidenceHouseholdCard />
        <EmploymentBusinessCard />
        <OrganizationMembershipCard />
        <QuickFinancialInfoCard />
        <PaymentBehaviorCard />
        <OfficerObservationCard />
        <CollateralInformationCard />
        <AgreedNextStepsCard />
        <LoanPackageProposalCard />
        <CallSummaryCard />
        <AdditionalRemarksCard />

        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {canProceed
              ? 'Approve the call report and decide whether to continue this application.'
              : 'Complete Call Status, Identity Confirmed, Preliminary Recommendation (and Follow-up Date if applicable) before proceeding.'}
          </Typography>

          <Stack direction="row" spacing={1.5}>
            <Button
              onClick={() => handleProceed(true)}
              disabled={!canProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{
                bgcolor: '#1C2A6E',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { bgcolor: '#14205A' },
              }}
            >
              Proceed
            </Button>
            <Button
              onClick={() => handleProceed(false)}
              variant="outlined"
              sx={{
                color: '#667085',
                borderColor: '#E1E4ED',
                borderRadius: '10px',
                px: 2.5,
              }}
            >
              Do Not Proceed
            </Button>
          </Stack>

          {review.callReport.approved && (
            <Typography sx={{ fontSize: 12.5, color: '#12B76A', fontWeight: 600, mt: 2 }}>
              Call report approved.
            </Typography>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npx eslint src/sections/admin/call-report-view.tsx`
Expected: no errors.

- [ ] **Step 5: Full project lint + typecheck**

Run:
```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
npx tsc --noEmit
npx eslint src
```
Expected: both clean, confirming every file across all 9 prior tasks plus this assembly task compiles and lints together with no cross-file mistakes (e.g. a typo'd import path that only shows up once everything is actually wired together).

- [ ] **Step 6: Clean production build**

Run:
```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
rm -rf .next
npx next build
```
Expected: build succeeds, `/admin/applications/[id]/call-report` listed in the route output.

- [ ] **Step 7: Playwright smoke walk**

Start the dev server in the background (`npx next dev -p 3000`), then run a Playwright script that: logs into admin with sample data, navigates to Maria Santos' application, fills Initial Credit Checking with sample data, clicks Approve to reach Call Report, then on the Call Report page:
- Confirms all 13 numbered section headings are present (`"1. Call Details"` through `"13. Additional Remarks"`).
- Selects a Call Type radio, confirms it stays selected.
- Selects Place of Call = "Other", confirms "Specify Place of Call" field appears.
- Checks a Client Concern chip, confirms "Concern Notes" field appears.
- Selects "Is this a loan renewal?" = Yes, confirms the 4 renewal sub-fields appear.
- Fills Declared Net Monthly Income and one obligation field, confirms the 4 computed rows (Total Monthly Income, Total Monthly Obligations, Preliminary Disposable Income, Estimated Debt-to-Income Ratio) update live.
- Selects Collateral Offered = Yes, clicks "Add Another Collateral", confirms a new entry card appears; fills its Collateral Type; confirms the same entry (read-only) appears under Loan Package Proposal's collateral block.
- Clicks "Generate Summary" in the Call Summary card, confirms the textarea is populated with non-empty text.
- Confirms the Proceed button is disabled until Call Status, Identity Confirmed, and Preliminary Recommendation are all set, then becomes enabled once they are.
- Takes a full-page screenshot for visual review.

Expected: all assertions pass; screenshot shows a clean, correctly-styled long-scroll page matching Initial Credit Checking's visual style.

- [ ] **Step 8: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report-view.tsx
git commit -m "Assemble full Call Report page from all section cards"
```

---

## Task 11: Update `PROJECT_OVERVIEW.md`

**Files:**
- Modify: `PROJECT_OVERVIEW.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing (documentation only).

- [ ] **Step 1: Find the current Call Report documentation**

Run: `grep -n "Call Report" "/Users/almikkaj/Downloads/Gvtech Code/lms-v2/PROJECT_OVERVIEW.md"` to locate the existing (likely brief/stub-era) description of Call Report.

- [ ] **Step 2: Replace/expand that section**

Add or replace the Call Report section with a description covering: the file split under `src/sections/admin/call-report/`, the full `CallReport` type living in `AdminContext`, the `isRenewal` field being a deliberate addition not in the original spec (with the reason — Transaction Type isn't chosen until a later step), the computed-vs-manual distinction for financial ratios (section 6 auto-computed, section 11 Loan Computation manual-only), the collateral-entry reuse between sections 9 and 11, and the Call Summary generate/regenerate-with-confirmation behavior. Follow the existing file's documentation style (see how Initial Credit Checking's Officer Notes / For Reconsideration features are documented for the right level of detail and tone).

- [ ] **Step 3: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add PROJECT_OVERVIEW.md
git commit -m "Document the Call Report redesign in PROJECT_OVERVIEW.md"
```

---

## Self-Review Notes

**Spec coverage check:** All 13 sections have a task (Tasks 3-9 build the cards, Task 10 assembles them). Computed values (section 6) — Task 2. Call Summary generation (section 12) — Task 8. Collateral reuse (sections 9 & 11) — Task 6 (entry fields) + Task 9 (read-only reuse). Renewal gating (section 4) — Task 4, using the `isRenewal` field from Task 1. Required-field gating on Proceed — Task 10. `PROJECT_OVERVIEW.md` — Task 11.

**Cross-task naming consistency verified:** `RadioRow` (defined Task 3, exported, used in Tasks 4-9), `ChipToggleGroup` (defined Task 3 as module-private, exported in Task 5 Step 0, used in Tasks 5, 7, 9), `CollateralEntryFields` (Task 6, consumed read-only style in Task 9 via a separate small `CollateralEntryFieldsReadOnly` to avoid interactive controls in a read-only context), `setCallReport`/`addCollateralEntry`/`updateCollateralEntry`/`removeCollateralEntry` (Task 1, consumed in Tasks 6 and throughout). Computation function names (`toNumber`, `computeTotalMonthlyIncome`, `computeTotalMonthlyObligations`, `computeDisposableIncome`, `computeDti`, `compareAmount`, `compareTerm`) match exactly between Task 2's definitions and their use in Tasks 5, 8, 9.
