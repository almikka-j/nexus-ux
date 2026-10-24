// src/sections/admin/credit-investigation/sample-ci-report.ts
//
// Sample-data builder for the CI Report — the single source of truth for
// BOTH Credit Investigation's "Fill with Sample Data" page action and its
// auto-fill-on-open effect (credit-investigation-view.tsx), so the two can
// never drift apart. Returns only CI Report field data: the CI Fee
// fields live on CreditInvestigation itself (setCreditInvestigation), and
// stay owned by handleFillSampleData alone — the auto-fill-on-open path
// must never approve a fee just because the page was opened.
//
// Fills a Commercial report end to end (Commercial exercises the most
// conditional sections: Management/Ownership, Location/Facilities,
// Commercial Trade Checking/Bank Verification, Additional Documents),
// plus every type-agnostic field on CiReport (residence, employment,
// assets, etc.) so switching the toggle to Consumer still shows a
// mostly-filled report. Consumer-only arrays (suppliers, customers,
// bankAccounts, consumerDocuments) are left untouched.
//
// Repeatable entries are built inline, mirroring the field order of the
// module-private create*Entry() factories in
// ci-report-commercial-sections.tsx / ci-report-consumer-sections.tsx
// (those aren't exported, so they can't be reused from here).

import type { CiReport } from 'src/auth/admin-context';
import type { FinancialInfo, PersonalInfo } from 'src/auth/registration-context';

import { buildTranscriptAutoFill } from '../credit-investigation-transcript';

export const SAMPLE_CI_TRANSCRIPT_FILE_NAME = 'sample-transcript.pdf';

// Mirrors createInitialCiReport()'s own default (admin-context.tsx) — the
// officer completes the sentence with the bureau report date.
const NEGATIVE_RECORD_SOURCE_NOTE_PREFIX =
  'Source of information: BAP Credit Bureau / CMAP report on accounts under watch lists, cancelled credit cards, adverse classified loan file, closed current account and court case file as of ';

const SAMPLE_DOC_URL = '/assets/documents/sample-local-pdf.pdf';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yearsFromToday(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return isoDate(date);
}

type SampleCiReportInput = {
  email: string;
  applicantName: string;
  personalInfo: PersonalInfo | null | undefined;
  financialInfo: FinancialInfo | null | undefined;
};

