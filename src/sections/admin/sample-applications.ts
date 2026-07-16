import type { ReviewStep } from 'src/auth/admin-context';
import type { RegistrationState } from 'src/auth/registration-context';

// ----------------------------------------------------------------------
// Read-only sample applications used to populate the Admin Application List
// and its per-step filtered views with more than one row, since the admin
// portal has no real backend/database of its own. Only ONE application in
// this prototype is ever "live" (the real borrower session read via
// useRegistration()/useAdmin() — see sample-application.ts for that one).
// These extra samples exist purely for listing/viewing — they have no
// working Approve/No, forms, or uploads, since there's nowhere real for
// those edits to be saved.
// ----------------------------------------------------------------------

function svgIdPhoto(label: string) {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="252" viewBox="0 0 400 252">
        <rect width="400" height="252" rx="12" fill="#EEF1FE"/>
        <rect x="20" y="20" width="90" height="110" rx="8" fill="#C7CCDA"/>
        <rect x="128" y="28" width="200" height="14" rx="4" fill="#8891A6"/>
        <rect x="128" y="54" width="160" height="10" rx="4" fill="#B8BFCF"/>
        <rect x="128" y="74" width="180" height="10" rx="4" fill="#B8BFCF"/>
        <rect x="128" y="94" width="140" height="10" rx="4" fill="#B8BFCF"/>
        <rect x="20" y="150" width="360" height="1" fill="#C7CCDA"/>
        <text x="200" y="200" font-family="sans-serif" font-size="14" fill="#8891A6" text-anchor="middle">${label}</text>
      </svg>`
    )
  );
}

function svgSelfiePhoto(label: string) {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
        <rect width="360" height="480" fill="#14172A"/>
        <ellipse cx="180" cy="170" rx="80" ry="95" fill="#3B4256"/>
        <rect x="90" y="300" width="180" height="115" rx="10" fill="#EEF1FE" stroke="#4361EE" stroke-width="3"/>
        <text x="180" y="360" font-family="sans-serif" font-size="13" fill="#3448B0" text-anchor="middle">SAMPLE ID</text>
        <text x="180" y="450" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.7)" text-anchor="middle">${label}</text>
      </svg>`
    )
  );
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export type SampleApplicationEntry = {
  registration: RegistrationState;
  /** Which review step this sample is parked at, for the per-step filtered list views. */
  step: ReviewStep;
};

// ----------------------------------------------------------------------

