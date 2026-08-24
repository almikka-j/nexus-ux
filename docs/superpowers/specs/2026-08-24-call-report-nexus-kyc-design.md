# Call Report → NEXUS KYC & Call Validation Report — Design Spec

Date: 2026-08-24

## Purpose

Fully replace the current Call Report form (`src/sections/admin/call-report-view.tsx` and its 12 section cards under `src/sections/admin/call-report/`) with a new form matching the supplied "NEXUS Customer KYC & Call Validation Report" PDF template exactly, section by section. This is a full rebuild, not a field-by-field migration — the two structures do not line up (the PDF centers on a per-item Confirm/Changed/Unable-to-Verify validation table with conditional per-item detail, which does not exist in the current form at all).

## Scope & Non-Goals

- Covers only the Call Report page and its dedicated state/components. Does not touch Initial Credit Checking, Reconsideration, Transaction Type, or Requirement Checklist.
- `review.callReport.comakers: CiComakerEntry[]` must keep existing and keep being populated, since `credit-investigation/ci-report-card.tsx` reads it directly to pre-fill CI's own comaker section (`const comakers = review.callReport.comakers`). The new form populates this array from the PDF's "9. Co-maker/Guarantor Information" changed-info block (one entry, since the PDF only captures one co-maker's full detail) rather than from a dedicated top-level comaker card, which the PDF does not have.
- No real backend, document generation, PDF export, or lending engine — same prototype conventions as every other admin screen. "NEXUS auto-populate application data" in the PDF's system rule is represented by reading `application`/`signUpData` directly for each Application Validation row's "Current Application Data" column, same as `ApplicationDetailsCard` already does elsewhere.
- The AI Summary / AI Exceptions / AI Recommendation in "8. NEXUS System Validation" are pure client-side derived text (same convention as the current `call-report-summary.ts`/`call-report-risk.ts`), not real AI calls.
- No e-signature or file upload for the AO Endorsement Declaration — Account Officer / Reviewed by Head are typed name + date/time fields, matching every other "no real login" simulated-approval convention in this app (e.g. `head-approval-card.tsx`'s own disclaimer pattern).
- Checkbox items in the PDF that are visually numbered inconsistently in the source document (the Application Validation table repeats "6." for both "Existing Loans" and "Residence/Business Address") are treated as two distinct rows in the same order the PDF prints them, not deduplicated or renumbered — the visible order matters more than the label numbering, which is a known typo in the source PDF.

## State: `AdminContext.callReport` (full replacement)

Replaces the current 97-field `CallReport` type entirely. Follows the existing `setCallReport(partial)` pattern.

```ts
export type InteractionType = 'in-person' | 'phone' | 'video';
export type IdentityStatus = 'confirmed' | 'for-verification' | 'unable-to-confirm';
export type IdentityBasisItem = 'app-data-matched' | 'valid-government-id' | 'verification-questions' | 'other';

export type ValidationStatus = 'confirmed' | 'changed' | 'unable-to-verify' | '';

export type LoanFacilityType = 'sme-business' | 'clean-loan' | 'sangla-titulo' | 'clubflex-direct' | 'clubflex-financing';

export type LoanPurposeType =
  | 'additional-working-capital' | 'new-business-venture' | 'loan-take-out-refinancing'
  | 'home-renovation-construction' | 'residential-property-acquisition'
  | 'commercial-property-acquisition' | 'machinery-equipment-acquisition'
  | 'club-share-acquisition' | 'raw-land-acquisition-development' | 'bridge-financing' | 'other';

export type WorkingCapitalUse =
  | 'inventory-stock' | 'raw-materials' | 'supplier-payments' | 'payroll-employee-costs'
  | 'operating-expenses' | 'seasonal-working-capital' | 'contract-project-financing'
  | 'cash-flow-support' | 'business-expansion' | 'other';

export type RepaymentSourceType =
  | 'employment-salary' | 'business-income' | 'rental-income' | 'remittance' | 'pension'
  | 'professional-fees' | 'commission-based' | 'dividend-investment-income' | 'other';

export type EmploymentTenureRange = 'lt-1' | '1-3' | '3-5' | 'gt-5';

export type CollateralDeclarationType =
  | 'real-estate' | 'club-share' | 'vehicle' | 'equipment' | 'inventory'
  | 'receivables' | 'unsecured' | 'corporate-guarantee' | 'other';

export type YesNoVerify = 'yes' | 'no' | 'for-verification';
export type PaymentHistoryDescriptor = 'on-time' | 'minor-delays' | 'major-delays' | 'for-verification';

export type UnderstandingLevel = 'fully-understood' | 'clarification-required' | 'not-yet-discussed';
export type LoanTermItem =
  | 'interest-rate' | 'loan-amount' | 'loan-term' | 'monthly-amortization' | 'processing-fees'
  | 'documentary-requirements' | 'collateral-requirements' | 'loan-release-process'
  | 'pre-termination-prepayment-policy';

export type ProposalInterestRateBasis = 'monthly' | 'annual';
export type ProposalComputationType = 'diminishing-balance' | 'add-on' | 'other';

export type RiskDriverItem = 'character' | 'capacity' | 'collateral' | 'kyc' | 'documentation' | 'information-consistency';
export type CallDispositionType =
  | 'proceed-to-next-process' | 'proceed-subject-to-requirements'
  | 'additional-verification' | 'follow-up-call' | 'sales-reject-decline';

export type SystemVarianceStatus = 'none' | 'noted' | '';

// One row of the Application Validation table, PDF section 2, items 1–9.
export type ValidationItemKey =
  | 'identityAuthorizedRep' | 'loanFacility' | 'loanPurpose' | 'primaryRepaymentSource'
  | 'businessEmploymentInfo' | 'existingLoansObligations' | 'residenceBusinessAddress'
  | 'collateralSecurityDeclaration' | 'comakerGuarantee';

export type ExistingLoanRow = {
  id: string;
  lender: string;
  loanType: string;
  outstandingBalance: string;
  monthlyPayment: string;
};

// Only populated when loanPurpose's ValidationStatus is 'changed' AND the
// selected LoanPurposeType is 'loan-take-out-refinancing' (PDF's own
// conditional "If Loan Take-out / Refinancing — Updated Details").
export type LoanTakeOutInfo = {
  currentLender: string;
  outstandingBalance: string;
  estimatedPayoffAmount: string;
  remainingLoanTerm: string;
  reasonForTakeOut: string;
  status: string;
};

// PDF's "9. Co-maker/Guarantor Information's - Change To" — captured only
// when comakerGuarantee's ValidationStatus is 'changed'. Distinct from
// (but mapped into) CiComakerEntry for CI's own pre-fill — see Scope note.
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

export type CallReport = {
  // Kept from the old shape — batch decision, unrelated to the PDF's own fields.
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

  // 2. Application Validation — one ValidationStatus per row key, plus one
  // shared free-text field, plus each row's own conditional "Changed To" detail.
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

  // 6. Proposed Loan Package (PDF numbers this section "6" — see Scope note
  // on the source document's own inconsistent numbering)
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

  // 8. NEXUS System Validation / Exception Handoff (derived, but persisted
  // like every other admin-context field so the result modal / detail view
  // can read it without recomputing)
  aiSummary: string;
  aiExceptions: string;
  aiRecommendation: string;
  aoVsSystemVariance: SystemVarianceStatus;
  varianceExplanation: string;

  // 8 (second, PDF's own duplicate numbering). Account Officer Endorsement Declaration
  accountOfficerName: string;
  accountOfficerDateTime: string;
  reviewedByHeadName: string;
  reviewedByHeadDateTime: string;
};
```

`createExistingLoanRow()`/`createEmptyLoanTakeOutInfo()`/`createEmptyComakerChange()` factory helpers, same convention `createAppraisalReportLandTitle()` already uses. `existingLoanRows` gets its own array mutators (`addExistingLoanRow`/`updateExistingLoanRow`/`removeExistingLoanRow`) on `AdminContext`, mirroring `addCollateralEntry` et al.

### `comakers: CiComakerEntry[]` sync

Whenever `comakerChange` is edited (via a single `setCallReportComakerChange(partial)` helper), the corresponding `CiComakerEntry` in `callReport.comakers[0]` is kept in sync for the fields that overlap (`name` ← `completeName`, `relationshipToBorrower`, `address` ← `completeAddress`, `contactNumber`, `occupation` ← `occupationEmployerName`; `monthlyIncome` has no PDF equivalent, left as `''`). `comakers` stays a length-0-or-1 array (0 until the co-maker row is marked "Changed" and a name is entered). This is the only place `CiComakerEntry` still gets created from Call Report — no dedicated comaker card exists at the top level anymore.

## Page structure

`CallReportView` renders, in order:

1. `ApplicationReviewHeader` + `ApplicationDetailsCard` (`collapsible`) — **unchanged**.
2. **Interaction Record** card (`interaction-record-card.tsx`) — Application No./Customer Name shown read-only from `signUpData`/`getLoanNumber` (NEXUS "auto-populate," not officer-entered); Call/Visit Date, Time, Interviewed Person, Relationship to Borrower as editable fields; Interaction Type / Identity Status as `RadioRow`s; Basis of Identity Confirmation as a `ChipToggleGroup` + conditional "Other" text field.
3. **Application Validation** card (`application-validation-card.tsx`) — a 9-row table (label · current application data readonly chip · three-way status control) built from `VALIDATION_ITEMS: {key, label, currentValue(application) => string}[]`, each row a compact `RadioRow`-style three-button control (Confirmed/Changed/Unable to Verify) rather than a full form row, matching the PDF's checkbox-triplet shape; a "Material Changes / Clarifications" textarea below the table; then, only for rows whose status is `'changed'`, that row's own "Changed Information" sub-panel renders directly beneath the table (not in a separate card) — e.g. marking "Loan Facility" changed reveals the Loan Facility radio + reason field right there. This card is the most novel piece of this rebuild — see "Application Validation card detail" below.
4. **AML / KYC Questions** card (`aml-kyc-card.tsx`) — 6 `RadioRow`s (Yes/No/For Verification, one with the 4-way payment-history descriptor instead).
5. **Customer Understanding of Loan Terms & Requirements** card (`customer-understanding-card.tsx`) — Level of Understanding `RadioRow`, 9-item `ChipToggleGroup`, Concerns/Clarifications textarea.
6. **Proposed Loan Package** card (`proposed-loan-package-card.tsx`) — Original Requested Amount defaults once from `application.financialInfo?.desiredLoanAmount` (same "default once, never overwrite an edit" convention `loan-discussion-card.tsx` already used for Final Loan Purpose), Interest Rate + Monthly/Annual toggle, Proposed Facility/Product text, Computation Type radio + Other text, Proposed Loan Amount, Estimated Monthly Amortization, Proposed Loan Term (months), Other Request.
7. **AO Preliminary Risk & Call Disposition** card (`risk-disposition-card.tsx`) — Primary Risk Driver as a multi-select `ChipToggleGroup` (`primaryRiskDrivers: RiskDriverItem[]`, since more than one driver can genuinely apply — e.g. both Capacity and Collateral). Call Disposition as a single-select `RadioRow` (`callDisposition: CallDispositionType | ''`) even though the PDF renders it with the same ☐ checkbox glyphs as Risk Driver: the five options are mutually exclusive outcomes of one call (an officer cannot simultaneously disposition a call as both "Proceed to Next Process" and "Sales Reject/Decline"), so single-select is the correct behavior despite the PDF's checkbox styling — this is an interpretive call on ambiguous source formatting, not a literal read of the PDF. Reason/Key Condition textarea.
8. **NEXUS System Validation / Exception Handoff** card (`system-validation-card.tsx`) — read-only AI Summary / AI Exceptions / AI Recommendation (same visual treatment as the current "AI review, summary & recommendation" card: label + `Iconify` + tinted box), computed by new `buildCallReportAiSummary()`/`buildCallReportAiExceptions()`/`buildCallReportAiRecommendation()` in rewritten `call-report-summary.ts`/`call-report-risk.ts`; AO vs. System Assessment Variance as None/Noted radio + conditional explanation textarea.
9. **AO Endorsement Declaration** card (`endorsement-declaration-card.tsx`) — the PDF's exact declaration paragraphs rendered as static `Typography` body text (not editable — it's a fixed attestation), then Account Officer name (defaulted from `application.assignedOfficer` once) + Date/Time, Reviewed by Head name + Date/Time as four fields in a 2×2 grid.
10. **Proceed application?** decision card — **unchanged in shape and behavior**, `canProceed` gate rewritten against the new required fields (see "canProceed gating" below).
11. `CreditCheckingResultModal` + rewritten `CallReportResultModal` (reads the new field shape) — unchanged mounting pattern.

### Application Validation card detail

This is the one section with no precedent elsewhere in the app, so it's worth detailing:

```
┌─────────────────────────────────────────────────────────────┐
│ Application Information │ Current Data │ ○ Confirmed ○ Changed ○ Unable to Verify │
├─────────────────────────────────────────────────────────────┤
│ 1. Identity/Authorized Rep │ [from application] │ ...        │
│ 2. Loan Facility           │ [from application] │ ...        │
│  ↳ (if Changed) Loan Facility — Changed To: [radio] Reason: [text]
│ 3. Loan Purpose            │ [from application] │ ...        │
│  ↳ (if Changed) Purpose — Changed To: [radio incl. Working Capital sub-branch, Loan Take-out sub-table]
│ ... (rows 4–9, same pattern)
└─────────────────────────────────────────────────────────────┘
Material Changes / Clarifications: [textarea]
```

Implemented as one `ValidationRow` component per item (label, current-value chip, three-button status control, and — conditionally — its own "Changed" detail block passed as `children`), stacked inside the single card, rather than 9 separate cards or a literal MUI `Table`. A literal `Table` was considered and rejected: the PDF's own per-row conditional detail (Loan Purpose alone has 3 levels of nested conditional fields — Working Capital specific-use, Loan Take-out sub-table) doesn't fit inside table cells cleanly, and no existing page in this app puts expandable form content inside a table row.

### `canProceed` gating

Replaces the old `callStatus && identityConfirmed && preliminaryRecommendation (+ followUpDate if needed)` gate with:

```ts
const canProceed = !!callReport.interactionType && !!callReport.identityStatus && !!callReport.callDisposition;
```

No follow-up-date field exists in the new PDF, so the old `followUpRequired` conditional branch is dropped entirely — "Follow-up Call" is simply one of the five `callDisposition` values now, with any scheduling detail expected to live in the free-text `reasonKeyCondition` field instead of a dedicated date picker.

## Sample data

`handleFillSampleData`/`handleClearSampleData` rewritten against the new field list, same page-action-toggle convention (label swaps "Fill with Sample Data" / "Remove Sample Data" based on `canProceed`). Sample values: `interactionType: 'phone'`, `identityStatus: 'confirmed'`, `identityBasis: ['app-data-matched', 'valid-government-id']`, one Application Validation row (`loanPurpose`) marked `'changed'` with a populated `loanPurposeChangedTo`/reason so the conditional detail panel has something real to show, all 6 AML/KYC questions `'no'`, `understandingLevel: 'fully-understood'` with 5-6 terms checked, a populated Proposed Loan Package mirroring the application's own requested amount/term, `primaryRiskDrivers: ['character']`, `callDisposition: 'proceed-to-next-process'`, and endorsement names defaulted from `application.assignedOfficer`/a fixed "Head" sample name.

## Files touched

**Deleted:** `call-details-card.tsx`, `loan-discussion-card.tsx`, `residence-household-card.tsx`, `employment-business-card.tsx`, `organization-membership-card.tsx`, `quick-financial-info-card.tsx`, `payment-behavior-card.tsx`, `officer-observation-card.tsx`, `collateral-information-card.tsx`, `collateral-entry-fields.tsx`, `agreed-next-steps-card.tsx`, `loan-package-proposal-card.tsx`, `call-report-computations.ts`.

**Rewritten:** `call-report-types.ts` (all new option lists + shared `RadioRow`/`ChipToggleGroup`/`fieldSx`/`cardSx`, with `RadioRow` now exported since more cards need it directly), `call-report-summary.ts`, `call-report-risk.ts`, `call-report-result-modal.tsx`, `call-report-view.tsx`, the `CallReport` type + `createInitialReview()` slice + array mutators in `admin-context.tsx`.

**New:** `interaction-record-card.tsx`, `application-validation-card.tsx` (+ possibly a co-located `validation-row.tsx` if `ValidationRow` grows large enough to warrant its own file), `aml-kyc-card.tsx`, `customer-understanding-card.tsx`, `proposed-loan-package-card.tsx`, `risk-disposition-card.tsx`, `system-validation-card.tsx`, `endorsement-declaration-card.tsx`.

**Unchanged:** `call-report-view.tsx`'s outer shell conventions (`ApplicationReviewHeader`, `ApplicationDetailsCard`, `CreditCheckingResultModal` mounting, Sales Reject dialog, `Container maxWidth="md"`), `credit-checking-result-modal.tsx`, everything in `credit-investigation/` except confirming `ci-report-card.tsx`'s existing `review.callReport.comakers` read still type-checks against the new (still-present) `comakers: CiComakerEntry[]` field.

**Docs:** `docs/ADMIN_CALL_REPORT.md` rewritten to describe the new 8-section structure.
