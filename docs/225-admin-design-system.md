# Design System — Admin Portal

> **Maintenance rule:** update this file **and** the live showcase
> (`src/sections/admin/design-system-view.tsx`, at `/admin/design-system`)
> whenever any of these change:
>
> - `src/components/admin-ui/admin-tokens.ts` — tokens
> - `src/components/admin-ui/status-badge.tsx` — `StatusBadge`
> - `src/components/collapsible-section/collapsible-section.tsx` — the card header contract
> - `src/components/custom-dialog/confirm-dialog.tsx` + `types.ts` — `ConfirmDialog`, `confirmDialogActionToneSx`
> - `src/sections/admin/application-review-header.tsx` — the per-application page shell header
> - `src/theme/core/typography.ts` — the font / weight scale
>
> Companion to `docs/220-ui-ux-audit.md` (the audit that produced the
> tokens) and `docs/230-project-overview.md`'s Theming section.

## 1. Purpose and Scope

The shared UI/UX conventions for the **admin portal** — every screen under
`/admin/*` (the application-review pipeline, the request/approval queues,
the dashboard). It says which shared token or component to use, and how to
compose a screen, so admin screens stay consistent.

**Out of scope:**

- **Borrower- and auth-facing screens** (`/`, `/auth/*`, `/borrower/*`).
  Those have their own separate conventions in
  `src/sections/auth/auth-input-styles.ts` (`authFieldSx`,
  `authFieldLabelSx`, `authPrimaryButtonSx`) and are **not** covered here.
  Do not assume a component listed below is used borrower-side.
- The MUI theme itself (`src/theme/*`) — palette, base component overrides.
  The admin tokens sit *on top of* the theme, mostly as literal hex chosen
  by eye rather than pulled from `palette.ts`.
- Visual redesigns of individual screens — those live in each screen's own
  feature-note doc (`docs/0XX`–`docs/2XX`).

## 2. Source of Truth

**This Markdown file is authoritative** for the intended admin UI/UX
conventions. The live showcase page at `/admin/design-system`
(`design-system-view.tsx`, reached from the floating settings popover →
**Reference → View design system**) is the *visual representation* of this
document — it renders every primitive from the real shared
tokens/components, so anything wrong there is wrong everywhere.

If the doc and the page disagree: decide the intended behaviour, then fix
**both** so they match. Do not silently keep a conflict. Do not add a
component, token, state, or rule to either that the application does not
actually support — label anything that exists only for the showcase.

## 3. Design Principles

1. **Consistency over novelty.** Reach for an existing token/component
   before inventing a look. A near-identical hand-typed hex is a bug.
2. **Clear information hierarchy.** One card = one concern. Title (`16/700`)
   → subtitle (`13.5/#8891A6`) → body. Amounts are `tabular-nums` and
   bold; supporting text is muted.
3. **Efficient workflows.** The primary action sits in the card header
   (`headerAction`), not buried in the body. Decisions (Proceed /
   Disapprove) are a single always-visible card at the end of a page.
4. **Progressive disclosure.** Long content collapses (`CollapsibleSection`);
   detail lives one click away (a Manage/View modal, a queue-row → detail
   page) rather than all on one screen.
5. **Error prevention.** Destructive and forward actions are gated by a
   `ConfirmDialog`; a submit stays disabled until its inputs are valid;
   there is no separate "unsaved changes" trap because form fields persist
   on keystroke.
6. **Visible feedback.** Status is a coloured **and labelled**
   `StatusBadge`; a saved form stamps a "Saved" badge; a decision shows a
   terminal state screen. No silent state changes.
7. **Reuse of existing patterns.** The queue → detail split, the
   Proceed/Disapprove card, the read-only "AI review" callout, the
   Manage/View modal pair — each is a pattern already established on
   another screen; copy it rather than design a new one.
8. **Accessibility as a floor.** Real `<button>`/`ButtonBase`/`IconButton`
   semantics, visible focus (MUI default ring), status never conveyed by
   colour alone. Not a formal audit — see §11.
9. **Desktop-first, responsive-safe.** Admin screens are built for a
   desktop reviewer at `maxWidth="lg"`. They must not break or scroll the
   page body on a narrow viewport (stacks reflow, wide tables scroll
   inside their own container), but there is no mobile-specific admin
   design.

## 4. Design Tokens

### 4.1 Semantic colour — `TONE_COLORS`

`src/components/admin-ui/admin-tokens.ts`.
`Record<SemanticTone, { bg, text, border, solid, solidHover }>`, one entry
per `SemanticTone = 'success' | 'warning' | 'error' | 'neutral' | 'info'`.

| Tone | bg | text | border | solid | solidHover |
| --- | --- | --- | --- | --- | --- |
| success | `#E7F8F0` | `#0C8A4F` | `#C7EDDA` | `#12B76A` | `#0C8A4F` |
| warning | `#FEF0D6` | `#B36A05` | `#F4DBA3` | `#F79009` | `#B36A05` |
| error | `#FDE2DF` | `#B32C22` | `#F3C4BE` | `#F04438` | `#B32C22` |
| neutral | `#F5F6FA` | `#8891A6` | `#E1E4ED` | `#8891A6` | `#667085` |
| info | `#EEF1FE` | `#3448B0` | `#D6DCFA` | `#1C2A6E` | `#14205A` |

- **Never hand-type a semantic hex.** Import `TONE_COLORS`, or a component
  that already consumes it (`StatusBadge`, `confirmDialogActionToneSx`).
- `bg`/`text` for tinted pills and callout boxes; `border` for their
  outline; `solid`/`solidHover` for a filled button of that tone.

### 4.2 Pipeline-step colour — `STEP_TONE`

`admin-tokens.ts`. `Record<ReviewStep, SemanticTone>`. The Application List
table's Status column and `ApplicationReviewHeader`'s step pill both read
it, so a step is the same colour everywhere. Keyed by **step**, not
decision (the pill says *which stage*, not the outcome).

| Step | Tone |
| --- | --- |
| `creditChecking` | warning |
| `reconsideration` | error |
| `callReport` | info |
| `requirementChecklist` | success |
| `creditInvestigation` | info |
| `appraisal` | info |
| `financialEvaluation` | info |

### 4.3 Shared structural hex (not tokenised — reuse verbatim)

Non-semantic structural colours that recur across screens. They are **not**
in `admin-tokens.ts`; use these exact values rather than a near-miss.

| Hex | Role |
| --- | --- |
| `#14172A` | Heading text — card titles, primary values |
| `#3B4256` | Body text |
| `#5A6273` | Secondary body / table-cell text |
| `#8891A6` | Muted text — subtitles, table headers, meta lines |
| `#98A1B3` / `#A0A7B5` | Faint meta text (timestamps, footnotes) |
| `#667085` | Muted text (page-intro paragraphs) |
| `#1C2A6E` / `#14205A` | Navy — primary buttons, links, accents / its hover |
| `#C7CEEA` / `#C7CCDA` | Muted navy outline (outlined-button borders) |
| `#E1E4ED` | Divider under a table header row |
| `#EEF0F5` | Hairline borders inside cards and tables |
| `#EBEDF3` | Card border (part of `adminCardSx`) |
| `#FBFBFD` | Table header background |
| `#FAFBFD` / `#F9FAFC` | Tinted panel background — insets, callout boxes |
| `#F1F3F8` / `#F5F6FA` | Neutral chip / code-inline background |
| `#FDF3F2` | Destructive-secondary button hover tint (outlined "Disapprove" style) |

