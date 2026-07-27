# Requirement Checklist Scroll Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the Requirement Checklist page's scroll length by adding a section nav (side panel on desktop, sticky bar on mobile) and folding already-verified document rows into a collapsed summary per section.

**Architecture:** Two new presentational components (`RequirementChecklistSectionNav`, `VerifiedDocsGroup`) are added alongside the existing `requirement-checklist-view.tsx`, which is modified to: (1) attach section-level refs and render the nav, (2) split each section's document entries into "needs attention" (rendered directly) vs "verified" (rendered inside `VerifiedDocsGroup`), and (3) reuse the existing but currently-unwired `handleJumpToOutstanding`-style scroll/expand pattern for the nav's click handler. No data-model changes — `RequirementDoc`, `RequirementDocMeta`, `AppraisalDocMeta`, and `admin-context.tsx` are untouched.

**Tech Stack:** Next.js 14 (App Router), React 18, MUI v5, TypeScript. No test runner is configured in this project (`package.json` has no `test` script, no Jest/Vitest config, no existing `.test.tsx` files) — every task's verification step is `tsc`/lint plus manual verification in the dev server (`npm run dev`), the same way prior changes to this page were verified.

## Global Constraints

- No automated test framework exists in this repo — do not add one as part of this plan. Verify each task by running `npx tsc --noEmit` and manually checking the page in the browser via `npm run dev`.
- Always run the dev server with `npm run dev`, never `npm start` (production mode does not pick up source changes — this was the root cause of a prior bug in this exact file).
- Follow the existing color/style tokens already used in this file (e.g. `#1C2A6E`, `#8891A6`, `#EBEDF3`, `RISK_STYLES` from `requirement-checklist-view.tsx:49-56`) — do not introduce a new ad hoc palette.
- Do not change `RequirementDocRow`, `admin-context.tsx`'s data shape, or the Appraisal per-property grouping structure — this plan is additive UI only.
- Update `docs/ADMIN_REQUIREMENT_CHECKLIST.md` to describe the new section nav and verified-docs fold once implemented, per standing project convention of keeping docs in sync with app logic changes.

---

## Task 1: `VerifiedDocsGroup` collapsible wrapper component

**Files:**
- Create: `src/sections/admin/requirement-checklist-verified-docs-group.tsx`

