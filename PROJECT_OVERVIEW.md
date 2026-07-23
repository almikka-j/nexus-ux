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

There is **no real backend**. All "data" lives in the browser's `localStorage` via
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
    registration-context.tsx   Borrower session state (localStorage: hhc-lms-registration)
    admin-context.tsx          Admin session + review state (localStorage: hhc-lms-admin-session)
    mock-login.ts               Mocked borrower + admin login, mocked OTP
  layouts/
    borrower/               Borrower app shell (sidebar + topbar)
    admin/                   Admin app shell — top nav bar by default (side nav available via floating settings toggle)
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
localStorage key: `hhc-lms-registration`

```ts
SignUpData     { prefix?, firstName, middleName?, lastName, extensionName?, email, mobile,
                 password, marketingConsent, termsAccepted }
// password stays '' permanently — the borrower is never asked to set one; see
// docs/BORROWER_SIGNUP_FLOW.md. termsAccepted flips true from the Selfie
// screen's consent checkboxes, not a dedicated step.
LoanType       'personal' | 'business'
FinancialInfo  { desiredLoanAmount, loanTermMonths, employmentStatus, monthlyIncome, loanPurpose,
                 businessType?, businessDocument? }
// loanPurpose is a single string — multiple Preliminary Application selections are
// joined with ", ". businessType/businessDocument collected only when
// employmentStatus === 'Business Owner' (businessDocument is a base64 data URL).
PersonalInfo   { idType, idNumber, idFile, idFileBack, birthday, address, province,
                 city, barangay, zipCode, civilStatus, gender, tinNumber,
                 referralSource, spouseName?, spouseBirthday?, spouseAddress?,
                 spouseProvince? }
// spouse fields collected only when civilStatus === 'Married'. idFileBack is
// non-null only for two-sided ID types (Driver's License/UMID/SSS ID/PhilHealth
// ID) — null for PhilSys/National ID and Passport. See "ID type-dependent
// front/back upload" below. birthday is the borrower's own (distinct from
// spouseBirthday).
ApplicationData { loanType, financialInfo, personalInfo, selfieVerified, selfiePhoto,
                   submittedAt, assignedOfficer }
// loanType/financialInfo/personalInfo nullable until each step submits; selfieVerified
// defaults false; selfiePhoto/submittedAt/assignedOfficer default null

PreliminaryStatus 'declined' | 'qualified' | null

RegistrationState { signUpData, verified, preliminaryStatus, application }
```

Exposed via `useRegistration()`: `hydrated`, `setSignUpData`, `setVerified`,
`setPreliminaryStatus`, `setLoanType`, `setFinancialInfo`, `setPersonalInfo`,
`setSelfieVerified`, `setSelfiePhoto`, `markSubmitted()`, `loadSample(state)`,
`reset()`.

**`PersonalInfo.idFile` is a data URL string, not a `File` object.**
`step-personal-info.tsx` converts the uploaded `File` via
`src/utils/file-to-data-url.ts` (`fileToDataUrl`) before calling
`setPersonalInfo` — this matters because localStorage persistence goes through
`JSON.stringify`, and a raw `File` object serializes to `{}` (silently losing the
upload). `application.selfiePhoto` is already a data URL (captured straight off a
`<canvas>` in the selfie step) so it needs no conversion, just storage via
`setSelfiePhoto`. Both images are rendered directly in the admin's
`ApplicationDetailsCard` (see Admin flow below) — this is the only reason either
field needs to survive as a displayable string rather than an in-memory File/Blob.

`hydrated` flips to `true` once the provider has finished reading `localStorage`
on mount — consumers that need to distinguish "genuinely empty" from "hasn't loaded
yet" (e.g. the admin sample-application auto-load below) must gate on it, per the
hydration race caveat further down this doc. `loadSample(state)` replaces the entire
registration state wholesale (used by the admin portal to seed a demo application —
see below).

### Admin: `src/auth/admin-context.tsx`
localStorage key: `hhc-lms-admin-session`

```ts
AdminUser            { email, firstName, lastName }
CreditChecking        { documentUploaded, documentName, decision, bureauFindingStatus,
                        notes, decisionReason }
                        — aiSummary/aiRecommendation are NOT stored; computed at render
                        time in initial-credit-checking-view.tsx from the uploaded bureau
                        reports + application details (see
                        docs/ADMIN_INITIAL_CREDIT_CHECKING.md). bureauFindingStatus
                        ('pending'|'clean'|'negative') is the simulated AI bureau-review
                        outcome — see "Negative Credit Report" below.
NegativeCreditReport  { thru, negativeRecordText, accountFindings, cancelledCreditCards,
                        adverseClassifiedLoans, closedCurrentAccounts, recommendationRemarks,
                        submitted } — see "Negative Credit Report" below. The four list
                        fields are NegativeReportEntry[] ({ id, label, findings }).
Reconsideration       { notes, decision }
CallReport            { approved, ...~75 structured fields across 9 sections — see
                        "Call Report" below }
RequirementChecklist  { documents, collateralNotes, endorsed, returnedToApplicant,
                        returnReason } — documents is RequirementDoc[] (fixed
                        24-document list across 3 tabs, not a flat checklist of
                        checked/unchecked items). See
                        docs/ADMIN_REQUIREMENT_CHECKLIST.md.

ApplicationReview { creditChecking, reconsideration, negativeCreditReport, callReport, requirementChecklist }
```

Exposed via `useAdmin()`: `setAdminUser`, `setCreditChecking`, `setReconsideration`,
`setNegativeCreditReport`, `addNegativeReportEntry`, `updateNegativeReportEntry`,
`removeNegativeReportEntry`, `resetNegativeCreditReport`, `setCallReport`,
`addCollateralEntry`, `updateCollateralEntry`, `removeCollateralEntry`,
`setRequirementChecklist`, `logout()`.

**Important limitation:** the admin portal does *not* have its own applicant
database. There is exactly one **"live" application** — whichever one exists in the
current browser's `useRegistration()` localStorage (or none) — plus a fixed set of
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
`localStorage` by hand. `AdminContext.resetReview()`
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

**"Fill with Sample Data" is a toggle, not a one-shot action, in most of these
spots.** Clicking it a second time (once already filled) flips it to a "Remove
Sample Data" button that clears the form/state back to blank — the label always
reflects current fill state. Covered: Preliminary Application, login, admin login
(react-hook-form `reset()` toggling between the sample values object and a
blank-values object, tracked via a local `isSample` boolean state, since
react-hook-form has no built-in "is this filled with X" check); the Verify
screen's Create Password sub-step (same pattern, Password/Confirm/consent
checkboxes); `/borrower/apply`'s Loan Type step (unaffected by the 2026-07-15
restructuring — toggles `application.loanType` between `'personal'` and `null`,
`setLoanType`'s type signature is `(loanType: LoanType | null) => void` to allow
this) and its Financial Info/Personal Info steps (toggle between the sample
values and the step's own hydrated `defaultValues` — **not** hardcoded blanks,
since these steps can already be pre-filled from a prior session); onboarding's
Personal Info step (still used by the primary flow, retitled "Upload ID" —
its sample-fill populates a Married example instantly (no OCR delay to skip
anymore) so the conditional Spouse Information section is exercised too); and
Initial Credit Checking's page action, which toggles based on
`allBureauReportsUploaded` and calls a new `handleClearSampleData()` — a
scoped undo of exactly what `handleFillSampleData()` sets (`creditChecking`'s
document/AI fields, the CIBI form, and the four bureau uploads) — deliberately
**not** `resetReview()`, since that clears the entire `ApplicationReview`
including unrelated steps (Reconsideration, Call Report, Requirement
Checklist) this button has no business touching. The Officer Notes
field is untouched by this clear, since it's a separate, intentionally-persistent
field.