### 4.4 Typography

`src/theme/core/typography.ts` — **Plus Jakarta Sans** everywhere (primary
and secondary both point to it). Weights available: `300 / 400 / 500 /
600 / 700 / 800`.

Admin screens set sizes/weights inline (they do not use the theme's
`h1`–`h6` variants). The roles in use:

| Role | Size | Weight | Colour | Extras |
| --- | --- | --- | --- | --- |
| Page title | `30` | `800` | `#14172A` | `letterSpacing: -0.02em` — the queue/list pages' `<h1>` |
| Page subtitle | `14` | `400` | `#667085` | one line under a page title (queue lists, `mt: 0.5`) |
| Showcase section heading | `20` | `800` | `#14172A` | `letterSpacing: -0.01em` |
| Card title | `16` | `700` | `#14172A` | — |
| Card / section subtitle | `13.5` | `400` | `#8891A6` | — |
| Body text | `13.5` | `400` | `#3B4256` | `line-height: 1.6` |
| Field label | `12.5` | `600` | `#3B4256` | required marker `#F04438` |
| Sub-section label | `12` | `700` | `#8891A6` | uppercase / `0.06em` |
| Role eyebrow | `13` | `700` | `#3448B0` | uppercase / `0.06em` — the "APPRAISAL OFFICER" / "APPRAISER" / "CI HEAD" label on a personal role workspace (see §10) |
| Table header | `11` | `700` | `#8891A6` | uppercase / `0.05em` |
| Badge / pill | `11.5` | `700` | per tone | — |
| Meta / timestamp | `11`–`11.5` | `400` | `#98A1B3` | — |
| Dashboard greeting | `15` (line 1) + `30` / `800` (line 2) | — | line 1 `#667085`, line 2 `#14172A` | "Welcome back" + "Hi, {name} 👋" — the dashboard only (§13) |
| Dashboard stat value | `26` | `800` | `#14172A` | the big number in a `StatCard` — the dashboard only |

### 4.5 Spacing, sizing, radius, borders, shadows

MUI spacing unit = `8px`. Values in use:

| Token | Value | Where |
| --- | --- | --- |
| Card padding | `p: { xs: 3, md: 4 }` (24 / 32) | `adminCardSx` |
| Tighter card padding | `p: { xs: 2.5, md: 3 }` (20 / 24) | `ApplicationDetailsCard` `collapsible` variant |
| Card stack gap | `Stack spacing={2.5}` (20) | every review page |
| Page vertical padding | `py: { xs: 4, md: 6 }` (32 / 48) | `<Container>` |
| Card radius | `16px` | `adminCardSx` |
| Button radius | `10px` (primary) / `9px` (`outlinedNavyButtonSx`, `iconButtonBorderedSx`) | tokens |
| Pill / badge radius | `999px` | `StatusBadge` |
| Callout / inset radius | `10`–`14px` | per screen |
| Card border | `1px solid #EBEDF3` | `adminCardSx` |
| Card shadow | `0 1px 2px rgba(20,23,42,0.04)` | `adminCardSx` |
| Table-cell padding | `py: 1.375, px: 2` | admin table recipe |
| Table-header padding | `py: 1.5, px: 2` | admin table recipe |

### 4.6 Container widths & breakpoints

MUI default breakpoints, **not overridden**: `xs 0` / `sm 600` / `md 900`
/ `lg 1200` / `xl 1536`.

| Container | maxWidth | Where |
| --- | --- | --- |
| Standard review page + list/queue page | `"lg"` (1200) | the nav-bar-aligned width — every multi-card pipeline review page (Initial Credit Checking, Call Report, Requirement Checklist, Credit Investigation, Appraisal, Financial Evaluation), every queue list page, the dashboard, Negative List, the design-system showcase |
| Focused single-column detail / form page | `"md"` (900) | a screen that is one narrow column — no wide table, no side-by-side cards: **Applicant Profile**, **Reconsideration** (form + terminal screen), **Payment detail** (`/admin/payment/[kind]`), and **every `/current` bundle-detail / approval-detail view** (CI Fee, Call Report, Appraisal Fee, Appraisal Report). See §13 for Call Report, which is a pipeline step and now uses `lg`. |
| Two-column split page | `"xl"` (1536) | Initial Credit Checking's optional split-layout only |
| Full-bleed listing | `maxWidth={false}`, `px: { xs: 2, md: 5 }` | Application List table page |

## 5. Layout and Responsive Rules

- **Page shell:** `<Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>`
  → `<ApplicationReviewHeader …>` (per-application pages only) →
  `<Stack spacing={2.5}>` of cards. **Width:** `"lg"` for a multi-card
  review page or a list/queue page; `"md"` for a focused single-column
  detail / form page; `"xl"` only for a two-column split; see §4.6 for the
  full page → tier mapping.
- **Card:** `<Box sx={adminCardSx}>` wrapping a `CollapsibleSection` (see
  §6). Never re-type the padding/border/shadow — spread `adminCardSx`.
- **Sections inside a card:** separate with
  `borderTop: '1px solid #EEF0F5'` + `pt: 3`, not extra cards.
- **Tables:** wrap in `<Box>` (`1px #EBEDF3`, `radius 16`, `overflow hidden`)
  around a `<TableContainer sx={{ overflowX: 'auto' }}>`. A wide table
  scrolls **inside its container**; the page body never scrolls
  horizontally. Fit-to-width tables use `tableLayout: fixed` + a
  `<colgroup>` weight (see §6, Table).
- **Modals:** `<Dialog maxWidth="sm"|"md"|"lg" fullWidth>`. Data-entry
  forms use `"lg"` + `scroll="paper"`; small edits use `"sm"`; read-only
  reports use `"md"`.
- **Sidebar / top nav:** the layout offers **two nav modes** — top
  (default) and side — toggled from the floating settings popover
  (`nav-mode-context.tsx`, `nav-settings-button.tsx`). Screen content does
  not change between modes.
- **Responsive:** stacks that are horizontal on desktop reflow to vertical
  with `direction={{ xs: 'column', sm: 'row' }}`; grids drop columns with
  `gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(5,1fr)' }`.
  There is **no mobile-specific admin layout** — it is expected to be used
  on a desktop; narrow-viewport behaviour only has to stay usable, not be
  designed.

## 6. Component Inventory

### `adminCardSx` (token, not a component)

- **Source:** `admin-tokens.ts`
- **Purpose:** the one white card container for every top-level admin
  section box.
- **Value:** `p: { xs: 3, md: 4 }`, `borderRadius: '16px'`,
  `bgcolor: 'common.white'`, `border: '1px solid #EBEDF3'`,
  `boxShadow: '0 1px 2px rgba(20,23,42,0.04)'`.
- **Usage:** `<Box sx={adminCardSx}>`. Spread it; add page-specific keys
  after the spread. Never hand-copy the values.
- **Screens:** every admin review/queue/dashboard screen.
- **Known limitation:** `ApplicationDetailsCard`'s `collapsible` variant
  overrides to a tighter `p: { xs: 2.5, md: 3 }` — see §13.

