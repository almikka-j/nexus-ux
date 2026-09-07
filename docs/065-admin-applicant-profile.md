# Admin — Applicant Profile

> **Maintenance rule:** update this file whenever `applicant-profile-view.tsx`
> changes — new/removed sections, changed fabricated-history rules, changed
> routing, or changes to how it's reached from `application-list-view.tsx`.
> Companion to `docs/230-project-overview.md` and `docs/070-account-solicitation-initial-credit-checking.md`
> (source of `bureauFindingStatus`/`stepTimestamps` referenced below).

## What this is

A read-only **borrower profile** — "who is this person, and what loans have
they applied for" — rendered by `ApplicantProfileView`
(`src/sections/admin/applicant-profile-view.tsx`) at
`/admin/applications/profile/[email]`.

It is deliberately a *person* profile, not an *application* detail screen:
loan-specific figures (amount, purpose, employment, income) live on each row
in the Loan History table, not mixed into the person's own details. This is
the second iteration of this screen — see "History" below for what changed
and why.

## How it's reached

Clicking an applicant's **name** in `ApplicationListView`
(`application-list-view.tsx`'s `handleNameClick`) opens this profile —
independent of clicking elsewhere on the row, which still routes to the
applicant's current review-step screen (Initial Credit Checking / Call
Report / etc.) for actionable rows only. This split matters: the row click
is a *work* action (go review this step), the name click is an *inspect*
action (go see who this person is), and they can both exist on the same row
without conflicting (`stopPropagation` on the name's `onClick`).

`paths.admin.applicantProfile(email)` builds the route.

## Two data sources, one component

`ApplicantProfileView` resolves `email` against two possible sources and
renders identically either way:

- **The live applicant** (`isLive = liveSignUpData?.email === email`) — real
  data from `useRegistration()` (`signUpData`/`application`) and
  `useAdmin()`'s `review` (for `stepTimestamps`/`assignedOfficer` context).
  This is the only applicant with genuine multi-step review history, since
  `AdminContext.review` is a single global slot, not keyed per-applicant.
- **A sample applicant** — looked up in `SAMPLE_APPLICATIONS`
  (`sample-applications.ts`) by email. No `review` state exists for these;
  a persistent `Alert` states "there's nothing to approve or submit here."

If neither resolves, the page renders "Application not found."

**History:** this component used to be sample-only (`SampleApplicationView`,
`sample-application-view.tsx`, route `/admin/applications/sample/[email]`),
with an application-history section built as a **step timeline** from
`review.stepTimestamps` (only meaningful for the live applicant — sample
rows only ever got one entry, their fixture's parked step). It was
generalized to also handle the live applicant, then further reworked when it
became clear "application history" should mean *loans this person has
applied for* (a per-loan record), not *review steps this one application has
passed through* (a per-step record) — see "Loan History" below.

## Page layout

1. **Back link** — "← Application List" (`paths.admin.applications`).
2. **Sample-only info `Alert`** — only when `!isLive`.
3. **User details card** (`adminCardSx`) — see below. First card; leads with
   the person's identity.
4. **Loan History card** — see below.

**History:** the person-identity header (avatar, name, email/mobile) used to
be its own standalone block above both cards, separate from the "User
details" card below it (which then repeated full name/email/mobile as its
own `DetailField`s under a "Contact" heading) — visually three chunks doing
overlapping work. It was merged into a single header *inside* the User
details card (no more duplicate contact fields), and User details was moved
ahead of Loan History so the page reads person-first, loans-second.

### User details card

- **Header**: circular avatar (first initial, deterministic per-email color
  via a local `getAvatarPalette` — same hash technique/palette as
  `application-list-view.tsx`'s own `getAvatarPalette`, kept as a separate
  local copy rather than shared, matching this codebase's convention
  elsewhere), full name (prefix/middle/extension composed in), a "Sample"
  chip when `!isLive`, and two contact lines (email, mobile as
  `+63 {mobile}`) — no `DetailField` duplicates these; the header is the only
  place they render.
- **Personal & ID information** (only when `application.personalInfo`
  exists): gender, civil status, ID type/number, TIN, address
  (address/barangay/city/province), referral source, and agent code (only
  when `referralSource === 'Agent'`).
- **Uploaded documents** (same `personalInfo` guard): ID front/back, selfie,
  business document — see "Document preview pattern" below.

No loan-specific data (loan number, type, current step, officer) renders in
this card — see "Loan History" for where that context lives instead.

**Collapsible.** A chevron `ButtonBase` at the end of the header row toggles
local `detailsExpanded` state (`useState(true)`, defaults open), wrapping
Personal & ID information + Uploaded documents in an MUI `Collapse`. The
avatar/name/contact header itself never collapses — that's the card's
identity, not detail to hide. The chevron only renders when
`personalInfo` exists (nothing to collapse otherwise). This is a local,
purpose-built toggle rather than the shared `CollapsibleSection`
(`src/components/collapsible-section/`) used elsewhere in the admin app,
since that component's header is a plain string title — it can't host the
avatar/name/contact block this card's header actually is.

## Loan History

A table (`LoanHistoryTable`) with columns Loan No. / Type & Purpose / Amount
/ Status / Date, always showing the **current (in-progress) loan as the
first row**, using real data:

- `loanNumber`: `getLoanNumber(signUpData.email)`.
- `loanType`/`purpose`/`amount`: from `application.loanType`/
  `financialInfo.loanPurpose`/`financialInfo.desiredLoanAmount`.
- `statusLabel`: the current step's label (`STEP_LABELS[currentStep]`),
  tone `'info'`.
- `dateLabel`: `application.submittedAt`, formatted, or `'—'`.

`currentStep` is derived differently per source: for the live applicant, the
most recently entered step per `review.stepTimestamps` (filtered/ordered by
a local `PIPELINE_STEP_ORDER`, defaulting to `'creditChecking'` if nothing's
been entered yet); for a sample row, its fixed `sampleEntry.step`.

The card header also shows this same `currentStep` as a pill ("Currently at
{label}") and, when present, a line combining `assignedOfficer` and
`formatAging(submittedAt)` ("In review for...") — this is the loan-specific
context that used to live in the person header before the redesign.

### Fabricated past loans

**This prototype tracks exactly one real application per borrower** — there
is no "multiple loans over time" data model anywhere in
`RegistrationContext` or `AdminContext`. Since Loan History is genuinely
meant to be a per-loan record, `buildPastLoans(email)` deterministically
fabricates 0–2 past, closed loans per email:

- Seeded by a local `hashSeed()` (same technique as `getLoanNumber()`/
  `simulateBureauFinding()` — a running `hash * 31 + charCode` accumulator,
  **not** `Math.random()`), so a given borrower always shows the same fake
  history on every reload rather than a new one each visit.
- Count (`baseHash % 3`): 0, 1, or 2 past loans.
- Each entry (seeded independently as `` `${email}:${index}` ``): a
  `PGFC-######` loan number, alternating `personal`/`business` type, a
  purpose from a fixed `PAST_LOAN_PURPOSES` list, an amount in
  ₱50,000–₱440,000, a status of `'Paid Off'` (80% of entries) or
  `'Cancelled'` (20%, `entryHash % 5 === 0`), and `closedYearsAgo` (1–3),
  sorted ascending so the most recently closed loan appears first among the
  past entries.
- Rendered with `statusTone: 'success'` (Paid Off) or `'neutral'`
  (Cancelled), `dateLabel` as `"N year(s) ago"`.

**This is intentional prototype filler, not real borrower history** —
flag it explicitly if a future change makes it look more "real" than it is
(e.g. wiring it to look like it came from a credit bureau).

## Document preview pattern

`DocumentPreview`/`BusinessDocumentPreview` use the established **small
76px-square thumbnail + label/status row** pattern shared across the admin
app (`application-details-card.tsx`, `bureau-reports-card.tsx`,
`requirement-doc-row.tsx`) — not a large aspect-ratio photo card. Each shows
a `Provided`/`Not provided` status line beneath the label, colored green
when present. `BusinessDocumentPreview` is a separate component (not just
`DocumentPreview` with a different prop) because the business document can
be a PDF — it renders via `FileThumbnail` (which already handles
image-vs-non-image), where `DocumentPreview` assumes a plain `<img>`.

## Fabricated Claims — Real vs. Simulated

Consistent with the rest of this prototype (see `docs/230-project-overview.md`'s "No
real backend" note):

- Everything under **User details** is real submitted data (or absent,
  rendered as `—`) — nothing here is invented.
- The **current loan row** in Loan History is entirely real data.
- Every **past loan row** in Loan History is fabricated (see "Fabricated
  past loans" above) — there is no real multi-loan history to draw from.
- The current-step badge/pill reflects real `stepTimestamps` for the live
  applicant; for sample rows it's just their fixed fixture step.

## Verification checklist

After changing this screen:

1. Confirm both `isLive` and sample-row cases still resolve correctly (test
   with the live applicant's email and at least one `SAMPLE_APPLICATIONS`
   email).
2. Confirm the name click in `application-list-view.tsx` still opens this
   route and doesn't also trigger the row's own click-through
   (`stopPropagation`).
3. Confirm `buildPastLoans()` is still deterministic — reload the same
   profile twice and confirm identical fake history both times.
4. Confirm any new `PersonalInfo`/`FinancialInfo` field that should be
   borrower-identity data goes in **User details**, not Loan History, and
   vice versa for anything loan-specific.
5. Run `npx tsc --noEmit -p .` and `npx eslint src --ext .ts,.tsx`.
