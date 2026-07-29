# CI Report Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Credit Investigation "CI Report" card from a flat 5-field form into a 16-section structured report matching PG Finance's real CI report fields, styled with this app's existing design system (collapsible sub-sections, `StatusBadge`, `adminCardSx`) instead of a plain printed layout.

**Architecture:** `CiReport` grows into a much larger typed shape in `src/auth/admin-context.tsx`, with five new list-entry types and their own add/update/remove context actions (mirroring the existing `NegativeReportEntry`/`addNegativeReportEntry` pattern). `CiReportCard` becomes a thin shell rendering 16 ordered section components (most collapsible) from a new `ci-report-sections/` directory. A shared `CollapsibleSubsection` component is extracted from `NegativeCreditReportCard`'s inline `SpecialSection` so both consumers share one implementation.

**Tech Stack:** Next.js 14 (App Router), TypeScript, MUI, React Context + `localStorage` (no backend). No committed automated test suite for admin views — verification is manual per `PROJECT_OVERVIEW.md`.

## Global Constraints

- No real backend, no real AI/OCR — every "AI Summary" and auto-fill stays deterministic, hash-seeded template text (same technique as `simulateBureauFinding`/`buildTranscriptAutoFill` today). Never call `Math.random()` for this; always hash a seed so results are stable across reloads.
- File uploads never read file contents — only store `fileName` + timestamp, same convention as every existing upload in this app.
- Follow the existing design tokens exactly: `adminCardSx`, `outlinedNavyButtonSx`, `iconButtonBorderedSx`, `TONE_COLORS`/`StatusBadge` from `src/components/admin-ui`. Field text styling: label `#8891A6`/12px, value `#14172A`/14px/700 (read-only `DetailField` style) — copy `application-details-card.tsx`'s `DetailField`/`SectionLabel` conventions exactly, do not invent new ones.
- Every new `TextField` uses `sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}` (the `fieldSx` convention already used in `ci-report-card.tsx` and `negative-credit-report-card.tsx`).
- `docs/ADMIN_CREDIT_INVESTIGATION.md` and `PROJECT_OVERVIEW.md` must be updated in the same task as the data-model/behavior change they describe, not deferred to a final pass — this is a standing project rule.
- No PDF/print export — stays a web form.
- Spec of record: `docs/superpowers/specs/2026-07-29-ci-report-redesign-design.md`.

---

## File Structure

**Modify:**
- `src/auth/admin-context.tsx` — `CiReport` type rebuild, 5 new entry types, `CreditInvestigation.additionalDocuments`, ~20 new context actions, initial-state factories, reducer implementations.
- `src/sections/admin/credit-investigation-transcript.ts` — extend `CiTranscriptAutoFill` and `buildTranscriptAutoFill()` to cover the 5 new auto-fillable fields; drop the fields that no longer exist on `CiReport`.
- `src/sections/admin/credit-investigation/ci-report-card.tsx` — rewritten as a thin shell.
- `src/sections/admin/negative-credit-report-card.tsx` — `SpecialSection`/`EntryCard` extracted out to the new shared component; this file imports and uses it instead of defining it inline.
- `docs/ADMIN_CREDIT_INVESTIGATION.md` — rewrite "CI Report" section.
- `PROJECT_OVERVIEW.md` — update `CreditInvestigation`/`CiReport` data model summary.

**Create:**
- `src/components/admin-ui/collapsible-subsection.tsx` — shared `CollapsibleSubsection` + `EntryCard` components (extracted from `negative-credit-report-card.tsx`'s `SpecialSection`/`EntryCard`).
- `src/sections/admin/credit-investigation/ci-report-sections/` — one file per section:
  - `ci-report-inspection-section.tsx`
  - `ci-report-spouse-section.tsx`
  - `ci-report-children-section.tsx`
  - `ci-report-residence-section.tsx`
  - `ci-report-employment-section.tsx`
  - `ci-report-trade-checking-section.tsx`
  - `ci-report-assets-section.tsx`
  - `ci-report-other-income-section.tsx`
  - `ci-report-loan-purpose-section.tsx`
  - `ci-report-bank-verification-section.tsx`
  - `ci-report-negative-record-section.tsx`
  - `ci-report-comaker-section.tsx`
  - `ci-report-health-habits-section.tsx`
  - `ci-report-comments-section.tsx`
  - `ci-report-additional-documents-section.tsx`
  - `ci-report-section-shared.tsx` — shared `ReadOnlyField`/`SectionLabel`-equivalent helpers local to these sections (thin re-export/wrapper, avoids importing internals from `application-details-card.tsx`).

Each task below produces a working, independently reviewable slice: data model first, then the shared UI primitive, then sections grouped by pattern (read-only, list-based, free-text, composite), then the shell that wires them together, then docs.

---

### Task 1: Extract `CollapsibleSubsection` + `EntryCard` into shared `admin-ui`

**Files:**
- Create: `src/components/admin-ui/collapsible-subsection.tsx`
- Modify: `src/components/admin-ui/index.ts`
- Modify: `src/sections/admin/negative-credit-report-card.tsx:40-195` (remove inline `SectionLabel`... keep that one local; remove `SpecialSection`/`EntryCard`, import from admin-ui instead)

**Interfaces:**
- Produces:
  - `CollapsibleSubsection({ title, description, badgeTone, badgeLabel, children }: { title: string; description: string; badgeTone: SemanticTone; badgeLabel: string; children: React.ReactNode })` — collapsed-by-default (internal `useState(false)`), header row (title/description left, `StatusBadge` + chevron right), `Collapse` body with `p:2, pt:0` padding, same visual shape as today's `SpecialSection`.
  - `EntryCard({ index, onRemove, children }: { index: number; onRemove: () => void; children: React.ReactNode })` — numbered `StatusBadge` "Entry N" header + Remove button, generic body via `children` (today's `EntryCard` hardcodes two `TextField`s for `label`/`findings`; the shared version must accept arbitrary field content so Trade Checking/Children/Bank Verification entries — which have different field sets — can all use it).

This is a pure refactor — no behavior change. `NegativeCreditReportCard` must render identically before and after.

- [ ] **Step 1: Read the current `SpecialSection`/`EntryCard` implementation**

Already read in full during planning — `src/sections/admin/negative-credit-report-card.tsx:44-195`. `SectionLabel` (lines 44-58) stays local to that file (still used elsewhere in it); only `EntryCard` (69-118) and `SpecialSection` (120-195) move.

- [ ] **Step 2: Create `src/components/admin-ui/collapsible-subsection.tsx`**

```tsx
'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { StatusBadge, TONE_COLORS } from './status-badge';
import type { SemanticTone } from './admin-tokens';

// ----------------------------------------------------------------------
// Shared collapsed-by-default sub-section shell for list/free-text blocks
// nested inside a larger admin card (Negative Credit Report's special
// findings, CI Report's 12 collapsible sections). Extracted from
// NegativeCreditReportCard's original inline SpecialSection/EntryCard so
// both consumers share one implementation.
// ----------------------------------------------------------------------

export function CollapsibleSubsection({
  title,
  description,
  badgeTone,
  badgeLabel,
  children,
}: {
  title: string;
  description: string;
  badgeTone: SemanticTone;
  badgeLabel: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ borderRadius: '12px', border: '1px solid #EEF0F5', overflow: 'hidden' }}>
      <ButtonBase
        onClick={() => setExpanded((prev) => !prev)}
        sx={{ width: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, textAlign: 'left' }}
      >
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
          <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{description}</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <StatusBadge tone={badgeTone} label={badgeLabel} />
          <Iconify
            icon="eva:chevron-down-fill"
            width={20}
            sx={{
              color: '#8891A6',
              transition: 'transform 0.15s ease',
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          />
        </Stack>
      </ButtonBase>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

export function EntryCard({
  index,
  onRemove,
  children,
}: {
  index: number;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <StatusBadge tone="info" label={`Entry ${index + 1}`} />
        <Button
          onClick={onRemove}
          size="small"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={15} />}
          sx={{ color: TONE_COLORS.error.text, '&:hover': { bgcolor: TONE_COLORS.error.bg } }}
        >
          Remove
        </Button>
      </Stack>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Export from `src/components/admin-ui/index.ts`**

```ts
export * from './admin-tokens';
export * from './status-badge';
export * from './collapsible-subsection';
```

- [ ] **Step 4: Update `negative-credit-report-card.tsx` to use the shared components**

Remove the inline `EntryCard` function (lines 69-118) and `SpecialSection` function (lines 120-195) entirely. Add to the imports:

```tsx
import { StatusBadge, TONE_COLORS, adminCardSx, outlinedNavyButtonSx, CollapsibleSubsection, EntryCard } from 'src/components/admin-ui';
```

(remove the now-unused `useState`, `Collapse`, `ButtonBase` imports if nothing else in the file uses them — check first, since `NegativeCreditReportCard`'s own top-level component may still need `useState`).

Replace every call site that rendered `<SpecialSection listKey=... title=... description=... labelField=... entries=... onAdd=... onChange=... onRemove=...>` with the new shape — the caller (not the shared component) now owns the per-entry field rendering and the "Add Entry" button, since `EntryCard`'s body is now generic children instead of hardcoded `label`/`findings` fields. Reconstruct the call site as:

```tsx
function SpecialSectionList({
  title,
  description,
  labelField,
  entries,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  description: string;
  labelField: string;
  entries: NegativeReportEntry[];
  onAdd: () => void;
  onChange: (id: string, data: Partial<NegativeReportEntry>) => void;
  onRemove: (id: string) => void;
}) {
  const hasEntries = entries.length > 0;
  return (
    <CollapsibleSubsection
      title={title}
      description={description}
      badgeTone={hasEntries ? 'warning' : 'neutral'}
      badgeLabel={hasEntries ? `${entries.length} added` : 'None added'}
    >
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <EntryCard key={entry.id} index={index} onRemove={() => onRemove(entry.id)}>
            <TextField
              label={labelField}
              value={entry.label}
              onChange={(event) => onChange(entry.id, { label: event.target.value })}
              sx={fieldSx}
              fullWidth
            />
            <TextField
              label="Findings"
              value={entry.findings}
              onChange={(event) => onChange(entry.id, { findings: event.target.value })}
              sx={fieldSx}
              fullWidth
              multiline
              minRows={1}
            />
          </EntryCard>
        ))}
        <Button
          onClick={onAdd}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Entry
        </Button>
      </Stack>
    </CollapsibleSubsection>
  );
}
```

Add this `SpecialSectionList` wrapper in `negative-credit-report-card.tsx` itself (it's specific to `NegativeReportEntry`'s `{label, findings}` shape, so it stays local, not in admin-ui). Update every JSX call site in the file from `<SpecialSection listKey="accountFindings" .../>` to `<SpecialSectionList .../>` (drop the now-unused `listKey` prop — it was only needed for the `data-listkey` attribute, which nothing reads; confirm via grep before dropping).

```bash
grep -rn "data-listkey" src/
```

If no results, it's safe to drop.

- [ ] **Step 5: Verify no other file imports the old inline `SpecialSection`/`EntryCard`**

```bash
grep -rn "SpecialSection\b" src/ --include="*.tsx" --include="*.ts"
```

Confirm only `negative-credit-report-card.tsx` referenced it (as `SpecialSectionList` now) and no other file broke.

- [ ] **Step 6: Manual verification**

Run the dev server, open Initial Credit Checking, trigger a negative bureau finding (or navigate directly to an application already in that state), open `NegativeCreditReportCard`, and confirm: each of the 4 special-finding sections (Account Findings, Cancelled Credit Cards, Adverse Classified Loans, Closed Current Accounts) still collapses/expands, shows the correct "N added"/"None added" badge, Add Entry still adds a row, Remove still removes it, and typing in Label/Findings still persists (check via page reload that `localStorage` retained the edit).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin-ui/collapsible-subsection.tsx src/components/admin-ui/index.ts src/sections/admin/negative-credit-report-card.tsx
git commit -m "Extract CollapsibleSubsection/EntryCard into shared admin-ui"
```

