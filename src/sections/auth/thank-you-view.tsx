'use client';

import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { OnboardingLayout } from 'src/layouts/onboarding';

// ----------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A', textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function ThankYouView() {
  const router = useRouter();
  const { signUpData, application } = useRegistration();

  const referenceNumber = signUpData ? getLoanNumber(signUpData.email) : '—';
  const submittedDate = application.submittedAt
    ? new Date(application.submittedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

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
          Your loan application has been submitted!
        </Typography>
        <Typography sx={{ fontSize: 15, color: '#667085', lineHeight: 1.65, mb: 3.25 }}>
          We&apos;ve automatically created your borrower account and sent a temporary password to
          your registered email — use it to log in and track your application anytime.
          You&apos;ll be asked to set a new password the first time you log in.
        </Typography>

        <Stack
          spacing={1.25}
          sx={{ textAlign: 'left', bgcolor: 'common.white', border: '1px solid #EBEDF3', borderRadius: '12px', p: 2.5, mb: 2.5 }}
        >
          <DetailRow label="Reference Number" value={referenceNumber} />
          <DetailRow label="Submitted On" value={submittedDate} />
          <DetailRow label="Status" value="Under Review" />
          <DetailRow label="Registered Email" value={signUpData?.email ?? '—'} />
          <DetailRow
            label="Verified Mobile"
            value={signUpData?.mobile ? `+63 ${signUpData.mobile}` : '—'}
          />
        </Stack>

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

        <Stack spacing={1.5} alignItems="center">
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

          <Link
            component={RouterLink}
            href={paths.auth.login}
            sx={{ fontSize: 13.5, fontWeight: 600, color: '#667085' }}
          >
            Log in later using your temporary password
          </Link>
        </Stack>
      </Box>
    </OnboardingLayout>
  );
}
