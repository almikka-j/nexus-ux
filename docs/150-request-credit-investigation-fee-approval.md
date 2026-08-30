# CI Fee Approval (Request → Fee Approvals)

> **Maintenance rule:** update this file whenever `ci-fee-approval-view.tsx`
> (list) or `ci-fee-approval-bundle-view.tsx` (detail) change. Companion to
> `docs/100-credit-investigation.md` and `docs/140-request-credit-investigation-fee.md`
> (the request side — `CiFeeCard` on the Credit Investigation page, which
> owns the `ciFeeStatus` data model and the inline simulate page actions
> these screens duplicate), `docs/190-request-appraisal-fee-approval.md` (the
> Appraisal-side equivalent whose list → detail split this mirrors), and
> `docs/210-request-payments.md` (once CI Fee is approved, `ciFeeApprovedAt`/
> `ciFeePayment` and the actual "record payment / mark as paid" action live
> entirely on that page, not here).

## What this is

**Dedicated CI Fee Approval screens**, nav label **"Credit Investigation -
Fee Approval"** (`/admin/ci-fee-approval` ->
`/admin/ci-fee-approval/current`,
`src/sections/admin/ci-fee-approval-view.tsx` (list) ->
`ci-fee-approval-bundle-view.tsx` (detail)) offer a second, fuller-review
way to trigger the same two outcomes — approve or decline a pending CI Fee
request — as the inline "Simulate: Another Officer Approves/Declines CI
Fee" page actions on `credit-investigation-view.tsx` (see
`docs/140-request-credit-investigation-fee.md`), rather than a page action
buried in the settings popover. Nested as the first entry under the
**"Request"** nav dropdown (`approvalItems`, `config-nav-admin.tsx` — the
variable name is unchanged, only the rendered dropdown title moved from
"Approval" to "Request"), alongside "Appraiser"/"Appraisal -
Request"/"Appraisal - Fee Approval"/"Appraisal - Report Approval"/
"Payment Verification"
(see `docs/170-request-appraiser.md`, `docs/180-request-appraisal-request.md`,
`docs/190-request-appraisal-fee-approval.md`,
`docs/200-request-appraisal-report-approval.md`, `docs/210-request-payments.md`).

Framed as **"Fee Approvals,"** the CI Head/Approver's own personal
workspace (small "CI HEAD / APPROVER" eyebrow label, first-person copy, no
sample filler rows), not a generic admin-facing queue. None of these
"Request" screens are `application-list-view.tsx`'s `?step=` queue; each
filters on a derived condition — here, "CI fee pending" — which is not a
`ReviewStep`. There is no role/permission system in this app (`AdminUser`
has no role field), so nothing mechanically gates who can open it; the
personal framing is a UI/workflow choice, not access control.

An officer can act from whichever surface they're already on (this screen
or the inline page action on the Credit Investigation page); both write the
same `review.creditInvestigation` fields.

Approving/declining from the earlier flat version of this screen showed a
one-time `OutcomeScreen` (centered icon/heading/body + forward action) —
the one screen among the role workspaces that did this. The rest stay on
the same page and simply update the card in place.

## List → detail split

Same list -> detail split as `appraisal-fee-approval-view.tsx` ->
`appraisal-fee-approval-bundle-view.tsx` (an earlier single-page version of
this screen — with a combined live+sample-row queue list, a `QueueRow`
component, an `OutcomeScreen` completion state, and an optional
`SampleApplicationEntry.ciFee` field — was replaced by this split;
`SampleApplicationEntry` has no CI-fee-related field today).

The list page (`ci-fee-approval-view.tsx`) is table-only, one row per
pending request (`Applicant / Description / CI Fee Amount / Status`) — no
"Appraisal No."/"Properties"/"Appraiser" columns, since `ciFeeStatus` lives
on a single flat `review.creditInvestigation` object with no bundle/multi-
property concept at all, unlike Appraisal. Clicking the row navigates to
the detail page (`paths.admin.ciFeeApprovalBundle()`, a fixed `/current`
placeholder segment — there's no real multi-application backend in this
prototype, so there's no real request ID to route on, same reasoning as
`appraisalFeeApprovalBundle()`).

**The live application's row always renders, whenever a live application
exists** (`!!signUpData`), regardless of `ciFeeStatus` — same convention
`application-list-view.tsx` uses for its own live row (always present,
only its actionability/status varies). An earlier version of this page
gated the row behind `ciFeeStatus === 'pending-approval'`, so approving
or declining the request made the row disappear entirely and the page
fall back to an empty-state card; that gate was removed — only the
`StatusBadge` tone/label (`CI_FEE_ROW_STATUS_COPY`, one entry per
`CiFeeStatus` value: `not-requested`/`pending-approval`/`approved`/
`not-applicable`) varies now. The only remaining empty state is "no live
application at all" (`!signUpData`), showing "Nothing waiting on you yet"
with a **"Go to Application List"** button.

## Always one actionable request

**This workspace always keeps one live, actionable "For Approval" CI Fee
request in front of the approver — a decision never leaves it on a dead
end.** Two things enforce this:

- **Auto-seed on the list page**: same convention
  `appraisal-fee-approval-view.tsx` uses — if the session hydrates with no
  live application, `loadSample(SAMPLE_APPLICATION)` loads the shared
  sample dataset; then, whenever `ciFeeStatus` is `'not-requested'` (a
  fresh application, or right after a decline — `CiFeeStatus` has no
  separate `'declined'` value) or `'not-applicable'`, it re-seeds a fresh
  `pending-approval` request (₱3,500, "Field verification + report
  preparation fee") directly into state, clearing `ciFeeDeclineReason`
  too. Deliberately **excludes `'approved'`**: that's a real terminal
  decision and must stick, not get silently undone the moment the
  approver navigates back to this list.
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