### `CollapsibleSection` + `CollapsibleSectionBadge`

- **Source:** `src/components/collapsible-section/collapsible-section.tsx`
- **Purpose:** the single card-header contract for the admin app — a
  title, an optional subtitle/badge, an optional trailing action, and an
  optional collapsible body.
- **Props:**
  - `title: string` — the card's name.
  - `icon?: string` — a small Iconify glyph before the title (after the
    chevron), `18px` muted grey. Used by the AI review card
    (`solar:magic-stick-3-bold-duotone`). Omit for a plain text header.
  - `subtitle?: ReactNode` — one-line description, rendered **under the
    title**, aligned with the title text. Part of the header, so it stays
    visible when collapsed.
  - `expanded?: boolean` / `onToggle?: () => void` — required when
    `children` is given; ignored (and safe to omit) for a header-only
    card.
  - `badge?: ReactNode` — a count/status pill next to the title
    (`CollapsibleSectionBadge` renders `N/M on file`; or pass a
    `StatusBadge`).
  - `completeIcon?: ReactNode` — shown next to the badge only when
    expanded and fully complete (e.g. a green check).
  - `headerAction?: ReactNode` — the card's primary action(s), at the
    header row's trailing edge. Clicks inside it never toggle the section.
  - `children?: ReactNode` — the collapsible body. **Omit entirely** for a
    header-only card: the chevron and toggle disappear.
- **Slot rules:**
  - `title` — never repeat it inside the body.
  - `subtitle` — the description goes **here**, not as the first line of
    the body.
  - `headerAction` — Manage / View / Upload / Add buttons go **here**, not
    in the body.
- **States:** expanded / collapsed (chevron rotates `0deg` ↔ `-90deg`,
  body animates via `Collapse`); header-only (no chevron).
- **Screens:** Document Checklist, Requirement Checklist per-tab groups,
  the four Financial Evaluation cards, Bureau Reports rows, Negative Credit
  Report entries, the AI-review card.
- **Feature notes:** `docs/090`, `docs/100`, `docs/120`.
- **Accessibility:** the toggle is a `ButtonBase` — keyboard-focusable,
  Enter/Space activate.
- **Layout:**
  ```
  ┌──────────────────────────────────────────────────────────┐
  │ ▸ Card Name  [3/9 on file]              [ Manage ][ View ]│  ← header row
  │    One-line description of the card.                      │  ← subtitle, under the title
  │ ──────────────────────────────────────────────────────── │  ← body (if any) starts here
  └──────────────────────────────────────────────────────────┘
  ```

### `StatusBadge` + `CollapsibleSectionBadge`

- **Source:** `src/components/admin-ui/status-badge.tsx`
- **Purpose:** the one pill for every status / count chip.
- **Props:** `tone: SemanticTone`, `label: ReactNode`, `icon?: string`
  (Iconify name), `dot?: boolean`.
- **Variants:** by `tone` (5); with a leading **icon**, a leading **ringed
  dot** (`dot` — the "which pipeline stage" style used in the Application
  List Status column; ignored if `icon` is also set), or text-only.
  `CollapsibleSectionBadge({ received, total })` is a thin
  `tone="neutral"` wrapper rendering `"N/M on file"`.
- **Usage:** status must also read as **text** — the `label` carries the
  meaning, `tone` / `dot` only reinforce it (see §11).
- **Screens:** Application List Status column (`dot`), every review header
  step pill, every checklist row status, queue-row status.
- **Known limitation:** fixed padding — not sized down for dense tables;
  some tables still use a hand-rolled smaller pill.

### `AiReviewCard` + `AiRecommendationSummary`

- **Source:** `src/components/admin-ui/ai-review-card.tsx` (+
  `ai-recommendation-summary.tsx`, `ai-review-tokens.ts`)
- **Purpose:** the one **"AI review, summary & recommendation"** card,
  shared by Initial Credit Checking, Requirement Checklist, Credit
  Investigation, and Financial Evaluation. One visual pattern — a
  `CollapsibleSection` with the `solar:magic-stick-3-bold-duotone` icon, a
  risk-toned box, and the **AI Control Statement** footnote — driven by
  optional content slots so each screen shows only what it computes.
- **Two variants (same shell):**
  - **Compact** — pass `risk` + `summary` + `recommendation`. Renders an
    "AI Summary" box (`#F9FAFC`, `document-text` icon) and an "AI
    Recommendation" box (tinted `risk.bg`) whose heading is plain **"AI
    Recommendation"** with the risk level shown as a **white pill**
    (`risk.icon` + `risk.label`) — *not* a `· {label}` suffix. Used by
    Requirement Checklist / Credit Investigation / Financial Evaluation.
  - **Rich** — pass `richResult` (an `InitialCreditCheckingResult`).
    Renders `AiRecommendationSummary`: Overall Assessment box (risk pill +
    prose + typed AI Summary sub-groups) → AI Recommended Action box
    (action pill + reason + Review Basis tags) → Required Verification /
    Next Steps box → its own Control Statement footnote. Used by Initial
    Credit Checking, and directly (not via `AiReviewCard`) by the Initial
    Credit Checking Result modal.
- **Props:** `icon?`, `title?` (default "AI review, summary &
  recommendation"), `subtitle?`, `expanded?` / `onToggle?` (omit both →
  always-open, no chevron), `richResult?`, `risk?` / `summary?` /
  `recommendation?`, `showControlStatement?` (default `true`; ignored for
  the rich variant, which has its own), `footer?` (extra card content
  below the AI blocks — Initial Credit Checking's "View … Result" row +
  its `<Divider>`).
- **Risk scales (two, kept separate):**
  - `AI_REVIEW_RISK_STYLES` — **3-level document-readiness** (`good` /
    `watch` / `high`, labels "Ready" / "Almost ready" / "Not ready"). Used
    by the three compact screens. Was previously duplicated (a private
    `RISK_STYLES` in `requirement-checklist-view.tsx` + an
    `AI_REVIEW_RISK_STYLES` in `credit-investigation-risk.ts`) — both
    removed, one copy now in `ai-review-tokens.ts`.
  - `SCREENING_RISK_STYLES` — **5-level screening risk** (`low` /
    `moderate` / `elevated` / `high` / `unable-to-determine`). Used by the
    rich Initial Credit Checking variant. Was `RISK_LEVEL_STYLES` in
    `ai-recommendation-summary.tsx`; moved and renamed, re-exported under
    the old name for compatibility.
- **Renders `<Box adminCardSx>` itself** — callers do **not** wrap it in
  another card box (no nested shells).
- **Screens:** Initial Credit Checking (rich, collapsible, `footer`),
  Requirement Checklist (compact, collapsible), Credit Investigation
  (compact, collapsible — starts collapsed once CI Fee is approved),
  Financial Evaluation (compact, collapsible).