---

### Task 2: Rebuild `CiReport` data model in `admin-context.tsx`

**Files:**
- Modify: `src/auth/admin-context.tsx`
  - Type block: replace lines 542-559 (`CiReport`) and add new types just above it.
  - `CreditInvestigation` type: lines 561-581 (add `additionalDocuments`).
  - `AdminContextValue` type: lines 622-661 (add new action signatures, remove none — `setCiReport` signature is unchanged).
  - Initial-state factories: lines 727-761 (`createInitialCiReport`, `createInitialCreditInvestigation`).
  - Reducer implementations: around lines 1312-1381 (`setCiReport`, plus new actions).

**Interfaces:**
- Produces (for Task 3+ to consume):
  - Types: `CiChildEntry`, `CiIncomeSourceEntry`, `CiTradeEntry`, `CiBankAccountEntry`, `CiTradeListKey`, `CiComaker`, rebuilt `CiReport`, `CreditInvestigation.additionalDocuments: CreditInvestigationDoc[]`.
  - Actions on `useAdmin()`: `setCiReport(data: Partial<CiReport>)` (unchanged signature), `addCiChild()`, `updateCiChild(id: string, data: Partial<CiChildEntry>)`, `removeCiChild(id: string)`, `addCiIncomeSource()`, `updateCiIncomeSource(id: string, data: Partial<CiIncomeSourceEntry>)`, `removeCiIncomeSource(id: string)`, `addCiTradeEntry(listKey: CiTradeListKey)`, `updateCiTradeEntry(listKey: CiTradeListKey, id: string, data: Partial<CiTradeEntry>)`, `removeCiTradeEntry(listKey: CiTradeListKey, id: string)`, `addCiBankAccount()`, `updateCiBankAccount(id: string, data: Partial<CiBankAccountEntry>)`, `removeCiBankAccount(id: string)`, `setCiComaker(data: Partial<CiComaker>)`, `addCiAdditionalDocument(label: string, uploadedBy: string)`, `removeCiAdditionalDocument(key: string)`.

- [ ] **Step 1: Replace the `CiReport` type and add new types**

In `src/auth/admin-context.tsx`, replace lines 542-559:

```ts
export type CiChildEntry = {
  id: string;
  name: string;
  age: string;
  notes: string;
};

export type CiIncomeSourceEntry = {
  id: string;
  source: string;
  monthlyAmount: string;
  notes: string;
};

export type CiTradeEntry = {
  id: string;
  name: string;
  relationshipLength: string;
  findings: string;
};

export type CiBankAccountEntry = {
  id: string;
  bankName: string;
  accountType: string;
  accountStanding: MembershipStanding | '';
  remarks: string;
};

export type CiTradeListKey = 'tradeSuppliers' | 'tradeCustomers';

export type CiComaker = {
  onFile: boolean;
  name: string;
  relationship: string;
  address: string;
  notes: string;
};

export type CiReport = {
  dateInspected: string;
  subjectAsOf: string;

  children: CiChildEntry[];

  residencePermanentLeasedType: string;
  residencePermanentLengthOfStay: string;
  residencePermanentLandmark: string;
  residencePermanentRemarks: string;
  residencePresentAddress: string;
  residencePresentLeasedType: string;
  residencePresentLengthOfStay: string;
  residencePresentLandmark: string;
  residencePresentRemarks: string;

  employmentType: string;
  employerName: string;
  position: string;
  employerAddress: string;
  employerTelNo: string;
  employerEmail: string;
  salary: string;
  annualIncome: string;
  lengthOfService: string;
  noRegularEmployees: string;
  noContractualEmployees: string;
  unionized: 'yes' | 'no' | '';
  secDtiRegDate: string;
  secDtiExpDate: string;
  employmentRemarks: string;

  tradeSuppliers: CiTradeEntry[];
  tradeCustomers: CiTradeEntry[];

  assets: string;

  otherIncomeSources: CiIncomeSourceEntry[];

  bankAccounts: CiBankAccountEntry[];

  negativeRecordRemarks: string;

  comaker: CiComaker;

  healthAndHabits: string;

  comments: string;

  recommendation: PreliminaryRecommendation | '';
  recommendationNotes: string;

  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};
```

- [ ] **Step 2: Add `additionalDocuments` to `CreditInvestigation`**

At line 561-581, add one field after `documents`:

```ts
export type CreditInvestigation = {
  documents: CreditInvestigationDoc[];
  // Ad-hoc documents attached directly within the CI Report's "Additional
  // Documents" section — separate from `documents` above (the read-only
  // Document Checklist list carried over from Requirement Checklist).
  additionalDocuments: CreditInvestigationDoc[];
  outreachMessages: OutreachMessage[];
  ciFeeStatus: CiFeeStatus;
  ciFeeAmount: string;
  ciFeeAmountDescription: string;
  ciFeeRemarks: string;
  ciFeeDeclineReason: string;
  report: CiReport;
  decision: CreditCheckDecision;
  decisionReason: string;
  returnedToAmd: boolean;
  returnToAmdReason: string;
};
```

- [ ] **Step 3: Add new action signatures to `AdminContextValue`**

After line 655 (`removeCreditInvestigationDocument: (key: string) => void;`), add:

```ts
  addCiChild: () => void;
  updateCiChild: (id: string, data: Partial<CiChildEntry>) => void;
  removeCiChild: (id: string) => void;
  addCiIncomeSource: () => void;
  updateCiIncomeSource: (id: string, data: Partial<CiIncomeSourceEntry>) => void;
  removeCiIncomeSource: (id: string) => void;
  addCiTradeEntry: (listKey: CiTradeListKey) => void;
  updateCiTradeEntry: (listKey: CiTradeListKey, id: string, data: Partial<CiTradeEntry>) => void;
  removeCiTradeEntry: (listKey: CiTradeListKey, id: string) => void;
  addCiBankAccount: () => void;
  updateCiBankAccount: (id: string, data: Partial<CiBankAccountEntry>) => void;
  removeCiBankAccount: (id: string) => void;
  setCiComaker: (data: Partial<CiComaker>) => void;
  addCiAdditionalDocument: (label: string, uploadedBy: string) => void;
  removeCiAdditionalDocument: (key: string) => void;
```

- [ ] **Step 4: Rewrite `createInitialCiReport()` and `createInitialCreditInvestigation()`**

Replace lines 727-744 (`createInitialCiReport`):

```ts
function createInitialCiReport(): CiReport {
  return {
    dateInspected: '',
    subjectAsOf: '',
    children: [],
    residencePermanentLeasedType: '',
    residencePermanentLengthOfStay: '',
    residencePermanentLandmark: '',
    residencePermanentRemarks: '',
    residencePresentAddress: '',
    residencePresentLeasedType: '',
    residencePresentLengthOfStay: '',
    residencePresentLandmark: '',
    residencePresentRemarks: '',
    employmentType: '',
    employerName: '',
    position: '',
    employerAddress: '',
    employerTelNo: '',
    employerEmail: '',
    salary: '',
    annualIncome: '',
    lengthOfService: '',
    noRegularEmployees: '',
    noContractualEmployees: '',
    unionized: '',
    secDtiRegDate: '',
    secDtiExpDate: '',
    employmentRemarks: '',
    tradeSuppliers: [],
    tradeCustomers: [],
    assets: '',
    otherIncomeSources: [],
    bankAccounts: [],
    negativeRecordRemarks: '',
    comaker: { onFile: false, name: '', relationship: '', address: '', notes: '' },
    healthAndHabits: '',
    comments: '',
    recommendation: '',
    recommendationNotes: '',
    transcriptFileName: null,
    transcriptUploadedAt: null,
  };
}
```

Update `createInitialCreditInvestigation()` (originally lines 746-761) to add `additionalDocuments: []` after `documents: createInitialCreditInvestigationDocuments(),`:

```ts
function createInitialCreditInvestigation(): CreditInvestigation {
  return {
    documents: createInitialCreditInvestigationDocuments(),
    additionalDocuments: [],
    outreachMessages: [],
    ciFeeStatus: 'not-requested',
    ciFeeAmount: '',
    ciFeeAmountDescription: '',
    ciFeeRemarks: '',
    ciFeeDeclineReason: '',
    report: createInitialCiReport(),
    decision: 'pending',
    decisionReason: '',
    returnedToAmd: false,
    returnToAmdReason: '',
  };
}
```

(Verify the closing of this function — the original had a `};` at the line after 761; keep whatever trailing structure already existed, just insert the new field.)

- [ ] **Step 5: Add reducer implementations**

In the provider's action object, immediately after the existing `removeCreditInvestigationDocument: (key) => ...` block (originally ending around line 1367), insert:

