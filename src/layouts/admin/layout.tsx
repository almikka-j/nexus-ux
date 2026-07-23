'use client';

import Box from '@mui/material/Box';

import { useAdmin } from 'src/auth/admin-context';

import { AdminNav } from './nav-vertical';
import { AdminHeader } from './header';
import { AdminNavHorizontal } from './nav-horizontal';
import { AdminNavSettingsButton } from './nav-settings-button';
import { AdminNavModeProvider, useAdminNavMode } from './nav-mode-context';
import { AdminPageActionsProvider } from './page-actions-context';

// ----------------------------------------------------------------------

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { adminUser } = useAdmin();
  const { navMode } = useAdminNavMode();

  const displayName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Guest';

  if (navMode === 'side') {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
        <AdminNav />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AdminHeader displayName={displayName} />

          <Box component="main" sx={{ flex: 1 }}>
            {children}
          </Box>
        </Box>

        <AdminNavSettingsButton />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AdminNavHorizontal displayName={displayName} />

      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>

      <AdminNavSettingsButton />
    </Box>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminNavModeProvider>
      <AdminPageActionsProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </AdminPageActionsProvider>
    </AdminNavModeProvider>
  );
}
