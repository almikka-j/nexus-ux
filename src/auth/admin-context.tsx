'use client';

import { useMemo, useState, useEffect, useContext, createContext } from 'react';

import type { RequirementDocStatus } from 'src/sections/admin/requirement-checklist-docs';
import { REQUIREMENT_DOC_META } from 'src/sections/admin/requirement-checklist-docs';

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
export type CallStatus = 'completed' | 'follow-up-needed' | 'unable-to-reach';
export type IdentityConfirmed = 'yes' | 'no' | 'for-verification';

export type LoanPurposeConfirmation = 'confirmed' | 'changed' | 'needs-clarification';
export type RepaymentSource = 'salary' | 'business-income' | 'rental-income' | 'pension' | 'other';

export type ResidenceYears = 'lt-1' | '1-2' | '3-5' | 'gt-5';

export type MainIncomeSource = 'employment' | 'business' | 'both' | 'other';
export type TenureRange = 'lt-1' | '1-3' | '3-5' | 'gt-5';
export type IncomeTrend = 'increasing' | 'stable' | 'decreasing' | 'undetermined';

export type MembershipStanding = 'good-standing' | 'with-concern' | 'not-verified';

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
export type RequiresAppraisal = 'yes' | 'no' | 'tbd';

export type CollateralEntry = {
  id: string;
  type: CollateralType | '';
  description: string;
  registeredOwner: string;
  estimatedValue: string;
  requiresAppraisal: RequiresAppraisal | '';
};

export type NextAction =
  | 'proceed-to-next-process'
  | 'request-additional-requirements'
  | 'verify-information'
  | 'conduct-site-visit'
  | 'request-appraisal'
  | 'schedule-another-call'
  | 'other';

export type InterestRateBasis = 'monthly' | 'annual';
export type ComputationType = 'diminishing-balance' | 'add-on-rate' | 'other';

export type AdjustmentReason =
  | 'income-capacity'
  | 'existing-obligations'
  | 'collateral-value'
  | 'credit-risk'
  | 'exceeds-affordability'
  | 'borrower-requested'
  | 'officer-recommendation'
  | 'other';

export type ConditionItem =
  | 'income-verification'
  | 'employment-business-verification'
  | 'residence-verification'
  | 'satisfactory-credit-checking'
  | 'collateral-appraisal'
  | 'additional-collateral'
  | 'co-maker-or-guarantor'
  | 'adjustment-of-amount'
  | 'adjustment-of-term'
  | 'other';

export type PreliminaryRecommendation =
  | 'proceed-as-requested'
  | 'proceed-with-revised-terms'
  | 'proceed-with-conditions'
  | 'needs-additional-verification'
  | 'schedule-follow-up'
  | 'do-not-proceed';

export type ClientType = 'new' | 'existing';

export type CallReport = {
  approved: boolean;

  // Client Type — was previously shown in a dedicated read-only Application
  // Summary card (removed from the Call Report page); no other card renders
  // this field currently, but the data point is kept in state in case a
  // future screen surfaces it again.
  clientType: ClientType | '';

  // 2. Call Details
  callDate: string;
  callTime: string;
  callType: CallType | '';
  placeOfCall: PlaceOfCall | '';
  placeOfCallOther: string;
  clientRepresentative: string;
  pgRepresentative: string;
  callStatus: CallStatus | '';
  identityConfirmed: IdentityConfirmed | '';

  // 3. Borrower Interview
  loanPurposeConfirmation: LoanPurposeConfirmation | '';
  finalLoanPurpose: string;
  specificUseOfProceeds: string;
  primaryRepaymentSource: RepaymentSource | '';
  otherRepaymentSource: string;
  targetReleaseDate: string;
  // Residence and family
  yearsAtResidence: ResidenceYears | '';
  numberOfDependents: string;
  supportingMultipleFamilies: 'yes' | 'no' | '';
  // Employment or business
  mainIncomeSource: MainIncomeSource | '';
  otherIncomeSource: string;
  employmentTenure: TenureRange | '';
  incomeTrend: IncomeTrend | '';
  // Organization membership
  isOrgMember: 'yes' | 'no' | '';
  membershipType: string;
  organizationName: string;
  membershipYears: string;
  membershipStanding: MembershipStanding | '';

  // 4. Declared Financial Information
  declaredNetMonthlyIncome: string;
  otherMonthlyIncome: string;
  estimatedMonthlyHouseholdExpenses: string;
  existingMonthlyLoanPayments: string;
  monthlyCreditCardPayments: string;
  otherMonthlyObligations: string;

  // 5. Officer Observation
  officerObservations: OfficerObservationItem[];
  observationNotes: string;

  // 6. Collateral Information
  collateralOffered: CollateralOffered | '';
  collateralEntries: CollateralEntry[];

  // 7. Loan Package Proposal
  proposedLoanAmount: string;
  proposedLoanTerm: string;
  proposedLoanFacility: string;
  proposedInterestRate: string;
  interestRateBasis: InterestRateBasis | '';
  computationType: ComputationType | '';
  computationTypeOther: string;
  paymentFrequency: string;
  estimatedAmortization: string;
  estimatedMaturityValue: string;
  proposedReleaseDate: string;
  finalUseOfProceeds: string;
  proposalPrimaryRepaymentSource: RepaymentSource | '';
  adjustmentReason: AdjustmentReason | '';
  adjustmentReasonOther: string;
  collateralAssessment:
    | 'sufficient'
    | 'additional-required'
    | 'subject-to-appraisal'
    | 'tbd'
    | 'may-proceed-without'
    | '';
  conditionsBeforeProceeding: ConditionItem[];
  preliminaryRecommendation: PreliminaryRecommendation | '';
  recommendationReason: string;
  loanPackageNotes: string;

  // 8. Follow-up and Next Step
  followUpRequired: 'yes' | 'no' | '';
  followUpDate: string;
  nextAction: NextAction | '';
  nextActionOther: string;
  nextStepsInstructions: string;

  // 9. Call Summary
  callSummary: string;
  callSummaryEdited: boolean;
  additionalRemarks: string;
};

