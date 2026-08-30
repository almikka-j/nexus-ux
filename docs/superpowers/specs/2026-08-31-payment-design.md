# Payment — Design

## What this is

A new admin nav page, **"Payment"**, nested under the same **"Request"**
dropdown as CI Fee Approval / Appraiser / Appraisal - Request / Appraisal -
Approver Fee / Appraisal - Approver Report
(`src/layouts/admin/config-nav-admin.tsx`). It is a single unified table of
every fee request that has been **approved** — whether it's a CI Fee
(`review.creditInvestigation.ciFeeStatus === 'approved'`) or an Appraisal
Fee batch (`review.appraisal.feeApprovalStatus === 'approved'`) — so an
officer never has to check two different screens to see what still needs
to be paid out. Clicking a row opens a modal to record how the payment was
made and mark it paid.

This closes a real gap: neither fee flow has any concept of an
officer-entered payment record today. CI Fee has no state past `'approved'`
at all. Appraisal Fee has `paymentReceivedAt` — but that's a different
thing: a simulated timestamp for the *client* having paid the appraisal fee
via Sendit (`AppraisalAppraiserView`'s "Advise Client" / "Payment Received"
flow), not an internal record of how the LMS itself processed/deposited
that payment (method, which account, OR number, proof of deposit). This
feature adds that internal record, for both CI Fee and Appraisal Fee.

## Data model

Two new fields, one on each existing fee-bearing type, both reusing one
shared shape:

```ts
export type PaymentMethod = 'cash' | 'check' | 'bank-transfer' | 'gcash';

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash / E-wallet' },
];

// Fixed sample roster, same convention as APPRAISER_ROSTER — no real
// bank/accounting integration in this prototype.
export const DEPOSITED_TO_ROSTER = [
  'BDO - Main Account',
  'BPI - Main Account',
  'Petty Cash',
];

export type PaymentDetails = {
  paymentMethod: PaymentMethod | null;
  depositedTo: string | null;
  orNumber: string;
  orDate: string; // yyyy-mm-dd, plain date input
  attachmentFileName: string | null;
  attachmentFileUrl: string | null; // blob: URL, same convention as every other upload in this app
  remarks: string;
  paidAt: string | null; // stamped by "Mark as Paid"; null = still pending
};

function createEmptyPaymentDetails(): PaymentDetails {
  return {
    paymentMethod: null,
    depositedTo: null,
    orNumber: '',
    orDate: '',
    attachmentFileName: null,
    attachmentFileUrl: null,
    remarks: '',
    paidAt: null,
  };
}
```

- `CreditInvestigation` gains `ciFeePayment: PaymentDetails`.
- `Appraisal` gains `feePayment: PaymentDetails` — **one record for the
  whole fee batch**, not per bundle. Appraisal Fee is proposed per bundle
  but submitted/approved as a single batch (see `docs/ADMIN_APPRAISAL.md`
  "Appraisal Fee"); paying it is likewise one action, one OR number, one
  attachment, matching how it's actually approved.
- Both factory-initialized via `createEmptyPaymentDetails()` in
  `createInitialReview()`, same convention as every other nested object.
- New `AdminContext` actions:
  - `setCiFeePayment(data: Partial<PaymentDetails>)`
  - `markCiFeeAsPaid()` — stamps `ciFeePayment.paidAt`
  - `setAppraisalFeePayment(data: Partial<PaymentDetails>)`
  - `markAppraisalFeeAsPaid()` — stamps `feePayment.paidAt`
- **Declining a fee resets its payment record back to empty** —
  `declineAppraisalFees()`/CI Fee's decline path already resets other
  batch-level fields on decline (e.g. `feeSubmittedAt`/`feeApprovedAt`);
  this new payment record follows the same reset, since a declined-then-
  resubmitted-then-reapproved batch needs a fresh payment, not one carried
  over from a request that was declined.

## Page: `/admin/payment` (`PaymentView`)

New route `paths.admin.payment`, new nav entry "Payment" positioned last in
`approvalItems` (after "Appraisal - Approver Report"), new
`src/app/admin/payment/{page,layout}.tsx` following the exact
auth-gate/`AdminLayout` convention every other admin page under `/admin/`
uses.

**Row source — one row per approved fee request, CI Fee and Appraisal Fee
merged into one table:**

- A CI Fee row exists whenever `ciFeeStatus === 'approved'` (there is at
  most one per live session — CI Fee is a single flat per-application
  request, no bundles).
- An Appraisal Fee row exists whenever `feeApprovalStatus === 'approved'`
  **and** at least one bundle has `feeNeeded === 'yes'` (a batch where
  every bundle answered "No" has nothing to pay).
