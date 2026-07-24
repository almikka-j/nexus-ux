# Admin — Initial Credit Checking

> **Maintenance rule:** update this file whenever `initial-credit-checking-view.tsx`
> or its supporting cards (`application-details-card.tsx`, `bureau-reports-card.tsx`,
> `negative-credit-report-card.tsx`, `initial-credit-checking-risk.ts`,
> `simulate-bureau-finding.ts`, `officer-notes-history.tsx`) change — new fields, new cards, changed gating,
> changed decision behavior. Companion to `PROJECT_OVERVIEW.md` (system-wide) and
> `docs/BORROWER_SIGNUP_FLOW.md` (where the data this screen reads comes from).

## What this is

The first step in the admin application-review pipeline
(`src/sections/admin/initial-credit-checking-view.tsx`, rendered at
`/admin/applications/[id]/credit-checking`, "Step 1 · Initial Credit Checking").
An officer reviews everything the borrower submitted, optionally uploads bureau
reports, reads an AI-generated risk read, and decides whether the application
proceeds to Call Report, is rejected, or is sent to Reconsideration.

There is no real backend, no real bureau integration, and no real AI — every
"AI" output here is a deterministic function of the application's own data
(loan amount, income, employment status), not a call to any external service.
See "Fabricated claims" below for what that means for this screen's copy.

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

1. **`BureauReportsCard`** — the CIBI form + 4 bureau-report upload slots
   (LOANDEX, CIC, CMAP, NFIS/BAP). See "Bureau reports" below.
2. **"Officer notes"** — add a structured, attributed note or open the complete
   note history. See "Officer notes" below.
3. **"AI review, summary & recommendation"** — see "AI review card" below.
4. **"Approved?"** — the decision card (Proceed to Call Report / Disapprove).

The former inline `NegativeCreditReportCard` is no longer rendered on this
page. Negative findings are summarized inside `CreditCheckingResultModal`,
which remains available from the "View Initial Credit Checking Result" button.

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

