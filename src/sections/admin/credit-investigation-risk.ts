// src/sections/admin/credit-investigation-risk.ts

// ----------------------------------------------------------------------
// Derives the Credit Investigation screen's "AI review, summary &
// recommendation" content — pure computation from the current documents
// array, never stored (same pattern as requirement-checklist-risk.ts's
// buildRequirementChecklistSummary).
// ----------------------------------------------------------------------

import type { CreditInvestigationDoc } from 'src/auth/admin-context';
import type { CreditInvestigationDocMeta } from './credit-investigation-docs';

export type CreditInvestigationRiskLevel = 'good' | 'watch' | 'high';

export function buildCreditInvestigationSummary(
  documents: CreditInvestigationDoc[],
  docMeta: CreditInvestigationDocMeta[],
  bureauChecksComplete: boolean
): { level: CreditInvestigationRiskLevel; summary: string; recommendation: string } {
  const metaByKey = new Map(docMeta.map((meta) => [meta.key, meta]));
  const fixedDocs = documents.filter((doc) => !doc.isCustom);
  const requiredDocs = fixedDocs.filter((doc) => metaByKey.get(doc.key)?.required);

  // Only the fixed (non-custom) document list participates in the AI card's
  // completeness math — this must match `allFixedReceived` in
  // credit-investigation-view.tsx, which only checks the fixed metadata list
  // when deciding the "Fill with Sample Data"/"Remove Sample Data" page
  // action label. Officer-added custom documents still render as their own
  // checklist rows, but never affect this summary/recommendation/level.
  const verifiedCount = fixedDocs.filter((doc) => doc.status === 'verified').length;
  const needsReviewCount = fixedDocs.filter((doc) => doc.status === 'needs-review').length;
  const missingCount = fixedDocs.filter((doc) => doc.status === 'missing').length;
  const missingRequiredCount = requiredDocs.filter((doc) => doc.status === 'missing').length;

  const summary = `${fixedDocs.length - missingCount} of ${fixedDocs.length} documents are on file. AI verified ${verifiedCount} document(s), flagged ${needsReviewCount} for review, and found ${missingCount} still missing. ${bureauChecksComplete ? 'Bureau & verification checks (CIC/CMAP/NFIS-BAP) are on file from Requirement Checklist.' : 'One or more Bureau & Verification checks are still missing from Requirement Checklist.'}`;

  const outstandingLabels = fixedDocs
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => doc.label ?? metaByKey.get(doc.key)?.label)
    .filter((label): label is string => !!label);
  const bureauNote = bureauChecksComplete ? [] : ['Bureau & Verification checks'];
  const allOutstanding = [...outstandingLabels, ...bureauNote];

  // Bureau checks (CIC/CMAP/NFIS-BAP) are owned and fixed one step earlier,
  // in Requirement Checklist — this page can only read their status, never
  // fix it. So an incomplete bureau check alone must never force 'high'
  // ("Not ready"), since the officer would have no in-page action able to
  // ever clear that red state. Only a missing REQUIRED fixed document (one
  // this page's officer actually can act on) produces 'high'.
  if (missingRequiredCount > 0) {
    const recommendation =
      allOutstanding.length > 0
        ? `Clear the ${allOutstanding.length} outstanding item(s) — ${allOutstanding.join(', ')} — before proceeding.`
        : 'Resolve the outstanding items above before proceeding.';
    return { level: 'high', summary, recommendation };
  }

  if (needsReviewCount > 0 || !bureauChecksComplete) {
    const onlyBureauGapOutstanding = needsReviewCount === 0 && !bureauChecksComplete;
    const recommendation = onlyBureauGapOutstanding
      ? 'Bureau & Verification checks are still incomplete — return to Requirement Checklist to finish them before proceeding.'
      : allOutstanding.length > 0
        ? `Clear the ${allOutstanding.length} outstanding item(s) — ${allOutstanding.join(', ')} — before proceeding.`
        : 'Resolve the outstanding items above before proceeding.';
    return { level: 'watch', summary, recommendation };
  }

  return {
    level: 'good',
    summary,
    recommendation: 'All required documents are on file and verified. Ready to proceed with the CI Report.',
  };
}
