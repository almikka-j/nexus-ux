# Admin Appraisal — Design Spec

Date: 2026-08-12

## What this is

A new admin pipeline step, **Appraisal**, sitting between Credit Investigation
and a not-yet-built Credit Scoring step. `'appraisal'` already exists as a
`ReviewStep` literal and a nav-only queue entry
(`src/layouts/admin/config-nav-admin.tsx`), but no route, page, view
component, or data model exists yet — this spec builds all of them, following
the same conventions as `credit-investigation-view.tsx` and its supporting
context/types.

Source: a swimlane flowchart ("APPLICATION PROCESS") with three lanes —
System, Client, LMS User — covering fee collection (via a simulated "Sendit"
payment link and a simulated "Odoo" ERP notification), appraiser assignment
(in-house vs external), report creation/upload, Head Approval, and a
Pass/Fail gate that either hands off to Credit Scoring or terminates both
Credit Investigation and Financial Evaluation.

## Non-goals

- **No real Sendit or Odoo API integration.** Every external touchpoint
  (payment link, payment-received confirmation, Odoo notification) is
  simulated via local state transitions and page actions, matching this
  prototype's existing convention (CI Fee approval, outreach messages, etc.
  are all local-state-only).
- **No real-time photo capture, lot plotting, or market-value lookup.** The
  source diagram flags this as a future integration note; it's rendered here
  as a dashed-note callout with the same wording, non-functional.
