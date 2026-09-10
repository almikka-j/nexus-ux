# Borrower — Sign In

> **Maintenance rule:** update this file whenever `src/sections/auth/login-view.tsx`
> or `src/auth/mock-login.ts`'s `DEMO_ACCOUNT`/`mockLogin` change.
> Companion to `docs/020-borrower-application.md` (the sign-up/onboarding flow
> a "Sign up" link on this page leads into) and `docs/030-borrower-dashboard.md`
> (a successful login lands there) and `docs/050-admin-login.md` (the
> admin-facing equivalent — a separate component, separate demo account).
>
> **Design scope:** an auth screen — the admin design system
> (`docs/225-admin-design-system.md`) does **not** apply. Field styling is
> `src/sections/auth/auth-input-styles.ts`.

## What this is

The returning-borrower sign-in screen (`LoginView`,
`src/sections/auth/login-view.tsx`, rendered at `/auth/login`) — distinct
from the sign-up/onboarding journey documented in
`docs/020-borrower-application.md`, which a brand-new applicant goes through
instead. This page is for someone who already has an account signing back
in.

There is no real backend or authentication service — `mockLogin()`
(`src/auth/mock-login.ts`) checks the typed email/password against one
hardcoded `DEMO_ACCOUNT` (`borrower@pgfinance.com.ph` / `Password123`,
name "Stephanie Molina") after an artificial 600ms delay, then either
resolves with `{ email, firstName, lastName }` or throws a real
validation error ("Incorrect email or password. Try
borrower@pgfinance.com.ph / Password123.") — same simulated-auth pattern
`mockAdminLogin()`/`ADMIN_DEMO_ACCOUNT` uses on the admin side
(`docs/050-admin-login.md`), just a separate account/component so the two
roles' sessions never share state.

## Layout

Split-panel layout, same `AuthBrandPanel` convention the sign-up/
onboarding flow uses (`docs/020-borrower-application.md`) — left panel: a
shield-check icon, "Welcome back to PG Finance." title, a description
about tracking applications/payments, and the shared checklist treatment
(`checklist` prop). Right panel, centered form:

- "Log in" title + "Don't have an account yet? Sign up" link
  (`paths.auth.signUp`, into the Preliminary Application flow).
- **"Fill with Sample Data" / "Remove Sample Data"** toggle — fills (or
  clears) the form with `DEMO_ACCOUNT`'s email/password via `reset()`,
  same dev-convenience convention used throughout this app; local
  `isSample` state only, not persisted.
- Email address field, Password field (`type` toggles between
  `password`/`text` via a trailing eye `IconButton`), plus a
  non-functional "Forgot password?" link (no handler — a static link, no
  reset flow built).
- A validation `Alert` (error severity) shown only after a failed submit
  attempt.
- **"Log in"** submit button (label swaps to "Logging in..." while
  `isSubmitting`), followed by a reCAPTCHA/Google-policy disclaimer line
  (`docs/020-borrower-application.md` and this page both use the same
  disclaimer copy; no real reCAPTCHA is actually integrated).

## Behavior

On submit: calls `mockLogin(email, password)`. On success:

- **If `signUpData` is not already set** (no prior session in this
  browser), calls `setSignUpData(...)` with the mock account's
  name/email and blank mobile/password/consent fields — this seeds a
  minimal `RegistrationContext` session so the dashboard has a name to
  greet, without fabricating a full fake application.
- **If `signUpData` already exists** (e.g. the borrower had just gone
  through onboarding in this same session), it's left untouched — this
  page never overwrites an existing live session's data.
- Navigates to `paths.borrower.dashboard` (`/borrower/dashboard`,
  `docs/030-borrower-dashboard.md`) either way.

On failure: shows the thrown error message in the `Alert`; the form
stays filled.

## Non-Goals / Open Items

- No real authentication, session tokens, or password hashing — a
  single hardcoded demo account checked client-side.
- No real "Forgot password" flow — the link renders but does nothing.
- No real reCAPTCHA — the disclaimer text is copy only.
