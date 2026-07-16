'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { VerifyView } from 'src/sections/auth/verify-view';

// ----------------------------------------------------------------------

export default function Page() {
  const router = useRouter();
  const { hydrated, signUpData } = useRegistration();

  useEffect(() => {
    if (hydrated && !signUpData) {
      router.replace(paths.auth.signUp);
    }
  }, [hydrated, signUpData, router]);

  if (!hydrated || !signUpData) return null;

  return <VerifyView />;
}