**Left as one-directional, not converted to a toggle:** the Application
List's "Clear Sample Data" (already the remove side of a pair, paired with an
auto-load `useEffect` rather than a fill button), and the borrower dashboard's
"Reset Application" (already one-directional, paired with a distinct empty-state
screen rather than a fill button).

---

## Borrower flow

> **Restructured 2026-07-16** — see `docs/BORROWER_SIGNUP_FLOW.md` for the
> full step-by-step writeup. Summary: the flow is a **Loan Application
> experience**, not account registration. The borrower is never asked to
> manually create a password — Preliminary Application screens eligibility
> (₱150,000 minimum) before any account exists; once qualified, Mobile OTP
> Verification alone auto-creates/activates the account, landing on an
> auto-advancing Welcome screen before Upload ID (no OCR/extraction —
> removed since; every field is plain and directly editable); Selfie
> Verification folds in Terms/Privacy/consent right before final submit;
> Application Confirmation shows real derived data (reference number,
> dates, status). **2026-07-16 also added:** Purpose of Loan is now
> multi-select, Desired Loan Amount auto-formats with thousands separators,
> selecting "Business Owner" as Source of Income reveals a Business Type
> select + a business-document upload whose required document changes per
> type (Corporation → GIS, Cooperative → CDA, Sole Proprietorship → DTI
> Certificate, Partnership → SEC Certificate), and a Terms & Conditions/
> Privacy Policy consent checkbox on Preliminary Application itself.
> **Later same-day revisions:** the OCR "reading"/review flow on Upload ID
> was removed entirely (flat form, no delay); First/Middle/Extension Name
> fields moved there (Preliminary Application only collects Surname); ID
> Type now determines front-only vs. front+back upload; and the onboarding
> wizard's Upload ID/Selfie Verification steps no longer use the
> split-panel `AuthBrandPanel` layout — both render centered on plain white.

```
/auth/sign-up (Preliminary Application: name/email/mobile/purpose(multi)/amount/term/income/[business info]/consent)
  → [soft-decline in place, if desired loan < ₱150,000 — no navigation, no account created]
  → /auth/verify (OTP only — no password step; [Verified animation] → account auto-created)
  → /auth/onboarding (Welcome (auto-advances) → Upload ID (flat form, no OCR) → Selfie Verification (+ consent) — 3 steps)
  → /auth/thank-you (Application Confirmation: reference #, dates, status)  →  /borrower/dashboard
```

Preliminary Application and Verify share the **split-panel layout** — blue
`AuthBrandPanel` on the left, form card on the right, no progress bar. The
onboarding wizard's Welcome step is full-bleed (its own dark-blue treatment,
not `AuthBrandPanel`); its Upload ID/Selfie Verification steps render
centered on plain white with no side panel at all.

`/borrower/apply` (filing a second application from the dashboard) was
**intentionally left untouched** by both the 2026-07-15 and 2026-07-16
restructurings — it's still the original 4-step wizard (Loan Type →
Financial Info → Personal Info → Selfie), with no Preliminary screening, no
multi-select Purpose of Loan, no Business Type/document fields, and no
re-verification step. Bringing it in line with the new flow is a known
follow-up, not yet requested.

**Loan Type is no longer collected from borrowers.** `application.loanType`
stays `null` for every new sign-up (the type/setter still exist in
`RegistrationContext` since `/borrower/apply` still uses them). The borrower
dashboard's loan-type label (`'Business Loan'`/`'Personal Loan'` based on
`application.loanType === 'business'`) now always shows "Personal Loan" for
freshly-submitted applications — an accepted, unfixed cosmetic side-effect,
not a bug. This is distinct from the new **"Business Owner" income source**
on Preliminary Application, which only sets `FinancialInfo.businessType`/
`businessDocument`, never `application.loanType`.

**Preliminary Application only collects Prefix + Surname.** First/Middle/
Suffix are no longer part of this form — `PreliminarySchema` was trimmed to
`prefix`/`lastName` only, and `SignUpData.firstName`/`middleName`/
`extensionName` stay blank until the borrower fills them in later, on the
Upload ID step's First Name/Middle Name/Extension row (see
"Onboarding welcome step re-added" section below for the current Upload ID
implementation — this row isn't seeded from anything, since there's no OCR
to seed it with; it's a plain blank/editable row). This keeps
`SignUpData`'s shape unchanged (still used pervasively downstream — dashboard
greeting, admin call reports, application detail cards) while shortening the
first screen. The heading/subtitle were also revised: "Step 1 · Loan
Application" / "See how much you qualify for" / "Takes about 2 minutes —
checking won't affect your credit score." (previously "Step 1 · Preliminary"
/ "Preliminary application" / "Let's check if you qualify — no impact on
your credit score.").

