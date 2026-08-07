# CI Report Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `CiReportCard`'s current 5-section CI Report with a ~15-section report matching the approved design spec, and add a new Comaker section to Call Report as the data source CI Report's Comaker section reads from.

**Architecture:** Extend `AdminContext` with a rewritten `CiReport` type, new array-entry types (`CiChildEntry`, `CiTradeEntry`, `CiIncomeSourceEntry`, `CiBankAccountEntry`, `CiComakerEntry`), and new context methods for the Comaker array (mirroring the existing `addCollateralEntry`/`updateCollateralEntry`/`removeCollateralEntry` pattern exactly). Add a new shared `RichTextField` component (Tiptap-backed) used across 6 narrative sections. Rebuild `CiReportCard`'s body section-by-section. Add `ComakerInformationCard` to Call Report, mounted as its 12th section card.

**Tech Stack:** Next.js, MUI, TypeScript, `@tiptap/react` + `@tiptap/starter-kit` (new dependency — no rich-text library exists in this repo today).

## Global Constraints

- No test suite exists in this codebase — verification is `tsc --noEmit`, `eslint`, and manual click-through (confirmed in the spec).
- Every new/changed file must pass `npx tsc --noEmit -p .` and `npx eslint <file>` with zero errors before a task is considered done.
- Follow this codebase's established conventions exactly rather than introducing new patterns: `adminCardSx`/`cardSx` for card shells, `fieldSx` for `TextField` styling, `outlinedNavyButtonSx` for secondary buttons, `RadioRow` for radio-group fields, `crypto.randomUUID()` for entry IDs, `Partial<T>` setter functions via `useAdmin()`.
- Every context setter mutates through `setState((prev) => ({ ...prev, review: { ...prev.review, ... } }))` — never mutate in place.
- Docs (`docs/ADMIN_CALL_REPORT.md`, `docs/ADMIN_CREDIT_INVESTIGATION.md`) must be updated in the same task as the code change they describe, per this project's standing "always update docs" rule.
- No Preview Report view, no in-card document upload — both explicitly out of scope per the spec.

---

## Task 1: Add `@tiptap/react` + `@tiptap/starter-kit` and build `RichTextField`

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `src/components/rich-text-field/rich-text-field.tsx`
- Create: `src/components/rich-text-field/index.ts`

**Interfaces:**
- Produces: `RichTextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (html: string) => void; placeholder?: string })` — a controlled component. `value`/`onChange` carry an HTML string (Tiptap's serialization). Exported from `src/components/rich-text-field` (matches `src/components/custom-dialog`'s folder+index.ts convention).

- [ ] **Step 1: Install the dependencies**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npm install @tiptap/react @tiptap/starter-kit`

Expected: `package.json`/`package-lock.json` gain `@tiptap/react` and `@tiptap/starter-kit` entries.

- [ ] **Step 2: Write `rich-text-field.tsx`**

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// Shared rich-text field for CI Report's narrative sections (Subject As
// Of, Spouse, Assets, Negative Record remarks, Health and Habits,
// Comments) — the only rich-text component in this codebase. Value is
// stored as an HTML string (Tiptap's default `getHTML()` output), same
// "everything is a string in AdminContext" convention every other field
// in this app follows. No debounce: onChange fires on every keystroke,
// same as every controlled TextField elsewhere in this app.
// ----------------------------------------------------------------------

function ToolbarButton({
  icon,
  active,
  onClick,
  label,
}: {
  icon: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <IconButton
      size="small"
      onClick={onClick}
      aria-label={label}
      sx={{
        borderRadius: '6px',
        color: active ? '#1C2A6E' : '#8891A6',
        bgcolor: active ? '#EEF1FE' : 'transparent',
        '&:hover': { bgcolor: active ? '#EEF1FE' : '#F5F6FA' },
      }}
    >
      <Iconify icon={icon} width={16} />
    </IconButton>
  );
}

export function RichTextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    editorProps: {
      attributes: {
        style: 'min-height: 96px; padding: 10px 12px; font-size: 14px; outline: none;',
      },
    },
  });

  if (!editor) return null;

  return (
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
        {label}
      </Typography>
      <Box sx={{ border: '1px solid #DDE1EA', borderRadius: '10px', overflow: 'hidden', bgcolor: 'common.white' }}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ px: 1, py: 0.5, borderBottom: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}
        >
          <ToolbarButton
            icon="solar:text-bold-bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
          />
          <ToolbarButton
            icon="solar:text-italic-bold"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
          />
          <ToolbarButton
            icon="solar:list-bold"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="Bulleted list"
          />
          <ToolbarButton
            icon="solar:list-check-bold"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="Numbered list"
          />
        </Stack>
        <Box
          sx={{
            '& .ProseMirror': { minHeight: 96 },
            '& .ProseMirror p.is-editor-empty:first-of-type::before': placeholder
              ? {
                  content: `"${placeholder}"`,
                  color: '#A0A7B5',
                  float: 'left',
                  height: 0,
                  pointerEvents: 'none',
                }
              : undefined,
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export * from './rich-text-field';
```

- [ ] **Step 4: Verify types and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -i "rich-text-field"`
Expected: no output.

Run: `npx eslint src/components/rich-text-field/rich-text-field.tsx src/components/rich-text-field/index.ts`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add package.json package-lock.json src/components/rich-text-field/
git commit -m "$(cat <<'EOF'
Add shared RichTextField component for CI Report's narrative sections

Introduces @tiptap/react + @tiptap/starter-kit (first rich-text library
in this codebase) wrapped in a small bold/italic/list-only editor,
matching the field-label convention every other admin form field uses.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `CiComakerEntry` type and Comaker context methods to `AdminContext`

**Files:**
- Modify: `src/auth/admin-context.tsx`

**Interfaces:**
- Consumes: none (new types/state).
- Produces: `CiComakerEntry` type; `CallReport.comakers: CiComakerEntry[]`; `addComakerEntry(): void`, `updateComakerEntry(id: string, data: Partial<CiComakerEntry>): void`, `removeComakerEntry(id: string): void` on `AdminContextValue`, all reachable via `useAdmin()`.

- [ ] **Step 1: Add the `CiComakerEntry` type**

Find `export type CollateralEntry = {` (around line 260) and add this new type directly after its closing `};`:

```ts
export type CiComakerEntry = {
  id: string;
  name: string;
  relationshipToBorrower: string;
  address: string;
  contactNumber: string;
  occupation: string;
  monthlyIncome: string;
};
```

- [ ] **Step 2: Add `comakers` to the `CallReport` type**

Find the `// 9. Collateral Information` block inside `export type CallReport = {`:

```ts
  // 9. Collateral Information
  collateralOffered: CollateralOffered | '';
  collateralEntries: CollateralEntry[];
```

Add immediately after it:

```ts

  // 12. Comaker
  comakers: CiComakerEntry[];
```

(Sections 10/11 — Agreed Next Steps, Loan Package Proposal — already exist below this point in the type; Comaker is numbered 12 to come after them, matching its UI position at the end of the section list, even though it's declared here right after section 9's fields for locality with the array-entry fields it resembles. This ordering-in-the-type-vs-ordering-in-the-UI split is fine — nothing in this codebase requires type field order to match UI order.)

- [ ] **Step 3: Add the three context methods to `AdminContextValue`**

Find:
```ts
  addCollateralEntry: () => void;
  updateCollateralEntry: (id: string, data: Partial<CollateralEntry>) => void;
  removeCollateralEntry: (id: string) => void;
```

Add immediately after:
```ts
  addComakerEntry: () => void;
  updateComakerEntry: (id: string, data: Partial<CiComakerEntry>) => void;
  removeComakerEntry: (id: string) => void;
```

- [ ] **Step 4: Add `comakers: []` to `createInitialReview()`'s `callReport` default**

Find (around line 942):
```ts
      collateralOffered: '',
      collateralEntries: [],
```

Add immediately after:
```ts
      comakers: [],
```

