# Borrower Sign-Up Flow — UX Fixes

## Context

A full UX audit of the borrower sign-up/onboarding flow (`/auth/sign-up` →
`/auth/verify` → `/auth/onboarding` → `/auth/thank-you` →
`/borrower/dashboard`) turned up ~40 issues spanning copy, flow, and
consistency. This spec scopes the subset that will actually be fixed.

**Explicitly out of scope (left as-is, by design):** the OTP/demo-login
codes being revealed in error messages, the "Fill with Sample Data"
buttons, the complete absence of a real backend/OCR/face-match, and the
two separate Terms & Conditions consent checkboxes across Preliminary
Application and Selfie Verification. These are established, intentional
patterns for this prototype — not bugs.

## Fixes

### 1. Selfie step mislabeled "Step 4"

`step-selfie-verification.tsx` — the on-screen header reads `"Step 4 ·
Verify it's you"`, a leftover from a pre-restructuring version of the flow
that had more steps. The onboarding wizard only has 2 form steps today.
Change to `"Step 2 · Verify it's you"`.

### 2. Progress bar reads 100% while still mid-form

`onboarding-view.tsx` — `ProgressBar` fills completely on step 2 (Selfie)
even though the borrower hasn't submitted yet, indistinguishable from
actually being done. Cap the bar so step 2 of 2 renders as "almost done"
(not fully solid) until the application is actually submitted; only the
Thank You screen shows a fully complete bar. Concretely: treat the
progress fraction as `(step - 0.5) / totalSteps` while still in the
wizard, so step 1 → 25%, step 2 → 75%, rather than step/totalSteps (50%,
100%).

### 3. "Reset Application" has no confirmation

`dashboard-view.tsx` — the button calls `reset()` directly on click,
instantly and irreversibly wiping all localStorage state. Add a
`window.confirm('Are you sure you want to reset your application? This cannot be undone.')`
guard; only call `reset()` if confirmed.

### 4. Province list covers only 5 of ~80 PH provinces

`step-personal-info.tsx` — `PROVINCES` is `['Metro Manila', 'Cebu', 'Davao
del Sur', 'Laguna', 'Cavite']`, a required field with no escape hatch. A
real borrower from any other province cannot complete the form. Expand to
the full list of Philippine provinces (using a standard reference list),
keeping the same `Field.Select` pattern. Applies to both the borrower's own
province and spouse's province selects, since they share the same list.

### 5. "Save & exit" overpromises

`onboarding-view.tsx` — the label implies the current screen's in-progress
edits are saved, but only *previously-submitted* step data persists (each
step only writes to context on its own "Continue"/submit). Reword to "Exit"
(dropping "Save &") so it doesn't claim to save anything it doesn't.

### 6. PHP vs. ₱ inconsistency

`preliminary-application-view.tsx` — Desired Loan Amount and Monthly Income
use a text `"PHP"` `InputAdornment`, while the soft-decline screen, Thank
You, and Dashboard all use "₱". Change both adornments to "₱" for
consistency.

### 7. Loan Type always shows "Personal Loan"

`dashboard-view.tsx` — label reads `application.loanType === 'business' ?
'Business Loan' : 'Personal Loan'`, but new sign-ups never set `loanType`
(it's `null`) regardless of the borrower's chosen income source. Since
Business Owner income source is the closest available signal, derive the
displayed label from `application.financialInfo?.employmentStatus ===
'Business Owner'` instead of the never-set `loanType` field when
`loanType` is null, so a Business Owner's dashboard correctly reads
"Business Loan".

### 8. CTA button phrasing inconsistency

Unify the primary continue/submit button across all four form-bearing
screens to the same "Continue →" pattern except where the action is
truly final:
- Preliminary Application: "Continue →" (unchanged)
- Verify: "Verify & continue" → "Continue →"
- Upload ID: "Continue →" (unchanged)
- Selfie Verification: "Submit Application →" (unchanged — this one really
  is the final, distinct action and should read differently)
- Thank You: "Go to my dashboard →" (unchanged — also a distinct, final
  action)

### 9. "preliminary application" leaks internal terminology

`verify-view.tsx` — the back-link reads "← Return to preliminary
application," the only place in the borrower-facing flow that uses this
internal name. Change to "← Return to loan application" to match
terminology used elsewhere (Thank You, Selfie Verification).

### 10. "Auto-filled" banner overclaims

`step-personal-info.tsx` — the banner says fields "were populated from
your ID," which is untrue (canned placeholder values, not OCR). Reword the
banner to avoid the false specific claim while keeping the double-check
instruction, e.g.: "Some fields below were pre-filled for you. Please
double-check the information before continuing." Change the per-field chip
label from "Auto-filled" to "Pre-filled" to match. This only touches the
borrower-facing chip in `step-personal-info.tsx` — the admin CIC form's own
"Auto-filled" chip (`bureau-reports-card.tsx`) reflects a real API
integration and keeps its current label; the two are independent
components and this change does not touch it.

### 11. "Matching your face to your ID…" overclaims

`step-selfie-verification.tsx` — implies a real biometric comparison ran.
Reword to something that doesn't assert a specific verification mechanism,
e.g. "Reviewing your photo…".

### 12. Business Type select missing empty-state placeholder

`preliminary-application-view.tsx` — every other select on this screen
(Prefix, Source of Income) uses `displayEmpty` + a "Select ___" placeholder
via `SelectProps.renderValue`; Business Type doesn't, so it's unclear
whether a selection has been made. Add the same `displayEmpty` +
placeholder pattern used by the other selects on this screen.

### 13. Monthly Income has no thousands-separator formatting

`preliminary-application-view.tsx` — Desired Loan Amount (same row) is a
formatted `Controller`-driven field with comma separators; Monthly Income
is a raw `type="number"` input. Apply the same formatting pattern
(`formatThousands()` helper, `Controller`-driven, strips non-digits,
coerces to `Number`) to Monthly Income for consistency within the same row.

## Non-goals

- Not adding a review/summary screen before final submission.
- Not changing the two-separate-consent-checkbox structure.
- Not building a real loan-payment estimator or wiring "Estimate my
  payment" to anything — left exactly as-is per explicit instruction.
- Not touching the OTP/demo-login code reveals, "Fill with Sample Data"
  buttons, or any other Tier 3 item from the audit.
- Not changing the underlying `RegistrationState` shape, routes, or the
  overall step sequence — this is a copy/polish/consistency pass, not a
  flow redesign.

## Testing

Since this is a UI-only prototype with no automated test suite for this
flow (per `PROJECT_OVERVIEW.md`), verification is manual: walk the full
borrower flow in a browser (Preliminary Application → Verify → Welcome →
Upload ID → Selfie → Thank You → Dashboard) after the changes and confirm
each fix visually, plus a `tsc --noEmit`/`eslint` pass.
