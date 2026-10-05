# Fee Approvals — Merge Design

## What this is

Today, "Credit Investigation - Fee Approval" and "Appraisal - Fee
Approval" are two separate sibling entries in the admin **"Request"**
nav dropdown (`src/layouts/admin/config-nav-admin.tsx`'s `approvalItems`),
each its own list→detail pair:

- `ci-fee-approval-view.tsx` (list, `/admin/ci-fee-approval`) →
  `ci-fee-approval-bundle-view.tsx` (detail, `/admin/ci-fee-approval/current`)
- `appraisal-fee-approval-view.tsx` (list, `/admin/appraisal-fee-approval`) →
  `appraisal-fee-approval-bundle-view.tsx` (detail,
  `/admin/appraisal-fee-approval/current`)

Both list pages already carry the page title **"Fee Approvals"** — they
were clearly designed as two halves of one concept that never got merged
into one screen. This feature merges the two **list** pages into one
combined table under a single nav entry, "Fee Approvals," while leaving
both **detail** pages (the actual Approve/Decline screens) completely
untouched.

This mirrors a pattern already shipped in this app: `payment-view.tsx`
merges the same two fee concepts (CI Fee, Appraisal Fee) into one table
with a `kind`-discriminated row and per-kind detail routing
(`paths.admin.paymentDetail(kind)`). This feature applies that same
shape to the Fee *Approval* flow, not the Fee *Payment* flow.

## Nav

`src/layouts/admin/config-nav-admin.tsx`, `approvalItems`:

- **Remove** `{ title: 'Credit Investigation - Fee Approval', path: paths.admin.ciFeeApproval }`
- **Remove** `{ title: 'Appraisal - Fee Approval', path: paths.admin.appraisalFeeApproval }`
- **Add**, in the first removed entry's position (so the dropdown's
  overall ordering relative to "Call Report - Report Approval" /
  "Appraiser" / "Appraisal - Request" / "Appraisal - Report Approval" /
  "Payment Verification" stays otherwise unchanged): `{ title: 'Fee
  Approvals', path: paths.admin.feeApprovals }`

## Routes

`src/routes/paths.ts` — remove 4, add 2 (same naming convention as the
existing `payment` / `paymentDetail` pair):

```ts
// Remove:
ciFeeApproval: '/admin/ci-fee-approval',
ciFeeApprovalBundle: () => '/admin/ci-fee-approval/current',
appraisalFeeApproval: '/admin/appraisal-fee-approval',
appraisalFeeApprovalBundle: () => '/admin/appraisal-fee-approval/current',

// Add:
feeApprovals: '/admin/fee-approvals',
feeApprovalsDetail: (kind: 'ci-fee' | 'appraisal-fee') => `/admin/fee-approvals/${kind}`,
```

Confirmed by full-codebase search: no screen outside the fee-approval
feature itself and `config-nav-admin.tsx` references any of the four
removed helpers or their literal path strings — both fee flows'
"Simulate: Another Officer Approves ..." dev actions mutate
`admin-context` state directly and never touch routing. Removing them is
safe.

## Pages

### List: `/admin/fee-approvals` → new `src/sections/admin/fee-approvals-view.tsx`

Replaces `ci-fee-approval-view.tsx` and `appraisal-fee-approval-view.tsx`
(both deleted, along with their `src/app/admin/{ci-fee-approval,appraisal-fee-approval}/page.tsx`
route files). One page, one table, two row kinds.

**Row source — one row per fee kind, always shown whenever a live
application exists** (this is the one behavior both source pages already
share and this merge must preserve exactly, not re-gate by status): a CI
Fee row and an Appraisal Fee row both render unconditionally once
`hasApplication` is true, regardless of `ciFeeStatus` /
`feeApprovalStatus` — same convention `application-list-view.tsx`'s live
row already uses. Only the row's `StatusBadge` tone/label and the detail
page's available actions vary by status. (An earlier version of each
source page gated its row behind `'pending-approval'`, which made the row
vanish after a decision; both were explicitly changed away from that.
The merge does not reintroduce it.)

Since this prototype has no real multi-application backend, this list
only ever has at most 2 real rows (one CI Fee, one Appraisal Fee) in a
live session — same ceiling as every other list page here.

**Row type:**