**Interfaces:**
- Consumes: `RequirementDocRow` (existing, from `src/sections/admin/requirement-doc-row.tsx`), `RequirementDocMeta`/`AppraisalDocMeta` (existing, from `src/sections/admin/requirement-checklist-docs.ts`), `RequirementDoc` (existing, from `src/auth/admin-context.tsx`)
- Produces: `VerifiedDocsGroup` component, used by Task 3 in all 4 places verified docs currently render inline (Credit Investigation's 2 subgroups, each Appraisal property group, Financial Evaluation)

```typescript
export type VerifiedDocsGroupEntry = {
  meta: RequirementDocMeta | AppraisalDocMeta;
  doc: RequirementDoc;
};

export type VerifiedDocsGroupProps = {
  entries: VerifiedDocsGroupEntry[];
  applicantName: string;
  onUpload: (key: string) => (data: Partial<RequirementDoc>) => void;
  onRemove: (key: string) => () => void;
  onToggleReviewed: (key: string) => (reviewed: boolean) => void;
  onRemarksChange: (key: string) => (remarks: string) => void;
  registerRowRef: (key: string, el: HTMLDivElement | null) => void;
};
```

This component renders nothing if `entries.length === 0`. Otherwise it renders a
single low-emphasis collapsed row reading `✓ N verified documents` (or
`✓ All N verified` when this is the section/subgroup's only content), toggled by
local `useState` — expanding reveals the full `RequirementDocRow` list for those
entries, each row still registering itself into the parent's `rowRefs` map via
`registerRowRef` so `handleJumpToOutstanding`-style scrolling keeps working even
for rows currently hidden inside a collapsed group.

- [ ] **Step 1: Create the component file**

```tsx
'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { RequirementDocRow } from './requirement-doc-row';

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta, AppraisalDocMeta } from './requirement-checklist-docs';

// ----------------------------------------------------------------------

export type VerifiedDocsGroupEntry = {
  meta: RequirementDocMeta | AppraisalDocMeta;
  doc: RequirementDoc;
};

export type VerifiedDocsGroupProps = {
  entries: VerifiedDocsGroupEntry[];
  applicantName: string;
  onUpload: (key: string) => (data: Partial<RequirementDoc>) => void;
  onRemove: (key: string) => () => void;
  onToggleReviewed: (key: string) => (reviewed: boolean) => void;
  onRemarksChange: (key: string) => (remarks: string) => void;
  registerRowRef: (key: string, el: HTMLDivElement | null) => void;
  /** True when every doc in the owning section/subgroup is in this group
   * (nothing needs attention) — swaps the collapsed row's copy to "All N
   * verified" instead of "N verified documents". */
  allVerified?: boolean;
};

export function VerifiedDocsGroup({
  entries,
  applicantName,
  onUpload,
  onRemove,
  onToggleReviewed,
  onRemarksChange,
  registerRowRef,
  allVerified = false,
}: VerifiedDocsGroupProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  return (
    <Box>
      <Stack
        component={ButtonBase}
        onClick={() => setExpanded((prev) => !prev)}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          width: '100%',
          px: 1.5,
          py: 1,
          borderRadius: '10px',
          bgcolor: '#F5F6FA',
          color: '#5A6273',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:check-circle-bold" width={16} sx={{ color: '#0C8A4F' }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
            {allVerified ? `All ${entries.length} verified` : `${entries.length} verified document${entries.length === 1 ? '' : 's'}`}
          </Typography>
        </Stack>
        <Iconify
          icon="eva:chevron-down-fill"
          width={18}
          sx={{
            transition: 'transform 0.15s ease',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </Stack>

      {expanded && (
        <Stack spacing={1.25} sx={{ mt: 1.25 }}>
          {entries.map(({ meta, doc }) => (
            <Box key={meta.key} ref={(el: HTMLDivElement | null) => registerRowRef(meta.key, el)}>
              <RequirementDocRow
                meta={meta}
                doc={doc}
                applicantName={applicantName}
                onUpload={onUpload(meta.key)}
                onRemove={onRemove(meta.key)}
                onToggleReviewed={onToggleReviewed(meta.key)}
                onRemarksChange={onRemarksChange(meta.key)}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors referencing `requirement-checklist-verified-docs-group.tsx` (the file isn't imported anywhere yet, so it only self-checks).

- [ ] **Step 3: Commit**

```bash
git add src/sections/admin/requirement-checklist-verified-docs-group.tsx
git commit -m "Add VerifiedDocsGroup component for collapsing verified requirement docs"
```

---

## Task 2: `RequirementChecklistSectionNav` component

**Files:**
- Create: `src/sections/admin/requirement-checklist-section-nav.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone presentational component)
- Produces: `RequirementChecklistSectionNav` component and its `SectionNavEntry` type, used by Task 3

```typescript
export type SectionNavEntry = {
  key: string;
  label: string;
  received: number;
  total: number;
  fullyVerified: boolean;
  onClick: () => void;
};

export type RequirementChecklistSectionNavProps = {
  entries: SectionNavEntry[];
  variant: 'side' | 'bar';
};
```

The same component renders both layouts via a `variant` prop rather than two
separate components — `variant="side"` renders a narrow vertical stack meant for
placement in the page's side margin (`position: sticky`, `top` offset), and
`variant="bar"` renders the same entries horizontally for a top sticky bar on
narrow screens. The parent (Task 3) decides which variant(s) to render and at
what breakpoints via `sx={{ display: {...} }}` on the wrapping `Box` — this
component itself does not contain responsive logic.

- [ ] **Step 1: Create the component file**

```tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type SectionNavEntry = {
  key: string;
  label: string;
  received: number;
  total: number;
  fullyVerified: boolean;
  onClick: () => void;
};

export type RequirementChecklistSectionNavProps = {
  entries: SectionNavEntry[];
  variant: 'side' | 'bar';
};

export function RequirementChecklistSectionNav({ entries, variant }: RequirementChecklistSectionNavProps) {
  const isSide = variant === 'side';

  return (
    <Stack
      direction={isSide ? 'column' : 'row'}
      spacing={isSide ? 1 : 1.5}
      sx={
        isSide
          ? { p: 1.25, borderRadius: '13px', bgcolor: 'common.white', border: '1px solid #EBEDF3' }
          : {
              px: 2,
              py: 1.25,
              bgcolor: 'common.white',
              borderBottom: '1px solid #EBEDF3',
              overflowX: 'auto',
            }
      }
    >
      {entries.map((entry) => (
        <Stack
          key={entry.key}
          component={ButtonBase}
          onClick={entry.onClick}
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{
            px: 1.25,
            py: 0.75,
            borderRadius: '9px',
            justifyContent: 'flex-start',
            flexShrink: 0,
            '&:hover': { bgcolor: '#F5F7FF' },
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: entry.fullyVerified ? '#12B76A' : '#F5A623',
            }}
          />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A', whiteSpace: 'nowrap' }}>
            {entry.label}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: '#8891A6', whiteSpace: 'nowrap' }}>
            {entry.received}/{entry.total}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors referencing `requirement-checklist-section-nav.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/sections/admin/requirement-checklist-section-nav.tsx
git commit -m "Add RequirementChecklistSectionNav component"
```

---

## Task 3: Wire the section nav into the page, with scroll/expand behavior

**Files:**
- Modify: `src/sections/admin/requirement-checklist-view.tsx:170-1392` (the `RequirementChecklistView` function)

**Interfaces:**
- Consumes: `RequirementChecklistSectionNav`/`SectionNavEntry` (Task 2), `rowRefs`/`outstandingRowIds` pattern already in this file (`requirement-checklist-view.tsx:204`, `:497-537`)
- Produces: `sectionRefs` map (new, same pattern as `rowRefs`), `scrollToSection(key)` handler, used by Task 4 to also drive `VerifiedDocsGroup` placement

This task adds the nav without yet touching how document rows render — Task 4
handles the verified-docs fold. Keeping them separate means the nav can be
manually verified (jump + auto-expand) before the row-splitting change lands.

- [ ] **Step 1: Add a `sectionRefs` map alongside the existing `rowRefs`**

In `requirement-checklist-view.tsx`, right after the existing `rowRefs`
declaration (`requirement-checklist-view.tsx:204`):

```typescript
const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
const sectionRefs = useRef<Map<'creditInvestigation' | 'appraisal' | 'financialEvaluation', HTMLDivElement | null>>(
  new Map()
);
```

- [ ] **Step 2: Attach `sectionRefs` to each section's outer `Box`**

Three edits, one per section wrapper:

Credit Investigation section wrapper (`requirement-checklist-view.tsx:771`):
```tsx
<Box
  ref={(el: HTMLDivElement | null) => sectionRefs.current.set('creditInvestigation', el)}
  sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}
