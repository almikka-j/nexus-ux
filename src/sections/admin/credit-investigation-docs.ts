// src/sections/admin/credit-investigation-docs.ts

// ----------------------------------------------------------------------
// Static content for Credit Investigation's Document Checklist — the fixed
// document list, its required-ness, and the canned AI note it gets the
// first time a file is uploaded for it. Kept separate from
// admin-context.tsx's RequirementChecklist state (per-application,
// persisted) the same way initial-credit-checking-risk.ts is kept separate
// from CreditChecking state: this is fixed content, not per-application
// data.
//
// Split out from the former shared requirement-checklist-docs.ts so Credit
// Investigation's document set is its own independent list in code, not
// filtered out of a combined array shared with Financial Evaluation — see
// financial-evaluation-docs.ts for that counterpart. Documents with the
// same label in both (Working Visa, Proof of Billing, etc.) intentionally
// use separate keys in separate files; each visible upload row owns
// independent state.
//
// The document set does NOT vary by employment status, loan type, or any
// other application field — every application shows the same document list.
// ----------------------------------------------------------------------

export type RequirementDocStatus = 'verified' | 'needs-review' | 'missing';

// Credit Investigation's Document Checklist card is the only one with a
// further nested grouping (two named sub-sections); Financial Evaluation
// renders its documents as one flat list.
export type RequirementDocSubgroup = 'loanCreditChecking' | 'loanRequirements';

export type RequirementDocMeta = {
  key: string;
  label: string;
  subgroup?: RequirementDocSubgroup;
  required: boolean;
  // Status/note assigned the first time a file is uploaded for this
  // document while it's 'missing' — deterministic per document key, never
  // randomized (see design spec's "AI note generation" decision).
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};

export const REQUIREMENT_SUBGROUP_LABELS: Record<RequirementDocSubgroup, string> = {
  loanCreditChecking: 'Loan Credit Checking Documents',
  loanRequirements: 'Loan Requirements',
};

// This fixed order matches the two sub-groups' presentation order in the
// design reference (Loan Credit Checking Documents above Loan
// Requirements). Shared by requirement-checklist-view.tsx and
// credit-investigation-view.tsx, which displays the same documents
// read-only.
export const REQUIREMENT_SUBGROUP_ORDER: RequirementDocSubgroup[] = [
  'loanCreditChecking',
  'loanRequirements',
];

export const CREDIT_INVESTIGATION_DOC_META: RequirementDocMeta[] = [
  // Loan Credit Checking Documents
  {
    key: 'cicCheck',
    label: 'CIC Check',
    subgroup: 'loanCreditChecking',
    required: true,
    freshStatus: 'verified',
    freshNote: 'No adverse records found.',
  },
  {
    key: 'cmapCheck',
    label: 'CMAP Check',
    subgroup: 'loanCreditChecking',
    required: true,
    freshStatus: 'verified',
    freshNote: 'No adverse records found.',
  },
  {
    key: 'nfisBapCheck',
    label: 'NFIS/BAP Check',
    subgroup: 'loanCreditChecking',
    required: true,
    freshStatus: 'verified',
    freshNote: 'No adverse records found.',
  },
  // Loan Requirements
  {
    key: 'bankAuthForm',
    label: 'Bank Authorization Form (signed)',
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Signature present, but date field appears blank.',
  },
  {
    key: 'poeaContract',
    label: 'POEA Contract',
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Employer & contract period extracted.',
  },
  {
    key: 'workingVisa',
    label: 'Working Visa',
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Visa expires within 6 months — verify validity.',
  },
  {
    key: 'flightDetails',
    label: 'Flight Details',
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Itinerary matches contract start date.',
  },
  {
    key: 'proofOfBilling',
    label: 'Proof of Billing',
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'statementOfAccount',
    label: 'Statement of Account',
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'verified',
    freshNote: 'On file, no discrepancies found.',
  },
  {
    key: 'primaryIdsMortgagor',
    label: 'Primary IDs of Mortgagor with 3 specimen signature',
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'primaryIdsSpouse',
    label: 'Primary IDs of Spouse with 3 specimen signature',
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'primaryIdsBorrowers',
    label: 'Primary IDs Borrowers with 3 specimen signature',
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'additionalOtherDocuments',
    label: 'Additional/Other Documents',
    subgroup: 'loanRequirements',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Reviewed, no issues found.',
  },
  {
    key: 'tinPrimaryId',
    label: 'TIN – Primary ID(Principal/consumer)',
    subgroup: 'loanRequirements',
    required: true,
    freshStatus: 'verified',
    freshNote: '2 attachments · TIN format valid.',
  },
];