- [ ] **Step 5: Implement the three context methods**

Find the `addCollateralEntry`/`updateCollateralEntry`/`removeCollateralEntry` implementations (around line 1220–1270) inside the `useMemo` that builds the context value. Add immediately after `removeCollateralEntry`'s closing `})),`:

```ts
      addComakerEntry: () =>
        setState((prev) => {
          const newEntry: CiComakerEntry = {
            id: crypto.randomUUID(),
            name: '',
            relationshipToBorrower: '',
            address: '',
            contactNumber: '',
            occupation: '',
            monthlyIncome: '',
          };
          return {
            ...prev,
            review: {
              ...prev.review,
              callReport: {
                ...prev.review.callReport,
                comakers: [...prev.review.callReport.comakers, newEntry],
              },
            },
          };
        }),
      updateComakerEntry: (id, data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              comakers: prev.review.callReport.comakers.map((entry) =>
                entry.id === id ? { ...entry, ...data } : entry
              ),
            },
          },
        })),
      removeComakerEntry: (id) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            callReport: {
              ...prev.review.callReport,
              comakers: prev.review.callReport.comakers.filter((entry) => entry.id !== id),
            },
          },
        })),
```

- [ ] **Step 6: Verify types and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -i "admin-context"`
Expected: shows errors in `call-report-view.tsx` (sample-data fill/clear functions don't set `comakers` yet — expected, fixed in Task 3) but no errors inside `admin-context.tsx` itself. If `admin-context.tsx` itself has errors, fix them before proceeding.

Run: `npx eslint src/auth/admin-context.tsx`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx
git commit -m "$(cat <<'EOF'
Add CiComakerEntry type and Comaker context methods

New review.callReport.comakers array plus addComakerEntry/
updateComakerEntry/removeComakerEntry, mirroring the existing
Collateral entry pattern exactly. UI and sample-data wiring follow
in later commits.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Build `ComakerInformationCard` and mount it in Call Report (section 12)

**Files:**
- Create: `src/sections/admin/call-report/comaker-information-card.tsx`
- Modify: `src/sections/admin/call-report-view.tsx`
- Modify: `docs/ADMIN_CALL_REPORT.md`

**Interfaces:**
- Consumes: `CiComakerEntry` (Task 2), `addComakerEntry`/`updateComakerEntry`/`removeComakerEntry` (Task 2), `cardSx`/`fieldSx` (`./call-report-types`).
- Produces: `ComakerInformationCard()` component, exported and mounted as the 12th card on the Call Report page.

- [ ] **Step 1: Write `comaker-information-card.tsx`**

```tsx
'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

import { cardSx, fieldSx } from './call-report-types';

// ----------------------------------------------------------------------
// Section 12: Comaker. Same repeatable-entry pattern as Collateral
// Information (section 9) — no gating radio (unlike Collateral's
// collateralOffered), since having zero comakers is a normal end state.
// Credit Investigation's CI Report reads review.callReport.comakers
// read-only from this same array (see ci-report-card.tsx).
// ----------------------------------------------------------------------