```ts
      addCiChild: () =>
        setState((prev) => {
          const newEntry: CiChildEntry = { id: crypto.randomUUID(), name: '', age: '', notes: '' };
          return {
            ...prev,
            review: {
              ...prev.review,
              creditInvestigation: {
                ...prev.review.creditInvestigation,
                report: {
                  ...prev.review.creditInvestigation.report,
                  children: [...prev.review.creditInvestigation.report.children, newEntry],
                },
              },
            },
          };
        }),
      updateCiChild: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                children: prev.review.creditInvestigation.report.children.map((entry) =>
                  entry.id === id ? { ...entry, ...data } : entry
                ),
              },
            },
          },
        })),
      removeCiChild: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                children: prev.review.creditInvestigation.report.children.filter((entry) => entry.id !== id),
              },
            },
          },
        })),
      addCiIncomeSource: () =>
        setState((prev) => {
          const newEntry: CiIncomeSourceEntry = { id: crypto.randomUUID(), source: '', monthlyAmount: '', notes: '' };
          return {
            ...prev,
            review: {
              ...prev.review,
              creditInvestigation: {
                ...prev.review.creditInvestigation,
                report: {
                  ...prev.review.creditInvestigation.report,
                  otherIncomeSources: [...prev.review.creditInvestigation.report.otherIncomeSources, newEntry],
                },
              },
            },
          };
        }),
      updateCiIncomeSource: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                otherIncomeSources: prev.review.creditInvestigation.report.otherIncomeSources.map((entry) =>
                  entry.id === id ? { ...entry, ...data } : entry
                ),
              },
            },
          },
        })),
      removeCiIncomeSource: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                otherIncomeSources: prev.review.creditInvestigation.report.otherIncomeSources.filter(
                  (entry) => entry.id !== id
                ),
              },
            },
          },
        })),
      addCiTradeEntry: (listKey) =>
        setState((prev) => {
          const newEntry: CiTradeEntry = { id: crypto.randomUUID(), name: '', relationshipLength: '', findings: '' };
          return {
            ...prev,
            review: {
              ...prev.review,
              creditInvestigation: {
                ...prev.review.creditInvestigation,
                report: {
                  ...prev.review.creditInvestigation.report,
                  [listKey]: [...prev.review.creditInvestigation.report[listKey], newEntry],
                },
              },
            },
          };
        }),
      updateCiTradeEntry: (listKey, id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                [listKey]: prev.review.creditInvestigation.report[listKey].map((entry) =>
                  entry.id === id ? { ...entry, ...data } : entry
                ),
              },
            },
          },
        })),
      removeCiTradeEntry: (listKey, id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                [listKey]: prev.review.creditInvestigation.report[listKey].filter((entry) => entry.id !== id),
              },
            },
          },
        })),
      addCiBankAccount: () =>
        setState((prev) => {
          const newEntry: CiBankAccountEntry = {
            id: crypto.randomUUID(),
            bankName: '',
            accountType: '',
            accountStanding: '',
            remarks: '',
          };
          return {
            ...prev,
            review: {
              ...prev.review,
              creditInvestigation: {
                ...prev.review.creditInvestigation,
                report: {
                  ...prev.review.creditInvestigation.report,
                  bankAccounts: [...prev.review.creditInvestigation.report.bankAccounts, newEntry],
                },
              },
            },
          };
        }),
      updateCiBankAccount: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                bankAccounts: prev.review.creditInvestigation.report.bankAccounts.map((entry) =>
                  entry.id === id ? { ...entry, ...data } : entry
                ),
              },
            },
          },
        })),
      removeCiBankAccount: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                bankAccounts: prev.review.creditInvestigation.report.bankAccounts.filter((entry) => entry.id !== id),
              },
            },
          },
        })),
      setCiComaker: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: {
                ...prev.review.creditInvestigation.report,
                comaker: { ...prev.review.creditInvestigation.report.comaker, ...data },
              },
            },
          },
        })),
      addCiAdditionalDocument: (label, uploadedBy) =>
        setState((prev) => {
          const newDoc: CreditInvestigationDoc = {
            key: crypto.randomUUID(),
            status: 'verified',
            aiNote: 'Reviewed, no issues found.',
            fileName: 'sample-local-pdf.pdf',
            fileUrl: '/assets/documents/sample-local-pdf.pdf',
            uploadedAt: new Date().toISOString(),
            uploadedBy,
            remarks: '',
            reviewed: false,
            isCustom: true,
            label,
          };
          return {
            ...prev,
            review: {
              ...prev.review,
              creditInvestigation: {
                ...prev.review.creditInvestigation,
                additionalDocuments: [...prev.review.creditInvestigation.additionalDocuments, newDoc],
              },
            },
          };
        }),
      removeCiAdditionalDocument: (key) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              additionalDocuments: prev.review.creditInvestigation.additionalDocuments.filter(
                (doc) => doc.key !== key
              ),
            },
          },
        })),
```

- [ ] **Step 6: Type-check**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit
```

Expected: errors in `ci-report-card.tsx` and `credit-investigation-transcript.ts` (they still reference the old `CiReport` shape) — that's expected and fixed in Tasks 3/4 below. Confirm `admin-context.tsx` itself has zero errors before proceeding; if it does, fix them now (likely a typo or missed field).

- [ ] **Step 7: Commit**

```bash
git add src/auth/admin-context.tsx
git commit -m "Rebuild CiReport data model with full CI report field set"
```

---

### Task 3: Extend transcript auto-fill for the new field set

**Files:**
- Modify: `src/sections/admin/credit-investigation-transcript.ts` (full rewrite of `CiTranscriptAutoFill` type + `buildTranscriptAutoFill`)

**Interfaces:**
- Consumes: nothing from Task 2 directly (this file has no import from `admin-context.tsx` today and doesn't need one — it just needs to produce a shape `ci-report-card.tsx` can spread into `setCiReport`).
- Produces: `CiTranscriptAutoFill = { dateInspected: string; subjectAsOf: string; assets: string; healthAndHabits: string; comments: string; recommendation: PreliminaryRecommendation restricted union; recommendationNotes: string; aiSummary: string }`, `buildTranscriptAutoFill(seedParts: string[], applicantName: string): CiTranscriptAutoFill` (signature unchanged).

- [ ] **Step 1: Rewrite `credit-investigation-transcript.ts`**

```ts
// ----------------------------------------------------------------------
// Simulates auto-filling the CI Report from an uploaded transcript file
// (standing in for a PLAUD.ai export). There's no real transcription/AI
// service anywhere in this codebase — this is deterministic and hash-based
// (same technique as simulateBureauFinding/getLoanNumber), not
// Math.random(), so the same transcript filename always produces the same
// result and reproduces consistently across reloads during a QA pass.
// Uploading a transcript never reads its actual contents — only its
// filename feeds the seed.
//
// Only covers the free-text/date fields a real site-visit transcript would
// plausibly speak to (dateInspected, subjectAsOf, assets, healthAndHabits,
// comments, recommendation). Fields sourced from elsewhere in the app
// (Spouse, Residence permanent address, Employment status, Loan Purpose)
// and structured list fields (Children, Trade Checking, Other Income, Bank
// Verification, Comaker, Additional Documents, Negative Record) are
// deliberately NOT touched by auto-fill.
// ----------------------------------------------------------------------

