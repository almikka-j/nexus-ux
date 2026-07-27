# Admin — Credit Investigation

> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-docs.ts`,
> `credit-investigation-risk.ts`, `credit-investigation-transcript.ts`,
> `credit-investigation/ci-fee-card.tsx`, `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/credit-investigation-doc-row.tsx`) change. Companion to
> `PROJECT_OVERVIEW.md` and `docs/ADMIN_REQUIREMENT_CHECKLIST.md` (the step
> immediately before this one in the pipeline).

## What this is

"Step 4 · Credit Investigation" in the admin application-review pipeline
(`src/sections/admin/credit-investigation-view.tsx`, rendered at
`/admin/applications/[id]/credit-investigation`). This is the detail
workspace for the `creditInvestigation` step under the sidebar's
"Comprehensive Credit Checking" section — that nav entry and the
`ReviewStep` type value existed before this page did, deliberately scaffolded
ahead of their workspace (see `PROJECT_OVERVIEW.md`'s admin flow section);
this page is that workspace.

Pipeline position: Initial Credit Checking → Call Report → Requirement
Checklist → **Credit Investigation** → *(next step not yet built — Appraisal
and Financial Evaluation remain non-actionable placeholders)*. The live
application's Credit Investigation queue row only becomes actionable once
`review.requirementChecklist.endorsed` is `true`.

There is no real backend and no real AI — every document's status, every
"AI Summary"/recommendation, and the transcript auto-fill are deterministic,
canned content, not a call to any external service, OCR, or LLM.

## Page order

1. `ApplicationReviewHeader` (`step="Step 4 · Credit Investigation"`,
   `reviewStep="creditInvestigation"`, `hideApplicationCard`).
2. `ApplicationDetailsCard` (collapsible, with Credit Checking Result and
   Call Report actions, `officerNotesProcess="Credit Investigation"`).
3. **Document Checklist** card.
4. **AI review, summary & recommendation** card.
5. **CI Fee** card.
6. **CI Report** card (visible once CI Fee is approved; otherwise a locked
   placeholder).
7. **Proceed application?** decision card.
8. Dialogs mounted outside the stack: Disapprove reason, Return to AMD
   reason, `RequestDocumentsDrawer`.

## Document Checklist

One card, documents grouped into 5 subgroups
(`credit-investigation-docs.ts`'s `CI_SUBGROUP_ORDER`/`CI_SUBGROUP_LABELS`),
each rendered with the shared `RequirementDocRow` component, sorted
outstanding-first within each subgroup:

- **Principal/Consumer**: TIN – Primary ID (required).
- **Spouse**: Philippine Passport – Primary ID (not required), Driver's
  License – Secondary ID (not required).
- **Mortgagor**: Primary IDs of Mortgagor with 3 specimen signature (not
  required).
- **Borrowers**: Primary IDs Borrowers with 3 specimen signature (required).
- **General Requirements**: Bank Authorization Form – signed (required),
  Registration of Business Name (not required), Proof of Billing (required),
  Additional/Other Documents (not required). Shown unconditionally for every
  applicant regardless of `application.loanType`.

Plus two groups outside the fixed metadata:

- **Bureau & Verification Checks** — CIC, CMAP, NFIS/BAP. **View-only.**
  These are required earlier, during Requirement Checklist
  (`cicCheck`/`cmapCheck`/`nfisBapCheck`); this page reads
  `review.requirementChecklist.documents` directly by key and renders each
  with `ReadOnlyBureauCheckRow` — a status chip and a **View** button
  opening the existing `fileUrl`, no Upload/Remove/Mark-as-reviewed
  controls. This page never maintains independent state for these three
  documents.
- **Additional Documents** (only rendered once at least one exists) — ad
  hoc rows the officer adds via **"+ Add document"** (a label text field);
  each becomes a `CreditInvestigationDoc` with `isCustom: true` and its own
  `label`, otherwise behaving like any other upload row.

**Request Documents** opens `RequestDocumentsDrawer`, reusing the existing
component but scoped to this page's own
`review.creditInvestigation.outreachMessages` — independent history from
Requirement Checklist's.

## AI review, summary & recommendation

`buildCreditInvestigationSummary()` (`credit-investigation-risk.ts`) is a
pure function, recomputed at render time, never stored — same pattern as
`requirement-checklist-risk.ts`. It counts the fixed document list's
verified/needs-review/missing documents and factors in whether the 3 Bureau
& Verification checks are complete (read from Requirement Checklist's
state, passed in as a plain boolean) to decide the risk level
(`'good' | 'watch' | 'high'`) and recommendation text.

## CI Fee

`review.creditInvestigation.ciFeeStatus: 'not-requested' | 'pending-approval'
| 'approved'`. There is no separate approver role or login in this
prototype — **"Request CI Fee"** moves the status to `'pending-approval'`;
**"Mark CI Fee as Approved"** (a second simulated action available to the
same officer, same convention as "Force Clean/Negative Bureau Finding"
elsewhere in this app) moves it to `'approved'`. The CI Report card is
locked (shown as a dashed placeholder) until `ciFeeStatus === 'approved'`.

## CI Report

`review.creditInvestigation.report: CiReport`
(`src/auth/admin-context.tsx`). Structured, Call-Report-style sections, all
directly editable regardless of transcript state:

- **Site Visit Details** — visit date, visit time, location visited,
  visiting officer.
- **Borrower/Residence Verification** — identity confirmed, residence
  confirmed, business confirmed (each `'yes' | 'no' | ...`).
- **Neighborhood Check** — neighbor/community feedback (free text) +
  standing select.
- **Findings & Assessment** — free text.
- **Recommendation** — preliminary recommendation select + notes.

### Transcript upload → auto-fill

Officer uploads a transcript file (stands in for a PLAUD.ai export) via a
file input in the CI Report card. Same "store filename + timestamp only,
never read file contents" convention as every other upload in this app.
Uploading triggers `buildTranscriptAutoFill()`
(`credit-investigation-transcript.ts`) — a deterministic, hash-seeded
function (same technique as `simulateBureauFinding`) keyed on the
applicant's email + transcript filename — which fills every CI Report field
above with fixed template content and produces a read-only **AI Summary**
block. Auto-fill is a convenience, not a lock: every field stays editable
before and after upload, and re-uploading a new transcript re-runs auto-fill
and overwrites current values.

## Proceed application?

Three actions, all requiring no document/report completeness gate (matching
this app's generally permissive decision-gate style elsewhere):

- **Proceed** — records `creditInvestigation.decision: 'approved'`, routes
  to the Application List. *(Placeholder routing — see Non-goals below.)*
- **Disapprove** — `ConfirmDialog` with a required typed reason, records
  `decision: 'rejected'` + `decisionReason`, routes to Reconsideration.
  *(Placeholder routing.)*
- **Return to AMD** — `ConfirmDialog` with a required typed reason, records
  `returnedToAmd: true` + `returnToAmdReason`, routes back to Requirement
  Checklist. *(Placeholder routing.)*

## Queue unlocking

`application-list-view.tsx`'s live-row `isActionable` for the
`creditInvestigation` step is `review.requirementChecklist.endorsed` — the
row is clickable in the "Comprehensive Credit Checking → Credit
Investigation" queue only once Requirement Checklist has been endorsed.
Appraisal and Financial Evaluation remain always non-actionable (unbuilt).

Requirement Checklist's "Endorsed for comprehensive process" success screen
gains a **"Continue to Credit Investigation"** button (above the existing
"Back to Application List") linking to this page — the "Returned to
applicant" success screen is unaffected.

## Non-goals / Open items

- **Exact post-decision routing for Proceed/Disapprove/Return to AMD is a
  placeholder**, chosen for a functionally complete first build (Proceed →
  Application List, Disapprove → Reconsideration, Return to AMD →
  Requirement Checklist). Revisit before considering this feature fully
  settled.
- **Appraisal and Financial Evaluation** remain scaffolded-only, unbuilt.
- **No real file parsing, real AI/LLM, or real transcription anywhere** —
  every "AI Summary" and auto-fill is deterministic template text engineered
  to look the same shape as Requirement Checklist's/Initial Credit
  Checking's existing "AI" cards.
- **No real outreach delivery** on email/WhatsApp/Viber — same
  simulated-only convention as every other `RequestDocumentsDrawer` instance.
- **No separate CI Fee approver persona/login** — approval is a second
  simulated action for the same officer, not a distinct workflow role.
