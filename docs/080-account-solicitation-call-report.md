# Admin — Call Report

> **Maintenance rule:** update this file whenever `call-report-view.tsx`, the
> `CallReport` type/initial state in `src/auth/admin-context.tsx`, or any file
> under `src/sections/admin/call-report/` changes — new/removed/renamed
> fields, changed card order, changed `canProceed` gating, changed sample-data
> values, or changes to `call-report-result-modal.tsx` /
> `credit-checking-result-modal.tsx`. Companion to `docs/230-project-overview.md`,
> `docs/070-account-solicitation-initial-credit-checking.md`,
> `docs/090-account-solicitation-requirement-checklist.md`, and
> `docs/225-admin-design-system.md` (the admin design system — this page's
> 8 section cards use `CollapsibleSection`; the decision card and Sales
> Reject dialog follow the §10 decision-gate / §6 `ConfirmDialog` patterns).

## What this is

"Step 2 · Call Report" in the admin application-review pipeline, rendered at
`/admin/applications/[id]/call-report` by `CallReportView`
(`src/sections/admin/call-report-view.tsx`).

The page is the **NEXUS KYC Call Report** — a structured, 8-section interview
matching the source PDF's own section numbering (which itself skips/repeats a
few numbers — see "Section numbering" below) an officer fills out live while
on the call with the borrower, followed by a system-generated validation
block and an account-officer endorsement declaration. There is no real
backend, document generation, or lending engine — the AI Summary/Exceptions/
Recommendation are pure client-side computations in
`call-report-summary.ts`/`call-report-risk.ts`, computed on demand (via the
System Validation card's **Refresh AI Review** button) rather than on every
render, and all answers live in `AdminContext.review.callReport` (`CallReport`,
defined in `src/auth/admin-context.tsx`), persisted by the prototype's
existing localStorage behavior.

## Page order

`CallReportView` renders inside `<Container maxWidth="lg">` — the standard
multi-card pipeline-review width (`docs/225-admin-design-system.md` §4.6);
it was `"md"` before and was widened to match Requirement Checklist /
Credit Investigation / Financial Evaluation.

`CallReportView` renders:

1. `ApplicationReviewHeader` — back navigation, compact application/step
   aging, and the **Step 2 · Call Report** pill (colored via `STEP_TONE`, the
   same step→tone mapping the Application List table's Status column uses —
   `info`/blue for `callReport`). Its separate applicant card is hidden
   (`hideApplicationCard`).
2. `ApplicationDetailsCard` (`collapsible`, `showCreditCheckingResultAction`)
   — application context plus **View full application**, **Initial
   credit checking result**, and **View all officer notes**
   (`officerNotesProcess="Call Report"`) — as of 2026-10-20's later
   revision, the first two navigate to their own dedicated page
   (`router.push`, same tab) rather than opening a `<Dialog>` or
   expanding inline — see "Read-only mirrors elsewhere".
3. The 8 section cards, in fixed order (see below).
4. **View Result** button on the System Validation card — opens
   `CallReportResultModal` as a `<Dialog>` popup (reverted back to a
   modal as of 2026-10-20's second later revision, after briefly being
   an inline section on 2026-10-19 — see "Read-only mirrors elsewhere").
5. **Proceed application?** decision card.

**Fill with Sample Data / Remove Sample Data** is registered as a page action
via `useRegisterPageActions` (shared admin settings/page-actions popover, not
a floating per-page button) — the label and direction are driven by the same
`canProceed` boolean used by the Proceed button.

## The 8 section cards

Each card is its own file under `src/sections/admin/call-report/`, imports its
`{value,label}` option lists and shared `cardSx`/`fieldSx`/`RadioRow`/
`ChipToggleGroup` from `call-report-types.tsx`, and reads/writes
`review.callReport` directly via `useAdmin().setCallReport(partial)` — there
is no form library.

| # | Card | File | Notes |
| --- | --- | --- | --- |
| 1 | Interaction Record | `interaction-record-card.tsx` | Application No./Customer Name shown read-only (NEXUS "auto-populate" fields), sourced from `signUpData`/`getLoanNumber`. Interaction Type, Identity Status, Basis of Identity Confirmation (multiselect + conditional Other). |
| 2 | Application Validation — Confirm, Change or Verify | `application-validation-card.tsx` | 9 fixed `ValidationRow`s (Identity/Authorized Rep, Loan Facility, Loan Purpose, Primary Repayment Source, Business/Employment Info, Existing Loans/Obligations, Residence/Business Address, Collateral/Security Declaration, Co-maker/Guarantee), each a three-way Confirmed/Changed/Unable to Verify control that reveals its own "Changed Information" detail panel only when marked Changed. Existing Loans is a repeatable `ExistingLoanRow` list (`addExistingLoanRow`/`updateExistingLoanRow`/`removeExistingLoanRow`). Co-maker/Guarantee edits `callReport.comakerChange` via `setCallReportComakerChange` — see "Comaker sync" below. Ends with a free-text Material Changes/Clarifications field. |
| 3 | AML / KYC Questions | `aml-kyc-card.tsx` | 6 fixed declaration questions (PEP, PGFC-related party, existing loans, payment history, returned checks, past-due obligations). |
| 4 | Customer Understanding of Loan Terms & Requirements | `customer-understanding-card.tsx` | Customer Level of Understanding, Terms and Requirements Understood (multiselect), Concerns/Clarifications. |
| 5 | Proposed Loan Package | `proposed-loan-package-card.tsx` | PDF's own section number is 6 (card title no longer shows section numbers — see "Section numbering" below). Original Requested Amount is a read-only callout (not a field) defaulting once from `application.financialInfo.desiredLoanAmount` via a guarded `useEffect` — it's the applicant's own stated amount, not something the officer edits here. Facility/product is a dropdown (`LOAN_FACILITY_OPTIONS`, same list as Application Validation's Loan Facility field). Fields read top-to-bottom: facility/product, interest rate + basis, computation type (+ conditional Other), proposed amount + term, estimated monthly amortization. The old free-text "Other Request" field was removed. |
| 6 | AO Preliminary Risk & Call Disposition | `risk-disposition-card.tsx` | PDF's own section number is 7. AO Preliminary Risk is a single-select Low/Moderate/High/Unable to Determine rating (`preliminaryRiskLevel`) — the officer's own risk level, distinct from Primary Risk Driver (what causes the risk) and Call Disposition (what to do about it). Primary Risk Driver is multiselect (more than one driver can genuinely apply); Call Disposition is single-select (the five outcomes are mutually exclusive results of one call, even though the source PDF renders both with the same checkbox glyph). Reason/Key Condition free text. |
| 7 | NEXUS System Validation / Exception Handoff | `system-validation-card.tsx` | PDF's own section number is 8 (first of two same-numbered sections — see "Section numbering" below). On-page title is "AI review, summary & recommendation", matching the naming convention used for the equivalent AI section on Initial Credit Checking. **Refresh AI Review** button computes and stores `aiSummary` (`buildCallSummary`), `aiExceptions` (`buildCallReportAiExceptions`), `aiRecommendation` (`buildCallReportAiRecommendation(...).text`), and `aoVsSystemVariance`/`varianceExplanation` (`buildCallReportVariance`, comparing the officer's `preliminaryRiskLevel` against the system's own AI recommendation level) onto `CallReport` — none of these are recomputed on every render, unlike the old page's AI card. AO vs. System Assessment Variance is system-computed and shown read-only, not an officer-entered field. |
| 8 | Account Officer Endorsement Declaration | `endorsement-declaration-card.tsx` | PDF's own section number is 8 again (second occurrence). Renders 5 fixed attestation paragraphs read-only (not officer-edited), then Account Officer name (defaults once from `application.assignedOfficer`) + date/time. No Head-review field here — that belongs to a separate, not-yet-built Call Report Review step. |

