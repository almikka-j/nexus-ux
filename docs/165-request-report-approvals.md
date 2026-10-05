# Report Approvals (Request → Report Approvals)

> **Maintenance rule:** update this file whenever `report-approvals-view.tsx`
> (the merged list), `call-report-approval-bundle-view.tsx`, or
> `appraisal-approver-bundle-view.tsx` (the two unchanged detail pages)
> change. Companion to `docs/080-account-solicitation-call-report.md`
> (Call Report itself — owns the `callReportApprovalStatus` data model),
> `docs/110-appraisal.md` (the Officer's `HeadApprovalCard` writes the
> exact same `headApprovalStatus` fields the Appraisal detail page does),
> `docs/170-request-appraiser.md` (owns `AppraisalReportView`, the
> read-only report component the Appraisal detail page renders),
> `docs/155-request-fee-approvals.md` (the sibling merge this one follows
> the exact same pattern as), and `docs/225-admin-design-system.md` (the
> `StatusBadge`/`ConfirmDialog` patterns both detail pages follow, per
> §10/§6).
>
> Supersedes `docs/160-request-call-report-approval.md` and
> `docs/200-request-appraisal-report-approval.md`'s own list-page
> sections — both former list pages (`call-report-approval-view.tsx`,
> `appraisal-approver-view.tsx`) were deleted and merged into this one.
> Those two docs still cover their own detail page in full; see them for
> the Call Report / Appraisal detail-page behavior this doc only
> summarizes.

## What this is

