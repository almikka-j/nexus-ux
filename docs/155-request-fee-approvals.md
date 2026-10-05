# Fee Approvals (Request → Fee Approvals)

> **Maintenance rule:** update this file whenever `fee-approvals-view.tsx`
> (the merged list), `ci-fee-approval-bundle-view.tsx`, or
> `appraisal-fee-approval-bundle-view.tsx` (the CI Fee detail page, and
> the now per-bundle Appraisal Fee detail page) change. Companion to
> `docs/100-credit-investigation.md` and
> `docs/140-request-credit-investigation-fee.md` (the request side — CI
> Fee's own `ciFeeStatus` data model and inline simulate page actions),
> `docs/170-request-appraiser.md` (where each Appraisal fee bundle is
> requested and submitted, and where the full
> `AppraisalReportBundle.feeApprovalStatus`/`feeNeeded` data model
> lives), `docs/210-request-payments.md` (once either fee is approved,
> the "record payment / mark as paid" action lives entirely on that
> page, not here — Appraisal's own payment is per-bundle too now),
> `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`
> (the design doc for the CI Fee-stays-flat / Appraisal-Fee-goes-per-bundle
> restructure), and `docs/225-admin-design-system.md` (the
> `StatusBadge`/`FactChip` header and `ConfirmDialog` approve/decline
> pattern both detail pages follow, per §10/§6).
>
> Supersedes `docs/150-request-credit-investigation-fee-approval.md` and
> `docs/190-request-appraisal-fee-approval.md`'s own list-page sections —
> both former list pages (`ci-fee-approval-view.tsx`,
> `appraisal-fee-approval-view.tsx`) were deleted and merged into this
> one. Those two docs still cover their own detail page in full; see
> them for the CI Fee / Appraisal Fee detail-page behavior this doc only
> summarizes.

## What this is

**One merged list page**, `/admin/fee-approvals`
(`fee-approvals-view.tsx`) — replaces what used to be two separate list
pages under two separate nav entries ("Credit Investigation - Fee
Approval" and "Appraisal - Fee Approval"). One nav entry, **"Fee
Approvals"** (`approvalItems`, `config-nav-admin.tsx`), one table.

**CI Fee is still one flat row** (no bundle concept — `ciFeeStatus` lives
once per application). **Appraisal Fee is ONE ROW PER BUNDLE** (per
appraiser assignment), not one combined row — fee approval moved from a
single whole-application batch status down onto each
`AppraisalReportBundle` itself, so two bundles on the same application
can be at different approval states and are approved/declined
independently. See
`docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`.

Clicking the CI Fee row navigates to
`paths.admin.feeApprovalsDetail('ci-fee')`
(`ci-fee-approval-bundle-view.tsx`, unchanged); clicking an Appraisal Fee
row navigates to `paths.admin.feeApprovalsDetail('appraisal-fee',
bundleId)` (`appraisal-fee-approval-bundle-view.tsx`, now bundle-scoped —
it looks up ONE bundle by id instead of reading a single
whole-application batch status).

There is no role/permission system in this app (`AdminUser` has no role
field), so nothing mechanically gates who can open it — the earlier
per-screen "CI Head / Approver" / "Appraisal Fee Approver" eyebrow labels
were dropped on the merged page; the page title and subtitle alone frame
it.

## The list page

CI Fee's row is unchanged from before the merge. Appraisal Fee's rows are
**one per bundle whose own fee has actually been proposed and submitted**
(`feeNeeded === 'yes' && feeApprovalStatus !== 'not-submitted'`) — a
bundle with no fee, or whose fee hasn't been submitted yet, has nothing
to approve and gets no row:

| Column | CI Fee row | Appraisal Fee row (one per bundle) |
| --- | --- | --- |
| Applicant | name + "App No. …" | name + "App No. …" |
| Type | "CI Fee" pill | "Appraisal Fee" pill |
| Details | `ciFeeAmountDescription` (or "—") | `"{this bundle's appraisal no.} · {N properties} · {appraiser}"` |
| Requested By | `application.assignedOfficer` (or "—" if unassigned) | same |
| Amount | `fCurrency(ciFeeAmount)` | `fCurrency(bundle.feeAmount)` — this bundle's own fee, not a sum |
| Status | `CI_FEE_ROW_STATUS_COPY[ciFeeStatus]` | `APPRAISAL_FEE_ROW_STATUS_COPY[bundle.feeApprovalStatus]` |

Both status-copy maps are unchanged: `CI_FEE_ROW_STATUS_COPY`
(`not-requested`/`pending-approval`/`approved`/`not-applicable`) and
`APPRAISAL_FEE_ROW_STATUS_COPY` (`not-submitted`/`pending-approval`/
`approved`/`declined`) — "Type" is a plain-text pill, not a `StatusBadge`
tone, since it names a category, not a status.

**"Requested By" is the application's assigned officer, not a
per-fee-request field** — neither `CreditInvestigation` nor
`AppraisalReportBundle` tracks who submitted the fee request, so this
reuses `application.assignedOfficer`, the same source
`payment-detail-view.tsx` already uses. Every row on the page shows the
same value, since every fee belongs to the same single live application.

**CI Fee's row always renders, whenever a live application exists**
(`hasApplication`), regardless of `ciFeeStatus` — same convention
`application-list-view.tsx` uses for its own live row. The Appraisal Fee
rows appear/disappear per-bundle as each bundle's own fee is proposed and
submitted — there is no single "the row" to gate the way CI Fee's is; a
fresh session may show zero, one, or several Appraisal Fee rows depending
on how many bundles exist and have submitted fees. The only empty state
for the whole page is "no live application at all" (`!signUpData`),
showing "Nothing waiting on you yet" with a "Go to Application List"
button — CI Fee's row still always shows in that case once an
application exists, even if no Appraisal Fee row does yet.

## Auto-seed on hydrate

- **CI Fee**: unchanged — if the session hydrates with no live
  application, load the shared sample dataset (guarded so it only fires
  once); then, whenever `ciFeeStatus` is `'not-requested'` or
  `'not-applicable'`, re-seed a fresh `'pending-approval'` request
  (₱3,500, "Field verification + report preparation fee"). Excludes
  `'approved'`.
- **Appraisal Fee**: if there are no `reportBundles` yet, create one from
  every still-unassigned, docs-complete `appraisalGroups` entry with a
  ready-made ₱5,000 fee decision (not yet submitted); then, whenever any
  bundle's own fee is `feeNeeded === 'yes'` and still `'not-submitted'`,
  submit that one bundle's fee for approval. Unlike the old batch-level
  version, this never needs to loop over every bundle re-submitting them
  together — each bundle submits independently, once, the first time it
  has a fee decision and hasn't been submitted yet.

The dev-only **"Simulate: Reset Appraisal Fees"** page action this list
used to register was removed — with fee approval now per-bundle and
potentially several bundles on screen at once, there's no single natural
target for a page-level reset button; the per-bundle detail page
(`appraisal-fee-approval-bundle-view.tsx`, via
`appraisal-appraiser-bundle-view.tsx`'s own simulate actions) is the
place to reset one specific bundle's fee flow.

## The detail pages

`ci-fee-approval-bundle-view.tsx` is unchanged except its back-link. See
`docs/150-request-credit-investigation-fee-approval.md` ("The detail
page" section) for its StatusBadge/FactChip header, fee breakdown, and
Approve/Decline flow.

`appraisal-fee-approval-bundle-view.tsx` now takes a `bundleId` prop and
looks up ONE bundle from `review.appraisal.reportBundles` — same
convention `appraisal-appraiser-bundle-view.tsx` already used for its own
per-bundle lookup. Everything it renders narrowed from "every bundle in
the request, in a loop, with a running total" to "this one bundle" —
simpler than before, not more complex. Approve/Decline call
`approveAppraisalBundleFee(bundleId)` /
`declineAppraisalBundleFee(bundleId, reason)`, applying only to this one
bundle; a sibling bundle on the same application is completely
unaffected by either action. See
`docs/190-request-appraisal-fee-approval.md` ("The detail page" section)
for the still-unchanged "View Appraisal Documents" button and header
card shape.

## Route shape

`paths.admin.feeApprovals` (`/admin/fee-approvals`) is the list.
`paths.admin.feeApprovalsDetail(kind, bundleId?)` is the detail route:
`'ci-fee'` resolves to `/admin/fee-approvals/ci-fee` (no id, same as
before); `'appraisal-fee'` now requires a real `bundleId` and resolves to
`/admin/fee-approvals/appraisal-fee/{bundleId}`. The underlying route is
an optional catch-all segment (`[kind]/[[...bundleId]]/page.tsx`) so both
shapes are served by one route tree — the page component reads
`params.bundleId?.[0]` and passes it to
`AppraisalFeeApprovalBundleView`, ignoring it entirely for `'ci-fee'`.
Replaces the four former path helpers `ciFeeApproval`,
`ciFeeApprovalBundle`, `appraisalFeeApproval`, `appraisalFeeApprovalBundle`
(all removed from `paths.ts`).

## Fabricated Claims — Real vs. Simulated

- **No real approver login** — `AdminUser` has no role field; the merged
  page shows no role-specific eyebrow label at all now.
- **Always one actionable CI Fee request** — the list page's auto-seed
  effect re-arms a `'pending-approval'` request whenever its status
  drifts off that (excluding `'approved'`).
- **Appraisal Fee bundles submit and settle independently** — there is no
  real underlying batch anymore; each bundle's approval, decline, and
  payment record are its own.
- **No request ID** — the `[kind]`/`bundleId` route segments are real
  discriminators, not opaque per-request IDs; at most one CI Fee row and
  a handful of Appraisal Fee rows (one per assigned bundle) exist per
  session.
- All state lives in `review.creditInvestigation` / `review.appraisal` in
  `localStorage`.

## Non-Goals / Open Items

- **No queue of multiple pending CI Fee requests** — one live
  application means at most one CI Fee row.
- **No separate approver persona/login** — the same officer can act on
  either fee type from this one page.
- **No real fee record here** — `ciFeeApprovedAt`/`ciFeePayment` and each
  Appraisal bundle's own approved-fee payment tracking live on
  `docs/210-request-payments.md`.
