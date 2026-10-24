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
    appraisalAppraiser: '/admin/appraisal-appraiser',
    appraisalAppraiserBundle: (bundleId: string) => `/admin/appraisal-appraiser/${bundleId}`,
    // Officer-facing read-only status list of every appraiser assignment
    // (one row per AppraisalReportBundle) — distinct from
    // appraisalAppraiser above, which is the Appraiser's own workspace.
    // Assigning an appraiser still only happens via the Collateral titles
    // table's Assign Appraiser modal on the Appraisal step page; this page
    // never creates or edits a bundle, only lists them, so it links back
    // into the same appraisalAppraiserBundle detail route rather than
    // having its own.
    appraisalRequest: '/admin/appraisal-request',
    // Merged CI Fee Approval + Appraisal Fee Approval into one combined
    // list — see docs/155-request-fee-approvals.md. `kind` is a real
    // discriminator (same convention as `paymentDetail`), not a dummy
    // placeholder — there's still no real per-request ID in this
    // prototype (at most one row of each kind per session), but which of
    // the two fee types the detail page shows is meaningful.
    feeApprovals: '/admin/fee-approvals',
    // CI Fee has no bundle concept (one flat per-application request), so
    // its detail route takes no id. Appraisal Fee approval moved from one
    // whole-application batch status to one status PER bundle (see
    // docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md),
    // so its detail route now needs a real bundleId — the second
    // argument is required for 'appraisal-fee' and ignored for 'ci-fee'.
    feeApprovalsDetail: (kind: 'ci-fee' | 'appraisal-fee', bundleId?: string) =>
      kind === 'appraisal-fee' ? `/admin/fee-approvals/appraisal-fee/${bundleId}` : '/admin/fee-approvals/ci-fee',
    // Merged Call Report Approval + Appraisal Report (Head) Approval into
    // one combined list — see docs/165-request-report-approvals.md. `kind`
    // is a real discriminator (same convention as `feeApprovalsDetail`),
    // not a dummy placeholder — there's still no real per-request ID in
    // this prototype (at most one row of each kind per session), but which
    // of the two report types the detail page shows is meaningful.
    reportApprovals: '/admin/report-approvals',
    reportApprovalsDetail: (kind: 'call-report' | 'appraisal') => `/admin/report-approvals/${kind}`,
    // A single unified queue of every approved CI Fee / Appraisal Fee
    // request awaiting payment — see docs/210-request-payments.md.
    payment: '/admin/payment',
    // list -> detail split, same convention as feeApprovalsDetail above —
    // Appraisal Fee's payment is per-bundle now too (see
    // feeApprovalsDetail's own comment), so this needs the same
    // bundleId. CI Fee stays one flat request, no id.
    paymentDetail: (kind: 'ci-fee' | 'appraisal-fee', bundleId?: string) =>
      kind === 'appraisal-fee' ? `/admin/payment/appraisal-fee/${bundleId}` : '/admin/payment/ci-fee',
    // Dev/reference-only: a live gallery of the admin design-system
    // primitives (tokens, StatusBadge, buttons, the card + CollapsibleSection
    // header contract, the admin table recipe, ConfirmDialog tones). Not in
    // the sidebar/top nav — reached from the floating settings popover, same
    // "reference, not a workflow step" spirit as "Fill with Sample Data".
    // Companion to docs/225-admin-design-system.md.
    designSystem: '/admin/design-system',
    creditChecking: (id: string) => `/admin/applications/${id}/credit-checking`,
    creditCheckingResult: (id: string) => `/admin/applications/${id}/credit-checking/result`,
    reconsideration: (id: string) => `/admin/applications/${id}/reconsideration`,
    callReport: (id: string) => `/admin/applications/${id}/call-report`,
    callReportResult: (id: string) => `/admin/applications/${id}/call-report/result`,
    requirementChecklist: (id: string) => `/admin/applications/${id}/requirement-checklist`,
    creditInvestigation: (id: string) => `/admin/applications/${id}/credit-investigation`,
    appraisal: (id: string) => `/admin/applications/${id}/appraisal`,
    financialEvaluation: (id: string) => `/admin/applications/${id}/financial-evaluation`,
    creditScoring: (id: string) => `/admin/applications/${id}/credit-scoring`,
    fullApplication: (id: string) => `/admin/applications/${id}/full-application`,
  },
};
