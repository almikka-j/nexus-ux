'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { MOCK_OTP_CODE } from 'src/auth/mock-login';
import { useRegistration } from 'src/auth/registration-context';

import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { AuthBrandPanel } from './auth-brand-panel';
import { VerifiedTransition } from './verified-transition';
import { authPrimaryButtonSx } from './auth-input-styles';

// ----------------------------------------------------------------------
// Mobile OTP verification only — no visible password step. Once the code
// is verified, the borrower account is considered auto-created (a
// temporary password is described as emailed on the Application
// Confirmation screen, but never shown anywhere in this UI, since there's
// no real email delivery to simulate against honestly in this prototype).
// `verified` flips to true immediately on OTP success.
// ----------------------------------------------------------------------

export type VerifySchemaType = zod.infer<typeof VerifySchema>;

export const VerifySchema = zod.object({
  code: zod.string().min(6, { message: 'Enter the 6-digit code.' }),
});

// ----------------------------------------------------------------------

export function VerifyView() {
  const router = useRouter();
  const { signUpData, setVerified } = useRegistration();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showTransition, setShowTransition] = useState(false);

  const methods = useForm<VerifySchemaType>({
    resolver: zodResolver(VerifySchema),
    defaultValues: { code: '' },
  });

  const {
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (data.code !== MOCK_OTP_CODE) {
      setError('code', { message: `Incorrect code. Try ${MOCK_OTP_CODE} for this demo.` });
      return;
    }

    setShowTransition(true);
  });

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(45);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (showTransition) {
    return (
      <VerifiedTransition
        onDone={() => {
          setVerified(true);
          router.push(paths.auth.onboarding);
        }}
      />
    );
  }

  const minutes = Math.floor(resendCooldown / 60);
  const seconds = resendCooldown % 60;

  return (
    <Stack direction="row" sx={{ minHeight: '100vh', bgcolor: 'common.white' }}>
      <AuthBrandPanel
        icon="solar:paper-plane-bold"
        title="Almost there — let's confirm it's you."
        description="We use a one-time code to keep your account and financial data secure."
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ width: 1, maxWidth: 460, textAlign: 'center' }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{
              display: 'inline-flex',
              px: 1.6,
              py: 0.75,
              borderRadius: 999,
              bgcolor: '#EEF1FE',
              color: '#3448B0',
              fontSize: 12.5,
              fontWeight: 700,
              mb: 2.75,
            }}
          >
            <Iconify icon="solar:shield-check-bold" width={14} />
            <span>Secure verification</span>
          </Stack>

          <Typography sx={{ fontSize: 27, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em', mb: 1.25 }}>
            Verify your mobile number
          </Typography>
          <Typography sx={{ fontSize: 14.5, color: '#667085', lineHeight: 1.6, mb: 4 }}>
            We sent a 6-digit code to
            <br />
            <Box component="strong" sx={{ color: '#14172A' }}>
              {signUpData?.mobile ? `+63 ${signUpData.mobile}` : 'your mobile number'}
            </Box>
            . Enter it below to continue.
          </Typography>

          <Form methods={methods} onSubmit={onSubmit}>
            <Stack spacing={2} alignItems="center">
              <Field.Code
                name="code"
                sx={{
                  '& .MuiOtpInput-TextField': {
                    width: 58,
                    height: 66,
                  },
                  '& .MuiOutlinedInput-root': {
                    height: 66,
                    borderRadius: '13px',
                    fontSize: 25,
                    fontWeight: 700,
                    color: '#14172A',
                  },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E1E4ED', borderWidth: '1.5px' },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4361EE',
                    borderWidth: '1.5px',
                  },
                }}
              />

              <Typography sx={{ fontSize: 13.5, color: '#667085', pt: 0.5 }}>
                Didn&apos;t get the code?{' '}
                <Link
                  onClick={handleResend}
                  sx={{ fontWeight: 700, cursor: resendCooldown > 0 ? 'default' : 'pointer' }}
                >
                  Resend
                </Link>{' '}
                {resendCooldown > 0 && (
                  <Box component="span" sx={{ color: '#9AA1B2' }}>
                    in {minutes}:{seconds.toString().padStart(2, '0')}
                  </Box>
                )}
              </Typography>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{ ...authPrimaryButtonSx, height: 54, mt: 1 }}
              >
                {isSubmitting ? 'Verifying...' : 'Verify & continue'}
              </Button>

              <Link
                component={RouterLink}
                href={paths.auth.signUp}
                sx={{ fontSize: 13.5, fontWeight: 600, color: '#667085', mt: 1 }}
              >
                ← Return to preliminary application
              </Link>
            </Stack>
          </Form>
        </Box>
      </Box>
    </Stack>
  );
}
