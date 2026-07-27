// src/sections/admin/credit-investigation-docs.ts

// ----------------------------------------------------------------------
// Static content for the Credit Investigation screen's document checklist
// — the fixed, non-bureau, non-custom document list, grouped by whose
// document it is (Principal/Spouse/Mortgagor/Borrowers) plus a General
// Requirements group. Kept separate from admin-context.tsx's
// CreditInvestigation state the same way requirement-checklist-docs.ts is
// kept separate from RequirementChecklist state: this is fixed content, not
// per-application data.
//
// The 3 bureau checks (CIC/CMAP/NFIS-BAP) are deliberately NOT part of this
// metadata list — they're view-only rows on this page, reading directly
// from review.requirementChecklist.documents (see ReadOnlyBureauCheckRow
// below and credit-investigation-view.tsx), since those documents are
// already required to be uploaded during Requirement Checklist, one step
// earlier in the pipeline.
//
// This list does NOT vary by employment status, loan type, or any other
// application field — every application shows the same document list,
// same convention as requirement-checklist-docs.ts.
// ----------------------------------------------------------------------

export type CreditInvestigationDocSubgroup =
  | 'principal'
  | 'spouse'
  | 'mortgagor'
  | 'borrowers'
  | 'general';

export type CreditInvestigationDocMeta = {
  key: string;
  label: string;
  subgroup: CreditInvestigationDocSubgroup;
  required: boolean;
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};

export const CI_SUBGROUP_LABELS: Record<CreditInvestigationDocSubgroup, string> = {
  principal: 'Principal/Consumer',
  spouse: 'Spouse',
  mortgagor: 'Mortgagor',
  borrowers: 'Borrowers',
  general: 'General Requirements',
};

export const CI_SUBGROUP_ORDER: CreditInvestigationDocSubgroup[] = [
  'principal',
  'spouse',
  'mortgagor',
  'borrowers',
  'general',
];

export const CREDIT_INVESTIGATION_DOC_META: CreditInvestigationDocMeta[] = [
  {
    key: 'ciTinPrimaryId',
    label: 'TIN – Primary ID (Principal/Consumer)',
    subgroup: 'principal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'TIN format valid, matches application details.',
  },
  {
    key: 'ciSpousePassport',
    label: 'Philippine Passport – Primary ID of Spouse',
    subgroup: 'spouse',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Passport details legible and consistent.',
  },
  {
    key: 'ciSpouseDriversLicense',
    label: "Driver's License – Secondary ID of Spouse",
    subgroup: 'spouse',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'License expiry date should be confirmed.',
  },
  {
    key: 'ciPrimaryIdsMortgagor',
    label: 'Primary IDs of Mortgagor with 3 specimen signature',
    subgroup: 'mortgagor',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'ciPrimaryIdsBorrowers',
    label: 'Primary IDs Borrowers with 3 specimen signature',
    subgroup: 'borrowers',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'ciBankAuthForm',
    label: 'Duly accomplished and signed Bank Authorization Form',
    subgroup: 'general',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Signed and dated correctly.',
  },
  {
    key: 'ciRegistrationOfBusinessName',
    label: 'Registration of Business Name',
    subgroup: 'general',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Registration on file, no discrepancies found.',
  },
  {
    key: 'ciProofOfBilling',
    label: 'Proof of Billing',
    subgroup: 'general',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'ciAdditionalOtherDocuments',
    label: 'Additional/Other Documents',
    subgroup: 'general',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Reviewed, no issues found.',
  },
];