export function buildSampleCiReportFields({
  email,
  applicantName,
  personalInfo,
  financialInfo,
}: SampleCiReportInput): Partial<CiReport> {
  const now = new Date();
  const nowIso = now.toISOString();
  const today = isoDate(now);
  const todayLong = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const autoFill = buildTranscriptAutoFill([email, SAMPLE_CI_TRANSCRIPT_FILE_NAME], applicantName);
  const hasNegativeFindings = autoFill.negativeRecordFinding === 'negative-findings-found';

  // Spouse: only for a married applicant, built from the spouse data
  // actually on file (same derivation as CiReportCard's one-time prefill);
  // otherwise an explicit "not applicable" note rather than an invented
  // spouse.
  const isMarried = personalInfo?.civilStatus === 'Married';
  const spouseName = isMarried
    ? [personalInfo?.spouseFirstName, personalInfo?.spouseMiddleName, personalInfo?.spouseLastName]
        .filter(Boolean)
        .join(' ')
    : '';
  const spouseNotes = isMarried
    ? `<p>Spouse ${spouseName || 'on file'}${
        personalInfo?.spouseBirthday ? ` (born ${personalInfo.spouseBirthday})` : ''
      } was present during the visit and confirmed the household details declared in the application. Spouse is employed as an Administrative Assistant with a monthly income of approximately PHP 22,000.</p>`
    : '<p>Not applicable — applicant is not married per the application on file.</p>';

  const loanPurpose = financialInfo?.loanPurpose || 'For additional working capital';

  return {
    type: 'commercial',

    // Site visit
    visitDate: today,
    subjectAsOf: autoFill.findingsNarrativeHtml,

    // Spouse / Children
    spouseNotes,
    children: [
      { id: crypto.randomUUID(), name: 'Maria Isabel Santos', age: '16', occupationOrSchool: 'Grade 11 — Antipolo National High School' },
      { id: crypto.randomUUID(), name: 'Juan Miguel Santos', age: '12', occupationOrSchool: 'Grade 6 — Mayamot Elementary School' },
    ],

    // Residence / Neighborhood
    residencePermanentAddress: '24 Santol St., Town and Country Executive Village, Mayamot, City of Antipolo, Rizal',
    residenceProvince: 'Rizal',
    residenceCity: 'City of Antipolo',
    residenceBarangay: 'Mayamot',
    residenceStreetAddress: '24 Santol St., Town and Country Executive Village',
    residenceAddressType: autoFill.residenceAddressType,
    residenceLengthOfStay: autoFill.residenceLengthOfStay,
    residenceLandmark: 'Near Mayamot Barangay Hall, beside Santol St. chapel',
    residenceRemarks:
      'Two-storey concrete house in a gated subdivision. Neighbors (Mrs. Reyes, Lot 26) confirmed the applicant has resided here as declared.',
    presentSameAsPermanent: autoFill.presentSameAsPermanent,
    ...(autoFill.presentSameAsPermanent
      ? {}
      : {
          presentProvince: 'Metro Manila',
          presentCity: 'Quezon City',
          presentBarangay: 'Bagumbayan',
          presentStreetAddress: 'Unit 5B, 18 Eulogio Rodriguez Jr. Ave.',
          presentAddressType: 'rent' as const,
          presentLengthOfStay: 'Less than 1 year',
          presentLandmark: 'Across Eastwood City main gate',
          presentRemarks: 'Rented condominium unit near the business site; monthly rent of PHP 18,000 confirmed with the building admin.',
        }),

    // Employment
    employmentType: autoFill.employmentType,
    employerName: 'Sample Employer Corp.',
    position: 'Staff Supervisor',
    employerAddress: '8th Floor, Ortigas Tower, ADB Ave., Ortigas Center, Pasig City, Metro Manila',
    employerTelNo: '(02) 8635-1234',
    employerEmail: 'hr@sampleemployer.com.ph',
    salary: '35000',
    annualIncome: '455000',
    lengthOfService: autoFill.lengthOfService,
    numberOfRegEmployees: '120',
    numberOfContrEmployees: '35',
    isUnionized: 'no',
    secDtiRegNo: 'CS201512345',
    secDtiRegDate: '2015-06-15',
    secDtiExpDate: '2065-06-15',
    employmentRemarks: 'Employment and salary verified by phone with the HR Officer, Ms. Liza Fernandez.',

    // Assets / Other Income / Loan Purpose
    assetsNotes:
      '<p>Owns the residential house and lot (TCT No. 012-2018004521, Antipolo City), a 2020 Toyota Innova (Plate No. NCX 4821), and two Isuzu delivery trucks used in the business. Land and vehicle registrations sighted during the visit.</p>',
    otherIncomeSources: [
      {
        id: crypto.randomUUID(),
        incomeType: 'Rental Income',
        companyName: 'Santos Apartments',
        owner: applicantName || 'Applicant',
        percentOfShare: '100',
        remarks: 'Three-door apartment in Cainta, Rizal; approximately PHP 24,000 monthly rental income.',
      },
    ],
    loanPurposeNotes: `<p>${loanPurpose}. Proceeds will fund the purchase of an additional delivery truck and working capital for new logistics contracts in CALABARZON.</p>`,

    // Negative Record
    negativeRecordSourceNote: `${NEGATIVE_RECORD_SOURCE_NOTE_PREFIX}${todayLong}.`,
    negativeRecordFinding: autoFill.negativeRecordFinding,
    negativeRecordRemarks: hasNegativeFindings
      ? '<p>One closed current account (2021) flagged in the CMAP report. Applicant explained it was due to a disputed check; supporting settlement letter to be requested.</p>'
      : '<p>No negative findings in both CMAP and NFIS. No court cases, watch-list hits, or cancelled credit cards on record.</p>',

    // Health and Habits / Comments
    healthAndHabitsNotes:
      '<p>Applicant appears in good health. Non-smoker and a social drinker only. No known vices reported by neighbors or employees interviewed.</p>',
    commentsNotes:
      '<p>Business operations observed to be active during the visit, with trucks dispatched and staff on site. Records presented were orderly and consistent with the financial statements submitted.</p>',

    // Recommendation
    recommendation: 'proceed-as-requested',
    recommendationNotes: 'Sample data: site visit findings support proceeding with the application as requested.',

    // Business profile (Commercial)
    businessLineOfBusiness: 'Transportation and Storage',
    businessAuthorizedCapitalStock: '5000000',
    businessOwner: applicantName || 'Sample Owner',
    businessTerritory: 'Metro Manila and CALABARZON',
    businessRegularEmployees: '18',
    businessContractualEmployees: '7',

    // Location / Facilities (Commercial)
    premisesConstructionDescription: 'Single-storey concrete warehouse with steel roofing and an attached two-room office.',
    premisesAreaDescription: 'Approximately 450 sqm lot; 300 sqm warehouse floor area with a 6-truck parking yard.',
    locationOwned: 'owned',
    equipmentOwned: 'leased',
    facilitiesDescription:
      '<p>Warehouse and lot are owned by the business (TCT sighted). Two of four delivery trucks are leased from Isuzu Leasing at PHP 45,000/month each; forklift and office equipment are owned.</p>',

    // Trade Checking (Commercial)
    commercialSuppliers: [
      {
        id: crypto.randomUUID(),
        companyName: 'Petron Fuel Depot – Antipolo',
        contactPerson: 'Rodel Mendoza',
        position: 'Accounts Officer',
        mobileNumber: '09171234567',
        email: 'rmendoza@sampledepot.com.ph',
        telephoneNo: '(02) 8696-1122',
        localExtension: '104',
        transactionDetails: 'Diesel supply for the delivery fleet, approx. PHP 180,000 monthly.',
        paymentTerms: '30 days',
        yearsOfContract: '4',
        remarks: 'Pays on time; no outstanding past-due balance.',
      },
      {
        id: crypto.randomUUID(),
        companyName: 'Isuzu Leasing Philippines',
        contactPerson: 'Karen Villanueva',
        position: 'Leasing Account Manager',
        mobileNumber: '09189876543',
        email: 'kvillanueva@sampleleasing.com.ph',
        telephoneNo: '(02) 8812-3456',
        localExtension: '220',
        transactionDetails: 'Operating lease of two Isuzu N-Series trucks.',
        paymentTerms: 'Monthly, post-dated checks',
        yearsOfContract: '3',
        remarks: 'Good standing; all PDCs cleared.',
      },
    ],
    commercialCustomers: [
      {
        id: crypto.randomUUID(),
        companyName: 'Sample Consumer Goods Distribution Inc.',
        contactPerson: 'Arnel Bautista',
        position: 'Logistics Head',
        mobileNumber: '09175551234',
        email: 'abautista@sampledistribution.com.ph',
        telephoneNo: '(02) 8721-4400',
        localExtension: '315',
        transactionDetails: 'Daily warehouse-to-store deliveries across Rizal and Laguna, approx. PHP 650,000 monthly billing.',
        paymentTerms: '45 days',
        yearsOfContract: '5',
        remarks: 'Satisfied with service; contract renewed in 2025.',
      },
    ],

    // Management and Ownership (Commercial) — Corporation, so Stockholders
    // render and Trustees (Cooperative only) stay empty.
    management: [
      {
        id: crypto.randomUUID(),
        fullName: applicantName || 'Sample Owner',
        birthdate: '1982-04-12',
        birthPlace: 'Antipolo City, Rizal',
        nationality: 'Filipino',
        spousePartner: isMarried && spouseName ? spouseName : 'N/A',
        homeAddress: '24 Santol St., Town and Country Executive Village, Mayamot, City of Antipolo, Rizal',
        jobTitle: 'President & General Manager',
        education: 'BS Business Administration, University of Santo Tomas',
        otherBusiness: 'Santos Apartments (rental)',
        tin: '123-456-789-000',
        mobileNumber: '09090013618',
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Ramon D. Cruz',
        birthdate: '1985-09-30',
        birthPlace: 'Marikina City, Metro Manila',
        nationality: 'Filipino',
        spousePartner: 'Elena P. Cruz',
        homeAddress: '12 Sampaguita St., Concepcion Uno, Marikina City, Metro Manila',
        jobTitle: 'Operations Manager',
        education: 'BS Industrial Engineering, Mapúa University',
        otherBusiness: 'None',
        tin: '234-567-890-000',
        mobileNumber: '09178889900',
      },
    ],
    businessTypeOverride: 'corporation',
    trustees: [],
    stockholders: [
      {
        id: crypto.randomUUID(),
        stockholderType: 'individual',
        name: applicantName || 'Sample Owner',
        amountSubscribed: '3000000',
        amountPaidUp: '2250000',
        percentageShare: '60',
        subStockholders: [],
      },
      {
        id: crypto.randomUUID(),
        stockholderType: 'corporation',
        name: 'Sample Holdings Inc.',
        amountSubscribed: '2000000',
        amountPaidUp: '1500000',
        percentageShare: '40',
        subStockholders: [
          {
            id: crypto.randomUUID(),
            name: 'Ramon D. Cruz',
            stockholderType: 'individual',
            amountSubscribed: '2000000',
            amountPaidUp: '1500000',
            percentageShare: '100',
          },
        ],
      },
    ],

    // Bank Verification (Commercial)
    commercialBankAccounts: [
      {
        id: crypto.randomUUID(),
        bankName: 'BDO Unibank',
        branch: 'Antipolo – Sumulong Highway',
        accountNumber: '0012-3456-7890',
        accountType: 'Current Account',
        averageDailyBalance: '850000',
        dateVerified: today,
        experience: 'Satisfactory — no returned checks in the last 12 months.',
        contactPerson: 'Grace Lim, Branch Service Officer',
        contactNumber: '(02) 8630-7711',
      },
      {
        id: crypto.randomUUID(),
        bankName: 'Bank of the Philippine Islands',
        branch: 'Ortigas – Emerald Ave.',
        accountNumber: '3141-5926-53',
        accountType: 'Savings Account',
        averageDailyBalance: '420000',
        dateVerified: today,
        experience: 'Account in good standing since 2018.',
        contactPerson: 'Mark Tan, Relationship Manager',
        contactNumber: '(02) 8891-0000',
      },
    ],

    // Additional Documents (Commercial)
    commercialDocuments: [
      {
        id: crypto.randomUUID(),
        label: "Mayor's Business Permit 2026",
        fileName: 'sample-business-permit.pdf',
        fileUrl: SAMPLE_DOC_URL,
        uploadedAt: nowIso,
      },
    ],

    // Transcript — the literal filename is the isSampleFilled signal.
    transcriptFileName: SAMPLE_CI_TRANSCRIPT_FILE_NAME,
    transcriptUploadedAt: nowIso,
  };
}

