# Borrower Sign-Up & Application Flow

This describes the complete borrower-facing journey, from landing on the
Preliminary Application page to having a submitted loan application.
Companion to `PROJECT_OVERVIEW.md` (the admin/review-flow side); update both
when this flow changes.

All state lives in `RegistrationContext` (`src/auth/registration-context.tsx`),
persisted to `sessionStorage` under the key `hhc-lms-registration`. There is no
real backend — every "submission" is just a write to this one client-side object.

> **Restructured 2026-07-16:** the flow is now a **Loan Application
> experience**, not account registration. The borrower never manually sets a
> password before qualifying — one **Preliminary Application** screen screens
> eligibility (₱150,000 minimum) *before* any account exists, and now also
> requires a Terms & Conditions/Privacy Policy consent checkbox before
> submitting. Once qualified, **Mobile OTP Verification** auto-creates/
> activates the account (no password step at all — a temporary password is
> described as emailed, never shown), landing on a brief auto-advancing
> **Welcome** step before **Upload ID**, where the borrower uploads their ID
> and fills out all remaining personal details in one flat form (no
> simulated OCR/"reading" delay — that was removed; every field shows at
> once). **Selfie Verification** folds in a second, more specific
> Terms/Privacy/verification-consent block immediately before final submit.
> **Application Confirmation** shows real derived data (reference number,
> dates, status). See "Complete ordered journey" below.

## Routes, in journey order

| Step | Route | View |
|---|---|---|
| 1 | `/auth/sign-up` | `PreliminaryApplicationView` (also handles the soft-decline screen in place) |
| 2 | `/auth/verify` | `VerifyView` — OTP only, no password sub-step |
| 3 | `/auth/onboarding` | `OnboardingView` (Welcome (auto-advances) → Upload ID → Selfie Verification) |
| 4 | `/auth/thank-you` | `ThankYouView` — Application Confirmation |
| 5 | `/borrower/dashboard` | `BorrowerDashboardView` |
| (alt) | `/borrower/apply` | `LoanApplicationView` — **unchanged**, still its own original 4-step wizard (Loan Type → Financial Info → Personal Info → Selfie), used to file a second/repeat application from the dashboard. Intentionally left out of both the 2026-07-15 and 2026-07-16 restructurings — see "Filing a second application" below. |
| (alt) | `/auth/login` | `LoginView` — returning-user path, unaffected by this restructuring |

Route guards (client-side, `useEffect` + `router.replace`, reading `useRegistration()`):
- `/auth/onboarding` → redirects to `/auth/sign-up` if no `signUpData`; to `/auth/verify` if not yet `verified`. **`verified` now flips to `true` directly on OTP success** (no password sub-step gates it anymore).
- `/auth/verify` → redirects to `/auth/sign-up` if no `signUpData`.
- `/auth/thank-you` → redirects to `/auth/sign-up` if `application.personalInfo` isn't set.

