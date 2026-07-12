'use client';

import { useMemo, useState, useEffect, useContext, createContext } from 'react';

// ----------------------------------------------------------------------

export type AdminUser = {
  email: string;
  firstName: string;
  lastName: string;
};

export type CreditCheckDecision = 'pending' | 'approved' | 'rejected';

export type CreditChecking = {
  documentUploaded: boolean;
  documentName: string | null;
  aiSummary: string | null;
  aiRecommendation: string | null;
  decision: CreditCheckDecision;
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
};

// Shared shape for the non-CIBI bureau report uploads (LOANDEX, CIC, CMAP,
// NFIS/BAP) — per the source diagram's callout, only CIBI has an API
// integration, so these are all just document dropzones, no data-entry form.
export type BureauUpload = {
  fileName: string | null;
};

export type LoandexUpload = BureauUpload;

export type Reconsideration = {
  notes: string;
  decision: CreditCheckDecision;
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

export type TransactionType =
  | 'New'
  | 'Renew'
  | 'Additional/Increase'
  | 'Compromised'
  | 'Restructured'
  | 'Rollover'
  | 'Extension'
  | 'Repricing'
  | 'Others';

export const SUPPORTED_TRANSACTION_TYPES: TransactionType[] = [
  'New',
  'Renew',
  'Additional/Increase',
  'Others',
];

export type RequirementChecklist = {
  checkedItems: string[];
  collateralNotes: string;
  endorsed: boolean;
};

export type ReviewStep =
  | 'creditChecking'
  | 'reconsideration'
  | 'callReport'
  | 'transactionType'
  | 'requirementChecklist';

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
  callReport: CallReport;
  transactionType: TransactionType | null;
  requirementChecklist: RequirementChecklist;
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

const STORAGE_KEY = 'hhc-lms-admin-session';

// Factory (not a shared constant) so `resetReview()` gets a fresh object each
// call — reusing one constant reference across resets risks accidental
// mutation-sharing bugs if any setter ever mutated in place instead of
// spreading.
function createInitialReview(): ApplicationReview {
  return {
    creditChecking: {
      documentUploaded: false,
      documentName: null,
      aiSummary: null,
      aiRecommendation: null,
      decision: 'pending',
      notes: '',
      decisionReason: '',
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
    },
    loandexUpload: { fileName: null },
    cicUpload: { fileName: null },
    cmapUpload: { fileName: null },
    nfisBapUpload: { fileName: null },
    reconsideration: { notes: '', decision: 'pending' },
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
    transactionType: null,
    requirementChecklist: { checkedItems: [], collateralNotes: '', endorsed: false },
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
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const stored = JSON.parse(raw);
    // Merge one level into `review` too — a shallow top-level spread alone
    // would drop any review sub-key (e.g. cicUpload) added after a session
    // was already saved to sessionStorage, since the stored `review` object
    // would fully replace initialState.review instead of filling gaps in it.
    return {
      ...initialState,
      ...stored,
      review: { ...initialState.review, ...stored.review },
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
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
      setTransactionType: (transactionType) =>
        setState((prev) => ({ ...prev, review: { ...prev.review, transactionType } })),
      setRequirementChecklist: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            requirementChecklist: { ...prev.review.requirementChecklist, ...data },
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
        window.sessionStorage.removeItem(STORAGE_KEY);
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