- Since this prototype has no real multi-application backend, at most one
  row of each kind ever exists in a live session — same "at most one real
  row" ceiling as every other list page here (`appraisal-fee-approval-view.tsx`,
  `ci-fee-approval-view.tsx`, etc.).

**Columns:** Type (CI Fee / Appraisal Fee — plain text, not a colored
pill, so it reads as a category rather than a status), Applicant, Amount
(`fCurrency` — CI Fee's flat `ciFeeAmount`; Appraisal Fee's sum across
every `feeNeeded === 'yes'` bundle, same total Appraisal's own "Advise
Client" dialog already computes), Approved On (`ciFeeApprovedAt`-equivalent
— see Open Items below re: CI Fee needing this timestamp added — or
`feeApprovedAt`), Status (**"For Payment"** while `paidAt` is null, **"Paid"**
once set — plain `StatusBadge`, warning/success tone respectively), and a
trailing chevron.

**Sort: unpaid rows first, paid rows sink to the bottom of the same
table** — nothing is ever hidden once paid, per the user's explicit "stay
but ilagay sa baba" direction. Simple `.sort()` on `!!paidAt`.

**Empty state:** "No fee requests are ready for payment yet." when no row
of either kind exists (mirrors every other list page's empty-state
convention).

## Payment details modal

Clicking a row opens a `Dialog` (not a new detail route — this stays
self-contained on one page, unlike the Fee Approval flows' list→detail
page split, since there's nothing else to show beside the payment form
itself):

- **Header:** the request's own summary — CI Fee shows `ciFeeAmount` +
  `ciFeeAmountDescription`; Appraisal Fee shows the same per-bundle
  breakdown list (TCT numbers + amount) the "Advise Client" dialog on
  `appraisal-appraiser-view.tsx` already renders, plus the running total.
  Read-only in both cases — this modal never edits the fee amount itself.
- **Payment Method** — `Select`, `PAYMENT_METHOD_OPTIONS`.
- **Deposited To** — `Select`, `DEPOSITED_TO_ROSTER`.
- **Official Receipt No.** — `TextField`.
- **OR Date** — plain `type="date"` field.
- **Payment Attachment** — single-file dropzone (same
  `ReportFileDropzone`-style convention as the Appraisal Report form's
  Collateral Photo upload: click/drag to upload, shows a `FileThumbnail`
  + filename once set, a close `IconButton` to clear it). Accepts
  images + PDF, same `accept` set as Requirement Doc uploads.
- **Remarks** — multiline `TextField`, optional.
- **All fields required except Remarks** — the confirm button
  (**"Mark as Paid"**) stays disabled until Payment Method, Deposited To,
  OR No., OR Date, and the attachment are all filled in.

Confirming calls `setCiFeePayment(data)` / `setAppraisalFeePayment(data)`
with every field, immediately followed by `markCiFeeAsPaid()` /
`markAppraisalFeeAsPaid()` in the same action (one click does both — there
is no separate "save draft" state for a payment the way the fee flows have
a "not-submitted" draft phase; entering the form and marking paid is one
step). The modal then shows a brief read-only confirmation
("Marked as paid — {date}") before closing, same non-reversible-action
pattern the Assign Appraiser / Request Document modals already use.

**Once paid, reopening the row's modal shows the same fields read-only**
(locked, same disabled-field styling convention `AppraiserAssignmentCard`
uses) — a record of what was entered, no "Mark as Paid" button, no way to
edit or un-pay from this page. There is no revise/undo step here, matching
every other terminal action in this app (e.g. a submitted Appraisal
Report).

## Non-goals

- No real payment gateway or accounting-system integration — everything is
  a locally-stored simulated record, same as every other "request" flow in
  this prototype.
- No partial payments / installments — a request is either unpaid or paid
  in full, one action.
- Does not touch `Appraisal.paymentReceivedAt` (the client-paid-the-
  appraiser-fee-via-Sendit timestamp) — that's a separate concept this
  feature does not read or write.
- Does not add a "Payment" step to the main application pipeline
  (`ReviewStep`) — like the other three "Request" screens, this is a
  role/queue screen, not a pipeline step.

## Open items

- **CI Fee currently has no `ciFeeApprovedAt` timestamp** (only
  Appraisal Fee's `feeApprovedAt` exists). Adding one — stamped by
  whatever currently sets `ciFeeStatus: 'approved'` — is in scope for this
  feature's implementation, since the Payment table's "Approved On" column
  needs it for CI Fee rows too.
- Simulated approval for both fee types already exists via page actions
  (`ci-fee-approval-view.tsx`, `appraisal-appraiser-view.tsx`); no new
  simulate action is needed to reach "approved" — Payment only needs to
  read that existing state.
