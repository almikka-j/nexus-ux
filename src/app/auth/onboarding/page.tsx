'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { OnboardingView } from 'src/sections/auth/onboarding/onboarding-view';

// ----------------------------------------------------------------------

export default function Page() {
  const router = useRouter();
  const { signUpData, verified } = useRegistration();

  useEffect(() => {
    if (!signUpData) {
      router.replace(paths.auth.signUp);
    } else if (!verified) {
      router.replace(paths.auth.verify);
    }
  }, [signUpData, verified, router]);

  if (!signUpData || !verified) return null;

  return <OnboardingView />;
}
