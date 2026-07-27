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

## Page layout and first card

The active checklist and both completion states pass `hideApplicationCard` to
`ApplicationReviewHeader`. The header continues to handle
back navigation, step-entry tracking, compact aging values, and the amber Step
3 pill, but it does not render a separate borrower card. Large stale-step alerts
have been removed globally from all process pages.

The shared collapsible `ApplicationDetailsCard` is the first card in the active
checklist and both completion states. It provides application context plus
Full Application, Initial Credit Checking Result, View Call Report, and View
All Officer Notes actions. The Requirement Checklist summary follows it in
normal page flow; there is no duplicate sticky mini-summary.

### Section navigation & verified-docs folding

To reduce how far an officer has to scroll on applications with many
documents:

- A section nav (side panel on desktop ≥`md`, sticky top bar below `md`)
  lists Credit Investigation, Appraisal, and Financial Evaluation with a
  live `received/total` count and a green/amber status dot. Clicking an
  entry scrolls to and auto-expands that section if it was collapsed.
- Within each section (and each Appraisal property group), documents
  already at `status: 'verified'` are folded into a single row with a
  checkmark icon and text instead of listing every verified row in full.
  Only documents that still need attention (`status !== 'verified'`) render
  expanded by default. When every document in a section/subgroup is already
  verified (nothing needs attention), the row reads "All N verified"; when
  some documents still need attention, it reads "N verified document(s)".
  The fold is expandable per section/group independently.

## Layout: three document cards

The screen presents **Credit Investigation**, **Appraisal**, and **Financial
Evaluation** as three separate white cards. Each card has its own heading,
neutral document-count badge, verified indicator, collapse control, and
document content. Credit Investigation and Financial Evaluation use their
fixed metadata-filtered totals; each badge uses `received/total documents`,
where received means the document status is not `missing`. Appraisal
dynamically calculates both values across its current property groups (or
`0/0 documents` when not applicable). The page does not
use tabs (an earlier iteration used MUI `Tabs`). Card labels deliberately use the design mockup's
naming (`Credit Investigation` / `Appraisal` / `Financial Evaluation`),
superseding the "keep app wording" note in the History section below, which
now only applies to the page's own title/step badge, not these card labels.
Appraisal keeps its collapse chevron at the far-right edge of the header,
after the applicability action, matching the other card headers' scan pattern.
Document labels do not display required-field asterisks; required status is
still retained in metadata and continues to control progress and endorsement.
The checklist summary directs officers to check documents after review and
acceptance, with optional remarks available from the three-dot menu. Completed
rows do not show a redundant Verified chip; Needs review and Missing remain
visible.

## Page-wide UX: regular summary card, collapsible cards, status-first sorting

The page uses the following patterns to make the long checklist easier to
navigate once documents start piling up (all in `requirement-checklist-view.tsx`):

- **One regular summary card** — the duplicate sticky mini-summary was
  removed. The full Requirement Checklist summary follows Application Details
  in normal page flow. Its header pairs a checklist icon/title and concise
  purpose copy with a navy outlined Request Documents action. A separate progress
  panel emphasizes received-versus-total, completion percentage, and a thicker
  state-aware progress bar without a redundant outstanding-count pill. The review instruction and
  latest request history remain below with lighter visual weight.
- **Each document card collapses independently, manually only** —
  `creditInvestigationCollapsed` / `appraisalCollapsed` /
  `financialEvaluationCollapsed`, one `useState` per card, toggled by
  clicking anywhere in that card's header (wrapped in a `ButtonBase`-backed
  `Stack`) or its chevron icon specifically. Collapsing hides that card's
  rows but keeps its header (including status badges) visible, so a
  collapsed card still communicates its state at a glance. All three start
  expanded and there is no auto-collapse-on-completion behavior — that was
  tried and removed as a bug fix (see "Known issues / History" below):
  `creditInvestigationFullyVerified` / `financialEvaluationFullyVerified` /
  `appraisalFullyVerified` still exist and drive a small green check icon
  next to each card's title (requiring **every** document in that card to be
  `status === 'verified'`, stricter than the required-received gate used
  elsewhere on this page — a lingering `'needs-review'` item keeps the badge
  off), but none of them collapse anything anymore.
