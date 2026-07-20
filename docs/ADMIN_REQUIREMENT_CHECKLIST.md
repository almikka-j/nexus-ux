# Admin — Requirement Checklist

> **Maintenance rule:** update this file whenever `requirement-checklist-view.tsx`
> or its supporting files (`requirement-doc-row.tsx`, `requirement-checklist-docs.ts`,
> `requirement-checklist-risk.ts`) change — new/removed documents, changed
> categories, changed gating, changed decision behavior. Companion to
> `PROJECT_OVERVIEW.md` (system-wide) and `docs/ADMIN_INITIAL_CREDIT_CHECKING.md`
> (the sibling screen earlier in the same review pipeline).

## What this is

"Step 3 · Requirement Checklist" in the admin application-review pipeline
(`src/sections/admin/requirement-checklist-view.tsx`, rendered at
`/admin/applications/[id]/requirement-checklist`). An officer reviews a fixed
list of 16 required/supporting documents against what the applicant has
actually submitted, reads an AI-generated summary/recommendation, adjusts
collateral notes, and decides whether to endorse the application onward or
return it to the applicant with a recorded reason.

There is no real backend and no real AI — every document's "verified"/"needs
review" outcome and every AI Summary/Recommendation string is deterministic,
canned content keyed off the document itself (see `requirement-checklist-docs.ts`),
not a call to any external service or document-parsing model. See "Fabricated
claims" below for what that means for this screen's copy.

## The fixed document list (`requirement-checklist-docs.ts`)

`REQUIREMENT_DOC_META` is a **static array of exactly 16 documents across 3
categories** — the same list renders for every application, regardless of
employment status, loan type, or any other application field:

- **Loan Requirements** (7 documents, 6 required): Bank Authorization Form
  (signed), POEA Contract, Working Visa, Proof of Billing, Primary IDs w/ 3
  specimen signatures, TIN — Primary ID, and Statement of Account (the one
  **not** required — no asterisk in the UI).
- **Financial Documents** (4 documents, all required): Certificate of
  Employment, 6 months Bank Statement, Latest 2 months payslip, Income Tax
  Return (2316).
- **Appraisal Documents** (5 documents, all required): Photocopy of TCT / CCT
  (all pages), Photocopy of Tax Declaration, Realty tax payment receipt, Lot
  Plan / Floor Plan, Tax Mapping Authorization.

That's 15 required documents out of 16 total. Each `RequirementDocMeta` entry
carries `{ key, label, category, required, freshStatus, freshNote }` —
`freshStatus`/`freshNote` are the deterministic outcome assigned the moment an
admin uploads a file for that document while it's `'missing'` (see
`RequirementDocRow` below). These are fixed per document key, never
randomized — the same document key always produces the same canned note.

## `RequirementDoc` state shape (`src/auth/admin-context.tsx`)

```ts
RequirementDoc        { key, status, aiNote, fileName, uploadedAt }
                       — status: 'verified' | 'needs-review' | 'missing'
RequirementChecklist  { documents: RequirementDoc[], collateralNotes, endorsed,
                        returnedToApplicant, returnReason }
```

`review.requirementChecklist.documents` is one `RequirementDoc` per entry in
`REQUIREMENT_DOC_META` (matched by `key`), created fresh per session by
`createInitialRequirementDocuments()`. The starting state pre-populates **14 of
the 16 documents as already received** (a sample filename + that document's
`freshStatus`/`freshNote` already applied, `uploadedAt` backdated to epoch),
matching a "13/15 Required Received" starting screenshot. Exactly two
documents — `incomeTaxReturn` and `taxMappingAuthorization` — start as
`status: 'missing'` (`DOCS_STARTING_MISSING`), so there's always at least one
outstanding item to upload and endorse past on first load.

## `RequirementDocRow` (`src/sections/admin/requirement-doc-row.tsx`)

One row per document, rendering a status icon, the document label (prefixed
with a red `*` when `meta.required`), the current `aiNote` (if any), a status
chip, and one action button:

- **Verified / Needs review** → **View** button opens a lightweight `Dialog`
  showing the filename, status chip, and AI note. There is no real document
  viewer anywhere in this app — this is filename + note only, not a rendered
  file.
- **Missing** → **Upload** button opens a real hidden `<input type="file"
  accept="image/*,.pdf">` file picker. Picking a file does **not** read or
  parse the file's contents — it deterministically assigns that document's
  `meta.freshStatus`/`meta.freshNote` (from `requirement-checklist-docs.ts`),
  records the picked file's own `name` as `fileName`, and stamps
  `uploadedAt: new Date().toISOString()`. A document that starts "needs
  review" stays "needs review" after upload if that's its `freshStatus` —
  uploading a file for a missing document does not automatically mean
  "verified."

## Progress counter and Endorse-gating rule

The header counter (`{receivedRequiredCount}/{requiredMeta.length}`, e.g.
"13/15") and the progress bar both count **only required documents**, and
count a document as "received" whenever its `status !== 'missing'` — i.e.
`'needs-review'` counts as received for this purpose, only `'missing'`
doesn't.