**One merged list page**, `/admin/report-approvals`
(`report-approvals-view.tsx`) — replaces what used to be two separate
list pages under two separate nav entries ("Call Report - Report
Approval" and "Appraisal - Report Approval"). One nav entry, **"Report
Approvals"** (`approvalItems`, `config-nav-admin.tsx`), one table, up to
two rows (one per report type). Same merge pattern as
`docs/155-request-fee-approvals.md`, applied to the report-approval side
instead of the fee-approval side.

Clicking the Call Report row navigates to
`paths.admin.reportApprovalsDetail('call-report')`
(`call-report-approval-bundle-view.tsx`); clicking the Appraisal row
navigates to `paths.admin.reportApprovalsDetail('appraisal')`
(`appraisal-approver-bundle-view.tsx`). Both detail pages are
**unchanged** except for their "Back to Report Approvals" links, which
now point at `paths.admin.reportApprovals` instead of their own former
list route.

## Rows are not symmetric — one key difference from Fee Approvals

Unlike the Fee Approvals merge, where both rows always render whenever a
live application exists, **only the Call Report row follows that
convention here**:

- **Call Report row**: always renders whenever a live application exists
  (`hasApplication`), regardless of `callReportApprovalStatus` — same
  convention `application-list-view.tsx` uses for its own live row. Only
  the `StatusBadge` tone/label varies.
- **Appraisal row**: genuinely **conditional** — it only renders once
  every pledged property's report has actually been submitted
  (`reportSubmitted`) **and** `headApprovalStatus === 'pending'`. This is
  **not** the status-gating anti-pattern the old CI Fee / Appraisal Fee
  list pages used to have (removed in the Fee Approvals merge) — it's a
  real completeness gate: there is nothing for the Head Approver to
  review until every assigned property's report actually exists. This
  behavior is preserved unchanged from `appraisal-approver-view.tsx` and
  intentionally **not** loosened to "always show" — showing an empty
  review row with nothing to review would be worse, not more consistent.

So a fresh session may show only the Call Report row until every
pledged property's appraisal report is submitted, at which point the
Appraisal row appears alongside it.

## Columns

| Column | Call Report row | Appraisal row |
| --- | --- | --- |
| Applicant | name + "App No. …" | name + "App No. …" |
| Type | "Call Report" pill | "Appraisal Report" pill |
| Details | "—" (nothing to disambiguate — a flat per-application object) | `"{appraisal no.} · {N properties} · {appraiser(s)}"` |
| Requested By | `application.assignedOfficer` (or "—" if unassigned) | same |
| Submitted On | `callReportSubmittedAt`, formatted | "—" (no per-batch submitted timestamp surfaced on the old list either) |
| Status | `CALL_REPORT_ROW_STATUS_COPY[callReportApprovalStatus]` | always "For Approval" (the row is conditional on being pending, so there is nothing else to show) |

**"Requested By" is the application's assigned officer**, same source
`payment-detail-view.tsx` and `fee-approvals-view.tsx` already use
(`application.assignedOfficer`) — neither Call Report nor Appraisal
tracks a separate per-submission submitter field.

`CALL_REPORT_ROW_STATUS_COPY` (`not-submitted`/`pending-approval`/
`approved`) is unchanged from the former Call Report list. "Type" is a
plain-text pill, not a `StatusBadge` tone — it names a category, not a
status.

## Auto-seed on hydrate

**Both former list pages' auto-seed effects are preserved verbatim**, now
running together in this one component instead of two — they are
genuinely different rules, so they were not merged into one generic
effect:

- **Call Report**: if the session hydrates with no live application,
  load the shared sample dataset (guarded so it only fires once); then,
  unless already `'pending-approval'` or just declined
  (`'not-submitted'` with a `decisionReason` set), seed a fresh
  submission — a full 8-section report via the same
  `buildSampleCallReportFields()` builder Call Report's own "Fill with
  Sample Data" uses if the report is genuinely empty, or just the status
  fields if it already has real content. Excludes `'approved'`.
- **Appraisal**: if there are no `reportBundles` yet, create one from
  every still-unassigned, docs-complete `appraisalGroups` entry with its
  fee already settled (`feeApprovalStatus: 'approved'` and every
  downstream timestamp stamped directly, skipping the request/approve
  steps since nothing on this page needs them mid-flight); then fill in
  and submit whichever bundle is still missing a report via
  `buildSampleAppraisalReport(..., true)`.

## The detail pages

Unchanged in every way except their back-link. See
`docs/160-request-call-report-approval.md` ("The detail page" section)
for `call-report-approval-bundle-view.tsx`'s own inline
`CallReportResultContent` render, Approve/Decline flow, and Decline's
route to Reconsideration; see
`docs/200-request-appraisal-report-approval.md` ("The detail page"
section) for `appraisal-approver-bundle-view.tsx`'s own per-bundle
`AppraisalReportView` render and "Your Decision" card.

## Route shape

`paths.admin.reportApprovals` (`/admin/report-approvals`) is the list;
`paths.admin.reportApprovalsDetail(kind)`
(`/admin/report-approvals/[kind]`, `kind: 'call-report' | 'appraisal'`)
is the detail route — a real discriminator, not an opaque ID (same
convention `feeApprovalsDetail(kind)` already uses), rendered by a thin
`[kind]/page.tsx` that switches between
`CallReportApprovalBundleView`/`AppraisalApproverBundleView` with no
other logic. Replaces the four former path helpers
`callReportApproval`, `callReportApprovalBundle`, `appraisalApprover`,
`appraisalApproverBundle` (all removed from `paths.ts`).

## Fabricated Claims — Real vs. Simulated

- **No real second-officer/Head login** — `AdminUser` has no role field;
  the merged page shows no role-specific eyebrow label.
- **Always one actionable Call Report request** — the list page's
  auto-seed effect re-arms a `'pending-approval'` submission whenever the
  status drifts off it (excluding `'approved'`).
- **The Appraisal row only appears once genuinely reviewable** — this is
  a real completeness gate, not a simulated status.
- **No request ID** — the `[kind]` route segment is a real discriminator
  but not a per-request ID; at most one row of each kind exists per
  session.
- All state lives in `review.callReport` / `review.appraisal` in
  `localStorage`.

## Non-Goals / Open Items

- **No queue of multiple pending requests per type** — one live
  application means at most one row of each kind.
- **No separate approver persona/login** — the same officer can act on
  either report type from this one page.
- **Decline does not re-seed a fresh pending Call Report in place** — it
  routes the application to Reconsideration; a new request only appears
  once a new application reaches Call Report and submits.
