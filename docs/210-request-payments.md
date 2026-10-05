# Admin — Payment

> **Maintenance rule:** update this file whenever `payment-view.tsx`,
> `payment-detail-view.tsx`, the `PaymentDetails`/`PaymentMethod`/
> `PAYMENT_METHOD_OPTIONS`/`DEPOSITED_TO_ROSTER`/`createEmptyPaymentDetails`
> shapes in `admin-context.tsx`, or the `ciFeeApprovedAt`/`ciFeePayment`/
> per-bundle `feePayment` fields change. Companion to
> `docs/100-credit-investigation.md` (CI Fee), `docs/170-request-appraiser.md`
> (Appraisal Fee) — these pages read both flows' approved-fee state but own
> no fee-decision fields themselves — `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`
> (the design doc that moved Appraisal Fee's payment down onto each bundle,
> described below), and `docs/225-admin-design-system.md` (the admin
> design system — the payment-detail form follows §8 form patterns;
> `ReportFileDropzone` is a §6 "pending component extraction" pattern; the
> table follows the §6 recipe).

## What this is

A dedicated admin nav page, nav label **"Payment Verification"**
(`src/sections/admin/payment-view.tsx`, rendered at `/admin/payment`,
nested last under the same **"Request"** nav dropdown as Fee Approvals /
Report Approvals / Appraiser / Appraisal - Request). It's a
single unified queue of every **approved** fee
request — CI Fee and Appraisal Fee alike — so an officer records how a
fee was actually paid/deposited without checking two different screens.

This closes a real gap: neither fee flow had any concept of an
officer-entered payment record before this page existed. CI Fee only ever
reached `'approved'` with no state past it. Appraisal Fee has
`paymentReceivedAt` — a **different** concept: a simulated timestamp for
the *client* having paid the appraisal fee via Sendit
(`AppraisalAppraiserView`'s "Advise Client" / "Payment Received" flow),
not an internal record of how the LMS itself processed/deposited that
payment (method, which account, OR number, proof of deposit). This page
adds that internal record, for both fee types, without touching
`paymentReceivedAt` at all.

## Row source

At most one CI Fee row, and up to one Appraisal Fee row **per bundle**,
ever exist in a live session (no real multi-application backend):

- **CI Fee row** — whenever `review.creditInvestigation.ciFeeStatus ===
  'approved'`. Still one flat row — CI Fee has no bundle concept.
- **Appraisal Fee row** — **one per `AppraisalReportBundle`** whose own
  `feeNeeded === 'yes'` and `feeApprovalStatus === 'approved'`. Fee
  approval moved from a single whole-application batch status down onto
  each bundle (see
  `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`),
  so Payment follows the same shape: two bundles on the same application
  can each be paid independently, on their own schedule. A `feeNeeded !==
  'yes'` bundle, or one whose own fee isn't yet approved, never gets a
  row.

Each Appraisal Fee row's Amount is that one bundle's own `feeAmount` —
not a sum across bundles, since paying is now a per-bundle action too
(one payment method, one OR number, one attachment, per bundle).

## Columns and sort

Type (CI Fee / Appraisal Fee — plain text, a category label, not a
colored status pill), Applicant, Amount (`fCurrency`), Approved On
(`ciFeeApprovedAt` or `feeApprovedAt`), Status (**"For Payment"** while
`paidAt` is null, **"Paid"** once set — `StatusBadge`, warning/success
tone), trailing chevron.

**Rows are never hidden once paid.** Sorted unpaid-first — paid rows sink
to the bottom of the same table, an explicit design decision (not the
"settled rows disappear entirely" pattern some other list pages use), so
there's always a visible record of what was already paid without leaving
this page. Plain `.sort((a, b) => Number(!!a.payment.paidAt) -
Number(!!b.payment.paidAt))`.

Empty state: "No fee requests are ready for payment yet."

## Payment detail page

Clicking a row navigates to a real detail page —
`paths.admin.paymentDetail(kind, bundleId?)` → `/admin/payment/{kind}`
or `/admin/payment/appraisal-fee/{bundleId}`
(`payment-detail-view.tsx`, `PaymentDetailView({ kind, bundleId })`) —
same list → detail split every other fee flow in this app already uses
(`fee-approvals-view.tsx` → `ci-fee-approval-bundle-view.tsx` /
`appraisal-fee-approval-bundle-view.tsx`, see
`docs/155-request-fee-approvals.md`). An earlier version of this page
used a `Dialog` opened from the list
instead; that was replaced with this full page so the complete CI Fee /
Appraisal Fee request details render alongside the payment form on one
page, matching how every other approval flow in this app shows its
request, instead of a compact popup.

`kind` (`'ci-fee' | 'appraisal-fee'`) is a **real discriminator**. CI Fee
needs no id (one flat request); Appraisal Fee now requires a real
`bundleId` (the actual `AppraisalReportBundle.id`, not an opaque
placeholder like the old fixed `"current"` segment), since payment is
per-bundle. The underlying route is an optional catch-all
(`[kind]/[[...bundleId]]/page.tsx`, shared with Fee Approvals' own route
shape — see `docs/155-request-fee-approvals.md`), falling back to
`'ci-fee'` for an unrecognized `kind` value (a stray URL, not something
the UI itself ever produces).

**Layout**, top to bottom:

1. **"Back to Payment"** link.
2. **One combined header/details card** — same standard summary-card
   shape as the CI Fee / Appraisal Fee Approval detail pages: 42px
   icon-avatar + applicant name as the title (15px/800) + "App No. … ·
   email" subtitle, a `StatusBadge` top-right (**"For Payment"** /
   **"Paid"**), then a bordered/tinted `FactChip` strip (Type, Amount,
   Requested By, Requested On, Approved On) — a local copy of the same unexported `FactChip` shape
   those two reference pages already reimplement, kept in sync manually
   rather than sharing a module, same as every other admin file with this
   exact component. Below a `Divider`, the same card continues straight
   into the full breakdown content: CI Fee shows one row
   (`ciFeeAmountDescription` + `ciFeeRemarks` + `ciFeeAmount`); Appraisal
   Fee shows **this one bundle's own** row (TCT numbers, appraiser name —
   bold navy, same emphasis convention as the Approval detail page — fee
   description/amount) — no loop over multiple bundles and no running
   total, since payment is per-bundle now (see
   `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`).
   This content is read-only — there is no Approve/Decline here, the fee
   is already approved by the time it reaches Payment; it exists purely
   so the officer sees full request context without navigating back to
   the approval flow's own detail page.
