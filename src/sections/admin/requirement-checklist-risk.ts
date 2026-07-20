// src/sections/admin/requirement-checklist-risk.ts

// ----------------------------------------------------------------------
// Derives the Requirement Checklist screen's "AI review, summary &
// recommendation" content — pure computation from the current documents
// array + application financial info, never stored (same pattern as
// initial-credit-checking-risk.ts's buildInitialAiRecommendation).
// ----------------------------------------------------------------------

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta } from './requirement-checklist-docs';

export type RequirementChecklistRiskLevel = 'good' | 'watch' | 'high';

export function buildRequirementChecklistSummary(
  documents: RequirementDoc[],
  docMeta: RequirementDocMeta[],
  monthlyIncome: number,
  desiredLoanAmount: number
): { level: RequirementChecklistRiskLevel; summary: string; recommendation: string } {
  const metaByKey = new Map(docMeta.map((meta) => [meta.key, meta]));
  const requiredDocs = documents.filter((doc) => metaByKey.get(doc.key)?.required);

  const verifiedCount = documents.filter((doc) => doc.status === 'verified').length;
  const needsReviewCount = documents.filter((doc) => doc.status === 'needs-review').length;
  const missingCount = documents.filter((doc) => doc.status === 'missing').length;
  const missingRequiredCount = requiredDocs.filter((doc) => doc.status === 'missing').length;

  const summary = `${documents.length - missingCount} of ${documents.length} documents are on file. AI verified ${verifiedCount} document(s), flagged ${needsReviewCount} for review, and found ${missingCount} still missing. Extracted monthly income (₱${monthlyIncome.toLocaleString()}) is consistent with the ₱${desiredLoanAmount.toLocaleString()} loan request.`;

  const outstanding = documents
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => metaByKey.get(doc.key)?.label)
    .filter((label): label is string => !!label);

  if (missingRequiredCount > 0 || needsReviewCount > 0) {
    const level: RequirementChecklistRiskLevel = missingRequiredCount > 0 ? 'high' : 'watch';
    const recommendation =
      outstanding.length > 0
        ? `Clear the ${outstanding.length} outstanding item(s) — ${outstanding.join(', ')} — before endorsing to the next step.`
        : 'Resolve the outstanding items above before endorsing to the next step.';
    return { level, summary, recommendation };
  }

  return {
    level: 'good',
    summary,
    recommendation: 'All required documents are on file and verified. Ready to endorse.',
  };
}
