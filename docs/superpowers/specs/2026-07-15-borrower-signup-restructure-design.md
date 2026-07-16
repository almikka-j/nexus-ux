# Borrower Sign-Up Restructure — Design

## Problem

Today, account creation (name/email/mobile/password) and OTP verification
happen entirely before any loan-qualifying information is collected — a
borrower creates a full account before finding out if they even qualify.
The user wants to flip this: screen the borrower on loan eligibility
*first*, and only ask for account credentials once they've qualified and
progressed through the application — minimizing screens and front-loaded
friction.

## New flow (fewest screens)

1. **Preliminary Application** (`/auth/sign-up` — same URL, new content and
   purpose) — the new front door. Collects:
   - Name: Prefix, First Name, Middle Name, Last Name, Extension
   - Email Address
   - Mobile Number
   - Desired Loan Amount
   - Loan Term
   - Source of Income (renamed from "Employment Status")
   - Monthly Income
   - Purpose of Loan

   On submit: if Desired Loan Amount < ₱150,000 → **soft-decline screen**
   (see below). Otherwise → proceed to step 2.

2. **Soft decline** (shown in place of navigating forward, not a separate
   route — same pattern as `LoanApplicationView`'s in-component step
   switch): a polite "thank you, not qualified right now" message
   referencing the ₱150,000 minimum, with a "Try Again" action that returns
   to the Preliminary Application form (values retained) and a link back to
   the homepage. No account exists yet at this point — nothing to clean up.

3. **Verify Mobile Number + Create Password** (`/auth/verify` — same URL,
   expanded content) — two sub-steps in one screen/route, minimizing screen
   count per the user's "as few screens as possible" instruction:
   - Sub-step A: OTP entry (reuses the existing mocked mechanism,
     `MOCK_OTP_CODE = '123456'`), same as today.
   - Sub-step B (revealed in place after successful OTP, via the existing
     `VerifiedTransition` animation as the hinge): Password + Confirm
     Password, plus Terms Accepted (required) and Marketing Consent
     (optional) checkboxes. This is the actual account-creation moment —
     `setSignUpData()` doesn't fire until this sub-step submits.

4. **Upload Valid ID** — ID Type, ID Number, ID File upload, plus the
   personal-details fields that don't have another home in the new flow:
   Address, Province, City, Barangay, Civil Status, Gender, TIN Number,
   Referral Source. Functionally today's `StepPersonalInfo`, retitled.

5. **Selfie Verification** — unchanged, today's `StepSelfieVerification`.

6. **Application Submitted** (`/auth/thank-you` — same URL). Unchanged
   destination; `markSubmitted()` still fires here.

Then → `/borrower/dashboard`, unchanged.

## Key decisions

- **Threshold check happens on submit of Preliminary Application**, not
  live/inline while typing.
- **No email/account exists before qualification is confirmed.** This is a
  deliberate reordering: today the account is created (`setSignUpData`)
  before verification; in the new flow, `signUpData` (name/email/mobile)
  is captured provisionally at Preliminary Application submission (needed
  to know *who* to send the OTP to), but the account isn't considered
  "complete" until Password is set in step 3B. If the borrower abandons
  between steps 1 and 3B, there's a `signUpData` object with no password —
  acceptable for this prototype (no backend, no real account persistence
  risk), but worth noting as a state-shape nuance.
- **Terms Accepted / Marketing Consent move to the Verify+Password
  screen**, not the Preliminary Application screen — they're being agreed
  to at the moment the account is actually created.
- **`/auth/login` is untouched** — it's for returning users with an
  existing (fully created, password-set) account; this restructuring only
  affects new-user sign-up.
- **`/auth/sign-up` and `/auth/verify` keep their URLs** — marketing links,
  header CTAs, etc. that point at `/auth/sign-up` continue to work
  unchanged; only the component rendered at that route changes.
- **`/borrower/apply`** (filing a second application from the dashboard)
  is a related but separate concern — out of scope for this redesign
  unless the user asks for it explicitly; it already has its own existing
  4-step flow reusing `StepLoanType`/`StepFinancialInfo`/`StepPersonalInfo`/
  `StepSelfieVerification`, which will need her own follow-up pass once
  this primary flow is settled (not addressed here, since the user's
  instructions were scoped to the primary sign-up funnel).

## Data model implications (for the plan to work out precisely)

- `SignUpData` gains a `prefix?: string` field (new) to match "Prefix" in
  the Name group.
- A new combined "Preliminary" schema replaces today's `SignUpSchema` (name
  + email + mobile, minus password/confirm/consent) merged with today's
  `FinancialInfoSchema` (minus the loan-type selector, which is dropped
  entirely per this flow — **loan type as a Personal/Business choice is not
  in the new flow's field list at all**; flagging this as a real removal,
  not an oversight, since the user's field list never mentions it).
- Password/Confirm/Terms/Marketing move into a new schema paired with the
  Verify step.
- `LoanType` becomes unused unless something downstream still needs it —
  needs a decision in the plan (keep the field defaulted/unset since admin
  views may still read `application.loanType` for display, or remove it
  entirely — the safer, lower-risk choice is to keep the field in the type
  but stop collecting it from the borrower, defaulting to `null`, since
  purging it from `ApplicationData`/admin views is a larger blast radius
  than this conversation's scope).
