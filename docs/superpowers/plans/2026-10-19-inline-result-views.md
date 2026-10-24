# Inline Result Views (Call Report, Initial Credit Checking, Application Details) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert three same-page "View Result" Dialogs (Call Report result, Initial Credit Checking result, Application's "View Full Application") into inline, toggle-expand page content — matching the visual language `appraisal-report-view.tsx` already uses (`adminCardSx` card, `SectionLabel`+divider header, `Field`/`FieldGrid` label-value pairs, `CollapsibleSection`'s chevron/`Collapse` toggle) — so all of them read as one cohesive design system. Modal usages that cross from a DIFFERENT page/flow (Application card's own "View call report"/"View credit checking result" buttons reached from other pages, Call Report page's own reference into Initial Credit Checking) stay as Dialogs — only same-page popups convert.

**Architecture:** Extract a tiny shared `Field`/`FieldGrid`/`SectionLabel` module (today duplicated per-file) into `src/components/admin-ui/report-field.tsx`. Split `CreditCheckingResultModal` into a chrome-free `CreditCheckingResultContent({ hideHeader }?)` plus a thin Dialog wrapper, mirroring the split `CallReportResultModal`/`CallReportResultContent` already has. Each of the three target pages/cards renders its own content component inline inside a `CollapsibleSection`-driven expand, replacing its `useState` dialog-open boolean with the section's own `expanded` boolean. Cross-page modal call sites are untouched — they still import the Dialog wrapper and pass nothing but `open`/`onClose`.

**Tech Stack:** Next.js (App Router) + MUI v5 + TypeScript, existing `AdminContext`/`RegistrationContext` (no backend). No new dependencies.

**Spec:** No separate spec doc — this is a bounded-path conversion confirmed directly with the user in conversation (see chat history 2026-10-19): convert same-page result Dialogs to inline content; cross-page Dialog usages stay as Dialogs; unify visual language to match `appraisal-report-view.tsx`.

## Global Constraints

- Never touch `CallReportResultModal`'s/`CreditCheckingResultModal`'s cross-page call sites (`application-details-card.tsx`'s nested `<CallReportResultModal>`/`<CreditCheckingResultModal>`; any other page that imports them) — those keep working exactly as today, unmodified.
- `CreditCheckingResultContent`/`CallReportResultContent` must read all their own data from `useAdmin()`/`useRegistration()` directly (as today) — no new props beyond the existing optional `hideHeader`.
- Preserve every existing conditional (Cleared banner, negative-finding sections, AO-vs-System variance, approval-fallback signature logic, etc.) verbatim — this plan changes wrapper chrome and toggle mechanism only, never the business logic or computed values inside the content.
- New shared `Field`/`FieldGrid`/`SectionLabel` module's visual output must be pixel-identical to `appraisal-report-view.tsx`'s current local versions (this is the "cohesive" reference design) — copy their JSX/sx verbatim into the shared module, then point all call sites (including `appraisal-report-view.tsx` itself) at the shared version.
- Every toggle must use `CollapsibleSection` (`src/components/collapsible-section`) — no bespoke chevron/Collapse implementations.
- Run `npx tsc --noEmit` and `npx eslint <touched files>` after each task; run `npm run build` and manually load each of the 3 pages (dev server) once all tasks are done, since this changes several components' state shape and is UI-load-bearing.

## Review Focus

- A user expands Call Report's result, submits/changes a field elsewhere on the same page, and expects the inline result to reflect the live `currentAiSummary`/`currentVariance` recomputation it already does today — not a stale snapshot. (It already recomputes on every render per the existing code; just confirm the conversion doesn't accidentally memoize or cache it.)
- A user who still reaches Call Report's or Credit Checking's result via a DIFFERENT page (e.g., Application Details card's own buttons) must still see it as a Dialog, unchanged — confirm no regression there after `CreditCheckingResultContent` extraction, since the Dialog wrapper's import path must keep resolving.
- Initial Credit Checking's result content currently branches on `bureauFindingStatus === 'pending'` state is sticky once computed — expanding/collapsing the inline section repeatedly must not re-trigger that simulation.
- Application Details Card's "View Full Application" inline expand must still show `detailsContent` identically whether reached from the collapsible or (today) non-collapsible card variant — confirm the non-collapsible branch (which never showed the Dialog button at all) is unaffected.
- `FieldGrid`/`Field` extraction must not change `appraisal-report-view.tsx`'s own rendered output — a visual regression there would defeat the "cohesive" goal by making the reference implementation itself inconsistent.

---

### Task 1: Extract shared `Field`/`FieldGrid`/`SectionLabel` module

**Files:**
- Create: `src/components/admin-ui/report-field.tsx`
- Modify: `src/components/admin-ui/index.ts` (add exports)
- Modify: `src/sections/admin/appraisal/appraisal-report-view.tsx` (replace local `Field`/`FieldGrid`/`SectionLabel` with the shared import; delete the now-dead local copies)

**Interfaces:**
- Produces: `SectionLabel({ children }: { children: React.ReactNode })`, `Field({ label, value, span }: { label: string; value: string; span?: number })` (returns `null` when `value` is falsy), `FieldGrid({ children }: { children: React.ReactNode })` — all exported from `src/components/admin-ui`.

- [ ] **Step 1: Read the exact current local implementations to copy verbatim**

Read `src/sections/admin/appraisal/appraisal-report-view.tsx` lines 49-108 (the current `SectionLabel`/`Field`/`FieldGrid` definitions) to get their exact JSX/sx. Do not paraphrase — copy byte-for-byte into the new file in Step 2.

- [ ] **Step 2: Create the shared module**

Create `src/components/admin-ui/report-field.tsx` with the three functions copied verbatim from Step 1's read, each prefixed with a one-line comment: `// Extracted from appraisal-report-view.tsx (2026-10-19) as the shared label/value primitive for all inline report views — see docs/100-credit-investigation.md and docs/170-request-appraiser.md for which pages use it.` (adjust doc paths if these aren't the right docs — check the actual doc each page's own feature lives under; Call Report's is `docs/080-account-solicitation-call-report.md`, Initial Credit Checking's is likely a `docs/*credit-checking*.md` — confirm by grepping `docs/` for each page's own title before writing this comment).

