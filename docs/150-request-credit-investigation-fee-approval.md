# CI Fee Approval (Request → Fee Approvals)

> **Maintenance rule:** update this file whenever
> `ci-fee-approval-bundle-view.tsx` (the detail page — the only page this
> doc still covers) changes. Companion to `docs/100-credit-investigation.md`
> and `docs/140-request-credit-investigation-fee.md` (the request side —
> `CiFeeCard` on the Credit Investigation page, which owns the
> `ciFeeStatus` data model and the inline simulate page actions this
> screen duplicates), `docs/155-request-fee-approvals.md` (**the merged
> list page** — `ci-fee-approval-view.tsx` was deleted and folded into
> `fee-approvals-view.tsx`; see that doc for the list-page behavior this
> doc used to cover), `docs/210-request-payments.md` (once CI Fee is
> approved, `ciFeeApprovedAt`/`ciFeePayment` and the actual "record
> payment / mark as paid" action live entirely on that page, not here),
> and `docs/225-admin-design-system.md` (the admin design system — this
> screen's `StatusBadge` / `FactChip` header and its `ConfirmDialog`
> approve/decline follow §10 / §6).

## What this is

**CI Fee Approval's detail page** (`ci-fee-approval-bundle-view.tsx`,
reached at `paths.admin.feeApprovalsDetail('ci-fee')`) offers a second,
fuller-review way to trigger the same two outcomes — approve or decline a
pending CI Fee request — as the inline "Simulate: Another Officer
Approves/Declines CI Fee" page actions on `credit-investigation-view.tsx`
(see `docs/140-request-credit-investigation-fee.md`), rather than a page
action buried in the settings popover.

**The list page that links here (`ci-fee-approval-view.tsx`) was deleted
and merged into `fee-approvals-view.tsx`** — one combined "Fee Approvals"
list showing both the CI Fee row and the Appraisal Fee row together (nav
label **"Fee Approvals"**, replacing the former separate "Credit
Investigation - Fee Approval" / "Appraisal - Fee Approval" nav entries).
See `docs/155-request-fee-approvals.md` for the merged list page's own
behavior, auto-seed rules, and columns.

An officer can act from whichever surface they're already on (this
detail page or the inline page action on the Credit Investigation page);
both write the same `review.creditInvestigation` fields.

Approving/declining from the earlier flat version of this screen showed a
one-time `OutcomeScreen` (centered icon/heading/body + forward action) —
the one screen among the role workspaces that did this. The rest stay on
the same page and simply update the card in place.

## Always one actionable request

**This workspace always keeps one live, actionable "For Approval" CI Fee
request in front of the approver — a decision never leaves it on a dead
end.** Two things enforce this:

- **Auto-seed on the list page**: see `docs/155-request-fee-approvals.md`
  — if the session hydrates with no live application,
  `loadSample(SAMPLE_APPLICATION)` loads the shared sample dataset; then,
  whenever `ciFeeStatus` is `'not-requested'` (a fresh application, or
  right after a decline — `CiFeeStatus` has no separate `'declined'`
  value) or `'not-applicable'`, it re-seeds a fresh `pending-approval`
  request (₱3,500, "Field verification + report preparation fee")
  directly into state, clearing `ciFeeDeclineReason` too. Deliberately
  **excludes `'approved'`**: that's a real terminal decision and must
  stick, not get silently undone the moment the approver navigates back
  to the list.
- **The detail page's own Decline handler re-seeds in place**, rather
  than resetting to `'not-requested'` and waiting for the list page's
  effect to notice on next visit — so declining shows a fresh, fully
  actionable request immediately, on the same page, even if the approver
  never navigates away (an earlier version left the detail page on a
  genuine dead end — "No CI Fee has been requested for {name} yet.", no
  buttons — until the approver went back to the list and back in). Repeat
  declines re-arm every time.

