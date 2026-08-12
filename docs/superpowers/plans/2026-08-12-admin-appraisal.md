# Admin Appraisal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Appraisal admin pipeline step — fee flow, appraiser assignment (in-house/external), report creation, Head Approval, and a Pass/Fail gate — as a new page between Credit Investigation and a Credit Scoring stub.

**Architecture:** One new `Appraisal` data type + context actions on `src/auth/admin-context.tsx` (mirrors `CreditInvestigation`'s shape/actions), one new route + view component (`appraisal-view.tsx`) built from small per-concern card components under `src/sections/admin/appraisal/`, wired into the existing queue (`application-list-view.tsx`) and routing table (`paths.ts`).

**Tech Stack:** Next.js (App Router), React, MUI, `react-dropzone`, `react-number-format`. No test framework exists in this repo — verification is `npx tsc --noEmit`, `npm run lint`, and manual browser walkthroughs, matching every other admin page.

## Global Constraints

- No real Sendit or Odoo integration — every external touchpoint is a simulated local-state transition with a timestamp, following this app's existing "simulated second officer" convention (see `ci-fee-card.tsx`'s header comment).
- No real-time photo capture, lot plotting, or market-value lookup — render the diagram's own note text verbatim as a dashed, non-functional callout: *"Note : Realtime taking picture, uploading of files anywhere in the system (integrate lot plotting and market value)"*.
- Credit Scoring itself is out of scope — build only a placeholder stub page.
- Pass/Fail is a manual officer judgment call — no computed comparison logic.
- Every new UI string/component follows this app's existing visual conventions exactly: `adminCardSx` for cards, `#1C2A6E` navy for primary actions, `ConfirmDialog` + `confirmDialogActionToneSx` for reason-required confirmations, `TONE_COLORS`/`StatusBadge` for status pills — do not invent new colors or dialog patterns.
- Run `npx tsc --noEmit` after every task; it must report zero errors before moving on.

---

### Task 1: `Appraisal` data model on `admin-context.tsx`

**Files:**
- Modify: `src/auth/admin-context.tsx`

**Interfaces:**
- Produces: `AppraisalFeeStatus`, `AppraiserType`, `AppraisalReport`, `HeadApprovalStatus`, `Appraisal` types; `appraisal: Appraisal` field on `ApplicationReview`; `createInitialAppraisal(): Appraisal` factory; `setAppraisal: (data: Partial<Appraisal>) => void` and `setAppraisalReport: (data: Partial<AppraisalReport>) => void` on `AdminContextValue`.

- [ ] **Step 1: Add the new types**