**Purpose of Loan is multi-select.** `PreliminaryApplicationView` wires a raw
MUI `Select multiple` through a react-hook-form `Controller` (not
`Field.Select`, which doesn't support multiple selection), rendering chosen
options as `Chip`s. Selected values are joined with `", "` into
`FinancialInfo.loanPurpose` (kept as a single string, not `string[]`, so
every existing admin-side consumer — call report, credit-checking summary
text, application detail cards — keeps working unchanged).

**Desired Loan Amount auto-formats with thousands separators.** Also wired
through a `Controller`: on change, non-digit characters are stripped and the
result coerced to `Number` for the RHF/Zod value, while the displayed string
is reformatted via a small `formatThousands()` helper (e.g. typing `250000`
displays `250,000`). The underlying stored value is still a plain `number`.

**Business Owner conditional fields.** Selecting "Business Owner" as Source
of Income reveals a "Business information" card: a Business Type select
(Corporation / Cooperative / Sole Proprietorship / Partnership) and a
document upload whose helper text names the specific document required for
that type. Both fields are required only when shown, enforced via
`PreliminarySchema.superRefine`. The uploaded document is converted to a
base64 data URL (same `fileToDataUrl()` reasoning as the ID/selfie images)
and stored as `FinancialInfo.businessDocument`. No admin-side view surfaces
these new fields yet — they're stored but not displayed anywhere
admin-side, an accepted gap rather than a bug.

**Business document upload is a compact custom dropzone, not `Field.Upload`.**
The shared `Field.Upload`/`Upload` component (`src/components/upload/upload.tsx`)
is built for photo uploads — a large dashed dropzone that pads to `28% 0`
once a file is selected, plus a `SingleFilePreview` that renders the file as
a full-bleed background image — and stays oversized for a document field
even with `sx` overrides, since that padding lives on the same element the
override targets. `BusinessDocumentUpload` in
`preliminary-application-view.tsx` instead defines a local `CompactDropzone`
component using `useDropzone` (`react-dropzone`, same library `Upload` uses
internally) directly, rendering a single ~44px-tall row: a `FileThumbnail`
icon (`src/components/file-thumbnail/`, which already handles PDF vs. image
icons correctly) + filename + a remove button once a file is chosen, or a
placeholder icon + "Choose a file — {document label}" text when empty. Wired
to the form via a `Controller` on `businessDocument` (`CompactDropzone` takes
plain `value`/`onChange` props so `useDropzone` — a hook — stays at the top
of a real component, not inside the `Controller` render callback, per
`react-hooks/rules-of-hooks`).

**Preliminary Application now requires Terms & Conditions / Privacy Policy
consent.** A `dataConsent` checkbox (Zod: `.refine((v) => v === true)`) sits
right above the submit button, wired through a `Controller` like
`loanPurpose`. Checking it is required to submit; on success its value is
persisted onto `SignUpData.termsAccepted` (previously always defaulted to
`false` on this screen, since nothing here set it). This is in addition to,
not a replacement for, the separate accurate-info / T&C / privacy /
verification-consent block already collected at the final
`step-selfie-verification.tsx` step — that block's own comment documents
consent being collected there deliberately, once, right before submit. Two
consent touchpoints now exist by design: this screen consents to collecting
PII (email, mobile, income) upfront, the later screen consents to ID/selfie
verification processing specifically.

**Blue `AuthBrandPanel` side no longer scrolls with the form.** In
`PreliminaryApplicationView`, the outer row `Stack` uses a capped
`height: '100vh'` (not `minHeight: '100vh'`), and the form column carries its
own `height: '100%'` alongside the existing `overflowY: 'auto'`. Previously,
`minHeight: '100vh'` let the whole row grow taller than the viewport when the
form content was long, so the entire page — including the fixed dark
`AuthBrandPanel` — scrolled together. Now only the white form column scrolls;
the blue panel stays pinned. `onboarding-view.tsx` and `login-view.tsx` still
use the old `minHeight: '100vh'` pattern and have the same latent issue —
not yet fixed there.

**Onboarding welcome step re-added, full-bleed.**
`OnboardingView` (`src/sections/auth/onboarding/onboarding-view.tsx`) now
tracks `step: 0 | 1 | 2` instead of `1 | 2` — `0` is `StepWelcome`
(`src/sections/auth/onboarding/step-welcome.tsx`), shown right after OTP
verification, before Upload ID. `OnboardingView` returns it early
(`if (step === 0) return <StepWelcome .../>`), **before** reaching the rest
of the component — so this step renders standalone. It reuses the original
pre-restructure visual treatment almost verbatim (full-bleed `#132155`
background, texture overlay, two floating gradient circles, centered "Hey
{firstName}! Welcome to PG Finance" message, `LogoFull` at the bottom — see
the dated note above for that original component); the only functional
change is that the old manual "Continue"/"Skip to Dashboard" buttons are
replaced with a "Getting things ready…" spinner, and it **auto-advances to
step 1 after 5 seconds** via `setTimeout` in a `useEffect` — same pattern as
`VerifiedTransition` on the OTP screen — no button or user action required.
The "← Back" link on steps 1/2 is unaffected, still only appears on step 2.

**Steps 1/2 (Upload ID, Selfie Verification) no longer use
`AuthBrandPanel`/the split-panel treatment either.** Both now render inside
a single centered `Stack` (`alignItems: 'center', justifyContent: 'center'`)
on a plain white background — `AuthBrandPanel` was dropped from
`OnboardingView` entirely, not just from step 0. This relies on each step
already self-constraining its own content width (`StepPersonalInfo` to
640px via its own `sx={{ maxWidth: 640 }}`, `StepSelfieVerification` to
460px), so centering them without a competing side panel needed no changes
inside either step component.

**ID type-dependent front/back upload.** `ID_TYPES_REQUIRING_BACK` (a `Set`
in `step-personal-info.tsx`) lists the ID types whose two sides carry
different information — Driver's License, UMID, SSS ID, PhilHealth ID —
and for those, the single "Upload a valid ID" dropzone is replaced with two
side-by-side dropzones, "Upload ID — Front" / "Upload ID — Back", both
required (enforced via `PersonalInfoSchema.superRefine`, which adds an
issue on `idFileBack` when a two-sided type has none). PhilSys/National ID
and Philippine Passport keep the original single dropzone, since neither
has a second side worth scanning (blank/QR-only back, and booklet page,
respectively). Switching `idType` away from a two-sided type clears any
already-uploaded `idFileBack` via a `useEffect` keyed on a
`useRef`-tracked previous `idType` value — same clear-on-type-change
pattern as `businessDocument` on Preliminary Application. The back image
converts to a base64 data URL the same way as the front (`fileToDataUrl()`)
and is surfaced admin-side too: `application-details-card.tsx` renders a
second `DocumentPreview` ("Uploaded ID — Back") whenever
`personalInfo.idFileBack` is set.

**Front/Back ID dropzones are a custom fixed-height component, not
`Field.Upload`.** `IdUploadSlot`/`IdUploadField` in `step-personal-info.tsx`
(via `useDropzone` + a `Controller`) replaced `Field.Upload` for both
slots — `Field.Upload`'s underlying `Upload` component pads to `28% 0`
once a file is selected (`src/components/upload/upload.tsx`), so an empty
Back slot next to a filled Front slot rendered at different heights, and
both were oversized regardless. `IdUploadSlot` is a fixed 140px
(`ID_UPLOAD_HEIGHT`) box for both Front and Back — same size whether empty
or filled — with a compact icon+label prompt when empty, or a cropped
`object-fit: cover` image preview plus a small remove (×) button once a
file is chosen.

**Upload ID — OCR simulation removed, flat form, ID Type shown first,
upload box gated behind it.** `src/sections/auth/onboarding/step-personal-info.tsx`
(`StepPersonalInfo`, onboarding step 1 of 2 — i.e. the first of the two
form steps, not counting the auto-advancing Welcome step 0) used to
simulate OCR extraction (a 2.2s "Reading your ID…" spinner, then a
"review" section that progressively revealed the remaining fields).
**That's gone** — no delay, and no progressive reveal for the form fields
(ID Number, Name, Birthday, Address, etc. are all always visible). The
upload box is the one deliberate exception: `{!!idType && (...)}` means it
only renders once ID Type is chosen — before that, the screen shows just
the ID Type select, alone. Order, top to bottom: **ID Type** (select,
alone at first) → upload dropzone(s), appearing once ID Type is set → ID
Number → **First Name/Middle Name/Extension** → **Birthday/Gender** →
Address → **Province/City/Barangay/Zip Code** → an "Additional
information" section label → Civil Status → (Spouse Information, if
Married) → TIN Number → Referral Source → "Continue →". Heading/copy also
changed: "Step 1 · Upload ID" / "Upload a valid ID" (previously "Step 1 ·
ID Verification" / "Verify your ID"), button label "Continue →" (previously
"Confirm & Continue").