### Section numbering

Card headings no longer show the source PDF's section numbers (the
"1. / 2. / 3. ..." prefixes were removed from every card title, along with
the matching `SectionHeading`s in `call-report-result-modal.tsx`) — this
table's own numbering above is just this doc's row order, not a rendered
title prefix. The PDF's own section numbers still have the same quirks
underneath (1 → 2 → 3 → 4 → **6** Proposed Loan Package, no independently-
numbered section 5 → 7 → **8** NEXUS System Validation → **8 again**
Endorsement Declaration) and are still referenced by code comments and this
doc for cross-referencing the source document, but they are not part of the
UI anymore. The numbered sub-items *inside* Application Validation
(1. Identity, 2. Loan Facility, etc.) are unrelated — those are the PDF's
own numbered checklist items within that one card and were left as-is.

## Comaker sync (`comakers` / `comakerChange`)

`CallReport.comakerChange` (`CallReportComakerChange`) is the actual
officer-edited form — 9 free-text fields (name, address, contact number,
relationship, occupation/employer, years in employment/business, primary ID,
secondary ID, remarks) — edited only inside Application Validation card's
"9. Co-maker/Guarantee" row.

`CallReport.comakers` (`CiComakerEntry[]`) is a **derived, read-only mirror**
kept in sync by `setCallReportComakerChange` (`src/auth/admin-context.tsx`):
every time `comakerChange` is updated, the setter recomputes `comakers` as
either a single entry (once `completeName` is non-blank, mapping
name/relationshipToBorrower/address/contactNumber/occupation across, and
preserving the existing entry's `id` and `monthlyIncome` — which has no
equivalent field in `comakerChange` — across edits) or an empty array (once
`completeName` is blank again). There is no `addComakerEntry`/
`updateComakerEntry`/`removeComakerEntry` on this page — `comakers` is never
edited directly here.

