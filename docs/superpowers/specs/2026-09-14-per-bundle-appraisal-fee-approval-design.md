# Per-Bundle Appraisal Fee Approval — Design

## What this is

Today, `Appraisal.feeApprovalStatus` is **batch-level**: one status for
the whole application's `reportBundles: AppraisalReportBundle[]` array.
An application with 3 pledged properties assigned to 2 different
appraisers in 2 separate bundles still has exactly **one** fee-approval
decision — submit, approve, or decline all bundles together. The Fee
Approvals list (`fee-approvals-view.tsx`) reflects this: **one combined
Appraisal Fee row**, its Amount summing every `feeNeeded === 'yes'`
bundle.

This changes that to **one fee-approval decision per bundle** (per
appraiser assignment / per request) — the Fee Approvals list shows one
row per bundle needing a decision, and each is approved or declined
independently of the others. A request assigned to Appraiser A can be
approved while a request assigned to Appraiser B on the same application
is still pending, or gets declined.

## Data model

Move the fee-approval fields from `Appraisal` down onto
`AppraisalReportBundle` itself:

```ts
export type AppraisalReportBundle = {
  id: string;
  tctGroupIds: string[];
  appraiserType: AppraiserType | null;
  appraiserName: string | null;
  targetCompletionDate: string | null;
  feeNeeded: FeeNeeded;
  feeAmount: string;
  feeDescription: string;
  feeRemarks: string;
  // Moved down from Appraisal (was batch-level) — one decision per bundle.
  feeApprovalStatus: FeeApprovalStatus;
  feeDeclineReason: string;
  feeSubmittedAt: string | null;
  feeApprovedAt: string | null;
  report: AppraisalReport;
};
```

`Appraisal` loses `feeApprovalStatus`, `feeDeclineReason`,
`feeSubmittedAt`, `feeApprovedAt`. **`feePayment: PaymentDetails` also
moves down onto the bundle** (see "Payment page" below) — a payment
record only makes sense once a specific bundle's fee is approved, and
the existing `docs/210-request-payments.md` design already pays "one
fee request" at a time in spirit, just not in code yet.

A `feeNeeded: 'no'` bundle still gets these fields (defaulting to
`'not-submitted'`) but is **excluded from the Fee Approvals list
entirely** — there's nothing to approve when no fee applies. This
matches every existing `feeBundles = reportBundles.filter(b =>
b.feeNeeded === 'yes')` convention already used everywhere fee totals
are computed (fee-approvals-view.tsx, payment-view.tsx,
appraisal-appraiser-view.tsx, etc.) — a `'no'` bundle was never counted
toward a fee total and won't be counted toward an approval row either.

## Context methods (`admin-context.tsx`)

Replace the 4 batch-level methods with bundle-scoped equivalents,
following `setAppraisalBundleFee(bundleId, data)`'s existing merge-by-id
pattern:

```ts
submitAppraisalBundleFeeForApproval: (bundleId: string) => void;
approveAppraisalBundleFee: (bundleId: string) => void;
declineAppraisalBundleFee: (bundleId: string, reason: string) => void;
```

Each maps over `reportBundles`, updating only the matching bundle's own
`feeApprovalStatus`/`feeDeclineReason`/`feeSubmittedAt`/`feeApprovedAt`
(and clearing that bundle's own `feePayment` on decline) — every other
bundle is untouched, same as `setAppraisalBundleFee` already does.
Declining does **not** touch that bundle's own
`feeNeeded`/`feeAmount`/`feeDescription`/`feeRemarks` — same convention
the current batch-level decline already follows (per
`docs/170-request-appraiser.md`), just scoped to one bundle now.

`resetAppraisalFees()` (the dev-only "Simulate: Reset" action) becomes
`resetAppraisalBundleFees(bundleId: string)` — blanks one bundle's fee
decision back to undecided, rather than every bundle at once. The Fee
Approvals list's own auto-seed effect (which currently creates one
bundle with a ready-made fee decision and submits it) needs no
conceptual change — it already operates on one bundle.

`markAppraisalFeeAsPaid` / `setAppraisalFeePayment` become bundle-scoped
the same way (`(bundleId, data)`), operating on `bundle.feePayment`
instead of `Appraisal.feePayment`.

## Fee Approvals list (`fee-approvals-view.tsx`)

The Appraisal Fee "one combined row" becomes **one row per bundle with
`feeNeeded === 'yes'` and `feeApprovalStatus !== 'not-submitted'`** (same
"always show once submitted" convention the rest of this app's list
pages use — a bundle whose fee hasn't been proposed/submitted yet has
nothing to show here, same as today's `'not-submitted'` batch state
showing nothing). Each row's Details column drops the "+N more"
aggregation (no longer needed — a row is already one specific bundle)
and instead shows that bundle's own appraisal number + property count +
appraiser name. Amount shows that one bundle's own `feeAmount`. Status
shows that one bundle's own `FeeApprovalStatus`.

