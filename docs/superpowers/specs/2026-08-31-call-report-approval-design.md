# Call Report Approval — Design

## What this is

A new admin nav page, **"Call Report - Approval"**, replacing the
placeholder at `docs/160-request-call-report-approval.md`. It adds a
second-officer approval gate to Call Report: instead of an officer's own
"Proceed" button routing straight to Requirement Checklist, Proceed now
submits the Call Report for approval, and only an approver acting on this
new screen actually advances the application. This changes Call Report's
existing pipeline transition, not just adding a new standalone page.

## Current state (before this change)

`call-report-view.tsx` has two terminal actions once the officer finishes
the 8 sections:

- **Proceed** (`handleProceed`) — gated on `canProceed`
  (`interactionType`/`identityStatus`/`callDisposition` all set) — calls
  `setCallReport({ approved: true })` then routes straight to
  Requirement Checklist.
- **Sales Reject** (`confirmReasonDialog`) — always available, no gate —
  opens a reason-dropdown (`SALES_REJECT_REASONS`) + optional-remarks
  `ConfirmDialog`, calls `setCallReport({ approved: false, decisionReason
  })` then routes to Reconsideration.

`CallReport.approved: boolean` and `decisionReason: string` are the only
two decision-related fields on the type today. Nothing else in the
codebase reads `approved` except this page's own render logic.

`endorsement-declaration-card.tsx` shows one signature row today —
**Account Officer** (`application.assignedOfficer`) + **Date/Time**
(`review.stepTimestamps.callReport`) — both read-only, stamped
automatically when the officer entered the step. There is no approver
signature concept on this card at all.

## What changes

### 1. Data model (`CallReport`, `src/auth/admin-context.tsx`)

Replace `approved: boolean` with a status enum, and add approval
timestamp/name fields:

```ts
export type CallReportApprovalStatus = 'not-submitted' | 'pending-approval' | 'approved';

export type CallReport = {
  // ...existing fields, minus `approved: boolean`...
  callReportApprovalStatus: CallReportApprovalStatus;
  callReportSubmittedAt: string | null;
  callReportApprovedAt: string | null;
  callReportApprovedBy: string | null; // the approver's typed name
  decisionReason: string; // unchanged — still written by Sales Reject AND by this flow's Decline
};
```

`createInitialReview()` initializes
`callReportApprovalStatus: 'not-submitted'`,
`callReportSubmittedAt: null`, `callReportApprovedAt: null`,
`callReportApprovedBy: null`.

