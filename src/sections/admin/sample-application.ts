import type { RegistrationState } from 'src/auth/registration-context';

// ----------------------------------------------------------------------
// Sample borrower application used to auto-populate the Admin Application
// List for demo/testing, since the admin portal has no backend of its own
// and reads the same localStorage the borrower flow writes to.
// ----------------------------------------------------------------------

// Inline SVG placeholders (data URIs) standing in for a real uploaded ID
// photo and a real captured selfie-with-ID photo, so the admin details
// view has something to render for the sample application.
const SAMPLE_ID_PHOTO =
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
      <text x="200" y="200" font-family="sans-serif" font-size="14" fill="#8891A6" text-anchor="middle">PhilSys / National ID (sample)</text>
    </svg>`
  );

const SAMPLE_SELFIE_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
      <rect width="360" height="480" fill="#14172A"/>
      <ellipse cx="180" cy="170" rx="80" ry="95" fill="#3B4256"/>
      <rect x="90" y="300" width="180" height="115" rx="10" fill="#EEF1FE" stroke="#4361EE" stroke-width="3"/>
      <text x="180" y="360" font-family="sans-serif" font-size="13" fill="#3448B0" text-anchor="middle">SAMPLE ID</text>
      <text x="180" y="450" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.7)" text-anchor="middle">Selfie with ID (sample)</text>
    </svg>`
  );

// Backdated so the sample application shows a realistic non-zero aging value
// in the admin UI, rather than "just now" every time it's demoed.
const SAMPLE_SUBMITTED_AT = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000).toISOString();

export const SAMPLE_APPLICATION: RegistrationState = {
  signUpData: {
    firstName: 'Maria',
    middleName: 'Reyes',
    lastName: 'Santos',
    extensionName: '',
    email: 'maria.santos@example.com',
    mobile: '9182345678',
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
      desiredLoanAmount: 150000,
      loanTermMonths: 24,
      employmentStatus: 'Employed',
      monthlyIncome: 45000,
      loanPurpose: 'Home Improvement',
    },
    personalInfo: {
      idType: 'PhilSys / National ID',
      idNumber: 'P9876543Z',
      idFile: SAMPLE_ID_PHOTO,
      idFileBack: null,
      birthday: '1991-08-22',
      address: '45 Aurora Boulevard',
      province: 'Metro Manila',
      city: 'Makati',
      barangay: 'Bel-Air',
      zipCode: '1210',
      civilStatus: 'Married',
      gender: 'Female',
      tinNumber: '987-654-321-000',
      referralSource: 'Search Engine',
    },
    selfieVerified: true,
    selfiePhoto: SAMPLE_SELFIE_PHOTO,
    submittedAt: SAMPLE_SUBMITTED_AT,
    assignedOfficer: 'Ramon Cruz',
  },
};
