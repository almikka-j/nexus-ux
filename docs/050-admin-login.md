# Admin — Login

> **Maintenance rule:** update this file whenever `admin-login-view.tsx`
> or `src/auth/mock-login.ts`'s `ADMIN_DEMO_ACCOUNT`/`mockAdminLogin`
> change. Companion to `docs/060-admin-dashboard.md` (successful login lands
> there) and `docs/040-borrower-sign-in.md` (the borrower-facing equivalent —
> a separate component, separate demo account, same mocked-auth pattern).

## What this is

The admin sign-in screen (`AdminLoginView`,
`src/sections/admin/admin-login-view.tsx`, rendered at `/admin/login`).
Every admin page's layout redirects here (`router.replace(paths.admin.login)`)
whenever `hydrated && !adminUser`, so this is the gate every admin route
sits behind.

There is no real backend or authentication service — `mockAdminLogin()`
(`src/auth/mock-login.ts`) checks the typed email/password against one
hardcoded `ADMIN_DEMO_ACCOUNT` (`admin@pgfinance.com.ph` /
`Admin123`, name "Ramon Cruz") after an artificial 600ms delay, then
either resolves with `{ email, firstName, lastName }` or throws a real
validation error ("Incorrect email or password. Try
admin@pgfinance.com.ph / Admin123.") — the same simulated-auth
convention `mockLogin()`/`DEMO_ACCOUNT` uses for the borrower-facing
login (`docs/040-borrower-sign-in.md`), just a separate account/component so
the two roles' sessions never share state.

## Layout

A centered card on a dark navy (`#132155`) textured background with two
floating decorative blurred circles (`pgAdminFloatA`/`pgAdminFloatB`
keyframe animations) — visually distinct from the borrower auth pages'
split-panel `AuthBrandPanel` layout, since this is a staff-only portal,
not part of the borrower's own branded journey. Inside the white card:

- A shield icon avatar + "Admin Portal" title + "Sign in to access the
  LMS admin portal." subtitle.
- **"Fill with Sample Data" / "Remove Sample Data"** toggle button —
  fills (or clears) the form with `ADMIN_DEMO_ACCOUNT`'s email/password
  via `reset()`, same dev-convenience convention used throughout this
  app's forms; local `isSample` state only, not persisted.
- Email address field, Password field (`type` toggles between
  `password`/`text` via a trailing eye `IconButton`).
- A validation `Alert` (error severity) shown only after a failed submit
  attempt.
- **"Log in"** submit button (label swaps to "Logging in..." while
  `isSubmitting`).
- A footer line: "Restricted access — for authorized LMS staff only."

## Behavior

On submit: calls `mockAdminLogin(email, password)`. On success, calls
`setAdminUser(account)` (`useAdmin()`, `src/auth/admin-context.tsx`) and
navigates to `paths.admin.dashboard` (`/admin/dashboard`,
`docs/060-admin-dashboard.md`). On failure, shows the thrown error message
in the `Alert` — the form stays filled, nothing is cleared.

`setAdminUser` persists to the same localStorage-backed `AdminContext`
every other admin page reads `adminUser`/`hydrated` from — logging in
here is what every other admin route's own auth-gate layout is waiting
on.

## Non-Goals / Open Items

- No real authentication, session tokens, or password hashing — a
  single hardcoded demo account checked client-side.
- No "forgot password," multi-factor, or account-lockout flow.
- No distinct admin roles/permissions — every logged-in admin sees the
  same nav and every page, regardless of role (Officer, Appraiser,
  Approver, etc. are all simulated via page actions rather than real
  distinct logins — see `docs/170-request-appraiser.md` and sibling
  "Request" docs for that convention).
