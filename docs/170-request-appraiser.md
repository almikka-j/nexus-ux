# Appraiser Workspace (Request → Appraiser)

> **Maintenance rule:** update this file whenever `appraisal-appraiser-view.tsx`,
> `appraisal-appraiser-bundle-view.tsx`, or their supporting files
> (`appraisal/appraiser-assignment-card.tsx`,
> `appraisal/appraisal-report-view.tsx`,
> `appraisal/sample-appraisal-report.ts`,
> `appraisal/appraisal-bundle-status.ts`,
> `src/utils/get-appraisal-number.ts`) change.
> Companion to `docs/110-appraisal.md` (the Officer's Appraisal step page, which
> creates the bundles this workspace acts on) and
> `docs/190-request-appraisal-fee-approval.md` (where the fee batch this page
> submits is approved or declined). Also companion to
> `docs/200-request-appraisal-report-approval.md` (where a submitted report is
> reviewed), `docs/180-request-appraisal-request.md` (the read-only status list
> over the same bundles), and `docs/210-request-payments.md` (once the Appraisal
> Fee batch is approved, `feePayment` and the actual "record payment / mark
> as paid" action live entirely on that page, not here).

## What this is

Two screens under the **"Request"** nav dropdown
(`approvalItems`, `src/layouts/admin/config-nav-admin.tsx` — the variable
name is unchanged even though the rendered section title moved from
"Approval" to "Request"):

- **`/admin/appraisal-appraiser`** (`appraisal-appraiser-view.tsx`) — the
  list, **"My Assignments"**.
- **`/admin/appraisal-appraiser/[bundleId]`**
  (`appraisal-appraiser-bundle-view.tsx`) — the per-bundle detail page, a
  Next.js dynamic route nested under the same auth-guarded layout as the
  list page.

Neither is `application-list-view.tsx`'s `?step=` queue; this is a
standalone view filtering on a derived condition ("has an assigned
bundle"), which is not a `ReviewStep`. The nav label was shortened from
"Appraisal Appraiser" now that the dropdown itself is titled "Request"
rather than "Approval" (the redundant "Appraisal" prefix was there to
disambiguate from the CI-side items when everything sat under one generic
"Approval" label).

**Framed as the signed-in role's own personal workspace**, not a generic
admin-facing queue: the header row places the "APPRAISER WORKSPACE"
eyebrow label on the right, level with the "My Assignments" title/subtitle
on the left (`Stack direction="row" justifyContent="space-between"`),
unlike the stacked eyebrow-above-title layout the other role-workspace
screens use. First-person copy throughout ("Nothing waiting on you yet",
"Request your fee and submit the report…"). This is why
`SampleApplicationEntry` (`sample-applications.ts`) carries no
`ciFee`/`appraisalFeePending`/`appraisalAwaitingHeadApproval` fields (all
removed) — this screen only ever shows the one live application's own
state, sourced entirely from `review.appraisal`/`review.requirementChecklist`
in `AdminContext`. There is no role/permission system in this app
(`AdminUser` has no role field — every session is one undifferentiated
admin), so nothing mechanically gates who can open it; the personal
framing is a UI/workflow choice, not access control.

The page has no "Available for Assignment"/claim section any more — an
earlier version listed every still-unassigned pledged property here
with a "Claim" button routing into the Officer's Assign Appraiser modal,
but claiming/assigning is the Officer's action on their own page (see
`docs/110-appraisal.md`), not something this page needs to offer a shortcut
into; that section was removed entirely, leaving just the assignments
table.

## Auto-load and seed (list page)

**This screen auto-loads a real sample application and seeds it a real
assigned bundle, instead of showing an empty/sample placeholder.** This
mirrors the exact mechanism `application-list-view.tsx` already uses for
its own table — once hydrated, if there's no live application in the
session (`!signUpData || !application.personalInfo`), it calls
`loadSample(SAMPLE_APPLICATION)` (`useRegistration()`, the same shared
sample dataset Application List loads), which makes `signUpData` genuine
session state, not a disabled placeholder object. Since this page also
needs an actual *assigned bundle* to show anything (unlike Application
List, where the loaded sample application alone is enough), the same
effect additionally seeds one: it filters `appraisalGroups` to
**every** still-unassigned entry whose documents are all `'verified'`
(same completeness gate `docsIncomplete()` enforces on the Officer's
page — see `docs/110-appraisal.md`'s "Collateral titles"), and calls
`createAppraisalReportBundle(groupIds, 'inhouse', APPRAISER_ROSTER[0],
null)` with **all** of those group IDs together in one call — the same
call selecting every eligible TCT row and assigning them as one
consolidated bundle via the Officer's Assign Appraiser modal makes. This
runs the moment `reportBundles.length === 0`.

The net effect: the very first time this page is visited in a fresh
session (even navigating to it directly, without ever visiting Application
List first), the table already shows one genuinely active, clickable
**multi-collateral** assignment row covering all 5 of the default seed
TCTs (e.g. "TCT-2024-00981, TCT-2024-00982, TCT-2024-00983,
TCT-2024-00984, TCT-2024-00985") — not a single-property example, and
not a static, disabled one either. (Earlier iterations first covered
just one group, then just the first two, before landing on covering
every eligible group at once — a single multi-collateral bundle reads
as a more realistic example of a consolidated assignment than a
single- or two-property one. Before any of those, an even earlier
version instead rendered one hardcoded, always-inert
`SAMPLE_ASSIGNMENT` row — no `onClick`, disabled chevron, no real
`bundleId` — appended after any real bundles, mirroring
`application-list-view.tsx`'s `[...liveRows, ...sampleRows]` *shape* but
not its actual *mechanism*. That diverged from how every other "no live
data yet" case in this app is handled — real pages there auto-load real
sample data rather than rendering a disabled stand-in — so it was
replaced with this auto-load-and-seed approach instead.) Since the seeded
bundle is a real `AppraisalReportBundle`, it behaves identically to one
created through the normal Assign Appraiser modal — full fee-request flow,
report form, batch submit, everything documented below works on it exactly
the same way. The effect only ever fires once per empty state (gated on
`reportBundles.length === 0`), so it doesn't re-seed a second bundle once
one exists, and it never overwrites a real application that just hasn't
finished loading from `localStorage` yet (same `hydrated` gate
`application-list-view.tsx` uses).

The Fee Approver's and Report Approver's list pages take this same
convention one and two steps further respectively — see
`docs/190-request-appraisal-fee-approval.md` and
`docs/200-request-appraisal-report-approval.md`.

## "My Assignments" table

A single table, one row per `reportBundles` entry actually assigned to
the signed-in appraiser (real data — `review.appraisal.reportBundles`,
not sample/filler rows), columns:

- **Appraisal No.** — a deterministic per-bundle reference number,
  `getAppraisalNumber(bundle.tctGroupIds)` (`src/utils/get-appraisal-number.ts`,
  same hash-then-format convention as `getLoanNumber()`) — `APR-######`,
  hashed from the bundle's own pledged TCT group ids (stable/user-chosen)
  rather than the bundle's own `crypto.randomUUID()` id or a persisted
  counter, so the same set of properties always yields the same number
  even across a freshly-created bundle, no separate sequence state needed.
- **Collateral No.** — every TCT number this bundle covers, comma-joined,
  clamped to 2 lines with an ellipsis via `-webkit-line-clamp` so a bundle
  spanning many properties (e.g. all 5 default TCTs) doesn't blow out the
  row height.
- **Applicant**.
- **Appraisal Fee** — the per-bundle fee-status pill (see "Appraisal Fee"
  below).
- **Status** — the same On Process/For Approval/For Report/Reported pill
  convention `AssignedAppraiserCard` uses on the Officer's page, computed
  by the shared `getAppraisalBundleStatus()`
  (`src/sections/admin/appraisal/appraisal-bundle-status.ts` — see
  `docs/110-appraisal.md`'s "Assigned Appraiser"). This table renders the
  `'reported'` case as a plain "Reported" pill, where the Officer's card
  and the Appraisal - Request list swap in a "View Report" button instead.
- A trailing chevron (`eva:arrow-ios-forward-fill`) signaling navigation,
  not expand.

`getAppraisalNumber()` is also shown on the per-bundle detail page's
header, so the same reference number is visible in both places. There is
no separate heading above the table (an earlier version had a "My Active
Assignments" label directly above it; removed as redundant with the page's
own "My Assignments" title). Empty state: a plain message card ("No active
assignments right now — check back once a property is assigned to you.")
when there's a live application but no bundles yet.

**This table is list-only — nothing on it expands or collapses.** Clicking
a row navigates to the per-bundle detail page,
`paths.admin.appraisalAppraiserBundle(bundleId)`.

## Per-bundle detail page

`appraisal-appraiser-bundle-view.tsx` shows, in order:

### 1. Header/details card

A "Back to My Assignments" link, then a single header/details card built to
match this app's standard summary-card shape (the same one
`application-details-card.tsx`/`application-review-header.tsx` use) rather
than a one-off design — no separate "Appraisal Details" heading; the header
and the read-only fields below it are one continuous card, not two stacked
sections. The header row is a 42px icon-avatar (`#EEF1FE` background,
`solar:document-text-bold-duotone` in `#1C2A6E`) + **Appraisal No.**
(`getAppraisalNumber(bundle.tctGroupIds)`) as a **card-level** title
(15px/800 — the size every other summary card in this app uses for its
title, not a 22-30px page-heading size) + `{applicantName} · App No.
{getLoanNumber(...)}` as the subtitle, with the overall status rendered via
the shared `StatusBadge` component (`src/components/admin-ui`) top-right
rather than an inlined pill.

Below that, still in the same card, a bordered/tinted row of `FactChip`s (a
local copy of `application-details-card.tsx`'s own unexported `FactChip` —
11px uppercase micro-label over a 13.5px bold value, `border:'1px solid
#EEF0F5', borderRadius:'12px', bgcolor:'#FAFBFD'` wrapping the whole row,
vertical dividers between chips) for: **Collateral** (labeled "Collateral
(N)" once N > 1, every TCT number this bundle covers comma-joined into one
value), **Collateral Type** (`COLLATERAL_TYPE_LABEL[group.collateralType]`,
**deduplicated** via `Array.from(new Set(...))` before joining — a bundle
whose every property is "Real Estate" shows that once, not "Real Estate,
Real Estate, Real Estate..." repeated per TCT; a bundle mixing types would
still show each distinct one, comma-joined), **Appraiser Type**
(In-house/External), **Assigned To** (`bundle.appraiserName`), and **Target
Completion** (formatted via `toLocaleDateString()`, or "—" if unset).
Nothing here is editable — reassigning still only happens via the Officer's
Assign Appraiser modal, same as `AssignedAppraiserCard`.

(Two earlier designs preceded this: first the joined TCT number list itself
as a 22px/800 giant page-style title with no icon avatar, an inlined status
pill instead of `StatusBadge`, and plain floating label/value pairs instead
of a `FactChip` strip — for a bundle covering many properties that title
was also unreadably long and wrapping; then Appraisal No. replaced the TCT
list as the title, with the TCT list moved into its own "Collateral" field
rendered as small wrapped chip boxes rather than a `FactChip` value. Both
were rebuilt into the current shape once it became clear the card was
reinventing a pattern this app already has a standard for, rather than
reusing it.)

### 2. Appraisal Fee card

A `StatusBadge` (No Fee/Draft/For Approval/Approved/Settled) beside the
title, plus a **"Request Appraisal Fee"** button (relabeled **"View
Appraisal Fee"**, outlined, once the batch is no longer `not-submitted`)
that opens a `Dialog` — see "Appraisal Fee" below for the full modal
contents. **This is the *only* place an Appraiser can decide or submit a
fee at all** — there is no fee UI on the list page, and `appraisal-view.tsx`
(the Officer's page) never shows any fee UI either.

### 3. Appraisal Documents

Renamed from "Documents" to disambiguate from every other Document
Checklist in this app. **Not collapsible at all while the fee decision is
still editable** (`docsCollapsible = !feeEditable`, so both
`not-submitted` and `declined` keep it locked open — see "Appraisal Fee"
below for why `declined` counts as editable too). Same "not clickable until
a condition is met" convention `appraisal-tct-table.tsx`'s own Collateral
titles table header uses for its `allGroupsAssigned` gate — while
`!docsCollapsible`, this renders as a plain always-open header (title +
badge, no chevron, no `onClick`) with no way to collapse it, since document
review is still the thing the appraiser needs to be looking at while
deciding the fee. Only once `docsCollapsible` is true does it render
wrapped in the shared `CollapsibleSection` component
(`src/components/collapsible-section`), the single reusable
chevron+badge+animated-`Collapse` shell every other collapsible document
list in this app already uses (Credit Investigation's own Document
Checklist, Requirement Checklist's per-tab groups, etc.).

Either way, the header shows a `CollapsibleSectionBadge` ("N/total on
file", counting every document across every pledged property this bundle
covers whose `status !== 'missing'`, out of `APPRAISAL_DOC_META.length *
bundleGroups.length`) — no green completion checkmark next to it (an
earlier version showed one once that ratio hit 100%, matching every nested
per-TCT group's own checkmark; the outer section's checkmark was removed,
so only the per-property groups still show one, not the outer "Appraisal
Documents" header itself). The badge renders identically whether or not the
section happens to be collapsible yet.

**Auto-collapses the moment the fee batch is (re-)submitted.** A
`wasFeeEditableRef` + `useEffect` (same "collapse on transition, not on
every render" convention `credit-investigation-view.tsx` uses for its own
`checklistExpanded`) sets `docsExpanded` to `false` the instant
`feeEditable` flips from `true` to `false` during this session — covering
both the first `not-submitted -> submitted` transition and a later
`declined -> resubmitted` one, since either means the document checklist
the appraiser was reviewing while deciding the fee is no longer the thing
needing attention, so it tucks itself away. It only fires on that specific
transition, never on every render, so the appraiser's own manual re-open
afterward is never fought by the effect re-collapsing it. Picking Yes/No
inside the Appraisal Fee modal alone does **not** trigger this — only the
batch-level "Submit Fees for Approval" actually changes
`feeApprovalStatus`, so the collapse only happens once that's actually been
sent, not per bundle's individual Yes/No decision.

**When a bundle covers more than one TCT, each property's document list is
its OWN nested `CollapsibleSection`** (a "TCT-2024-00981" title + its own
`CollapsibleSectionBadge`, "8/8 on file" etc. + its own green checkmark,
wrapped in a bordered box), independently collapsible from every other
property's list and from the outer Appraisal Documents section —
`expandedGroupIds` (a `Set<string>` of group ids *currently expanded*;
absent from the set is the default, collapsed, state for every group)
tracks each one separately, so expanding TCT-2024-00981's list leaves
TCT-2024-00982 through -00985 exactly as they were. Unlike the outer
section, **these per-property groups are always collapsible, regardless of
`docsCollapsible`** — the fee-submission gate only applies to the outer
"Appraisal Documents" header; there's no reason to lock away the ability to
tuck one already-reviewed property's documents aside just because the batch
fee hasn't been submitted yet. A bundle covering only *one* TCT skips the
extra nesting entirely (no per-property title, no second collapsible level)
— there's nothing to disambiguate between when there's only one property,
so the outer Appraisal Documents section alone is enough.

Inside each property's list: every `APPRAISAL_DOC_META` entry, rendered
read-only via the same `ReadOnlyRequirementDocRow` component
`credit-investigation-view.tsx` uses for its own Document Checklist (status
chip, reviewer note, filename, "View" button opening `doc.fileUrl`). This
is the *only* place an Appraiser can see these documents at all —
`AppraisalTctTable`'s own per-row document expansion lives on the Officer's
Collateral titles table instead, not duplicated here. (The Fee Approver's
detail page has its own read-only Dialog over the same documents — see
`docs/190-request-appraisal-fee-approval.md`.)

(An earlier version made this always collapsible regardless of fee status,
closed by default from the very first load — no `docsCollapsible` gate, no
auto-collapse effect. That was tried and reverted twice in each direction;
the fee-gated version above is the current, confirmed behavior.)

### 4. Report form or locked message

Either `AppraiserAssignmentCard` (the report fill-in form, once
`feeSettled`) or a plain locked message ("The Appraisal Fee must be
settled before the report form for this property unlocks.") when it isn't.
See "Appraisal Report (per bundle)" below for the form itself, and
"Appraisal Fee" for the exact unlock rule (a `feeNeeded === 'no'` bundle
unlocks immediately, without waiting on the batch).

"Advise Client"/"Simulate: Payment Received" remain **list-page-only**
actions, not duplicated on this detail page — those only make sense once
the whole batch is already `approved`, a state better surfaced on the list
where every bundle's fee/report status is visible at a glance, and they
have no natural "which bundle" framing the way the fee decision itself
does.

## Appraisal Fee

**Requesting the fee happens inside a modal on the bundle's own detail
page, not an inline card.** `appraisal-appraiser-bundle-view.tsx` renders
an "Appraisal Fee" summary card between the header card and Documents — a
fee-status `StatusBadge` (No Fee/Draft/For Approval/Approved/Settled, same
`FEE_STATUS_COPY` map the list page's table pill uses) sits directly
beside the "Appraisal Fee" title, plus a single button, **"Request
Appraisal Fee"** (relabeled **"View Appraisal Fee"**, rendered outlined
instead of filled, once the batch is no longer `not-submitted`). Clicking
it opens a `Dialog` — not an inline expand/panel — following the exact
same modal convention this page's sibling list page
(`appraisal-appraiser-view.tsx`) already uses for "Advise Client to
Settle": a `DialogTitle` with a close `IconButton`, a `DialogContent`,
and (only while editable) a footer action row. If the bundle's fee
decision is still undecided (`feeNeeded === null`), opening the modal
defaults it to `'yes'` right then, before the modal even renders — Yes is
the common case, so it opens pre-selected instead of making the appraiser
click Yes just to confirm the likely answer; No remains one click away,
same as ever.

Inside the modal, while `feeApprovalStatus === 'not-submitted'`
(`feeEditable`): the same Yes/No `FeeNeededOption` pair plus, once "Yes"
is picked, Request Amount (`NumericFormat` currency field) / Request
Amount Description (multiline, required) / Remarks (multiline, optional)
— all wired to `setAppraisalBundleFee(bundle.id, data)`, for *this*
bundle only. Picking "No" clears any previously-entered
amount/description/remarks. Below the fields, a **"Submit Fees for
Approval"** button — gated on `canSubmit` (every pledged property
assigned + every bundle in the batch has a complete fee decision, the
same rule described below) — sits in the modal's footer; confirming
calls `submitAppraisalFeesForApproval()` directly (no separate
`ConfirmDialog` layered on top — the modal itself already reads as the
deliberate "review before sending" step) and closes the modal. It still
submits the **whole batch**, not just the bundle whose modal happens to
be open. Once submitted, the modal instead shows a read-only summary
(amount + description + remarks, or "No fee needed") plus a "Requested
on {date}" line sourced from `Appraisal.feeSubmittedAt` — an ISO string
`submitAppraisalFeesForApproval()` stamps via `new Date().toISOString()`
(same convention every other admin-context.tsx timestamp uses) each time
the batch is actually sent, overwritten on every re-submission (including
after a decline — see below) so it always reflects the *latest* send, not
the first — with no footer button at all — editing only happens
pre-submission, same as always. (An
earlier version moved that read-only summary out of the modal entirely,
straight onto the card, dropping the button/modal for that case; that was
reverted — keeping the fee UI in one consistent place, the modal, reads
better than splitting it across two different presentations depending on
whether it's editable.)

Separately, once `!feeEditable` (the batch has actually been submitted —
pending-approval, approved, or settled), the Appraisal Fee card itself
gains a subtitle under the title/badge row —
`"{fCurrency(bundle.feeAmount)} requested"` — so the appraiser can see
what was actually requested at a glance without opening the modal. It
only renders when `bundle.feeNeeded === 'yes'`; a no-fee bundle already
communicates that via its "No Fee" badge alone, with nothing to summarize
as an amount. It's deliberately absent while still `feeEditable`
(`not-submitted` OR `declined`) — an in-progress decision that hasn't
been (re-)sent yet isn't a "request" worth summarizing on the card; a
declined batch loses the subtitle the moment it's declined, the same way
it never had one before its first submission, and only earns it back
once "Submit Fees for Approval" has actually been clicked again.

(This flow went through several homes before landing here: a standalone
`AppraisalFeeCard` component (`src/sections/admin/appraisal/
appraisal-fee-card.tsx`, since deleted) rendered one whole-batch card on
the Appraiser's list page; that was replaced by moving the per-bundle
fields into each list row's expandable panel; that was replaced by an
inline card directly on this detail page (fields + a page-level "Submit
Fees for Approval" button, no modal); that inline card was removed
entirely with no replacement for a period; it was then rebuilt as this
modal instead of another bare card, matching the "Advise Client" modal
convention already established on the sibling list page rather than
reintroducing a third inline-card variant.)

### Data model

Each pledged property's fee is decided **per bundle** — there is no
app-wide flat fee. What lives on `Appraisal` is a single **batch** state,
`feeApprovalStatus: 'not-submitted' | 'pending-approval' | 'approved' |
'declined'` plus `feeSubmittedAt: string | null` (the ISO timestamp of
the moment the batch was last submitted, `null` until the first
submission, overwritten — not cleared — on every subsequent
re-submission), that every bundle's decided fee travels through together
once submitted as one request. `AppraisalReportBundle` carries the actual
per-bundle decision: `feeNeeded: 'yes' | 'no' | null`, `feeAmount`,
`feeDescription`, `feeRemarks` — freshly-created bundles start with
`feeNeeded: null` (undecided), since `createAppraisalReportBundle` is
never called with a `fee` argument from the Officer's Assign Appraiser
modal (the Officer never sets this — see `docs/110-appraisal.md`).

The "My Assignments" table shows an **"Appraisal Fee"** status pill per row
(distinct from the overall On Process/For Approval/For Report/Reported pill
next to it) — **No Fee** (`feeNeeded === 'no'`, unless declined), **Draft**
(`not-submitted`), **Declined** (`feeApprovalStatus === 'declined'`,
`tone: 'error'`, takes priority over every other label including "No Fee" —
even a no-fee bundle's decision was part of the declined batch and needs
reconsidering), **For Approval** (`pending-approval`), **Approved**
(`feeApprovalStatus === 'approved'` but not yet settled, `tone: 'success'`
— green, same tone as "Settled"; an earlier version used `tone: 'info'`
(blue), changed so "Approved" reads as an unambiguous positive outcome
rather than a neutral in-progress one), or **Settled** (`feeSettled`) — the
same pill shape the bundle detail page's own Appraisal Fee card trigger
button now sits next to. Once approved, the fee card also gains an
`"Approved on {date}"` segment appended to its `"{amount} requested"`
subtitle, sourced from the `Appraisal.feeApprovedAt: string | null` field
(stamped by `approveAppraisalFees()` via `new Date().toISOString()`, the
same convention `feeSubmittedAt` uses; cleared back to `null` whenever
`submitAppraisalFeesForApproval()` runs again, since a fresh submission
means whatever was previously approved no longer applies) — visible both on
the card itself and inside the modal's read-only summary.

### Approve / decline

There's no real approver role in this prototype, so approval/decline is
simulated via page actions both `appraisal-appraiser-view.tsx` (the list
page) and `appraisal-appraiser-bundle-view.tsx` (the per-bundle detail
page) register themselves, independently (same convention as CI Fee's
"Simulate: Another Officer Approves/Declines CI Fee") — **"Simulate:
Another Officer Approves Appraisal Fees"** calls `approveAppraisalFees()`
(`feeApprovalStatus: 'approved'`); **"Simulate: Another Officer Declines
Appraisal Fees"** opens a reason dialog whose confirm calls
`declineAppraisalFees(reason)`. These page actions are not part of the
detail page's fee modal itself — they're a separate popover entry,
reachable from whichever of the two pages happens to be open. The fuller,
non-simulated review path for the same two outcomes lives on
`/admin/appraisal-fee-approval` — see
`docs/190-request-appraisal-fee-approval.md`.

**Decline is a real, visible status, not an instant silent reset.**
`declineAppraisalFees(reason)` sets `feeApprovalStatus: 'declined'` and
stores the reason in `feeDeclineReason` — it deliberately does **not**
touch any bundle's `feeNeeded`/`feeAmount`/`feeDescription`/`feeRemarks`
(an earlier version wiped every bundle back to blank/undecided on
decline; that was changed so revising means editing what's already
there, not re-typing a whole batch from scratch). `feeEditable` — used
throughout the bundle detail page — is `feeApprovalStatus ===
'not-submitted' || feeApprovalStatus === 'declined'`, so a declined batch
behaves exactly like a fresh draft: the fee card shows a red "Declined"
badge, **plus its own full "Reason for decline" banner row** below the
title/button row — a warning-triangle `Iconify` icon, an uppercase
"Reason for decline" label, and the stored `feeDeclineReason` body text,
all tinted with `TONE_COLORS.error` (`src/components/admin-ui/
admin-tokens.ts` — the same canonical error-tone bg/border/text values
every other error surface in the admin app uses, not one-off hex) so the
reason is visible at a glance without opening anything. Its button reads
"Request Appraisal Fee" again (not "View"), and Appraisal Documents
un-collapses back to its always-open editable state (see above). **The
fee modal itself does not repeat this banner** — an earlier version
showed the identical banner inside the modal too, above the editable
fields, but that duplicated what the card sitting right behind it
already shows, so it was removed; the reason now lives on the card only.
(An even earlier version crammed a single red `"Declined: {reason}"`
line directly under the card's title, in a hand-picked hex; that became
this bordered/tinted banner using the actual design-system tone.) There
is no separate "Revise" step or button — editing the fields and clicking
"Submit Fees for Approval" again is exactly the same action as the very
first submission (same `submitAppraisalFeesForApproval()` call, same
`canSubmit` gate, now
written as `feeEditable && allGroupsAssigned && allBundlesHaveFeeDecision`
rather than checking `'not-submitted'` specifically), just starting from
the previous values instead of blank ones.
`submitAppraisalFeesForApproval()` clears `feeDeclineReason` back to `''`
the instant it's called, so a stale reason never lingers once
resubmitted.

### Advise Client / Payment Received

The "Advise client to settle the Appraisal fees" / "Advise Client" /
"Simulate: Payment Received" block lives on the list page
(`appraisal-appraiser-view.tsx`) at page level, gated on
`feeApprovalStatus === 'approved' && !feeSettled` — not duplicated on the
bundle detail page, since advising the client and confirming payment are
whole-batch actions with no natural "which bundle" framing, unlike the
fee decision itself which is inherently per-bundle. Advising stamps
`clientNotifiedAt`/`sentToOdooAt` (a simulated Sendit payment link + Odoo
request — see `docs/110-appraisal.md`'s "Non-goals / Open items"); the
follow-up action stamps `paymentReceivedAt`.

`feeSettled` (`feeApprovalStatus === 'approved' && !!paymentReceivedAt`)
is the "batch is fully done" flag, computed the same way everywhere it's
used. The bundle detail page's report form (`AppraiserAssignmentCard`)
unlocks on `reportUnlocked = bundle.feeNeeded === 'no' || feeSettled` —
**not** on `feeSettled` alone. A bundle whose fee decision is "No" has
nothing to wait on at all: there's no payment to settle, so its report
form unlocks the instant that Yes/No choice is made in the fee modal,
independent of whatever the batch's submit→approve→pay cycle is doing
for *other* bundles in the same batch that do need a fee. Only a bundle
whose fee is actually needed (`feeNeeded === 'yes'`) waits on
`feeSettled`; while waiting, it shows a plain locked message ("The
Appraisal Fee must be settled before the report form for this property
unlocks."). The same `bundle.feeNeeded === 'no' || (feeApprovalStatus
=== 'approved' && feeSettled)` check also drives the `'for-report'`
branch of the On Process/For Approval/For Report/Reported status
pill — both on this detail page's header `StatusBadge` and on the list
page's own table pill — so a no-fee bundle reads as "For Report"
immediately too, not stuck on "On Process" until an unrelated batch-level
payment clears.

Note that `paymentReceivedAt` is a *client-paid-via-Sendit* simulation,
not an internal record of how the LMS processed or deposited that payment
— that record (method, account, OR number, proof of deposit) lives
entirely on the Payment page, `docs/210-request-payments.md`, which reads this
flow's approved-fee state but owns no fee-decision fields itself.

## Dev/testing page actions

**Every Appraisal Fee simulate action on both pages is always visible in
the Settings popover, regardless of current state** — an earlier version
gated each one behind the state it was meant to produce (Approve/Decline
only while `pending-approval`, Payment Received only once advised),
which meant most of the popover was empty on a freshly-assigned bundle
and a tester had to click things in a specific order to unlock the next
one. Every action now calls a shared `ensureFeeBatchSubmitted()` helper
first: if the batch is still `not-submitted` or `declined`, it fills in
any bundle whose `feeNeeded` is still `null` (sample "Yes, ₱2,500, Site
visit + valuation fee") and calls `submitAppraisalFeesForApproval()`
before doing anything else — so clicking any one simulate button, from
any starting state, always has something real to act on and "just
works" in a single click.

**"Simulate: Another Officer Approves/Declines Appraisal Fees"** —
`appraisal-appraiser-view.tsx` registers these, and
`appraisal-appraiser-bundle-view.tsx` (the per-bundle detail page)
registers the exact same two entries — duplicated rather than shared,
since the two pages don't share a component for this — so the shortcut
is reachable whether a tester is on the list or already drilled into a
single bundle's detail page. Approve ensures the batch is submitted, then
calls `approveAppraisalFees()`; decline ensures submission too, then
opens each page's own local decline `ConfirmDialog` (same "Reason for
declining Appraisal Fees" prompt, same `declineAppraisalFees(reason)`
call, just two separate `useState` + dialog instances, one per file).
Since `page-actions-context.tsx` merges every registrant's actions rather
than having the latest one replace the rest (see `docs/110-appraisal.md`'s
"Dev/testing page actions"), both pages' registrations coexist fine with
`AppraisalTctTable`'s own entries — there is never a conflict from two
different pages registering the identical action, because only one of
these two pages is ever mounted at a time.

**"Simulate: Payment Received (Sendit)"** — registered by both pages, the
deepest cascade of the set. It ensures submission, approves if not
already `'approved'`, then stamps `clientNotifiedAt`/`sentToOdooAt`/
`paymentReceivedAt` all in the same call via `setAppraisal({...})`. This
means clicking just this one button from a completely fresh, undecided
bundle takes the whole batch from nothing all the way to "Settled" in a
single click — request, submit, approve, advise, and pay all folded into
one. (An earlier version split "Advise Client to Settle" and "Payment
Received" into two separate popover entries that only appeared one after
the other, in order; that's gone now — "Payment Received" alone handles
the whole remaining path.)

**"Simulate: Reset Appraisal Fees"** — always registered by both list and
detail pages (`resetAppraisalFees()`, `src/auth/admin-context.tsx`). This
one has no cascade logic and needs none, since a tester might want to
restart the whole fee flow from any state. It wipes `feeApprovalStatus`
back to `'not-submitted'`,
`feeDeclineReason`/`feeSubmittedAt`/`feeApprovedAt`/`clientNotifiedAt`/
`sentToOdooAt`/`paymentReceivedAt` all back to their blank/null defaults,
and every bundle's own `feeNeeded`/`feeAmount`/`feeDescription`/
`feeRemarks` back to undecided — but deliberately leaves
`reportBundles`' appraiser assignment and report content completely
untouched, since this is meant to restart just the fee
request/approval/settlement cycle, not undo an appraiser assignment or a
filled-in report.

**"Simulate: Fill Sample Report"** — registered by both pages, always
visible, independent of fee status entirely, since a report can be
filled in whenever (`AppraiserAssignmentCard`'s own form is never gated
on the fee either). It calls the same `buildSampleAppraisalReport()`
helper `AppraisalTctTable` uses (see `docs/110-appraisal.md`), just scoped
differently per page: the list page's version loops every bundle in the
batch that doesn't yet have `report.uploadedAt`, same as
`AppraisalTctTable`'s own version; the bundle detail page's version only
fills in the one bundle currently being viewed. Either way it's a no-op on
a bundle that already has a report — clicking it again never clobbers one
an appraiser (or this same action) already submitted.

**Unlike `AppraisalTctTable`'s own version, both of these pass
`buildSampleAppraisalReport(..., false)`** — the fourth `submit`
argument. `buildSampleAppraisalReport()` defaults `submit` to `true`
(matching `AppraisalTctTable`'s own use, whose whole purpose is
simulating a report the appraiser has already fully submitted — so it
still stamps `uploadedAt` and immediately locks the form); the
Appraiser's own two "Simulate: Fill Sample Report" entries pass `false`
instead, since their purpose is different — auto-filling the fields as a
starting point to review or tweak, not submitting a report on the
appraiser's behalf. With `submit: false`, `uploadedAt` stays unset, so
the form (including each TCT's own Collateral Photo dropzone) remains
fully editable afterward, exactly as if the appraiser had typed those
same values in by hand — "Submit Appraisal Report" (or, for an external
bundle, the file dropzone's own upload) still has to be triggered
separately to actually submit and lock it. (An earlier version of these
two page actions used the default `submit: true`, which auto-submitted
the report the instant the button was clicked — every field locked
read-only immediately, before a tester ever got a chance to look at or
adjust the sample values. That's the bug this `submit: false` change
fixes.)

**"Simulate: Request CI Fee"** — also registered by the same page, also
always visible now (an earlier version hid it once
`review.creditInvestigation.ciFeeStatus` moved past `'not-requested'`,
matching the "gate every simulate action behind its own precondition"
pattern that was dropped everywhere else on this page too) — a
dev/testing shortcut that calls `setCreditInvestigation({ ciFeeStatus:
'pending-approval', ciFeeAmount: '2500', ciFeeAmountDescription: 'Credit
investigation fee', ciFeeRemarks: '' })` directly, the same transition
`CiFeeCard`'s own "Yes, Request CI Fee" form makes (see
`docs/140-request-credit-investigation-fee.md`), just with fixed sample values
instead of officer-typed ones. This exists so a tester already on the
Appraiser page — several steps downstream of Credit Investigation — can
fast-forward CI Fee's own request step (the very first fee-gate in the
whole pipeline) without navigating all the way back to
`/admin/applications/[id]/credit-investigation` to trigger it manually.
Clicking it always re-applies these same values, even if CI Fee is
already pending/approved/declined, resetting it back to a fresh pending
request — the actual approve/decline simulation for it still lives on
`credit-investigation-view.tsx` (**"Simulate: Another Officer
Approves/Declines CI Fee"**) and on `/admin/ci-fee-approval` (see
`docs/150-request-credit-investigation-fee-approval.md`), not here.

## Appraisal Report (per bundle)

`review.appraisal.reportBundles: AppraisalReportBundle[]` — each entry is
`{ id, tctGroupIds, appraiserType, appraiserName, targetCompletionDate,
report }`, created by selecting TCT rows in the Officer's Collateral titles
table and assigning an appraiser via its modal (see `docs/110-appraisal.md`).

`AppraiserAssignmentCard` (the actual fill-in form) only ever renders on
the Appraiser's own workspace — where filling in and submitting the report
is that role's job — and it remains the **only** page where that editable
form appears. **The Officer's page never renders `AppraisalReportView`
inline at all.** There used to be a per-bundle loop on `appraisal-view.tsx`
— gated on `feeSettled` — rendering either a completed read-only
`AppraisalReportView` (once `bundle.report.uploadedAt` was set) or nothing
for a bundle whose report wasn't submitted yet, sitting directly after
`AssignedAppraiserCard` and before Head Approval. That loop has been
deleted entirely. A submitted bundle's report is now shown **only** inside
`AssignedAppraiserCard`'s "View Report" `Dialog` — clicking that button
renders `<AppraisalReportView bundleId={...} tctNumbers={...} />` inside
`DialogContent` for that one bundle — see `docs/110-appraisal.md`'s "Assigned
Appraiser". There's no on-page anchor for it anymore either: an earlier
version of `appraisal-report-view.tsx` stamped
`id={`appraisal-report-${bundleId}`}` plus `scrollMarginTop: '88px'` on its
outer `Box` (on both of its two return branches — external-file and
in-house-form) purely so a "View Report" button could `scrollIntoView` down
to it; now that the report is opened in a modal instead of scrolled to,
that `id`/`scrollMarginTop` plumbing has been removed from both return
branches — there's no scroll target left to support. A bundle whose report
isn't submitted yet simply has no report to view — the "View Report" button
itself doesn't render until `bundle.report.uploadedAt` is set.

Both pages read the exact same `bundle.report` data, so a report the
appraiser is still working on here simply isn't visible anywhere on the
Officer's page until submitted, at which point it becomes viewable via
`AssignedAppraiserCard`'s Dialog.

### `AppraisalReport` data model

Expanded from an original 4-field summary (Property Details, Appraised
Value, Remarks, Recommendation) to the full structure of the printed
**"Appraisal Report (REM)" PDF**, section by section:

- **Report details** — `dateReport`, `dateInspected`, `requestingOfficer`, `branch`.
- **Land** — `registeredOwner`, `locationOfProperty`, `encumbrancesRemarks`,
  plus `landTitles: AppraisalReportLandTitle[]` — one entry per pledged
  property (`AppraisalTctGroup`) the bundle covers (`{ tctGroupId,
  surveyNo, bookPageNo, titleRegistrationDate, titleRegistrationPlace,
  areaSize, lotNo, zonalValue, boundaries, technicalSpecification,
  photoFileName, photoFileUrl, photoUploadedAt }`), since the PDF's
  LAND/BOUNDARIES/TECHNICAL SPECIFICATION tables repeat once per TCT/OCT.
  `boundaries` is a single free-text field (matching the PDF, which has
  no North/South/East/West breakdown), not structured per-direction
  fields. The three `photo*` fields are a later addition — one Collateral
  Photo upload per TCT/OCT, same `fileName`/`fileUrl`/`uploadedAt`
  triplet shape every other single-file upload in this app uses, just
  renamed with a `photo` prefix since they sit alongside the title's own
  other fields rather than being the report's single file (see
  "In-house form" below for the upload UI).
- **Technical specification** (report-wide, not per-title) —
  `streetFrontage`, `streetWidth`, `surfacing`, `averageDepth`,
  `approxShape`, `topography`, `neighborhood`, `presentUse`,
  `highestAndBestUse`.
- **Source or kind of utilities** — `utilityPublicConveyance`,
  `utilityElectricity`, `utilityWater`, `utilityTelephone`.
- **Improvement / General Construction Features / Particular Description**
  — `generalConstructionFeatures`, `floorLevel`, `externalWalls`,
  `interiorWallsPartitions`, `flooring`, `doorsWindows`, `ceilingRoofing`.
- **Basis of Valuation (Land)** — `basisSource`, `basisLocation`,
  `basisAreaSize`, `basisPriceType`, `basisSellingPrice`,
  `fairMarketValuePerSqm`.
- **Remarks / Additional Information** — `remarksAdditionalInfo`.
- **Valuation table** — `itemOfProperty`, `fmvRcn`,
  `constructionStatusPercent`, `depreciatedValue`, `appraisedValueP`, then
  the headline totals: `appraisedValue` (required to submit — the only
  required field, same gate the old 2-field version had), `roundedFigures`,
  `amountInWords`, `loanableAmount`.
- **Signature chain** — `preparedBy`, `reviewedBy`, `endorsedBy`, `notedBy`.
- **Legacy fields kept as-is** — `propertyDetails` and `remarks` (no longer
  shown as prominently, but still present) and `recommendation` (the
  source process diagram's own field, distinct from the PDF).
- **External file fields** — `fileName`, `fileUrl`, `uploadedAt`, unchanged.

`createAppraisalReportBundle` (the `admin-context.tsx` factory, not the
context method of the same name) seeds `landTitles` from the bundle's
`tctGroupIds` on creation; `addTctGroupsToReportBundle` appends new blank
`landTitles` entries when TCTs are added to an existing unsubmitted
bundle; `setAppraisalBundleLandTitle(bundleId, tctGroupId, data)` is the
dedicated setter for patching one title's fields (a plain
`setAppraisalBundleReport` merge can't reach inside the `landTitles`
array). Stored sessions from before this expansion are topped up the same
way `appraisalGroups` is — by `tctGroupId`, defaulting any missing title
to blank rather than trusting a stale/absent array.

### In-house form (`AppraiserAssignmentCard`)

Which report path applies — `'inhouse'` or `'external'`
(`bundle.appraiserType`) — is decided exactly once, by the Officer, in
the Assign Appraiser modal (see `docs/110-appraisal.md`). This page renders
whichever one already applies; it no longer lets the appraiser switch it.
(An earlier version had a `ButtonGroup` toggle right on this card —
`setAppraisalBundleAppraiserType` — that reset `report` to a fresh blank
`AppraisalReport` on switch; it was removed since the appraiser already
knows which type they were assigned as, and re-deciding it from inside the
report form was both redundant and a way to second-guess the Officer's own
assignment. There is no read-only label in its place either — the type
just isn't surfaced here at all anymore.)

- **In-house** — the full sectioned form described above (each section
  under its own uppercase `SectionLabel`, separated by `Divider`s), plus
  one `LandTitleFields` block per pledged property, plus a fixed
  dashed-border note (verbatim from the source process diagram):
  *"Realtime taking picture, uploading of files anywhere in the system
  (integrate lot plotting and market value)"* — flagged there as future
  integration work, not built here. **"Submit Appraisal Report"** (renamed
  from "Create Appraisal Report" — the button submits an already
  filled-in report, it doesn't create one from nothing, so "Submit"
  describes the action more accurately) is enabled once Appraised Value
  is filled (the one required field, same as before), and sets
  `report.uploadedAt`. The confirmation line beneath it once the report
  is submitted reads "Report submitted {date}" to match (was "Report
  created {date}").
- **External** — unchanged: a single dashed file dropzone for the external
  appraiser's finished report (image or PDF). Picking a file sets
  `fileName`/`fileUrl`/`uploadedAt` directly (no separate submit step).

#### Land Title Fields

**Each `LandTitleFields` block also has its own "Choose a photo —
Collateral Photo" dropzone**, one per TCT/OCT, sitting at the END of that
property's field list — after Survey No./Book No./Boundaries/Technical
Specification, not before them — since the photo is a supporting
attachment for the title's other details, not the lead field to fill in
first. (An earlier version put it first, above Survey No.; moved to last
per explicit direction.) A real photo of the collateral itself, distinct
from the title/document fields around it.
Backed by three fields on `AppraisalReportLandTitle`:
`photoFileName: string | null`, `photoFileUrl: string | null`,
`photoUploadedAt: string | null` (same fileName/fileUrl/uploadedAt
triplet convention every other single-file upload in this app already
uses — `RequirementDoc`, the external-appraiser report file — just
scoped per land title instead of per bundle/document, since exactly one
photo per title is all this needs; not an array). Picking a file calls
`onChange({ photoFileName, photoFileUrl: URL.createObjectURL(file),
photoUploadedAt })` directly through `setAppraisalBundleLandTitle`, no
separate submit step, same as the external report dropzone.

`ReportFileDropzone` (the shared dashed-border upload control this card
already used for the external report file) was generalized to support
this: its `value` prop now accepts `File | string | null` instead of just
`File | null` — a freshly-dropped photo passes the real `File` for that
one render, but on every subsequent render (including after a page
reload within the same session) only the persisted `photoFileUrl` string
survives, since the `File` object itself never persists. Passing that URL
string straight through to `FileThumbnail` (which accepts `File | string`
via its own `imageView` prop) still renders a real photo thumbnail, unlike
the external-file dropzone's own display, which only ever reconstructs a
`new File([], fileName)` stand-in with no real bytes and therefore never
renders as an actual image (see below) — a new `imageView` prop on
`ReportFileDropzone` (default `false`) opts the photo dropzone into that
real-thumbnail rendering, while the external-file dropzone keeps its
existing icon-only look. A new `fileName` prop fills in the display name
whenever `value` is a bare URL string, since a blob: URL can't be parsed
back into a filename the way a `File`'s own `.name` can.

#### Locking

Once `headApprovalStatus !== 'pending'` **or** that bundle's report has
already been submitted (`report.uploadedAt` is set), the form locks:
every field/dropzone (including each TCT's own Collateral Photo dropzone)
becomes read-only. This keeps the assignment from being silently swapped
out from under an in-flight or already-approved report. The external
report dropzone still reconstructs a stand-in `File` object from
`report.fileName` (`new File([], report.fileName)`) purely so the shared
`FileThumbnail` display can show a filename — this is a display-only
stand-in with no real bytes behind it, not something that can be
re-downloaded, re-inspected, or (unlike the Collateral Photo dropzone)
rendered as an actual image preview. The external dropzone's own
`disabled` prop (derived from the same locked/`editable` flag) also hides
its delete (×) button once locked — a locked report's file cannot be
cleared via that button, which would otherwise desync the page.

**Locked fields still render dark, readable text — they no longer wash
out to MUI's default disabled gray.** An earlier version left every
`TextField` at its default disabled appearance, which colors the text a
light gray (`#919EAB`) regardless of whether the field is genuinely
empty or holds a fully filled-in, already-submitted report's real
content — on a completed report, that made the entire form barely
legible. The shared `fieldSx` both `LandTitleFields` and
`AppraiserAssignmentCard` build now overrides `.Mui-disabled`: text stays
`#14172A` (this app's standard dark text color) via both `color` and
`WebkitTextFillColor` (Safari/Chrome require overriding both for a
disabled input's text color to actually change), and the field's
background becomes `#F5F6FA` with a `#E1E4ED` border — `TONE_COLORS.neutral`'s
own `bg`/`border` values (`src/components/admin-ui/admin-tokens.ts`), not
one-off hex — so a light gray background is what communicates "locked"
now, instead of light gray text.

### Read-only view (`AppraisalReportView`)

Once a bundle's `report.uploadedAt` is set, `AssignedAppraiserCard`
renders this inside its "View Report" `Dialog` for that bundle on the
Officer's page (`docs/110-appraisal.md`), and
`appraisal-approver-bundle-view.tsx` renders it directly (one per bundle,
no dialog) on the Head/Approver's "My Approvals" detail page
(`docs/200-request-appraisal-report-approval.md`) — `appraisal-view.tsx`
itself never renders `AppraiserAssignmentCard` or `AppraisalReportView`
directly; both only ever appear via the pages that own them. It's a
read-only rendering of everything the appraiser filled in, so whoever is
reviewing (Officer or Head/Approver) can actually see the report's content
instead of just a "submitted" boolean.

Deliberately built from this app's own tokens rather than a one-off
document look — the outer card is plain `adminCardSx` (16px radius,
`#EBEDF3` border, same shell every other card here uses), each land title
is a nested `10px`-radius box matching `LandTitleFields`'s own inner-card
convention, and the Appraised Value callout reuses the tinted-box +
icon-avatar pattern (`TONE_COLORS.info.bg`, a navy `#1C2A6E` icon square)
this app already uses for its other prominent-total summaries. What makes
it read as a document rather than another admin card: a centered
"Appraisal Report" title + "Covers … Submitted by … on …" meta line up
top (a small letterhead, not a page-heading-sized title), a `SectionLabel`
(small-caps label + a full-width `Divider`) before each of the report's
sections, and every `Field` value sitting on its own hairline
bottom-border rather than floating loose in a wrapped paragraph — the way
values sit on ruled lines in an actual filled-in form. (Two earlier
passes overcorrected in the opposite direction: the very first version
used loose flex-wrapped `Field` pairs with no visual distinction from any
other app card; a second pass fixed that but introduced sharp 4-6px
corners, a monospace font, and hand-picked ink/border hex values found
nowhere else in the app, reading as a foreign component instead of this
app's own take on a document. This version keeps the *document structure*
— letterhead, section rules, field rules — while rendering it with the
app's actual card chrome and palette.) Every field is conditionally
rendered (`Field` returns `null` for an empty value, `SectionLabel`
dividers always show) so a partially-filled report doesn't show a wall of
blank labels. External-appraiser bundles instead show the uploaded file
with a **"View"** link (`report.fileUrl`) rather than any of the
structured fields, since external appraisers only ever upload a finished
file.

Each `LandTitleSummary` card (one per TCT/OCT) shows its own Collateral
Photo beside its field grid — `Stack direction="row"` with a fixed-width
(`200px`) photo column on the left and the fields flowing in the
remaining space, when `title.photoFileUrl` is set — wrapped in a plain
`<a target="_blank">` with a hover-reveal "View full photo" overlay so
clicking it opens the full photo in a new tab. (Three earlier layouts
got this wrong in different ways: first a small 56×56, then a still-small
84×64, thumbnail squeezed into the title row next to "TCT No. …" — both
too small to read as an actual photo; then a properly-sized photo
block stacked ABOVE the field grid instead of beside it, which left a
large dead gap of empty white space next to the photo whenever the grid
didn't fill every column on a row. The current side-by-side layout is
what actually fixed it — the photo's height now roughly matches its
fields' height instead of leaving unused space.) Unlike
`AppraiserAssignmentCard`'s own dropzone display (which can't render a
real image once locked, since it only has a stand-in `File`
reconstructed from just the filename), this view reads `photoFileUrl`
directly — a real, still-valid blob/object URL or data URI — so it
renders an actual photo, not a placeholder icon. No photo block renders
at all when a title has no photo, same "conditionally rendered, no blank
placeholder" convention every other field on this card follows.

**Collapsible sections + no muted text.** A full in-house report has
roughly 15 sections plus one land-title card per pledged property — an
earlier pass tried fixing the resulting wall-of-text feel by muting
"routine" fields to a lighter gray weight, but that read as
disabled/broken text rather than an intentional design choice, so it was
reverted entirely: every `Field` now renders at the same normal,
readable weight regardless of section. The actual fix for length: every
section after Land (Technical Specification, Source or Kind of
Utilities, Improvement — General Construction Features, and Basis of
Valuation) is wrapped in the shared `CollapsibleSection` component
(`src/components/collapsible-section` — the same chevron+`Collapse`
shell Document Checklist and Requirement Checklist's per-tab groups
already use elsewhere in this app), collapsed by default via a single
`expanded: Record<string, boolean>` state keyed per section. The
Valuation section's own totals (Loanable Amount, Rounded Figures,
Appraised Value (P), Item of Property, FMV/RCN, Construction Status %,
Depreciated Value), Remarks/Recommendation, and the
Prepared/Reviewed/Endorsed/Noted By signature block all stay
always-visible, not wrapped in a `CollapsibleSection` — the signature
block was wrapped in one in an earlier version, but who prepared,
reviewed, endorsed, and noted a report is attribution a reviewer
shouldn't have to click to see, not routine detail worth tucking away
by default, so it now renders as a plain `SectionLabel` + `FieldGrid`
like the other always-visible sections.

**Land titles collapse too, past the first fix's remaining problem.**
Wrapping only the sections AFTER Land wasn't enough on its own: a bundle
covering several pledged properties still stacked that many full
`LandTitleSummary` cards — five near-identical property cards, each with
its own photo and field grid — in one column, dominating the page before
a reviewer reached anything else. Same fix
`appraisal-appraiser-bundle-view.tsx` already applies to its own per-TCT
document lists: when a bundle covers more than one title
(`showToggle={titleGroups.length > 1}`), each `LandTitleSummary` renders
as a compact collapsed row by default — a 40×40 photo thumbnail, "TCT
No. …", and Zonal Value, right-aligned — expanding in place to the full
photo + field detail on click. A `Set<string>` of expanded group ids
(`expandedTitleIds`) tracks which are open, same "present in the set
means expanded" convention this page's own per-TCT document nesting
uses. A bundle covering only one title skips the toggle entirely
(`showToggle` false) and renders the full detail directly, same as
before — there's nothing to disambiguate or tuck away when it's the only
property in the report. The net effect on the 5-property sample data:
the page that used to require scrolling through ~3800px of stacked
photo cards before reaching Technical Specification now shows the whole
report, every property collapsed, in about one screen's height.

**"At a Glance" restructure — the fourth pass, and the first to change
the information architecture rather than the document's internals.**
Every fix above (side-by-side photo layout, no muted text, per-section
collapse, per-title collapse) still left the same underlying shape: one
long form read top to bottom, with pieces individually tucked away — a
reviewer still had to open several separate `CollapsibleSection`s one at
a time to build a full picture. This version inverts that instead of
tweaking it further: everything a reviewer actually needs to decide sits
in one always-visible "At a Glance" summary right after the letterhead —
`AppraisedValueHero`, then a `FieldGrid` of Registered Owner, Loanable
Amount, Location of Property, Highest and Best Use, and Properties
Covered (`titleGroups.length`), then `PhotoChipRow` — a small 72×54
thumbnail per pledged property (skipping any title with no photo), each
linking to its full photo, so every property's photo is visible without
opening anything. Below that, a single full-width "View Full Report" /
"Hide Full Report" toggle button (chevron rotates 180° when open) reveals
the ENTIRE itemized report underneath — every field, every section, the
exact same content and CollapsibleSection/per-title-collapse behavior the
earlier passes built, unchanged — collapsed by a single `fullReportOpen`
boolean rather than shown by default.

No tabs and no multi-column layout were introduced for this — grepping
the codebase for `@mui/material/Tabs` and any two-column detail-page grid
turns up nothing else in this app, so either would have been a genuinely
new interaction pattern bolted onto one screen rather than a restructure
that stays inside the existing design language. A single expand/collapse
toggle, reusing the same chevron+`Collapse` shell `CollapsibleSection`
already standardizes elsewhere, was the version of "new layout" that
actually fit. `Registered Owner`, `Loanable Amount`, `Location of
Property`, and `Highest and Best Use` each appear twice now — once in
the At a Glance summary, once again inside the full report's own
Land/Technical Specification/Valuation sections — which is intentional:
the full report is meant to read as the complete, unabridged document
(matching the printed REM section-by-section, as it always has), while
the summary is a separate "everything important, nothing to expand" view
layered on top of it, not a replacement for any of its content.

## Non-goals / Open items

- **Simulated Sendit/Odoo integrations** — the payment link and the
  request sent to Odoo when advising the client to settle the fee are both
  simulated button clicks triggered from this page's list view, not real
  integrations with either service.
- **No real photo capture or lot-plotting** for in-house appraiser reports
  — flagged directly on the in-house form's dashed note as future
  integration work, not built here.
- **No separate Appraiser login or role gate** — `AdminUser` has no role
  field, so "My Assignments" is a framing convention, not access control.
- **No revise/undo on a submitted report** — submission locks the form;
  only a Head decline (which clears every bundle's report — see
  `docs/110-appraisal.md`'s "Head Approval") reopens it.
