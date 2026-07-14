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
    sampleApplication: (email: string) => `/admin/applications/sample/${email}`,
    negativeList: '/admin/negative-list',
    creditChecking: (id: string) => `/admin/applications/${id}/credit-checking`,
    reconsideration: (id: string) => `/admin/applications/${id}/reconsideration`,
    callReport: (id: string) => `/admin/applications/${id}/call-report`,
    transactionType: (id: string) => `/admin/applications/${id}/transaction-type`,
    requirementChecklist: (id: string) => `/admin/applications/${id}/requirement-checklist`,
  },
};
