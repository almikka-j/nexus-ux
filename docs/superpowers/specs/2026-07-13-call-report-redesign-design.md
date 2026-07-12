# Call Report Redesign — Design Spec

Date: 2026-07-13

## Purpose

Replace the current Call Report stub (`src/sections/admin/call-report-view.tsx`) with a full structured interview form the officer fills out **live, while on the phone/in-person/video call with the borrower**. Every field is a structured selection (radio, select, checkbox, chip, date, number) rather than free text, to minimize typing during an active conversation. Only two free-text fields exist in the whole form: a short "Concern Notes" (conditionally shown) and one final "Additional Remarks" field — everything else is structured.

## Scope & Non-Goals

- This redesign covers the Call Report page only. It does not touch Initial Credit Checking, Reconsideration, Transaction Type, or Requirement Checklist.
- No real loan-computation formulas exist in this codebase. Section 11's "Loan Computation" fields (Estimated Amortization, Total Interest, Total Repayment, Maturity Value, Preliminary DTI) are **manual entry fields** — the officer types in a number if they have one; nothing is auto-calculated for these. Only the Quick Financial Info ratios in section 6 (which have explicit formulas in the source spec) are auto-computed.
- Checklists that look similar across sections (e.g., "Bank Statements" appearing in both section 6's Supporting Documents and section 11's Required Documents) are **independent state** — no cross-section deriving/sharing, since they represent different things (what's on hand today vs. what's required for the package).
- "For Renewal applications only" fields (section 4) are gated by a new lightweight field added to this form (`isRenewal: 'yes' | 'no' | null`), **not** by `AdminContext.review.transactionType` — that field isn't set until the later Transaction Type step, which happens after Call Report in this app's flow (`creditChecking → callReport → transactionType → requirementChecklist`).

## State: `AdminContext.callReport`

Replace the current `CallReport = { approved: boolean }` with a fully-typed object. Follows the existing `setCreditChecking(partial)` pattern — one `setCallReport(data: Partial<CallReport>)` setter already exists and continues to work; collateral (an array) gets its own small set of array-mutation helpers.

