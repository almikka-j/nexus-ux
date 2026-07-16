# Borrower Sign-Up → Loan Application Restructure — Design

## Problem

The current 4-screen flow (Preliminary Application → Verify+Password →
Upload ID → Selfie) already reflects an earlier "eligibility-first"
restructuring, but still frames itself partly as account creation (a
"Create your password" screen the borrower must complete manually). The
user wants the experience to feel entirely like **applying for a loan**,
with account creation happening invisibly in the background — no visible
password step, an ID verification step with simulated OCR extraction/review,
and a consent section bundled into the final submission moment.

## Confirmed screens (5, matching the user's spec)

1. **Preliminary Application** — mostly exists today (`PreliminaryApplicationView`
   at `/auth/sign-up`), reorganize per the field list below, retain the
   ₱150,000 qualification threshold and soft-decline branch.
2. **Mobile OTP Verification** — its own page (not modal/inline — confirmed),
   reusing `VerifyView`'s existing OTP mechanism (`MOCK_OTP_CODE`, resend
   cooldown). **No visible password step** — the `CreatePasswordStep`
   sub-step is removed entirely. On successful OTP, the account is
   considered auto-created (no password ever shown to the borrower — the
   Confirmation screen just states one was emailed, without displaying it,
   since there's no real email delivery to simulate against in this
   prototype).
3. **ID Verification** (new) — **one page, progressive sections**, modeled
   on `StepSelfieVerification`'s existing state-machine pattern (single
   component, internal `state` drives which section is visible) rather than
   separate sub-pages:
   - Section A (always visible first): **ID Type** select, then the Upload
     dropzone — confirmed order, ID Type chosen before the upload control is
     usable/relevant.
   - On file selected: a simulated **"Processing…"** state (2–3s, spinner)
     appears in place of/below the dropzone.
   - Once "processed": a **Review** section reveals below, showing
     "extracted" fields — **Full Name** (carried forward from Preliminary
     Application, shown for confirmation), **ID Number**, **Address** —
     editable, explicitly labeled as extracted from the ID (e.g. a small
     "Extracted from your ID — please review" caption), so the borrower can
     correct any misread value before confirming.
   - Manual (non-extracted) fields appear in the same Review section,
     visually separated (e.g. a divider + "Additional details" label):
     Province/City/Barangay, Gender, Civil Status, TIN Number, Referral
     Source — unchanged from today's `PersonalInfo` fields.
   - A single "Confirm & Continue" action (replacing today's generic
     "Continue") advances to Selfie Verification once all required fields
     validate.
4. **Selfie Verification** — reuses today's `StepSelfieVerification`
   mechanics almost unchanged (live camera, face/ID positioning guide,
   3-2-1 auto-countdown, retake, simulated ~1.8s liveness/match check).
   Adds one short lighting/positioning instruction line before camera
   start, per the spec's ask, e.g. "Find a well-lit spot and make sure your
   face is clearly visible." **Consent section is bundled into this same
   screen**, appearing after a successful selfie match, immediately above
   the final Submit button: four required/near-required checks — accurate
   information, Terms & Conditions, Privacy Policy, and ID/facial-image
   processing consent. Submit stays disabled until all consent items are
   checked (and selfie is verified).
5. **Application Confirmation** — replaces today's static `ThankYouView`
   content with real derived data: Application Reference Number (reuses
   existing `getLoanNumber(email)`, `PGFC-######` format), Submission Date
   (from `markSubmitted()`'s timestamp), Current Status (e.g. "Under
   Review" — matches the existing borrower-dashboard status framing),
   Registered Email, Verified Mobile Number, and a message that a temporary
   password was sent to the registered email (**not displayed anywhere in
   the UI** — confirmed; this prototype has no real email delivery to
   simulate against, so showing "check your email" text without actually
   producing a visible password anywhere is the honest simulation boundary),
   plus suggested next steps (e.g. "Log in anytime to track your
   application" linking toward `/auth/login`).

## Qualification / soft-decline

Unchanged threshold (₱150,000) and branch structure from the existing
`PreliminaryApplicationView`, but the "saved with appropriate backend
status" requirement gets a real (if prototype-scoped) mechanism: a new
`preliminaryStatus: 'declined' | 'qualified' | null` field on
`RegistrationState`, set to `'declined'` when the soft-decline branch fires
(persisted via the existing sessionStorage mechanism, so there's a durable
signal that a submission happened and was declined, even though nothing
downstream currently reads it beyond this). Soft-decline messaging gets a
copy pass for warmer, more encouraging tone per the spec's explicit ask
("avoid language that sounds harsh, final, or discouraging").

## Password removal — the load-bearing structural change

`CreatePasswordStep` (currently a sub-step inside `VerifyView`, shown after
OTP success) is deleted entirely. `SignUpData.password` stays in the type
(other code may reference it) but is set to a fixed placeholder string
(e.g. `''` or a literal marker) rather than ever being borrower-entered —
since there's no real backend issuing/emailing a real temp password, and
the user confirmed the temp password itself should never be shown anywhere
in the UI. `verified` flips to `true` directly after OTP success (reverting
to the simpler pre-"password sub-step" semantics), removing the load-bearing
"verified means password is set too" logic introduced in the last
restructuring — since password creation no longer exists as a borrower
action at all.

`Terms Accepted`/`Marketing Consent` (previously collected in
`CreatePasswordStep`) move to the new consent section on the Selfie/Submit
screen (item 4 above).

## Field reorganization for Preliminary Application

Per the user's explicit list and order:
- Name (Prefix/First/Middle/Last/Suffix — keep the existing compact 5-column
  row from the last space-saving pass)
- Email Address
- Mobile Number
- Purpose of Loan
- Desired Loan Amount
- Preferred Loan Term
- Source of Income
- Monthly Income

This reorders the financial fields (today's order is Amount → Term →
Income Source → Monthly Income → Purpose; the user's spec puts Purpose
right after Mobile Number, before Amount). Labels get a pass too
("Preferred Loan Term" instead of "Loan term", "Source of Income" already
matches).

## Out of scope / unchanged

- `/borrower/apply` (filing a second application from the dashboard) —
  still explicitly out of scope, per the established pattern from the last
  two restructurings. It keeps its own older Loan Type → Financial Info →
  Personal Info → Selfie flow untouched.
- `/auth/login` — unaffected.
- No real backend, no real OCR/AI service, no real email delivery — all
  confirmed as out of scope; this plan only changes what's simulated and
  how it's framed to the borrower.
