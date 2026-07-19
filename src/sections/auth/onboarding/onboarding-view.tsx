'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { LogoFull } from 'src/components/logo/logo-full';

import { ProgressBar } from './progress-bar';
import { StepWelcome } from './step-welcome';
import { StepPersonalInfo } from './step-personal-info';
import { StepSelfieVerification } from './step-selfie-verification';

import type { PersonalInfo } from 'src/auth/registration-context';
import type { PersonalInfoNameFields } from './step-personal-info';

// ----------------------------------------------------------------------

const ONBOARDING_TOTAL_STEPS = 2;

export function OnboardingView() {
  const router = useRouter();
  const {
    hydrated,
    signUpData,
    onboardingStep,
    setSignUpData,
    setOnboardingStep,
    setPersonalInfo,
    setSelfieVerified,
    setSelfiePhoto,
    markSubmitted,
  } = useRegistration();
  const step = onboardingStep;
  const firstName = signUpData?.firstName || 'there';

  // Any page load/refresh of /auth/onboarding restarts the wizard from
  // Welcome — Selfie's camera capture/consent checkboxes are local component
  // state that's gone after a remount regardless, and Upload ID is likewise
  // always shown blank on re-entry (see defaultValues={{}} below), so
  // resuming at a persisted onboardingStep > 0 would land the borrower on a
  // step with nothing filled in and no way back to redo it properly.
  useEffect(() => {
    if (hydrated && onboardingStep !== 0) {
      setOnboardingStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const handlePersonalInfo = (personalInfo: PersonalInfo, nameFields: PersonalInfoNameFields) => {
    if (signUpData) {
      setSignUpData({
        ...signUpData,
        firstName: nameFields.firstName,
        middleName: nameFields.middleName,
        lastName: nameFields.lastName,
        extensionName: nameFields.extensionName,
      });
    }
    setPersonalInfo(personalInfo);
    setOnboardingStep(2);
  };

  const handleSelfieVerified = (photo: string | null) => {
    setSelfiePhoto(photo);
    setSelfieVerified(true);
    markSubmitted();
    router.push(paths.auth.thankYou);
  };

  if (step === 0) {
    return <StepWelcome firstName={firstName} onDone={() => setOnboardingStep(1)} />;
  }

  return (
    <Stack sx={{ minHeight: '100vh', bgcolor: '#F7F8FC' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: { xs: 3, md: 5 }, py: 2.75, borderBottom: '1px solid #EBEDF3', bgcolor: 'common.white' }}
      >
        <LogoFull width={124} height={26} />

        <Box sx={{ width: 280, display: { xs: 'none', sm: 'block' } }}>
          <ProgressBar activeStep={step} totalSteps={ONBOARDING_TOTAL_STEPS} />
        </Box>

        <Link
          component="button"
          onClick={() => router.push(paths.root)}
          sx={{ fontSize: 13.5, color: '#667085', fontWeight: 600 }}
        >
          Save & exit
        </Link>
      </Stack>

      <Stack
        sx={{
          position: 'relative',
          flex: 1,
          bgcolor: '#F7F8FC',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
          overflowY: 'auto',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: 'url("/images/background/texture-strong.png")',
            backgroundSize: '1400px',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            // texture-strong.png is near-white line art meant to sit on the
            // dark navy Welcome screen (see step-welcome.tsx) — inverted so
            // the same wave/string pattern reads as dark-on-light here.
            filter: 'invert(1)',
            opacity: 0.06,
            pointerEvents: 'none',
          },
        }}
      >
        {step === 2 && (
          <Box sx={{ position: 'relative', zIndex: 1, width: 1, maxWidth: 720, mb: 1.5 }}>
            <Link
              component="button"
              onClick={() => setOnboardingStep(1)}
              sx={{ fontSize: 13.5, color: '#667085', fontWeight: 600 }}
            >
              ← Back
            </Link>
          </Box>
        )}

        <Box sx={{ position: 'relative', zIndex: 1, width: 1, display: 'flex', justifyContent: 'center' }}>
          {step === 1 && (
            <StepPersonalInfo
              // Always blank, never resumed from a prior submission — a
              // refresh anywhere in this wizard restarts Upload ID from
              // scratch (see the reset-to-Welcome effect above) rather than
              // silently repopulating stale answers with no visible trace
              // of them on the Selfie step the borrower may have already
              // reached.
              defaultValues={{}}
              nameDefaultValues={{
                firstName: signUpData?.firstName,
                middleName: signUpData?.middleName,
                lastName: signUpData?.lastName,
                extensionName: signUpData?.extensionName,
              }}
              onSubmitApplication={handlePersonalInfo}
            />
          )}

          {step === 2 && (
            <StepSelfieVerification
              stepLabel="Step 2 · Verify it's you"
              onContinue={handleSelfieVerified}
            />
          )}
        </Box>
      </Stack>
    </Stack>
  );
}
