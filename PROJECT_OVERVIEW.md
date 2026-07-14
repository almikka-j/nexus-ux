# PG Finance LMS — Project Overview

> **Maintenance rule:** This file must be updated whenever application logic, routes,
> data models, or major UI/architecture decisions change. Treat it as the source of
> truth for how the app is wired — not just what it looks like.

## What this is

A Next.js (App Router) + MUI prototype of a loan management system for PG Finance,
with two portals:

- **Borrower portal** — public marketing site + sign-up/onboarding/loan-application
  flow + borrower dashboard.
- **Admin portal** — internal login + dashboard + application review workflow
  (initial credit checking → call report → transaction type → requirement
  checklist, with reconsideration as a rejection branch off initial credit
  checking rather than a forward step — see Admin flow below).

There is **no real backend**. All "data" lives in the browser's `sessionStorage` via
React Context, and all authentication is mocked against hardcoded demo accounts. This
is a frontend prototype for design/flow validation, not a production system.

---

## Tech stack

- Next.js 14 (App Router), TypeScript
- MUI (Material UI) with a custom CSS-variable theme
- React Hook Form + Zod for form validation
- `@fontsource/plus-jakarta-sans` (primary font, self-hosted, no external font requests)
- Playwright (dev-only, used for manual visual verification — not a committed test suite)

---

## Directory map

```
src/
  app/                    Next.js routes (App Router)
    auth/                 sign-up, verify, onboarding, thank-you, login
    borrower/              dashboard, apply
    admin/                 login, dashboard, applications/[id]/...
    (marketing pages)      about-us, contact, *-loan, faq, etc.
  auth/
    registration-context.tsx   Borrower session state (sessionStorage: hhc-lms-registration)
    admin-context.tsx          Admin session + review state (sessionStorage: hhc-lms-admin-session)
    mock-login.ts               Mocked borrower + admin login, mocked OTP
  layouts/
    borrower/               Borrower app shell (sidebar + topbar)
    admin/                   Admin app shell (sidebar + topbar) — mirrors borrower/
    onboarding/              Shared onboarding step chrome (progress bar, back/exit)
    auth/                    OLD split-panel auth layout — no longer used (see Deprecated below)
  sections/
    auth/                    Sign Up, Verify, Login, onboarding steps, shared AuthBrandPanel
    borrower/                Borrower dashboard, loan application view
    admin/                   Admin dashboard, application list, credit-checking flow screens
  theme/                   MUI theme tokens (typography, palette, component overrides)
  routes/paths.ts           Single source of truth for all internal route strings
  utils/get-loan-number.ts  Deterministic loan-number generator (hash of email)
```

---

## Data model (client-side only)

### Borrower: `src/auth/registration-context.tsx`
sessionStorage key: `hhc-lms-registration`

```ts
SignUpData     { firstName, middleName?, lastName, extensionName?, email, mobile,
                 password, marketingConsent, termsAccepted }
LoanType       'personal' | 'business'
FinancialInfo  { desiredLoanAmount, loanTermMonths, employmentStatus, monthlyIncome, loanPurpose }
PersonalInfo   { idType, idNumber, idFile, address, province, city, barangay,
                 civilStatus, gender, tinNumber, referralSource }
ApplicationData { loanType, financialInfo, personalInfo, selfieVerified, selfiePhoto }
// loanType/financialInfo/personalInfo nullable until each step submits; selfieVerified
// defaults false; selfiePhoto defaults null

RegistrationState { signUpData, verified, application }
```

Exposed via `useRegistration()`: `hydrated`, `setSignUpData`, `setVerified`,
`setLoanType`, `setFinancialInfo`, `setPersonalInfo`, `setSelfieVerified`,
`setSelfiePhoto`, `loadSample(state)`, `reset()`.

**`PersonalInfo.idFile` is a data URL string, not a `File` object.**
`step-personal-info.tsx` converts the uploaded `File` via
`src/utils/file-to-data-url.ts` (`fileToDataUrl`) before calling
`setPersonalInfo` — this matters because sessionStorage persistence goes through
`JSON.stringify`, and a raw `File` object serializes to `{}` (silently losing the
upload). `application.selfiePhoto` is already a data URL (captured straight off a
`<canvas>` in the selfie step) so it needs no conversion, just storage via
`setSelfiePhoto`. Both images are rendered directly in the admin's
`ApplicationDetailsCard` (see Admin flow below) — this is the only reason either
field needs to survive as a displayable string rather than an in-memory File/Blob.

`hydrated` flips to `true` once the provider has finished reading `sessionStorage`
on mount — consumers that need to distinguish "genuinely empty" from "hasn't loaded
yet" (e.g. the admin sample-application auto-load below) must gate on it, per the
hydration race caveat further down this doc. `loadSample(state)` replaces the entire
registration state wholesale (used by the admin portal to seed a demo application —
see below).

### Admin: `src/auth/admin-context.tsx`
sessionStorage key: `hhc-lms-admin-session`

```ts
AdminUser            { email, firstName, lastName }
CreditChecking        { documentUploaded, documentName, decision, bureauFindingStatus,
                        notes, decisionReason }
                        — aiSummary/aiRecommendation are NOT stored; computed at render
                        time in initial-credit-checking-view.tsx from the uploaded bureau
                        reports + application details (see "Initial AI Recommendation"
                        below). bureauFindingStatus ('pending'|'clean'|'negative') is the
                        simulated AI bureau-review outcome — see "Negative Credit Report"
                        below.
NegativeCreditReport  { thru, negativeRecordText, accountFindings, cancelledCreditCards,
                        adverseClassifiedLoans, closedCurrentAccounts, recommendationRemarks,
                        submitted } — see "Negative Credit Report" below. The four list
                        fields are NegativeReportEntry[] ({ id, label, findings }).
Reconsideration       { notes, decision }
CallReport            { approved, ...~75 structured fields across 9 sections — see
                        "Call Report" below }
TransactionType        'New'|'Renew'|'Additional/Increase'|'Compromised'|'Restructured'
                        |'Rollover'|'Extension'|'Repricing'|'Others'
RequirementChecklist  { checkedItems, collateralNotes, endorsed }

ApplicationReview { creditChecking, reconsideration, negativeCreditReport, callReport, transactionType, requirementChecklist }
```

Exposed via `useAdmin()`: `setAdminUser`, `setCreditChecking`, `setReconsideration`,
`setNegativeCreditReport`, `addNegativeReportEntry`, `updateNegativeReportEntry`,
`removeNegativeReportEntry`, `resetNegativeCreditReport`, `setCallReport`,
`addCollateralEntry`, `updateCollateralEntry`, `removeCollateralEntry`,
`setTransactionType`, `setRequirementChecklist`, `logout()`.

**Important limitation:** the admin portal does *not* have its own applicant
database. There is exactly one **"live" application** — whichever one exists in the
current browser's `useRegistration()` sessionStorage (or none) — plus a fixed set of
**read-only sample applications** (see below) that only exist to populate the list.
There is no cross-browser/cross-user visibility for the live application: to demo the
full interactive admin flow with a real borrower-submitted application, submit one
first in the same browser, then log into `/admin`.

**Sample application auto-load (the "live" one):**
`src/sections/admin/application-list-view.tsx` auto-seeds a hardcoded
`SAMPLE_APPLICATION` (`src/sections/admin/sample-application.ts` — "Maria Santos")
into the registration context via `loadSample()` whenever the Application List
mounts (or re-renders) with no real application present — the effect's dependency
array is `[hydrated, hasApplication]`, not just `[hydrated]`, specifically so it
re-fires and reloads a fresh sample immediately after "Clear Sample Data" clears
the applicant, rather than only firing once on initial mount. This is the **only**
application that's fully interactive (Approve/No, CIBI form, uploads, etc.) — see
"Multi-application list & read-only samples" further down for the other five (one
read-only sample per review step).

**"Clear Sample Data" resets BOTH contexts, not just who the applicant is.**
The button (`src/sections/admin/application-list-view.tsx`) calls
`useRegistration().reset()` **and** `useAdmin().resetReview()` together. This was
a real bug: `reset()` alone only cleared `RegistrationContext` (who the live
applicant is), while all of her review progress — CIBI form fields, `submitted`
flag, bureau upload filenames, AI summary/recommendation, decision, `stepTimestamps`
— lived in `AdminContext` and was left completely untouched. The practical effect:
after any round of testing (filling in CIBI, uploading bureau reports, approving,
etc.), "Clear Sample Data" looked like it reset things, but every review screen
kept showing that old filled-in data indefinitely — there was no way to get back
to a genuinely blank Initial Credit Checking (or any other step) short of clearing
`sessionStorage` by hand. `AdminContext.resetReview()`
(`src/auth/admin-context.tsx`) replaces `state.review` with a freshly-constructed
`createInitialReview()` object (a factory function, not a shared constant, to
avoid any risk of accidental mutation-sharing across resets) — `adminUser` (stay
logged in) and `negativeList` (a real historical record, not per-applicant scratch
state) are left untouched.