**Instant auto-fill on upload, no delay.** The moment the front ID image is
selected, `AUTOFILL_VALUES` (a fixed object in `step-personal-info.tsx`:
ID Number, First Name, Middle Name, Birthday, Address, Province, City,
Barangay, Zip Code) populates any of those fields the borrower hasn't
already typed into — driven by a `useEffect` on the `idFile` field value,
guarded by a ref so it only fires once per new upload. This is explicitly
**not** real OCR (there's no OCR/AI service anywhere in this codebase);
it's an instant, honest-about-being-fake UX convenience, replacing the
prior simulated "reading" delay entirely rather than reviving it with a
spinner.

**First/Middle/Extension Name moved here from a "Full name" field.** There
used to be a single "Full name" text field, seeded with just the Surname
from Preliminary Application (no real OCR, so nothing was actually
extracted). That's replaced with three separate fields — First Name
(required), Middle Name (optional), Extension (optional) — matching
`SignUpData`'s existing shape. `StepPersonalInfo`'s
`onSubmitApplication(data: PersonalInfo, nameFields: PersonalInfoNameFields)`
callback signature grew a second argument for this — the name fields aren't
part of `PersonalInfo` at all, they route to `SignUpData` instead. Both
consumers (`OnboardingView.handlePersonalInfo` and
`LoanApplicationView.handlePersonalInfo` in `loan-application-view.tsx`,
`/borrower/apply`'s second-application flow, which shares this same
component) merge the returned name fields into `SignUpData` via
`setSignUpData()`, and both pass a `nameDefaultValues` prop sourced from the
existing `signUpData` so a returning borrower's name pre-fills. Surname
itself isn't shown or re-editable on this screen.

**New fields: `PersonalInfo.birthday` and `.zipCode`.** Birthday is the
borrower's own (distinct from the existing `spouseBirthday`); Zip Code
joins Province/City/Barangay in the address row. Both are required, both
surfaced admin-side in `application-details-card.tsx`'s "Personal & ID
information" section.

**Spouse's Address split into Address + Province.** If Civil Status is
Married, the conditional Spouse Information box still appears (Spouse's
Name, Spouse's Birthday, "Same address as spouse" checkbox), but "Same
address as spouse" unchecked now reveals **two** fields — Spouse's Address
and Spouse's Province (`PersonalInfo.spouseProvince`, new) — mirroring the
borrower's own Address/Province split, rather than one free-text address
field. Checked copies both `address` and `province` from the borrower's
own fields. Both required when shown, via `PersonalInfoSchema.superRefine`.

**Selfie with ID verification** (`src/sections/auth/onboarding/step-selfie-verification.tsx`)
is the final step before submit, both in the main onboarding flow (`OnboardingView`, step 2
of 2, right after Upload ID) and in the "Apply for Loan" second-application flow from the
dashboard (`LoanApplicationView`, step 4 of 4, unaffected by either restructuring). It follows a
**KYC-style "selfie with ID" pattern** (not a plain face-only selfie): live camera feed in
a portrait frame with a dashed face-oval guide up top and a card-shaped ID-rectangle guide
below it + corner brackets, instructing the user to hold their physical ID next to their
face. A lighting tip ("Find a well-lit spot…") shows before the camera starts. An "I'm
Ready" trigger starts a 3-2-1 auto-capture countdown ("Hold still —
capturing…") instead of a manual shutter button, then on the captured frame a
"Verify Selfie with ID" action runs a simulated ~1.8s "Matching your face to your ID…"
check (spinner overlay) before showing both guide shapes turned green with a checkmark
overlay. Once verified, a **4-checkbox consent section** appears (accurate info, Terms &
Conditions, Privacy Policy, ID/facial-image processing consent) — all four required before
"Submit Application →" enables; on submit, `signUpData.termsAccepted` flips to `true` here
(there's no separate consent step). Camera access is via
`navigator.mediaDevices.getUserMedia`, capture is drawn
to a `<canvas>`. **The match/verify step is intentionally simulated, not a real
face-match/liveness backend** — there is no actual comparison against the uploaded ID
happening. If camera permission is denied, it shows an inline warning and a retry button
rather than blocking the flow. Sets `application.selfieVerified = true` and calls
`markSubmitted()` on success before advancing to the Application Confirmation screen.

- Preliminary Application and Verify render **full-bleed split-panel**
  layouts (dark textured `AuthBrandPanel` + form), bypassing the card-based
  `OnboardingLayout` entirely. Upload ID and Selfie Verification, inside the
  onboarding wizard, bypass `OnboardingLayout` too but **no longer** use the
  split-panel treatment either — see "Steps 1/2 (Upload ID, Selfie
  Verification) no longer use `AuthBrandPanel`" above; both render centered
  on plain white instead. A plain "← Back" text link (visible only on the
  Selfie step) replaces the old back/exit link. `/borrower/apply`
  (`loan-application-view.tsx`) still renders `StepPersonalInfo`/
  `StepSelfieVerification` inside the original `OnboardingLayout` —
  intentionally untouched.
- "Verified" (post-OTP) and the Application Confirmation screen (post-submit)
  are transient success screens, not steps a user should deep-link to (see
  the hydration-race note further down for why hard-navigating directly to
  them in a test can misbehave even though the app itself is fine).
- Applying for a *second* loan from the dashboard ("Apply for Loan") is
  **unaffected by either restructuring** — it still reuses the original
  Loan Type → Financial Info → Personal Info → Selfie steps via
  `src/sections/borrower/loan-application-view.tsx`, with no Preliminary
  screening, multi-select purpose, business fields, or re-verification.
- Dashboard loan card intentionally shows only 3 real-data columns (Total Loan
  Amount, Loan Term, Application Status) — no invented Total Payment / Amount Due /
  Due Date fields, since there's no real payments/amortization model yet.

---

## Admin flow

```
/admin/login  →  /admin/dashboard  →  /admin/credit-checking (list, all applications)
  →  /admin/applications/[id]/credit-checking
       ├─ Approved → /admin/applications/[id]/call-report
       │              → Proceed → /admin/applications/[id]/requirement-checklist → Endorse
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
"AI" step (uploaded bureau reports + application details → generated summary +
recommendation text) — not a real AI integration.

**Initial Credit Checking has its own dedicated doc:
`docs/ADMIN_INITIAL_CREDIT_CHECKING.md`.** It covers the layout (stacked vs.
split), `ApplicationDetailsCard` (including the conditional Spouse information
block), `BureauReportsCard` (the CIBI row's "Auto-filled" form + the 4
plain-upload rows), the simulated bureau finding, the merged "AI review,
summary & recommendation" card (risk-level read + AI Summary/Recommendation),
the always-clickable decision gate (Proceed to Call Report/Disapprove do not
require bureau reports to be uploaded first), and what's real vs. simulated on
this screen. Update that file, not this section, when this screen changes.

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
  `AdminContext` localStorage effect) and never re-rolled. Both this page
  (to decide whether to show `NegativeCreditReportCard`) and
  `CreditCheckingResultModal` (to decide which content to render) read
  `review.creditChecking.bureauFindingStatus` directly — neither ever
  re-calls `simulateBureauFinding` itself — so they can't disagree.
- **QA override**: since the hash is stable for a given email + the fixed
  sample-upload filenames, "Fill with Sample Data" alone can't exercise both
  outcomes reliably. Two dev-only actions, "Force Clean Bureau Finding" /
  "Force Negative Bureau Finding" (visible once `allBureauReportsUploaded`),
  directly set `bureauFindingStatus`, bypassing the hash for testing —
  registered into the shared settings popover's "Page actions" section (see
  "Page actions: per-view dev/test controls in the settings popover" below)
  rather than rendered as their own floating buttons.
- **`NegativeCreditReportCard`** (`src/sections/admin/negative-credit-report-card.tsx`,
  plain inline-`sx` card convention, not `call-report/call-report-types.ts`'s
  `cardSx`/`fieldSx` since this isn't a Call Report concept): renders only
  when `allBureauReportsUploaded && bureauFindingStatus === 'negative'`,
  directly below the "AI review, summary & recommendation" card and above
  "Approved?". **Deliberately not a 1:1 copy of the original reference
  screenshot's dense stacked form** — restructured for scannability:
  - The To/From/Date/Subject read-only fields are shown as a compact
    2-column summary block (`SummaryField`) instead of 5 stacked
    label:value rows, with the one real input (Thru, required) as a
    proper `TextField` below a divider inside the same block.
  - Account Findings entries render as numbered `EntryCard`s (a "Entry N"
    `Chip` + a "Remove" button, matching the Call Report collateral-entry
    visual language already established in `collateral-information-card.tsx`)
    rather than three bare inline fields in a row.
  - The three special-finding lists (Cancelled Credit Cards File /
    Adversely Classified Loan File / Closed Current Account) are
    **collapsible** (`SpecialSection`, reusing the `ButtonBase` + `Collapse`
    + chevron pattern from `ApplicationDetailsCard`), each showing an
    at-a-glance status chip ("None added" / "N added") instead of three
    permanently-expanded, visually-identical dark navy bars — an officer
    scanning the form immediately sees what's filled without expanding
    anything, and empty sections don't waste vertical space.
  - A small completion counter ("N of 4 optional sections filled") gives a
    sense of report thoroughness before submitting, since only
    Recommendation/Remarks is actually required.
  - Once submitted, the entire form collapses into a compact green
    confirmation banner ("Negative Credit Report submitted") with an
    "Edit" button that flips `negativeCreditReport.submitted` back to
    `false` and re-shows the full editable form — the original design's
    plain "Submitted" button label (which looked like a static, unclickable
    state) was replaced with this explicit, re-openable banner.
  Submit is disabled until Recommendation/Remarks is non-blank. Every field
  except Recommendation/Remarks is optional.
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
  "Bureau Reports Result" block first renders an AI-read result for each
  uploaded source (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP). When a submitted
  negative report exists, its consolidated officer finding then renders the officer's typed narrative, each
  Account Findings entry as `{label} : {findings}`, and for each of the 3
  special lists either its entries (same format) or, if empty, a centered
  bold **"No {Section Title}"** fallback (exact strings: "No Cancelled
  Credit Cards File", "No Adversely Classified Loan File", "No Closed
  Current Account"). The old separate "Findings by Name" block was removed
  because the per-bureau result rows now provide the report-by-report AI read.
  The "Recommendation" text splits `recommendationRemarks` on
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

**"AI review, summary & recommendation" is fully automatic — no "Run AI
Analysis" button.** `aiSummary`/`aiRecommendation` are never stored (previously
they were, written by a button click with a fake multi-step "analyzing…"
animation) — computed directly in `initial-credit-checking-view.tsx` from
`application` (Application Details), same "pure computation, never stored"
pattern as the Call Report financial ratios in `call-report-computations.ts`.
See `docs/ADMIN_INITIAL_CREDIT_CHECKING.md` for this card's current content
and gating (it now also always shows a risk-level read, merged in from the
former standalone "Initial AI Recommendation" card).

**Application Details card** (`src/sections/admin/application-details-card.tsx`,
shared by Initial Credit Checking and Call Report) shows everything the borrower
submitted — contact info, full loan request, personal/ID fields — grouped into
labeled sections, plus a compact "Uploaded Documents" section. This is what admins
actually review before deciding whether to proceed or disapprove.

Initial Credit Checking also opts into `ApplicationReviewHeader`'s
`applicationSummaryStyle` for its first card: rounded clipboard/list icon, full
borrower name and contact line, assigned officer, and application-number pill.
This variant is page-scoped; other screens retain the default header treatment,
while Call Report hides the separate header card entirely in favor of its merged
Application Details summary. Large stale-step alerts have been removed globally;
all process pages retain only their compact aging values and step pill.

**Officer notes are appended with attribution and carry forward read-only.** A
standalone "Officer notes" card sits right after `BureauReportsCard` on Initial
Credit Checking. It has a draft textarea, an explicit **Add note** button, and a
system-styled outlined **View all officer notes** button in the upper-right. Each
added entry stores Officer, localized Date & time, Process (`Initial Credit
Checking`), and Note in the existing `creditChecking.notes` string. The shared
`OfficerNotesHistory` component (`src/sections/admin/officer-notes-history.tsx`)
parses that history into one visual card per entry and supports both the current
format and legacy plain-text/`Officer · timestamp` notes. It is used by Initial
Credit Checking's and Call Report's **View all officer notes** actions, plus
Reconsideration's read-only note block, so connected pages cannot drift. The
first two mount the same `OfficerNotesDialog`, standardizing the "All officer
notes" title, generic subtitle ("Notes recorded throughout the application
process."), close behavior, compact content layout, and empty state. To conserve
vertical space, each history card keeps officer, date/time, and process on one
wrapping metadata row, followed directly by the note with reduced padding and
spacing. This mechanism remains distinct from
`Reconsideration.notes`, which records the reconsideration officer's own work.
Both Initial Credit Checking and Call Report also provide an editable Officer
Notes card with a draft field and explicit **Add note** button. They share
`buildOfficerNoteEntry()`; Call Report entries are tagged with Process = `Call
Report`, while Initial Credit Checking entries use `Initial Credit Checking`.
Initial Credit Checking's expanded `ApplicationDetailsCard` does not duplicate
the notes; its dedicated Officer Notes card and shared history modal are the
only note surfaces on that page.

**The "Approved?" card always renders, fully active from the start** — both
buttons (Proceed to Call Report/Disapprove) are clickable regardless of
bureau-upload status; bureau reports are supporting evidence, not a
prerequisite to decide. See `docs/ADMIN_INITIAL_CREDIT_CHECKING.md`'s
"Decision gate" section for the current behavior and history (it used to be
dimmed and disabled until every bureau report was uploaded).

**Disapprove requires a reason, captured via a confirmation dialog at the
moment of clicking.** Proceed to Call Report immediately records
`decision: 'approved'` and routes forward. Disapprove opens a `ConfirmDialog`
(`src/components/custom-dialog`) titled "Reason for disapproval", with a
required textarea — the Confirm button stays disabled until a reason is typed.
This reason is stored as
`creditChecking.decisionReason`, a field distinct from the general Officer Notes
above (that one is always-visible context; this one is captured only at the
instant of that specific decision) and is shown on the Reconsideration screen's
top banner as the quoted reason the application landed there. Confirmation sets
`decision: 'rejected'` and routes to `/reconsideration`.

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

**Admin nav layout: top bar by default, side nav as an opt-in switch**
(`src/layouts/admin/layout.tsx`, `src/layouts/admin/nav-mode-context.tsx`):

The admin shell renders one of two nav components depending on the current
`navMode` (`'top' | 'side'`, default `'top'`), persisted to `localStorage`
(`admin-nav-mode`) via `AdminNavModeProvider`/`useAdminNavMode`:

- **`AdminNavHorizontal`** (`nav-horizontal.tsx`) — default. A single merged
  top bar: logo, flattened nav items inline (each item with children opening
  its own MUI `Menu` dropdown on click instead of expanding in place), and the
  account/notification controls (`AdminHeaderActions`, see below) on the right
  — all in one 64px row. In this mode `AdminLayout` does not render a separate
  `AdminHeader` row underneath; `AdminNavHorizontal` takes a `displayName`
  prop and renders `AdminHeaderActions` inline itself.
- **`AdminNav`** (`nav-vertical.tsx`) — the original fixed left sidebar,
  selectable from the settings panel below, paired with its own separate
  `AdminHeader` row (unchanged, still two rows in this mode). Two independent
  collapsible sections (`src/layouts/admin/config-nav-admin.tsx`):

- **"Application List"** — the forward-moving process only: Initial Credit
  Checking, Call Report, Requirement Checklist. Reconsideration
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

A **floating settings button** (`nav-settings-button.tsx`, bottom-right,
`position: fixed`, rendered in both layout branches of `AdminLayout`) opens a
popover with a "Menu navigation" section ("Top navigation" / "Side
navigation" — the only UI for changing `navMode`) and, conditionally, a
"Page actions" section (see below). Both nav components read the
same `adminNavData` config and active-state logic described above, so
switching layouts changes only presentation, not what's navigable.

**Page actions: per-view dev/test controls in the settings popover**
(`page-actions-context.tsx`) — this is the single floating button on every
admin page; individual views used to render their own extra floating
buttons (Initial Credit Checking had four stacked at different `bottom`
offsets: sample-data toggle, layout-column toggle, Force Clean/Force
Negative; Call Report had one), which is consolidated here instead.
`AdminPageActionsProvider` wraps the whole admin layout (in `AdminLayout`,
alongside `AdminNavModeProvider`) holding one `actions: AdminPageAction[]`
array in state. A view calls `useRegisterPageActions(actions)` — a thin
`useEffect` wrapper that sets the shared array on mount/whenever `actions`
changes, and clears it (`setActions([])`) on unmount — so actions never leak
onto a page that didn't register them, and switching between pages swaps the
popover's "Page actions" section contents automatically. `AdminNavSettingsButton`
reads the array via `usePageActions()` and renders it as a second section
below "Menu navigation" (divider between), only when non-empty; clicking an
action closes the popover and calls its `onClick`. Both `initial-credit-checking-view.tsx`
and `call-report-view.tsx` compute their action list with `useMemo` (deps:
whatever drives that view's conditional/relabeled actions —
`allBureauReportsUploaded`/`isSplitLayout` for the former, `canProceed` for
the latter) and pass it to `useRegisterPageActions`. Because these views also
have an early `if (!signUpData...) return null;` guard for missing
registration data, the hook call (and the handler functions it references)
had to move *above* that guard to satisfy `react-hooks/rules-of-hooks` — the
handlers themselves gained an inline `if (!signUpData) return;` bail instead
of relying on the component-level narrowing they used to sit below.

The account/notification cluster (bell, "ASK HAI" button + `HaiChatDrawer`,
avatar with account `Menu` and logout `ConfirmDialog`) lives in
`AdminHeaderActions` (`header.tsx`) — extracted from the original `AdminHeader`
so both `AdminHeader` (side-nav mode's separate row) and `AdminNavHorizontal`
(top-nav mode's single merged row) can render the identical controls without
duplicating the logout/HAI-drawer state.

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
- `officer-notes-history.tsx` (shared one directory above `call-report/`) —
  `OfficerNotesHistory`, the reusable structured history renderer used by
  Initial Credit Checking, Call Report, and Reconsideration, plus
  `OfficerNotesDialog` and the shared `buildOfficerNoteEntry()` serializer.
- `officer-notes-card.tsx` — the editable Call Report Officer Notes card,
  matching Initial Credit Checking's View all / draft / Add note workflow and
  tagging new entries with the `Call Report` process.
- `credit-checking-result-modal.tsx` — `CreditCheckingResultModal`, a centered MUI `Dialog`, opened from both this page and Initial Credit Checking (see "View Initial Credit Checking Result" below).
- One card component per section (see below), each reading/writing `AdminContext` directly via `useAdmin()` — no props, no react-hook-form (deliberately: every other admin review screen in this codebase manages state the same way, and this page was kept consistent rather than introducing a form library for just one screen).

**No section numbering** — headings were originally numbered ("1. Call Details", "2. Borrower Interview", etc.) but the numbers were removed on request; section order in the page is still fixed, just not labeled with digits.

**Application Details is a compact summary with modal actions on Call Report.**
`ApplicationDetailsCard` (`src/sections/admin/application-details-card.tsx`,
shared with Initial Credit Checking) still takes the legacy-named optional
`collapsible` prop, default `false`, but the Call Report variant no longer uses
an accordion or MUI `Collapse`. `<ApplicationDetailsCard collapsible />` renders
a responsive borrower summary based on the supplied reference: initials avatar,
full name, email/mobile, application-number pill (with no redundant "Call Report"
status pill), and six loan fields (Loan type, Amount, Term, Purpose, Monthly
income, Date filed). Its single action row contains:

Call Report passes `hideApplicationCard` to `ApplicationReviewHeader`, so the
header still owns step-entry tracking, back navigation, total/step aging, and
the step pill but does not render its separate borrower/loan card.
`ApplicationDetailsCard` is therefore always the first card on Call Report.
Those previously duplicated first and second cards are merged into this single
Application Details summary. Other review screens retain the standard header
card.

- **View full application** — opens the complete Applicant, Loan Request,
  Personal & ID, spouse, and Uploaded Documents content in a responsive modal.
- **Initial credit checking result** — calls the callback owned by
  `CallReportView` and opens `CreditCheckingResultModal`.
- **View all officer notes** — opens the shared read-only `OfficerNotesDialog`
  using the structured
  `OfficerNotesHistory` cards.

The previous standalone *read-only* note display and standalone Initial Credit
Checking Result button beneath Application Details are no longer rendered.
An editable `OfficerNotesCard` now follows Application Details, while the result
button remains consolidated in Application Details' action row. Initial Credit
Checking continues to call `<ApplicationDetailsCard />`, so its full read-only
submission remains inline rather than modal-only.

**"Initial credit checking result" button + modal — opened from two
screens.** `CreditCheckingResultModal` (`call-report/credit-checking-result-modal.tsx`)
is a centered, scrollable MUI `Dialog` showing a
generated-looking Initial Credit Checking report. It's opened from:
- **Call Report** — an outlined action inside the compact Application Details
  card's bottom action row.
- **Initial Credit Checking** (`initial-credit-checking-view.tsx`) — an
  outlined button inside the "AI review, summary & recommendation" card
  itself, always available and able to degrade gracefully when reports are
  still missing.

Each screen owns its own `resultModalOpen` local `useState` — it's pure UI
state, not application data, so it isn't lifted into `AdminContext`.

Modal content: status banner (Cleared/not-cleared), a "Credit Checking
Report" field block (Application No. via `getLoanNumber(signUpData.email)`,
Applicant, To — fixed "Credit Committee", Thru — `application.assignedOfficer`,
From — fixed "Credit and Collection Department", Date/report-generated
timestamp from `review.stepTimestamps.creditChecking`, Subject), a **Bureau
Reports Result** section with one simulated AI-read finding per uploaded bureau,
a "Recommendation" box with a Proceed/Pending chip, **Recommendation &
Remarks**, and a Prepared by/Noted by two-column footer. Recommendation &
Remarks is editable and locally persisted when opened from Initial Credit
Checking. Call Report passes `recommendationEditable={false}`, so the same
section renders as read-only text there rather than as a `TextField`.

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
clicked Proceed to Call Report/Disapprove yet at the point they'd want to preview
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

The page's own intro card ("Call Report & Loan Package Proposal / Complete this structured interview live while on the call with the borrower.") was removed on request, so the page now opens directly with the compact Application Details summary card.

**Proceed gate**: the existing "Proceed application?" card's Proceed button is disabled until `callStatus`, `identityConfirmed`, and `preliminaryRecommendation` are all set, and — only when `followUpRequired === 'yes'` — `followUpDate` is also filled in. "Do Not Proceed" stays ungated, consistent with how declining never requires as much as approving elsewhere in this app.

**"Fill with Sample Data" / "Remove Sample Data" toggle** — registered as a page action into the shared settings popover (see "Page actions" above), same pattern as Initial Credit Checking's sample-data action, no `NODE_ENV` gate. Label and behavior are driven by `canProceed` (the same boolean gating the Proceed button): while incomplete, one click fills every section with representative sample values in one shot (including a synthesized one-item collateral entry, built inline with `crypto.randomUUID()` rather than via `addCollateralEntry()`+`updateCollateralEntry()`, since those are two separate async state updates and the sample-fill needs the entry's data present in the same synchronous `setCallReport` call); once complete, the button relabels to "Remove Sample Data" and clicking it resets every field in the report back to its blank default (leaving `AdminContext`'s other steps, and the read-only Application Details data pulled from `RegistrationContext`, untouched). `clientType` still exists on `CallReport` (kept for potential future use) but currently has no rendered UI anywhere, since the card that used to show it was removed.

### Requirement Checklist (`src/sections/admin/requirement-checklist-view.tsx`)

Rendered at `/admin/applications/[id]/requirement-checklist`, "Step 3 ·
Requirement Checklist". Reviews a fixed 24-document list — presented as 3
tabs (Credit Investigation / Appraisal / Financial Evaluation; Credit
Investigation further split into two named sub-groups) rather than one flat
list, with several documents shared across tabs — against what's on file,
shows a merged AI review/summary/recommendation card, and either endorses the
application onward or returns it to the applicant with a recorded reason. See
`docs/ADMIN_REQUIREMENT_CHECKLIST.md` for the full document breakdown by tab.

`ApplicationDetailsCard` is always the first card on this page, including the
Endorsed and Returned completion states. Requirement Checklist hides
`ApplicationReviewHeader`'s separate borrower card while
retaining back navigation, compact aging, step tracking, and the amber Step 3
pill. The compact Application Details variant provides borrower/application/
loan context plus the Full application and All officer notes modal actions
before any checklist or completion-state content. Requirement Checklist also
passes `showCallReportAction`, adding **View call report** to the action row.
That button opens `call-report/call-report-result-modal.tsx`, a read-only dialog
containing key call metadata, the stored or derived Call Summary, preliminary
recommendation, and additional remarks. The action remains available in the
Endorsed and Returned completion states.
It also passes `showCreditCheckingResultAction`, adding **Initial credit
checking result** via the existing `CreditCheckingResultModal`. Requirement
Checklist opens that report with `recommendationEditable={false}`, keeping its
Recommendation & Remarks read-only at this later workflow stage. Both report
actions remain available in the Endorsed and Returned states. The shared action
row is `nowrap` and progressively reveals actions as space increases: View Full
Application always stays visible, Initial Credit Checking Result appears next,
then View Call Report and View All Officer Notes. The bordered three-dot menu
contains only the actions hidden at the current breakpoint and disappears once
all buttons fit, preventing a second line.

**Requirement Checklist has its own dedicated doc:
`docs/ADMIN_REQUIREMENT_CHECKLIST.md`.** It covers the fixed document list
(`requirement-checklist-docs.ts`), the `RequirementDoc` state shape, the
`RequirementDocRow` View/Upload behavior, the progress counter and
Endorse-gating rule, the AI summary/recommendation derivation
(`requirement-checklist-risk.ts`), the Return to Applicant flow, and the
explicit (deliberate) scope limitation that the document set does not vary by
application.

### Multi-application list & read-only samples

`ApplicationListView` (`src/sections/admin/application-list-view.tsx`, rendered at
`/admin/credit-checking` — see "The Application List is no longer its own page"
above) shows **multiple applications**, not just one: the one **live** application (the real
`useRegistration()` session, fully interactive as described throughout this doc) plus
**5 hardcoded read-only sample applications** (`src/sections/admin/sample-applications.ts`,
`SAMPLE_APPLICATIONS`), covering the 4 review steps (Initial Credit
Checking, Reconsideration, Call Report, Requirement Checklist — two samples
land on Requirement Checklist) so every step always has content to show, even
the ones the live application has already passed through or hasn't reached
yet. Each sample carries its own `RegistrationState` (name, loan details,
personal info, backdated `submittedAt` for realistic aging) and a `step` —
there is **no `ApplicationReview` state for samples** (no CIBI form, no
uploads, no decision state) since they're display-only.

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

**"Fill with Sample Data" / "Remove Sample Data" toggle (Initial Credit
Checking only)**: registered as a page action into the shared settings
popover (see "Page actions" above) rather than its own floating button,
always available (no longer additionally gated on
`NODE_ENV` — see the "Known issues" entry on the `NODE_ENV` gate removal below),
with its label and behavior driven by `allBureauReportsUploaded`. Note this
action no longer gates the decision buttons themselves (Approve/No/For
Reconsideration are always clickable — see
`docs/ADMIN_INITIAL_CREDIT_CHECKING.md`'s "Decision gate" section) — it only
controls whether the bureau reports/CIBI form are pre-filled for demo
purposes. While not yet uploaded, one click (`handleFillSampleData`) fills the
entire screen in one step: uploads the document, fills and submits the CIBI
form (including a sample report), and uploads all four bureau reports
(LOANDEX/CIC/CMAP/NFIS-BAP) — letting a tester skip the manual click-through.
Once all 5 are uploaded, the action relabels to "Remove Sample Data" and
clicking it calls `handleClearSampleData()` instead — a scoped undo of exactly
the fields `handleFillSampleData` set (document/AI fields on `creditChecking`,
the CIBI form, and the four bureau uploads), deliberately not `resetReview()`,
which would also wipe unrelated steps (Reconsideration, Call Report,
Requirement Checklist) this action has no business touching. The Officer
Notes textarea is untouched by either direction, since it's a separate field.
`computeInstallment` was exported from `cibi-form-card.tsx` so
`handleFillSampleData` can reuse the same installment math instead of
duplicating it.

**1-Column / 2-Column layout toggle (Initial Credit Checking only)**: another
page action in the same settings popover ("Switch to 2-Column Layout" /
"Switch to 1-Column Layout"), backed by local `isSplitLayout` state in
`InitialCreditCheckingView` — a pure display preference, not persisted to
`AdminContext`/localStorage, so it resets to the 1-column default on
navigation or refresh. (Originally a second floating pill button stacked
below "Fill with Sample Data"/"Remove Sample Data"; both were consolidated
into the settings popover's "Page actions" section — see above — along with
Force Clean/Force Negative, so the page no longer has any of its own floating
buttons.) This toggle was originally placed inline next to
`ApplicationReviewHeader`, but that broke the header's own internal row layout
(`ApplicationReviewHeader` is a self-contained full-width block with its own
"‹ Application List" row, loan-info card, and aging alert — squeezing another
button into a `Stack direction="row"` alongside it competed for horizontal
space and visually broke it) — moved out of the header row (first to its own
floating button, now into the settings popover), and
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
  `'creditChecking' | 'reconsideration' | 'callReport' |
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
    since `markStepEntered` fired for that screen's `reviewStep`. Every process
    page shows its current step as a separate amber pill on the right side of
    the aging row; the pill is not duplicated inside the card below. The header
    calls `markStepEntered` itself via a `useEffect` keyed on the `reviewStep`
    prop, so each view only has to pass its step name.
- **Design decisions**: "Endorsed" (end of `RequirementChecklistView`) is
  treated as the practical end of tracked aging — there's no separate
  "Released" step or release timestamp. Aging is not tracked from admin
  first-view, only from borrower submission, since the flowchart's "aging"
  concept was scoped to the whole application lifecycle, not queue wait time.
- **Stale-application signals** (built on top of the aging levels above):
  - The former dismissible "This application has been on…" warning/error
    banner was removed from `ApplicationReviewHeader` for every process page.
    Admins now see only the compact total-aging and per-step-aging values beside
    the amber step pill.
  - **Dashboard overdue count** — `AdminDashboardView` has a fourth stat
    card, "Overdue (3d+)", counting applications where total aging
    (`getAgingLevel(application.submittedAt)`) is `'overdue'`. Currently
    always 0 or 1 since there's only ever one application in this
    localStorage-backed prototype; the card is built to scale once real
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
- **Welcome step — deleted 2026-07-15, re-added 2026-07-16 with the same
  full-bleed visual treatment.** `src/sections/auth/onboarding/step-welcome.tsx`
  (full-bleed dark splash with animated floating circles, bottom-anchored CTAs
  reading "Continue to Loan Application" / "Skip to Dashboard") was removed as
  part of restructuring sign-up to be eligibility-first, since `OnboardingView`
  (at the time still using its original split-panel shell) no longer had an
  intermediate screen positioned between account creation and the application
  wizard to host it. It's since been **re-added**, keeping the original
  full-bleed dark-blue/texture/floating-circle treatment (it does not use
  `AuthBrandPanel`), with only the manual "Continue"/"Skip to Dashboard"
  buttons swapped for an auto-advancing spinner. `OnboardingView`'s
  split-panel shell was itself later dropped for steps 1/2 as well (both now
  render centered on plain white, no `AuthBrandPanel` anywhere in this view)
  — see "Onboarding welcome step re-added" below for the current
  implementation.
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
  hydrate from `localStorage` in a `useEffect` on mount; both now expose a
  `hydrated` boolean (`useRegistration().hydrated` / `useAdmin().hydrated`) for
  consumers that need to tell "genuinely empty" apart from "hasn't loaded yet."
  All four admin route guards (`src/app/admin/{applications,credit-checking,
  dashboard,negative-list}/layout.tsx`) wait on `hydrated` before checking
  `adminUser` and redirecting to `/admin/login` — previously they checked
  `adminUser` on the very first render, before the provider's own hydration
  effect had run, so **any hard refresh on an admin page bounced the admin back
  to `/admin/login`** even though their session and all filled-in review fields
  were still sitting in `localStorage`; logging back in and re-opening the same
  application then looked like the fields had been wiped, when really the admin
  had just been logged out and was seeing a fresh page load. Borrower-side guards
  (e.g. `/auth/onboarding`) have the same shape but were not part of this fix —
  if the same symptom shows up there, apply the identical `hydrated`-gating fix.
  When testing with Playwright, walking the UI from the entry point
  (`/auth/sign-up`, `/admin/login`) rather than deep-linking with `page.goto()`
  still avoids the borrower-side version of this race.
- **No real backend.** Everything persists in the browser's `localStorage` (survives
  tab/browser close, unlike the `sessionStorage` this used before) until
  `localStorage.clear()`, an explicit `reset()`, or the browser's storage is
  otherwise cleared. There is no persistence across different browsers or devices.
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