Add directly above `export type CreditInvestigation = {` (search for that exact line — it's preceded by the `CiReport` type block):

```ts
export type AppraisalFeeStatus =
  | 'not-requested'
  | 'pending-approval'
  | 'approved'
  | 'declined'
  | 'not-applicable';

export type AppraiserType = 'inhouse' | 'external';

export type AppraisalReport = {
  propertyDetails: string;
  appraisedValue: string;
  remarks: string;
  recommendation: string;
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
};

export type HeadApprovalStatus = 'pending' | 'approved' | 'declined';

export type Appraisal = {
  feeStatus: AppraisalFeeStatus;
  feeAmount: string;
  feeDescription: string;
  feeRemarks: string;
  feeDeclineReason: string;
  clientNotifiedAt: string | null;
  sentToOdooAt: string | null;
  paymentReceivedAt: string | null;
  appraiserType: AppraiserType | null;
  report: AppraisalReport;
  headApprovalStatus: HeadApprovalStatus;
  headApprovalDeclineReason: string;
  passed: boolean | null;
  failReason: string;
};
```

- [ ] **Step 2: Add `appraisal: Appraisal;` to `ApplicationReview`**

Find `creditInvestigation: CreditInvestigation;` inside `export type ApplicationReview = {` (around line 736) and add directly below it:

```ts
  creditInvestigation: CreditInvestigation;
  appraisal: Appraisal;
```

- [ ] **Step 3: Add `setAppraisal`/`setAppraisalReport` to `AdminContextValue`**

Find `setCiReport: (data: Partial<CiReport>) => void;` inside the `AdminContextValue` type (around line 780) and add directly below the `setCreditInvestigation`/`setCiReport` pair:

```ts
  setCreditInvestigation: (data: Partial<CreditInvestigation>) => void;
  setCiReport: (data: Partial<CiReport>) => void;
  setAppraisal: (data: Partial<Appraisal>) => void;
  setAppraisalReport: (data: Partial<AppraisalReport>) => void;
```

- [ ] **Step 4: Add `createInitialAppraisal()` factory**

Add directly below `function createInitialCreditInvestigation(): CreditInvestigation { ... }`:

```ts
function createInitialAppraisal(): Appraisal {
  return {
    feeStatus: 'not-requested',
    feeAmount: '',
    feeDescription: '',
    feeRemarks: '',
    feeDeclineReason: '',
    clientNotifiedAt: null,
    sentToOdooAt: null,
    paymentReceivedAt: null,
    appraiserType: null,
    report: {
      propertyDetails: '',
      appraisedValue: '',
      remarks: '',
      recommendation: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
    },
    headApprovalStatus: 'pending',
    headApprovalDeclineReason: '',
    passed: null,
    failReason: '',
  };
}
```

- [ ] **Step 5: Wire the factory into `createInitialReview()`**

Find `creditInvestigation: createInitialCreditInvestigation(),` inside `createInitialReview()` (around line 1131) and add directly below it:

```ts
    creditInvestigation: createInitialCreditInvestigation(),
    appraisal: createInitialAppraisal(),
```

- [ ] **Step 6: One-level-deep merge `appraisal` in `readStoredState()`**

Find the `creditInvestigation: { ...initialState.review.creditInvestigation, ...storedReview.creditInvestigation, ... }` block inside `readStoredState()` (around line 1225) and add a sibling block directly after its closing `},`:

```ts
        appraisal: {
          ...initialState.review.appraisal,
          ...storedReview.appraisal,
          report: {
            ...initialState.review.appraisal.report,
            ...storedReview.appraisal?.report,
          },
        },
```

- [ ] **Step 7: Implement `setAppraisal`/`setAppraisalReport` in the provider**

Find `setCiReport: (data) => setState((prev) => ({ ... }))` inside `AdminProvider` (around line 1531) and add directly after it, following the exact same flat-merge / nested-merge pattern:

```ts
      setAppraisal: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: { ...prev.review.appraisal, ...data },
          },
        })),
      setAppraisalReport: (data) =>
        setState((prev) => ({
          ...prev,
          review: {
            ...prev.review,
            appraisal: {
              ...prev.review.appraisal,
              report: { ...prev.review.appraisal.report, ...data },
            },
          },
        })),
```

- [ ] **Step 8: Expose both actions from the context value**

Find the object literal returned by `AdminProvider`'s context `value` (the same object containing `setCreditInvestigation`/`setCiReport` you just edited in Step 7 — they're properties of one shared object) and confirm `setAppraisal`/`setAppraisalReport` are present as siblings. No separate edit needed if Step 7 added them directly into that object; just verify.

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `Appraisal`, `appraisal`, `setAppraisal`, or `setAppraisalReport`. (Errors about unrelated pre-existing files are not this task's concern — confirm none are new.)

- [ ] **Step 10: Commit**

```bash
git add src/auth/admin-context.tsx
git commit -m "Add Appraisal data model and context actions"
```

---

### Task 2: Routing — path helper, page file, Credit Scoring stub

**Files:**
- Modify: `src/routes/paths.ts`
- Create: `src/app/admin/applications/[id]/appraisal/page.tsx`
- Create: `src/app/admin/applications/[id]/credit-scoring/page.tsx`

**Interfaces:**
- Consumes: none (this task only wires routes; the view component it points to is built in Task 5).
- Produces: `paths.admin.appraisal(id: string): string`, `paths.admin.creditScoring(id: string): string`.

- [ ] **Step 1: Add path helpers**

In `src/routes/paths.ts`, find `creditInvestigation: (id: string) => \`/admin/applications/${id}/credit-investigation\`,` and add directly below it:

```ts
    creditInvestigation: (id: string) => `/admin/applications/${id}/credit-investigation`,
    appraisal: (id: string) => `/admin/applications/${id}/appraisal`,
    creditScoring: (id: string) => `/admin/applications/${id}/credit-scoring`,
```

- [ ] **Step 2: Create the Appraisal page file**

Create `src/app/admin/applications/[id]/appraisal/page.tsx`:

```tsx
// src/app/admin/applications/[id]/appraisal/page.tsx
import type { Metadata } from 'next';

import { AppraisalView } from 'src/sections/admin/appraisal-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Appraisal | HHC LMS Admin',
};

export default function Page() {
  return <AppraisalView />;
}
```

(This import will fail to resolve until Task 5 creates `appraisal-view.tsx` — that's expected and fixed by Task 5's type-check, not this one.)

- [ ] **Step 3: Create the Credit Scoring stub page**

Create `src/app/admin/applications/[id]/credit-scoring/page.tsx`:

```tsx
// src/app/admin/applications/[id]/credit-scoring/page.tsx
import type { Metadata } from 'next';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { adminCardSx } from 'src/components/admin-ui';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Credit Scoring | HHC LMS Admin',
};

export default function Page() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack
        alignItems="center"
        textAlign="center"
        spacing={2}
        sx={{ ...adminCardSx, p: { xs: 4, md: 6 } }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#EEF1FE',
          }}
        >
          <Iconify icon="solar:chart-2-bold-duotone" width={26} sx={{ color: '#1C2A6E' }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
          Credit Scoring — coming soon
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>
          This step isn&apos;t built yet. The appraisal passed and this application is ready to
          move forward once Credit Scoring is available.
        </Typography>
        <Button
          component={RouterLink}
          href={paths.admin.applications}
          variant="outlined"
          sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', mt: 0.5 }}
        >
          Back to Application List
        </Button>
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: one error, from the Appraisal page file, that `src/sections/admin/appraisal-view` has no exported member `AppraisalView` (module not found). This is the only acceptable error at this point — everything else must be clean. No errors expected from the Credit Scoring stub page.

- [ ] **Step 5: Commit**

```bash
git add src/routes/paths.ts "src/app/admin/applications/[id]/appraisal/page.tsx" "src/app/admin/applications/[id]/credit-scoring/page.tsx"
git commit -m "Add Appraisal route and Credit Scoring stub page"
```

---

### Task 3: Appraisal Fee card

**Files:**
- Create: `src/sections/admin/appraisal/appraisal-fee-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` → `review.appraisal` (`Appraisal`, from Task 1), `setAppraisal` (from Task 1). `useRegisterPageActions` from `src/layouts/admin/page-actions-context`. `adminCardSx`, `outlinedNavyButtonSx`, `TONE_COLORS`, `SemanticTone` from `src/components/admin-ui`. `ConfirmDialog`, `confirmDialogActionToneSx` from `src/components/custom-dialog`. `fCurrency` from `src/utils/format-number`. `Iconify` from `src/components/iconify`.
- Produces: `AppraisalFeeCard` component (no props — reads/writes context directly, same as `CiFeeCard`; registers its own simulated approve/decline page actions internally, so no other file needs to). Later tasks render `<AppraisalFeeCard />` and read `review.appraisal.feeStatus`/`clientNotifiedAt`/`sentToOdooAt`/`paymentReceivedAt` to decide when to unlock the Appraiser Assignment card.

`feeStatus` never actually renders as `'declined'` — decline is a same-tick reset straight back to `'not-requested'` (see Step 1's `confirmFeeDecline`), the same convention `CiFeeCard`'s decline flow uses. `STATUS_COPY` therefore only needs entries for the four states that are ever rendered; `'declined'` stays a valid `AppraisalFeeStatus` value (kept for type symmetry with `AppraisalFeeStatus`) but is never looked up.

- [ ] **Step 1: Create the file**

Create `src/sections/admin/appraisal/appraisal-fee-card.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, outlinedNavyButtonSx, TONE_COLORS, type SemanticTone } from 'src/components/admin-ui';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

