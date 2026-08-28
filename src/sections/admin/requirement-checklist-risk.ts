// src/sections/admin/requirement-checklist-risk.ts

// ----------------------------------------------------------------------
// Derives the Requirement Checklist screen's "AI review, summary &
// recommendation" content — pure computation from the current documents
// array + application financial info, never stored (same pattern as
// initial-credit-checking-risk.ts's buildInitialCreditCheckingResult).
// ----------------------------------------------------------------------

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta, AppraisalDocMeta } from './requirement-checklist-docs';

export type RequirementChecklistRiskLevel = 'good' | 'watch' | 'high';

// `appraisalDocs`/`appraisalDocMeta` cover every TCT/property group's
// documents flattened together — the AI summary/recommendation treats them
// exactly like the fixed Credit Investigation/Financial Evaluation documents
// for counting purposes (a missing document in any group is still a missing
// document). `hasAppraisalGroups` requires at least one group before calling
// the checklist "good"/ready — see requirement-checklist-view.tsx's "at
// least one complete TCT group is always required" gating — UNLESS
// `appraisalNotApplicable` is true, in which case Appraisal is excluded from
// every count entirely (no missing-property penalty, no appraisal
// documents counted, no outstanding-property note): the officer has
// declared this application has no real-estate collateral at all.
export function buildRequirementChecklistSummary(
  documents: RequirementDoc[],
  docMeta: RequirementDocMeta[],
  monthlyIncome: number,
  desiredLoanAmount: number,
  appraisalDocs: RequirementDoc[],
  appraisalDocMeta: AppraisalDocMeta[],
  hasAppraisalGroups: boolean,
  appraisalNotApplicable: boolean
): { level: RequirementChecklistRiskLevel; summary: string; recommendation: string } {
  const metaByKey = new Map(docMeta.map((meta) => [meta.key, meta]));
  const effectiveAppraisalDocs = appraisalNotApplicable ? [] : appraisalDocs;
  const allDocs = [...documents, ...effectiveAppraisalDocs];
  const requiredDocs = [
    ...documents.filter((doc) => metaByKey.get(doc.key)?.required),
    ...(hasAppraisalGroups && !appraisalNotApplicable
      ? effectiveAppraisalDocs.filter(
          (doc) => appraisalDocMeta.find((meta) => meta.key === doc.key)?.required
        )
      : []),
  ];

  const verifiedCount = allDocs.filter((doc) => doc.status === 'verified').length;
  const needsReviewCount = allDocs.filter((doc) => doc.status === 'needs-review').length;
  const missingCount = allDocs.filter((doc) => doc.status === 'missing').length;
  const missingRequiredCount =
    requiredDocs.filter((doc) => doc.status === 'missing').length +
    (appraisalNotApplicable || hasAppraisalGroups ? 0 : 1);

  const summary = `${allDocs.length - missingCount} of ${allDocs.length} documents are on file. AI verified ${verifiedCount} document(s), flagged ${needsReviewCount} for review, and found ${missingCount} still missing. Extracted monthly income (₱${monthlyIncome.toLocaleString()}) is consistent with the ₱${desiredLoanAmount.toLocaleString()} loan request.`;

  const outstandingFixedLabels = documents
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => metaByKey.get(doc.key)?.label)
    .filter((label): label is string => !!label);
  const outstandingAppraisalLabels = effectiveAppraisalDocs
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => appraisalDocMeta.find((meta) => meta.key === doc.key)?.label)
    .filter((label): label is string => !!label);
  const outstanding = [...outstandingFixedLabels, ...outstandingAppraisalLabels];
  const noPropertyNote =
    appraisalNotApplicable || hasAppraisalGroups ? [] : ['at least one property (TCT/CCT group)'];
  const allOutstanding = [...outstanding, ...noPropertyNote];

  if (missingRequiredCount > 0 || needsReviewCount > 0) {
    const level: RequirementChecklistRiskLevel = missingRequiredCount > 0 ? 'high' : 'watch';
    const recommendation =
      allOutstanding.length > 0
        ? `Clear the ${allOutstanding.length} outstanding item(s) — ${allOutstanding.join(', ')} — before endorsing to the next step.`
        : 'Resolve the outstanding items above before endorsing to the next step.';
    return { level, summary, recommendation };
  }

  return {
    level: 'good',
    summary,
    recommendation: 'All required documents are on file and verified. Ready to endorse.',
  };
}
