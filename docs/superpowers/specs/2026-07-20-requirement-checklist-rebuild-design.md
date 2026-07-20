# Requirement Checklist Rebuild

## Context

`RequirementChecklistView` (`src/sections/admin/requirement-checklist-view.tsx`,
"Step 3 · Requirement Checklist" in the admin review pipeline) is currently a
flat 5-item generic checkbox list with a free-text collateral notes field —
no per-document detail, no simulated AI review, no upload/view actions.

A design mockup (screenshot, provided by the user) shows a much richer target:
documents grouped into categories, each with a simulated AI verification
status and note, a progress counter, upload/view actions per document, and an
"AI review, summary & recommendation" card — all built on the borrower's
actual submitted data, matching the pattern already established by
`BureauReportsCard` (per-item rows) and `InitialCreditCheckingView`'s merged
AI review card.

**Reconciled against our actual system** (mockup differs from our real
pipeline in two ways, resolved during design):
- Mockup labels this "Step 2" and says "Endorse to Credit Investigation" —
  our real pipeline is Step 1 Initial Credit Checking → Step 2 Call Report →
  Step 3 Requirement Checklist, with no "Credit Investigation" step anywhere.
  **Keeping our real step number and terminology** — this stays "Step 3", and
  the primary action stays labeled "Endorse" (matching the existing endorsed
  success-state copy), not "Endorse to Credit Investigation".
- Requirement Checklist is genuinely the last step in our pipeline today
  (nothing routes forward from it). No new destination is introduced.

## Data model (`src/auth/admin-context.tsx`)

Replace the flat shape:

```ts
// Before
export type RequirementChecklist = {
  checkedItems: string[];
  collateralNotes: string;
  endorsed: boolean;
};
```

With a structured per-document shape:

```ts
export type RequirementDocStatus = 'verified' | 'needs-review' | 'missing';

export type RequirementDocCategory = 'loan' | 'financial' | 'appraisal';

export type RequirementDoc = {
  key: string;                    // stable id, e.g. 'bankAuthForm'
  status: RequirementDocStatus;
  aiNote: string;                 // '' when status is 'missing'
  fileName: string | null;
  uploadedAt: string | null;
};

export type RequirementChecklist = {
  documents: RequirementDoc[];
  collateralNotes: string;
  endorsed: boolean;
  returnedToApplicant: boolean;
  returnReason: string;
};
```

Static metadata (label, category, required, the canned AI notes per status)
lives in a new constants file `src/sections/admin/requirement-checklist-docs.ts`,
keyed by the same `key` — kept out of `admin-context.tsx` since it's fixed
content, not per-application state (same separation as
`initial-credit-checking-risk.ts` vs. `CreditChecking` state).

### Fixed document list (16 documents, 3 categories)

Matches the mockup exactly — no conditional logic based on employment status
or loan type (explicitly out of scope, see Non-goals):

**Loan Requirements** (7): Bank Authorization Form (signed) [required],
POEA Contract [required], Working Visa [required], Proof of Billing
[required], Primary IDs w/ 3 specimen signatures [required], TIN — Primary ID
[required], Statement of Account [not required].

**Financial Documents** (4): Certificate of Employment [required], 6 months
Bank Statement [required], Latest 2 months payslip [required], Income Tax
Return (2316) [required].

**Appraisal Documents** (5): Photocopy of TCT / CCT (all pages) [required],
Photocopy of Tax Declaration [required], Realty tax payment receipt
[required], Lot Plan / Floor Plan [required], Tax Mapping Authorization
[required].

### Initial state

To match the mockup's populated starting screenshot (not an empty checklist),
`admin-context.tsx`'s initial state pre-populates 14 of 16 documents as
`verified` or `needs-review` with a sample `fileName`, leaving exactly two
(`incomeTaxReturn`, `taxMappingAuthorization`) as `missing` — mirroring the
mockup's "12/13 Required Received" state (13 required docs, 12 already
received). Every "needs-review" document's `aiNote` is a specific, realistic
canned string (e.g. Bank Auth Form → "Signature present, but date field
appears blank."), fixed per document key — not randomized, not hash-derived.
Uploading a file for a currently-`missing` document deterministically assigns
it a canned status/note from the same per-document metadata (each document's
metadata includes both its "if uploaded fresh" status/note and, for the
already-populated ones, their starting status/note — same literal content,
reused).

## Components

### `RequirementDocRow` (new, in `requirement-checklist-view.tsx` or a new
`requirement-doc-row.tsx` — same file-size judgment call as `BureauRow`)

