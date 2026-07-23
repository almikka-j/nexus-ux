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

The shared `ApplicationDetailsCard` is therefore always the first card on the
Requirement Checklist page. It uses the compact/modal variant
(`<ApplicationDetailsCard collapsible />`): borrower identity, application
number, assigned officer, six loan-summary fields, **View full application**,
**Initial credit checking result**, **View call report**, and **View all officer
notes**. The shared action row never wraps. **View full application** stays
visible at every width; Initial Credit Checking Result becomes visible when it
fits, followed by View Call Report and View All Officer Notes at wider desktop
widths. A bordered three-dot button contains only the actions hidden at the
current breakpoint and disappears once every action fits. **Initial credit
checking result** reuses
`CreditCheckingResultModal` with `recommendationEditable={false}`, so the
department's Recommendation & Remarks is read-only at this later process.
**View call report** opens
the shared read-only `CallReportResultModal`, showing call date/type/status,
identity confirmation, representatives, stored or derived Call Summary,
preliminary recommendation, and additional remarks. This remains first after
Endorse or Return to Applicant as well; the relevant success-state card follows
it and the Call Report action remains available.
Both prior-process report actions remain available.

Opening **View all officer notes** passes `Requirement Checklist` to the shared
`OfficerNotesDialog`. Officers can add a note directly inside the modal; the new
history entry automatically displays the officer name, date/time, note, and
Process = Requirement Checklist.

## Layout: three stacked cards, not tabs

The screen renders **Credit Investigation**, **Appraisal**, and **Financial
Evaluation** as three separate cards, one after another, all visible at
once — not as tabs behind a single switcher (an earlier iteration of this
screen used MUI `Tabs`; that was replaced with plain stacked cards per
direct request). Card labels deliberately use this earlier design mockup's
naming (`Credit Investigation` / `Appraisal` / `Financial Evaluation`),
superseding the "keep app wording" note in the History section below, which
now only applies to the page's own title/step badge, not these card labels.

## Page-wide UX: sticky summary bar, collapsible cards, status-first sorting, jump-to-outstanding

Four related additions aimed at making the long, multi-card page easier to
navigate once documents start piling up (all in `requirement-checklist-view.tsx`):

- **Sticky mini summary bar** — a condensed bar (`position: sticky, top: 68`,
  `zIndex: 2`, sitting just below `AdminNavHorizontal`'s own sticky top bar)
  rendered above the full progress card, containing the same
  `{receivedRequiredCount}/{totalRequiredCount}` counter, the same progress
  fill, an "N outstanding" button, and the "Request Documents" button. It
  stays visible while scrolling through the three document cards so the
  officer never has to scroll back up to check overall progress or open the
  Request Documents drawer. The full, non-sticky progress card below it is
  unchanged and still the first thing shown on load.
- **Each document card collapses independently** — `creditInvestigationCollapsed`
  / `appraisalCollapsed` / `financialEvaluationCollapsed`, one `useState` per
  card, toggled by clicking anywhere in that card's header (wrapped in a
  `ButtonBase`-backed `Stack`) or its chevron icon specifically. Collapsing
  hides that card's rows but keeps its header (including status badges)
  visible, so a collapsed card still communicates its state at a glance.
- **Cards auto-collapse the moment they become fully verified** — stricter
  than the required-received gate used elsewhere on this page:
  `creditInvestigationFullyVerified` / `financialEvaluationFullyVerified` /
  `appraisalFullyVerified` all require **every** document in that card to be
  `status === 'verified'` (not merely "not missing" — a lingering
  `'needs-review'` item keeps the card open and un-collapsed). Each is driven
  by its own `useEffect` that only ever sets the collapse state to `true`
  when the completeness boolean flips to `true` — it never force-expands a
  card, so a manual collapse the officer chose earlier is left alone, and
  collapsing never happens on first load just because a card already
  happened to be complete when the page opened. `appraisalFullyVerified` is
  also `true` whenever `appraisalNotApplicable` is set, consistent with that
  state's exclusion everywhere else on this screen. A small green check
  icon appears next to the card title whenever its fully-verified boolean is
  true, regardless of collapse state.
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
- **"Jump to outstanding" cycles through every pending row on the page** —
  `outstandingRowIds` is a flat list, in on-page visual order (Credit
  Investigation → every Appraisal group → Financial Evaluation), of every
  row currently needing attention; Appraisal row ids are namespaced
  `${group.id}:${meta.key}` since the same document key repeats across
  groups. Clicking the sticky bar's "N outstanding" button
  (`handleJumpToOutstanding`) expands whichever card owns the next id in the
  cycle (if collapsed), then smooth-scrolls that specific row into view via
  a `rowRefs` map of `HTMLDivElement` refs keyed by the same row id — one ref
  per row, registered by every `RequirementDocRow`'s wrapping `Box`. Each
  click advances `jumpCursor` and wraps back to the first item once past the
  end, so repeated clicks tour every outstanding row in order rather than
  re-scrolling to the same one.

