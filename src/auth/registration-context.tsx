'use client';

import { useMemo, useState, useEffect, useContext, createContext } from 'react';

// ----------------------------------------------------------------------

export type SignUpData = {
  prefix?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  email: string;
  mobile: string;
  password: string;
  marketingConsent: boolean;
  termsAccepted: boolean;
};

export type LoanType = 'personal' | 'business';

export type FinancialInfo = {
  desiredLoanAmount: number;
  loanTermMonths: number;
  employmentStatus: string;
  monthlyIncome: number;
  loanPurpose: string;
  // Collected only when employmentStatus === 'Business Owner' — see
  // PreliminaryApplicationView's conditional "Business Type" + document
  // upload fields. businessDocument is stored as a base64 data URL (a raw
  // File can't survive JSON.stringify into localStorage).
  businessType?: string;
  businessDocument?: string | null;
};

export type PersonalInfo = {
  idType: string;
  idNumber: string;
  idFile: File | string | null;
  idFileBack: File | string | null;
  birthday: string;
  address: string;
  province: string;
  city: string;
  barangay: string;
  zipCode: string;
  civilStatus: string;
  gender: string;
  tinNumber: string;
  referralSource: string;
  // Collected only when civilStatus === 'Married' — see StepPersonalInfo's
  // "Spouse Information" section. spouseAddress/spouseProvince are either a
  // direct copy of the borrower's own address/province (when "Same address
  // as spouse" is checked) or separately-entered values.
  spouseFirstName?: string;
  spouseMiddleName?: string;
  spouseLastName?: string;
  spouseExtensionName?: string;
  spouseBirthday?: string;
  spouseAddress?: string;
  spouseProvince?: string;
  spouseCity?: string;
  spouseBarangay?: string;
  spouseZipCode?: string;
};

export type ApplicationData = {
  loanType: LoanType | null;
  financialInfo: FinancialInfo | null;
  personalInfo: PersonalInfo | null;
  selfieVerified: boolean;
  selfiePhoto: string | null;
  submittedAt: string | null;
  assignedOfficer: string | null;
};

// Recorded the moment Preliminary Application is submitted — 'declined'
// when the desired loan amount is below the qualification threshold
// (no account is created in that case), 'qualified' otherwise. Persists via
// the same localStorage mechanism as the rest of this state, so a
// declined submission leaves a durable record even though no downstream
// screen currently reads it beyond this.
export type PreliminaryStatus = 'declined' | 'qualified' | null;
export type OnboardingStep = 0 | 1 | 2;

export type RegistrationState = {
  signUpData: SignUpData | null;
  verified: boolean;
  preliminaryStatus: PreliminaryStatus;
  onboardingStep: OnboardingStep;
  application: ApplicationData;
};

type RegistrationContextValue = RegistrationState & {
  hydrated: boolean;
  setSignUpData: (data: SignUpData) => void;
  setVerified: (verified: boolean) => void;
  setPreliminaryStatus: (status: PreliminaryStatus) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setLoanType: (loanType: LoanType | null) => void;
  setFinancialInfo: (info: FinancialInfo) => void;
  setPersonalInfo: (info: PersonalInfo) => void;
  setSelfieVerified: (verified: boolean) => void;
  setSelfiePhoto: (photo: string | null) => void;
  markSubmitted: () => void;
  loadSample: (state: RegistrationState) => void;
  reset: () => void;
};

const STORAGE_KEY = 'hhc-lms-registration';

const initialState: RegistrationState = {
  signUpData: null,
  verified: false,
  preliminaryStatus: null,
  onboardingStep: 0,
  application: {
    loanType: null,
    financialInfo: null,
    personalInfo: null,
    selfieVerified: false,
    selfiePhoto: null,
    submittedAt: null,
    assignedOfficer: null,
  },
};

// Round-robin account/credit officer auto-tagging (per the source flowchart's
// "Auto tagging of account officer and credit officer" note). No real officer
// accounts exist in this prototype, so assignment is a deterministic hash of
// the applicant's email into a small mock roster — stable across reloads
// without needing a counter or backend.
const MOCK_OFFICER_ROSTER = ['Ramon Cruz', 'Bea Lopez', 'Ivan Tan', 'Grace Uy'];

export function assignMockOfficer(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i += 1) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return MOCK_OFFICER_ROSTER[hash % MOCK_OFFICER_ROSTER.length];
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

function readStoredState(): RegistrationState {
  if (typeof window === 'undefined') return initialState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const stored = JSON.parse(raw);
    // Merge one level into `application` too — a shallow top-level spread
    // alone would drop any application sub-key (e.g. assignedOfficer) added
    // after a session was already saved to localStorage, since the stored
    // `application` object would fully replace initialState.application
    // instead of filling gaps in it.
    return {
      ...initialState,
      ...stored,
      application: { ...initialState.application, ...stored.application },
    };
  } catch {
    return initialState;
  }
}

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RegistrationState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStoredState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<RegistrationContextValue>(
    () => ({
      ...state,
      hydrated,
      setSignUpData: (signUpData) => setState((prev) => ({ ...prev, signUpData })),
      setVerified: (verified) => setState((prev) => ({ ...prev, verified })),
      setPreliminaryStatus: (preliminaryStatus) =>
        setState((prev) => ({ ...prev, preliminaryStatus })),
      setOnboardingStep: (onboardingStep) =>
        setState((prev) => ({ ...prev, onboardingStep })),
      setLoanType: (loanType) =>
        setState((prev) => ({ ...prev, application: { ...prev.application, loanType } })),
      setFinancialInfo: (financialInfo) =>
        setState((prev) => ({ ...prev, application: { ...prev.application, financialInfo } })),
      setPersonalInfo: (personalInfo) =>
        setState((prev) => ({ ...prev, application: { ...prev.application, personalInfo } })),
      setSelfieVerified: (selfieVerified) =>
        setState((prev) => ({ ...prev, application: { ...prev.application, selfieVerified } })),
      setSelfiePhoto: (selfiePhoto) =>
        setState((prev) => ({ ...prev, application: { ...prev.application, selfiePhoto } })),
      markSubmitted: () =>
        setState((prev) => ({
          ...prev,
          application: {
            ...prev.application,
            submittedAt: new Date().toISOString(),
            assignedOfficer: prev.signUpData ? assignMockOfficer(prev.signUpData.email) : null,
          },
        })),
      loadSample: (sampleState) => setState(sampleState),
      reset: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setState(initialState);
      },
    }),
    [state, hydrated]
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const context = useContext(RegistrationContext);

  if (!context) {
    throw new Error('useRegistration must be used within RegistrationProvider');
  }

  return context;
}
