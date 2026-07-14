'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';

import { AdminLayout } from 'src/layouts/admin/layout';

// ----------------------------------------------------------------------

export default function NegativeListLayout({ children }: { children: React.ReactNode }) {
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