- **Rows sort outstanding-first within every card/sub-group/property group**
  — `sortByAttentionFirst()` (a small generic stable sort) reorders each
  list so every `needsAttention(doc)` row (`status !== 'verified'` — this
  intentionally covers `'missing'` and `'needs-review'` alike, since both
  need officer action) appears before every already-verified row, preserving
  original relative order within each group. This applies independently to
  Credit Investigation's two sub-groups, each Appraisal property group, and
  the Financial Evaluation list — so an officer chasing outstanding items
  never has to scan past a long run of already-verified rows to find what's
  left.

## The fixed document list (`requirement-checklist-docs.ts`)

`REQUIREMENT_DOC_META` covers **Credit Investigation and Financial
Evaluation only** — 24 independently stored rows across those two cards, the same list for
every application regardless of employment status, loan type, or any other
application field:

- **Credit Investigation** (14 documents, split into two named sub-groups —
  the only card with this nesting):
  - **Loan Credit Checking Documents**: CIC Check, CMAP Check, NFIS/BAP Check
    (all 3 required).
  - **Loan Requirements**: Bank Authorization Form (signed, required),
    POEA Contract (not required), Working Visa (required), Flight Details
    (required), Proof of Billing (required), Statement of Account (not
    required), Primary IDs of Mortgagor w/ 3 specimen signature (not
    required), Primary IDs of Spouse w/ 3 specimen signature (not required),
    Primary IDs Borrowers w/ 3 specimen signature (required),
    Additional/Other Documents (not required), TIN – Primary
    ID(Principal/consumer) (required).
- **Financial Evaluation** (10 documents, flat list): 6 months Bank Statement
  of Main Depository Bank (required), Certificate of Employment indicating
  status, service tenure and compensation breakdown (required), Individual
  Income Tax Return (2316) (not required), Latest two (2) months
  payslip/Proof of Income (not required), Photocopy of two (2) government
  issued IDs with three specimen signatures (not required), plus independent
  POEA Contract, Working Visa, Proof of Billing, Statement of Account, and
  Additional/Other Documents.

**Same-named documents are independent between cards.** Working Visa, Proof
of Billing, POEA Contract, Statement of Account, and Additional/Other
Documents appear in both cards but use distinct Financial Evaluation keys
(for example, `workingVisaFinancial`). Uploading or removing one row changes
only that exact row and never the similarly named row in another card.

Each `RequirementDocMeta` entry
carries `{ key, label, tabs, subgroup?, required, freshStatus, freshNote }` —
`subgroup` (`'loanCreditChecking' | 'loanRequirements'`) is only set on
Credit Investigation's 14 documents; Financial Evaluation ignores it since it
renders a flat list. `freshStatus`/`freshNote` are the deterministic outcome
assigned the moment an admin uploads a file for that document while it's
`'missing'` (see `RequirementDocRow` below). These are fixed per document
key, never randomized — the same document key always produces the same
canned note.

## Appraisal: per-property (TCT/CCT), not part of the fixed list above

Appraisal is **not** part of `REQUIREMENT_DOC_META` — it's a repeatable,
officer-managed set of "property groups," because a borrower can pledge more
than one property as collateral, each with its own TCT/CCT number and its
own independent set of paperwork. This only models real-estate collateral;
other collateral types (vehicle, equipment, etc.) aren't represented here.

- **`APPRAISAL_DOC_META`** (`requirement-checklist-docs.ts`): a fixed
  8-document list — Photocopy of TCT/CCT (all pages), Photocopy of Tax
  Declaration, Photocopy of realty tax payment, Lot Plan/Floor Plan, Tax
  Mapping Authorization (all 5 required), plus Statement of Account, Primary
  IDs of Mortgagor w/ 3 specimen signature, and Additional/Other Documents
  (not required). This is a **leaner `AppraisalDocMeta` type** (`{ key,
  label, required, freshStatus, freshNote }`, no `tabs`/`subgroup`) since
  appraisal documents don't belong to Credit Investigation/Financial
  Evaluation's fixed-card metadata model.