// ----------------------------------------------------------------------
// Appraisal Fee request/approval gate — same shape as CI Fee
// (ci-fee-card.tsx): the officer decides Yes/No first; "No" resolves
// straight to 'not-applicable'. "Yes" opens a request form before moving
// to 'pending-approval'. There's no real approver role in this prototype,
// so approval/decline is simulated via a page action this card registers
// itself, same convention as CI Fee's inline "Simulate: Another Officer
// Approves/Declines CI Fee" actions.
//
// Once approved (or not-applicable), "Advise Client to Settle" simulates
// three things at once, matching the source diagram's swimlanes: a client
// email notification, a request sent to Odoo, and a Sendit payment link —
// none of which are real integrations. `clientNotifiedAt`/`sentToOdooAt`
// are set together; `paymentReceivedAt` is set later by a separate
// simulated "payment received" page action, gating the Appraiser
// Assignment card below.
// ----------------------------------------------------------------------

const STATUS_COPY: Record<
  'not-requested' | 'pending-approval' | 'approved' | 'not-applicable',
  { icon: string; tone: SemanticTone; title: string; body: string }
> = {
  'not-requested': {
    icon: 'solar:wallet-money-bold-duotone',
    tone: 'neutral',
    title: 'Appraisal Fee not yet requested',
    body: 'Does this application need an Appraisal fee?',
  },
  'pending-approval': {
    icon: 'solar:hourglass-bold-duotone',
    tone: 'warning',
    title: 'Appraisal Fee awaiting approval',
    body: 'The request has been sent. A different officer must approve it before appraiser assignment can proceed.',
  },
  approved: {
    icon: 'solar:check-circle-bold',
    tone: 'success',
    title: 'Appraisal Fee approved',
    body: 'Advise the client to settle the fee to unlock appraiser assignment below.',
  },
  'not-applicable': {
    icon: 'solar:forbidden-circle-linear',
    tone: 'info',
    title: 'No Appraisal Fee for this application',
    body: 'No fee was needed. Appraiser assignment below is unlocked.',
  },
};

