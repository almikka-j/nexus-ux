# Appraisal - Approver Fee (Fee Approvals)

> **Maintenance rule:** update this file whenever
> `appraisal-fee-approval-view.tsx` (list) or
> `appraisal-fee-approval-bundle-view.tsx` (detail) change. Companion to
> `docs/170-request-appraiser.md` (where the fee batch these screens approve is
> actually requested and submitted, and where the full
> `Appraisal.feeApprovalStatus`/`AppraisalReportBundle.feeNeeded` data model
> lives), `docs/110-appraisal.md` (the Officer's step page that creates the
> bundles), `docs/200-request-appraisal-report-approval.md` (the report side of
> the same Approver's two duties), `docs/210-request-payments.md` (where an
> approved fee is actually recorded as paid), and
> `docs/225-admin-design-system.md` (the admin design system — list →
> detail split per §10, `ConfirmDialog` approve/decline per §6, and the
> `ApplicationDetailsCard` tighter-padding variant is a §13 known
> exception).

## What this is

**`/admin/appraisal-fee-approval`** (`appraisal-fee-approval-view.tsx`) is
a **list page**, **"Fee Approvals"** — restructured from an earlier single
flat page (which rendered everything inline, titled "My Approvals") into
the same list → detail split `appraisal-appraiser-view.tsx` →
`appraisal-appraiser-bundle-view.tsx` already uses. Clicking its row
navigates to **`/admin/appraisal-fee-approval/[bundleId]`**
(`appraisal-fee-approval-bundle-view.tsx`), the detail page.

Nav label reworded from "Appraisal Fee Approval" to **"Appraisal - Approver
Fee"** — leading with "Appraisal" and naming the role ("Approver") before
what they're approving ("Fee"), matching the sibling "Appraisal - Approver
Report" item and the dropdown's own move from "Approval" to "Request." Both
sit under the same **"Request"** nav dropdown (`approvalItems`,
`src/layouts/admin/config-nav-admin.tsx` — the variable name is unchanged
even though the rendered section title moved from "Approval" to "Request").
This is not `application-list-view.tsx`'s `?step=` queue; it's a standalone
view filtering on a derived condition ("fee pending"), which is not a
`ReviewStep`.

**Framed as the signed-in role's own personal workspace**, like the
Appraiser and CI Fee Approver screens — small uppercase eyebrow role label,
first-person copy ("Nothing waiting on you yet"), and no sample filler rows
from other unrelated applications. This is why `SampleApplicationEntry`
(`sample-applications.ts`) carries no
`ciFee`/`appraisalFeePending`/`appraisalAwaitingHeadApproval` fields (all
removed) — this screen only ever shows the one live application's own
state, sourced entirely from `review.appraisal` in `AdminContext`. There is
no role/permission system in this app (`AdminUser` has no role field —
every session is one undifferentiated admin), so nothing mechanically gates
who can open it; the personal framing is a UI/workflow choice, not access
control. Its live-application actions never redirect or show a one-time
outcome screen — the page stays put and the card updates in place, matching
how the underlying cards on `appraisal-view.tsx` already behave.

## The list page

