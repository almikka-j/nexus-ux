'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { OnboardingLayout } from 'src/layouts/onboarding';

import { StepWelcome } from './step-welcome';
import { StepLoanType } from './step-loan-type';
import { StepFinancialInfo } from './step-financial-info';
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

  const handlePersonalInfo = (personalInfo: PersonalInfo) => {
    setPersonalInfo(personalInfo);
    setStep(5);
  };

  const handleSelfieVerified = (photo: string | null) => {
    setSelfiePhoto(photo);
    setSelfieVerified(true);
    markSubmitted();
    router.push(paths.auth.thankYou);
  };

  const handleFinancialInfo = (financialInfo: FinancialInfo) => {
    setFinancialInfo(financialInfo);
    setStep(4);
  };

  const handleSkipToEnd = () => {
    router.push(paths.borrower.dashboard);
  };

  if (step === 1) {
    return (
      <StepWelcome
        firstName={firstName}
        onContinue={() => setStep(2)}
        onSkipToDashboard={handleSkipToEnd}
      />
    );
  }

  return (
    <OnboardingLayout
      step={step}
      totalSteps={5}
      onBack={step > 2 ? () => setStep(step - 1) : undefined}
      onExit={step === 2 ? () => setStep(1) : undefined}
    >
      {step === 2 && (
        <StepLoanType
          firstName={firstName}
          value={application.loanType}
          onChange={setLoanType}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepFinancialInfo defaultValues={application.financialInfo || {}} onContinue={handleFinancialInfo} />
      )}

      {step === 4 && (
        <StepPersonalInfo
          defaultValues={application.personalInfo || {}}
          onSubmitApplication={handlePersonalInfo}
        />
      )}

      {step === 5 && <StepSelfieVerification onContinue={handleSelfieVerified} />}
    </OnboardingLayout>
  );
}
