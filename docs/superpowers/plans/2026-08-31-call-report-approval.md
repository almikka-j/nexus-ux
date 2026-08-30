# Call Report Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second-officer approval gate to Call Report — the officer's "Proceed" button now submits for approval instead of routing forward immediately, and only a new "Call Report - Approval" screen advancing the application actually unlocks Requirement Checklist.

**Architecture:** Replace `CallReport.approved: boolean` with a three-state `callReportApprovalStatus` field plus submission/approval timestamp and approver-name fields. Add a list → detail approval flow (`call-report-approval-view.tsx` → `call-report-approval-bundle-view.tsx`) mirroring the existing CI Fee Approval screens exactly. Extract Sales Reject's reason-dialog logic into a shared helper so Call Report's own Sales Reject button and the new Decline action call the identical code path. Add an approver signature row to the existing Endorsement Declaration card.

**Tech Stack:** Next.js 14 App Router, React 18, MUI v5, TypeScript. No test framework in this repo — verification is `tsc --noEmit`, `eslint`, and manual/Playwright browser checks (matching every other task in this project's history).

**Spec:** `docs/superpowers/specs/2026-08-31-call-report-approval-design.md`

## Global Constraints

- Nav label for the new screen: **"Call Report - Approval"**.
- Route: `paths.admin.callReportApproval` = `/admin/call-report-approval`; detail route `paths.admin.callReportApprovalBundle()` = `/admin/call-report-approval/current` (fixed placeholder segment — no real per-application backend, same convention as `ciFeeApprovalBundle()`).
- `CallReport.approved: boolean` is **removed** — replaced by `callReportApprovalStatus: 'not-submitted' | 'pending-approval' | 'approved'`.
- New `CallReport` fields: `callReportSubmittedAt: string | null`, `callReportApprovedAt: string | null`, `callReportApprovedBy: string | null`.
- Sales Reject (on Call Report's own page) is **unchanged** in behavior and does **not** touch `callReportApprovalStatus`.
- Decline (on the new approval screen) calls the **same shared helper** Sales Reject uses — same reason list, same `decisionReason` format, same route-to-Reconsideration — and additionally resets `callReportApprovalStatus: 'not-submitted'`.
- Approve requires a typed **Approver Name** (`TextField`, required, non-empty after `.trim()`) before its confirm button enables.
- All new UI follows this codebase's established MUI inline-`sx` conventions (no styled-components, no CSS modules) — copy exact color/radius/spacing values from the CI Fee Approval files cited per task.
- Every task ends with `npx tsc --noEmit -p .` and `npx eslint src --ext .ts,.tsx` passing with no new errors.

---

## Task 1: Data model — `CallReportApprovalStatus` and new `CallReport` fields

**Files:**
- Modify: `src/auth/admin-context.tsx`

**Interfaces:**
- Produces: `export type CallReportApprovalStatus = 'not-submitted' | 'pending-approval' | 'approved';`
- Produces: `CallReport.callReportApprovalStatus: CallReportApprovalStatus`, `CallReport.callReportSubmittedAt: string | null`, `CallReport.callReportApprovedAt: string | null`, `CallReport.callReportApprovedBy: string | null`
- Consumes: nothing (foundational task)

This task only changes the type and its two factory sites (`createInitialReview()`'s `callReport` object). It deliberately does NOT touch `call-report-view.tsx` yet — that file still references `callReport.approved` after this task, so a full clean typecheck is NOT expected until Task 2 also lands. Steps below account for this by checking the specific new symbols compile, not a full-repo `tsc` pass, until Task 2.

- [ ] **Step 1: Add the `CallReportApprovalStatus` type and update the `CallReport` type**

Open `src/auth/admin-context.tsx`. Find this block (search for `export type CallReport = {`):

```ts
export type CallReport = {
  approved: boolean;
  decisionReason: string;
```

Replace it with:

```ts
export type CallReportApprovalStatus = 'not-submitted' | 'pending-approval' | 'approved';

export type CallReport = {
  callReportApprovalStatus: CallReportApprovalStatus;
  callReportSubmittedAt: string | null;
  callReportApprovedAt: string | null;
  // The approver's typed name — there is no real second-officer login in
  // this prototype (same convention as Appraisal's/CI Fee's simulated
  // approvals), so this is how "who approved this Call Report" is
  // captured. Set only by the Call Report Approval screen's Approve
  // action; null until then.
  callReportApprovedBy: string | null;
  decisionReason: string;
```

- [ ] **Step 2: Update `createInitialReview()`'s `callReport` factory object**

Find this block inside `createInitialReview()` (search for `callReport: {\n      approved: false,`):

```ts
    callReport: {
      approved: false,
      decisionReason: '',
```

Replace with:

```ts
    callReport: {
      callReportApprovalStatus: 'not-submitted',
      callReportSubmittedAt: null,
      callReportApprovedAt: null,
      callReportApprovedBy: null,
      decisionReason: '',
```

- [ ] **Step 3: Verify the new fields compile in isolation**

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "callReport.approved"`
Expected: a number greater than 0 — this confirms the OLD field name `approved` is now a compile error at every remaining call site (in `call-report-view.tsx`), which Task 2 fixes. This is the expected, temporary state between Task 1 and Task 2 — do not attempt to fix `call-report-view.tsx` in this task.

- [ ] **Step 4: Commit**

```bash
git add src/auth/admin-context.tsx
git commit -m "Add CallReportApprovalStatus and approver fields to CallReport"
```

---

## Task 2: Shared Sales Reject / Decline helper + sample-data builder + Call Report page changes

**Files:**
- Create: `src/sections/admin/call-report/call-report-decline.ts`
- Create: `src/sections/admin/call-report/sample-call-report.ts`
- Modify: `src/sections/admin/call-report-view.tsx`
- Modify: `src/sections/admin/call-report/endorsement-declaration-card.tsx`

**Interfaces:**
- Consumes: `CallReport`, `CallReportApprovalStatus`, `CallReportComakerChange`, `ExistingLoanRow` (Task 1 / existing `admin-context.tsx`), `useAdmin().setCallReport` (existing, `src/auth/admin-context.tsx`), `buildCallSummary`/`buildCallReportAiExceptions` (existing, `./call-report-summary`), `buildCallReportAiRecommendation`/`buildCallReportVariance` (existing, `./call-report-risk`)
- Produces: `export const SALES_REJECT_REASONS: string[]` and `export function buildDecisionReason(reasonCategory: string, reasonRemarks: string): string` from `call-report-decline.ts` (imported by `call-report-view.tsx` and, in Task 5, by `call-report-approval-bundle-view.tsx`). `export function buildSampleCallReportFields(params: { firstName: string; assignedOfficer: string | null; desiredLoanAmount?: number; loanTermMonths?: number }): Omit<CallReport, 'callReportApprovalStatus' | 'callReportSubmittedAt' | 'callReportApprovedAt' | 'callReportApprovedBy' | 'decisionReason'>` from `sample-call-report.ts` (imported by `call-report-view.tsx` in this task, and by `call-report-approval-view.tsx` in Task 4 — same cross-file-sample-data-reuse pattern `buildSampleAppraisalReport()` already establishes for Appraisal, see `src/sections/admin/appraisal/sample-appraisal-report.ts`).

This task fixes the Task-1-introduced compile errors in `call-report-view.tsx`, changes "Proceed" to "Submit for Approval", extracts the reason-building logic so the Decline action in Task 5 can reuse it verbatim, and extracts the sample-data field values so Task 4's list-page auto-seed can fill a real, complete-looking Call Report (not just the 3 `canProceed` fields) without duplicating this large object a second time.

- [ ] **Step 1: Create the shared decline helper**

Create `src/sections/admin/call-report/call-report-decline.ts`:

```ts
// ----------------------------------------------------------------------
// Shared between Call Report's own "Sales Reject" button
// (call-report-view.tsx) and the Call Report Approval screen's "Decline"
// action (call-report-approval-bundle-view.tsx) — both reject an
// application to Reconsideration with the same reason list and the same
// "{category} — {remarks}" formatting, so they can never drift apart.
// ----------------------------------------------------------------------

export const SALES_REJECT_REASONS = [
  'Insufficient income',
  'Poor credit history',
  'Incomplete documents',
  'Employment not verifiable',
  'Requested amount too high',
  'Other',
];

export function buildDecisionReason(reasonCategory: string, reasonRemarks: string): string {
  return reasonRemarks.trim() ? `${reasonCategory} — ${reasonRemarks.trim()}` : reasonCategory;
}
```

- [ ] **Step 2: Create the shared sample-data builder**

Create `src/sections/admin/call-report/sample-call-report.ts`. This extracts the exact sample field values `call-report-view.tsx`'s `handleFillSampleData` already builds today, so both that page and the new Call Report Approval list page (Task 4) can produce the identical "filled-in, complete-looking" Call Report without duplicating this object:

```ts
import { buildCallSummary, buildCallReportAiExceptions } from './call-report-summary';
import { buildCallReportAiRecommendation, buildCallReportVariance } from './call-report-risk';

import type { CallReport, CallReportComakerChange, ExistingLoanRow } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Shared between Call Report's own "Fill with Sample Data" page action
// (call-report-view.tsx) and the Call Report Approval list page's
// auto-seed effect (call-report-approval-view.tsx) — both need the exact
// same "filled-in, complete-looking" 8-section Call Report, so this is
// the one place those sample values live (same
// buildSampleAppraisalReport()-style cross-file-reuse convention as
// src/sections/admin/appraisal/sample-appraisal-report.ts).
//
// Returns every CallReport field EXCEPT the approval-status fields
// (callReportApprovalStatus/callReportSubmittedAt/callReportApprovedAt/
// callReportApprovedBy) and decisionReason — callers decide those
// themselves, since call-report-view.tsx's own sample-fill leaves the
// report un-submitted while the approval list's auto-seed immediately
// submits it.
// ----------------------------------------------------------------------

type SampleCallReportFields = Omit<
  CallReport,
  'callReportApprovalStatus' | 'callReportSubmittedAt' | 'callReportApprovedAt' | 'callReportApprovedBy' | 'decisionReason'
>;

export function buildSampleCallReportFields(params: {
  firstName: string;
  assignedOfficer: string | null;
  desiredLoanAmount?: number;
  loanTermMonths?: number;
}): SampleCallReportFields {
  // Falls back to a non-zero sample amount/term when the application has
  // none on file — otherwise Original Requested Amount and every
  // amount/term derived from it would sample-fill as "₱0"/"0 months",
  // which reads as empty even though the field is technically populated.
  const loanAmount = params.desiredLoanAmount || 150000;
  const loanTerm = params.loanTermMonths || 24;

  const sampleExistingLoan: ExistingLoanRow = {
    id: crypto.randomUUID(),
    lender: 'BDO Unibank',
    loanType: 'Personal Loan',
    outstandingBalance: '50000',
    monthlyPayment: '5000',
  };

  const sampleComakerChange: CallReportComakerChange = {
    completeName: 'Juan Dela Cruz',
    completeAddress: 'Quezon City, Metro Manila',
    contactNumber: '09171234567',
    relationshipToBorrower: 'Sibling',
    occupationEmployerName: 'ABC Corporation',
    yearsInEmploymentBusiness: '5',
    primaryIdTypeAndNumber: "Driver's License — N01-23-456789",
    secondaryIdTypeAndNumber: 'UMID — 1234-5678901-2',
    remarks: '',
  };

  const fields: Omit<SampleCallReportFields, 'aiSummary' | 'aiExceptions' | 'aiRecommendation' | 'aoVsSystemVariance' | 'varianceExplanation'> = {
    interactionType: 'phone',
    callVisitDate: new Date().toISOString().slice(0, 10),
    callTime: '14:30',
    interviewedPerson: params.firstName,
    relationshipToBorrower: 'Self',
    identityStatus: 'confirmed',
    identityBasis: ['app-data-matched', 'valid-government-id'],
    identityBasisOther: '',
    validation: {
      identityAuthorizedRep: 'confirmed',
      loanFacility: 'confirmed',
      loanPurpose: 'changed',
      primaryRepaymentSource: 'confirmed',
      businessEmploymentInfo: 'confirmed',
      existingLoansObligations: 'changed',
      residenceBusinessAddress: 'confirmed',
      collateralSecurityDeclaration: 'confirmed',
      comakerGuarantee: 'changed',
    },
    materialChangesNotes: 'Client clarified the loan purpose and confirmed one existing loan not previously on file.',
    identityAuthorizedRepChangedTo: '',
    identityAuthorizedRepChangeReason: '',
    loanFacilityChangedTo: '',
    loanFacilityChangeReason: '',
    loanPurposeChangedTo: 'home-renovation-construction',
    loanPurposeOtherText: '',
    workingCapitalUse: '',
    workingCapitalUseOtherText: '',
    loanTakeOutInfo: {
      currentLender: '',
      outstandingBalance: '',
      estimatedPayoffAmount: '',
      remainingLoanTerm: '',
      reasonForTakeOut: '',
      status: '',
    },
    primaryRepaymentSourceChangedTo: '',
    repaymentSourceOtherText: '',
    employerBusinessNameChanged: '',
    employmentBusinessAddressChanged: '',
    declaredMonthlyIncomeChanged: '',
    employmentBusinessTenureChanged: '',
    businessEmploymentOtherChange: '',
    existingLoanRows: [sampleExistingLoan],
    residenceBusinessAddressChangedTo: '',
    residenceBusinessAddressChangeReason: '',
    collateralDeclarationChangedTo: [],
    collateralDeclarationOtherText: '',
    comakerChange: sampleComakerChange,
    comakers: [
      {
        id: crypto.randomUUID(),
        name: sampleComakerChange.completeName,
        relationshipToBorrower: sampleComakerChange.relationshipToBorrower,
        address: sampleComakerChange.completeAddress,
        contactNumber: sampleComakerChange.contactNumber,
        occupation: sampleComakerChange.occupationEmployerName,
        monthlyIncome: '',
      },
    ],
    amlIsPep: 'no',
    amlIsPgfcRelatedParty: 'no',
    amlHasExistingLoans: 'yes',
    amlPaymentHistory: 'on-time',
    amlHasReturnedChecks: 'no',
    amlHasPastDueObligations: 'no',
    understandingLevel: 'fully-understood',
    termsUnderstood: [
      'interest-rate',
      'loan-amount',
      'loan-term',
      'monthly-amortization',
      'documentary-requirements',
      'collateral-requirements',
    ],
    concernsClarifications: '',
    originalRequestedAmount: String(loanAmount),
    proposalInterestRate: '1.5',
    proposalInterestRateBasis: 'monthly',
    proposedFacilityProduct: 'clean-loan',
    proposalComputationType: 'diminishing-balance',
    proposalComputationTypeOther: '',
    proposedLoanAmount: String(loanAmount),
    estimatedMonthlyAmortization: loanTerm ? String(Math.round(loanAmount / loanTerm)) : '',
    proposedLoanTermMonths: String(loanTerm),
    otherRequest: '',
    preliminaryRiskLevel: 'low',
    primaryRiskDrivers: ['character'],
    callDisposition: 'proceed-to-next-process',
    reasonKeyCondition: 'Client cooperative, consistent answers, no major exceptions noted.',
    accountOfficerName: params.assignedOfficer ?? 'Ramon Cruz',
    accountOfficerDateTime: new Date().toISOString().slice(0, 16),
  };

  // Compute the AI review fields from the sample data itself, same
  // builders "Refresh AI Review" uses, so the AI card (and the Call
  // Report Result modal) show real content immediately instead of the
  // "click Refresh AI Review" empty state. All four builders below
  // require the full CallReport type (they don't accept this file's
  // narrower SampleCallReportFields), but none of them read the
  // approval-status fields this function intentionally doesn't own — so
  // a real, fully-typed CallReport is built here with placeholder
  // ('not-submitted'/null) values for exactly those fields, purely to
  // satisfy the builders' parameter type. Callers of
  // buildSampleCallReportFields() never see this placeholder object —
  // only its returned aiSummary/aiExceptions/aiRecommendation/
  // aoVsSystemVariance/varianceExplanation strings.
  const draftForAi: CallReport = {
    ...fields,
    callReportApprovalStatus: 'not-submitted',
    callReportSubmittedAt: null,
    callReportApprovedAt: null,
    callReportApprovedBy: null,
    decisionReason: '',
    aiSummary: '',
    aiExceptions: '',
    aiRecommendation: '',
    aoVsSystemVariance: '',
    varianceExplanation: '',
  };
  const variance = buildCallReportVariance(draftForAi);

  return {
    ...fields,
    aiSummary: buildCallSummary(draftForAi, { firstName: params.firstName, lastName: '' }),
    aiExceptions: buildCallReportAiExceptions(draftForAi),
    aiRecommendation: buildCallReportAiRecommendation(draftForAi).text,
    aoVsSystemVariance: variance.status,
    varianceExplanation: variance.explanation,
  };
}
```

- [ ] **Step 3: Run typecheck to confirm both new files compile standalone**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "call-report-decline.ts|sample-call-report.ts"`
Expected: no output (no errors reference either new file). `buildCallSummary`'s second parameter is `{ firstName: string; lastName: string } | null` (confirmed against `call-report-summary.ts`), which is why Step 2's code passes `{ firstName: params.firstName, lastName: '' }` — no cast needed.

- [ ] **Step 4: Update `call-report-view.tsx`'s imports**

Open `src/sections/admin/call-report-view.tsx`. Replace this block:

```ts
const SALES_REJECT_REASONS = [
  'Insufficient income',
  'Poor credit history',
  'Incomplete documents',
  'Employment not verifiable',
  'Requested amount too high',
  'Other',
];
```

with:

```ts
import { SALES_REJECT_REASONS, buildDecisionReason } from './call-report/call-report-decline';
```

(Move this import line up alongside the other `import { ... } from './call-report/...'` lines near the top of the file, in the same relative position the removed constant occupied — i.e. right before the `export function CallReportView()` line. Do not leave a duplicate empty line.)

- [ ] **Step 5: Rename `handleProceed` to `handleSubmitForApproval` and change its behavior**

Replace:

```ts
  const handleProceed = () => {
    if (!signUpData) return;
    setCallReport({ approved: true });
    router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
  };
```

with:

```ts
  const handleSubmitForApproval = () => {
    if (!signUpData) return;
    setCallReport({
      callReportApprovalStatus: 'pending-approval',
      callReportSubmittedAt: new Date().toISOString(),
    });
  };

  const handleContinueToRequirementChecklist = () => {
    if (!signUpData) return;
    router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
  };
```

- [ ] **Step 6: Update `confirmReasonDialog` to use the shared helper**

Replace:

```ts
  const confirmReasonDialog = () => {
    if (!signUpData || !reasonCategory) return;
    const decisionReason = reasonRemarks.trim() ? `${reasonCategory} — ${reasonRemarks.trim()}` : reasonCategory;
    setCallReport({ approved: false, decisionReason });
    closeReasonDialog();
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };
```

with:

```ts
  const confirmReasonDialog = () => {
    if (!signUpData || !reasonCategory) return;
    const decisionReason = buildDecisionReason(reasonCategory, reasonRemarks);
    setCallReport({ decisionReason });
    closeReasonDialog();
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };
```

(Sales Reject no longer sets `callReportApprovalStatus` at all — per the Global Constraints, it bypasses the approval question entirely rather than "declining" a submission.)

- [ ] **Step 7: Replace `handleFillSampleData`'s inline draft object with the shared builder**

This removes the ~130-line inline `draft: CallReport = { ...callReport, ... }` object entirely — it's now `buildSampleCallReportFields()` (Step 2), imported here.

First, add the import. Near the top of `call-report-view.tsx`, alongside the other `import { ... } from './call-report/...'` lines (next to the `call-report-decline` import added in Step 4), add:

```ts
import { buildSampleCallReportFields } from './call-report/sample-call-report';
```

Then find the entire `handleFillSampleData` function — it starts with:

```ts
  const handleFillSampleData = () => {
    if (!signUpData) return;
```

and its body runs all the way down to (search for this exact closing, which is the LAST thing in the function before Step 6/`handleClearSampleData` — do not stop at an earlier `};` inside the function, e.g. `loanTakeOutInfo: { ... },`, keep going to the one that closes the whole function):

```ts
    // Compute the AI review fields from the sample data itself, same
    // builders "Refresh AI Review" uses, so the AI card shows real content
    // immediately instead of the "click Refresh AI Review" empty state.
    const variance = buildCallReportVariance(draft);
    setCallReport({
      ...draft,
      aiSummary: buildCallSummary(draft, signUpData),
      aiExceptions: buildCallReportAiExceptions(draft),
      aiRecommendation: buildCallReportAiRecommendation(draft).text,
      aoVsSystemVariance: variance.status,
      varianceExplanation: variance.explanation,
    });
  };
```

Replace the ENTIRE `handleFillSampleData` function (from `const handleFillSampleData = () => {` through this closing `};`) with:

```ts
  const handleFillSampleData = () => {
    if (!signUpData) return;
    // Sample-fill leaves the report NOT submitted — the officer/tester
    // still clicks "Submit for Approval" themselves to see the full
    // approval flow, matching this app's convention of sample data
    // filling fields, not skipping decision steps.
    setCallReport({
      ...buildSampleCallReportFields({
        firstName: signUpData.firstName,
        assignedOfficer: application.assignedOfficer,
        desiredLoanAmount: application.financialInfo?.desiredLoanAmount,
        loanTermMonths: application.financialInfo?.loanTermMonths,
      }),
      callReportApprovalStatus: 'not-submitted',
      callReportSubmittedAt: null,
      callReportApprovedAt: null,
      callReportApprovedBy: null,
    });
  };
```

Since `buildCallSummary`/`buildCallReportAiExceptions`/`buildCallReportAiRecommendation`/`buildCallReportVariance` are no longer called directly in this file (they moved into `sample-call-report.ts`), also remove this now-unused import line:

```ts
import { buildCallSummary, buildCallReportAiExceptions } from './call-report/call-report-summary';
import { buildCallReportAiRecommendation, buildCallReportVariance } from './call-report/call-report-risk';
```

(Delete both lines entirely — do not leave them if nothing else in this file references those four functions. Search the file after deleting to confirm: `grep -n "buildCallSummary\|buildCallReportAiExceptions\|buildCallReportAiRecommendation\|buildCallReportVariance" src/sections/admin/call-report-view.tsx` should return no matches.)

Also remove the now-unused `CallReportComakerChange`/`ExistingLoanRow` type imports if nothing else in the file references them directly — check with `grep -n "CallReportComakerChange\|ExistingLoanRow" src/sections/admin/call-report-view.tsx` after this step; if the only remaining references were inside the deleted `draft` object, remove them from the type-only import line:

```ts
import type { CallReport, CallReportComakerChange, ExistingLoanRow } from 'src/auth/admin-context';
```

becomes:

```ts
import type { CallReport } from 'src/auth/admin-context';
```

(Keep `CallReport` itself only if something else in the file still references it as a type — e.g. `handleClearSampleData`'s reset object in Step 8 below is a `Partial<CallReport>` via `setCallReport`, which doesn't need the explicit type import; check whether `CallReport` is referenced as a standalone type anywhere else in this file after this step, and remove the import line entirely if not.)

- [ ] **Step 8: Update `handleClearSampleData`'s reset object**

Find, near the end of the object passed to `setCallReport({...})` in `handleClearSampleData`:

```ts
      accountOfficerName: '',
      accountOfficerDateTime: '',
    });
  };
```

Change to:

```ts
      accountOfficerName: '',
      accountOfficerDateTime: '',
      callReportApprovalStatus: 'not-submitted',
      callReportSubmittedAt: null,
      callReportApprovedAt: null,
      callReportApprovedBy: null,
    });
  };
```

- [ ] **Step 9: Update the `canProceed` derived flag's page-action usage**

The `canProceed` boolean (`!!callReport.interactionType && !!callReport.identityStatus && !!callReport.callDisposition`) is unrelated to approval status and should NOT change — it still only gates whether the 8 sections are complete enough to submit. Leave this line as-is:

```ts
  const canProceed = !!callReport.interactionType && !!callReport.identityStatus && !!callReport.callDisposition;
```

No change needed for this step — this step exists to document that `canProceed` is intentionally untouched, so a future task doesn't accidentally conflate "sections complete" with "approval status."

- [ ] **Step 10: Replace the "Proceed application?" card's button area and status message**

Find:

```tsx
          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleProceed}
              disabled={!canProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Proceed to Requirement Checklist
            </Button>
            <Button
              onClick={() => setDisapproveDialogOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{
                color: '#5A6273',
                borderColor: '#C7CCDA',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
              }}
            >
              Sales Reject
            </Button>
          </Stack>

          {review.callReport.approved && (
            <Typography sx={{ fontSize: 12.5, color: '#12B76A', fontWeight: 600, mt: 2 }}>
              Call report approved.
            </Typography>
          )}
```

Replace with:

```tsx
          {callReport.callReportApprovalStatus === 'approved' ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Iconify icon="solar:check-circle-bold-duotone" width={20} sx={{ color: '#0C8A4F' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                  Approved by {callReport.callReportApprovedBy || 'the approver'}.
                </Typography>
              </Stack>
              <Button
                onClick={handleContinueToRequirementChecklist}
                variant="contained"
                startIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} />}
                sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, alignSelf: 'flex-start', '&:hover': { bgcolor: '#0C8A4F' } }}
              >
                Continue to Requirement Checklist
              </Button>
            </Stack>
          ) : callReport.callReportApprovalStatus === 'pending-approval' ? (
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Iconify icon="solar:clock-circle-bold-duotone" width={20} sx={{ color: '#B36A05' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                Submitted for approval — waiting on the Call Report Approver.
              </Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
              <Button
                onClick={handleSubmitForApproval}
                disabled={!canProceed}
                variant="contained"
                startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
              >
                Submit for Approval
              </Button>
              <Button
                onClick={() => setDisapproveDialogOpen(true)}
                variant="outlined"
                startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                sx={{
                  color: '#5A6273',
                  borderColor: '#C7CCDA',
                  borderRadius: '10px',
                  px: 2.5,
                  '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
                }}
              >
                Sales Reject
              </Button>
            </Stack>
          )}
```

- [ ] **Step 11: Update the card's subtitle text to reflect the new copy status**

Find:

```tsx
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {canProceed
              ? 'Approve the call report and decide whether to continue this application.'
              : 'Complete Interaction Type, Identity Status, and Call Disposition before proceeding.'}
          </Typography>
```

Replace with:

```tsx
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {callReport.callReportApprovalStatus === 'approved'
              ? 'This call report has been approved.'
              : callReport.callReportApprovalStatus === 'pending-approval'
                ? 'This call report is awaiting a decision from the Call Report Approver.'
                : canProceed
                  ? 'Submit the call report for approval, or sales reject this application.'
                  : 'Complete Interaction Type, Identity Status, and Call Disposition before submitting.'}
          </Typography>
```

- [ ] **Step 12: Update the `useRegisterPageActions` sample-data toggle to use `canProceed` unchanged**

No change needed — the existing `canProceed`-driven Fill/Remove Sample Data toggle (lines using `key: 'sample-data'`) is untouched by this task; it still reflects whether the 8 sections are filled, independent of approval status.

- [ ] **Step 13: Add the second signature row to `endorsement-declaration-card.tsx`**

Open `src/sections/admin/call-report/endorsement-declaration-card.tsx`. Find:

```tsx
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SignatureField icon="solar:user-id-bold-duotone" label="Account Officer" value={accountOfficer} />
          <SignatureField icon="solar:clock-circle-bold-duotone" label="Date / Time" value={dateTimeLabel} />
        </Stack>
      </Box>
    </Box>
  );
}
```

Replace with:

```tsx
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SignatureField icon="solar:user-id-bold-duotone" label="Account Officer" value={accountOfficer} />
          <SignatureField icon="solar:clock-circle-bold-duotone" label="Date / Time" value={dateTimeLabel} />
        </Stack>

        {review.callReport.callReportApprovalStatus === 'approved' && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <SignatureField
              icon="solar:shield-check-bold-duotone"
              label="Approved By"
              value={review.callReport.callReportApprovedBy || '—'}
            />
            <SignatureField
              icon="solar:clock-circle-bold-duotone"
              label="Approval Date / Time"
              value={
                review.callReport.callReportApprovedAt
                  ? new Date(review.callReport.callReportApprovedAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '—'
              }
            />
          </Stack>
        )}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 14: Update this file's header comment**

The file's top comment currently says:

```
// PDF section 8 (second occurrence — the source PDF numbers both this
// and NEXUS System Validation as "8"): Account Officer Endorsement
// Declaration. The declaration paragraphs are the PDF's own fixed
// attestation text, rendered read-only — not something an officer edits.
// Account Officer and Date/Time are plain read-only display, not
// TextFields — Account Officer is whoever's assigned to the application
// (application.assignedOfficer), and Date/Time is when this officer
// entered the Call Report step (review.stepTimestamps.callReport, set by
// ApplicationReviewHeader's markStepEntered). Neither is something the
// officer should be able to edit after the fact.
```

Append (do not remove the existing text, add after it, before the `// ----` closing line):

```
//
// Once callReportApprovalStatus === 'approved' (see
// call-report-approval-bundle-view.tsx), a second signature row appears
// below the Account Officer row in the same green box — Approved By
// (callReportApprovedBy) and Approval Date/Time (callReportApprovedAt),
// both stamped by the Approve action on the Call Report Approval screen.
// Hidden entirely before approval.
```

- [ ] **Step 15: Run full typecheck and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npx eslint src --ext .ts,.tsx`
Expected: no errors.

- [ ] **Step 16: Commit**

```bash
git add src/sections/admin/call-report-view.tsx src/sections/admin/call-report/call-report-decline.ts src/sections/admin/call-report/sample-call-report.ts src/sections/admin/call-report/endorsement-declaration-card.tsx
git commit -m "Change Call Report Proceed into a Submit for Approval gate"
```

---

## Task 3: Routes and nav entry

**Files:**
- Modify: `src/routes/paths.ts`
- Modify: `src/layouts/admin/config-nav-admin.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `paths.admin.callReportApproval: string`, `paths.admin.callReportApprovalBundle: () => string`

- [ ] **Step 1: Add the two new paths**

Open `src/routes/paths.ts`. Find:

```ts
    ciFeeApprovalBundle: () => '/admin/ci-fee-approval/current',
    appraisalAppraiser: '/admin/appraisal-appraiser',
```

Insert between them:

```ts
    ciFeeApprovalBundle: () => '/admin/ci-fee-approval/current',
    callReportApproval: '/admin/call-report-approval',
    // Same fixed-placeholder-segment convention as ciFeeApprovalBundle —
    // no real multi-application backend, so there's no real request ID to
    // route on; this only keeps the URL shape consistent with the other
    // approval flows' list -> detail split.
    callReportApprovalBundle: () => '/admin/call-report-approval/current',
    appraisalAppraiser: '/admin/appraisal-appraiser',
```

- [ ] **Step 2: Replace the nav placeholder entry**

Open `src/layouts/admin/config-nav-admin.tsx`. Find:

```ts
export const approvalItems = [
  { title: 'Credit Investigation - Fee Approval', step: null, path: paths.admin.ciFeeApproval },
  { title: 'Appraiser', step: null, path: paths.admin.appraisalAppraiser },
```

Insert a new entry between them:

```ts
export const approvalItems = [
  { title: 'Credit Investigation - Fee Approval', step: null, path: paths.admin.ciFeeApproval },
  { title: 'Call Report - Approval', step: null, path: paths.admin.callReportApproval },
  { title: 'Appraiser', step: null, path: paths.admin.appraisalAppraiser },
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors (both files only add new exports/entries, nothing removed).

- [ ] **Step 4: Commit**

```bash
git add src/routes/paths.ts src/layouts/admin/config-nav-admin.tsx
git commit -m "Add routes and nav entry for Call Report - Approval"
```

---

## Task 4: Call Report Approval list page

**Files:**
- Create: `src/sections/admin/call-report-approval-view.tsx`
- Create: `src/app/admin/call-report-approval/page.tsx`
- Create: `src/app/admin/call-report-approval/layout.tsx`

**Interfaces:**
- Consumes: `paths.admin.callReportApproval`, `paths.admin.callReportApprovalBundle` (Task 3); `review.callReport.callReportApprovalStatus`/`callReportSubmittedAt` (Task 1); `useAdmin().setCallReport` (existing); `SAMPLE_APPLICATION` (existing, `./sample-application`); `buildSampleCallReportFields()` (Task 2, `./call-report/sample-call-report`) — the auto-seed effect fills the full 8 sections via this shared builder (same values `call-report-view.tsx`'s own "Fill with Sample Data" produces), not just the 3 `canProceed` fields, so "View Call Report Result" on the detail page (Task 5) shows a real, complete-looking report immediately.
- Produces: `export function CallReportApprovalView()` — consumed by Task 4's own `page.tsx`.

- [ ] **Step 1: Create the list view component**

Create `src/sections/admin/call-report-approval-view.tsx`:

```tsx
'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATION } from './sample-application';
import { buildSampleCallReportFields } from './call-report/sample-call-report';

import type { CallReportApprovalStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Personal workspace for the Call Report Approver — "Call Report -
// Approval" in the Request nav dropdown, same list -> detail split as
// ci-fee-approval-view.tsx -> ci-fee-approval-bundle-view.tsx (the
// closest existing analog: a flat, single-application approval, not a
// multi-bundle one like Appraisal). This page is ONLY the list; the
// actual header card, the "View Call Report Result" button, and
// Approve/Decline all live on call-report-approval-bundle-view.tsx.
//
// The live application's row ALWAYS shows whenever a live application
// exists in the session, same convention every other approval list here
// follows — only the StatusBadge tone/label varies by status; the row
// itself never disappears.
//
// Same auto-load-and-seed convention as ci-fee-approval-view.tsx: if the
// session hydrates with no live application, load the shared sample
// dataset. Then, whenever callReportApprovalStatus isn't
// 'pending-approval', re-seed a fresh submitted Call Report — the FULL
// 8 sections, via the same buildSampleCallReportFields() builder
// call-report-view.tsx's own "Fill with Sample Data" uses (see
// sample-call-report.ts), not just the 3 canProceed fields — so "View
// Call Report Result" on the detail page shows a real, complete-looking
// report immediately, not a mostly-empty one. Deliberately excludes
// 'approved': that's a real terminal decision and must stick, not get
// silently undone the moment the approver navigates back to this list.
// ----------------------------------------------------------------------

const CALL_REPORT_ROW_STATUS_COPY: Record<CallReportApprovalStatus, { label: string; tone: SemanticTone }> = {
  'not-submitted': { label: 'Not Submitted', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
};

export function CallReportApprovalView() {
  const router = useRouter();
  const { signUpData, application, hydrated, loadSample } = useRegistration();
  const { review, setCallReport } = useAdmin();
  const { callReportApprovalStatus, callReportSubmittedAt } = review.callReport;

  const hasApplication = !!signUpData && !!application.personalInfo;

  const didSeedApplication = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!hasApplication) {
      if (didSeedApplication.current) return;
      didSeedApplication.current = true;
      loadSample(SAMPLE_APPLICATION);
      return;
    }
    if (callReportApprovalStatus !== 'pending-approval') {
      setCallReport({
        ...buildSampleCallReportFields({
          firstName: signUpData?.firstName ?? '',
          assignedOfficer: application.assignedOfficer,
          desiredLoanAmount: application.financialInfo?.desiredLoanAmount,
          loanTermMonths: application.financialInfo?.loanTermMonths,
        }),
        callReportApprovalStatus: 'pending-approval',
        callReportSubmittedAt: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, callReportApprovalStatus]);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const rowStatusCopy = CALL_REPORT_ROW_STATUS_COPY[callReportApprovalStatus];
  const submittedOnLabel = callReportSubmittedAt ? new Date(callReportSubmittedAt).toLocaleDateString() : '—';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 1 }}
        >
          <Box>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              Call Report Approvals
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Call Report submissions from the officer, past and present.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Call Report Approver
          </Typography>
        </Stack>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing waiting on you yet
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
              There’s no live application in this session yet. Start one from the Application List.
            </Typography>
            <Button
              component={RouterLink}
              href={paths.admin.accountSolicitation}
              variant="outlined"
              sx={{ ...outlinedNavyButtonSx, px: 2.5 }}
            >
              Go to Application List
            </Button>
          </Box>
        ) : (
          <Box sx={{ ...adminCardSx, p: 0, overflow: 'hidden' }}>
            <TableContainer>
              <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        bgcolor: '#FBFBFD',
                        borderBottom: '1px solid #E1E4ED',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#8891A6',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        py: 1.5,
                        px: 2,
                      },
                    }}
                  >
                    <TableCell sx={{ width: '40%' }}>Applicant</TableCell>
                    <TableCell sx={{ width: '25%' }}>Submitted On</TableCell>
                    <TableCell sx={{ width: '25%' }}>Status</TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow
                    hover
                    onClick={() => router.push(paths.admin.callReportApprovalBundle())}
                    sx={{
                      cursor: 'pointer',
                      '& td': {
                        borderColor: '#EEF0F5',
                        py: 1.375,
                        px: 2,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A' }}>
                        {applicantName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
                        App No. {getLoanNumber(signUpData.email)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>{submittedOnLabel}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={rowStatusCopy.tone} label={rowStatusCopy.label} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: '#8891A6' }}>
                        <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 2: Create the app-router page**

Create `src/app/admin/call-report-approval/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { CallReportApprovalView } from 'src/sections/admin/call-report-approval-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Call Report - Approval | HHC LMS',
};

export default function Page() {
  return <CallReportApprovalView />;
}
```

- [ ] **Step 3: Create the app-router layout**

Create `src/app/admin/call-report-approval/layout.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';

import { AdminLayout } from 'src/layouts/admin/layout';

// ----------------------------------------------------------------------

export default function CallReportApprovalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { adminUser, hydrated } = useAdmin();

  useEffect(() => {
    if (hydrated && !adminUser) {
      router.replace(paths.admin.login);
    }
  }, [hydrated, adminUser, router]);

  if (!hydrated || !adminUser) return null;

  return <AdminLayout>{children}</AdminLayout>;
}
```

- [ ] **Step 4: Run typecheck and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npx eslint src --ext .ts,.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/sections/admin/call-report-approval-view.tsx src/app/admin/call-report-approval/page.tsx src/app/admin/call-report-approval/layout.tsx
git commit -m "Add Call Report Approval list page"
```

---

## Task 5: Call Report Approval detail page

**Files:**
- Create: `src/sections/admin/call-report-approval-bundle-view.tsx`
- Create: `src/app/admin/call-report-approval/[bundleId]/page.tsx`

**Interfaces:**
- Consumes: `paths.admin.callReportApproval`, `paths.admin.reconsideration` (existing); `review.callReport.*` (Task 1); `SALES_REJECT_REASONS`, `buildDecisionReason` (Task 2, `./call-report/call-report-decline`); `CallReportResultModal` (existing, `./call-report/call-report-result-modal`, props `{ open: boolean; onClose: () => void }`)
- Produces: `export function CallReportApprovalBundleView()`

- [ ] **Step 1: Create the detail view component**

Create `src/sections/admin/call-report-approval-bundle-view.tsx`:

```tsx
'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, type SemanticTone } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { CallReportResultModal } from './call-report/call-report-result-modal';
import { SALES_REJECT_REASONS, buildDecisionReason } from './call-report/call-report-decline';

import type { CallReportApprovalStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Detail page for the Call Report Approver — reached by clicking the one
// row on "Call Report Approvals" (call-report-approval-view.tsx), at
// paths.admin.callReportApprovalBundle(). Same list -> detail split and
// fixed-placeholder-segment convention as ci-fee-approval-bundle-view.tsx
// — Call Report's approval status lives on a single flat
// review.callReport object (no bundles/multi-property concept), so
// there's no bundle ID to look up either.
//
// "View Call Report Result" opens the SAME CallReportResultModal the
// Call Report page itself and Requirement Checklist's "View Call Report"
// action use — no new read-only view built for this screen.
//
// Decline reuses Call Report's own Sales Reject reason flow exactly
// (SALES_REJECT_REASONS + buildDecisionReason from call-report-decline.ts)
// and performs the identical routing (-> Reconsideration), plus resets
// callReportApprovalStatus back to 'not-submitted' — functionally the
// same outcome as clicking Sales Reject directly on the Call Report page.
// ----------------------------------------------------------------------

const CALL_REPORT_STATUS_COPY: Record<CallReportApprovalStatus, { label: string; tone: SemanticTone }> = {
  'not-submitted': { label: 'Not Submitted', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
};

export function CallReportApprovalBundleView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review, setCallReport } = useAdmin();
  const { callReportApprovalStatus, callReportSubmittedAt } = review.callReport;

  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonRemarks, setReasonRemarks] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  if (!signUpData) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Request not found
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
            This request isn&apos;t in your current session.
          </Typography>
          <Button component={RouterLink} href={paths.admin.callReportApproval} variant="outlined">
            Back to Call Report Approvals
          </Button>
        </Box>
      </Container>
    );
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const copy = CALL_REPORT_STATUS_COPY[callReportApprovalStatus];
  const isPending = callReportApprovalStatus === 'pending-approval';
  const submittedOnLabel = callReportSubmittedAt ? new Date(callReportSubmittedAt).toLocaleString() : '—';

  const closeConfirm = () => {
    setConfirmOpen(false);
    setApproverName('');
  };

  const confirmApprove = () => {
    if (!approverName.trim()) return;
    setCallReport({
      callReportApprovalStatus: 'approved',
      callReportApprovedAt: new Date().toISOString(),
      callReportApprovedBy: approverName.trim(),
    });
    setConfirmOpen(false);
    setApproverName('');
    setJustApproved(true);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setReasonCategory('');
    setReasonRemarks('');
  };

  // Same outcome as clicking Sales Reject directly on the Call Report
  // page (same reason format, same route to Reconsideration), plus
  // resetting callReportApprovalStatus so a fresh Call Report can be
  // submitted for approval again if this application ever re-enters the
  // forward pipeline.
  const confirmDecline = () => {
    if (!signUpData || !reasonCategory) return;
    const decisionReason = buildDecisionReason(reasonCategory, reasonRemarks);
    setCallReport({ callReportApprovalStatus: 'not-submitted', decisionReason });
    closeDecline();
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={RouterLink}
            href={paths.admin.callReportApproval}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{ color: '#5A6273', fontWeight: 600, fontSize: 13, px: 0.5 }}
          >
            Back to Call Report Approvals
          </Button>
        </Box>

        <Box sx={{ ...adminCardSx, p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" spacing={1.75} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  borderRadius: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#EEF1FE',
                }}
              >
                <Iconify icon="solar:document-text-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                  {applicantName}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                  App No. {getLoanNumber(signUpData.email)} · {signUpData.email}
                </Typography>
              </Box>
            </Stack>
            <StatusBadge tone={copy.tone} label={copy.label} />
          </Stack>

          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              mt: 2.5,
              border: '1px solid #EEF0F5',
              borderRadius: '12px',
              bgcolor: '#FAFBFD',
              p: 1.75,
            }}
          >
            <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
              Submitted on {submittedOnLabel}
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ ...adminCardSx }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.5 }}>
            <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#5A6273' }} />
            <Typography sx={{ fontSize: 13, color: '#5A6273', flex: 1 }}>
              Review the full call report before deciding.
            </Typography>
            <Button
              onClick={() => setResultModalOpen(true)}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:document-text-bold-duotone" width={16} />}
              sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px' }}
            >
              View Call Report Result
            </Button>
          </Stack>

          {isPending && !justApproved ? (
            <Stack spacing={1.25}>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                This call report is waiting on your decision before Requirement Checklist unlocks.
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
                >
                  Approve Call Report
                </Button>
                <Button
                  onClick={() => setDeclineOpen(true)}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
                >
                  Decline
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Iconify
                icon={
                  callReportApprovalStatus === 'approved' && justApproved
                    ? 'solar:check-circle-bold-duotone'
                    : 'solar:info-circle-bold-duotone'
                }
                width={20}
                sx={{ color: callReportApprovalStatus === 'approved' ? '#0C8A4F' : '#8891A6' }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                {callReportApprovalStatus === 'approved'
                  ? justApproved
                    ? `Approved the call report for ${applicantName}.`
                    : `You already approved the call report for ${applicantName}.`
                  : `No call report has been submitted for ${applicantName} yet.`}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>

      <CallReportResultModal open={resultModalOpen} onClose={() => setResultModalOpen(false)} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={closeConfirm}
        title="Approve Call Report?"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
              Approving unlocks Requirement Checklist for <strong>{applicantName}</strong>. This
              can’t be undone from here.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Approver Name"
              placeholder="Type your name"
              value={approverName}
              onChange={(event) => setApproverName(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!approverName.trim()}
            onClick={confirmApprove}
            sx={confirmDialogActionToneSx.default}
          >
            Approve
          </Button>
        }
      />

      <ConfirmDialog
        open={declineOpen}
        onClose={closeDecline}
        title="Reason for declining"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              autoFocus
              fullWidth
              label="Reason"
              value={reasonCategory}
              onChange={(event) => setReasonCategory(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            >
              {SALES_REJECT_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Remarks"
              placeholder="Add any additional details…"
              value={reasonRemarks}
              onChange={(event) => setReasonRemarks(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!reasonCategory}
            onClick={confirmDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
```

- [ ] **Step 2: Create the app-router detail page**

Create `src/app/admin/call-report-approval/[bundleId]/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { CallReportApprovalBundleView } from 'src/sections/admin/call-report-approval-bundle-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Call Report - Approval | HHC LMS',
};

export default function Page() {
  return <CallReportApprovalBundleView />;
}
```

(No separate layout file needed under `[bundleId]/` — the parent `call-report-approval/layout.tsx` from Task 4 covers this nested route too, same convention as every other `[bundleId]`/`[kind]` route in this app.)

- [ ] **Step 3: Run typecheck and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npx eslint src --ext .ts,.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sections/admin/call-report-approval-bundle-view.tsx "src/app/admin/call-report-approval/[bundleId]/page.tsx"
git commit -m "Add Call Report Approval detail page"
```

---

## Task 6: Manual verification pass

**Files:** none (verification only — no code changes expected; if a real bug is found, fix it in the file it belongs to and note the fix in the commit message)

**Interfaces:** none

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (in background — note the port it starts on, e.g. 3000 or 3001 if 3000 is taken)

- [ ] **Step 2: Log in and seed a live application**

Using a browser automation tool (Playwright, or equivalent), navigate to `/admin/login`, log in with `admin@pgfinance.com.ph` / `Admin123`.

- [ ] **Step 3: Fill Call Report sample data and submit for approval**

Navigate to `/admin/applications/<any-id>/call-report` (the `[id]` route segment is ignored by this prototype — any string works, e.g. `/admin/applications/verify/call-report`). Open the gear-icon Settings popover (bottom-right), click "Fill with Sample Data". Confirm the 8 section cards are filled. Scroll to "Proceed application?" — confirm the button now reads **"Submit for Approval"** (not "Proceed to Requirement Checklist"). Click it.

Expected: the card's status area now shows "Submitted for approval — waiting on the Call Report Approver." — the page does NOT navigate away.

- [ ] **Step 4: Approve via the new screen**

Navigate to `/admin/call-report-approval` (or click "Call Report - Approval" under the "Request" nav dropdown). Confirm the list shows one row for the live applicant with a "For Approval" status badge. Click the row.

Expected: detail page loads at `/admin/call-report-approval/current`, showing the applicant header, a "View Call Report Result" button, and Approve/Decline buttons. Click "View Call Report Result" — confirm the existing `CallReportResultModal` opens showing the filled-in 8 sections. Close it. Click "Approve Call Report" — confirm the dialog requires an Approver Name before its Approve button enables; type a name (e.g. "Maria Santos") and confirm.

Expected: the page updates to show "Approved the call report for {applicant}." with a green check icon.

- [ ] **Step 5: Confirm the Call Report page reflects approval**

Navigate back to `/admin/applications/verify/call-report` (or whichever id was used in Step 3). Confirm:
- The "Proceed application?" card now shows "Approved by {the typed approver name}." and a **"Continue to Requirement Checklist"** button.
- Scroll to the Account Officer Endorsement Declaration card — confirm a second green-boxed row now appears showing **"Approved By"** (the typed name) and **"Approval Date/Time"** (a real timestamp), below the existing Account Officer row.

Click "Continue to Requirement Checklist" — confirm it navigates to `/admin/applications/verify/requirement-checklist`.

- [ ] **Step 6: Confirm Sales Reject still works unaffected**

Reload the Call Report page for a **different**/fresh sample application (e.g. use "Simulate: Reset..." page actions if available, or start a new session by clearing localStorage and re-seeding via the Application List). Fill sample data, then click "Sales Reject" (without clicking "Submit for Approval" first). Confirm the existing reason-dropdown + remarks dialog still opens, and confirming it still routes straight to Reconsideration — with no Approval-screen involvement at all.

- [ ] **Step 7: Confirm Decline on the approval screen routes to Reconsideration**

Repeat Steps 3–4 up through submitting for approval and opening the detail page, but this time click **"Decline"** instead of Approve. Confirm the same reason-dropdown + remarks dialog opens (same options as Sales Reject: "Insufficient income", "Poor credit history", etc.), and confirming it routes to `/admin/applications/<id>/reconsideration` — same destination Sales Reject uses.

- [ ] **Step 8: Final full verification**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npx eslint src --ext .ts,.tsx`
Expected: no errors.

Stop the dev server and clean up any screenshots/scratch files created during manual verification.

- [ ] **Step 9: Update `docs/160-request-call-report-approval.md`**

Replace the placeholder content in `docs/160-request-call-report-approval.md` with real documentation of the built feature, following the exact structure/tone of `docs/150-request-credit-investigation-fee-approval.md` (What this is / list → detail split / always-one-actionable-request / the detail page / timestamp side effects). Update its "Companion to" cross-references to point at `docs/080-account-solicitation-call-report.md` (Call Report itself, now documenting the Submit for Approval gate) and `docs/090-account-solicitation-requirement-checklist.md` (what this unlocks).

Also update `docs/080-account-solicitation-call-report.md`'s "Proceed gate" section (and any other section describing `approved`/"Proceed to Requirement Checklist") to describe the new `callReportApprovalStatus` flow, "Submit for Approval" button, and cross-reference `docs/160-request-call-report-approval.md`.

- [ ] **Step 10: Commit the doc updates**

```bash
git add docs/160-request-call-report-approval.md docs/080-account-solicitation-call-report.md
git commit -m "Document the Call Report Approval feature"
```