- **Deliberately NOT shared with Credit Investigation's same-named
  documents.** Even though "Statement of Account," "Primary IDs of
  Mortgagor," and "Additional/Other Documents" have the same labels as
  entries in `REQUIREMENT_DOC_META`, the appraisal copies use different keys
  (`appraisalStatementOfAccount`, `appraisalPrimaryIdsMortgagor`,
  `appraisalAdditionalOtherDocuments`) and are fully independent per property
  group — a decision made explicitly when this was built, since each
  property's paperwork is its own thing, not the same physical document as
  the borrower's general Credit Investigation/Financial Evaluation
  submissions.
- **`AppraisalTctGroup`** (`src/auth/admin-context.tsx`): `{ id, tctNumber,
  documents: RequirementDoc[] }` — one group per pledged property, each with
  its own full copy of the 8 `APPRAISAL_DOC_META` documents (generated by
  `createAppraisalGroupDocuments()`). `RequirementChecklist.appraisalGroups:
  AppraisalTctGroup[]` starts with **one seeded group** (`TCT-2024-00981`,
  mostly received except `taxMappingAuthorization` — same pre-populated demo
  pattern as `createInitialRequirementDocuments()`), not empty, so a fresh
  session isn't permanently blocked from endorsing.
- **Officer-managed, not fixed.** The Appraisal card has a "TCT/CCT number"
  text field + **Add Property** button (`addAppraisalGroup(tctNumber)`) that
  render in a dedicated **Add collateral property** panel with an icon,
  purpose copy, exact-number helper text, document-field icon, and responsive
  primary action. The controls stack vertically on small screens. Input is
  normalized case-insensitively for duplicate detection; an existing TCT/CCT
  shows inline validation and disables Add Property. The panel uses compact
  16px internal padding, a consistent gap below the Appraisal header, aligned
  42px controls, and a reduced gap before the property-group list. Adding a
  property appends a new group with all 8 documents starting `missing`, and each
  group has its own trash-icon **Remove Property** button
  (`removeAppraisalGroup(groupId)`) that deletes the whole group and its
  documents. `updateAppraisalGroupDoc(groupId, docKey, data)` patches a
  single document within one specific group (used by that group's Upload /
  Remove / Mark as Reviewed actions) — every mutation targets one group by
  `id`, never all groups at once.
- **Each property group collapses independently.** Clicking its TCT/CCT header
  or right-side chevron hides only that property's document rows while keeping
  the title number, uploaded/total document-count badge (for example,
  `6/8 documents`), chevron, and remove action visible.
  New groups start expanded; removed group ids are pruned from the local
  collapse-state map.
- **Gating: at least one *complete* group is required to endorse, unless
  marked Not Applicable.** `appraisalGroupsComplete`
  (`requirement-checklist-view.tsx`) is true only when
  `appraisalGroups.length > 0` AND every single group has all 5 required
  appraisal documents received (`status !== 'missing'`) — one incomplete
  property is enough to withhold the appraisal-required credit entirely from
  the header counter, even if every other group is fully complete. Zero
  groups is not treated as "no appraisal requirement" by default — it's
  treated as incomplete, since every application is assumed to have at least
  one pledged property, UNLESS the officer has explicitly marked Appraisal
  Not Applicable (see below), which is the one way to reach a passing state
  with zero properties.

### Not Applicable: the escape hatch for applications with no real-estate collateral

`RequirementChecklist.appraisalNotApplicable: boolean` (default `false`) —
an explicit officer declaration that this application has no real-estate
collateral to appraise at all. Toggled via a system-styled outlined button in
the Appraisal card's header (icon, indigo border, rounded corners, and hover
state) that relabels itself: **"Set as Not Applicable"** when
`false`, **"Mark as Applicable"** when `true` (re-clicking the same button
flips it back — there's no separate undo control).

- **Existing property groups do not block the toggle and are never deleted.**
  If groups exist, Set as Not Applicable opens a confirmation explaining that
  all property records/uploads will be preserved. Confirming only changes the
  applicability flag and hides the groups. Mark as Applicable restores the
  same records immediately, making the state reversible without destructive
  cleanup.
- **When `true`, Appraisal is fully excluded from every count** — not just
  hidden from view. `totalRequiredCount`/`receivedRequiredCount`
  (`requirement-checklist-view.tsx`) drop `appraisalRequiredMeta.length`
  from the denominator entirely rather than crediting it as satisfied; the
  Endorse gate (`allRequiredReceived`) can now pass on Credit
  Investigation/Financial Evaluation alone. `buildRequirementChecklistSummary`
  (`requirement-checklist-risk.ts`) takes the same `appraisalNotApplicable`
  boolean as its final parameter — when true it treats `appraisalDocs` as an
  empty array for every count (`effectiveAppraisalDocs`), skips the
  "at least one property" missing-requirement penalty entirely, and omits the
  "at least one property (TCT/CCT group)" note from the AI Recommendation's
  outstanding-items list.
- **UI when `true`**: the Add Property form and the property list are both
  hidden, replaced by a banner explaining that existing records are preserved
  and will return when Appraisal is marked applicable again. No
  property-count chip is shown in the card header in this state either.
- **"Fill with Sample Data" always sets `appraisalNotApplicable: false`**
  (it adds a fresh property group, which is the opposite state) and **"Remove
  Sample Data" also resets it to `false`** (clearing back to the same blank
  slate a fresh session would have — no groups, not marked Not Applicable,
  ready for the officer to choose either path).