- **Credit Scoring is not built.** A Pass outcome routes to a stub page
  (`/admin/applications/[id]/credit-scoring`, "Credit Scoring — coming
  soon") rather than a real scoring workflow.
- **No automated pass/fail computation.** Pass/Fail is a manual officer
  judgment call, not a computed comparison of appraised value vs. loan
  amount.

## Pipeline position & routing

- New path helper: `paths.admin.appraisal(id)` →
  `/admin/applications/[id]/appraisal` (`src/routes/paths.ts`, same shape as
  `creditInvestigation`).
- New page: `src/app/admin/applications/[id]/appraisal/page.tsx` — thin
  wrapper (`Metadata` + `<AppraisalView />`), same as CI's page file.
- New stub page: `src/app/admin/applications/[id]/credit-scoring/page.tsx` —
  minimal placeholder ("Credit Scoring — coming soon") with a link back to
  the Application List.
- Queue unlocking: remove `'appraisal'` from the non-actionable exclusion
  array in `application-list-view.tsx` (`isActionable` check) — this is the
  step that flips it from permanently non-actionable to a real workspace,
  matching every other built step's "always actionable" convention.
  `'financialEvaluation'` stays excluded (still unbuilt).
- Credit Investigation's "Proceed" action should route here instead of to
  the Application List placeholder, once this page exists — update
  `credit-investigation-view.tsx`'s `handleProceed` to
  `router.push(paths.admin.appraisal(...))`.

## Data model

New type on `src/auth/admin-context.tsx`, alongside `CreditInvestigation`:

```ts
export type AppraisalFeeStatus =
  | 'not-requested'
  | 'pending-approval'
  | 'approved'
  | 'declined'
  | 'not-applicable'; // "Need fee?" = No

export type AppraiserType = 'inhouse' | 'external';

export type AppraisalReport = {
  // In-house path — structured form.
  propertyDetails: string;
  appraisedValue: string;
  remarks: string;
  recommendation: string;
  // External path — uploaded file. Mutually exclusive with the structured
  // fields above at the UI level (only one path is active per appraisal),
  // not enforced at the type level (same convention as
  // appraisalGroups/appraisalNotApplicable's documented-but-unenforced
  // exclusivity).
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};

export type HeadApprovalStatus = 'pending' | 'approved' | 'declined';

export type Appraisal = {
  feeStatus: AppraisalFeeStatus;
  feeAmount: string;
  feeDescription: string;
  feeDeclineReason: string;
  clientNotifiedAt: string | null;
  sentToOdooAt: string | null;
  paymentReceivedAt: string | null;
  appraiserType: AppraiserType | null;
  report: AppraisalReport;
  headApprovalStatus: HeadApprovalStatus;
  headApprovalDeclineReason: string;
  passed: boolean | null;
  failReason: string;
};
```

Added as `appraisal: Appraisal` on `ApplicationReview`
(`src/auth/admin-context.tsx`), with a `createInitialAppraisal()` factory
next to `createInitialCreditInvestigation()`.

The pledged-property documents (`requirementChecklist.appraisalGroups`) are
**not duplicated** — the Appraisal page reads them directly off
`review.requirementChecklist`, same as Credit Investigation reads the fixed
Requirement Checklist documents read-only.

## Page layout (`src/sections/admin/appraisal-view.tsx`)

Top to bottom, mirroring `credit-investigation-view.tsx`'s structure:

1. `ApplicationReviewHeader` + `ApplicationDetailsCard` (collapsible) — same
   as every other step.
2. **Pledged Properties card** — read-only. Lists each
   `requirementChecklist.appraisalGroups` entry (TCT/CCT number + its 8
   documents) via `ReadOnlyRequirementDocRow`, same pattern as CI's Document
   Checklist card. If `appraisalNotApplicable` is true, shows that state
   instead of an empty list.
3. **Appraisal Fee card** (`src/sections/admin/appraisal/appraisal-fee-card.tsx`,
   own file like `ci-fee-card.tsx`):
   - "Need fee?" Yes/No toggle. No → `feeStatus: 'not-applicable'`, skips
     directly to card 4 being unlocked.
   - Yes → request form (amount, description, remarks) → `feeStatus:
     'pending-approval'`.
   - Simulated page actions (via `useRegisterPageActions`, same convention as
     CI Fee): "Simulate: Head Approves Appraisal Fee" / "Simulate: Head
     Declines Appraisal Fee". Decline requires a typed reason
     (`ConfirmDialog`), resets to `'not-requested'` (re-request with
     corrected terms), records `feeDeclineReason`.
   - On approval: "Advise Client to Settle" button. Clicking it, in one
     action:
     - sets `clientNotifiedAt` (timestamp shown inline once set — "If
       already sent, timestamp will be shown", verbatim from the diagram)
     - sets `sentToOdooAt` (simulated "Send Request Details to Odoo")
     - fires a simulated client email notification (no real send, just a
       transient toast/confirmation, consistent with other simulated
       notifications in this app)
   - After notification, a "Simulate: Payment Received (Sendit)" page action
     becomes available; triggering it sets `paymentReceivedAt`, which
     unlocks card 4.
4. **Appraiser Assignment card** — locked (dashed placeholder, same visual
   convention as CI's locked CI Report card) until fee is resolved
   (`feeStatus === 'not-applicable'` or `'approved'` with
   `paymentReceivedAt` set).
   - Inhouse/External toggle (`appraiserType`). Switching after one path has
     data clears the other path's partial data (mutually exclusive, same
     convention as CI's fee amount reset on decline).
   - **Inhouse**: structured report form inline (property details, appraised
     value, remarks, recommendation) — loosely modeled on CI's `CiReport`
     form fields. A dashed-note callout below the form, verbatim from the
     source diagram: *"Note: Realtime taking picture, uploading of files
     anywhere in the system (integrate lot plotting and market value)"* —
     styled identically to the diagram's own dashed note, non-functional.
   - **External**: single file dropzone (reuses the `AddDocFileDropzone`
     pattern from `credit-investigation-view.tsx`) — uploads one appraisal
     report file, no structured fields.
5. **Head Approval card** — locked until the report (inhouse) or file
   (external) is submitted. Simulated "Simulate: Head Approves/Declines
   Appraisal Report" page actions. Decline requires a typed reason
   (`ConfirmDialog`) and loops back to card 4 — clears the submitted
   report/file so it can be resubmitted; `appraiserType` selection itself is
   not reset.
6. **Pass/Fail card** — locked until `headApprovalStatus === 'approved'`.
   Two buttons: **Pass** / **Fail**.
   - Fail requires a typed reason (`ConfirmDialog`, same convention as
     Disapprove elsewhere). Confirming routes to a terminal `OutcomeScreen`
     ("Process stopped — Credit Investigation and Financial Evaluation have
     been halted"), and fires a simulated client email notification.
   - Pass shows a "Proceed to Credit Scoring" button, routing to the new
     stub route.

## Edge cases

- "Need fee?" = No is functionally equivalent to `'not-applicable'` — no
  notify/Odoo/Sendit steps happen at all, card 4 unlocks immediately.
- Fee decline resets to `'not-requested'`, same re-entry convention as CI
  Fee's decline flow.
- Head Approval decline clears the submitted report/file but preserves the
  `appraiserType` choice.
- Switching in-house ↔ external before Head Approval clears the other path's
  partial data.

## Docs

- New `docs/ADMIN_APPRAISAL.md`, modeled on `ADMIN_CREDIT_INVESTIGATION.md`'s
  structure (maintenance-rule header, "what this is," pipeline position,
  per-card breakdown, queue unlocking, non-goals).
- `PROJECT_OVERVIEW.md`'s admin flow diagram updated to include Appraisal's
  Pass/Fail branches and the Credit Scoring stub hand-off.
- `docs/ADMIN_CREDIT_INVESTIGATION.md`'s "Proceed" routing note updated once
  `handleProceed` targets `paths.admin.appraisal` instead of the Application
  List placeholder.