`ciFeeDeclineReason: string` on `CreditInvestigation` (`admin-context.tsx`)
follows the same per-decision-reason convention as `decisionReason` — it
still records the last decline's reason, but no longer gates the
auto-seed (an earlier version checked `!ciFeeDeclineReason` to avoid
re-seeding right after a decline; that guard was removed once declining
was changed to intentionally re-seed immediately instead).

## The detail page

**The detail page** (`ci-fee-approval-bundle-view.tsx`) shows a header
card (applicant name/App No./email, a `StatusBadge` for `ciFeeStatus`,
Description/CI Fee Amount `FactChip`s — no "Properties" or "Requested On"
chip, since CI Fee has no multi-property concept and no dedicated
CI-fee-request timestamp field exists in `AdminContext`; no "View
Documents" button either, since — unlike Appraisal, which gates fee
approval on per-property document completeness — CI Fee is a flat fee
amount/description with no equivalent document-completeness concept tied
to the decision), then a "CI Fee Details" card with the fee breakdown.

When `ciFeeStatus === 'pending-approval'`, it shows the same
**"Approve CI Fee"** / **"Decline CI Fee"** pair as the inline page action
on `credit-investigation-view.tsx`, each behind its own `ConfirmDialog` —
Approve's ("Approve CI Fee?") just names the applicant/amount; Decline's
("Reason for declining") requires the same typed reason as the inline
page action. Both call plain `setCreditInvestigation({ ciFeeStatus: ...
})` — CI Fee has no dedicated `approveCiFee()`/`declineCiFee()` context
methods the way Appraisal does.

`ciFeeStatus === 'approved'` shows a status message instead ("You already
approved the CI Fee for {name}." or, right after acting, "Approved the CI
Fee for {name}.") — the detail page only shows "Request not found" when
there's no live application at all (`!signUpData`);
`not-requested`/`not-applicable` are unreachable here in practice since
the Decline handler and the list page's seed effect both re-arm past them
immediately.

## Timestamp side effects

Two `AdminContext` fields this page writes are consumed by the Payment page
(`docs/210-request-payments.md`):

- `ciFeeSubmittedAt` — stamped the moment `ciFeeStatus` becomes
  `'pending-approval'`, including by this list page's auto-seed effect and
  by the detail page's decline path (which immediately re-submits a fresh
  request).
- `ciFeeApprovedAt` — stamped the moment `ciFeeStatus` becomes
  `'approved'`, including by this detail page's real approve action.

Declining also resets `ciFeeApprovedAt` and `ciFeePayment` — a
declined-then-resubmitted-then-reapproved request needs a fresh payment
record, not one carried over from a request that was declined.

## Decision Gate

This screen is one of the two ways `ciFeeStatus` moves from
`'pending-approval'` to `'approved'` (or back to `'not-requested'` on
Decline). Approval unlocks the CI Report card on the Credit Investigation
page and stamps `ciFeeApprovedAt` for the Payment page. There is no
completeness gate — CI Fee is a flat amount/description.

## Fabricated Claims — Real vs. Simulated

- **No real approver login** — `AdminUser` has no role field; the merged
  list page shows no role-specific eyebrow label (see
  `docs/155-request-fee-approvals.md`).
- **Always one actionable request** — the list page's auto-seed effect
  re-arms a `'pending-approval'` request whenever the status drifts off
  it (excluding `'approved'`, which must stick).
- **No request ID** — the detail route (`/admin/fee-approvals/ci-fee`)
  uses `kind` as a real discriminator, not a per-request ID.
- All state lives in `review.creditInvestigation` in `localStorage`.

## Non-Goals / Open Items

- **No queue of multiple pending requests** — one live application means
  one flat `review.creditInvestigation` object, so the list is always a
  single row.
- **No separate approver persona/login** — the same officer can act on
  both sides; the dedicated screen is a second surface, not a role gate.
- **No real fee record here** — `ciFeeApprovedAt` / `ciFeePayment` and the
  "mark as paid" action live on `docs/210-request-payments.md`.