- **Feature notes:** `docs/070`, `docs/090`, `docs/100`, `docs/120`.
- **Accessibility / responsive:** it's a `CollapsibleSection` (keyboard
  toggle); the rich variant's action row is `direction={{ xs: 'column',
  sm: 'row' }}`.
- **Documented content differences (not styling drift — see §13):** rich
  vs. compact content; 5-level vs. 3-level risk scale; Initial Credit
  Checking's merged `footer` row; Credit Investigation's collapse-on-fee-
  approval default.

### Buttons (styled via tokens, no wrapper component)

| Use | Recipe | Source |
| --- | --- | --- |
| **Primary** | `variant="contained"`, `bgcolor: '#1C2A6E'`, `borderRadius: '10px'`, `px: 2.5`, hover `#14205A` | inline |
| **Secondary / View / Manage** | `variant="outlined"`, `size="small"`, spread `outlinedNavyButtonSx`, `px: 1.5` | `admin-tokens.ts` |
| **Destructive-secondary** | `variant="outlined"`, `color: '#5A6273'`, `borderColor: '#C7CCDA'`, hover → `#B32C22` border+text | inline |
| **More-actions (⋮)** | `IconButton size="small"` + `iconButtonBorderedSx` (hover baked in) | `admin-tokens.ts` |

- **States:** hover (per recipe); `disabled` (MUI default — greyed,
  non-interactive; used to gate a submit until valid); no separate
  loading/spinner state (admin actions are synchronous).
- **Known limitation:** primary is not a token — the
  `bgcolor/borderRadius/px/hover` block is hand-repeated. Candidate for a
  `primaryNavyButtonSx`.

### `ConfirmDialog` + `confirmDialogActionToneSx`

- **Source:** `src/components/custom-dialog/confirm-dialog.tsx` (+
  `types.ts`)
- **Purpose:** the modal for every confirm / approve / reject / delete
  decision.
- **Props:** `open`, `onClose`, `title: ReactNode`, `content?: ReactNode`,
  `action: ReactNode` (your primary `<Button>`), `size?` (`'xs'` default).
  Supplies its own **Cancel** button.
- **Action colour:** spread `confirmDialogActionToneSx.default` (navy — for
  approve / confirm / proceed) or `confirmDialogActionToneSx.destructive`
  (red — for disapprove / reject / delete) onto your action `<Button>`.
- **Known exception:** `ConfirmDialogProps` also declares a `tone?:
  'default' | 'destructive'` prop, and the component destructures it as
  `tone: _tone` — but **it is never used** (there is no `renderAction`
  path). Ignore it; the real convention is the `sx=` spread above. Not
  fixed here — see §13.
- **Screens:** every Proceed/Disapprove decision, every "Remove this…"
  delete, every "Approve/Decline" fee action.
- **Feature notes:** `docs/100`, `docs/110`, `docs/120`, `docs/130`,
  `docs/160`, `docs/190`, `docs/210`.
- **Accessibility:** MUI `Dialog` — focus-trapped, `Esc` closes, focus
  returns to the trigger.

### Small edit dialog (pattern, not a component)

- `<Dialog maxWidth="sm" fullWidth>`, `DialogTitle` at `16/700`, a
  multiline `TextField` (`borderRadius: '10px'`), `DialogActions` with a
  text **Cancel** + a contained-navy primary whose label echoes the verb
  ("Save Remarks").
- **Screens:** `RequirementDocRow` "Add/Edit remarks",
  `AdditionalFinancialFilesCard` "Add/Edit remarks".
- **Status:** pattern only — **pending component extraction**.

### Form fields (pattern, not a component)

- **Label placement:** above the field, `12.5/600/#3B4256`; required marker
  is a red (`#F04438`) ` *` appended to the label.
- **Text input:** MUI `TextField`, `size="small"`, `borderRadius: '10px'`,
  `fontSize: 14`, white background.
- **Currency:** `react-number-format` `NumericFormat` as
  `customInput={TextField}`, `thousandSeparator=","`, `decimalScale={2}`,
  `allowNegative={false}`, a `₱` `startAdornment` in `TONE_COLORS.info.solid`.
- **Percent / integer:** same `NumericFormat` base with a `%`
  `endAdornment` / `decimalScale={0}`.
- **Date:** native `<TextField type="date">` — no date-picker component.
- **Select:** MUI `TextField select` / `Select` with `MenuItem`s; also an
  inline select-style trigger button that opens a search popover (the
  Officer column on the Application List).
- **File upload:** a local dropzone (`ReportFileDropzone` in
  `payment-detail-view.tsx`) or a hidden `<input type="file">` behind an
  "Upload files" button; accepts `image/*,.pdf`; stores a **data URL**
  (no real upload — see §14). `src/components/upload/*` exists but is
  borrower-side only.
- **Status:** each of the above is a local `Field` / `CurrencyField` /
  `PercentField` / `IntegerField` / `ReportFileDropzone` helper
  **re-declared per file** (`cash-flow-statement-card.tsx`,
  `bureau-reports-card.tsx`, `bank-statement-modal.tsx`,
  `credit-investigation-view.tsx`, `payment-detail-view.tsx`). Consistent
  by convention, **pending component extraction**.

### `ApplicationReviewHeader`

- **Source:** `src/sections/admin/application-review-header.tsx`
- **Purpose:** the shared header for every per-application review page —
  back-to-list link, applicant/loan summary, step pill (via `STEP_TONE`),
  step-entry timestamp tracking (`markStepEntered`), aging chips.
- **Props:** `step: string`, `reviewStep?: ReviewStep`,
  `hideApplicationCard?`, `applicationSummaryStyle?`, `extraBadge?`.
- **Screens:** Initial Credit Checking, Call Report, Requirement Checklist,
  Credit Investigation, Appraisal, Financial Evaluation, Reconsideration.
- **Feature notes:** each of those screens' docs.

### Admin table (recipe, not a component)

- Header row: `bgcolor: '#FBFBFD'`, `borderBottom: '1px solid #E1E4ED'`,
  `fontSize: 11 / 700 / #8891A6`, uppercase, `letterSpacing: 0.05em`,
  `py: 1.5, px: 2`.
- Body rows: **plain white — no zebra.** `td` border `#EEF0F5`,
  `fontSize: 13`, `#5A6273`, `py: 1.375, px: 2`; last row `borderBottom: 0`.
- Amounts: `fontVariantNumeric: 'tabular-nums'`, `fontWeight: 700`, `#14172A`.
- Wrapper: `<Box border 1px #EBEDF3, radius 16, overflow hidden>` around a
  `<TableContainer sx={{ overflowX: 'auto' }}>`.
- Fit-to-width (no scroll): `tableLayout: fixed` + `width: 100%` +
  per-column `<colgroup>` weight; cells ellipsis-clip with the full value
  on a hover tooltip. Reference: `BureauTable` in `bureau-results-tables.tsx`.
- **Reference impls:** `application-list-view.tsx` (the queue table),
  `applicant-profile-view.tsx` (Loan History), `bureau-results-tables.tsx`.
- **Status:** recipe only — the closest shared implementation is
  `BureauTable`, still local to its file. **Pending component extraction.**

### FactChip / FactChipRow (recipe, not a component)

- A horizontal strip of label-over-value cells for a card/modal's
  quick-read summary (e.g. Loan Type / Amount / Term / Purpose / Gross
  Monthly Income / Date Filed).
- **Cell (`FactChip`):** label `fontSize: 11 / 700`, uppercase,
  `letterSpacing: 0.04em`, `#9AA2B4`; value `fontSize: 13.5 / 700`,
  `#14172A`, `mt: 0.25`. `flex: '1 1 128px'`, `px: 1.75, py: 1`. A
  `borderRight: 1px solid #EEF0F5` divides cells on `sm`+ (none on `xs`,
  none on the last cell).