export type CiTranscriptAutoFill = {
  dateInspected: string;
  subjectAsOf: string;
  assets: string;
  healthAndHabits: string;
  comments: string;
  recommendation: 'proceed-as-requested' | 'proceed-with-conditions' | 'needs-additional-verification';
  recommendationNotes: string;
  aiSummary: string;
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function buildTranscriptAutoFill(seedParts: string[], applicantName: string): CiTranscriptAutoFill {
  const hash = hashSeed(seedParts.join('|'));
  const isPositive = hash % 2 === 0;
  const today = new Date().toISOString().slice(0, 10);

  if (isPositive) {
    return {
      dateInspected: today,
      subjectAsOf: today,
      assets: `${applicantName} declared ownership of a residential property and one motor vehicle, both free of existing liens per the site visit.`,
      healthAndHabits: `No health concerns raised during the visit. ${applicantName} reported no habitual vices affecting financial obligations.`,
      comments: `Site visit confirmed ${applicantName}'s identity and residence as declared. No inconsistencies were found between the transcript and the application details on file.`,
      recommendation: 'proceed-as-requested',
      recommendationNotes: 'Findings support proceeding with the loan as requested.',
      aiSummary: `Transcript reviewed for ${applicantName}. Identity and residence were confirmed on-site, and neighborhood feedback was positive. No red flags detected.`,
    };
  }

  return {
    dateInspected: today,
    subjectAsOf: today,
    assets: `Asset ownership for ${applicantName} could not be fully corroborated during the site visit — recommend requesting supporting documents.`,
    healthAndHabits: `No major concerns noted, though the officer recommends a follow-up conversation to confirm details raised during the visit.`,
    comments: `Site visit for ${applicantName} raised some items that need further verification before a final assessment can be made.`,
    recommendation: 'needs-additional-verification',
    recommendationNotes: 'Recommend a follow-up visit or additional supporting documents before proceeding.',
    aiSummary: `Transcript reviewed for ${applicantName}. Some details from the site visit could not be fully corroborated — additional verification is recommended before proceeding.`,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/admin/credit-investigation-transcript.ts
git commit -m "Extend transcript auto-fill for the rebuilt CI Report field set"
```

(Type errors in `ci-report-card.tsx` referencing the old auto-fill shape are expected until Task 8 rewrites that file — do not fix them here.)

---

### Task 4: Read-only section components (Spouse, Residence header, Employment header, Loan Purpose, Negative Record summary)

**Files:**
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-section-shared.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-spouse-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-loan-purpose-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-negative-record-section.tsx`

**Interfaces:**
- Produces: `ReadOnlyField({ label, value }: { label: string; value: React.ReactNode })`, `ReadOnlySourceCaption({ children }: { children: React.ReactNode })` (from `ci-report-section-shared.tsx`); `CiReportSpouseSection()`, `CiReportLoanPurposeSection()`, `CiReportNegativeRecordSection({ remarks, onRemarksChange }: { remarks: string; onRemarksChange: (value: string) => void })`.
- Consumes: `useAdmin()` (for `review.negativeCreditReport`), `useRegistration()` (`application.personalInfo`/`financialInfo` — note `application` is a top-level value from `useRegistration()`, not nested under `signUpData`), `CollapsibleSubsection` from `src/components/admin-ui`, `paths` from `src/routes/paths` (for the Negative Credit Report link).

- [ ] **Step 1: Create the shared read-only field helpers**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-section-shared.tsx
'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------
// Shared read-only label/value row + "sourced from" caption used by every
// CI Report section that displays data pulled from elsewhere in the app
// (Spouse, Residence permanent address, Employment status, Loan Purpose,
// Negative Record) instead of asking the officer to re-enter it. Matches
// ApplicationDetailsCard's DetailField styling exactly.
// ----------------------------------------------------------------------

export const ciFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
} as const;

export function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack spacing={0.4} sx={{ minWidth: 120 }}>
      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}

export function ReadOnlySourceCaption({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', fontStyle: 'italic' }}>{children}</Typography>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}
    >
      {children}
    </Typography>
  );
}
```

- [ ] **Step 2: Create the Spouse section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-spouse-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useRegistration } from 'src/auth/registration-context';

import { CollapsibleSubsection } from 'src/components/admin-ui';

import { ReadOnlyField, ReadOnlySourceCaption } from './ci-report-section-shared';

export function CiReportSpouseSection() {
  const { application } = useRegistration();
  const personalInfo = application?.personalInfo ?? null;
  const isMarried = personalInfo?.civilStatus === 'Married';

  const spouseName = isMarried
    ? [personalInfo?.spouseFirstName, personalInfo?.spouseMiddleName, personalInfo?.spouseLastName, personalInfo?.spouseExtensionName]
        .filter(Boolean)
        .join(' ')
    : '';

  const spouseAddress = isMarried
    ? [personalInfo?.spouseAddress, personalInfo?.spouseBarangay, personalInfo?.spouseCity, personalInfo?.spouseProvince, personalInfo?.spouseZipCode]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <CollapsibleSubsection
      title="Spouse"
      description="Sourced from the borrower's application — not editable here."
      badgeTone={isMarried ? 'info' : 'neutral'}
      badgeLabel={isMarried ? 'On file' : 'None on file'}
    >
      {isMarried ? (
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ReadOnlyField label="Name" value={spouseName} />
            <ReadOnlyField label="Birthday" value={personalInfo?.spouseBirthday} />
          </Stack>
          <ReadOnlyField label="Address" value={spouseAddress} />
          <ReadOnlySourceCaption>Sourced from application — Personal Information.</ReadOnlySourceCaption>
        </Stack>
      ) : (
        <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
          No spouse on file — the applicant's civil status is not "Married."
        </Typography>
      )}
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 3: Create the Loan Purpose section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-loan-purpose-section.tsx
'use client';

import Box from '@mui/material/Box';

import { useRegistration } from 'src/auth/registration-context';

import { ReadOnlyField, ReadOnlySourceCaption } from './ci-report-section-shared';

export function CiReportLoanPurposeSection() {
  const { application } = useRegistration();
  const loanPurpose = application?.financialInfo?.loanPurpose ?? '';

  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
      <ReadOnlyField label="Loan Purpose" value={loanPurpose} />
      <Box sx={{ mt: 0.75 }}>
        <ReadOnlySourceCaption>Sourced from application — Financial Information.</ReadOnlySourceCaption>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Create the Negative Record section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-negative-record-section.tsx
'use client';

import Link from 'next/link';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { CollapsibleSubsection, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { paths } from 'src/routes/paths';

import { ciFieldSx, ReadOnlySourceCaption } from './ci-report-section-shared';

const LIST_LABELS = {
  accountFindings: 'Account findings',
  cancelledCreditCards: 'Cancelled credit cards',
  adverseClassifiedLoans: 'Adverse classified loans',
  closedCurrentAccounts: 'Closed current accounts',
} as const;

export function CiReportNegativeRecordSection({
  remarks,
  onRemarksChange,
}: {
  remarks: string;
  onRemarksChange: (value: string) => void;
}) {
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { negativeCreditReport, creditChecking } = review;
  const hasNegativeFinding = creditChecking.bureauFindingStatus === 'negative';

  const totalEntries = (
    ['accountFindings', 'cancelledCreditCards', 'adverseClassifiedLoans', 'closedCurrentAccounts'] as const
  ).reduce((sum, key) => sum + negativeCreditReport[key].length, 0);

  return (
    <CollapsibleSubsection
      title="Negative Record"
      description="Sourced from the Negative Credit Report — not editable here."
      badgeTone={hasNegativeFinding ? 'warning' : 'success'}
      badgeLabel={hasNegativeFinding ? `${totalEntries} finding${totalEntries === 1 ? '' : 's'}` : 'No negative findings'}
    >
      <Stack spacing={2}>
        {hasNegativeFinding ? (
          <>
            <Stack spacing={0.75}>
              {(['accountFindings', 'cancelledCreditCards', 'adverseClassifiedLoans', 'closedCurrentAccounts'] as const).map(
                (key) => (
                  <Typography key={key} sx={{ fontSize: 13, color: '#3B4256' }}>
                    {LIST_LABELS[key]}: {negativeCreditReport[key].length}
                  </Typography>
                )
              )}
            </Stack>
            <Button
              component={Link}
              href={signUpData ? paths.admin.creditChecking(encodeURIComponent(signUpData.email)) : '#'}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:document-text-bold-duotone" width={16} />}
              sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
            >
              View full Negative Credit Report
            </Button>
          </>
        ) : (
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            No negative findings on record from Initial Credit Checking.
          </Typography>
        )}
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Remarks"
          value={remarks}
          onChange={(event) => onRemarksChange(event.target.value)}
          sx={ciFieldSx}
        />
        <ReadOnlySourceCaption>Findings above are sourced from Initial Credit Checking.</ReadOnlySourceCaption>
      </Stack>
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 5: Type-check the new files in isolation**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit
```

Confirm no new errors originate from the 4 files created in this task (errors from `ci-report-card.tsx` itself are still expected/ignored until Task 8).

- [ ] **Step 6: Commit**

```bash
git add src/sections/admin/credit-investigation/ci-report-sections/ci-report-section-shared.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-spouse-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-loan-purpose-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-negative-record-section.tsx
git commit -m "Add CI Report read-only sections: Spouse, Loan Purpose, Negative Record"
```

---

### Task 5: List-based section components (Children, Trade Checking, Other Income, Bank Verification)

**Files:**
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-children-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-trade-checking-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-other-income-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-bank-verification-section.tsx`

**Interfaces:**
- Consumes: `useAdmin()` actions from Task 2 (`addCiChild`/`updateCiChild`/`removeCiChild`, `addCiIncomeSource`/`updateCiIncomeSource`/`removeCiIncomeSource`, `addCiTradeEntry`/`updateCiTradeEntry`/`removeCiTradeEntry`, `addCiBankAccount`/`updateCiBankAccount`/`removeCiBankAccount`); `review.creditInvestigation.report.{children,otherIncomeSources,tradeSuppliers,tradeCustomers,bankAccounts}`; `CollapsibleSubsection`/`EntryCard` from Task 1.
- Produces: `CiReportChildrenSection()`, `CiReportTradeCheckingSection()`, `CiReportOtherIncomeSection()`, `CiReportBankVerificationSection()` — each a zero-prop component reading/writing directly via `useAdmin()` (matching `NegativeCreditReportCard`'s pattern of reading context directly rather than prop-drilling).

- [ ] **Step 1: Create the Children section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-children-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { CollapsibleSubsection, EntryCard, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { ciFieldSx } from './ci-report-section-shared';

export function CiReportChildrenSection() {
  const { review, addCiChild, updateCiChild, removeCiChild } = useAdmin();
  const { children } = review.creditInvestigation.report;
  const hasEntries = children.length > 0;

  return (
    <CollapsibleSubsection
      title="Children"
      description="Names and ages of the applicant's children, if any."
      badgeTone={hasEntries ? 'info' : 'neutral'}
      badgeLabel={hasEntries ? `${children.length} added` : 'None added'}
    >
      <Stack spacing={1.5}>
        {children.map((entry, index) => (
          <EntryCard key={entry.id} index={index} onRemove={() => removeCiChild(entry.id)}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                label="Name"
                value={entry.name}
                onChange={(event) => updateCiChild(entry.id, { name: event.target.value })}
                sx={ciFieldSx}
              />
              <TextField
                label="Age"
                value={entry.age}
                onChange={(event) => updateCiChild(entry.id, { age: event.target.value })}
                sx={{ ...ciFieldSx, width: { xs: '100%', sm: 120 } }}
              />
            </Stack>
            <TextField
              fullWidth
              label="Notes"
              value={entry.notes}
              onChange={(event) => updateCiChild(entry.id, { notes: event.target.value })}
              sx={ciFieldSx}
            />
          </EntryCard>
        ))}
        <Button
          onClick={addCiChild}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Child
        </Button>
      </Stack>
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 2: Create the Trade Checking section (two lists: Suppliers, Customers)**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-trade-checking-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { CiTradeListKey } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { CollapsibleSubsection, EntryCard, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { ciFieldSx } from './ci-report-section-shared';

function TradeList({ listKey, label, addLabel }: { listKey: CiTradeListKey; label: string; addLabel: string }) {
  const { review, addCiTradeEntry, updateCiTradeEntry, removeCiTradeEntry } = useAdmin();
  const entries = review.creditInvestigation.report[listKey];

  return (
    <Stack spacing={1.25} sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>{label}</Typography>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <EntryCard key={entry.id} index={index} onRemove={() => removeCiTradeEntry(listKey, entry.id)}>
            <TextField
              fullWidth
              label="Name"
              value={entry.name}
              onChange={(event) => updateCiTradeEntry(listKey, entry.id, { name: event.target.value })}
              sx={ciFieldSx}
            />
            <TextField
              fullWidth
              label="Length of relationship"
              value={entry.relationshipLength}
              onChange={(event) => updateCiTradeEntry(listKey, entry.id, { relationshipLength: event.target.value })}
              sx={ciFieldSx}
            />
            <TextField
              fullWidth
              multiline
              minRows={1}
              label="Findings"
              value={entry.findings}
              onChange={(event) => updateCiTradeEntry(listKey, entry.id, { findings: event.target.value })}
              sx={ciFieldSx}
            />
          </EntryCard>
        ))}
        <Button
          onClick={() => addCiTradeEntry(listKey)}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          {addLabel}
        </Button>
      </Stack>
    </Stack>
  );
}

export function CiReportTradeCheckingSection() {
  const { review } = useAdmin();
  const { tradeSuppliers, tradeCustomers } = review.creditInvestigation.report;
  const total = tradeSuppliers.length + tradeCustomers.length;

  return (
    <CollapsibleSubsection
      title="Trade Checking"
      description="Suppliers and customers contacted to verify the applicant's trade standing."
      badgeTone={total > 0 ? 'info' : 'neutral'}
      badgeLabel={total > 0 ? `${total} added` : 'None added'}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <TradeList listKey="tradeSuppliers" label="Suppliers" addLabel="Add Supplier" />
        <TradeList listKey="tradeCustomers" label="Customers" addLabel="Add Customer" />
      </Stack>
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 3: Create the Other Source of Income section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-other-income-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { CollapsibleSubsection, EntryCard, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { ciFieldSx } from './ci-report-section-shared';

export function CiReportOtherIncomeSection() {
  const { review, addCiIncomeSource, updateCiIncomeSource, removeCiIncomeSource } = useAdmin();
  const { otherIncomeSources } = review.creditInvestigation.report;
  const hasEntries = otherIncomeSources.length > 0;

  return (
    <CollapsibleSubsection
      title="Other Source of Income"
      description="Any additional income sources beyond the applicant's primary employment or business."
      badgeTone={hasEntries ? 'info' : 'neutral'}
      badgeLabel={hasEntries ? `${otherIncomeSources.length} added` : 'None added'}
    >
      <Stack spacing={1.5}>
        {otherIncomeSources.map((entry, index) => (
          <EntryCard key={entry.id} index={index} onRemove={() => removeCiIncomeSource(entry.id)}>
            <TextField
              fullWidth
              label="Source"
              value={entry.source}
              onChange={(event) => updateCiIncomeSource(entry.id, { source: event.target.value })}
              sx={ciFieldSx}
            />
            <TextField
              fullWidth
              label="Monthly amount"
              value={entry.monthlyAmount}
              onChange={(event) => updateCiIncomeSource(entry.id, { monthlyAmount: event.target.value })}
              sx={ciFieldSx}
            />
            <TextField
              fullWidth
              multiline
              minRows={1}
              label="Notes"
              value={entry.notes}
              onChange={(event) => updateCiIncomeSource(entry.id, { notes: event.target.value })}
              sx={ciFieldSx}
            />
          </EntryCard>
        ))}
        <Button
          onClick={addCiIncomeSource}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Source
        </Button>
      </Stack>
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 4: Create the Bank Verification section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-bank-verification-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { CollapsibleSubsection, EntryCard, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { ciFieldSx } from './ci-report-section-shared';

export function CiReportBankVerificationSection() {
  const { review, addCiBankAccount, updateCiBankAccount, removeCiBankAccount } = useAdmin();
  const { bankAccounts } = review.creditInvestigation.report;
  const hasEntries = bankAccounts.length > 0;

  return (
    <CollapsibleSubsection
      title="Bank Verification"
      description="Bank accounts verified as part of the investigation."
      badgeTone={hasEntries ? 'info' : 'neutral'}
      badgeLabel={hasEntries ? `${bankAccounts.length} added` : 'None added'}
    >
      <Stack spacing={1.5}>
        {bankAccounts.map((entry, index) => (
          <EntryCard key={entry.id} index={index} onRemove={() => removeCiBankAccount(entry.id)}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                label="Bank name"
                value={entry.bankName}
                onChange={(event) => updateCiBankAccount(entry.id, { bankName: event.target.value })}
                sx={ciFieldSx}
              />
              <TextField
                fullWidth
                label="Account type"
                value={entry.accountType}
                onChange={(event) => updateCiBankAccount(entry.id, { accountType: event.target.value })}
                sx={ciFieldSx}
              />
            </Stack>
            <TextField
              fullWidth
              select
              label="Standing"
              value={entry.accountStanding}
              onChange={(event) =>
                updateCiBankAccount(entry.id, { accountStanding: event.target.value as typeof entry.accountStanding })
              }
              sx={ciFieldSx}
            >
              <MenuItem value="good-standing">Good standing</MenuItem>
              <MenuItem value="with-concern">With concern</MenuItem>
              <MenuItem value="not-verified">Not verified</MenuItem>
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={1}
              label="Remarks"
              value={entry.remarks}
              onChange={(event) => updateCiBankAccount(entry.id, { remarks: event.target.value })}
              sx={ciFieldSx}
            />
          </EntryCard>
        ))}
        <Button
          onClick={addCiBankAccount}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Bank Account
        </Button>
      </Stack>
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit
```

Confirm no new errors from these 4 files.

- [ ] **Step 6: Commit**

```bash
git add src/sections/admin/credit-investigation/ci-report-sections/ci-report-children-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-trade-checking-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-other-income-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-bank-verification-section.tsx
git commit -m "Add CI Report list-based sections: Children, Trade Checking, Other Income, Bank Verification"
```

---

### Task 6: Structured-field and free-text section components (Residence, Employment, Assets, Comaker, Health & Habits, Comments)

**Files:**
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-residence-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-employment-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-assets-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-comaker-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-health-habits-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-comments-section.tsx`
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-inspection-section.tsx`

**Interfaces:**
- Consumes: `useAdmin()` (`review.creditInvestigation.report`, `setCiReport`, `setCiComaker`), `useRegistration()` (for Residence's permanent address and Employment's `employmentStatus`), `CollapsibleSubsection` from Task 1, `ReadOnlyField`/`ciFieldSx`/`SectionLabel` from Task 4.
- Produces: `CiReportResidenceSection()`, `CiReportEmploymentSection()`, `CiReportAssetsSection()`, `CiReportComakerSection()`, `CiReportHealthHabitsSection()`, `CiReportCommentsSection()`, `CiReportInspectionSection()` — all zero-prop, reading/writing via `useAdmin()` directly.

- [ ] **Step 1: Create the Inspection section (Date Inspected / Subject As Of — not collapsible)**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-inspection-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { useAdmin } from 'src/auth/admin-context';

import { ciFieldSx } from './ci-report-section-shared';

export function CiReportInspectionSection() {
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <TextField
        fullWidth
        label="Date inspected"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={report.dateInspected}
        onChange={(event) => setCiReport({ dateInspected: event.target.value })}
        sx={ciFieldSx}
      />
      <TextField
        fullWidth
        label="Subject as of"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={report.subjectAsOf}
        onChange={(event) => setCiReport({ subjectAsOf: event.target.value })}
        sx={ciFieldSx}
      />
    </Stack>
  );
}
```

- [ ] **Step 2: Create the Residence/Neighborhood section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-residence-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { CollapsibleSubsection } from 'src/components/admin-ui';

import { ciFieldSx, ReadOnlyField, ReadOnlySourceCaption } from './ci-report-section-shared';

export function CiReportResidenceSection() {
  const { application } = useRegistration();
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;
  const personalInfo = application?.personalInfo ?? null;

  const permanentAddress = [personalInfo?.address, personalInfo?.barangay, personalInfo?.city, personalInfo?.province, personalInfo?.zipCode]
    .filter(Boolean)
    .join(', ');

  const filled = [
    report.residencePermanentLeasedType,
    report.residencePermanentLengthOfStay,
    report.residencePresentAddress,
    report.residencePresentLeasedType,
    report.residencePresentLengthOfStay,
  ].some((value) => value.trim() !== '');

  return (
    <CollapsibleSubsection
      title="Residence/Neighborhood"
      description="Permanent and present address details verified during the site visit."
      badgeTone={filled ? 'info' : 'neutral'}
      badgeLabel={filled ? 'Filled' : 'Empty'}
    >
      <Stack spacing={2.5}>
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>Permanent Address</Typography>
          <ReadOnlyField label="Address" value={permanentAddress} />
          <ReadOnlySourceCaption>Sourced from application — Personal Information.</ReadOnlySourceCaption>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Leased type"
              value={report.residencePermanentLeasedType}
              onChange={(event) => setCiReport({ residencePermanentLeasedType: event.target.value })}
              sx={ciFieldSx}
            />
            <TextField
              fullWidth
              label="Length of stay"
              value={report.residencePermanentLengthOfStay}
              onChange={(event) => setCiReport({ residencePermanentLengthOfStay: event.target.value })}
              sx={ciFieldSx}
            />
          </Stack>
          <TextField
            fullWidth
            label="Landmark"
            value={report.residencePermanentLandmark}
            onChange={(event) => setCiReport({ residencePermanentLandmark: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            multiline
            minRows={1}
            label="Remarks"
            value={report.residencePermanentRemarks}
            onChange={(event) => setCiReport({ residencePermanentRemarks: event.target.value })}
            sx={ciFieldSx}
          />
        </Stack>

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>Present Address</Typography>
          <TextField
            fullWidth
            label="Present address"
            value={report.residencePresentAddress}
            onChange={(event) => setCiReport({ residencePresentAddress: event.target.value })}
            sx={ciFieldSx}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Leased type"
              value={report.residencePresentLeasedType}
              onChange={(event) => setCiReport({ residencePresentLeasedType: event.target.value })}
              sx={ciFieldSx}
            />
            <TextField
              fullWidth
              label="Length of stay"
              value={report.residencePresentLengthOfStay}
              onChange={(event) => setCiReport({ residencePresentLengthOfStay: event.target.value })}
              sx={ciFieldSx}
            />
          </Stack>
          <TextField
            fullWidth
            label="Landmark"
            value={report.residencePresentLandmark}
            onChange={(event) => setCiReport({ residencePresentLandmark: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            multiline
            minRows={1}
            label="Remarks"
            value={report.residencePresentRemarks}
            onChange={(event) => setCiReport({ residencePresentRemarks: event.target.value })}
            sx={ciFieldSx}
          />
        </Stack>
      </Stack>
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 3: Create the Employment section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-employment-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { CollapsibleSubsection } from 'src/components/admin-ui';

import { ciFieldSx, ReadOnlyField, ReadOnlySourceCaption } from './ci-report-section-shared';

export function CiReportEmploymentSection() {
  const { application } = useRegistration();
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;
  const employmentStatus = application?.financialInfo?.employmentStatus ?? '';

  const filled = [report.employerName, report.position, report.salary, report.annualIncome].some(
    (value) => value.trim() !== ''
  );

  return (
    <CollapsibleSubsection
      title="Employment"
      description="Employer and income details verified during the site visit."
      badgeTone={filled ? 'info' : 'neutral'}
      badgeLabel={filled ? 'Filled' : 'Empty'}
    >
      <Stack spacing={1.5}>
        <ReadOnlyField label="Employment status" value={employmentStatus} />
        <ReadOnlySourceCaption>Sourced from application — Financial Information.</ReadOnlySourceCaption>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Employment type"
            placeholder="e.g. Direct, Self-Employed"
            value={report.employmentType}
            onChange={(event) => setCiReport({ employmentType: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            label="Position"
            value={report.position}
            onChange={(event) => setCiReport({ position: event.target.value })}
            sx={ciFieldSx}
          />
        </Stack>
        <TextField
          fullWidth
          label="Employer name"
          value={report.employerName}
          onChange={(event) => setCiReport({ employerName: event.target.value })}
          sx={ciFieldSx}
        />
        <TextField
          fullWidth
          label="Employer address"
          value={report.employerAddress}
          onChange={(event) => setCiReport({ employerAddress: event.target.value })}
          sx={ciFieldSx}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Employer tel. no."
            value={report.employerTelNo}
            onChange={(event) => setCiReport({ employerTelNo: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            label="Employer email"
            value={report.employerEmail}
            onChange={(event) => setCiReport({ employerEmail: event.target.value })}
            sx={ciFieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Salary"
            value={report.salary}
            onChange={(event) => setCiReport({ salary: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            label="Annual income"
            value={report.annualIncome}
            onChange={(event) => setCiReport({ annualIncome: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            label="Length of service"
            value={report.lengthOfService}
            onChange={(event) => setCiReport({ lengthOfService: event.target.value })}
            sx={ciFieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="No. regular employees"
            value={report.noRegularEmployees}
            onChange={(event) => setCiReport({ noRegularEmployees: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            label="No. contractual employees"
            value={report.noContractualEmployees}
            onChange={(event) => setCiReport({ noContractualEmployees: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            select
            label="Unionized?"
            value={report.unionized}
            onChange={(event) => setCiReport({ unionized: event.target.value as typeof report.unionized })}
            sx={ciFieldSx}
          >
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="SEC/DTI reg. date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={report.secDtiRegDate}
            onChange={(event) => setCiReport({ secDtiRegDate: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            label="SEC/DTI exp. date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={report.secDtiExpDate}
            onChange={(event) => setCiReport({ secDtiExpDate: event.target.value })}
            sx={ciFieldSx}
          />
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Remarks"
          value={report.employmentRemarks}
          onChange={(event) => setCiReport({ employmentRemarks: event.target.value })}
          sx={ciFieldSx}
        />
      </Stack>
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 4: Create the Assets section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-assets-section.tsx
'use client';

import TextField from '@mui/material/TextField';

import { useAdmin } from 'src/auth/admin-context';

import { CollapsibleSubsection } from 'src/components/admin-ui';

import { ciFieldSx } from './ci-report-section-shared';

export function CiReportAssetsSection() {
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;
  const filled = report.assets.trim() !== '';

  return (
    <CollapsibleSubsection
      title="Assets"
      description="Assets declared or observed during the site visit."
      badgeTone={filled ? 'info' : 'neutral'}
      badgeLabel={filled ? 'Filled' : 'Empty'}
    >
      <TextField
        fullWidth
        multiline
        minRows={3}
        value={report.assets}
        onChange={(event) => setCiReport({ assets: event.target.value })}
        sx={ciFieldSx}
      />
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 5: Create the Comaker section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-comaker-section.tsx
'use client';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { CollapsibleSubsection } from 'src/components/admin-ui';

import { ciFieldSx } from './ci-report-section-shared';

export function CiReportComakerSection() {
  const { review, setCiComaker } = useAdmin();
  const { comaker } = review.creditInvestigation.report;

  return (
    <CollapsibleSubsection
      title="Comaker"
      description="Comaker information, if applicable to this application."
      badgeTone={comaker.onFile ? 'info' : 'neutral'}
      badgeLabel={comaker.onFile ? 'On file' : 'None on file'}
    >
      {comaker.onFile ? (
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="Name"
            value={comaker.name}
            onChange={(event) => setCiComaker({ name: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            label="Relationship to applicant"
            value={comaker.relationship}
            onChange={(event) => setCiComaker({ relationship: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            label="Address"
            value={comaker.address}
            onChange={(event) => setCiComaker({ address: event.target.value })}
            sx={ciFieldSx}
          />
          <TextField
            fullWidth
            multiline
            minRows={1}
            label="Notes"
            value={comaker.notes}
            onChange={(event) => setCiComaker({ notes: event.target.value })}
            sx={ciFieldSx}
          />
          <Button onClick={() => setCiComaker({ onFile: false })} size="small" sx={{ alignSelf: 'flex-start', color: '#5A6273' }}>
            Remove comaker
          </Button>
        </Stack>
      ) : (
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            No data found. Please add comaker information if applicable.
          </Typography>
          <Button onClick={() => setCiComaker({ onFile: true })} variant="outlined" size="small" sx={{ color: '#1C2A6E', borderColor: '#C7CEEA' }}>
            Add Comaker
          </Button>
        </Stack>
      )}
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 6: Create the Health and Habits section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-health-habits-section.tsx
'use client';

import TextField from '@mui/material/TextField';

import { useAdmin } from 'src/auth/admin-context';

import { CollapsibleSubsection } from 'src/components/admin-ui';

import { ciFieldSx } from './ci-report-section-shared';

export function CiReportHealthHabitsSection() {
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;
  const filled = report.healthAndHabits.trim() !== '';

  return (
    <CollapsibleSubsection
      title="Health and Habits"
      description="Observations on the applicant's health and habits relevant to repayment capacity."
      badgeTone={filled ? 'info' : 'neutral'}
      badgeLabel={filled ? 'Filled' : 'Empty'}
    >
      <TextField
        fullWidth
        multiline
        minRows={3}
        value={report.healthAndHabits}
        onChange={(event) => setCiReport({ healthAndHabits: event.target.value })}
        sx={ciFieldSx}
      />
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 7: Create the Comments section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-comments-section.tsx
'use client';

import TextField from '@mui/material/TextField';

import { useAdmin } from 'src/auth/admin-context';

import { CollapsibleSubsection } from 'src/components/admin-ui';

import { ciFieldSx } from './ci-report-section-shared';

export function CiReportCommentsSection() {
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;
  const filled = report.comments.trim() !== '';

  return (
    <CollapsibleSubsection
      title="Comments"
      description="General remarks and closing observations from the investigating officer."
      badgeTone={filled ? 'info' : 'neutral'}
      badgeLabel={filled ? 'Filled' : 'Empty'}
    >
      <TextField
        fullWidth
        multiline
        minRows={3}
        value={report.comments}
        onChange={(event) => setCiReport({ comments: event.target.value })}
        sx={ciFieldSx}
      />
    </CollapsibleSubsection>
  );
}
```

