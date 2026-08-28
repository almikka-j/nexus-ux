import { Iconify } from 'src/components/iconify';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

// "Application" groups every forward-moving intake/review step under one
// section: Account Solicitation (Initial Credit Checking, Call Report,
// Requirement Checklist, unfiltered — see ApplicationListView's
// `accountSolicitation` prop) alongside the Comprehensive Credit Checking
// disciplines, which are a parallel-work stage — Credit Investigation,
// Appraisal, and Financial Evaluation each have their own queue so they can
// later be assigned to and completed by different officers.
//
// Reconsideration is deliberately NOT included — being sent to
// Reconsideration means the application was already rejected at Initial
// Credit Checking, so it isn't a forward step in "the process." It lives
// under the separate "For Reconsideration" section below instead, alongside
// the Negative List it can feed into.
export const applicationItems = [
  { title: 'Account Solicitation', step: null, path: paths.admin.accountSolicitation },
  {
    title: 'Credit Investigation',
    step: 'creditInvestigation',
    path: paths.admin.applicationsByStep('creditInvestigation'),
  },
  {
    title: 'Appraisal',
    step: 'appraisal',
    path: paths.admin.applicationsByStep('appraisal'),
  },
  {
    title: 'Financial Evaluation',
    step: 'financialEvaluation',
    path: paths.admin.applicationsByStep('financialEvaluation'),
  },
];

// Rejected-track items: applications sent to Reconsideration after being
// turned down at Initial Credit Checking, and the Negative List that
// Reconsideration's "No — Notify Client" outcome feeds into. Grouped
// separately from the main forward-moving process above.
export const reconsiderationTrackItems = [
  { title: 'Reconsideration', step: 'reconsideration', path: paths.admin.applicationsByStep('reconsideration') },
  { title: 'Negative List', step: null, path: paths.admin.negativeList },
];

// Request-role screens: each is a dedicated queue for one specific
// role/decision in the appraisal (and CI Fee) request flow — the
// Appraiser's own "My Assignments" workspace, then the two Approver
// decision queues (Appraisal Fee, then Appraisal Report) — not a step in
// the main forward-moving pipeline above. Grouped together the same way
// "For Reconsideration" groups the rejected-track screens, under the
// "Request" nav label (was "Approval" — renamed since this group now also
// contains the Appraiser's own workspace, not just approve/decline
// queues). None of these are filtered by `step` (that's
// `application-list-view.tsx`'s ?step= mechanism); each has its own
// dedicated view/route with its own row-filtering logic, so `step: null`
// throughout, same as "Negative List" above.
export const approvalItems = [
  { title: 'CI Fee Approval', step: null, path: paths.admin.ciFeeApproval },
  { title: 'Appraiser', step: null, path: paths.admin.appraisalAppraiser },
  { title: 'Appraisal - Approver Fee', step: null, path: paths.admin.appraisalFeeApproval },
  { title: 'Appraisal - Approver Report', step: null, path: paths.admin.appraisalApprover },
];

export const adminNavData = [
  {
    title: 'Dashboard',
    path: paths.admin.dashboard,
    icon: <Iconify width={24} icon="solar:widget-2-bold-duotone" />,
  },
  {
    title: 'Application',
    path: null,
    icon: <Iconify width={24} icon="solar:document-text-bold-duotone" />,
    children: applicationItems,
  },
  {
    title: 'For Reconsideration',
    // Also a non-clickable section label, same pattern as "Application List".
    path: null,
    icon: <Iconify width={24} icon="solar:shield-cross-bold-duotone" />,
    children: reconsiderationTrackItems,
  },
  {
    title: 'Request',
    path: null,
    icon: <Iconify width={24} icon="solar:wallet-money-bold-duotone" />,
    children: approvalItems,
  },
];

// Resolve both list filters and per-application review routes to the same
// canonical step key. This keeps navigation state stable while moving between
// a filtered queue and an applicant's actual process page.
export function getAdminReviewStep(pathname: string, searchStep: string | null) {
  if (pathname === paths.admin.applications) {
    return searchStep ?? 'creditChecking';
  }

  const routeStep = pathname.match(
    /^\/admin\/applications\/[^/]+\/(credit-checking|reconsideration|call-report|requirement-checklist|credit-investigation)$/
  )?.[1];

  return {
    'credit-checking': 'creditChecking',
    reconsideration: 'reconsideration',
    'call-report': 'callReport',
    'requirement-checklist': 'requirementChecklist',
    'credit-investigation': 'creditInvestigation',
  }[routeStep ?? ''] ?? null;
}

export function isAdminNavChildActive(
  child:
    | (typeof applicationItems)[number]
    | (typeof reconsiderationTrackItems)[number]
    | (typeof approvalItems)[number],
  pathname: string,
  searchStep: string | null
) {
  if (child.step === null) return pathname === child.path.split('?')[0];
  return getAdminReviewStep(pathname, searchStep) === child.step;
}

export function isAdminNavSectionActive(
  item: (typeof adminNavData)[number],
  pathname: string,
  searchStep: string | null
) {
  return !!item.children?.some((child) =>
    isAdminNavChildActive(child, pathname, searchStep)
  );
}