- **Row (`FactChipRow`):** `direction="row"`, `flexWrap="wrap"`,
  `borderRadius: 12px`, `border: 1px solid #EEF0F5`, `bgcolor: '#FAFBFD'`,
  `overflow: hidden`.
- **Reference impls:** `application-details-card.tsx` (Loan Type / Amount
  / Term / Purpose / Gross Monthly Income / Date Filed),
  `appraisal-report-preview.tsx` (Date Report / Date Inspected /
  Requesting Officer / Branch / Account Name / Address — the only file
  that names/exports `FactChipRow`), `appraisal-appraiser-bundle-view.tsx`,
  `appraisal-approver-bundle-view.tsx`, `appraisal-fee-approval-bundle-view.tsx`,
  `cash-flow-statement-card.tsx`, `ci-fee-approval-bundle-view.tsx`,
  `financial-statement-modal.tsx`, `financial-statement-report.tsx`,
  `payment-detail-view.tsx`.
- **Status:** reimplemented locally per screen, kept in sync by
  convention — **pending component extraction.** Visual showcase:
  `design-system-view.tsx`'s "FactChip" section.

### Field / FieldGrid / SectionLabel (shared component)

- A printed-form look for read-only "view what was submitted" screens:
  an uppercase `SectionLabel` with a divider underneath, then fields
  sitting on their own hairline rule in a responsive `FieldGrid` (2
  columns on mobile, 4 on desktop).
- **`SectionLabel`:** uppercase label, `fontSize: 11.5 / 700`,
  `letterSpacing: 0.06em`, `#8891A6`, `Divider` (`#EEF0F5`) directly
  underneath.
- **`Field`:** label `fontSize: 11.5`, `#8891A6`, above; value
  `fontSize: 13.5 / 600`, `#14172A`, sitting on a
  `borderBottom: 1px solid #EEF0F5` hairline rule. Returns `null` when
  `value` is falsy, so an all-empty row collapses to nothing. Optional
  `span` for a multi-column field.
- **`FieldGrid`:** `display: grid`, `gridTemplateColumns: repeat(2,
  1fr)` on `xs`, `repeat(4, 1fr)` on `sm`+, `columnGap: 2.5`,
  `rowGap: 1.75`.
- **Status:** a genuine shared component (unlike the recipes above) —
  `src/components/admin-ui/report-field.tsx`, exported from the
  `admin-ui` barrel. Extracted 2026-10-19 from `appraisal-report-view.tsx`
  (the original implementation, still its main consumer); also used by
  `call-report/call-report-result-modal.tsx`'s and
  `call-report/credit-checking-result-modal.tsx`'s own `SectionLabel`
  (their own `FieldRow` — a wider, single-column label/value row, better
  suited to their denser sections — was deliberately kept, not replaced;
  see those files' own code comments for the reasoning).

### Empty state (pattern, not a component)

- A centered box: `1px dashed #E1E4ED`, `borderRadius: 10`–`11px`, muted
  (`#8891A6`) text; some variants add an Iconify glyph + a CTA button
  ("Go to Application List").
- **Screens:** every queue list, `AdditionalFinancialFilesCard`,
  `BankStatementCard`, each bureau results table.
- **Status:** copied per file — **pending component extraction.**

### Not present in the admin portal

Toasts / snackbars, `Tabs`, breadcrumbs, stepper components, loading
spinners/skeletons. Do not introduce them without a doc update — their
absence is deliberate (state is synchronous `localStorage`; there is no
async load to spin on).

## 7. Interaction Patterns

For each: **action → response → visual feedback → does it change
application state?**

| Pattern | Action | Response / feedback | State change? |
| --- | --- | --- | --- |
| **Hover** | pointer over a button/row | button: bg/border shift per recipe; actionable table row: `bgcolor: '#FAFBFF'` | no |
| **Focus** | Tab to a control | MUI default focus ring (visible) | no |
| **Active / pressed** | click | MUI ripple on `Button`/`ButtonBase`/`IconButton` | no |
| **Disabled** | — | greyed, non-interactive; used to gate a submit until inputs valid | no |
| **Loading** | — | *none* — admin data is synchronous `localStorage`; no spinner/skeleton | n/a |
| **Selected** | pick an option (nav mode, officer) | `bgcolor: '#EEF1FE'`, `borderColor: '#1C2A6E'`, a trailing check icon | yes (writes the choice) |
| **Expanded / collapsed** | click a `CollapsibleSection` header | chevron rotates, body animates open/closed | no (view-only, not persisted) |
| **Submitted** | click "Send for Approval" / "Submit" | status advances (`'pending-approval'` etc.), a waiting message replaces the buttons | yes |
| **Approved** | second officer clicks Approve (or the simulated page action) | status → `'approved'`, an approver name is stamped, a "Continue" button appears | yes |
| **Rejected / disapproved** | click Disapprove → type a reason → Confirm | `decision: 'rejected'` + reason stored, routes to Reconsideration | yes |
| **Confirmation** | any destructive/forward action | `ConfirmDialog` opens; action button is navy (`default`) or red (`destructive`) | not until Confirm |
| **Cancel** | Cancel in a dialog / "Try Again" on a terminal screen | dialog closes / returns to the form with values retained | no |
| **Destructive** | "Remove this…" / "Delete file" | `ConfirmDialog` with `confirmDialogActionToneSx.destructive`; on Confirm the item is removed | yes |
| **Saved** | click "Save Record" on a form | a `savedAt` timestamp is stamped; a `StatusBadge tone="success" "Saved"` appears in the card header | yes (the timestamp — the fields already persisted per keystroke) |

## 8. Forms and Validation

- **Label placement:** above the field (`12.5/600/#3B4256`).
- **Required indicator:** a red (`#F04438`) ` *` appended to the label.
- **Input formatting:** currency via `NumericFormat` (`₱` adornment, comma
  thousands, 2 decimals, no negatives); percent with a `%` end adornment;
  integer with `decimalScale={0}`; date is a native `type="date"` field.
- **Inline validation:** there is **no live inline error text**. The
  submit / primary button stays **disabled** until the required inputs are
  non-empty / valid (e.g. `disabled={!reason.trim()}`,
  `disabled={!canProceed}`). A `ConfirmDialog`'s Confirm button is
  likewise disabled until its reason field is filled.
- **Save behaviour:** every field **persists to `localStorage` on
  keystroke** (via the relevant `setX` context setter). An explicit
  "Save Record" button only stamps a `savedAt` timestamp — it is a
  "done for now" marker, not a commit; nothing is lost without it.
- **Submit behaviour:** a "Submit" / "Send for Approval" advances a status
  field and swaps the button row for a waiting/next-step message; it does
  not itself navigate.
- **Cancel behaviour:** closes the dialog / returns to the form; entered
  values are retained (e.g. the soft-decline "Try Again").
- **Unsaved-changes behaviour:** none — there is nothing to warn about
  because fields persist continuously. No `beforeunload` prompt.
- **File validation:** `accept="image/*,.pdf"` on the input; no size or
  content check; the file becomes a data URL (see §14).

## 9. Feedback Patterns

| Need | Pattern |
| --- | --- |
| **Status** (of a doc, request, step) | a coloured **and labelled** `StatusBadge` (§6). |
| **Success** | a `StatusBadge tone="success"` ("Saved", "Verified", "Approved"); a green terminal-state screen after a decision. |
| **Warning** | a `TONE_COLORS.warning` tinted callout box, or a `StatusBadge tone="warning"` ("Needs review"). |
| **Error / adverse** | a `TONE_COLORS.error` tinted callout box (e.g. the "AI Read" High-risk block); a red terminal-state screen ("Client Notified"). |
| **Informational** | a `TONE_COLORS.info` / `#F9FAFC` tinted callout box ("AI Summary"). |
| **AI review card** | the shared `AiReviewCard` (§6) — a `CollapsibleSection` with the magic-stick icon, a risk-toned box, and the AI Control Statement footnote. Compact (`summary` + `recommendation` + a risk pill) or rich (`richResult` — Overall Assessment + typed findings + Recommended Action + Review Basis + Required Verification), by what the screen computes. |
| **Confirmation** | `ConfirmDialog` (§6) — never an inline "are you sure?". |
| **Empty state** | a dashed-border box (`1px dashed #E1E4ED`, `borderRadius: 10`–`11px`) with muted (`#8891A6`) text, and — on a whole-page empty state — an Iconify glyph + a CTA button. |
| **Loading** | *none* — no spinners or skeletons; admin state is synchronous. If a future change adds real latency, add a pattern here first. |
| **Toasts / snackbars** | not used in admin flows. |

**Empty-state copy voice:**

- **Whole-page queue / list with nothing in it:** first-person, e.g.
  *"Nothing waiting on you yet."* / *"Nothing waiting on you right now."*
  — it is the officer's own inbox.
- **A sub-list inside a card / form (deposits, rows, files):** neutral
  *"No {things} added yet."* / *"No files uploaded yet."*
- **A queue that genuinely has no application at all:** state the fact
  plus the way out — *"No applications yet"* + a "Go to Application List"
  button.

Keep it to one short sentence; no apology, no exclamation beyond the
period.

## 10. Navigation and Workflow Patterns

- **Top nav / side nav:** two modes (`nav-mode-context.tsx`), toggled from
  the floating settings popover. Default is top. Page content is identical
  in both.
- **Floating settings popover** (`nav-settings-button.tsx`, bottom-right
  gear): "Menu navigation" (the nav-mode toggle), "Page actions" (per-page
  dev/test actions registered via `useRegisterPageActions` — e.g. "Fill
  with Sample Data"), and "Reference → View design system".
- **Breadcrumbs / tabs / steppers:** none. Period switching inside a modal
  uses a button-group selector, not `Tabs`.
- **Back / Continue:** `ApplicationReviewHeader` carries the back-to-list
  link. A completed step's success screen carries a "Continue to {next
  step}" button — it does **not** auto-navigate (the officer may not be on
  that tab).
