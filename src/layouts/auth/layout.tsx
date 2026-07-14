'use client';

import Box from '@mui/material/Box';

import { Section } from './section';

// ----------------------------------------------------------------------

type AuthLayoutProps = {
  children: React.ReactNode;
  variant?: 'split' | 'centered';
  maxWidth?: number;
  panelPosition?: 'left' | 'right';
  panelWidth?: number | string;
};

export function AuthLayout({
  children,
  variant = 'centered',
  maxWidth = 420,
  panelPosition = 'right',
  panelWidth = '50%',
}: AuthLayoutProps) {
  const panel = (
    <Box sx={{ width: { md: panelWidth }, flexShrink: 0, display: 'flex' }}>
      <Section />
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: variant === 'split' ? 'row' : 'column' },
      }}
    >
      {variant === 'split' && panelPosition === 'left' && panel}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 6, md: 10 },
          py: 6,
        }}
      >
        <Box sx={{ width: 1, maxWidth }}>{children}</Box>
      </Box>

      {variant === 'split' && panelPosition === 'right' && panel}
    </Box>
  );
}
