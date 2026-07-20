# Requirement Checklist Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `RequirementChecklistView` from a flat 5-item checkbox list
into a categorized, per-document checklist with simulated AI verification
status/notes, a progress counter, upload/view actions, and a merged AI
review card — matching the design spec at
`docs/superpowers/specs/2026-07-20-requirement-checklist-rebuild-design.md`.

**Architecture:** New static document-metadata module
(`requirement-checklist-docs.ts`) defines the fixed 16-document/3-category
list and canned AI notes. `admin-context.tsx`'s `RequirementChecklist` type
changes from `checkedItems: string[]` to a structured `documents:
RequirementDoc[]` array, still exposed via the existing
`setRequirementChecklist(data: Partial<RequirementChecklist>)` setter. A new
`RequirementDocRow` component (modeled on `bureau-reports-card.tsx`'s
`BureauRow`) renders each document; `RequirementChecklistView` is rewritten
to render three category groups of these rows, a progress bar, an AI
review card (reusing the risk-tri-level pattern from
`initial-credit-checking-view.tsx`), and the endorse/return actions.

**Tech Stack:** Next.js 14 (App Router), TypeScript, MUI, React Context
(no Redux/state library), no backend — all state in `localStorage` via
`AdminProvider`. No automated test suite for admin views in this codebase;
verification is `tsc --noEmit` + `eslint` + manual/scripted Playwright
browser walkthroughs (see each task's Verify step).

## Global Constraints

- No conditional document sets based on employment status, loan type, or any
  other application field — the same fixed 16-document list shows for every
  application (per spec's Non-goals).
- No real document viewer/preview — "View" shows filename + AI note in a
  simple dialog only.
- Keep "Step 3" and "Endorse" wording — do NOT adopt the mockup's "Step 2" or
  "Endorse to Credit Investigation" (per spec's reconciliation note).
- No borrower-facing notification for "Return to Applicant" — a
  confirmation-state UI change only, no new routing.
- Follow existing visual conventions exactly: card style
  (`p: {xs:3,md:4}`, `borderRadius:'16px'`, `bgcolor:'common.white'`,
  `border:'1px solid #EBEDF3'`, `boxShadow:'0 1px 2px rgba(20,23,42,0.04)'`),
  `Chip size="small" variant="soft"` for status pills, `#1C2A6E`/`#14205A`
  primary button colors, `#F04438` required-asterisk color.
- Every step that touches TypeScript must leave `npx tsc --noEmit` and
  `npx eslint <touched files>` clean before moving to the next task.

---

### Task 1: Document metadata module

**Files:**
- Create: `src/sections/admin/requirement-checklist-docs.ts`

**Interfaces:**
- Produces: `RequirementDocCategory` type (`'loan' | 'financial' |
  'appraisal'`), `RequirementDocMeta` type (`{ key: string; label: string;
  category: RequirementDocCategory; required: boolean; freshNote: string;
  freshStatus: 'verified' | 'needs-review' }`), `REQUIREMENT_DOC_META:
  RequirementDocMeta[]` (the fixed 16-item list), `REQUIREMENT_CATEGORY_LABELS:
  Record<RequirementDocCategory, string>`, `INITIAL_REQUIREMENT_DOCUMENTS:
  RequirementDoc[]` (16-item array matching `admin-context.tsx`'s
  `RequirementDoc` shape — built in Task 2, but this file defines the
  literal starting `status`/`aiNote`/`fileName`/`uploadedAt` per document
  that `admin-context.tsx` imports and spreads into its initial state).

- [ ] **Step 1: Write the metadata file**

```ts
// src/sections/admin/requirement-checklist-docs.ts

// ----------------------------------------------------------------------
// Static content for the Requirement Checklist screen — the fixed
// 16-document/3-category list, each document's required-ness, and the
// canned AI note it gets the first time a file is uploaded for it. Kept
// separate from admin-context.tsx's RequirementChecklist state (per-
// application, persisted) the same way initial-credit-checking-risk.ts is
// kept separate from CreditChecking state: this is fixed content, not
// per-application data.
//
// The document set does NOT vary by employment status, loan type, or any
// other application field — every application shows the same 16 documents,
// by explicit design decision (see docs/superpowers/specs/
// 2026-07-20-requirement-checklist-rebuild-design.md "Non-goals").
// ----------------------------------------------------------------------

export type RequirementDocCategory = 'loan' | 'financial' | 'appraisal';

export type RequirementDocStatus = 'verified' | 'needs-review' | 'missing';

export type RequirementDocMeta = {
  key: string;
  label: string;
  category: RequirementDocCategory;
  required: boolean;
  // Status/note assigned the first time a file is uploaded for this
  // document while it's 'missing' — deterministic per document key, never
  // randomized (see design spec's "AI note generation" decision).
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};

export const REQUIREMENT_CATEGORY_LABELS: Record<RequirementDocCategory, string> = {
  loan: 'Loan Requirements',
  financial: 'Financial Documents',
  appraisal: 'Appraisal Documents',
};

export const REQUIREMENT_DOC_META: RequirementDocMeta[] = [
  // Loan Requirements
  {
    key: 'bankAuthForm',
    label: 'Bank Authorization Form (signed)',
    category: 'loan',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Signature present, but date field appears blank.',
  },
  {
    key: 'poeaContract',
    label: 'POEA Contract',
    category: 'loan',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Employer & contract period extracted.',
  },
  {
    key: 'workingVisa',
    label: 'Working Visa',
    category: 'loan',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Visa expires within 6 months — verify validity.',
  },
  {
    key: 'proofOfBilling',
    label: 'Proof of Billing',
    category: 'loan',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'primaryIdsSpecimenSignatures',
    label: 'Primary IDs w/ 3 specimen signatures',
    category: 'loan',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'tinPrimaryId',
    label: 'TIN — Primary ID',
    category: 'loan',
    required: true,
    freshStatus: 'verified',
    freshNote: '2 attachments · TIN format valid.',
  },
  {
    key: 'statementOfAccount',
    label: 'Statement of Account',
    category: 'loan',
    required: false,
    freshStatus: 'verified',
    freshNote: 'On file, no discrepancies found.',
  },
  // Financial Documents
  {
    key: 'certificateOfEmployment',
    label: 'Certificate of Employment',
    category: 'financial',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Monthly income extracted: ₱142,000.',
  },
  {
    key: 'sixMonthsBankStatement',
    label: '6 months Bank Statement',
    category: 'financial',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 5 months detected — 1 statement may be missing.',
  },
  {
    key: 'twoMonthsPayslip',
    label: 'Latest 2 months payslip',
    category: 'financial',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Both payslips present and legible.',
  },
  {
    key: 'incomeTaxReturn',
    label: 'Income Tax Return (2316)',
    category: 'financial',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Filed amount consistent with stated income.',
  },
  // Appraisal Documents
  {
    key: 'tctCctCopy',
    label: 'Photocopy of TCT / CCT (all pages)',
    category: 'appraisal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'All 4 pages present and legible.',
  },
  {
    key: 'taxDeclarationCopy',
    label: 'Photocopy of Tax Declaration',
    category: 'appraisal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Declared value matches TCT/CCT.',
  },
  {
    key: 'realtyTaxReceipt',
    label: 'Realty tax payment receipt',
    category: 'appraisal',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Receipt is from prior year — confirm current.',
  },
  {
    key: 'lotFloorPlan',
    label: 'Lot Plan / Floor Plan',
    category: 'appraisal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Plan matches declared lot area.',
  },
  {
    key: 'taxMappingAuthorization',
    label: 'Tax Mapping Authorization',
    category: 'appraisal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Signed and dated correctly.',
  },
];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this file isn't imported anywhere yet, so it only
needs to be internally valid TypeScript).

- [ ] **Step 3: Lint**

Run: `npx eslint src/sections/admin/requirement-checklist-docs.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/requirement-checklist-docs.ts
git commit -m "Add fixed document metadata for Requirement Checklist rebuild"
```

---

### Task 2: `RequirementChecklist` state shape + initial state

**Files:**
- Modify: `src/auth/admin-context.tsx`

**Interfaces:**
- Consumes: `RequirementDocMeta`, `REQUIREMENT_DOC_META` from Task 1
  (`src/sections/admin/requirement-checklist-docs.ts`).
- Produces: `RequirementDocStatus` type (re-exported from
  `admin-context.tsx` for consumers that only import from there —
  actually just import the one already defined in
  `requirement-checklist-docs.ts` to avoid duplicate types), `RequirementDoc`
  type (`{ key: string; status: RequirementDocStatus; aiNote: string;
  fileName: string | null; uploadedAt: string | null }`), updated
  `RequirementChecklist` type (`{ documents: RequirementDoc[];
  collateralNotes: string; endorsed: boolean; returnedToApplicant: boolean;
  returnReason: string }`), unchanged `setRequirementChecklist: (data:
  Partial<RequirementChecklist>) => void` setter signature.

Find the current `RequirementChecklist` type (search for `export type
RequirementChecklist` in `src/auth/admin-context.tsx`) and the current
initial-state line inside `createInitialReview()` (search for
`requirementChecklist: { checkedItems`).

- [ ] **Step 1: Add the import**

At the top of `src/auth/admin-context.tsx`, alongside the existing local
imports (there may not be any yet from `sections/` — check first; if this
is the first cross-directory import into `admin-context.tsx` from
`sections/admin/`, add it as its own import group after the `'use client'`
directive's existing imports):

```ts
import type { RequirementDocStatus, RequirementDocMeta } from 'src/sections/admin/requirement-checklist-docs';
import { REQUIREMENT_DOC_META } from 'src/sections/admin/requirement-checklist-docs';
```

- [ ] **Step 2: Replace the `RequirementChecklist` type**

Find:
```ts
export type RequirementChecklist = {
  checkedItems: string[];
  collateralNotes: string;
  endorsed: boolean;
};
```

Replace with:
```ts
export type RequirementDoc = {
  key: string;
  status: RequirementDocStatus;
  aiNote: string;
  fileName: string | null;
  uploadedAt: string | null;
};

export type RequirementChecklist = {
  documents: RequirementDoc[];
  collateralNotes: string;
  endorsed: boolean;
  returnedToApplicant: boolean;
  returnReason: string;
};
```

- [ ] **Step 3: Build the initial documents array**

Above `function createInitialReview()`, add a helper that builds the
pre-populated starting state described in the spec (14 of 16 documents
already `verified`/`needs-review` with a sample filename, exactly
`incomeTaxReturn` and `taxMappingAuthorization` left `missing`):

```ts
// Pre-populates 14 of the 16 documents as already received (matching the
// design spec's "12/13 Required Received" starting screenshot) — every doc
// except incomeTaxReturn and taxMappingAuthorization starts with a sample
// fileName and its metadata's freshStatus/freshNote already applied.
const DOCS_STARTING_MISSING = new Set(['incomeTaxReturn', 'taxMappingAuthorization']);

function createInitialRequirementDocuments(): RequirementDoc[] {
  return REQUIREMENT_DOC_META.map((meta) => {
    if (DOCS_STARTING_MISSING.has(meta.key)) {
      return { key: meta.key, status: 'missing', aiNote: '', fileName: null, uploadedAt: null };
    }
    return {
      key: meta.key,
      status: meta.freshStatus,
      aiNote: meta.freshNote,
      fileName: `${meta.key}-sample.pdf`,
      uploadedAt: new Date(0).toISOString(),
    };
  });
}
```

- [ ] **Step 4: Replace the initial state line**

Find (inside `createInitialReview()`):
```ts
    requirementChecklist: { checkedItems: [], collateralNotes: '', endorsed: false },
```

Replace with:
```ts
    requirementChecklist: {
      documents: createInitialRequirementDocuments(),
      collateralNotes: '',
      endorsed: false,
      returnedToApplicant: false,
      returnReason: '',
    },
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors will appear in `requirement-checklist-view.tsx` (it still
references the old `checkedItems` shape) — that's expected and fixed in
Task 4. Confirm the ONLY errors are in `requirement-checklist-view.tsx`
(grep the output for that filename); anything else means Task 2 itself has
a mistake.

Run: `npx tsc --noEmit 2>&1 | grep -v requirement-checklist-view.tsx`
Expected: empty output.

- [ ] **Step 6: Lint the file itself (ignore the view's now-stale errors)**

Run: `npx eslint src/auth/admin-context.tsx`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/auth/admin-context.tsx
git commit -m "Restructure RequirementChecklist state into per-document shape"
```

---

### Task 3: `RequirementDocRow` component

**Files:**
- Create: `src/sections/admin/requirement-doc-row.tsx`

**Interfaces:**
- Consumes: `RequirementDoc`, `RequirementDocStatus` from `src/auth/admin-context.tsx` / `src/sections/admin/requirement-checklist-docs.ts`; `RequirementDocMeta` from Task 1.
- Produces: `RequirementDocRow` component with props `{ meta: RequirementDocMeta; doc: RequirementDoc; onUpload: (data: Partial<RequirementDoc>) => void }` (default export is NOT used anywhere in this codebase's convention — use a named export `export function RequirementDocRow(...)`).

Model this directly on `BureauRow`/`SimpleBureauRow` in
`src/sections/admin/bureau-reports-card.tsx` (read that file first if not
already in context — the row shell, icon box, and `UploadedPill`-style
pattern are being intentionally duplicated here rather than shared, since
`BureauRow` is scoped to bureau-specific upload semantics and adding a
generic prop surface to it would blur its one responsibility; this
codebase already accepts some duplication between `BureauRow` and a new
`RequirementDocRow` rather than introducing a premature shared abstraction
— see CLAUDE.md's YAGNI guidance).

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta } from './requirement-checklist-docs';

// ----------------------------------------------------------------------
// One row per document on the Requirement Checklist screen — modeled on
// BureauRow/SimpleBureauRow in bureau-reports-card.tsx, duplicated rather
// than shared since that component's upload semantics (BureauUpload shape,
// CIBI-specific branching) don't fit this screen's RequirementDoc shape.
// "View" (for verified/needs-review docs) opens a lightweight dialog with
// the filename + AI note — no real document viewer exists anywhere in this
// app. "Upload" (for missing docs) is a real file picker; picking a file
// deterministically assigns the document's meta.freshStatus/freshNote (see
// requirement-checklist-docs.ts) rather than anything read from the file.
// ----------------------------------------------------------------------

const STATUS_STYLES: Record<
  RequirementDoc['status'],
  { icon: string; iconColor: string; chipLabel: string; chipBg: string; chipColor: string }
> = {
  verified: {
    icon: 'solar:check-circle-bold',
    iconColor: '#12B76A',
    chipLabel: 'Verified',
    chipBg: '#E7F8F0',
    chipColor: '#0C8A4F',
  },
  'needs-review': {
    icon: 'solar:danger-triangle-bold',
    iconColor: '#B36A05',
    chipLabel: 'Needs review',
    chipBg: '#FEF0D6',
    chipColor: '#B36A05',
  },
  missing: {
    icon: 'solar:document-linear',
    iconColor: '#C7CCDA',
    chipLabel: 'Missing',
    chipBg: '#F5F6FA',
    chipColor: '#8891A6',
  },
};

type RequirementDocRowProps = {
  meta: RequirementDocMeta;
  doc: RequirementDoc;
  onUpload: (data: Partial<RequirementDoc>) => void;
};

export function RequirementDocRow({ meta, doc, onUpload }: RequirementDocRowProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const style = STATUS_STYLES[doc.status];

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload({
      status: meta.freshStatus,
      aiNote: meta.freshNote,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    });
    event.target.value = '';
  };

  return (
    <Box sx={{ borderRadius: '13px', border: '1px solid #EBEDF3', overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2 }}>
        <Iconify icon={style.icon} width={20} sx={{ color: style.iconColor, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
            {meta.required && <Box component="span" sx={{ color: '#F04438' }}>* </Box>}
            {meta.label}
          </Typography>
          {doc.aiNote && (
            <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.25 }}>{doc.aiNote}</Typography>
          )}
        </Box>
        <Chip
          size="small"
          label={style.chipLabel}
          sx={{ bgcolor: style.chipBg, color: style.chipColor, fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}
        />
        {doc.status === 'missing' ? (
          <>
            <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={handleUpload} />
            <Button
              onClick={() => inputRef.current?.click()}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '9px', px: 2, flexShrink: 0, '&:hover': { bgcolor: '#14205A' } }}
            >
              Upload
            </Button>
          </>
        ) : (
          <Button
            onClick={() => setViewOpen(true)}
            variant="outlined"
            size="small"
            sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', px: 2, flexShrink: 0, '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' } }}
          >
            View
          </Button>
        )}
      </Stack>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>{meta.label}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
              {doc.fileName ?? 'No file on record'}
            </Typography>
            <Chip
              size="small"
              label={style.chipLabel}
              sx={{ bgcolor: style.chipBg, color: style.chipColor, fontWeight: 700, fontSize: 11.5, width: 'fit-content' }}
            />
            <Typography sx={{ fontSize: 14, color: '#3B4256', lineHeight: 1.6 }}>{doc.aiNote}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep requirement-doc-row.tsx`
Expected: empty output (no errors in this new file).

- [ ] **Step 3: Lint**

Run: `npx eslint src/sections/admin/requirement-doc-row.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/requirement-doc-row.tsx
git commit -m "Add RequirementDocRow component"
```

---

### Task 4: Risk/summary derivation helper

**Files:**
- Create: `src/sections/admin/requirement-checklist-risk.ts`

**Interfaces:**
- Consumes: `RequirementDoc`, `RequirementDocMeta` types.
- Produces: `RequirementChecklistRiskLevel` type (`'good' | 'watch' |
  'high'`), `buildRequirementChecklistSummary(documents: RequirementDoc[],
  docMeta: RequirementDocMeta[], monthlyIncome: number, desiredLoanAmount:
  number): { level: RequirementChecklistRiskLevel; summary: string;
  recommendation: string }`.

Same "pure computation, never stored" pattern as
`initial-credit-checking-risk.ts`'s `buildInitialAiRecommendation` — this
function is called at render time in Task 5, never persisted.

- [ ] **Step 1: Write the helper**

```ts
// src/sections/admin/requirement-checklist-risk.ts

// ----------------------------------------------------------------------
// Derives the Requirement Checklist screen's "AI review, summary &
// recommendation" content — pure computation from the current documents
// array + application financial info, never stored (same pattern as
// initial-credit-checking-risk.ts's buildInitialAiRecommendation).
// ----------------------------------------------------------------------

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta } from './requirement-checklist-docs';

export type RequirementChecklistRiskLevel = 'good' | 'watch' | 'high';

export function buildRequirementChecklistSummary(
  documents: RequirementDoc[],
  docMeta: RequirementDocMeta[],
  monthlyIncome: number,
  desiredLoanAmount: number
): { level: RequirementChecklistRiskLevel; summary: string; recommendation: string } {
  const metaByKey = new Map(docMeta.map((meta) => [meta.key, meta]));
  const requiredDocs = documents.filter((doc) => metaByKey.get(doc.key)?.required);

  const verifiedCount = documents.filter((doc) => doc.status === 'verified').length;
  const needsReviewCount = documents.filter((doc) => doc.status === 'needs-review').length;
  const missingCount = documents.filter((doc) => doc.status === 'missing').length;
  const missingRequiredCount = requiredDocs.filter((doc) => doc.status === 'missing').length;

  const summary = `${documents.length - missingCount} of ${documents.length} required documents are on file. AI verified ${verifiedCount} document(s), flagged ${needsReviewCount} for review, and found ${missingCount} still missing. Extracted monthly income (₱${monthlyIncome.toLocaleString()}) is consistent with the ₱${desiredLoanAmount.toLocaleString()} loan request.`;

  const outstanding = documents
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => metaByKey.get(doc.key)?.label)
    .filter((label): label is string => !!label);

  if (missingRequiredCount > 0 || needsReviewCount > 0) {
    const level: RequirementChecklistRiskLevel = missingRequiredCount > 0 ? 'high' : 'watch';
    const recommendation =
      outstanding.length > 0
        ? `Clear the ${outstanding.length} outstanding item(s) — ${outstanding.join(', ')} — before endorsing to the next step.`
        : 'Resolve the outstanding items above before endorsing to the next step.';
    return { level, summary, recommendation };
  }

  return {
    level: 'good',
    summary,
    recommendation: 'All required documents are on file and verified. Ready to endorse.',
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep requirement-checklist-risk.ts`
Expected: empty output.

- [ ] **Step 3: Lint**

Run: `npx eslint src/sections/admin/requirement-checklist-risk.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/requirement-checklist-risk.ts
git commit -m "Add Requirement Checklist AI summary/recommendation derivation"
```

---

### Task 5: Rewrite `RequirementChecklistView`

**Files:**
- Modify: `src/sections/admin/requirement-checklist-view.tsx` (full rewrite)

**Interfaces:**
- Consumes: `RequirementDocRow` (Task 3), `REQUIREMENT_DOC_META` +
  `REQUIREMENT_CATEGORY_LABELS` + `RequirementDocCategory` (Task 1),
  `buildRequirementChecklistSummary` (Task 4), `RequirementDoc` /
  `RequirementChecklist` types (Task 2), `ApplicationReviewHeader`
  (existing, unchanged props), `ConfirmDialog` (existing,
  `src/components/custom-dialog`).
- Produces: `RequirementChecklistView` component (default page content for
  `/admin/applications/[id]/requirement-checklist` — no prop changes at
  that call site).

This is a full rewrite of the file — no step-by-step diff, since the
structure changes substantially (flat checkbox list → categorized rows +
progress bar + AI card + two-action footer + two success states).

- [ ] **Step 1: Read the current file's imports/success-state pattern one more time before rewriting**

Run: `cat src/sections/admin/requirement-checklist-view.tsx`

Confirm the current `endorsed` success-state JSX (the icon circle + heading
+ body + "Back to Application List" button) so Task 5's rewrite can reuse
its exact visual shape for BOTH the endorsed state and the new
returned-to-applicant state.

- [ ] **Step 2: Write the full replacement file**

```tsx
'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { ApplicationReviewHeader } from './application-review-header';
import { RequirementDocRow } from './requirement-doc-row';
import { buildRequirementChecklistSummary } from './requirement-checklist-risk';
import {
  REQUIREMENT_DOC_META,
  REQUIREMENT_CATEGORY_LABELS,
} from './requirement-checklist-docs';

import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocCategory } from './requirement-checklist-docs';
import type { RequirementChecklistRiskLevel } from './requirement-checklist-risk';

// ----------------------------------------------------------------------

const CATEGORY_ORDER: RequirementDocCategory[] = ['loan', 'financial', 'appraisal'];

const RISK_STYLES: Record<
  RequirementChecklistRiskLevel,
  { bg: string; color: string; icon: string; label: string }
> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Ready' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Almost ready' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'Not ready' },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}
    >
      {children}
    </Typography>
  );
}

function SuccessState({
  icon,
  iconBg,
  iconColor,
  heading,
  body,
  stepLabel,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  heading: string;
  body: string;
  stepLabel: string;
}) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step={stepLabel} reviewStep="requirementChecklist" />

      <Stack
        alignItems="center"
        textAlign="center"
        spacing={2}
        sx={{ p: { xs: 4, md: 6 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3' }}
      >
        <Box
          sx={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: iconBg }}
        >
          <Iconify icon={icon} width={26} sx={{ color: iconColor }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>{heading}</Typography>
        <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>{body}</Typography>
        <Button
          component="a"
          href={paths.admin.applications}
          variant="contained"
          sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }}
        >
          Back to Application List
        </Button>
      </Stack>
    </Container>
  );
}

export function RequirementChecklistView() {
  const { signUpData, application } = useRegistration();
  const { review, setRequirementChecklist } = useAdmin();
  const [collateralNotes, setCollateralNotes] = useState(review.requirementChecklist.collateralNotes);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReasonDraft, setReturnReasonDraft] = useState('');

  if (!signUpData) return null;

  const { documents, endorsed, returnedToApplicant } = review.requirementChecklist;

  const handleUploadDoc = (key: string) => (data: Partial<RequirementDoc>) => {
    setRequirementChecklist({
      documents: documents.map((doc) => (doc.key === key ? { ...doc, ...data } : doc)),
    });
  };

  const requiredMeta = REQUIREMENT_DOC_META.filter((meta) => meta.required);
  const requiredDocsByKey = new Map(documents.map((doc) => [doc.key, doc]));
  const receivedRequiredCount = requiredMeta.filter(
    (meta) => requiredDocsByKey.get(meta.key)?.status !== 'missing'
  ).length;
  const allRequiredReceived = receivedRequiredCount === requiredMeta.length;
  const progressFraction = requiredMeta.length > 0 ? receivedRequiredCount / requiredMeta.length : 0;

  const { level, summary, recommendation } = buildRequirementChecklistSummary(
    documents,
    REQUIREMENT_DOC_META,
    application.financialInfo?.monthlyIncome ?? 0,
    application.financialInfo?.desiredLoanAmount ?? 0
  );
  const riskStyle = RISK_STYLES[level];

  const handleEndorse = () => {
    setRequirementChecklist({ collateralNotes, endorsed: true });
  };

  const closeReturnDialog = () => {
    setReturnDialogOpen(false);
    setReturnReasonDraft('');
  };

  const confirmReturn = () => {
    if (!returnReasonDraft.trim()) return;
    setRequirementChecklist({
      collateralNotes,
      returnedToApplicant: true,
      returnReason: returnReasonDraft.trim(),
    });
    closeReturnDialog();
  };

  if (endorsed) {
    return (
      <SuccessState
        icon="solar:check-circle-bold"
        iconBg="#E7F8F0"
        iconColor="#12B76A"
        heading="Endorsed for comprehensive process"
        body="This application has been endorsed with its requirement checklist and collateral details for the next stage of processing."
        stepLabel="Requirement Checklist · Endorsed"
      />
    );
  }

  if (returnedToApplicant) {
    return (
      <SuccessState
        icon="solar:undo-left-round-bold"
        iconBg="#FEF0D6"
        iconColor="#B36A05"
        heading="Returned to applicant"
        body="This application has been sent back with the outstanding requirements noted. The officer's reason has been recorded on file."
        stepLabel="Requirement Checklist · Returned"
      />
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 3 · Requirement Checklist" reviewStep="requirementChecklist" />

      <Stack spacing={2.5}>
        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              Requirement Checklist
            </Typography>
            <Stack alignItems="flex-end" spacing={0.25}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#14172A' }}>
                {receivedRequiredCount}/{requiredMeta.length}
              </Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8891A6' }}>
                Required received
              </Typography>
            </Stack>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Collect and verify all required documents before endorsing the application.
          </Typography>

          <Box sx={{ height: 6, borderRadius: 999, bgcolor: '#EEF0F5', overflow: 'hidden', mb: 3 }}>
            <Box sx={{ width: `${progressFraction * 100}%`, height: 1, bgcolor: '#1C2A6E', transition: 'width 0.2s ease' }} />
          </Box>

          <Stack spacing={3}>
            {CATEGORY_ORDER.map((category) => {
              const categoryMeta = REQUIREMENT_DOC_META.filter((meta) => meta.category === category);
              return (
                <Stack key={category} spacing={1.25}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <SectionLabel>{REQUIREMENT_CATEGORY_LABELS[category]}</SectionLabel>
                    <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
                      {categoryMeta.length} documents
                    </Typography>
                  </Stack>
                  <Stack spacing={1.25}>
                    {categoryMeta.map((meta) => {
                      const doc = requiredDocsByKey.get(meta.key);
                      if (!doc) return null;
                      return (
                        <RequirementDocRow
                          key={meta.key}
                          meta={meta}
                          doc={doc}
                          onUpload={handleUploadDoc(meta.key)}
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Collateral
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Request or adjust collateral details for this application, if applicable.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="e.g. Request updated collateral appraisal for the pledged property…"
            value={collateralNotes}
            onChange={(event) => setCollateralNotes(event.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Automatically checks each uploaded document for completeness, validity and consistency
            with the application.
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon="solar:document-text-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  AI Summary
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{summary}</Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon={riskStyle.icon} width={16} sx={{ color: riskStyle.color }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color }}>
                  AI Recommendation · {riskStyle.label}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>
                {recommendation}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Ready to endorse?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {allRequiredReceived
              ? 'All required documents are on file — ready to endorse to the next step.'
              : `Clear the ${requiredMeta.length - receivedRequiredCount} outstanding item(s) above, then endorse this application to the next step.`}
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleEndorse}
              disabled={!allRequiredReceived}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Endorse to Credit Investigation
            </Button>
            <Button
              onClick={() => setReturnDialogOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{ color: '#F04438', borderColor: '#F04438', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(240,68,56,0.04)' } }}
            >
              Return to Applicant
            </Button>
          </Stack>
        </Box>
      </Stack>

      <ConfirmDialog
        open={returnDialogOpen}
        onClose={closeReturnDialog}
        title="Reason for returning to applicant"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what's missing or needs correction…"
            value={returnReasonDraft}
            onChange={(event) => setReturnReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!returnReasonDraft.trim()}
            onClick={confirmReturn}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
```

Note: the primary button reads "Endorse to Credit Investigation" in this
step's code — **STOP, this contradicts the Global Constraints.** Change it
to just `Endorse` before running Step 3 below. (This note exists because the
mockup's literal button text is easy to copy by habit while translating the
screenshot — the constraint says keep it as our own "Endorse" wording, not
the mockup's "Credit Investigation" destination which doesn't exist in our
pipeline.)

- [ ] **Step 3: Fix the button label per the Global Constraints**

In the file just written, find:
```tsx
              Endorse to Credit Investigation
```
Replace with:
```tsx
              Endorse
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere (this was the last file with stale references
from Task 2's type change).

- [ ] **Step 5: Lint**

Run: `npx eslint src/sections/admin/requirement-checklist-view.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/sections/admin/requirement-checklist-view.tsx
git commit -m "Rebuild Requirement Checklist view with categorized document rows"
```

---

### Task 6: Browser verification

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm dev server is running**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5`
Expected: `200`. If not 200, start it: `npm run dev &` and poll until it is.

- [ ] **Step 2: Write and run a Playwright verification script**

Set up a scratch dir with a symlinked `node_modules` pointing at a cached
Playwright install (same technique used earlier this session — locate via
`find "$(npm config get cache)/_npx" -maxdepth 3 -iname playwright -type d`
and symlink its `node_modules` into a `.scratch-verify/` dir at the repo
root), then run a script that:

1. Seeds `localStorage` with a `hhc-lms-registration` object (`signUpData`,
   `verified: true`, `application.personalInfo`/`financialInfo` filled in,
   `application.submittedAt` set) and a `hhc-lms-admin-session` object
   (`adminUser` set), same shape as prior verification scripts this session.
2. Navigates to `/admin/applications/<email>/requirement-checklist`.
3. Asserts: the "12/13" (or correct X/Y for the seeded starting state)
   counter renders; all three category headers ("Loan Requirements",
   "Financial Documents", "Appraisal Documents") are visible; at least one
   "Needs review" chip and one "Missing" chip are visible; the "Endorse"
   button is disabled while any required doc is missing.
4. Clicks "Upload" on the `incomeTaxReturn` row's file input (or any one of
   the two starting-missing docs), feeding it a small in-memory PNG buffer
   (same `PNG_B64` constant used in prior verification scripts this
   session), and asserts the row's chip/status updates and the counter
   increments.
5. Once BOTH missing required docs are uploaded, asserts the "Endorse"
   button becomes enabled, clicks it, and asserts the "Endorsed for
   comprehensive process" success screen renders.
6. Reloads fresh seeded state, clicks "Return to Applicant", fills the
   reason dialog, confirms, and asserts the "Returned to applicant" success
   screen renders.
7. Asserts zero console errors throughout.

Take at least two screenshots (initial categorized-checklist view, and the
"Endorsed" success state) and view them with the Read tool to visually
confirm layout matches the design spec's card conventions.

Expected: all assertions pass, both screenshots show cards matching this
app's existing visual style (white cards, `#EBEDF3` borders, `#1C2A6E`
primary buttons).

- [ ] **Step 3: Clean up scratch files**

Run: `rm -rf .scratch-verify && rm -f /tmp/<any-screenshot-names>.png`

- [ ] **Step 4: Final full-repo check**

Run: `npx tsc --noEmit && npx eslint src/`
Expected: both clean.

- [ ] **Step 5: Update `docs/ADMIN_INITIAL_CREDIT_CHECKING.md` cross-references (if any) and create `docs/ADMIN_REQUIREMENT_CHECKLIST.md`**

Per the standing "always update docs" rule and the user's explicit request
to create a dedicated MD file for this screen (mirroring
`docs/ADMIN_INITIAL_CREDIT_CHECKING.md`'s structure: What this is, Layout,
each card's behavior, the risk-derivation function, Non-goals/History,
Fabricated-claims-style honesty note about the simulated AI). Write
`docs/ADMIN_REQUIREMENT_CHECKLIST.md` covering: the fixed document list and
where it lives (`requirement-checklist-docs.ts`), the `RequirementDoc`
state shape, `RequirementDocRow`'s View/Upload behavior, the progress
counter and Endorse-gating rule (required-missing blocks, needs-review does
not), the AI summary/recommendation derivation
(`requirement-checklist-risk.ts`), the Return to Applicant flow, and an
explicit note that this screen's document set does not vary by application
(same fixed 16 items for every borrower) — a known, deliberate scope
limitation, not a bug.

Also grep `PROJECT_OVERVIEW.md` for any existing description of the old
flat-checklist behavior (`checkedItems`, "Requirement Checklist") and update
it to point at the new dedicated doc file, same pattern as how Initial
Credit Checking's detailed coverage was trimmed to a pointer earlier this
session.

- [ ] **Step 6: Commit the docs**

```bash
git add docs/ADMIN_REQUIREMENT_CHECKLIST.md PROJECT_OVERVIEW.md
git commit -m "Add Requirement Checklist admin doc, update PROJECT_OVERVIEW pointer"
```

---

## Self-Review Notes

**Spec coverage:**
- Data model change (checkedItems → documents array) — Task 2. ✓
- Fixed 16-doc/3-category list — Task 1. ✓
- Deterministic canned AI notes, not randomized — Task 1 (`freshNote` per
  key, no hash function). ✓
- Pre-populated starting state (12/13-style) — Task 2 Step 3
  (`createInitialRequirementDocuments`, `DOCS_STARTING_MISSING`). ✓
- `RequirementDocRow` (status icon/chip/note/View-or-Upload) — Task 3. ✓
- Real file-picker Upload, simple dialog View — Task 3. ✓
- Progress counter + bar — Task 5 (`receivedRequiredCount`/`requiredMeta.length`, the `Box`-based bar). ✓
- AI review card (Summary + risk-styled Recommendation) — Task 4 + Task 5. ✓
- Endorse gated on required-missing only, not needs-review — Task 5
  (`allRequiredReceived` only checks `status !== 'missing'`). ✓
- Return to Applicant + reason dialog + confirmation state — Task 5
  (`ConfirmDialog`, `SuccessState` reused for both endorsed/returned). ✓
- Keep "Step 3"/"Endorse" wording, not mockup's "Step 2"/"Credit
  Investigation" — Task 5 Step 3 explicitly calls this out and fixes it. ✓
- New dedicated MD doc — Task 6 Step 5. ✓

**Placeholder scan:** no TBD/TODO markers; every step has complete code, not
descriptions of code.

**Type consistency check:** `RequirementDoc` (Task 2) has `{key, status,
aiNote, fileName, uploadedAt}` — used identically in Task 3's props, Task
4's function signature, and Task 5's `handleUploadDoc`/`documents.map`.
`RequirementDocMeta` (Task 1) has `{key, label, category, required,
freshStatus, freshNote}` — used identically across Tasks 3, 4, 5.
`setRequirementChecklist(data: Partial<RequirementChecklist>)` signature
unchanged from the existing codebase — Task 5 always calls it with a
partial object matching the Task 2 type. No naming drift found.
