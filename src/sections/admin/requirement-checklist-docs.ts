// src/sections/admin/requirement-checklist-docs.ts

// ----------------------------------------------------------------------
// Static content for the Requirement Checklist screen — the fixed document
// list, grouped into 3 tabs (Credit Investigation / Appraisal / Financial
// Evaluation), each document's required-ness, and the canned AI note it gets
// the first time a file is uploaded for it. Kept separate from
// admin-context.tsx's RequirementChecklist state (per-application,
// persisted) the same way initial-credit-checking-risk.ts is kept separate
// from CreditChecking state: this is fixed content, not per-application
// data.
//
// The document set does NOT vary by employment status, loan type, or any
// other application field — every application shows the same document list.
//
// A handful of documents (Working Visa, Statement of Account,
// Additional/Other Documents) are required reading in more than one tab —
// e.g. Working Visa matters to both Credit Investigation and Financial
// Evaluation. Rather than duplicate that document under two separate keys
// (which would let it be "uploaded" in one tab but still show "missing" in
// the other for what a reviewer would consider the same physical document),
// each RequirementDocMeta lists every tab it appears in via `tabs` — one
// underlying RequirementDoc/upload, shown wherever it's relevant.
// ----------------------------------------------------------------------

export type RequirementDocTab = 'creditInvestigation' | 'appraisal' | 'financialEvaluation';

// Credit Investigation is the only tab with a further nested grouping (two
// named sub-sections). Every other tab renders its documents as one flat
// list, so `subgroup` is only meaningful there — undefined elsewhere.
export type RequirementDocSubgroup = 'loanCreditChecking' | 'loanRequirements';

export type RequirementDocStatus = 'verified' | 'needs-review' | 'missing';

export type RequirementDocMeta = {
  key: string;
  label: string;
  tabs: RequirementDocTab[];
  subgroup?: RequirementDocSubgroup;
  required: boolean;
  // Status/note assigned the first time a file is uploaded for this
  // document while it's 'missing' — deterministic per document key, never
  // randomized (see design spec's "AI note generation" decision).
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};

export const REQUIREMENT_TAB_LABELS: Record<RequirementDocTab, string> = {
  creditInvestigation: 'Credit Investigation',
  appraisal: 'Appraisal',
  financialEvaluation: 'Financial Evaluation',
};

export const REQUIREMENT_TAB_ORDER: RequirementDocTab[] = [
  'creditInvestigation',
  'appraisal',
  'financialEvaluation',
];

export const REQUIREMENT_SUBGROUP_LABELS: Record<RequirementDocSubgroup, string> = {
  loanCreditChecking: 'Loan Credit Checking Documents',
  loanRequirements: 'Loan Requirements',
};

