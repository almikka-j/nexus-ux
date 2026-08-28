// src/sections/admin/financial-evaluation-docs.ts

// ----------------------------------------------------------------------
// Static content for Financial Evaluation's Document Checklist — the fixed
// document list, its required-ness, and the canned AI note it gets the
// first time a file is uploaded for it. Kept separate from
// admin-context.tsx's RequirementChecklist state (per-application,
// persisted) the same way initial-credit-checking-risk.ts is kept separate
// from CreditChecking state: this is fixed content, not per-application
// data.
//
// Split out from the former shared requirement-checklist-docs.ts so
// Financial Evaluation's document set is its own independent list in code,
// not filtered out of a combined array shared with Credit Investigation —
// see credit-investigation-docs.ts for that counterpart. Documents with the
// same label in both (Working Visa, Proof of Billing, etc.) intentionally
// use separate keys in separate files; each visible upload row owns
// independent state.
//
// Unlike Credit Investigation's Document Checklist, Financial Evaluation's
// documents render as one flat list — no nested subgroup.
//
// The document set does NOT vary by employment status, loan type, or any
// other application field — every application shows the same document list.
// ----------------------------------------------------------------------

import type { RequirementDocMeta } from './credit-investigation-docs';

export const FINANCIAL_EVALUATION_DOC_META: RequirementDocMeta[] = [
  {
    key: 'poeaContractFinancial',
    label: 'POEA Contract',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Employer & contract period extracted.',
  },
  {
    key: 'workingVisaFinancial',
    label: 'Working Visa',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Visa expires within 6 months — verify validity.',
  },
  {
    key: 'proofOfBillingFinancial',
    label: 'Proof of Billing',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'statementOfAccountFinancial',
    label: 'Statement of Account',
    required: false,
    freshStatus: 'verified',
    freshNote: 'On file, no discrepancies found.',
  },
  {
    key: 'additionalOtherDocumentsFinancial',
    label: 'Additional/Other Documents',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Reviewed, no issues found.',
  },
  {
    key: 'sixMonthsBankStatement',
    label: '6 months Bank Statement of Main Depository Bank',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 5 months detected — 1 statement may be missing.',
  },
  {
    key: 'certificateOfEmployment',
    label: 'Certificate of Employment indicating status, service tenure and compensation breakdown',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Monthly income extracted: ₱142,000.',
  },
  {
    key: 'incomeTaxReturn',
    label: 'Individual Income Tax Return (2316)',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Filed amount consistent with stated income.',
  },
  {
    key: 'twoMonthsPayslip',
    label: 'Latest two (2) months payslip/Proof of Income',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Both payslips present and legible.',
  },
  {
    key: 'twoGovIdsSpecimen',
    label: 'Photocopy of two (2) government issued IDs, with three specimen signatures',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
];