---

## Auth (all mocked, no backend)

| Portal   | Demo credentials                          | File |
|----------|--------------------------------------------|------|
| Borrower | `borrower@pgfinance.com.ph` / `Password123` | `src/auth/mock-login.ts` (`DEMO_ACCOUNT`) |
| Admin    | `admin@pgfinance.com.ph` / `Admin123`       | `src/auth/mock-login.ts` (`ADMIN_DEMO_ACCOUNT`) |
| OTP      | `123456` (any borrower verify step)         | `src/auth/mock-login.ts` (`MOCK_OTP_CODE`) |

Every login form has a "Fill with Sample Data" button that autofills the demo
credentials. This (and every other "Fill with Sample Data" affordance throughout
the app) used to be gated behind `process.env.NODE_ENV !== 'production'` —
meaning it silently disappeared whenever the app was run via `next build &&
next start` instead of `next dev`, since Next.js sets `NODE_ENV=production` for
any production build regardless of whether it's a real deployment. Since this
whole app is a client-facing demo/prototype with no real backend (not an actual
production service with real users to hide dev tooling from), that gate was
removed everywhere — these buttons now always render, regardless of how the
server was started.

**"Fill with Sample Data" is a toggle, not a one-shot action, in 7 of these
spots.** Clicking it a second time (once already filled) flips it to a "Remove
Sample Data" button that clears the form/state back to blank — the label always
reflects current fill state. Covered: sign-up, login, admin login (react-hook-form
`reset()` toggling between the sample values object and a blank-values object,
tracked via a local `isSample` boolean state, since react-hook-form has no
built-in "is this filled with X" check); onboarding's Loan Type step (toggles
`application.loanType` between `'personal'` and `null` — `setLoanType`'s type
signature was widened from `(loanType: LoanType) => void` to `(loanType: LoanType
| null) => void` to allow this); onboarding's Financial Info and Personal Info
steps (toggle between the sample values and the step's own hydrated
`defaultValues` — **not** hardcoded blanks, since these steps can already be
pre-filled from a prior session and blanking past that would destroy real
in-progress data, not just "sample" data); and Initial Credit Checking's floating
button, which toggles based on the pre-existing `canDecide` boolean and calls a
new `handleClearSampleData()` — a scoped undo of exactly what
`handleFillSampleData()` sets (`creditChecking`'s document/AI fields, the CIBI
form, and the four bureau uploads) — deliberately **not** `resetReview()`, since
that clears the entire `ApplicationReview` including unrelated steps
(Reconsideration, Call Report, Transaction Type, Requirement Checklist) this
button has no business touching. The Officer Notes field is untouched by this
clear, since it's a separate, intentionally-persistent field.

**Left as one-directional, not converted to a toggle:** onboarding's "Skip to
Dashboard" (a navigation shortcut, not a data-fill action), the Application
List's "Clear Sample Data" (already the remove side of a pair, paired with an
auto-load `useEffect` rather than a fill button), and the borrower dashboard's
"Reset Application" (already one-directional, paired with a distinct empty-state
screen rather than a fill button).

---

## Borrower flow

```
/auth/sign-up  →  /auth/verify (OTP)  →  [Verified success animation]
  →  /auth/onboarding (Welcome → Loan Type → Preliminary/Financial Info → Personal Info
                        → Selfie Verification)
  →  /auth/thank-you  →  /borrower/dashboard
```

**Selfie with ID verification** (`src/sections/auth/onboarding/step-selfie-verification.tsx`)
is the final step before submit, both in the main onboarding flow (`OnboardingView`, step 5
of 5, right after Welcome) and in the "Apply for Loan" second-application flow from the
dashboard (`LoanApplicationView`, step 4 of 4, which has no Welcome screen). It follows a
**KYC-style "selfie with ID" pattern** (not a plain face-only selfie): live camera feed in
a portrait frame with a dashed face-oval guide up top and a card-shaped ID-rectangle guide
below it + corner brackets, instructing the user to hold their physical ID next to their
face. An "I'm Ready" trigger starts a 3-2-1 auto-capture countdown ("Hold still —
capturing…") instead of a manual shutter button, then on the captured frame a
"Verify Selfie with ID" action runs a simulated ~1.8s "Matching your face to your ID…"
check (spinner overlay) before showing both guide shapes turned green with a checkmark
overlay — **no success text/alert is shown**, the user just clicks "Submit Application"
directly off the green checkmark state. Camera access is via
`navigator.mediaDevices.getUserMedia`, capture is drawn
to a `<canvas>`. **The match/verify step is intentionally simulated, not a real
face-match/liveness backend** — there is no actual comparison against the uploaded ID
happening. If camera permission is denied, it shows an inline warning and a retry button
rather than blocking the flow. Sets `application.selfieVerified = true` on success before
advancing to Thank You.

- Sign Up, Verify, and the Welcome step render **full-bleed split-panel** layouts
  (dark textured `AuthBrandPanel` + form), bypassing the card-based `OnboardingLayout`.
- Loan Type, Preliminary Application, and Personal Info render inside
  `OnboardingLayout` (light top-bar with progress + back/exit link, centered white card).
- "Verified" (post-OTP) and "Thank You" (post-submit) are transient success screens,
  not steps a user should deep-link to.
- Applying for a *second* loan from the dashboard ("Apply for Loan") reuses the same
  Loan Type → Financial Info → Personal Info steps via
  `src/sections/borrower/loan-application-view.tsx`.
- Dashboard loan card intentionally shows only 3 real-data columns (Total Loan
  Amount, Loan Term, Application Status) — no invented Total Payment / Amount Due /
  Due Date fields, since there's no real payments/amortization model yet.

---

## Admin flow

```
/admin/login  →  /admin/dashboard  →  /admin/credit-checking (list, all applications)
  →  /admin/applications/[id]/credit-checking
       ├─ Approved → /admin/applications/[id]/call-report
       │              → Proceed → /admin/applications/[id]/transaction-type
       │                            ├─ type ∈ {New, Renew, Additional/Increase, Others} (1,2,3,9)
       │                            │     → /admin/applications/[id]/requirement-checklist → Endorse
       │                            └─ other types → "coming soon" placeholder (not built yet)
       └─ No → /admin/applications/[id]/reconsideration
                 ├─ Approve → rejoins at call-report
                 └─ No → "Client notified" terminal state
```

**The Application List is no longer its own page.** `/admin/applications` (bare)
doesn't exist — the list now lives at `/admin/credit-checking`, since Initial Credit
Checking is step 1 and every application starts there. `paths.admin.applications`
(in `src/routes/paths.ts`) still exists as the canonical "go see the list" link name
for callers, it just resolves to `/admin/credit-checking` now. The per-applicant
routes under `/admin/applications/[id]/*` and `/admin/applications/sample/[email]`
are unaffected — this only changed where the *list* lives, not the individual
review screens.

`id` in these routes is the applicant's URL-encoded email (there's no real DB, so
email is the de facto key back into the shared `useRegistration()` session).

This flow was built directly from a process-flow diagram the user provided
(System / Client / LMS User swimlanes). Initial Credit Checking includes a mocked
"AI" step (upload document → simulated analysis steps → generated summary +
recommendation text) — not a real AI integration.

**Bureau Reports card** (`src/sections/admin/bureau-reports-card.tsx`,
`<BureauReportsCard />`, rendered once in `initial-credit-checking-view.tsx` right
after document upload): a single compact, space-saving card replacing what used
to be 5 separate full-width cards (one always-expanded CIBI form + 4 individual
upload cards). It renders "Bureau Reports" / "Upload the returned reports. All are
required to make a decision." followed by 5 rows — CIBI, LOANDEX, CIC, CMAP,
NFIS/BAP — each just an icon + name + caption + a right-aligned action, instead
of a full card each.

