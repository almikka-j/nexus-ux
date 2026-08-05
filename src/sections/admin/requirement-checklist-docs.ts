// src/sections/admin/requirement-checklist-docs.ts

// ----------------------------------------------------------------------
// Static content for the Requirement Checklist screen — the fixed document
// list, grouped into 3 cards (Credit Investigation / Appraisal / Financial
// Evaluation, all rendered at once — not tabs), each document's
// required-ness, and the canned AI note it gets the first time a file is
// uploaded for it. Kept separate from admin-context.tsx's RequirementChecklist
// state (per-application, persisted) the same way
// initial-credit-checking-risk.ts is kept separate from CreditChecking state:
// this is fixed content, not per-application data.
//
// The document set does NOT vary by employment status, loan type, or any
// other application field — every application shows the same document list.
//
// Documents with the same label in Credit Investigation and Financial
// Evaluation intentionally use separate keys. Each visible upload row owns
// independent state, so uploading/removing a file in one process card never
// changes the similarly named row in another card.
//
// Appraisal is NOT part of this shared-doc model — see
// APPRAISAL_DOC_META below. A borrower can pledge more than one property as
// collateral, each with its own TCT/CCT number and its own independent copy
// of the appraisal document set (including its own Statement of Account /
// Primary IDs of Mortgagor / Additional Documents, decoupled from Credit
// Investigation's and Financial Evaluation's copies of those same-named
// documents) — so appraisal documents are generated fresh per TCT group
// (`AppraisalTctGroup` in admin-context.tsx) rather than living as fixed
// entries in REQUIREMENT_DOC_META.
// ----------------------------------------------------------------------

export type RequirementDocTab = 'creditInvestigation' | 'financialEvaluation';

// Credit Investigation is the only card with a further nested grouping (two
// named sub-sections). Financial Evaluation renders its documents as one
// flat list, so `subgroup` is only meaningful on Credit Investigation's
// entries — undefined elsewhere.
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
  financialEvaluation: 'Financial Evaluation',
};

export const REQUIREMENT_TAB_ORDER: RequirementDocTab[] = [
  'creditInvestigation',
  'financialEvaluation',
];

export const REQUIREMENT_SUBGROUP_LABELS: Record<RequirementDocSubgroup, string> = {
  loanCreditChecking: 'Loan Credit Checking Documents',
  loanRequirements: 'Loan Requirements',
};

// Credit Investigation is the only card with a further nested grouping —
// this fixed order matches the two sub-groups' presentation order in the
// design reference (Loan Credit Checking Documents above Loan
// Requirements). Shared by requirement-checklist-view.tsx and
// credit-investigation-view.tsx, which displays the same creditInvestigation
// tab documents read-only.
export const REQUIREMENT_SUBGROUP_ORDER: RequirementDocSubgroup[] = [
  'loanCreditChecking',
  'loanRequirements',
];

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
    tabs: ['creditInvestigation'],
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Employer & contract period extracted.',
  },
  {
    key: 'workingVisa',
    label: 'Working Visa',
    tabs: ['creditInvestigation'],
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
    tabs: ['creditInvestigation'],
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'statementOfAccount',
    label: 'Statement of Account',
    tabs: ['creditInvestigation'],
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'verified',
    freshNote: 'On file, no discrepancies found.',
  },
  {
    key: 'primaryIdsMortgagor',
    label: 'Primary IDs of Mortgagor with 3 specimen signature',
    tabs: ['creditInvestigation'],
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
    tabs: ['creditInvestigation'],
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
  // Financial Evaluation
  {
    key: 'poeaContractFinancial',
    label: 'POEA Contract',
    tabs: ['financialEvaluation'],
    required: false,
    freshStatus: 'verified',
    freshNote: 'Employer & contract period extracted.',
  },
  {
    key: 'workingVisaFinancial',
    label: 'Working Visa',
    tabs: ['financialEvaluation'],
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Visa expires within 6 months — verify validity.',
  },
  {
    key: 'proofOfBillingFinancial',
    label: 'Proof of Billing',
    tabs: ['financialEvaluation'],
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'statementOfAccountFinancial',
    label: 'Statement of Account',
    tabs: ['financialEvaluation'],
    required: false,
    freshStatus: 'verified',
    freshNote: 'On file, no discrepancies found.',
  },
  {
    key: 'additionalOtherDocumentsFinancial',
    label: 'Additional/Other Documents',
    tabs: ['financialEvaluation'],
    required: false,
    freshStatus: 'verified',
    freshNote: 'Reviewed, no issues found.',
  },
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

// ----------------------------------------------------------------------
// Appraisal — generated fresh per TCT/property group (AppraisalTctGroup in
// admin-context.tsx), not a fixed part of REQUIREMENT_DOC_META above. Every
// group gets its own independent copy of this same 8-document set (5
// required, 3 not) — including its own Statement of Account, Primary IDs of
// Mortgagor, and Additional/Other Documents, deliberately decoupled from
// Credit Investigation's/Financial Evaluation's same-named documents, since
// each property's paperwork is its own thing.
// ----------------------------------------------------------------------

export type AppraisalDocMeta = {
  key: string;
  label: string;
  required: boolean;
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};

export const APPRAISAL_DOC_META: AppraisalDocMeta[] = [
  {
    key: 'tctCctCopy',
    label: 'Photocopy of TCT/CCT (all pages)',
    required: true,
    freshStatus: 'verified',
    freshNote: 'All pages present and legible.',
  },
  {
    key: 'taxDeclarationCopy',
    label: 'Photocopy of Tax Declaration',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Declared value matches TCT/CCT.',
  },
  {
    key: 'realtyTaxReceipt',
    label: 'Photocopy of realty tax payment',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Receipt is from prior year — confirm current.',
  },
  {
    key: 'lotFloorPlan',
    label: 'Lot Plan/Floor Plan',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Plan matches declared lot area.',
  },
  {
    key: 'taxMappingAuthorization',
    label: 'Tax Mapping Authorization',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Signed and dated correctly.',
  },
  {
    key: 'appraisalStatementOfAccount',
    label: 'Statement of Account',
    required: false,
    freshStatus: 'verified',
    freshNote: 'On file, no discrepancies found.',
  },
  {
    key: 'appraisalPrimaryIdsMortgagor',
    label: 'Primary IDs of Mortgagor with 3 specimen signature',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'appraisalAdditionalOtherDocuments',
    label: 'Additional/Other Documents',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Reviewed, no issues found.',
  },
];