// The inverse of buildSampleCiReportFields — resets every field it
// touches back to createInitialCiReport()'s defaults, for "Remove Sample
// Data".
export function buildClearedSampleCiReportFields(): Partial<CiReport> {
  return {
    type: '',
    visitDate: '',
    subjectAsOf: '',
    spouseNotes: '',
    children: [],
    residencePermanentAddress: '',
    residenceProvince: '',
    residenceCity: '',
    residenceBarangay: '',
    residenceStreetAddress: '',
    residenceAddressType: '',
    residenceLengthOfStay: '',
    residenceLandmark: '',
    residenceRemarks: '',
    presentSameAsPermanent: false,
    presentProvince: '',
    presentCity: '',
    presentBarangay: '',
    presentStreetAddress: '',
    presentAddressType: '',
    presentLengthOfStay: '',
    presentLandmark: '',
    presentRemarks: '',
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
    assetsNotes: '',
    otherIncomeSources: [],
    loanPurposeNotes: '',
    negativeRecordSourceNote: NEGATIVE_RECORD_SOURCE_NOTE_PREFIX,
    negativeRecordFinding: '',
    negativeRecordRemarks: '',
    healthAndHabitsNotes: '',
    commentsNotes: '',
    recommendation: '',
    recommendationNotes: '',
    businessLineOfBusiness: '',
    businessAuthorizedCapitalStock: '',
    businessOwner: '',
    businessTerritory: '',
    businessRegularEmployees: '',
    businessContractualEmployees: '',
    premisesConstructionDescription: '',
    premisesAreaDescription: '',
    locationOwned: '',
    equipmentOwned: '',
    facilitiesDescription: '',
    commercialSuppliers: [],
    commercialCustomers: [],
    management: [],
    businessTypeOverride: '',
    trustees: [],
    stockholders: [],
    commercialBankAccounts: [],
    commercialDocuments: [],
    transcriptFileName: null,
    transcriptUploadedAt: null,
  };
}
