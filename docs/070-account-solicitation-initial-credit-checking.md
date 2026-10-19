# Admin — Initial Credit Checking

> **Maintenance rule:** update this file whenever `initial-credit-checking-view.tsx`
> or its supporting files change — `application-details-card.tsx`,
> `bureau-reports-card.tsx`, `bureau-results-tables.tsx`,
> `initial-credit-checking-risk.ts`, `simulate-bureau-finding.ts`,
> `officer-notes-history.tsx`, `negative-credit-report-card.tsx` (no longer
> rendered here, but its behavior is summarized in the result modal), and
> `call-report/credit-checking-result-modal.tsx` (the "View Initial Credit
> Checking Result" modal, whose Bureau Reports Result section this page
> drives). Companion to `docs/230-project-overview.md` (system-wide),
> `docs/020-borrower-application.md` (where the data this screen reads comes
> from), and `docs/225-admin-design-system.md` (the admin design system —
> `adminCardSx`, `CollapsibleSection`, the admin-table recipe, `StatusBadge`,
> `ConfirmDialog` are all used here).

## What this is

The first step in the admin application-review pipeline
(`src/sections/admin/initial-credit-checking-view.tsx`, rendered at
`/admin/applications/[id]/credit-checking`, "Step 1 · Initial Credit Checking").
An officer reviews everything the borrower submitted, optionally uploads bureau
reports, reads an AI-generated risk read, and decides whether the application
proceeds to Call Report, is rejected, or is sent to Reconsideration.

There is no real backend, no real bureau integration, and no real AI — every
"AI" output here is a deterministic function of the application's own data
(loan amount, income, employment status) and whatever bureau-result rows the
officer has entered, not a call to any external service. See "Fabricated
claims" below for what that means for this screen's copy.

## Layout

`InitialCreditCheckingView` renders two toggleable layouts (`isSplitLayout`
state, a pure display preference — not persisted, resets on navigation):

- **Stacked (default, `maxWidth="md"`)**: `ApplicationDetailsCard` then all
  right-column cards, top to bottom.
- **Split (`maxWidth="xl"`)**: `ApplicationDetailsCard` sticky in a fixed-width
  left column (440px), right-column cards scroll independently.

Above either layout, `ApplicationReviewHeader` uses its
`applicationSummaryStyle` variant for this page. The first card follows the
application-summary treatment: a rounded clipboard/list icon, the borrower's
complete name (including prefix/middle/extension when present), email and mobile
on one contact line, assigned officer, and an **App No.** pill. It intentionally
replaces the default header card's loan-number/loan-type line and step pill;
the compact aging values and Step 1 pill remain in the row above. Large
"This application has been on…" alerts are not rendered on any process page.

The right-column cards, in order:

1. **`BureauReportsCard`** — the CIBI form + 5 bureau-report upload slots
   (LOANDEX, CIC, CMAP, NFIS/BAP, and PGFC Existing Exposure). Every bureau
   accepts multiple uploaded files, and each file auto-populates its own
   read-only results table with a few canned sample rows the instant it's
   uploaded. See "Bureau reports" below.
2. **"Officer notes"** — add a structured, attributed note or open the complete
   note history. See "Officer notes" below.
3. **"AI review, summary & recommendation"** — see "AI review card" below.
4. **"Approved?"** — the decision card (Proceed to Call Report / Disapprove).
   Proceed is the primary green action; Disapprove uses the neutral secondary
   outline treatment instead of a red button.

The former inline `NegativeCreditReportCard` is no longer rendered on this
page. Negative findings are summarized inside `CreditCheckingResultModal`,
which remains available from the "View Initial Credit Checking Result" button.

Each Bureau Report row now accepts **multiple uploaded files** (all 6
bureaus, CIBI included) — see "Bureau reports" below for the full
multi-file shape. The row header shows a file count ("N files uploaded")
instead of one summary line; below the header, each uploaded file gets its
own collapsible sub-panel (filename, row count, upload date, **View** action,
and a bordered three-dot menu with **Replace file** / **Delete file**),
expandable to reveal that file's own results table. The first uploaded file
(or the most recently added one) starts expanded; the rest start collapsed,
and each toggles independently. Files are stored as data URLs so **View**
opens the actual uploaded report in a new tab. Rows without any uploaded
file show a primary **Upload report** button (CIBI: **Upload document**,
gated on "Sent") instead of the file list.