```ts
export type CallType = 'in-person' | 'phone' | 'video';
export type PlaceOfCall = 'branch' | 'residence' | 'business' | 'online' | 'other';
export type CallStatus = 'in-progress' | 'completed' | 'follow-up-needed' | 'unable-to-reach';
export type IdentityConfirmed = 'yes' | 'no' | 'for-verification';

export type LoanPurposeConfirmation = 'confirmed' | 'changed' | 'needs-clarification';
export type RepaymentSource = 'salary' | 'business-income' | 'rental-income' | 'pension' | 'other';

export type ClientUnderstandingItem =
  | 'interest-rate' | 'monthly-amortization' | 'loan-term' | 'processing-fees'
  | 'collateral-requirements' | 'required-documents';

export type ClientConcernItem =
  | 'interest-rate' | 'loan-amount' | 'loan-term' | 'monthly-amortization'
  | 'processing-fees' | 'collateral' | 'required-documents' | 'processing-time' | 'other';

export type ResidenceYears = 'lt-1' | '1-2' | '3-5' | 'gt-5';
export type ResidenceStatus = 'owned' | 'mortgaged' | 'rented' | 'living-with-relatives' | 'company-provided' | 'other';
export type YesNoPreferNot = 'yes' | 'no' | 'prefer-not-to-answer';

export type MainIncomeSource = 'employment' | 'business' | 'both' | 'other';
export type TenureRange = 'lt-1' | '1-3' | '3-5' | 'gt-5';
export type IncomeStability = 'stable' | 'seasonal' | 'irregular' | 'undetermined';
export type IncomeTrend = 'increasing' | 'stable' | 'decreasing' | 'undetermined';
export type IncomeChange = 'increased' | 'no-change' | 'decreased' | 'not-verified';

export type MembershipType =
  | 'civic-social' | 'professional' | 'business' | 'cooperative' | 'community' | 'other';
export type MembershipStanding = 'good-standing' | 'with-concern' | 'not-verified';

export type SupportingDocItem =
  | 'payslip' | 'itr' | 'bir-2316' | 'coe' | 'bank-statement'
  | 'business-records' | 'utility-bills' | 'credit-card-statements' | 'none-yet';

export type ElectricityPayment =
  | 'fully-paid-on-time' | 'occasionally-delayed' | 'frequently-delayed'
  | 'with-unpaid-balance' | 'not-borrowers-name' | 'not-applicable' | 'for-verification';
export type CreditCardPayment =
  | 'fully-paid-on-time' | 'pays-more-than-minimum' | 'minimum-only'
  | 'occasionally-delayed' | 'frequently-delayed' | 'no-credit-card' | 'for-verification';
export type OtherLoanRepayment =
  | 'on-time' | 'minor-delays' | 'major-delays' | 'no-existing-loan' | 'for-verification';
export type YesNoVerify = 'yes' | 'no' | 'for-verification';

export type OfficerObservationItem =
  // positive/neutral
  | 'cooperative' | 'responsive' | 'transparent' | 'prepared' | 'understands-request'
  | 'answers-clear' | 'answers-consistent'
  // needs attention
  | 'hesitant' | 'info-incomplete' | 'answers-inconsistent' | 'requires-verification' | 'possible-risk';

export type CollateralOffered = 'yes' | 'no' | 'tbd';
export type CollateralType =
  | 'real-estate' | 'vehicle' | 'equipment' | 'inventory' | 'receivables'
  | 'deposit' | 'personal-guarantee' | 'corporate-guarantee' | 'other';
export type DocsAvailable = 'yes' | 'no' | 'pending';
export type ExistingLien = 'yes' | 'no' | 'unknown';
export type RequiresAppraisal = 'yes' | 'no' | 'tbd';

export type CollateralEntry = {
  id: string;                        // crypto.randomUUID() at creation, for stable list keys / removal
  type: CollateralType | '';
  description: string;
  quantity: string;
  registeredOwner: string;
  ownerRelationship: string;
  location: string;
  estimatedValue: string;             // numeric string, currency-formatted on display like other money fields in this app
  ownershipDocsAvailable: DocsAvailable | '';
  existingLien: ExistingLien | '';
  requiresAppraisal: RequiresAppraisal | '';
};

export type NextStepItem =
  | 'submit-proof-of-income' | 'submit-bank-statements' | 'submit-business-documents'
  | 'submit-utility-bills' | 'submit-credit-card-statements' | 'verify-employment'
  | 'verify-business' | 'verify-residence' | 'conduct-site-visit'
  | 'submit-collateral-documents' | 'request-appraisal' | 'schedule-follow-up-call'
  | 'proceed-to-next-process' | 'other';

export type ResponsibleParty = 'borrower' | 'account-officer' | 'credit-officer' | 'other';

export type InterestRateBasis = 'monthly' | 'annual';
export type ComputationType = 'diminishing-balance' | 'add-on-rate' | 'other';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'other';

export type AdjustmentReason =
  | 'income-capacity' | 'existing-obligations' | 'collateral-value' | 'credit-risk'
  | 'exceeds-affordability' | 'borrower-requested' | 'officer-recommendation' | 'other';

export type RequiredDocItem =
  | 'latest-payslip' | 'itr' | 'bir-2316' | 'coe' | 'bank-statements'
  | 'business-registration' | 'financial-statements' | 'utility-bills'
  | 'credit-card-statements' | 'collateral-ownership-docs' | 'tax-declaration'
  | 'transfer-certificate-title' | 'vehicle-registration' | 'appraisal-report'
  | 'co-maker-documents' | 'guarantor-documents' | 'other';

export type ConditionItem =
  | 'income-verification' | 'employment-verification' | 'business-verification'
  | 'residence-verification' | 'satisfactory-bureau-checking' | 'collateral-appraisal'
  | 'complete-documents' | 'additional-collateral' | 'co-maker-or-guarantor'
  | 'reduction-of-amount' | 'adjustment-of-term' | 'other';

export type PreliminaryRecommendation =
  | 'proceed-as-requested' | 'proceed-with-revised-terms' | 'proceed-with-conditions'
  | 'needs-additional-verification' | 'schedule-follow-up' | 'hold' | 'do-not-proceed';

export type CallReport = {
  approved: boolean; // kept — still drives the existing Proceed/Do Not Proceed gate at the bottom

  // 1. Call Details
  callDate: string;               // yyyy-mm-dd, <input type="date">
  callTime: string;               // HH:mm, <input type="time">
  callType: CallType | '';
  placeOfCall: PlaceOfCall | '';
  placeOfCallOther: string;       // shown only when placeOfCall === 'other'
  clientRepresentative: string;
  pgRepresentative: string;
  callStatus: CallStatus | '';
  identityConfirmed: IdentityConfirmed | '';

  // 2. Loan Discussion
  loanPurposeConfirmation: LoanPurposeConfirmation | '';
  finalLoanPurpose: string;       // defaults from application.financialInfo.loanPurpose
  specificUseOfProceeds: string;
  targetReleaseDate: string;
  primaryRepaymentSource: RepaymentSource | '';
  otherRepaymentSource: string;   // shown only when primaryRepaymentSource === 'other'
  clientUnderstanding: ClientUnderstandingItem[];
  clientConcerns: ClientConcernItem[];
  concernNotes: string;           // shown only when clientConcerns.length > 0

  // 3. Residence and Household Information
  yearsAtResidence: ResidenceYears | '';
  residenceStatus: ResidenceStatus | '';
  residenceStatusOther: string;   // shown only when residenceStatus === 'other'
  numberOfDependents: string;     // numeric string
  numberOfIncomeEarners: string;  // numeric string
  supportingMultipleFamilies: YesNoPreferNot | '';

  // 4. Employment or Business Information
  mainIncomeSource: MainIncomeSource | '';
  otherIncomeSource: string;      // shown only when mainIncomeSource === 'other'
  employmentTenure: TenureRange | '';
  incomeStability: IncomeStability | '';
  incomeTrend: IncomeTrend | '';
  isRenewal: 'yes' | 'no' | '';   // NEW — not in original spec verbatim; gates the 4 fields below (see Scope note)
  incomeChangeSincePrevious: IncomeChange | '';   // shown only when isRenewal === 'yes'
  previousMonthlyIncome: string;                  // shown only when isRenewal === 'yes'
  currentMonthlyIncome: string;                   // shown only when isRenewal === 'yes'
  incomeChangeEffectiveDate: string;              // shown only when isRenewal === 'yes'

  // 5. Organization Membership
  isOrgMember: 'yes' | 'no' | '';
  membershipType: MembershipType | '';            // shown only when isOrgMember === 'yes'
  organizationName: string;                       // shown only when isOrgMember === 'yes'
  membershipYears: string;                        // shown only when isOrgMember === 'yes'
  membershipStanding: MembershipStanding | '';     // shown only when isOrgMember === 'yes'

  // 6. Quick Financial Information
  declaredGrossMonthlyIncome: string;
  declaredNetMonthlyIncome: string;
  otherRecurringMonthlyIncome: string;
  estimatedMonthlyHouseholdExpenses: string;
  existingMonthlyLoanPayments: string;
  monthlyCreditCardPayments: string;
  otherRecurringMonthlyObligations: string;
  // totalMonthlyIncome, totalMonthlyObligations, preliminaryDisposableIncome,
  // estimatedDebtToIncomeRatio are NOT stored — always derived at render time
  // via pure functions (see "Computed values" below), so they can never drift
  // from their inputs.
  supportingDocsAvailable: SupportingDocItem[];

  // 7. Payment Behavior
  electricityPayment: ElectricityPayment | '';
  creditCardPayment: CreditCardPayment | '';
  otherLoanRepayment: OtherLoanRepayment | '';
  hasReturnedChecks: YesNoVerify | '';
  hasPastDueObligations: YesNoVerify | '';
  hasPendingCases: YesNoVerify | '';
  paymentBehaviorExplanation: string; // shown only when any of the 3 above === 'yes'

  // 8. Officer Observation
  officerObservations: OfficerObservationItem[];
  additionalObservationNotes: string;

  // 9. Collateral Information
  collateralOffered: CollateralOffered | '';
  collateralEntries: CollateralEntry[];           // shown/editable only when collateralOffered === 'yes'

  // 10. Agreed Next Steps
  nextSteps: NextStepItem[];
  responsibleParty: ResponsibleParty | '';
  nextStepsDueDate: string;
  followUpDate: string;           // required when callStatus === 'follow-up-needed' OR nextSteps includes 'schedule-follow-up-call'
  nextStepsInstructions: string;

  // 11. Loan Package Proposal
  proposedLoanAmount: string;     // defaults from application.financialInfo.desiredLoanAmount
  proposedLoanTerm: string;       // defaults from application.financialInfo.loanTermMonths
  proposedLoanFacility: string;
  proposedInterestRate: string;
  interestRateBasis: InterestRateBasis | '';
  computationType: ComputationType | '';
  computationTypeOther: string;   // shown only when computationType === 'other'
  paymentFrequency: PaymentFrequency | '';
  paymentFrequencyOther: string;  // shown only when paymentFrequency === 'other'
  numberOfPayments: string;
  firstPaymentDate: string;
  proposedReleaseDate: string;
  gracePeriod: string;
  finalUseOfProceeds: string;     // defaults from specificUseOfProceeds (section 2)
  proposalPrimaryRepaymentSource: RepaymentSource | ''; // defaults from primaryRepaymentSource (section 2)
  secondaryRepaymentSource: string;
  // Loan Computation — manual entry, no auto-calc (see Scope):
  estimatedAmortization: string;
  estimatedTotalInterest: string;
  estimatedTotalRepayment: string;
  estimatedMaturityValue: string;
  preliminaryDti: string;
  disposableIncomeAfterAmortization: string;
  adjustmentReason: AdjustmentReason | ''; // required when proposedLoanAmount != requested OR proposedLoanTerm != requested
  adjustmentReasonOther: string;           // shown only when adjustmentReason === 'other'
  collateralRequirement:
    | 'sufficient' | 'additional-required' | 'subject-to-appraisal' | 'tbd' | 'may-proceed-without' | '';
  requiredDocuments: RequiredDocItem[];
  conditionsBeforeProceeding: ConditionItem[];
  preliminaryRecommendation: PreliminaryRecommendation | '';
  recommendationReason: string;   // required when preliminaryRecommendation !== 'proceed-as-requested' and is set
  loanPackageNotes: string;

  // 12. Call Summary
  callSummary: string;            // auto-generated, officer-editable
  callSummaryEdited: boolean;     // true once officer has hand-edited; gates the "overwrite?" confirm on Regenerate

  // 13. Additional Remarks
  additionalRemarks: string;
};
```