```ts
type FeeApprovalRow =
  | {
      kind: 'ci-fee';
      applicant: string;
      appNo: string;
      description: string;
      amount: number;
      status: CiFeeStatus;
    }
  | {
      kind: 'appraisal-fee';
      applicant: string;
      appNo: string;
      appraisalNumberDisplay: string; // firstBundle number + "+N more"
      appraiserDisplay: string; // dedup'd appraiser name(s) + "+N more"
      propertyCount: number;
      amount: number;
      status: FeeApprovalStatus;
    };
```

**Columns (one shared table, `tableLayout: fixed`):**

| Column | CI Fee row | Appraisal Fee row |
| --- | --- | --- |
| Applicant | name + "App No. {n}" | name + "App No. {n}" |
| Type | `StatusBadge`-style plain pill, "CI Fee" | "Appraisal Fee" |
| Details | `description` (or `—`) | `"{appraisalNumberDisplay} · {propertyCount} propert{y/ies} · {appraiserDisplay}"` |
| Amount | `fCurrency(ciFeeAmount)` | `fCurrency(totalFeeAmount)` (sum of `feeNeeded === 'yes'` bundles) |
| Status | `CI_FEE_ROW_STATUS_COPY[ciFeeStatus]` | `APPRAISAL_FEE_ROW_STATUS_COPY[feeApprovalStatus]` |
| — | chevron | chevron |

"Type" is a plain-text-style pill (not a semantic tone — it's a category,
not a status), same distinction `payment-view.tsx`'s own "Type" column
already makes. Both source pages' own per-status `StatusBadge` copy/tone
maps (`CI_FEE_ROW_STATUS_COPY`, `APPRAISAL_FEE_ROW_STATUS_COPY`) carry
over unchanged into the new file.

The "Details" column is the one place this design intentionally
**folds** two different field sets into one string rather than adding
two more table columns for a two-row table — CI Fee's single
`description` string and Appraisal Fee's number/property-count/appraiser
triplet don't share a column shape, and a table that's almost always
exactly 2 rows doesn't need 3 extra columns that are `—` half the time.

**Row click** → `router.push(paths.admin.feeApprovalsDetail(row.kind))`.

**Header / empty state:** same shell both source pages already use
(`Container maxWidth="lg"`, page title, subtitle, empty-state card when
`!signUpData`) — but the subtitle and the role eyebrow label need to
merge two different single-purpose lines into one:

- Old CI subtitle: "Credit Investigation fee requests from the officer,
  past and present." / eyebrow: "CI HEAD / APPROVER"
- Old Appraisal subtitle: "Appraisal fee requests from the officer, past
  and present." / eyebrow: "APPRAISAL FEE APPROVER"
- **New:** subtitle "Credit Investigation and Appraisal fee requests from
  the officer, past and present." No single role eyebrow fits both roles
  at once — **drop the eyebrow line entirely** rather than showing a
  misleading single-role label on a page now serving two different
  approver roles. (Flagged as an open item below in case a different
  resolution is preferred.)

**Auto-seed-on-hydrate:** both source pages carry real, non-trivial
per-kind seeding logic (CI Fee: seed a `pending-approval` request with a
fixed sample amount/description when `not-requested`/`not-applicable`;
Appraisal Fee: create a sample bundle + submit for approval when no
bundles exist, or re-populate+resubmit on `declined`/`not-submitted`).
**Both effects are preserved verbatim**, just running in the same
component instead of two separate ones — this is not simplified or
merged into one generic effect, since the two seeding rules are
genuinely different (CI Fee has no bundle concept; Appraisal Fee does).
`loadSample(SAMPLE_APPLICATION)` only needs to run once if
`!hasApplication`, guarded the same way the CI Fee effect already guards
it (`didSeedApplication` ref) so it doesn't fire twice.

**Dev simulate actions:** the Appraisal Fee list's
`'simulate-reset-appraisal-fees'` page action (`useRegisterPageActions`)
carries over unchanged. CI Fee's list currently has no equivalent
simulate action of its own (its "Simulate: Another Officer Approves CI
Fee" action lives on `credit-investigation-view.tsx`, not on the fee
list) — nothing to carry over there.

### Detail: `/admin/fee-approvals/[kind]` → new `src/app/admin/fee-approvals/[kind]/page.tsx`

