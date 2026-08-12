'use client';

import { useMemo, useState, useEffect, useContext, createContext } from 'react';

import type { RequirementDocStatus } from 'src/sections/admin/requirement-checklist-docs';
import { REQUIREMENT_DOC_META, APPRAISAL_DOC_META } from 'src/sections/admin/requirement-checklist-docs';

// ----------------------------------------------------------------------

export type AdminUser = {
  email: string;
  firstName: string;
  lastName: string;
};

export type CreditCheckDecision = 'pending' | 'approved' | 'rejected';

/**
 * Whether the (simulated) AI review of the uploaded bureau reports came back
 * clean or found a negative record. `'pending'` until all 5 bureau reports
 * are uploaded; computed exactly once per upload session (see
 * `simulateBureauFinding` in `src/sections/admin/simulate-bureau-finding.ts`)
 * and then sticky — both the Initial Credit Checking page (to decide whether
 * to show `NegativeCreditReportCard`) and `CreditCheckingResultModal` (to
 * decide which content to render) read this same stored value, so they can
 * never disagree.
 */
export type BureauFindingStatus = 'pending' | 'clean' | 'negative';

export type CreditChecking = {
  documentUploaded: boolean;
  documentName: string | null;
  decision: CreditCheckDecision;
  bureauFindingStatus: BureauFindingStatus;
  /**
   * Free-form notes the credit-checking officer types while reviewing —
   * carries forward and is shown read-only on later steps (starting with
   * Call Report, via ApplicationDetailsCard) so the next reviewer can see
   * what the officer who handled Initial Credit Checking observed.
   */
  notes: string;
  /**
   * The reason typed into the confirmation dialog when choosing "No" or
   * "For Reconsideration" — distinct from `notes` above (which is a general,
   * always-visible observation field), this is captured only at the moment
   * of that specific decision and shown on the Reconsideration screen as the
   * reason it was sent there.
   */
  decisionReason: string;
  /**
   * The officer's own written recommendation, typed directly into
   * CreditCheckingResultModal — distinct from the auto-generated
   * "Recommendation" block there (buildAiRecommendation()/the negative-report
   * remarks), which is derived/read-only. This is the officer's own words,
   * carried on the generated report alongside that derived text.
   */
  officerRecommendation: string;
  /**
   * Optional supporting document attached to the "Proceed with Justification"
   * modal (shown only when bureauFindingStatus === 'negative') — stored as a
   * base64 data URL, same reasoning as every other upload in this prototype
   * (no real file storage backend). Cleared alongside the rest of the
   * negative-finding/justification state by resetNegativeCreditReport-style
   * flows if the officer starts over.
   */
  justificationDocument: { fileName: string; fileData: string } | null;
};

export type CibiForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactType: string;
  contactNumber: string;
  addressRegion: string;
  addressProvince: string;
  addressCity: string;
  addressStreet: string;
  idType: string;
  idNumber: string;
  creditPurpose: string;
  creditType: string;
  financedAmount: string;
  terms: string;
  installment: string;
  submitted: boolean;
  reportFile: string | null;
  reportFileName: string | null;
  reportUploadedAt: string | null;
};

// Shared shape for the non-CIBI bureau report uploads (LOANDEX, CIC, CMAP,
// NFIS/BAP) — per the source diagram's callout, only CIBI has an API
// integration, so these are all just document dropzones, no data-entry form.
export type BureauUpload = {
  fileName: string | null;
  fileData: string | null;
  uploadedAt: string | null;
};

export type LoandexUpload = BureauUpload;

export type Reconsideration = {
  notes: string;
  decision: CreditCheckDecision;
};

// The four repeatable lists on the manual Negative Credit Checking Report
// share one entry shape — `label` is "Account Name" for `accountFindings`
// and the one free-text line for each of the three special sections.
export type NegativeReportEntryListKey =
  | 'accountFindings'
  | 'cancelledCreditCards'
  | 'adverseClassifiedLoans'
  | 'closedCurrentAccounts';

export type NegativeReportEntry = {
  id: string;
  label: string;
  findings: string;
};

/**
 * Filled out by the officer only when `CreditChecking.bureauFindingStatus`
 * comes back `'negative'` — see `NegativeCreditReportCard`. Every field is
 * optional except `recommendationRemarks`, which is required before
 * `submitted` can be set to `true`. `to`/`from`/`date`/`subject` are not
 * stored here — they're either fixed strings or trivially derived at render
 * time (see `NegativeCreditReportCard` and `CreditCheckingResultModal`).
 */
export type NegativeCreditReport = {
  thru: string;
  negativeRecordText: string;
  accountFindings: NegativeReportEntry[];
  cancelledCreditCards: NegativeReportEntry[];
  adverseClassifiedLoans: NegativeReportEntry[];
  closedCurrentAccounts: NegativeReportEntry[];
  recommendationRemarks: string;
  submitted: boolean;
};

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

export type CiComakerEntry = {
  id: string;
  name: string;
  relationshipToBorrower: string;
  address: string;
  contactNumber: string;
  occupation: string;
  monthlyIncome: string;
};

export type CiChildEntry = {
  id: string;
  name: string;
  age: string;
  occupationOrSchool: string;
};

