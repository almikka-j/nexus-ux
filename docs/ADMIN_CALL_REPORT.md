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

`CallReportView` renders:

1. `ApplicationReviewHeader` — back navigation, compact application/step
   aging, and the **Step 2 · Call Report** pill (colored via `STEP_TONE`, the
   same step→tone mapping the Application List table's Status column uses —
   `info`/blue for `callReport`). Its separate applicant card is hidden
   (`hideApplicationCard`).
2. `ApplicationDetailsCard` (`collapsible`) — application context plus **View
   full application**, **Initial Credit Checking Result**
   (`CreditCheckingResultModal`), and **View all officer notes**
   (`officerNotesProcess="Call Report"`).
3. The 8 section cards, in fixed order (see below).
4. **View Call Report Result** button, opening `CallReportResultModal`.
5. **Proceed application?** decision card.
6. `CreditCheckingResultModal` and `CallReportResultModal`, both mounted
   outside the card stack.

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
| 5 | Proposed Loan Package | `proposed-loan-package-card.tsx` | PDF's own section number is 6. Original Requested Amount defaults once from `application.financialInfo.desiredLoanAmount` via a guarded `useEffect`. Interest rate/basis, facility/product, computation type (+ conditional Other), proposed amount/amortization/term, other request. |
| 6 | AO Preliminary Risk & Call Disposition | `risk-disposition-card.tsx` | PDF's own section number is 7. Primary Risk Driver is multiselect (more than one driver can genuinely apply); Call Disposition is single-select (the five outcomes are mutually exclusive results of one call, even though the source PDF renders both with the same checkbox glyph). Reason/Key Condition free text. |
| 7 | NEXUS System Validation / Exception Handoff | `system-validation-card.tsx` | PDF's own section number is 8 (first of two same-numbered sections — see "Section numbering" below). **Refresh AI Review** button computes and stores `aiSummary` (`buildCallSummary`), `aiExceptions` (`buildCallReportAiExceptions`), and `aiRecommendation` (`buildCallReportAiRecommendation(...).text`) onto `CallReport` — these are *not* recomputed on every render, unlike the old page's AI card. AO vs. System Assessment Variance (None/Noted, + conditional Explanation). |
| 8 | Account Officer Endorsement Declaration | `endorsement-declaration-card.tsx` | PDF's own section number is 8 again (second occurrence). Renders 5 fixed attestation paragraphs read-only (not officer-edited), then Account Officer name (defaults once from `application.assignedOfficer`) + date/time. No Head-review field here — that belongs to a separate, not-yet-built Call Report Review step. |

### Section numbering

The card headings reproduce the source PDF's own section numbers exactly,
including its quirks: numbering goes 1 → 2 → 3 → 4 → **6** (Proposed Loan
Package; the PDF has no independently-numbered section 5) → 7 → **8** (NEXUS
System Validation) → **8 again** (Endorsement Declaration, unheaded/unnumbered
in the on-page title but referred to as section 8 in the design spec). This
is intentional fidelity to the source document, not a bug — do not
"renumber" these headings to 1–8 sequential without checking the design spec
first.

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

- `approved` — set by the Proceed/Sales Reject buttons, not edited on a card.
- `decisionReason` — set by the Sales Reject dialog, not edited on a card.

## Proceed gate

```ts
const canProceed = !!callReport.interactionType && !!callReport.identityStatus && !!callReport.callDisposition;
```

Requires Interaction Type (section 1), Identity Status (section 1), and Call
Disposition (section 6) — no follow-up-date sub-condition (the old page's
`followUpRequired` branch was tied to fields that no longer exist on
`CallReport`).

**Sales Reject** remains available without completing these fields, and opens
the same reason-dropdown + optional-remarks `ConfirmDialog` as Initial Credit
Checking's own Sales Reject. Proceed calls `setCallReport({ approved: true })`
then routes to `paths.admin.requirementChecklist(email)`; Sales Reject calls
`setCallReport({ approved: false, decisionReason })` then routes to
`paths.admin.reconsideration(email)`.

## Read-only mirrors elsewhere

- `call-report/call-report-result-modal.tsx` (`CallReportResultModal`) — a
  read-only, section-by-section mirror of the 8 cards above. Opened both from
  the Call Report page's own **View Call Report Result** button and from
  `ApplicationDetailsCard`'s **View Call Report** action on other review
  steps (e.g. Requirement Checklist). Must be updated whenever a `CallReport`
  field is added, removed, or renamed.
- `call-report/credit-checking-result-modal.tsx` (`CreditCheckingResultModal`)
  — shows the Initial Credit Checking decision/notes, not `CallReport` data;
  unaffected by Call Report field changes.

## Sample data action

`handleFillSampleData`/`handleClearSampleData` in `call-report-view.tsx`
set/clear every field on `CallReport` across all 8 sections. Sample values
are chosen to be internally consistent (e.g. `identityStatus: 'confirmed'`,
`callDisposition: 'proceed-to-next-process'`, a single sample
`ExistingLoanRow`, a single sample `CallReportComakerChange` whose derived
`comakers` entry is built inline to match) and to satisfy `canProceed` so the
button immediately demonstrates the "Remove Sample Data" state. Clearing
resets Call Report fields only — it does not touch Application Details,
Initial Credit Checking, or Requirement Checklist state. `aiSummary`/
`aiExceptions`/`aiRecommendation` are cleared to `''` (not recomputed) since
they are refresh-on-demand fields, not derived-on-render.

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
- `call-report-result-modal.tsx` — `CallReportResultModal`, rewritten for the
  8-section shape.
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