export function ComakerInformationCard() {
  const { review, addComakerEntry, updateComakerEntry, removeComakerEntry } = useAdmin();
  const { comakers } = review.callReport;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Comaker
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Anyone co-signing this loan alongside the borrower. Read by Credit Investigation's CI Report.
      </Typography>

      <Stack spacing={2}>
        {comakers.map((entry, index) => (
          <Box
            key={entry.id}
            sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Chip
                label={`Comaker ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => removeComakerEntry(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove Comaker
              </Button>
            </Stack>

            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Full Name"
                  value={entry.name}
                  onChange={(event) => updateComakerEntry(entry.id, { name: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Relationship to Borrower"
                  value={entry.relationshipToBorrower}
                  onChange={(event) =>
                    updateComakerEntry(entry.id, { relationshipToBorrower: event.target.value })
                  }
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>

              <TextField
                label="Address"
                value={entry.address}
                onChange={(event) => updateComakerEntry(entry.id, { address: event.target.value })}
                sx={fieldSx}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Contact Number"
                  value={entry.contactNumber}
                  onChange={(event) =>
                    updateComakerEntry(entry.id, { contactNumber: event.target.value })
                  }
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Occupation"
                  value={entry.occupation}
                  onChange={(event) => updateComakerEntry(entry.id, { occupation: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Monthly Income"
                  type="number"
                  value={entry.monthlyIncome}
                  onChange={(event) =>
                    updateComakerEntry(entry.id, { monthlyIncome: event.target.value })
                  }
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
            </Stack>
          </Box>
        ))}

        <Button
          onClick={addComakerEntry}
          variant="outlined"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          sx={{ borderRadius: '10px', alignSelf: 'flex-start' }}
        >
          Add Another Comaker
        </Button>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Mount the card in `call-report-view.tsx`**

Add the import alongside the other card imports (find `import { LoanPackageProposalCard } from './call-report/loan-package-proposal-card';`):

```ts
import { ComakerInformationCard } from './call-report/comaker-information-card';
```

Find:
```tsx
        <CollateralInformationCard />
        <AgreedNextStepsCard />
        <LoanPackageProposalCard />
```

Change to:
```tsx
        <CollateralInformationCard />
        <AgreedNextStepsCard />
        <LoanPackageProposalCard />
        <ComakerInformationCard />
```

- [ ] **Step 3: Update `handleFillSampleData` in `call-report-view.tsx` to seed a sample comaker**

Find the `sampleCollateral` declaration (around line 127) and add a sibling declaration right after its closing `};`:

```ts
    const sampleComaker: CiComakerEntry = {
      id: crypto.randomUUID(),
      name: 'Juan Dela Cruz',
      relationshipToBorrower: 'Sibling',
      address: 'Quezon City, Metro Manila',
      contactNumber: '9171234567',
      occupation: 'Nurse',
      monthlyIncome: '28000',
    };
```

Find `collateralEntries: [sampleCollateral],` inside the big `setCallReport({...})` call and add immediately after it:

```ts
      comakers: [sampleComaker],
```

Add `CiComakerEntry` to this file's type-only import from `src/auth/admin-context` (find the existing `import type { ... } from 'src/auth/admin-context';` line and add `CiComakerEntry` to the named list — if no such type-only import line exists yet, check how `CollateralEntry` is currently imported into this file and follow the identical pattern).

- [ ] **Step 4: Update `handleClearSampleData` in `call-report-view.tsx`**

Find `collateralEntries: [],` inside `handleClearSampleData`'s `setCallReport({...})` call and add immediately after it:

```ts
      comakers: [],
```

- [ ] **Step 5: Verify types and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -iE "call-report-view|comaker-information-card"`
Expected: no output.

Run: `npx eslint src/sections/admin/call-report-view.tsx src/sections/admin/call-report/comaker-information-card.tsx`
Expected: no output.

- [ ] **Step 6: Update `docs/ADMIN_CALL_REPORT.md`**

Find the "The 11 section cards" heading and its table (around line 61–80). Change the heading to "The 12 section cards" and add a new table row after the Loan Package Proposal row:

```
| 12 | Comaker | `comaker-information-card.tsx` | Repeatable `CiComakerEntry` list, same pattern as Collateral Information; no gating radio (zero comakers is a normal end state). Read read-only by Credit Investigation's CI Report (`review.callReport.comakers`). |
```

Also update every other place in this file that says "11 section" or "11-section" (check with `grep -n "11 section\|11-section" docs/ADMIN_CALL_REPORT.md`) to say "12 section"/"12-section", and update the "Sample data action" section's description of what `handleFillSampleData`/`handleClearSampleData` seed/clear to mention the sample comaker.

- [ ] **Step 7: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/call-report/comaker-information-card.tsx src/sections/admin/call-report-view.tsx docs/ADMIN_CALL_REPORT.md
git commit -m "$(cat <<'EOF'
Add Comaker Information card as Call Report's 12th section

Repeatable comaker entries (name, relationship, address, contact,
occupation, income), same add/remove pattern as Collateral
Information. Feeds Credit Investigation's CI Report Comaker section,
which reads this array read-only.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Rewrite the `CiReport` type and its factory/reset defaults

**Files:**
- Modify: `src/auth/admin-context.tsx`

**Interfaces:**
- Consumes: none (type-level change; UI consumes this in Task 6+).
- Produces: `CiChildEntry`, `CiTradeEntry`, `CiIncomeSourceEntry`, `CiBankAccountEntry` types; rewritten `CiReport` type; rewritten `createInitialCiReport()`.

- [ ] **Step 1: Add the new array-entry types**

Find `export type CiComakerEntry = {` (added in Task 2) and add these new types directly after its closing `};`:

```ts
export type CiChildEntry = {
  id: string;
  name: string;
  age: string;
  occupationOrSchool: string;
};

export type CiTradeEntry = {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  natureOfDealing: string;
  yearsOfDealing: string;
};

export type CiIncomeSourceEntry = {
  id: string;
  source: string;
  monthlyAmount: string;
  remarks: string;
};

export type CiBankAccountEntry = {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  averageMonthlyBalance: string;
};
```

- [ ] **Step 2: Replace the `CiReport` type**

Find the current `export type CiReport = {` block (it sits just above `export type CreditInvestigation = {`) and replace its entire contents with:

```ts
export type CiReport = {
  // Site visit
  visitDate: string;
  subjectAsOf: string; // rich text (HTML)

  // Spouse
  spouseNotes: string; // rich text (HTML)

  // Children
  children: CiChildEntry[];

  // Residence/Neighborhood
  residencePermanentAddress: string; // read-only display, sourced from personalInfo
  residenceLeasedType: 'owned' | 'leased' | 'rent-free' | '';
  residenceLengthOfStay: string;
  residenceLandmark: string;
  residenceRemarks: string;
  presentAddress: string;
  presentLeasedType: 'owned' | 'leased' | 'rent-free' | '';
  presentLengthOfStay: string;
  presentLandmark: string;
  presentRemarks: string;

  // Employment
  employmentStatus: string; // read-only display, sourced from financialInfo
  employmentType: 'direct' | 'agency' | 'self-employed' | '';
  employerName: string;
  position: string;
  employerAddress: string;
  employerTelNo: string;
  employerEmail: string;
  salary: string;
  annualIncome: string;
  lengthOfService: string;
  numberOfRegEmployees: string;
  numberOfContrEmployees: string;
  isUnionized: 'yes' | 'no' | '';
  secDtiRegNo: string;
  secDtiRegDate: string;
  secDtiExpDate: string;
  employmentRemarks: string;

  // Trade Checking
  suppliers: CiTradeEntry[];
  customers: CiTradeEntry[];

  // Assets
  assetsNotes: string; // rich text (HTML)

  // Other Source of Income
  otherIncomeSources: CiIncomeSourceEntry[];

  // Loan Purpose (required)
  loanPurposeNotes: string; // rich text (HTML)

  // Bank Verification
  bankAccounts: CiBankAccountEntry[];

  // Negative Record
  negativeRecordSourceNote: string;
  negativeRecordFinding: 'no-negative-findings-both-cmap-nfis' | 'negative-findings-found' | '';
  negativeRecordRemarks: string; // rich text (HTML)

  // Health and Habits
  healthAndHabitsNotes: string; // rich text (HTML)

  // Comments
  commentsNotes: string; // rich text (HTML)

  // Recommendation
  recommendation: 'proceed-as-requested' | 'proceed-with-conditions' | 'needs-additional-verification' | '';
  recommendationNotes: string;

  // Transcript
  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};
```

- [ ] **Step 3: Rewrite `createInitialCiReport()`**

Find `function createInitialCiReport(): CiReport {` and replace its body with:

```ts
function createInitialCiReport(): CiReport {
  return {
    visitDate: '',
    subjectAsOf: '',
    spouseNotes: '',
    children: [],
    residencePermanentAddress: '',
    residenceLeasedType: '',
    residenceLengthOfStay: '',
    residenceLandmark: '',
    residenceRemarks: '',
    presentAddress: '',
    presentLeasedType: '',
    presentLengthOfStay: '',
    presentLandmark: '',
    presentRemarks: '',
    employmentStatus: '',
    employmentType: '',
    employerName: '',
    position: '',
    employerAddress: '',
    employerTelNo: '',
    employerEmail: '',
    salary: '',
    annualIncome: '',
    lengthOfService: '',
    numberOfRegEmployees: '',
    numberOfContrEmployees: '',
    isUnionized: '',
    secDtiRegNo: '',
    secDtiRegDate: '',
    secDtiExpDate: '',
    employmentRemarks: '',
    suppliers: [],
    customers: [],
    assetsNotes: '',
    otherIncomeSources: [],
    loanPurposeNotes: '',
    bankAccounts: [],
    negativeRecordSourceNote:
      'Source of information: BAP Credit Bureau / CMAP report on accounts under watch lists, cancelled credit cards, adverse classified loan file, closed current account and court case file as of ',
    negativeRecordFinding: '',
    negativeRecordRemarks: '',
    healthAndHabitsNotes: '',
    commentsNotes: '',
    recommendation: '',
    recommendationNotes: '',
    transcriptFileName: null,
    transcriptUploadedAt: null,
  };
}
```

(The `negativeRecordSourceNote` default text is copied verbatim from `createInitialNegativeCreditReport()`'s `negativeRecordText` default elsewhere in this same file — same disclosure sentence, same source.)

- [ ] **Step 4: Verify types — expect failures in `ci-report-card.tsx`**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -i "ci-report-card"`

Expected: many errors, since `ci-report-card.tsx` still references the old field names (`visitTime`, `identityConfirmed`, `findings`, etc.). This is expected — `ci-report-card.tsx` is fully rewritten in Task 6. Confirm the error list is confined to `ci-report-card.tsx` and does not appear in `admin-context.tsx` or any other file (a leak elsewhere means something outside `ci-report-card.tsx` depended on the removed fields, contradicting the spec's verification — stop and investigate if this happens).

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "ci-report-card"`
Expected: no output (everything outside `ci-report-card.tsx` still compiles clean).

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx
git commit -m "$(cat <<'EOF'
Rewrite CiReport type for the new ~15-section CI Report

Replaces the old Site Visit/Borrower-Residence-Verification/
Neighborhood-Check/Findings fields with the full field set for
Residence/Neighborhood, Employment, Trade Checking, Assets, Other
Income, Bank Verification, and Negative Record, plus four new
array-entry types. ci-report-card.tsx is intentionally left broken
here — rewritten in the next commit — since this type is its sole
consumer and splitting the type change from its UI would leave an
unbuildable intermediate state either way.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Extend `buildTranscriptAutoFill` for the new fields

**Files:**
- Modify: `src/sections/admin/credit-investigation-transcript.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CiTranscriptAutoFill` gains `residenceLeasedType`, `residenceLengthOfStay`, `presentAddressSameAsPermanent: boolean`, `employmentType`, `lengthOfService`, `negativeRecordFinding`, `findingsNarrativeHtml: string` fields. `buildTranscriptAutoFill` returns them in both branches.

- [ ] **Step 1: Replace `CiTranscriptAutoFill` and both branches**

Read the current file first: `cat src/sections/admin/credit-investigation-transcript.ts`. Replace the whole file with:

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
// Only fields a transcript could plausibly attest to are covered here.
// The read-only header block (residence/business address), Loan Purpose,
// and Comaker are sourced from application data / Call Report instead —
// see ci-report-card.tsx — and are never touched by this auto-fill, so a
// transcript re-upload can't clobber them.
// ----------------------------------------------------------------------

export type CiTranscriptAutoFill = {
  residenceLeasedType: 'owned' | 'leased' | 'rent-free';
  residenceLengthOfStay: string;
  presentAddressSameAsPermanent: boolean;
  employmentType: 'direct' | 'agency' | 'self-employed';
  lengthOfService: string;
  negativeRecordFinding: 'no-negative-findings-both-cmap-nfis' | 'negative-findings-found';
  findingsNarrativeHtml: string;
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

  if (isPositive) {
    return {
      residenceLeasedType: 'owned',
      residenceLengthOfStay: 'Over 5 years',
      presentAddressSameAsPermanent: true,
      employmentType: 'direct',
      lengthOfService: '5+ years',
      negativeRecordFinding: 'no-negative-findings-both-cmap-nfis',
      findingsNarrativeHtml: `<p>Site visit confirmed ${applicantName}'s identity and residence as declared. No inconsistencies were found between the transcript and the application details on file.</p>`,
      aiSummary: `Transcript reviewed for ${applicantName}. Identity and residence were confirmed on-site, and neighborhood feedback was positive. No red flags detected.`,
    };
  }

  return {
    residenceLeasedType: 'leased',
    residenceLengthOfStay: 'Less than 1 year',
    presentAddressSameAsPermanent: false,
    employmentType: 'agency',
    lengthOfService: 'Less than 1 year',
    negativeRecordFinding: 'negative-findings-found',
    findingsNarrativeHtml: `<p>Site visit for ${applicantName} raised some items that need further verification before a final assessment can be made.</p>`,
    aiSummary: `Transcript reviewed for ${applicantName}. Some details from the site visit could not be fully corroborated — additional verification is recommended before proceeding.`,
  };
}
```

- [ ] **Step 2: Verify types and lint (isolated to this file — the caller is fixed in Task 6)**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -i "credit-investigation-transcript"`
Expected: no output (this file itself is self-contained and correct; `ci-report-card.tsx`'s call site is already broken from Task 4 and stays broken until Task 6 — that's fine).

Run: `npx eslint src/sections/admin/credit-investigation-transcript.ts`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation-transcript.ts
git commit -m "$(cat <<'EOF'
Extend transcript auto-fill for the new CI Report fields

CiTranscriptAutoFill now covers residence lease type/length,
employment type/length of service, and negative-record finding —
the fields a site-visit transcript could plausibly attest to. The
read-only header, Loan Purpose, and Comaker stay untouched by this
auto-fill since they come from application data / Call Report, not
the transcript.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Rewrite `CiReportCard` — header, Date Inspected, Subject As Of, Spouse, Children

**Files:**
- Modify: `src/sections/admin/credit-investigation/ci-report-card.tsx`

**Interfaces:**
- Consumes: `RichTextField` (Task 1), rewritten `CiReport` (Task 4), extended `buildTranscriptAutoFill` (Task 5), `application.personalInfo`/`financialInfo` (existing `useRegistration()`).
- Produces: nothing new consumed by later tasks — `ci-report-card.tsx` remains the sole file. This task establishes the file's new top half; Task 7 appends the rest below it in the same file.

This task and Task 7 together fully rewrite `ci-report-card.tsx`. Splitting it in two keeps each task's diff reviewable; the file is not in a compiling state between them (same reasoning as Task 4 — this card has one consumer, this file, and there's no way to half-migrate a single-file component into two independently-compiling halves without a temporary type shim that would just be deleted next task anyway).

- [ ] **Step 1: Write the new file (Part 1 — through Children; Part 2 continues in Task 7)**

Replace the entire contents of `src/sections/admin/credit-investigation/ci-report-card.tsx` with:

```tsx
// src/sections/admin/credit-investigation/ci-report-card.tsx
'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { CiChildEntry, CiTradeEntry, CiIncomeSourceEntry, CiBankAccountEntry } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';

import { buildTranscriptAutoFill } from '../credit-investigation-transcript';

// ----------------------------------------------------------------------
// The ~15-section CI Report. Replaces the old 5-section version
// (Site Visit Details, Borrower/Residence Verification, Neighborhood
// Check, Findings & Assessment, Recommendation) with the fuller
// structure below. See docs/superpowers/specs/2026-08-06-ci-report-
// redesign-design.md for the full rationale.
//
// Three kinds of fields:
// - Read-only, pre-filled from application/Call Report data (header
//   block, Employment Status, Loan Purpose default, Comaker) — never
//   edited here.
// - Rich-text narrative fields (Subject As Of, Spouse, Assets, Negative
//   Record remarks, Health and Habits, Comments) via RichTextField.
// - Structured fields and array-entry sections, editable directly.
//
// Uploading a transcript auto-fills only the fields a transcript could
// plausibly attest to (see credit-investigation-transcript.ts) — it
// never touches the header block, Loan Purpose, or Comaker.
// ----------------------------------------------------------------------

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', letterSpacing: '0.02em' }}>
      {children}
    </Typography>
  );
}

export function CiReportCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { signUpData, application } = useRegistration();
  const { review, setCiReport, addComakerEntry: _unused } = useAdmin();
  const { report } = review.creditInvestigation;
  const { personalInfo, financialInfo } = application;

  if (!signUpData) return null;

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const isMarried = personalInfo?.civilStatus === 'Married';
  const isBusinessOwner = financialInfo?.employmentStatus === 'Business Owner';

  // One-time pre-fill from application/Call Report data — fires only while
  // the target field is still at its untouched default, so it can never
  // clobber an officer's own edit on a later render. Mirrors the
  // established "default once" convention already used elsewhere in this
  // app (e.g. loan-discussion-card.tsx's Final Loan Purpose default).
  useEffect(() => {
    const patch: Record<string, string> = {};
    if (!report.residencePermanentAddress && personalInfo) {
      const parts = [personalInfo.address, personalInfo.barangay, personalInfo.city, personalInfo.province]
        .filter(Boolean)
        .join(', ');
      if (parts) patch.residencePermanentAddress = parts;
    }
    if (!report.employmentStatus && financialInfo?.employmentStatus) {
      patch.employmentStatus = financialInfo.employmentStatus;
    }
    if (!report.loanPurposeNotes && financialInfo?.loanPurpose) {
      patch.loanPurposeNotes = `<p>${financialInfo.loanPurpose}</p>`;
    }
    if (!report.spouseNotes && isMarried && personalInfo) {
      const spouseName = [personalInfo.spouseFirstName, personalInfo.spouseMiddleName, personalInfo.spouseLastName]
        .filter(Boolean)
        .join(' ');
      const spouseBits = [
        spouseName,
        personalInfo.spouseBirthday ? `Born on ${personalInfo.spouseBirthday}` : '',
      ]
        .filter(Boolean)
        .join(' — ');
      if (spouseBits) patch.spouseNotes = `<p>${spouseBits}</p>`;
    }
    if (Object.keys(patch).length > 0) setCiReport(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTranscriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const autoFill = buildTranscriptAutoFill([signUpData.email, file.name], applicantName);
    setCiReport({
      transcriptFileName: file.name,
      transcriptUploadedAt: new Date().toISOString(),
      residenceLeasedType: autoFill.residenceLeasedType,
      residenceLengthOfStay: autoFill.residenceLengthOfStay,
      presentAddress: autoFill.presentAddressSameAsPermanent ? report.residencePermanentAddress : report.presentAddress,
      employmentType: autoFill.employmentType,
      lengthOfService: autoFill.lengthOfService,
      negativeRecordFinding: autoFill.negativeRecordFinding,
      subjectAsOf: autoFill.findingsNarrativeHtml,
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
        Upload the site-visit transcript to auto-fill applicable fields, or type directly into any field below.
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

      {/* Header: read-only Residence + Business/Work address, from application data */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <Box sx={{ flex: 1, p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <SectionLabel>Residence Address</SectionLabel>
          <Typography sx={{ fontSize: 13.5, color: '#14172A', mt: 0.75 }}>
            {report.residencePermanentAddress || 'Not on file'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <SectionLabel>Business/Work Address</SectionLabel>
          <Typography sx={{ fontSize: 13.5, color: '#14172A', mt: 0.75 }}>
            {isBusinessOwner ? report.employerAddress || 'Not yet entered below' : 'Not applicable'}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        <TextField
          label="Date Inspected"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={report.visitDate}
          onChange={(event) => setCiReport({ visitDate: event.target.value })}
          sx={{ ...fieldSx, maxWidth: { sm: 260 } }}
        />

        <RichTextField
          label="Subject As Of"
          value={report.subjectAsOf}
          onChange={(html) => setCiReport({ subjectAsOf: html })}
          placeholder="Summary of the investigation as of the visit date…"
        />

        <RichTextField
          label="Spouse"
          value={report.spouseNotes}
          onChange={(html) => setCiReport({ spouseNotes: html })}
          placeholder="Spouse name, citizenship, and any relevant notes…"
        />

        <ChildrenSection
          children={report.children}
          onChange={(children) => setCiReport({ children })}
        />
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------
// Array-entry sub-sections. Each owns its own add/remove/update via one
// setCiReport({ <arrayField>: nextArray }) call — CiReport has no
// per-array context methods (unlike Call Report's Comaker/Collateral),
// since CiReportCard already has direct setCiReport access and there's
// only ever one CI Report per application, not a shared cross-page array.
// ----------------------------------------------------------------------

function ChildrenSection({
  children,
  onChange,
}: {
  children: CiChildEntry[];
  onChange: (next: CiChildEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiChildEntry>) =>
    onChange(children.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(children.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([...children, { id: crypto.randomUUID(), name: '', age: '', occupationOrSchool: '' }]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Children</SectionLabel>
      <Stack spacing={1.5}>
        {children.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Child ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Name"
                value={entry.name}
                onChange={(event) => update(entry.id, { name: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
              <TextField
                label="Age"
                type="number"
                value={entry.age}
                onChange={(event) => update(entry.id, { age: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Occupation/School"
                value={entry.occupationOrSchool}
                onChange={(event) => update(entry.id, { occupationOrSchool: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Children
        </Button>
      </Stack>
    </Stack>
  );
}
```

**Note on the `_unused` destructure:** `addComakerEntry: _unused` above is a deliberate placeholder — remove it once Task 7 adds the real Comaker section that reads `review.callReport.comakers` (Task 7 does not call `addComakerEntry` since CI Report's Comaker section is read-only, but it does need `review.callReport.comakers` — adjust the destructure in Task 7's step to pull `comakers` off `review.callReport` instead, and delete this placeholder). This note exists so Task 6, taken alone, still type-checks without an unused-import lint error while `ChildrenSection`/etc. below it are being introduced.

- [ ] **Step 2: Remove the `_unused` placeholder now (don't leave it for Task 7)**

Since `updateCiReport`/`setCiReport` is the only context function this file actually needs so far, simplify the destructure to:

```ts
  const { review, setCiReport } = useAdmin();
```

(Delete the `addComakerEntry: _unused` term — it was scaffolding for the note above, not meant to ship. Task 7 will add `comakers` back to this same destructure when it needs `review.callReport.comakers`.)

- [ ] **Step 3: Verify types and lint — expect remaining errors for now**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -i "ci-report-card"`

Expected: no errors from the code written so far in this task (header, Date Inspected, Subject As Of, Spouse, Children all use only fields that exist on the Task 4 `CiReport` type). If there are errors, they indicate a mismatch between this task's field names and Task 4's type — fix here, don't change Task 4's type to match.

Run: `npx eslint src/sections/admin/credit-investigation/ci-report-card.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation/ci-report-card.tsx
git commit -m "$(cat <<'EOF'
Rewrite CiReportCard: header, Date Inspected, Subject As Of, Spouse, Children

First half of the CI Report rewrite — the read-only address header
(pre-filled from application data), Date Inspected, two RichTextField
narrative sections, and the new Children array section. One-time
pre-fill effect covers header address, employment status, loan
purpose, and a spouse-notes scaffold. Remaining sections (Residence/
Neighborhood through Recommendation) land in the next commit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Rewrite `CiReportCard` — remaining sections (Residence/Neighborhood through Recommendation)

**Files:**
- Modify: `src/sections/admin/credit-investigation/ci-report-card.tsx`

**Interfaces:**
- Consumes: everything from Task 6 in the same file (`fieldSx`, `SectionLabel`, `RichTextField`, the `CiReport` type from Task 4).
- Produces: a fully working `CiReportCard`.

- [ ] **Step 1: Add `RadioRow` import**

At the top of `ci-report-card.tsx`, add this import (find where `RichTextField` is imported and add below it):

```ts
import { RadioRow } from '../call-report/call-details-card';
```

- [ ] **Step 2: Update the top-level destructure to include `comakers`**

Find:
```ts
  const { review, setCiReport } = useAdmin();
```

Change to:
```ts
  const { review, setCiReport } = useAdmin();
  const comakers = review.callReport.comakers;
```

- [ ] **Step 3: Append the remaining sections inside the `<Stack spacing={2.5}>`**

Find the closing of the `ChildrenSection` call in the main return (the last thing before `</Stack>` `</Box>` that close out `CiReportCard`'s return):

```tsx
        <ChildrenSection
          children={report.children}
          onChange={(children) => setCiReport({ children })}
        />
      </Stack>
    </Box>
  );
}
```

Change to:

```tsx
        <ChildrenSection
          children={report.children}
          onChange={(children) => setCiReport({ children })}
        />

        <ResidenceNeighborhoodSection report={report} onChange={setCiReport} />

        <EmploymentSection report={report} onChange={setCiReport} isBusinessOwner={isBusinessOwner} />

        <TradeCheckingSection
          title="Suppliers"
          entries={report.suppliers}
          onChange={(suppliers) => setCiReport({ suppliers })}
        />
        <TradeCheckingSection
          title="Customers"
          entries={report.customers}
          onChange={(customers) => setCiReport({ customers })}
        />

        <RichTextField
          label="Assets"
          value={report.assetsNotes}
          onChange={(html) => setCiReport({ assetsNotes: html })}
          placeholder="Real property, vehicles, and other notable assets…"
        />

        <OtherIncomeSection
          entries={report.otherIncomeSources}
          onChange={(otherIncomeSources) => setCiReport({ otherIncomeSources })}
        />

        <RichTextField
          label="Loan Purpose (Required)"
          value={report.loanPurposeNotes}
          onChange={(html) => setCiReport({ loanPurposeNotes: html })}
          placeholder="What the loan proceeds will be used for…"
        />

        <BankVerificationSection
          entries={report.bankAccounts}
          onChange={(bankAccounts) => setCiReport({ bankAccounts })}
        />

        <NegativeRecordSection report={report} applicantName={applicantName} onChange={setCiReport} />

        <ComakerSection comakers={comakers} />

        <RichTextField
          label="Health and Habits"
          value={report.healthAndHabitsNotes}
          onChange={(html) => setCiReport({ healthAndHabitsNotes: html })}
          placeholder="Lifestyle, health, or habit observations relevant to the investigation…"
        />

        <RichTextField
          label="Comments"
          value={report.commentsNotes}
          onChange={(html) => setCiReport({ commentsNotes: html })}
          placeholder="Any additional remarks…"
        />

        <Stack spacing={1.25}>
          <SectionLabel>Recommendation</SectionLabel>
          <TextField
            fullWidth
            select
            label="Preliminary recommendation"
            value={report.recommendation}
            onChange={(event) =>
              setCiReport({ recommendation: event.target.value as typeof report.recommendation })
            }
            sx={fieldSx}
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
            sx={fieldSx}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Add the new section components below `ChildrenSection`**

Append these components to the bottom of the file (after `ChildrenSection`'s closing `}`):

```tsx
const LEASED_TYPE_OPTIONS: { value: 'owned' | 'leased' | 'rent-free'; label: string }[] = [
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'rent-free', label: 'Rent-free' },
];

function ResidenceNeighborhoodSection({
  report,
  onChange,
}: {
  report: import('src/auth/admin-context').CiReport;
  onChange: (data: Partial<import('src/auth/admin-context').CiReport>) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionLabel>Residence/Neighborhood</SectionLabel>
      <Box sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
        <Stack spacing={2}>
          <TextField
            label="Permanent address"
            value={report.residencePermanentAddress}
            InputProps={{ readOnly: true }}
            sx={fieldSx}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <RadioRow
              label="Leased type"
              value={report.residenceLeasedType}
              options={LEASED_TYPE_OPTIONS}
              onChange={(value) => onChange({ residenceLeasedType: value })}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Length of stay"
              value={report.residenceLengthOfStay}
              onChange={(event) => onChange({ residenceLengthOfStay: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Landmark"
              value={report.residenceLandmark}
              onChange={(event) => onChange({ residenceLandmark: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <TextField
            label="Remarks"
            value={report.residenceRemarks}
            onChange={(event) => onChange({ residenceRemarks: event.target.value })}
            sx={fieldSx}
          />

          <Stack sx={{ pt: 1, mt: 1, borderTop: '1px solid #EEF0F5' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#8891A6', mb: 1.5 }}>
              PRESENT ADDRESS (if different)
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Present address"
                value={report.presentAddress}
                onChange={(event) => onChange({ presentAddress: event.target.value })}
                sx={fieldSx}
              />
              <RadioRow
                label="Leased type"
                value={report.presentLeasedType}
                options={LEASED_TYPE_OPTIONS}
                onChange={(value) => onChange({ presentLeasedType: value })}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Length of stay"
                  value={report.presentLengthOfStay}
                  onChange={(event) => onChange({ presentLengthOfStay: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Landmark"
                  value={report.presentLandmark}
                  onChange={(event) => onChange({ presentLandmark: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <TextField
                label="Remarks"
                value={report.presentRemarks}
                onChange={(event) => onChange({ presentRemarks: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}

const EMPLOYMENT_TYPE_OPTIONS: { value: 'direct' | 'agency' | 'self-employed'; label: string }[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'agency', label: 'Agency' },
  { value: 'self-employed', label: 'Self-Employed' },
];

const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

function EmploymentSection({
  report,
  onChange,
  isBusinessOwner,
}: {
  report: import('src/auth/admin-context').CiReport;
  onChange: (data: Partial<import('src/auth/admin-context').CiReport>) => void;
  isBusinessOwner: boolean;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionLabel>Employment</SectionLabel>
      <Box sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
        <Stack spacing={2}>
          <TextField
            label="Employment Status"
            value={report.employmentStatus}
            InputProps={{ readOnly: true }}
            sx={fieldSx}
          />
          <RadioRow
            label="Employment Type"
            value={report.employmentType}
            options={EMPLOYMENT_TYPE_OPTIONS}
            onChange={(value) => onChange({ employmentType: value })}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label={isBusinessOwner ? 'Business Name' : 'Employer Name'}
              value={report.employerName}
              onChange={(event) => onChange({ employerName: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Position"
              value={report.position}
              onChange={(event) => onChange({ position: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <TextField
            label={isBusinessOwner ? 'Business Address' : 'Employer Address'}
            value={report.employerAddress}
            onChange={(event) => onChange({ employerAddress: event.target.value })}
            sx={fieldSx}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Tel. No."
              value={report.employerTelNo}
              onChange={(event) => onChange({ employerTelNo: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Email Address"
              value={report.employerEmail}
              onChange={(event) => onChange({ employerEmail: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Salary"
              type="number"
              value={report.salary}
              onChange={(event) => onChange({ salary: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Annual Income"
              type="number"
              value={report.annualIncome}
              onChange={(event) => onChange({ annualIncome: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Length of Service"
              value={report.lengthOfService}
              onChange={(event) => onChange({ lengthOfService: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="No. Reg. Employees"
              type="number"
              value={report.numberOfRegEmployees}
              onChange={(event) => onChange({ numberOfRegEmployees: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="No. Contr. Employees"
              type="number"
              value={report.numberOfContrEmployees}
              onChange={(event) => onChange({ numberOfContrEmployees: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <RadioRow
            label="Unionized?"
            value={report.isUnionized}
            options={YES_NO_OPTIONS}
            onChange={(value) => onChange({ isUnionized: value })}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="SEC/DTI Reg. No."
              value={report.secDtiRegNo}
              onChange={(event) => onChange({ secDtiRegNo: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="SEC/DTI Reg. Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={report.secDtiRegDate}
              onChange={(event) => onChange({ secDtiRegDate: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="SEC/DTI Exp. Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={report.secDtiExpDate}
              onChange={(event) => onChange({ secDtiExpDate: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <TextField
            label="Remarks"
            value={report.employmentRemarks}
            onChange={(event) => onChange({ employmentRemarks: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Box>
    </Stack>
  );
}

function TradeCheckingSection({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: import('src/auth/admin-context').CiTradeEntry[];
  onChange: (next: import('src/auth/admin-context').CiTradeEntry[]) => void;
}) {
  const update = (id: string, data: Partial<import('src/auth/admin-context').CiTradeEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([
      ...entries,
      { id: crypto.randomUUID(), name: '', address: '', contactNumber: '', natureOfDealing: '', yearsOfDealing: '' },
    ]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Trade Checking — {title}</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`${title.slice(0, -1)} ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Name"
                  value={entry.name}
                  onChange={(event) => update(entry.id, { name: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Contact Number"
                  value={entry.contactNumber}
                  onChange={(event) => update(entry.id, { contactNumber: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <TextField
                label="Address"
                value={entry.address}
                onChange={(event) => update(entry.id, { address: event.target.value })}
                sx={fieldSx}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Nature of Dealing"
                  value={entry.natureOfDealing}
                  onChange={(event) => update(entry.id, { natureOfDealing: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Years of Dealing"
                  value={entry.yearsOfDealing}
                  onChange={(event) => update(entry.id, { yearsOfDealing: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add {title.slice(0, -1)}
        </Button>
      </Stack>
    </Stack>
  );
}

function OtherIncomeSection({
  entries,
  onChange,
}: {
  entries: import('src/auth/admin-context').CiIncomeSourceEntry[];
  onChange: (next: import('src/auth/admin-context').CiIncomeSourceEntry[]) => void;
}) {
  const update = (id: string, data: Partial<import('src/auth/admin-context').CiIncomeSourceEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([...entries, { id: crypto.randomUUID(), source: '', monthlyAmount: '', remarks: '' }]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Other Source of Income</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Source ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Source"
                value={entry.source}
                onChange={(event) => update(entry.id, { source: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
              <TextField
                label="Monthly Amount"
                type="number"
                value={entry.monthlyAmount}
                onChange={(event) => update(entry.id, { monthlyAmount: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Remarks"
                value={entry.remarks}
                onChange={(event) => update(entry.id, { remarks: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Source
        </Button>
      </Stack>
    </Stack>
  );
}

function BankVerificationSection({
  entries,
  onChange,
}: {
  entries: import('src/auth/admin-context').CiBankAccountEntry[];
  onChange: (next: import('src/auth/admin-context').CiBankAccountEntry[]) => void;
}) {
  const update = (id: string, data: Partial<import('src/auth/admin-context').CiBankAccountEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([
      ...entries,
      { id: crypto.randomUUID(), bankName: '', accountType: '', accountNumber: '', averageMonthlyBalance: '' },
    ]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Bank Verification</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Account ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Bank Name"
                value={entry.bankName}
                onChange={(event) => update(entry.id, { bankName: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Account Type"
                value={entry.accountType}
                onChange={(event) => update(entry.id, { accountType: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
              <TextField
                label="Account Number"
                value={entry.accountNumber}
                onChange={(event) => update(entry.id, { accountNumber: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Average Monthly Balance"
                type="number"
                value={entry.averageMonthlyBalance}
                onChange={(event) => update(entry.id, { averageMonthlyBalance: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Bank Account
        </Button>
      </Stack>
    </Stack>
  );
}

const NEGATIVE_FINDING_OPTIONS: {
  value: 'no-negative-findings-both-cmap-nfis' | 'negative-findings-found';
  label: string;
}[] = [
  { value: 'no-negative-findings-both-cmap-nfis', label: 'No negative findings both CMAP & NFIS' },
  { value: 'negative-findings-found', label: 'Negative findings found' },
];

function NegativeRecordSection({
  report,
  applicantName,
  onChange,
}: {
  report: import('src/auth/admin-context').CiReport;
  applicantName: string;
  onChange: (data: Partial<import('src/auth/admin-context').CiReport>) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionLabel>Negative Record</SectionLabel>
      <Box sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
        <Stack spacing={2}>
          <Typography sx={{ fontSize: 12.5, color: '#5A6273', lineHeight: 1.6 }}>
            {report.negativeRecordSourceNote}
            {report.visitDate || '[visit date pending]'}
          </Typography>
          <RadioRow
            label={`${applicantName} — Borrower`}
            value={report.negativeRecordFinding}
            options={NEGATIVE_FINDING_OPTIONS}
            onChange={(value) => onChange({ negativeRecordFinding: value })}
          />
          <RichTextField
            label="Remarks"
            value={report.negativeRecordRemarks}
            onChange={(html) => onChange({ negativeRecordRemarks: html })}
            placeholder="Details on any negative findings…"
          />
        </Stack>
      </Box>
    </Stack>
  );
}

function ComakerSection({ comakers }: { comakers: import('src/auth/admin-context').CiComakerEntry[] }) {
  return (
    <Stack spacing={1.5}>
      <SectionLabel>Comaker</SectionLabel>
      {comakers.length === 0 ? (
        <Box sx={{ p: 2, borderRadius: '11px', border: '1px dashed #DDE1EA', bgcolor: '#FAFBFD' }}>
          <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
            No data found. Please add comaker information on Call Report.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {comakers.map((comaker) => (
            <Box key={comaker.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
                {comaker.name || 'Unnamed comaker'}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>
                {comaker.relationshipToBorrower && `${comaker.relationshipToBorrower} · `}
                {comaker.address}
                {comaker.contactNumber && ` · ${comaker.contactNumber}`}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
```

- [ ] **Step 5: Verify types and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -i "ci-report-card"`
Expected: no output.

Run: `npx tsc --noEmit -p . 2>&1`
Expected: no output at all (the whole project compiles clean — this is the point where Task 4/5/6's intentionally-broken intermediate state is fully resolved).

Run: `npx eslint src/sections/admin/credit-investigation/ci-report-card.tsx`
Expected: no output. If ESLint flags the `import('src/auth/admin-context').CiReport` inline-import-type style used throughout the new section components, replace those inline `import(...)` type references with proper named type imports at the top of the file instead (`import type { CiReport, CiTradeEntry, CiIncomeSourceEntry, CiBankAccountEntry, CiComakerEntry } from 'src/auth/admin-context';`) and re-run lint — inline `import()` types are valid TypeScript but this codebase's existing files (checked in Tasks 1–6) consistently use top-level `import type { ... }` instead, so prefer matching that convention if lint or a fresh read of neighboring files calls it out.

- [ ] **Step 6: Manual click-through verification**

Start the dev server if not already running: `npm run dev` (or confirm one is already running on an existing port).

Log in as admin (`admin@pgfinance.com.ph` / `Admin123` — confirmed working credentials from earlier in this session) and seed `hhc-lms-registration` localStorage with a sample application (same seeding shape used earlier this session — married applicant with `personalInfo`/`financialInfo` populated, so pre-fill has something to display). Navigate to `/admin/applications/1/credit-investigation`, approve/set the CI Fee to unlock the CI Report, and confirm:
- The header block shows a real Residence Address (not "Not on file").
- Employment Status field shows the pre-filled value, read-only.
- Loan Purpose shows the pre-filled value, editable.
- Spouse shows a pre-filled scaffold (since the seeded applicant is married).
- Every `RichTextField` toolbar (Bold/Italic/bullet/numbered list) actually formats text when clicked.
- Add/Remove works on Children, Suppliers, Customers, Other Source of Income, Bank Verification.
- Comaker shows "No data found..." (no comakers added on Call Report yet for this seeded application).
- Uploading a transcript file changes Residence/Employment/Negative Record fields and shows an AI Summary box.
- No console errors (`console --errors` if using a Playwright driver, or check DevTools directly).

- [ ] **Step 7: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation/ci-report-card.tsx
git commit -m "$(cat <<'EOF'
Complete CI Report rewrite: Residence/Neighborhood through Recommendation

Finishes the ~15-section CI Report — Residence/Neighborhood and
Employment structured boxes, Trade Checking (Suppliers/Customers),
Assets, Other Source of Income, Loan Purpose, Bank Verification,
Negative Record, read-only Comaker (from Call Report), Health and
Habits, Comments, and Recommendation. Full project now compiles
clean end to end.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update Credit Investigation's Fill/Remove Sample Data for the new CI Report shape

**Files:**
- Modify: `src/sections/admin/credit-investigation-view.tsx`

**Interfaces:**
- Consumes: rewritten `CiReport` (Task 4), `buildTranscriptAutoFill` (Task 5).

**Context:** Earlier this session, Credit Investigation gained a "Fill with Sample Data"/"Remove Sample Data" page action (`handleFillSampleData`/`handleClearSampleData` in `credit-investigation-view.tsx`) that fills CI Fee + the old 5-field CI Report shape. It needs updating for the new field set.

- [ ] **Step 1: Read the current implementation**

Run: `grep -n "handleFillSampleData\|handleClearSampleData" src/sections/admin/credit-investigation-view.tsx`

Read both functions in full via the file offsets returned.

- [ ] **Step 2: Rewrite the CI Report portion of `handleFillSampleData`**

Find the `setCiReport({...})` call inside `handleFillSampleData` (it currently sets `visitDate`, `visitTime`, `visitLocation`, `visitingOfficer`, `identityConfirmed`, `residenceConfirmed`, `businessConfirmed`, `neighborhoodFeedback`, `neighborhoodStanding`, `findings`, `recommendation`, `recommendationNotes`, `transcriptFileName`, `transcriptUploadedAt`). Replace that entire call with:

```ts
    const autoFill = buildTranscriptAutoFill(
      [signUpData?.email ?? '', 'sample-transcript.pdf'],
      applicantName
    );
    setCiReport({
      visitDate: new Date().toISOString().slice(0, 10),
      subjectAsOf: autoFill.findingsNarrativeHtml,
      spouseNotes: '',
      residenceLeasedType: autoFill.residenceLeasedType,
      residenceLengthOfStay: autoFill.residenceLengthOfStay,
      residenceLandmark: 'Near the public market',
      residenceRemarks: '',
      presentAddress: report.residencePermanentAddress,
      presentLeasedType: autoFill.residenceLeasedType,
      presentLengthOfStay: autoFill.residenceLengthOfStay,
      presentLandmark: '',
      presentRemarks: '',
      employmentType: autoFill.employmentType,
      employerName: 'Sample Employer Inc.',
      position: 'Staff',
      employerAddress: 'Makati City, Metro Manila',
      employerTelNo: '028123456',
      employerEmail: 'hr@sampleemployer.example',
      salary: '25000',
      annualIncome: '300000',
      lengthOfService: autoFill.lengthOfService,
      numberOfRegEmployees: '50',
      numberOfContrEmployees: '10',
      isUnionized: 'no',
      secDtiRegNo: '',
      secDtiRegDate: '',
      secDtiExpDate: '',
      employmentRemarks: '',
      assetsNotes: '<p>Family residence, one motor vehicle.</p>',
      negativeRecordFinding: autoFill.negativeRecordFinding,
      negativeRecordRemarks: '<p>No adverse findings noted at time of visit.</p>',
      healthAndHabitsNotes: '<p>No notable health concerns observed.</p>',
      commentsNotes: '<p>Application supported by consistent findings across all verification points.</p>',
      recommendation: 'proceed-as-requested',
      recommendationNotes: 'Findings support proceeding with the loan as requested.',
      transcriptFileName: 'sample-transcript.pdf',
      transcriptUploadedAt: new Date().toISOString(),
    });
```

This references `report.residencePermanentAddress`, so confirm `report` (i.e. `review.creditInvestigation.report`) is already in scope inside `handleFillSampleData` — if not, add `review.creditInvestigation.report` to the destructure at the top of `CreditInvestigationView` (check the existing `const { documents: customDocuments, ciFeeStatus } = review.creditInvestigation;` line and extend it to also pull `report`).

- [ ] **Step 3: Rewrite the CI Report portion of `handleClearSampleData`**

Find the equivalent `setCiReport({...})` inside `handleClearSampleData` and replace it with:

```ts
    setCiReport({
      visitDate: '',
      subjectAsOf: '',
      spouseNotes: '',
      residenceLeasedType: '',
      residenceLengthOfStay: '',
      residenceLandmark: '',
      residenceRemarks: '',
      presentAddress: '',
      presentLeasedType: '',
      presentLengthOfStay: '',
      presentLandmark: '',
      presentRemarks: '',
      employmentType: '',
      employerName: '',
      position: '',
      employerAddress: '',
      employerTelNo: '',
      employerEmail: '',
      salary: '',
      annualIncome: '',
      lengthOfService: '',
      numberOfRegEmployees: '',
      numberOfContrEmployees: '',
      isUnionized: '',
      secDtiRegNo: '',
      secDtiRegDate: '',
      secDtiExpDate: '',
      employmentRemarks: '',
      assetsNotes: '',
      negativeRecordFinding: '',
      negativeRecordRemarks: '',
      healthAndHabitsNotes: '',
      commentsNotes: '',
      recommendation: '',
      recommendationNotes: '',
      transcriptFileName: null,
      transcriptUploadedAt: null,
    });
```

Note: `employmentStatus`, `loanPurposeNotes`, `residencePermanentAddress`, and `children`/`suppliers`/`customers`/`otherIncomeSources`/`bankAccounts` are deliberately **not** reset here — the first three are pre-filled from application data (Task 6's `useEffect`), and re-clearing them would just cause the `useEffect` to immediately re-fill them since it fires whenever the target field is empty; the array fields aren't part of "sample data" in the way the rest of this app's Fill/Remove convention treats arrays (compare: Requirement Checklist's clear function also leaves `appraisalGroups` alone in some paths — check `handleClearSampleData` patterns elsewhere in this codebase if this feels inconsistent, but do not add array-clearing here unless a manual test shows it's actually needed for a clean blank-slate result).

- [ ] **Step 4: Verify types and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p . 2>&1 | grep -i "credit-investigation-view"`
Expected: no output.

Run: `npx eslint src/sections/admin/credit-investigation-view.tsx`
Expected: no output.

- [ ] **Step 5: Manual verification**

In the running dev server, open Credit Investigation for the live application, click the settings gear → "Fill with Sample Data", confirm the CI Report card populates with the new field set with no console errors, then click "Remove Sample Data" and confirm it returns to a blank/pre-filled-only state without errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation-view.tsx
git commit -m "$(cat <<'EOF'
Update Credit Investigation's sample-data fill/clear for the new CI Report

handleFillSampleData/handleClearSampleData now target the rewritten
CiReport field set instead of the removed Site Visit/Borrower-
Residence-Verification/Findings fields.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Update `docs/ADMIN_CREDIT_INVESTIGATION.md` for the new CI Report

**Files:**
- Modify: `docs/ADMIN_CREDIT_INVESTIGATION.md`

**Interfaces:**
- Consumes: nothing (documentation only).

- [ ] **Step 1: Find and replace the "## CI Report" section**

Run: `grep -n "^## CI Report" docs/ADMIN_CREDIT_INVESTIGATION.md`

Read that section in full (from its heading to the next `## ` heading).

- [ ] **Step 2: Rewrite the section**

Replace the entire "## CI Report" section's body with a description matching the new implementation, covering:
- The full list of ~15 sections in order (Header, Date Inspected, Subject As Of, Spouse, Children, Residence/Neighborhood, Employment, Trade Checking, Assets, Other Source of Income, Loan Purpose, Bank Verification, Negative Record, Comaker, Health and Habits, Comments, Recommendation), each with a one-line description of what it covers.
- Which fields pre-fill from application data on first open (header address, Employment Status, Loan Purpose, Spouse scaffold) vs. which start blank.
- The `RichTextField` component and where it's used (link to the component file).
- That Comaker is read-only here and sourced from `review.callReport.comakers` — link to `docs/ADMIN_CALL_REPORT.md`'s new Comaker section for the write side.
- That transcript upload auto-fills residence lease/length, employment type/length of service, and negative-record finding only — not the header, Loan Purpose, or Comaker.
- Reference the design spec: `docs/superpowers/specs/2026-08-06-ci-report-redesign-design.md`.

Write this as flowing prose matching this file's existing style (see the "Document Checklist" section immediately above it for tone/format), not a bare bullet dump.

- [ ] **Step 3: Update the maintenance-rule header comment**

Find the `> **Maintenance rule:**` block near the top of the file and add `ci-report-card.tsx` and `../../components/rich-text-field/rich-text-field.tsx` to its list of files that trigger a doc update, if `ci-report-card.tsx` isn't already listed (check first — it may already be covered by `credit-investigation/ci-report-card.tsx` in the existing list).

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add docs/ADMIN_CREDIT_INVESTIGATION.md
git commit -m "$(cat <<'EOF'
Document the redesigned CI Report

Replaces the old 5-section description with the new ~15-section
structure, pre-fill sources, RichTextField usage, and the Comaker
read-only link to Call Report's new section.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full project type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit -p .`
Expected: no output.

- [ ] **Step 2: Full project lint on every file touched this plan**

Run:
```bash
npx eslint \
  src/components/rich-text-field/rich-text-field.tsx \
  src/components/rich-text-field/index.ts \
  src/auth/admin-context.tsx \
  src/sections/admin/call-report/comaker-information-card.tsx \
  src/sections/admin/call-report-view.tsx \
  src/sections/admin/credit-investigation-transcript.ts \
  src/sections/admin/credit-investigation/ci-report-card.tsx \
  src/sections/admin/credit-investigation-view.tsx
```
Expected: no output.

- [ ] **Step 3: Full manual click-through**

With the dev server running and logged in as admin:
1. Open Call Report for the live application, scroll to the new Comaker section (12th card), add a comaker, fill its fields, confirm it persists across navigation away and back.
2. Open Credit Investigation, unlock CI Report (approve or mark CI Fee not-applicable), confirm the Comaker section in CI Report now shows the comaker just added on Call Report, read-only.
3. Confirm every `RichTextField` in CI Report (Subject As Of, Spouse, Assets, Negative Record Remarks, Health and Habits, Comments) accepts Bold/Italic/bullet/numbered-list formatting and persists it across a page reload (reload the browser tab, confirm the formatted HTML is still there — this validates the HTML-string persistence round-trips through `localStorage`, not just in-memory state).
4. Confirm uploading a transcript file changes the expected fields and shows an AI Summary.
5. Confirm Credit Investigation's Fill/Remove Sample Data page action works cleanly in both directions.
6. Check the browser console for errors throughout (`solar:*` icon names in particular — a typo'd icon name renders a blank icon rather than throwing, so also visually confirm every icon in the new UI actually renders instead of relying on console silence alone).

- [ ] **Step 4: Report completion**

Summarize what was built, confirm all verification steps passed, and note the spec file and plan file locations for future reference. Do not commit anything in this task — it's verification-only.