export function AppraisalFeeCard() {
  const { review, setAppraisal } = useAdmin();
  const {
    feeStatus,
    feeAmount,
    feeDescription,
    feeRemarks,
    clientNotifiedAt,
    paymentReceivedAt,
  } = review.appraisal;
  // feeStatus is narrowed to the 4 renderable states here — see the note
  // above STATUS_COPY: 'declined' is never actually observed because
  // confirmFeeDecline() below resets straight back to 'not-requested' in
  // the same action.
  const copy = STATUS_COPY[feeStatus as 'not-requested' | 'pending-approval' | 'approved' | 'not-applicable'];
  const toneColors = TONE_COLORS[copy.tone];

  const [requestOpen, setRequestOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [remarksDraft, setRemarksDraft] = useState('');
  const hasValidAmount = Number(amountDraft) > 0;

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReasonDraft, setDeclineReasonDraft] = useState('');

  const confirmFeeDecline = () => {
    if (!declineReasonDraft.trim()) return;
    setAppraisal({
      feeStatus: 'not-requested',
      feeAmount: '',
      feeDescription: '',
      feeRemarks: '',
      feeDeclineReason: declineReasonDraft.trim(),
    });
    setDeclineOpen(false);
    setDeclineReasonDraft('');
  };

  // Simulated second-officer approval/decline, same convention as
  // credit-investigation-view.tsx's CI Fee page actions — registered here
  // (not in appraisal-view.tsx) so this card owns its entire fee lifecycle
  // in one file, the same way CiFeeCard would if it registered its own
  // page actions instead of credit-investigation-view.tsx doing it for it.
  useRegisterPageActions(
    useMemo(
      () =>
        feeStatus === 'pending-approval'
          ? [
              {
                key: 'simulate-appraisal-fee-approval',
                label: 'Simulate: Another Officer Approves Appraisal Fee',
                icon: 'solar:user-check-bold-duotone',
                color: '#0C8A4F',
                onClick: () => setAppraisal({ feeStatus: 'approved' }),
              },
              {
                key: 'simulate-appraisal-fee-decline',
                label: 'Simulate: Another Officer Declines Appraisal Fee',
                icon: 'solar:user-cross-bold-duotone',
                color: '#B32C22',
                onClick: () => setDeclineOpen(true),
              },
            ]
          : [],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [feeStatus]
    )
  );

  const openRequestForm = () => {
    setAmountDraft('');
    setDescriptionDraft('');
    setRemarksDraft('');
    setRequestOpen(true);
  };

  const submitRequest = () => {
    if (!hasValidAmount || !descriptionDraft.trim()) return;
    setAppraisal({
      feeStatus: 'pending-approval',
      feeAmount: amountDraft.trim(),
      feeDescription: descriptionDraft.trim(),
      feeRemarks: remarksDraft.trim(),
    });
    setRequestOpen(false);
  };

  const adviseClient = () => {
    const now = new Date().toISOString();
    setAppraisal({ clientNotifiedAt: now, sentToOdooAt: now });
  };

  return (
    <Box sx={adminCardSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ p: 2, borderRadius: '12px', bgcolor: toneColors.bg }}
      >
        <Iconify icon={copy.icon} width={22} sx={{ color: toneColors.text, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: toneColors.text }}>
            {copy.title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>{copy.body}</Typography>
        </Box>

        {(feeStatus === 'not-requested' || feeStatus === 'not-applicable') && (
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {feeStatus === 'not-requested' && (
              <>
                <Button
                  onClick={openRequestForm}
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="solar:send-square-bold" width={16} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
                >
                  Yes, Request Appraisal Fee
                </Button>
                <Button
                  onClick={() => setAppraisal({ feeStatus: 'not-applicable' })}
                  variant="outlined"
                  size="small"
                  sx={{ ...outlinedNavyButtonSx, px: 2, whiteSpace: 'nowrap', bgcolor: 'common.white' }}
                >
                  No Fee Needed
                </Button>
              </>
            )}
            {feeStatus === 'not-applicable' && (
              <Button
                onClick={() => setAppraisal({ feeStatus: 'not-requested' })}
                variant="outlined"
                size="small"
                sx={{ ...outlinedNavyButtonSx, px: 2, whiteSpace: 'nowrap', bgcolor: 'common.white' }}
              >
                Actually, this needs a fee
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {feeStatus === 'pending-approval' || feeStatus === 'approved' ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 1.5, p: 2, borderRadius: '12px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Box
              sx={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: '#1C2A6E' }}
            >
              <Iconify icon="solar:wad-of-money-bold-duotone" width={24} sx={{ color: 'common.white' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>
                REQUEST AMOUNT
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: 21, fontWeight: 800, color: '#1C2A6E' }}>
                {fCurrency(feeAmount)}
              </Typography>
            </Box>
          </Stack>

          <Stack
            spacing={1.25}
            sx={{
              flex: 1,
              minWidth: 0,
              pt: { xs: 1.5, sm: 0 },
              pl: { xs: 0, sm: 2 },
              borderTop: { xs: '1px solid #E7EAF1', sm: 'none' },
              borderLeft: { xs: 'none', sm: '1px solid #E7EAF1' },
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>Description</Typography>
              <Typography sx={{ fontSize: 13, color: '#3B4256', mt: 0.25 }}>{feeDescription}</Typography>
            </Box>
            {feeRemarks && (
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#8891A6' }}>Remarks</Typography>
                <Typography sx={{ fontSize: 13, color: '#3B4256', mt: 0.25 }}>{feeRemarks}</Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      ) : null}

      {feeStatus === 'approved' && (
        <Stack spacing={1.25} sx={{ mt: 1.5, p: 2, borderRadius: '12px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                Advise client to settle the Appraisal fee
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.25 }}>
                {clientNotifiedAt
                  ? `Sent ${new Date(clientNotifiedAt).toLocaleString()} — request details sent to Odoo, payment link sent via Sendit.`
                  : 'Sends a payment link (Sendit) and notifies Odoo — both simulated.'}
              </Typography>
            </Box>
            {!clientNotifiedAt && (
              <Button
                onClick={adviseClient}
                variant="contained"
                size="small"
                sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
              >
                Advise Client
              </Button>
            )}
          </Stack>
          {clientNotifiedAt && !paymentReceivedAt && (
            <Button
              onClick={() => setAppraisal({ paymentReceivedAt: new Date().toISOString() })}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:card-recive-bold-duotone" width={16} />}
              sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start', bgcolor: 'common.white' }}
            >
              Simulate: Payment Received (Sendit)
            </Button>
          )}
          {paymentReceivedAt && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0C8A4F' }}>
              Payment received {new Date(paymentReceivedAt).toLocaleString()}
            </Typography>
          )}
        </Stack>
      )}

      <ConfirmDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request Appraisal Fee"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <NumericFormat
              autoFocus
              fullWidth
              customInput={TextField}
              label="Request Amount"
              placeholder="0.00"
              value={amountDraft}
              onValueChange={({ value }) => setAmountDraft(value)}
              thousandSeparator=","
              decimalScale={2}
              allowNegative={false}
              allowLeadingZeros={false}
              valueIsNumericString
              error={amountDraft !== '' && !hasValidAmount}
              helperText={
                amountDraft !== '' && !hasValidAmount
                  ? 'Enter an amount greater than ₱0.00.'
                  : 'Use the exact approved/requested fee amount.'
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1C2A6E' }}>₱</Typography>
                  </InputAdornment>
                ),
              }}
              inputProps={{ inputMode: 'decimal' }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'common.white', fontSize: 16, fontWeight: 700 },
                '& .MuiFormHelperText-root': { mx: 0, fontSize: 11.5 },
              }}
            />
            <TextField
              fullWidth
              label="Request Amount Description"
              placeholder="What this amount covers, e.g. Site visit + valuation fee"
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Remarks"
              placeholder="Optional notes for this request"
              value={remarksDraft}
              onChange={(event) => setRemarksDraft(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!hasValidAmount || !descriptionDraft.trim()}
            onClick={submitRequest}
            sx={confirmDialogActionToneSx.default}
          >
            Send Request
          </Button>
        }
      />

      <ConfirmDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Reason for declining Appraisal Fee"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={declineReasonDraft}
            onChange={(event) => setDeclineReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineReasonDraft.trim()}
            onClick={confirmFeeDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `appraisal-fee-card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/sections/admin/appraisal/appraisal-fee-card.tsx
git commit -m "Add Appraisal Fee card component"
```

---

### Task 4: Appraiser Assignment card, Head Approval card, Pass/Fail card

**Files:**
- Create: `src/sections/admin/appraisal/appraiser-assignment-card.tsx`
- Create: `src/sections/admin/appraisal/head-approval-card.tsx`
- Create: `src/sections/admin/appraisal/pass-fail-card.tsx`

**Interfaces:**
- Consumes: `useAdmin()` → `review.appraisal` (`Appraisal`), `setAppraisal`, `setAppraisalReport` (all from Task 1). `AppraiserType`, `HeadApprovalStatus` types (from Task 1). `AddDocFileDropzone`-equivalent local dropzone (write a local copy in `appraiser-assignment-card.tsx` — see Step 1 note). `ConfirmDialog`, `confirmDialogActionToneSx`, `adminCardSx`, `outlinedNavyButtonSx`, `Iconify`, `FileThumbnail`.
- Produces: `AppraiserAssignmentCard`, `HeadApprovalCard`, `PassFailCard` components (each no props, each reads/writes context directly). `PassFailCard` accepts one prop: `onFailed: () => void` (called after the officer confirms Fail, so the parent view can swap to the terminal outcome screen) and `onPassed: (email: string) => void` is NOT needed — the "Proceed to Credit Scoring" button routes directly using `useRegistration()`'s `signUpData` inside this card.

- [ ] **Step 1: Create the Appraiser Assignment card**

Create `src/sections/admin/appraisal/appraiser-assignment-card.tsx`:

```tsx
'use client';

import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

import type { AppraiserType } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// In-house vs external appraiser assignment. In-house fills out a
// structured report form inline; external just uploads the appraiser's
// finished report as a file. Switching type before Head Approval clears
// the other path's partial data — the two are mutually exclusive, same
// convention as CI Fee's amount reset on decline.
//
// The dashed note below the in-house form is verbatim from the source
// process diagram — real-time photo capture, lot plotting, and
// market-value lookup are flagged there as future integration work, not
// built here.
// ----------------------------------------------------------------------

function ReportFileDropzone({ value, onChange }: { value: File | null; onChange: (file: File | null) => void }) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: { 'image/*': [], 'application/pdf': [] },
    onDrop: (acceptedFiles) => onChange(acceptedFiles[0] ?? null),
  });

  return (
    <Box
      {...(value ? {} : getRootProps())}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minHeight: 44,
        px: 1.5,
        py: value ? 1 : 0,
        borderRadius: '10px',
        cursor: value ? 'default' : 'pointer',
        border: '1.5px dashed',
        borderColor: '#B0B8CC',
        bgcolor: 'common.white',
        '&:hover': value ? undefined : { borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
      }}
    >
      {!value && <input {...getInputProps()} />}
      {value ? (
        <>
          <FileThumbnail file={value} sx={{ width: 30, height: 30 }} />
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: '#344054', flex: 1, minWidth: 0 }}>
            {value.name}
          </Typography>
          <IconButton size="small" onClick={() => onChange(null)}>
            <Iconify icon="mingcute:close-line" width={16} />
          </IconButton>
        </>
      ) : (
        <>
          <Iconify icon="solar:upload-minimalistic-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1C2A6E' }}>
            Choose a file — Appraisal Report
          </Typography>
        </>
      )}
    </Box>
  );
}

export function AppraiserAssignmentCard() {
  const { review, setAppraisal, setAppraisalReport } = useAdmin();
  const { appraiserType, report, headApprovalStatus } = review.appraisal;
  const locked = headApprovalStatus !== 'pending' || !!report.uploadedAt;
  const editable = !locked;

  const selectType = (type: AppraiserType) => {
    if (type === appraiserType) return;
    setAppraisal({ appraiserType: type });
    setAppraisalReport({
      propertyDetails: '',
      appraisedValue: '',
      remarks: '',
      recommendation: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
    });
  };

  const handleExternalFile = (file: File | null) => {
    if (!file) {
      setAppraisalReport({ fileName: null, fileUrl: null, uploadedAt: null });
      return;
    }
    setAppraisalReport({
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    });
  };

  const submitInhouseReport = () => {
    if (!report.propertyDetails.trim() || !report.appraisedValue.trim()) return;
    setAppraisalReport({ uploadedAt: new Date().toISOString() });
  };

  const externalFile = report.fileName
    ? new File([], report.fileName)
    : null;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Appraiser Assignment
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Assign an in-house appraiser or upload an external appraiser&apos;s finished report.
      </Typography>

      <ButtonGroup sx={{ mb: 2.5 }}>
        <Button
          onClick={() => selectType('inhouse')}
          variant={appraiserType === 'inhouse' ? 'contained' : 'outlined'}
          disabled={locked && appraiserType !== 'inhouse'}
          sx={appraiserType === 'inhouse' ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } } : outlinedNavyButtonSx}
        >
          In-house
        </Button>
        <Button
          onClick={() => selectType('external')}
          variant={appraiserType === 'external' ? 'contained' : 'outlined'}
          disabled={locked && appraiserType !== 'external'}
          sx={appraiserType === 'external' ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } } : outlinedNavyButtonSx}
        >
          External
        </Button>
      </ButtonGroup>

      {appraiserType === 'inhouse' && (
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="Property Details"
            placeholder="Site description, lot area, improvements observed"
            multiline
            minRows={2}
            value={report.propertyDetails}
            disabled={!editable}
            onChange={(event) => setAppraisalReport({ propertyDetails: event.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
          <TextField
            fullWidth
            label="Appraised Value"
            placeholder="0.00"
            value={report.appraisedValue}
            disabled={!editable}
            onChange={(event) => setAppraisalReport({ appraisedValue: event.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
          <TextField
            fullWidth
            label="Remarks"
            multiline
            minRows={2}
            value={report.remarks}
            disabled={!editable}
            onChange={(event) => setAppraisalReport({ remarks: event.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
          <TextField
            fullWidth
            label="Recommendation"
            multiline
            minRows={2}
            value={report.recommendation}
            disabled={!editable}
            onChange={(event) => setAppraisalReport({ recommendation: event.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />

          <Box
            sx={{
              p: 1.5,
              borderRadius: '10px',
              border: '1.5px dashed #C7CCDA',
              bgcolor: '#F9FAFC',
            }}
          >
            <Typography sx={{ fontSize: 12, fontStyle: 'italic', color: '#5A6273' }}>
              Note: Realtime taking picture, uploading of files anywhere in the system (integrate
              lot plotting and market value)
            </Typography>
          </Box>

          {editable && (
            <Button
              onClick={submitInhouseReport}
              variant="contained"
              disabled={!report.propertyDetails.trim() || !report.appraisedValue.trim()}
              sx={{ alignSelf: 'flex-start', bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Create Appraisal Report
            </Button>
          )}
          {report.uploadedAt && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0C8A4F' }}>
              Report created {new Date(report.uploadedAt).toLocaleString()}
            </Typography>
          )}
        </Stack>
      )}

      {appraiserType === 'external' && (
        <Stack spacing={1.5}>
          <ReportFileDropzone value={editable ? externalFile : externalFile} onChange={handleExternalFile} />
          {report.uploadedAt && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0C8A4F' }}>
              Uploaded {new Date(report.uploadedAt).toLocaleString()}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Create the Head Approval card**

Create `src/sections/admin/appraisal/head-approval-card.tsx`:

```tsx
'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, outlinedNavyButtonSx, TONE_COLORS } from 'src/components/admin-ui';

// ----------------------------------------------------------------------
// Simulated head-officer review of the submitted appraisal report/file —
// same "no real second login" convention as CI Fee approval. Declining
// requires a typed reason and clears the submitted report/file so the
// assigned appraiser (in-house or external) resubmits; the appraiserType
// choice itself is preserved.
// ----------------------------------------------------------------------

export function HeadApprovalCard() {
  const { review, setAppraisal, setAppraisalReport } = useAdmin();
  const { headApprovalStatus, headApprovalDeclineReason } = review.appraisal;
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const approve = () => setAppraisal({ headApprovalStatus: 'approved' });

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setAppraisal({ headApprovalStatus: 'pending', headApprovalDeclineReason: declineReason.trim() });
    setAppraisalReport({ uploadedAt: null, fileName: null, fileUrl: null });
    setDeclineOpen(false);
    setDeclineReason('');
  };

  const tone = headApprovalStatus === 'approved' ? TONE_COLORS.success : TONE_COLORS.warning;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Head Approval
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Reviewed and noted by the department head before the Pass/Fail decision below.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ p: 2, borderRadius: '12px', bgcolor: tone.bg }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify
            icon={headApprovalStatus === 'approved' ? 'solar:check-circle-bold' : 'solar:hourglass-bold-duotone'}
            width={20}
            sx={{ color: tone.text }}
          />
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: tone.text }}>
              {headApprovalStatus === 'approved' ? 'Approved — reviewed and noted' : 'Awaiting Head Approval'}
            </Typography>
            {headApprovalDeclineReason && headApprovalStatus === 'pending' && (
              <Typography sx={{ fontSize: 12, color: '#5A6273', mt: 0.25 }}>
                Last decline reason: {headApprovalDeclineReason}
              </Typography>
            )}
          </Box>
        </Stack>

        {headApprovalStatus === 'pending' && (
          <Stack direction="row" spacing={1.25} flexShrink={0}>
            <Button
              onClick={approve}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#0C8A4F', borderRadius: '10px', px: 2, '&:hover': { bgcolor: '#0A7042' } }}
            >
              Simulate: Head Approves
            </Button>
            <Button
              onClick={() => setDeclineOpen(true)}
              variant="outlined"
              size="small"
              sx={{ ...outlinedNavyButtonSx, px: 2, bgcolor: 'common.white' }}
            >
              Simulate: Head Declines
            </Button>
          </Stack>
        )}
      </Stack>

      <ConfirmDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Reason for declining"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what needs revision…"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineReason.trim()}
            onClick={confirmDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Box>
  );
}
```

- [ ] **Step 3: Create the Pass/Fail card**

Create `src/sections/admin/appraisal/pass-fail-card.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

