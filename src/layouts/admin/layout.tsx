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

// Top-nav mode drops every view's own `<Container maxWidth="...">` cap so
// pages run edge-to-edge instead of narrow-and-centered — done here with one
// CSS override instead of editing every admin view file individually. Left
// and right padding is set to match AdminNavHorizontal's own `px` so page
// content lines up with the nav bar above it instead of sitting flush with
// the viewport edge.
const FULL_WIDTH_CONTAINER_SX = {
  '& > .MuiContainer-root': {
    maxWidth: 'none !important',
    paddingLeft: { xs: '16px !important', md: '40px !important' },
    paddingRight: { xs: '16px !important', md: '40px !important' },
  },
};

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

      <Box component="main" sx={{ flex: 1, ...FULL_WIDTH_CONTAINER_SX }}>
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