## The fixed document list (`requirement-checklist-docs.ts`)

`REQUIREMENT_DOC_META` covers **Credit Investigation and Financial
Evaluation only** — 19 documents across those two cards, the same list for
every application regardless of employment status, loan type, or any other
application field:

- **Credit Investigation** (14 documents, split into two named sub-groups —
  the only card with this nesting):
  - **Loan Credit Checking Documents**: CIC Check, CMAP Check, NFIS/BAP Check
    (all 3 required).
  - **Loan Requirements**: Bank Authorization Form (signed, required),
    POEA Contract (not required — shared with Financial Evaluation), Working
    Visa (required — shared with Financial Evaluation), Flight Details
    (required), Proof of Billing (required — shared with Financial
    Evaluation), Statement of Account (not required — shared with Financial
    Evaluation), Primary IDs of Mortgagor w/ 3 specimen signature (not
    required), Primary IDs of Spouse w/ 3 specimen signature (not required),
    Primary IDs Borrowers w/ 3 specimen signature (required),
    Additional/Other Documents (not required — shared with Financial
    Evaluation), TIN – Primary ID(Principal/consumer) (required).
- **Financial Evaluation** (11 documents, flat list): 6 months Bank Statement
  of Main Depository Bank (required), Certificate of Employment indicating
  status, service tenure and compensation breakdown (required), Individual
  Income Tax Return (2316) (not required), Latest two (2) months
  payslip/Proof of Income (not required), Photocopy of two (2) government
  issued IDs with three specimen signatures (not required), plus the shared
  POEA Contract, Working Visa, Proof of Billing, Statement of Account, and
  Additional/Other Documents.

**Documents shared between these two cards are one underlying document, not
duplicates.** Working Visa, Proof of Billing, POEA Contract, Statement of
Account, and Additional/Other Documents each appear on both cards — but each
has exactly **one** `RequirementDocMeta` entry (one `key`, so one
`RequirementDoc` in state). `RequirementDocMeta.tabs: RequirementDocTab[]`
(named `tabs` from this screen's earlier tab-based iteration; kept as-is
rather than renamed for a naming-only change) lists every card a document
belongs to — `RequirementDocTab` is now just `'creditInvestigation' |
'financialEvaluation'`. The view filters `REQUIREMENT_DOC_META` by
`meta.tabs.includes('financialEvaluation')` etc. rather than by a single
owning category. Uploading a shared document on one card updates the same
underlying `RequirementDoc`, so the other card that also lists it
immediately shows the new status — there is no way for the same real-world
document to read "uploaded" on one card and "missing" on the other.

12 of the 19 documents are `required: true`. Each `RequirementDocMeta` entry
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
  Evaluation's shared-tab model at all.
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
  appends a new group with all 8 documents starting `missing`, and each
  group has its own trash-icon **Remove Property** button
  (`removeAppraisalGroup(groupId)`) that deletes the whole group and its
  documents. `updateAppraisalGroupDoc(groupId, docKey, data)` patches a
  single document within one specific group (used by that group's Upload /
  Remove / Mark as Reviewed actions) — every mutation targets one group by
  `id`, never all groups at once.
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