- [ ] **Step 8: Type-check**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit
```

Confirm no new errors from these 7 files.

- [ ] **Step 9: Commit**

```bash
git add src/sections/admin/credit-investigation/ci-report-sections/ci-report-residence-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-employment-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-assets-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-comaker-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-health-habits-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-comments-section.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-inspection-section.tsx
git commit -m "Add CI Report structured/free-text sections: Residence, Employment, Assets, Comaker, Health & Habits, Comments, Inspection"
```

---

### Task 7: Additional Documents section

**Files:**
- Create: `src/sections/admin/credit-investigation/ci-report-sections/ci-report-additional-documents-section.tsx`

**Interfaces:**
- Consumes: `useAdmin()` (`review.creditInvestigation.additionalDocuments`, `addCiAdditionalDocument`, `removeCiAdditionalDocument`, `adminUser`), `RequirementDocRow` from `src/sections/admin/requirement-doc-row.tsx` (reusing its existing upload/remarks/menu UI — pass a stub `onUpload`/`onToggleReviewed` since these documents start pre-verified, matching how the existing Document Checklist's custom-doc rows already behave via `addCreditInvestigationDocument`).
- Produces: `CiReportAdditionalDocumentsSection()`.

- [ ] **Step 1: Create the section**

```tsx
// src/sections/admin/credit-investigation/ci-report-sections/ci-report-additional-documents-section.tsx
'use client';