Same auto-load-and-seed convention as the Appraiser list
(`docs/170-request-appraiser.md`), taken one step further: if the session
hydrates with no live application, `loadSample(SAMPLE_APPLICATION)` runs;
if there are no `reportBundles` yet, it seeds one the same way the
Appraiser list does (every still-unassigned, docs-complete
`appraisalGroups` entry folded into one consolidated bundle) — but passes a
ready-made fee decision straight into `createAppraisalReportBundle`'s
optional `fee` argument (`{ feeNeeded: 'yes', feeAmount: '5000',
feeDescription: 'Site visit + valuation fee', feeRemarks: '' }`) instead of
leaving it undecided, then immediately calls
`submitAppraisalFeesForApproval()` so the batch lands directly in
`pending-approval`. The net effect: the very first time this page is
visited in a fresh session, the list already shows one genuinely active,
clickable "For Approval" row — not an empty state. (An earlier version
stopped at loading the sample application and left the fee request itself
to be driven manually from the Appraiser pages first, reasoning that
auto-driving a submitted fee request here would duplicate the Appraiser's
own submit logic; that was changed once it became clear this page was the
one exception to "every list page here always shows one real active
example," which reads as inconsistent rather than intentional.)

The page renders a table with the same shape AND column order as the
Appraiser list's own — Appraisal No. leads the row, matching
`appraisal-appraiser-view.tsx`'s own table — with exactly one row:
Appraisal No., Applicant, Properties (bundle count), Appraiser, Total
Appraisal Fee, a "For Approval" `StatusBadge`, and a trailing chevron.

**"Properties" is every TCT group across every bundle in the request**
(`reportBundles.reduce((sum, bundle) => sum + bundle.tctGroupIds.length,
0)`), not the number of bundles — a single `AppraisalReportBundle` already
covers however many properties were assigned together in one Assign
Appraiser selection, so a request with one multi-collateral bundle covering
5 TCTs is 5 properties, not 1 (an earlier version used
`reportBundles.length` directly, which undercounted exactly this case).
Appraisal No. and Appraiser both show the FIRST bundle's own value plus a
"+N more" suffix when the request bundles more than one property
(`getAppraisalNumber(firstBundle.id)`; deduplicated `appraiserName`s, since
a request can list more than one distinct appraiser if its bundles were
assigned to different people) — rather than cramming every bundle's value
into one cell.

**The row always renders whenever a live application exists**
(`!!signUpData` / `hasApplication`), regardless of `feeApprovalStatus` —
same convention `application-list-view.tsx` uses for its own live row
(always present, only its actionability/status varies by step). An earlier
version gated the row behind `feeApprovalStatus === 'pending-approval'`, so
approving or declining the seeded request made the row disappear entirely
and the page fall back to an empty-state card; that gate was removed — only
the `StatusBadge` tone/label (`APPRAISAL_FEE_ROW_STATUS_COPY`, one entry
per `FeeApprovalStatus` value:
`not-submitted`/`pending-approval`/`approved`/`declined`) varies now. The
only remaining empty state is "no live application at all" (`!signUpData`),
prompting to start one from Account Solicitation. There is no real
multi-application backend here — like every other list page in this app, at
most one real row ever renders, since one live session only ever holds one
live fee request.

## Always one actionable request

Both the list page and the detail page guarantee this workspace always has
one live, actionable **"For Approval"** request in front of the approver,
with a single carved-out exception: **`approved` is a real terminal
decision and never self-heals.** `declined` does — a decline immediately
re-submits the same bundles (`submitAppraisalFeesForApproval()` right after
`declineAppraisalFees(reason)`) rather than leaving the page/row on a dead
"Declined" end until some other seed effect happens to run later.

A dev-only **"Simulate: Reset Appraisal Fees"** page action (gear-icon
popover, registered via `useRegisterPageActions` on both the list and
detail views) forces `feeApprovalStatus` back to `'not-submitted'`
(`resetAppraisalFees()`, blanking every bundle's own fee fields) purely to
exercise that scenario on demand — each view re-arms it in place
immediately afterward (re-populate a sample fee decision per bundle, then
resubmit) rather than leaving either page on a dead "Not Submitted" end.

Getting this right on the detail page required more than resetting
`feeApprovalStatus` alone: `appraisal-fee-approval-bundle-view.tsx` keeps
its own local `justApproved` state (`true` once `confirmApprove()` fires)
purely to distinguish "you just now approved this, this visit" copy from
"you already approved this earlier" copy — and the Approve/Decline buttons
render on `isPending && !justApproved`, not `isPending` alone. A first
version reset `feeApprovalStatus` back to `'pending-approval'` (via the
Simulate action, fired without leaving this page) but never touched
`justApproved`, which is local `useState` and outlives that reset — the
`StatusBadge` correctly flipped to "For Approval" while the buttons stayed
hidden and the body copy fell through to "No Appraisal Fees have been
submitted … yet," a self-contradicting dead end reachable only by firing
the reset action while already sitting on the detail page (navigating list
→ detail fresh remounts the component and never showed it, since local
state resets to its initial `false` on mount). Fixed with a `useEffect`
that clears `justApproved` whenever `feeApprovalStatus` is no longer
`'approved'`, so it can never outlive the one status it exists to qualify.

## The detail page

`appraisal-fee-approval-bundle-view.tsx` mirrors
`appraisal-appraiser-bundle-view.tsx`'s own header-card shape and holds
everything the old single page used to render inline.

### Header card + FactChip strip

A header card (42px icon-avatar + applicant name as the title + "App No. …
· email" subtitle + a `StatusBadge` derived from `feeApprovalStatus`,
top-right) with a bordered/tinted `FactChip` strip below it: **Properties**
(same TCT-group-count fix described above, not `reportBundles.length`),
**Total Appraisal Fee**, and **Requested On** (sourced from
`feeSubmittedAt`).

**Below the FactChip strip: a `Divider`, then a "View Appraisal
Documents" button** — matching the exact layout of the Call Report page's
own collapsible summary card (`ApplicationDetailsCard`,
`application-details-card.tsx`, rendered on `call-report-view.tsx`):
header row, FactChip strip, `Divider`, then a row of compact outlined
navy buttons sitting left-aligned at the bottom of the card (that card's
own row has "View full application" / "Initial credit checking result" /
"View all officer notes" — same `sx` shape reused here: `color: '#1C2A6E'`,
`borderColor: '#C7CEEA'`, `borderRadius: '10px'`, not full-width). The
header card's own outer padding matches that same reference too —
`p: { xs: 2.5, md: 3 }`, the tighter override `ApplicationDetailsCard`'s
collapsible variant uses (a `docs/225-admin-design-system.md` §13
documented exception to the `adminCardSx` `p: { xs: 3, md: 4 }` default),
in place of the plain default every other content card on the sibling
Appraiser pages keeps — since this specific card is what's being
matched, not just its internal layout; the "Appraisal Fee Details" card
below it keeps the plain `adminCardSx` default, same as those other
cards. Clicking the button opens a read-only `Dialog` listing every
`APPRAISAL_DOC_META` document (same `ReadOnlyRequirementDocRow`
component `appraisal-appraiser-bundle-view.tsx`'s own Appraisal
Documents section uses), grouped per TCT group, across every bundle in
the request — the Fee Approver's only way to see the underlying
property documents without leaving this page. (Two earlier attempts
placed this differently: first inline beside the title/StatusBadge in
the header row; then as a full-width button below the FactChip strip
with no `Divider` — both were replaced with this `Divider` +
compact-button layout once it became clear the actual reference was the
Call Report card, not the Requirement Checklist card's own summary,
which an earlier pass had mistakenly copied instead.)

### Appraisal Fee Details card

Then an **"Appraisal Fee Details"** card holds every bundle's
fee-or-"No fee needed" row plus the running total — each bundle's
**appraiser name now renders bold and navy (`#1C2A6E`, `fontSize: 13`)**,
visually distinct from the muted-gray TCT numbers/fee description around
it (an earlier version rendered the appraiser name at the same small
muted weight as the fee description beneath it, making it easy to miss)
— and finally the **"Approve Appraisal Fees"** / **"Decline Appraisal
Fees"** buttons. These are unchanged — still call the same batch-level
`approveAppraisalFees()` / `declineAppraisalFees(reason)` context
methods the Appraiser page's own page-action shortcuts do (see
`docs/170-request-appraiser.md`), and still apply to the **whole request**,
not one property in isolation, since the fee is proposed per bundle but
submitted and approved as one batch. `declineAppraisalFees(reason)` sets
`feeApprovalStatus: 'declined'` and `feeDeclineReason` to the typed
reason — every bundle's fee decision is left exactly as submitted, not
reset, so the appraiser revises rather than re-typing from scratch. This
is not a single flat-amount approval like Credit Investigation - Fee
Approval's shape (see
`docs/150-request-credit-investigation-fee-approval.md`). The "There's no
real Head login in this prototype — approving or declining here simulates
your review." disclaimer line that used to sit under these buttons has
been removed.