// ----------------------------------------------------------------------
// Manual Pass/Fail judgment call, gated on Head Approval. Pass routes
// forward to the Credit Scoring stub; Fail requires a typed reason and
// calls `onFailed` so the parent view swaps to a terminal outcome screen —
// this app has no automated appraised-value-vs-loan-amount comparison.
// ----------------------------------------------------------------------

export function PassFailCard({ onFailed }: { onFailed: (reason: string) => void }) {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review, setAppraisal } = useAdmin();
  const { passed } = review.appraisal;

  const [failOpen, setFailOpen] = useState(false);
  const [failReasonDraft, setFailReasonDraft] = useState('');

  const confirmFail = () => {
    if (!failReasonDraft.trim()) return;
    setAppraisal({ passed: false, failReason: failReasonDraft.trim() });
    setFailOpen(false);
    onFailed(failReasonDraft.trim());
  };

  const markPassed = () => setAppraisal({ passed: true });

  const proceedToCreditScoring = () => {
    if (!signUpData) return;
    router.push(paths.admin.creditScoring(encodeURIComponent(signUpData.email)));
  };

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Passed?
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Decide whether this appraisal passes or fails.
      </Typography>

      {passed === null && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
          <Button
            onClick={markPassed}
            variant="contained"
            startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
            sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
          >
            Pass
          </Button>
          <Button
            onClick={() => setFailOpen(true)}
            variant="outlined"
            startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
            sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
          >
            Fail
          </Button>
        </Stack>
      )}

      {passed === true && (
        <Button
          onClick={proceedToCreditScoring}
          variant="contained"
          startIcon={<Iconify icon="solar:arrow-right-bold" width={18} />}
          sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
        >
          Proceed to Credit Scoring
        </Button>
      )}

      <ConfirmDialog
        open={failOpen}
        onClose={() => setFailOpen(false)}
        title="Reason for failing this appraisal"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={failReasonDraft}
            onChange={(event) => setFailReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!failReasonDraft.trim()}
            onClick={confirmFail}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Box>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from any of the three new files. (`outlinedNavyButtonSx` unused-import warnings, if any, must be resolved by removing the unused import — check each file actually uses every import.)

