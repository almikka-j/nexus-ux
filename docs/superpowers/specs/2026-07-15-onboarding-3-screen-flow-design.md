# Onboarding: 3-Screen Application Flow — Design

## Problem

The current onboarding wizard is 5 local steps (Welcome → Loan Type →
Financial Info → Personal Info → Selfie), reached only after Sign Up + OTP
Verify. The user wants the *application itself* (post sign-up) reduced to a
3-screen flow: **Preliminary application → Upload ID → Selfie**. Sign-up
fields (email/mobile/password) and OTP verification are explicitly kept
exactly where they are today — this is purely an onboarding-wizard
restructuring, not a sign-up change.

Separately, `/borrower/apply` (the "file a second application" entry point
reached from the dashboard while already logged in) currently skips
Welcome and jumps straight into a 4-step version of the same wizard
(Loan Type → Financial Info → Personal Info → Selfie), with **no
verification step at all**. The user wants a verification screen added
there too, before its own 3-screen flow.

## Decisions

1. **Screen 1 — "Preliminary application"**: merges the current Loan Type
   step (`StepLoanType`) and Financial Info step (`StepFinancialInfo`) into
   one screen. Loan Type selection (Personal/Business cards) renders above
   the existing Financial Info fields (amount, term, employment, income,
   purpose), inside the same card/form. "Preliminary application" is
   already `StepFinancialInfo`'s own heading text today — this becomes the
   screen's title, with Loan Type folded in above it.

2. **Screen 2 — "Upload ID"**: this is functionally `StepPersonalInfo`
   as it exists today (ID upload + ID type/number + address/demographics +
   TIN + referral source) — just retitled/reframed as "Upload ID" instead
   of "Your personal information" / "Step 3 · Your details". No field
   changes.

3. **Screen 3 — "Selfie"**: unchanged, `StepSelfieVerification` as-is.

4. **Welcome screen (`StepWelcome`) is removed** from the sign-up onboarding
   flow. Its "Skip to Dashboard" escape hatch is dropped along with it —
   there's no longer an intermediate screen to host that link. (If a bail-out
   option is still wanted, that's a separate future decision; not requested
   here.)

5. **Sign-up (`/auth/sign-up`) and Verify (`/auth/verify`) are unchanged** —
   email/mobile/password collection and OTP verification stay exactly where
   they are, before the (now 3-screen) onboarding wizard.

6. **`/borrower/apply` gets its own verification screen**, reusing
   `VerifyView`'s component and mocked-OTP mechanism (`MOCK_OTP_CODE =
   '123456'`), inserted before its own 3-screen flow. Since `VerifyView`
   today hardcodes navigation to `/auth/onboarding` and a "back to sign up"
   link (wrong for this context — the user is already logged in and filing
   a second application), it needs a small generalization: an `onVerified`
   callback prop (and probably a way to suppress/redirect the "back to sign
   up" link) rather than a second, duplicated copy of the component.

7. Both wizards' `OnboardingLayout` step/`totalSteps` wiring updates to
   match the new 3-screen counts (was 5 for onboarding, 4 for apply).

## Open implementation questions (for the plan)

- Exact prop shape for making `VerifyView` reusable (`onVerified: () =>
  void` replacing the hardcoded `router.push(paths.auth.onboarding)`; what
  happens to the "← Return to sign up" link in the `/borrower/apply`
  context — hide it, or repoint it to the dashboard).
- Whether `/borrower/apply`'s new verify step needs its own local
  "verified" gate (separate from the global `RegistrationState.verified`
  flag, which is already `true` from the original sign-up) — likely yes,
  since re-verifying every time you file a second application via a
  reused *global* boolean that's already `true` would let the step be
  skipped/no-op. This should be local component state in the apply-flow
  wizard, not written back to `RegistrationState.verified`.
- New merged screen 1's component structure: a new `StepPreliminaryApplication`
  component (composing existing `LoanTypeCard`s + `StepFinancialInfo`'s form
  fields/schema), or keep them as two sub-renders on one logical "screen" in
  the wizard state machine. Prefer one new component for a true single-page
  feel (one card, one scroll, one Continue button, one combined zod schema)
  rather than two components visually stacked.