This is the field Credit Investigation's CI Report
(`src/sections/admin/credit-investigation/ci-report-card.tsx`) reads
read-only via `review.callReport.comakers` — kept as `CiComakerEntry[]`
specifically so that consumer never has to change. That file also imports the
shared `RadioRow` helper from `call-report/call-report-types.tsx` (not from
any per-section card file — `RadioRow`/`ChipToggleGroup` live in the shared
types file now, not on a "first" section card).

## System-generated validation (section 8 card)

`system-validation-card.tsx`'s **Refresh AI Review** button is the only way
`aiSummary`/`aiExceptions`/`aiRecommendation` change — pure functions read the
rest of `CallReport` and the button writes their output back onto those three
fields via `setCallReport`, so what's displayed is always exactly what was
last refreshed, not silently recomputed underneath the officer:

- `buildCallSummary(callReport, signUpData)` (`call-report-summary.ts`) —
  composes a plain-text summary (interaction basics, identity status, counts
  of Application Validation rows marked Changed/Unable to Verify, loan
  purpose change, primary risk drivers, call disposition, proposed amount),
  skipping any clause whose backing fields are still empty.
- `buildCallReportAiExceptions(callReport)` (`call-report-summary.ts`) —
  flags AML/KYC "yes"/"for-verification" answers to the PEP, PGFC-related-
  party, returned-checks, past-due-obligations, and major-delays-payment-
  history questions, plus a count of any Application Validation row marked
  Unable to Verify; falls back to `'No exceptions or inconsistencies
  flagged.'` when nothing is flagged.
- `buildCallReportAiRecommendation(callReport)` (`call-report-risk.ts`) —
  `{level: 'good'|'watch'|'high', text}`, mirroring
  `initial-credit-checking-risk.ts`'s shape. Driven primarily by the
  officer's own `callDisposition` answer (`proceed-to-next-process` → good,
  `sales-reject-decline` → high, everything else → watch), folding in an
  AML/KYC flag count either as a clause appended to the disposition-driven
  text or, when no disposition has been entered yet, as the sole driver of
  the level (0 flags → watch/"complete the sections above", 1 → watch, 2+ →
  high).

The System Validation card always shows the *live* `buildCallReportAiRecommendation()`
result as its color-coded risk banner (so the banner never goes stale even if
the officer forgets to refresh), but the AI Summary/Exceptions text blocks
show the *stored* `aiSummary`/`aiExceptions` values, prompting "Click
'Refresh AI Review'…" placeholders until first refreshed.

## `CallReport` fields not shown on any card

- `callReportApprovalStatus` (`'not-submitted' | 'pending-approval' |
  'approved'`) — set by "Submit for Approval" and by the Call Report
  Approval screen's Approve/Decline actions (see
  `docs/160-request-call-report-approval.md`); not edited on a card
  directly.
- `callReportSubmittedAt`/`callReportApprovedAt`/`callReportApprovedBy` —
  stamped by the same actions; `callReportApprovedBy`/
  `callReportApprovedAt` are also displayed read-only on the Endorsement
  Declaration card once approved (see "Account Officer Endorsement
  Declaration" below).
- `decisionReason` — set by the Sales Reject dialog (this page) or the
  Call Report Approval screen's Decline dialog (same shared reason
  helper — see below); not edited on a card.

