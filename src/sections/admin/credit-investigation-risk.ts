// src/sections/admin/credit-investigation-risk.ts

// ----------------------------------------------------------------------
// Derives the Credit Investigation screen's "AI review, summary &
// recommendation" content — pure computation from the current documents
// array, never stored (same pattern as requirement-checklist-risk.ts's
// buildRequirementChecklistSummary).
//
// The fixed document list here is review.requirementChecklist.documents
// (filtered to the creditInvestigation tab) — this page displays that data
// read-only rather than owning a separate copy, so this summary reads the
// same source of truth Requirement Checklist does.
// ----------------------------------------------------------------------

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta } from './credit-investigation-docs';

export type CreditInvestigationRiskLevel = 'good' | 'watch' | 'high';

// The risk-level style map for this output lives in
// src/components/admin-ui/ai-review-tokens.ts as AI_REVIEW_RISK_STYLES
// (the 3-level document-readiness scale), shared by the AiReviewCard on
// Credit Investigation, Financial Evaluation, and Requirement Checklist.

export function buildCreditInvestigationSummary(
  fixedDocs: RequirementDoc[],
  docMeta: RequirementDocMeta[]
): { level: CreditInvestigationRiskLevel; summary: string; recommendation: string } {
  const metaByKey = new Map(docMeta.map((meta) => [meta.key, meta]));
  const requiredDocs = fixedDocs.filter((doc) => metaByKey.get(doc.key)?.required);

  const verifiedCount = fixedDocs.filter((doc) => doc.status === 'verified').length;
  const needsReviewCount = fixedDocs.filter((doc) => doc.status === 'needs-review').length;
  const missingCount = fixedDocs.filter((doc) => doc.status === 'missing').length;
  const missingRequiredCount = requiredDocs.filter((doc) => doc.status === 'missing').length;

  const summary = `${fixedDocs.length - missingCount} of ${fixedDocs.length} documents are on file, as recorded in Requirement Checklist. AI verified ${verifiedCount} document(s), flagged ${needsReviewCount} for review, and found ${missingCount} still missing.`;

  const outstandingLabels = fixedDocs
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => metaByKey.get(doc.key)?.label)
    .filter((label): label is string => !!label);

  // Every fixed document here is owned by Requirement Checklist, one step
  // earlier — this page can only view status, never fix it. So any
  // outstanding item can only ever produce 'watch', not 'high': there is no
  // in-page action able to clear a red state on a document this page
  // doesn't own.
  if (missingRequiredCount > 0 || needsReviewCount > 0) {
    const recommendation =
      outstandingLabels.length > 0
        ? `${outstandingLabels.length} outstanding item(s) — ${outstandingLabels.join(', ')} — are incomplete in Requirement Checklist. Return there to resolve them before proceeding.`
        : 'Return to Requirement Checklist to resolve the outstanding items above before proceeding.';
    return { level: 'watch', summary, recommendation };
  }

  return {
    level: 'good',
    summary,
    recommendation: 'All required documents are on file and verified. Ready to proceed with the CI Report.',
  };
}
