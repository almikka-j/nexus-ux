import type {
  CallType,
  PlaceOfCall,
  CallStatus,
  IdentityConfirmed,
  LoanPurposeConfirmation,
  RepaymentSource,
  ResidenceYears,
  MainIncomeSource,
  TenureRange,
  IncomeTrend,
  MembershipStanding,
  OfficerObservationItem,
  CollateralOffered,
  CollateralType,
  RequiresAppraisal,
  NextAction,
  InterestRateBasis,
  ComputationType,
  AdjustmentReason,
  ConditionItem,
  PreliminaryRecommendation,
  ClientType,
} from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Every enum field in CallReport has its {value,label} option list here, so
// every card component imports labels from one place instead of repeating
// display strings inline.
// ----------------------------------------------------------------------

export type Option<T extends string> = { value: T; label: string };

export const CLIENT_TYPE_OPTIONS: Option<ClientType>[] = [
  { value: 'new', label: 'New' },
  { value: 'existing', label: 'Existing' },
];

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

export const RESIDENCE_YEARS_OPTIONS: Option<ResidenceYears>[] = [
  { value: 'lt-1', label: 'Less than 1 year' },
  { value: '1-2', label: '1–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: 'gt-5', label: 'More than 5 years' },
];

export const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
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

export const INCOME_TREND_OPTIONS: Option<IncomeTrend>[] = [
  { value: 'increasing', label: 'Increasing' },
  { value: 'stable', label: 'Stable' },
  { value: 'decreasing', label: 'Decreasing' },
  { value: 'undetermined', label: 'Cannot Be Determined' },
];

export const MEMBERSHIP_STANDING_OPTIONS: Option<MembershipStanding>[] = [
  { value: 'good-standing', label: 'Good Standing' },
  { value: 'with-concern', label: 'With Concern' },
  { value: 'not-verified', label: 'Not Verified' },
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

export const REQUIRES_APPRAISAL_OPTIONS: Option<RequiresAppraisal>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'tbd', label: 'To Be Determined' },
];

export const NEXT_ACTION_OPTIONS: Option<NextAction>[] = [
  { value: 'proceed-to-next-process', label: 'Proceed to Next Process' },
  { value: 'request-additional-requirements', label: 'Request Additional Requirements' },
  { value: 'verify-information', label: 'Verify Information' },
  { value: 'conduct-site-visit', label: 'Conduct Site Visit' },
  { value: 'request-appraisal', label: 'Request Appraisal' },
  { value: 'schedule-another-call', label: 'Schedule Another Call' },
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

export const ADJUSTMENT_REASON_OPTIONS: Option<AdjustmentReason>[] = [
  { value: 'income-capacity', label: 'Income Capacity' },
  { value: 'existing-obligations', label: 'Existing Obligations' },
  { value: 'collateral-value', label: 'Collateral Value' },
  { value: 'credit-risk', label: 'Credit Risk' },
  { value: 'exceeds-affordability', label: 'Exceeds Preliminary Affordability' },
  { value: 'borrower-requested', label: 'Borrower Requested Adjustment' },
  { value: 'officer-recommendation', label: 'Officer Recommendation' },
  { value: 'other', label: 'Other' },
];

export const CONDITION_OPTIONS: Option<ConditionItem>[] = [
  { value: 'income-verification', label: 'Income Verification' },
  { value: 'employment-business-verification', label: 'Employment or Business Verification' },
  { value: 'residence-verification', label: 'Residence Verification' },
  { value: 'satisfactory-credit-checking', label: 'Satisfactory Credit Checking' },
  { value: 'collateral-appraisal', label: 'Collateral Appraisal' },
  { value: 'additional-collateral', label: 'Additional Collateral' },
  { value: 'co-maker-or-guarantor', label: 'Co-maker or Guarantor' },
  { value: 'adjustment-of-amount', label: 'Adjustment of Loan Amount' },
  { value: 'adjustment-of-term', label: 'Adjustment of Loan Term' },
  { value: 'other', label: 'Other' },
];

export const COLLATERAL_ASSESSMENT_OPTIONS: {
  value: 'sufficient' | 'additional-required' | 'subject-to-appraisal' | 'tbd' | 'may-proceed-without';
  label: string;
}[] = [
  { value: 'sufficient', label: 'Existing Collateral Appears Sufficient' },
  { value: 'additional-required', label: 'Additional Collateral May Be Required' },
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

export function labelFor<T extends string>(options: Option<T>[], value: T | ''): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}