export type CiTradeEntry = {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  natureOfDealing: string;
  yearsOfDealing: string;
};

export type CiIncomeSourceEntry = {
  id: string;
  source: string;
  monthlyAmount: string;
  remarks: string;
};

export type CiBankAccountEntry = {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  averageMonthlyBalance: string;
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

export type ClientType = 'new' | 'existing';

export type CallReport = {
  approved: boolean;
  /**
   * The reason recorded when using Sales Reject (dropdown reason + optional
   * remarks, combined into one string) — same pattern and same field role as
   * `CreditChecking.decisionReason`. Blank when the application was approved
   * to proceed instead.
   */
  decisionReason: string;

  // Client Type — was previously shown in a dedicated read-only Application
  // Summary card (removed from the Call Report page); no other card renders
  // this field currently, but the data point is kept in state in case a
  // future screen surfaces it again.
  clientType: ClientType | '';

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
  observationNotes: string;

  // 9. Collateral Information
  collateralOffered: CollateralOffered | '';
  collateralEntries: CollateralEntry[];

  // 12. Comaker
  comakers: CiComakerEntry[];

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
  collateralAssessment:
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
};

export type RequirementDoc = {
  key: string;
  status: RequirementDocStatus;
  aiNote: string;
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
  remarks: string;
  // Separate from `status` (the AI-assigned Verified/Needs Review/Missing
  // read) — this is the officer's own confirmation that they've looked at
  // the document, toggled independently via "Mark as Reviewed" in
  // RequirementDocRow. A document can be AI-verified but not yet
  // officer-reviewed, or vice versa.
  reviewed: boolean;
};

// One property/collateral pledged toward this application, identified by
// its TCT/CCT number. Each carries its own full, independent copy of
// APPRAISAL_DOC_META's 8 documents — a borrower with multiple pledged
// properties has one group per property, each tracked separately (see
// requirement-checklist-docs.ts's header comment for why these are NOT
// shared the way Working Visa/Statement of Account etc. are across Credit
// Investigation and Financial Evaluation).
export type AppraisalTctGroup = {
  id: string;
  tctNumber: string;
  documents: RequirementDoc[];
  // Points at the AppraisalReportBundle (below) this property has been
  // folded into, if any. null = not yet selected into any report — the
  // TCT table's checkbox is only selectable while this is null or while
  // it points at a bundle whose report is not yet submitted.
  reportId: string | null;
};

export type OutreachChannel = 'email' | 'whatsapp' | 'viber';

export type OutreachMessage = {
  id: string;
  channel: OutreachChannel;
  text: string;
  sentAt: string;
};

export type RequirementChecklist = {
  documents: RequirementDoc[];
  appraisalGroups: AppraisalTctGroup[];
  // Officer-declared "this application has no real-estate collateral" state
  // — when true, Appraisal's required documents are excluded entirely from
  // the header counter/Endorse gate/AI summary, instead of the default
  // assumption that every application has at least one pledged property.
  // Mutually exclusive with appraisalGroups in the UI (the toggle button is
  // blocked while any group exists) but not enforced at the type level.
  appraisalNotApplicable: boolean;
  collateralNotes: string;
  // Full history of "Request Documents" sends, shown in
  // RequestDocumentsDrawer's message list — a simulated outreach (no real
  // email/WhatsApp/Viber message is ever sent anywhere in this prototype).
  // The Requirement Checklist card's "Documents requested" banner derives
  // from this array's last entry rather than a separate snapshot field.
  outreachMessages: OutreachMessage[];
  endorsed: boolean;
  /**
   * Set by Sales Reject — same reason-dropdown + optional-remarks pattern as
   * `CreditChecking.decisionReason`/`CallReport.decisionReason`, combined
   * into one string. Was previously a "Return to Applicant" action
   * (`returnedToApplicant`/`returnReason`); renamed when that flow was
   * replaced to match Initial Credit Checking's Sales Reject.
   */
  rejected: boolean;
  decisionReason: string;
};

export type CiFeeStatus = 'not-requested' | 'pending-approval' | 'approved' | 'not-applicable';

export type CreditInvestigationDoc = RequirementDoc & {
  // Only set on ad-hoc officer-added rows (via "+ Add document"), which have
  // no fixed CreditInvestigationDocMeta entry to look up a label from.
  isCustom?: boolean;
  label?: string;
};

export type CiReport = {
  // Site visit
  visitDate: string;
  subjectAsOf: string; // rich text (HTML)

  // Spouse
  spouseNotes: string; // rich text (HTML)

  // Children
  children: CiChildEntry[];

  // Residence/Neighborhood
  residencePermanentAddress: string; // read-only display, sourced from personalInfo
  residenceLeasedType: 'owned' | 'leased' | 'rent-free' | '';
  residenceLengthOfStay: string;
  residenceLandmark: string;
  residenceRemarks: string;
  presentAddress: string;
  presentLeasedType: 'owned' | 'leased' | 'rent-free' | '';
  presentLengthOfStay: string;
  presentLandmark: string;
  presentRemarks: string;

  // Employment
  employmentStatus: string; // read-only display, sourced from financialInfo
  employmentType: 'direct' | 'agency' | 'self-employed' | '';
  employerName: string;
  position: string;
  employerAddress: string;
  employerTelNo: string;
  employerEmail: string;
  salary: string;
  annualIncome: string;
  lengthOfService: string;
  numberOfRegEmployees: string;
  numberOfContrEmployees: string;
  isUnionized: 'yes' | 'no' | '';
  secDtiRegNo: string;
  secDtiRegDate: string;
  secDtiExpDate: string;
  employmentRemarks: string;

  // Trade Checking
  suppliers: CiTradeEntry[];
  customers: CiTradeEntry[];

  // Assets
  assetsNotes: string; // rich text (HTML)

  // Other Source of Income
  otherIncomeSources: CiIncomeSourceEntry[];

  // Loan Purpose (required)
  loanPurposeNotes: string; // rich text (HTML)

  // Bank Verification
  bankAccounts: CiBankAccountEntry[];

  // Negative Record
  negativeRecordSourceNote: string;
  negativeRecordFinding: 'no-negative-findings-both-cmap-nfis' | 'negative-findings-found' | '';
  negativeRecordRemarks: string; // rich text (HTML)

  // Health and Habits
  healthAndHabitsNotes: string; // rich text (HTML)

  // Comments
  commentsNotes: string; // rich text (HTML)

  // Recommendation
  recommendation: 'proceed-as-requested' | 'proceed-with-conditions' | 'needs-additional-verification' | '';
  recommendationNotes: string;

  // Transcript
  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};

export type AppraisalFeeStatus =
  | 'not-requested'
  | 'pending-approval'
  | 'approved'
  | 'declined'
  | 'not-applicable';

export type AppraiserType = 'inhouse' | 'external';

export type AppraisalReport = {
  propertyDetails: string;
  appraisedValue: string;
  remarks: string;
  recommendation: string;
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};

// One "Appraisal Report" the officer creates by selecting one or more
// pledged properties (AppraisalTctGroup) from the TCT table and assigning
// a single appraiser to that selection — tctGroupIds.length === 1 is a
// "single" report, 2+ is "consolidated", matching the source process
// diagram's "Prepare/upload document for Single/consolidated appraisal
// report" step. Replaces the old single whole-application
// Appraisal.appraiserType/Appraisal.report fields below.
export type AppraisalReportBundle = {
  id: string;
  tctGroupIds: string[];
  appraiserType: AppraiserType | null;
  report: AppraisalReport;
};

export type HeadApprovalStatus = 'pending' | 'approved' | 'declined';

export type Appraisal = {
  feeStatus: AppraisalFeeStatus;
  feeAmount: string;
  feeDescription: string;
  feeRemarks: string;
  feeDeclineReason: string;
  clientNotifiedAt: string | null;
  sentToOdooAt: string | null;
  paymentReceivedAt: string | null;
  reportBundles: AppraisalReportBundle[];
  headApprovalStatus: HeadApprovalStatus;
  headApprovalDeclineReason: string;
  passed: boolean | null;
  failReason: string;
};

export type CreditInvestigation = {
  documents: CreditInvestigationDoc[];
  // Independent outreach history from Requirement Checklist's — this page
  // has its own "Request Documents" drawer/history.
  outreachMessages: OutreachMessage[];
  ciFeeStatus: CiFeeStatus;
  ciFeeAmount: string;
  ciFeeAmountDescription: string;
  ciFeeRemarks: string;
  // Set when a pending CI Fee request is declined on the CI Fee Approval
  // screen (src/sections/admin/ci-fee-approval-view.tsx) — declining resets
  // ciFeeStatus back to 'not-requested' (same re-entry point as a fresh
  // application) but keeps this reason on record, same convention as
  // decisionReason below.
  ciFeeDeclineReason: string;
  report: CiReport;
  decision: CreditCheckDecision;
  decisionReason: string;
};

export type ReviewStep =
  | 'creditChecking'
  | 'reconsideration'
  | 'callReport'
  | 'requirementChecklist'
  | 'creditInvestigation'
  | 'appraisal'
  | 'financialEvaluation';

export type StepTimestamps = Partial<Record<ReviewStep, string>>;

export type NegativeListEntry = {
  email: string;
  name: string;
  reason: string;
  recordedAt: string;
};

export type ApplicationReview = {
  creditChecking: CreditChecking;
  cibiForm: CibiForm;
  loandexUpload: LoandexUpload;
  cicUpload: BureauUpload;
  cmapUpload: BureauUpload;
  nfisBapUpload: BureauUpload;
  reconsideration: Reconsideration;
  negativeCreditReport: NegativeCreditReport;
  callReport: CallReport;
  requirementChecklist: RequirementChecklist;
  creditInvestigation: CreditInvestigation;
  appraisal: Appraisal;
  stepTimestamps: StepTimestamps;
};

type AdminState = {
  adminUser: AdminUser | null;
  review: ApplicationReview;
  negativeList: NegativeListEntry[];
};

type AdminContextValue = AdminState & {
  hydrated: boolean;
  setAdminUser: (user: AdminUser) => void;
  setCreditChecking: (data: Partial<CreditChecking>) => void;
  setCibiForm: (data: Partial<CibiForm>) => void;
  setLoandexUpload: (data: Partial<LoandexUpload>) => void;
  setCicUpload: (data: Partial<BureauUpload>) => void;
  setCmapUpload: (data: Partial<BureauUpload>) => void;
  setNfisBapUpload: (data: Partial<BureauUpload>) => void;
  setReconsideration: (data: Partial<Reconsideration>) => void;
  setNegativeCreditReport: (
    data: Partial<Pick<NegativeCreditReport, 'thru' | 'negativeRecordText' | 'recommendationRemarks' | 'submitted'>>
  ) => void;
  addNegativeReportEntry: (listKey: NegativeReportEntryListKey, seedLabel?: string) => void;
  updateNegativeReportEntry: (
    listKey: NegativeReportEntryListKey,
    id: string,
    data: Partial<NegativeReportEntry>
  ) => void;
  removeNegativeReportEntry: (listKey: NegativeReportEntryListKey, id: string) => void;
  resetNegativeCreditReport: () => void;
  setCallReport: (data: Partial<CallReport>) => void;
  addCollateralEntry: () => void;
  updateCollateralEntry: (id: string, data: Partial<CollateralEntry>) => void;
  removeCollateralEntry: (id: string) => void;
  addComakerEntry: () => void;
  updateComakerEntry: (id: string, data: Partial<CiComakerEntry>) => void;
  removeComakerEntry: (id: string) => void;
  setRequirementChecklist: (data: Partial<RequirementChecklist>) => void;
  addAppraisalGroup: (tctNumber: string) => void;
  removeAppraisalGroup: (groupId: string) => void;
  updateAppraisalGroupDoc: (groupId: string, docKey: string, data: Partial<RequirementDoc>) => void;
  addOutreachMessage: (message: { channel: OutreachChannel; text: string }) => void;
  setCreditInvestigation: (data: Partial<CreditInvestigation>) => void;
  setCiReport: (data: Partial<CiReport>) => void;
  setAppraisal: (data: Partial<Appraisal>) => void;
  createAppraisalReportBundle: (tctGroupIds: string[], appraiserType: AppraiserType) => void;
  addTctGroupsToReportBundle: (bundleId: string, tctGroupIds: string[]) => void;
  setAppraisalBundleAppraiserType: (bundleId: string, appraiserType: AppraiserType) => void;
  setAppraisalBundleReport: (bundleId: string, data: Partial<AppraisalReport>) => void;
  deleteAppraisalReportBundle: (bundleId: string) => void;
  clearAllAppraisalBundleReports: () => void;
  addCreditInvestigationDocument: (
    label: string,
    uploadedBy: string,
    file: { fileName: string; fileUrl: string }
  ) => void;
  removeCreditInvestigationDocument: (key: string) => void;
  addCiOutreachMessage: (message: { channel: OutreachChannel; text: string }) => void;
  markStepEntered: (step: ReviewStep) => void;
  addToNegativeList: (entry: Omit<NegativeListEntry, 'recordedAt'>) => void;
  resetReview: () => void;
  logout: () => void;
};

const STORAGE_KEY = 'hhc-lms-admin-session';

// Same factory-not-constant rationale as createInitialReview below — also
// reused directly by resetNegativeCreditReport(), so "start the form over"
// and "start a whole new review" can never drift out of sync.
function createInitialNegativeCreditReport(): NegativeCreditReport {
  return {
    thru: '',
    negativeRecordText:
      'Source of information: BAP Credit Bureau / CMAP report on accounts under watch lists, cancelled credit cards, adverse classified loan file, closed current account and court case file as of ',
    accountFindings: [],
    cancelledCreditCards: [],
    adverseClassifiedLoans: [],
    closedCurrentAccounts: [],
    recommendationRemarks:
      'In view of the foregoing, Credit Department is hereby recommending the said loan application to proceed.',
    submitted: false,
  };
}

// Pre-populates every document as already received except
// incomeTaxReturn and taxMappingAuthorization, which start with a sample
// fileName and its metadata's freshStatus/freshNote already applied — so
// there's always at least one outstanding item to upload on first load.
const DOCS_STARTING_MISSING = new Set(['incomeTaxReturn', 'taxMappingAuthorization']);

function createInitialRequirementDocuments(): RequirementDoc[] {
  return REQUIREMENT_DOC_META.map((meta) => {
    if (DOCS_STARTING_MISSING.has(meta.key)) {
      return {
        key: meta.key,
        status: 'missing',
        aiNote: '',
        fileName: null,
        fileUrl: null,
        uploadedAt: null,
        uploadedBy: null,
        remarks: '',
        reviewed: false,
      };
    }
    return {
      key: meta.key,
      status: meta.freshStatus,
      aiNote: meta.freshNote,
      fileName: 'sample-local-pdf.pdf',
      fileUrl: '/assets/documents/sample-local-pdf.pdf',
      uploadedAt: new Date(0).toISOString(),
      uploadedBy: 'Ramon Cruz',
      remarks: '',
      reviewed: false,
    };
  });
}

// The Credit Investigation Document Checklist has no fixed documents of its
// own — it displays review.requirementChecklist.documents (the
// creditInvestigation tab) read-only, since those were already collected one
// step earlier. This array only ever holds ad-hoc custom rows an officer
// adds via addCreditInvestigationDocument.
function createInitialCreditInvestigationDocuments(): CreditInvestigationDoc[] {
  return [];
}

function createInitialCiReport(): CiReport {
  return {
    visitDate: '',
    subjectAsOf: '',
    spouseNotes: '',
    children: [],
    residencePermanentAddress: '',
    residenceLeasedType: '',
    residenceLengthOfStay: '',
    residenceLandmark: '',
    residenceRemarks: '',
    presentAddress: '',
    presentLeasedType: '',
    presentLengthOfStay: '',
    presentLandmark: '',
    presentRemarks: '',
    employmentStatus: '',
    employmentType: '',
    employerName: '',
    position: '',
    employerAddress: '',
    employerTelNo: '',
    employerEmail: '',
    salary: '',
    annualIncome: '',
    lengthOfService: '',
    numberOfRegEmployees: '',
    numberOfContrEmployees: '',
    isUnionized: '',
    secDtiRegNo: '',
    secDtiRegDate: '',
    secDtiExpDate: '',
    employmentRemarks: '',
    suppliers: [],
    customers: [],
    assetsNotes: '',
    otherIncomeSources: [],
    loanPurposeNotes: '',
    bankAccounts: [],
    negativeRecordSourceNote:
      'Source of information: BAP Credit Bureau / CMAP report on accounts under watch lists, cancelled credit cards, adverse classified loan file, closed current account and court case file as of ',
    negativeRecordFinding: '',
    negativeRecordRemarks: '',
    healthAndHabitsNotes: '',
    commentsNotes: '',
    recommendation: '',
    recommendationNotes: '',
    transcriptFileName: null,
    transcriptUploadedAt: null,
  };
}

function createInitialCreditInvestigation(): CreditInvestigation {
  return {
    documents: createInitialCreditInvestigationDocuments(),
    outreachMessages: [],
    ciFeeStatus: 'not-requested',
    ciFeeAmount: '',
    ciFeeAmountDescription: '',
    ciFeeRemarks: '',
    ciFeeDeclineReason: '',
    report: createInitialCiReport(),
    decision: 'pending',
    decisionReason: '',
  };
}

function createInitialAppraisal(): Appraisal {
  return {
    feeStatus: 'not-requested',
    feeAmount: '',
    feeDescription: '',
    feeRemarks: '',
    feeDeclineReason: '',
    clientNotifiedAt: null,
    sentToOdooAt: null,
    paymentReceivedAt: null,
    reportBundles: [],
    headApprovalStatus: 'pending',
    headApprovalDeclineReason: '',
    passed: null,
    failReason: '',
  };
}

// Documents a newly-added TCT/property group starts with — all missing by
// default, since a group is something the officer explicitly adds for a
// specific property they're now collecting paperwork for, not a pre-seeded
// demo state. `seeded: true` (used once, for the one starting group in
// initialState below) instead pre-populates every document as already
// received, matching createInitialRequirementDocuments()'s demo-data
// pattern, except `taxMappingAuthorization` which starts missing so there's
// always at least one outstanding appraisal item on first load too.
function createAppraisalGroupDocuments(seeded = false): RequirementDoc[] {
  return APPRAISAL_DOC_META.map((meta) => {
    if (!seeded || meta.key === 'taxMappingAuthorization') {
      return {
        key: meta.key,
        status: 'missing',
        aiNote: '',
        fileName: null,
        fileUrl: null,
        uploadedAt: null,
        uploadedBy: null,
        remarks: '',
        reviewed: false,
      };
    }
    return {
      key: meta.key,
      status: meta.freshStatus,
      aiNote: meta.freshNote,
      fileName: 'sample-local-pdf.pdf',
      fileUrl: '/assets/documents/sample-local-pdf.pdf',
      uploadedAt: new Date(0).toISOString(),
      uploadedBy: 'Ramon Cruz',
      remarks: '',
      reviewed: false,
    };
  });
}

function createAppraisalGroup(tctNumber: string, seeded = false): AppraisalTctGroup {
  return {
    id: crypto.randomUUID(),
    tctNumber,
    documents: createAppraisalGroupDocuments(seeded),
    reportId: null,
  };
}

function createAppraisalReportBundle(tctGroupIds: string[], appraiserType: AppraiserType): AppraisalReportBundle {
  return {
    id: crypto.randomUUID(),
    tctGroupIds,
    appraiserType,
    report: {
      propertyDetails: '',
      appraisedValue: '',
      remarks: '',
      recommendation: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
    },
  };
}

// Factory (not a shared constant) so `resetReview()` gets a fresh object each
// call — reusing one constant reference across resets risks accidental
// mutation-sharing bugs if any setter ever mutated in place instead of
// spreading.
function createInitialReview(): ApplicationReview {
  return {
    creditChecking: {
      documentUploaded: false,
      documentName: null,
      decision: 'pending',
      bureauFindingStatus: 'pending',
      notes: '',
      decisionReason: '',
      officerRecommendation: '',
      justificationDocument: null,
    },
    cibiForm: {
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      contactType: 'Mobile',
      contactNumber: '',
      addressRegion: '',
      addressProvince: '',
      addressCity: '',
      addressStreet: '',
      idType: '',
      idNumber: '',
      creditPurpose: '',
      creditType: '',
      financedAmount: '',
      terms: '',
      installment: '',
      submitted: false,
      reportFile: null,
      reportFileName: null,
      reportUploadedAt: null,
    },
    loandexUpload: { fileName: null, fileData: null, uploadedAt: null },
    cicUpload: { fileName: null, fileData: null, uploadedAt: null },
    cmapUpload: { fileName: null, fileData: null, uploadedAt: null },
    nfisBapUpload: { fileName: null, fileData: null, uploadedAt: null },
    reconsideration: { notes: '', decision: 'pending' },
    negativeCreditReport: createInitialNegativeCreditReport(),
    callReport: {
      approved: false,
      decisionReason: '',
      clientType: '',
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
      observationNotes: '',
      collateralOffered: '',
      collateralEntries: [],
      comakers: [],
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
      collateralAssessment: '',
      requiredDocuments: [],
      conditionsBeforeProceeding: [],
      preliminaryRecommendation: '',
      recommendationReason: '',
      loanPackageNotes: '',
    },
    requirementChecklist: {
      documents: createInitialRequirementDocuments(),
      // Seeded with one starting property/TCT group (matching
      // createInitialRequirementDocuments()'s pre-populated sample data
      // pattern) rather than starting empty — an empty appraisalGroups
      // array is a valid "no real estate collateral yet" state the officer
      // can still reach via "Remove Property", but a fresh session
      // shouldn't start there.
      appraisalGroups: [
        createAppraisalGroup('TCT-2024-00981', true),
        createAppraisalGroup('TCT-2024-00982', true),
        createAppraisalGroup('TCT-2024-00983', true),
        createAppraisalGroup('TCT-2024-00984', true),
        createAppraisalGroup('TCT-2024-00985', true),
      ],
      appraisalNotApplicable: false,
      collateralNotes: '',
      outreachMessages: [],
      endorsed: false,
      rejected: false,
      decisionReason: '',
    },
    creditInvestigation: createInitialCreditInvestigation(),
    appraisal: createInitialAppraisal(),
    stepTimestamps: {},
  };
}

const initialState: AdminState = {
  adminUser: null,
  review: createInitialReview(),
  negativeList: [],
};

const AdminContext = createContext<AdminContextValue | null>(null);

function readStoredState(): AdminState {
  if (typeof window === 'undefined') return initialState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const stored = JSON.parse(raw);
    // Merge one level into `review` too — a shallow top-level spread alone
    // would drop any review sub-key (e.g. cicUpload) added after a session
    // was already saved to localStorage, since the stored `review` object
    // would fully replace initialState.review instead of filling gaps in it.
    const storedReview = stored.review ?? {};

    return {
      ...initialState,
      ...stored,
      review: {
        ...initialState.review,
        ...storedReview,
        creditChecking: {
          ...initialState.review.creditChecking,
          ...storedReview.creditChecking,
        },
        cibiForm: { ...initialState.review.cibiForm, ...storedReview.cibiForm },
        loandexUpload: {
          ...initialState.review.loandexUpload,
          ...storedReview.loandexUpload,
        },
        cicUpload: { ...initialState.review.cicUpload, ...storedReview.cicUpload },
        cmapUpload: { ...initialState.review.cmapUpload, ...storedReview.cmapUpload },
        nfisBapUpload: {
          ...initialState.review.nfisBapUpload,
          ...storedReview.nfisBapUpload,
        },
        callReport: {
          ...initialState.review.callReport,
          ...storedReview.callReport,
        },
        requirementChecklist: {
          ...initialState.review.requirementChecklist,
          ...storedReview.requirementChecklist,
          // Merge stored documents onto the fresh default set by `key`,
          // rather than trusting the stored array wholesale — a session
          // saved before a doc-list change (new keys added, or new fields
          // like uploadedBy/reviewed added to RequirementDoc) would
          // otherwise carry forward a stale/incomplete array missing them.
          documents: initialState.review.requirementChecklist.documents.map((defaultDoc) => {
            const storedDoc = storedReview.requirementChecklist?.documents?.find(
              (doc: RequirementDoc) => doc.key === defaultDoc.key
            );
            if (!storedDoc) return defaultDoc;
            const mergedDoc = { ...defaultDoc, ...storedDoc };
            const isSeededSample =
              mergedDoc.fileName === 'sample-local-pdf.pdf' ||
              mergedDoc.fileName?.endsWith('-sample.pdf');
            return isSeededSample
              ? {
                  ...mergedDoc,
                  fileName: 'sample-local-pdf.pdf',
                  fileUrl: '/assets/documents/sample-local-pdf.pdf',
                }
              : mergedDoc;
          }),
          appraisalGroups: (
            storedReview.requirementChecklist?.appraisalGroups ??
            initialState.review.requirementChecklist.appraisalGroups
          ).map((group: AppraisalTctGroup) => ({
            ...group,
            documents: group.documents.map((doc) => {
              const isSeededSample =
                doc.fileName === 'sample-local-pdf.pdf' || doc.fileName?.endsWith('-sample.pdf');
              return isSeededSample
                ? {
                    ...doc,
                    fileName: 'sample-local-pdf.pdf',
                    fileUrl: '/assets/documents/sample-local-pdf.pdf',
                  }
                : doc;
            }),
          })),
        },
        creditInvestigation: {
          ...initialState.review.creditInvestigation,
          ...storedReview.creditInvestigation,
          // Only ad-hoc custom rows live in this array now (see
          // createInitialCreditInvestigationDocuments) — carry forward
          // whatever custom rows were stored, dropping anything else.
          documents: (storedReview.creditInvestigation?.documents ?? []).filter(
            (doc: CreditInvestigationDoc) => doc.isCustom
          ),
          report: {
            ...initialState.review.creditInvestigation.report,
            ...storedReview.creditInvestigation?.report,
          },
        },
        appraisal: {
          ...initialState.review.appraisal,
          ...storedReview.appraisal,
          reportBundles: (storedReview.appraisal?.reportBundles ?? []).map((bundle: Partial<AppraisalReportBundle>) => ({
            id: bundle.id,
            tctGroupIds: bundle.tctGroupIds ?? [],
            appraiserType: bundle.appraiserType ?? null,
            report: {
              propertyDetails: '',
              appraisedValue: '',
              remarks: '',
              recommendation: '',
              fileName: null,
              fileUrl: null,
              uploadedAt: null,
              ...bundle.report,
            },
          })),
        },
      },
    };
  } catch {
    return initialState;
  }
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStoredState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<AdminContextValue>(
    () => ({
      ...state,
      hydrated,
      setAdminUser: (adminUser) => setState((prev) => ({ ...prev, adminUser })),
      setCreditChecking: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, creditChecking: { ...prev.review.creditChecking, ...data } },
        })),
      setCibiForm: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, cibiForm: { ...prev.review.cibiForm, ...data } },
        })),
      setLoandexUpload: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, loandexUpload: { ...prev.review.loandexUpload, ...data } },
        })),
      setCicUpload: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, cicUpload: { ...prev.review.cicUpload, ...data } },
        })),
      setCmapUpload: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, cmapUpload: { ...prev.review.cmapUpload, ...data } },
        })),
      setNfisBapUpload: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, nfisBapUpload: { ...prev.review.nfisBapUpload, ...data } },
        })),
      setReconsideration: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, reconsideration: { ...prev.review.reconsideration, ...data } },
        })),
      setNegativeCreditReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            negativeCreditReport: { ...prev.review.negativeCreditReport, ...data },
          },
        })),
      addNegativeReportEntry: (listKey, seedLabel = '') =>
        setState((prev) => {
          const newEntry: NegativeReportEntry = { id: crypto.randomUUID(), label: seedLabel, findings: '' };
          return {
            ...prev,
            review: {
              ...prev.review,
              negativeCreditReport: {
                ...prev.review.negativeCreditReport,
                [listKey]: [...prev.review.negativeCreditReport[listKey], newEntry],
              },
            },
          };
        }),
      updateNegativeReportEntry: (listKey, id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            negativeCreditReport: {
              ...prev.review.negativeCreditReport,
              [listKey]: prev.review.negativeCreditReport[listKey].map((entry) =>
                entry.id === id ? { ...entry, ...data } : entry
              ),
            },
          },
        })),
      removeNegativeReportEntry: (listKey, id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            negativeCreditReport: {
              ...prev.review.negativeCreditReport,
              [listKey]: prev.review.negativeCreditReport[listKey].filter((entry) => entry.id !== id),
            },
          },
        })),
      resetNegativeCreditReport: () =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, negativeCreditReport: createInitialNegativeCreditReport() },
        })),
      setCallReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: { ...prev.review, callReport: { ...prev.review.callReport, ...data } },
        })),
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
      addComakerEntry: () =>
        setState((prev) => {
          const newEntry: CiComakerEntry = {
            id: crypto.randomUUID(),
            name: '',
            relationshipToBorrower: '',
            address: '',
            contactNumber: '',
            occupation: '',
            monthlyIncome: '',
          };
          return {
            ...prev,
            review: {
              ...prev.review,
              callReport: {
                ...prev.review.callReport,
                comakers: [...prev.review.callReport.comakers, newEntry],
              },
            },
          };
        }),
      updateComakerEntry: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              comakers: prev.review.callReport.comakers.map((entry) =>
                entry.id === id ? { ...entry, ...data } : entry
              ),
            },
          },
        })),
      removeComakerEntry: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              comakers: prev.review.callReport.comakers.filter((entry) => entry.id !== id),
            },
          },
        })),
      setRequirementChecklist: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: { ...prev.review.requirementChecklist, ...data },
          },
        })),
      addAppraisalGroup: (tctNumber) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: [
                ...prev.review.requirementChecklist.appraisalGroups,
                createAppraisalGroup(tctNumber),
              ],
            },
          },
        })),
      removeAppraisalGroup: (groupId) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.filter(
                (group) => group.id !== groupId
              ),
            },
          },
        })),
      updateAppraisalGroupDoc: (groupId, docKey, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                group.id !== groupId
                  ? group
                  : {
                      ...group,
                      documents: group.documents.map((doc) =>
                        doc.key === docKey ? { ...doc, ...data } : doc
                      ),
                    }
              ),
            },
          },
        })),
      addOutreachMessage: (message) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              outreachMessages: [
                ...prev.review.requirementChecklist.outreachMessages,
                { id: crypto.randomUUID(), sentAt: new Date().toISOString(), ...message },
              ],
            },
          },
        })),
      setCreditInvestigation: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: { ...prev.review.creditInvestigation, ...data },
          },
        })),
      setCiReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: { ...prev.review.creditInvestigation.report, ...data },
            },
          },
        })),
      setAppraisal: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: { ...prev.review.appraisal, ...data },
          },
        })),
      createAppraisalReportBundle: (tctGroupIds, appraiserType) =>
        setState((prev) => {
          const bundle = createAppraisalReportBundle(tctGroupIds, appraiserType);
          return {
            ...prev,
            review: {
              ...prev.review,
              appraisal: {
                ...prev.review.appraisal,
                reportBundles: [...prev.review.appraisal.reportBundles, bundle],
              },
              requirementChecklist: {
                ...prev.review.requirementChecklist,
                appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                  tctGroupIds.includes(group.id) ? { ...group, reportId: bundle.id } : group
                ),
              },
            },
          };
        }),
      addTctGroupsToReportBundle: (bundleId, tctGroupIds) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId
                  ? bundle
                  : { ...bundle, tctGroupIds: [...bundle.tctGroupIds, ...tctGroupIds] }
              ),
            },
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                tctGroupIds.includes(group.id) ? { ...group, reportId: bundleId } : group
              ),
            },
          },
        })),
      setAppraisalBundleAppraiserType: (bundleId, appraiserType) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId
                  ? bundle
                  : {
                      ...bundle,
                      appraiserType,
                      report: {
                        propertyDetails: '',
                        appraisedValue: '',
                        remarks: '',
                        recommendation: '',
                        fileName: null,
                        fileUrl: null,
                        uploadedAt: null,
                      },
                    }
              ),
            },
          },
        })),
      setAppraisalBundleReport: (bundleId, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) =>
                bundle.id !== bundleId ? bundle : { ...bundle, report: { ...bundle.report, ...data } }
              ),
            },
          },
        })),
      deleteAppraisalReportBundle: (bundleId) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.filter((bundle) => bundle.id !== bundleId),
            },
            requirementChecklist: {
              ...prev.review.requirementChecklist,
              appraisalGroups: prev.review.requirementChecklist.appraisalGroups.map((group) =>
                group.reportId === bundleId ? { ...group, reportId: null } : group
              ),
            },
          },
        })),
      clearAllAppraisalBundleReports: () =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              reportBundles: prev.review.appraisal.reportBundles.map((bundle) => ({
                ...bundle,
                report: { ...bundle.report, uploadedAt: null, fileName: null, fileUrl: null },
              })),
            },
          },
        })),
      addCreditInvestigationDocument: (label, uploadedBy, file) =>
        setState((prev) => {
          const newDoc: CreditInvestigationDoc = {
            key: crypto.randomUUID(),
            status: 'verified',
            aiNote: 'Reviewed, no issues found.',
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            uploadedAt: new Date().toISOString(),
            uploadedBy,
            remarks: '',
            reviewed: false,
            isCustom: true,
            label,
          };
          return {
            ...prev,
            review: {
              ...prev.review,
              creditInvestigation: {
                ...prev.review.creditInvestigation,
                documents: [...prev.review.creditInvestigation.documents, newDoc],
              },
            },
          };
        }),
      removeCreditInvestigationDocument: (key) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              documents: prev.review.creditInvestigation.documents.filter((doc) => doc.key !== key),
            },
          },
        })),
      addCiOutreachMessage: (message) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              outreachMessages: [
                ...prev.review.creditInvestigation.outreachMessages,
                { id: crypto.randomUUID(), sentAt: new Date().toISOString(), ...message },
              ],
            },
          },
        })),
      markStepEntered: (step) =>
        setState((prev) => {
          if (prev.review.stepTimestamps[step]) return prev;
          return {
            ...prev,
            review: {
              ...prev.review,
              stepTimestamps: {
                ...prev.review.stepTimestamps,
                [step]: new Date().toISOString(),
              },
            },
          };
        }),
      addToNegativeList: (entry) =>
        setState((prev) => {
          if (prev.negativeList.some((item) => item.email === entry.email)) return prev;
          return {
            ...prev,
            negativeList: [...prev.negativeList, { ...entry, recordedAt: new Date().toISOString() }],
          };
        }),
      // Clears only the review state (CIBI form, bureau uploads, decisions,
      // step timestamps) back to a blank slate — used when the Application
      // List's "Clear Sample Data" resets the live applicant, since that used
      // to only clear RegistrationContext (who the applicant is) while
      // leaving all of their old review progress behind in AdminContext,
      // making every step look like it still had leftover filled-in data
      // from a previous test run instead of resetting to empty. Keeps
      // `adminUser` (stay logged in) and `negativeList` (a real historical
      // record, not per-applicant scratch state) untouched.
      resetReview: () => setState((prev) => ({ ...prev, review: createInitialReview() })),
      logout: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setState(initialState);
      },
    }),
    [state, hydrated]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }

  return context;
}