- [ ] **Step 5: Commit**

```bash
git add src/sections/admin/appraisal/appraiser-assignment-card.tsx src/sections/admin/appraisal/head-approval-card.tsx src/sections/admin/appraisal/pass-fail-card.tsx
git commit -m "Add Appraiser Assignment, Head Approval, and Pass/Fail cards"
```

---

### Task 5: `AppraisalView` — assemble the page

**Files:**
- Create: `src/sections/admin/appraisal-view.tsx`

**Interfaces:**
- Consumes: `AppraisalFeeCard` (Task 3), `AppraiserAssignmentCard`, `HeadApprovalCard`, `PassFailCard` (Task 4, `PassFailCard` takes `onFailed: (reason: string) => void`), `Appraisal` type + `useAdmin()` (Task 1), `ApplicationReviewHeader`, `ApplicationDetailsCard`, `ReadOnlyRequirementDocRow` (all pre-existing), `AppraisalTctGroup`/`RequirementDoc` types (pre-existing).
- Produces: `AppraisalView` component, imported by the page file from Task 2.

- [ ] **Step 1: Create the file**

Create `src/sections/admin/appraisal-view.tsx`:

```tsx
// src/sections/admin/appraisal-view.tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx } from 'src/components/admin-ui';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { AppraisalFeeCard } from './appraisal/appraisal-fee-card';
import { HeadApprovalCard } from './appraisal/head-approval-card';
import { PassFailCard } from './appraisal/pass-fail-card';
import { AppraiserAssignmentCard } from './appraisal/appraiser-assignment-card';
import { ReadOnlyRequirementDocRow } from './credit-investigation/credit-investigation-doc-row';

// ----------------------------------------------------------------------

function FailedOutcome({ reason }: { reason: string }) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack
        alignItems="center"
        textAlign="center"
        spacing={2}
        sx={{ ...adminCardSx, p: { xs: 4, md: 6 } }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#FDE2DF',
          }}
        >
          <Iconify icon="solar:close-circle-bold" width={26} sx={{ color: '#B32C22' }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
          Process stopped
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 460 }}>
          The appraisal failed: {reason}. Credit Investigation and Financial Evaluation have been
          halted, and the client has been notified by email.
        </Typography>
        <Button
          component={RouterLink}
          href={paths.admin.applications}
          variant="outlined"
          sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', mt: 0.5 }}
        >
          Back to Application List
        </Button>
      </Stack>
    </Container>
  );
}

export function AppraisalView() {
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { feeStatus, paymentReceivedAt, headApprovalStatus, report, passed, failReason } =
    review.appraisal;

  if (!signUpData) return null;

  if (passed === false) {
    return <FailedOutcome reason={failReason} />;
  }

  const feeResolved = feeStatus === 'not-applicable' || (feeStatus === 'approved' && !!paymentReceivedAt);
  const reportSubmitted = !!report.uploadedAt;
  const headApproved = headApprovalStatus === 'approved';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 5 · Appraisal" reviewStep="appraisal" hideApplicationCard />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard collapsible officerNotesProcess="Appraisal" />

        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Pledged Properties
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Endorsed documents collected during Requirement Checklist, for reference during
            appraisal.
          </Typography>

          {appraisalNotApplicable ? (
            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
              This application has no pledged real-estate collateral.
            </Typography>
          ) : (
            <Stack spacing={3}>
              {appraisalGroups.map((group) => (
                <Stack key={group.id} spacing={1.25}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                    {group.tctNumber}
                  </Typography>
                  <Stack spacing={1.25}>
                    {group.documents.map((doc) => (
                      <ReadOnlyRequirementDocRow
                        key={doc.key}
                        label={doc.key}
                        doc={doc}
                        applicantName={`${signUpData.personalInfo?.firstName ?? ''} ${signUpData.personalInfo?.lastName ?? ''}`.trim()}
                      />
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>

        <AppraisalFeeCard />

        {feeResolved ? (
          <AppraiserAssignmentCard />
        ) : (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Resolve the Appraisal Fee above to unlock appraiser assignment.
            </Typography>
          </Box>
        )}

        {feeResolved && reportSubmitted ? (
          <HeadApprovalCard />
        ) : feeResolved ? (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Submit the appraisal report above to unlock Head Approval.
            </Typography>
          </Box>
        ) : null}

        {headApproved ? (
          <PassFailCard onFailed={() => {}} />
        ) : feeResolved && reportSubmitted ? (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Head Approval must approve the report above to unlock the Pass/Fail decision.
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Container>
  );
}
```