**The Endorse button is gated the same way:** `allRequiredReceived =
receivedRequiredCount === requiredMeta.length`. This means a required document
sitting at `'needs-review'` does **not** block endorsement — only a required
document still `'missing'` does. The non-required `statementOfAccount`
document never factors into the counter or the gate regardless of its status.
"Ready to endorse?" card copy switches between "All required documents are on
file — ready to endorse" and "Clear the N outstanding item(s) above" based on
this same `allRequiredReceived` boolean.

## AI summary/recommendation derivation (`requirement-checklist-risk.ts`)

`buildRequirementChecklistSummary(documents, docMeta, monthlyIncome,
desiredLoanAmount)` is a pure function, recomputed at render time, never
stored — same pattern as `initial-credit-checking-risk.ts`'s
`buildInitialAiRecommendation`. It returns `{ level, summary, recommendation
}`:

- **AI Summary** is always the same shape of sentence: how many of the total
  documents are on file, how many the "AI" verified vs. flagged for review vs.
  found missing, and a one-line income/loan-amount consistency check pulled
  straight from `application.financialInfo`.
- **Risk level** (`'good' | 'watch' | 'high'`) drives both the **AI
  Recommendation** card's background/text color and its label ("Ready" /
  "Almost ready" / "Not ready"):
  - `'high'` — at least one **required** document is still missing.
  - `'watch'` — no required document is missing, but at least one document
    (required or not) is `'needs-review'`.
  - `'good'` — every document is `'verified'`.
- **AI Recommendation** text lists every non-verified document by label (not
  just required ones) when there's outstanding work, or a plain "Ready to
  endorse" line once everything is verified.

Note the risk level's `'watch'`/`'high'` split is **stricter** than the
Endorse button's own gate — a `'needs-review'` document alone is enough to
turn the recommendation card amber even though it doesn't block the Endorse
button. This is intentional: the AI card is meant to nudge officers toward a
fully clean checklist even when the button itself would already let them
proceed.

## Return to Applicant flow

**Return to Applicant** is always clickable (not gated on document status —
an officer can return an application at any point, complete or not). Clicking
it opens a `ConfirmDialog` with a required free-text reason field; **Confirm**
stays disabled until the reason is non-empty (after `.trim()`). Confirming
calls `setRequirementChecklist({ collateralNotes, returnedToApplicant: true,
returnReason: reason })` and the view switches to a "Returned to applicant"
success screen (green check replaced with an amber undo icon), distinct from
but structurally identical to the "Endorsed for comprehensive process" success
screen shown after **Endorse**. Both success screens are the same `SuccessState`
component with different icon/copy props, and both link back to the
Application List. There is no borrower-facing notification anywhere in this
codebase — "Return to Applicant" is purely an officer-side state change with a
confirmation screen, not an actual message sent to anyone.

## Non-goals / History

- **No conditional document sets.** This screen's document list does **not**
  vary by application — every borrower sees the same fixed 16
  documents/3 categories regardless of employment status, loan type, income,
  or any other application field. This is a deliberate, explicit scope
  limitation from the original design spec (see
  `docs/superpowers/specs/2026-07-20-requirement-checklist-rebuild-design.md`'s
  "Non-goals"), not a bug or an oversight to "fix" by adding conditional logic.
- **No real document viewer.** "View" shows filename + AI note in a simple
  dialog, never an actual rendered file — consistent with the rest of this
  prototype's upload handling (see `docs/BORROWER_SIGNUP_FLOW.md` and
  `docs/ADMIN_INITIAL_CREDIT_CHECKING.md` for the same pattern elsewhere).
- **Step numbering and naming were deliberately kept, not "corrected" to match
  an earlier mockup.** An earlier mockup for this screen used "Step 2" and
  "Credit Investigation" wording; this rebuild explicitly keeps this app's
  existing "Step 3 · Requirement Checklist" and "Endorse" language instead of
  adopting the mockup's.
- This screen previously stored a flat `checkedItems` structure (a simple
  checked/unchecked list with no per-document status, category, AI note, or
  fixed metadata). It was fully replaced by the `RequirementDoc[]` model
  described above — there is no remaining reference to `checkedItems`
  anywhere in the codebase.
- Not touching the `Collateral` card's existing free-form-notes behavior.

## Fabricated claims — what's real vs. simulated

Consistent with the rest of this prototype (see `PROJECT_OVERVIEW.md`'s "No
real backend" note and `docs/BORROWER_SIGNUP_FLOW.md`'s "Fabricated 'we did
real work' claims" section), nothing on this screen calls a real document
parser or a real AI model:

- Uploading a file only stores its `name` and an upload timestamp — the file's
  actual contents are never read, parsed, or validated. The resulting
  "verified"/"needs review" status and its AI note are looked up from a fixed
  table keyed by the document, not derived from anything in the file itself.
- Every "AI Summary"/"AI Recommendation" string is a template string built
  from arithmetic on the current documents array and `application.financialInfo`
  — not a model inference call.
- The income/loan-amount "consistency" check in the AI Summary is a
  restatement of numbers already on file, not an independent verification.

This is intentional prototype behavior, not a gap to close as part of routine
maintenance on this screen — flag it explicitly if a future change makes any
of this look more "real" than it is (e.g. adding a fake progress spinner
implying document-parsing latency).
