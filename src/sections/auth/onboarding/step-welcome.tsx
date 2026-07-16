'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { LogoFull } from 'src/components/logo/logo-full';

// ----------------------------------------------------------------------

const AUTO_ADVANCE_DELAY = 5000;

type StepWelcomeProps = {
  firstName: string;
  onDone: () => void;
};

export function StepWelcome({ firstName, onDone }: StepWelcomeProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, AUTO_ADVANCE_DELAY);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        width: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        bgcolor: '#132155',
        color: 'common.white',
        textAlign: 'center',
        px: 3,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'url("/images/background/texture-strong.png")',
          backgroundSize: '1400px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          zIndex: 0,
          top: -120,
          right: -90,
          width: 380,
          height: 380,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.05)',
          animation: 'pgWelcomeFloatA 8s ease-in-out infinite',
          '@keyframes pgWelcomeFloatA': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-16px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          zIndex: 0,
          bottom: -90,
          left: -70,
          width: 320,
          height: 320,
          borderRadius: '50%',
          bgcolor: 'rgba(67,97,238,0.28)',
          filter: 'blur(10px)',
          animation: 'pgWelcomeFloatB 9s ease-in-out infinite',
          '@keyframes pgWelcomeFloatB': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(14px)' },
          },
        }}
      />

      <Stack
        flex={1}
        alignItems="center"
        justifyContent="center"
        sx={{ position: 'relative', zIndex: 1, maxWidth: 560, py: { xs: 8, md: 0 } }}
      >
        <Typography sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, mb: 1 }}>
          Hey {firstName}!
        </Typography>
        <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.92)', mb: 2 }}>
          Welcome to PG Finance
        </Typography>
        <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 440 }}>
          Let&apos;s get started on your loan application — it&apos;ll only take a few minutes to
          complete the basics.
        </Typography>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ position: 'relative', zIndex: 1, pb: 5 }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            border: '2.5px solid rgba(255,255,255,0.25)',
            borderTopColor: 'common.white',
            borderRadius: '50%',
            animation: 'pgWelcomeSpin 0.8s linear infinite',
            '@keyframes pgWelcomeSpin': { to: { transform: 'rotate(360deg)' } },
          }}
        />
        <Typography sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
          Getting things ready…
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative', zIndex: 1, pb: 5, opacity: 0.92, filter: 'brightness(0) invert(1)' }}>
        <LogoFull width={112} height={22} />
      </Box>
    </Box>
  );
}
