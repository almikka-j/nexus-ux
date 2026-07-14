import { Iconify } from 'src/components/iconify';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

// Forward-moving review-step sub-items shown when "Application List" is
// expanded. Each links to the application list filtered to that step
// (?step=<reviewStep>) — since multiple applications can be sitting at any
// given step, the sidebar can't point at one specific applicant's page
// directly. Picking a row in the filtered list takes the admin into that
// specific applicant's review screen. Step 1 (Initial Credit Checking) has no
// query param since it's also the unfiltered landing view.
//
// Reconsideration is deliberately NOT included here — being sent to
// Reconsideration means the application was already rejected at Initial
// Credit Checking, so it isn't a forward step in "the process." It lives
// under the separate "For Reconsideration" section below instead, alongside
// the Negative List it can feed into.
export const applicationReviewSteps = [
  { title: 'Initial Credit Checking', step: 'creditChecking', path: paths.admin.applications },
  { title: 'Call Report', step: 'callReport', path: paths.admin.applicationsByStep('callReport') },
  { title: 'Transaction Type', step: 'transactionType', path: paths.admin.applicationsByStep('transactionType') },
  { title: 'Requirement Checklist', step: 'requirementChecklist', path: paths.admin.applicationsByStep('requirementChecklist') },
];

// Rejected-track items: applications sent to Reconsideration after being
// turned down at Initial Credit Checking, and the Negative List that
// Reconsideration's "No — Notify Client" outcome feeds into. Grouped
// separately from the main forward-moving process above.
export const reconsiderationTrackItems = [
  { title: 'Reconsideration', step: 'reconsideration', path: paths.admin.applicationsByStep('reconsideration') },
  { title: 'Negative List', step: null, path: paths.admin.negativeList },
];

export const adminNavData = [
  {
    title: 'Dashboard',
    path: paths.admin.dashboard,
    icon: <Iconify width={24} icon="solar:widget-2-bold-duotone" />,
  },
  {
    title: 'Application List',
    // No `path` — this is now a non-clickable section label. The list itself
    // lives on the Initial Credit Checking sub-item (step 1) below.
    path: null,
    icon: <Iconify width={24} icon="solar:document-text-bold-duotone" />,
    children: applicationReviewSteps,
  },
  {
    title: 'For Reconsideration',
    // Also a non-clickable section label, same pattern as "Application List".
    path: null,
    icon: <Iconify width={24} icon="solar:shield-cross-bold-duotone" />,
    children: reconsiderationTrackItems,
  },
];