export type RequirementDoc = {
  key: string;
  status: RequirementDocStatus;
  aiNote: string;
  fileName: string | null;
  uploadedAt: string | null;
};

export type RequirementChecklist = {
  documents: RequirementDoc[];
  collateralNotes: string;
  endorsed: boolean;
  returnedToApplicant: boolean;
  returnReason: string;
};

export type ReviewStep =
  | 'creditChecking'
  | 'reconsideration'
  | 'callReport'
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
  negativeCreditReport: NegativeCreditReport;
  callReport: CallReport;
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
  setRequirementChecklist: (data: Partial<RequirementChecklist>) => void;
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

// Pre-populates 14 of the 16 documents as already received (matching the
// design spec's "12/13 Required Received" starting screenshot) — every doc
// except incomeTaxReturn and taxMappingAuthorization starts with a sample
// fileName and its metadata's freshStatus/freshNote already applied.
const DOCS_STARTING_MISSING = new Set(['incomeTaxReturn', 'taxMappingAuthorization']);

function createInitialRequirementDocuments(): RequirementDoc[] {
  return REQUIREMENT_DOC_META.map((meta) => {
    if (DOCS_STARTING_MISSING.has(meta.key)) {
      return { key: meta.key, status: 'missing', aiNote: '', fileName: null, uploadedAt: null };
    }
    return {
      key: meta.key,
      status: meta.freshStatus,
      aiNote: meta.freshNote,
      fileName: `${meta.key}-sample.pdf`,
      uploadedAt: new Date(0).toISOString(),
    };
  });
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
    loandexUpload: { fileName: null, uploadedAt: null },
    cicUpload: { fileName: null, uploadedAt: null },
    cmapUpload: { fileName: null, uploadedAt: null },
    nfisBapUpload: { fileName: null, uploadedAt: null },
    reconsideration: { notes: '', decision: 'pending' },
    negativeCreditReport: createInitialNegativeCreditReport(),
    callReport: {
      approved: false,
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
      primaryRepaymentSource: '',
      otherRepaymentSource: '',
      targetReleaseDate: '',
      yearsAtResidence: '',
      numberOfDependents: '',
      supportingMultipleFamilies: '',
      mainIncomeSource: '',
      otherIncomeSource: '',
      employmentTenure: '',
      incomeTrend: '',
      isOrgMember: '',
      membershipType: '',
      organizationName: '',
      membershipYears: '',
      membershipStanding: '',
      declaredNetMonthlyIncome: '',
      otherMonthlyIncome: '',
      estimatedMonthlyHouseholdExpenses: '',
      existingMonthlyLoanPayments: '',
      monthlyCreditCardPayments: '',
      otherMonthlyObligations: '',
      officerObservations: [],
      observationNotes: '',
      collateralOffered: '',
      collateralEntries: [],
      proposedLoanAmount: '',
      proposedLoanTerm: '',
      proposedLoanFacility: '',
      proposedInterestRate: '',
      interestRateBasis: '',
      computationType: '',
      computationTypeOther: '',
      paymentFrequency: '',
      estimatedAmortization: '',
      estimatedMaturityValue: '',
      proposedReleaseDate: '',
      finalUseOfProceeds: '',
      proposalPrimaryRepaymentSource: '',
      adjustmentReason: '',
      adjustmentReasonOther: '',
      collateralAssessment: '',
      conditionsBeforeProceeding: [],
      preliminaryRecommendation: '',
      recommendationReason: '',
      loanPackageNotes: '',
      followUpRequired: '',
      followUpDate: '',
      nextAction: '',
      nextActionOther: '',
      nextStepsInstructions: '',
      callSummary: '',
      callSummaryEdited: false,
      additionalRemarks: '',
    },
    requirementChecklist: {
      documents: createInitialRequirementDocuments(),
      collateralNotes: '',
      endorsed: false,
      returnedToApplicant: false,
      returnReason: '',
    },
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
            registeredOwner: '',
            estimatedValue: '',
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
