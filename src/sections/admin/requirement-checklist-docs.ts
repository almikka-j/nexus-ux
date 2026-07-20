// src/sections/admin/requirement-checklist-docs.ts

// ----------------------------------------------------------------------
// Static content for the Requirement Checklist screen — the fixed
// 16-document/3-category list, each document's required-ness, and the
// canned AI note it gets the first time a file is uploaded for it. Kept
// separate from admin-context.tsx's RequirementChecklist state (per-
// application, persisted) the same way initial-credit-checking-risk.ts is
// kept separate from CreditChecking state: this is fixed content, not
// per-application data.
//
// The document set does NOT vary by employment status, loan type, or any
// other application field — every application shows the same 16 documents,
// by explicit design decision (see docs/superpowers/specs/
// 2026-07-20-requirement-checklist-rebuild-design.md "Non-goals").
// ----------------------------------------------------------------------

export type RequirementDocCategory = 'loan' | 'financial' | 'appraisal';

export type RequirementDocStatus = 'verified' | 'needs-review' | 'missing';

export type RequirementDocMeta = {
  key: string;
  label: string;
  category: RequirementDocCategory;
  required: boolean;
  // Status/note assigned the first time a file is uploaded for this
  // document while it's 'missing' — deterministic per document key, never
  // randomized (see design spec's "AI note generation" decision).
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};

export const REQUIREMENT_CATEGORY_LABELS: Record<RequirementDocCategory, string> = {
  loan: 'Loan Requirements',
  financial: 'Financial Documents',
  appraisal: 'Appraisal Documents',
};

export const REQUIREMENT_DOC_META: RequirementDocMeta[] = [
  // Loan Requirements
  {
    key: 'bankAuthForm',
    label: 'Bank Authorization Form (signed)',
    category: 'loan',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Signature present, but date field appears blank.',
  },
  {
    key: 'poeaContract',
    label: 'POEA Contract',
    category: 'loan',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Employer & contract period extracted.',
  },
  {
    key: 'workingVisa',
    label: 'Working Visa',
    category: 'loan',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Visa expires within 6 months — verify validity.',
  },
  {
    key: 'proofOfBilling',
    label: 'Proof of Billing',
    category: 'loan',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'primaryIdsSpecimenSignatures',
    label: 'Primary IDs w/ 3 specimen signatures',
    category: 'loan',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'tinPrimaryId',
    label: 'TIN — Primary ID',
    category: 'loan',
    required: true,
    freshStatus: 'verified',
    freshNote: '2 attachments · TIN format valid.',
  },
  {
    key: 'statementOfAccount',
    label: 'Statement of Account',
    category: 'loan',
    required: false,
    freshStatus: 'verified',
    freshNote: 'On file, no discrepancies found.',
  },
  // Financial Documents
  {
    key: 'certificateOfEmployment',
    label: 'Certificate of Employment',
    category: 'financial',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Monthly income extracted: ₱142,000.',
  },
  {
    key: 'sixMonthsBankStatement',
    label: '6 months Bank Statement',
    category: 'financial',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 5 months detected — 1 statement may be missing.',
  },
  {
    key: 'twoMonthsPayslip',
    label: 'Latest 2 months payslip',
    category: 'financial',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Both payslips present and legible.',
  },
  {
    key: 'incomeTaxReturn',
    label: 'Income Tax Return (2316)',
    category: 'financial',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Filed amount consistent with stated income.',
  },
  // Appraisal Documents
  {
    key: 'tctCctCopy',
    label: 'Photocopy of TCT / CCT (all pages)',
    category: 'appraisal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'All 4 pages present and legible.',
  },
  {
    key: 'taxDeclarationCopy',
    label: 'Photocopy of Tax Declaration',
    category: 'appraisal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Declared value matches TCT/CCT.',
  },
  {
    key: 'realtyTaxReceipt',
    label: 'Realty tax payment receipt',
    category: 'appraisal',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Receipt is from prior year — confirm current.',
  },
  {
    key: 'lotFloorPlan',
    label: 'Lot Plan / Floor Plan',
    category: 'appraisal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Plan matches declared lot area.',
  },
  {
    key: 'taxMappingAuthorization',
    label: 'Tax Mapping Authorization',
    category: 'appraisal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Signed and dated correctly.',
  },
];
