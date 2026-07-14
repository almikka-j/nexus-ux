'use client';

import Box from '@mui/material/Box';

import { useAdmin } from 'src/auth/admin-context';

import { AdminNav } from './nav-vertical';
import { AdminHeader } from './header';

// ----------------------------------------------------------------------

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { adminUser } = useAdmin();

  const displayName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Guest';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AdminNav />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminHeader displayName={displayName} />

        <Box component="main" sx={{ flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