- [ ] **Step 3: Export from the admin-ui barrel**

Edit `src/components/admin-ui/index.ts` — add `export * from './report-field';` (or named re-exports, matching however the other admin-ui files are re-exported there — read the file first to match style).

- [ ] **Step 4: Point `appraisal-report-view.tsx` at the shared module, delete its local copies**

Remove the local `SectionLabel`/`Field`/`FieldGrid` function definitions from `appraisal-report-view.tsx`; add `import { SectionLabel, Field, FieldGrid } from 'src/components/admin-ui';` (match this file's existing import grouping convention). Do not change any call site in this file — the shared functions have identical signatures.

- [ ] **Step 5: Verify**

Run:
```bash
npx tsc --noEmit
npx eslint src/components/admin-ui/report-field.tsx src/components/admin-ui/index.ts src/sections/admin/appraisal/appraisal-report-view.tsx
```
Expected: no errors. Then start the dev server and load `/admin/appraisal-appraiser/[bundleId]` (any existing bundle id from a seeded session) to visually confirm the Appraisal Report view renders identically to before (no visual diff — this task is a pure extraction).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin-ui/report-field.tsx src/components/admin-ui/index.ts src/sections/admin/appraisal/appraisal-report-view.tsx
git commit -m "refactor: extract shared Field/FieldGrid/SectionLabel from Appraisal Report view

Pulls out the label/value primitives appraisal-report-view.tsx already
uses into src/components/admin-ui/report-field.tsx, so the upcoming
Call Report / Initial Credit Checking / Application Details inline
conversions can reuse the same visual language instead of each
reimplementing their own slightly different version.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Split `CreditCheckingResultModal` into content + wrapper

**Files:**
- Modify: `src/sections/admin/call-report/credit-checking-result-modal.tsx`

**Interfaces:**
- Consumes: Task 1's `SectionLabel`/`Field`/`FieldGrid` are available but NOT required here — this task only restructures the Dialog chrome, it does not need to touch this file's internal `SectionLabel`/`FieldRow` yet (that unification is Task 5, done last, across all three files at once, so the "Review Focus" risk of breaking a working file mid-way is minimized).
- Produces: `export function CreditCheckingResultContent({ hideHeader }: { hideHeader?: boolean } = {})` — mirrors `CallReportResultContent`'s exact signature in `call-report-result-modal.tsx`. `export function CreditCheckingResultModal({ open, onClose }: { open: boolean; onClose: () => void })` stays exported with the same signature as today, now just wrapping `<CreditCheckingResultContent />` inside the existing `Dialog`.

- [ ] **Step 1: Read the full current file**

Read `src/sections/admin/call-report/credit-checking-result-modal.tsx` in full (460 lines) — confirmed structure from prior research: props `{ open, onClose }` (lines 150-153), component body computes everything from `useRegistration()`/`useAdmin()` (lines 164-231), early return `if (!signUpData) return null;` (178), Dialog wrapper starts at line 234 with the header `Box` (title "Initial Credit Checking Result" + generated label + export/close `IconButton`s), `DialogContent` wraps a `Stack spacing={2.5}` holding 7 body sections (lines 263-455), closes at lines 457-460.

- [ ] **Step 2: Rename the function, add `hideHeader`, strip Dialog/DialogContent chrome**

Change the function signature from
```tsx
export function CreditCheckingResultModal({ open, onClose }: CreditCheckingResultModalProps) {
```
to
```tsx
export function CreditCheckingResultContent({ hideHeader }: { hideHeader?: boolean } = {}) {
```
Remove the `open`/`onClose` props entirely from this function (they're no longer used inside — the outer wrapper in Step 3 owns them). Replace the opening:
```tsx
return (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 3, pb: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>
          Initial Credit Checking Result
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
          Report generated {generatedLabel}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Tooltip title="PDF export coming soon">
          <span>
            <IconButton disabled sx={{ border: '1px solid #E1E4ED', borderRadius: '10px', px: 1.5 }}>
              <Iconify icon="solar:file-download-bold" width={18} sx={{ color: '#8891A6' }} />
            </IconButton>
          </span>
        </Tooltip>
        <IconButton onClick={onClose} sx={{ border: '1px solid #E1E4ED', borderRadius: '10px' }}>
          <Iconify icon="solar:close-circle-bold" width={18} sx={{ color: '#8891A6' }} />
        </IconButton>
      </Stack>
    </Box>

    <DialogContent sx={{ px: 3, pb: 3 }}>
      <Stack spacing={2.5}>
```
with (matching `CallReportResultContent`'s own `hideHeader` pattern exactly — read `call-report-result-modal.tsx` lines 225-236 for the precise comparison before writing this, so the two files' header blocks are structurally identical, not just similar):
```tsx
return (
  <Stack spacing={2.5}>
    {!hideHeader && (
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>
          Initial Credit Checking Result
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
          Report generated {generatedLabel}
        </Typography>
      </Box>
    )}
```
Drop the export/close `IconButton`s entirely from the content (they belong to the Dialog chrome now living only in the wrapper — an inline page section has no "close" action and PDF export, if kept at all, moves to the wrapper or is dropped; default to dropping it here since there is no modal to attach it to — note this explicitly in a one-line code comment so a future reader understands the omission is deliberate, not forgotten).

Replace the closing:
```tsx
      </Stack>
    </DialogContent>
  </Dialog>
);
}
```
with:
```tsx
  </Stack>
);
}
```

- [ ] **Step 3: Add the thin wrapper below the content function**

Immediately after the new `CreditCheckingResultContent` function, add:
```tsx
export function CreditCheckingResultModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 3, pb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>
            Initial Credit Checking Result
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="PDF export coming soon">
            <span>
              <IconButton disabled sx={{ border: '1px solid #E1E4ED', borderRadius: '10px', px: 1.5 }}>
                <Iconify icon="solar:file-download-bold" width={18} sx={{ color: '#8891A6' }} />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ border: '1px solid #E1E4ED', borderRadius: '10px' }}>
            <Iconify icon="solar:close-circle-bold" width={18} sx={{ color: '#8891A6' }} />
          </IconButton>
        </Stack>
      </Box>
      <DialogContent sx={{ px: 3, pb: 3 }}>
        <CreditCheckingResultContent />
      </DialogContent>
    </Dialog>
  );
}
```
Note this wrapper passes no `hideHeader`, so `CreditCheckingResultContent`'s own header still renders — same (pre-existing, acceptable) minor duplication-of-title-text pattern `CallReportResultModal`'s own wrapper already has today (its Dialog header Box says "Call Report" AND the inline content's own un-hidden header renders too) — do not try to fix that pre-existing duplication as part of this task; keep the two files' wrapper behavior consistent with each other, which this achieves.

Also remove the old `type CreditCheckingResultModalProps` declaration if it becomes unused after this change (check: it's replaced by the new wrapper's inline type, so the named type is likely now dead — delete it only if nothing else references it).

- [ ] **Step 4: Verify no call site broke**

```bash
grep -rn "CreditCheckingResultModal" src/
```
Confirm every call site still only imports/uses `CreditCheckingResultModal` (not the new `CreditCheckingResultContent` yet — that's Task 3) and that the import path (`from './call-report/credit-checking-result-modal'` or similar relative path) is unchanged, since the file itself didn't move.

```bash
npx tsc --noEmit
npx eslint src/sections/admin/call-report/credit-checking-result-modal.tsx
```
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Start the dev server, open Initial Credit Checking's existing "View Result" flow (still wired to the Dialog at this point, since Task 3 hasn't rewired the page yet) and confirm it looks and behaves identically to before this task — this task is a pure internal restructure with zero visible behavior change yet.

- [ ] **Step 6: Commit**

```bash
git add src/sections/admin/call-report/credit-checking-result-modal.tsx
git commit -m "refactor: split CreditCheckingResultModal into content + Dialog wrapper

Mirrors CallReportResultModal/CallReportResultContent's existing split
so Initial Credit Checking's own page can render the result inline
later, while every other (cross-page) call site keeps using the
Dialog-wrapped CreditCheckingResultModal unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Inline Call Report's result into the Call Report page

**Files:**
- Modify: `src/sections/admin/call-report-view.tsx`

**Interfaces:**
- Consumes: `CallReportResultContent` (already exists, exported from `src/sections/admin/call-report/call-report-result-modal.tsx`, signature `({ hideHeader }: { hideHeader?: boolean } = {})`), `CollapsibleSection` (from `src/components/collapsible-section`).
- Produces: nothing new exported — this task only changes `CallReportView`'s own render tree and local state.

- [ ] **Step 1: Read the current page section-by-section**

Read `src/sections/admin/call-report-view.tsx` in full. Confirmed from prior research: imports include `CallReportResultModal` (not `CallReportResultContent` yet) from `./call-report/call-report-result-modal`; state `callReportResultModalOpen` (line ~47); `SystemValidationCard` is rendered with `onViewResult={() => setCallReportResultModalOpen(true)}` (line ~236); the modal itself renders near the end (`<CallReportResultModal open={callReportResultModalOpen} onClose={...} />`, line ~311).

- [ ] **Step 2: Swap the import**

Change:
```tsx
import { CallReportResultModal } from './call-report/call-report-result-modal';
```
to:
```tsx
import { CallReportResultContent } from './call-report/call-report-result-modal';
```
(Only swap if nothing else in this file still needs the Dialog-wrapped version — confirm via the grep from Task 2 Step 4 that this page doesn't ALSO reach Call Report's result via some other path that should stay modal; prior research found only the one `callReportResultModalOpen` usage on this page, so the swap is total, not partial.)

- [ ] **Step 3: Replace the boolean state with the section's own expanded state**

Remove:
```tsx
const [callReportResultModalOpen, setCallReportResultModalOpen] = useState(false);
```
Add (matching this file's other `expanded`-style local state if any exists already — otherwise a plain new `useState`):
```tsx
const [callReportResultExpanded, setCallReportResultExpanded] = useState(false);
```

- [ ] **Step 4: Replace `SystemValidationCard`'s trigger wiring**

Change:
```tsx
<SystemValidationCard onViewResult={() => setCallReportResultModalOpen(true)} />
```
to:
```tsx
<SystemValidationCard onViewResult={() => setCallReportResultExpanded((prev) => !prev)} />
```
(Toggling rather than always-opening, since there's no longer a "close" affordance separate from the trigger itself — re-clicking "View Result" should collapse it again. If `SystemValidationCard`'s own button label/icon assumes "opens a modal" phrasing like "View Result" with no expand/collapse indication, that's acceptable to leave as-is for this task — a follow-up polish task could rename it to "View Result / Hide Result" matching Appraisal's own toggle-button copy, but is not required here.)

Immediately after `SystemValidationCard` in the JSX tree (same position the old Dialog rendered relative to page flow, so a reader scrolling the page encounters the result right where they clicked to see it), add:
```tsx
{callReportResultExpanded && (
  <Box sx={adminCardSx}>
    <CallReportResultContent hideHeader />
  </Box>
)}
```
(Import `adminCardSx` from `src/components/admin-ui` if not already imported in this file — check first.) Pass `hideHeader` since the page already has its own "Step 2 · Call Report" header via `ApplicationReviewHeader` — showing `CallReportResultContent`'s own internal "Call Report" title again directly underneath would be redundant chrome, which the Global Constraints section's "cohesive" goal argues against.

- [ ] **Step 5: Remove the old modal render**

Delete:
```tsx
<CallReportResultModal open={callReportResultModalOpen} onClose={() => setCallReportResultModalOpen(false)} />
```
from the end-of-page block where it used to render alongside `CreditCheckingResultModal`/`ConfirmDialog` (do not touch the `CreditCheckingResultModal` line here — that one is converted in Task 4, not this task, and do not touch `ConfirmDialog` at all, it's unrelated).

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
npx eslint src/sections/admin/call-report-view.tsx
```
Expected: no errors (watch for an unused `CallReportResultModal` import or unused `Box`/`adminCardSx` import mismatch).

- [ ] **Step 7: Manual smoke test**

Start the dev server, open the Call Report page for a seeded application, click "View Result" on the System Validation card, confirm the full result renders inline below it (Cleared banner if applicable, all `FieldRow` sections, AI Review/Summary, AO vs. System Variance, Endorsement Declaration signatures) with no page navigation and no modal overlay. Click again to confirm it collapses. Change a field elsewhere on the page (e.g. Risk Disposition), re-expand, and confirm the inline result reflects the updated live computation (per the Review Focus item on `currentAiSummary`/`currentVariance` recomputing from current state, not a stale snapshot).

- [ ] **Step 8: Commit**

```bash
git add src/sections/admin/call-report-view.tsx
git commit -m "feat: show Call Report result inline instead of in a modal

SystemValidationCard's 'View Result' now toggles an inline
CallReportResultContent section on the same page, instead of opening
CallReportResultModal as a popup. Cross-page views of the Call Report
result (e.g. from Application Details Card's own 'View call report'
button) are untouched and still use the Dialog-wrapped
CallReportResultModal.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Inline Initial Credit Checking's result into its own page

**Files:**
- Modify: `src/sections/admin/initial-credit-checking-view.tsx`

**Interfaces:**
- Consumes: `CreditCheckingResultContent` (new from Task 2), `adminCardSx` (from `src/components/admin-ui`).

- [ ] **Step 1: Read the current page section-by-section**

Read `src/sections/admin/initial-credit-checking-view.tsx` in full. Confirmed from prior research: imports `CreditCheckingResultModal` from `./call-report/credit-checking-result-modal`; state `resultModalOpen` (~line 143); rendered near the end (`<CreditCheckingResultModal open={resultModalOpen} onClose={...} />`, ~line 703); the exact trigger button for `resultModalOpen` was not located in the prior research pass (noted as needing lines ~600-670) — find it now by reading the full file, since this task needs to know exactly which button/card currently sets `resultModalOpen(true)`.

- [ ] **Step 2: Swap the import, state, and trigger**

Same shape as Task 3 Steps 2-4: change the import to `CreditCheckingResultContent`, replace `resultModalOpen`/`setResultModalOpen` with an `expanded`-style boolean (e.g. `creditCheckingResultExpanded`), and change whatever currently calls `setResultModalOpen(true)` to toggle the new boolean instead. Insert the inline content block right after that trigger's own card/button, in the same page-flow position the modal used to interrupt:
```tsx
{creditCheckingResultExpanded && (
  <Box sx={adminCardSx}>
    <CreditCheckingResultContent hideHeader />
  </Box>
)}
```
Pass `hideHeader` for the same reason as Task 3 (this page already has its own top-level header).

- [ ] **Step 3: Remove the old modal render**

Delete the `<CreditCheckingResultModal open={resultModalOpen} onClose={...} />` line. Do NOT touch the `<OfficerNotesDialog ... />` immediately above it in the research notes — that's an unrelated dialog, stays as-is.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx eslint src/sections/admin/initial-credit-checking-view.tsx
```

- [ ] **Step 5: Manual smoke test**

Start the dev server, open Initial Credit Checking for a seeded application with bureau files uploaded (so `CreditCheckingResultContent` has real bureau-table content to render, not just empty states), trigger the former-modal button, confirm the result (bureau tables, AI Review, any negative-finding sections if the seeded data has one, Cleared banner if applicable) renders inline and toggles correctly. Confirm the "runs once per upload session" bureau-finding simulation (per the Review Focus item) does not re-trigger or change on repeated expand/collapse.

- [ ] **Step 6: Commit**

```bash
git add src/sections/admin/initial-credit-checking-view.tsx
git commit -m "feat: show Initial Credit Checking result inline instead of in a modal

Toggles an inline CreditCheckingResultContent section on the same
page instead of opening CreditCheckingResultModal as a popup.
Cross-page views (Application Details Card's own 'View credit
checking result' button, Call Report page's reference into this
result) are untouched and still use the Dialog-wrapped
CreditCheckingResultModal.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Inline Application Details' "View Full Application" into the card itself

**Files:**
- Modify: `src/sections/admin/application-details-card.tsx`

**Interfaces:**
- Consumes: `CollapsibleSection` (already imported elsewhere in this app's cards; confirm import path matches `src/components/collapsible-section`).

- [ ] **Step 1: Read the current collapsible-branch JSX precisely**

Read `src/sections/admin/application-details-card.tsx` in full, focusing on: the `detailsOpen` state declaration (~line 258), the "View full application" trigger button (~lines 469-484), the `detailsContent` constant definition (~lines 297-399, confirmed to be shared verbatim between the collapsible and non-collapsible branches — do not restructure `detailsContent` itself, only how it's revealed), and the Dialog JSX to remove (~lines 573-587).

- [ ] **Step 2: Remove the `detailsOpen` state and its Dialog**

Delete:
```tsx
const [detailsOpen, setDetailsOpen] = useState(false);
```
Delete the whole Dialog block:
```tsx
<Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="md" scroll="paper">
  <DialogTitle sx={{ p: 3, pb: 2 }}>
    ...
  </DialogTitle>
  <Divider />
  <DialogContent sx={{ p: 3 }}>{detailsContent}</DialogContent>
</Dialog>
```
(Verify after deletion whether `DialogTitle`/`DialogContent`/`Dialog` imports in this file become fully unused — `CallReportResultModal`/`CreditCheckingResultModal`/`OfficerNotesDialog` are separate components imported from elsewhere, so this file's own `Dialog`-family imports may or may not still be needed; check before removing imports.)

- [ ] **Step 3: Replace the trigger button + convert to an inline `CollapsibleSection`**

The existing "View full application" button (~lines 469-484) currently does `onClick={() => setDetailsOpen(true)}`. Decide, based on this card's existing layout, whether to:
(a) keep the button as a toggle (`onClick={() => setDetailsExpanded((prev) => !prev)}`) with the content appearing directly below it in the card's own flow, or
(b) convert the whole "View full application" affordance into a `CollapsibleSection` wrapping `detailsContent` (title "Full application", using this card's own existing title/subtitle copy from the old `DialogTitle` — `{fullName} · {applicationNumber}` as the `subtitle` prop), removing the separate button entirely since `CollapsibleSection`'s own header IS the toggle.

Prefer (b) — it matches the Global Constraint "every toggle must use `CollapsibleSection`" and the "cohesive" design goal more directly than a bare button + conditional Box. Replace:
```tsx
<Button ... onClick={() => setDetailsOpen(true)}>
  View full application
</Button>
```
(and its surrounding layout slot) with a `CollapsibleSection`:
```tsx
const [detailsExpanded, setDetailsExpanded] = useState(false);
// ...
<CollapsibleSection
  title="Full application"
  subtitle={`${fullName} · ${applicationNumber}`}
  expanded={detailsExpanded}
  onToggle={() => setDetailsExpanded((prev) => !prev)}
>
  {detailsContent}
</CollapsibleSection>
```
placed at the same position in the card's layout the trigger button used to occupy.

- [ ] **Step 4: Confirm the non-collapsible branch is untouched**

Re-read the non-collapsible branch (~lines 609-637, per prior research: a plain `Box` with `detailsContent` and no dialogs/buttons at all) and confirm this task's changes are scoped entirely to the collapsible branch (~lines 401-607) — the non-collapsible branch already shows `detailsContent` unconditionally and has no `detailsOpen` state to remove.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npx eslint src/sections/admin/application-details-card.tsx
```
Watch specifically for unused imports (`Dialog`, `DialogTitle`, `DialogContent` if nothing else in this file uses them) and for `fullName`/`applicationNumber` still being in scope at the new `CollapsibleSection` call site (they were previously only read inside the Dialog's `DialogTitle`).

- [ ] **Step 6: Manual smoke test**

Start the dev server, open each of the 3 pages that render `<ApplicationDetailsCard collapsible ... />` (Call Report, Initial Credit Checking, and at least one more from the 8 call sites noted in prior research) and confirm: "Full application" now expands/collapses inline instead of opening a Dialog; the content (Applicant, Loan request, Personal & ID information, Spouse information if married, Uploaded documents) is identical to what the old Dialog showed; the card's OTHER buttons ("View call report", "View credit checking result", notes) still open their respective Dialogs unchanged, since those three were explicitly kept as cross-page/nested modals per this plan's scope.

- [ ] **Step 7: Commit**

```bash
git add src/sections/admin/application-details-card.tsx
git commit -m "feat: expand Full Application inline instead of in a modal

The collapsible ApplicationDetailsCard's 'View full application'
button now toggles a CollapsibleSection showing detailsContent
inline, instead of opening a Dialog. The card's other dialogs (View
call report, View credit checking result, Officer notes) are
unchanged -- they still open as modals, since those cross into a
different flow/page's own result rather than this card's own content.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Unify visual language across all three content components

**Files:**
- Modify: `src/sections/admin/call-report/call-report-result-modal.tsx`
- Modify: `src/sections/admin/call-report/credit-checking-result-modal.tsx`
- Modify: `src/sections/admin/application-details-card.tsx` (only if its `detailsContent`'s own section headers deviate from the shared style — check first; it may already use `DetailSection`, a different but acceptable pattern per-component, not necessarily `SectionLabel`/`FieldGrid`)

**Interfaces:**
- Consumes: `SectionLabel`, `Field`, `FieldGrid` from `src/components/admin-ui` (Task 1).

- [ ] **Step 1: Compare the three files' current label/value primitives side-by-side**

Read the local `SectionLabel`/`FieldRow` definitions in `call-report-result-modal.tsx` (lines 50-88, both `SectionLabel` and `FieldRow`/`NarrativeBlock`/`SignatureField`) and in `credit-checking-result-modal.tsx` (lines 56-81, `SectionLabel`/`FieldRow`). Note precisely how each differs from the Task 1 shared `SectionLabel`/`Field`/`FieldGrid` (e.g., `FieldRow`'s label column width differs — 110px in credit-checking vs 200px in call-report — and both use a horizontal `Stack direction="row"` per field rather than a `FieldGrid`'s responsive grid-of-cells).

- [ ] **Step 2: Decide per-section whether to switch to `FieldGrid`/`Field` or keep `FieldRow`-style rows**

This step requires judgment, not a mechanical find-replace: sections with many short fields (e.g. Credit Checking Report's Application No./Client Name/Email/etc., Call Report's own header fields) read better in a `FieldGrid` of short `Field` cells (matching Appraisal's dense form-line look). Sections that are inherently one long value per row (e.g. `NarrativeBlock`-driven free-text fields) should stay as they are — `Field`/`FieldGrid` is not a replacement for `NarrativeBlock`, only for `FieldRow`. Apply this swap only to the `FieldRow`-driven header/summary boxes identified in Step 1, not to every section in either file. Keep `NarrativeBlock`, `SignatureField`, `BureauResultSection`, and all risk/variance-styled boxes exactly as they are — those are bespoke, information-dense displays with no equivalent in `appraisal-report-view.tsx`, and forcing them into `Field`/`FieldGrid` would lose information or readability, not gain cohesion.

- [ ] **Step 3: Apply the swap**

For each identified `FieldRow`-driven box in both files, replace the local `SectionLabel`+`Stack` of `FieldRow`s with the shared `SectionLabel` + a `FieldGrid` of `Field`s, preserving every existing value/label pairing exactly (same labels, same source expressions) — only the layout primitive changes. Remove each file's now-unused local `SectionLabel`/`FieldRow` definitions once nothing in that file calls them anymore (if `FieldRow` is still used by a kept section — e.g. because Step 2 judged some `FieldRow` usages should stay — keep the local `FieldRow` definition but switch its remaining call sites' `SectionLabel` to the shared import instead of maintaining two near-identical `SectionLabel`s in the same file).

- [ ] **Step 4: Check `application-details-card.tsx`'s own section headers**

Read its `DetailSection` helper (~lines 202-239) and decide whether its header styling already matches the shared `SectionLabel` closely enough to leave alone (likely yes, given it's described as "icon-headed sub-cards" — a different but already-established pattern for this specific card, which predates this plan and is used elsewhere in this same file beyond just the Full Application section) — if it's visually inconsistent with the shared style in a way a user would notice side-by-side with Call Report/Credit Checking's result views, consider updating `DetailSection`'s header Typography to match `SectionLabel`'s exact `sx` (font-size/weight/letter-spacing/color), but do NOT restructure `DetailSection`'s overall icon-box layout — that's a reasonable, intentional design for this specific card and out of scope here.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npx eslint src/sections/admin/call-report/call-report-result-modal.tsx src/sections/admin/call-report/credit-checking-result-modal.tsx src/sections/admin/application-details-card.tsx
```

- [ ] **Step 6: Full visual smoke test across all three**

Start the dev server (or reuse the one already running). Open, in order: Call Report page (expand its inline result), Initial Credit Checking page (expand its inline result), any page with `ApplicationDetailsCard` (expand "Full application"), and `/admin/appraisal-appraiser/[bundleId]` (the reference design). Confirm the header/label/value styling (uppercase section labels with a divider underneath, hairline-underlined field values in a responsive grid) reads as the same design system across all four, not four slightly different implementations. This is the plan's actual "cohesive" deliverable — treat any visible inconsistency found here as a bug to fix before calling this task done.

- [ ] **Step 7: Run the full build once, as the final check for this whole plan**

```bash
npm run build
```
Expected: builds successfully with no type errors across the whole app (this plan touched 5 files feeding several routes — a full build is the cheapest way to catch a cross-file mistake the per-file `tsc --noEmit` runs might have missed due to incremental caching).

- [ ] **Step 8: Update docs**

Update whichever docs files describe Call Report, Initial Credit Checking, and Application Details' own result-viewing UX (search `docs/` for each page's own doc — likely `docs/080-account-solicitation-call-report.md` and a Credit Checking equivalent) with a short note that the result now renders inline on the same page instead of in a modal, plus a dated History entry per this project's own documentation convention (see memory: "always update docs, only the affected section + maintenance header, not every historical mention"). Do NOT rewrite each doc's full existing description of the result content itself (bureau tables, AI review, etc.) — only the "how it's revealed" sentence/paragraph changes, plus one new History bullet per doc.

- [ ] **Step 9: Final commit**

```bash
git add src/components/admin-ui/report-field.tsx src/components/admin-ui/index.ts src/sections/admin/appraisal/appraisal-report-view.tsx src/sections/admin/call-report-view.tsx src/sections/admin/initial-credit-checking-view.tsx src/sections/admin/application-details-card.tsx src/sections/admin/call-report/call-report-result-modal.tsx src/sections/admin/call-report/credit-checking-result-modal.tsx docs/*.md
git commit -m "refactor: unify Field/FieldGrid visual language across inline result views

Swaps each file's own FieldRow-driven header/summary boxes over to
the shared SectionLabel/Field/FieldGrid primitives from
src/components/admin-ui/report-field.tsx, so Call Report's, Initial
Credit Checking's, and Application Details' inline result sections
read as one cohesive design system with the Appraisal Report view
they were modeled on. Narrative/signature/bureau-table sections are
left as their existing bespoke components -- only the plain
label-value rows changed layout primitive.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