3. **"Payment Details" card** — the actual form. Follows the
   `docs/225-admin-design-system.md` §8 form conventions: label above each
   field, a native `type="date"` for OR Date, and a **disabled "Mark as
   Paid" button** as the only validation (no inline error text).
   - **Payment Method** — `Select`, `PAYMENT_METHOD_OPTIONS` (Cash /
     Check / Bank Transfer / GCash / E-wallet —
     `src/auth/admin-context.tsx`).
   - **Deposited To** — `Select`, `DEPOSITED_TO_ROSTER` (a fixed sample
     roster — "BDO - Main Account" / "BPI - Main Account" / "Petty Cash" —
     same convention as `APPRAISER_ROSTER`; no real bank/accounting
     integration in this prototype).
   - **Official Receipt No.** — `TextField`.
   - **OR Date** — plain `type="date"` field.
   - **Payment Attachment** — a local `ReportFileDropzone` (same
     click/drag-to-upload convention as the Appraisal Report form's
     Collateral Photo upload — a `FileThumbnail` + filename once set, a
     close `IconButton` to clear it; accepts images + PDF). Not shared
     with `appraiser-assignment-card.tsx`'s own dropzone of the same
     name — this is the `docs/225-admin-design-system.md` §6 "file upload
     — pending component extraction" pattern: a local per-file component,
     not one shared module (see `credit-investigation-view.tsx` and
     `initial-credit-checking-view.tsx` for the same repeated pattern).
   - **Remarks** — multiline `TextField`, optional.
   - **"Mark as Paid"** button — **all fields required except Remarks**;
     stays disabled until Payment Method, Deposited To, OR No., OR Date,
     and the attachment are all filled in.

Clicking it calls `setCiFeePayment(data)` /
`setAppraisalBundleFeePayment(bundleId, data)` with every field, then
`markCiFeeAsPaid()` / `markAppraisalBundleFeeAsPaid(bundleId)` in the
same click — there is no separate "save draft" phase the way the fee
request flows have a `'not-submitted'` draft state; filling in the form
and marking paid is one step.

**Once paid, the Payment Details card renders every field read-only**,
plus a green "Marked as paid — {timestamp}" confirmation banner above the
fields — no "Mark as Paid" button, no way to edit or un-pay from this
page. There is no revise/undo step here, matching every other terminal
action in this app (e.g. a submitted Appraisal Report). Reloading or
re-navigating to the same `/admin/payment/{kind}` URL always shows this
same persisted state, sourced from `ciFeePayment`/`feePayment` in
`AdminContext`, same as every other page in this app.

## Requested By / Requested On

Both fee types are requested by whichever officer owns the application —
there's no separate "requested by" field on either `CreditInvestigation`
or `Appraisal`; **Requested By** reads `application.assignedOfficer`
directly (`useRegistration()`), the same field already shown as
"Officer: …" on `application-details-card.tsx` and
`application-review-header.tsx`.

**Requested On** reads `ciFeeSubmittedAt` (CI Fee) or `feeSubmittedAt`
(Appraisal Fee — pre-existing). `ciFeeSubmittedAt` is new, added
alongside these two chips since CI Fee had no request timestamp at all
before this — stamped the moment `ciFeeStatus` becomes
`'pending-approval'`, at all four places that happens:
`ci-fee-card.tsx`'s real "Request CI Fee" action (the only officer-driven
one), `credit-investigation-view.tsx`'s "Fill with Sample Data" (which
skips straight to `'approved'`, so it stamps both
`ciFeeSubmittedAt`/`ciFeeApprovedAt` at once) and its inline "Simulate:
Another Officer Approves CI Fee" page action, `fee-approvals-view.tsx`'s
CI Fee auto-seed effect, and `ci-fee-approval-bundle-view.tsx`'s decline path
(which immediately re-submits a fresh request — see
`docs/150-request-credit-investigation-fee-approval.md`). Cleared back to `null` everywhere
`ciFeeApprovedAt` is also cleared (`handleClearSampleData`,
`confirmDeclineCiFee`) — a request that's been wiped or declined-to-
`'not-requested'` has no "requested on" date to show until it's
requested again.

