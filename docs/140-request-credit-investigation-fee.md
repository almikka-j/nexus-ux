# Request — Credit Investigation Fee

> **Maintenance rule:** update this file whenever
> `credit-investigation/ci-fee-card.tsx` changes. Companion to
> `docs/100-credit-investigation.md` (the page this card lives on),
> `docs/150-request-credit-investigation-fee-approval.md` (the CI Head/
> Approver's own dedicated `/admin/ci-fee-approval` screens — a second
> way to trigger the same approve/decline outcomes), and
> `docs/210-request-payments.md` (once approved, `ciFeeApprovedAt`/
> `ciFeePayment` and the actual "record payment / mark as paid" action
> live entirely on that page, not here).

## What this is

`CiFeeCard` (`src/sections/admin/credit-investigation/ci-fee-card.tsx`)
is the **request-side** CI Fee card, rendered directly on the Credit
Investigation page (see `docs/100-credit-investigation.md`'s "Page order").
This is where an officer decides whether the application needs a CI Fee
and, if so, requests it — the approval/decline decision itself is a
separate action, made either inline on this same page (a simulated
"another officer" page action) or on the dedicated Credit Investigation -
Fee Approval
screens (`docs/150-request-credit-investigation-fee-approval.md`).

Its layout and decision flow were rebuilt to mirror Appraisal Fee's own
card exactly (`docs/170-request-appraiser.md`'s "Appraisal Fee" section),
replacing this card's earlier full-width tinted-status-banner-with-
inline-buttons design.

## Layout

The card opens with a compact header row: a **"CI Fee"** title +
`StatusBadge` pill (`STATUS_BADGE_COPY`, one entry per `CiFeeStatus`
value — `not-requested` → "Draft"/neutral, `pending-approval` → "For
Approval"/warning, `approved` → "Approved"/success, `not-applicable` →
"No Fee"/neutral), a one-line summary underneath once a request exists
(`{amount} requested` while pending/approved, "No fee needed for this
application." while not-applicable), and a single button on the right —
**"Request CI Fee"** (contained, navy) while editable, **"View CI Fee"**
(outlined) otherwise.

Clicking it opens a `Dialog`; the Yes/No decision and the amount/
description/remarks fields all live inside that modal, not inline on the
card itself (same `FeeNeededOption` selectable-pill component Appraisal
Fee's own modal uses, reimplemented locally here — kept in sync manually
rather than shared, same convention every other admin file that reuses
this exact shape follows). Draft state
(`needsFeeDraft`/`amountDraft`/`descriptionDraft`/`remarksDraft`) only
commits to `review.creditInvestigation` when "Send Request" is clicked;
closing the modal without sending discards it.

## Editability

**`feeEditable` is `ciFeeStatus === 'not-requested' || ciFeeStatus ===
'not-applicable'`** — not just `'not-requested'` alone. This is the CI
Fee equivalent of Appraisal Fee's own `feeEditable` set
(`'not-submitted' | 'declined'`): an officer who marked "No CI Fee" can
still reopen the modal and decide the application actually needs a fee
after all, without a separate dedicated "Actually, this has a CI Fee"
button the way the card's earlier design required — the same "Request CI
Fee" button and modal handle both the first decision and any later
reversal. Opening the modal on a `'not-applicable'` request defaults the
Yes/No selector to "No" (matching its current state), same "default to
what's already true" convention the fresh `'not-requested'` case uses
defaulting to "Yes" (the common case).

## Data model and decision flow

`review.creditInvestigation.ciFeeStatus: 'not-requested' | 'pending-approval'
| 'approved' | 'not-applicable'`. While editable, the officer picks **Yes**
(shows Request Amount / Request Amount Description / Remarks fields, then
"Send Request" moves the status to `'pending-approval'`) or **No** (moves
straight to `'not-applicable'` on Send).

There is no separate approver role or login in this prototype, so
approval/decline can't be self-served by the same officer who made the
request — while `ciFeeStatus === 'pending-approval'`, the Credit
Investigation page registers two actions (via `useRegisterPageActions`)
into the floating settings popover (bottom-right gear icon → Page
actions), same convention as "Force Clean/Negative Bureau Finding"
elsewhere in this app:

- **"Simulate: Another Officer Approves CI Fee"** — sets
  `ciFeeStatus: 'approved'` directly, no confirmation dialog.
- **"Simulate: Another Officer Declines CI Fee"** — opens a `ConfirmDialog`
  ("Reason for declining CI Fee") requiring a typed reason before its
  Confirm button enables (same confirm-before-mutating,
  reason-required convention as Disapprove elsewhere on the Credit
  Investigation page); confirming resets `ciFeeStatus: 'not-requested'`,
  clears the amount/description/remarks fields, and records the typed
  reason in `ciFeeDeclineReason` — the same re-entry point as an
  application that never requested a fee, so the officer can re-request
  from this card with corrected terms.

A second, fuller-review way to trigger the same two outcomes lives on the
CI Head/Approver's own dedicated screens at `/admin/ci-fee-approval` —
see `docs/150-request-credit-investigation-fee-approval.md`. An officer can
act from whichever surface they're already on; both write the same
`review.creditInvestigation` fields.

Once approved (or marked not-applicable), the CI Report card on the
Credit Investigation page unlocks — it's shown as a dashed placeholder
until then.

## Dev/testing: Fill Sample Data

The page action **"Fill with Sample Data"/"Remove Sample Data"** (on the
Credit Investigation page) is scoped to CI Fee + CI Report only — its
label toggles on `isSampleFilled`
(`review.creditInvestigation.report.transcriptFileName ===
'sample-transcript.pdf'`), not on document completeness and, importantly,
not on `ciFeeStatus`. `ciFeeStatus` alone can't be used as the signal
because it also reaches `'pending-approval'`/`'approved'` via the normal,
real "Yes, Request CI Fee" + approval workflow — unrelated to this dev
shortcut — which would otherwise mislabel the action "Remove Sample Data"
after genuine officer work and risk wiping a hand-filled CI Report.
Instead the toggle keys off the literal `transcriptFileName` value that
only `handleFillSampleData` itself ever writes (a real transcript upload
never produces this exact filename).

Filling sets `ciFeeStatus: 'approved'` with a sample amount/description,
then populates a subset of `CiReport` — see `docs/100-credit-investigation.md`'s
"CI Report" section for exactly which fields. Clearing resets those same
fields back to blank plus `ciFeeStatus: 'not-requested'`.

## Decision Gate

`ciFeeStatus` is the gate on the CI Report card: it stays a dashed
placeholder until `ciFeeStatus` is `'approved'` or `'not-applicable'`.
"Send Request" (Yes) → `'pending-approval'`; (No) → `'not-applicable'`.
Approve/decline is done by a simulated second officer (page action) or on
the dedicated `/admin/ci-fee-approval` screen. Decline resets to
`'not-requested'` + records `ciFeeDeclineReason`, so the card can
re-request with corrected terms.

## Fabricated Claims — Real vs. Simulated

- **No separate approver role/login** — approve/decline is a simulated
  page action by the same officer, or a second screen sharing the same
  `review.creditInvestigation` fields.
- **Fill with Sample Data** keys off the literal `transcriptFileName`
  value `'sample-transcript.pdf'` (which only `handleFillSampleData`
  writes), not real progress.
- All state lives in `review.creditInvestigation` in `localStorage`.

## Non-Goals / Open Items

- **No separate CI Fee approver persona/login** — approval is a second
  simulated action for the same officer (or a second dedicated screen —
  see `docs/150-request-credit-investigation-fee-approval.md`), not a
  distinct workflow role.
