'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { VerifyView } from 'src/sections/auth/verify-view';

// ----------------------------------------------------------------------

export default function Page() {
  const router = useRouter();
  const { signUpData } = useRegistration();

  useEffect(() => {
    if (!signUpData) {
      router.replace(paths.auth.signUp);
    }
  }, [signUpData, router]);

  if (!signUpData) return null;

  return <VerifyView />;
}