## Data model

```ts
export type PaymentMethod = 'cash' | 'check' | 'bank-transfer' | 'gcash';

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[];
export const DEPOSITED_TO_ROSTER: string[]; // ['BDO - Main Account', 'BPI - Main Account', 'Petty Cash']

export type PaymentDetails = {
  paymentMethod: PaymentMethod | null;
  depositedTo: string | null;
  orNumber: string;
  orDate: string;
  attachmentFileName: string | null;
  attachmentFileUrl: string | null;
  remarks: string;
  paidAt: string | null; // stamped by "Mark as Paid"; null = still pending
};

export function createEmptyPaymentDetails(): PaymentDetails;
```

- `CreditInvestigation.ciFeePayment: PaymentDetails` — plus two fields:
  `ciFeeSubmittedAt: string | null` (see "Requested By / Requested On"
  above) and `ciFeeApprovedAt: string | null`, stamped the moment
  `ciFeeStatus` becomes `'approved'`. Stamped at all three places
  `ciFeeStatus: 'approved'` is set: `credit-investigation-view.tsx`'s
  "Fill with Sample Data" and its inline "Simulate: Another Officer
  Approves CI Fee" page action, and `ci-fee-approval-bundle-view.tsx`'s
  real approve action.
- `AppraisalReportBundle.feePayment: PaymentDetails` — one record **per
  bundle**, not one for the whole application (moved down from
  `Appraisal.feePayment` alongside the rest of the per-bundle
  fee-approval restructure — see
  `docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md`).
- Both factory-initialized via `createEmptyPaymentDetails()`, same
  convention as every other nested object in `createInitialReview()`/
  the bundle factory.
- `AdminContext` actions: `setCiFeePayment(data)`, `markCiFeeAsPaid()`,
  `setAppraisalBundleFeePayment(bundleId, data)`,
  `markAppraisalBundleFeeAsPaid(bundleId)`.
- **Declining or resetting a fee clears its payment record and approved
  timestamp back to empty/null** — `declineAppraisalBundleFee(bundleId,
  reason)` and `resetAppraisalBundleFees(bundleId)` both reset that one
  bundle's own `feePayment`; CI Fee's two decline call sites
  (`credit-investigation-view.tsx`'s inline decline,
  `ci-fee-approval-bundle-view.tsx`'s decline) and its "Remove Sample
  Data" clear (`handleClearSampleData`) all reset `ciFeeApprovedAt` and
  `ciFeePayment` the same way — a declined-then-resubmitted-then-
  reapproved request needs a fresh payment record, not one carried over
  from a request that was declined.

## Decision Gate

No approve/decline here — the fee is already approved by the time it
reaches Payment. The only action is **"Mark as Paid"** (gated on Payment
Method, Deposited To, OR No., OR Date, and the attachment — Remarks
optional), which calls `setCiFeePayment` /
`setAppraisalBundleFeePayment(bundleId, ...)` then `markCiFeeAsPaid()` /
`markAppraisalBundleFeeAsPaid(bundleId)` in one click. Once paid, every
field is read-only with no revise/undo, matching every other terminal
action in this app.

## Fabricated Claims — Real vs. Simulated

- **No real payment gateway or accounting-system integration** —
  everything is a locally-stored simulated record.
- **Deposited To** is a fixed sample roster (`DEPOSITED_TO_ROSTER`), no
  real bank/accounting link.
- **`kind`/`bundleId` are real discriminators** — CI Fee has no id (one
  flat request); Appraisal Fee's `bundleId` is the real
  `AppraisalReportBundle.id`, not an opaque placeholder.
- All state lives in `ciFeePayment` (CreditInvestigation) /
  `feePayment` (per bundle, on `AppraisalReportBundle`) in `AdminContext`
  (`localStorage`).

## Non-Goals / Open Items

- No partial payments / installments — a request is either unpaid or
  paid in full, one action.
- Does not touch `Appraisal.paymentReceivedAt` (the client-paid-the-
  appraiser-fee-via-Sendit timestamp) — a separate concept this page
  doesn't read or write.
- Does not add a "Payment" step to the main application pipeline
  (`ReviewStep`) — like the other four "Request" screens, this is a
  role/queue screen, not a pipeline step.
- **Known pre-existing issue (not introduced by this feature):**
  `credit-investigation-view.tsx`'s `useRegisterPageActions` array
  registers **two** entries with the same `key: 'sample-data'`, so React
  logs a duplicate-key warning. Pre-dates this feature and is out of
  scope for it — see `docs/100-credit-investigation.md` for that page's
  own maintenance.
