'use client';

import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

import { OnboardingLayout } from 'src/layouts/onboarding';

// ----------------------------------------------------------------------

export function ThankYouView() {
  const router = useRouter();

  return (
    <OnboardingLayout step={4} totalSteps={4} complete>
      <Box sx={{ width: 1, maxWidth: 520, textAlign: 'center' }}>
        <Box sx={{ position: 'relative', width: 92, height: 92, mx: 'auto', mb: 3.75 }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              bgcolor: '#1C2A6E',
              animation: 'pgThankYouRing 1.8s ease-out infinite',
              '@keyframes pgThankYouRing': {
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
              width: 92,
              height: 92,
              borderRadius: '50%',
              bgcolor: '#1C2A6E',
              boxShadow: '0 16px 34px -12px rgba(28,42,110,0.6)',
            }}
          >
            <Iconify icon="eva:checkmark-fill" width={44} sx={{ color: 'common.white' }} />
          </Stack>
        </Box>

        <Typography sx={{ fontSize: 27, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em', mb: 1.5 }}>
          Thank you for submitting your loan application!
        </Typography>
        <Typography sx={{ fontSize: 15, color: '#667085', lineHeight: 1.65, mb: 3.25 }}>
          Your application is now undergoing initial screening. We&apos;ll notify you once the
          review is complete, bringing you a step closer to being pre-qualified to connect with a
          loan facility.
        </Typography>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ textAlign: 'left', bgcolor: 'common.white', border: '1px solid #EBEDF3', borderRadius: '12px', p: 2.25, mb: 3.75 }}
        >
          <Iconify icon="solar:letter-bold" width={18} sx={{ color: '#4361EE', flexShrink: 0, mt: 0.25 }} />
          <Typography sx={{ fontSize: 13, color: '#5A6273', lineHeight: 1.6 }}>
            For questions, check your account dashboard, or contact us at{' '}
            <Link href="mailto:admin@pgfinance.com.ph" sx={{ color: '#4361EE', fontWeight: 600 }}>
              admin@pgfinance.com.ph
            </Link>{' '}
            or <Box component="strong" sx={{ color: '#14172A' }}>(+63) 900-000-0000</Box>.
          </Typography>
        </Stack>

        <Button
          variant="contained"
          onClick={() => router.push(paths.borrower.dashboard)}
          sx={{
            height: 52,
            px: 5,
            borderRadius: '12px',
            bgcolor: '#1C2A6E',
            fontSize: 15,
            fontWeight: 700,
            boxShadow: '0 12px 24px -10px rgba(28,42,110,0.6)',
            '&:hover': { bgcolor: '#14205A' },
          }}
        >
          Go to my dashboard →
        </Button>
      </Box>
    </OnboardingLayout>
  );
}
