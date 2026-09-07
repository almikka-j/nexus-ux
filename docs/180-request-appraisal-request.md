# Appraisal - Request (status list)

> **Maintenance rule:** update this file whenever `appraisal-request-view.tsx`
> or the shared `appraisal/appraisal-bundle-status.ts` helper it reads
> change. Companion to `docs/110-appraisal.md` (the Officer's Appraisal step
> page, the only place a bundle is actually created or edited) and
> `docs/170-request-appraiser.md` (the per-bundle detail page every row on this
> list links into).

## What this is

`AppraisalRequestView` (`src/sections/admin/appraisal-request-view.tsx`,
rendered at `/admin/appraisal-request`, nav label **"Appraisal -
Request"**, nested under the same **"Request"** dropdown as "Appraiser") is
a dedicated, officer-facing, **read-only** status list: one row per
`AppraisalReportBundle` across the whole application, showing its Appraisal
No., Collateral No.(s), Applicant, assigned Appraiser, and the same On
Process / For Approval / For Report / Reported status pill
`AssignedAppraiserCard` and the Appraiser's own "My Assignments" table
show, computed by the same shared `getAppraisalBundleStatus()` helper
(`src/sections/admin/appraisal/appraisal-bundle-status.ts` — see
`docs/110-appraisal.md`'s "Assigned Appraiser") so all three surfaces can never
disagree on what a bundle's status is. Like the Officer's own card, this
list renders the `'reported'` case as a "View Report" button rather than a
pill.

## Not a workspace, and not a queue

**This page never assigns, creates, or edits a bundle.** Assigning an
appraiser is still exclusively the Collateral titles table's Assign
Appraiser modal on the Appraisal step page
(`appraisal/appraisal-tct-table.tsx`, see `docs/110-appraisal.md`'s "Assign
Appraiser modal") — this page only lists bundles that already exist. Since
an `AppraisalReportBundle` is only ever created once an appraiser has
actually been assigned, there is no "unassigned" row here for a pledged
property that hasn't been assigned yet; that property is still visible
(and actionable) only on the Appraisal step's Collateral titles table,
same as `AssignedAppraiserCard`'s own scope.

Clicking a row navigates to that bundle's existing detail page
(`paths.admin.appraisalAppraiserBundle(bundle.id)`,
`appraisal-appraiser-bundle-view.tsx` — see `docs/170-request-appraiser.md`) —
this page introduces no new detail route, since the detail page's contents
(fee, documents, report form/view) don't change depending on which list
linked into it.

Alongside the Payment page (`docs/210-request-payments.md`), this is one of the
two exceptions among the screens nested under the "Request" nav dropdown:
both are officer-facing status/queue lists, not personal role-workspaces,
so neither carries the "My ___" framing, eyebrow role label, or auto-seeded
sample bundle the Appraiser / Fee Approver / Report Approver / CI Fee
Approver screens use. (This page does show the same "APPRAISAL OFFICER"
eyebrow label the Payment page does — it's the officer's own page to work
from, just not private "my inbox" data.) None of these screens are
`application-list-view.tsx`'s `?step=` queue either; each filters on a
derived condition — here, "has an assigned bundle" — which is not a
`ReviewStep`.

## Empty state (no auto-seed)

Same auto-load convention as every other list page in this app
(`application-list-view.tsx`, `appraisal-appraiser-view.tsx`): if
`review.appraisal.reportBundles` is empty or there's no live application,
the empty state simply says so and points the officer back at the
Appraisal step to make an assignment — this page deliberately does
**not** auto-seed a sample bundle itself (unlike the Appraiser / Fee
Approver / Report Approver screens, which each seed one; see
`docs/170-request-appraiser.md`, `docs/190-request-appraisal-fee-approval.md`, and
`docs/200-request-appraisal-report-approval.md`), since its whole purpose is
reflecting whatever bundles those other flows already created, not
manufacturing its own independent sample state.

## Decision Gate

**Informational only.** This page is read-only — it never assigns,
creates, edits, approves, or declines anything. Every status pill it
shows is computed by the shared `getAppraisalBundleStatus()` helper; all
actual decisions happen on `docs/110-appraisal.md` and
`docs/170-request-appraiser.md`.
