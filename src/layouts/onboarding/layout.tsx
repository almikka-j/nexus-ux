'use client';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { LogoFull } from 'src/components/logo/logo-full';

import { ProgressBar } from 'src/sections/auth/onboarding/progress-bar';

// ----------------------------------------------------------------------

type OnboardingLayoutProps = {
  children: React.ReactNode;
  step: number;
  totalSteps?: number;
  stepLabels?: string[];
  onBack?: () => void;
  onExit?: () => void;
  complete?: boolean;
};

export function OnboardingLayout({
  children,
  step,
  totalSteps = 4,
  stepLabels,
  onBack,
  onExit,
  complete,
}: OnboardingLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F7F8FC' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          px: { xs: 3, md: 5 },
          py: 2.75,
          borderBottom: '1px solid #EBEDF3',
          bgcolor: 'common.white',
        }}
      >
        <LogoFull width={124} height={26} />

        <Box sx={{ width: 420, display: { xs: 'none', sm: 'block' } }}>
          <ProgressBar activeStep={step} totalSteps={totalSteps} complete={complete} labels={stepLabels} />
        </Box>

        {complete ? (
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#12B76A' }}>
            Complete
          </Typography>
        ) : onBack ? (
          <Link
            component="button"
            onClick={onBack}
            sx={{ fontSize: 13.5, color: '#667085', fontWeight: 600 }}
          >
            ← Back
          </Link>
        ) : onExit ? (
          <Link
            component="button"
            onClick={onExit}
            sx={{ fontSize: 13.5, color: '#667085', fontWeight: 600 }}
          >
            Exit
          </Link>
        ) : (
          <span />
        )}
      </Stack>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', px: { xs: 2, md: 5 }, py: { xs: 4, md: 5.5 } }}>
        {children}
      </Box>
    </Box>
  );
}