> **Known limitation (pre-existing, not introduced by either restructuring):**
> these guards read `useRegistration()` state on their very first render, but
> `RegistrationProvider` re-hydrates from `sessionStorage` asynchronously (in
> a `useEffect`). On a **hard** navigation (full page load / browser refresh /
> direct URL entry — e.g. Playwright's `page.goto()`), the guard's first
> render sees empty `initialState` and redirects away *before* the real
> stored state loads a moment later. This does **not** affect normal in-app
> navigation (`router.push()` from an already-hydrated session) — only hard
> reloads. Confirmed via full in-app Playwright runs, which pass end-to-end.

## State shape (`src/auth/registration-context.tsx`)

```ts
type SignUpData = {
  prefix?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  email: string;
  mobile: string;
  password: string; // never set by the borrower anymore — stays '' permanently
  marketingConsent: boolean;
  termsAccepted: boolean; // set true from Preliminary Application's consent checkbox; re-confirmed at the Selfie screen
};

type LoanType = 'personal' | 'business'; // kept for type-shape compat; no longer collected — see below

type FinancialInfo = {
  desiredLoanAmount: number;
  loanTermMonths: number;
  employmentStatus: string; // borrower-facing label is "Source of income"
  monthlyIncome: number;
  loanPurpose: string; // multiple selections joined with ", " — see "Purpose of loan" below
  // Collected only when employmentStatus === 'Business Owner':
  businessType?: string;         // Corporation / Cooperative / Sole Proprietorship / Partnership
  businessDocument?: string | null; // base64 data URL of the uploaded business document
};

type PersonalInfo = {
  idType: string;
  idNumber: string;
  idFile: File | string | null; // stored as a base64 data URL, not a raw File
  idFileBack: File | string | null; // only populated for two-sided ID types — see "ID type-dependent upload" below
  birthday: string; // the borrower's own birthday — distinct from spouseBirthday below
  address: string;
  province: string;
  city: string;
  barangay: string;
  zipCode: string;
  civilStatus: string;
  gender: string;
  tinNumber: string;
  referralSource: string;
  // Collected only when civilStatus === 'Married':
  spouseName?: string;
  spouseBirthday?: string;
  spouseAddress?: string; // copy of `address` if "Same address as spouse" is checked
  spouseProvince?: string; // copy of `province` if "Same address as spouse" is checked
};

type ApplicationData = {
  loanType: LoanType | null; // always null now for new sign-ups — see "Loan Type removed" below
  financialInfo: FinancialInfo | null;
  personalInfo: PersonalInfo | null;
  selfieVerified: boolean;
  selfiePhoto: string | null;
  submittedAt: string | null;     // ISO timestamp, set at final submission
  assignedOfficer: string | null; // set at final submission — see "Assigned officer" below
};

type PreliminaryStatus = 'declined' | 'qualified' | null;

type RegistrationState = {
  signUpData: SignUpData | null;
  verified: boolean; // now means "OTP passed" — no password gate
  preliminaryStatus: PreliminaryStatus; // set the moment Preliminary Application is submitted
  application: ApplicationData;
};
```

Setters exposed via `useRegistration()`: `setSignUpData`, `setVerified`,
`setPreliminaryStatus`, `setLoanType` (unused by the primary flow now, still
used by `/borrower/apply`), `setFinancialInfo`, `setPersonalInfo`,
`setSelfieVerified`, `setSelfiePhoto`, `markSubmitted`, `loadSample`
(admin-side only, injects canned demo applications), `reset` (wipes
sessionStorage, used by the dashboard's "Reset Application" button).

`signUpData` is captured **once**, at Preliminary Application submission
(name/email/mobile; `password`/`marketingConsent` default to blank/false and
are read forward from any existing value). `termsAccepted` is set from
Preliminary Application's own `dataConsent` checkbox at that same submission
— no longer defaults to `false` there — and is re-confirmed (set to `true`
again) at the Selfie screen once all four of its consent checkboxes are
checked and the borrower submits.

## Step by step

### 1. Preliminary Application (`src/sections/auth/preliminary-application-view.tsx`, at `/auth/sign-up`)

The front door — screens loan eligibility before any account exists. React
Hook Form + Zod (`PreliminarySchema`). Fields, in this order:
- **Prefix + Surname only** — a 2-column row (Prefix optional, Surname
  required). First/Middle/Extension are **not** collected here; they're
  filled in later, during the Upload ID step's First Name/Middle
  Name/Extension row — see step 3 below. `SignUpData.firstName`/
  `middleName`/`extensionName` stay blank at this stage (`SignUpData.lastName`
  holds the Surname).
- Email address
- Mobile number (PH format, `+63` prefix shown, validated as `9XXXXXXXXX`)
- **Purpose of loan** — **multi-select** (`MenuItem` + `Checkbox` +
  `Chip`-rendered summary, via a raw MUI `Select multiple` wired through a
  react-hook-form `Controller`, since `Field.Select` doesn't support
  multi-select). Options: Working Capital / Business Expansion / Education /
  Home Improvement / Debt Consolidation / Other. At least one is required.
  Selected values are joined with `", "` into `FinancialInfo.loanPurpose`
  (a single string) at submit time — kept as a string rather than
  `string[]` so every existing admin-side consumer (call report, credit
  checking summary text, application detail cards) keeps working unchanged.
- Desired Loan Amount (₱) + Preferred Loan Term (select: 6/12/18/24/36
  months, defaults to 12) — one row.
  **Desired Loan Amount auto-formats with thousands separators as you
  type** (e.g. typing `250000` displays `250,000`): the field is wired
  through a `Controller` that strips non-digits on change, coerces to
  `Number` for the underlying RHF value, and re-formats the displayed
  string via a small `formatThousands()` helper — the stored/validated
  value is still a plain `number`.
- Source of Income (select: Employed / Self-Employed / Business Owner /
  OFW / Unemployed) + Monthly Income (₱) — one row.
  **If Source of Income is "Business Owner"**, a conditional "Business
  information" card appears immediately below with:
  - Business Type — select: Corporation / Cooperative / Sole
    Proprietorship / Partnership (required when shown)
  - A document upload whose label changes based on the selected Business
    Type, naming the specific document expected — Corporation → "General
    Information Sheet (GIS)", Cooperative → "Certificate of Registration
    (CDA)", Sole Proprietorship → "DTI Certificate of Registration",
    Partnership → "SEC Certificate of Registration". Required when shown
    (enforced via `PreliminarySchema.superRefine`). Stored as a base64
    data URL in `FinancialInfo.businessDocument`, same "can't survive
    `JSON.stringify` as a raw File" reasoning as the ID upload.

    **Compact custom dropzone, not `Field.Upload`.** `Field.Upload`/`Upload`
    is built for photo uploads (large dashed dropzone, full-bleed image
    preview) and can't be shrunk to a document-field size via `sx` alone —
    see "Business Document upload" note below. `BusinessDocumentUpload`
    instead renders a local `CompactDropzone`: a single ~44px row (file-type
    icon via `FileThumbnail` + filename + remove button, or a placeholder
    prompt when empty), wired to the form through a `Controller` on
    `businessDocument`.
- **Terms & Conditions / Privacy Policy consent** — a required checkbox
  ("I agree to the Terms & Conditions and acknowledge the Privacy Policy,
  and consent to the collection and processing of my personal information
  for this loan application.") sits directly above the submit button,
  validated via `dataConsent: zod.boolean().refine((v) => v === true)`.
  Checking it is required to submit `PreliminarySchema`. On submit, its
  value is persisted onto `SignUpData.termsAccepted` (previously this
  screen never set `termsAccepted` at all — it stayed `false` until the
  Selfie Verification consent block flipped it later). This is a second,
  earlier consent touchpoint, not a replacement for the 4-checkbox block at
  Selfie Verification — that block covers the ID/selfie
  processing-specific consent, collected right before final submit; this
  one covers consenting to the collection of PII (email, mobile, income)
  up front, on the very first screen.

A "Fill with Sample Data" toggle populates a canned identity (Mr. Juan Santos
Dela Cruz / juan.delacruz@example.com / 9171234567 / ₱200,000 / 12 months /
Employed / ₱30,000 / Working Capital).

**On submit:** if Desired Loan Amount < **₱150,000**, the same screen shows
an in-place **soft-decline** message instead of navigating anywhere — no
account exists yet at this point, so there's nothing to roll back.
`preliminaryStatus` is set to `'declined'`. "Try Again" returns to the form
with all values retained. "Back to Home" links to `/`.

If the amount qualifies: `preliminaryStatus` is set to `'qualified'`,
`setSignUpData()` + `setFinancialInfo()` both fire, then navigates to
`/auth/verify`.

### 2. Mobile OTP Verification (`src/sections/auth/verify-view.tsx`, at `/auth/verify`)

A single screen, no password sub-step. A 6-digit code field. **Entirely
mocked** — no code is actually sent. The only valid code is the hardcoded
constant `MOCK_OTP_CODE = '123456'` (`src/auth/mock-login.ts`), and the UI's
own error message reveals it. "Resend" is a cosmetic 45-second countdown;
nothing is resent. The screen shows the borrower's just-entered mobile
number. A "← Return to preliminary application" link goes back to
`/auth/sign-up`.

On correct entry: a canned 2.6-second "Verified successfully!" animation
(`VerifiedTransition`) plays, then its `onDone` callback calls
`setVerified(true)` and navigates straight to `/auth/onboarding` — **this
is the only place `verified` is set to `true`**, i.e. "account
auto-created/activated." The borrower is never asked to create a password
here or anywhere else in this flow.

### 3. Onboarding wizard (`src/sections/auth/onboarding/onboarding-view.tsx`, at `/auth/onboarding`)

A welcome step followed by 2 form steps. Internally tracked as
`step: 0 | 1 | 2`. Step 0 (Welcome) renders standalone, full-bleed — an
early `if (step === 0) return <StepWelcome .../>` in `OnboardingView`, before
the rest of the component is reached. **Steps 1/2 no longer use
`AuthBrandPanel`/the split-panel treatment** — both render inside a single
centered `Stack` (`alignItems: 'center', justifyContent: 'center'`) on a
plain white background, since each step already self-constrains its own
content width (`StepPersonalInfo` to 640px, `StepSelfieVerification` to
460px). A "← Back" text link (shown only on step 2) returns to step 1
without losing entered values.

**Step 0 — Welcome** (`StepWelcome`,
`src/sections/auth/onboarding/step-welcome.tsx`): the original full-bleed
dark-blue splash (`#132155`, textured background, two soft floating
gradient circles, centered "Hey {firstName}! Welcome to PG Finance" message,
`LogoFull` at the bottom) — same visual treatment as before the 2026-07-16
restructuring temporarily removed it, **except** its old manual
"Continue"/"Skip to Dashboard" buttons are replaced with a "Getting things
ready…" spinner. **Auto-advances after 5 seconds** (`setTimeout` in a
`useEffect`, same pattern as `VerifiedTransition` on the OTP screen)
straight into Step 1 — Upload ID, with no
button or user action required.

**Step 1 — Upload ID** (`StepPersonalInfo`,
`src/sections/auth/onboarding/step-personal-info.tsx`, "Step 1 · Upload ID"
/ "Upload a valid ID"). **No simulated OCR/"reading" delay**, and every
field *except the upload box itself* renders at once (no progressive
reveal for ID Number, Name, Birthday, Address, etc. — those are always
visible). The upload box specifically **is** gated: it only appears once
an ID Type is chosen. Order, top to bottom:

1. **ID Type** (select) — shown first, alone. Nothing upload-related is
   visible until this is set.
2. **The ID upload dropzone(s) — only rendered once ID Type is non-empty**
   (`{!!idType && (...)}` in `step-personal-info.tsx`). Which dropzone(s)
   show then depends on the selected ID Type
   (`ID_TYPES_REQUIRING_BACK`, a `Set`): physical card IDs whose two sides
   carry different information — Driver's License, UMID, SSS ID, PhilHealth
   ID — show **two** side-by-side dropzones ("Upload ID — Front" / "Upload
   ID — Back"), both required (`PersonalInfoSchema.superRefine` adds an
   issue on `idFileBack` if missing for these types). PhilSys/National ID
   (blank/QR-only back) and Philippine Passport (booklet page, no second
   side to scan) keep a single "Upload a valid ID" dropzone. Switching ID
   Type away from a two-sided type clears any already-uploaded
   `idFileBack` (`useEffect` keyed on a `useRef`-tracked previous `idType`,
   same pattern as clearing `businessDocument` when `businessType` changes
   on Preliminary Application). The back image is converted to a base64
   data URL the same way as the front (`fileToDataUrl()`) and stored as
   `PersonalInfo.idFileBack`, `null` for single-upload ID types.

   **Custom fixed-height dropzone, not `Field.Upload`.** Both slots use a
   local `IdUploadField`/`IdUploadSlot` (via `Controller` + `useDropzone`)
   instead of `Field.Upload` — the shared `Upload` component pads to
   `28% 0` once a file is selected (`src/components/upload/upload.tsx`),
   so an empty Back slot next to a filled Front slot came out different
   heights, and both were oversized regardless. `IdUploadSlot` is a fixed
   `ID_UPLOAD_HEIGHT` (140px) box for both Front and Back — equal size
   whether empty or filled — showing a compact upload prompt when empty or
   a cropped `object-fit: cover` image preview with a small remove (×)
   button once a file is chosen.
3. **Instant auto-fill on upload.** The moment the front ID image is
   selected, a fixed set of remaining fields (`AUTOFILL_VALUES` in
   `step-personal-info.tsx`: ID Number, First Name, Middle Name, Birthday,
   Address, Province, City, Barangay, Zip Code) populate immediately with
   placeholder-style values — **not real OCR**, just an honest-about-being-
   fake UX convenience (no delay, no spinner, unlike the old removed
   simulation). Guarded by a ref so it only fires once per upload and never
   overwrites a field the borrower already typed into. Fully editable
   afterward.
4. ID Number.
5. **First Name, Middle Name (optional), Extension (optional)** — one row.
   This is where the borrower fills in the name parts Preliminary
   Application didn't collect (which only took Surname). On submit these
   are passed up to `OnboardingView` as a separate `PersonalInfoNameFields`
   object (not part of `PersonalInfo`) and merged into
   `SignUpData.firstName`/`middleName`/`extensionName` via `setSignUpData()`
   — `SignUpData.lastName` (the Surname) is untouched, since it isn't shown
   or re-editable on this screen.
6. **Birthday, Gender** — one row. Birthday is the borrower's own
   (`PersonalInfo.birthday`), distinct from Spouse's Birthday below.
7. Address (House/Unit No., Street).
8. **Province, City, Barangay, Zip Code** — one row.
9. An "Additional information" section label, then:
   - **Civil Status** (select).
   - **If Civil Status = Married**, a conditional "Spouse information" box
     appears right after: Spouse's Name, Spouse's Birthday, and a "Same
     address as spouse" checkbox — checked hides a separate Spouse's
     Address + Spouse's Province row (submitted values then copy the
     borrower's own `address`/`province`); unchecked reveals both fields
     and requires them. Required fields enforced via
     `PersonalInfoSchema.superRefine`.
   - TIN Number (optional).
   - "How did you discover PG Finance?" (Referral Source, select).
10. "Continue →".

"Fill with Sample Data" populates a canned Married example (spouse fields
populated) instantly — no delay of any kind, since there's no OCR
simulation left to skip.

The uploaded ID `File`(s) are converted to a base64 data URL
(`fileToDataUrl()`) before being stored. On submit → `setSignUpData()` (name
fields only) + `setPersonalInfo()` → advances to step 2.

**Step 2 — Selfie Verification** (`StepSelfieVerification`,
`src/sections/auth/onboarding/step-selfie-verification.tsx`, "Step 4 ·
Verify it's you" / "Selfie with ID" — see the dedicated section below for
the capture state machine). A lighting tip ("Find a well-lit spot…") shows
before the camera starts. Once verified, a **4-checkbox consent section**
appears directly above the submit button — all four required before
"Submit Application →" enables:
  - "The information I've provided in this application is accurate."
  - "I agree to the [Terms & Conditions]."
  - "I acknowledge the [Privacy Policy]."
  - "I consent to the processing and verification of my personal
    information, government ID, and facial image."

  On submit: `setSignUpData({ ...signUpData, termsAccepted: true })`, then
  `setSelfiePhoto()`, `setSelfieVerified(true)`, `markSubmitted()` →
  navigates to `/auth/thank-you`.

> **`Field.Upload`/`onDrop` pitfall (historical, no longer applicable to
> any upload field in this flow):** `RHFUpload`
> (`src/components/hook-form/rhf-upload.tsx`) defines its own internal
> `onDrop` that calls `setValue(name, value, {shouldValidate:true})`, then
> spreads any extra props (which would include a custom `onDrop`) onto the
> underlying `<Upload>` component *after* its own — so passing `onDrop`
> directly to `Field.Upload` silently overrides and breaks the internal
> wiring. This mattered when `step-personal-info.tsx` used to drive a
> simulated OCR "reading" state off the ID upload field (removed — see
> "Step 1 — Upload ID" above); the code observed the field via `useWatch`
> and reacted in a `useEffect` instead of passing a custom `onDrop`, to
> avoid the pitfall. Both the ID upload fields (now `IdUploadField`, see
> above) and the Business Document upload on Preliminary Application (see
> "Business Document upload" note below) have since moved off
> `Field.Upload` entirely, onto their own `useDropzone`-based components —
> so no upload field in this flow uses `Field.Upload` anymore, and this
> pitfall doesn't apply anywhere today. Kept here as a reference in case a
> custom `onDrop` is ever added back to a `Field.Upload` field.

### 4. Application Confirmation (`src/sections/auth/thank-you-view.tsx`, at `/auth/thank-you`)

Real derived data, not a static screen. Shows:
- "Your loan application has been submitted!" heading, with copy
  explaining the account was auto-created and a temporary password was
  emailed (**never shown anywhere in the UI** — honest about there being
  no real email delivery to simulate against).
- A details card: Reference Number (`getLoanNumber(signUpData.email)`,
  format `PGFC-######`), Submitted On (from `application.submittedAt`),
  Status ("Under Review"), Registered Email, Verified Mobile.
- Existing "For questions…" contact card (admin@pgfinance.com.ph / (+63)
  900-000-0000), unchanged.
- "Go to my dashboard →" button, plus a secondary "Log in later using your
  temporary password" link to `/auth/login`.

Still wrapped in `OnboardingLayout` (`step={4} totalSteps={4} complete`) —
deliberately **not** migrated to the split-panel treatment, since this is a
terminal/destination screen rather than part of the active form sequence.

### 5. Borrower Dashboard (`src/sections/borrower/dashboard-view.tsx`)

Unchanged. `hasApplication = !!signUpData && !!application.personalInfo`.

- **No application yet**: empty-state hero ("You don't have any loans yet")
  with an "Apply for Loan" button → `/borrower/apply`, plus a "What you'll
  need" checklist (valid ID, proof of income, bank details, desired amount)
  and a "~5 minutes" estimate.
- **Has an application**: shows Loan Number (`PGFC-######`, deterministic hash
  of the applicant's email — see `src/utils/get-loan-number.ts`), a Loan Type
  label, a status chip that is **always "Under Review"**, and (if financial
  info exists) Total Loan Amount / Loan Term stats. A "Reset Application"
  button calls `reset()`, wiping sessionStorage back to the empty state.

  **Loan Type label side-effect:** since new sign-ups never set
  `application.loanType` (see below), this label (`application.loanType ===
  'business' ? 'Business Loan' : 'Personal Loan'`) always reads "Personal
  Loan" for freshly-submitted applications — an accepted, unfixed cosmetic
  side-effect of removing Loan Type from the borrower-facing flow, distinct
  from the new "Business Owner" *income source* (which doesn't set
  `loanType` either).

## Loan Type removed from the primary flow

The old flow had a dedicated Loan Type step (Personal vs. Business,
`StepLoanType`) between Welcome and Financial Info. **This is gone from the
borrower-facing Preliminary Application/onboarding flow entirely** —
`application.loanType` stays `null` for every new sign-up going forward. The
`LoanType` type and `setLoanType` setter still exist in `RegistrationContext`
(kept for type-shape stability and because `/borrower/apply` still uses
them), but nothing in the primary flow calls `setLoanType` anymore.

`StepLoanType` and `StepFinancialInfo` (the original, standalone financial
form, distinct from the new merged `PreliminaryApplicationView`) are **not
deleted** — both are still imported by `src/sections/borrower/loan-application-view.tsx`
(`/borrower/apply`), which was intentionally left out of this restructuring.

## Filing a second application (`/borrower/apply`)

**Unchanged by either the 2026-07-15 or 2026-07-16 restructuring, on
purpose.** It's a separate 4-step wizard reusing `StepLoanType` →
`StepFinancialInfo` → `StepPersonalInfo` → `StepSelfieVerification`, with no
Preliminary/soft-decline screening, no multi-select Purpose of Loan, no
Business Type/document fields, and no re-verification step. This is a
known, deliberate scope gap — the primary sign-up funnel was the target of
these changes; bringing `/borrower/apply` in line (and/or adding its own
re-verification step) is a follow-up, not yet requested.

`StepPersonalInfo` (Upload ID) is shared between both flows;
`/borrower/apply`'s `handlePersonalInfo` in `loan-application-view.tsx` also
merges the returned `PersonalInfoNameFields` into `SignUpData` via
`setSignUpData()`, and passes `nameDefaultValues` from the existing
`signUpData` — same wiring as `OnboardingView`'s `handlePersonalInfo`, kept
in sync since both consume the same shared component/prop contract.

## Selfie & ID upload, in detail

**ID upload** happens in the onboarding wizard's step 1 — see "Step 1 —
Upload ID" above. There is no OCR/extraction of any kind (that simulated
"reading" delay/review step was removed) — every field is a plain,
directly-editable form field from the start.

**Selfie capture** (`StepSelfieVerification`) is a self-contained state machine:
`idle → requesting → positioning → countdown → captured → verifying → verified`
(or `denied` if camera access is refused).

1. **requesting**: real `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })` call.
2. **positioning**: live mirrored camera feed with an overlaid face-oval + ID-card guide.
3. **countdown**: a 3-2-1 visual countdown that auto-triggers capture — no manual shutter.
4. **captured**: frame drawn to an off-screen `<canvas>`, exported via `toDataURL('image/jpeg')`.
5. **verifying**: a `setTimeout(1800ms)` spinner labeled "Matching your face to your ID…"
6. **verified**: green checkmark, then the 4-checkbox consent section, then "Submit Application →".

**Both the "liveness check" and "ID match" are cosmetic, fixed-timer animations —
there is no real computer-vision face comparison anywhere in this codebase.**

## Completion & admin visibility

`markSubmitted()` stamps `application.submittedAt` (ISO timestamp) and
`application.assignedOfficer` in one call:

```ts
markSubmitted: () =>
  setState((prev) => ({
    ...prev,
    application: {
      ...prev.application,
      submittedAt: new Date().toISOString(),
      assignedOfficer: prev.signUpData ? assignMockOfficer(prev.signUpData.email) : null,
    },
  })),
```

Because there's no backend, "admin visibility" just means: `src/app/admin/layout.tsx`
wraps its children in the *same* `RegistrationProvider` that the borrower flow
uses. Any admin view that calls `useRegistration()` — the credit-checking,
call-report, reconsideration, transaction-type, and requirement-checklist
screens — reads the exact same `signUpData`/`application` object the borrower
just wrote, via the shared `hhc-lms-registration` sessionStorage key. This
includes the `businessType`/`businessDocument` fields on `FinancialInfo`,
and `spouseName`/`spouseBirthday`/`spouseAddress`/`spouseProvince` on
`PersonalInfo` — none of the existing admin display components read these
fields yet (they're stored, not surfaced anywhere admin-side), which is an
accepted gap, not a bug. **`PersonalInfo.idFileBack`, `birthday`, and
`zipCode` are exceptions** — unlike the spouse/business fields, they *are*
surfaced: `application-details-card.tsx`'s "Personal & ID information"
section shows Birthday and Zip Code alongside the existing fields, and its
"Uploaded documents" section renders a second `DocumentPreview` labeled
"Uploaded ID — Back" whenever `personalInfo.idFileBack` is set (and
relabels the front preview "Uploaded ID — Front" in that case, otherwise it
stays plain "Uploaded ID").

## Assigned officer

Unchanged. `assignMockOfficer(email)` (`src/auth/registration-context.tsx`):

```ts
const MOCK_OFFICER_ROSTER = ['Ramon Cruz', 'Bea Lopez', 'Ivan Tan', 'Grace Uy'];

function assignMockOfficer(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i += 1) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return MOCK_OFFICER_ROSTER[hash % MOCK_OFFICER_ROSTER.length];
}
```

Despite being described in code comments as "round-robin," this is actually a
**deterministic hash** of the applicant's email into one of 4 fixed names.
Assignment happens once, at `markSubmitted()` time (final step of the
wizard), not earlier.

## Complete ordered journey

1. `/auth/sign-up` — fill Prefix/Surname/Email/Mobile/Purpose of Loan
   (multi-select)/Desired Loan Amount (auto-formatted)/Preferred Loan
   Term/Source of Income/Monthly Income → if Source of Income is "Business
   Owner," also Business Type + the matching business document → check the
   required Terms & Conditions/Privacy Policy consent box → submit.
2. **If Desired Loan Amount < ₱150,000** → soft-decline screen shown in
   place (no account created), `preliminaryStatus = 'declined'`. "Try
   Again" returns to the form with values retained.
3. **If qualified** → `preliminaryStatus = 'qualified'`, `setSignUpData()` +
   `setFinancialInfo()` → `/auth/verify`.
4. `/auth/verify` — enter `123456` → 2.6s "Verified successfully!"
   animation → `setVerified(true)` → `/auth/onboarding` (no password step).
5. Onboarding step 0 — Welcome: "Hey {firstName}!" message, auto-advances
   after 5 seconds with no user action.
6. Onboarding step 1/2 — Upload ID: select ID Type, upload ID (front, or
   front+back depending on type — remaining fields instantly auto-fill
   with placeholder values), fill in/confirm ID Number,
   First/Middle/Extension Name, Birthday, Address/Province/City/Barangay/
   Zip Code, and the "Additional information" fields (Civil Status, Spouse
   Information if Married, TIN, Referral Source) → `setSignUpData()` (name
   fields) + `setPersonalInfo()`.
7. Onboarding step 2/2 — Selfie Verification: selfie-with-ID capture,
   simulated liveness/match, then check all 4 consent boxes →
   `setSignUpData({ termsAccepted: true })`, `setSelfiePhoto()`,
   `setSelfieVerified(true)`, `markSubmitted()` → `/auth/thank-you`.
8. `/auth/thank-you` — Application Confirmation with reference number,
   submission date, status, registered email, verified mobile → "Go to my
   dashboard" → `/borrower/dashboard`.
9. `/borrower/dashboard` — submitted application card (loan number, "Personal
   Loan" label, "Under Review", amount/term); can reset or file another
   application via `/borrower/apply` (still the old, unrestructured 4-step
   flow).