export const SAMPLE_APPLICATIONS: SampleApplicationEntry[] = [
  {
    step: 'creditChecking',
    registration: {
      signUpData: {
        firstName: 'Arvin',
        middleName: 'Torres',
        lastName: 'Mendoza',
        extensionName: '',
        email: 'arvin.mendoza@example.com',
        mobile: '9209876543',
        password: 'Password123',
        marketingConsent: true,
        termsAccepted: true,
      },
      verified: true,
      preliminaryStatus: 'qualified',
      onboardingStep: 2,
      application: {
        loanType: 'personal',
        financialInfo: {
          desiredLoanAmount: 100000,
          loanTermMonths: 12,
          employmentStatus: 'Employed',
          monthlyIncome: 32000,
          loanPurpose: 'Education',
        },
        personalInfo: {
          idType: 'PhilSys / National ID',
          idNumber: 'P7788990011',
          idFile: svgIdPhoto('PhilSys / National ID (sample)'),
          idFileBack: null,
          birthday: '1998-02-10',
          address: '9 Bonifacio Street',
          province: 'Rizal',
          city: 'Antipolo',
          barangay: 'San Roque',
          zipCode: '1870',
          civilStatus: 'Single',
          gender: 'Male',
          tinNumber: '654-321-000-000',
          referralSource: 'Search Engine',
        },
        selfieVerified: true,
        selfiePhoto: svgSelfiePhoto('Selfie with ID (sample)'),
        submittedAt: hoursAgo(8),
        assignedOfficer: 'Bea Lopez',
      },
    },
  },
  {
    step: 'reconsideration',
    registration: {
      signUpData: {
        firstName: 'Jonalyn',
        middleName: 'Reyes',
        lastName: 'Bautista',
        extensionName: '',
        email: 'jonalyn.bautista@example.com',
        mobile: '9173456789',
        password: 'Password123',
        marketingConsent: true,
        termsAccepted: true,
      },
      verified: true,
      preliminaryStatus: 'qualified',
      onboardingStep: 2,
      application: {
        loanType: 'personal',
        financialInfo: {
          desiredLoanAmount: 80000,
          loanTermMonths: 12,
          employmentStatus: 'Self-Employed',
          monthlyIncome: 28000,
          loanPurpose: 'Medical Expenses',
        },
        personalInfo: {
          idType: 'Driver’s License',
          idNumber: 'N01-23-456789',
          idFile: svgIdPhoto('Driver’s License (sample) — Front'),
          idFileBack: svgIdPhoto('Driver’s License (sample) — Back'),
          birthday: '1995-11-30',
          address: '12 Mabini Street',
          province: 'Cebu',
          city: 'Cebu City',
          barangay: 'Lahug',
          zipCode: '6000',
          civilStatus: 'Single',
          gender: 'Female',
          tinNumber: '123-456-987-000',
          referralSource: 'Social Media',
        },
        selfieVerified: true,
        selfiePhoto: svgSelfiePhoto('Selfie with ID (sample)'),
        submittedAt: hoursAgo(30),
        assignedOfficer: 'Bea Lopez',
      },
    },
  },
  {
    step: 'callReport',
    registration: {
      signUpData: {
        firstName: 'Ramil',
        middleName: 'Santos',
        lastName: 'Dela Cruz',
        extensionName: '',
        email: 'ramil.delacruz@example.com',
        mobile: '9281234567',
        password: 'Password123',
        marketingConsent: false,
        termsAccepted: true,
      },
      verified: true,
      preliminaryStatus: 'qualified',
      onboardingStep: 2,
      application: {
        loanType: 'business',
        financialInfo: {
          desiredLoanAmount: 350000,
          loanTermMonths: 36,
          employmentStatus: 'Business Owner',
          monthlyIncome: 90000,
          loanPurpose: 'Business Expansion',
        },
        personalInfo: {
          idType: 'PhilSys / National ID',
          idNumber: 'P5551234A',
          idFile: svgIdPhoto('PhilSys / National ID (sample)'),
          idFileBack: null,
          birthday: '1988-05-04',
          address: '78 Rizal Avenue',
          province: 'Laguna',
          city: 'Santa Rosa',
          barangay: 'Balibago',
          zipCode: '4026',
          civilStatus: 'Married',
          gender: 'Male',
          tinNumber: '456-789-123-000',
          referralSource: 'Existing Customer',
        },
        selfieVerified: true,
        selfiePhoto: svgSelfiePhoto('Selfie with ID (sample)'),
        submittedAt: hoursAgo(50),
        assignedOfficer: 'Ivan Tan',
      },
    },
  },
  {
    step: 'transactionType',
    registration: {
      signUpData: {
        firstName: 'Cristina',
        middleName: 'Aquino',
        lastName: 'Villanueva',
        extensionName: '',
        email: 'cristina.villanueva@example.com',
        mobile: '9051112233',
        password: 'Password123',
        marketingConsent: true,
        termsAccepted: true,
      },
      verified: true,
      preliminaryStatus: 'qualified',
      onboardingStep: 2,
      application: {
        loanType: 'personal',
        financialInfo: {
          desiredLoanAmount: 120000,
          loanTermMonths: 18,
          employmentStatus: 'Employed',
          monthlyIncome: 38000,
          loanPurpose: 'Debt Consolidation',
        },
        personalInfo: {
          idType: 'UMID',
          idNumber: 'U-9988776655',
          idFile: svgIdPhoto('UMID (sample) — Front'),
          idFileBack: svgIdPhoto('UMID (sample) — Back'),
          birthday: '1975-09-18',
          address: '5 Aguinaldo Highway',
          province: 'Cavite',
          city: 'Dasmariñas',
          barangay: 'Zone IV',
          zipCode: '4114',
          civilStatus: 'Widowed',
          gender: 'Female',
          tinNumber: '789-123-456-000',
          referralSource: 'Referral from a Friend',
        },
        selfieVerified: true,
        selfiePhoto: svgSelfiePhoto('Selfie with ID (sample)'),
        submittedAt: hoursAgo(20),
        assignedOfficer: 'Grace Uy',
      },
    },
  },
  {
    step: 'requirementChecklist',
    registration: {
      signUpData: {
        firstName: 'Noel',
        middleName: 'Garcia',
        lastName: 'Ramos',
        extensionName: 'Jr.',
        email: 'noel.ramos@example.com',
        mobile: '9998887766',
        password: 'Password123',
        marketingConsent: false,
        termsAccepted: true,
      },
      verified: true,
      preliminaryStatus: 'qualified',
      onboardingStep: 2,
      application: {
        loanType: 'personal',
        financialInfo: {
          desiredLoanAmount: 200000,
          loanTermMonths: 24,
          employmentStatus: 'Employed',
          monthlyIncome: 55000,
          loanPurpose: 'Home Improvement',
        },
        personalInfo: {
          idType: 'Philippine Passport',
          idNumber: 'P3344556677',
          idFile: svgIdPhoto('Philippine Passport (sample)'),
          idFileBack: null,
          birthday: '1982-01-27',
          address: '33 Katipunan Avenue',
          province: 'Metro Manila',
          city: 'Quezon City',
          barangay: 'Loyola Heights',
          zipCode: '1108',
          civilStatus: 'Married',
          gender: 'Male',
          tinNumber: '321-654-987-000',
          referralSource: 'Advertisement',
        },
        selfieVerified: true,
        selfiePhoto: svgSelfiePhoto('Selfie with ID (sample)'),
        submittedAt: hoursAgo(76),
        assignedOfficer: 'Ramon Cruz',
      },
    },
  },
];