Thin switch, no new logic:

```tsx
export default function Page({ params }: { params: { kind: string } }) {
  if (params.kind === 'appraisal-fee') return <AppraisalFeeApprovalBundleView />;
  return <CiFeeApprovalBundleView />;
}
```

`ci-fee-approval-bundle-view.tsx` and `appraisal-fee-approval-bundle-view.tsx`
(the actual Approve/Decline screens, StatusBadge/FactChip header cards,
fee breakdown, etc.) are **not modified** except for their two
"Back to Fee Approvals" links each (in the not-found state and the
normal-state header), which are repointed from
`paths.admin.ciFeeApproval` / `paths.admin.appraisalFeeApproval` to the
new `paths.admin.feeApprovals`.

The old `src/app/admin/ci-fee-approval/[bundleId]/page.tsx` and
`src/app/admin/appraisal-fee-approval/[bundleId]/page.tsx` wrapper route
files are deleted — the new `[kind]` route is the only detail entry
point. (Their fixed-`/current`-segment convention is preserved in spirit:
the new route's dynamic segment is `kind`, a real two-value discriminator,
not a placeholder — matching `payment-detail-view.tsx`'s own
`paths.admin.paymentDetail(kind)` convention rather than the older
`/current` placeholder pattern.)

## Files touched

**New:**
- `src/sections/admin/fee-approvals-view.tsx`
- `src/app/admin/fee-approvals/page.tsx`
- `src/app/admin/fee-approvals/[kind]/page.tsx`

**Deleted:**
- `src/sections/admin/ci-fee-approval-view.tsx`
- `src/sections/admin/appraisal-fee-approval-view.tsx`
- `src/app/admin/ci-fee-approval/page.tsx`
- `src/app/admin/ci-fee-approval/[bundleId]/page.tsx`
- `src/app/admin/appraisal-fee-approval/page.tsx`
- `src/app/admin/appraisal-fee-approval/[bundleId]/page.tsx`

**Modified:**
- `src/routes/paths.ts` (4 helpers removed, 2 added)
- `src/layouts/admin/config-nav-admin.tsx` (2 nav entries → 1)
- `src/sections/admin/ci-fee-approval-bundle-view.tsx` (2 back-link hrefs
  repointed)
- `src/sections/admin/appraisal-fee-approval-bundle-view.tsx` (2
  back-link hrefs repointed)

**Unchanged:** every actual approval/decline action, state field, and
seeding rule on both fee flows; `admin-context.tsx` is not touched at
all — this is purely a list-page/routing/nav merge.

## Docs

- `docs/150-request-credit-investigation-fee-approval.md` and
  `docs/190-request-appraisal-fee-approval.md` — each currently documents
  both its list AND detail page as one flow. Split: the list-page section
  of each moves into one new merged doc (numbered to sit near where
  `docs/210-request-payments.md` already documents the analogous merged
  Payment list, e.g. `docs/195-request-fee-approvals.md` — exact number
  TBD against current doc numbering at implementation time); each
  original doc keeps its detail-page section (Approve/Decline screen,
  unchanged) and gets a short redirect note pointing at the new merged
  list doc for "how you get here."
- `docs/230-project-overview.md` — update if it enumerates the "Request"
  dropdown's nav items by name.

## Non-goals

- No change to CI Fee or Appraisal Fee approval/decline logic, state
  shape, or the two detail pages' content — only how an officer navigates
  to them.
- No change to `payment-view.tsx` / the Payment flow — a separate,
  already-shipped merge of the same two concepts for a different purpose
  (paying an approved fee, not approving it).
- Does not attempt a real multi-application queue — this prototype has no
  backend for one; the merge preserves the existing "at most one row per
  kind, always visible" ceiling both source pages already have.

## Open items

- **Role eyebrow label removed, not merged** — "CI Head / Approver" and
  "Appraisal Fee Approver" don't collapse into one honest single-role
  label. Default: drop the eyebrow line. If a specific replacement label
  is wanted instead (e.g. a generic "FEE APPROVER"), that's a one-line
  change once specified.
- **Exact doc number for the new merged list doc** — pick the next free
  slot near `docs/190-...`/`docs/210-...` at implementation time rather
  than guessing one that might collide with another doc added since this
  spec was written.
