# Borrower — Dashboard

> **Maintenance rule:** update this file whenever
> `src/sections/borrower/dashboard-view.tsx` changes. Companion to
> `docs/020-borrower-application.md` (Application Confirmation's "Continue"
> action and `docs/040-borrower-sign-in.md`'s login both land here) and
> `docs/020-borrower-application.md`'s "Filing a second application" section
> (the "Apply for Loan" button below routes into `/borrower/apply`).

## What this is

The borrower's home screen after sign-up or login
(`BorrowerDashboardView`, `src/sections/borrower/dashboard-view.tsx`,
rendered at `/borrower/dashboard`). Renders one of two states based on
`hasApplication = !!signUpData && !!application.personalInfo`
(`useRegistration()`) — there is no real backend, so "has an
application" just means this browser's `RegistrationContext` has been
populated, whether through the real onboarding flow, "Fill with Sample
Data," or `docs/040-borrower-sign-in.md`'s login seeding a minimal session.

## Empty state (`EmptyDashboardState`)

Shown when `!hasApplication`. A two-column layout:

- **Left (hero card)** — a dark navy gradient card (same
  `bgGradient`/textured-background/floating-blur-circle treatment used
  on the admin/borrower auth screens) with a document icon, "You don't
  have any loans yet" heading, a short description ("Start a loan
  application and your loan summary, approval status and upcoming
  payments will appear right here."), and two buttons: **"Apply for
  Loan"** (`paths.borrower.apply`, filled white) and **"Estimate my
  payment"** (outlined, no handler — a static, non-functional button).
- **Right (checklist card)** — "What you'll need" + a fixed 4-item
  checklist (valid government ID, proof of income, bank account details,
  desired loan amount), plus a tinted info row: "Most applications take
  about **5 minutes** to complete."

## Has-application state

A single white card:

- **Header row** — a document icon avatar, "Loan No. {loanNumber}"
  (`getLoanNumber(signUpData.email)` — a deterministic hash of the
  applicant's email, not a real sequential ID) as the title, and a Loan
  Type subtitle beneath it (`application.loanType === 'business' ?
  'Business Loan' : 'Personal Loan'`).

  **Loan Type label side-effect:** new sign-ups never actually set
  `application.loanType` (it was removed from the borrower-facing flow —
  see `docs/020-borrower-application.md`'s "Loan Type removed from the
  primary flow" section), so this label always reads "Personal Loan" for
  every freshly-submitted application, regardless of the applicant's real
  loan purpose or the newer "Business Owner" *income source* field
  (which is a separate concept and doesn't set `loanType` either). This
  is an accepted, unfixed cosmetic side-effect — `application-details-card.tsx`
  (the admin-side equivalent) was separately fixed to fall back to
  `financialInfo.employmentStatus === 'Business Owner'`, but this
  dashboard label is its own component with its own copy of the ternary
  and was never touched by that fix.

- **Right side of header** — a status `Chip` that is **always** "Under
  Review" (`color="warning"`, `variant="soft"`) — there is no real
  status progression surfaced to the borrower anywhere on this page —
  plus a **"Reset Application"** button that calls `reset()`
  (`useRegistration()`), wiping localStorage back to the empty state.
- **Stats row** (only rendered `if (application.financialInfo)`) — three
  `LoanStat` entries divided by vertical dividers: **Total Loan Amount**
  (`₱{desiredLoanAmount}`, comma-formatted), **Loan Term** (`{months}
  months`), and **Application Status** (always "Under Review," the same
  hardcoded value as the header chip).

## Non-goals

- **No real status tracking** — "Under Review" is a permanent, hardcoded
  label; nothing on this page reflects the application's actual pipeline
  position (Initial Credit Checking → ... → Financial Evaluation, see
  `docs/230-project-overview.md`'s admin flow) or outcome (approved/
  rejected/reconsideration).
- **"Estimate my payment" is non-functional** — no handler, no
  calculator, no navigation.
- **No loan history/multiple-applications list** — this prototype has no
  real backend, so a borrower session only ever holds one live
  application; there is no equivalent here to the admin side's
  `docs/065-admin-applicant-profile.md` "Loan History" table.