- **Queue → detail:** every request/approval area is a table (one row per
  live application, always shown) → a `/current` (or `/[kind]`) detail
  page. The list never gates the live row behind a status.
- **Decision gate:** a single card at the end of a review page — a title,
  a subtitle, and a `Stack` of a green **Proceed/Endorse** button + an
  outlined **Disapprove** button. Proceed routes forward; Disapprove opens
  a reason `ConfirmDialog` then routes to Reconsideration. The buttons are
  **not** gated on document completeness (supporting evidence, not a
  prerequisite).
- **Personal role workspace + role eyebrow:** the request/approval screens
  that belong to one role (CI Fee Approval, Appraiser, Appraisal Fee
  Approval, Appraisal Report Approval) are framed as *that person's*
  workspace — first-person copy, a "My …" title, and a tracked-out
  **ALL-CAPS role eyebrow** above the title (`13 / 700 / #3448B0 /
  uppercase / letterSpacing 0.06em` — see §4.4). This is a deliberate
  info-carrying label (whose workspace this is), not decoration; the two
  officer-facing *status* lists that aren't personal inboxes (Appraisal -
  Request, Payment Verification) skip the "My …" framing but still show an
  "APPRAISAL OFFICER" eyebrow because they're still the officer's page to
  work from.
- **Approval pattern:** a second officer approves on a dedicated screen (or
  via a simulated page action). Approval stamps a fixed dummy approver
  name (see §14).
- **Reconsideration:** the rejection branch — an application sent here is
  already rejected; Approve on Reconsideration re-enters the pipeline at
  Call Report, No routes to the Negative List (a one-way terminal screen).

## 11. Accessibility

Treated as a **floor, not a formal audit.**

- **Keyboard:** all interactive controls are real `<button>` /
  `ButtonBase` / `IconButton` / `TextField` — focusable and operable by
  keyboard. `CollapsibleSection` headers toggle on Enter/Space.
- **Focus visibility:** MUI's default focus ring is kept (not suppressed).
- **Colour contrast:** the token colours were chosen by eye for visual
  consistency; there is **no recorded WCAG contrast pass**. The muted
  `#8891A6` on white is borderline for small text — treat it as
  secondary/meta only.
- **Form labels:** every field has a visible text label above it (§8); no
  placeholder-only fields.
- **Error feedback:** conveyed by a disabled submit + (for decisions) a
  required typed reason, not by colour.
- **Modal focus:** MUI `Dialog` focus-traps, restores focus to the
  trigger, closes on `Esc`.
- **Status not by colour alone:** `StatusBadge` always pairs its tone with
  a text `label`; the pipeline step pill shows the step name; decision
  outcomes show a worded terminal screen. A colour-blind reviewer never
  loses information.
- **Screen readers:** no dedicated SR testing or ARIA-authoring pass has
  been done. Icon-only buttons carry an `aria-label` where added
  individually; this is not yet systematic.

## 12. Visual Showcase Specification

The `/admin/design-system` page must render, in this order, each built
from the **real** shared token/component (label anything showcase-only):

1. **Overview** — what the page is, link to this doc.
2. **Design principles** — the §3 list.
3. **Colour tokens** — `TONE_COLORS` swatches (all 5 keys per tone),
   `STEP_TONE` as step-labelled `StatusBadge`s, the §4.3 structural-hex
   swatch grid.
4. **Typography** — every §4.4 role rendered at its real spec, with the
   spec string beside it.
5. **Spacing & layout** — the spacing scale as labelled bars; the
   container-width table; a `direction={{xs,sm}}` stacking demo.
6. **Buttons & states** — primary / secondary / destructive-secondary /
   ⋮, plus a disabled example.
7. **Form controls & validation** — real `TextField`, `NumericFormat`
   currency, native date, a required field, a disabled field; a note on
   "disabled submit until valid" (labelled *inline pattern, pending
   extraction*).
8. **Cards & containers** — a live `adminCardSx` + `CollapsibleSection`
   with subtitle + badge + `headerAction` + body; a ❌ "Don't" callout.
9. **AI Review card** — a live compact `AiReviewCard` (risk + summary +
   recommendation, with the risk pill and the Control Statement footnote),
   plus a note describing the rich variant used by Initial Credit Checking
   (not duplicated on the showcase).
10. **Tables & lists** — the admin table recipe with 3 sample rows
    (labelled *demo data*).