Clicking a row navigates to a **bundle-scoped detail route** —
`paths.admin.feeApprovalsDetail('appraisal-fee', bundleId)` (adding a
second segment; `ci-fee` keeps no bundle id, since CI Fee has no bundle
concept at all).

## Detail page (`appraisal-fee-approval-bundle-view.tsx`)

Currently reads `review.appraisal` directly with no bundle lookup at
all — the whole page assumes "the one live request." It becomes a
bundle lookup, mirroring how `appraisal-appraiser-bundle-view.tsx`
already looks up one bundle by id: find the bundle by `bundleId`, show
"Request not found" if it doesn't exist (in addition to the existing
`!signUpData` not-found state). Approve/Decline call the new
`approveAppraisalBundleFee(bundleId)` / `declineAppraisalBundleFee(bundleId,
reason)` instead of the batch versions. Everything else on the page
(header card, FactChip strip, "View Appraisal Documents" button, Fee
Details card) narrows from "every bundle in the request" to "this one
bundle" — simpler than today, not more complex, since there's no longer
a multi-bundle list to render inside the page.

## Appraiser workspace (`appraisal-appraiser-bundle-view.tsx`)

Per the research: this page already operates in a single-bundle context
for almost every conditional (`feeSettled`, `feeEditable`, status pill
logic, submit gate) — it just currently reads the *batch* field where it
should read *this bundle's own* field. This is a **mechanical swap**
(`feeApprovalStatus` → `bundle.feeApprovalStatus`, etc.) at each of the
call sites the research identified, **except one**: today's `canSubmit`
requires **every** bundle in the whole application to have a fee
decision before *any* of them can be submitted for approval. That
whole-application gate is removed — a bundle submits for approval on its
own once its own fee decision is filled in, independent of any sibling
bundle's state.

## Appraiser list (`appraisal-appraiser-view.tsx`) + `getAppraisalBundleStatus`

`getAppraisalBundleStatus(bundle, feeApprovalStatus, feeSettled)`
(`appraisal-bundle-status.ts`) already takes `feeApprovalStatus`
positionally per bundle in a `.map()` — every call site (this file,
`appraisal-request-view.tsx`, `assigned-appraiser-card.tsx`) swaps in
`bundle.feeApprovalStatus` in place of the shared batch value. No
signature change needed.

## Payment page (`payment-view.tsx` / `payment-detail-view.tsx`)

Per `docs/210-request-payments.md`, Payment already documents Appraisal
Fee as "one row per batch, not per bundle" — this was written to match
the old batch model and is now stale by construction once approval is
per-bundle. **Payment becomes per-bundle too**: one Payment row per
`feeApprovalStatus === 'approved'` bundle (same "approved and unpaid"
gating Payment already uses, just scoped to a bundle instead of the
whole application), each with its own `feePayment` record and its own
"Mark as Paid" action. This is the natural consequence of moving
`feePayment` onto the bundle above — Payment was already going to break
otherwise (an approved bundle's payment can't sensibly live on a
batch-level field once two sibling bundles can be at different approval
states). `paths.admin.paymentDetail('appraisal-fee', bundleId)` gains
the same second segment `feeApprovalsDetail` does.

## Explicit design decision: "Advise Client" / "Payment Received" stay whole-batch

`clientNotifiedAt` / `sentToOdooAt` / `paymentReceivedAt` (the simulated
Sendit/Odoo client-advisory step) **stay on `Appraisal`, not the
bundle** — per the research, these fields have "no natural per-bundle
framing" today, and nothing in this request asks for that workflow to
change. This is a deliberate scope boundary, not an oversight: the
client is advised once per application regardless of how many separate
appraiser assignments/fees it has, so this step stays exactly as it is.
Only the fee **approval** and its **payment** become per-bundle.

## Non-goals

- No change to Call Report Approval, CI Fee Approval, or the Appraisal
  Head/Report Approval flow (`report-approvals-view.tsx` — confirmed by
  research to have no fee-approval-status branching at all, out of
  scope except for its incidental seed-data shape, which needs no
  change since it already creates one bundle at a time).
- No change to the client-advisory step (`clientNotifiedAt`/
  `sentToOdooAt`/`paymentReceivedAt`) — stays whole-application, see
  above.
- No change to how a bundle's fee is originally proposed (Assign
  Appraiser modal) — only submission/approval/decline/payment become
  per-bundle.

## Open items

- **Route shape for a bundle-scoped detail page**: this spec assumes
  `paths.admin.feeApprovalsDetail('appraisal-fee', bundleId)` /
  `paths.admin.paymentDetail('appraisal-fee', bundleId)`, adding a
  second path segment only for the `'appraisal-fee'` kind (CI Fee has no
  bundle concept and keeps its current no-id route). Exact helper
  signature (e.g. optional second param vs a separate overload) is an
  implementation-plan detail, not a design question.