**Every existing reference to `callReport.approved` must be updated**
(`call-report-view.tsx`'s render logic, any doc mentioning it). Grep
confirms no other file reads this field.

### 2. Call Report page changes (`call-report-view.tsx`)

- **"Proceed" → "Submit for Approval".** `handleProceed` (renamed
  `handleSubmitForApproval`) keeps the same `canProceed` gate, but now
  calls `setCallReport({ callReportApprovalStatus: 'pending-approval',
  callReportSubmittedAt: new Date().toISOString() })` and does **not**
  navigate anywhere — the officer stays on the Call Report page.
- **While `callReportApprovalStatus === 'pending-approval'`**, the
  "Proceed application?" card's button area is replaced with a status
  message ("Submitted for approval — waiting on the Call Report
  Approver.") and the button disabled/hidden, matching the "waiting on a
  second decision" convention CI Fee's own card uses while
  `pending-approval`.
- **Once `callReportApprovalStatus === 'approved'`**, the page shows a
  "Approved by {callReportApprovedBy}" confirmation and a **"Continue to
  Requirement Checklist"** button (`paths.admin.requirementChecklist`) —
  not an automatic redirect, since the officer may not be looking at this
  tab the moment an approver (on a different screen/session) approves it;
  an automatic `router.push` firing on a page the officer isn't
  intentionally leaving would be a jarring, unexpected navigation.
- **Sales Reject is unchanged** — same reason dialog, same
  `setCallReport({ decisionReason })` + route-to-Reconsideration, always
  available regardless of `callReportApprovalStatus`. It does **not**
  touch `callReportApprovalStatus` (a Sales Reject bypasses the approval
  question entirely, it doesn't "decline" a submission).
- **`handleFillSampleData`/`handleClearSampleData`** are updated to
  fill/clear the new fields consistently: sample-fill sets
  `callReportApprovalStatus: 'not-submitted'` (fills the 8 sections but
  doesn't auto-submit — the officer/tester still clicks "Submit for
  Approval" to see the full flow, matching this app's convention of sample
  data filling fields, not skipping decision steps). Clearing resets the
  new fields back to their initial values alongside everything else.

### 3. Endorsement Declaration card (`endorsement-declaration-card.tsx`)

Add a second signature row, rendered only once
`callReportApprovalStatus === 'approved'`, directly below the existing
Account Officer row inside the same green "Endorsed" box:

- **Approved By** — `callReportApprovedBy`.
- **Approval Date/Time** — `callReportApprovedAt`, formatted the same way
  as the existing Date/Time field.

While not yet approved, this second row simply doesn't render — the box
still shows just the Account Officer/Date-Time row it always has.

### 4. New approval screens

Same list → detail split as CI Fee Approval
(`docs/150-request-credit-investigation-fee-approval.md`), the closest
existing analog (a flat, non-bundle, single-application approval, not a
multi-property batch like Appraisal):

- **`call-report-approval-view.tsx`** (list, `/admin/call-report-approval`)
  — table-only, one row (Applicant / Submitted On / Status). Same
  always-actionable-live-row + auto-seed convention as every other
  approval list: if no live application exists, seed the shared sample
  application; if `callReportApprovalStatus` isn't `'pending-approval'`,
  re-seed a fresh submitted Call Report (fill the 8 sections via the same
  sample-data values `handleFillSampleData` uses, then immediately set
  `callReportApprovalStatus: 'pending-approval'` +
  `callReportSubmittedAt`). Clicking the row navigates to the detail page.
- **`call-report-approval-bundle-view.tsx`** (detail,
  `/admin/call-report-approval/current` — fixed placeholder segment, same
  reasoning as every other single-application approval detail route).
  Header card (applicant/App No./email, `StatusBadge` for
  `callReportApprovalStatus`), a **"View Call Report Result"** button
  opening the existing `CallReportResultModal` unchanged, then Approve/
  Decline:
  - **Approve** — `ConfirmDialog` with a required **Approver Name**
    `TextField` (there's no real second login in this prototype, so
    typing the name is how "who approved this" gets captured). Confirming
    calls `setCallReport({ callReportApprovalStatus: 'approved',
    callReportApprovedAt: new Date().toISOString(), callReportApprovedBy:
    approverName.trim() })`.
  - **Decline** — reuses the exact same reason-dropdown +
    optional-remarks flow as Call Report's own Sales Reject (extract
    `SALES_REJECT_REASONS` and the confirm handler's reason-building
    logic into a small shared helper both call sites import, so the two
    can't drift apart). Confirming calls `setCallReport({
    callReportApprovalStatus: 'not-submitted', decisionReason })` then
    routes to Reconsideration — functionally identical to a direct Sales
    Reject, just reachable from this screen too.
- Nav entry replaces the placeholder: `{ title: 'Call Report - Approval',
  step: null, path: paths.admin.callReportApproval }` in `approvalItems`
  (`config-nav-admin.tsx`), positioned to match
  `docs/160-request-call-report-approval.md`'s existing slot in the
  numbered doc sequence (right after Credit Investigation - Fee Approval,
  before Appraiser).

### 5. Routing

New `paths.admin.callReportApproval` / `callReportApprovalBundle()` in
`paths.ts`, same fixed-placeholder-segment convention as
`ciFeeApprovalBundle()`.

## Non-goals

- No real second-officer login/role system — "Approver Name" is a typed
  field, same simulated-approval convention as every other approval flow
  in this app.
- Sales Reject's own gate/flow is unchanged — this feature only adds a
  gate to the *forward* path.
- No partial/multi-round approval — one approve or one decline per
  submission, same as CI Fee/Appraisal Fee.
- Declining does not create a fresh editable draft — it terminates the
  application into Reconsideration, per the user's explicit direction;
  there is no "revise and resubmit" path for a declined Call Report (the
  officer would need to go through Reconsideration's own outcome to
  re-enter the forward pipeline, same as any other Reconsideration case).
