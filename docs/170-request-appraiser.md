# Appraiser Workspace (Request → Appraiser)

> **Maintenance rule:** update this file whenever `appraisal-appraiser-view.tsx`,
> `appraisal-appraiser-bundle-view.tsx`, or their supporting files
> (`appraisal/appraiser-assignment-card.tsx` — also home to
> `AppraisalReportSubmitCard`,
> `appraisal/appraisal-report-preview.tsx`,
> `appraisal/appraisal-report-view.tsx`,
> `appraisal/sample-appraisal-report.ts`,
> `appraisal/appraisal-bundle-status.ts`,
> `src/utils/get-appraisal-number.ts`) change.
> Companion to `docs/110-appraisal.md` (the Officer's Appraisal step page, which
> creates the bundles this workspace acts on) and
> `docs/190-request-appraisal-fee-approval.md` (where each bundle's own fee is
> approved or declined, independently of its siblings). Also companion to
> `docs/200-request-appraisal-report-approval.md` (where a submitted report is
> reviewed), `docs/180-request-appraisal-request.md` (the read-only status list
> over the same bundles), `docs/210-request-payments.md` (once a bundle's own
> Appraisal Fee is approved, that bundle's own `feePayment` and the actual
> "record payment / mark as paid" action live entirely on that page, not
> here), `docs/225-admin-design-system.md` (the admin design system — this
> workspace makes heavy use of `CollapsibleSection` /
> `CollapsibleSectionBadge`, `adminCardSx`, and the §6 modal/table
> patterns), and
> `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`
> (the design doc for the restructure that moved Appraisal Fee approval from a
> single whole-application `Appraisal.feeApprovalStatus` down onto each
> `AppraisalReportBundle` itself — every fee-approval field/method this doc
> describes is per-bundle as of that change).

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
  `'reported'` case as a plain "Reported" pill; the Officer's card shows the
  report inline, and the Appraisal - Request list swaps in a "View Report"
  button.
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

