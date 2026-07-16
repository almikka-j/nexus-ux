'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { StepWelcome } from './step-welcome';
import { StepPersonalInfo } from './step-personal-info';
import { StepSelfieVerification } from './step-selfie-verification';

import type { PersonalInfo } from 'src/auth/registration-context';
import type { PersonalInfoNameFields } from './step-personal-info';

// ----------------------------------------------------------------------

export function OnboardingView() {
  const router = useRouter();
  const {
    signUpData,
    application,
    setSignUpData,
    setPersonalInfo,
    setSelfieVerified,
    setSelfiePhoto,
    markSubmitted,
  } = useRegistration();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const firstName = signUpData?.firstName || 'there';

  const handlePersonalInfo = (personalInfo: PersonalInfo, nameFields: PersonalInfoNameFields) => {
    if (signUpData) {
      setSignUpData({
        ...signUpData,
        firstName: nameFields.firstName,
        middleName: nameFields.middleName,
        extensionName: nameFields.extensionName,
      });
    }
    setPersonalInfo(personalInfo);
    setStep(2);
  };

  const handleSelfieVerified = (photo: string | null) => {
    setSelfiePhoto(photo);
    setSelfieVerified(true);
    markSubmitted();
    router.push(paths.auth.thankYou);
  };

  if (step === 0) {
    return <StepWelcome firstName={firstName} onDone={() => setStep(1)} />;
  }

  return (
    <Stack
      sx={{
        minHeight: '100vh',
        bgcolor: 'common.white',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, md: 6 },
        overflowY: 'auto',
      }}
    >
      {step === 2 && (
        <Box sx={{ width: 1, maxWidth: 640, mb: 1.5 }}>
          <Link
            component="button"
            onClick={() => setStep(1)}
            sx={{ fontSize: 13.5, color: '#667085', fontWeight: 600 }}
          >
            ← Back
          </Link>
        </Box>
      )}

      {step === 1 && (
        <StepPersonalInfo
          defaultValues={application.personalInfo || {}}
          nameDefaultValues={{
            firstName: signUpData?.firstName,
            middleName: signUpData?.middleName,
            extensionName: signUpData?.extensionName,
          }}
          onSubmitApplication={handlePersonalInfo}
        />
      )}

      {step === 2 && <StepSelfieVerification onContinue={handleSelfieVerified} />}
    </Stack>
  );
}
