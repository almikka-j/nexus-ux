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

  const verifiedCount = documents.filter((doc) => doc.status === 'verified').length;
  const needsReviewCount = documents.filter((doc) => doc.status === 'needs-review').length;
  const missingCount = documents.filter((doc) => doc.status === 'missing').length;
  const missingRequiredCount =
    requiredDocs.filter((doc) => doc.status === 'missing').length + (bureauChecksComplete ? 0 : 1);

  const summary = `${documents.length - missingCount} of ${documents.length} documents are on file. AI verified ${verifiedCount} document(s), flagged ${needsReviewCount} for review, and found ${missingCount} still missing. ${bureauChecksComplete ? 'Bureau & verification checks (CIC/CMAP/NFIS-BAP) are on file from Requirement Checklist.' : 'One or more Bureau & Verification checks are still missing from Requirement Checklist.'}`;

  const outstandingLabels = documents
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => doc.label ?? metaByKey.get(doc.key)?.label)
    .filter((label): label is string => !!label);
  const bureauNote = bureauChecksComplete ? [] : ['Bureau & Verification checks'];
  const allOutstanding = [...outstandingLabels, ...bureauNote];

  if (missingRequiredCount > 0 || needsReviewCount > 0) {
    const level: CreditInvestigationRiskLevel = missingRequiredCount > 0 ? 'high' : 'watch';
    const recommendation =
      allOutstanding.length > 0
        ? `Clear the ${allOutstanding.length} outstanding item(s) — ${allOutstanding.join(', ')} — before proceeding.`
        : 'Resolve the outstanding items above before proceeding.';
    return { level, summary, recommendation };
  }

  return {
    level: 'good',
    summary,
    recommendation: 'All required documents are on file and verified. Ready to proceed with the CI Report.',
  };
}