### Appraisal card UX details

- **Property-count chip** next to the card title (visible only when there
  are groups and Appraisal isn't Not Applicable): "N property"/"N
  properties," colored green when `appraisalGroupsComplete`, amber
  otherwise — a way to see at a glance whether *any* property still needs
  attention without scanning every row.
- **Per-group document-count chip** ("N/8 documents," same green/amber
  coloring) next to each group's TCT number, computed from that group's own
  documents only.
- **Empty state** (no groups, not Not Applicable) is a dashed-border box
  with a house icon and copy that explicitly surfaces the Not Applicable
  option ("...or mark this application as not applicable if there is no
  real-estate collateral"), so the option is discoverable from the very
  first empty-state view, not just from the header button.

## `RequirementDoc` state shape (`src/auth/admin-context.tsx`)

```ts
RequirementDoc        { key, status, aiNote, fileName, fileUrl, uploadedAt,
                        uploadedBy, remarks, reviewed }
                       — status: 'verified' | 'needs-review' | 'missing'
AppraisalTctGroup     { id, tctNumber, documents: RequirementDoc[] }
OutreachMessage       { id, channel: 'email' | 'whatsapp' | 'viber', text, sentAt }
RequirementChecklist  { documents: RequirementDoc[], appraisalGroups: AppraisalTctGroup[],
                        appraisalNotApplicable: boolean, outreachMessages: OutreachMessage[],
                        collateralNotes, endorsed, returnedToApplicant, returnReason }
```

`uploadedBy` and `reviewed` support the officer review workflow. `uploadedBy`
records the officer's name (from `AdminUser`, falling back to `'Credit
Officer'`) at upload; `reviewed` is the officer's reviewed-and-accepted
confirmation, independent of `status` (see `RequirementDocRow` below for how
the two differ). Every document mutation — upload, remove, and reviewed
handlers and their Appraisal-group equivalents — sets both fields
explicitly: upload sets `uploadedBy` to the current officer and resets
`reviewed: false` (a newly-uploaded file hasn't been reviewed yet, even if it
replaces a previously-reviewed one); remove clears both fields along with
the other upload metadata.

`review.requirementChecklist.documents` is one `RequirementDoc` per entry in
`REQUIREMENT_DOC_META` (matched by `key`), created fresh per session by
`createInitialRequirementDocuments()`. The starting state pre-populates every
document as already received except two — `incomeTaxReturn` and
`taxMappingAuthorization` — which start as `status: 'missing'`
(`DOCS_STARTING_MISSING`), so there's always at least one outstanding item to
upload and endorse past on first load. Received documents get a sample
filename + that document's `freshStatus`/`freshNote` already applied,
`uploadedAt` backdated to epoch, `uploadedBy: 'Ramon Cruz'`, `reviewed:
false`. Only `taxMappingAuthorization` is `required: true` of the two
starting-missing documents, so the header counter starts partway rather than
at the full required count.

`review.requirementChecklist.appraisalGroups` starts with one seeded group
(`createAppraisalGroup('TCT-2024-00981', true)`) — see "Appraisal:
per-property" above for its own pre-populated pattern (mostly received,
`taxMappingAuthorization` starts missing there too).

`readStoredState()`'s localStorage migration (`admin-context.tsx`) merges
stored `documents`/`appraisalGroups` onto the fresh default set **by `key`/
`id`**, rather than trusting a stored array wholesale — a session saved
before a doc-list or field-shape change (new keys, new fields like
`uploadedBy`/`reviewed`) would otherwise carry forward a stale/incomplete
array missing them.

## `RequirementDocRow` (`src/sections/admin/requirement-doc-row.tsx`)

One row per document renders a compact file-review workflow: checkbox (missing
docs show a status icon) · document label · that uploaded document's short AI
summary directly below the title, personalized with the applicant's full name
(`The {document label} for {applicant} was reviewed. {aiNote}`) · filename/upload attribution · optional
one-line remarks preview · explained status chip · Accepted chip · View file ·
three-dot actions. There is no separate AI panel, and missing rows remain clean
until a file is uploaded.
`meta` accepts either `RequirementDocMeta` (Credit Investigation/Financial
Evaluation) or the leaner `AppraisalDocMeta` (Appraisal groups) — the
component only reads `required`/`label`/`freshStatus`/`freshNote`, fields
both types share, so the same row renders either kind without a type
discriminator:

- **Verified / Needs review** → completed documents do not show a Verified
  chip. **Needs review** remains visible when the deterministic automated check
  found an item requiring attention, with a tooltip explaining the state.
  Checking the checkbox records reviewed-and-accepted immediately; remarks
  remain optional in the three-dot menu. **View** opens the document file URL in a
  new tab. Seeded and sample-fill records use
  `public/assets/documents/sample-local-pdf.pdf`, copied from the supplied
  `sample-local-pdf.pdf`, so their View actions open a real sample PDF.
  The checkbox toggles reviewed-and-accepted immediately and does not open the
  remarks workflow. The three-dot menu contains the optional **Add/Edit
  remarks** action and **Delete document**.
  Delete resets the record to missing and releases its temporary object URL.
- **Missing** → **Upload** button opens a real hidden `<input type="file"
  accept="image/*,.pdf">` file picker. Picking a file does **not** read or
  parse the file's contents — it deterministically assigns that document's
  `meta.freshStatus`/`meta.freshNote` (from `requirement-checklist-docs.ts`),
  records the picked file's own `name` as `fileName`, stamps `uploadedAt: new
  Date().toISOString()`, creates a temporary browser `fileUrl`, sets
  `uploadedBy` to the current officer, and resets `remarks`/`reviewed`. A
  document that starts "needs review" stays "needs
  review" after upload if that's its `freshStatus` — uploading a file for a
  missing document does not automatically mean "verified."

## Progress counter and Endorse-gating rule

The header counter (`{receivedRequiredCount}/{totalRequiredCount}`) and the
progress bar count **required documents across Credit
Investigation/Financial Evaluation's fixed list AND every Appraisal
group's required documents together** — one combined fraction, not one per
card. A document counts as "received" whenever its `status !== 'missing'` —
`'needs-review'` counts as received for this purpose, only `'missing'`
doesn't.

**Appraisal contributes to this count only as a complete unit.**
`appraisalGroupsComplete` is true only when at least one group exists AND
every single group has all 5 required appraisal documents received — if even
one group is missing a required document, **none** of the appraisal required
count is added to `receivedRequiredCount` (not "credit for the complete
groups minus the incomplete one" — all-or-nothing across every group). Zero
groups is treated as incomplete, not "not applicable" — every application is
assumed to have at least one pledged property.

**The Endorse button is gated the same way:** `allRequiredReceived =
receivedRequiredCount === totalRequiredCount`. This means a required document
sitting at `'needs-review'` does **not** block endorsement — only a required
document still `'missing'` (in either the fixed list or any Appraisal group)
does. Non-required documents (e.g. `statementOfAccount`) never factor into
the counter or the gate regardless of their status. "Ready to endorse?" card
copy switches between "All required documents are on file — ready to
endorse" and "Clear the N outstanding item(s) above" based on this same
`allRequiredReceived` boolean.

## "Fill with Sample Data" / "Remove Sample Data" page action

Registered as a page action into the shared settings popover (see
`page-actions-context.tsx`/`PROJECT_OVERVIEW.md`'s "Page actions" section),
same pattern as Initial Credit Checking's and Call Report's sample-data
actions, no `NODE_ENV` gate. Label and behavior are driven by
`allRequiredReceived` (the same boolean gating the Endorse button):

- **While incomplete** → "Fill with Sample Data": sets every fixed
  document's (Credit Investigation + Financial Evaluation) `status`/`aiNote`
  to its `meta.freshStatus`/`meta.freshNote`, gives it a sample filename,
  today's `uploadedAt`, `uploadedBy` set to the current officer, and
  `reviewed: false` — **and** replaces `appraisalGroups` with a single fresh
  group (`TCT-2024-00981`) with all 8 of its documents filled the same way,
  and sets `appraisalNotApplicable: false` (in case the checklist was
  previously marked Not Applicable). One click reaches
  `allRequiredReceived === true` and enables Endorse.
- **Once complete** → "Remove Sample Data": resets every fixed document back
  to `missing` (clearing `fileName`/`uploadedAt`/`uploadedBy`/`aiNote`,
  `reviewed: false`), **clears `appraisalGroups` to `[]` entirely** — not
  just resetting each group's documents to missing, since the toggle's
  "blank" state for Appraisal is having no properties added at all — and
  resets `appraisalNotApplicable: false` too, so "Remove Sample Data" always
  lands on the exact same blank slate a brand-new session starts from.

This action's `useRegisterPageActions` call sits **before** the
`if (!signUpData) return null;` guard (moved down for this reason) — the
guard only exists to gate rendering on the borrower's registration data,
which `handleFillSampleData`/`handleClearSampleData` and
`allRequiredReceived` don't need, but React's rules-of-hooks require the
hook call to run unconditionally on every render regardless.

## "Fill Sample Data (All Correct)" page action

A second, always-visible page action alongside "Fill with Sample Data" /
"Remove Sample Data" above (same popover, key `sample-data-all-correct`).
Where "Fill with Sample Data" seeds a realistic mix of Verified/Needs Review
per each document's `meta.freshStatus`, this one forces **every** document —
every fixed Credit Investigation/Financial Evaluation entry and every
document in the single fresh Appraisal group it creates — to `'verified'`
unconditionally, with `reviewed: false`.
One click reaches an immediately-endorsable, fully-verified state with no
`needs-review` or `missing` documents anywhere, without needing to also
review/toggle each row by hand. It does not toggle labels or clear back to
blank the way "Fill with Sample Data"/"Remove Sample Data" do — it always
fills; clearing back to blank is still "Remove Sample Data"'s job.

## Request Documents drawer (`src/sections/admin/request-documents-drawer.tsx`)

A **"Request Documents"** button in the progress card's header (next to the
"Collect and verify..." copy) opens `RequestDocumentsDrawer` — a right-anchored
`Drawer`, modeled directly on `src/layouts/admin/hai-chat-drawer.tsx`'s layout
(header / scrollable message list / composer), simulating an outreach to the
applicant requesting outstanding documents. This is the second messaging-style
drawer in the admin app; unlike `HaiChatDrawer` (a single global instance
mounted in `AdminHeader`, one AI conversation), this one is local to
`RequirementChecklistView` and keyed to the current application's
`review.requirementChecklist.outreachMessages`.

- **Still-outstanding banner**: the drawer's top section always shows every
  currently-missing document's label (same `missingDocLabels` computation the
  button's disabled-state and the old confirm-dialog content used — see
  "Request Documents" gating below), regardless of channel or draft state.
  This does not require a message to have been sent; it's a live read of the
  current checklist, refreshed every time the drawer re-renders.
- **Channel selector**: three `Chip`s (Email / WhatsApp / Viber, via
  `mdi:whatsapp` and `simple-icons:viber` Iconify icons — chosen for
  brand-accurate logos over generic phone/mail icons), single-select, default
  `'email'`. Selecting a channel only changes which channel the next sent
  message is tagged with — it does not filter or change the message history
  shown above.
- **Auto-filled draft**: opening the drawer pre-fills the composer with
  `Outreach sent. Requested: <label>, <label>, ....` built from the current
  missing-document labels (`buildOutreachText`) — the officer can edit this
  freely before sending, or send it as-is. Re-opening the drawer re-runs this
  fill (via a `useEffect` keyed on `open`), so it always reflects whatever is
  missing *right now*, not what was missing the last time the drawer was
  opened.
- **Message history**: every sent message becomes a right-aligned navy bubble
  (channel icon + label, message text, formatted send time) appended to
  `outreachMessages` via `addOutreachMessage({ channel, text })`
  (`admin-context.tsx`) — this generates the `id`/`sentAt` itself, so the
  caller only supplies `channel` and `text`. Enter sends (Shift+Enter for a
  newline), same convention as `HaiChatDrawer`'s composer.
- **No real message is ever sent on any channel** — consistent with every
  other "outreach"/notification affordance in this prototype (see "Fabricated
  claims" below). The composer's helper text says so explicitly ("Prototype
  outreach only. No real message is sent.").
- **The progress card's banner** (below the progress bar) shows only when
  `outreachMessages.length > 0`, deriving from the array's last entry:
  "Last requested `<date>` via `<channel>` · N message(s) sent." The whole
  banner is a `ButtonBase` that reopens the drawer — a quick way back into the
  full history without hunting for the header button again.
- **The "Request Documents" button is never disabled** — even with zero
  missing documents, the drawer still opens (showing an empty
  still-outstanding section and no pre-filled draft) so the officer can send
  an ad hoc message to the applicant at any time, not only when something is
  missing.

## AI summary/recommendation derivation (`requirement-checklist-risk.ts`)

`buildRequirementChecklistSummary(documents, docMeta, monthlyIncome,
desiredLoanAmount, appraisalDocs, appraisalDocMeta, hasAppraisalGroups,
appraisalNotApplicable)` is a pure function, recomputed at render time, never
stored — same pattern as `initial-credit-checking-risk.ts`'s
`buildInitialAiRecommendation`. The caller (`requirement-checklist-view.tsx`)
passes `appraisalGroups.flatMap(g => g.documents)` as `appraisalDocs` — every
group's documents flattened together, counted exactly like the fixed Credit
Investigation/Financial Evaluation documents (a missing document in any
group is still a missing document for this purpose; it's only the header
counter's "all groups must be complete" all-or-nothing rule that's stricter,
not this function's raw counting) — UNLESS `appraisalNotApplicable` is true,
in which case the function treats `appraisalDocs` as empty
(`effectiveAppraisalDocs`) for every count, regardless of what's actually
passed in. It returns `{ level, summary, recommendation }`:

- **AI Summary** is always the same shape of sentence: how many of the total
  documents (fixed list + every Appraisal group's documents combined) are on
  file, how many the "AI" verified vs. flagged for review vs. found missing,
  and a one-line income/loan-amount consistency check pulled straight from
  `application.financialInfo`.
- **Risk level** (`'good' | 'watch' | 'high'`) drives both the **AI
  Recommendation** card's background/text color and its label ("Ready" /
  "Almost ready" / "Not ready"):
  - `'high'` — at least one **required** document (fixed-list or
    appraisal) is still missing, OR `hasAppraisalGroups` is false and
    `appraisalNotApplicable` is also false (zero properties with no Not
    Applicable declaration counts as a missing requirement, forcing at
    least `'high'`).
  - `'watch'` — no required document is missing and (at least one property
    exists OR Appraisal is marked Not Applicable), but at least one document
    (required or not, anywhere) is `'needs-review'`.
  - `'good'` — every document across the fixed list and every Appraisal
    group is `'verified'`.
- **AI Recommendation** text lists every non-verified document by label
  (fixed-list and appraisal both, not just required ones) when there's
  outstanding work — appending "at least one property (TCT/CCT group)" to
  that list when `hasAppraisalGroups` is false — or a plain "Ready to
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
it uses the neutral secondary button treatment rather than a red destructive
style; **Endorse** remains the visually primary action. Clicking it opens a
`ConfirmDialog` with a required free-text reason field; **Confirm**
stays disabled until the reason is non-empty (after `.trim()`). Confirming
calls `setRequirementChecklist({ returnedToApplicant: true,
returnReason: reason })` and the view switches to a "Returned to applicant"
success screen (green check replaced with an amber undo icon), distinct from
but structurally identical to the "Endorsed for comprehensive process" success
screen shown after **Endorse**. Both success screens are the same `SuccessState`
component with different icon/copy props, and both link back to the
Application List. There is no borrower-facing notification anywhere in this
codebase — "Return to Applicant" is purely an officer-side state change with a
confirmation screen, not an actual message sent to anyone.

## Non-goals / History

- **Auto-collapse-on-completion was tried and removed as a bug fix.** An
  earlier version had each card's `useEffect` auto-collapse it the moment its
  `fullyVerified` boolean turned `true`. Bug: `appraisalFullyVerified` is
  `true` whenever `appraisalNotApplicable` is set (by design — see "Not
  Applicable" above), and the effect only ever called `setAppraisalCollapsed(true)`,
  never `false`. Toggling Appraisal from Not Applicable back to Applicable
  left the whole card — Add Property form, property list, everything —
  stuck collapsed behind its header, with no way back in except manually
  clicking the header itself. The same effect shape existed (dormant, never
  actually triggered by real data) on Credit Investigation and Financial
  Evaluation too. Fixed by removing all three `useEffect`s outright — cards
  now only ever collapse via the manual header click, never automatically.
  The `fullyVerified` booleans themselves were kept (they still drive each
  card's green check-icon badge), just disconnected from collapse state.
- **`rowRefs` is explicitly pruned when an Appraisal property group is
  removed** (`handleRemoveAppraisalGroup`, wrapping `removeAppraisalGroup`) —
  without this, the ref `Map` used for "jump to next outstanding item" keeps
  a reference to every row element from every property ever added and
  removed in the session, growing unbounded over a long session of
  add/remove cycles. Every other row-ref registration (Credit Investigation,
  Financial Evaluation) never needs pruning since those rows are permanent
  for the life of the page.
- **No conditional document sets — Credit Investigation/Financial Evaluation
  only; Appraisal is a deliberate, later exception.** The 19-document fixed
  list still does **not** vary by application — every borrower sees the same
  documents on those two cards regardless of employment status, loan type,
  income, or any other application field. This was a deliberate, explicit
  scope limitation from the original design spec (see
  `docs/superpowers/specs/2026-07-20-requirement-checklist-rebuild-design.md`'s
  "Non-goals"). Appraisal's per-property groups (see "Appraisal: per-property"
  above) are a later, explicitly-requested exception to that limitation, not
  a quiet erosion of it — the officer adding/removing TCT groups is a real,
  intentional per-application variation, scoped narrowly to real-estate
  collateral only.
- **Uploaded file viewing:** newly selected files use a browser object URL and
  View opens that actual file in a new tab. Object URLs do not survive a
  browser reload. Seeded records use the bundled sample PDF instead, including
  a localStorage migration from older `*-sample.pdf` metadata to the bundled
  asset URL.
- **Step numbering and page-level naming were deliberately kept, not
  "corrected" to match an earlier mockup — tab labels are the one exception,
  added later.** An earlier mockup for this screen used "Step 2" and "Credit
  Investigation" wording; the original rebuild explicitly kept this app's
  existing "Step 3 · Requirement Checklist" and "Endorse" language instead of
  adopting the mockup's. A later pass reintroduced the mockup's tab naming
  (`Credit Investigation` / `Appraisal` / `Financial Evaluation`) specifically
  for the three tabs — a deliberate, explicit reversal of that one naming
  choice, requested directly rather than rediscovered from the mockup. The
  page's own title and "Step 3 · Requirement Checklist" badge were
  unaffected — only the tab labels changed.
- This screen previously stored a flat `checkedItems` structure (a simple
  checked/unchecked list with no per-document status, category, AI note, or
  fixed metadata). It was fully replaced by the `RequirementDoc[]` model
  described above — there is no remaining reference to `checkedItems`
  anywhere in the codebase.
- **Collateral card removed.** The free-form "Collateral" notes card (a
  `collateralNotes: string` textarea, requested-but-adjust text) was removed
  from the page entirely, per direct request. `RequirementChecklist` still
  carries the `collateralNotes` field for any already-stored session data,
  but nothing in this view reads or writes it anymore — `handleEndorse` and
  `confirmReturn` no longer pass it to `setRequirementChecklist`, so it's
  simply frozen at whatever value a session already had, never touched
  going forward. Collateral information now lives entirely in Appraisal's
  per-property TCT groups instead.

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