The page's own `Container` is `maxWidth="md"` with a `1040px` override
(`sx={{ maxWidth: '1040px !important' }}`, both the normal render and
the "Assignment not found" empty state) — a modest step up from the
default `md` breakpoint (900px), per explicit direction, rather than
jumping all the way to this app's `lg` breakpoint (1200px), which read
as too wide once tried. There's no MUI breakpoint between `md` and `lg`,
so a custom pixel `maxWidth` was used instead of a named breakpoint
(`!important` because MUI's `Container` sets `max-width` per breakpoint
via its own generated class, which otherwise wins over a plain `sx`
value at this breakpoint). The extra width goes toward saving vertical
space via denser field grouping, not toward wider text columns — see
"Field grouping" under "In-house form" below.

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
Appraisal Fee"**, outlined, once this bundle's own fee is no longer
`not-submitted`) that opens a `Dialog` — see "Appraisal Fee" below for the
full modal contents. **This is the *only* place an Appraiser can decide or
submit a fee at all** — there is no fee UI on the list page, and
`appraisal-view.tsx` (the Officer's page) never shows any fee UI either.

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

**Auto-collapses the moment this bundle's own fee is (re-)submitted.** A
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
inside the Appraisal Fee modal alone does **not** trigger this — only
"Submit Appraisal Fee for Approval" actually changes this bundle's own
`feeApprovalStatus`, so the collapse only happens once that's actually
been sent, not per bundle's individual Yes/No decision.

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
tuck one already-reviewed property's documents aside just because this
bundle's own fee hasn't been submitted yet. A bundle covering only *one* TCT skips the
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
unlocks immediately, without waiting on this bundle's own fee to settle).

"Advise Client"/"Simulate: Payment Received" remain **list-page-only**
actions, not duplicated on this detail page — those only make sense once
at least one bundle's own fee is already `approved` and unsettled, a state
better surfaced on the list where every bundle's fee/report status is
visible at a glance, and they still have no natural "which bundle" framing
the way the fee decision itself does — `clientNotifiedAt`/`sentToOdooAt`/
`paymentReceivedAt` stay whole-application fields on `Appraisal` itself,
not per-bundle (see "Advise Client / Payment Received" below).

## Appraisal Fee

**Requesting the fee happens inside a modal on the bundle's own detail
page, not an inline card.** `appraisal-appraiser-bundle-view.tsx` renders
an "Appraisal Fee" summary card between the header card and Documents — a
fee-status `StatusBadge` (No Fee/Draft/For Approval/Approved/Settled, same
`FEE_STATUS_COPY` map the list page's table pill uses) sits directly
beside the "Appraisal Fee" title, plus a single button, **"Request
Appraisal Fee"** (relabeled **"View Appraisal Fee"**, rendered outlined
instead of filled, once this bundle's own fee is no longer
`not-submitted`). Clicking it opens a `Dialog` — not an inline
expand/panel — following the exact same modal convention this page's
sibling list page (`appraisal-appraiser-view.tsx`) already uses for
"Advise Client to Settle": a `DialogTitle` with a close `IconButton`, a
`DialogContent`, and (only while editable) a footer action row. If the
bundle's fee decision is still undecided (`feeNeeded === null`), opening
the modal defaults it to `'yes'` right then, before the modal even
renders — Yes is the common case, so it opens pre-selected instead of
making the appraiser click Yes just to confirm the likely answer; No
remains one click away, same as ever.

Inside the modal, while `bundle.feeApprovalStatus === 'not-submitted'`
(`feeEditable`): the same Yes/No `FeeNeededOption` pair plus, once "Yes"
is picked, Request Amount (`NumericFormat` currency field) / Request
Amount Description (multiline, required) / Remarks (multiline, optional)
— all wired to `setAppraisalBundleFee(bundle.id, data)`, for *this*
bundle only. Picking "No" clears any previously-entered
amount/description/remarks. Below the fields, a **"Submit Appraisal Fee
for Approval"** button — gated on `canSubmit`, which now checks only
*this bundle's own* fee decision is complete (see "Data model" below for
why the old whole-application gate was removed) — sits in the modal's
footer; confirming calls `submitAppraisalBundleFeeForApproval(bundle.id)`
directly (no separate `ConfirmDialog` layered on top — the modal itself
already reads as the deliberate "review before sending" step) and closes
the modal. It submits **only this one bundle** — a sibling bundle on the
same application is completely unaffected. Once submitted, the modal
instead shows a read-only summary (amount + description + remarks, or "No
fee needed") plus a "Requested on {date}" line sourced from
`bundle.feeSubmittedAt` — an ISO string
`submitAppraisalBundleFeeForApproval(bundleId)` stamps via `new
Date().toISOString()` (same convention every other admin-context.tsx
timestamp uses) each time this bundle's own fee is actually sent,
overwritten on every re-submission (including after a decline — see
below) so it always reflects the *latest* send, not the first — with no
footer button at all — editing only happens pre-submission, same as
always. (An earlier version moved that read-only summary out of the modal
entirely, straight onto the card, dropping the button/modal for that
case; that was reverted — keeping the fee UI in one consistent place, the
modal, reads better than splitting it across two different presentations
depending on whether it's editable.)

Separately, once `!feeEditable` (this bundle's own fee has actually been
submitted — pending-approval, approved, or settled), the Appraisal Fee
card itself gains a subtitle under the title/badge row —
`"{fCurrency(bundle.feeAmount)} requested"` — so the appraiser can see
what was actually requested at a glance without opening the modal. It
only renders when `bundle.feeNeeded === 'yes'`; a no-fee bundle already
communicates that via its "No Fee" badge alone, with nothing to summarize
as an amount. It's deliberately absent while still `feeEditable`
(`not-submitted` OR `declined`) — an in-progress decision that hasn't
been (re-)sent yet isn't a "request" worth summarizing on the card; a
declined bundle loses the subtitle the moment it's declined, the same way
it never had one before its first submission, and only earns it back once
"Submit Appraisal Fee for Approval" has actually been clicked again.

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

Each pledged property's fee is decided **and approved per bundle** — there
is no app-wide flat fee, and (as of the per-bundle restructure — see
`docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`)
no longer a shared batch state either. `AppraisalReportBundle` itself
carries the whole fee-approval data model: `feeNeeded: 'yes' | 'no' |
null`, `feeAmount`, `feeDescription`, `feeRemarks` (the proposed fee, set
by the appraiser), plus `feeApprovalStatus: 'not-submitted' |
'pending-approval' | 'approved' | 'declined'`, `feeDeclineReason`, and
`feeSubmittedAt: string | null` (the ISO timestamp this *one bundle's*
fee was last submitted, `null` until its first submission, overwritten —
not cleared — on every subsequent re-submission). Two bundles on the same
application can sit at completely different `feeApprovalStatus` values at
the same time — one `'approved'` while another is still
`'pending-approval'` or hasn't even been proposed yet. `Appraisal` itself
carries none of these fields any more; they used to live there as a single
batch-wide status shared by every bundle, submitted/approved/declined all
together, before this restructure. Freshly-created bundles start with
`feeNeeded: null` (undecided), since `createAppraisalReportBundle` is
never called with a `fee` argument from the Officer's Assign Appraiser
modal (the Officer never sets this — see `docs/110-appraisal.md`).

The "My Assignments" table shows an **"Appraisal Fee"** status pill per row
(distinct from the overall On Process/For Approval/For Report/Reported pill
next to it) — **No Fee** (`feeNeeded === 'no'`, unless declined), **Draft**
(`not-submitted`), **Declined** (`bundle.feeApprovalStatus === 'declined'`,
`tone: 'error'`, takes priority over every other label including "No Fee" —
even a no-fee bundle's decision was part of the declined submission and
needs reconsidering), **For Approval** (`pending-approval`), **Approved**
(`bundle.feeApprovalStatus === 'approved'` but not yet settled, `tone:
'success'` — green, same tone as "Settled"; an earlier version used `tone:
'info'` (blue), changed so "Approved" reads as an unambiguous positive
outcome rather than a neutral in-progress one), or **Settled**
(`feeSettled`) — the same pill shape the bundle detail page's own
Appraisal Fee card trigger button now sits next to. Once approved, the fee
card also gains an `"Approved on {date}"` segment appended to its
`"{amount} requested"` subtitle, sourced from this bundle's own
`feeApprovedAt: string | null` field (stamped by
`approveAppraisalBundleFee(bundleId)` via `new Date().toISOString()`, the
same convention `feeSubmittedAt` uses; cleared back to `null` whenever
`submitAppraisalBundleFeeForApproval(bundleId)` runs again on this same
bundle, since a fresh submission means whatever was previously approved no
longer applies) — visible both on the card itself and inside the modal's
read-only summary.

### Approve / decline

There's no real approver role in this prototype, so approval/decline is
simulated via page actions both `appraisal-appraiser-view.tsx` (the list
page) and `appraisal-appraiser-bundle-view.tsx` (the per-bundle detail
page) register themselves, independently (same convention as CI Fee's
"Simulate: Another Officer Approves/Declines CI Fee") — **"Simulate:
Another Officer Approves Appraisal Fee"** calls
`approveAppraisalBundleFee(bundleId)` (sets this one bundle's own
`feeApprovalStatus: 'approved'`, leaving every sibling bundle untouched);
**"Simulate: Another Officer Declines Appraisal Fee"** opens a reason
dialog whose confirm calls `declineAppraisalBundleFee(bundleId, reason)`.
These page actions are not part of the detail page's fee modal itself —
they're a separate popover entry, reachable from whichever of the two
pages happens to be open. The fuller, non-simulated review path for the
same two outcomes lives on `/admin/fee-approvals` — see
`docs/190-request-appraisal-fee-approval.md` and
`docs/155-request-fee-approvals.md`.

**Decline is a real, visible status, not an instant silent reset.**
`declineAppraisalBundleFee(bundleId, reason)` sets this bundle's own
`feeApprovalStatus: 'declined'` and stores the reason in this bundle's own
`feeDeclineReason` — it deliberately does **not** touch this bundle's own
`feeNeeded`/`feeAmount`/`feeDescription`/`feeRemarks` (an earlier version
wiped the whole batch back to blank/undecided on decline; that was changed
so revising means editing what's already there, not re-typing from
scratch — and now scoped to one bundle at a time rather than a shared
batch). `feeEditable` — used throughout the bundle detail page — is
`bundle.feeApprovalStatus === 'not-submitted' || bundle.feeApprovalStatus
=== 'declined'`, so a declined bundle behaves exactly like a fresh draft:
the fee card shows a red "Declined" badge, **plus its own full "Reason for
decline" banner row** below the title/button row — a warning-triangle
`Iconify` icon, an uppercase "Reason for decline" label, and the stored
`feeDeclineReason` body text, all tinted with `TONE_COLORS.error`
(`src/components/admin-ui/admin-tokens.ts` — the same canonical
error-tone bg/border/text values every other error surface in the admin
app uses, not one-off hex) so the reason is visible at a glance without
opening anything. Its button reads "Request Appraisal Fee" again (not
"View"), and Appraisal Documents un-collapses back to its always-open
editable state (see above). **The fee modal itself does not repeat this
banner** — an earlier version showed the identical banner inside the
modal too, above the editable fields, but that duplicated what the card
sitting right behind it already shows, so it was removed; the reason now
lives on the card only. (An even earlier version crammed a single red
`"Declined: {reason}"` line directly under the card's title, in a
hand-picked hex; that became this bordered/tinted banner using the actual
design-system tone.) There is no separate "Revise" step or button —
editing the fields and clicking "Submit Appraisal Fee for Approval" again
is exactly the same action as the very first submission (same
`submitAppraisalBundleFeeForApproval(bundle.id)` call, same `canSubmit`
gate, checking only this bundle's own fee decision is complete rather than
checking `'not-submitted'` specifically or any sibling bundle's state —
the old whole-application "every pledged property must be assigned and
have a fee decision" gate was removed entirely as part of the per-bundle
restructure), just starting from the previous values instead of blank
ones. `submitAppraisalBundleFeeForApproval(bundleId)` clears this bundle's
own `feeDeclineReason` back to `''` the instant it's called, so a stale
reason never lingers once resubmitted.

### Advise Client / Payment Received

The "Advise client to settle the Appraisal fees" / "Advise Client" /
"Simulate: Payment Received" block lives on the list page
(`appraisal-appraiser-view.tsx`) at page level, gated on **at least one
bundle's own fee being `'approved'` and unsettled** — not duplicated on
the bundle detail page, since advising the client and confirming payment
are whole-application actions with no natural "which bundle" framing,
unlike the fee decision itself which is inherently per-bundle. This is a
deliberate scope boundary from the per-bundle restructure (see
`docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`):
`clientNotifiedAt`/`sentToOdooAt`/`paymentReceivedAt` stayed on
`Appraisal` itself rather than moving down onto the bundle, since the
client is advised once per application regardless of how many separate
appraiser assignments/fees it has. Advising stamps
`clientNotifiedAt`/`sentToOdooAt` (a simulated Sendit payment link + Odoo
request — see `docs/110-appraisal.md`'s "Non-goals / Open items"); the
follow-up action stamps `paymentReceivedAt`.

`feeSettled` (`bundle.feeApprovalStatus === 'approved' &&
!!paymentReceivedAt`) is the "this bundle's fee is fully done" flag,
computed the same way everywhere it's used — it reads this bundle's own
`feeApprovalStatus` but the still-whole-application `paymentReceivedAt`,
so a payment-received stamp settles every already-approved bundle at
once, but a bundle that isn't yet `'approved'` stays unsettled regardless.
The bundle detail page's report form (`AppraiserAssignmentCard`) unlocks
on `reportUnlocked = bundle.feeNeeded === 'no' || feeSettled` — **not** on
`feeSettled` alone. A bundle whose fee decision is "No" has nothing to
wait on at all: there's no payment to settle, so its report form unlocks
the instant that Yes/No choice is made in the fee modal, independent of
whatever any *other* bundle on the same application is doing with its own
submit→approve→pay cycle. Only a bundle whose fee is actually needed
(`feeNeeded === 'yes'`) waits on `feeSettled`; while waiting, it shows a
plain locked message ("The Appraisal Fee must be settled before the
report form for this property unlocks."). The same `bundle.feeNeeded ===
'no' || (bundle.feeApprovalStatus === 'approved' && feeSettled)` check
also drives the `'for-report'` branch of the On Process/For
Approval/For Report/Reported status pill — both on this detail page's
header `StatusBadge` and on the list page's own table pill — so a no-fee
bundle reads as "For Report" immediately too, not stuck on "On Process"
until an unrelated bundle's payment clears.

Note that `paymentReceivedAt` is a *client-paid-via-Sendit* simulation,
not an internal record of how the LMS processed or deposited that payment
— that record (method, account, OR number, proof of deposit) lives
entirely on the Payment page, `docs/210-request-payments.md`, which reads
each bundle's own approved-fee state but owns no fee-decision fields
itself. Payment itself is per-bundle now too — see
`docs/210-request-payments.md`.

## Dev/testing page actions

**Every Appraisal Fee simulate action on both pages is always visible in
the Settings popover, regardless of current state** — an earlier version
gated each one behind the state it was meant to produce (Approve/Decline
only while `pending-approval`, Payment Received only once advised),
which meant most of the popover was empty on a freshly-assigned bundle
and a tester had to click things in a specific order to unlock the next
one. Every action now calls a shared `ensureFeeSubmitted(bundleId)` helper
first: if that one bundle's own fee is still `not-submitted` or
`declined`, it fills in the fee if `feeNeeded` is still `null` (sample
"Yes, ₱2,500, Site visit + valuation fee") and calls
`submitAppraisalBundleFeeForApproval(bundleId)` before doing anything else
— so clicking any one simulate button, from any starting state, always
has something real to act on and "just works" in a single click, scoped
to the one bundle the action is acting on (the bundle currently being
viewed on the detail page, or, on the list page, the row the action was
triggered from).

**"Simulate: Another Officer Approves/Declines Appraisal Fee"** —
`appraisal-appraiser-view.tsx` registers these, and
`appraisal-appraiser-bundle-view.tsx` (the per-bundle detail page)
registers the exact same two entries — duplicated rather than shared,
since the two pages don't share a component for this — so the shortcut
is reachable whether a tester is on the list or already drilled into a
single bundle's detail page. Approve ensures this bundle's fee is
submitted, then calls `approveAppraisalBundleFee(bundleId)`; decline
ensures submission too, then opens each page's own local decline
`ConfirmDialog` (same "Reason for declining Appraisal Fee" prompt, same
`declineAppraisalBundleFee(bundleId, reason)` call, just two separate
`useState` + dialog instances, one per file) — each of these applies only
to the one bundle the action targets, never to a sibling bundle on the
same application. Since `page-actions-context.tsx` merges every
registrant's actions rather than having the latest one replace the rest
(see `docs/110-appraisal.md`'s "Dev/testing page actions"), both pages'
registrations coexist fine with `AppraisalTctTable`'s own entries — there
is never a conflict from two different pages registering the identical
action, because only one of these two pages is ever mounted at a time.

**"Simulate: Payment Received (Sendit)"** — registered by both pages, the
deepest cascade of the set. It ensures this bundle's fee is submitted,
approves it if not already `'approved'` (`approveAppraisalBundleFee`),
then stamps the still-whole-application `clientNotifiedAt`/`sentToOdooAt`/
`paymentReceivedAt` all in the same call via `setAppraisal({...})` — since
those three fields stayed on `Appraisal` itself rather than moving
per-bundle (see "Advise Client / Payment Received" above), this one call
settles every already-approved bundle on the application at once, not
just the bundle the action was triggered from. This means clicking just
this one button from a completely fresh, undecided bundle takes that
bundle from nothing all the way to "Settled" in a single click — request,
submit, approve, advise, and pay all folded into one. (An earlier version
split "Advise Client to Settle" and "Payment Received" into two separate
popover entries that only appeared one after the other, in order; that's
gone now — "Payment Received" alone handles the whole remaining path.)

**"Simulate: Reset Appraisal Fee"** — always registered by both list and
detail pages (`resetAppraisalBundleFees(bundleId)`,
`src/auth/admin-context.tsx`). This one has no cascade logic and needs
none, since a tester might want to restart one bundle's own fee flow from
any state. It wipes that bundle's own `feeApprovalStatus` back to
`'not-submitted'`, its own `feeDeclineReason`/`feeSubmittedAt`/
`feeApprovedAt` back to their blank/null defaults, and its own
`feeNeeded`/`feeAmount`/`feeDescription`/`feeRemarks` back to undecided —
sibling bundles and the still-whole-application `clientNotifiedAt`/
`sentToOdooAt`/`paymentReceivedAt` are untouched, as is this bundle's own
appraiser assignment and report content, since this is meant to restart
just the one bundle's fee request/approval cycle, not undo an appraiser
assignment or a filled-in report, or affect any other bundle.

**"Simulate: Reset Report"** — the report's own equivalent, registered
only on the per-bundle detail page
(`resetAppraisalBundleReport(bundleId)`, `src/auth/admin-context.tsx`).
Restores this one bundle's `report` back to a genuinely blank, editable
state via `createBlankAppraisalReport(bundle.tctGroupIds)` — a shared
helper factored out of `createAppraisalReportBundle` so a freshly-created
bundle and a reset one always start from the exact same blank shape.
`uploadedAt` goes back to `null` (un-submitting the report), every
top-level field clears, and `landTitles` is rebuilt fresh per TCT (any
Collateral Photos/Lot Plot/signatory stamps on those titles are gone —
this is a full reset, not a selective undo). Sibling bundles and this
bundle's own fee/assignment fields are untouched. Added specifically
because every other "Simulate" action on this page (Fill Sample Report
included) correctly no-ops once `report.uploadedAt` is set — with no way
to undo a submission from this page, a bundle a tester had already
submitted (via the real Submit button, or the Officer's own "Simulate:
Appraiser Submits Report") had no path back to editable short of clearing
the whole session's `localStorage`.

**"Simulate: Fill Sample Report"** — registered by both pages, always
visible, independent of fee status entirely, since a report can be
filled in whenever (`AppraiserAssignmentCard`'s own form is never gated
on the fee either). It calls the same `buildSampleAppraisalReport()`
helper `AppraisalTctTable` uses (see `docs/110-appraisal.md`), just scoped
differently per page: the list page's version loops every bundle on the
application that doesn't yet have `report.uploadedAt`, same as
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
deleted entirely. A submitted bundle's report is now shown **inline inside
`AssignedAppraiserCard` itself** — a `Collapse` panel (expanded by
default) under that bundle's row rendering
`<AppraisalReportView bundleId={...} tctNumbers={...} />` — see
`docs/110-appraisal.md`'s "Assigned Appraiser". There's no on-page anchor
for it: an earlier version of `appraisal-report-view.tsx` stamped
`id={`appraisal-report-${bundleId}`}` plus `scrollMarginTop: '88px'` on its
outer `Box` purely so a "View Report" button could `scrollIntoView` down to
it; that `id`/`scrollMarginTop` plumbing has been removed. A bundle whose
report isn't submitted yet has no report to show — the inline panel only
renders once `bundle.report.uploadedAt` is set.

Both pages read the exact same `bundle.report` data, so a report the
appraiser is still working on here simply isn't visible anywhere on the
Officer's page until submitted, at which point it becomes viewable via
`AssignedAppraiserCard`'s Dialog.

### `AppraisalReport` data model

Expanded from an original 4-field summary (Property Details, Appraised
Value, Remarks, Recommendation) to the full structure of the printed
**"Appraisal Report (REM)" PDF**, section by section:

- **Report details** — `dateReport`, `dateInspected`, `requestingOfficer`,
  `branch`, plus `accountName`/`accountAddress` — the printed PDF's own
  letterhead fields, distinct from Registered Owner/Location of Property
  below (the title's own registered name/address in the LAND section,
  which can differ from the borrower account named at the top of the
  report). Added per explicit direction, having no prior field to map to.
- **Land** — `registeredOwner`, `locationOfProperty`, `encumbrancesRemarks`,
  plus `landTitles: AppraisalReportLandTitle[]` — one entry per pledged
  property (`AppraisalTctGroup`) the bundle covers (`{ tctGroupId,
  fileType, titleNo, surveyNo, bookPageNo, titleRegistrationDate,
  titleRegistrationPlace, areaSize, lotNo, zonalValue, fmvRcn,
  constructionStatusPercent, depreciatedValue, appraisedValueP, latitude,
  longitude, lotPlotFileName, lotPlotFileUrl, lotPlotGeneratedAt,
  lotPlotLines: LotPlotLine[], boundaries, technicalSpecification,
  collateralPhotos: CollateralPhoto[] }`), since the PDF's
  LAND/BOUNDARIES/TECHNICAL SPECIFICATION tables — and its final "Item of
  Property" valuation table — all repeat once per TCT/OCT. `fileType`/
  `titleNo` are plain text fields alongside Survey No./Book No. `fmvRcn`,
  `constructionStatusPercent`, `depreciatedValue`, and `appraisedValueP`
  moved here from the flat `AppraisalReport` (see "Valuation table"
  below) so a bundle covering several TCTs shows one valuation row per
  title, matching the printed report, instead of one shared row for the
  whole bundle; the old `itemOfProperty` field was dropped entirely as
  redundant with the title's own "TCT No. …" card header. `boundaries` is
  a single free-text field (matching the PDF, which has no
  North/South/East/West breakdown), not structured per-direction fields.
  `collateralPhotos` holds every Collateral Photo uploaded for this
  title — each entry a `CollateralPhoto` (`{ fileName, fileUrl,
  uploadedAt }`, same triplet shape every other single-file upload in
  this app uses, just as an array element since a title supports multiple
  photos) — see "In-house form" below for the multi-upload UI. (An
  earlier version had exactly one photo per title, as three flat
  `photo*` fields directly on `AppraisalReportLandTitle`; converted to
  this array per explicit direction to support multiple uploads.)
  `lotPlotLines` is a bearings/distance table (`{ id, label, northSouth:
  'N'|'S'|'', degrees, eastWest: 'E'|'W'|'', minutes, distanceM }`), a
  freely-typed "+ Add line" repeatable list shown alongside the generated
  plot image/lat-long inputs — purely descriptive input (same
  no-real-geocoding convention as latitude/longitude), not used to
  actually compute the generated plot image.
- **Technical specification** (report-wide, not per-title) —
  `streetFrontage`, `streetWidth`, `surfacing`, `averageDepth`,
  `approxShape`, `topography`, `neighborhood`, `presentUse`,
  `highestAndBestUse`.
- **Source or kind of utilities** — `utilityPublicConveyance`,
  `utilityElectricity`, `utilityWater`, `utilityGasOthers` (renamed from
  `utilityTelephone` to match a reference tool's own "Gas / Others"
  field).
- **Improvement** — `improvements: AppraisalImprovementEntry[]` (`{ id,
  yearConstructed, construction, condition, estFloorArea }`) — now
  repeatable (an "Add Improvement" card, same pattern as Basis of
  Valuation's own comparables), replacing the earlier flat
  `buildingYearConstructed`/`buildingCondition`/`buildingConstruction`/
  `buildingEstFloorArea` single record. A report covering several
  structures on site (main house, garage, etc.) can now list each one
  separately, matching a reference tool's own repeatable "Improvement 1,
  Improvement 2…" cards.
- **General Construction Features** — `generalConstructionFeatures`
  (rich narrative field), its own card, unchanged.
- **Particular Description** — `particularDescriptions:
  AppraisalParticularEntry[]` (`{ id, floorLevel,
  interiorWallsPartitions, flooring, doorsWindows, ceilingRoofing }`) —
  now repeatable ("Add Particular"), replacing the earlier flat
  `floorLevel`/`externalWalls`/`interiorWallsPartitions`/`flooring`/
  `doorsWindows`/`ceilingRoofing` single record (`externalWalls` was
  dropped — no equivalent field in the reference form this now matches).
- **Basis of Valuation (Land)** — `basisOfValuationComparables:
  BasisOfValuationComparable[]` (`{ id, source, location, areaSize,
  priceType, zonalValue, value }` — `zonalValue` is new, alongside the
  existing fields), plus `fairMarketValuePerSqm`, `fairMarketValueTotal`
  (new), and `valuationRemarks` (new, a narrative field). UI is an "Add
  Comparable" card (matching Requirement Checklist's own "Add
  Collateral" pattern) — an input row + button that appends a new
  `createBasisOfValuationComparable()` entry (a fresh `crypto.randomUUID()`
  id, blank strings), with a per-entry delete (×) button. Three dedicated
  setters: `addAppraisalBundleComparable(bundleId)`,
  `updateAppraisalBundleComparable(bundleId, comparableId, data)`,
  `removeAppraisalBundleComparable(bundleId, comparableId)` — a plain
  `setAppraisalBundleReport` merge can't reach inside the array, same
  reason `setAppraisalBundleLandTitle` exists for `landTitles`.
  `improvements`/`particularDescriptions`/`conditionsForAcceptance`/
  `landTitles[].lotPlotLines` (see below), added later, deliberately did
  NOT get their own dedicated setters — the in-house form's own
  add/update/remove handlers compute the next array inline and call the
  existing generic `setAppraisalBundleReport(bundleId, { field:
  nextArray })` merge instead, since that setter already exists and a
  dedicated setter per array would just be more surface area for the
  same result.
- **Remarks / Additional Information** — `remarksAdditionalInfo`, plus a
  new **Conditions for acceptance of collateral** repeatable array,
  `conditionsForAcceptance: AppraisalConditionEntry[]` (`{ id,
  itemOfProperty, ref, marketable, constructionStatusPercent,
  depreciatedValue, appraisedValue }`) — an "Add Item" card in the same
  section, matching a reference tool's own table.
- **Valuation table → Appraisal summary** — the per-TCT row (`fmvRcn`,
  `constructionStatusPercent`, `depreciatedValue`, `appraisedValueP`) still
  lives on `AppraisalReportLandTitle` (see "Land" above), one row per
  pledged property, matching the PDF's per-TCT "Item of Property" table.
  `AppraisalReport` itself keeps the bundle-wide totals, now under an
  "Appraisal summary" heading matching the reference form: `appraisedValue`
  (required to submit — the only required field), `roundedFigures`,
  `amountInWords`, `loanableAmount`, plus two new fields,
  `leasablePercent`/`leasableAmount` (Leasable Percent %/Leasable Amount
  PHP) — a distinct concept from Loanable Amount, both kept side by side.
- **Signature chain** — a **sequential sign-off chain**, not just four
  name fields: `preparedBy`/`preparedAt`, `reviewedBy`/`reviewedAt`,
  `endorsedBy`/`endorsedAt`, `notedBy`/`notedAt` (each `*At` an ISO
  timestamp or `null`). Each step is gated on the previous one already
  being stamped — Reviewed requires `preparedAt` set, Endorsed requires
  `reviewedAt`, Noted requires `endorsedAt`; Prepared has no prior step.
  Typing a name does **not** stamp it — stamping is `stampAppraisalBundleSignatory
  (bundleId, role, name)`, a distinct action simulating another person's
  approval (same "Simulate: Another Officer Approves ___" convention this
  app's other approval flows use), called from each step's own
  "Simulate: Approve" button in the form (`SignatoryField`, gated on
  `gateMet && name.trim()`). Editing a name after it's stamped does not
  clear the stamp — the button has to be clicked again to re-stamp. This
  chain is entirely independent of Submit Appraisal Report and Head
  Approval — it never gates either, and neither gates it; it exists only
  to track who did each step of the report's own sign-off, per explicit
  direction.
- **Legacy fields kept as-is** — `propertyDetails` and `remarks` (no longer
  shown as prominently, but still present) and `recommendation` (the
  source process diagram's own field, distinct from the PDF).
- **File Attachment** — `subdivisionPlanFileName`/`subdivisionPlanFileUrl`/
  `subdivisionPlanUploadedAt` and `taxMapFileName`/`taxMapFileUrl`/
  `taxMapUploadedAt`, both the standard single-file triplet shape (like
  the external report file below), one Subdivision Plan and one Tax Map
  for the whole report — bundle-wide, not per-TCT, distinct from each
  title's own (per-TCT, multiple) Collateral Photos and Lot Plot image.
  Maps to the printed PDF's own "File Attachment" section (which also
  lists per-lot photos — those are what Collateral Photos covers).
  `feeAttachments: CollateralPhoto[]` (new) is a separate, generic
  multi-photo gallery — "Fee Attachment" in a reference form — reusing
  the same `MultiPhotoDropzone` component Collateral Photos uses
  (append-on-drop, thumbnail grid with per-photo remove), bound to
  `setAppraisalBundleReport(bundleId, { feeAttachments })` directly
  rather than a dedicated setter, same reasoning as the other new arrays
  above.
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
  dashed-border note (originally verbatim from the source process
  diagram, now trimmed to just its still-unbuilt half now that lot
  plotting itself is built — see "Land Title Fields" above): *"Realtime
  taking picture, uploading of files anywhere in the system (integrate
  market value)"* — flagged there as future integration work, not built
  here. Directly below that note, still inside the form itself, sits the
  **"Preview Appraisal Report"** button — see "Preview" below. The form
  has no submit button any more — see "Submit (separate card)" below.
- **External** — unchanged: a single dashed file dropzone for the external
  appraiser's finished report (image or PDF). Picking a file sets
  `fileName`/`fileUrl`/`uploadedAt` directly (no separate submit step). No
  Preview button — the uploaded file itself is the report.

**Field grouping.** Every field row across the in-house form and
`LandTitleFields` was regrouped to take advantage of the page's widened
`lg` container (see "Per-bundle detail page" above) — 3-4 `TextField`s
per `Stack direction="row"` instead of 2, per explicit direction to save
vertical space. Concretely: Report details (Date Report/Date
Inspected/Requesting Officer/Branch) is now one row of 4, was two rows
of 2; Technical Specification's 9 fields are now two rows of 4 + one
solo row (Highest and Best Use), was four rows of 2-3; Source or Kind of
Utilities' 4 fields are one row of 4, was two rows of 2; Particular
Description's 6 fields are two rows of 3, was three rows of 2; Basis of
Valuation's 5 fields are one row of 3 + one row of 2, was one row of 2 +
one row of 3; Valuation's Appraised Value/Rounded Figures/Loanable
Amount are one row of 3 (Amount in Words stays its own full-width row,
since it reads a full sentence), was scattered across three separate
rows; Prepared/Reviewed/Endorsed/Noted By is one row of 4, was two rows
of 2. Inside `LandTitleFields`: Survey No./Book No./Title Registration
Date/Title Registration Place are now one row of 4 (was two rows of 2),
and FMV-RCN/Construction Status %/Depreciated Value/Appraised Value (P)
are now one row of 4 (was two rows of 2); Area Size/Lot No./Zonal Value
was already a row of 3 and is unchanged. No field was renamed, removed,
or had its validation/behavior changed — this is layout-only.

#### Preview

**"Preview Appraisal Report"** sits in its own footer row directly below
the dashed integration note, at the end of `AppraiserAssignmentCard`
itself (the in-house form) — not in the separate submit card below.
Matches "View Initial Credit Checking Result"'s own footer shape
(`initial-credit-checking-view.tsx`) exactly: a `<Divider />`, then a
`Stack direction="row" justifyContent="space-between"` with a small
muted icon + one-line description ("Preview the full formatted report
generated from everything above.") on the left and the button on the
right, rather than the button sitting alone with no framing. The button
itself is styled to match this app's other outlined-navy secondary-action
buttons — `outlinedNavyButtonSx` plus a `solar:document-text-bold-duotone`
`startIcon`, the same shape "View Initial Credit Checking Result" and
"View full application" (`application-details-card.tsx`) use — rather
than a bare outlined button with no icon or framing. (An earlier version
had just the bare button, self-aligned to the left with no divider or
description row; restyled to this footer shape per explicit direction.)
Always available, even before Appraised Value is filled in or the report
is submitted.

Opens a `Dialog` (`fullWidth`, `maxWidth="md"`, no `scroll`/`PaperProps`
override) whose header now matches the **Call Report modal**'s own shape
(`call-report-result-modal.tsx`) rather than MUI's `DialogTitle`/`Divider`
convention: a plain `Box` (`display:'flex', justifyContent:'space-between',
alignItems:'flex-start', p:3, pb:2`) with the title
(18px/700 "Appraisal Report") and the covered TCT numbers — a wrapping
row of small pill chips directly below it, moved out of the scrollable
body into this fixed header — on the left, and a bordered close
`IconButton` (`border:'1px solid #E1E4ED', borderRadius:'10px'`,
`solar:close-circle-bold` icon, `#8891A6`) on the right. No `Divider`
between header and body — `DialogContent` (`px:3, pb:3`) follows
directly, same as the Call Report modal, which also has no header/body
divider. `DialogContent` renders `AppraisalReportPreview`
(`appraisal-report-preview.tsx`, no longer responsible for its own
title/chip header) — a **new**, deliberately plain component, not the
existing `AppraisalReportView` (the Officer/Approver's read-only view of
an *already-submitted* report, built around an "At a Glance" summary +
per-section and per-title `CollapsibleSection`s). `AppraisalReportPreview`
has none of that: every section and every land title renders in full,
top to bottom, always expanded — since this is a quick "what does the
report look like so far" check while still filling it in, not a
long-lived reviewing surface that benefits from tucking sections away.
It reads directly off the current, possibly still-editable `report`
state (no submission gate of its own). (Two earlier versions preceded
this: first the Appraisal Fee card's own `DialogTitle`+close-`IconButton`
modal shell; then a `DialogTitle` restyled to match the "Full
application" modal (title/subtitle block + a plain `<Divider />`) —
both reworked into this Call-Report-matching plain-`Box` header per
explicit direction, since it's the pattern this app's own polished
"report" modals — Call Report, Credit Checking Result — already share.
Separately, an earlier version placed this button in
`AppraisalReportSubmitCard` instead, alongside Submit; moved back into
the form itself per explicit direction, since Preview is something the
appraiser reaches for while still filling the form in, not a step that
belongs next to the one-time-only Submit action.)

**`AppraisalReportPreview` now matches the Call Report modal's entire
design system**, per explicit direction, not just its section-as-card
shell — every field-level component was replaced, not only the
container:

- **`SectionCard`** (`p:2.5, borderRadius:'14px', border:'1px solid
  #EEF0F5'`, spaced apart rather than divided) wraps every section
  **except** Report details (see `FactChipRow` below, no `SectionCard`
  around it at all) — Land (owner/location fields + a plain,
  un-carded Encumbrances/Remarks — see below), each TCT's own
  `LandTitlePreview` (see "Each TCT is now its own top-level card"
  below), Technical Specification, Source or Kind of Utilities,
  Improvement, Basis of Valuation, and Valuation. `SectionLabel` itself
  dropped its own trailing `Divider` — separation now comes purely from
  spacing between cards, the same way Call Report's sections are
  separated.
- **`FactChip`/`FactChipRow`** — Report details (Date Report, Date
  Inspected, Requesting Officer, Branch) renders as a bare
  `FactChipRow` with **no `SectionCard` wrapper around it at all** (an
  earlier version wrapped it in one; removed per explicit direction —
  the chip strip already has its own border/background, so an outer
  card was a redundant double border). Same fact-chip strip
  `appraisal-appraiser-bundle-view.tsx`'s own header row uses (label
  above, bold value below, `flex:'1 1 128px'`, a bordered/tinted
  wrapping `Stack` with `borderRight` dividers between chips).
- **`FieldRow`** (label fixed at `width:200`, value bold beside it,
  `Stack direction="row"`) replaced the old grid-based
  `Field`/`FieldGrid` (hairline-underline value, responsive
  2/4-column grid) for every simple value — same shape
  `call-report-result-modal.tsx`'s own `FieldRow` uses. Rows stack
  vertically inside each `SectionCard` rather than flowing into a grid.
- **`NarrativeBlock`** (its own bordered box, `p:2, borderRadius:'12px',
  border:'1px solid #EEF0F5'`, label + `lineHeight:1.65` paragraph,
  returns `null` for an empty value) is used for **General Construction
  Features, Remarks/Additional Information, and Recommendation only** —
  **Boundaries, Technical Specification (inside each `LandTitlePreview`)
  and Encumbrances/Remarks (inside the Land card) are plain label + text
  with no border/box**, per explicit direction (an earlier version
  wrapped all six in `NarrativeBlock`; these three were un-carded since
  they read better as plain running text alongside the surrounding
  `FieldRow`s rather than as a separate bordered callout). Remarks and
  Recommendation don't sit inside their own `SectionCard` either — they're
  stand-alone `NarrativeBlock`s directly in the outer `Stack`, matching
  how Call Report's own narrative fields aren't necessarily wrapped in a
  further section card.
- **`SignatureField`** (a 34×34 white icon-chip with a green `#C7EDDA`
  border + `solar:user-bold-duotone` icon, next to a stacked
  uppercase-green micro-label + bold name) replaced the earlier
  bordered-box `SignatureBlock` for all four
  Prepared/Reviewed/Endorsed/Noted By entries — same icon-chip shape
  `call-report-result-modal.tsx`'s own `SignatureField` uses (which
  itself matches `EndorsementDeclarationCard`'s `SignatureField`).
  **Each of the four now lives in its own `SectionCard`** (no label on
  the card itself, since `SignatureField` already carries its own
  "Prepared by"/"Reviewed by"/etc. micro-label) laid out in a
  responsive grid (`1fr` on mobile, 2 columns on `sm`, 4 on `md`) — the
  earlier combined "Prepared / Reviewed / Endorsed / Noted By" card
  title was dropped entirely, since each entry's own label already says
  which signatory it is; nothing was left needing that outer label.

**Each TCT is now its own top-level `SectionCard`**, sitting directly
after the "Land" card rather than nested inside it — the Land card
itself keeps only Registered Owner, Location of Property, and
Encumbrances/Remarks; `LandTitlePreview` (one per TCT/OCT) is rendered
as a sibling `SectionCard` (its own title now just `TCT No. …`, via
`SectionCard`'s `label` prop, matching every other top-level card's
border/radius instead of its own smaller nested-card look) directly in
`AppraisalReportPreview`'s outer `Stack`, per explicit direction — a
bundle covering several TCTs now reads as several full-width report
sections in sequence, not as several sub-cards squeezed inside one Land
section.

This is Preview-only — `AppraisalReportView` (the Officer/Approver's
read-only view of an *already-submitted* report) keeps its own distinct
printed-form styling (hairline-underline `Field`, the "At a Glance"
hero, per-section `CollapsibleSection`, its own bordered-box
`SignatureBlock`, land titles nested inside the Land section) unchanged;
the two intentionally read as different products, matching the same
split `AppraisalReportPreview` was built to have from the start (see
"Preview" above).

**Inside each `LandTitlePreview`, Lot Plotting now renders before
Collateral Photos**, per explicit direction (an earlier version had
Collateral Photos first). Collateral Photos render below the fields,
not beside them — a labeled "Collateral Photos" row of fixed 92×92
square thumbnails under Boundaries/Technical Specification/Lot
Plotting, each a `bgcolor:'#F5F6FA'` letterboxed square with
`objectFit: 'contain'` so a photo of any source aspect ratio renders
whole, never cropped or stretched, regardless of how many photos a
title has. **The sample-fill data now seeds 4 Collateral Photos per
title** (`buildSampleAppraisalReport()` in `sample-appraisal-report.ts`
maps `[1,2,3,4]` to four `CollateralPhoto` entries, all pointing at the
same `SAMPLE_COLLATERAL_PHOTO` placeholder image with distinct
`fileName`s) instead of just one, so "Simulate: Fill Sample Report"
demonstrates the multi-photo gallery, not a single photo. (An earlier
version placed a single fixed-width photo column beside the fields,
matching `AppraisalReportView`'s own single-hero-photo
layout; that broke once a title could hold multiple photos — a
`sm:200px`-wide column stacking several photos either overflowed or
squeezed them, so it was moved below the fields as its own row, which
scales to any photo count without disturbing the field grid's width.)

Lot Plotting itself is a **compact single-row card**,
not the same tinted-box-with-a-200px-image-column shape the fill-in form
(`LandTitleFields`) and the read-only view (`LandTitleSummary`) use for
it — Preview's version only ever shows two fields (Latitude, Longitude)
plus a small plot thumbnail, so the larger layout wasted space here. The
box is now a **neutral gray** callout (`bgcolor:'#F9FAFC',
border:'1px solid #EBEDF3'`, label + icon in `#5A6273`) rather than the
navy/blue tint (`#F7F8FE` bg, `#E3E7F5` border, `#1C2A6E` text) used
before, per explicit direction — Preview's version of this box no longer
signals "this is a distinct navy-tinted feature" the way the editable
form's own Lot Plotting card still does. Inside, a `Stack direction="row"`
now puts the fixed 56×56 plot thumbnail **on the left** (only rendered
when `lotPlotFileUrl` is set) and Latitude/Longitude stacked to its right
— the reverse of the image-on-the-right layout used before, per explicit
direction. This compact shape is Preview-only; `LandTitleFields`/
`LandTitleSummary` keep their existing larger side-by-side layout (image
on the right, unchanged) since those also carry the editable
Latitude/Longitude inputs and the Generate/Regenerate button, which need
more room than a read-only two-field summary does.

#### Submit (separate card)

**`AppraisalReportSubmitCard`** (same file as `AppraiserAssignmentCard`,
`appraiser-assignment-card.tsx`) renders directly below the in-house form
as its own card, holding only the **"Submit Appraisal Report"** button —
`appraisal-appraiser-bundle-view.tsx` renders both whenever
`reportUnlocked`, in sequence. Pulled out of the form itself so
submitting reads as its own deliberate step, the same way requesting the
Appraisal Fee lives in its own card rather than inline inside Documents
(see "Appraisal Fee" above). It renders nothing for an external bundle
(`bundle.appraiserType !== 'inhouse'` — the external dropzone's own
picking-a-file *is* its submit step, with nothing left to separate out).

**"Submit Appraisal Report"** (renamed from "Create Appraisal Report" —
the button submits an already filled-in report, it doesn't create one
from nothing) is enabled once Appraised Value is filled (the one required
field, same as before), and sets `report.uploadedAt`. Hidden once the
report is locked (`headApprovalStatus !== 'pending'` or already
submitted), same `editable` gate the form itself uses. The confirmation
line beneath it once the report is submitted reads "Report submitted
{date}".

#### Land Title Fields

**Each `LandTitleFields` block is individually collapsible when a bundle
covers more than one TCT/OCT**, per explicit direction. The outer
bordered box (`p:1.5, borderRadius:'10px', border:'1px solid #EBEDF3'`)
stays; inside it, once `titleGroups.length > 1`, the "TCT No. …" header
and all of that title's fields are wrapped in the shared
`CollapsibleSection` component (`src/components/collapsible-section` —
the standard chevron+`Collapse` shell Document Checklist, Requirement
Checklist's per-tab groups, and this same form's own read-only sibling
`AppraisalReportView` already use), **expanded by default**.

Unlike this app's other per-TCT expand/collapse UIs
(`appraisal-appraiser-bundle-view.tsx`'s own per-TCT document lists,
`AppraisalReportView`'s own `LandTitleSummary` rows — both collapsed by
default, tracking an **`expandedTitleIds`** `Set<string>` where presence
means expanded), `AppraiserAssignmentCard` tracks the inverse —
**`collapsedTitleIds`**, where presence means collapsed and *absence*
(the default for every id, including one not yet known) means expanded.
Deliberately different from the read-only convention for two reasons:
(1) this is the actual fill-in form, so the appraiser needs every
title's fields — including its Collateral Photo uploader — visible
without an extra click per title; (2) tracking collapsed ids instead of
expanded ids closes a real hydration race an `expandedTitleIds` version
hit in production use — `bundle` (and therefore `bundle.tctGroupIds`)
isn't available until this app's async `hydrated` localStorage load
completes (`admin-context.tsx`), so a `useState` initializer that seeded
`expandedTitleIds` from `bundle?.tctGroupIds` at mount could lock in an
**empty** set forever if the component happened to render before
hydration finished — every title then stayed stuck collapsed for the
rest of the session, surfacing as "the upload feature disappeared" even
after the "expand by default" fix shipped. `collapsedTitleIds` starting
as a plain empty `Set<string>()` has no such race: an id that hasn't
loaded yet, or hasn't been explicitly collapsed, is expanded by
definition, with nothing to seed. Still individually collapsible on
demand via the same `toggleTitle(groupId)` add/remove-from-set handler.
**A bundle covering only one TCT skips the toggle
entirely** (`showToggle={titleGroups.length > 1}` passed down from
`AppraiserAssignmentCard`, same convention `LandTitleSummary`'s own
`showToggle` uses) — the plain title + fields render directly, no
chevron, nothing to collapse when there's only one property in the
report.

**Each `LandTitleFields` block also carries its own valuation row** — FMV
/ RCN (PHP), Construction Status %, Depreciated Value, and Appraised
Value (P) — placed directly after Zonal Value, since Area Size × Zonal
Value is what drives that row in the printed PDF. These moved here from
a single shared "Valuation" section on `AppraisalReport` so a bundle
covering several TCTs shows one valuation row per title instead of one
row for the whole bundle (see "Valuation table" under "`AppraisalReport`
data model" above).

**Each `LandTitleFields` block also has its own Lot Plotting sub-section**,
placed directly after the valuation row — styled to match the
"Add Collateral" card in Requirement Checklist
(`requirement-checklist-view.tsx`): a `p:2, borderRadius:'13px',
bgcolor:'#F8F9FC', border:'1px solid #E3E7F0'` container, a header row
with a 36×36 `#EEF1FE` icon badge (map-pin icon) + a 14px/700 title
("Lot Plotting") + a 12.5px muted one-line description directly under
it, then a `Stack direction={{ xs:'column', sm:'row' }}` of
Latitude/Longitude `TextField`s (each `minHeight:42, borderRadius:'10px',
bgcolor:'common.white'`) plus a filled navy "Generate Lot Plot" /
"Regenerate" `Button` (`variant="contained"`, same `minHeight:42,
borderRadius:'10px', bgcolor:'#1C2A6E'` shape the Add Collateral card's
own submit button uses) at the end of that row — rather than the earlier
version's outlined button and tinted-box-with-side-column layout.
Once generated, the plot image renders below that row (`mt:1.75`, fixed
200px wide on larger screens), captioned "Simulated preview".
`latitude`/`longitude` are plain text fields — manually typed by the
appraiser; there is no address/geocoding lookup integration. Once both
are filled, the Generate/Regenerate button is enabled and writes a
**simulated** plot-diagram image into
`lotPlotFileName`/`lotPlotFileUrl`/`lotPlotGeneratedAt` (same
`fileName`/`fileUrl`/`uploadedAt`-shaped triplet every other single-file
field in this app uses). **No real AI or mapping/GIS service is called**
— `buildLotPlotImage()` (`appraiser-assignment-card.tsx`) generates a
canned inline SVG data URI (a dashed-border lot outline + the typed
coordinates printed on it), the same technique
`sample-appraisal-report.ts`'s `SAMPLE_COLLATERAL_PHOTO` uses for the
Collateral Photo's own sample fill, including the trailing `#.jpg`
fragment workaround for `FileThumbnail`'s extension sniff. The read-only
view (`LandTitleSummary` in `appraisal-report-view.tsx`) and the preview
modal (`LandTitlePreview` in `appraisal-report-preview.tsx`) keep their
own, unchanged tinted side-by-side box for this — the "Add Collateral"
card shape is specific to the editable form, since it also carries the
editable inputs and the Generate/Regenerate action, which those two
read-only views don't have. See `docs/225-admin-design-system.md` §14
and "Fabricated Claims" below.

(Two earlier versions preceded this: first Latitude/Longitude as two
plain fields in the flat list alongside Survey No./Zonal Value, with the
button and a stacked-below preview image; then a tinted
`#F7F8FE`/`#E3E7F5` box with the fields and button stacked on the left
and the plot image fixed at 200px on the right (`Stack direction="row"`)
— both reworked into this "Add Collateral"-matching shape per explicit
direction.)

**Each `LandTitleFields` block also has its own multi-photo Collateral
Photo uploader**, one per TCT/OCT, sitting at the END of that property's
field list — after Survey No./Book No./Boundaries/Technical
Specification, not before them — since the photo is a supporting
attachment for the title's other details, not the lead field to fill in
first. A title supports **more than one** collateral photo — backed by
`collateralPhotos: CollateralPhoto[]` on `AppraisalReportLandTitle`, each
entry `{ fileName, fileUrl, uploadedAt }` (same triplet convention every
other single-file upload in this app uses, here as an array element
instead of a single field). (An earlier version had exactly one photo
per title as three flat `photo*` fields; converted to this array per
explicit direction to support multiple uploads.)

**`MultiPhotoDropzone`** (`appraiser-assignment-card.tsx`, distinct from
`ReportFileDropzone` below) is the upload control: an always-open dashed
dropzone (`multiple: true` on its `useDropzone` call, so a single drag
can pick several files at once) that never shows a "selected" state of
its own — every drop calls `onChange([...photos, ...newPhotos])`,
**appending** to the array rather than replacing it, unlike
`ReportFileDropzone`'s single-value replace-on-change contract. Below
the dropzone, a wrapping row of 88×66 thumbnails shows every photo
uploaded so far, each with its own small delete (×) `IconButton`
(top-right corner, absolutely positioned) that removes just that one
entry (`photos.filter((_, i) => i !== index)`). The dropzone itself
hides once `!editable` (locked/submitted), consistent with every other
field on this card; already-uploaded thumbnails keep rendering with
their delete buttons hidden the same way.

`ReportFileDropzone` (the original shared dashed-border single-file
control, still used by the external appraiser report file at the bottom
of this file) is untouched by this — `MultiPhotoDropzone` is a separate
component built directly on `useDropzone`, not a wrapper around
`ReportFileDropzone`, since an always-open, append-only, multi-file
control is a different contract from `ReportFileDropzone`'s
single-value/single-selected-state one.

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
renders this inline in a `Collapse` panel for that bundle on the Officer's
page (`docs/110-appraisal.md`), and
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

Each `LandTitleSummary` card (one per TCT/OCT) shows all of its
Collateral Photos beside its field grid via **`LandTitlePhotoGallery`**
— `Stack direction="row"` with a fixed-width (`200px`) wrapping gallery
column on the left (each photo a 92px-wide thumbnail) and the fields
flowing in the remaining space, rendered whenever `title.collateralPhotos`
is non-empty. Each thumbnail is its own `<a target="_blank">` with a
hover-reveal magnifier overlay so clicking any one opens that specific
full photo in a new tab. (An earlier version, before multiple photos per
title were supported, showed a single hero photo instead of a gallery —
three layout passes before that fixed its sizing and positioning: first
a small 56×56, then a still-small 84×64, thumbnail squeezed into the
title row next to "TCT No. …" — both too small to read as an actual
photo; then a properly-sized photo block stacked ABOVE the field grid
instead of beside it, which left a large dead gap of empty white space
next to the photo whenever the grid didn't fill every column on a row.
The side-by-side layout that fixed the single-photo version carried
straight over into the gallery.) Unlike `AppraiserAssignmentCard`'s own
`MultiPhotoDropzone` thumbnails (which are always real, freshly-dropped
`File`-backed blob URLs, so this isn't actually a locking distinction the
way the external report file's stand-in `File` is), this view reads each
photo's `fileUrl` directly — a real, still-valid blob/object URL or data
URI — so every thumbnail renders an actual photo, not a placeholder
icon. No gallery renders at all when a title has no photos, same
"conditionally rendered, no blank placeholder" convention every other
field on this card follows.

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
(`src/components/collapsible-section` — the standard admin card-header
contract, see `docs/225-admin-design-system.md` §6; the same
chevron+`Collapse` shell Document Checklist and Requirement Checklist's
per-tab groups already use), collapsed by default via a single
`expanded: Record<string, boolean>` state keyed per section. The
Valuation section's own totals (Loanable Amount, Rounded Figures,
Appraised Value (P), Item of Property, FMV/RCN, Construction Status %,
Depreciated Value), Remarks/Recommendation, and the
Prepared/Reviewed/Endorsed/Noted By signature block all stay
always-visible, not wrapped in a `CollapsibleSection` — the signature
block was wrapped in one in an earlier version, but who prepared,
reviewed, endorsed, and noted a report is attribution a reviewer
shouldn't have to click to see, not routine detail worth tucking away
by default. Each of the four entries now renders as its own bordered
**`SignatureBlock`** (`p:2`, `borderRadius:'12px'`, `border:'1px solid
#EEF0F5'`, an eyebrow label + bold 14px name) instead of the plain
hairline-underline `Field` style every other value on this card uses —
matching `credit-checking-result-modal.tsx`'s own "Prepared by" box
pattern exactly, per explicit direction, rather than this card's own
`FieldGrid`/`Field` convention. `SignatureBlock` is a local, file-scoped
helper (defined identically in both `appraisal-report-view.tsx` and
`appraisal-report-preview.tsx` — there's no shared/exported version of
this pattern anywhere in the app, so it was copied rather than
imported), returning `null` for an empty name the same way `Field` does.

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
thumbnail per pledged property (skipping any title with no photos; shows
that title's FIRST collateral photo when it has more than one — the full
gallery of every photo lives in the full report's `LandTitleSummary`, not
here), each linking to its full photo, so every property has at least one
photo visible without opening anything. Below that, a single full-width
"View Full Report" /
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

## Decision Gate

This workspace has no proceed/reject decision of its own — it feeds the
Officer's Appraisal page (`docs/110-appraisal.md`), which owns the
Pass/Fail terminal decision. The gating that does happen here:

- **Appraisal Fee approval** — a report form stays locked until this
  bundle's own `feeApprovalStatus === 'approved'` (`feeEditable`) and
  settled. Decline sets a visible `'declined'` status + `feeDeclineReason`
  on this one bundle, without wiping its fee fields, and never touches a
  sibling bundle on the same application.
- **Report submission locks the form** — once `bundle.report.uploadedAt`
  is set there is no revise/undo; only a Head decline reopens it.
- Approve/decline is simulated via page actions (no real approver role);
  the fuller path is `/admin/fee-approvals`.

## Fabricated Claims — Real vs. Simulated

- **No Appraiser login or role gate** — `AdminUser` has no role field;
  "My Assignments" is framing, not access control.
- **Fee approve/decline is a simulated page action** — no second-officer
  login.
- **Sendit / Odoo** — the payment link and the "sent to Odoo" request on
  Advise Client are simulated button clicks, no real integration;
  `clientNotifiedAt` / `sentToOdooAt` are just timestamps.
- **No real photo capture** for in-house reports — flagged on the form as
  future work.
- **Lot Plot generation is simulated** — "Generate Lot Plot" writes a
  canned inline SVG placeholder (`buildLotPlotImage()` in
  `appraiser-assignment-card.tsx`) printed with the appraiser's own typed
  latitude/longitude; no real AI, mapping, or GIS service is called, and
  the coordinates themselves are manually typed (no address/geocoding
  lookup).
- **`AppraisalReport` is a form, not a parsed PDF** — its fields mirror
  the "Appraisal Report (REM)" PDF layout but nothing is extracted from
  any upload.
- **The Prepared/Reviewed/Endorsed/Noted sign-off chain is simulated** —
  `stampAppraisalBundleSignatory()` just writes a name + `new
  Date().toISOString()` into state from a button click in the same
  session; there's no second-person login or notification behind any of
  the four "Simulate: Approve" steps, same as this app's other
  approve/decline simulate actions.
- All state lives in `review.appraisal` in `localStorage`.

## Non-Goals / Open Items

- **No batch approval across bundles** — approving, declining, or
  resetting one bundle's fee never touches any other bundle on the same
  application; there is no "decide everything at once" action anymore
  (see `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`).
- **Simulated Sendit/Odoo integrations** — the payment link and the
  request sent to Odoo when advising the client to settle the fee are both
  simulated button clicks triggered from this page's list view, not real
  integrations with either service; these three fields (`clientNotifiedAt`/
  `sentToOdooAt`/`paymentReceivedAt`) deliberately stayed whole-application,
  not per-bundle.
- **No real photo capture** for in-house appraiser reports — flagged
  directly on the in-house form's dashed note as future integration work,
  not built here.
- **No real lot plotting integration** — "Generate Lot Plot" is a
  simulated placeholder image (see "Fabricated Claims" above); the
  appraiser also has no address/geocoding lookup, only manual
  latitude/longitude text entry.
- **No separate Appraiser login or role gate** — `AdminUser` has no role
  field, so "My Assignments" is a framing convention, not access control.
- **No revise/undo on a submitted report** — submission locks the form;
  only a Head decline (which clears every bundle's report — see
  `docs/110-appraisal.md`'s "Head Approval") reopens it.

## History

Concise milestones — the detailed pass-by-pass narrative is in "Read-only
view (`AppraisalReportView`)" above.

- **2026-10-16** — Matched the in-house form's field set to a reference
  Appraisal Report tool, section by section: added File Type/Title No.
  per land title, a per-title Lot Plotting bearings/distance table
  (`lotPlotLines`), renamed Utilities' Telephone to Gas/Others
  (`utilityGasOthers`), converted Improvement and Particular Description
  from flat single records into repeatable arrays
  (`improvements`/`particularDescriptions`), added Zonal Value to each
  Basis of Valuation comparable plus Fair Market Value Total and
  Valuation Remarks, added a new repeatable "Conditions for acceptance of
  collateral" table (`conditionsForAcceptance`), added Leasable
  Percent/Amount to the renamed "Appraisal summary" block, and added a
  generic multi-photo "Fee Attachment" gallery (`feeAttachments`, reusing
  `MultiPhotoDropzone`). Updated `appraisal-report-preview.tsx` and
  `appraisal-report-view.tsx` (both read-only renderers) and
  `sample-appraisal-report.ts` to match. The new array fields use the
  existing generic `setAppraisalBundleReport` merge rather than dedicated
  context setters — see "`AppraisalReport` data model" above.
- **2026-09-28** — Added "Simulate: Reset Report"
  (`resetAppraisalBundleReport`), a dev/testing action on the per-bundle
  detail page that restores this bundle's `report` back to a genuinely
  blank, editable state (`uploadedAt: null`, every field cleared). Factored
  `createBlankAppraisalReport(tctGroupIds)` out of `createAppraisalReportBundle`
  so both share the identical blank shape. Added because every other
  Simulate action on this page correctly no-ops once a report is already
  submitted, leaving no way back to editable from this page short of
  clearing the whole session. See "Dev/testing page actions" above.
- **2026-09-23** — Closed 5 gaps against the printed "Appraisal Report
  (REM)" PDF, found via a field-by-field diff against it: (1) added
  `accountName`/`accountAddress` (the PDF's own letterhead fields, no
  prior mapping); (2) added a bundle-wide `buildingYearConstructed`/
  `buildingCondition`/`buildingConstruction`/`buildingEstFloorArea`
  record (the PDF's "Building 1" summary table); (3) replaced the single
  Basis of Valuation field set with `basisOfValuationComparables:
  BasisOfValuationComparable[]`, an "Add Comparable" card (matching
  Requirement Checklist's "Add Collateral" pattern), since the PDF
  actually lists several comparable sources, not one; (4) turned
  Prepared/Reviewed/Endorsed/Noted By into a sequential sign-off chain
  (`stampAppraisalBundleSignatory`, each step gated on the previous
  one's timestamp, simulated "Simulate: Approve" buttons per step,
  independent of Submit/Head Approval); (5) added bundle-wide
  Subdivision Plan/Tax Map upload fields (the PDF's own "File
  Attachment" section, distinct from each title's per-TCT Collateral
  Photos). All five per explicit direction after the user supplied the
  actual sample PDF for comparison. See "`AppraisalReport` data model"
  above.
- **2026-09-22** — Fixed a real hydration race in `LandTitleFields`'
  per-title expand state: the first "expand by default" fix seeded
  `expandedTitleIds` from `bundle?.tctGroupIds` in a `useState`
  initializer, which could lock in an empty set (every title stuck
  collapsed for the whole session) if the component rendered before this
  app's async `hydrated` localStorage load finished — still surfacing as
  "the Collateral Photo upload disappeared" even after that first fix.
  Inverted the tracked state to `collapsedTitleIds` (presence means
  collapsed; any id absent, including one not yet loaded, defaults to
  expanded) so the race can no longer produce a stuck-collapsed title.
  See "Land Title Fields" above.
- **2026-09-22** — `LandTitleFields` (the fill-in form's per-TCT card)
  made individually collapsible for a multi-TCT bundle, using the shared
  `CollapsibleSection` component and the same per-title `Set<string>`
  expand-state convention `AppraisalReportView`'s own `LandTitleSummary`
  already uses — single-TCT bundles unaffected (no toggle). Initially
  shipped collapsed by default (matching `LandTitleSummary`'s own
  convention), which hid each title's Collateral Photo uploader until
  expanded and read as a regression ("the upload feature disappeared");
  changed the same day to expanded by default per explicit direction,
  since this form's fields (including the uploader) need to be visible
  without an extra click, unlike the read-only summary rows it borrowed
  the collapse mechanism from. See "Land Title Fields" above.
- **2026-09-22** — The per-bundle detail page's `Container` was first
  widened to `maxWidth="lg"` (1200px), then dialed back to a custom
  `1040px` (via `maxWidth="md"` + an `sx` override) per explicit
  direction — `lg` read as too wide once tried; `1040px` is a modest
  step up from the default `md` (900px) with no named breakpoint in
  between. See "Per-bundle detail page" above.
- **2026-09-22** — Widened the per-bundle detail page's `Container` from
  `maxWidth="md"` to `"lg"` (matching Credit Investigation/Financial
  Evaluation/Requirement Checklist/Call Report), and regrouped every
  field row across the in-house form and `LandTitleFields` to 3-4 fields
  per row instead of 2, to take advantage of the extra width and save
  vertical space — per explicit direction. Layout-only; no field
  renamed, removed, or behavior-changed. See "Per-bundle detail page"
  and "Field grouping" above.
- **2026-09-22** — Follow-up refinements to `AppraisalReportPreview`,
  all per explicit direction: (1) dropped the `SectionCard` wrapper
  around the Report details `FactChipRow` — it now renders bare, no
  outer card; (2) de-carded Boundaries, Technical Specification, and
  Encumbrances/Remarks — plain label+text, no `NarrativeBlock` border,
  now that they sit alongside `FieldRow`s rather than needing their own
  callout; (3) restyled the Lot Plotting box from a navy/blue tint to a
  neutral gray one, and swapped its layout so the plot thumbnail sits on
  the left of Latitude/Longitude instead of the right. See "Preview"
  above.
- **2026-09-22** — Four structural changes to `AppraisalReportPreview`,
  all per explicit direction: (1) Report details card restyled to a
  `FactChip`/`FactChipRow` strip instead of `FieldRow`s; (2) each TCT's
  `LandTitlePreview` pulled out of the Land card and rendered as its own
  top-level `SectionCard` sibling instead of nested inside Land; (3) Lot
  Plotting moved before Collateral Photos inside `LandTitlePreview`
  (was after); (4) Prepared/Reviewed/Endorsed/Noted By split into four
  separate `SectionCard`s (one per signatory, in a responsive grid),
  dropping the single combined section label since each `SignatureField`
  already carries its own label. Also seeded 4 sample Collateral Photos
  per title in `buildSampleAppraisalReport()` instead of 1. See "Preview"
  above.
- **2026-09-22** — `AppraisalReportPreview` restyled to match the Call
  Report modal's entire field-level design system, not just its
  section-as-card shell: `FieldRow` replaced `Field`/`FieldGrid`,
  `NarrativeBlock` replaced bare `Typography` for free-text values, and
  `SignatureField` (icon-chip) replaced the bordered-box `SignatureBlock`
  for Prepared/Reviewed/Endorsed/Noted By — per explicit direction, after
  the section-card-only restyle earlier the same day was pointed out as
  incomplete. `AppraisalReportView` (the Officer/Approver's separate
  read-only view) is unaffected. See "Preview" above.
- **2026-09-22** — Three restyles matched to existing patterns per
  explicit direction: (1) the fill-in form's Lot Plotting sub-section
  (`LandTitleFields`) now matches the "Add Collateral" card in
  Requirement Checklist (icon-badge header, `minHeight:42` fields, a
  filled navy Generate/Regenerate button) instead of its own tinted
  side-by-side box; (2) the "Preview Appraisal Report" modal's header
  now matches the Call Report modal's plain-`Box` shape (no
  `DialogTitle`/`Divider`) instead of the "Full application" modal's
  `DialogTitle` shape; (3) `AppraisalReportPreview`'s body is now one
  bordered `SectionCard` per section, matching Call Report's own
  section-as-card convention, instead of a flat `SectionLabel`+`Divider`
  list. See "Land Title Fields" and "Preview" above.
- **2026-09-22** — The four Prepared/Reviewed/Endorsed/Noted By entries
  (in both `AppraisalReportView` and `AppraisalReportPreview`) restyled
  from the plain `FieldGrid`/`Field` hairline-underline style to a new
  local `SignatureBlock` — a bordered box per entry (eyebrow label + bold
  name), matching `credit-checking-result-modal.tsx`'s own "Prepared by"
  box exactly, per explicit direction. See "Read-only view" above.
- **2026-09-21** — "Preview Appraisal Report"'s footer row (not just the
  button itself) restyled to match "View Initial Credit Checking
  Result"'s own footer shape exactly — a `Divider`, then a
  `justifyContent="space-between"` row with a muted icon + one-line
  description on the left and the button on the right, replacing a bare
  self-aligned button with no framing. See "Preview" above.
- **2026-09-21** — "Preview Appraisal Report" restyled to match two
  existing patterns instead of its own one-off look: the trigger button
  now uses the same outlined-navy + document icon shape as "View Initial
  Credit Checking Result"/"View full application" (previously a bare
  outlined button, no icon); the modal header now matches the "Full
  Application" modal's shape — title + a subtitle row of TCT chips
  directly below it + a plain `Divider`, moved out of
  `AppraisalReportPreview`'s own scrollable body into the `Dialog`'s
  fixed `DialogTitle` (`AppraisalReportPreview` no longer takes a
  `tctNumbers` prop). See "Preview" above.
- **2026-09-20** — In `AppraisalReportPreview`'s `LandTitlePreview`,
  swapped the section order to put Collateral Photos above Lot Plotting,
  and shrank Lot Plotting into a compact single-row card (label +
  Latitude/Longitude inline + a 56×56 plot thumbnail) instead of the
  larger tinted box with a 200px image column the fill-in form and
  read-only view use — that larger shape was oversized for a
  Preview-only summary that has just two fields and no editable
  controls. See "Preview" above.
- **2026-09-18** — In `AppraisalReportPreview`'s `LandTitlePreview` only
  (the "Preview Appraisal Report" modal, not the Officer/Approver's
  `AppraisalReportView`), moved Collateral Photos out of a fixed-width
  side column into their own labeled row below the fields, as fixed
  92×92 letterboxed squares (`objectFit: 'contain'`) so any number of
  photos, of any source aspect ratio, render whole without cropping,
  distortion, or overflow. See "Preview" above.
- **2026-09-18** — Two fixes to the Lot Plotting/Collateral Photo work
  above: (1) the generated Lot Plot image switched from `objectFit:
  'cover'` to `'contain'` (with an `#EEF1FE` fill behind it) everywhere it
  renders — `cover` was cropping the baked-in "LOT PLOT" label and
  coordinates text off the edges of the fixed-aspect-ratio box; (2)
  Collateral Photo converted from a single photo per title
  (`photoFileName`/`photoFileUrl`/`photoUploadedAt`, three flat fields)
  to `collateralPhotos: CollateralPhoto[]`, supporting multiple uploads
  per TCT/OCT via a new always-open, append-only `MultiPhotoDropzone`
  (distinct from the single-value `ReportFileDropzone`) with a thumbnail
  grid and a per-photo delete button. See "Land Title Fields" and
  "Read-only view" above.
- **2026-09-18** — Redesigned Lot Plotting as its own tinted sub-section
  inside `LandTitleFields` (map-pin icon + "LOT PLOTTING" label), with
  Latitude/Longitude and the Generate button on the left and the
  generated plot image fixed-width on the right, after comparing this
  against a stacked-preview alternative. Mirrored in the read-only view
  and preview modal. See "Land Title Fields" above.
- **2026-09-18** — Moved "Preview Appraisal Report" back into
  `AppraiserAssignmentCard`'s own form (directly below the dashed
  integration note), out of `AppraisalReportSubmitCard` — that card now
  holds only "Submit Appraisal Report", per explicit direction that
  Preview belongs with the form being previewed, not beside the
  one-time Submit action. See "Preview" / "Submit (separate card)" above.
- **2026-09-18** — Added Lot Plotting to `LandTitleFields`: per-TCT
  `latitude`/`longitude` text fields plus a "Generate Lot Plot" button
  producing a simulated placeholder plot-diagram image
  (`lotPlotFileName`/`lotPlotFileUrl`/`lotPlotGeneratedAt` on
  `AppraisalReportLandTitle`). No real AI/mapping service is called; see
  "Land Title Fields" and "Fabricated Claims" above. Trimmed the
  in-house form's dashed-note disclaimer to drop the now-built
  "lot plotting" clause, keeping only "market value."
- **2026-09-17** — "Submit Appraisal Report" moved out of
  `AppraiserAssignmentCard`'s own form into a new separate card,
  `AppraisalReportSubmitCard`, alongside a new "Preview Appraisal Report"
  button opening a `Dialog` over a new, deliberately plain read-only
  component (`AppraisalReportPreview`) distinct from the existing
  `AppraisalReportView` — see "Preview and Submit (separate card)" above.
- **2026-09-17** — the "Item of Property" valuation row (FMV/RCN,
  Construction Status %, Depreciated Value, Appraised Value (P)) moved
  from a single shared field set on `AppraisalReport` onto
  `AppraisalReportLandTitle`, one row per TCT/OCT — matching the printed
  PDF, whose valuation table repeats once per title rather than once per
  bundle. The old `itemOfProperty` field was dropped as redundant with
  the title card's own "TCT No. …" header. Both the fill-in form
  (`LandTitleFields`) and the read-only view (`LandTitleSummary`) render
  these fields per-title now; `AppraisalReport`'s own "Valuation" section
  keeps only the bundle-wide totals (Appraised Value, Rounded Figures,
  Amount in Words, Loanable Amount).
- **`AppraisalReportView` redesign (multi-pass).** Rebuilt from a plain
  form into a document layout on the app's own tokens, then given visual
  hierarchy, then per-section `CollapsibleSection` collapse, then
  per-land-title collapse for multi-property bundles, then restructured
  around an always-visible "At a Glance" summary + a single "View Full
  Report" toggle. The Prepared/Reviewed/Endorsed/Noted By block was made
  always-visible (un-collapsed).
- **2026-09-07** — a submitted bundle's `AppraisalReportView` now renders
  **inline** in `AssignedAppraiserCard` on the Officer's Appraisal page
  (was a "View Report" `Dialog`); see `docs/110-appraisal.md`.
- **Docs/nav reorg** — this workspace's doc was renumbered to `170` and
  its nav label settled under the "Request" dropdown.