Default/reset values in `createInitialReview()`: every enum field `''`, every array `[]`, every string `''`, `approved: false`, `callSummaryEdited: false`. `collateralEntries: []`.

### New setters on `AdminContextValue`

```ts
setCallReport: (data: Partial<CallReport>) => void;   // already exists, extended
addCollateralEntry: () => void;                        // pushes a new blank CollateralEntry with a fresh id
updateCollateralEntry: (id: string, data: Partial<CollateralEntry>) => void;
removeCollateralEntry: (id: string) => void;
```

## Computed values (section 6) — pure functions, not stored state

```ts
function computeTotalMonthlyIncome(cr: CallReport): number {
  return toNumber(cr.declaredNetMonthlyIncome) + toNumber(cr.otherRecurringMonthlyIncome);
}
function computeTotalMonthlyObligations(cr: CallReport): number {
  return toNumber(cr.estimatedMonthlyHouseholdExpenses)
    + toNumber(cr.existingMonthlyLoanPayments)
    + toNumber(cr.monthlyCreditCardPayments)
    + toNumber(cr.otherRecurringMonthlyObligations);
}
function computeDisposableIncome(cr: CallReport): number {
  return Math.max(0, computeTotalMonthlyIncome(cr) - computeTotalMonthlyObligations(cr));
}
function computeDti(cr: CallReport): number {
  const income = computeTotalMonthlyIncome(cr);
  if (income <= 0) return 0; // handle zero income safely, per spec
  return Math.min(100, (computeTotalMonthlyObligations(cr) / income) * 100);
}
```