- **CIBI row** is the only one with a data-entry form (per the source diagram's
  callout — "CIBI, CIC, CMAP, NFIS/BAP — as of now, only CIBI has an API
  integration"). Its right-side action is a **"Create Report"** button that
  toggles a `<Collapse>` open directly below the row, inside the same card,
  revealing the CIBI form (14 fields, same auto-fill logic as before — 11
  fields pre-filled from real applicant data with a green "Auto-filled" chip;
  Date of Birth and Address Region left blank since nothing in the borrower
  flow collects them; Installment computed live as `financedAmount ÷ terms`).
  Clicking "Submit to CIBI" inside the form sets `cibiForm.submitted = true` and
  collapses the form back down. Once submitted, the row's right side shows a
  green **"Sent"** status chip plus a separate **"Upload document"** button
  (for the CIBI report file, `cibiForm.reportFile`/`reportFileName` via
  `fileToDataUrl`) — after that upload, the row shows the filename + checkmark
  + "Replace", same as the other 4 rows.
- **LOANDEX / CIC / CMAP / NFIS-BAP rows** are plain manual-upload rows (no
  data-entry form) — "Upload report" button that becomes a filename + checkmark
  + "Replace" once uploaded. State lives in
  `AdminContext.review.{loandexUpload,cicUpload,cmapUpload,nfisBapUpload}`,
  unchanged from before this layout consolidation.
- `computeInstallment` (the amount÷terms math) was kept in
  `src/sections/admin/cibi-form-card.tsx` — that file used to contain the whole
  standalone `CibiFormCard` component, which is now dead (superseded by the
  CIBI row inside `BureauReportsCard`) and was removed; only the shared math
  helper remains there, since both `bureau-reports-card.tsx` and
  `initial-credit-checking-view.tsx` (for "Fill with Sample Data") need it.
  `bureau-upload-card.tsx` (the old standalone per-bureau card component) was
  deleted outright, fully superseded by the compact rows.

**Initial AI Recommendation** (`buildInitialAiRecommendation`, extracted to
`src/sections/admin/initial-credit-checking-risk.ts` so `CreditCheckingResultModal`
can reuse the same risk level — see "View Initial Credit Checking Result"
under Call Report — rendered right after `ApplicationDetailsCard` on Initial
Credit Checking): a lightweight, immediately-visible read computed purely
from data already on the Application Details card — desired loan amount,
monthly income, employment status — with **no document upload or "Run AI
Analysis" click required**. This is deliberately separate from (and lighter
than) the deeper "AI review, summary & recommendation" section further down
the page. The initial recommendation buckets into 3 levels by debt-to-income
ratio (annual loan amount vs. income): **Low risk** (≤35%, green, `'good'`),
**Needs a closer look** (35–60%, amber, `'watch'`, also shown when monthly
income isn't on file at all), **High risk** (>60%, red, `'high'`) — each
rendered as a colored callout with an icon, risk-level label, and a sentence
naming the actual computed ratio. The "AI review, summary & recommendation"
card below it also gets a "View Initial Credit Checking Result" button (see
Call Report section) once `allBureauReportsUploaded`.

**"1. Upload document" card removed.** There used to be a standalone dropzone
card ("1. Upload document") between the Initial AI Recommendation card and
`BureauReportsCard`, and the "AI review, summary & recommendation" section below
it was headed "2–4." and gated (both the `Run AI Analysis` button's `disabled`
state and the card's `opacity`) on `creditChecking.documentUploaded` being
`true`. Both the card and that gate were removed — the section heading dropped
its "2–4." prefix (nothing numbered "1." precedes it anymore). `documentUploaded`/
`documentName` remain on the `CreditChecking` type and are still set by "Fill with
Sample Data"/"Remove Sample Data" (`handleFillSampleData`/`handleClearSampleData`)
for data consistency, even though no UI reads or writes them anymore — removing
the fields from the type entirely was treated as a larger, separate change than
what was asked.

**Negative Credit Report** — a manual report the officer fills out when the
(simulated) AI review of the bureau uploads comes back with a negative
finding, replacing what used to be entirely hardcoded, always-positive
content in `CreditCheckingResultModal`.

- **Simulated determination** (`simulateBureauFinding`, `src/sections/admin/simulate-bureau-finding.ts`):
  there's no real OCR/AI service anywhere in this codebase — every other "AI"
  text in this app is templated boilerplate driven by loan-amount/income
  math, not real document analysis — so whether the bureau reports come back
  `'clean'` or `'negative'` is simulated via a **deterministic hash** (same
  technique as `getLoanNumber`'s email hash, not `Math.random()`, so the
  result doesn't flip between re-renders/reloads), seeded by the applicant's
  email plus all 5 bureau upload filenames. Computed exactly once per
  upload session in a `useEffect` in `initial-credit-checking-view.tsx`,
  guarded by `creditChecking.bureauFindingStatus === 'pending'` — once it
  resolves to `'clean'` or `'negative'` it's sticky (persisted via the normal
  `AdminContext` sessionStorage effect) and never re-rolled. Both this page
  (to decide whether to show `NegativeCreditReportCard`) and
  `CreditCheckingResultModal` (to decide which content to render) read
  `review.creditChecking.bureauFindingStatus` directly — neither ever
  re-calls `simulateBureauFinding` itself — so they can't disagree.
- **QA override**: since the hash is stable for a given email + the fixed
  sample-upload filenames, "Fill with Sample Data" alone can't exercise both
  outcomes reliably. Two dev-only floating buttons, "Force Clean" / "Force
  Negative" (visible once `allBureauReportsUploaded`, same fixed-bottom-right
  floating-button convention as "Fill with Sample Data"), directly set
  `bureauFindingStatus`, bypassing the hash for testing.
- **`NegativeCreditReportCard`** (`src/sections/admin/negative-credit-report-card.tsx`,
  plain inline-`sx` card convention, not `call-report/call-report-types.ts`'s
  `cardSx`/`fieldSx` since this isn't a Call Report concept): renders only
  when `allBureauReportsUploaded && bureauFindingStatus === 'negative'`,
  directly below the "AI review, summary & recommendation" card and above
  "Approved?". Read-only header fields (To/From fixed strings, Date/Subject
  derived at render time, not stored) plus one required officer-typed field
  (Thru); a "Negative Record" textarea (prefilled boilerplate the officer
  completes); a repeatable Account Name/Findings list ("+ Add More
  Accounts"); three optional special-finding lists (Cancelled Credit Cards
  File / Adversely Classified Loan File / Closed Current Account), each a
  dark-navy-header + "+ Add ___" repeatable list, sharing one internal
  `SpecialSectionList` sub-component; and a required Recommendation/Remarks
  textarea. Submit is disabled until Recommendation/Remarks is non-blank.
  Every field except Recommendation/Remarks is optional.
- **Data model** (`src/auth/admin-context.tsx`): `NegativeCreditReport` on
  `ApplicationReview.negativeCreditReport`, with 4 `NegativeReportEntry[]`
  lists (`accountFindings`, `cancelledCreditCards`, `adverseClassifiedLoans`,
  `closedCurrentAccounts`) all sharing one entry shape (`{ id, label,
  findings }`). Rather than writing 3 setters per list (12 total), the 3
  array-mutation setters (`addNegativeReportEntry`, `updateNegativeReportEntry`,
  `removeNegativeReportEntry`) each take a `NegativeReportEntryListKey`
  discriminator and index `negativeCreditReport[listKey]` — a direct
  generalization of the Call Report collateral-entry pattern
  (`addCollateralEntry`/`updateCollateralEntry`/`removeCollateralEntry`),
  parameterized rather than copy-pasted 4×. `resetNegativeCreditReport()`
  (used by "Remove Sample Data") and the `ApplicationReview` initial-state
  factory both call the same `createInitialNegativeCreditReport()` factory,
  so "start the form over" and "start a whole new review" can't drift apart.
- **`CreditCheckingResultModal` branching**: `showNegativeReport =
  bureauFindingStatus === 'negative' && negativeCreditReport.submitted`
  — while negative-but-not-yet-submitted, the modal still falls back to the
  original hardcoded all-clear content (deliberate: no separate "report
  pending" state was requested). When `showNegativeReport` is true: the
  "Negative Record" block renders the officer's typed narrative, each
  Account Findings entry as `{label} : {findings}`, and for each of the 3
  special lists either its entries (same format) or, if empty, a centered
  bold **"No {Section Title}"** fallback (exact strings: "No Cancelled
  Credit Cards File", "No Adversely Classified Loan File", "No Closed
  Current Account"). The "Findings by Name" block is **hidden entirely**
  when `showNegativeReport` (superseded by the Account Findings rows above
  it — showing both would duplicate the same information under two
  headers). The "Recommendation" text splits `recommendationRemarks` on
  newlines: the first non-empty line renders as the lead paragraph, any
  remaining non-empty lines render as bullets (`FindingBullet`) below it —
  no extra field, the officer just presses Enter for additional freeform
  remarks if they want bullets. The Recommendation **chip** (Proceed/Pending)
  and the top status banner stay keyed to the existing DTI-based `isCleared`
  **unchanged, on both paths** — deliberately not re-derived from
  `bureauFindingStatus` or parsed out of the officer's freeform text (fragile
  string-matching was rejected as an approach). Three new identity fields
  (Email Address, Contact Number, Date of Application — all already
  available on `signUpData`/`application`) were added to the "Credit
  Checking Report" field block, unconditionally on both the clean and
  negative paths.

**"AI review, summary & recommendation" is now fully automatic — no "Run AI
Analysis" button.** `aiSummary`/`aiRecommendation` were removed from the
`CreditChecking` type entirely (previously stored, written by a button click
with a fake multi-step "analyzing…" animation). They're now computed directly
in `initial-credit-checking-view.tsx` — `buildAiSummary`/`buildAiRecommendation`
(renamed from `buildMockAiSummary`/`buildMockAiRecommendation`) run inline off
`application` (Application Details) and are only produced once all 5 bureau
reports are on file (`allBureauReportsUploaded`: CIBI, LOANDEX, CIC, CMAP,
NFIS/BAP — the same condition `canDecide` already required). The card's
subtitle switches between an upload-prompt ("Upload the CIBI, LOANDEX, CIC,
CMAP, and NFIS/BAP reports above to generate the AI review.") and a
based-on-reports statement once they're all present; the AI Summary/AI
Recommendation blocks simply appear/disappear as bureau uploads change — no
button, no `analyzing` state, no `CircularProgress`. This follows the same
"pure computation, never stored" pattern as the Call Report financial ratios
in `call-report-computations.ts`.

**Application Details card** (`src/sections/admin/application-details-card.tsx`,
shared by Initial Credit Checking and Call Report) shows everything the borrower
submitted — contact info, full loan request, personal/ID fields — grouped into
labeled sections, plus a compact "Uploaded Documents" section. This is what admins
actually review before clicking Approve/No.

**Officer notes carry forward, read-only.** A standalone "Officer notes" card
sits right after `BureauReportsCard` on Initial Credit Checking, with a free-form
**Notes** textarea (`creditChecking.notes` in `AdminContext`) the officer can type
general observations into at any point in the review — independent of whether a
decision has been made yet. Once filled, that same text is surfaced read-only in
two other places: inside `ApplicationDetailsCard`'s "Notes from initial credit
checking" section when the card is in its non-collapsible form (Initial Credit
Checking only — `application-details-card.tsx` suppresses that block when
`collapsible` is true, to avoid showing the note twice on Call Report), and
separately in `ReconsiderationView` (which doesn't render `ApplicationDetailsCard`
at all, so it gets its own read-only block instead). On Call Report specifically,
the note gets its own dedicated top-level card, `OfficerNotesCard`
(`src/sections/admin/call-report/officer-notes-card.tsx`), rendered right after
`ApplicationDetailsCard collapsible` and before `CallDetailsCard` — visible
immediately without expanding anything, since the note is useful context before
starting the call. It renders `null` when `creditChecking.notes` is empty. This
whole mechanism is deliberately a *different* field from `Reconsideration.notes`
(the officer-editable textarea on the Reconsideration screen itself) — one is a
general running note, the other is what happens during reconsideration itself.

**The "Approved?" card always renders**, dimmed (`opacity: canDecide ? 1 : 0.5`)
with all three buttons `disabled` until `canDecide` (all 5 bureau reports
uploaded) is true — it used to be wrapped in `{aiSummary && (...)}`, which hid
the entire card until the AI review had something to show, meaning officers
couldn't even see a decision was coming until every report was in. Removed
that outer gate on request so the card is visible (just inactive) from the
start, matching how the AI review card above it handles the same not-ready
state (dimmed/placeholder text, not hidden).

**"No" and "For Reconsideration" require a reason, captured via a confirmation
dialog at the moment of clicking.** The "Approved?" card has three buttons:
**Approve**, **No**, and **For Reconsideration**. Approve proceeds immediately
(`handleApprove`). Clicking "No" or "For Reconsideration" instead opens a
`ConfirmDialog` (`src/components/custom-dialog`) titled "Reason for declining" /
"Reason for reconsideration", with a required textarea — the Confirm button stays
disabled until a reason is typed. This reason is stored as
`creditChecking.decisionReason`, a field distinct from the general Officer Notes
above (that one is always-visible context; this one is captured only at the
instant of that specific decision) and is shown on the Reconsideration screen's
top banner as the quoted reason the application landed there. Both buttons route
to `/reconsideration` on confirm, but differ in what they record: "No" sets
`decision: 'rejected'` (a hard rejection), "For Reconsideration" leaves `decision`
at `'pending'` — a lighter-weight "send for a second look" path rather than an
outright decline.

**Uploaded Documents is compact, with proper empty-state placeholders**:
`DocumentPreview` renders small 76×76 thumbnails side by side (label + "Provided"/
"Not provided" status text next to each), instead of the earlier large ~280px-wide
previews — space-saving, matching the Bureau Reports card's row-based density.
When there's no image (`src` is null), instead of a generic dashed-border "missing"
box, each slot shows a purpose-specific placeholder icon: an ID-card icon
(`solar:card-2-bold-duotone`) for the Uploaded ID slot, a person-silhouette icon
(`solar:user-rounded-bold-duotone`) for the Selfie slot — reads as an intentional
empty-state mockup rather than an error state.

**Review screen breadcrumb**: `ApplicationReviewHeader` now shows only "‹
Application List" — the step name was removed from the breadcrumb (it's still
shown as the pill badge inside the header card, see below), since repeating it in
both places was redundant.

**Aging info sits beside the breadcrumb, above the header card**: "In review for
`<Xd Yh>` · On this step: `<Ym>`" went through two iterations — first moved from
its own full-width row below the card up into the card itself (beside the step
badge), then moved again to its final position: the **same row as the "‹
Application List" breadcrumb link**, right-aligned opposite it, sitting entirely
above the white header card rather than inside it. The header card itself is back
to its simpler original two-column layout (applicant info left, Officer + step
badge right) with no aging info inside it at all.

**Two independent collapsible sidebar sections**
(`src/layouts/admin/nav-vertical.tsx`, `src/layouts/admin/config-nav-admin.tsx`):

- **"Application List"** — the forward-moving process only: Initial Credit
  Checking, Call Report, Transaction Type, Requirement Checklist. Reconsideration
  is deliberately **not** here — being sent to Reconsideration means the
  application was already rejected at Initial Credit Checking, so it isn't a
  forward step in "the process," it's an exception branch.
- **"For Reconsideration"** — the rejected-track items: Reconsideration itself,
  plus Negative List (since Negative List entries are populated *from*
  Reconsideration's "No — Notify Client" outcome — see below). Negative List used
  to be its own top-level sidebar item; it's nested here now that there's a
  natural parent for it.

Both section headers are **non-clickable labels** (`path: null` in
`adminNavData` — no `href`, clicking anywhere on the row just toggles that
section's expand/collapse). Each section's expand/collapse state is tracked
independently (`expandedSections: Record<string, boolean>`, keyed by title) —
expanding one doesn't affect the other, and each auto-expands on its own whenever
the current route matches one of its own children (via a `useEffect`, using the
`isInsideSection()` helper). Sub-link active-state comparison differs by child
type: step-filtered children (`step` is a `ReviewStep`) compare both pathname and
the URL's `step` query param (`useSearchParams()`) — Initial Credit Checking is
"active" specifically when there's *no* `step` param, since that's the unfiltered
landing state; Negative List (`step: null`, a real standalone page, not a filtered
view) compares pathname only. Sub-items render as a plain flat list — no number
badges, no left-border accents — with the active one shown via a background-color
highlight only, kept deliberately simple.

The "Application List" section's sub-links point at
`paths.admin.applicationsByStep(<step>)` (`/admin/credit-checking?step=<reviewStep>`,
except Initial Credit Checking which points at the unfiltered
`paths.admin.applications`) — a filtered view of the applications list (see below),
since multiple applications can be sitting at any given step and the sidebar can't
point at one specific applicant's page. "For Reconsideration"'s Reconsideration
sub-link works the same way (`?step=reconsideration`); Negative List points at its
own standalone route (`paths.admin.negativeList`) instead, since it isn't a
step-filtered view of the applications list at all.

**Each step only lists applications genuinely at that step, always — including the
default view**: `ApplicationListView`'s `stepFilter` defaults to `'creditChecking'`
when there's no `?step=` param (i.e. the plain `/admin/credit-checking` landing
view), rather than falling back to "show every step." There is no "unfiltered, show
everything" state anymore — every view of this page is filtered to exactly one step;
Initial Credit Checking is simply the step shown by default. This was a real bug fix:
the earlier version treated "no query param" as "no filter," so the Initial Credit
Checking landing page was incorrectly showing applications from every step
(Reconsideration, Call Report, etc.), not just the ones actually at Initial Credit
Checking. The live application's step is dynamically inferred from `stepTimestamps`
(not hardcoded), and the read-only samples each carry their own fixed `step` — there
is no separate "assign application to step" action; the step shown is always derived
from where the application actually is in the review flow. New applications always
start at Initial Credit Checking (`markStepEntered('creditChecking')` fires there
first); from there, **Approved → Call Report**, **No/Rejected → Reconsideration** —
this routing is unchanged (see the route tree above), only the list's filtering
logic was reworked to make it accurate.

**Page heading and browser tab title reflect the actual step being viewed** — both
were previously hardcoded to always read "Application List" / "Initial Credit
Checking" regardless of which step's filtered view was showing. The on-page
`<Typography>` heading now renders `STEP_LABELS[stepFilter]` directly. The browser
tab title is kept in sync via a `useEffect` that sets `document.title` whenever
`stepFilter` changes, since Next.js's `export const metadata` in `page.tsx` is
static per-route and can't see a client-side query param at request time — the
static metadata (`"Initial Credit Checking | HHC LMS Admin"`) only serves as the
pre-hydration default for the bare `/admin/credit-checking` URL.

### Call Report (`src/sections/admin/call-report-view.tsx` + `src/sections/admin/call-report/`)

A structured interview form the officer fills out **live, while on the phone/
in-person/video call with the borrower**. Every field is a structured
selection (radio, chip-multiselect, date, number) rather than free text, to
minimize typing during an active conversation — the only free-text fields in
the whole form are `observationNotes`, `loanPackageNotes`, `nextStepsInstructions`,
`additionalRemarks`, and the editable `callSummary` itself.

State lives entirely in `AdminContext.review.callReport` (the `CallReport`
type, `src/auth/admin-context.tsx`), one large object following the same
`setCallReport(partial)` pattern as every other review step, plus three
array-mutation setters for collateral (`addCollateralEntry`,
`updateCollateralEntry(id, data)`, `removeCollateralEntry(id)`).

**File split** — one component per section, all under `src/sections/admin/call-report/`:
- `call-report-types.ts` — every enum's `{value,label}` option list, plus shared `fieldSx`/`cardSx` and a `labelFor()` lookup helper. `call-details-card.tsx` additionally exports two shared UI primitives used by every other card: `RadioRow` (a labeled `RadioGroup` wrapper with an optional `disabled` prop) and `ChipToggleGroup` (a multiselect chip row backing every checklist field).
- `call-report-computations.ts` — pure functions (`toNumber`, `computeTotalMonthlyIncome`, `computeTotalMonthlyObligations`, `computeDisposableIncome`, `computeDti`, `compareAmount`, `compareTerm`). Financial ratios are **never stored** — always recomputed at render time from the raw input fields, so they can't drift out of sync.
- `call-report-summary.ts` — `buildCallSummary(callReport, signUpData)`, a pure function that composes the auto-generated Call Summary text, skipping any section whose fields are still empty.
- `officer-notes-card.tsx` — `OfficerNotesCard`, a small read-only card that renders `review.creditChecking.notes` (or `null` if empty); not one of the interview sections listed below, just a carry-forward display.
- `credit-checking-result-modal.tsx` — `CreditCheckingResultModal`, a centered MUI `Dialog`, opened from both this page and Initial Credit Checking (see "View Initial Credit Checking Result" below).
- One card component per section (see below), each reading/writing `AdminContext` directly via `useAdmin()` — no props, no react-hook-form (deliberately: every other admin review screen in this codebase manages state the same way, and this page was kept consistent rather than introducing a form library for just one screen).

**No section numbering** — headings were originally numbered ("1. Call Details", "2. Borrower Interview", etc.) but the numbers were removed on request; section order in the page is still fixed, just not labeled with digits.

**Application Details is collapsible on this page only.** `ApplicationDetailsCard` (`src/sections/admin/application-details-card.tsx`, shared with Initial Credit Checking) takes an optional `collapsible` prop, default `false`. Call Report renders `<ApplicationDetailsCard collapsible />`; Initial Credit Checking's call site is unchanged (`<ApplicationDetailsCard />`, always fully expanded — officers need the full detail there before deciding). When `collapsible` is `true`, the card starts **collapsed**, showing only a compact summary row (Client name, Loan type, Application date from `application.submittedAt`, Desired loan amount) behind a clickable header with a chevron; clicking anywhere on that header expands/collapses the full Applicant/Loan Request/Personal & ID/Uploaded Documents/Notes content via a MUI `Collapse`. This replaced a dedicated read-only "Application Summary" card (`application-summary-card.tsx`, since deleted) that used to show a similar-but-not-identical field set as its own section — that card also carried Application Number and Account/Credit Officer, which the collapsed summary row does not currently surface (only the 4 fields named above).

Immediately below the (collapsed) Application Details card, `OfficerNotesCard`
renders the Initial Credit Checking officer's `notes` read-only — see "Officer
notes carry forward, read-only" above — so it's visible without expanding
anything, before any of the interview sections begin.

**"View Initial Credit Checking Result" button + modal — opened from two
screens.** `CreditCheckingResultModal` (`call-report/credit-checking-result-modal.tsx`)
is a centered MUI `Dialog` (`maxWidth="sm"`, scrollable) showing a
generated-looking Initial Credit Checking report. It's opened from:
- **Call Report** — an outlined button right below `OfficerNotesCard`.
- **Initial Credit Checking** (`initial-credit-checking-view.tsx`) — an
  outlined button inside the "AI review, summary & recommendation" card
  itself, shown once `allBureauReportsUploaded` is true (same gating as that
  card's AI Summary/Recommendation content).

Each screen owns its own `resultModalOpen` local `useState` — it's pure UI
state, not application data, so it isn't lifted into `AdminContext`.

Modal content: status banner (Cleared/not-cleared), a "Credit Checking
Report" field block (Application No. via `getLoanNumber(signUpData.email)`,
Applicant, To — fixed "Credit Committee", Thru — `application.assignedOfficer`,
From — fixed "Credit and Collection Department", Date/report-generated
timestamp from `review.stepTimestamps.creditChecking`, Subject), a "Negative
Record" checklist (4 fixed green check rows), a "Findings by Name" section
(**applicant only — no co-maker**, since that concept doesn't exist anywhere
else in this app; explicitly scoped out rather than guessed at), a
"Recommendation" box with a Proceed/Pending chip, and a Prepared by/Noted by
two-column footer.

**Cleared/not-cleared (`isCleared`) is driven by the shared debt-to-income
risk level, not `creditChecking.decision`.** It's computed as
`initialRiskLevel === 'good' && allBureauReportsUploaded`, where
`initialRiskLevel` comes from `buildInitialAiRecommendation()` — extracted to
`src/sections/admin/initial-credit-checking-risk.ts` so both
`initial-credit-checking-view.tsx` (which renders the "Initial AI
Recommendation" callout) and this modal compute the exact same value and can
never disagree. This was a deliberate correction during the modal's
Initial-Credit-Checking integration: `decision === 'approved'` (the original
gate, still fine when opened from Call Report where a decision has already
been made) doesn't work as the "negative" signal on Initial Credit Checking
itself, since `decision` is still `'pending'` there — the officer hasn't
clicked Approve/No/For Reconsideration yet at the point they'd want to preview
this report.

**Every value is computed inline at render time from existing state**
(bureau upload filenames, `application`'s financial info, `signUpData`,
`stepTimestamps`) — no new fields were added to `CreditChecking` or anywhere
else in `AdminContext`, following the same "pure computation, never stored"
pattern as the AI review and Call Summary. The header also has a **disabled**
PDF button with a "PDF export coming soon" tooltip — visible as an affordance
matching the reference design, but not wired to real PDF generation (no PDF
library exists in this project); and a working X close button.

**Sections, in order** (no numbers on any of these headings):
- **Call Details** (`call-details-card.tsx`) — date/time, Call Type, Place of Call (+ conditional "Specify Place of Call" when Other), representatives, Call Status (Completed / Follow-up Needed / Unable to Reach — no "In Progress", since this report is filled out after or during a completed contact attempt), Identity Confirmed.
- **Borrower Interview** (`borrower-interview-card.tsx`) — one card with four subgroups, separated by plain uppercase subheadings (`Divider` + small label, not a heading hierarchy — the section is still one card, one heading, one subtitle):
  - *(ungrouped, top)* — Loan Purpose Confirmation, Final Loan Purpose (defaults once from `application.financialInfo.loanPurpose` via a guarded `useEffect`), Specific Use of Proceeds, Primary Source of Repayment (+ conditional Other), Target Release Date.
  - **Residence and family** — Years at Current Residence, Number of Dependents, Supporting More Than One Family.
  - **Employment or business** — Main Source of Income (+ conditional Other), Employment/Business Tenure, Income Trend.
  - **Organization membership** — Member of an Organization (Yes/No gate); when Yes: Membership Type (plain text field, not an enum — organizations are too varied to enumerate), Organization Name, Years of Membership, Membership Standing. This used to be its own top-level card (`organization-membership-card.tsx`, since deleted) — merged into Borrower Interview on request, since the field spec nests it there rather than numbering it separately.
- **Declared Financial Information** (`financial-declaration-card.tsx`, renamed from "Financial Declaration") — verification-disclaimer banner ("Declared during the call — subject to document and financial verification."), 6 number inputs (Declared Net Monthly Income, Other Monthly Income, Household Expenses, Existing Loan Payments, Credit-card Payments, Other Obligations), then 4 live-computed read-only rows (Total Monthly Income, Total Monthly Obligations, Preliminary Disposable Income, Estimated Debt-to-Income Ratio) via the computation functions above.
- **Officer Observation** (`officer-observation-card.tsx`) — one `officerObservations: OfficerObservationItem[]` array, rendered as two visually-separated `ChipToggleGroup`s ("Positive or neutral" in green, "Needs attention" in red) that both read/write the same underlying array — the visual split is presentational only, not two separate state slices. Plus one optional Observation Notes field.
- **Collateral Information** (`collateral-information-card.tsx` + `collateral-entry-fields.tsx`) — Collateral Offered (Yes/No/TBD) gates a repeatable entry list. Each entry (`CollateralEntry`: `id`, `type`, `description`, `registeredOwner`, `estimatedValue`, `requiresAppraisal`) is edited via `CollateralEntryFields`, a shared component used **twice**: editable here, and read-only (via a separate small `CollateralEntryFieldsReadOnly` renderer, plain text rather than disabled form controls, so it visually reads as a summary) inside Loan Package Proposal below — collateral is entered once, never re-typed.
- **Loan Package Proposal** (`loan-package-proposal-card.tsx`) — the largest card. A read-only "Original Request" block (Requested Amount/Term/Purpose from `application.financialInfo`, plus Original Loan Facility if the officer has already filled in a facility name), then editable Proposed Terms (defaults Proposed Amount/Term from the original request and Final Use of Proceeds/Repayment Source from the Borrower Interview answers, each via a guarded one-time `useEffect`), a Requested-vs-Proposed comparison (`compareAmount`/`compareTerm` render "Same as Requested"/"Lower Amount"/etc. as chips) that reveals an Adjustment Reason field only when the amount or term actually differs, Collateral Assessment, the reused read-only collateral entries, Conditions Before Proceeding checklist, Preliminary Recommendation (reveals Recommendation Reason when set to anything other than "Proceed as Requested"), and Loan Package Notes. Explicitly **no loan-computation formula** — Estimated Amortization and Estimated Maturity Value are plain manual-entry number fields, since no approved interest/amortization formula exists anywhere in this codebase; inventing one was out of scope.
- **Follow-up and Next Step** (`agreed-next-steps-card.tsx`, renamed from "Next Steps") — Follow-up Required (`followUpRequired: 'yes' | 'no' | ''`, explicit radio, replacing the old implicit rule that derived required-ness from Call Status/checklist selections); Follow-up Date only renders (and is required) when Follow-up Required is Yes — switching back to No clears `followUpDate`. Next Action (`nextAction: NextAction | ''`) is a **single-select** `RadioRow` (`Proceed to Next Process` / `Request Additional Requirements` / `Verify Information` / `Conduct Site Visit` / `Request Appraisal` / `Schedule Another Call` / `Other`), replacing the old `nextSteps: NextStepItem[]` multiselect checklist — only one next action applies at a time now. `Other` reveals a companion free-text field, `nextActionOther`, matching every other "Other" option's pattern elsewhere in this form. Short Instructions closes out the card.
- **Call Summary** (`call-summary-card.tsx`) — `buildCallSummary()` composes a plain-text summary from whichever fields are filled; the officer can edit it directly (`callSummaryEdited` flips to `true` on any manual edit). A "Generate Summary"/"Regenerate Summary" button (label depends on whether `callSummary` is already non-empty) regenerates on click — if `callSummaryEdited` is `true`, a `ConfirmDialog` ("Replace edited summary?") asks first so a manual edit is never silently overwritten; if `false`, it regenerates immediately since there's nothing to lose. Additional Remarks (the one general free-text field) is a second `TextField` folded into this same card rather than its own section.

The page's own intro card ("Call Report & Loan Package Proposal / Complete this structured interview live while on the call with the borrower.") was removed on request, so the page now opens directly with the (collapsed) Application Details card.

**Proceed gate**: the existing "Proceed application?" card's Proceed button is disabled until `callStatus`, `identityConfirmed`, and `preliminaryRecommendation` are all set, and — only when `followUpRequired === 'yes'` — `followUpDate` is also filled in. "Do Not Proceed" stays ungated, consistent with how declining never requires as much as approving elsewhere in this app.

**Floating "Fill with Sample Data" / "Remove Sample Data" toggle** — same pattern as Initial Credit Checking's floating button (fixed bottom-right, always visible, no `NODE_ENV` gate). Label and behavior are driven by `canProceed` (the same boolean gating the Proceed button): while incomplete, one click fills every section with representative sample values in one shot (including a synthesized one-item collateral entry, built inline with `crypto.randomUUID()` rather than via `addCollateralEntry()`+`updateCollateralEntry()`, since those are two separate async state updates and the sample-fill needs the entry's data present in the same synchronous `setCallReport` call); once complete, the button relabels to "Remove Sample Data" and clicking it resets every field in the report back to its blank default (leaving `AdminContext`'s other steps, and the read-only Application Details data pulled from `RegistrationContext`, untouched). `clientType` still exists on `CallReport` (kept for potential future use) but currently has no rendered UI anywhere, since the card that used to show it was removed.

### Multi-application list & read-only samples

`ApplicationListView` (`src/sections/admin/application-list-view.tsx`, rendered at
`/admin/credit-checking` — see "The Application List is no longer its own page"
above) shows **multiple applications**, not just one: the one **live** application (the real
`useRegistration()` session, fully interactive as described throughout this doc) plus
**5 hardcoded read-only sample applications** (`src/sections/admin/sample-applications.ts`,
`SAMPLE_APPLICATIONS`), one parked at each of the 5 review steps (Initial Credit
Checking, Reconsideration, Call Report, Transaction Type, Requirement Checklist) so
every step always has content to show, even the ones the live application has
already passed through or hasn't reached yet. Each sample carries its own
`RegistrationState` (name, loan details, personal info, backdated `submittedAt` for
realistic aging) and a `step` — there is **no `ApplicationReview` state for
samples** (no CIBI form, no uploads, no decision state) since they're display-only.

- **Why read-only, not fully interactive:** making all 6 applications fully workable
  (independent Approve/No, CIBI forms, uploads, etc. per applicant) would require
  reworking `AdminContext`/`RegistrationContext` from "one global review/application
  object" to a map keyed by applicant id, touching nearly every admin screen. That
  was explicitly deferred as a larger, separate change — this iteration prioritized
  not risking the one fully-verified live flow. See `SampleApplicationView` below.
- **`?step=<reviewStep>` filtering (always on, no "show all" state):**
  `ApplicationListView` reads `useSearchParams()` and always filters rows to
  exactly one step — defaulting to `creditChecking` when there's no `step` param.
  This is what the sidebar's step sub-links deep-link into.
- **The live application appears on every step's list, always clickable
  everywhere — a deliberate "inspect any state" model.** The goal: an admin can
  open the live application's screen for *any* step at any time, not just
  whichever one she's technically "at" right now. `ListRow` is generated once
  per step in `STEP_ORDER` for the live application
  (`liveRows: ListRow[] = STEP_ORDER.map((step) => ({ ..., step, isActionable:
  true }))`), so she's always present on every step's filtered list, and every
  one of those rows is fully clickable — clicking her row on Initial Credit
  Checking always opens that screen; clicking her row on Call Report always
  opens that screen; and so on, regardless of which step `stepTimestamps` says
  she's actually reached. This went through two iterations: the first only made
  her clickable on her one "true current" step (everywhere else inert, to avoid
  ambiguity about which row was actionable) — but the actual goal was letting an
  admin inspect her application's state at *any* step on demand, so that
  restriction was removed; `isActionable` is now unconditionally `true` for
  every live row.
- **Row identity:** each row shows a "Sample" chip for the 5 non-live applications
  (the live one has none), plus the same aging badge, officer, and status chip
  treatment as before. On any given step's filtered list, the live application's
  row always sorts first (`.sort((a, b) => Number(b.isLive) - Number(a.isLive))`),
  ahead of that step's sample, since she's always the "real" one and the sample
  is just filler.
- **`ListRow.isActionable`** still exists as the field driving whether a row
  renders as a clickable `ButtonBase` (with the forward-arrow icon and
  `handleRowClick`) vs. a plain non-interactive `Box` — it's `true` for every
  live row and `false` for every sample row. Samples remain permanently
  non-clickable (historical/demo filler only); the live application is
  unconditionally clickable on all 5 steps.
- **Step chip vs. status chip — fixed a real duplicate-label bug:** each row shows
  two chips: the step (`STEP_LABELS[row.step]`, e.g. "Call Report") and a status
  (`row.statusLabel`). `SAMPLE_APPLICATIONS` used to carry its own per-entry
  `statusLabel` string that duplicated (or nearly duplicated) the step name itself
  — e.g. a "Call Report" step chip sitting right next to a second "Call Report"
  chip, or "Reconsideration" next to a mismatched "In Reconsideration". That field
  was removed entirely from `SampleApplicationEntry`; all sample rows now use
  `DECISION_LABEL.pending` (the same "Pending Review" status the live application
  starts with) as their status chip, since none of them have a real decision —
  giving the two chips genuinely different information instead of repeating the
  same text twice per row.
- **Fixed a real routing bug while building the above:** `handleRowClick` for
  the live application used to always route to `paths.admin.creditChecking(id)`
  regardless of the row's actual step — so clicking the live application's row
  from, say, the Call Report filtered list incorrectly sent the admin back to
  Initial Credit Checking instead of Call Report. Fixed with a `STEP_TO_PATH`
  lookup (`Record<ReviewStep, (id: string) => string>`) that picks the correct
  per-step path builder from `paths.admin` based on `row.step`.
- **`SampleApplicationView`** (`src/sections/admin/sample-application-view.tsx`,
  route `/admin/applications/sample/[email]`): a standalone, read-only detail screen
  — applicant info, loan request, personal/ID fields, uploaded ID + selfie previews,
  and the step badge — with an info banner explicitly stating it's a sample with
  "nothing to approve or submit here." It does not use `ApplicationReviewHeader` or
  `ApplicationDetailsCard` (both of those read from the live `useRegistration()`
  context directly) — it's a parallel, parameterized version of the same visual
  layout driven by the sample's own data instead.

**Account/credit officer auto-tagging**: per the diagram's dashed "Auto tagging
of account officer and credit officer" note (fires when the borrower submits,
before Initial Credit Checking), `assignMockOfficer(email)` in
`src/auth/registration-context.tsx` deterministically hashes the applicant's
email into one of 4 mock officer names and stores it as
`application.assignedOfficer`, set inside `markSubmitted()`. No real officer
accounts exist in this prototype — this is a stand-in so the field isn't
empty. Shown in `ApplicationReviewHeader` (next to the step badge) and as a
subtitle on the Application List row.

**Negative List** (`/admin/negative-list`, `src/sections/admin/negative-list-view.tsx`,
state in `AdminContext.negativeList`): implements the diagram's "Populate
record in Negative List" system box. `addToNegativeList()` fires from
`ReconsiderationView`'s **No — Notify Client** path (the only point in the
built flow where a client is definitively turned away) and records
name/email/reason/timestamp, deduped by email. Viewable via the sidebar's
**"For Reconsideration"** section (nested alongside Reconsideration itself — see
"Two independent collapsible sidebar sections" above) — a simple read-only list,
no search/remove yet since there's only ever one applicant in this prototype.

**Not yet built** (visible in the source flowchart but out of current scope):
- Transaction types 4–8 (Compromised, Restructured, Rollover, Extension,
  Repricing) — still a single "coming soon" placeholder; the diagram's "CA"
  off-page connector for these types was explicitly scoped out rather than
  guessed at
- The "3" off-page connector after Requirement Checklist (implies a further
  page of the process not shown in the diagram provided)
- Real CIBI/CIC/CMAP/NFIS/LOANDEX integrations (only CIBI has an API per the diagram)

**Floating "Fill with Sample Data" / "Remove Sample Data" toggle (Initial Credit
Checking only)**: a floating action button fixed to the bottom-right of
`InitialCreditCheckingView`, always visible (no longer additionally gated on
`NODE_ENV` — see the "Known issues" entry on the `NODE_ENV` gate removal below),
with its label and behavior driven by the pre-existing `canDecide` boolean.
While `!canDecide`, one click (`handleFillSampleData`) fills the entire screen
to a decidable state in one step: uploads the document, sets the AI summary/
recommendation directly (skipping the animated `setInterval` steps), fills
and submits the CIBI form (including a sample report), and uploads all four
bureau reports (LOANDEX/CIC/CMAP/NFIS-BAP) — letting a tester skip the
manual click-through and jump straight to Approve/No. Once `canDecide` becomes
true, the button relabels to "Remove Sample Data" and clicking it calls
`handleClearSampleData()` instead — a scoped undo of exactly the fields
`handleFillSampleData` set (document/AI fields on `creditChecking`, the CIBI
form, and the four bureau uploads), deliberately not `resetReview()`, which
would also wipe unrelated steps (Reconsideration, Call Report, Transaction
Type, Requirement Checklist) this button has no business touching. The Officer
Notes textarea is untouched by either direction, since it's a separate field.
`computeInstallment` was exported from `cibi-form-card.tsx` so
`handleFillSampleData` can reuse the same installment math instead of
duplicating it.

**1-Column / 2-Column layout toggle (Initial Credit Checking only)**: a second
floating pill button, fixed bottom-right directly below the "Fill with Sample
Data" / "Remove Sample Data" button (`bottom: 24` vs. that button's
`bottom: 84`, both `right: 24` so they stack rather than overlap), `md`+ screens
only — hidden below that breakpoint since a rigid two-column layout doesn't
work on narrow viewports. Labeled "Switch to 2-Column Layout" / "Switch to
1-Column Layout", backed by local `isSplitLayout` state in
`InitialCreditCheckingView` — a pure display preference, not persisted to
`AdminContext`/sessionStorage, so it resets to the 1-column default on
navigation or refresh. This button was originally placed inline next to
`ApplicationReviewHeader`, but that broke the header's own internal row layout
(`ApplicationReviewHeader` is a self-contained full-width block with its own
"‹ Application List" row, loan-info card, and aging alert — squeezing another
button into a `Stack direction="row"` alongside it competed for horizontal
space and visually broke it) — moved to a floating button instead, and
`ApplicationReviewHeader` is rendered on its own again, full width, unchanged
from before this feature. All the page's cards
(everything after `ApplicationDetailsCard`) were factored into a
`rightColumnCards` JSX variable so both layouts render identical card content —
only the surrounding structure differs:
- **1-column (default)**: unchanged — `Container maxWidth="md"`, everything in
  one stacked `Stack`, `ApplicationDetailsCard` on top followed by
  `rightColumnCards`.
- **2-column**: `Container maxWidth="xl"` (needs the extra width two columns
  require), a `Stack direction="row"` splitting into a fixed ~440px left column
  holding only `ApplicationDetailsCard` — `position: sticky` so it stays in view
  while the right side scrolls — and a flexible right column rendering
  `rightColumnCards` in the same order as the 1-column layout. On `xs`/`sm` the
  split `Stack` falls back to `direction: 'column'` regardless of
  `isSplitLayout`, so the two-column arrangement never actually applies below
  `md`.
- **Tuned narrow-column spacing in `ApplicationDetailsCard`** (initially 380px,
  widened to ~440px, plus tighter internal spacing) after the first version felt
  cramped in the sidebar — `DetailField`'s `minWidth` was 140px with 28px
  (`spacing={3.5}`) gaps between fields, which in a narrow column only fit one
  field per row and made every section (Applicant, Loan Request, Personal & ID)
  wrap into an awkward single-column stack instead of the 2-per-row grid it
  reads as in the 1-column layout. Reduced `DetailField`'s `minWidth` to 120px,
  reduced the row `spacing`/`rowGap` on every field group from `3.5`/`2` to
  `2.5`/`1.75`, and added `wordBreak: 'break-word'` to the value text (some
  values, like addresses, are long enough to overflow a field this narrow
  otherwise). This card is shared with Call Report and Reconsideration too, so
  the tighter spacing applies everywhere, not just the split layout — it reads
  fine at full width as well, just slightly denser.

### Application aging

Tracks how long an application has been in review overall, and how long it's
been sitting on its current review step — surfaced to admins so nothing goes
stale silently.

- **Clock start**: `application.submittedAt` (`src/auth/registration-context.tsx`),
  set once by `markSubmitted()` when the borrower reaches the Thank You screen
  at the end of onboarding — not when an admin first opens the application.
- **Per-step clock**: `review.stepTimestamps` (`src/auth/admin-context.tsx`), a
  `Partial<Record<ReviewStep, string>>` where `ReviewStep` is one of
  `'creditChecking' | 'reconsideration' | 'callReport' | 'transactionType' |
  'requirementChecklist'`. `markStepEntered(step)` writes an ISO timestamp the
  first time an admin lands on that step and is a no-op on repeat visits, so
  revisiting a step doesn't reset its clock.
- **Formatting**: `formatAging(fromIso, toIso?)` in `src/utils/format-aging.ts`
  renders the delta as `Xd Yh` / `Xh Ym` / `Xm` / `<1m`.
- **Staleness levels**: `getAgingLevel(fromIso)` (same file) buckets total
  aging into `'normal' | 'warning' | 'overdue'` — warning past 1 day, overdue
  past 3 days — so admins can spot a stuck application without doing the math
  themselves. `AGING_LEVEL_COLORS` maps each level to a text/icon color
  (neutral gray → amber → red). Applied to the *total* aging figure only (not
  the per-step figure) in both display locations below; the overdue level also
  swaps the hourglass icon for a warning-triangle icon.
- **Where it shows**:
  - Application List row (`application-list-view.tsx`) — total aging since
    submission, next to the status chip.
  - `ApplicationReviewHeader` (`application-review-header.tsx`), on every
    review screen — total aging since submission, plus "On this step" aging
    since `markStepEntered` fired for that screen's `reviewStep`. The header
    calls `markStepEntered` itself via a `useEffect` keyed on the `reviewStep`
    prop, so each view only has to pass its step name.
- **Design decisions**: "Endorsed" (end of `RequirementChecklistView`) is
  treated as the practical end of tracked aging — there's no separate
  "Released" step or release timestamp. Aging is not tracked from admin
  first-view, only from borrower submission, since the flowchart's "aging"
  concept was scoped to the whole application lifecycle, not queue wait time.
- **Stale-application signals** (built on top of the aging levels above, so
  admins don't have to notice staleness themselves):
  - **Warning banner** — `ApplicationReviewHeader` shows a dismissible MUI
    `Alert` (amber for `warning`, red for `overdue`) whenever the *current
    step's* aging level is non-normal: "This application has been on `<step
    label>` for `<duration>`" (overdue adds "— it needs attention."). Keyed
    off `stepEnteredAt`, not total aging, since it's meant to flag a
    specific step stalling, not the whole application. Dismissal is local
    `useState` — it resets if the admin navigates away and back, by design
    (a stale application should keep resurfacing, not be permanently
    silenced from one click).
  - **Dashboard overdue count** — `AdminDashboardView` has a fourth stat
    card, "Overdue (3d+)", counting applications where total aging
    (`getAgingLevel(application.submittedAt)`) is `'overdue'`. Currently
    always 0 or 1 since there's only ever one application in this
    sessionStorage-backed prototype; the card is built to scale once real
    multi-application data exists.

---

## Theming

- **Font:** Plus Jakarta Sans everywhere (`src/theme/core/typography.ts` —
  `primaryFont` and `secondaryFont` both point to it; the old Public Sans/Barlow
  split from the original Minimal-UI template was retired in the re-theme).
- **Primary navy:** `#1C2A6E` (hover/dark: `#14205A`)
- **Accent blue:** `#4361EE` (mapped to MUI `info.main`)
- **Success:** `#12B76A` · **Warning:** `#F79009` · **Error:** `#F04438`
- **Auth/onboarding-specific literals** (not in the shared MUI palette, reused by
  convention across auth + admin screens): border `#E1E4ED` / `#EBEDF3`, muted text
  `#8891A6` / `#667085` / `#5A6273`, form label `#3B4256`, heading text `#14172A`,
  active-nav bg `#EEF1FE`.
- Shared field styling lives in `src/sections/auth/auth-input-styles.ts`
  (`authFieldSx`, `authFieldLabelSx`, `authPrimaryButtonSx`) — reused by Sign Up,
  Login, Admin Login, and every onboarding step form.
- `AuthBrandPanel` (`src/sections/auth/auth-brand-panel.tsx`) is the shared dark
  textured side panel used by borrower **Sign Up, Verify, and (borrower) Login** —
  animated floating circles + a faint wavy texture overlay
  (`/images/background/texture-strong.png`, tuned to low opacity, large tile size —
  do not restore the original 0.35 opacity, it was explicitly toned down after user
  feedback).
- **Admin Login does NOT use `AuthBrandPanel`.** It was deliberately given a
  different layout from the borrower screens (explicit user request): a full-bleed
  dark textured background (same texture asset/treatment) with a **centered white
  card** floating in the middle, rather than a side-by-side split panel. See
  `src/sections/admin/admin-login-view.tsx` — it inlines its own texture/circle
  treatment instead of reusing `AuthBrandPanel`, since the shared component is
  structurally a side panel, not a background.
- **Welcome step** (`src/sections/auth/onboarding/step-welcome.tsx`, the full-bleed
  dark splash right after OTP verification) also inlines its own texture + animated
  floating circles rather than reusing `AuthBrandPanel` (same reasoning — it's a
  full-bleed background, not a side panel). It intentionally has **no icon badge**
  above the headline (removed per user request) and uses smaller heading sizes
  (32/24px) than the earlier iteration, to match the scale of the rest of the
  re-themed flow rather than the original Figma-literal sizing. Its CTA buttons are
  bottom-anchored (own `Stack` above the footer logo, separate from the centered
  heading/copy block) rather than sitting inline with the text, and the primary CTA
  reads "Continue to Loan Application" (not just "Continue").
- **Borrower dashboard empty-state hero card** (`EmptyDashboardState` in
  `src/sections/borrower/dashboard-view.tsx`) also carries the same texture +
  animated floating-circle treatment as the auth screens above (scaled down to fit
  the smaller card), so the "You don't have any loans yet" dark navy card is
  visually consistent with Sign Up / Verify / Welcome / Admin Login rather than
  being a flat gradient.
- MUI's shared global button/input theme overrides (`src/theme/core/components/`)
  were deliberately **not** changed during the re-theme, to avoid regressing the
  rest of the marketing site — auth/admin screens style buttons/inputs via local
  `sx`, not global overrides.

---

## Known issues / caveats

- **`NODE_ENV`-gated demo buttons removed.** Every "Fill with Sample Data" /
  "Clear Sample Data" / "Reset Application" / "Skip to Dashboard" button used to
  be wrapped in `process.env.NODE_ENV !== 'production' && (...)`. Next.js sets
  `NODE_ENV=production` for any `next build` + `next start` run — not just real
  deployments — so simply building and starting the app locally (rather than
  running `next dev`) made every one of these buttons vanish, which looked like
  a bug ("the Fill with Sample Data button disappeared") but was actually the
  gate working as coded. Since this app is a demo/prototype with no real
  backend or real users to protect from dev tooling, all `NODE_ENV` gates on
  these buttons were removed — they now always render. If a genuine need for a
  prod-only-hidden affordance comes up later, gate on something more
  intentional than `NODE_ENV` (e.g. an explicit `NEXT_PUBLIC_DEMO_MODE` flag),
  so a plain production build doesn't silently hide it again.
- **Registration/admin context hydration race — fixed for admin routes.**
  `RegistrationProvider` and `AdminProvider` both start with `initialState` and
  hydrate from `sessionStorage` in a `useEffect` on mount; both now expose a
  `hydrated` boolean (`useRegistration().hydrated` / `useAdmin().hydrated`) for
  consumers that need to tell "genuinely empty" apart from "hasn't loaded yet."
  All four admin route guards (`src/app/admin/{applications,credit-checking,
  dashboard,negative-list}/layout.tsx`) wait on `hydrated` before checking
  `adminUser` and redirecting to `/admin/login` — previously they checked
  `adminUser` on the very first render, before the provider's own hydration
  effect had run, so **any hard refresh on an admin page bounced the admin back
  to `/admin/login`** even though their session and all filled-in review fields
  were still sitting in `sessionStorage`; logging back in and re-opening the same
  application then looked like the fields had been wiped, when really the admin
  had just been logged out and was seeing a fresh page load. Borrower-side guards
  (e.g. `/auth/onboarding`) have the same shape but were not part of this fix —
  if the same symptom shows up there, apply the identical `hydrated`-gating fix.
  When testing with Playwright, walking the UI from the entry point
  (`/auth/sign-up`, `/admin/login`) rather than deep-linking with `page.goto()`
  still avoids the borrower-side version of this race.
- **No real backend.** Everything resets on `sessionStorage.clear()` / closing the
  tab. There is no persistence across browsers or devices.
- **Marketing site colors not migrated.** The re-theme (Plus Jakarta Sans, navy
  `#1C2A6E`) was scoped to auth + borrower + admin portals only. The public
  marketing pages (home, about, loan product pages, contact, footer/header) and the
  old `Login` view's original hardcoded `#1C388C`/`#0B1E59` references elsewhere in
  the codebase were **intentionally left untouched** — do not assume the whole site
  shares one palette.
- `src/layouts/auth/` (`AuthLayout`, `Section`) is now dead code — no page imports
  it anymore after Login/Sign Up/Verify were rebuilt as full-bleed layouts. Left in
  place rather than deleted (not requested).

---

## Where to look for X

| Need to change...                          | File(s) |
|---------------------------------------------|---------|
| A route path                                 | `src/routes/paths.ts` |
| Borrower session shape                       | `src/auth/registration-context.tsx` |
| Admin session / review-state shape           | `src/auth/admin-context.tsx` |
| Demo login credentials                       | `src/auth/mock-login.ts` |
| Onboarding step content                      | `src/sections/auth/onboarding/step-*.tsx` |
| Admin review-flow screen content             | `src/sections/admin/*-view.tsx` |
| Shared auth field styling                    | `src/sections/auth/auth-input-styles.ts` |
| Dark textured side panel (borrower auth)     | `src/sections/auth/auth-brand-panel.tsx` |
| Admin login layout/background                | `src/sections/admin/admin-login-view.tsx` |
| Sample admin application data (live)          | `src/sections/admin/sample-application.ts` |
| Sample admin application data (read-only x4)  | `src/sections/admin/sample-applications.ts` |
| Theme colors / fonts                         | `src/theme/core/colors.json`, `src/theme/core/typography.ts` |
| Sidebar nav items (borrower / admin)         | `src/layouts/borrower/config-nav-borrower.tsx`, `src/layouts/admin/config-nav-admin.tsx` |
