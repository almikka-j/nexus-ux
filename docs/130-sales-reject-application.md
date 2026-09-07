# Sales — Reject Application (Reconsideration / Negative List)

> **Maintenance rule:** update this file whenever `reconsideration-view.tsx`
> or `negative-list-view.tsx` change. Companion to
> `docs/070-account-solicitation-initial-credit-checking.md` (the step whose
> "Not Approved" outcome routes here) and
> `docs/080-account-solicitation-call-report.md` (a reconsidered "Approved"
> outcome routes there next).

## What this is

The rejected-track flow for an application not approved on Initial
Credit Checking — two connected screens, deliberately separate from the
main forward-moving pipeline (Initial Credit Checking → ... → Financial
Evaluation): being sent to Reconsideration means the application was
already rejected, so it isn't a forward step in "the process."

**Neither screen has a sidebar nav entry** — the "For Reconsideration"
section that used to hold both (`reconsiderationTrackItems`,
`src/layouts/admin/config-nav-admin.tsx`) was removed. Both remain real,
reachable routes: Reconsideration is routed to directly from Initial
Credit Checking's own "Not Approved" outcome
(`paths.admin.applicationsByStep('reconsideration')`), and Negative List
is reachable at its own URL (`paths.admin.negativeList`,
`/admin/negative-list`) — there is just no link to it anywhere in the
admin UI now.

1. **Reconsideration** (`ReconsiderationView`,
   `src/sections/admin/reconsideration-view.tsx`, rendered at
   `/admin/applications/[id]/reconsideration`) — a second look at a
   rejected application.
2. **Negative List** (`NegativeListView`,
   `src/sections/admin/negative-list-view.tsx`, rendered at
   `/admin/negative-list`) — a running record of applicants who were
   *not* approved on reconsideration either.

There is no real backend — both screens read/write the same
localStorage-backed `AdminContext` every other admin page uses.

## Reconsideration

`review.reconsideration: { notes: string; decision: CreditCheckDecision }`
(`src/auth/admin-context.tsx`).

**Layout**, top to bottom:

1. `ApplicationReviewHeader` (`step="Reconsideration"`,
   `reviewStep="reconsideration"`).
2. A tinted error-tone banner: "Not approved on initial credit checking" +
   a prompt to review notes and decide, plus (if present)
   `review.creditChecking.decisionReason` shown as an italicized quote.
3. **"Notes from initial credit checking"** card — only rendered if
   `review.creditChecking.notes` exists — showing that history via the
   shared `OfficerNotesHistory` component.
4. **"Reconsideration notes"** card — a single multiline `TextField`
   (`notes`, local `useState`, seeded from
   `review.reconsideration.notes`) for documenting adjustments/context.
5. **"Approved?"** card — two buttons: **"Approve"** (green,
   `handleDecision('approved')`) and **"No — Notify Client"** (outlined,
   `handleDecision('rejected')`).

**`handleDecision(decision)`** always calls
`setReconsideration({ notes, decision })` first, then branches:

- **`'approved'`** — routes to Call Report
  (`paths.admin.callReport(encodeURIComponent(signUpData.email))`) — a
  reconsidered-and-approved application re-enters the main pipeline at
  Call Report, not back at Initial Credit Checking.
- **`'rejected'`** — calls `addToNegativeList({ email, name, reason:
  notes || 'Not approved on reconsideration' })`, then flips local
  `notified` state to `true`.

**Client Notified screen** — once `notified` is `true`, the whole page
is replaced by a terminal state: `ApplicationReviewHeader` re-labeled
"Reconsideration · Client Notified", a red envelope icon, "Client has
been notified," an explanatory line, and a **"Back to Application
List"** link (`paths.admin.accountSolicitation`). There is no way back
from this screen to re-decide — it's a one-way terminal outcome, same
convention as other terminal screens in this app (e.g. Appraisal's
Pass/Fail "Process stopped" screen).

## Negative List

`negativeList: NegativeListEntry[]` (`src/auth/admin-context.tsx`),
where `NegativeListEntry = { email, name, reason, recordedAt }`.
`addToNegativeList(entry)` is idempotent per email — it's a no-op if an
entry for that email already exists (`prev.negativeList.some((item) =>
item.email === entry.email)`), otherwise appends with
`recordedAt: new Date().toISOString()` stamped at insert time.

The only writer of this list is Reconsideration's "No — Notify Client"
outcome above; there is no other admin action that adds to it, and
nothing on this page itself removes an entry.

**Layout** — a plain list page (`/admin/negative-list`), no filtering or
search:

- **Has entries**: one bordered card per entry — a red shield-cross icon
  avatar, the applicant's name, email, the recorded `reason` (falls back
  to "Not approved on reconsideration" if the officer left Reconsideration
  Notes blank), and a "Recorded {date/time}" line.
- **Empty**: a centered placeholder — shield-check icon, "No records
  yet," "Applicants not approved on reconsideration will be listed
  here."

## Decision Gate

Reconsideration's **"Approved?"** card is the gate — ungated by any
completeness check:

- **Approve** → routes to Call Report (`paths.admin.callReport`); the
  application re-enters the main pipeline at Call Report, not at Initial
  Credit Checking.
- **No — Notify Client** → `addToNegativeList(...)` + a one-way terminal
  "Client Notified" screen. There is no path back from there.

## Fabricated Claims — Real vs. Simulated

- **No backend** — both screens read/write the same `localStorage`
  `AdminContext`.
- **"Client has been notified" is a label only** — no email/SMS is sent.
- **`negativeList` is durable** — deliberately excluded from
  `resetReview()` so it behaves like a real historical record.

## Non-Goals / Open Items

- **No re-entry point from Negative List back into the pipeline** — once
  an applicant lands here, this screen offers no action (no "reconsider
  again," no delete, no export).
- **No real client notification** — "Client has been notified" is a
  label only; no email/SMS is actually sent, same simulated-outreach
  convention as every other "notify"/"request documents" action in this
  app.
- **Persisted across `resetReview()`** — `negativeList` is intentionally
  excluded from the fields a full application reset clears (see
  `admin-context.tsx`'s reset logic comment: "a real historical
  record..."), so it behaves like `adminUser` — durable session data, not
  part of the per-application review state.