- **The toggle button is disabled while any Appraisal group exists**
  (`disabled={!appraisalNotApplicable && hasAppraisalGroups}`) — the officer
  must remove every property first via each group's trash icon before they
  can mark the application Not Applicable. This is a deliberate guard against
  accidentally discarding in-progress property data: there is no
  confirmation dialog, and marking Not Applicable while groups exist would
  otherwise silently orphan real uploaded documents that no longer show
  anywhere in the UI.
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
  hidden, replaced by a single banner row ("Marked as not applicable — this
  application has no real-estate collateral to appraise.") with a check
  icon. No property-count chip is shown in the card header in this state
  either.
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
- **Per-group required-count chip** ("N/5 required," same green/amber
  coloring) next to each group's TCT number, computed from that group's own
  documents only — lets an officer spot which specific property is holding
  up the overall Appraisal completeness when there are several.
- **Empty state** (no groups, not Not Applicable) is a dashed-border box
  with a house icon and copy that explicitly surfaces the Not Applicable
  option ("...or mark this application as not applicable if there is no
  real-estate collateral"), so the option is discoverable from the very
  first empty-state view, not just from the header button.
- **Helper text changes when groups exist**: the intro line under the card
  title appends "Remove every property below to mark this application as not
  applicable." only when `hasAppraisalGroups` is true — explaining *why* the
  header toggle is currently disabled, right where the officer would
  otherwise be confused by a greyed-out button.

## `RequirementDoc` state shape (`src/auth/admin-context.tsx`)

```ts
RequirementDoc        { key, status, aiNote, fileName, uploadedAt, uploadedBy, reviewed }
                       — status: 'verified' | 'needs-review' | 'missing'
AppraisalTctGroup     { id, tctNumber, documents: RequirementDoc[] }
OutreachMessage       { id, channel: 'email' | 'whatsapp' | 'viber', text, sentAt }
RequirementChecklist  { documents: RequirementDoc[], appraisalGroups: AppraisalTctGroup[],
                        appraisalNotApplicable: boolean, outreachMessages: OutreachMessage[],
                        collateralNotes, endorsed, returnedToApplicant, returnReason }
```

`uploadedBy` and `reviewed` were added alongside the AI summary/date-display
work below — `uploadedBy` records the officer's name (from `AdminUser`,
falling back to `'Credit Officer'`) at the moment of upload; `reviewed` is
the officer's own "I looked at this" confirmation, independent of `status`
(see `RequirementDocRow` below for how the two differ). Every document
mutation — `handleUploadDoc`, `handleRemoveDoc`, `handleToggleReviewed`, and
their Appraisal-group equivalents — sets both fields explicitly: upload sets
`uploadedBy` to the current officer and resets `reviewed: false` (a
newly-uploaded file hasn't been reviewed yet, even if it replaces a
previously-reviewed one); remove clears `uploadedBy`/`reviewed` back to
`null`/`false` along with the other fields.

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

One row per document, rendering: a checkbox (missing docs show a status icon
instead, since there's nothing to review yet) · the document label (prefixed
with a red `*` when `meta.required`) · the AI note, if any · "Uploaded
{date} by {uploadedBy}" (missing docs omit this line) · a status chip ·
a "Reviewed" chip when `doc.reviewed` · and one or two action buttons.
`meta` accepts either `RequirementDocMeta` (Credit Investigation/Financial
Evaluation) or the leaner `AppraisalDocMeta` (Appraisal groups) — the
component only reads `required`/`label`/`freshStatus`/`freshNote`, fields
both types share, so the same row renders either kind without a type
discriminator:

- **Verified / Needs review** → the **checkbox toggles `reviewed`**
  independently of `status` — this is the officer's own "Mark as Reviewed"
  confirmation, separate from the AI's Verified/Needs Review read (a
  document can be AI-verified but not yet officer-reviewed, or reviewed but
  still flagged needs-review). **View** opens a lightweight `Dialog` showing
  the filename, status chip, Reviewed chip (if set), upload date/uploader,
  and AI note. There is no real document viewer anywhere in this app — this
  is filename + note only, not a rendered file. A trash-icon **Remove**
  button resets the document straight back to `missing` (clearing
  `fileName`/`uploadedAt`/`uploadedBy`/`aiNote`/`reviewed`) with no
  confirmation dialog — re-uploading is one click away if removed by
  mistake.
- **Missing** → **Upload** button opens a real hidden `<input type="file"
  accept="image/*,.pdf">` file picker. Picking a file does **not** read or
  parse the file's contents — it deterministically assigns that document's
  `meta.freshStatus`/`meta.freshNote` (from `requirement-checklist-docs.ts`),
  records the picked file's own `name` as `fileName`, stamps `uploadedAt: new
  Date().toISOString()`, sets `uploadedBy` to the current officer, and resets
  `reviewed: false`. A document that starts "needs review" stays "needs
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
it opens a `ConfirmDialog` with a required free-text reason field; **Confirm**
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
- **No real document viewer.** "View" shows filename + AI note in a simple
  dialog, never an actual rendered file — consistent with the rest of this
  prototype's upload handling (see `docs/BORROWER_SIGNUP_FLOW.md` and
  `docs/ADMIN_INITIAL_CREDIT_CHECKING.md` for the same pattern elsewhere).
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
