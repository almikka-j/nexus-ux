# Credit Investigation Page — Design Spec

Date: 2026-07-27

## What this is

A new admin review page that fills in the already-scaffolded-but-unbuilt
**Credit Investigation** step under "Comprehensive Credit Checking"
(`src/layouts/admin/config-nav-admin.tsx`'s `comprehensiveCreditCheckingItems`,
and `ReviewStep`'s existing `'creditInvestigation'` value in
`src/auth/admin-context.tsx`). Today that nav entry and list-filter exist, but
there is no per-applicant detail page — `application-list-view.tsx` explicitly
marks `creditInvestigation` rows non-actionable ("The queue is introduced
before its detailed application workspace"). This spec builds that workspace.

**Pipeline position:** Initial Credit Checking → Call Report → Requirement
Checklist → **Credit Investigation (new)** → *(next step TBD — see Open
Items)*. Credit Investigation becomes actionable for the live application
only after Requirement Checklist is endorsed
(`review.requirementChecklist.endorsed === true`). Appraisal and Financial
Evaluation remain non-actionable placeholders — out of scope for this spec.

Route: `/admin/applications/[id]/credit-investigation`, added as
`paths.admin.creditInvestigation(id)` in `src/routes/paths.ts`.

## Page order

1. `ApplicationReviewHeader` — `step="Step 4 · Credit Investigation"`,
   `reviewStep="creditInvestigation"`, `hideApplicationCard`. This alone wires
   up step-entered timestamp tracking and aging display; no header changes
   needed since `reviewStep` is already typed to accept this value.
2. `ApplicationDetailsCard` (collapsible, `showCreditCheckingResultAction`,
   `showCallReportAction`, `officerNotesProcess="Credit Investigation"`) — same
   convention as Requirement Checklist's first card.
3. **Document Checklist card** (this page's main content — see below).
4. **CI Fee card**.
5. **CI Report card** (visible/enabled only once CI Fee is Approved).
6. **Decision card** — Proceed / Disapprove / Return to AMD.
7. Dialogs mounted outside the stack: reason `ConfirmDialog`s (Disapprove,
   Return to AMD), `OfficerNotesDialog`, `RequestDocumentsDrawer`,
   `CreditCheckingResultModal`, `CallReportResultModal`.

## Document Checklist card

One card, documents grouped into named sub-sections (mirroring Requirement
Checklist's subgroup pattern in `requirement-checklist-docs.ts`/
`REQUIREMENT_SUBGROUP_LABELS`), each row rendered via the existing
`RequirementDocRow` component (or a simpler read-only variant for the
view-only group — see below). Rows sort outstanding-first within each
subgroup via the existing `sortByAttentionFirst()` pattern.

### Sub-sections

- **Principal/Consumer** — TIN (Primary ID).
- **Spouse** — Philippine Passport (Primary ID), Driver's License (Secondary
  ID).
- **Mortgagor** — Primary IDs of Mortgagor with 3 specimen signatures.
- **Borrowers** — Primary IDs of Borrowers with 3 specimen signatures.
- **Bureau & Verification Checks** — CIC, CMAP, NFIS/BAP. **View-only, not
  upload rows.** These documents are required earlier, in Requirement
  Checklist (`cicCheck`/`cmapCheck`/`nfisBapCheck` in
  `REQUIREMENT_DOC_META`) — by the time an application reaches Credit
  Investigation they must already be on file. This page re-displays them for
  the officer to re-check as part of the investigation, reading directly from
  `review.requirementChecklist.documents` (matched by key) rather than
  maintaining independent state. Each row shows the existing status/filename
  and a **View** button opening the existing `fileUrl` — no Upload/Remove/
  Mark-as-reviewed controls, since this page doesn't own that data.
- **General Requirements** — Bank Authorization Form (signed), Registration
  of Business Name, Proof of Billing, Additional/Other Documents. Fresh
  upload rows with this page's own independent state (new keys, not shared
  with any other page's same-named documents — same "independent per card"
  convention `requirement-checklist-docs.ts` already establishes for
  Working Visa/Proof of Billing/etc.). Shown unconditionally for every
  applicant regardless of `application.loanType` — same "document set does
  not vary by application field" convention Requirement Checklist already
  establishes (`docs/ADMIN_REQUIREMENT_CHECKLIST.md`'s "Non-goals" section).
  Registration of Business Name is not gated behind a business loan type.
- **Custom documents** (ad hoc) — officer can add an arbitrary document row
  via a small "+ Add document" control (label text input + immediately shows
  an upload row). Stored as extra entries in this page's `documents` array,
  not part of the fixed metadata list.

### Request Documents

A "Request Documents" button opens `RequestDocumentsDrawer`, reusing the
existing component, scoped to this page's own
`creditInvestigation.outreachMessages` array (independent history from
Requirement Checklist's).

## CI Fee card

- **States:** `'not-requested' | 'pending-approval' | 'approved'`
  (`CreditInvestigation.ciFeeStatus`).
- `'not-requested'` → shows a **"Request CI Fee"** button. Clicking sets
  status to `'pending-approval'`.
- `'pending-approval'` → shows a distinct amber/pending status chip and copy
  explaining the fee request is awaiting approval. A second action —
  **"Mark CI Fee as Approved"** — simulates the approval step (no separate
  approver login/role in this prototype; same simulated-decision convention
  as "Force Clean/Negative Bureau Finding" page actions). Registered as a
  page action (settings popover), not a floating button, consistent with
  those dev-simulation controls.
- `'approved'` → green "CI Fee Approved" confirmation banner. Unlocks the CI
  Report card below (previously hidden/disabled with explanatory copy).

## CI Report card

Hidden (or shown disabled with "Approve the CI Fee to unlock" copy) until
`ciFeeStatus === 'approved'`. Structured, Call-Report-style sections, all
free-text/select fields the officer can edit directly regardless of transcript
state:

1. **Site Visit Details** — visit date, visit time, location/address visited,
   officer conducting the visit.
2. **Borrower/Residence Verification** — identity confirmed (yes/no/for
   verification, same shape as Call Report's `identityConfirmed`), residence
   confirmed, business confirmed (if applicable).
3. **Neighborhood Check** — neighbor/community feedback (free text) plus a
   standing select (e.g. `'good-standing' | 'with-concern' | 'not-verified'`,
   reusing the shape of Call Report's `MembershipStanding`).
4. **Findings & Assessment** — free text.
5. **Recommendation** — free text + a preliminary-recommendation select
   (mirrors `PreliminaryRecommendation` on `CallReport`).

### Transcript upload → auto-fill

- Officer uploads a transcript **file** (stands in for a PLAUD.ai export) via
  a file input. Same "store filename + timestamp only, never read the file's
  actual contents" convention as every other upload in this app — no real
  transcription/parsing happens.
- Uploading triggers a **deterministic, canned auto-fill**: a pure function
  (same "deterministic hash, not `Math.random()`" pattern as
  `simulateBureauFinding`/`buildAiSummary`) seeded by the transcript filename
  + applicant email fills every CI Report field above with fixed template
  content, and produces a read-only **AI Summary** block (same visual
  convention as Initial Credit Checking's/Requirement Checklist's "AI review,
  summary & recommendation" card).
- Auto-fill is a convenience, not a lock — every field remains directly
  editable before or after a transcript is uploaded. Re-uploading a new
  transcript re-runs auto-fill and overwrites current field values (officer
  can always edit again after).

## Decision card

Three actions:

- **Proceed** — always available once the report exists (no hard gate on
  every field being filled, matching this app's generally permissive
  decision-gate style elsewhere, e.g. Initial Credit Checking's "Approved?"
  card).
- **Disapprove** — opens a `ConfirmDialog` requiring a typed reason (same
  pattern as Initial Credit Checking's Disapprove and Requirement Checklist's
  Return to Applicant).
- **Return to AMD** — opens a `ConfirmDialog` requiring a typed reason
  (AMD = Account/Application Management Dept. reconsideration loop-back).

**Routing targets for all three are an open item — see below.** Placeholder
routing for initial implementation: Proceed → Application List, Disapprove →
Reconsideration, Return to AMD → Requirement Checklist. These are trivial
one-line changes (`router.push(...)`) to revisit once the exact intended
destinations are confirmed.

## Data model additions (`src/auth/admin-context.tsx`)

```ts
export type CiFeeStatus = 'not-requested' | 'pending-approval' | 'approved';

export type CreditInvestigationDoc = RequirementDoc & { isCustom?: boolean; label?: string };
// isCustom/label only set on ad-hoc officer-added rows, which have no fixed
// CreditInvestigationDocMeta entry to look up a label from.

export type CiReport = {
  visitDate: string;
  visitTime: string;
  visitLocation: string;
  visitingOfficer: string;
  identityConfirmed: IdentityConfirmed | ''; // reuse existing type
  residenceConfirmed: 'yes' | 'no' | 'for-verification' | '';
  businessConfirmed: 'yes' | 'no' | 'not-applicable' | '';
  neighborhoodFeedback: string;
  neighborhoodStanding: MembershipStanding | ''; // reuse existing type
  findings: string;
  recommendation: PreliminaryRecommendation | ''; // reuse existing type
  recommendationNotes: string;
  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};

export type CreditInvestigation = {
  documents: CreditInvestigationDoc[];
  outreachMessages: OutreachMessage[]; // reuse existing type
  ciFeeStatus: CiFeeStatus;
  report: CiReport;
  notes: string; // officer notes, same convention as other steps
  decision: CreditCheckDecision; // reuse existing type ('pending'|'approved'|'rejected')
  decisionReason: string;
  returnedToAmd: boolean;
  returnToAmdReason: string;
};
```

`ApplicationReview` gains `creditInvestigation: CreditInvestigation`.
`AdminContextValue` gains `setCreditInvestigation`,
`addCreditInvestigationDocument` (custom row), `addCiOutreachMessage`, plus
reuse of the existing generic-ish patterns where possible. `readStoredState()`
gets a merge branch for `creditInvestigation` matching the existing
`requirementChecklist` merge-by-key approach, so future doc-list changes don't
break old localStorage sessions.

New metadata file `src/sections/admin/credit-investigation-docs.ts`, shaped
like `requirement-checklist-docs.ts`, covering the fixed (non-bureau, non-custom)
document list: TIN, Passport, Driver's License, Mortgagor IDs, Borrower IDs,
Bank Authorization Form, Registration of Business Name, Proof of Billing,
Additional/Other Documents — each with `{ key, label, subgroup, required,
freshStatus, freshNote }`.

## Routing / nav wiring

- `paths.admin.creditInvestigation(id)` added to `src/routes/paths.ts`.
- New page file `src/app/admin/applications/[id]/credit-investigation/page.tsx`
  rendering a new `CreditInvestigationView` component
  (`src/sections/admin/credit-investigation-view.tsx`).
- `getAdminReviewStep`'s regex/map in `config-nav-admin.tsx` gains
  `credit-investigation` → `'creditInvestigation'`.
- `application-list-view.tsx`: `isActionable` for the live row's
  `creditInvestigation` entry becomes
  `review.requirementChecklist.endorsed` instead of always-false; Appraisal
  and Financial Evaluation stay always-false (unchanged, out of scope).
- Requirement Checklist's existing "Endorsed for comprehensive process"
  success screen (`SuccessState` in `requirement-checklist-view.tsx`) gains a
  way forward into Credit Investigation — exact treatment (auto-route vs. a
  button on that success screen) to be decided during implementation planning
  since it touches an existing file this spec doesn't otherwise change.

## Sample data action

Follows the established `useRegisterPageActions` "Fill with Sample Data /
Remove Sample Data" toggle pattern (see Initial Credit Checking/Call
Report/Requirement Checklist), gated on whatever this page's own completion
signal ends up being (e.g. all required documents received + CI Report
filled). Exact gate boolean to be finalized during implementation.

## What's explicitly NOT built here

- Appraisal and Financial Evaluation detail pages — remain scaffolded-only,
  unchanged from their current non-actionable state.
- Any real file parsing, real AI/LLM calls, or real audio transcription.
  Every "AI Summary" and auto-fill in this feature is deterministic template
  text, exactly like every other "AI" surface in this app (see
  `PROJECT_OVERVIEW.md`'s "Fabricated claims" sections). If a future change
  makes any of this look more "real" than it is (e.g. a fake progress
  spinner implying real transcription latency), that should be flagged
  explicitly, not treated as routine polish.
- Any real outreach message delivery (email/WhatsApp/Viber) — same
  simulated-only convention as `RequestDocumentsDrawer` elsewhere.
- A separate human "approver" persona/login for CI Fee — approval is a second
  simulated action available to the same officer, not a real workflow with
  distinct roles.

## Open items (deferred by explicit user request — "mamaya na yun")

1. **Exact post-decision routing.** Where Proceed / Disapprove / Return to
   AMD actually navigate to. Placeholder routing is specified above and
   implemented so the feature is functionally complete, but should be
   revisited before considering this fully done.
2. **Requirement Checklist → Credit Investigation hand-off UI** — whether
   endorsing auto-navigates into Credit Investigation or the existing
   "Endorsed" success screen gains a forward link/button.
3. **Sample-data completion gate boolean** — finalized during implementation
   once the document list and CI Report shape are locked in code.