## Submit for Approval gate

```ts
const canProceed = !!callReport.interactionType && !!callReport.identityStatus && !!callReport.callDisposition;
```

Requires Interaction Type (section 1), Identity Status (section 1), and Call
Disposition (section 6) — no follow-up-date sub-condition (the old page's
`followUpRequired` branch was tied to fields that no longer exist on
`CallReport`). This flag is unrelated to approval status — it only gates
whether the 8 sections are complete enough to submit.

**Clicking Call Report no longer routes straight to Requirement
Checklist.** The button (relabeled from "Proceed to Requirement
Checklist") now reads **"Submit for Approval"** — clicking it (while
`canProceed`) sets `callReportApprovalStatus: 'pending-approval'` and
stamps `callReportSubmittedAt`, but the officer stays on the same page.
A second officer must approve it on the dedicated **Call Report -
Approval** screen (`docs/160-request-call-report-approval.md`) before
the application can move forward — there is no inline "Simulate:
Another Officer Approves" shortcut on this page the way CI Fee/
Appraisal Fee have; the dedicated approval screen is the only path.

The "Proceed application?" card now shows one of three states,
depending on `callReportApprovalStatus`:

- **`'not-submitted'`** — the **"Submit for Approval"** / **"Sales
  Reject"** button pair (unchanged from before, aside from the first
  button's rename).