**Personal & ID information** includes a separately labeled, conditional
**Spouse information** block — shown only when
`personalInfo.civilStatus === 'Married'` — covering
Spouse's name (First/Middle/Last/Extension, composed into one display string),
Spouse's birthday, and Spouse's address (Address/Barangay/City/Province/Zip
code — mirrors the borrower's own address field structure). This was added to
surface fields that existed in `PersonalInfo` but weren't shown anywhere
admin-side; still no admin action reads these values (display-only, same as
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

The other 4 bureau reports (LOANDEX, CIC, CMAP, NFIS/BAP) are plain file-name
uploads with no form behind them.

`allBureauReportsUploaded` = all 5 of `cibiForm.reportFileName`,
`loandexUpload.fileName`, `cicUpload.fileName`, `cmapUpload.fileName`,
`nfisBapUpload.fileName` are set. This drives:
- Whether the simulated bureau-finding effect runs (see below).
- Which wording AI Summary/AI Recommendation use — both always render, this
  only switches between the application-details-only fallback and the
  bureau-reports-confirmed version (see "AI review card" below).
- The Fill/Remove Sample Data floating button's label and action.

**It no longer gates whether AI Summary/AI Recommendation render at all, the
Proceed to Call Report/Disapprove decision, or the "View Initial Credit Checking
Result" button** — see "Decision gate" and "AI review card" below.

## Simulated bureau finding

A `useEffect` (lines ~96–119) runs once bureau uploads are complete and
`creditChecking.bureauFindingStatus` is still `'pending'`. Calls
`simulateBureauFinding()` — a deterministic hash of the applicant's email plus
every uploaded filename, **not** `Math.random()`, so the same applicant with
the same filenames always gets the same simulated result on every reload.
Result is `'clean' | 'negative'`, written once and never re-derived. It is read
by `CreditCheckingResultModal` to decide which report content to show.

Two floating dev-only buttons ("Force Clean"/"Force Negative", visible only
when `allBureauReportsUploaded`) let an admin override this result manually
for testing either branch without re-uploading different filenames.

## AI review card

**"AI review, summary & recommendation"** is a single merged card containing:

1. **"View Initial Credit Checking Result"** button — opens
   `CreditCheckingResultModal`, always visible regardless of bureau-upload
   status. The modal itself already degrades gracefully without bureau
   reports: `isCleared` requires `allBureauReportsUploaded`, so the green
   "Cleared" banner is hidden until the review is complete.
   Its **Bureau Reports Result** section shows one narrative summary row for each
   uploaded source (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP), including its filename,
   upload date, status, and extracted finding. Missing reports show only the
   "Not uploaded" status label and no summary text;
   simulated negative results flag CMAP/NFIS-BAP for officer review. The copy
   explicitly tells officers to validate these simulated findings against the
   source documents before deciding. A separate **Recommendation & Remarks**
   field stores the department's written finding for forwarding to the Credit
   Committee. Its inline status changes from "Saving…" to "Saved locally" so
   officers can confirm that the local-storage update completed. This field is
   editable only when the modal is opened from Initial Credit Checking; the
   Call Report passes `recommendationEditable={false}` and renders the stored
   value as read-only text (with an empty-state message when none was recorded).
2. **AI Summary** — `buildAiSummary()`, always rendered, never gated. Without
   bureau reports it summarizes application details only ("Bureau reports
   ... haven't been uploaded yet, so this summary is based on application
   details only"); once all 5 are uploaded, it switches to the fuller
   "on file and consistent with the application details" version.
3. **AI Recommendation** — `buildAiRecommendation()`, always rendered, never
   gated, and **carries the risk-level styling** (this is where the former
   standalone "Initial AI Recommendation" card's content lives now — see
   "History" below). Its label reads "AI Recommendation · {risk label}"
   (Low risk / Needs a closer look / High risk) and its background/text
   color follows `INITIAL_RISK_STYLES` for that level, same colors the old
   standalone card used. `buildInitialAiRecommendation()`
   (`initial-credit-checking-risk.ts`) computes the debt-to-income ratio and
   risk level (`'good' | 'watch' | 'high'`): Low risk (≤35% of annual
   income), Needs a closer look (≤60%, or when monthly income is 0/unset —
   ratio can't be computed), High risk (>60%). This same function is shared
   with `credit-checking-result-modal.tsx`, so the risk level shown here and
   the tone of the generated report never disagree. The recommendation text
   itself also has an unuploaded-vs-uploaded fallback, same pattern as AI
   Summary — e.g. "...based on application details alone. Upload the bureau
   reports above for a fuller picture before proceeding" vs. the
   bureau-reports-confirmed wording.

**History:** there used to be a separate standalone "Initial AI
Recommendation" card, shown above `BureauReportsCard`, with copy explicitly
saying it was "not a substitute for the full AI review below." It was first
merged into this card as its own always-shown callout (a transitional state),
then folded further — its content and risk-level styling now live directly
inside the "AI Recommendation" block itself, so there's exactly one
recommendation per card, not two. AI Summary and AI Recommendation are now
*both* always populated (previously both were `null` until
`allBureauReportsUploaded`), each with its own before/after-bureau-upload
wording.

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
Data button. The decision buttons, the "View Initial
Credit Checking Result" button, and AI Summary/Recommendation's *visibility*
(only their wording, not whether they render) have all since been unblocked —
see "AI review card" above.

## Fabricated claims — what's real vs. simulated

Consistent with the rest of this prototype (see `PROJECT_OVERVIEW.md`'s "No
real backend" note and `docs/BORROWER_SIGNUP_FLOW.md`'s "Fabricated 'we did
real work' claims" section), nothing on this screen calls a real bureau API or
a real AI model:

- Bureau report uploads store the filename and upload timestamp only — no file
  content is ever parsed or verified against anything (except the existing CIBI
  preview data URL used by the prototype UI).
- The "Auto-filled" CIBI fields are copied straight from the borrower's own
  submitted data, not independently verified against a bureau record.
- The simulated bureau finding is a hash function, not a real bureau response.
- Every "AI Summary"/"AI Recommendation"/risk-level string is a template
  string built from arithmetic on `application.financialInfo`, not a model
  inference call.

This is intentional prototype behavior, not a gap to close as part of routine
maintenance on this screen — flag it explicitly if a future change makes any
of this look more "real" than it is (e.g. adding a fake loading spinner
implying bureau API latency).
