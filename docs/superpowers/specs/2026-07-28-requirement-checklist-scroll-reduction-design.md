# Requirement Checklist — Reduce Long-Page Scrolling

## Context

Officers reviewing the Requirement Checklist page (`requirement-checklist-view.tsx`)
report the page is too long to scroll through. The page stacks three large cards —
Credit Investigation, Appraisal (per collateral property), and Financial Evaluation —
each fully expanded by default and each listing every document row, verified or not.
Reaching a later section, or finding the few rows that still need action, means
scrolling past a wall of already-fine document rows.

The page already has per-section manual collapse (`creditInvestigationCollapsed`,
`appraisalCollapsed`, `financialEvaluationCollapsed`, `collapsedAppraisalGroups`) and
a `sortByAttentionFirst` helper that sorts needs-attention docs before verified ones
within a section. It also has a `handleJumpToOutstanding` function that cycles through
outstanding (needs-attention) rows, expanding their owning section and scrolling to
them — but this function is currently dead code, never wired to any UI control.

## Goals

1. Let an officer jump directly to any of the 3 sections without scrolling past the
   others.
2. Reduce the default vertical height of each section by hiding already-verified
   document rows behind a single collapsed summary row, surfacing only what still
   needs attention.
3. Reuse the existing `handleJumpToOutstanding` scroll/expand pattern instead of
   duplicating it.

## Non-goals

- Splitting the page into separate tabs/routes per section. The single-page layout
  is intentional so an officer can review everything in one continuous document
  before endorsing; this design keeps that but makes it faster to navigate.
- Changing `RequirementDocRow` internals, the Appraisal per-property grouping
  structure, or the AI review/summary/recommendation cards below the three
  sections.
- Changing the existing per-section manual collapse/expand toggles — the new
  auto-collapse (verified-docs-only) is additive and independent of those.

## Design

### 1. Section nav

A new component, `RequirementChecklistSectionNav`, renders 3 entries — one per
section (Credit Investigation / Appraisal / Financial Evaluation) — each showing:

- The section label (from `REQUIREMENT_TAB_LABELS`)
- A `received/total` count badge (same data already computed for each section's
  `DocumentCountBadge`)
- A status dot using the existing `RISK_STYLES` colors (good/watch/high) so an
  officer can see which sections still need work without opening them

Clicking an entry:

1. Expands that section if its manual collapse state is `true`
2. Smooth-scrolls to the section's top (via a ref, same pattern as
   `rowRefs`/`scrollIntoView` used in `handleJumpToOutstanding`)

**Responsive placement:**

- `md` and up: a slim vertical panel positioned in the side margin outside the
  `maxWidth="md"` container, `position: sticky` with a `top` offset below the app
  header. Hidden via `sx={{ display: { xs: 'none', md: 'block' } }}`.
- Below `md`: the same 3 entries render as a horizontal sticky bar
  (`position: sticky`, `top: 0` under the app header), shown only once the user has
  scrolled past the summary card (tracked via a scroll listener or
  `IntersectionObserver` on the summary card's bottom edge), so it doesn't take up
  space in the initial viewport. Shown via the inverse `sx={{ display: { xs: 'block', md: 'none' } }}`.

Both variants are the same component with different `sx` — not two separate
implementations — driven by one shared list of section entries built from existing
per-section data (counts, risk level, collapsed-state setter, section ref).

### 2. Auto-collapse verified documents within a section

Within each section's document list (Credit Investigation's two subgroups, each
Appraisal property group, Financial Evaluation), rows are split by
`needsAttention(doc)`:

- Needs-attention rows render as full `RequirementDocRow`s, in their existing sort
  order (unchanged — `sortByAttentionFirst` already puts these first).
- Verified rows are hidden by default behind one small summary row:
  `✓ N verified documents`, styled as a low-emphasis collapsed row (similar
  treatment to the existing section-level collapse chevron). Clicking it expands
  to reveal the full `RequirementDocRow` list for those docs, in-place.
- If a section/subgroup has zero needs-attention docs, only the
  `✓ all N verified` row shows — still expandable for a full re-review.
- This fold is independent per subgroup/property group — expanding one doesn't
  affect others.

This is implemented as a small wrapper around the existing row-rendering `.map()`
calls: split the entries array into `attention` and `verified` before mapping,
render `attention` directly, and wrap `verified` in a new collapsible
`VerifiedDocsGroup` component (local to `requirement-checklist-view.tsx`, since
this pattern repeats 4 times: 2 credit-investigation subgroups, N appraisal
property groups, 1 financial-evaluation list).

### 3. Wire up `handleJumpToOutstanding`

Currently unused. Repurpose it as the section nav's underlying jump mechanism —
either called directly per section (filtering `outstandingRowIds` to the clicked
section) or left as-is for a possible future "next outstanding item" affordance,
whichever fits more naturally once implementation starts. At minimum, the
scroll-and-expand logic it contains should be shared with (not duplicated by) the
new nav's click handler.

## Testing

- Manual: verify section nav jump + auto-expand works for all 3 sections, in both
  the side-panel (desktop width) and top-bar (mobile width) layouts.
- Manual: verify verified-docs fold/unfold per subgroup and per appraisal property
  group, independently.
- Manual: verify a section with zero outstanding docs still shows a
  correctly-labeled "all verified" row.
- Existing manual per-section collapse/expand behavior (unaffected by this change)
  still works.