import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';

import { RequirementDocRow } from '../../requirement-doc-row';

export function CiReportAdditionalDocumentsSection() {
  const { signUpData } = useRegistration();
  const { review, adminUser, addCiAdditionalDocument, removeCiAdditionalDocument } = useAdmin();
  const { additionalDocuments } = review.creditInvestigation;
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState('');

  const officerName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    addCiAdditionalDocument(trimmed, officerName);
    setLabel('');
    setAddOpen(false);
  };

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>Additional Documents</Typography>
      <Stack spacing={1.25}>
        {additionalDocuments.map((doc) => (
          <RequirementDocRow
            key={doc.key}
            meta={{ label: doc.label ?? 'Custom document', required: false, freshStatus: 'verified', freshNote: 'Reviewed, no issues found.' }}
            doc={doc}
            applicantName={applicantName}
            onUpload={() => {}}
            onRemove={() => removeCiAdditionalDocument(doc.key)}
            onToggleReviewed={() => {}}
            onRemarksChange={() => {}}
            hideReviewedCheckbox
          />
        ))}
      </Stack>
      {addOpen ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <TextField
            fullWidth
            size="small"
            autoFocus
            label="Document label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAdd();
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
          <Button onClick={handleAdd} disabled={!label.trim()} variant="contained" sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}>
            Add
          </Button>
          <Button onClick={() => setAddOpen(false)} sx={{ color: '#5A6273' }}>
            Cancel
          </Button>
        </Stack>
      ) : (
        <Button
          onClick={() => setAddOpen(true)}
          variant="outlined"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add document
        </Button>
      )}
    </Stack>
  );
}
```

Note: `onRemarksChange`/`onToggleReviewed` are no-ops here rather than wired to real state mutation — the existing `CreditInvestigationDoc`/`RequirementDoc` shape has `remarks`/`reviewed` fields but this task's scope (per the spec) doesn't require them to be independently editable in Additional Documents; only add/upload-replace/remove are needed. If this feels incomplete during manual verification (Task 8), it's acceptable to leave as-is since it matches the spec's "reuses the existing custom-document upload row pattern" language without expanding scope. `onUpload` is a genuine gap, though: `RequirementDocRow` calls `onUpload` internally when the user picks a replacement file — leaving it a no-op means "Upload" silently does nothing when clicking an existing row's file picker. Fix this properly: add an `updateCiAdditionalDocument` action.

- [ ] **Step 2: Add the missing `updateCiAdditionalDocument` action**

Go back to `src/auth/admin-context.tsx`. Add to `AdminContextValue` (near the other `addCiAdditionalDocument`/`removeCiAdditionalDocument` signatures added in Task 2):

```ts
  updateCiAdditionalDocument: (key: string, data: Partial<CreditInvestigationDoc>) => void;
```

Add the reducer implementation next to `removeCiAdditionalDocument`:

```ts
      updateCiAdditionalDocument: (key, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              additionalDocuments: prev.review.creditInvestigation.additionalDocuments.map((doc) =>
                doc.key === key ? { ...doc, ...data } : doc
              ),
            },
          },
        })),
```

- [ ] **Step 3: Wire it into the section component**

In `ci-report-additional-documents-section.tsx`, update the import and usage:

```tsx
const { review, adminUser, addCiAdditionalDocument, removeCiAdditionalDocument, updateCiAdditionalDocument } = useAdmin();
```

Replace the row's props:

```tsx
onUpload={(data) => updateCiAdditionalDocument(doc.key, { ...data, uploadedBy: officerName, reviewed: false })}
onRemove={() => removeCiAdditionalDocument(doc.key)}
onToggleReviewed={(reviewed) => updateCiAdditionalDocument(doc.key, { reviewed })}
onRemarksChange={(remarks) => updateCiAdditionalDocument(doc.key, { remarks })}
```

(This matches `credit-investigation-view.tsx`'s existing `patchCustomDoc`/`handleUploadDoc`/`handleToggleReviewed`/`handleRemarksChange` pattern for the Document Checklist's custom docs — same shape, applied to the new array.)

- [ ] **Step 4: Type-check**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/auth/admin-context.tsx src/sections/admin/credit-investigation/ci-report-sections/ci-report-additional-documents-section.tsx
git commit -m "Add CI Report Additional Documents section"
```

---

### Task 8: Rewrite `ci-report-card.tsx` as the assembling shell

**Files:**
- Modify: `src/sections/admin/credit-investigation/ci-report-card.tsx` (full rewrite)