Modeled directly on `BureauRow` (`bureau-reports-card.tsx`): a bordered row,
status icon (✓ green circle-check / ! amber triangle / plain doc-outline
gray), label with a required-asterisk (`*` in `#F04438`, matching
`bureau-reports-card.tsx`'s `Field` required-asterisk convention) and the AI
note as a small gray caption beneath it, a status `Chip` (`color="success"`
"Verified" / a custom amber "Needs review" / a muted gray "Missing" —
following the existing `Chip size="small" variant="soft"` convention used for
CIBI's "Sent" chip and CMAP/NFIS's negative-finding chips), and a right-aligned
action: **View** (opens a lightweight `Dialog` — filename + AI note + status,
no real document viewer, consistent with how this app fakes every other
document review) for verified/needs-review docs, or **Upload** (real
`<input type="file">` via a hidden ref, same pattern as `SimpleBureauRow`) for
missing docs.

### Requirement Checklist card

Title + subtitle, a top-right "X/Y Required Received" counter (X = required
docs not `missing`, Y = total required count) plus a single continuous
progress bar (a `Box` with `width: ${(X/Y)*100}%` filling a track, same
two-layer track/fill technique as `bureau-reports-card.tsx`'s existing
patterns — not a re-use of the segmented `ProgressBar` component from
`src/sections/auth/onboarding/progress-bar.tsx`, which is built for a small
fixed number of wizard steps, not a continuous X/Y fraction). Three
`SectionLabel`-headed groups (Loan Requirements · 7 documents / Financial
Documents · 4 documents / Appraisal Documents · 5 documents), each rendering
its `RequirementDocRow`s in a `Stack`.

### Collateral card

Unchanged — kept exactly as it exists today (free-text `collateralNotes`).
Not present in the mockup, but this is existing functionality being kept, not
mockup content being added.

### AI review, summary & recommendation card

Same visual pattern as `InitialCreditCheckingView`'s merged AI card (icon +
title, gray "AI Summary" block, risk-colored "AI Recommendation" block):

- **AI Summary**: a generated sentence — "{X} of {Y} required documents are
  on file. AI verified {N} document(s), flagged {M} for review, and found
  {K} still missing. Extracted monthly income (₱{amount}) is consistent with
  the ₱{loanAmount} {loanPurpose-derived label} loan request." — reusing
  `application.financialInfo` the same way `buildAiSummary()` does on
  Initial Credit Checking.
- **AI Recommendation**: risk-derived text + label, reusing the
  `good`/`watch`/`high`-style tri-level pattern (new small helper,
  `deriveRequirementChecklistRisk()`, colocated with the doc metadata file) —
  `high`/`watch` ("Almost ready") when any required doc is `missing` or
  `needs-review`, `good` ("Ready") once every required doc is `verified`.
  Text lists the specific outstanding items by label (mirrors the mockup's
  "Clear the 7 outstanding item(s) — a blank auth-form date, a soon-to-expire
  working visa, ... — before endorsing").

### Ready to endorse? card

- Subtitle reflects whether all *required* docs are non-`missing` (Needs
  review does **not** block, per design decision).
- **Endorse** button — same label/behavior as today (sets
  `endorsed: true`), disabled only while any required document is `missing`.
- **Return to Applicant** button (new) — outlined red, opens a
  `ConfirmDialog` (same component/pattern as Initial Credit Checking's
  "No"/"For Reconsideration" reason dialogs) asking for a reason, then sets
  `returnedToApplicant: true` + `returnReason`, showing a new confirmation
  state (parallel structure to the existing `endorsed` success screen, just
  a different heading/icon/copy) — no new routing, no borrower-facing
  notification (none exists anywhere in this app).

## Non-goals

- No conditional document sets based on employment status, loan type, or
  any other application field — the same fixed 16-document list shows for
  every application.
- No real document viewer/preview — "View" shows filename + AI note in a
  simple dialog, not an actual rendered file.
- No change to the actual pipeline step order or the "Step 3" label —
  explicitly reconciling the mockup's "Step 2"/"Credit Investigation"
  language away, not adopting it.
- No borrower-facing notification for "Return to Applicant" — purely an
  officer-side state change with a confirmation screen, since no
  borrower-notification mechanism exists anywhere in this codebase.
- Not touching `Collateral` card's existing behavior.

## Testing

Manual browser walkthrough (no automated test suite for admin flows in this
codebase): confirm the pre-populated state renders correctly (12/13 style
counter, three categories, correct chips/notes), upload a missing document
and confirm it flips to a canned verified/needs-review state, confirm
Endorse is disabled while a required doc is missing and enables once
resolved, confirm Return to Applicant's reason dialog and confirmation state,
plus `tsc --noEmit` / `eslint` passes.