`toNumber` parses a numeric-string field, treating `''`/`NaN` as `0`, and never returns negative (`Math.max(0, ...)`), satisfying "prevent negative values and handle zero income safely." These render live under the 7 input fields in section 6 as read-only computed rows (₱ formatted for money, % for DTI), recalculating on every keystroke — no submit/save step needed, consistent with how the rest of this app updates state on every change.

## Call Summary generation (section 12)

A pure function `buildCallSummary(review: ApplicationReview, signUpData): string` composes a plain-text summary from whichever of the "include when available" fields are actually filled in (skips anything empty/unset) — e.g.:

```
Call with Maria Santos on 2026-07-13, 14:30 (Phone Call). Identity confirmed.
Loan purpose confirmed: Home Improvement. Primary repayment source: Salary.
Residing at current address for 3–5 years, owned residence, 2 dependents.
Employment tenure 1–3 years, income stable and increasing.
Declared net monthly income ₱45,000; total obligations ₱12,000; preliminary
disposable income ₱33,000 (DTI 27%).
Payment behavior: electricity fully paid on time, no credit card, no existing loan.
Officer observations: cooperative, transparent, answers consistent.
Collateral: 1 item offered (Real Estate).
Agreed next steps: submit bank statements, verify employment. Due 2026-07-20.
Proposed: ₱150,000 over 24 months (same as requested).
Preliminary recommendation: Proceed as Requested.
```

