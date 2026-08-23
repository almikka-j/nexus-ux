// ----------------------------------------------------------------------
// NOTE: Trimmed down from the source project's routes/paths.ts, which
// also carried `paths.dashboard.*`, `paths.auth.*`, `paths.authDemo.*`,
// `paths.product.*`, `paths.post.*` etc. tied to the full dashboard/auth
// app. Nothing under `layouts/main`, `layouts/config-nav-main.tsx`, or
// `sections/home` currently imports from this file at all — they link
// with raw string literals (e.g. `href="/about-us"`) — but the export
// shape is kept identical (`export const paths = {...}`) so future
// callers can adopt it without churn, pruned to the marketing routes
// that actually exist/are linked to today.
// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  about: '/about-us',
  contact: '/contact',
  esg: '/esg',
  faqs: '/faq',
  faqDetails: (id: string) => `/faq/${id}`,
  faqSearchResult: '/faq/search-result',
  news: '/news',
  newsDetails: (id: string) => `/news/${id}`,
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  privacyPolicy: '/privacy-policy',
  internetPolicy: '/internet-policy',
  corporateGovernancePolicy: '/corporate-governance-policy',
  terms: '/terms',
  propertyForSale: '/property-forsale',
  loan: {
    personal: '/personal-loan',
    housing: '/housing-loan',
    business: '/business-loan',
    fast: '/fast-loan',
    clubshare: '/clubshare-loan',
    sanglaTitulo: '/sangla-titulo',
  },
  auth: {
    login: '/auth/login',
    signUp: '/auth/sign-up',
    verify: '/auth/verify',
    onboarding: '/auth/onboarding',
    thankYou: '/auth/thank-you',
  },
  borrower: {
    dashboard: '/borrower/dashboard',
    apply: '/borrower/apply',
  },
  admin: {
    login: '/admin/login',
    dashboard: '/admin/dashboard',
    // The Application List is no longer its own page — its listing now lives on
    // the Initial Credit Checking landing view (step 1), since every application
    // starts there. `applications` is kept as the canonical "go see the list"
    // link name for callers, but it now points at that same URL. Lives at
    // /admin/credit-checking (not under /admin/applications/) to avoid colliding
    // with the per-applicant /admin/applications/[id]/credit-checking route.
    applications: '/admin/credit-checking',
    applicationsByStep: (step: string) => `/admin/credit-checking?step=${step}`,
    // Account Solicitation groups the three forward-moving intake steps
    // (Initial Credit Checking, Call Report, Requirement Checklist) into one
    // unfiltered list, replacing what used to be the expandable "Application
    // List" nav section with its 3 separate sub-items.
    accountSolicitation: '/admin/account-solicitation',
    // Read-only "who is this borrower and where are they in the process"
    // profile — works for both the live application and any sample row
    // (see ApplicantProfileView). Was `sampleApplication`/`/sample/` before
    // being generalized past sample-only rows.
    applicantProfile: (email: string) => `/admin/applications/profile/${email}`,
    negativeList: '/admin/negative-list',
    ciFeeApproval: '/admin/ci-fee-approval',
    appraisalAppraiser: '/admin/appraisal-appraiser',
    appraisalAppraiserBundle: (bundleId: string) => `/admin/appraisal-appraiser/${bundleId}`,
    appraisalFeeApproval: '/admin/appraisal-fee-approval',
    // There's no real per-application backend in this prototype — one live
    // session always means one live fee-approval request, so there's no
    // real bundle/request ID to route on. Uses a fixed placeholder segment
    // rather than an actual ID purely to keep this page's URL shape
    // consistent with appraisalAppraiserBundle's own list -> detail split.
    appraisalFeeApprovalBundle: () => '/admin/appraisal-fee-approval/current',
    appraisalApprover: '/admin/appraisal-approver',
    // Same fixed-placeholder-segment convention as appraisalFeeApprovalBundle
    // — no real multi-application backend, so there's no real request ID to
    // route on; this only keeps the URL shape consistent with the
    // appraisalAppraiserBundle/appraisalFeeApprovalBundle list -> detail split.
    appraisalApproverBundle: () => '/admin/appraisal-approver/current',
    creditChecking: (id: string) => `/admin/applications/${id}/credit-checking`,
    reconsideration: (id: string) => `/admin/applications/${id}/reconsideration`,
    callReport: (id: string) => `/admin/applications/${id}/call-report`,
    requirementChecklist: (id: string) => `/admin/applications/${id}/requirement-checklist`,
    creditInvestigation: (id: string) => `/admin/applications/${id}/credit-investigation`,
    appraisal: (id: string) => `/admin/applications/${id}/appraisal`,
    creditScoring: (id: string) => `/admin/applications/${id}/credit-scoring`,
  },
};
