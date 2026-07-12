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
