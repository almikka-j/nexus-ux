# UI/UX Audit

> **Maintenance rule:** update this file whenever
> `src/components/admin-ui/admin-tokens.ts` or
> `src/components/custom-dialog/confirm-dialog.tsx`'s
> `confirmDialogActionToneSx` change — those two files are what this
> audit's findings turned into shared tokens/components. Companion to
> `docs/230-project-overview.md` (theming section) and every per-page doc
> that reuses `adminCardSx`/`TONE_COLORS`/`outlinedNavyButtonSx`.

## What this is

A record of the design-consistency pass that produced the admin app's
shared design tokens (`src/components/admin-ui/admin-tokens.ts`) and the
`ConfirmDialog` action-tone convention
(`src/components/custom-dialog/confirm-dialog.tsx`'s
`confirmDialogActionToneSx`) — both files' own comments point back here.
This doc exists so those two comments have something real to point at;
it was reconstructed from the tokens/components that actually shipped as
a result of the audit, not a full narrative of the original review
session.

## Findings → shared tokens

**Finding: every screen picked its own near-identical hex for the same
semantic meaning** (a "success" green, a "warning" amber, an "error"
red, etc., each hand-typed per call site instead of shared). Fixed by
`TONE_COLORS: Record<SemanticTone, { bg, text, border, solid,
solidHover }>` — one entry per `'success' | 'warning' | 'error' |
'neutral' | 'info'`, consumed by `StatusBadge` and every status
pill/chip across the admin app.

**Finding: the same white "card" container (padding, radius, border,
shadow) was hand-copied onto every top-level section box** (Document
Checklist, CI Fee, AI Summary, etc.), drifting slightly between screens.
Fixed by `adminCardSx` — one shared `sx` object every admin page's
top-level cards spread in.

**Finding: the outlined navy "View / Request / secondary" button was the
single most duplicated button style in the app**, each instance
re-typing the same color/border/hover values. Fixed by
`outlinedNavyButtonSx`.

**Finding: the "⋮" more-actions icon button was missing a hover state on
most instances it appeared.** Fixed by `iconButtonBorderedSx`, which
bakes the hover treatment in so it can't be forgotten at a new call
site.

**Finding: a pipeline step's status pill could read a different color
depending on which screen showed it** (the Application List table's
Status column vs. `ApplicationReviewHeader`'s own step pill computing
tone independently). Fixed by `STEP_TONE: Record<ReviewStep,
SemanticTone>` — one shared mapping both surfaces read from, keyed by
step rather than by decision, since the pill communicates *which stage*
an application is at, not its outcome.

**Finding: confirm dialogs hard-coded their action button's color per
call site** — every "Approve"/"Decline"/"Delete" confirmation across the
app re-typed its own `bgcolor`/hover values on `ConfirmDialog`'s action
button, drifting slightly between screens the same way the card/button
styles above did. Fixed by `confirmDialogActionToneSx` — two tones,
`default` (navy, for approve/confirm/proceed-style actions) and
`destructive` (red, for disapprove/reject/delete-style actions), so a
call site only ever picks a tone rather than hand-writing a color.

## Non-goals

- This is not a visual redesign log — individual pages' own design
  changes (e.g. Call Report Result's redesign, `docs/240-tasks.md`'s weekly
  entries) are documented in their own page-specific docs, not here.
- No formal accessibility (contrast ratio, screen-reader) audit is
  recorded — the tokens above were driven by visual consistency, not a
  documented a11y pass.
