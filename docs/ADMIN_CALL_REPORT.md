# Admin — Call Report

> **Maintenance rule:** update this file whenever `call-report-view.tsx`, the
> `CallReport` type/initial state in `src/auth/admin-context.tsx`, or any file
> under `src/sections/admin/call-report/` changes — new/removed/renamed
> fields, changed card order, changed `canProceed` gating, changed sample-data
> values, or changes to `call-report-result-modal.tsx` /
> `credit-checking-result-modal.tsx`. Companion to `PROJECT_OVERVIEW.md`,
> `docs/ADMIN_INITIAL_CREDIT_CHECKING.md`, and
> `docs/ADMIN_REQUIREMENT_CHECKLIST.md`.

## What this is

"Step 2 · Call Report" in the admin application-review pipeline, rendered at
`/admin/applications/[id]/call-report` by `CallReportView`
(`src/sections/admin/call-report-view.tsx`).

The page is a structured, 11-section interview an officer fills out live
while on the call with the borrower, followed by a preliminary loan package
proposal and an AI-derived summary/recommendation. There is no real backend,
document generation, or lending engine — every derived value (DTI,
disposable income, requested-vs-proposed comparisons, the AI summary and
recommendation) is a pure client-side computation in
`call-report-computations.ts`/`call-report-summary.ts`/`call-report-risk.ts`,
and all answers live in `AdminContext.review.callReport` (`CallReport`,
defined in `src/auth/admin-context.tsx`), persisted by the prototype's
existing localStorage behavior.

## Page order

`CallReportView` renders:

The page `Container` is `maxWidth="md"` (the default before an earlier
attempt widened it to `"lg"`, which read too wide for a single-column page
with no sidebar). `ApplicationDetailsCard`'s `FactChip` strip has a tighter
flex-basis (128px, down from 168px) and both the chip label and value now
truncate with an ellipsis (`title` tooltip for the full text) instead of
wrapping, so all 6 loan-fact chips still fit on one row at this narrower
width.

1. `ApplicationReviewHeader` — back navigation, compact application/step
   aging, and the **Step 2 · Call Report** pill (colored via `STEP_TONE`, the
   same step→tone mapping the Application List table's Status column uses —
   `info`/blue for `callReport`). Its separate applicant card is hidden
   (`hideApplicationCard`).
2. `ApplicationDetailsCard` (`collapsible`) — application context plus **View
   full application**, **Initial Credit Checking Result**
   (`CreditCheckingResultModal`), and **View all officer notes**
   (`officerNotesProcess="Call Report"`).
3. The 11 section cards, in fixed order (see below).
4. **AI review, summary & recommendation** card — see below.
5. **Proceed application?** decision card.
6. `CreditCheckingResultModal` and `CallReportResultModal`, both mounted
   outside the card stack.

**Fill with Sample Data / Remove Sample Data** is registered as a page action
via `useRegisterPageActions` (shared admin settings/page-actions popover, not
a floating per-page button) — the label and direction are driven by the same
`canProceed` boolean used by the Proceed button.

## The 11 section cards

Each card is its own file under `src/sections/admin/call-report/`, imports its
`{value,label}` option lists and shared `cardSx`/`fieldSx` from
`call-report-types.ts`, and reads/writes `review.callReport` directly via
`useAdmin().setCallReport(partial)` — there is no form library.

| # | Card | File | Notes |
| --- | --- | --- | --- |
| 1 | Call Details | `call-details-card.tsx` | Also hosts the shared `RadioRow`/`ChipToggleGroup` helpers every other card imports. |
| 2 | Loan Discussion | `loan-discussion-card.tsx` | Defaults Final Loan Purpose from the application's stated loan purpose once. |
| 3 | Residence and Household Information | `residence-household-card.tsx` | |
| 4 | Employment or Business Information | `employment-business-card.tsx` | Renewal branch (`isRenewal: 'yes'`) reveals income-change fields. |
| 5 | Organization Membership | `organization-membership-card.tsx` | Membership fields only shown when `isOrgMember: 'yes'`. |
| 6 | Quick Financial Information | `quick-financial-info-card.tsx` | Shows the same computed income/obligation/DTI block as `call-report-computations.ts`. |
| 7 | Payment Behavior | `payment-behavior-card.tsx` | Explanation field only shown if any of the three behavior flags is `'yes'`. |
| 8 | Officer Observation | `officer-observation-card.tsx` | Positive/attention `ChipToggleGroup`s plus `observationNotes`. |
| 9 | Collateral Information | `collateral-information-card.tsx` | Repeatable `CollateralEntry` list via `collateral-entry-fields.tsx`; add/update/remove through `addCollateralEntry`/`updateCollateralEntry`/`removeCollateralEntry`. |
| 10 | Agreed Next Steps | `agreed-next-steps-card.tsx` | `nextSteps` chip list, `responsibleParty`, due/follow-up dates. |
| 11 | Loan Package Proposal | `loan-package-proposal-card.tsx` | Original-request vs. proposed-terms comparison, loan computation fields, required documents, conditions, preliminary recommendation. Re-renders the section-9 collateral entries read-only. |

There is no manual Call Summary or Additional Remarks card — both were
removed in favor of the AI review card below, which derives its own summary
fresh from the 11 sections' answers on every render rather than storing a
separately-editable summary.

