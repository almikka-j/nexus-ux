# Initial Credit Checking Result — Print & Editable Recommendation Design

## Problem

The stated purpose of Initial Credit Checking is to produce a generated
Initial Credit Checking Report (`CreditCheckingResultModal`). Today:

1. The modal's PDF/download button is permanently disabled ("PDF export
   coming soon") on both the clean and negative paths, even after the
   negative path's manual report has real content.
2. On the clean/"all goods" path, the Recommendation paragraph is a
   hardcoded literal string with no way for the officer to add remarks or
   adjust it — unlike the negative path, which already has a full editable
   report form.

## Decisions

1. **Download becomes real, via browser print** — no new PDF library. The
   existing disabled PDF icon button in the modal header (next to the close
   button) becomes functional: clicking it calls `window.print()` with
   print-only CSS that hides everything except the report content (backdrop,
   header icon buttons, app chrome), so "Save as PDF" from the browser's
   print dialog produces a clean report. Available on **both** paths (clean
   and negative-submitted) — a complete report exists in both cases.

2. **Clean path gets an editable Recommendation** — but scoped narrowly,
   not a full parallel form like the negative path:
   - Only the Recommendation paragraph becomes editable. The 4-item
     checklist and "Findings by Name" bullets stay exactly as they are today
     (genuinely true text when the result is clean — no reason to make them
     editable).
   - New field: `CreditChecking.cleanRecommendationRemarks: string`
     (default `''`). When non-empty, the modal shows it instead of the
     hardcoded default sentence. Persists via the existing sessionStorage
     mechanism, same as every other `CreditChecking` field.
   - Edited **directly inside the result modal** — no new card on the
     Initial Credit Checking page. The Recommendation block gets a small
     "Edit"/pencil affordance; clicking it swaps the paragraph for a
     `TextField`, with Save/Cancel. This only applies when
     `isCleared` is true (the clean path) — the negative-submitted path
     already has its own editable text via `NegativeCreditReportCard`, and
     this new mechanism doesn't apply there.
   - No "required" gate — unlike the negative path's Recommendation/Remarks,
     this is optional; an empty override just falls back to the existing
     default sentence, so there's no blocking behavior to design.

## Out of scope

- No changes to the negative path's existing report/edit flow
  (`NegativeCreditReportCard`, its own Recommendation/Remarks field) —
  entirely separate field, entirely separate UI.
- No real PDF generation library — browser print only.
- No edits to the checklist/Findings-by-Name content on the clean path.
- No changes to `isCleared`/chip/banner logic — unrelated to this feature.

## Print CSS approach

MUI `Dialog` renders in a portal (`document.body`), so a `@media print`
block needs to hide `#__next` (or the app root) and show only the dialog
paper. Simplest robust approach: give the dialog's content container a
distinguishing class/id (e.g. `credit-checking-result-printable`), then add
a global `@media print` rule (in `globals`/theme-level CSS, or a `<style>`
injected via MUI's `GlobalStyles`) that sets `body * { visibility: hidden }`
and `.credit-checking-result-printable, .credit-checking-result-printable *
{ visibility: visible }`, positioning the printable block at the page's
top-left. This is a standard, well-known technique — no library needed.