**Note on `PassFailCard`'s `onFailed`:** `setAppraisal({ passed: false, failReason })` already happens inside `PassFailCard` itself before calling `onFailed` — the parent doesn't need to do anything with the callback since `AppraisalView` re-reads `review.appraisal.passed`/`failReason` on the next render and swaps to `FailedOutcome` automatically. Pass `onFailed={() => {}}` as a no-op.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors anywhere in the project, including the Task 2 page file's previously-expected "module not found" error, which must now be resolved.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors or warnings from any file created in Tasks 1–5. Fix any that appear (e.g. unused imports) before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/appraisal-view.tsx
git commit -m "Add AppraisalView assembling all Appraisal cards"
```

---

### Task 6: Wire Credit Investigation's Proceed button, and unlock the queue row

**Files:**
- Modify: `src/sections/admin/credit-investigation-view.tsx`
- Modify: `src/sections/admin/application-list-view.tsx`

**Interfaces:**
- Consumes: `paths.admin.appraisal` (Task 2).
- Produces: none new — this task only rewires existing call sites.

- [ ] **Step 1: Route Credit Investigation's Proceed to Appraisal**

In `src/sections/admin/credit-investigation-view.tsx`, find:

```tsx
  const handleProceed = () => {
    setCreditInvestigation({ decision: 'approved' });
    router.push(paths.admin.applications);
  };
```

Replace with:

```tsx
  const handleProceed = () => {
    setCreditInvestigation({ decision: 'approved' });
    router.push(paths.admin.appraisal(encodeURIComponent(signUpData.email)));
  };
```

- [ ] **Step 2: Unlock the Appraisal queue row**

In `src/sections/admin/application-list-view.tsx`, find:

```tsx
        isActionable: !['appraisal', 'financialEvaluation'].includes(step),
```

Replace with:

```tsx
        isActionable: step !== 'financialEvaluation',
```

- [ ] **Step 3: Add Appraisal to `STEP_TO_PATH`**

In the same file, find:

```tsx
  const STEP_TO_PATH: Partial<Record<ReviewStep, (id: string) => string>> = {
    creditChecking: paths.admin.creditChecking,
    reconsideration: paths.admin.reconsideration,
    callReport: paths.admin.callReport,
    requirementChecklist: paths.admin.requirementChecklist,
    creditInvestigation: paths.admin.creditInvestigation,
  };
```

Replace with:

```tsx
  const STEP_TO_PATH: Partial<Record<ReviewStep, (id: string) => string>> = {
    creditChecking: paths.admin.creditChecking,
    reconsideration: paths.admin.reconsideration,
    callReport: paths.admin.callReport,
    requirementChecklist: paths.admin.requirementChecklist,
    creditInvestigation: paths.admin.creditInvestigation,
    appraisal: paths.admin.appraisal,
  };
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Manual browser walkthrough**

