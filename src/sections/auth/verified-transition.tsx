'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const REDIRECT_DELAY = 2600;

type VerifiedTransitionProps = {
  onDone: () => void;
};

export function VerifiedTransition({ onDone }: VerifiedTransitionProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, REDIRECT_DELAY);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      sx={{ minHeight: '100vh', bgcolor: 'common.white', px: 5 }}
    >
      <Box sx={{ position: 'relative', width: 96, height: 96, mb: 4 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            bgcolor: '#1C2A6E',
            animation: 'pgVerifiedRing 1.8s ease-out infinite',
            '@keyframes pgVerifiedRing': {
              '0%': { transform: 'scale(0.8)', opacity: 0.5 },
              '100%': { transform: 'scale(1.9)', opacity: 0 },
            },
          }}
        />
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            position: 'relative',
            width: 96,
            height: 96,
            borderRadius: '50%',
            bgcolor: '#1C2A6E',
            boxShadow: '0 16px 34px -12px rgba(28,42,110,0.6)',
            animation: 'pgVerifiedPop 0.5s cubic-bezier(0.2,0.8,0.2,1) both',
            '@keyframes pgVerifiedPop': {
              '0%': { transform: 'scale(0.4)', opacity: 0 },
              '60%': { transform: 'scale(1.08)' },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        >
          <Iconify icon="eva:checkmark-fill" width={46} sx={{ color: 'common.white' }} />
        </Stack>
      </Box>

      <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em', mb: 1.25 }}>
        Verified successfully!
      </Typography>
      <Typography sx={{ fontSize: 15, color: '#667085', lineHeight: 1.6, maxWidth: 400, mb: 3.75 }}>
        You&apos;re now logged in. We&apos;re taking you to your loan application — it won&apos;t
        be a moment.
      </Typography>

      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box
          sx={{
            width: 20,
            height: 20,
            border: '2.5px solid #E1E4ED',
            borderTopColor: '#1C2A6E',
            borderRadius: '50%',
            animation: 'pgVerifiedSpin 0.8s linear infinite',
            '@keyframes pgVerifiedSpin': { to: { transform: 'rotate(360deg)' } },
          }}
        />
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', fontWeight: 600 }}>
          Redirecting…
        </Typography>
      </Stack>
    </Stack>
  );
}