## AI review, summary & recommendation

A card mirroring Initial Credit Checking's own "AI review, summary &
recommendation" card, added after the 11 section cards, not tied to any one
of them:

- **View Call Report Result** button opens `CallReportResultModal`
  (`call-report-result-modal.tsx`) — the same read-only, section-by-section
  mirror described under "Read-only mirrors elsewhere" below, now also
  reachable from within the Call Report page itself, not just from other
  review steps.
- **AI Summary** — `buildCallSummary()` (`call-report-summary.ts`), called
  fresh on every render (not stored on `CallReport`), so it can never drift
  out of sync with the answers above it.
- **AI Recommendation** — `buildCallReportAiRecommendation()`
  (`call-report-risk.ts`), mirroring `initial-credit-checking-risk.ts`'s
  `{level, text}` shape (`good`/`watch`/`high`, same color/icon treatment via
  a local `CALL_REPORT_RISK_STYLES` map in `call-report-view.tsx`). Driven
  primarily by the officer's own `preliminaryRecommendation` answer
  (section 11) — `proceed-as-requested` → `good`, `hold`/`do-not-proceed` →
  `high`, everything else → `watch` — falling back to the computed DTI ratio
  (`computeDti()`) only when no preliminary recommendation has been entered
  yet.

### Shared option lists and helpers

`call-report-types.ts` exports one `{value,label}` option array per enum
field on `CallReport` (e.g. `CALL_STATUS_OPTIONS`, `COLLATERAL_ASSESSMENT_OPTIONS`,
`PRELIMINARY_RECOMMENDATION_OPTIONS`), plus `cardSx`/`fieldSx` (shared MUI
styling) and `labelFor()` (option-array lookup helper used by the summary
builder and the read-only result modal). `CLIENT_TYPE_OPTIONS` is also kept
here even though no card currently renders `clientType` — see "Fields not
shown on any card" below.

`call-report-computations.ts` holds pure functions only (`toNumber`,
`computeTotalMonthlyIncome`, `computeTotalMonthlyObligations`,
`computeDisposableIncome`, `computeDti`, `compareAmount`, `compareTerm`) — no
React, no state. These are called from both Quick Financial Information and
Loan Package Proposal so the two cards' derived numbers can never drift out
of sync.

## `CallReport` fields not shown on any card

- `approved` — set by the Proceed/Do Not Proceed buttons, not edited on a card.
- `clientType` — previously shown in a dedicated read-only Application
  Summary card that no longer exists on this page; kept in state in case a
  future screen surfaces it again.

## Proceed gate

`canProceed` requires:

- `callStatus`
- `identityConfirmed`
- `preliminaryRecommendation`
- `followUpDate`, but only if `callStatus === 'follow-up-needed'` or
  `nextSteps` includes `'schedule-follow-up-call'`

**Do Not Proceed** remains available without completing these fields. Both
buttons call `setCallReport({ approved: true })` before routing — Proceed goes
to `paths.admin.requirementChecklist(email)`; Do Not Proceed returns to
`paths.admin.applications`.

## Read-only mirrors elsewhere

- `call-report/call-report-result-modal.tsx` (`CallReportResultModal`) — a
  read-only, section-by-section mirror of all 11 cards (no Call Summary or
  Additional Remarks section — both were removed along with their cards),
  opened both from the Call Report page's own **AI review, summary &
  recommendation** card (**View Call Report Result**) and from
  `ApplicationDetailsCard`'s **View Call Report** action on other review
  steps (e.g. Requirement Checklist). Must be updated whenever a `CallReport`
  field is added, removed, or renamed.
- `call-report/credit-checking-result-modal.tsx` (`CreditCheckingResultModal`)
  — shows the Initial Credit Checking decision/notes, not `CallReport` data;
  unaffected by Call Report field changes.

## Sample data action

`handleFillSampleData`/`handleClearSampleData` in `call-report-view.tsx`
set/clear every remaining field on `CallReport` (all 11 sections). Sample
values are chosen to be internally consistent (e.g. `callStatus:
'completed'`, `preliminaryRecommendation: 'proceed-as-requested'`, a single
sample `CollateralEntry`) and to satisfy `canProceed` so the button
immediately demonstrates the "Remove Sample Data" state. Clearing resets
Call Report fields only — it does not touch Application Details, Initial
Credit Checking, or Requirement Checklist state. The AI summary/recommendation
need no sample-data handling of their own since they're derived fresh from
whatever the 11 sections currently hold, not stored.

## Verification checklist

After changing Call Report:

1. Confirm all 11 cards still render in order, with `ApplicationDetailsCard`
   first and the **AI review, summary & recommendation** card after them.
2. Confirm every enum field added/changed has a matching option list in
   `call-report-types.ts` and an initial value in `admin-context.tsx`'s
   `createInitialReview()`.
3. Confirm `call-report-result-modal.tsx` reflects any field rename/addition.
4. Confirm `call-report-summary.ts`, `call-report-computations.ts`, and
   `call-report-risk.ts` still reference valid field names.
5. Confirm Fill/Remove Sample Data still toggles correctly and satisfies
   `canProceed`.
6. Run `npx tsc --noEmit -p .` and `npx eslint src --ext .ts,.tsx`.