export const REQUIREMENT_DOC_META: RequirementDocMeta[] = [
  // Credit Investigation · Loan Credit Checking Documents
  {
    key: 'cicCheck',
    label: 'CIC Check',
    tabs: ['creditInvestigation'],
    subgroup: 'loanCreditChecking',
    required: true,
    freshStatus: 'verified',
    freshNote: 'No adverse records found.',
  },
  {
    key: 'cmapCheck',
    label: 'CMAP Check',
    tabs: ['creditInvestigation'],
    subgroup: 'loanCreditChecking',
    required: true,
    freshStatus: 'verified',
    freshNote: 'No adverse records found.',
  },
  {
    key: 'nfisBapCheck',
    label: 'NFIS/BAP Check',
    tabs: ['creditInvestigation'],
    subgroup: 'loanCreditChecking',
    required: true,
    freshStatus: 'verified',
    freshNote: 'No adverse records found.',
  },
  // Credit Investigation · Loan Requirements
  {
    key: 'bankAuthForm',
    label: 'Bank Authorization Form (signed)',
    tabs: ['creditInvestigation'],
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Signature present, but date field appears blank.',
  },
  {
    key: 'poeaContract',
    label: 'POEA Contract',
    tabs: ['creditInvestigation', 'financialEvaluation'],
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Employer & contract period extracted.',
  },
  {
    key: 'workingVisa',
    label: 'Working Visa',
    tabs: ['creditInvestigation', 'financialEvaluation'],
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Visa expires within 6 months — verify validity.',
  },
  {
    key: 'flightDetails',
    label: 'Flight Details',
    tabs: ['creditInvestigation'],
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Itinerary matches contract start date.',
  },
  {
    key: 'proofOfBilling',
    label: 'Proof of Billing',
    tabs: ['creditInvestigation', 'financialEvaluation'],
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'statementOfAccount',
    label: 'Statement of Account',
    tabs: ['creditInvestigation', 'appraisal', 'financialEvaluation'],
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'verified',
    freshNote: 'On file, no discrepancies found.',
  },
  {
    key: 'primaryIdsMortgagor',
    label: 'Primary IDs of Mortgagor with 3 specimen signature',
    tabs: ['creditInvestigation', 'appraisal'],
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'primaryIdsSpouse',
    label: 'Primary IDs of Spouse with 3 specimen signature',
    tabs: ['creditInvestigation'],
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'primaryIdsBorrowers',
    label: 'Primary IDs Borrowers with 3 specimen signature',
    tabs: ['creditInvestigation'],
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'additionalOtherDocuments',
    label: 'Additional/Other Documents',
    tabs: ['creditInvestigation', 'appraisal', 'financialEvaluation'],
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Reviewed, no issues found.',
  },
  {
    key: 'tinPrimaryId',
    label: 'TIN – Primary ID(Principal/consumer)',
    tabs: ['creditInvestigation'],
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'verified',
    freshNote: '2 attachments · TIN format valid.',
  },
  // Appraisal
  {
    key: 'tctCctCopy',
    label: 'Photocopy of TCT/CCT (all pages)',
    tabs: ['appraisal'],
    required: true,
    freshStatus: 'verified',
    freshNote: 'All pages present and legible.',
  },
  {
    key: 'taxDeclarationCopy',
    label: 'Photocopy of Tax Declaration',
    tabs: ['appraisal'],
    required: true,
    freshStatus: 'verified',
    freshNote: 'Declared value matches TCT/CCT.',
  },
  {
    key: 'realtyTaxReceipt',
    label: 'Photocopy of realty tax payment',
    tabs: ['appraisal'],
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Receipt is from prior year — confirm current.',
  },
  {
    key: 'lotFloorPlan',
    label: 'Lot Plan/Floor Plan',
    tabs: ['appraisal'],
    required: true,
    freshStatus: 'verified',
    freshNote: 'Plan matches declared lot area.',
  },
  {
    key: 'taxMappingAuthorization',
    label: 'Tax Mapping Authorization',
    tabs: ['appraisal'],
    required: true,
    freshStatus: 'verified',
    freshNote: 'Signed and dated correctly.',
  },
  // Financial Evaluation
  {
    key: 'sixMonthsBankStatement',
    label: '6 months Bank Statement of Main Depository Bank',
    tabs: ['financialEvaluation'],
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 5 months detected — 1 statement may be missing.',
  },
  {
    key: 'certificateOfEmployment',
    label: 'Certificate of Employment indicating status, service tenure and compensation breakdown',
    tabs: ['financialEvaluation'],
    required: true,
    freshStatus: 'verified',
    freshNote: 'Monthly income extracted: ₱142,000.',
  },
  {
    key: 'incomeTaxReturn',
    label: 'Individual Income Tax Return (2316)',
    tabs: ['financialEvaluation'],
    required: false,
    freshStatus: 'verified',
    freshNote: 'Filed amount consistent with stated income.',
  },
  {
    key: 'twoMonthsPayslip',
    label: 'Latest two (2) months payslip/Proof of Income',
    tabs: ['financialEvaluation'],
    required: false,
    freshStatus: 'verified',
    freshNote: 'Both payslips present and legible.',
  },
  {
    key: 'twoGovIdsSpecimen',
    label: 'Photocopy of two (2) government issued IDs, with three specimen signatures',
    tabs: ['financialEvaluation'],
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
];