- **`'pending-approval'`** — a waiting message ("Submitted for approval
  — waiting on the Call Report Approver."), no buttons.
- **`'approved'`** — an "Approved by {`callReportApprovedBy`}." message
  plus a **"Continue to Requirement Checklist"** button
  (`paths.admin.requirementChecklist(email)`). This does **not**
  auto-navigate the instant approval happens — the officer must click it
  themselves, since they may not even be on this tab when a different
  session approves the submission.

**Sales Reject is completely unchanged** — remains available at any
time regardless of `callReportApprovalStatus` (even mid-`pending-approval`,
an officer can still Sales Reject the application outright), opens the
same reason-dropdown + optional-remarks `ConfirmDialog` as Initial
Credit Checking's own Sales Reject, and does **not** touch
`callReportApprovalStatus` at all — it bypasses the approval question
entirely rather than "declining" a submission. Its reason list and
`"{category} — {remarks}"` formatting now live in a small shared module,
`src/sections/admin/call-report/call-report-decline.ts`
(`SALES_REJECT_REASONS`, `buildDecisionReason()`), reused verbatim by
the Call Report Approval screen's own Decline action — see
`docs/160-request-call-report-approval.md`. Confirming Sales Reject
calls `setCallReport({ decisionReason })` then routes to
`paths.admin.reconsideration(email)`, same as always.

## Read-only mirrors elsewhere

- `call-report/call-report-result-modal.tsx` — a read-only, section-by-section
  mirror of the 8 cards above, split into two exports:
  `CallReportResultContent` (the body, no dialog chrome) and
  `CallReportResultModal` (the `<Dialog>` wrapper around it, `hideHeader`
  passed to the content so the title doesn't render twice). On 2026-10-19
  the Call Report page itself briefly rendered `CallReportResultContent`
  **inline** (toggled by the System Validation card's own **View
  Result** button) instead of opening `CallReportResultModal` as a popup —
  **this was reverted later on 2026-10-20**: the System Validation card's
  **View Result** button once again opens `CallReportResultModal` as a
  `<Dialog>` popup, same as the **Call Report Approval** detail page.
  Separately, `ApplicationDetailsCard`'s own "View call report" action
  (a cross-page reference used from Call Report, Credit Investigation,
  Requirement Checklist, etc.) navigates to its own dedicated page,
  `paths.admin.callReportResult(id)` → `/admin/applications/[id]/call-report/result`
  (same tab, via `router.push`), rendering `CallReportResultContent` inside
  `CallReportResultView` with its own header and a `router.back()` Back
  control (see `result-page-header.tsx`) — this is a separate, still-current
  decision from 2026-10-20 and is unaffected by the View Result revert
  above, since it's a cross-page reference rather than the page's own
  same-page result. Must be updated whenever a `CallReport` field is
  added, removed, or renamed.
  Its own Endorsement Declaration section mirrors
  `endorsement-declaration-card.tsx`'s conditional **Approved By** /
  **Approval Date / Time** second signature row once `callReportApprovalStatus
  === 'approved'` — so approving a Call Report on the Call Report - Report
  Approval screen is reflected here too, e.g. when an officer expands
  **View call report** from Requirement Checklist. Unlike the card, this
  content also has a **display-only fallback**: for an application saved
  before the approval gate existed (so it never got
  `callReportApprovalStatus`/`callReportApprovedBy` populated) but whose
  Call Report was clearly already generated (`review.stepTimestamps
  .callReport` is set), it shows the same row with a fixed dummy name
  ("Jaime Reyes") and the report's own generated date instead of leaving
  the row blank. This fallback is local to this content — it does not
  write anything back to `callReport`, and `endorsement-declaration-card.tsx`
  itself still only ever shows the real `callReportApprovedBy`.
- `call-report/credit-checking-result-modal.tsx` — shows the Initial
  Credit Checking decision/notes, not `CallReport` data; unaffected by
  Call Report field changes. Split the same way as
  `call-report-result-modal.tsx`: `CreditCheckingResultContent` (body,
  no dialog chrome) + `CreditCheckingResultModal` (the `<Dialog>`
  wrapper, `hideHeader` passed to the content). On 2026-10-19 the
  Initial Credit Checking page briefly rendered `CreditCheckingResultContent`
  inline on itself instead of opening `CreditCheckingResultModal` as a
  popup — **reverted later on 2026-10-20**: its own **View Initial
  Credit Checking Result** button once again opens
  `CreditCheckingResultModal` as a `<Dialog>` popup. Separately,
  `ApplicationDetailsCard`'s own "Initial credit checking result" action
  (a cross-page reference) navigates to its own dedicated page**,
  `paths.admin.creditCheckingResult(id)` →
  `/admin/applications/[id]/credit-checking/result` (same tab, via
  `router.push`), the same pattern as "View call report" above — this
  is a separate, still-current decision, unaffected by the modal revert
  above since it's a cross-page reference, not the page's own same-page
  result. (The `onViewCreditCheckingResult` callback prop on `ApplicationDetailsCard`
  — which used to hoist this button's click up to the embedding page's
  own modal state — was removed entirely; the card now always manages its
  own navigation regardless of which page embeds it.) `ApplicationDetailsCard`'s
  third action, "View full application", follows the same pattern:
  `paths.admin.fullApplication(id)` → `/admin/applications/[id]/full-application`,
  rendering the card's extracted `ApplicationFullDetails` component (see
  `application-details-card.tsx`) inside `FullApplicationView`.

## Sample data action

`handleFillSampleData`/`handleClearSampleData` in `call-report-view.tsx`
set/clear every field on `CallReport` across all 8 sections.
`handleFillSampleData` now delegates the actual field values to
`buildSampleCallReportFields()`
(`src/sections/admin/call-report/sample-call-report.ts`) — the same
values it always used (internally consistent: `identityStatus:
'confirmed'`, `callDisposition: 'proceed-to-next-process'`, a single
sample `ExistingLoanRow`, a single sample `CallReportComakerChange`
whose derived `comakers` entry is built inline to match), pulled into
this shared file so the Call Report Approval list page's own auto-seed
effect can produce an identical, real, complete-looking submission
without duplicating the object — see
`docs/160-request-call-report-approval.md`. The builder also computes
real `aiSummary`/`aiExceptions`/`aiRecommendation`/`aoVsSystemVariance`/
`varianceExplanation` values (via the same `buildCallSummary`/
`buildCallReportAiExceptions`/`buildCallReportAiRecommendation`/
`buildCallReportVariance` functions "Refresh AI Review" uses), not blank
placeholders, so both call sites' seeded report shows real AI-review
content immediately.

`handleFillSampleData` satisfies `canProceed` (so the button immediately
demonstrates its filled state) but leaves `callReportApprovalStatus:
'not-submitted'` — sample-fill fills the 8 sections, it does not skip
the "Submit for Approval" decision step. Clearing resets Call Report
fields only (including the approval-status fields back to their initial
values) — it does not touch Application Details, Initial Credit
Checking, or Requirement Checklist state.

## Files

**New (this page's current implementation):**
- `interaction-record-card.tsx`, `application-validation-card.tsx`,
  `aml-kyc-card.tsx`, `customer-understanding-card.tsx`,
  `proposed-loan-package-card.tsx`, `risk-disposition-card.tsx`,
  `system-validation-card.tsx`, `endorsement-declaration-card.tsx` — the 8
  section cards above.
- `call-report-types.tsx` — every enum's `{value,label}` option list, plus
  shared `cardSx`/`fieldSx`, `labelFor()`, and the shared `RadioRow`/
  `ChipToggleGroup` UI primitives every card (and `ci-report-card.tsx`,
  for `RadioRow`) imports.
- `call-report-summary.ts` — `buildCallSummary()` and
  `buildCallReportAiExceptions()`, pure functions.
- `call-report-risk.ts` — `buildCallReportAiRecommendation()`, pure function.
- `call-report-result-modal.tsx` — `CallReportResultContent` (the body) +
  `CallReportResultModal` (its `<Dialog>` wrapper), 8-section shape.
- `credit-checking-result-modal.tsx` — `CreditCheckingResultModal`, unchanged
  (reads Initial Credit Checking state, not `CallReport`).
- `officer-notes-card.tsx` — unmounted legacy component, unaffected.

**Deleted (superseded by the files above):** `call-details-card.tsx`,
`loan-discussion-card.tsx`, `residence-household-card.tsx`,
`employment-business-card.tsx`, `organization-membership-card.tsx`,
`quick-financial-info-card.tsx`, `payment-behavior-card.tsx`,
`officer-observation-card.tsx`, `collateral-information-card.tsx`,
`collateral-entry-fields.tsx`, `agreed-next-steps-card.tsx`,
`loan-package-proposal-card.tsx`, `comaker-information-card.tsx`,
`call-report-computations.ts` (the old 12-section field model and its DTI/
disposable-income computation helpers — none of the new 8 sections use those
computations).

## Decision Gate

The page's terminal action is **Submit for Approval** (gated by
`canProceed` — Interaction Type, Identity Status, Call Disposition), which
moves the report to `'pending-approval'` and hands control to the separate
**Call Report - Approval** screen (`docs/160-request-call-report-approval.md`).
The application cannot advance to Requirement Checklist until a second
officer approves it there. **Sales Reject** is available at any status and
routes to Reconsideration instead. No section card gates the decision on
its own.

## Fabricated Claims — Real vs. Simulated

- **AI Summary / Exceptions / Recommendation / variance** are pure
  client-side arithmetic and string templating in `call-report-summary.ts`
  / `call-report-risk.ts` / the variance helpers — no model call, computed
  on demand via **Refresh AI Review**.
- **No document generation** — there is no NEXUS KYC Call Report PDF; the
  "result" is `CallReportResultContent` rendering the stored `CallReport`
  fields in the source PDF's section layout.
- **Approval is simulated** — see `docs/160`; a fixed dummy approver name
  is stamped, there is no real second-officer login.
- **Sample data is internally consistent, not parsed** —
  `buildSampleCallReportFields()` returns a hand-authored complete
  submission; "Fill with Sample Data" does not read any external source.
- All answers persist only in `localStorage` via `AdminContext.review.callReport`.

## Non-Goals / Open Items

- No real KYC / watchlist / AML screening — the AML-KYC card records the
  officer's manual answers only.
- No real backend for submit/approve — the two-officer handoff is two
  screens sharing the same `localStorage` state.
- Legacy `officer-notes-card.tsx` remains in the tree unmounted.

## History

### 2026-10-20 (fourth later revision)

- **`CreditCheckingResultContent`'s "Credit Checking Report" card changed
  from a single `FieldRow` label/value stack to an "infochip" layout,
  matching Credit Investigation's own `CommercialInfoChips` grid
  exactly** (`ci-report-card.tsx`'s exported `FactChip`/`FactChipRow`) —
  reimplemented locally here as `InfoChip`/`InfoChipRow` since the
  pattern isn't extracted into a shared component yet (see
  `docs/225-admin-design-system.md`'s FactChip/FactChipRow entry). Same
  CSS-grid-with-box-shadow-dividers construction as the original (not a
  flexbox approximation): cells divide with `boxShadow` insets rather
  than borders so dividers don't consume grid track space, only the
  strip's own outer corners round, and a `wide` cell spans the full row
  for a long value. Two flush segments (`position="first"`/`"last"`) so
  they read as one continuous strip: a 2-column client-info segment
  (Application No., Client Name, Email, Contact Number, then a full-width
  Date of Application) and a 2-column memo segment (To, Thru, From, Date,
  then a full-width Subject) — same fields as before, same order, just
  grid-chip layout instead of a stacked list. `FieldRow` itself was
  removed from this file since nothing else in it used it anymore. This
  is a change to the shared content component, so it applies everywhere
  `CreditCheckingResultContent` renders: the standalone Initial Credit
  Checking Result page, the `CreditCheckingResultModal` popup, and the
  Initial Credit Checking page's own same-page inline result.

### 2026-10-20 (third later revision)

- **`CreditCheckingResultView`'s page shell redesigned for a better-looking
  standalone report page.** `Container maxWidth` narrowed from `lg` to
  `md` (a report reads better narrower than full-width), the card gained
  a slightly larger `borderRadius: '20px'` and more generous padding on
  desktop, and `ResultPageHeader` gained two new optional props —
  `icon` (a leading icon badge next to the title, same visual language as
  `ApplicationReviewHeader`'s card headers) and `action` (a trailing
  control next to the title) — used here to add a disabled "PDF export
  coming soon" button, matching the affordance `CreditCheckingResultModal`
  already offered so the dedicated page doesn't feel like a downgrade
  from the modal. Both new props default to nothing, so
  `CallReportResultView`/`FullApplicationView` (which don't pass them)
  are unaffected. `CreditCheckingResultContent` itself (shared with the
  modal and the Initial Credit Checking page's own same-page button) was
  deliberately left unchanged — its `FieldRow`-based report header is an
  intentional, previously-ruled-on design match with Call Report's own
  result content (see `docs/225-admin-design-system.md`'s 2026-10-19
  entry), not something to alter for one caller.

### 2026-10-20 (second later revision)

- **The System Validation card's own "View Result" button, and the
  Initial Credit Checking page's own "View Initial Credit Checking
  Result" button, reverted from inline expand back to opening a
  `<Dialog>` popup** (`CallReportResultModal` /
  `CreditCheckingResultModal` respectively) — the 2026-10-19 inline
  conversion for these two specific buttons is undone; both modal
  components (kept exported, previously unused) are wired back up in
  `call-report-view.tsx` and `initial-credit-checking-view.tsx`. This is
  scoped to these pages' own same-page result buttons only —
  `ApplicationDetailsCard`'s cross-page "View call report"/"Initial
  credit checking result" actions (the entry below) are unaffected and
  still navigate to their own dedicated pages.

### 2026-10-20 (later revision)

- **`ApplicationDetailsCard`'s 3 actions ("View full application", "View
  call report", "Initial credit checking result") now navigate to their
  own dedicated pages (same tab) instead of expanding inline**, after
  the user clarified the inline-expand design from earlier the same day
  was not what they wanted — these are reached from many different
  parent pages, and each should open its own page with a Back control,
  not an inline block under whichever card triggered it. New routes:
  `paths.admin.callReportResult`, `paths.admin.creditCheckingResult`,
  `paths.admin.fullApplication` (all `(id: string) => string`, following
  the existing `paths.admin.*` convention — `[id]` is cosmetic, same as
  every other route in this app's single-mock-applicant model). New
  pages/views: `call-report-result-view.tsx` (`CallReportResultView`),
  `credit-checking-result-view.tsx` (`CreditCheckingResultView`),
  `full-application-view.tsx` (`FullApplicationView`), all sharing a new
  `result-page-header.tsx` (`ResultPageHeader`) for the title/applicant
  summary/Back button — Back uses `router.back()` rather than a fixed
  link, since these pages have no single parent to link back to.
  `application-details-card.tsx`'s inline `detailsContent` was extracted
  into an exported `ApplicationFullDetails` component so both the card
  and `FullApplicationView` render the same content. The card's own
  inline-expand state (`detailsExpanded`/`callReportExpanded`/
  `creditCheckingExpanded`) was removed in favor of `router.push`.
  The Call Report page's own "View Result" button (System Validation
  card) and the Initial Credit Checking page's own "View Initial Credit
  Checking Result" button are unaffected — those remain inline, since
  they're same-page references, not `ApplicationDetailsCard`'s
  cross-page actions.

### 2026-10-20

- **`ApplicationDetailsCard`'s own "View call report" and "Initial
  credit checking result" actions converted from `<Dialog>` popups to
  inline expand, matching "View full application"'s own 2026-10-19
  conversion.** Every caller of this card (Call Report, Credit
  Investigation, Requirement Checklist, etc.) now expands
  `CallReportResultContent`/`CreditCheckingResultContent` directly
  under the card's own action-button row instead of opening
  `CallReportResultModal`/`CreditCheckingResultModal`. The
  `onViewCreditCheckingResult` callback prop (which let the Call Report
  page hoist this button's click up to its own page-level modal state)
  was removed entirely — the card always manages its own inline state
  now, regardless of which page embeds it; `call-report-view.tsx` was
  updated to pass `showCreditCheckingResultAction` instead. Both
  `<Dialog>`-wrapped modal components are no longer used anywhere in
  this app (kept exported in case a genuinely separate popup flow is
  needed again later). **Superseded later the same day — see the entry
  above.**

### 2026-10-19

- **Call Report and Credit Checking results now show inline on their own
  pages, instead of in a popup.** `call-report-view.tsx`'s System
  Validation card's "View Result" button toggles
  `CallReportResultContent hideHeader` directly on the page (same pattern
  the Call Report Approval detail page already used), instead of opening
  `CallReportResultModal`. `credit-checking-result-modal.tsx` was split
  the same way `call-report-result-modal.tsx` already was —
  `CreditCheckingResultContent` (body) + `CreditCheckingResultModal` (the
  `<Dialog>` wrapper) — so `initial-credit-checking-view.tsx` can render
  its own result inline too. Cross-page references into either result
  (`ApplicationDetailsCard`'s own "View call report"/"View credit
  checking result" actions, this page's own mount of
  `CreditCheckingResultModal` for Initial Credit Checking's result) are
  unchanged and still use the `<Dialog>`-wrapped versions — only each
  page's own view of its own result converted to inline. Both files'
  `SectionLabel` is now the shared `src/components/admin-ui` version
  (adds a divider underneath, matching `appraisal-report-view.tsx`'s own
  header style) instead of each file's own near-identical copy.
  `ApplicationDetailsCard`'s "View full application" button also
  converted from a `<Dialog>` to an inline toggle (button label swaps to
  "Hide full application" when expanded).

### 2026-09

- **12-section field model → 8-section NEXUS KYC layout.** The old card
  set and `call-report-computations.ts` (DTI / disposable-income helpers)
  were deleted; the 8 new section cards match the source PDF's numbering.
- **"Proceed to Requirement Checklist" → "Submit for Approval".** Clicking
  no longer routes forward; it sets `'pending-approval'` and the officer
  waits on the dedicated Call Report - Approval screen. Sample-fill
  satisfies `canProceed` but leaves `callReportApprovalStatus:
  'not-submitted'`.
- **Result modal split.** `call-report-result-modal.tsx` now exports
  `CallReportResultContent` (body) + `CallReportResultModal` (dialog
  wrapper); the Requirement Checklist detail page renders the content
  inline.
- **Shared sample/decline modules.** `sample-call-report.ts` and
  `call-report-decline.ts` are reused verbatim by the Call Report Approval
  screen so both call sites seed and reject identically.

## Verification checklist

After changing Call Report:

1. Confirm all 8 cards still render in order, with `ApplicationDetailsCard`
   first and **View Call Report Result** + **Proceed application?** after
   them.
2. Confirm every enum field added/changed has a matching option list in
   `call-report-types.tsx` and an initial value in `admin-context.tsx`'s
   `createInitialReview()`.
3. Confirm `call-report-result-modal.tsx` reflects any field rename/addition.
4. Confirm `call-report-summary.ts` and `call-report-risk.ts` still reference
   valid field names.
5. Confirm `ci-report-card.tsx`'s `review.callReport.comakers` read and its
   `RadioRow` import from `call-report-types.tsx` still resolve.
6. Confirm Fill/Remove Sample Data still toggles correctly and satisfies
   `canProceed`.
7. Run `npx tsc --noEmit -p .` and `npx eslint src --ext .ts,.tsx`.