**Spacing pass** — each bundle row got slightly more internal padding
(`p: 1.75` up from `1.5`) and more room between its stacked TCT
No./appraiser/fee-description lines (`mt: 0.5` up from `0.25`); the
`Divider` above "Total Appraisal Fees" gained a touch of vertical margin
(`my: 0.5`) and that row's own padding grew (`py: 0.75` up from `0.5`);
and the gap before "This request is waiting…" plus the Approve/Decline
button row widened (`mt: 3`/`0.75` up from `2.5`/`0.5`) — the whole card
felt visibly cramped before this pass, with almost no breathing room
between the fee breakdown, the total, and the action buttons.

### Route shape

The `[bundleId]` route segment is a fixed placeholder
(`paths.admin.appraisalFeeApprovalBundle()` always resolves to
`/admin/appraisal-fee-approval/current`, no actual ID) — there's no
per-bundle approval status to route on (`feeApprovalStatus` lives once
per application, not once per property), so the segment exists purely to
keep this page's URL shape consistent with `appraisalAppraiserBundle`'s
own list → detail split, and to leave room for genuine multi-application
support later without another URL migration. The detail page component
ignores the param entirely and reads `review.appraisal` directly, the
same way the old single page did with no bundle lookup by ID at all.

## Decision Gate

This screen is one of the two ways `feeApprovalStatus` moves from
`'pending-approval'` to `'approved'` (batch-level `approveAppraisalFees()`
/ `declineAppraisalFees(reason)`, whole request at once — not per
property). Approval unlocks each bundle's report form on the Appraiser
workspace. Decline sets a visible `'declined'` status + `feeDeclineReason`
and leaves every bundle's fee decision as submitted for revision. No
document-completeness gate.

## Fabricated Claims — Real vs. Simulated

- **No real Head login** — `AdminUser` has no role field; the disclaimer
  line under the buttons was removed but the behavior is still simulated.
- **Always one actionable request** — the list page's auto-seed effect
  re-arms a `'pending-approval'` request (excluding `'approved'`).
- **No request ID** — the `[bundleId]` route segment always resolves to
  `/current`.
- All state lives in `review.appraisal` in `localStorage`.

## Non-Goals / Open Items

- **No per-property fee decision** — approve/decline is batch-level over
  the whole request; there is no way to approve one bundle's fee and
  decline another's.
- **No queue of multiple requests** — one live application, one
  `feeApprovalStatus`, one row.
- **No separate Head login** — the same officer can act here or via the
  Appraiser page's simulated shortcut; this screen is a fuller surface,
  not a role gate.
- **No real fee record here** — `feePayment` and "mark as paid" live on
  `docs/210-request-payments.md`.