>
```

Appraisal section wrapper (`requirement-checklist-view.tsx:844`):
```tsx
<Box
  ref={(el: HTMLDivElement | null) => sectionRefs.current.set('appraisal', el)}
  sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}
>
```

Financial Evaluation section wrapper (`requirement-checklist-view.tsx:1195`):
```tsx
<Box
  ref={(el: HTMLDivElement | null) => sectionRefs.current.set('financialEvaluation', el)}
  sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}
>
```

- [ ] **Step 3: Add a `scrollToSection` handler**

Add this right after the existing `handleJumpToOutstanding` function
(`requirement-checklist-view.tsx:521-538`), reusing the same
expand-before-scroll pattern:

```typescript
const scrollToSection = (key: 'creditInvestigation' | 'appraisal' | 'financialEvaluation') => {
  if (key === 'creditInvestigation') setCreditInvestigationCollapsed(false);
  if (key === 'appraisal') setAppraisalCollapsed(false);
  if (key === 'financialEvaluation') setFinancialEvaluationCollapsed(false);

  requestAnimationFrame(() => {
    sectionRefs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};
```

- [ ] **Step 4: Build the nav entries and render both variants**

Add this right before the `return (` that starts the main JSX
(`requirement-checklist-view.tsx:622`):

```typescript
const sectionNavEntries: SectionNavEntry[] = [
  {
    key: 'creditInvestigation',
    label: REQUIREMENT_TAB_LABELS.creditInvestigation,
    received: creditInvestigationDocs.filter((doc) => doc.status !== 'missing').length,
    total: creditInvestigationDocs.length,
    fullyVerified: creditInvestigationFullyVerified,
    onClick: () => scrollToSection('creditInvestigation'),
  },
  {
    key: 'appraisal',
    label: 'Appraisal',
    received: appraisalNotApplicable
      ? 0
      : appraisalGroups.flatMap((group) => group.documents).filter((doc) => doc.status !== 'missing').length,
    total: appraisalNotApplicable
      ? 0
      : appraisalGroups.reduce((total, group) => total + group.documents.length, 0),
    fullyVerified: appraisalFullyVerified,
    onClick: () => scrollToSection('appraisal'),
  },
  {
    key: 'financialEvaluation',
    label: REQUIREMENT_TAB_LABELS.financialEvaluation,
    received: financialEvaluationDocs.filter((doc) => doc.status !== 'missing').length,
    total: financialEvaluationDocs.length,
    fullyVerified: financialEvaluationFullyVerified,
    onClick: () => scrollToSection('financialEvaluation'),
  },
];
```

Add the import at the top of the file, alongside the other local imports
(`requirement-checklist-view.tsx:26-30`):

```typescript
import { RequirementChecklistSectionNav } from './requirement-checklist-section-nav';
import type { SectionNavEntry } from './requirement-checklist-section-nav';
```

Then render the two variants by wrapping the existing `<Container maxWidth="md">`
(`requirement-checklist-view.tsx:623`) in a positioning wrapper. Change:

```tsx
return (
  <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
    <ApplicationReviewHeader
```

to:

```tsx
return (
  <Box sx={{ position: 'relative' }}>
    <Box
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'sticky',
        top: 88,
        float: 'left',
        ml: { md: 'calc(50% - 620px)' },
        width: 200,
        zIndex: 1,
      }}
    >
      <RequirementChecklistSectionNav entries={sectionNavEntries} variant="side" />
    </Box>
    <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'sticky', top: 0, zIndex: 2 }}>
      <RequirementChecklistSectionNav entries={sectionNavEntries} variant="bar" />
    </Box>
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
```

And close the new outer `Box` at the very end, right after the existing
`</Container>` that currently closes the component
(`requirement-checklist-view.tsx:1392`):

```tsx
    </Container>
  </Box>
);
```

Note: the `ml: { md: 'calc(50% - 620px)' }` offset assumes the `Container
maxWidth="md"` (900px) centers in the viewport — 620px = half of 900px (450px)
plus the nav's width (200px) minus a small gap adjustment. Verify this
visually in Step 6 and adjust the constant if the panel overlaps the
container on common viewport widths (1280–1440px) instead of sitting cleanly
in the left margin.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors. If `SectionNavEntry` import fails, confirm Task 2's file exports it as a named type export.

- [ ] **Step 6: Manually verify in the browser**

```bash
npm run dev
```

Navigate to a live application's requirement-checklist page (e.g. seed
`localStorage['hhc-lms-registration']` with a signed-up borrower, or use an
existing in-progress application at Step 3). Confirm:
- On a wide viewport (≥1280px), the side nav panel appears in the left margin, sticky while scrolling, showing all 3 sections with correct counts and green/amber dots.
- On a narrow viewport (<900px, e.g. via browser dev tools device toolbar), the side panel is hidden and a horizontal sticky bar appears at the top instead.
- Clicking each nav entry scrolls to and (if previously collapsed) expands the correct section.

- [ ] **Step 7: Commit**

```bash
git add src/sections/admin/requirement-checklist-view.tsx
git commit -m "Wire RequirementChecklistSectionNav into the requirement checklist page"
```

---

## Task 4: Fold verified documents into `VerifiedDocsGroup` in all 4 render sites

**Files:**
- Modify: `src/sections/admin/requirement-checklist-view.tsx` (4 edits: Credit Investigation's subgroup loop, Appraisal's per-group loop, Financial Evaluation's flat list)

**Interfaces:**
- Consumes: `VerifiedDocsGroup`/`VerifiedDocsGroupEntry` (Task 1)
- Produces: none (leaf UI change)

- [ ] **Step 1: Add the import**

At the top of `requirement-checklist-view.tsx`, alongside the other local
imports (`requirement-checklist-view.tsx:26-30`):

```typescript
import { VerifiedDocsGroup } from './requirement-checklist-verified-docs-group';
```

- [ ] **Step 2: Split Credit Investigation's subgroup entries and render both parts**

Replace the subgroup rendering block
(`requirement-checklist-view.tsx:805-838`, inside the
`{SUBGROUP_ORDER.map((subgroup) => { ... })}` callback) — currently:

```tsx
{SUBGROUP_ORDER.map((subgroup) => {
  const subgroupEntries: { meta: RequirementDocMeta; doc: RequirementDoc }[] =
    REQUIREMENT_DOC_META.filter(
      (meta) => meta.tabs.includes('creditInvestigation') && meta.subgroup === subgroup
    )
      .map((meta) => ({ meta, doc: requiredDocsByKey.get(meta.key) }))
      .filter((entry): entry is { meta: RequirementDocMeta; doc: RequirementDoc } => !!entry.doc);
  const sortedEntries = sortByAttentionFirst(subgroupEntries);
  return (
    <Stack key={subgroup} spacing={1.25}>
      <SectionLabel>{REQUIREMENT_SUBGROUP_LABELS[subgroup]}</SectionLabel>
      <Stack spacing={1.25}>
        {sortedEntries.map(({ meta, doc }) => (
          <Box
            key={meta.key}
            ref={(el: HTMLDivElement | null) => {
              rowRefs.current.set(meta.key, el);
            }}
          >
            <RequirementDocRow
              meta={meta}
              doc={doc}
              applicantName={applicantName}
              onUpload={handleUploadDoc(meta.key)}
              onRemove={handleRemoveDoc(meta.key)}
              onToggleReviewed={handleToggleReviewed(meta.key)}
              onRemarksChange={handleRemarksChange(meta.key)}
            />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
})}
```

with:

```tsx
{SUBGROUP_ORDER.map((subgroup) => {
  const subgroupEntries: { meta: RequirementDocMeta; doc: RequirementDoc }[] =
    REQUIREMENT_DOC_META.filter(
      (meta) => meta.tabs.includes('creditInvestigation') && meta.subgroup === subgroup
    )
      .map((meta) => ({ meta, doc: requiredDocsByKey.get(meta.key) }))
      .filter((entry): entry is { meta: RequirementDocMeta; doc: RequirementDoc } => !!entry.doc);
  const attentionEntries = subgroupEntries.filter(({ doc }) => needsAttention(doc));
  const verifiedEntries = subgroupEntries.filter(({ doc }) => !needsAttention(doc));
  return (
    <Stack key={subgroup} spacing={1.25}>
      <SectionLabel>{REQUIREMENT_SUBGROUP_LABELS[subgroup]}</SectionLabel>
      <Stack spacing={1.25}>
        {attentionEntries.map(({ meta, doc }) => (
          <Box
            key={meta.key}
            ref={(el: HTMLDivElement | null) => {
              rowRefs.current.set(meta.key, el);
            }}
          >
            <RequirementDocRow
              meta={meta}
              doc={doc}
              applicantName={applicantName}
              onUpload={handleUploadDoc(meta.key)}
              onRemove={handleRemoveDoc(meta.key)}
              onToggleReviewed={handleToggleReviewed(meta.key)}
              onRemarksChange={handleRemarksChange(meta.key)}
            />
          </Box>
        ))}
        <VerifiedDocsGroup
          entries={verifiedEntries}
          applicantName={applicantName}
          onUpload={handleUploadDoc}
          onRemove={handleRemoveDoc}
          onToggleReviewed={handleToggleReviewed}
          onRemarksChange={handleRemarksChange}
          registerRowRef={(key, el) => rowRefs.current.set(key, el)}
          allVerified={attentionEntries.length === 0}
        />
      </Stack>
    </Stack>
  );
})}
```

- [ ] **Step 3: Split Appraisal's per-group entries and render both parts**

Replace the per-group document rendering block
(`requirement-checklist-view.tsx:1160-1185`) — currently:

```tsx
{!groupCollapsed && <Stack spacing={1.25}>
  {sortByAttentionFirst(
    APPRAISAL_DOC_META
      .map((meta) => ({ meta, doc: groupDocsByKey.get(meta.key) }))
      .filter(
        (entry): entry is { meta: AppraisalDocMeta; doc: RequirementDoc } => !!entry.doc
      )
  ).map(({ meta, doc }) => (
    <Box
      key={meta.key}
      ref={(el: HTMLDivElement | null) => {
        rowRefs.current.set(`${group.id}:${meta.key}`, el);
      }}
    >
      <RequirementDocRow
        meta={meta}
        doc={doc}
        applicantName={applicantName}
        onUpload={handleUploadAppraisalDoc(group.id, meta.key)}
        onRemove={handleRemoveAppraisalDoc(group.id, meta.key)}
        onToggleReviewed={handleToggleAppraisalDocReviewed(group.id, meta.key)}
        onRemarksChange={handleAppraisalDocRemarksChange(group.id, meta.key)}
      />
    </Box>
  ))}
</Stack>}
```

with:

```tsx
{!groupCollapsed && (() => {
  const groupEntries = APPRAISAL_DOC_META
    .map((meta) => ({ meta, doc: groupDocsByKey.get(meta.key) }))
    .filter((entry): entry is { meta: AppraisalDocMeta; doc: RequirementDoc } => !!entry.doc);
  const attentionEntries = groupEntries.filter(({ doc }) => needsAttention(doc));
  const verifiedEntries = groupEntries.filter(({ doc }) => !needsAttention(doc));
  return (
    <Stack spacing={1.25}>
      {attentionEntries.map(({ meta, doc }) => (
        <Box
          key={meta.key}
          ref={(el: HTMLDivElement | null) => {
            rowRefs.current.set(`${group.id}:${meta.key}`, el);
          }}
        >
          <RequirementDocRow
            meta={meta}
            doc={doc}
            applicantName={applicantName}
            onUpload={handleUploadAppraisalDoc(group.id, meta.key)}
            onRemove={handleRemoveAppraisalDoc(group.id, meta.key)}
            onToggleReviewed={handleToggleAppraisalDocReviewed(group.id, meta.key)}
            onRemarksChange={handleAppraisalDocRemarksChange(group.id, meta.key)}
          />
        </Box>
      ))}
      <VerifiedDocsGroup
        entries={verifiedEntries}
        applicantName={applicantName}
        onUpload={(key) => handleUploadAppraisalDoc(group.id, key)}
        onRemove={(key) => handleRemoveAppraisalDoc(group.id, key)}
        onToggleReviewed={(key) => handleToggleAppraisalDocReviewed(group.id, key)}
        onRemarksChange={(key) => handleAppraisalDocRemarksChange(group.id, key)}
        registerRowRef={(key, el) => rowRefs.current.set(`${group.id}:${key}`, el)}
        allVerified={attentionEntries.length === 0}
      />
    </Stack>
  );
})()}
```

- [ ] **Step 4: Split Financial Evaluation's flat list and render both parts**

Replace the Financial Evaluation rendering block
(`requirement-checklist-view.tsx:1228-1253`) — currently:

```tsx
<Stack spacing={1.25}>
  {sortByAttentionFirst(
    REQUIREMENT_DOC_META.filter((meta) => meta.tabs.includes('financialEvaluation'))
      .map((meta) => ({ meta, doc: requiredDocsByKey.get(meta.key) }))
      .filter(
        (entry): entry is { meta: RequirementDocMeta; doc: RequirementDoc } => !!entry.doc
      )
  ).map(({ meta, doc }) => (
    <Box
      key={meta.key}
      ref={(el: HTMLDivElement | null) => {
        rowRefs.current.set(meta.key, el);
      }}
    >
      <RequirementDocRow
        meta={meta}
        doc={doc}
        applicantName={applicantName}
        onUpload={handleUploadDoc(meta.key)}
        onRemove={handleRemoveDoc(meta.key)}
        onToggleReviewed={handleToggleReviewed(meta.key)}
        onRemarksChange={handleRemarksChange(meta.key)}
      />
    </Box>
  ))}
</Stack>
```

with:

```tsx
{(() => {
  const financialEntries = REQUIREMENT_DOC_META.filter((meta) => meta.tabs.includes('financialEvaluation'))
    .map((meta) => ({ meta, doc: requiredDocsByKey.get(meta.key) }))
    .filter((entry): entry is { meta: RequirementDocMeta; doc: RequirementDoc } => !!entry.doc);
  const attentionEntries = financialEntries.filter(({ doc }) => needsAttention(doc));
  const verifiedEntries = financialEntries.filter(({ doc }) => !needsAttention(doc));
  return (
    <Stack spacing={1.25}>
      {attentionEntries.map(({ meta, doc }) => (
        <Box
          key={meta.key}
          ref={(el: HTMLDivElement | null) => {
            rowRefs.current.set(meta.key, el);
          }}
        >
          <RequirementDocRow
            meta={meta}
            doc={doc}
            applicantName={applicantName}
            onUpload={handleUploadDoc(meta.key)}
            onRemove={handleRemoveDoc(meta.key)}
            onToggleReviewed={handleToggleReviewed(meta.key)}
            onRemarksChange={handleRemarksChange(meta.key)}
          />
        </Box>
      ))}
      <VerifiedDocsGroup
        entries={verifiedEntries}
        applicantName={applicantName}
        onUpload={handleUploadDoc}
        onRemove={handleRemoveDoc}
        onToggleReviewed={handleToggleReviewed}
        onRemarksChange={handleRemarksChange}
        registerRowRef={(key, el) => rowRefs.current.set(key, el)}
        allVerified={attentionEntries.length === 0}
      />
    </Stack>
  );
})()}
```

- [ ] **Step 5: Remove the now-unused `sortByAttentionFirst` helper if nothing else calls it**

Run: `grep -n "sortByAttentionFirst" src/sections/admin/requirement-checklist-view.tsx`

If the only remaining match is the function definition itself
(`requirement-checklist-view.tsx:71-81`), delete the function — every call site
was replaced by the `attentionEntries`/`verifiedEntries` split in Steps 2–4,
which makes the manual sort redundant (attention rows already render before the
verified fold, unconditionally). If any call site remains, leave the helper in
place and skip this step.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Manually verify in the browser**

```bash
npm run dev
```

On the same seeded application from Task 3, Step 6:
- Confirm each section shows only its needs-attention rows by default, plus a single "✓ N verified documents" row.
- Click a verified-docs row to expand it and confirm the full document list appears, matching what used to render inline before this change.
- Toggle a document's reviewed checkbox and confirm it moves between the attention list and the verified fold correctly (a doc's `status` field — not its `reviewed` field — drives `needsAttention`, so this only visibly moves if the underlying action also changes `status`; if toggling `reviewed` alone doesn't move it, that's expected — confirm instead by using "Fill Sample Data (All Correct)" to see everything fold to verified, then "Remove Sample Data" to see it return to attention state).
- Confirm a section with zero outstanding items (e.g. after "Fill Sample Data (All Correct)") shows "✓ All N verified" instead of "✓ N verified documents".

- [ ] **Step 8: Commit**

```bash
git add src/sections/admin/requirement-checklist-view.tsx
git commit -m "Fold verified requirement documents into a collapsible group per section"
```

---

## Task 5: Update project docs

**Files:**
- Modify: `docs/ADMIN_REQUIREMENT_CHECKLIST.md`

**Interfaces:**
- Consumes: nothing (documentation only)
- Produces: nothing

- [ ] **Step 1: Read the current doc to find where to add this**

```bash
grep -n "^#" docs/ADMIN_REQUIREMENT_CHECKLIST.md
```

Find the section describing the page's layout/UI (not the data model) — add the
new behavior there.

- [ ] **Step 2: Add a short section describing the new nav + fold behavior**

Add a new subsection (exact heading level matching the surrounding doc structure
found in Step 1) with this content:

```markdown
### Section navigation & verified-docs folding

To reduce how far an officer has to scroll on applications with many
documents:

- A section nav (side panel on desktop ≥`md`, sticky top bar below `md`)
  lists Credit Investigation, Appraisal, and Financial Evaluation with a
  live `received/total` count and a green/amber status dot. Clicking an
  entry scrolls to and auto-expands that section if it was collapsed.
- Within each section (and each Appraisal property group), documents
  already at `status: 'verified'` are folded into a single
  "✓ N verified documents" row instead of listing every verified row in
  full. Only documents that still need attention (`status !== 'verified'`)
  render expanded by default. The fold is expandable per section/group
  independently.
```

- [ ] **Step 3: Commit**

```bash
git add docs/ADMIN_REQUIREMENT_CHECKLIST.md
git commit -m "Document requirement checklist section nav and verified-docs folding"
```
