// src/sections/admin/requirement-checklist-docs.ts

// ----------------------------------------------------------------------
// Static content for the Requirement Checklist screen — the fixed document
// list, grouped into 3 cards (Credit Investigation / Appraisal / Financial
// Evaluation, all rendered at once — not tabs), plus each card's tab label.
// Kept separate from admin-context.tsx's RequirementChecklist state
// (per-application, persisted) the same way initial-credit-checking-risk.ts
// is kept separate from CreditChecking state: this is fixed content, not
// per-application data.
//
// Credit Investigation's and Financial Evaluation's document lists live in
// their own files — credit-investigation-docs.ts and
// financial-evaluation-docs.ts — as fully independent arrays, not filtered
// out of one shared array here. REQUIREMENT_DOC_META below is only the
// combination of those two, for the few consumers (this screen's own
// generic by-key lookups, and admin-context.tsx seeding
// review.requirementChecklist.documents) that genuinely need every
// Document Checklist entry regardless of which card it belongs to, since
// per-application document state is one flat array covering both cards.
// Documents with the same label in Credit Investigation and Financial
// Evaluation intentionally use separate keys in separate files. Each
// visible upload row owns independent state, so uploading/removing a file
// in one process card never changes the similarly named row in another
// card.
//
// Appraisal is NOT part of this shared-doc model — see
// APPRAISAL_DOC_META below. A borrower can pledge more than one property as
// collateral, each with its own TCT/CCT number and its own independent copy
// of the appraisal document set (including its own Statement of Account /
// Primary IDs of Mortgagor / Additional Documents, decoupled from Credit
// Investigation's and Financial Evaluation's copies of those same-named
// documents) — so appraisal documents are generated fresh per TCT group
// (`AppraisalTctGroup` in admin-context.tsx) rather than living as fixed
// entries here.
// ----------------------------------------------------------------------

import {
  CREDIT_INVESTIGATION_DOC_META,
  type RequirementDocMeta,
} from './credit-investigation-docs';
import { FINANCIAL_EVALUATION_DOC_META } from './financial-evaluation-docs';

export type { RequirementDocStatus, RequirementDocMeta, RequirementDocSubgroup } from './credit-investigation-docs';
export {
  REQUIREMENT_SUBGROUP_LABELS,
  REQUIREMENT_SUBGROUP_ORDER,
  CREDIT_INVESTIGATION_DOC_META,
} from './credit-investigation-docs';
export { FINANCIAL_EVALUATION_DOC_META } from './financial-evaluation-docs';

export type RequirementDocTab = 'creditInvestigation' | 'financialEvaluation';

export const REQUIREMENT_TAB_LABELS: Record<RequirementDocTab, string> = {
  creditInvestigation: 'Credit Investigation',
  financialEvaluation: 'Financial Evaluation',
};

export const REQUIREMENT_TAB_ORDER: RequirementDocTab[] = [
  'creditInvestigation',
  'financialEvaluation',
];

// Combination of Credit Investigation's and Financial Evaluation's own
// independent lists — see the file-header note above for why this still
// exists despite the two cards no longer sharing one source array.
export const REQUIREMENT_DOC_META: RequirementDocMeta[] = [
  ...CREDIT_INVESTIGATION_DOC_META,
  ...FINANCIAL_EVALUATION_DOC_META,
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
