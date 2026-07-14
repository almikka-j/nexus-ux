'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { OnboardingLayout } from 'src/layouts/onboarding';

import { StepLoanType } from 'src/sections/auth/onboarding/step-loan-type';
import { StepFinancialInfo } from 'src/sections/auth/onboarding/step-financial-info';
import { StepPersonalInfo } from 'src/sections/auth/onboarding/step-personal-info';
import { StepSelfieVerification } from 'src/sections/auth/onboarding/step-selfie-verification';

import type { FinancialInfo, PersonalInfo } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

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
  const [step, setStep] = useState(1);

  const firstName = signUpData?.firstName || 'there';

  const handleFinancialInfo = (financialInfo: FinancialInfo) => {
    setFinancialInfo(financialInfo);
    setStep(3);
  };

  const handlePersonalInfo = (personalInfo: PersonalInfo) => {
    setPersonalInfo(personalInfo);
    setStep(4);
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

  return (
    <OnboardingLayout
      step={step}
      totalSteps={4}
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      onExit={step === 1 ? handleCancel : undefined}
    >
      {step === 1 && (
        <StepLoanType
          firstName={firstName}
          value={application.loanType}
          onChange={setLoanType}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepFinancialInfo
          defaultValues={application.financialInfo || {}}
          onContinue={handleFinancialInfo}
        />
      )}

      {step === 3 && (
        <StepPersonalInfo
          defaultValues={application.personalInfo || {}}
          onSubmitApplication={handlePersonalInfo}
        />
      )}

      {step === 4 && <StepSelfieVerification onContinue={handleSelfieVerified} />}
    </OnboardingLayout>
  );
}