10a. **FactChip** — a live `FactChipRow` of 6 `FactChip` cells (labelled
    *demo data*; not a shared component — see §6's FactChip entry).
10. **Badges & status indicators** — `StatusBadge` in all tones, with and
    without icon; a `CollapsibleSectionBadge`.
11. **Alerts / feedback** — a tinted callout box in each of the 5 tones;
    an empty-state box.
12. **Dialogs & modals** — buttons that open a `ConfirmDialog` in each
    tone (labelled *these triggers change no state*).
14. **Navigation & workflow** — a description of the floating-settings
    popover contents; a mock Proceed/Disapprove decision card built from
    real buttons.
15. **Loading / empty / error states** — the empty-state box; an explicit
    "no spinners — state is synchronous" note; an error tinted box.
16. **Accessibility states** — a focus-ring demo on real buttons; a
    colour+label status example.
17. **Responsive note** — desktop-first; a short statement + the
    `direction` stacking demo (a full device-frame preview is out of
    scope).
18. **Real screen examples** — links to `/admin/credit-checking` and a
    review page as reference implementations (not embedded).
19. **Component / source mapping** — a table (rendered in the admin table
    recipe): component → source file → related token → feature-note doc →
    screens used.
20. **Known exceptions & simulated behaviour** — the §13 + §14 lists as
    an on-page callout.

## 13. Known Exceptions

| Screen / component | Exception | Reason | Source | Status |
| --- | --- | --- | --- | --- |
| `ConfirmDialog` | Declares a `tone` prop that is destructured (`tone: _tone`) but **never used** — no `renderAction`. Colour comes from `confirmDialogActionToneSx` spread on the caller's `<Button>` instead. | Left from an earlier API idea; fixing it is outside the design-system/doc scope. | `custom-dialog/confirm-dialog.tsx`, `types.ts` | **Permanent (documented, not fixed).** Do not pass `tone`. |
| `ApplicationDetailsCard` | Uses `p: { xs: 2.5, md: 3 }`, tighter than `adminCardSx`'s `p: { xs: 3, md: 4 }`. | It's a dense summary card; the standard padding felt loose. | `application-details-card.tsx` | Permanent, intentional. |
| Initial Credit Checking (split layout) | `<Container maxWidth="xl">` instead of `"lg"`. | Its optional two-column split view needs the extra width; single-column stays `"lg"`. | `initial-credit-checking-view.tsx` | Permanent, scoped to that view. |
| Reconsideration, Payment detail, Applicant Profile, all `/current` bundle-detail views | `<Container maxWidth="md">` instead of `"lg"`. | Each is one narrow column — a form, a profile, or an approval detail — with no wide table or side-by-side cards. `"lg"` would leave a large empty gutter. | `reconsideration-view.tsx`, `payment-detail-view.tsx`, `applicant-profile-view.tsx`, `*-bundle-view.tsx` | Permanent, intentional (the `md` tier — see §4.6). |
| Legacy report views (`*-report.tsx`) | Use **zebra striping** (`&:nth-of-type(even): { bgcolor: '#FAFBFD' }`) — the §6 "no zebra" rule does not apply. | These are read-only print-style tables that mirror the source PGFC spreadsheets (Financial Statement, Financial Highlights, Bank Loan, Cash Flow reports); zebra rows match the reference document. The no-zebra rule is for **interactive data tables** (Application List, bureau results, queues). | `financial-statement-report.tsx`, `financial-highlights-report.tsx`, `bank-loan-report.tsx`, `cash-flow-statement-card.tsx` (report body) | Permanent, intentional. |
| Admin login | `22px` card heading (not the `30` page-title role); no nav shell; `440px` centered card on a full-bleed textured background. | Not a review page — an auth screen deliberately outside `AdminLayout` (see `docs/050-admin-login.md`). | `admin-login-view.tsx` | Permanent, intentional. |
| Admin dashboard | Its own greeting block ("Welcome back" + "Hi, {name} 👋") and `26px` stat values instead of a `225` page title. | A welcome/overview screen, not a review screen. Its type roles are documented in §4.4 (Dashboard greeting / Dashboard stat value). | `admin-dashboard-view.tsx` | Permanent, intentional. |
| Form fields | `Field` / `CurrencyField` / `PercentField` / `IntegerField` re-declared per file. | Never extracted into a shared component. | `cash-flow-statement-card.tsx`, `bureau-reports-card.tsx`, `bank-statement-modal.tsx`, `credit-investigation-view.tsx` | Temporary — pending extraction. |
| Admin table | The recipe is copied per screen; `BureauTable` is the closest shared impl but local to its file. | Not extracted. | `bureau-results-tables.tsx` and callers | Temporary — pending extraction. |
| Empty state | Dashed-box pattern copied per screen. | Not extracted. | multiple | Temporary — pending extraction. |
| FactChip / FactChipRow | Label-over-value summary-strip cells copied per screen; `appraisal-report-preview.tsx` is the only file that names/exports `FactChipRow`. | Not extracted. | `application-details-card.tsx`, `appraisal-report-preview.tsx`, `appraisal-appraiser-bundle-view.tsx`, `cash-flow-statement-card.tsx`, `financial-statement-report.tsx`, `payment-detail-view.tsx`, and others | Temporary — pending extraction. |
| Primary button | The navy `bgcolor/radius/px/hover` block is hand-repeated (no `primaryNavyButtonSx` token). | Only `outlinedNavyButtonSx` was tokenised. | `admin-tokens.ts` + call sites | Temporary — candidate token. |
| Cash Flow Statement card | Header-only `CollapsibleSection` (no body, no chevron). | The whole card is just a labelled Manage/View row. | `cash-flow-statement-card.tsx` | Permanent, intentional (a supported mode). |
| AI review card — content varies by screen | All four screens share one `AiReviewCard` shell, but: **Initial Credit Checking** renders the **rich** variant (Overall Assessment + typed findings + Recommended Action + Review Basis + Required Verification) and merges a "View Initial Credit Checking Result" `footer` row; the other three render the **compact** variant (summary + recommendation only). **Initial Credit Checking** uses the **5-level `SCREENING_RISK_STYLES`** scale; the other three use the **3-level `AI_REVIEW_RISK_STYLES`** readiness scale. **Credit Investigation**'s card starts **collapsed once CI Fee is approved** (`expanded={ciFeeStatus !== 'approved'}`); the others start expanded. | Each screen computes different data and has a different workflow — the visual pattern is standardized, the content is not forced identical. | `components/admin-ui/ai-review-card.tsx` + the four view files | Permanent, intentional. |

## 14. Simulated and Showcase-Only Behavior

**Whole app:** there is **no backend / API**. All "data" is in
`localStorage` via React Context; every "submission" / "approval" /
"upload" is a local state write.

**Simulated in real admin screens:**

- **AI review / summary / recommendation** — deterministic template
  strings computed from the current data (`*-risk.ts`,
  `bureau-file-summary.ts`), never a model call.
- **Bureau results** — canned sample rows seeded on file upload
  (`seedBureauRows`); the file itself is not parsed.
- **Approvals** — a second-officer approval stamps a fixed dummy name
  (e.g. `'Jaime Reyes'`); there is no real second login or role gate
  (`AdminUser` has no role field).
- **File uploads** — stored as a **data URL**; "View" opens that data URL;
  seeded records point at a bundled `/assets/documents/sample-local-pdf.pdf`.
  No file is uploaded anywhere.
- **"Fill with Sample Data" page actions** — write deterministic sample
  values straight into state; not a workflow.
- **Outreach** ("client notified", "sent to Odoo", email/WhatsApp/Viber
  "Request Documents") — labels only; nothing is sent.
- **Lot Plot generation** (Appraisal Report, per TCT/OCT) — "Generate Lot
  Plot" writes a canned inline SVG placeholder image, printed with the
  appraiser's own manually-typed latitude/longitude; no real AI, mapping,
  or GIS service is called, and there is no address/geocoding lookup
  (`docs/170-request-appraiser.md`'s "Land Title Fields").
- **Loading delays** where they exist (e.g. the borrower selfie timer) are
  fixed `setTimeout`s, not real work — and none are in the admin portal.

**Showcase-only on `/admin/design-system`:**

- The table's 3 rows (`SAMPLE_TABLE_ROWS`) are static demo data.
- The `ConfirmDialog` trigger buttons open a dialog that only closes on
  Confirm/Cancel — they change **no** application state.
- Any field rendered in the "Form controls" block is a bare demo input,
  not wired to context.
- Blocks built from an inline pattern rather than a shared component are
  labelled **"pending component extraction."**

## 15. Maintenance Rule

Review this doc **and** `src/sections/admin/design-system-view.tsx` when
any of these change:

- **Tokens:** `src/components/admin-ui/admin-tokens.ts`
- **Shared components:** `src/components/admin-ui/status-badge.tsx`,
  `src/components/collapsible-section/collapsible-section.tsx`,
  `src/sections/admin/application-review-header.tsx`
- **Shared dialogs:** `src/components/custom-dialog/confirm-dialog.tsx` +
  `types.ts`
- **Form / field helpers:** the local `Field` / `CurrencyField` /
  `ReportFileDropzone` patterns (if any is extracted into
  `src/components/admin-ui/`, document it here and remove its "pending
  extraction" note)
- **Layout:** `src/layouts/admin/layout.tsx`,
  `src/layouts/admin/nav-settings-button.tsx`,
  `src/layouts/admin/nav-mode-context.tsx`
- **Theme (font/scale only):** `src/theme/core/typography.ts`
- **Related UI/UX docs:** `docs/220-ui-ux-audit.md` (token history),
  `docs/230-project-overview.md` (Theming)

## 16. Change History

- **2026-10-20 (second later revision)** — the System Validation card's
  "View Result" button (Call Report page) and the Initial Credit
  Checking page's own "View Initial Credit Checking Result" button
  reverted from inline expand back to opening a `<Dialog>` popup
  (`CallReportResultModal`/`CreditCheckingResultModal`), undoing their
  2026-10-19 inline conversion. Scoped to these two same-page buttons
  only — `ApplicationDetailsCard`'s cross-page actions (below) are
  unaffected. Full detail in
  `docs/080-account-solicitation-call-report.md`'s History.
- **2026-10-20 (later revision)** — `ApplicationDetailsCard`'s 3 actions
  ("View full application", "View call report", "Initial credit checking
  result") changed from inline-expand to `router.push` navigation, each
  to its own dedicated page (`/admin/applications/[id]/full-application`,
  `.../call-report/result`, `.../credit-checking/result`), reached via new
  `paths.admin.*` route builders. New shared `ResultPageHeader`
  (`src/sections/admin/result-page-header.tsx`) gives each of these pages
  a `router.back()` Back control and applicant summary, since they're
  reachable from many different parent pages with no single fixed "back"
  destination. `application-details-card.tsx`'s inline `detailsContent`
  was extracted into an exported `ApplicationFullDetails` component so
  both the card and the new Full Application page render the same
  content. Full detail in
  `docs/080-account-solicitation-call-report.md`'s History.
- **2026-10-19** — added the **Field / FieldGrid / SectionLabel** shared
  component (§6): extracted from `appraisal-report-view.tsx` into
  `src/components/admin-ui/report-field.tsx`, so `call-report-result-modal.tsx`
  and `credit-checking-result-modal.tsx` can share the same `SectionLabel`
  (their own denser `FieldRow` pattern was deliberately kept, not
  replaced). Part of converting Call Report's, Initial Credit Checking's,
  and Application Details' own "view result" popups into inline page
  content — see `docs/080-account-solicitation-call-report.md`'s own
  History entry for the full detail.
- **2026-10-07** — added the **FactChip / FactChipRow** recipe (§6, §12,
  §13): label-over-value summary-strip cells, already reimplemented
  locally across 9+ screens (Application Details Card, Appraisal Report
  Preview, Cash Flow Statement, Financial Statement Report, Payment
  Detail, etc.) but never documented here before. Added a live showcase
  section to `design-system-view.tsx` with 6 demo cells, and a
  pending-extraction entry in Known Exceptions.
- **2026-09-08** — created: the token/component rulebook + the
  `/admin/design-system` live gallery, wired into the floating settings
  popover.
- **2026-09-09** — added the `CollapsibleSection` `subtitle` slot and
  header-only mode; restructured this doc into the full 16-section
  layout (principles, layout/responsive, interaction/forms/feedback/nav
  patterns, accessibility, known exceptions, simulated behaviour); expanded
  the showcase page to match.
- **2026-09-09** — visual-consistency audit follow-up: documented the
  **`md` container tier** (§4.6/§5) and its pages (§13); added the
  **page-subtitle / role-eyebrow / dashboard greeting / dashboard
  stat-value** type roles (§4.4); added the **legacy report zebra-table**
  and **admin-login / admin-dashboard** exceptions (§13); added
  **`#FDF3F2`** to the structural-hex table (§4.3); added
  **empty-state copy voice** guidance (§9). Code follow-ups (same day):
  Call Report → `maxWidth="lg"`; Application List Status column →
  `StatusBadge` (new optional `dot` variant); Payment detail form →
  label-above pattern; Loan History table head → the §6 recipe.
- **2026-09-09** — **AI Review Card standardization**: the four AI
  "review, summary & recommendation" cards (Initial Credit Checking,
  Credit Investigation, Financial Evaluation, Requirement Checklist) now
  share one `AiReviewCard` shell (§6) with compact / rich content slots.
  New `src/components/admin-ui/ai-review-tokens.ts` owns both risk
  scales (`AI_REVIEW_RISK_STYLES` 3-level readiness,
  `SCREENING_RISK_STYLES` 5-level screening — was `RISK_LEVEL_STYLES`)
  plus `AI_CONTROL_STATEMENT`, retiring the byte-identical `RISK_STYLES`
  copies in `requirement-checklist-view.tsx` and
  `credit-investigation-risk.ts`. `AiRecommendationSummary` moved to
  `src/components/admin-ui/` as the rich render-path (still used directly
  by `credit-checking-result-modal.tsx`). `CollapsibleSection` gained an
  optional `icon` prop. Initial Credit Checking and Requirement Checklist
  AI cards are now collapsible (expanded by default); Credit
  Investigation keeps its collapse-on-CI-Fee-approval behaviour. See §13
  for the documented per-screen content differences.