**Interfaces:**
- Consumes: every section component from Tasks 4-7, `useAdmin()`, `useRegistration()`, `buildTranscriptAutoFill` from Task 3, `CollapsibleSection`/`CollapsibleSectionBadge` from `src/components/collapsible-section` (the existing top-level pattern used elsewhere on this page, per `credit-investigation-view.tsx`'s Document Checklist card), `adminCardSx`/`outlinedNavyButtonSx` from `src/components/admin-ui`.
- Produces: `CiReportCard()` — same export name/signature as today, so `credit-investigation-view.tsx:33` (`import { CiReportCard } from './credit-investigation/ci-report-card';`) needs no change.

- [ ] **Step 1: Rewrite the file**

```tsx
// src/sections/admin/credit-investigation/ci-report-card.tsx
'use client';

import { useRef } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { buildTranscriptAutoFill } from '../credit-investigation-transcript';

import { ciFieldSx } from './ci-report-sections/ci-report-section-shared';
import { CiReportSpouseSection } from './ci-report-sections/ci-report-spouse-section';
import { CiReportChildrenSection } from './ci-report-sections/ci-report-children-section';
import { CiReportResidenceSection } from './ci-report-sections/ci-report-residence-section';
import { CiReportEmploymentSection } from './ci-report-sections/ci-report-employment-section';
import { CiReportTradeCheckingSection } from './ci-report-sections/ci-report-trade-checking-section';
import { CiReportAssetsSection } from './ci-report-sections/ci-report-assets-section';
import { CiReportOtherIncomeSection } from './ci-report-sections/ci-report-other-income-section';
import { CiReportLoanPurposeSection } from './ci-report-sections/ci-report-loan-purpose-section';
import { CiReportBankVerificationSection } from './ci-report-sections/ci-report-bank-verification-section';
import { CiReportNegativeRecordSection } from './ci-report-sections/ci-report-negative-record-section';
import { CiReportComakerSection } from './ci-report-sections/ci-report-comaker-section';
import { CiReportHealthHabitsSection } from './ci-report-sections/ci-report-health-habits-section';
import { CiReportCommentsSection } from './ci-report-sections/ci-report-comments-section';
import { CiReportInspectionSection } from './ci-report-sections/ci-report-inspection-section';
import { CiReportAdditionalDocumentsSection } from './ci-report-sections/ci-report-additional-documents-section';

// ----------------------------------------------------------------------
// Structured CI Report matching PG Finance's real report fields: Date
// Inspected/Subject As Of, Spouse, Children, Residence/Neighborhood,
// Employment, Trade Checking, Assets, Other Source of Income, Loan
// Purpose, Bank Verification, Negative Record, Comaker, Health and
// Habits, Comments, Additional Documents, Recommendation. Spouse,
// Residence's permanent address, Employment status, Loan Purpose, and
// Negative Record are read-only, pulled from data already collected
// elsewhere in the application rather than re-asked here.
//
// Uploading a transcript file only stores its filename (never reads
// contents) and triggers a deterministic auto-fill of dateInspected,
// subjectAsOf, assets, healthAndHabits, comments, and the recommendation
// fields plus a read-only AI Summary — see credit-investigation-transcript.ts.
// Structured list fields (Children, Trade Checking, Other Income, Bank
// Verification, Comaker, Additional Documents) and read-only pulled
// fields are never touched by auto-fill.
// ----------------------------------------------------------------------

export function CiReportCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { signUpData, application } = useRegistration();
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;

  if (!signUpData) return null;

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;

  const handleTranscriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const autoFill = buildTranscriptAutoFill([signUpData.email, file.name], applicantName);
    setCiReport({
      transcriptFileName: file.name,
      transcriptUploadedAt: new Date().toISOString(),
      dateInspected: autoFill.dateInspected,
      subjectAsOf: autoFill.subjectAsOf,
      assets: autoFill.assets,
      healthAndHabits: autoFill.healthAndHabits,
      comments: autoFill.comments,
      recommendation: autoFill.recommendation,
      recommendationNotes: autoFill.recommendationNotes,
    });
    event.target.value = '';
  };

  const aiSummary = report.transcriptFileName
    ? buildTranscriptAutoFill([signUpData.email, report.transcriptFileName], applicantName).aiSummary
    : null;

  return (
    <Box sx={adminCardSx}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Report</Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the site-visit transcript to auto-fill dates and free-text fields, or type directly into
        any field below.
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ p: 2, mb: 2.5, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
      >
        <input ref={inputRef} type="file" accept=".txt,.doc,.docx,.pdf" hidden onChange={handleTranscriptUpload} />
        <Iconify icon="solar:mic-bold-duotone" width={20} sx={{ color: '#5A6273', flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
            {report.transcriptFileName ?? 'No transcript uploaded'}
          </Typography>
          {report.transcriptFileName && (
            <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
              Uploaded {new Date(report.transcriptUploadedAt!).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Typography>
          )}
        </Box>
        <Button
          onClick={() => inputRef.current?.click()}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:upload-bold-duotone" width={16} />}
          sx={{ ...outlinedNavyButtonSx, flexShrink: 0 }}
        >
          {report.transcriptFileName ? 'Replace transcript' : 'Upload transcript'}
        </Button>
      </Stack>

      {aiSummary && (
        <Box sx={{ p: 2, mb: 2.5, borderRadius: '11px', bgcolor: '#EEF1FE', border: '1px solid #DCE1F7' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#3448B0', mb: 0.75 }}>
            AI Summary
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{aiSummary}</Typography>
        </Box>
      )}

      <Stack spacing={2.5}>
        <CiReportInspectionSection />
        <CiReportSpouseSection />
        <CiReportChildrenSection />
        <CiReportResidenceSection />
        <CiReportEmploymentSection />
        <CiReportTradeCheckingSection />
        <CiReportAssetsSection />
        <CiReportOtherIncomeSection />
        <CiReportLoanPurposeSection />
        <CiReportBankVerificationSection />
        <CiReportNegativeRecordSection
          remarks={report.negativeRecordRemarks}
          onRemarksChange={(value) => setCiReport({ negativeRecordRemarks: value })}
        />
        <CiReportComakerSection />
        <CiReportHealthHabitsSection />
        <CiReportCommentsSection />
        <CiReportAdditionalDocumentsSection />

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Recommendation
          </Typography>
          <TextField
            fullWidth
            select
            label="Preliminary recommendation"
            value={report.recommendation}
            onChange={(event) =>
              setCiReport({ recommendation: event.target.value as typeof report.recommendation })
            }
            sx={ciFieldSx}
          >
            <MenuItem value="proceed-as-requested">Proceed as requested</MenuItem>
            <MenuItem value="proceed-with-conditions">Proceed with conditions</MenuItem>
            <MenuItem value="needs-additional-verification">Needs additional verification</MenuItem>
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Notes"
            value={report.recommendationNotes}
            onChange={(event) => setCiReport({ recommendationNotes: event.target.value })}
            sx={ciFieldSx}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Add the top-level completion badge**

The card header currently has no badge. Per the spec, add one counting fill-state across the 12 collapsible sub-sections (excluding Inspection, Loan Purpose, Recommendation, Additional Documents). Compute it inline in `CiReportCard` and render via the existing `CollapsibleSectionBadge`-style pill — but since `CiReportCard` itself isn't wrapped in `CollapsibleSection` (it's rendered directly inside `credit-investigation-view.tsx`'s `Stack`, not behind a collapsible header, per the current file structure), render the badge as a `StatusBadge` next to the "CI Report" title instead:

Add to imports:
```tsx
import { adminCardSx, outlinedNavyButtonSx, StatusBadge } from 'src/components/admin-ui';
```

Add this computation before the `return`:
```tsx
  const isMarried = application?.personalInfo?.civilStatus === 'Married';
  const filledSections = [
    isMarried, // Spouse
    report.children.length > 0, // Children
    [report.residencePermanentLeasedType, report.residencePermanentLengthOfStay, report.residencePresentAddress].some((v) => v.trim() !== ''), // Residence
    [report.employerName, report.position, report.salary].some((v) => v.trim() !== ''), // Employment
    report.tradeSuppliers.length + report.tradeCustomers.length > 0, // Trade Checking
    report.assets.trim() !== '', // Assets
    report.otherIncomeSources.length > 0, // Other Income
    report.bankAccounts.length > 0, // Bank Verification
    review.creditChecking.bureauFindingStatus === 'negative' || report.negativeRecordRemarks.trim() !== '', // Negative Record
    report.comaker.onFile, // Comaker
    report.healthAndHabits.trim() !== '', // Health & Habits
    report.comments.trim() !== '', // Comments
  ].filter(Boolean).length;
```

Update the header `Stack`:
```tsx
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Report</Typography>
        </Stack>
        <StatusBadge tone="neutral" label={`${filledSections}/12 sections filled`} />
      </Stack>
```

- [ ] **Step 3: Type-check the whole project**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit
```

Expected: zero errors. Fix anything that surfaces — most likely prop/import name mismatches between this file and the section files from Tasks 4-7.

- [ ] **Step 4: Manual verification**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npm run dev
```

Navigate to an application's Credit Investigation page with `ciFeeStatus` already `approved` (or `not-applicable`) so the CI Report card renders. Verify:
- All 16 sections appear in the confirmed order.
- The 12 collapsible sections start collapsed and independently expand/collapse.
- Spouse shows real data if the sample applicant's `civilStatus === 'Married'`, else "No spouse on file."
- Residence shows the real permanent address read-only, with the leased-type/length-of-stay/landmark/remarks fields editable for both permanent and present.
- Employment shows the real `employmentStatus` read-only, with editable employer fields below.
- Trade Checking's Suppliers/Customers each add/edit/remove entries independently.
- Assets, Health & Habits, Comments are simple free-text fields.
- Other Source of Income and Bank Verification add/edit/remove entries.
- Loan Purpose shows the real `financialInfo.loanPurpose` read-only.
- Negative Record shows the correct state for both a clean and a negative `bureauFindingStatus`, and its "View full Negative Credit Report" link navigates correctly.
- Comaker toggles between "No data found" and the filled form.
- Additional Documents can add a document, upload/replace its file, and delete it.
- Recommendation still works as before.
- The completion badge count updates as fields are filled.
- Uploading a transcript auto-fills `dateInspected`/`subjectAsOf`/`assets`/`healthAndHabits`/`comments`/`recommendation` and shows the AI Summary block; re-uploading overwrites; fields not covered by auto-fill are untouched.
- Reload the page (localStorage persistence) and confirm every edit survived.

- [ ] **Step 5: Commit**

```bash
git add src/sections/admin/credit-investigation/ci-report-card.tsx
git commit -m "Rewrite CiReportCard as a 16-section assembling shell"
```

---

### Task 9: Update documentation

**Files:**
- Modify: `docs/ADMIN_CREDIT_INVESTIGATION.md` (rewrite the "## CI Report" section, lines 214-241 in the original)
- Modify: `PROJECT_OVERVIEW.md` (update the `CreditInvestigation`/`CiReport` data model summary — search for `CiReport`/`CreditInvestigation` in the file to find the exact block)

**Interfaces:** None — documentation only, no code interfaces produced or consumed.

- [ ] **Step 1: Rewrite `docs/ADMIN_CREDIT_INVESTIGATION.md`'s "CI Report" section**

Replace the existing "## CI Report" section (originally lines 214-241) with:

```markdown
## CI Report

`review.creditInvestigation.report: CiReport` (`src/auth/admin-context.tsx`). A
16-section report matching PG Finance's actual CI report form, rendered by
`ci-report-card.tsx` as a thin shell over one component per section in
`src/sections/admin/credit-investigation/ci-report-sections/`. 12 of the 16
are collapsible sub-blocks (collapsed by default, using the shared
`CollapsibleSubsection`/`EntryCard` components from `src/components/admin-ui`,
also used by `NegativeCreditReportCard`); Date Inspected/Subject As Of, Loan
Purpose, and Recommendation are always-visible rows since they're either a
single dateline or the report's concluding decision-support field.

Section order: Date Inspected/Subject As Of → Spouse → Children →
Residence/Neighborhood → Employment → Trade Checking → Assets → Other Source
of Income → Loan Purpose → Bank Verification → Negative Record → Comaker →
Health and Habits → Comments → Additional Documents → Recommendation.

**Read-only, pulled from elsewhere in the application** (never re-entered
here — each shows a "Sourced from…" caption):
- **Spouse** — from `PersonalInfo.spouseFirstName`/etc. when
  `civilStatus === 'Married'`; otherwise "No spouse on file."
- **Residence's permanent address** — from `PersonalInfo.address`/etc.
  (leased type, length of stay, landmark, and remarks — for both permanent
  and present address — are new editable fields alongside it).
- **Employment status** and **Loan Purpose** — from
  `FinancialInfo.employmentStatus`/`loanPurpose`.
- **Negative Record** — a read-only summary of
  `review.negativeCreditReport`'s finding counts plus a "View full Negative
  Credit Report" link back to Initial Credit Checking; only
  `negativeRecordRemarks` is editable in this section.

**New structured/free-text fields** (Residence's non-address fields,
Employment's employer/income fields, Assets, Health and Habits, Comments) and
**new repeatable lists** (Children, Trade Checking's Suppliers/Customers,
Other Source of Income, Bank Verification, Comaker as a single togglable
entry) have no other source in the app — see the `CiChildEntry`,
`CiIncomeSourceEntry`, `CiTradeEntry`, `CiBankAccountEntry`, `CiComaker` types
in `admin-context.tsx`. Each list has its own add/update/remove context
action (e.g. `addCiChild`/`updateCiChild`/`removeCiChild`), following the
same pattern as `addNegativeReportEntry` elsewhere in this file — not one
generic handler, since the entry shapes differ per list.

**Additional Documents** reuses `CreditInvestigationDoc`/`RequirementDocRow`
directly, against a new `review.creditInvestigation.additionalDocuments`
array — separate from `documents` (the read-only Document Checklist list
carried over from Requirement Checklist).

The **CI Report card header** shows a completion badge ("N/12 sections
filled"), counting the 12 collapsible sub-sections only (Spouse through
Comments) — Additional Documents has its own implicit count via its file
rows, and the three always-visible rows aren't gradeable sections to begin
with.

### Transcript upload → auto-fill

Unchanged mechanism from before this redesign — officer uploads a transcript
file (stands in for a PLAUD.ai export), filename + timestamp only stored,
never file contents. `buildTranscriptAutoFill()`
(`credit-investigation-transcript.ts`) deterministically (hash-seeded on
applicant email + filename) fills only the fields a real transcript would
plausibly speak to: `dateInspected`, `subjectAsOf`, `assets`,
`healthAndHabits`, `comments`, plus `recommendation`/`recommendationNotes`,
and produces a read-only AI Summary block. Every other field — read-only
pulled fields, and every repeatable list (Children, Trade Checking, Other
Income, Bank Verification, Comaker, Additional Documents) — is untouched by
auto-fill and stays manually entered. Re-uploading a new transcript re-runs
auto-fill and overwrites the fields it covers; every field stays editable
before and after.
```

- [ ] **Step 2: Update the file's header comment if it lists `credit-investigation-docs.ts`**

Check line 1-9 of `docs/ADMIN_CREDIT_INVESTIGATION.md` — it references
`credit-investigation-docs.ts` in its maintenance-rule list, but that file
was already deleted in an earlier, unrelated commit (per git history). Add
`ci-report-sections/` (the new directory) to that list instead:

```markdown
> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-risk.ts`,
> `credit-investigation-transcript.ts`, `credit-investigation/ci-fee-card.tsx`,
> `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/ci-report-sections/*`,
> `credit-investigation/credit-investigation-doc-row.tsx`) change. Companion to
> `PROJECT_OVERVIEW.md` and `docs/ADMIN_REQUIREMENT_CHECKLIST.md` (the step
> immediately before this one in the pipeline).
```

- [ ] **Step 3: Insert a `CreditInvestigation`/`CiReport` block into `PROJECT_OVERVIEW.md`**

Confirmed during planning: `PROJECT_OVERVIEW.md` does **not** currently have a
`CreditInvestigation`/`CiReport` block at all — the data model list
(`Admin: src/auth/admin-context.tsx` section) stops at `RequirementChecklist`
(ends `docs/ADMIN_REQUIREMENT_CHECKLIST.md`.) followed directly by the
`ApplicationReview { ... }` type-shape line. This is a pre-existing gap
(`creditInvestigation` is already named inside that `ApplicationReview`
line), not something this task introduces — insert a new block rather than
replacing anything.

Find the insertion point:

```bash
grep -n "RequirementChecklist  {\|ApplicationReview {" "/Users/almikkaj/Downloads/Gvtech Code/lms-v2/PROJECT_OVERVIEW.md"
```

Insert a new `CreditInvestigation`/`CiReport` block immediately after the
`RequirementChecklist` block's closing reference line (`docs/ADMIN_REQUIREMENT_CHECKLIST.md.`) and its trailing blank line, before the
`ApplicationReview { ... }` line, matching the existing block's exact
indentation/wrapping style (field name padded to align the `{`, wrapped
description lines indented to match the `{`'s column):

```markdown
CreditInvestigation   { documents, additionalDocuments, outreachMessages,
                        ciFeeStatus, ciFeeAmount, ciFeeAmountDescription,
                        ciFeeRemarks, ciFeeDeclineReason, report, decision,
                        decisionReason, returnedToAmd, returnToAmdReason }
                        — `report: CiReport` is a 16-section report matching
                        PG Finance's real CI report form (Date Inspected,
                        Spouse, Children, Residence/Neighborhood, Employment,
                        Trade Checking, Assets, Other Source of Income, Loan
                        Purpose, Bank Verification, Negative Record, Comaker,
                        Health and Habits, Comments, Additional Documents,
                        Recommendation). Spouse, Residence's permanent
                        address, Employment status, and Loan Purpose are
                        read-only, pulled from PersonalInfo/FinancialInfo
                        rather than re-entered; Negative Record is a
                        read-only summary of NegativeCreditReport. See
                        docs/ADMIN_CREDIT_INVESTIGATION.md's "CI Report"
                        section for the full field list and the
                        read-only-vs-editable split.
```

Verify the inserted block's alignment visually matches its neighbors (open
the file and eyeball column alignment — this repo's convention pads the
type name to a fixed column before `{`, confirm the exact column used by
`RequirementChecklist`/`NegativeCreditReport` above it and match it, don't
guess).

- [ ] **Step 4: Commit**

```bash
git add docs/ADMIN_CREDIT_INVESTIGATION.md PROJECT_OVERVIEW.md
git commit -m "Update docs for CI Report redesign"
```

---

## Self-Review Notes

**Spec coverage:** All 16 sections have a task (Tasks 4-7 build them, Task 8 assembles). Data model (Task 2), transcript auto-fill extension (Task 3), shared `CollapsibleSubsection` extraction (Task 1), completion badge (Task 8 Step 2), docs (Task 9) — all spec sections covered.

**Placeholder scan:** No TBD/TODO. Task 7's `onRemarksChange`/`onToggleReviewed` initial no-op was caught and fixed within the same task (Step 2-3) rather than left as a gap — real actions were added.

**Verified against actual source during self-review (not guessed):**
- `useRegistration()` returns `application` as a top-level value, not nested
  under `signUpData` — an earlier draft of Tasks 4/6/8 used
  `signUpData.application.personalInfo`, which doesn't exist on that type.
  Fixed throughout (Spouse, Loan Purpose, Residence, Employment sections,
  and the completion-badge computation in Task 8) to destructure
  `application` directly from `useRegistration()`, matching
  `application-details-card.tsx:164`'s actual usage.
- `paths.admin.creditChecking` requires an `id` argument
  (`(id: string) => ...`, confirmed in `src/routes/paths.ts:64`) — Task 4's
  Negative Record section link was fixed to call it with
  `encodeURIComponent(signUpData.email)`, matching the argument style used
  elsewhere in this codebase (e.g. `paths.admin.reconsideration(...)` in
  `credit-investigation-view.tsx`), and to destructure `signUpData` via
  `useRegistration()` for it.
- `PROJECT_OVERVIEW.md` has no existing `CreditInvestigation`/`CiReport`
  block to "replace" — confirmed via grep during self-review. Task 9 Step 3
  was rewritten from a false replace-in-place instruction to an accurate
  insert-a-new-block instruction, with the exact insertion point identified.

**Type consistency:** `CiTradeListKey`, `CiChildEntry`, `CiIncomeSourceEntry`, `CiBankAccountEntry`, `CiComaker` are defined once in Task 2 and referenced identically (same field names) in Tasks 5-6's components. Action names (`addCiChild`/`updateCiChild`/`removeCiChild`, etc.) match between their Task 2 signatures/implementations and their Task 5/6 call sites. `CiReportCard`'s export name is unchanged, so `credit-investigation-view.tsx`'s existing import needs no edit.

**Task granularity:** Tasks 4-7 are grouped by pattern (read-only, list-based, structured/free-text) rather than one task per section, since a fresh reviewer would reasonably review "all the read-only sections" as one coherent unit rather than 4 separate near-identical PRs — this matches the "fold where a reviewer could not meaningfully reject one independently of its neighbor" guidance. Task 8 is deliberately last and separate since it's the integration point where a type mismatch in any earlier task would surface.