Run: `npm run dev`, then in a browser:
1. Navigate to `/admin/credit-checking` (or wherever the live application currently sits) and step it through to Credit Investigation.
2. On Credit Investigation, click **Proceed** — confirm it now lands on `/admin/applications/<email>/appraisal` instead of the Application List.
3. On the Appraisal page: confirm "Pledged Properties" lists the seeded TCT group read-only; toggle Appraisal Fee through "No Fee Needed" and confirm Appraiser Assignment unlocks immediately.
4. Reset (reload) and instead go through "Yes, Request Appraisal Fee" → submit → open the settings-gear "Page actions" popover (bottom-right) and trigger "Simulate: Another Officer Approves Appraisal Fee" (registered by `AppraisalFeeCard` in Task 3) → "Advise Client" → "Simulate: Payment Received (Sendit)" → confirm Appraiser Assignment unlocks.
5. Pick In-house, fill the form, submit → confirm Head Approval card unlocks; approve it → confirm Pass/Fail unlocks.
6. Click Fail with a reason → confirm the page swaps to the "Process stopped" screen.
7. Reload and re-test the Pass path (requires re-running from a fresh session or manually resetting local storage) → confirm "Proceed to Credit Scoring" routes to the stub page.
8. Also test the Appraisal Fee decline path: request a fee, then trigger "Simulate: Another Officer Declines Appraisal Fee" from the page actions popover, type a reason, confirm — verify it resets to "not yet requested" and the amount/description fields clear.

- [ ] **Step 6: Commit**

```bash
git add src/sections/admin/credit-investigation-view.tsx src/sections/admin/application-list-view.tsx
git commit -m "Route Credit Investigation Proceed to Appraisal; unlock Appraisal queue row"
```

---

### Task 7: Documentation

**Files:**
- Create: `docs/ADMIN_APPRAISAL.md`
- Modify: `docs/ADMIN_CREDIT_INVESTIGATION.md`
- Modify: `PROJECT_OVERVIEW.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Create `docs/ADMIN_APPRAISAL.md`**

Model it on `docs/ADMIN_CREDIT_INVESTIGATION.md`'s structure. Include, at minimum, these sections with content matching what was actually built in Tasks 1–6 (not the spec's proposed shape, if anything changed during implementation):

- A maintenance-rule header comment matching the convention at the top of `ADMIN_CREDIT_INVESTIGATION.md`.
- "What this is" — pipeline position (between Credit Investigation and the Credit Scoring stub), source (the swimlane process diagram), non-goals (simulated Sendit/Odoo, no real photo/lot-plotting, Credit Scoring unbuilt, manual Pass/Fail).
- Per-card breakdown: Pledged Properties (read-only), Appraisal Fee (state machine + simulated Sendit/Odoo/payment), Appraiser Assignment (inhouse/external, dashed-note callout), Head Approval, Pass/Fail (terminal Fail screen, Credit Scoring stub hand-off on Pass).
- "Queue unlocking" — note that `'appraisal'` was removed from `application-list-view.tsx`'s non-actionable list in Task 6.
- "Non-goals / Open items" — same four bullets as the design spec's Non-goals section.

- [ ] **Step 2: Update `docs/ADMIN_CREDIT_INVESTIGATION.md`'s Proceed routing note**

Find the "Proceed application?" section's bullet describing where Proceed routes (added earlier when the Return-to-AMD button was removed):

```markdown
- **Proceed** — records `creditInvestigation.decision: 'approved'`, routes
  to the Application List. *(Placeholder routing — see Non-goals below.)*
```

Replace with:

```markdown
- **Proceed** — records `creditInvestigation.decision: 'approved'`, routes
  to Appraisal (`paths.admin.appraisal`).
```

Also update the matching Non-goals bullet:

```markdown
- **Exact post-decision routing for Proceed/Disapprove is a
  placeholder**, chosen for a functionally complete first build (Proceed →
  Application List, Disapprove → Reconsideration). Revisit before
  considering this feature fully settled.
```

Replace with:

```markdown
- **Exact post-decision routing for Disapprove is a
  placeholder** (Disapprove → Reconsideration), chosen for a functionally
  complete first build. Proceed now routes to the real Appraisal page.
  Revisit Disapprove's routing before considering this feature fully
  settled.
```

- [ ] **Step 3: Update `PROJECT_OVERVIEW.md`'s admin flow diagram**

Find:

```
       │                    ├─ Proceed → Application List
       │                    └─ Disapprove → /admin/applications/[id]/reconsideration
       └─ No → /admin/applications/[id]/reconsideration
```

Replace with:

```
       │                    ├─ Proceed → /admin/applications/[id]/appraisal
       │                    │              ├─ Passed → /admin/applications/[id]/credit-scoring (stub)
       │                    │              └─ Failed → process halted (CI + Financial Evaluation)
       │                    └─ Disapprove → /admin/applications/[id]/reconsideration
       └─ No → /admin/applications/[id]/reconsideration
```

- [ ] **Step 4: Commit**

```bash
git add docs/ADMIN_APPRAISAL.md docs/ADMIN_CREDIT_INVESTIGATION.md PROJECT_OVERVIEW.md
git commit -m "Document the Appraisal admin page"
```

---

## Self-Review Notes (for the implementer)

- Task 4's `AppraiserAssignmentCard` reconstructs a `File` object from `report.fileName` purely for `ReportFileDropzone`'s display (`new File([], report.fileName)`) — this is a display-only stand-in, not a real file; do not attempt to re-derive its contents or size anywhere.
- `PassFailCard`'s `onFailed` prop is intentionally a no-op wire-through (see the note at the end of Task 5, Step 1) — the actual state transition happens inside `PassFailCard` via `setAppraisal`, and `AppraisalView` reacts to the updated `review.appraisal.passed` on its own next render.
- If `npm run lint` flags the `react-hooks/exhaustive-deps` line in Task 3's `AppraisalFeeCard` as an error rather than a warning, check whether `credit-investigation-view.tsx`'s identical existing `// eslint-disable-next-line react-hooks/exhaustive-deps` comment (used for the same pattern) is accepted by the current lint config — if it is, this one should be too; if lint rules changed, resolve by including every referenced value in the dependency array instead of suppressing.
