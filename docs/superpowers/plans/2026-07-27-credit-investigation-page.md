# Credit Investigation Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Credit Investigation admin review page — the detail workspace for the already-scaffolded `creditInvestigation` step under "Comprehensive Credit Checking" — with a grouped document checklist, a CI Fee request/approval flow, and a structured CI Report with transcript-upload auto-fill.

**Architecture:** Follows the existing admin-review-screen pattern used by `requirement-checklist-view.tsx`/`call-report-view.tsx`: one `'use client'` view component reading/writing a new `CreditInvestigation` slice of `AdminContext.review`, composed from small focused sub-components (doc row, doc list card, CI Fee card, CI Report card), routed at `/admin/applications/[id]/credit-investigation`. No backend — state lives in `localStorage` via the existing `AdminProvider`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, MUI, existing `AdminContext`/`RegistrationContext` React Context state.

## Global Constraints

- No real backend, no real AI/OCR/transcription — every "AI Summary" and auto-fill must be deterministic (hash-seeded, same technique as `simulateBureauFinding`/`getLoanNumber`), never `Math.random()` or a real parse of uploaded file contents.
- Document uploads only ever store `file.name`, `URL.createObjectURL(file)`, and a timestamp — never read file contents.
- CIC/CMAP/NFIS-BAP rows on this page are **view-only** — they read `review.requirementChecklist.documents` by key and must never gain independent upload state.
- "Registration of Business Name" and every other fixed document row shows unconditionally for every applicant regardless of `application.loanType` (matches Requirement Checklist's "document set does not vary by application field" rule).
- Every new page action (sample-data toggle, CI Fee approval simulation) registers via `useRegisterPageActions`, not a floating button.
- `docs/ADMIN_CREDIT_INVESTIGATION.md` (new) and `PROJECT_OVERVIEW.md` must be updated to describe this feature once built (per this project's standing "always update docs" rule).

---

## File Structure

New files:
- `src/sections/admin/credit-investigation-docs.ts` — fixed document metadata (mirrors `requirement-checklist-docs.ts`'s shape).
- `src/sections/admin/credit-investigation-risk.ts` — pure `buildCreditInvestigationSummary()` function (mirrors `requirement-checklist-risk.ts`).
- `src/sections/admin/credit-investigation-transcript.ts` — deterministic transcript-auto-fill function.
- `src/sections/admin/credit-investigation/credit-investigation-doc-row.tsx` — read-only row variant for the Bureau & Verification Checks group.
- `src/sections/admin/credit-investigation/ci-fee-card.tsx` — CI Fee request/approval card.
- `src/sections/admin/credit-investigation/ci-report-card.tsx` — CI Report card (transcript upload + structured fields).
- `src/sections/admin/credit-investigation-view.tsx` — top-level view component.
- `src/app/admin/applications/[id]/credit-investigation/page.tsx` — route entry.
- `docs/ADMIN_CREDIT_INVESTIGATION.md` — feature doc.

Modified files:
- `src/auth/admin-context.tsx` — new `CreditInvestigation` state slice, types, setters, localStorage merge branch.
- `src/routes/paths.ts` — new `paths.admin.creditInvestigation(id)`.
- `src/layouts/admin/config-nav-admin.tsx` — `getAdminReviewStep` regex/map gains `credit-investigation`.
- `src/sections/admin/application-list-view.tsx` — `isActionable` for `creditInvestigation` becomes conditional on `requirementChecklist.endorsed`.
- `src/sections/admin/requirement-checklist-view.tsx` — "Endorsed" success screen gains a forward link into Credit Investigation.
- `PROJECT_OVERVIEW.md` — admin flow diagram + data model section updated.

Reused as-is (no changes): `RequirementDocRow`, `RequestDocumentsDrawer`, `ApplicationReviewHeader`, `ApplicationDetailsCard`, `OfficerNotesDialog`/`buildOfficerNoteEntry`, `sortByAttentionFirst`-style helper (recreated locally since it's a tiny generic, see Task 6), `ConfirmDialog`.

---

## Task 1: `CreditInvestigation` data model in `AdminContext`

**Files:**
- Modify: `src/auth/admin-context.tsx`

**Interfaces:**
- Produces:
  - `export type CiFeeStatus = 'not-requested' | 'pending-approval' | 'approved'`
  - `export type CiReport = { visitDate: string; visitTime: string; visitLocation: string; visitingOfficer: string; identityConfirmed: IdentityConfirmed | ''; residenceConfirmed: 'yes' | 'no' | 'for-verification' | ''; businessConfirmed: 'yes' | 'no' | 'not-applicable' | ''; neighborhoodFeedback: string; neighborhoodStanding: MembershipStanding | ''; findings: string; recommendation: PreliminaryRecommendation | ''; recommendationNotes: string; transcriptFileName: string | null; transcriptUploadedAt: string | null; }`
  - `export type CreditInvestigationDoc = RequirementDoc & { isCustom?: boolean; label?: string }`
  - `export type CreditInvestigation = { documents: CreditInvestigationDoc[]; outreachMessages: OutreachMessage[]; ciFeeStatus: CiFeeStatus; report: CiReport; decision: CreditCheckDecision; decisionReason: string; returnedToAmd: boolean; returnToAmdReason: string; }`
  - `ApplicationReview.creditInvestigation: CreditInvestigation`
  - `useAdmin().setCreditInvestigation(data: Partial<CreditInvestigation>): void`
  - `useAdmin().setCiReport(data: Partial<CiReport>): void`
  - `useAdmin().addCreditInvestigationDocument(label: string): void`
  - `useAdmin().removeCreditInvestigationDocument(key: string): void`
  - `useAdmin().addCiOutreachMessage(message: { channel: OutreachChannel; text: string }): void`

This task has no separate doc-metadata file yet (Task 2) — write the 9 fixed keys directly here for the initial documents array, matching `createInitialRequirementDocuments()`'s shape but starting every document `missing` (a fresh Credit Investigation session has nothing uploaded yet, unlike Requirement Checklist's pre-seeded demo state).

- [ ] **Step 1: Add the new types directly above `ApplicationReview`**

In `src/auth/admin-context.tsx`, find `export type RequirementChecklist = {...}` (ends around line 390) and insert immediately after it, before `export type ReviewStep = ...`:

```ts
export type CiFeeStatus = 'not-requested' | 'pending-approval' | 'approved';

export type CreditInvestigationDoc = RequirementDoc & {
  // Only set on ad-hoc officer-added rows (via "+ Add document"), which have
  // no fixed CreditInvestigationDocMeta entry to look up a label from.
  isCustom?: boolean;
  label?: string;
};

export type CiReport = {
  visitDate: string;
  visitTime: string;
  visitLocation: string;
  visitingOfficer: string;
  identityConfirmed: IdentityConfirmed | '';
  residenceConfirmed: 'yes' | 'no' | 'for-verification' | '';
  businessConfirmed: 'yes' | 'no' | 'not-applicable' | '';
  neighborhoodFeedback: string;
  neighborhoodStanding: MembershipStanding | '';
  findings: string;
  recommendation: PreliminaryRecommendation | '';
  recommendationNotes: string;
  // Filename-only, same "never read file contents" convention as every
  // other upload in this app — stands in for a PLAUD.ai transcript export.
  transcriptFileName: string | null;
  transcriptUploadedAt: string | null;
};

export type CreditInvestigation = {
  documents: CreditInvestigationDoc[];
  // Independent outreach history from Requirement Checklist's — this page
  // has its own "Request Documents" drawer/history.
  outreachMessages: OutreachMessage[];
  ciFeeStatus: CiFeeStatus;
  report: CiReport;
  decision: CreditCheckDecision;
  decisionReason: string;
  returnedToAmd: boolean;
  returnToAmdReason: string;
};
```

- [ ] **Step 2: Add `creditInvestigation` to `ApplicationReview`**

Find `export type ApplicationReview = {` and add `creditInvestigation: CreditInvestigation;` as a new line right after `requirementChecklist: RequirementChecklist;`.

- [ ] **Step 3: Add the initial-documents factory and initial-report factory**

Find `function createInitialRequirementDocuments(): RequirementDoc[] {` (just above `createAppraisalGroupDocuments`) and insert this new function right after it closes:

```ts
// Fixed keys for Credit Investigation's non-bureau, non-custom document
// rows. Every document starts 'missing' — unlike Requirement Checklist,
// this is not a pre-seeded demo state, since Credit Investigation is a
// later step the officer starts fresh on.
const CREDIT_INVESTIGATION_DOC_KEYS = [
  'ciTinPrimaryId',
  'ciSpousePassport',
  'ciSpouseDriversLicense',
  'ciPrimaryIdsMortgagor',
  'ciPrimaryIdsBorrowers',
  'ciBankAuthForm',
  'ciRegistrationOfBusinessName',
  'ciProofOfBilling',
  'ciAdditionalOtherDocuments',
];

function createInitialCreditInvestigationDocuments(): CreditInvestigationDoc[] {
  return CREDIT_INVESTIGATION_DOC_KEYS.map((key) => ({
    key,
    status: 'missing',
    aiNote: '',
    fileName: null,
    fileUrl: null,
    uploadedAt: null,
    uploadedBy: null,
    remarks: '',
    reviewed: false,
  }));
}

function createInitialCiReport(): CiReport {
  return {
    visitDate: '',
    visitTime: '',
    visitLocation: '',
    visitingOfficer: '',
    identityConfirmed: '',
    residenceConfirmed: '',
    businessConfirmed: '',
    neighborhoodFeedback: '',
    neighborhoodStanding: '',
    findings: '',
    recommendation: '',
    recommendationNotes: '',
    transcriptFileName: null,
    transcriptUploadedAt: null,
  };
}

function createInitialCreditInvestigation(): CreditInvestigation {
  return {
    documents: createInitialCreditInvestigationDocuments(),
    outreachMessages: [],
    ciFeeStatus: 'not-requested',
    report: createInitialCiReport(),
    decision: 'pending',
    decisionReason: '',
    returnedToAmd: false,
    returnToAmdReason: '',
  };
}
```

- [ ] **Step 4: Wire the factory into `createInitialReview()`**

Find `requirementChecklist: { ... },` inside `createInitialReview()` (ends with `returnReason: '',\n    },`) and add immediately after its closing `},`:

```ts
    creditInvestigation: createInitialCreditInvestigation(),
```

- [ ] **Step 5: Add the localStorage merge branch in `readStoredState()`**

Find the `requirementChecklist: { ... }` block inside `readStoredState()`'s returned object (the one with the `documents: initialState.review.requirementChecklist.documents.map(...)` merge-by-key logic). Add a sibling `creditInvestigation` key right after that block closes, before the final `},` that closes `review: {`:

```ts
        creditInvestigation: {
          ...initialState.review.creditInvestigation,
          ...storedReview.creditInvestigation,
          documents: (
            storedReview.creditInvestigation?.documents ?? []
          ).length === 0
            ? initialState.review.creditInvestigation.documents
            : [
                ...initialState.review.creditInvestigation.documents.map((defaultDoc: CreditInvestigationDoc) => {
                  const storedDoc = storedReview.creditInvestigation?.documents?.find(
                    (doc: CreditInvestigationDoc) => doc.key === defaultDoc.key
                  );
                  return storedDoc ? { ...defaultDoc, ...storedDoc } : defaultDoc;
                }),
                // Preserve any ad-hoc custom rows the officer added — they
                // have no entry in the default array to merge onto.
                ...(storedReview.creditInvestigation?.documents ?? []).filter(
                  (doc: CreditInvestigationDoc) => doc.isCustom
                ),
              ],
          report: {
            ...initialState.review.creditInvestigation.report,
            ...storedReview.creditInvestigation?.report,
          },
        },
```

- [ ] **Step 6: Add setters to `AdminContextValue` type**

Find `setRequirementChecklist: (data: Partial<RequirementChecklist>) => void;` inside `AdminContextValue` and add these lines right after `addOutreachMessage: (message: { channel: OutreachChannel; text: string }) => void;`:

```ts
  setCreditInvestigation: (data: Partial<CreditInvestigation>) => void;
  setCiReport: (data: Partial<CiReport>) => void;
  addCreditInvestigationDocument: (label: string) => void;
  removeCreditInvestigationDocument: (key: string) => void;
  addCiOutreachMessage: (message: { channel: OutreachChannel; text: string }) => void;
```

- [ ] **Step 7: Implement the setters in `AdminProvider`'s `value`**

Find `addOutreachMessage: (message) => setState((prev) => ({...` (Requirement Checklist's version) and add these new implementations right after it closes (after its `})),`), before `markStepEntered: (step) => ...`:

```ts
      setCreditInvestigation: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: { ...prev.review.creditInvestigation, ...data },
          },
        })),
      setCiReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              report: { ...prev.review.creditInvestigation.report, ...data },
            },
          },
        })),
      addCreditInvestigationDocument: (label) =>
        setState((prev) => {
          const newDoc: CreditInvestigationDoc = {
            key: crypto.randomUUID(),
            status: 'missing',
            aiNote: '',
            fileName: null,
            fileUrl: null,
            uploadedAt: null,
            uploadedBy: null,
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
                documents: [...prev.review.creditInvestigation.documents, newDoc],
              },
            },
          };
        }),
      removeCreditInvestigationDocument: (key) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              documents: prev.review.creditInvestigation.documents.filter((doc) => doc.key !== key),
            },
          },
        })),
      addCiOutreachMessage: (message) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            creditInvestigation: {
              ...prev.review.creditInvestigation,
              outreachMessages: [
                ...prev.review.creditInvestigation.outreachMessages,
                { id: crypto.randomUUID(), sentAt: new Date().toISOString(), ...message },
              ],
            },
          },
        })),
```

- [ ] **Step 8: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors related to `admin-context.tsx`. (Pre-existing unrelated errors, if any, are not this task's concern — confirm by checking that any reported errors are NOT in `admin-context.tsx`.)

- [ ] **Step 9: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/auth/admin-context.tsx
git commit -m "Add CreditInvestigation state slice to AdminContext"
```

---

## Task 2: Document metadata + read-only bureau-check row component

**Files:**
- Create: `src/sections/admin/credit-investigation-docs.ts`
- Create: `src/sections/admin/credit-investigation/credit-investigation-doc-row.tsx`

**Interfaces:**
- Consumes: `CreditInvestigationDoc` from Task 1 (`src/auth/admin-context.tsx`); `RequirementDoc` type (existing).
- Produces:
  - `export type CreditInvestigationDocSubgroup = 'principal' | 'spouse' | 'mortgagor' | 'borrowers' | 'general'`
  - `export type CreditInvestigationDocMeta = { key: string; label: string; subgroup: CreditInvestigationDocSubgroup; required: boolean; freshStatus: 'verified' | 'needs-review'; freshNote: string; }`
  - `export const CREDIT_INVESTIGATION_DOC_META: CreditInvestigationDocMeta[]`
  - `export const CI_SUBGROUP_LABELS: Record<CreditInvestigationDocSubgroup, string>`
  - `export const CI_SUBGROUP_ORDER: CreditInvestigationDocSubgroup[]`
  - `export function ReadOnlyBureauCheckRow({ label, doc }: { label: string; doc: RequirementDoc | undefined }): JSX.Element` — later tasks pass `label` + the looked-up doc from `review.requirementChecklist.documents`.

- [ ] **Step 1: Write `credit-investigation-docs.ts`**

```ts
// src/sections/admin/credit-investigation-docs.ts

// ----------------------------------------------------------------------
// Static content for the Credit Investigation screen's document checklist
// — the fixed, non-bureau, non-custom document list, grouped by whose
// document it is (Principal/Spouse/Mortgagor/Borrowers) plus a General
// Requirements group. Kept separate from admin-context.tsx's
// CreditInvestigation state the same way requirement-checklist-docs.ts is
// kept separate from RequirementChecklist state: this is fixed content, not
// per-application data.
//
// The 3 bureau checks (CIC/CMAP/NFIS-BAP) are deliberately NOT part of this
// metadata list — they're view-only rows on this page, reading directly
// from review.requirementChecklist.documents (see ReadOnlyBureauCheckRow
// below and credit-investigation-view.tsx), since those documents are
// already required to be uploaded during Requirement Checklist, one step
// earlier in the pipeline.
//
// This list does NOT vary by employment status, loan type, or any other
// application field — every application shows the same document list,
// same convention as requirement-checklist-docs.ts.
// ----------------------------------------------------------------------

export type CreditInvestigationDocSubgroup =
  | 'principal'
  | 'spouse'
  | 'mortgagor'
  | 'borrowers'
  | 'general';

export type CreditInvestigationDocMeta = {
  key: string;
  label: string;
  subgroup: CreditInvestigationDocSubgroup;
  required: boolean;
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};

export const CI_SUBGROUP_LABELS: Record<CreditInvestigationDocSubgroup, string> = {
  principal: 'Principal/Consumer',
  spouse: 'Spouse',
  mortgagor: 'Mortgagor',
  borrowers: 'Borrowers',
  general: 'General Requirements',
};

export const CI_SUBGROUP_ORDER: CreditInvestigationDocSubgroup[] = [
  'principal',
  'spouse',
  'mortgagor',
  'borrowers',
  'general',
];

export const CREDIT_INVESTIGATION_DOC_META: CreditInvestigationDocMeta[] = [
  {
    key: 'ciTinPrimaryId',
    label: 'TIN – Primary ID (Principal/Consumer)',
    subgroup: 'principal',
    required: true,
    freshStatus: 'verified',
    freshNote: 'TIN format valid, matches application details.',
  },
  {
    key: 'ciSpousePassport',
    label: 'Philippine Passport – Primary ID of Spouse',
    subgroup: 'spouse',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Passport details legible and consistent.',
  },
  {
    key: 'ciSpouseDriversLicense',
    label: "Driver's License – Secondary ID of Spouse",
    subgroup: 'spouse',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'License expiry date should be confirmed.',
  },
  {
    key: 'ciPrimaryIdsMortgagor',
    label: 'Primary IDs of Mortgagor with 3 specimen signature',
    subgroup: 'mortgagor',
    required: false,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'ciPrimaryIdsBorrowers',
    label: 'Primary IDs Borrowers with 3 specimen signature',
    subgroup: 'borrowers',
    required: true,
    freshStatus: 'needs-review',
    freshNote: 'Only 2 of 3 specimen signatures detected.',
  },
  {
    key: 'ciBankAuthForm',
    label: 'Duly accomplished and signed Bank Authorization Form',
    subgroup: 'general',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Signed and dated correctly.',
  },
  {
    key: 'ciRegistrationOfBusinessName',
    label: 'Registration of Business Name',
    subgroup: 'general',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Registration on file, no discrepancies found.',
  },
  {
    key: 'ciProofOfBilling',
    label: 'Proof of Billing',
    subgroup: 'general',
    required: true,
    freshStatus: 'verified',
    freshNote: 'Address matches application.',
  },
  {
    key: 'ciAdditionalOtherDocuments',
    label: 'Additional/Other Documents',
    subgroup: 'general',
    required: false,
    freshStatus: 'verified',
    freshNote: 'Reviewed, no issues found.',
  },
];
```

- [ ] **Step 2: Write `ReadOnlyBureauCheckRow`**

```tsx
// src/sections/admin/credit-investigation/credit-investigation-doc-row.tsx
'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import type { RequirementDoc } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only row for the Bureau & Verification Checks group (CIC/CMAP/
// NFIS-BAP). These documents are required earlier, during Requirement
// Checklist — by the time an application reaches Credit Investigation they
// must already be on file. This row re-displays that existing status/file
// for the officer to re-check as part of the investigation; it has no
// Upload/Remove/Mark-as-reviewed controls since this page does not own
// that data (see requirement-checklist-view.tsx for the source of truth).
// ----------------------------------------------------------------------

const STATUS_LABEL: Record<RequirementDoc['status'], string> = {
  verified: 'Verified',
  'needs-review': 'Needs review',
  missing: 'Missing',
};

const STATUS_COLOR: Record<RequirementDoc['status'], { bg: string; color: string }> = {
  verified: { bg: '#E7F8F0', color: '#0C8A4F' },
  'needs-review': { bg: '#FEF0D6', color: '#B36A05' },
  missing: { bg: '#F5F6FA', color: '#8891A6' },
};

export function ReadOnlyBureauCheckRow({
  label,
  doc,
}: {
  label: string;
  doc: RequirementDoc | undefined;
}) {
  const status = doc?.status ?? 'missing';
  const style = STATUS_COLOR[status];

  const handleView = () => {
    if (!doc?.fileUrl) return;
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box sx={{ borderRadius: '13px', border: '1px solid #EBEDF3', bgcolor: 'common.white' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ p: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <Iconify
            icon="solar:shield-check-bold-duotone"
            width={20}
            sx={{ color: style.color, flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.35 }}>
              {doc?.fileName ? `${doc.fileName} · from Requirement Checklist` : 'Not yet uploaded in Requirement Checklist'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            size="small"
            label={STATUS_LABEL[status]}
            sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, fontSize: 11.5 }}
          />
          <Tooltip title={doc?.fileUrl ? 'Open uploaded file' : 'No file on record yet'}>
            <span>
              <Button
                onClick={handleView}
                disabled={!doc?.fileUrl}
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:eye-bold-duotone" width={16} />}
                sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', px: 1.5 }}
              >
                View
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `credit-investigation-docs.ts` or `credit-investigation-doc-row.tsx`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation-docs.ts src/sections/admin/credit-investigation/credit-investigation-doc-row.tsx
git commit -m "Add Credit Investigation document metadata and read-only bureau-check row"
```

---

## Task 3: Deterministic transcript auto-fill function

**Files:**
- Create: `src/sections/admin/credit-investigation-transcript.ts`

**Interfaces:**
- Consumes: nothing from other new files (pure standalone module, matching `simulate-bureau-finding.ts`'s standalone style).
- Produces:
  - `export type CiTranscriptAutoFill = { visitLocation: string; identityConfirmed: 'yes' | 'no' | 'for-verification'; residenceConfirmed: 'yes' | 'no' | 'for-verification'; businessConfirmed: 'yes' | 'no' | 'not-applicable'; neighborhoodFeedback: string; neighborhoodStanding: 'good-standing' | 'with-concern' | 'not-verified'; findings: string; recommendation: 'proceed-as-requested' | 'proceed-with-conditions' | 'needs-additional-verification'; recommendationNotes: string; aiSummary: string; }`
  - `export function buildTranscriptAutoFill(seedParts: string[], applicantName: string): CiTranscriptAutoFill`

- [ ] **Step 1: Write the function**

```ts
// src/sections/admin/credit-investigation-transcript.ts

// ----------------------------------------------------------------------
// Simulates auto-filling the CI Report from an uploaded transcript file
// (standing in for a PLAUD.ai export). There's no real transcription/AI
// service anywhere in this codebase — this is deterministic and hash-based
// (same technique as simulateBureauFinding/getLoanNumber), not
// Math.random(), so the same transcript filename always produces the same
// result and reproduces consistently across reloads during a QA pass.
// Uploading a transcript never reads its actual contents — only its
// filename feeds the seed.
// ----------------------------------------------------------------------

export type CiTranscriptAutoFill = {
  visitLocation: string;
  identityConfirmed: 'yes' | 'no' | 'for-verification';
  residenceConfirmed: 'yes' | 'no' | 'for-verification';
  businessConfirmed: 'yes' | 'no' | 'not-applicable';
  neighborhoodFeedback: string;
  neighborhoodStanding: 'good-standing' | 'with-concern' | 'not-verified';
  findings: string;
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

  if (isPositive) {
    return {
      visitLocation: 'Residence address on file',
      identityConfirmed: 'yes',
      residenceConfirmed: 'yes',
      businessConfirmed: 'not-applicable',
      neighborhoodFeedback: `Neighbors confirmed ${applicantName} has resided at the address for an extended period with no adverse remarks.`,
      neighborhoodStanding: 'good-standing',
      findings: `Site visit confirmed ${applicantName}'s identity and residence as declared. No inconsistencies were found between the transcript and the application details on file.`,
      recommendation: 'proceed-as-requested',
      recommendationNotes: 'Findings support proceeding with the loan as requested.',
      aiSummary: `Transcript reviewed for ${applicantName}. Identity and residence were confirmed on-site, and neighborhood feedback was positive. No red flags detected.`,
    };
  }

  return {
    visitLocation: 'Residence address on file',
    identityConfirmed: 'for-verification',
    residenceConfirmed: 'for-verification',
    businessConfirmed: 'not-applicable',
    neighborhoodFeedback: `Neighbors had limited information about ${applicantName}; residency could not be fully corroborated during the visit.`,
    neighborhoodStanding: 'with-concern',
    findings: `Site visit for ${applicantName} raised some items that need further verification before a final assessment can be made.`,
    recommendation: 'needs-additional-verification',
    recommendationNotes: 'Recommend a follow-up visit or additional supporting documents before proceeding.',
    aiSummary: `Transcript reviewed for ${applicantName}. Some details from the site visit could not be fully corroborated — additional verification is recommended before proceeding.`,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `credit-investigation-transcript.ts`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation-transcript.ts
git commit -m "Add deterministic transcript auto-fill for CI Report"
```

---

## Task 4: `buildCreditInvestigationSummary` (AI review card logic)

**Files:**
- Create: `src/sections/admin/credit-investigation-risk.ts`

**Interfaces:**
- Consumes: `CreditInvestigationDoc` (Task 1), `CreditInvestigationDocMeta` (Task 2).
- Produces:
  - `export type CreditInvestigationRiskLevel = 'good' | 'watch' | 'high'`
  - `export function buildCreditInvestigationSummary(documents: CreditInvestigationDoc[], docMeta: CreditInvestigationDocMeta[], bureauChecksComplete: boolean): { level: CreditInvestigationRiskLevel; summary: string; recommendation: string }`

`bureauChecksComplete` is passed in by the view component (Task 6), computed from `review.requirementChecklist.documents`' CIC/CMAP/NFIS-BAP statuses — this file has no access to that state itself, keeping it a pure function like `requirement-checklist-risk.ts`.

- [ ] **Step 1: Write the function**

```ts
// src/sections/admin/credit-investigation-risk.ts

// ----------------------------------------------------------------------
// Derives the Credit Investigation screen's "AI review, summary &
// recommendation" content — pure computation from the current documents
// array, never stored (same pattern as requirement-checklist-risk.ts's
// buildRequirementChecklistSummary).
// ----------------------------------------------------------------------

import type { CreditInvestigationDoc } from 'src/auth/admin-context';
import type { CreditInvestigationDocMeta } from './credit-investigation-docs';

export type CreditInvestigationRiskLevel = 'good' | 'watch' | 'high';

export function buildCreditInvestigationSummary(
  documents: CreditInvestigationDoc[],
  docMeta: CreditInvestigationDocMeta[],
  bureauChecksComplete: boolean
): { level: CreditInvestigationRiskLevel; summary: string; recommendation: string } {
  const metaByKey = new Map(docMeta.map((meta) => [meta.key, meta]));
  const fixedDocs = documents.filter((doc) => !doc.isCustom);
  const requiredDocs = fixedDocs.filter((doc) => metaByKey.get(doc.key)?.required);

  const verifiedCount = documents.filter((doc) => doc.status === 'verified').length;
  const needsReviewCount = documents.filter((doc) => doc.status === 'needs-review').length;
  const missingCount = documents.filter((doc) => doc.status === 'missing').length;
  const missingRequiredCount =
    requiredDocs.filter((doc) => doc.status === 'missing').length + (bureauChecksComplete ? 0 : 1);

  const summary = `${documents.length - missingCount} of ${documents.length} documents are on file. AI verified ${verifiedCount} document(s), flagged ${needsReviewCount} for review, and found ${missingCount} still missing. ${bureauChecksComplete ? 'Bureau & verification checks (CIC/CMAP/NFIS-BAP) are on file from Requirement Checklist.' : 'One or more Bureau & Verification checks are still missing from Requirement Checklist.'}`;

  const outstandingLabels = documents
    .filter((doc) => doc.status !== 'verified')
    .map((doc) => doc.label ?? metaByKey.get(doc.key)?.label)
    .filter((label): label is string => !!label);
  const bureauNote = bureauChecksComplete ? [] : ['Bureau & Verification checks'];
  const allOutstanding = [...outstandingLabels, ...bureauNote];

  if (missingRequiredCount > 0 || needsReviewCount > 0) {
    const level: CreditInvestigationRiskLevel = missingRequiredCount > 0 ? 'high' : 'watch';
    const recommendation =
      allOutstanding.length > 0
        ? `Clear the ${allOutstanding.length} outstanding item(s) — ${allOutstanding.join(', ')} — before proceeding.`
        : 'Resolve the outstanding items above before proceeding.';
    return { level, summary, recommendation };
  }

  return {
    level: 'good',
    summary,
    recommendation: 'All required documents are on file and verified. Ready to proceed with the CI Report.',
  };
}
```

- [ ] **Step 2: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `credit-investigation-risk.ts`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation-risk.ts
git commit -m "Add buildCreditInvestigationSummary AI review logic"
```

---

## Task 5: CI Fee card

**Files:**
- Create: `src/sections/admin/credit-investigation/ci-fee-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` (existing, from Task 1 additions: `review.creditInvestigation.ciFeeStatus`, `setCreditInvestigation`).
- Produces: `export function CiFeeCard(): JSX.Element` — no props, reads/writes context directly (matches `BureauReportsCard`'s no-props convention).

- [ ] **Step 1: Write the component**

```tsx
// src/sections/admin/credit-investigation/ci-fee-card.tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// CI Fee request/approval gate. There's no real approver role/login in
// this prototype — "Mark CI Fee as Approved" is a simulated second step the
// same officer triggers, same convention as "Force Clean/Negative Bureau
// Finding" elsewhere in the admin app. Approval unlocks the CI Report card.
// ----------------------------------------------------------------------

const STATUS_COPY: Record<
  'not-requested' | 'pending-approval' | 'approved',
  { icon: string; iconColor: string; bg: string; title: string; body: string }
> = {
  'not-requested': {
    icon: 'solar:wallet-money-bold-duotone',
    iconColor: '#8891A6',
    bg: '#F9FAFC',
    title: 'CI Fee not yet requested',
    body: 'Request the Credit Investigation fee before scheduling the site visit and preparing the CI Report.',
  },
  'pending-approval': {
    icon: 'solar:hourglass-bold-duotone',
    iconColor: '#B36A05',
    bg: '#FEF0D6',
    title: 'CI Fee pending approval',
    body: 'The CI Fee request has been sent and is awaiting approval before the CI Report can be prepared.',
  },
  approved: {
    icon: 'solar:check-circle-bold',
    iconColor: '#0C8A4F',
    bg: '#E7F8F0',
    title: 'CI Fee approved',
    body: 'The CI Report below is now unlocked.',
  },
};

export function CiFeeCard() {
  const { review, setCreditInvestigation } = useAdmin();
  const { ciFeeStatus } = review.creditInvestigation;
  const copy = STATUS_COPY[ciFeeStatus];

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:wallet-money-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Fee</Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        The Credit Investigation fee must be requested and approved before the CI Report can be
        prepared.
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ p: 2, borderRadius: '11px', bgcolor: copy.bg }}
      >
        <Iconify icon={copy.icon} width={22} sx={{ color: copy.iconColor, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: copy.iconColor }}>
            {copy.title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>{copy.body}</Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
        {ciFeeStatus === 'not-requested' && (
          <Button
            onClick={() => setCreditInvestigation({ ciFeeStatus: 'pending-approval' })}
            variant="contained"
            startIcon={<Iconify icon="solar:send-square-bold" width={18} />}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
          >
            Request CI Fee
          </Button>
        )}
        {ciFeeStatus === 'pending-approval' && (
          <Button
            onClick={() => setCreditInvestigation({ ciFeeStatus: 'approved' })}
            variant="contained"
            startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
            sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
          >
            Mark CI Fee as Approved
          </Button>
        )}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `ci-fee-card.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation/ci-fee-card.tsx
git commit -m "Add CI Fee request/approval card"
```

---

## Task 6: CI Report card (structured fields + transcript upload)

**Files:**
- Create: `src/sections/admin/credit-investigation/ci-report-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` (`review.creditInvestigation.report`, `setCiReport`), `useRegistration()` (for applicant name), `buildTranscriptAutoFill` (Task 3).
- Produces: `export function CiReportCard(): JSX.Element` — no props.

- [ ] **Step 1: Write the component**

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

import { buildTranscriptAutoFill } from '../credit-investigation-transcript';

// ----------------------------------------------------------------------
// Structured CI Report: Site Visit Details, Borrower/Residence
// Verification, Neighborhood Check, Findings & Assessment, Recommendation.
// Every field is directly editable regardless of transcript state.
// Uploading a transcript file only stores its filename (never reads
// contents) and triggers a deterministic auto-fill of every field below
// plus a read-only AI Summary — see credit-investigation-transcript.ts.
// Re-uploading overwrites current field values; the officer can edit again
// afterward.
// ----------------------------------------------------------------------

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } };

export function CiReportCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { signUpData } = useRegistration();
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
      visitLocation: autoFill.visitLocation,
      identityConfirmed: autoFill.identityConfirmed,
      residenceConfirmed: autoFill.residenceConfirmed,
      businessConfirmed: autoFill.businessConfirmed,
      neighborhoodFeedback: autoFill.neighborhoodFeedback,
      neighborhoodStanding: autoFill.neighborhoodStanding,
      findings: autoFill.findings,
      recommendation: autoFill.recommendation,
      recommendationNotes: autoFill.recommendationNotes,
    });
    event.target.value = '';
  };

  const aiSummary = report.transcriptFileName
    ? buildTranscriptAutoFill([signUpData.email, report.transcriptFileName], applicantName).aiSummary
    : null;

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Report</Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the site-visit transcript to auto-fill this report, or type directly into any
        field below.
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
          sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', flexShrink: 0 }}
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
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Site Visit Details
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Visit date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={report.visitDate}
              onChange={(event) => setCiReport({ visitDate: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Visit time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={report.visitTime}
              onChange={(event) => setCiReport({ visitTime: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
          <TextField
            fullWidth
            label="Location visited"
            value={report.visitLocation}
            onChange={(event) => setCiReport({ visitLocation: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Visiting officer"
            value={report.visitingOfficer}
            onChange={(event) => setCiReport({ visitingOfficer: event.target.value })}
            sx={fieldSx}
          />
        </Stack>

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Borrower/Residence Verification
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              select
              label="Identity confirmed"
              value={report.identityConfirmed}
              onChange={(event) =>
                setCiReport({ identityConfirmed: event.target.value as typeof report.identityConfirmed })
              }
              sx={fieldSx}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="for-verification">For verification</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Residence confirmed"
              value={report.residenceConfirmed}
              onChange={(event) =>
                setCiReport({ residenceConfirmed: event.target.value as typeof report.residenceConfirmed })
              }
              sx={fieldSx}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="for-verification">For verification</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Business confirmed"
              value={report.businessConfirmed}
              onChange={(event) =>
                setCiReport({ businessConfirmed: event.target.value as typeof report.businessConfirmed })
              }
              sx={fieldSx}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="not-applicable">Not applicable</MenuItem>
            </TextField>
          </Stack>
        </Stack>

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Neighborhood Check
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Neighbor/community feedback"
            value={report.neighborhoodFeedback}
            onChange={(event) => setCiReport({ neighborhoodFeedback: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            select
            label="Standing"
            value={report.neighborhoodStanding}
            onChange={(event) =>
              setCiReport({ neighborhoodStanding: event.target.value as typeof report.neighborhoodStanding })
            }
            sx={fieldSx}
          >
            <MenuItem value="good-standing">Good standing</MenuItem>
            <MenuItem value="with-concern">With concern</MenuItem>
            <MenuItem value="not-verified">Not verified</MenuItem>
          </TextField>
        </Stack>

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Findings &amp; Assessment
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={report.findings}
            onChange={(event) => setCiReport({ findings: event.target.value })}
            sx={fieldSx}
          />
        </Stack>

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

- [ ] **Step 2: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `ci-report-card.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation/ci-report-card.tsx
git commit -m "Add CI Report card with transcript-upload auto-fill"
```

---

## Task 7: `paths.ts` and nav wiring

**Files:**
- Modify: `src/routes/paths.ts`
- Modify: `src/layouts/admin/config-nav-admin.tsx`

**Interfaces:**
- Produces: `paths.admin.creditInvestigation(id: string): string`
- Modifies: `getAdminReviewStep()`'s regex/map to recognize `credit-investigation`.

- [ ] **Step 1: Add the path**

In `src/routes/paths.ts`, find `requirementChecklist: (id: string) => \`/admin/applications/${id}/requirement-checklist\`,` and add immediately after it, still inside the `admin` object:

```ts
    creditInvestigation: (id: string) => `/admin/applications/${id}/credit-investigation`,
```

- [ ] **Step 2: Update `getAdminReviewStep`'s regex and map**

In `src/layouts/admin/config-nav-admin.tsx`, find:

```ts
  const routeStep = pathname.match(
    /^\/admin\/applications\/[^/]+\/(credit-checking|reconsideration|call-report|requirement-checklist)$/
  )?.[1];

  return {
    'credit-checking': 'creditChecking',
    reconsideration: 'reconsideration',
    'call-report': 'callReport',
    'requirement-checklist': 'requirementChecklist',
  }[routeStep ?? ''] ?? null;
```

Replace with:

```ts
  const routeStep = pathname.match(
    /^\/admin\/applications\/[^/]+\/(credit-checking|reconsideration|call-report|requirement-checklist|credit-investigation)$/
  )?.[1];

  return {
    'credit-checking': 'creditChecking',
    reconsideration: 'reconsideration',
    'call-report': 'callReport',
    'requirement-checklist': 'requirementChecklist',
    'credit-investigation': 'creditInvestigation',
  }[routeStep ?? ''] ?? null;
```

- [ ] **Step 3: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `paths.ts` or `config-nav-admin.tsx`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/routes/paths.ts src/layouts/admin/config-nav-admin.tsx
git commit -m "Add credit-investigation route path and nav step resolution"
```

---

## Task 8: `CreditInvestigationView` + page route

**Files:**
- Modify: `src/sections/admin/requirement-doc-row.tsx`
- Create: `src/sections/admin/credit-investigation-view.tsx`
- Create: `src/app/admin/applications/[id]/credit-investigation/page.tsx`

**Interfaces:**
- Consumes: `useAdmin()`, `useRegistration()`, `useRegisterPageActions` (existing), `ApplicationReviewHeader`, `ApplicationDetailsCard`, `RequirementDocRow` + its new `RequirementDocRowMeta` type (this task's Step 1), `RequestDocumentsDrawer`, `ConfirmDialog`, `CREDIT_INVESTIGATION_DOC_META`/`CI_SUBGROUP_LABELS`/`CI_SUBGROUP_ORDER` (Task 2), `ReadOnlyBureauCheckRow` (Task 2), `buildCreditInvestigationSummary` (Task 4), `CiFeeCard` (Task 5), `CiReportCard` (Task 6), `paths.admin.creditInvestigation`/`.reconsideration`/`.requirementChecklist`/`.applications` (existing + Task 7).
- Produces: `export function CreditInvestigationView(): JSX.Element | null`; `RequirementDocRowMeta` (exported from `requirement-doc-row.tsx`, see Step 1).

`RequirementDocRow`'s `meta` prop is currently typed as the closed union
`RequirementDocMeta | AppraisalDocMeta` (`requirement-doc-row.tsx:77`). Both
of those types share the exact same 4 fields the component actually reads
(`label`, `required`, `freshStatus`, `freshNote` — see
`requirement-doc-row.tsx` lines 113-274, it never reads `tabs`/`subgroup`).
`CreditInvestigationDocMeta` (Task 2) and the inline custom-doc meta object
built in this task's Step 1 both structurally match those same 4 fields but
are not one of the two named types in that union, so TypeScript will reject
passing them as-is. Step 1 below fixes this first, before writing the view
that depends on it.

- [ ] **Step 1: Widen `RequirementDocRow`'s `meta` prop to a shared structural type**

In `src/sections/admin/requirement-doc-row.tsx`, find:

```ts
import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta, AppraisalDocMeta } from './requirement-checklist-docs';
```

Replace with:

```ts
import type { RequirementDoc } from 'src/auth/admin-context';
import type { RequirementDocMeta, AppraisalDocMeta } from './requirement-checklist-docs';

// The component only ever reads these 4 fields (never `tabs`/`subgroup`),
// so any caller's meta object — including credit-investigation-docs.ts's
// CreditInvestigationDocMeta and ad-hoc custom-document objects — can be
// passed as long as it has this shape, without needing to be one of the
// two named checklist types.
export type RequirementDocRowMeta = {
  label: string;
  required: boolean;
  freshStatus: 'verified' | 'needs-review';
  freshNote: string;
};
```

Then find:

```ts
type RequirementDocRowProps = {
  meta: RequirementDocMeta | AppraisalDocMeta;
```

Replace with:

```ts
type RequirementDocRowProps = {
  meta: RequirementDocMeta | AppraisalDocMeta | RequirementDocRowMeta;
```

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `requirement-doc-row.tsx`, and its two existing
callers (`requirement-checklist-view.tsx`'s two `RequirementDocRow` usages)
still type-check unchanged, since `RequirementDocMeta | AppraisalDocMeta` is
still valid — this only adds a third alternative, it doesn't remove either
original one.

- [ ] **Step 2: Commit this standalone fix**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/requirement-doc-row.tsx
git commit -m "Widen RequirementDocRow's meta prop to accept any matching doc-meta shape"
```

- [ ] **Step 3: Write `CreditInvestigationView`**

```tsx
// src/sections/admin/credit-investigation-view.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { CreditInvestigationDoc } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { RequirementDocRow } from './requirement-doc-row';
import { RequestDocumentsDrawer } from './request-documents-drawer';
import { CiFeeCard } from './credit-investigation/ci-fee-card';
import { CiReportCard } from './credit-investigation/ci-report-card';
import { ReadOnlyBureauCheckRow } from './credit-investigation/credit-investigation-doc-row';
import { buildCreditInvestigationSummary } from './credit-investigation-risk';
import {
  CREDIT_INVESTIGATION_DOC_META,
  CI_SUBGROUP_LABELS,
  CI_SUBGROUP_ORDER,
} from './credit-investigation-docs';

import type { OutreachChannel } from 'src/auth/admin-context';
import type { CreditInvestigationDocMeta } from './credit-investigation-docs';

// ----------------------------------------------------------------------

const RISK_STYLES = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Ready' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Almost ready' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'Not ready' },
} as const;

const BUREAU_CHECKS: { key: string; label: string }[] = [
  { key: 'cicCheck', label: 'CIC Check' },
  { key: 'cmapCheck', label: 'CMAP Check' },
  { key: 'nfisBapCheck', label: 'NFIS/BAP Check' },
];

function needsAttention(doc: CreditInvestigationDoc) {
  return doc.status !== 'verified';
}

function sortByAttentionFirst(entries: { meta: CreditInvestigationDocMeta; doc: CreditInvestigationDoc }[]) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aNeeds = needsAttention(a.entry.doc);
      const bNeeds = needsAttention(b.entry.doc);
      if (aNeeds === bNeeds) return a.index - b.index;
      return aNeeds ? -1 : 1;
    })
    .map(({ entry }) => entry);
}

export function CreditInvestigationView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const {
    review,
    adminUser,
    setCreditInvestigation,
    addCreditInvestigationDocument,
    removeCreditInvestigationDocument,
    addCiOutreachMessage,
  } = useAdmin();

  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState('');
  const [disapproveOpen, setDisapproveOpen] = useState(false);
  const [disapproveReason, setDisapproveReason] = useState('');
  const [returnToAmdOpen, setReturnToAmdOpen] = useState(false);
  const [returnToAmdReason, setReturnToAmdReason] = useState('');

  const { documents, ciFeeStatus } = review.creditInvestigation;
  const officerName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const docsByKey = new Map(documents.map((doc) => [doc.key, doc]));
  const customDocs = documents.filter((doc) => doc.isCustom);

  const bureauDocsByKey = new Map(
    review.requirementChecklist.documents.map((doc) => [doc.key, doc])
  );
  const bureauChecksComplete = BUREAU_CHECKS.every(
    (check) => bureauDocsByKey.get(check.key)?.status !== 'missing'
  );

  const patchDoc = (key: string, data: Partial<CreditInvestigationDoc>) => {
    setCreditInvestigation({
      documents: documents.map((doc) => (doc.key === key ? { ...doc, ...data } : doc)),
    });
  };

  const handleUploadDoc = (key: string) => (data: Partial<CreditInvestigationDoc>) => {
    patchDoc(key, { ...data, uploadedBy: officerName, reviewed: false });
  };

  const handleRemoveDoc = (key: string) => () => {
    patchDoc(key, {
      status: 'missing',
      aiNote: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
      uploadedBy: null,
      remarks: '',
      reviewed: false,
    });
  };

  const handleToggleReviewed = (key: string) => (reviewed: boolean) => patchDoc(key, { reviewed });
  const handleRemarksChange = (key: string) => (remarks: string) => patchDoc(key, { remarks });

  const handleAddDoc = () => {
    const label = newDocLabel.trim();
    if (!label) return;
    addCreditInvestigationDocument(label);
    setNewDocLabel('');
    setAddDocOpen(false);
  };

  const missingDocLabels = [
    ...CREDIT_INVESTIGATION_DOC_META.filter((meta) => docsByKey.get(meta.key)?.status === 'missing').map(
      (meta) => meta.label
    ),
    ...customDocs.filter((doc) => doc.status === 'missing').map((doc) => doc.label ?? 'Custom document'),
  ];

  const handleSendOutreachMessage = (message: { channel: OutreachChannel; text: string }) => {
    addCiOutreachMessage(message);
  };

  const { level, summary, recommendation } = buildCreditInvestigationSummary(
    documents,
    CREDIT_INVESTIGATION_DOC_META,
    bureauChecksComplete
  );
  const riskStyle = RISK_STYLES[level];

  const handleFillSampleData = () => {
    const uploadedAt = new Date().toISOString();
    setCreditInvestigation({
      documents: documents.map((doc) => {
        if (doc.isCustom) return doc;
        const meta = CREDIT_INVESTIGATION_DOC_META.find((entry) => entry.key === doc.key);
        if (!meta) return doc;
        return {
          ...doc,
          status: meta.freshStatus,
          aiNote: meta.freshNote,
          fileName: 'sample-local-pdf.pdf',
          fileUrl: '/assets/documents/sample-local-pdf.pdf',
          uploadedAt,
          uploadedBy: officerName,
          reviewed: false,
        };
      }),
    });
  };

  const allFixedReceived = CREDIT_INVESTIGATION_DOC_META.every(
    (meta) => docsByKey.get(meta.key)?.status !== 'missing'
  );

  const handleClearSampleData = () => {
    setCreditInvestigation({
      documents: documents
        .filter((doc) => !doc.isCustom)
        .map((doc) => ({
          ...doc,
          status: 'missing',
          aiNote: '',
          fileName: null,
          fileUrl: null,
          uploadedAt: null,
          uploadedBy: null,
          remarks: '',
          reviewed: false,
        })),
    });
  };

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'sample-data',
          label: allFixedReceived ? 'Remove Sample Data' : 'Fill with Sample Data',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: allFixedReceived ? handleClearSampleData : handleFillSampleData,
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [allFixedReceived]
    )
  );

  if (!signUpData) return null;

  const handleProceed = () => {
    setCreditInvestigation({ decision: 'approved' });
    router.push(paths.admin.applications);
  };

  const closeDisapprove = () => {
    setDisapproveOpen(false);
    setDisapproveReason('');
  };

  const confirmDisapprove = () => {
    if (!disapproveReason.trim()) return;
    setCreditInvestigation({ decision: 'rejected', decisionReason: disapproveReason.trim() });
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  const closeReturnToAmd = () => {
    setReturnToAmdOpen(false);
    setReturnToAmdReason('');
  };

  const confirmReturnToAmd = () => {
    if (!returnToAmdReason.trim()) return;
    setCreditInvestigation({ returnedToAmd: true, returnToAmdReason: returnToAmdReason.trim() });
    router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
        step="Step 4 · Credit Investigation"
        reviewStep="creditInvestigation"
        hideApplicationCard
      />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard
          collapsible
          showCreditCheckingResultAction
          showCallReportAction
          officerNotesProcess="Credit Investigation"
        />

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              Document Checklist
            </Typography>
            <Button
              onClick={() => setRequestDrawerOpen(true)}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:letter-bold-duotone" width={16} />}
              sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', px: 2 }}
            >
              Request Documents
            </Button>
          </Stack>

          <Stack spacing={3}>
            {CI_SUBGROUP_ORDER.map((subgroup) => {
              const entries = sortByAttentionFirst(
                CREDIT_INVESTIGATION_DOC_META.filter((meta) => meta.subgroup === subgroup)
                  .map((meta) => ({ meta, doc: docsByKey.get(meta.key) }))
                  .filter(
                    (entry): entry is { meta: CreditInvestigationDocMeta; doc: CreditInvestigationDoc } =>
                      !!entry.doc
                  )
              );
              if (entries.length === 0) return null;
              return (
                <Stack key={subgroup} spacing={1.25}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                    {CI_SUBGROUP_LABELS[subgroup]}
                  </Typography>
                  <Stack spacing={1.25}>
                    {entries.map(({ meta, doc }) => (
                      <RequirementDocRow
                        key={meta.key}
                        meta={meta}
                        doc={doc}
                        applicantName={applicantName}
                        onUpload={handleUploadDoc(meta.key)}
                        onRemove={handleRemoveDoc(meta.key)}
                        onToggleReviewed={handleToggleReviewed(meta.key)}
                        onRemarksChange={handleRemarksChange(meta.key)}
                      />
                    ))}
                  </Stack>
                </Stack>
              );
            })}

            <Stack spacing={1.25}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                Bureau &amp; Verification Checks
              </Typography>
              <Stack spacing={1.25}>
                {BUREAU_CHECKS.map((check) => (
                  <ReadOnlyBureauCheckRow key={check.key} label={check.label} doc={bureauDocsByKey.get(check.key)} />
                ))}
              </Stack>
            </Stack>

            {customDocs.length > 0 && (
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                  Additional Documents
                </Typography>
                <Stack spacing={1.25}>
                  {customDocs.map((doc) => (
                    <RequirementDocRow
                      key={doc.key}
                      meta={{ label: doc.label ?? 'Custom document', required: false, freshStatus: 'verified', freshNote: 'Reviewed, no issues found.' }}
                      doc={doc}
                      applicantName={applicantName}
                      onUpload={handleUploadDoc(doc.key)}
                      onRemove={() => removeCreditInvestigationDocument(doc.key)}
                      onToggleReviewed={handleToggleReviewed(doc.key)}
                      onRemarksChange={handleRemarksChange(doc.key)}
                    />
                  ))}
                </Stack>
              </Stack>
            )}

            {addDocOpen ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  fullWidth
                  size="small"
                  autoFocus
                  label="Document label"
                  value={newDocLabel}
                  onChange={(event) => setNewDocLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleAddDoc();
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                <Button onClick={handleAddDoc} disabled={!newDocLabel.trim()} variant="contained" sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}>
                  Add
                </Button>
                <Button onClick={() => setAddDocOpen(false)} sx={{ color: '#5A6273' }}>
                  Cancel
                </Button>
              </Stack>
            ) : (
              <Button
                onClick={() => setAddDocOpen(true)}
                startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
                sx={{ alignSelf: 'flex-start', color: '#1C2A6E' }}
              >
                Add document
              </Button>
            )}
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Automatically checks each uploaded document for completeness against the checklist above.
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>AI Summary</Typography>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{summary}</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color, mb: 1 }}>
                AI Recommendation · {riskStyle.label}
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>{recommendation}</Typography>
            </Box>
          </Stack>
        </Box>

        <CiFeeCard />

        {ciFeeStatus === 'approved' ? (
          <CiReportCard />
        ) : (
          <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Approve the CI Fee above to unlock the CI Report.
            </Typography>
          </Box>
        )}

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Decide whether to proceed, disapprove, or return this application to AMD for
            reconsideration.
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Proceed
            </Button>
            <Button
              onClick={() => setDisapproveOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
            >
              Disapprove
            </Button>
            <Button
              onClick={() => setReturnToAmdOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:undo-left-round-bold" width={18} />}
              sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
            >
              Return to AMD
            </Button>
          </Stack>
        </Box>
      </Stack>

      <ConfirmDialog
        open={disapproveOpen}
        onClose={closeDisapprove}
        title="Reason for disapproval"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={disapproveReason}
            onChange={(event) => setDisapproveReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!disapproveReason.trim()}
            onClick={confirmDisapprove}
            sx={{ bgcolor: '#F04438', '&:hover': { bgcolor: '#B32C22' } }}
          >
            Confirm
          </Button>
        }
      />

      <ConfirmDialog
        open={returnToAmdOpen}
        onClose={closeReturnToAmd}
        title="Reason for returning to AMD"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what needs reconsideration…"
            value={returnToAmdReason}
            onChange={(event) => setReturnToAmdReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!returnToAmdReason.trim()}
            onClick={confirmReturnToAmd}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}
          >
            Confirm
          </Button>
        }
      />

      <RequestDocumentsDrawer
        open={requestDrawerOpen}
        onClose={() => setRequestDrawerOpen(false)}
        applicantName={applicantName}
        missingDocLabels={missingDocLabels}
        history={review.creditInvestigation.outreachMessages}
        onSend={handleSendOutreachMessage}
      />
    </Container>
  );
}
```

- [ ] **Step 4: Write the page route file**

```tsx
// src/app/admin/applications/[id]/credit-investigation/page.tsx
import type { Metadata } from 'next';

import { CreditInvestigationView } from 'src/sections/admin/credit-investigation-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Credit Investigation | HHC LMS Admin',
};

export default function Page() {
  return <CreditInvestigationView />;
}
```

- [ ] **Step 5: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `credit-investigation-view.tsx` or the new `page.tsx`.

- [ ] **Step 6: Start the dev server and manually verify in browser**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npm run dev` (in background/separate terminal)

Then:
1. Log into `/admin/login` with `admin@pgfinance.com.ph` / `Admin123`.
2. Navigate to the live application, click through Initial Credit Checking → Approve → Call Report → Proceed → Requirement Checklist.
3. On Requirement Checklist, use "Fill Sample Data (All Correct)" then Endorse.
4. Manually navigate to `/admin/applications/<url-encoded-email>/credit-investigation`.
5. Verify: header shows "Step 4 · Credit Investigation"; Application Details card renders; Document Checklist shows all 5 subgroups (Principal/Consumer, Spouse, Mortgagor, Borrowers, General Requirements) plus Bureau & Verification Checks (view-only, showing CIC/CMAP/NFIS-BAP statuses/View buttons reflecting whatever Requirement Checklist has); "Fill with Sample Data" page action fills the fixed rows; "+ Add document" adds a custom row; CI Fee card starts "not requested" → Request → Mark as Approved → CI Report unlocks; upload a dummy file as the transcript and confirm every CI Report field auto-fills plus an AI Summary appears; Proceed/Disapprove/Return to AMD all work and route as coded.

Expected: All of the above render and behave as described, no console errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/credit-investigation-view.tsx "src/app/admin/applications/[id]/credit-investigation/page.tsx"
git commit -m "Add Credit Investigation view and page route"
```

---

## Task 9: Unlock the queue — `application-list-view.tsx` and Requirement Checklist hand-off

**Files:**
- Modify: `src/sections/admin/application-list-view.tsx`
- Modify: `src/sections/admin/requirement-checklist-view.tsx`

**Interfaces:**
- Consumes: `review.requirementChecklist.endorsed` (existing), `paths.admin.creditInvestigation` (Task 7).

- [ ] **Step 1: Make the live row's `creditInvestigation` entry conditionally actionable**

In `src/sections/admin/application-list-view.tsx`, find:

```ts
        isActionable: !['creditInvestigation', 'appraisal', 'financialEvaluation'].includes(step),
```

Replace with:

```ts
        isActionable:
          step === 'creditInvestigation'
            ? review.requirementChecklist.endorsed
            : !['appraisal', 'financialEvaluation'].includes(step),
```

- [ ] **Step 2: Add `creditInvestigation` to `STEP_TO_PATH`**

Find:

```ts
  const STEP_TO_PATH: Partial<Record<ReviewStep, (id: string) => string>> = {
    creditChecking: paths.admin.creditChecking,
    reconsideration: paths.admin.reconsideration,
    callReport: paths.admin.callReport,
    requirementChecklist: paths.admin.requirementChecklist,
  };
```

Replace with:

```ts
  const STEP_TO_PATH: Partial<Record<ReviewStep, (id: string) => string>> = {
    creditChecking: paths.admin.creditChecking,
    reconsideration: paths.admin.reconsideration,
    callReport: paths.admin.callReport,
    requirementChecklist: paths.admin.requirementChecklist,
    creditInvestigation: paths.admin.creditInvestigation,
  };
```

- [ ] **Step 3: Add a forward link on Requirement Checklist's "Endorsed" success screen**

In `src/sections/admin/requirement-checklist-view.tsx`, find the `SuccessState` function's `Button` (the one linking `component="a" href={paths.admin.applications}` labeled "Back to Application List"). `SuccessState` is called twice (Endorsed and Returned to Applicant) — only the **Endorsed** call site should show a forward button. Change `SuccessState`'s signature to accept an optional extra action, and update only the Endorsed call site.

First, find:

```tsx
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
```

Replace with:

```tsx
function SuccessState({
  icon,
  iconBg,
  iconColor,
  heading,
  body,
  stepLabel,
  forwardHref,
  forwardLabel,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  heading: string;
  body: string;
  stepLabel: string;
  forwardHref?: string;
  forwardLabel?: string;
}) {
```

Then find the `Button` inside `SuccessState`'s JSX:

```tsx
        <Button
          component="a"
          href={paths.admin.applications}
          variant="contained"
          sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }}
        >
          Back to Application List
        </Button>
```

Replace with:

```tsx
        {forwardHref && (
          <Button
            component="a"
            href={forwardHref}
            variant="contained"
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }}
          >
            {forwardLabel}
          </Button>
        )}
        <Button
          component="a"
          href={paths.admin.applications}
          variant={forwardHref ? 'outlined' : 'contained'}
          sx={
            forwardHref
              ? { color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', mt: forwardHref ? 0.5 : 1 }
              : { bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }
          }
        >
          Back to Application List
        </Button>
```

Finally, find the Endorsed call site (`if (endorsed) { return ( <SuccessState ... /> ); }`):

```tsx
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
```

Replace with:

```tsx
  if (endorsed) {
    return (
      <SuccessState
        icon="solar:check-circle-bold"
        iconBg="#E7F8F0"
        iconColor="#12B76A"
        heading="Endorsed for comprehensive process"
        body="This application has been endorsed with its requirement checklist and collateral details for the next stage of processing."
        stepLabel="Requirement Checklist · Endorsed"
        forwardHref={signUpData ? paths.admin.creditInvestigation(encodeURIComponent(signUpData.email)) : undefined}
        forwardLabel="Continue to Credit Investigation"
      />
    );
  }
```

The Returned-to-Applicant call site is unchanged (no `forwardHref`/`forwardLabel` passed, so it keeps its single "Back to Application List" button as `variant="contained"`).

- [ ] **Step 4: Type-check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No new errors in `application-list-view.tsx` or `requirement-checklist-view.tsx`.

- [ ] **Step 5: Manually verify in browser**

With the dev server still running from Task 8: repeat the Requirement-Checklist-Endorse flow and confirm the "Endorsed" success screen now shows a "Continue to Credit Investigation" button above "Back to Application List", and clicking it navigates to the new page. Then go to the Application List, filter to the Credit Investigation queue (sidebar → Comprehensive Credit Checking → Credit Investigation), and confirm the live application's row is now clickable (not greyed out) since Requirement Checklist is endorsed.

Expected: Both behaviors work as described.

- [ ] **Step 6: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add src/sections/admin/application-list-view.tsx src/sections/admin/requirement-checklist-view.tsx
git commit -m "Unlock Credit Investigation queue after Requirement Checklist endorsement"
```

---

## Task 10: Documentation

**Files:**
- Create: `docs/ADMIN_CREDIT_INVESTIGATION.md`
- Modify: `PROJECT_OVERVIEW.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Write `docs/ADMIN_CREDIT_INVESTIGATION.md`**

```markdown
# Admin — Credit Investigation

> **Maintenance rule:** update this file whenever `credit-investigation-view.tsx`
> or its supporting files (`credit-investigation-docs.ts`,
> `credit-investigation-risk.ts`, `credit-investigation-transcript.ts`,
> `credit-investigation/ci-fee-card.tsx`, `credit-investigation/ci-report-card.tsx`,
> `credit-investigation/credit-investigation-doc-row.tsx`) change. Companion to
> `PROJECT_OVERVIEW.md` and `docs/ADMIN_REQUIREMENT_CHECKLIST.md` (the step
> immediately before this one in the pipeline).

## What this is

"Step 4 · Credit Investigation" in the admin application-review pipeline
(`src/sections/admin/credit-investigation-view.tsx`, rendered at
`/admin/applications/[id]/credit-investigation`). This is the detail
workspace for the `creditInvestigation` step under the sidebar's
"Comprehensive Credit Checking" section — that nav entry and the
`ReviewStep` type value existed before this page did, deliberately scaffolded
ahead of their workspace (see `PROJECT_OVERVIEW.md`'s admin flow section);
this page is that workspace.

Pipeline position: Initial Credit Checking → Call Report → Requirement
Checklist → **Credit Investigation** → *(next step not yet built — Appraisal
and Financial Evaluation remain non-actionable placeholders)*. The live
application's Credit Investigation queue row only becomes actionable once
`review.requirementChecklist.endorsed` is `true`.

There is no real backend and no real AI — every document's status, every
"AI Summary"/recommendation, and the transcript auto-fill are deterministic,
canned content, not a call to any external service, OCR, or LLM.

## Page order

1. `ApplicationReviewHeader` (`step="Step 4 · Credit Investigation"`,
   `reviewStep="creditInvestigation"`, `hideApplicationCard`).
2. `ApplicationDetailsCard` (collapsible, with Credit Checking Result and
   Call Report actions, `officerNotesProcess="Credit Investigation"`).
3. **Document Checklist** card.
4. **AI review, summary & recommendation** card.
5. **CI Fee** card.
6. **CI Report** card (visible once CI Fee is approved; otherwise a locked
   placeholder).
7. **Proceed application?** decision card.
8. Dialogs mounted outside the stack: Disapprove reason, Return to AMD
   reason, `RequestDocumentsDrawer`.

## Document Checklist

One card, documents grouped into 5 subgroups
(`credit-investigation-docs.ts`'s `CI_SUBGROUP_ORDER`/`CI_SUBGROUP_LABELS`),
each rendered with the shared `RequirementDocRow` component, sorted
outstanding-first within each subgroup:

- **Principal/Consumer**: TIN – Primary ID (required).
- **Spouse**: Philippine Passport – Primary ID (not required), Driver's
  License – Secondary ID (not required).
- **Mortgagor**: Primary IDs of Mortgagor with 3 specimen signature (not
  required).
- **Borrowers**: Primary IDs Borrowers with 3 specimen signature (required).
- **General Requirements**: Bank Authorization Form – signed (required),
  Registration of Business Name (not required), Proof of Billing (required),
  Additional/Other Documents (not required). Shown unconditionally for every
  applicant regardless of `application.loanType`.

Plus two groups outside the fixed metadata:

- **Bureau & Verification Checks** — CIC, CMAP, NFIS/BAP. **View-only.**
  These are required earlier, during Requirement Checklist
  (`cicCheck`/`cmapCheck`/`nfisBapCheck`); this page reads
  `review.requirementChecklist.documents` directly by key and renders each
  with `ReadOnlyBureauCheckRow` — a status chip and a **View** button
  opening the existing `fileUrl`, no Upload/Remove/Mark-as-reviewed
  controls. This page never maintains independent state for these three
  documents.
- **Additional Documents** (only rendered once at least one exists) — ad
  hoc rows the officer adds via **"+ Add document"** (a label text field);
  each becomes a `CreditInvestigationDoc` with `isCustom: true` and its own
  `label`, otherwise behaving like any other upload row.

**Request Documents** opens `RequestDocumentsDrawer`, reusing the existing
component but scoped to this page's own
`review.creditInvestigation.outreachMessages` — independent history from
Requirement Checklist's.

## AI review, summary & recommendation

`buildCreditInvestigationSummary()` (`credit-investigation-risk.ts`) is a
pure function, recomputed at render time, never stored — same pattern as
`requirement-checklist-risk.ts`. It counts the fixed document list's
verified/needs-review/missing documents and factors in whether the 3 Bureau
& Verification checks are complete (read from Requirement Checklist's
state, passed in as a plain boolean) to decide the risk level
(`'good' | 'watch' | 'high'`) and recommendation text.

## CI Fee

`review.creditInvestigation.ciFeeStatus: 'not-requested' | 'pending-approval'
| 'approved'`. There is no separate approver role or login in this
prototype — **"Request CI Fee"** moves the status to `'pending-approval'`;
**"Mark CI Fee as Approved"** (a second simulated action available to the
same officer, same convention as "Force Clean/Negative Bureau Finding"
elsewhere in this app) moves it to `'approved'`. The CI Report card is
locked (shown as a dashed placeholder) until `ciFeeStatus === 'approved'`.

## CI Report

`review.creditInvestigation.report: CiReport`
(`src/auth/admin-context.tsx`). Structured, Call-Report-style sections, all
directly editable regardless of transcript state:

- **Site Visit Details** — visit date, visit time, location visited,
  visiting officer.
- **Borrower/Residence Verification** — identity confirmed, residence
  confirmed, business confirmed (each `'yes' | 'no' | ...`).
- **Neighborhood Check** — neighbor/community feedback (free text) +
  standing select.
- **Findings & Assessment** — free text.
- **Recommendation** — preliminary recommendation select + notes.

### Transcript upload → auto-fill

Officer uploads a transcript file (stands in for a PLAUD.ai export) via a
file input in the CI Report card. Same "store filename + timestamp only,
never read file contents" convention as every other upload in this app.
Uploading triggers `buildTranscriptAutoFill()`
(`credit-investigation-transcript.ts`) — a deterministic, hash-seeded
function (same technique as `simulateBureauFinding`) keyed on the
applicant's email + transcript filename — which fills every CI Report field
above with fixed template content and produces a read-only **AI Summary**
block. Auto-fill is a convenience, not a lock: every field stays editable
before and after upload, and re-uploading a new transcript re-runs auto-fill
and overwrites current values.

## Proceed application?

Three actions, all requiring no document/report completeness gate (matching
this app's generally permissive decision-gate style elsewhere):

- **Proceed** — records `creditInvestigation.decision: 'approved'`, routes
  to the Application List. *(Placeholder routing — see Non-goals below.)*
- **Disapprove** — `ConfirmDialog` with a required typed reason, records
  `decision: 'rejected'` + `decisionReason`, routes to Reconsideration.
  *(Placeholder routing.)*
- **Return to AMD** — `ConfirmDialog` with a required typed reason, records
  `returnedToAmd: true` + `returnToAmdReason`, routes back to Requirement
  Checklist. *(Placeholder routing.)*

## Queue unlocking

`application-list-view.tsx`'s live-row `isActionable` for the
`creditInvestigation` step is `review.requirementChecklist.endorsed` — the
row is clickable in the "Comprehensive Credit Checking → Credit
Investigation" queue only once Requirement Checklist has been endorsed.
Appraisal and Financial Evaluation remain always non-actionable (unbuilt).

Requirement Checklist's "Endorsed for comprehensive process" success screen
gains a **"Continue to Credit Investigation"** button (above the existing
"Back to Application List") linking to this page — the "Returned to
applicant" success screen is unaffected.

## Non-goals / Open items

- **Exact post-decision routing for Proceed/Disapprove/Return to AMD is a
  placeholder**, chosen for a functionally complete first build (Proceed →
  Application List, Disapprove → Reconsideration, Return to AMD →
  Requirement Checklist). Revisit before considering this feature fully
  settled.
- **Appraisal and Financial Evaluation** remain scaffolded-only, unbuilt.
- **No real file parsing, real AI/LLM, or real transcription anywhere** —
  every "AI Summary" and auto-fill is deterministic template text engineered
  to look the same shape as Requirement Checklist's/Initial Credit
  Checking's existing "AI" cards.
- **No real outreach delivery** on email/WhatsApp/Viber — same
  simulated-only convention as every other `RequestDocumentsDrawer` instance.
- **No separate CI Fee approver persona/login** — approval is a second
  simulated action for the same officer, not a distinct workflow role.
```

- [ ] **Step 2: Update `PROJECT_OVERVIEW.md`**

Find the admin flow diagram:

```
/admin/login  →  /admin/dashboard  →  /admin/credit-checking (list, all applications)
  →  /admin/applications/[id]/credit-checking
       ├─ Approved → /admin/applications/[id]/call-report
       │              → Proceed → /admin/applications/[id]/requirement-checklist → Endorse
       └─ No → /admin/applications/[id]/reconsideration
                 ├─ Approve → rejoins at call-report
                 └─ No → "Client notified" terminal state
```

Replace with:

```
/admin/login  →  /admin/dashboard  →  /admin/credit-checking (list, all applications)
  →  /admin/applications/[id]/credit-checking
       ├─ Approved → /admin/applications/[id]/call-report
       │              → Proceed → /admin/applications/[id]/requirement-checklist
       │                 → Endorse → /admin/applications/[id]/credit-investigation
       │                    ├─ Proceed → Application List
       │                    ├─ Disapprove → /admin/applications/[id]/reconsideration
       │                    └─ Return to AMD → /admin/applications/[id]/requirement-checklist
       └─ No → /admin/applications/[id]/reconsideration
                 ├─ Approve → rejoins at call-report
                 └─ No → "Client notified" terminal state
```

Then find the line:

```
**Initial Credit Checking has its own dedicated doc:
`docs/ADMIN_INITIAL_CREDIT_CHECKING.md`.**
```

And add a new paragraph right before it:

```
**Credit Investigation has its own dedicated doc:
`docs/ADMIN_CREDIT_INVESTIGATION.md`.** It is the detail workspace for the
`creditInvestigation` step under the sidebar's "Comprehensive Credit
Checking" section, sitting after Requirement Checklist in the pipeline —
covering the grouped document checklist (including view-only Bureau &
Verification rows sourced from Requirement Checklist's own state), the CI
Fee request/approval gate, and the CI Report's transcript-upload auto-fill.
Update that file, not this section, when this screen changes.

```

Also find the `RequirementChecklist` entry in the `AdminContext` data-model
code block (`ApplicationReview { creditChecking, reconsideration,
negativeCreditReport, callReport, requirementChecklist }`) and update it to:

```
ApplicationReview { creditChecking, reconsideration, negativeCreditReport, callReport, requirementChecklist, creditInvestigation }
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add docs/ADMIN_CREDIT_INVESTIGATION.md PROJECT_OVERVIEW.md
git commit -m "Document the Credit Investigation page"
```

---

## Task 11: Full build verification

**Files:** None (verification only).

- [ ] **Step 1: Run the full TypeScript check**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npx tsc --noEmit`
Expected: No errors anywhere in the project.

- [ ] **Step 2: Run the production build**

Run: `cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2" && npm run build`
Expected: Build completes successfully, including a new static/dynamic route
entry for `/admin/applications/[id]/credit-investigation` in the build output.

- [ ] **Step 3: Final manual smoke test**

With `npm run dev` running, repeat the full flow end-to-end once more from a
freshly cleared session (use the Application List's "Clear Sample Data" to
reset, or open a private/incognito window): sign up a new borrower →
approve through Initial Credit Checking → Call Report → Requirement
Checklist (endorse) → Credit Investigation (fill documents, request/approve
CI Fee, upload a transcript, confirm auto-fill, Proceed). Confirm no console
errors at any step.

Expected: Full flow completes without errors.

- [ ] **Step 4: Commit (if any fixes were needed during verification)**

```bash
cd "/Users/almikkaj/Downloads/Gvtech Code/lms-v2"
git add -A
git commit -m "Fix issues found during Credit Investigation build verification"
```

(Skip this step entirely if no fixes were needed.)
