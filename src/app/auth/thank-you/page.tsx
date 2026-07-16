'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useRegistration } from 'src/auth/registration-context';

import { ThankYouView } from 'src/sections/auth/thank-you-view';

// ----------------------------------------------------------------------

export default function Page() {
  const router = useRouter();
  const { hydrated, application } = useRegistration();

  useEffect(() => {
    if (hydrated && !application.personalInfo) {
      router.replace(paths.auth.signUp);
    }
  }, [hydrated, application.personalInfo, router]);

  if (!hydrated || !application.personalInfo) return null;

  return <ThankYouView />;
}
