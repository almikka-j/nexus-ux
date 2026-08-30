# Call Report Approval (Request → Call Report Approvals)

> **Maintenance rule:** update this file whenever `call-report-approval-view.tsx`
> (list) or `call-report-approval-bundle-view.tsx` (detail) change. Companion
> to `docs/080-account-solicitation-call-report.md` (Call Report itself —
> owns the `callReportApprovalStatus` data model, the "Submit for Approval"
> button, and the Endorsement Declaration card's approver signature row
> these screens write) and `docs/090-account-solicitation-requirement-checklist.md`
> (what a Call Report approval unlocks).

## What this is

**Dedicated Call Report Approval screens**, nav label **"Call Report -
Report Approval"** (`/admin/call-report-approval` -> `/admin/call-report-approval/current`,
`src/sections/admin/call-report-approval-view.tsx` (list) ->
`call-report-approval-bundle-view.tsx` (detail)) are the second-officer
review step Call Report's own "Submit for Approval" action feeds into.
Unlike CI Fee/Appraisal Fee's approval screens — which offer a second,
*optional* way to trigger a decision an officer can also make inline via
a page action — this is the **only** way a submitted Call Report actually
gets approved. There is no inline "Simulate: Another Officer Approves"
page action on the Call Report page itself; the whole point of this
feature is that clicking "Submit for Approval" on Call Report no longer
advances the application by itself (see
`docs/080-account-solicitation-call-report.md`'s "Submit for Approval"
section for what changed there).

Nested under the **"Request"** nav dropdown (`approvalItems`,
`config-nav-admin.tsx`), positioned right after "Credit Investigation -
Fee Approval" and before "Appraiser" — alongside "Appraisal - Request"/
"Appraisal - Fee Approval"/"Appraisal - Report Approval"/"Payment
Verification" (see `docs/170-request-appraiser.md`,
`docs/180-request-appraisal-request.md`,
`docs/190-request-appraisal-fee-approval.md`,
`docs/200-request-appraisal-report-approval.md`,
`docs/210-request-payments.md`).

Framed as **"Call Report Approvals,"** the Call Report Approver's own
personal workspace ("CALL REPORT APPROVER" eyebrow label, first-person
copy, no sample filler rows), not a generic admin-facing queue — same
personal-workspace convention every other role screen in this group
uses. There is no role/permission system in this app (`AdminUser` has no
role field), so nothing mechanically gates who can open it; the personal
framing is a UI/workflow choice, not access control.

## List → detail split

Same list -> detail split every other approval screen in this app uses
(closest analog: `ci-fee-approval-view.tsx` ->
`ci-fee-approval-bundle-view.tsx`, since Call Report's approval status
also lives on a single flat object — `review.callReport` — with no
bundle/multi-property concept).

The list page (`call-report-approval-view.tsx`) is table-only, one row
(`Applicant / Submitted On / Status`). Clicking the row navigates to the
detail page (`paths.admin.callReportApprovalBundle()`, a fixed
`/current` placeholder segment — no real multi-application backend in
this prototype, so there's no real request ID to route on, same
reasoning as `ciFeeApprovalBundle()`).

**The live application's row always renders, whenever a live application
exists** (`!!signUpData`), regardless of `callReportApprovalStatus` —
same convention every other list page here uses (always present, only
its actionability/status varies). The only empty state is "no live
application at all" (`!signUpData`), showing "Nothing waiting on you
yet" with a **"Go to Application List"** button.

## Always one actionable request

**This workspace always keeps one live, actionable "For Approval" Call
Report submission in front of the approver.** The list page's auto-seed
effect enforces this: if the session hydrates with no live application,
`loadSample(SAMPLE_APPLICATION)` loads the shared sample dataset; then,
whenever `callReportApprovalStatus !== 'pending-approval'`, it re-seeds
a fresh submission — via `buildSampleCallReportFields()`
(`src/sections/admin/call-report/sample-call-report.ts`, see
`docs/080-account-solicitation-call-report.md`), the **same** shared
builder Call Report's own "Fill with Sample Data" uses, so the seeded
submission is a real, complete-looking 8-section Call Report — not just
the 3 fields `canProceed` checks. The seed effect then stamps
`callReportApprovalStatus: 'pending-approval'` and
`callReportSubmittedAt` directly on top of the builder's output.

Deliberately **excludes `'approved'`**: that's a real terminal decision
and must stick, not get silently undone the moment the approver
navigates back to this list.

Unlike CI Fee Approval's detail page, this feature's Decline path does
**not** re-seed a fresh pending request in place — declining resets
`callReportApprovalStatus: 'not-submitted'` and routes the whole
application away to Reconsideration (see "The detail page" below), so
there's nothing left on this screen to re-arm; a fresh live application
only reappears here once a *new* application reaches Call Report and is
submitted again.

## The detail page

**The detail page** (`call-report-approval-bundle-view.tsx`) shows a
header card (applicant name/App No./email, a `StatusBadge` for
`callReportApprovalStatus`, a "Submitted on {date}" chip), then a
**"View Call Report Result"** button opening the existing, unmodified
`CallReportResultModal` (`src/sections/admin/call-report/call-report-result-modal.tsx`)
— the same read-only section-by-section mirror Call Report's own page
and Requirement Checklist's "View Call Report" action already use. No
new report view was built for this screen.

When `callReportApprovalStatus === 'pending-approval'`, it shows
**"Approve Call Report"** / **"Decline"**:

- **Approve** opens a `ConfirmDialog` with a required **Approver Name**
  `TextField` — there's no real second-officer login in this prototype,
  so typing the name is how "who approved this" gets captured. The
  confirm button stays disabled until the name is non-empty after
  `.trim()`. Confirming calls `setCallReport({ callReportApprovalStatus:
  'approved', callReportApprovedAt: <ISO timestamp>,
  callReportApprovedBy: <trimmed name> })`.
- **Decline** reuses the **exact same** reason-dropdown + optional-
  remarks flow as Call Report's own "Sales Reject" button
  (`SALES_REJECT_REASONS`/`buildDecisionReason()`, both from
  `src/sections/admin/call-report/call-report-decline.ts` — shared
  between the two call sites so they can never drift apart). Confirming
  calls `setCallReport({ callReportApprovalStatus: 'not-submitted',
  decisionReason })` then routes to Reconsideration
  (`paths.admin.reconsideration`, see
  `docs/130-sales-reject-application.md`) — functionally identical to a
  direct Sales Reject on the Call Report page, just reachable from this
  screen too.

`callReportApprovalStatus === 'approved'` shows a status message instead
("You already approved the call report for {name}." or, right after
acting, "Approved the call report for {name}.") — the detail page only
shows "Request not found" when there's no live application at all
(`!signUpData`).

## What approval unlocks

Once `callReportApprovalStatus === 'approved'`, Call Report's own page
shows an "Approved by {name}" message plus a **"Continue to Requirement
Checklist"** button (`paths.admin.requirementChecklist`) — the officer
must click it themselves; approving here does **not** auto-navigate the
officer's own tab (they may not even be looking at it when a different
approver session approves). See
`docs/080-account-solicitation-call-report.md`'s "Submit for Approval"
section.

The Endorsement Declaration card on the Call Report page also gains a
second signature row once approved — **Approved By** /
**Approval Date/Time** — sourced from `callReportApprovedBy`/
`callReportApprovedAt`, below the existing Account Officer row. See
`docs/080-account-solicitation-call-report.md`'s "Account Officer
Endorsement Declaration" section.
