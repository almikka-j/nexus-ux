# Admin — Dashboard

> **Maintenance rule:** update this file whenever `admin-dashboard-view.tsx`
> changes. Companion to `docs/230-project-overview.md` (directory map/tech
> stack) and `docs/050-admin-login.md` (this is where a successful admin login
> redirects to).

## What this is

The landing page after admin login (`AdminDashboardView`,
`src/sections/admin/admin-dashboard-view.tsx`, rendered at
`/admin/dashboard`). A lightweight welcome/overview screen — this
prototype has no real multi-application backend, so every stat and the
one action card below reflect the single live session's application, not
an aggregate across a real applicant base.

## Layout

1. **Greeting** — "Welcome back" + "Hi, {firstName} 👋", where
   `firstName` comes from the logged-in `adminUser` (falls back to
   "Admin" if somehow unset).
2. **Four stat cards** (`StatCard`, a local component — icon avatar +
   label + large bold value, in an `adminCardSx` box), in a row:
   - **Total Applications** — `1` if a live application exists
     (`!!signUpData && !!application.personalInfo`), else `0`.
   - **Pending Review** — same `1`/`0` as Total Applications. There's no
     distinct "reviewed" vs. "pending" concept tracked here — this stat
     is not currently derived from any real review-status field.
   - **Approved** — always `0`. Hardcoded; nothing on this page computes
     a real approved count.
   - **Overdue (3d+)** — `1` if there's a live application **and**
     `getAgingLevel(application.submittedAt) === 'overdue'`
     (`src/utils/format-aging.ts`), else `0`.
3. **"Applications awaiting review" card** — a single row: a short
   title/subtitle ("Start initial credit checking for newly submitted
   applications.") on the left, a **"View Application List"** button on
   the right linking to `paths.admin.accountSolicitation`
   (`/admin/account-solicitation`).

## Non-Goals / Open Items

- No real aggregate stats across multiple applications — every number on
  this page is a `0`/`1` derived from the single live session, or a
  hardcoded `0` (Approved). There is no backend to query a real count
  from.
- No charts, trends, or time-series data.
- No per-officer filtering — the dashboard doesn't distinguish "my
  applications" from anyone else's, since there's only ever one live
  application in this prototype.
