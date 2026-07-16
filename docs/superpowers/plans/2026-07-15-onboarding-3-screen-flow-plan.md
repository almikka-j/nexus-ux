# Onboarding 3-Screen Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the borrower onboarding wizard from 5 steps to 3 —
**Preliminary application** (Loan Type + Financial Info merged) →
**Upload ID** (renamed `StepPersonalInfo`) → **Selfie** (unchanged) — and add
an equivalent verification step to `/borrower/apply`'s standalone 3-step
flow, reusing the existing OTP mechanism.

**Architecture:** A new `StepPreliminaryApplication` component composes the
existing `LoanTypeCard` picker above `StepFinancialInfo`'s existing form
fields/schema, in one card/one screen. `StepPersonalInfo` gets a title-only
rename (no field changes) to "Upload ID". `StepWelcome` is deleted (no
longer used anywhere). `VerifyView` gains an `onVerified` callback prop
(defaulting to its current hardcoded behavior) so `/borrower/apply` can
reuse it with different post-verify navigation and a local (not global)
verified gate.

**Tech Stack:** Next.js App Router, React Hook Form + Zod, MUI — no new
dependencies.

## Global Constraints

- Sign-up (`/auth/sign-up`) and the original Verify screen's behavior when
  reached from sign-up are **unchanged** — only the onboarding wizard step
  count/content changes, plus a new reused verify step inserted into
  `/borrower/apply`.
- No field additions/removals anywhere — Financial Info and Personal Info
  keep their exact current fields, validation, and sample-data values.
- `/borrower/apply`'s new verify step must NOT write to the global
  `RegistrationState.verified` flag — that's already `true` from the
  original sign-up and must stay meaning "this account completed identity
  verification once," not "this specific application session was
  reverified." Use local component state scoped to the apply-flow wizard.
- `StepWelcome` and its file are deleted, not just unrendered — it becomes
  fully unused after this change.

---

### Task 1: Add `onVerified` prop to `VerifyView` (make it reusable)

**Files:**
- Modify: `src/sections/auth/verify-view.tsx`

**Interfaces:**
- Produces: `VerifyView` accepts new optional props `onVerified?: () => void`
  and `backHref?: string` (both optional, defaulting to today's exact
  behavior, so the existing `/auth/verify` call site needs zero changes).

- [ ] **Step 1: Add optional props with defaults matching current behavior**

Find:

```tsx
export function VerifyView() {
  const router = useRouter();
  const { signUpData, setVerified } = useRegistration();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showVerified, setShowVerified] = useState(false);
```

Replace with:

```tsx
type VerifyViewProps = {
  onVerified?: () => void;
  backHref?: string;
};

export function VerifyView({ onVerified, backHref }: VerifyViewProps = {}) {
  const router = useRouter();
  const { signUpData, setVerified } = useRegistration();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showVerified, setShowVerified] = useState(false);
```

- [ ] **Step 2: Route the post-verify navigation through the callback**

Find:

```tsx
  if (showVerified) {
    return <VerifiedTransition onDone={() => router.push(paths.auth.onboarding)} />;
  }
```

Replace with:

```tsx
  if (showVerified) {
    return (
      <VerifiedTransition onDone={onVerified ?? (() => router.push(paths.auth.onboarding))} />
    );
  }
```

- [ ] **Step 3: Make the "back to sign up" link's target configurable**

Find:

```tsx
              <Link
                component={RouterLink}
                href={paths.auth.signUp}
                sx={{ fontSize: 13.5, fontWeight: 600, color: '#667085', mt: 1 }}
              >
                ← Return to sign up
              </Link>
```

Replace with:

```tsx
              <Link
                component={RouterLink}
                href={backHref ?? paths.auth.signUp}
                sx={{ fontSize: 13.5, fontWeight: 600, color: '#667085', mt: 1 }}
              >
                {backHref ? '← Back to dashboard' : '← Return to sign up'}
              </Link>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (the existing `/auth/verify` page renders `<VerifyView />`
with no props, which still matches the new optional-props signature).

- [ ] **Step 5: Commit**

```bash
git add src/sections/auth/verify-view.tsx
git commit -m "Make VerifyView reusable via onVerified/backHref props"
```

---

### Task 2: New `StepPreliminaryApplication` (Loan Type + Financial Info merged)

**Files:**
- Create: `src/sections/auth/onboarding/step-preliminary-application.tsx`

**Interfaces:**
- Consumes: `LoanTypeCard` (`./loan-type-card`), `FinancialInfoSchema`/`FinancialInfoSchemaType`/`LOAN_TERMS`/`EMPLOYMENT_STATUSES`/`LOAN_PURPOSES`/`SAMPLE_FINANCIAL_INFO`-equivalent constants (copy the existing ones from `step-financial-info.tsx` rather than importing internals — see Step 1 below for why), `authFieldSx`/`authFieldLabelSx`/`authPrimaryButtonSx` (`../auth-input-styles`), `LoanType`/`FinancialInfo` types (`src/auth/registration-context`).
- Produces: `StepPreliminaryApplication({ firstName, loanType, onLoanTypeChange, financialDefaultValues, onContinue }: { firstName: string; loanType: LoanType | null; onLoanTypeChange: (loanType: LoanType | null) => void; financialDefaultValues: Partial<FinancialInfo>; onContinue: (data: FinancialInfo) => void })` — renders loan-type cards above the financial-info form in one card; Continue is disabled until both a loan type is picked AND the financial form validates.

- [ ] **Step 1: Write the component**

`step-financial-info.tsx`'s schema/constants (`FinancialInfoSchema`,
`FinancialInfoSchemaType`, `LOAN_TERMS`, `EMPLOYMENT_STATUSES`,
`LOAN_PURPOSES`, `SAMPLE_FINANCIAL_INFO`) are already exported from that
file — reuse them via import rather than duplicating, since
`StepFinancialInfo` itself will be deleted in Task 3 but its schema module
content should not be lost. To keep this simple, **rename
`step-financial-info.tsx` to `step-preliminary-application.tsx` and edit it
in place** (rather than creating a brand-new file and deleting the old one)
— this preserves the exported schema/constants under one file and avoids a
needless duplicate. Concretely:

```bash
git mv src/sections/auth/onboarding/step-financial-info.tsx src/sections/auth/onboarding/step-preliminary-application.tsx
```

Then edit the moved file's full contents to:

```tsx
'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from '../auth-input-styles';

import { LoanTypeCard } from './loan-type-card';

import type { LoanType, FinancialInfo } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

const LOAN_TERMS = [6, 12, 18, 24, 36];

const EMPLOYMENT_STATUSES = ['Employed', 'Self-Employed', 'Business Owner', 'OFW', 'Unemployed'];

const LOAN_PURPOSES = [
  'Working Capital',
  'Business Expansion',
  'Education',
  'Home Improvement',
  'Debt Consolidation',
  'Other',
];

export type FinancialInfoSchemaType = zod.infer<typeof FinancialInfoSchema>;

export const FinancialInfoSchema = zod.object({
  desiredLoanAmount: zod.coerce.number().min(1, { message: 'Enter your desired loan amount.' }),
  loanTermMonths: zod.coerce.number().min(1, { message: 'Select a loan term.' }),
  employmentStatus: zod.string().min(1, { message: 'Select your employment status.' }),
  monthlyIncome: zod.coerce.number().min(1, { message: 'Enter your monthly income.' }),
  loanPurpose: zod.string().min(1, { message: 'Select the purpose of your loan.' }),
});

const SAMPLE_FINANCIAL_INFO: FinancialInfoSchemaType = {
  desiredLoanAmount: 50000,
  loanTermMonths: 12,
  employmentStatus: 'Employed',
  monthlyIncome: 30000,
  loanPurpose: 'Working Capital',
};

const SAMPLE_LOAN_TYPE: LoanType = 'personal';

// ----------------------------------------------------------------------

