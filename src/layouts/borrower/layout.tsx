'use client';

import Box from '@mui/material/Box';

import { useRegistration } from 'src/auth/registration-context';

import { BorrowerNav } from './nav-vertical';
import { BorrowerHeader } from './header';

// ----------------------------------------------------------------------

export function BorrowerLayout({ children }: { children: React.ReactNode }) {
  const { signUpData } = useRegistration();

  const displayName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : 'Guest';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <BorrowerNav />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <BorrowerHeader displayName={displayName} />

        <Box component="main" sx={{ flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