- Rendered into a multiline `TextField` (`callSummary`), initially populated by `buildCallSummary(...)` the first time the officer scrolls to/opens this section (or on a "Generate Summary" button if the field is still empty).
- Officer can freely edit; on edit, `callSummaryEdited` flips to `true`.
- A "Regenerate Summary" button always available; if `callSummaryEdited` is `true`, clicking it opens a `ConfirmDialog` ("This will replace your edited summary — continue?") before overwriting; if `false`, it regenerates immediately (nothing to lose yet).

## Page layout (`CallReportView`)

One long scrolling `Container maxWidth="md"` page (matching Initial Credit Checking's visual style: white rounded cards, `#EBEDF3` borders), sections in this exact order, each its own card with a numbered heading:

1. `ApplicationReviewHeader` (unchanged, existing component)
2. `ApplicationDetailsCard` (unchanged, existing shared component — still shows the borrower's original application + any Initial Credit Checking notes)
3. **1. Call Details** — date/time fields, 3 radio groups (Call Type, Place of Call, Call Status), conditional text field (Specify Place of Call), 2 text fields (representatives), radio group (Identity Confirmed)
4. **2. Loan Discussion** — radio (Loan Purpose Confirmation), text field defaulted from application (Final Loan Purpose), text field (Specific Use of Proceeds), date field (Target Release Date), radio (Primary Source of Repayment) + conditional other, two checklists (Client Understanding, Client Concerns) rendered as chip-toggle groups, conditional Concern Notes
5. **3. Residence and Household Information** — radio (Years at Residence), radio (Residence Status) + conditional other, 2 number fields (dependents, income earners), radio (Supporting Multiple Families)
6. **4. Employment or Business Information** — radio (Main Source of Income) + conditional other, radio (Tenure), radio (Income Stability), radio (Income Trend), Yes/No (Is this a renewal?), conditional renewal sub-fields
7. **5. Organization Membership** — Yes/No, conditional block (membership type radio, org name text, years number, standing radio)
8. **6. Quick Financial Information** — note banner, 7 number fields, 4 live computed read-only rows, Supporting Documents Available chip checklist
9. **7. Payment Behavior** — note banner, 3 radio groups (electricity/credit-card/other-loan payment), 3 Yes/No/Verify radios (returned checks, past-due, pending cases), conditional explanation field
10. **8. Officer Observation** — one chip-multiselect grouped visually into "Positive or neutral" and "Needs attention" (still one flat array in state), optional notes field
11. **9. Collateral Information** — radio (Collateral Offered), conditional repeatable entry list (Add Another Collateral / Remove Collateral per entry), each entry a mini-card with its 10 fields
12. **10. Agreed Next Steps** — chip checklist, radio (Responsible Party), 2 date fields (Due Date, Follow-up Date — Follow-up Date shows a required-marker when gated condition is met), short instructions text field
13. **11. Loan Package Proposal** — read-only "Original Loan Request" block pulling from `application.financialInfo` (+ graceful omission of facility/transaction-type since those don't exist yet), then the full Proposed Terms field set, Loan Computation manual fields, Requested-vs-Proposed comparison with indicator chips, conditional Adjustment Reason, Collateral Requirement radio, collateral entries shown read-only (reused from section 9, not re-entered), Required Documents checklist, Conditions Before Proceeding checklist, Preliminary Recommendation radio, conditional Recommendation Reason, optional Loan Package Notes
14. **12. Call Summary** — auto-generated editable textarea + Regenerate button
15. **13. Additional Remarks** — single optional textarea
16. **Proceed application?** card (existing, kept as-is structurally) — Proceed / Do Not Proceed buttons

Floating "Fill with Sample Data" button pattern is **not** extended to this page in this pass (out of scope unless requested separately) — can be added later following the same toggle pattern used on Initial Credit Checking if wanted.

## Validation / required-field gating

Kept lightweight, consistent with how Initial Credit Checking gates its Approve button on `canDecide`:
- `followUpDate` required (shown with helper text) when `callStatus === 'follow-up-needed'` OR `nextSteps.includes('schedule-follow-up-call')`.
- `concernNotes` shown (not force-required, just revealed) when `clientConcerns.length > 0`.
- `paymentBehaviorExplanation` shown when any of the 3 Yes/No/Verify payment-behavior fields is `'yes'`.
- `adjustmentReason` required when `proposedLoanAmount !== application.financialInfo.desiredLoanAmount` (as strings, compared numerically) or `proposedLoanTerm !== application.financialInfo.loanTermMonths`.
- `recommendationReason` required when `preliminaryRecommendation` is set and isn't `'proceed-as-requested'`.
- The existing "Proceed" button gets a new `canProceed` gate requiring: `callStatus`, `identityConfirmed`, `preliminaryRecommendation` all set, and `followUpDate` present if required per above. (Do Not Proceed stays ungated, matching the existing pattern where declining never requires as much as approving.)

## Requested-vs-Proposed comparison (section 11)

Rendered as a small comparison table/row with indicator chips:
```ts
function compareAmount(requested: number, proposed: number): 'same' | 'lower' | 'higher' {
  if (proposed === requested) return 'same';
  return proposed < requested ? 'lower' : 'higher';
}
function compareTerm(requested: number, proposed: number): 'same' | 'shorter' | 'longer' {
  if (proposed === requested) return 'same';
  return proposed < requested ? 'shorter' : 'longer';
}
```
Disposable Income Before/After Amortization: "Before" = `computeDisposableIncome(cr)` from section 6; "After" = `computeDisposableIncome(cr) - toNumber(cr.estimatedAmortization)` (floored at 0, per the same negative-value guard).

## Note on free-text fields

Your spec's section 13 says only one general "Additional Remarks" field should exist, with no separate large text areas for Agenda/Plan of Action/Collateral Details/General Remarks. This spec has more than one text `TextField` beyond that — but every one of them is a **short, single-purpose field tied to a specific conditional selection** (e.g., "Specify Place of Call" only appears once "Other" is picked; "Concern Notes" only appears once a concern is checked), not a general free-write area competing with Additional Remarks. None are multiline "tell me anything" fields except Additional Remarks, Loan Package Notes, and Call Summary itself — all three explicitly called for in your spec as their own distinct, single fields.

## Out of scope / explicitly deferred

- No changes to `TransactionType`/Transaction Type step.
- No real interest/amortization formula (manual entry only, per your confirmation).
- No cross-section checklist deduplication (independent lists, per your confirmation).
- No "Fill with Sample Data" button added to this page in this pass.
- Reconsideration/Requirement Checklist screens untouched.