type StepPreliminaryApplicationProps = {
  firstName: string;
  loanType: LoanType | null;
  onLoanTypeChange: (loanType: LoanType | null) => void;
  financialDefaultValues: Partial<FinancialInfo>;
  onContinue: (data: FinancialInfo) => void;
};

export function StepPreliminaryApplication({
  firstName,
  loanType,
  onLoanTypeChange,
  financialDefaultValues,
  onContinue,
}: StepPreliminaryApplicationProps) {
  const initialValues: FinancialInfoSchemaType = {
    desiredLoanAmount: financialDefaultValues.desiredLoanAmount ?? ('' as unknown as number),
    loanTermMonths: financialDefaultValues.loanTermMonths ?? 12,
    employmentStatus: financialDefaultValues.employmentStatus || '',
    monthlyIncome: financialDefaultValues.monthlyIncome ?? ('' as unknown as number),
    loanPurpose: (financialDefaultValues as Partial<FinancialInfoSchemaType>).loanPurpose || '',
  };

  const methods = useForm<FinancialInfoSchemaType>({
    resolver: zodResolver(FinancialInfoSchema),
    defaultValues: initialValues,
  });

  const { handleSubmit, reset } = methods;
  const [isSample, setIsSample] = useState(false);
  const isSampleLoanType = loanType === SAMPLE_LOAN_TYPE;

  const onSubmit = handleSubmit((data) => onContinue(data as unknown as FinancialInfo));

  const handleToggleSample = () => {
    const next = !isSample;
    reset(next ? SAMPLE_FINANCIAL_INFO : initialValues);
    onLoanTypeChange(next ? SAMPLE_LOAN_TYPE : null);
    setIsSample(next);
  };

  return (
    <Box
      sx={{
        width: 1,
        maxWidth: 640,
        bgcolor: 'common.white',
        borderRadius: '18px',
        boxShadow: '0 22px 60px -30px rgba(20,23,42,0.28)',
        p: { xs: 3, md: 5 },
      }}
    >
      <Stack alignItems="center" textAlign="center" spacing={0.75} sx={{ mb: 3.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8891A6' }}>
          Step 1 · Preliminary
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
          Preliminary application
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
          Tell us what you&apos;re looking for, {firstName}, and let&apos;s check if you qualify.
        </Typography>

        <Button onClick={handleToggleSample} size="small" sx={{ color: 'text.disabled' }}>
          {isSample ? 'Remove Sample Data' : 'Fill with Sample Data'}
        </Button>
      </Stack>

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Typography sx={authFieldLabelSx}>What type of loan do you need?</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <LoanTypeCard
            icon="solar:user-heart-bold-duotone"
            title="Personal Loan"
            description="For your goals — education, travel, home needs, or life's milestones."
            selected={loanType === 'personal'}
            onClick={() => onLoanTypeChange('personal')}
          />
          <LoanTypeCard
            icon="solar:buildings-2-bold-duotone"
            title="Business Loan"
            description="For building or growing your business — capital, expansion, and more."
            selected={loanType === 'business'}
            onClick={() => onLoanTypeChange('business')}
          />
        </Stack>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Desired loan amount</Typography>
              <Field.Text
                name="desiredLoanAmount"
                type="number"
                placeholder="100,000"
                sx={authFieldSx}
                InputProps={{
                  startAdornment: <InputAdornment position="start">PHP</InputAdornment>,
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Loan term</Typography>
              <Field.Select name="loanTermMonths" sx={authFieldSx}>
                {LOAN_TERMS.map((term) => (
                  <MenuItem key={term} value={term}>
                    {term} months
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Employment status</Typography>
              <Field.Select name="employmentStatus" sx={authFieldSx}>
                {EMPLOYMENT_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Monthly income</Typography>
              <Field.Text
                name="monthlyIncome"
                type="number"
                placeholder="35,000"
                sx={authFieldSx}
                InputProps={{
                  startAdornment: <InputAdornment position="start">PHP</InputAdornment>,
                }}
              />
            </Box>
          </Stack>

          <Box>
            <Typography sx={authFieldLabelSx}>Purpose of loan</Typography>
            <Field.Select name="loanPurpose" sx={authFieldSx}>
              {LOAN_PURPOSES.map((purpose) => (
                <MenuItem key={purpose} value={purpose}>
                  {purpose}
                </MenuItem>
              ))}
            </Field.Select>
          </Box>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ bgcolor: '#EEF1FE', borderRadius: '11px', p: 2 }}
          >
            <Iconify icon="solar:info-circle-bold" width={17} sx={{ color: '#3448B0', flexShrink: 0, mt: 0.25 }} />
            <Typography sx={{ fontSize: 12.5, color: '#3448B0', lineHeight: 1.55 }}>
              This is a quick pre-check — no impact on your credit score. You&apos;ll get an
              instant estimate before formally applying.
            </Typography>
          </Stack>

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={!loanType}
            sx={authPrimaryButtonSx}
          >
            Continue →
          </Button>
        </Stack>
      </Form>
    </Box>
  );
}
```

Note: `disabled={!loanType}` on the submit button blocks the RHF submit
handler from firing at all when no loan type is picked — this is the "both
must be satisfied" gate described in the design. RHF's own field validation
(zod) still applies for the financial fields once loan type is set and the
button is enabled.

- [ ] **Step 2: Typecheck this file in isolation**

Run: `npx tsc --noEmit`
Expected: errors only in `onboarding-view.tsx` and `loan-application-view.tsx`
(they still reference the old `StepFinancialInfo`/`StepLoanType` names —
fixed in Tasks 4 and 5). No errors originating from
`step-preliminary-application.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add src/sections/auth/onboarding/step-preliminary-application.tsx
git commit -m "Merge Loan Type and Financial Info into StepPreliminaryApplication"
```

---

### Task 3: Rename `StepPersonalInfo`'s heading to "Upload ID"

**Files:**
- Modify: `src/sections/auth/onboarding/step-personal-info.tsx`

No field, schema, or prop changes — title/copy only, since this step
already collects the ID upload + all personal details in one screen.

- [ ] **Step 1: Update the step's heading copy**

Find:

```tsx
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8891A6' }}>
          Step 3 · Your details
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
          Your personal information
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
          Please fill out your basic details so we can get in touch and process your loan
          application.
        </Typography>
```

Replace with:

```tsx
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8891A6' }}>
          Step 2 · Upload ID
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
          Upload ID
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
          Upload a valid ID and fill out your basic details so we can get in touch and process
          your loan application.
        </Typography>
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/auth/onboarding/step-personal-info.tsx
git commit -m "Retitle StepPersonalInfo as Upload ID for the 3-screen flow"
```

---

### Task 4: Delete `StepWelcome` and rewire `onboarding-view.tsx` to 3 steps

**Files:**
- Delete: `src/sections/auth/onboarding/step-welcome.tsx`
- Modify: `src/sections/auth/onboarding/onboarding-view.tsx`

- [ ] **Step 1: Delete the unused file**

```bash
git rm src/sections/auth/onboarding/step-welcome.tsx
```

- [ ] **Step 2: Rewrite `onboarding-view.tsx`**

Replace the full contents of `src/sections/auth/onboarding/onboarding-view.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { OnboardingLayout } from 'src/layouts/onboarding';

import { StepPreliminaryApplication } from './step-preliminary-application';
import { StepPersonalInfo } from './step-personal-info';
import { StepSelfieVerification } from './step-selfie-verification';

import type { FinancialInfo, PersonalInfo } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

export function OnboardingView() {
  const router = useRouter();
  const {
    signUpData,
    application,
    setLoanType,
    setFinancialInfo,
    setPersonalInfo,
    setSelfieVerified,
    setSelfiePhoto,
    markSubmitted,
  } = useRegistration();
  const [step, setStep] = useState(1);

  const firstName = signUpData?.firstName || 'there';

  const handleFinancialInfo = (financialInfo: FinancialInfo) => {
    setFinancialInfo(financialInfo);
    setStep(2);
  };

  const handlePersonalInfo = (personalInfo: PersonalInfo) => {
    setPersonalInfo(personalInfo);
    setStep(3);
  };

  const handleSelfieVerified = (photo: string | null) => {
    setSelfiePhoto(photo);
    setSelfieVerified(true);
    markSubmitted();
    router.push(paths.auth.thankYou);
  };

  return (
    <OnboardingLayout
      step={step}
      totalSteps={3}
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
    >
      {step === 1 && (
        <StepPreliminaryApplication
          firstName={firstName}
          loanType={application.loanType}
          onLoanTypeChange={setLoanType}
          financialDefaultValues={application.financialInfo || {}}
          onContinue={handleFinancialInfo}
        />
      )}

      {step === 2 && (
        <StepPersonalInfo
          defaultValues={application.personalInfo || {}}
          onSubmitApplication={handlePersonalInfo}
        />
      )}

      {step === 3 && <StepSelfieVerification onContinue={handleSelfieVerified} />}
    </OnboardingLayout>
  );
}
```

Note: `onExit`/"Skip to Dashboard" is dropped along with `StepWelcome` — there
is no longer an intermediate screen to host that escape hatch, per the
design decision. `onBack` now only appears from step 2 onward (step 1 has
no "back" target, matching the old wizard's step-2 `onBack === undefined`
behavior).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors remaining only in `loan-application-view.tsx` (fixed in
Task 5).

- [ ] **Step 4: Commit**

```bash
git add -A src/sections/auth/onboarding/step-welcome.tsx src/sections/auth/onboarding/onboarding-view.tsx
git commit -m "Reduce onboarding wizard to 3 screens, remove Welcome step"
```

---

### Task 5: Add a verify step to `/borrower/apply` and rewire to 3 screens

**Files:**
- Modify: `src/sections/borrower/loan-application-view.tsx`

**Interfaces:**
- Consumes: `VerifyView` with its new `onVerified`/`backHref` props (Task 1),
  `StepPreliminaryApplication` (Task 2).

- [ ] **Step 1: Rewrite `loan-application-view.tsx`**

Replace the full contents of `src/sections/borrower/loan-application-view.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { OnboardingLayout } from 'src/layouts/onboarding';

import { VerifyView } from 'src/sections/auth/verify-view';
import { StepPersonalInfo } from 'src/sections/auth/onboarding/step-personal-info';
import { StepSelfieVerification } from 'src/sections/auth/onboarding/step-selfie-verification';
import { StepPreliminaryApplication } from 'src/sections/auth/onboarding/step-preliminary-application';

import type { FinancialInfo, PersonalInfo } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

// Local to this wizard session only — deliberately NOT written to the
// global RegistrationState.verified flag, which already means "this
// account completed identity verification once" from the original sign-up.
// Filing a second application re-confirms via the same OTP mechanism
// without disturbing that global flag.
export function LoanApplicationView() {
  const router = useRouter();
  const {
    signUpData,
    application,
    setLoanType,
    setFinancialInfo,
    setPersonalInfo,
    setSelfieVerified,
    setSelfiePhoto,
    markSubmitted,
  } = useRegistration();
  const [reverified, setReverified] = useState(false);
  const [step, setStep] = useState(1);

  const firstName = signUpData?.firstName || 'there';

  const handleFinancialInfo = (financialInfo: FinancialInfo) => {
    setFinancialInfo(financialInfo);
    setStep(2);
  };

  const handlePersonalInfo = (personalInfo: PersonalInfo) => {
    setPersonalInfo(personalInfo);
    setStep(3);
  };

  const handleSelfieVerified = (photo: string | null) => {
    setSelfiePhoto(photo);
    setSelfieVerified(true);
    markSubmitted();
    router.push(paths.auth.thankYou);
  };

  const handleCancel = () => {
    router.push(paths.borrower.dashboard);
  };

  if (!reverified) {
    return <VerifyView onVerified={() => setReverified(true)} backHref={paths.borrower.dashboard} />;
  }

  return (
    <OnboardingLayout
      step={step}
      totalSteps={3}
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      onExit={step === 1 ? handleCancel : undefined}
    >
      {step === 1 && (
        <StepPreliminaryApplication
          firstName={firstName}
          loanType={application.loanType}
          onLoanTypeChange={setLoanType}
          financialDefaultValues={application.financialInfo || {}}
          onContinue={handleFinancialInfo}
        />
      )}

      {step === 2 && (
        <StepPersonalInfo
          defaultValues={application.personalInfo || {}}
          onSubmitApplication={handlePersonalInfo}
        />
      )}

      {step === 3 && <StepSelfieVerification onContinue={handleSelfieVerified} />}
    </OnboardingLayout>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean, no errors anywhere.

- [ ] **Step 3: Lint**

Run: `npx eslint src`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/sections/borrower/loan-application-view.tsx
git commit -m "Add re-verification step to /borrower/apply, reduce to 3 screens"
```

---

### Task 6: End-to-end verification and docs

**Files:**
- Modify: `PROJECT_OVERVIEW.md`
- Modify: `docs/BORROWER_SIGNUP_FLOW.md`

- [ ] **Step 1: Full production build**

```bash
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
rm -rf .next
npx next build
```
Expected: clean build, no type/lint errors.

- [ ] **Step 2: Manual/Playwright walk on a fresh dev server**

1. `/auth/sign-up` → fill and submit → `/auth/verify` → enter `123456` →
   confirm redirect lands on the new 3-step wizard's step 1
   ("Preliminary application"), NOT a Welcome screen.
2. Confirm step 1 shows loan-type cards above the financial-info fields in
   one card; confirm Continue is disabled until a loan type is picked, and
   still gated by the existing zod validation on the financial fields.
3. Confirm the "Fill with Sample Data" toggle on step 1 sets both a loan
   type (Personal) and the sample financial values together, and un-fills
   both together on second click.
4. Submit step 1 → confirm step 2 is "Upload ID" (same fields as the old
   Personal Info step) → submit → step 3 is Selfie (unchanged) → confirm
   submission still reaches `/auth/thank-you` and `markSubmitted()` still
   stamps `submittedAt`/`assignedOfficer` as before.
5. From `/borrower/dashboard` (with an existing submitted application),
   click into `/borrower/apply` → confirm a Verify screen appears first
   (reusing the same OTP UI, `123456` still works) → confirm successful
   verification advances into the same 3-step flow (Preliminary → Upload ID
   → Selfie) → confirm the "← Back to dashboard" link (not "Return to sign
   up") appears on this reused verify screen → confirm submitting this
   second application still reaches `/auth/thank-you`.
6. Confirm the global `verified` flag from the original sign-up is untouched
   by the `/borrower/apply` reverification (i.e., no regression to the
   original `/auth/onboarding` gate if visited again in the same session).

- [ ] **Step 3: Update `PROJECT_OVERVIEW.md` and `docs/BORROWER_SIGNUP_FLOW.md`**

Update the onboarding step count/names (5→3), the removal of `StepWelcome`,
the new `StepPreliminaryApplication` component and what it merges, the
"Upload ID" rename, and the new verify step added to `/borrower/apply`
(including the local-not-global reverification state). Follow each file's
existing documentation style and update both — `PROJECT_OVERVIEW.md`'s
directory map / architecture notes and `BORROWER_SIGNUP_FLOW.md`'s full
step-by-step walk and "Complete ordered journey" list.

- [ ] **Step 4: Final full verification**

```bash
npx tsc --noEmit
npx eslint src
lsof -ti:3000 || echo "port 3000 free"
```
Expected: all three clean.

- [ ] **Step 5: Commit**

```bash
git add PROJECT_OVERVIEW.md docs/BORROWER_SIGNUP_FLOW.md
git commit -m "Document 3-screen onboarding flow and /borrower/apply reverification"
```
