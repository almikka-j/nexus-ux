# CI Report Commercial/Consumer Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manually-picked `type: 'commercial' | 'consumer' | ''` field to the CI Report, gating `CiReportCard` to render either the existing ~15-section Consumer layout (unchanged) or a new, smaller Commercial layout (Business Profile, Location and Facility, Commercial Trade Checking, Management and Ownership with nested Stockholder → Sub-stockholder lists, Comments).

**Architecture:** Extend `CiReport` and add 4 new array-entry types in `src/auth/admin-context.tsx` (pure data, no new context setters — this app's established convention for `CiReport` arrays is "local component owns add/update/remove, calls `setCiReport({ field: nextArray })`", not dedicated context methods). Add a type selector + placeholder gate at the top of `CiReportCard`. Move the Consumer-only render body into its own function inside the existing file; add a new `ci-report-commercial-sections.tsx` file holding every new Commercial-only sub-component, imported by `ci-report-card.tsx`.

**Tech Stack:** React 18 + TypeScript, MUI v5, this app's existing `RadioRow` (`src/sections/admin/call-report/call-report-types.tsx`), `RichTextField` (`src/components/rich-text-field`), `crypto.randomUUID()` for entry ids, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-ci-report-commercial-consumer-types-design.md`

## Global Constraints

- No new context setters in `admin-context.tsx` for the new arrays (`commercialSuppliers`, `commercialCustomers`, `management`, `stockholders`, `subStockholders`) — every existing `CiReport` array (`children`, `suppliers`, `customers`, `otherIncomeSources`, `bankAccounts`) is mutated by a local component calling `onChange(nextArray)` → `setCiReport({ field: nextArray })`; the new arrays follow the identical pattern (spec's "Setters" section proposing `addCiManagement()` etc. is **superseded** — there is no such convention anywhere in this codebase for `CiReport`, confirmed by reading the actual file).
- `createInitialCiReport()` (`src/auth/admin-context.tsx`, currently ends at line ~1854 with `transcriptUploadedAt: null,`) is the single source of defaults — the existing rehydrate path at `review.creditInvestigation.report: { ...initialState.review.creditInvestigation.report, ...storedReview.creditInvestigation?.report }` already top-up-migrates any new field automatically; no new migration code needed.
- Switching `report.type` only changes which sections render — never clears or confirms (per spec's explicit direction).
- `tsc --noEmit`, `eslint`, and `next build` must all pass clean before any task is considered done (this project's standing verification rule).
- Update `docs/100-credit-investigation.md`'s "CI Report" section and `docs/240-tasks.md` (same-day entry) as part of the task that lands the corresponding behavior — not deferred to a final task.

## Review Focus

- **Type left at `''` with data already present on the other branch's fields** (e.g. an officer fills Consumer fields, then the Decision Gate "Proceed" is clicked before ever picking a type) — the existing Decision Gate has no completeness gate on `CiReport` fields today (confirmed in `docs/100-credit-investigation.md`: "nothing on this page currently blocks Proceed on CI Report field completeness"), so `type === ''` must not crash the page; the placeholder-only render must handle this cleanly.
- **A stockholder's `isCorporation` toggled from `'yes'` to `'no'` after sub-stockholders were already added** — the spec doesn't say to delete the orphaned `subStockholders` array; it must be preserved (not auto-cleared) so toggling back to `'yes'` doesn't lose data, same "never destroy data on a view-only toggle" principle the type switch itself follows.
- **Removing a stockholder that still has sub-stockholders** — must remove the whole entry (sub-stockholders included) in one `onChange` call, not leave orphaned sub-stockholder state floating with no parent.
- **Adding a sub-stockholder to one stockholder must not touch a sibling stockholder's own `subStockholders` array** — the nested setter must locate the parent by id and only map that one entry, confirmed by testing with 2+ stockholders present.
- **`isBusinessOwner`/transcript-upload code paths must keep working for Consumer** after the file split — the moved Consumer body still needs `isMarried`, `isBusinessOwner`, `aiSummary`, and the transcript `<input>` ref wiring untouched; a split that accidentally drops one of these breaks transcript auto-fill silently (no type error, since they're all optional-looking reads).

---

## Task 1: Add Commercial entry types and `CiReport` fields to `admin-context.tsx`

**Files:**
- Modify: `src/auth/admin-context.tsx:431-438` (after `CiTradeEntry`, add 4 new exported types)
- Modify: `src/auth/admin-context.tsx:799-875` (the `CiReport` type — add `type` field + Commercial-only fields)
- Modify: `src/auth/admin-context.tsx:1805-1855` (`createInitialCiReport()` — add matching defaults)
- Test: manual (`tsc --noEmit`) — this task has no runtime behavior yet, so there is no unit test; the "test" is the compiler accepting every new field with no `any`.

**Interfaces:**
- Produces: `CiReportType`, `CiCommercialTradeEntry`, `CiManagementEntry`, `CiSubStockholderEntry`, `CiStockholderEntry` (all exported from `src/auth/admin-context.tsx`), and the following new fields on `CiReport`: `type`, `businessOwner`, `businessTerritory`, `businessRegularEmployees`, `businessContractualEmployees`, `premisesConstructionDescription`, `premisesAreaDescription`, `locationOwned`, `locationOwnRentDetails`, `equipmentDescription`, `equipmentOwned`, `equipmentLeasePrice`, `commercialSuppliers`, `commercialCustomers`, `management`, `stockholders`.

- [ ] **Step 1: Add the new entry types**

Insert immediately after the existing `CiTradeEntry` type (`src/auth/admin-context.tsx:431-438`):

```ts
export type CiReportType = 'commercial' | 'consumer' | '';

export type CiCommercialTradeEntry = {
  id: string;
  companyName: string;
  contactPerson: string;
  position: string;
  mobileNumber: string;
  email: string;
  telephoneNo: string;
  localExtension: string;
  transactionDetails: string;
  paymentTerms: string;
  yearsOfContract: string;
  remarks: string;
};

export type CiManagementEntry = {
  id: string;
  fullName: string;
  birthdate: string;
  birthPlace: string;
  nationality: string;
  spousePartner: string;
  homeAddress: string;
  jobTitle: string;
  education: string;
  otherBusiness: string;
  tin: string;
  mobileNumber: string;
};

export type CiSubStockholderEntry = {
  id: string;
  name: string;
  amountSubscribed: string;
  amountPaidUp: string;
};

export type CiStockholderEntry = {
  id: string;
  stockholderName: string;
  amountSubscribed: string;
  amountPaidUp: string;
  isCorporation: 'yes' | 'no' | '';
  subStockholders: CiSubStockholderEntry[];
};
```

- [ ] **Step 2: Add the new fields to the `CiReport` type**

In `src/auth/admin-context.tsx`, inside `export type CiReport = { ... }` (currently lines 799-875), add a `type` field right after the opening brace (before the `// Site visit` comment), and a new block of Commercial-only fields right before the closing `transcriptFileName`/`transcriptUploadedAt` lines:

```ts
export type CiReport = {
  // Report type — manually picked by the officer; gates which sections
  // render in CiReportCard. '' means undecided.
  type: CiReportType;

  // Site visit
  visitDate: string;
  subjectAsOf: string; // rich text (HTML)

  // ... (all existing fields unchanged, lines 804-871 stay exactly as they are) ...

  // Business profile (Commercial only)
  businessOwner: string;
  businessTerritory: string;
  businessRegularEmployees: string;
  businessContractualEmployees: string;

  // Location and facility (Commercial only)
  premisesConstructionDescription: string;
  premisesAreaDescription: string;
  locationOwned: 'yes' | 'no' | '';
  locationOwnRentDetails: string;
  equipmentDescription: string;
  equipmentOwned: 'yes' | 'no' | '';
  equipmentLeasePrice: string;

  // Trade Checking (Commercial only) — parallel to the existing
  // suppliers/customers: CiTradeEntry[] used by the Consumer branch.
  commercialSuppliers: CiCommercialTradeEntry[];
  commercialCustomers: CiCommercialTradeEntry[];

  // Management and Ownership (Commercial only)
  management: CiManagementEntry[];
  stockholders: CiStockholderEntry[];

  // Transcript
  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};
```

(The Business Profile / Location and Facility / Trade Checking (Commercial) /
Management and Ownership blocks are new insertions; every other existing
field/comment block in `CiReport` stays exactly where it is, unchanged.)

- [ ] **Step 3: Add matching defaults to `createInitialCiReport()`**

In `src/auth/admin-context.tsx`, inside `createInitialCiReport()` (currently lines 1805-1855), add `type: '',` as the very first field, and add the new Commercial defaults right before the existing `transcriptFileName: null,` line:

```ts
function createInitialCiReport(): CiReport {
  return {
    type: '',
    visitDate: '',
    subjectAsOf: '',
    // ... all existing fields unchanged ...
    businessOwner: '',
    businessTerritory: '',
    businessRegularEmployees: '',
    businessContractualEmployees: '',
    premisesConstructionDescription: '',
    premisesAreaDescription: '',
    locationOwned: '',
    locationOwnRentDetails: '',
    equipmentDescription: '',
    equipmentOwned: '',
    equipmentLeasePrice: '',
    commercialSuppliers: [],
    commercialCustomers: [],
    management: [],
    stockholders: [],
    transcriptFileName: null,
    transcriptUploadedAt: null,
  };
}
```

- [ ] **Step 4: Typecheck**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: no errors. (`ci-report-card.tsx` doesn't yet reference any new field, so this should be clean — if it isn't, the new type/field additions have a typo.)

- [ ] **Step 5: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx
git commit -m "feat: add CiReport Commercial fields and entry types"
```

---

## Task 2: Export `SectionLabel`/`fieldSx` from `ci-report-card.tsx`, add the type selector + placeholder gate

**Files:**
- Modify: `src/sections/admin/credit-investigation/ci-report-card.tsx:52,54` (export `fieldSx`/`SectionLabel`)
- Modify: `src/sections/admin/credit-investigation/ci-report-card.tsx:62-317` (the `CiReportCard` function body — add the type selector and branch the render)
- Test: manual (dev server) — this task has no array logic yet, so correctness is verified by toggling the selector and seeing the right placeholder/branch.

**Interfaces:**
- Consumes: nothing from Task 1 directly yet beyond the `type`/`CiReportType` field already on `report`.
- Produces: `export const fieldSx`, `export function SectionLabel` (both now importable by the new file in Task 3); `CiReportCard`'s render is restructured to: header + transcript row (only once `type !== ''`) + `type === 'consumer' ? <ConsumerReportSections .../> : type === 'commercial' ? <CommercialReportSections .../> : <placeholder>`.

- [ ] **Step 1: Export `fieldSx` and `SectionLabel`**

In `src/sections/admin/credit-investigation/ci-report-card.tsx`, change line 52 and the function at line 54:

```ts
export const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } };

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', letterSpacing: '0.02em' }}>
      {children}
    </Typography>
  );
}
```

- [ ] **Step 2: Add the `YES_NO_OPTIONS`-style import check**

Confirm `YES_NO_OPTIONS` (defined at `src/sections/admin/credit-investigation/ci-report-card.tsx:503`, shape `{ value: 'yes' | 'no'; label: string }[]`) stays where it is — Task 3's new file will need its own copy or an export; export it too in this step by adding `export` in front of its existing `const YES_NO_OPTIONS` declaration:

```ts
export const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];
```

- [ ] **Step 3: Rename the existing JSX render body into `ConsumerReportSections`**

In `ci-report-card.tsx`, the current `CiReportCard` function (lines 62-317) renders a single JSX tree. Split it: everything from the opening `<Stack spacing={2.5}>` (line 203) through the closing `</Stack>` right before the final `</Box>` (line 315) — i.e. every section from "Date Inspected" through "Recommendation" — becomes the body of a new component:

```tsx
function ConsumerReportSections({
  report,
  onChange,
  comakers,
  applicantName,
  isBusinessOwner,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
  comakers: CiComakerEntry[];
  applicantName: string;
  isBusinessOwner: boolean;
}) {
  return (
    <Stack spacing={2.5}>
      <TextField
        label="Date Inspected"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={report.visitDate}
        onChange={(event) => onChange({ visitDate: event.target.value })}
        sx={{ ...fieldSx, maxWidth: { sm: 260 } }}
      />

      <RichTextField
        label="Subject As Of"
        value={report.subjectAsOf}
        onChange={(html) => onChange({ subjectAsOf: html })}
        placeholder="Summary of the investigation as of the visit date…"
      />

      <RichTextField
        label="Spouse"
        value={report.spouseNotes}
        onChange={(html) => onChange({ spouseNotes: html })}
        placeholder="Spouse name, citizenship, and any relevant notes…"
      />

      <ChildrenSection
        entries={report.children}
        onChange={(children) => onChange({ children })}
      />

      <ResidenceNeighborhoodSection report={report} onChange={onChange} />

      <EmploymentSection report={report} onChange={onChange} isBusinessOwner={isBusinessOwner} />

      <TradeCheckingSection
        title="Suppliers"
        entries={report.suppliers}
        onChange={(suppliers) => onChange({ suppliers })}
      />
      <TradeCheckingSection
        title="Customers"
        entries={report.customers}
        onChange={(customers) => onChange({ customers })}
      />

      <RichTextField
        label="Assets"
        value={report.assetsNotes}
        onChange={(html) => onChange({ assetsNotes: html })}
        placeholder="Real property, vehicles, and other notable assets…"
      />

      <OtherIncomeSection
        entries={report.otherIncomeSources}
        onChange={(otherIncomeSources) => onChange({ otherIncomeSources })}
      />

      <RichTextField
        label="Loan Purpose (Required)"
        value={report.loanPurposeNotes}
        onChange={(html) => onChange({ loanPurposeNotes: html })}
        placeholder="What the loan proceeds will be used for…"
      />

      <BankVerificationSection
        entries={report.bankAccounts}
        onChange={(bankAccounts) => onChange({ bankAccounts })}
      />

      <NegativeRecordSection report={report} applicantName={applicantName} onChange={onChange} />

      <ComakerSection comakers={comakers} />

      <RichTextField
        label="Health and Habits"
        value={report.healthAndHabitsNotes}
        onChange={(html) => onChange({ healthAndHabitsNotes: html })}
        placeholder="Lifestyle, health, or habit observations relevant to the investigation…"
      />

      <RichTextField
        label="Comments"
        value={report.commentsNotes}
        onChange={(html) => onChange({ commentsNotes: html })}
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
            onChange({ recommendation: event.target.value as typeof report.recommendation })
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
          onChange={(event) => onChange({ recommendationNotes: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Stack>
  );
}
```

Place this new function immediately after the `CiReportCard` function closes (i.e. right where the old "Array-entry sub-sections" comment block already begins, before `ChildrenSection`) — it calls `onChange`, not `setCiReport`, since `CiReportCard` will now pass its own `setCiReport` down as `onChange`.

- [ ] **Step 4: Replace `CiReportCard`'s render with the type selector and branching**

In `CiReportCard` (lines 62-317), replace everything from the return statement's `<Stack spacing={2.5}>` (line 203) through its matching closing tag with:

```tsx
  return (
    <Box sx={adminCardSx}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Report</Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the site-visit transcript to auto-fill applicable fields, or type directly into any field below.
      </Typography>

      <Stack spacing={1.5} sx={{ mb: report.type ? 2.5 : 0 }}>
        <SectionLabel>Report Type</SectionLabel>
        <RadioRow
          label="Is this a Commercial or Consumer investigation?"
          value={report.type}
          options={[
            { value: 'commercial' as const, label: 'Commercial' },
            { value: 'consumer' as const, label: 'Consumer' },
          ]}
          onChange={(value) => setCiReport({ type: value })}
        />
      </Stack>

      {!report.type && (
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', fontStyle: 'italic' }}>
          Select a report type to continue.
        </Typography>
      )}

      {report.type !== '' && (
        <>
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

          {report.type === 'consumer' && (
            <ConsumerReportSections
              report={report}
              onChange={setCiReport}
              comakers={comakers}
              applicantName={applicantName}
              isBusinessOwner={isBusinessOwner}
            />
          )}
          {report.type === 'commercial' && (
            <CommercialReportSections report={report} onChange={setCiReport} />
          )}
        </>
      )}
    </Box>
  );
}
```

Note the Residence/Business address header block (previously always shown)
now renders for *both* types, directly above the branch — the Commercial
screenshot's own header line ("Date inspected") is handled inside
`CommercialReportSections` itself (Task 3), not here; this shared header
block stays exactly as it already was.

- [ ] **Step 5: Add the `CommercialReportSections` import**

At the top of `ci-report-card.tsx`, add:

```ts
import { CommercialReportSections } from './ci-report-commercial-sections';
```

(This import will fail to resolve until Task 3 creates the file — that's
expected; Task 3 must land before this task's build/typecheck can pass.
If executing tasks in strict order, treat Tasks 2 and 3 as one combined
checkpoint for the "typecheck must pass" step, or create an empty
`export function CommercialReportSections() { return null; }` stub in
`ci-report-commercial-sections.tsx` first so Task 2 can be verified in
isolation, then replace the stub in Task 3.)

- [ ] **Step 6: Create the stub so Task 2 can be verified standalone**

Create `src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx`:

```tsx
'use client';

import type { CiReport } from 'src/auth/admin-context';

export function CommercialReportSections({
  report,
  onChange,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
}) {
  return null;
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit && npx eslint src/sections/admin/credit-investigation/ci-report-card.tsx src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx`
Expected: no errors. (The stub's unused `report`/`onChange` params will trigger a lint warning for unused vars in some configs — if so, prefix both with `_` in the stub only: `_report`, `_onChange`; Task 3 replaces this whole file anyway.)

- [ ] **Step 8: Manual check in dev server**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npm run dev` (or confirm one is already running), then open `/admin/applications/[id]/credit-investigation` for any application with CI Fee approved (so the CI Report card is unlocked). Confirm:
- The Report Type radio row appears, nothing else below it until a type is picked.
- Picking "Consumer" reveals the full existing 15-section form exactly as before (transcript upload, AI Summary once a transcript is uploaded, every section through Recommendation).
- Picking "Commercial" reveals the header address block, then nothing (stub renders `null`) — expected until Task 3.
- Switching back and forth between Commercial and Consumer after typing into a Consumer field (e.g. Subject As Of) does not clear that field — switch to Commercial, back to Consumer, confirm the typed text is still there.

- [ ] **Step 9: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation/ci-report-card.tsx src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx
git commit -m "feat: add CI Report type selector and Consumer/Commercial branch"
```

---

## Task 3: Build `CommercialReportSections` — Business Profile, Location and Facility, Commercial Trade Checking

**Files:**
- Modify: `src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx` (replace the stub with the real component plus its own sub-components)
- Test: manual (dev server) — fill every field in these three sections, confirm values persist across a page interaction (e.g. typing in one field doesn't reset another).

**Interfaces:**
- Consumes: `CiReport`, `CiCommercialTradeEntry` (from `src/auth/admin-context.tsx`, Task 1), `SectionLabel`, `fieldSx`, `YES_NO_OPTIONS` (exported from `ci-report-card.tsx`, Task 2), `RadioRow` (`src/sections/admin/call-report/call-report-types.tsx`), `Iconify` (`src/components/iconify`), `outlinedNavyButtonSx` (`src/components/admin-ui`).
- Produces: `CommercialReportSections({ report, onChange }: { report: CiReport; onChange: (data: Partial<CiReport>) => void })` — renders Business Profile, Location and Facility, and (via a new local `CommercialTradeCheckingSection` sub-component) Suppliers + Customers using `report.commercialSuppliers`/`report.commercialCustomers`. Management and Ownership is NOT yet included — that's Task 4.

- [ ] **Step 1: Write the real file**

Replace the stub in `src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx` with:

```tsx
'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { Iconify } from 'src/components/iconify';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';

import { RadioRow } from '../call-report/call-report-types';
import { fieldSx, SectionLabel, YES_NO_OPTIONS } from './ci-report-card';

import type { CiReport, CiCommercialTradeEntry } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Commercial-type CI Report sections — Business Profile, Location and
// Facility, Trade Checking (Commercial shape: company-level contact
// fields, distinct from the Consumer branch's CiTradeEntry), and (added
// in a follow-up task) Management and Ownership. Mirrors the existing
// Consumer sections' "local component owns add/update/remove, calls
// onChange({ field: nextArray })" convention — no dedicated context
// setters exist for any CiReport array, Commercial included.
// ----------------------------------------------------------------------

function createCommercialTradeEntry(): CiCommercialTradeEntry {
  return {
    id: crypto.randomUUID(),
    companyName: '',
    contactPerson: '',
    position: '',
    mobileNumber: '',
    email: '',
    telephoneNo: '',
    localExtension: '',
    transactionDetails: '',
    paymentTerms: '',
    yearsOfContract: '',
    remarks: '',
  };
}

function CommercialTradeCheckingSection({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: CiCommercialTradeEntry[];
  onChange: (next: CiCommercialTradeEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiCommercialTradeEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () => onChange([...entries, createCommercialTradeEntry()]);

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
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Company</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Company name"
                  value={entry.companyName}
                  onChange={(event) => update(entry.id, { companyName: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Contact person"
                  value={entry.contactPerson}
                  onChange={(event) => update(entry.id, { contactPerson: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Position"
                  value={entry.position}
                  onChange={(event) => update(entry.id, { position: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Contact details</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Mobile number"
                  value={entry.mobileNumber}
                  onChange={(event) => update(entry.id, { mobileNumber: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Email address"
                  value={entry.email}
                  onChange={(event) => update(entry.id, { email: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Telephone no."
                  value={entry.telephoneNo}
                  onChange={(event) => update(entry.id, { telephoneNo: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Local/extension"
                  value={entry.localExtension}
                  onChange={(event) => update(entry.id, { localExtension: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Transaction</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Transaction details"
                  value={entry.transactionDetails}
                  onChange={(event) => update(entry.id, { transactionDetails: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Payment terms"
                  value={entry.paymentTerms}
                  onChange={(event) => update(entry.id, { paymentTerms: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Years of contract"
                  value={entry.yearsOfContract}
                  onChange={(event) => update(entry.id, { yearsOfContract: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Notes</Typography>
              <TextField
                label="Remarks"
                value={entry.remarks}
                onChange={(event) => update(entry.id, { remarks: event.target.value })}
                sx={fieldSx}
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
          Add {title.slice(0, -1)}
        </Button>
      </Stack>
    </Stack>
  );
}

export function CommercialReportSections({
  report,
  onChange,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
}) {
  return (
    <Stack spacing={2.5}>
      <Stack spacing={1.5}>
        <SectionLabel>Business Profile</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Owner"
            value={report.businessOwner}
            onChange={(event) => onChange({ businessOwner: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Territory"
            value={report.businessTerritory}
            onChange={(event) => onChange({ businessTerritory: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="No. of regular employees"
            value={report.businessRegularEmployees}
            onChange={(event) => onChange({ businessRegularEmployees: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="No. of contractual employees"
            value={report.businessContractualEmployees}
            onChange={(event) => onChange({ businessContractualEmployees: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>
      </Stack>

      <Stack spacing={1.5}>
        <SectionLabel>Location and Facility</SectionLabel>
        <Box sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
          <Stack spacing={2}>
            <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Premises</Typography>
            <TextField
              label="Construction description"
              value={report.premisesConstructionDescription}
              onChange={(event) => onChange({ premisesConstructionDescription: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              label="Area description"
              value={report.premisesAreaDescription}
              onChange={(event) => onChange({ premisesAreaDescription: event.target.value })}
              sx={fieldSx}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
              <RadioRow
                label="Location owned?"
                value={report.locationOwned}
                options={YES_NO_OPTIONS}
                onChange={(value) => onChange({ locationOwned: value })}
              />
              <TextField
                label="Own or rent (details)"
                value={report.locationOwnRentDetails}
                onChange={(event) => onChange({ locationOwnRentDetails: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>

            <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Equipment</Typography>
            <TextField
              label="Equipment"
              value={report.equipmentDescription}
              onChange={(event) => onChange({ equipmentDescription: event.target.value })}
              sx={fieldSx}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
              <RadioRow
                label="Equipment owned?"
                value={report.equipmentOwned}
                options={YES_NO_OPTIONS}
                onChange={(value) => onChange({ equipmentOwned: value })}
              />
              <TextField
                label="Equipment lease price"
                value={report.equipmentLeasePrice}
                onChange={(event) => onChange({ equipmentLeasePrice: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
          </Stack>
        </Box>
      </Stack>

      <CommercialTradeCheckingSection
        title="Suppliers"
        entries={report.commercialSuppliers}
        onChange={(commercialSuppliers) => onChange({ commercialSuppliers })}
      />
      <CommercialTradeCheckingSection
        title="Customers"
        entries={report.commercialCustomers}
        onChange={(commercialCustomers) => onChange({ commercialCustomers })}
      />
    </Stack>
  );
}
```

Note: `Typography` is used above but not yet imported in this snippet — add
`import Typography from '@mui/material/Typography';` to the import block at
the top of the file alongside the other MUI imports.

- [ ] **Step 2: Typecheck and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit && npx eslint src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx`
Expected: no errors.

- [ ] **Step 3: Manual check in dev server**

With a Commercial-type report selected on `/admin/applications/[id]/credit-investigation`:
- Fill Owner, Territory, both employee-count fields in Business Profile — confirm each keeps its own value independently (typing in one doesn't clear another).
- Fill Construction description, Area description, toggle "Location owned?" Yes/No, fill "Own or rent (details)", fill Equipment, toggle "Equipment owned?", fill "Equipment lease price" — confirm all persist.
- Click "Add Supplier" twice, fill different Company names in each, click "Remove" on the first — confirm only that one disappears and the second's data is intact.
- Repeat for "Add Customer".

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx
git commit -m "feat: add Commercial Business Profile, Location and Facility, Trade Checking sections"
```

---

## Task 4: Add Management and Ownership (Management, Stockholders, nested Sub-stockholders) + Comments to `CommercialReportSections`

**Files:**
- Modify: `src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx` (add `ManagementSection`, `StockholdersSection`, a nested sub-stockholder block, and the Comments `RichTextField`; wire all into `CommercialReportSections`)
- Test: manual (dev server) — this is where the Review Focus items about orphaned/nested state must be verified by hand, since there's no automated test harness in this codebase for this kind of UI state.

**Interfaces:**
- Consumes: `CiManagementEntry`, `CiStockholderEntry`, `CiSubStockholderEntry` (Task 1), `RichTextField` (`src/components/rich-text-field`).
- Produces: `CommercialReportSections` now renders the full section list described in the spec, in order: Business Profile, Location and Facility, Trade Checking (Suppliers, Customers), Management and Ownership (Management, Major Stockholders with nested Sub-stockholders), Comments.

- [ ] **Step 1: Add the `ManagementSection` sub-component**

In `ci-report-commercial-sections.tsx`, add (anywhere after `CommercialTradeCheckingSection`, before `CommercialReportSections`):

```tsx
function createManagementEntry(): CiManagementEntry {
  return {
    id: crypto.randomUUID(),
    fullName: '',
    birthdate: '',
    birthPlace: '',
    nationality: '',
    spousePartner: '',
    homeAddress: '',
    jobTitle: '',
    education: '',
    otherBusiness: '',
    tin: '',
    mobileNumber: '',
  };
}

function ManagementSection({
  entries,
  onChange,
}: {
  entries: CiManagementEntry[];
  onChange: (next: CiManagementEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiManagementEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () => onChange([...entries, createManagementEntry()]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Management</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Manager ${index + 1}`}
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
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Personal</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Full name"
                  value={entry.fullName}
                  onChange={(event) => update(entry.id, { fullName: event.target.value })}
                  sx={{ ...fieldSx, flex: 2 }}
                />
                <TextField
                  label="Birthdate"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={entry.birthdate}
                  onChange={(event) => update(entry.id, { birthdate: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Birth place"
                  value={entry.birthPlace}
                  onChange={(event) => update(entry.id, { birthPlace: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Nationality"
                  value={entry.nationality}
                  onChange={(event) => update(entry.id, { nationality: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Spouse/partner"
                  value={entry.spousePartner}
                  onChange={(event) => update(entry.id, { spousePartner: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Home address"
                  value={entry.homeAddress}
                  onChange={(event) => update(entry.id, { homeAddress: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Position and Business</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Job title"
                  value={entry.jobTitle}
                  onChange={(event) => update(entry.id, { jobTitle: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Education"
                  value={entry.education}
                  onChange={(event) => update(entry.id, { education: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Other business"
                  value={entry.otherBusiness}
                  onChange={(event) => update(entry.id, { otherBusiness: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Identification and Contact</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="TIN"
                  value={entry.tin}
                  onChange={(event) => update(entry.id, { tin: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Mobile number"
                  value={entry.mobileNumber}
                  onChange={(event) => update(entry.id, { mobileNumber: event.target.value })}
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
          Add Management
        </Button>
      </Stack>
    </Stack>
  );
}
```

- [ ] **Step 2: Add the `StockholdersSection` sub-component with nested Sub-stockholders**

This is the one genuinely new nesting shape in this codebase — a stockholder's own `subStockholders` array is mutated by locating the parent stockholder by id within the outer `update()`, confirming the Review Focus item "adding a sub-stockholder must not touch a sibling stockholder's own array" by construction (the nested `onChange` always targets exactly one `stockholderId`). Add:

```tsx
function createStockholderEntry(): CiStockholderEntry {
  return {
    id: crypto.randomUUID(),
    stockholderName: '',
    amountSubscribed: '',
    amountPaidUp: '',
    isCorporation: '',
    subStockholders: [],
  };
}

function createSubStockholderEntry(): CiSubStockholderEntry {
  return { id: crypto.randomUUID(), name: '', amountSubscribed: '', amountPaidUp: '' };
}

function StockholdersSection({
  entries,
  onChange,
}: {
  entries: CiStockholderEntry[];
  onChange: (next: CiStockholderEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiStockholderEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  // Removing a stockholder removes its whole entry, sub-stockholders
  // included — there is no orphaned-sub-array case, since the sub array
  // lives inside the removed entry itself.
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () => onChange([...entries, createStockholderEntry()]);

  // Sub-stockholder mutations locate the parent stockholder by id, then
  // replace only that parent's own subStockholders array — a sibling
  // stockholder's subStockholders is never touched, since `entries.map`
  // only rewrites the one entry whose id matches `stockholderId`.
  const updateSub = (stockholderId: string, subId: string, data: Partial<CiSubStockholderEntry>) =>
    onChange(
      entries.map((entry) =>
        entry.id !== stockholderId
          ? entry
          : {
              ...entry,
              subStockholders: entry.subStockholders.map((sub) =>
                sub.id === subId ? { ...sub, ...data } : sub
              ),
            }
      )
    );
  const removeSub = (stockholderId: string, subId: string) =>
    onChange(
      entries.map((entry) =>
        entry.id !== stockholderId
          ? entry
          : { ...entry, subStockholders: entry.subStockholders.filter((sub) => sub.id !== subId) }
      )
    );
  const addSub = (stockholderId: string) =>
    onChange(
      entries.map((entry) =>
        entry.id !== stockholderId
          ? entry
          : { ...entry, subStockholders: [...entry.subStockholders, createSubStockholderEntry()] }
      )
    );

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Major Stockholders</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Stockholder ${index + 1}`}
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
              <Typography variant="overline" sx={{ fontSize: 11, color: '#A0A7B5' }}>Stockholder</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Stockholder name"
                  value={entry.stockholderName}
                  onChange={(event) => update(entry.id, { stockholderName: event.target.value })}
                  sx={{ ...fieldSx, flex: 2 }}
                />
                <TextField
                  label="Amount subscribed"
                  value={entry.amountSubscribed}
                  onChange={(event) => update(entry.id, { amountSubscribed: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Amount paid-up"
                  value={entry.amountPaidUp}
                  onChange={(event) => update(entry.id, { amountPaidUp: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>

              <RadioRow
                label="Is the stockholder a corporation?"
                value={entry.isCorporation}
                options={YES_NO_OPTIONS}
                onChange={(value) => update(entry.id, { isCorporation: value })}
              />

              {entry.isCorporation === 'yes' && (
                <Box sx={{ ml: { sm: 2 }, p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: 'common.white' }}>
                  <Stack spacing={1.25}>
                    <SectionLabel>Sub-stockholders</SectionLabel>
                    {entry.subStockholders.map((sub, subIndex) => (
                      <Box key={sub.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Chip
                            label={`Sub ${subIndex + 1}`}
                            size="small"
                            sx={{ bgcolor: '#F5F6FA', color: '#5A6273', fontWeight: 700 }}
                          />
                          <Button
                            onClick={() => removeSub(entry.id, sub.id)}
                            size="small"
                            startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                            sx={{ color: '#F04438' }}
                          >
                            Remove
                          </Button>
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <TextField
                            label="Sub-stockholder name"
                            value={sub.name}
                            onChange={(event) => updateSub(entry.id, sub.id, { name: event.target.value })}
                            sx={{ ...fieldSx, flex: 2 }}
                          />
                          <TextField
                            label="Amount subscribed"
                            value={sub.amountSubscribed}
                            onChange={(event) => updateSub(entry.id, sub.id, { amountSubscribed: event.target.value })}
                            sx={{ ...fieldSx, flex: 1 }}
                          />
                          <TextField
                            label="Amount paid-up"
                            value={sub.amountPaidUp}
                            onChange={(event) => updateSub(entry.id, sub.id, { amountPaidUp: event.target.value })}
                            sx={{ ...fieldSx, flex: 1 }}
                          />
                        </Stack>
                      </Box>
                    ))}
                    <Button
                      onClick={() => addSub(entry.id)}
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
                      sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
                    >
                      Add sub-stockholder
                    </Button>
                  </Stack>
                </Box>
              )}
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
          Add stockholder
        </Button>
      </Stack>
    </Stack>
  );
}
```

Note: toggling `isCorporation` from `'yes'` back to `'no'` only hides the
`entry.subStockholders.map(...)` block (the `{entry.isCorporation === 'yes' && (...)}` 
guard) — it never calls `update(entry.id, { subStockholders: [] })`, so the
data survives a later toggle back to `'yes'`. This satisfies the Review
Focus item about orphaned sub-stockholders without any special-casing.

- [ ] **Step 3: Wire both new sections plus Comments into `CommercialReportSections`**

In the same file, update the `CommercialReportSections` function (written in
Task 3) to add, after the two `CommercialTradeCheckingSection` calls and
before the closing `</Stack>`:

```tsx
      <Stack spacing={1.5}>
        <SectionLabel>Management and Ownership</SectionLabel>
        <ManagementSection
          entries={report.management}
          onChange={(management) => onChange({ management })}
        />
        <StockholdersSection
          entries={report.stockholders}
          onChange={(stockholders) => onChange({ stockholders })}
        />
      </Stack>

      <RichTextField
        label="Comments"
        value={report.commentsNotes}
        onChange={(html) => onChange({ commentsNotes: html })}
        placeholder="Any additional remarks…"
      />
```

Add the needed import at the top of the file: `import { RichTextField } from 'src/components/rich-text-field';`

- [ ] **Step 4: Typecheck and lint**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit && npx eslint src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx`
Expected: no errors.

- [ ] **Step 5: Build**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npm run build`
Expected: build succeeds with no errors (this is a full data-model + multi-file UI change, so a full build is warranted per this project's own verify-scope convention, not just typecheck+lint).

If the build fails with a stale-`.next`/`MODULE_NOT_FOUND`/`PageNotFoundError`
error unrelated to this change, check for a second concurrent `next dev`
process (`ps aux | grep "next dev"`) — a known source of build-cache
corruption in this repo during this kind of session — kill any stale one and
retry, or `rm -rf .next` and rebuild.

- [ ] **Step 6: Manual check in dev server — Review Focus verification**

With a Commercial-type report:
- Add 2 managers, fill different Full names in each, remove the first — confirm the second's data survives.
- Add 2 stockholders. Set the first's "Is the stockholder a corporation?" to Yes, add 2 sub-stockholders under it with different names. Confirm the second stockholder (still "No") shows no Sub-stockholders block and is completely unaffected.
- Toggle the first stockholder's corporation answer to "No" — confirm the Sub-stockholders block disappears. Toggle back to "Yes" — confirm both previously-entered sub-stockholders reappear with their data intact (not reset to blank).
- Remove the first stockholder entirely (the one with sub-stockholders) — confirm it's gone and the second stockholder is unaffected.
- Fill Comments, switch to Consumer and back to Commercial — confirm Comments text survives (shared field, same as `report.commentsNotes` used by both branches — this is expected to already work since both branches read/write the same field, but confirm by hand).
- With `report.type` still `''` on a different, fresh application (one that hasn't had a type picked yet), click "Proceed" on the page's Decision Gate — confirm the page does not crash (per the first Review Focus item; this exercises the `type === ''` / placeholder-only path alongside the unrelated-but-already-permissive Decision Gate).

- [ ] **Step 7: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation/ci-report-commercial-sections.tsx
git commit -m "feat: add Management, Stockholders (nested Sub-stockholders), and Comments to Commercial CI Report"
```

---

## Task 5: Update documentation

**Files:**
- Modify: `docs/100-credit-investigation.md` (the "CI Report" section)
- Modify: `docs/240-tasks.md` (same-day entry, per the standing daily-update rule)
- Test: none (docs-only) — self-review by re-reading the updated section against the actual shipped code from Tasks 1-4.

**Interfaces:**
- Consumes: nothing new; this task only describes what Tasks 1-4 built.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Rewrite the "CI Report" section of `docs/100-credit-investigation.md`**

Open the file and locate the existing `## CI Report` section (currently
starts with "`review.creditInvestigation.report: CiReport`
(`src/auth/admin-context.tsx`), rendered by `CiReportCard`..."). Add a new
paragraph immediately after the existing introductory paragraph (the one
ending "...matching a reference CI Report layout... In order:") and before
the bulleted list of sections:

```markdown
**Report Type.** Before any section renders, the officer must pick a
**Report Type** — Commercial or Consumer — via a `RadioRow` at the top of
`CiReportCard` (`report.type: CiReportType`, `'' | 'commercial' | 'consumer'`,
defaults to `''`/undecided). While `type === ''`, only the type selector and
a plain "Select a report type to continue." message render — no transcript
upload row, no sections. This is a manually-picked field, not inferred from
any existing application data (loan type, employment status, etc.).

Switching the type later only changes which section set is visible —
nothing is cleared. Both types' fields coexist on the same `CiReport`
object; whichever type isn't currently selected simply isn't rendered, so
an officer can switch back and forth without losing previously-entered
data on either side.

**Consumer** renders the full ~15-section structure below, unchanged from
before Report Type existed.

**Commercial** renders a different, smaller section set instead (moved into
its own file, `credit-investigation/ci-report-commercial-sections.tsx`, to
keep `ci-report-card.tsx` from growing further — it was already ~960 lines
before this), described in its own subsection below. The shared header
block (read-only Residence Address + Business/Work Address) still renders
for both types, same as before.
```

- [ ] **Step 2: Document the Commercial section-by-section structure**

Immediately after the existing Consumer bullet list (ending with
"Recommendation... - the only CI Report field `credit-investigation-risk.ts`
doesn't read at all"), add a new subsection:

```markdown
### Commercial CI Report sections

In order, each implemented in `CommercialReportSections`
(`credit-investigation/ci-report-commercial-sections.tsx`):

- **Business Profile** — Owner, Territory, No. of regular employees, No.
  of contractual employees (all plain `CiReport` string fields,
  `businessOwner`/`businessTerritory`/`businessRegularEmployees`/
  `businessContractualEmployees`).
- **Location and Facility** — a bordered sub-box (same convention as the
  Consumer branch's Residence/Neighborhood box) holding: Premises
  (Construction description, Area description), a "Location owned?"
  Yes/No `RadioRow` next to "Own or rent (details)"
  (`locationOwned`/`locationOwnRentDetails`), then Equipment (a
  description field), and an "Equipment owned?" Yes/No `RadioRow` next to
  "Equipment lease price" (`equipmentOwned`/`equipmentLeasePrice`).
- **Trade Checking** — two independent repeatable arrays, Suppliers and
  Customers (`commercialSuppliers`/`commercialCustomers:
  CiCommercialTradeEntry[]`) — a **new, separate entry type** from the
  Consumer branch's own `CiTradeEntry`, since the Commercial shape is
  company-level (Company name, Contact person, Position, Mobile number,
  Email, Telephone no., Local/extension, Transaction details, Payment
  terms, Years of contract, Remarks) rather than Consumer's individual
  name/address/dealing shape. Same add/remove-per-entry UX as every other
  repeatable section in this card.
- **Management and Ownership** — two repeatable sub-sections:
  - **Management** (`management: CiManagementEntry[]`) — Full name,
    Birthdate, Birth place, Nationality, Spouse/partner, Home address,
    Job title, Education, Other business, TIN, Mobile number per entry.
  - **Major Stockholders** (`stockholders: CiStockholderEntry[]`) —
    Stockholder name, Amount subscribed, Amount paid-up, then an "Is the
    stockholder a corporation?" Yes/No `RadioRow`
    (`isCorporation: 'yes' | 'no' | ''`). When `'yes'`, a nested
    **Sub-stockholders** list (`subStockholders: CiSubStockholderEntry[]`,
    Sub-stockholder name/Amount subscribed/Amount paid-up per entry)
    renders directly below that one stockholder, with its own "Add
    sub-stockholder" trigger scoped to that stockholder only. This is the
    one genuinely nested array in this app's `CiReport` — mutations locate
    the parent stockholder by id before touching its own
    `subStockholders` array, so a sibling stockholder's own
    sub-stockholders are never affected. Toggling "Is the stockholder a
    corporation?" from Yes back to No only hides the Sub-stockholders
    block (the data is not cleared), so toggling back to Yes restores
    whatever was already entered.
- **Comments** — `commentsNotes`, the same shared `RichTextField` field
  the Consumer branch's own Comments section uses (so text typed here
  survives switching to Consumer and back).

No Recommendation section inside the Commercial branch — the page's own
Decision Gate ("Proceed application?", outside `CiReportCard`) already
serves that role for both types, same as it always has.
```

- [ ] **Step 3: Update the maintenance-rule header**

At the top of `docs/100-credit-investigation.md`, the maintenance rule
currently lists `credit-investigation/ci-report-card.tsx` among the files
whose change should trigger a doc update. Add the new file:

```markdown
> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-docs.ts`,
> `credit-investigation-risk.ts`, `credit-investigation-transcript.ts`,
> `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/ci-report-commercial-sections.tsx`,
> `credit-investigation/credit-investigation-doc-row.tsx`,
> `components/rich-text-field/rich-text-field.tsx`) change. Companion to
```

(Only the one line changed — insert
`` `credit-investigation/ci-report-commercial-sections.tsx`, `` right after
the existing `ci-report-card.tsx` line; everything else in that header
paragraph stays as-is.)

- [ ] **Step 4: Add a History entry**

At the bottom of `docs/100-credit-investigation.md`, under `## History`,
add a new dated entry above the existing "### Date not confirmed" block
(or as its own new subsection with today's actual date, matching this
project's convention of dating entries when the date is known):

```markdown
### 2026-10-05

- **Commercial/Consumer Report Types added.** `CiReportCard` now starts
  with a manually-picked Report Type selector (`report.type:
  CiReportType`); nothing else renders until a type is picked. Consumer
  renders the existing ~15-section structure unchanged. Commercial renders
  a new, smaller section set (Business Profile, Location and Facility,
  Trade Checking with a new `CiCommercialTradeEntry` shape, Management and
  Ownership with a nested Stockholder → Sub-stockholder structure,
  Comments), moved into a new file
  (`credit-investigation/ci-report-commercial-sections.tsx`) to keep
  `ci-report-card.tsx`'s size in check. Switching type never clears data
  on either side. See `docs/superpowers/specs/2026-10-05-ci-report-
  commercial-consumer-types-design.md` for the full design rationale.
```

- [ ] **Step 5: Update `docs/240-tasks.md`**

Add today's entry under the current week (create a new
`**Week of <Monday's date>**` block if the current week isn't present yet,
following the file's own existing format exactly):

```markdown
**📅 <today's day name>, <today's date>**

**CI Report — Commercial/Consumer Report Types**
- Added a manually-picked Report Type selector to `CiReportCard` — nothing
  renders below it until a type is chosen.
- Consumer keeps the existing ~15-section structure unchanged.
- Commercial gets a new, smaller section set (Business Profile, Location
  and Facility, Trade Checking, Management and Ownership with nested
  Stockholder → Sub-stockholder lists, Comments), split into a new file
  `credit-investigation/ci-report-commercial-sections.tsx`.
- Switching Report Type only changes which sections are visible; no data
  is ever cleared.
- Updated `docs/100-credit-investigation.md`.
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add docs/100-credit-investigation.md docs/240-tasks.md
git commit -m "docs: document CI Report Commercial/Consumer types"
```