## Application details card

`ApplicationDetailsCard` (`src/sections/admin/application-details-card.tsx`)
shows everything `useRegistration()` has on file, in four sections: Applicant,
Loan request, Personal & ID information, Uploaded documents. Read-only —
this card never writes to `RegistrationContext`. The Initial Credit Checking
page renders its editable Officer Notes workflow as a separate card immediately
after `BureauReportsCard`; the read-only application data itself remains separate.
Application Details does not repeat a "Notes from initial credit checking"
section—the dedicated Officer Notes card and shared history modal are the only
note surfaces on this page.

The non-collapsible layout (the one Initial Credit Checking uses, as opposed
to the compact `collapsible` header used on Call Report/Credit
Investigation/Requirement Checklist) renders each of the four sections — plus
the conditional Spouse information block — as its own icon-headed
`DetailSection` sub-card (bordered, `#FAFBFD` background, rounded, with a
small tinted icon badge and section title) instead of plain
label-then-fields-then-divider stacking. This keeps a long sidebar column
scannable by shape/icon rather than requiring a reviewer to read through one
continuous scroll of dividers.

**Personal & ID information** includes a separately labeled, conditional
**Spouse information** block — shown only when
`personalInfo.civilStatus === 'Married'` — covering
Name (First/Middle/Last/Extension, composed into one display string),
Birthday, and Address (Address/Barangay/City/Province/Zip code — mirrors the
borrower's own address field structure). The field labels inside this block
drop the "Spouse's" prefix (`Name`, not `Spouse's name`) since the section
header already reads "Spouse information" — the `DetailSection` wrapper
makes the prefix redundant. This was added to surface fields that existed in
`PersonalInfo` but weren't shown anywhere admin-side; still no admin action
reads these values (display-only, same as
`businessType`/`businessDocument`).

## Officer notes

The standalone **Officer notes** card appears directly after `BureauReportsCard`.
It uses a draft `TextField` plus an explicit **Add note** button; typing alone
does not mutate persisted review state. Adding a note appends a human-readable
entry to `creditChecking.notes` with four pieces of metadata: officer name from
`adminUser` (or "Credit Officer" as fallback), localized date/time, process
(`Initial Credit Checking`), and note content.

The outlined **View all officer notes** button sits in the card's upper-right
corner and opens `OfficerNotesDialog` — a right-anchored chat-style `Drawer`
(`src/sections/admin/officer-notes-history.tsx`, matching
`RequestDocumentsDrawer`'s layout: header / scrollable message area / composer
pinned to the bottom), not a centered modal. Each past note renders as a
left-aligned chat bubble (officer + process badge, note text, timestamp) via
a bubble-list renderer private to this file — distinct from the separately-exported
`OfficerNotesHistory` component (a boxed-card renderer used standalone, read-only,
by Reconsideration only; it is not used inside this drawer). The drawer's
subtitle is deliberately process-neutral ("Notes recorded throughout the
application process.") because the same drawer is reused on later workflow
pages. The parser remains backward-compatible with legacy unstructured notes
and the earlier `Officer · timestamp` format.

The same drawer is used by Call Report's and Requirement Checklist's **View
all officer notes** actions too. All three mount the shared
`OfficerNotesDialog`, ensuring the action wording, "All officer notes" title,
generic subtitle, bubble layout, close behavior, and empty state remain
identical. The composer (auto-growing `TextField` + send `IconButton`,
Enter-to-send/Shift+Enter for newline) accepts a `process` prop and is hidden
entirely when the caller omits it; notes added there are attributed to the
logged-in officer, timestamped, and tagged with the caller's process. Any
change to note serialization or presentation must therefore be checked in all
three processes.

Call Report does not render a standalone Officer Notes card. Its Application
Details action opens the same shared modal, where officers can view and add
notes using `buildOfficerNoteEntry()` with Process = `Call Report`. The combined
history therefore identifies which workflow stage created each note.

## Bureau reports

`BureauReportsCard` (`src/sections/admin/bureau-reports-card.tsx`) is the
**only bureau with a (simulated) API integration** — the CIBI form. Its fields
are pre-filled from the applicant's own `signUpData`/`application` data and
flagged with a green "Auto-filled" chip (`Field`'s `autoFilled` prop) —
independent of the borrower-facing "Auto-filled"/"Pre-filled" chip pattern on
Upload ID (`step-personal-info.tsx`); the two are separate components with
separate color/label choices, not shared.

All 6 bureau sections — CMAP, BAP/NFIS, CIBI, CIC, LOANDEX, and PGFC Existing
Exposure — accept **multiple uploaded files per bureau**, and each uploaded
file has its own **read-only, auto-filling results table**
(`src/sections/admin/bureau-results-tables.tsx`) matching the columns from the
"PGFC – Integrated Initial Credit Checking Results" reference template:
`CmapCasesTable`, `BapNfisRecordsTable`, `CibiResultsTable`,
`CicContractsTable`, `LoandexRecordsTable`, and `PgfcExposureTable`. Each is a
real header-once `<Table>` following the **admin-table recipe** in
`docs/225-admin-design-system.md` §6 (`#FBFBFD` uppercase gray head,
`#EEF0F5` row borders, plain white rows — no zebra, tabular-nums on amount
columns, wrapped in an `#EBEDF3` / `borderRadius: 16` card). The page stays at
the standard `maxWidth="lg"` (nav-bar-aligned, same as every other admin
screen). To show all 8 columns **in one glance with no horizontal scroll**,
`BureauTable` uses `tableLayout: fixed` + `width: 100%` with a per-column
`<colgroup>` `weight` (text-heavy columns like Institution / Remarks get
~1.3–1.8, numeric/date columns ~0.9–1.0); every cell ellipsis-clips and the
full value is on a hover tooltip. The six share the `BureauTable` shell but
declare their own weighted column lists. There is
no officer data entry here: the instant a file is added to a bureau (by hand,
"Add files"/"Upload report", or via "Fill with Sample Data"), that file is
seeded with **2–3 realistic canned sample rows** (1 row for CMAP/PGFC — see
below) via `seedBureauRows()` in `admin-context.tsx`, which dispatches to the
same per-bureau factories as before (`createCmapSampleCase()`/
`createBapNfisSampleRecord()`/`createCibiSampleResult()`/
`createCicSampleContract()`/`createLoandexSampleRecord()`/
`createPgfcSampleExposureRecord()`), then varies the 2nd/3rd row's
non-status descriptive fields via `decorateBureauRow()` so a multi-row table
doesn't repeat one identical record — every status/paymentStatus/
contractStatus/accountStatus field stays exactly as the single-row factory
set it, so seeded files still read as clean. Row count per file is a
deterministic hash of that file's name (`sampleRowCount()`, same
hash-not-random rationale as `simulate-bureau-finding.ts`), so re-adding the
same filename always seeds the same count. CMAP and PGFC Existing Exposure
are the two exceptions: a clean check is genuinely a single "no case"/"no
exposure" record, so every file for those two bureaus seeds exactly 1 row
regardless of the hash. CIBI's rows additionally pull `facilityType`/
`originalAmount`/`monthlyAmortization` from the CIBI intake form's
`creditType`/`financedAmount`/`installment` at the moment the file is added.

State shape: each bureau holds an array of `BureauReportFile` entries
(`{id, fileName, fileData, uploadedAt, rows}`) — `loandexFiles`, `cicFiles`,
`cmapFiles`, `nfisBapFiles`, `pgfcExposureFiles` on `ApplicationReview`, plus
`cibiForm.reportFiles` for CIBI's returned report. There are three setters on
`useAdmin()`, generic across all six bureaus via a `BureauFileKind` union
(`'cibi' | 'loandex' | 'cic' | 'cmap' | 'nfisBap' | 'pgfcExposure'`):
`addBureauReportFiles(kind, files)` appends one or more newly-seeded files;
`replaceBureauReportFile(kind, id, file)` swaps a file's document and
**re-seeds fresh rows** (a replaced file is treated as a new document, not a
re-scan of the same one); `removeBureauReportFile(kind, id)` drops one file
(and its rows) entirely. `useAdmin().bureauResultRows` exposes the six
row arrays flattened across every uploaded file for that bureau
(`cmapCases`, `bapNfisRecords`, `cibiResults`, `cicContracts`,
`loandexRecords`, `pgfcExposureRecords`) — this is what
`initial-credit-checking-risk.ts` and `CreditCheckingResultModal` read; they
never see the per-file shape. An empty table (only reachable transiently,
before any file for that bureau is uploaded) shows a dashed-border
empty-state message (e.g. "No CMAP court/legal cases recorded yet.") instead
of nothing.

Each bureau row (`BureauFileList` in `bureau-reports-card.tsx`, shared by
`SimpleBureauRow` and `CibiRow`) shows a header (icon, title, status badge,
"N files uploaded", and an **Add files** button once at least one file
exists, else a primary **Upload report**/**Upload document** button) followed
by one collapsible sub-panel per uploaded file (`BureauFilePanel`) — filename,
row count, upload date, outlined **View**, and a bordered three-dot menu with
**Replace file**/**Delete file**, expanding to reveal that file's own results
table **and, below the table, a per-file summary block**. The
first/most-recently-added file starts expanded; the rest start collapsed, and
each toggles independently.

**Per-file summary block.** Under each file's table, `BureauFilePanel`
renders a bordered `#FAFBFD` box with four labelled lines — **Summary**
(a prose paragraph), **Risk Level** (a tinted `Low`/`Moderate`/`High`
chip), **Recommendation** (`Proceed` / `Proceed with Caution` /
`Do Not Proceed …`), and **Document Match** (always `Yes — this is a
{bureau} report …`). It is produced by `deriveBureauFileSummary(kind,
file, applicantName)` in `bureau-file-summary.ts` — a pure, never-stored
derivation, computed on render from `file.rows` only (plus the applicant
name from `useRegistration()` for the prose). It reuses
`initial-credit-checking-risk.ts`'s exported `isNegativeStatus` so the
per-file read and the page-level AI Risk Level never disagree on what
counts as adverse: a row is adverse if its status-like field trips the
shared negative-keyword list, it carries a non-zero `overdueAmount`, or
(CMAP/PGFC) a real case/exposure record exists. Any overdue amount or an
explicit negative status → **High** (the prose quotes the largest overdue
balances); a softer recorded finding with no overdue amount → **Moderate**;
nothing adverse → **Low**. Since seeded rows are always clean (see above),
every file reads **Low** unless a row is later changed. This block appears
**only in the card** — `CreditCheckingResultModal` is unchanged. The file `<input>` accepts
multiple files at once (`multiple` attribute) so "Add files"/"Upload report"
can attach several files in one picker action; **CIBI specifically reveals
on its report upload** ("Upload document", the step after "Create Report" →
"Submit to CIBI"), not on the intake form's submission alone — submitting the
form only marks it "Sent" and does not by itself show any CIBI file rows.

`allBureauReportsUploaded` = all 6 of `cibiForm.reportFiles.length`,
`loandexFiles.length`, `cicFiles.length`, `cmapFiles.length`,
`nfisBapFiles.length`, `pgfcExposureFiles.length` are `> 0` (at least one file
per bureau — not tied to any specific file count). This drives:
- Whether the simulated bureau-finding effect runs (see below).
- Whether `buildInitialCreditCheckingResult()` can compute a real risk level
  at all — while any bureau has zero files it short-circuits to the dedicated
  "Unable to Determine" level rather than switching wording, as the old
  before/after-upload fallback text used to (see "AI review card" below).
- The Fill/Remove Sample Data floating button's label and action. "Fill with
  Sample Data" seeds one file per bureau, except **CMAP, which gets two**
  files, so the multi-file UI is visible immediately after using it.

**It no longer gates whether the AI Risk Level/Summary/Recommended Action
render at all, the Proceed to Call Report/Disapprove decision, or the "View
Initial Credit Checking Result" button** — see "Decision gate" and "AI review
card" below.

## Simulated bureau finding

A `useEffect` runs once bureau uploads are complete and
`creditChecking.bureauFindingStatus` is still `'pending'`. Calls
`simulateBureauFinding()` — a deterministic hash of the applicant's email plus
every uploaded filename **across every file of every bureau** (each bureau
can now hold several), **not** `Math.random()`, so the same applicant with
the same set of uploaded filenames always gets the same simulated result on
every reload.

`simulateBureauFinding()` returns `{ status, bureau, reason }`, not just a
bare `'clean' | 'negative'` string. On a negative outcome, a second hash picks
which bureau produced it (`'NFIS' | 'CMAP'`) and a third picks a specific
reason from that bureau's own reason pool — both pools are transcribed from
the actual PGFC bureau acceptance/disposition policy table (NFIS: closed
current accounts, adversely classified loans, cancelled credit cards;
CMAP: court cases — Estafa, BP 22, foreclosure, etc. — accounts referred to
lawyers, telecom data, returned cheques). CIBI, CIC, and LOANDEX are not
modeled as a source of the negative finding: CIBI's disposition is a score
threshold this app has no bureau-score field to compare against, and CIC/
LOANDEX's own reasons largely overlap NFIS/CMAP's pool. The source table also
restricts CIC/LOANDEX checks to SME/Clean/Housing-account loan products —
not modeled, since this app has no such account-type field (only
`application.loanType: 'personal' | 'business'`); every application is
checked against the same reason pools regardless of loan type.

`status`/`bureau`/`reason` are written once (as `bureauFindingStatus`/
`bureauFindingBureau`/`bureauFindingReason` on `CreditChecking`) and never
re-derived. `bureauFindingStatus` is read by `CreditCheckingResultModal` to
decide which report content to show; `bureauFindingBureau`/`bureauFindingReason`
name which of the two CMAP/NFIS-BAP report rows shows "Needs review" and
supply the specific flagged reason text in its summary, and seed
`NegativeCreditReportCard`'s "Negative Record" field the first time that
card renders after a negative finding (officer-editable afterward, same
"default once" convention as `accountOfficerName` on the Call Report).

Two floating dev-only buttons ("Force Clean"/"Force Negative", visible only
when `allBureauReportsUploaded`) let an admin override this result manually
for testing either branch without re-uploading different filenames. Force
Negative always sets `bureauFindingBureau: 'CMAP'` /
`bureauFindingReason: 'Court Case due to Estafa'` as a fixed example.

## AI review card

The card is rendered by the shared **`AiReviewCard`**
(`src/components/admin-ui/ai-review-card.tsx`) in its **rich** variant:
`richResult={creditCheckingResult}` routes the body through
`AiRecommendationSummary` (moved to `src/components/admin-ui/`), and the
"View Initial Credit Checking Result" row is passed as the card's
`footer` slot so it stays last, in its existing order. The card is
`CollapsibleSection`-based with a magic-stick header icon, collapsible
and **expanded by default** (`aiReviewExpanded` state). The five-level
risk scale it displays is `SCREENING_RISK_STYLES`
(`src/components/admin-ui/ai-review-tokens.ts`, formerly
`RISK_LEVEL_STYLES` co-located with the builder). The advisory
**AI Control Statement** footnote (`AI_CONTROL_STATEMENT`) is rendered by
`AiRecommendationSummary` itself. The other three AI-review screens use
`AiReviewCard`'s compact variant — see `docs/225-admin-design-system.md`
§6 / §13.

**"AI review, summary & recommendation"** is a single merged card containing:

1. **"View Initial Credit Checking Result"** button — as of 2026-10-19,
   toggles an inline `CreditCheckingResultContent hideHeader` section on
   this same page instead of opening `CreditCheckingResultModal` as a
   popup (the `<Dialog>`-wrapped `CreditCheckingResultModal` is still
   used by every cross-page reference into this result — e.g. Call
   Report's and `ApplicationDetailsCard`'s own "View credit checking
   result" actions). Always visible regardless of bureau-upload status.
   The content itself already degrades gracefully without bureau
   reports: `isCleared` requires `allBureauReportsUploaded`, so the green
   "Cleared" banner is hidden until the review is complete.
   Its **Bureau Reports Result** section shows one block per bureau (CIBI,
   LOANDEX, CIC, CMAP, NFIS/BAP, PGFC Existing Exposure) with a status chip
   ("Not uploaded" / "Clear" / "Needs review") and a "N files uploaded" count,
   then — for each of that bureau's uploaded files — its own filename, upload
   date, and results table. A bureau with zero files shows only the "Not
   uploaded" chip and no file blocks. A negative simulated finding flags
   exactly one of CMAP/NFIS-BAP for officer review — whichever
   `bureauFindingBureau` names — showing that section's specific flagged
   reason text (`bureauFindingReason`), independent of how many files that
   bureau has. The copy explicitly tells officers to validate these simulated
   findings against the source documents before deciding. A separate
   **Recommendation & Remarks**
   field stores the department's written finding for forwarding to the Credit
   Committee. Its inline status changes from "Saving…" to "Saved locally" so
   officers can confirm that the local-storage update completed. This field is
   editable only when the modal is opened from Initial Credit Checking; the
   Call Report passes `recommendationEditable={false}` and renders the stored
   value as read-only text (with an empty-state message when none was recorded).
2. **AI Risk Level** pill — `buildInitialCreditCheckingResult()`
   (`initial-credit-checking-risk.ts`) is the single engine behind the whole
   card now, replacing the old `buildInitialAiRecommendation()` plus two
   now-deleted ad-hoc `buildAiSummary()`/`buildAiRecommendation()` builder
   functions. It reads all six new bureau-result row arrays (`cmapCases`,
   `bapNfisRecords`, `cibiResults`, `cicContracts`, `loandexRecords`,
   `pgfcExposureRecords`), `allBureauReportsUploaded`, and the application's
   loan amount/income/employment status, and returns one
   `InitialCreditCheckingResult` object consumed by the whole card. Its
   `riskLevel` is one of 5 levels (`RISK_LEVEL_STYLES`, each with its own
   background/text color and icon): **Low**, **Moderate**, **Elevated**,
   **High**, or **Unable to Determine** — in priority order: not all 6 bureau
   reports uploaded yet → Unable to Determine; any CMAP court/legal case or
   any row elsewhere with a delinquent/overdue/negative-style status → High;
   existing PGFC exposure on file, or requested amount >60% of stated annual
   income → Elevated; at least one bureau row on file with nothing adverse
   found → Moderate; all 6 reports on file, nothing recorded anywhere, income
   ratio acceptable → Low. The pill reads "AI Risk Level · {label}" with
   `riskStyle.bg`/`riskStyle.color` driving the surrounding callout box, same
   "risk level colors the whole block" idea the old standalone card used.
3. **AI Summary** — `creditCheckingResult.summary`, always rendered, never
   gated. Its wording is generated per risk level — e.g. it names how many
   bureau records were reviewed and, where relevant, calls out the specific
   court/legal case or delinquent-status finding that drove the level.
4. **AI Recommended Action** — `creditCheckingResult.recommendedAction`,
   always rendered, a plain-language next step for the officer (e.g.
   "Recommend further credit review before proceeding…" for High, "Recommend
   proceeding to Call Report preparation…" for Low).
5. **AI Review Basis** — a row of tag chips (`StatusBadge`, neutral tone)
   listing which factors the result above drew on, via
   `creditCheckingResult.reviewBasis` (an array of `ReviewBasisTag`) and
   `REVIEW_BASIS_LABELS` for their display text (e.g. "Court / legal
   findings", "Existing exposure", "Delinquency / overdue history", "Data
   completeness", "Bureau consistency"). This is new — the old 3-level engine
   had no equivalent basis list.

**History:** there used to be a separate standalone "Initial AI
Recommendation" card, shown above `BureauReportsCard`, with copy explicitly
saying it was "not a substitute for the full AI review below." It was first
merged into this card as its own always-shown callout (a transitional state),
then folded further into a single "AI Recommendation" block carrying the
risk-level styling. That 3-level engine (`buildInitialAiRecommendation()`:
`'good' | 'watch' | 'high'`, a pure debt-to-income-ratio check) and its two
companion ad-hoc `buildAiSummary()`/`buildAiRecommendation()` builders have
since been deleted outright and replaced by the single 5-level
`buildInitialCreditCheckingResult()` described above, which also reads the
new bureau-result row tables rather than income/loan-amount alone. AI Summary
and AI Recommended Action remain always populated (never gated on
`allBureauReportsUploaded` — that state instead routes to the dedicated
"Unable to Determine" risk level), and the card now also always renders the
AI Review Basis tag list.

`credit-checking-result-modal.tsx` shares this same engine: its `isCleared`
used to check `riskLevel === 'good'` under the old 3-level type; it now
checks `riskLevel === 'low'` under the new 5-level type, same threshold
meaning (still additionally gated on `allBureauReportsUploaded`).

## Decision gate

**Proceed to Call Report / Disapprove are always clickable — not gated on
bureau reports being uploaded.** Bureau reports are supporting evidence for the
officer's judgment, not a hard prerequisite to decide. This replaced an earlier
`canDecide = allBureauReportsUploaded` gate that disabled all three buttons
(and dimmed the whole card to 50% opacity) until every bureau report was
uploaded.

- **Proceed to Call Report** → `setCreditChecking({ decision: 'approved' })`, routes to Call
  Report.
- **Disapprove** → opens a reason dialog (`ConfirmDialog`), on confirm sets
  `decision: 'rejected'` + the typed reason, routes to Reconsideration.

`allBureauReportsUploaded` still independently gates the Fill/Remove Sample
Data button. The decision buttons and the "View Initial Credit Checking
Result" button have all since been unblocked — see "AI review card" above.

## Fabricated Claims — Real vs. Simulated

Consistent with the rest of this prototype (see `docs/230-project-overview.md`'s "No
real backend" note and `docs/020-borrower-application.md`'s "Fabricated 'we did
real work' claims" section), nothing on this screen calls a real bureau API or
a real AI model:

- Bureau report uploads store the filename and upload timestamp only — no file
  content is ever parsed or verified against anything (except the existing CIBI
  preview data URL used by the prototype UI).
- The "Auto-filled" CIBI fields are copied straight from the borrower's own
  submitted data, not independently verified against a bureau record.
- The simulated bureau finding is a hash function, not a real bureau response.
- Every "AI Risk Level"/"AI Summary"/"AI Recommended Action"/"AI Review
  Basis" string is a template string built from the bureau-result row data
  and arithmetic on `application.financialInfo`, not a model inference call.

This is intentional prototype behavior, not a gap to close as part of routine
maintenance on this screen — flag it explicitly if a future change makes any
of this look more "real" than it is (e.g. adding a fake loading spinner
implying bureau API latency).

## Non-Goals / Open Items

- **No real bureau integration** — CIBI's "API integration available" copy
  is prototype framing; there is no external call.
- **No real OCR/parsing** of uploaded bureau report files.
- **CIC / CIBI / LOANDEX are not modeled as a source of the negative
  finding** — only NFIS and CMAP have reason pools (see "Simulated bureau
  finding"). The source policy table's SME/Clean/Housing account-type
  restriction on CIC/LOANDEX is not modeled — this app has no account-type
  field.
- **`NegativeCreditReportCard` is no longer rendered on this page** — a
  negative finding is summarized inside `CreditCheckingResultModal`
  instead; the card file is retained for its behavior notes only.

## History

### 2026-10-19

- **"View Initial Credit Checking Result" now shows inline on this page**,
  instead of opening a popup. `credit-checking-result-modal.tsx` was
  split into `CreditCheckingResultContent` (the body, no dialog chrome)
  and `CreditCheckingResultModal` (the `<Dialog>` wrapper) — this page
  now toggles `CreditCheckingResultContent hideHeader` directly, while
  Call Report's and `ApplicationDetailsCard`'s own cross-page references
  into this result keep using the `<Dialog>`-wrapped version. See
  `docs/080-account-solicitation-call-report.md`'s own History entry for
  the full detail (both files were converted together).

### 2026-09

- **Bureau Reports: multiple files per bureau.** Each bureau (CIBI plus
  LOANDEX / CIC / CMAP / NFIS-BAP / PGFC Existing Exposure) now holds a
  `BureauReportFile[]` array instead of one file; each file carries its own
  seeded 2–3 sample result rows and its own collapsible results table.
  New `add/replace/removeBureauReportFile` setters; `bureauResultRows` is a
  derived flatten across files. The result modal renders one block per
  file. "Fill with Sample Data" seeds CMAP with two files.
- **Per-file summary block.** `BureauFilePanel` now renders a "Summary
  Report" box under each file's results table — same tinted-callout shape
  as the page's own AI review card
  (`src/components/admin-ui/ai-recommendation-summary.tsx`): a
  risk-toned background, an uppercase heading with a white "{Low/Moderate/
  High} risk" pill, the Summary paragraph, an opacity-15 divider, then
  Recommendation and Document Match. Produced by the new pure
  `bureau-file-summary.ts` (`deriveBureauFileSummary`), reusing
  `isNegativeStatus` (now exported from `initial-credit-checking-risk.ts`).
  Card only — the result modal is untouched.
- **Results tables rebuilt as real `<Table>`s** matching the app's other
  admin tables (header once, `#FBFBFD` gray head, plain white rows,
  `overflowX: auto` container) instead of the old label-over-value
  chip-row-per-record layout.
