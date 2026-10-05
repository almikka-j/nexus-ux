# Call Report Approval (Request → Report Approvals)

> **Maintenance rule:** update this file whenever
> `call-report-approval-bundle-view.tsx` (the detail page — the only
> page this doc still covers) changes. Companion to
> `docs/080-account-solicitation-call-report.md` (Call Report itself —
> owns the `callReportApprovalStatus` data model, the "Submit for
> Approval" button, and the Endorsement Declaration card's approver
> signature row this screen writes),
> `docs/090-account-solicitation-requirement-checklist.md` (what a Call
> Report approval unlocks), `docs/165-request-report-approvals.md` (**the
> merged list page** — `call-report-approval-view.tsx` was deleted and
> folded into `report-approvals-view.tsx`; see that doc for the list-page
> behavior this doc used to cover), and `docs/225-admin-design-system.md`
> (the admin design system — the Approve/Decline confirms follow §6).

## What this is

**Call Report Approval's detail page**
(`call-report-approval-bundle-view.tsx`, reached at
`paths.admin.reportApprovalsDetail('call-report')`) is the second-officer
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

**The list page that links here (`call-report-approval-view.tsx`) was
deleted and merged into `report-approvals-view.tsx`** — one combined
"Report Approvals" list showing both the Call Report row (always
visible) and the Appraisal row (conditional on every report being
submitted) together (nav label **"Report Approvals"**, replacing the
former separate "Call Report - Report Approval" / "Appraisal - Report
Approval" nav entries). See `docs/165-request-report-approvals.md` for
the merged list page's own behavior, auto-seed rules, and columns.

## Always one actionable request

**This workspace always keeps one live, actionable "For Approval" Call
Report submission in front of the approver.** The list page's auto-seed
effect enforces this — see `docs/165-request-report-approvals.md` — if
the session hydrates with no live application,
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
navigates back to the list.

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
`callReportApprovalStatus`, a "Submitted on {date}" chip), then the
**full Call Report result displayed inline** — no "View" button. It
renders `CallReportResultContent`
(`src/sections/admin/call-report/call-report-result-modal.tsx`), the
same read-only section-by-section body that `CallReportResultModal`
wraps for Call Report's own page, Requirement Checklist's "View Call
Report" action, and Application Details. The approver reads it directly
on the page, then decides below it.

When `callReportApprovalStatus === 'pending-approval'`, it shows
**"Approve Call Report"** / **"Decline"**:

- **Approve** is a single click — no dialog, no typed name. There's no
  real second-officer login in this prototype, so rather than ask the
  user to type an approver name, clicking **"Approve Call Report"**
  immediately calls `setCallReport({ callReportApprovalStatus: 'approved',
  callReportApprovedAt: <ISO timestamp>, callReportApprovedBy: 'Jaime
  Reyes' })` — a fixed dummy name standing in for "who approved this."
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

## Decision Gate

This screen **is** the gate: it is the only path that turns a
`'pending-approval'` Call Report into `'approved'`. **Approve** (single
click) advances `callReportApprovalStatus` and lets the officer continue
to Requirement Checklist. **Decline** resets it to `'not-submitted'` and
routes the application to Reconsideration. There is no inline shortcut on
the Call Report page.

## Fabricated Claims — Real vs. Simulated

- **No real second-officer login** — `AdminUser` has no role field;
  nothing mechanically restricts who opens this workspace. The merged
  list page shows no role-specific eyebrow label (see
  `docs/165-request-report-approvals.md`).
- **Approver identity is a fixed dummy** — Approve stamps
  `callReportApprovedBy: 'Jaime Reyes'` unconditionally, no name input.
- **The seeded submission is generated, not received** — the list
  page's auto-seed effect calls `buildSampleCallReportFields()` and
  stamps `'pending-approval'` so there is always one actionable request;
  `'approved'` is deliberately excluded so a real decision sticks.
- **No request ID** — the detail route (`/admin/report-approvals/call-report`)
  uses `kind` as a real discriminator, not a per-request ID; there is no
  multi-application backend.
- All state is `review.callReport` in `localStorage`.

## Non-Goals / Open Items

- No queue of multiple pending Call Reports — one live application, one row.
- Decline does not re-seed a fresh pending request in place (unlike CI
  Fee Approval); a new request only appears when a new application
  reaches Call Report and submits.

## History

### 2026-09

- **Feature added.** Call Report's "Proceed to Requirement Checklist"
  became "Submit for Approval"; this dedicated two-screen approval flow
  is now the only way a submitted Call Report is approved.
- **Nav label** "Call Report - Approval" → "Call Report - Report Approval".
- **Detail page shows the result inline** via `CallReportResultContent`
  (no "View" button); Approve uses a fixed dummy approver name with no
  name-input dialog, and pre-existing approved reports fall back to a
  dummy approver label.
- **List page merged into `report-approvals-view.tsx`** — nav label
  "Call Report - Report Approval" replaced by the combined "Report
  Approvals" entry, alongside Appraisal's own Head Approval list. See
  `docs/165-request-report-approvals.md`.
