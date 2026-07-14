'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';
import { mockLogin, DEMO_ACCOUNT } from 'src/auth/mock-login';
import { useRegistration } from 'src/auth/registration-context';

import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { AuthBrandPanel } from './auth-brand-panel';
import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from './auth-input-styles';

// ----------------------------------------------------------------------

export type LoginSchemaType = zod.infer<typeof LoginSchema>;

export const LoginSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email address is required.' })
    .email({ message: 'Enter a valid email address.' }),
  password: zod.string().min(1, { message: 'Password is required.' }),
});

// ----------------------------------------------------------------------

export function LoginView() {
  const router = useRouter();
  const password = useBoolean();
  const { signUpData, setSignUpData } = useRegistration();
  const [loginError, setLoginError] = useState<string | null>(null);

  const methods = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;
  const [isSample, setIsSample] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    setLoginError(null);

    try {
      const account = await mockLogin(data.email, data.password);

      if (!signUpData) {
        setSignUpData({
          firstName: account.firstName,
          lastName: account.lastName,
          email: account.email,
          mobile: '',
          password: '',
          marketingConsent: false,
          termsAccepted: true,
        });
      }

      router.push(paths.borrower.dashboard);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  });

  return (
    <Stack direction="row" sx={{ minHeight: '100vh', bgcolor: 'common.white' }}>
      <AuthBrandPanel
        icon="solar:shield-check-bold"
        title="Welcome back to PG Finance."
        description="Log in to track your loan applications, manage payments, and stay on top of your financing journey."
        checklist
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: 1, maxWidth: 440 }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 0.5 }}
          >
            <Box>
              <Typography
                sx={{ fontSize: 27, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}
              >
                Log in
              </Typography>
              <Typography sx={{ fontSize: 14.5, color: '#667085', mt: 0.5 }}>
                Don&apos;t have an account yet?{' '}
                <Link component={RouterLink} href={paths.auth.signUp} sx={{ fontWeight: 700 }}>
                  Sign up
                </Link>
              </Typography>
            </Box>

            <Button
              onClick={() => {
                if (isSample) {
                  reset({ email: '', password: '' });
                } else {
                  reset(DEMO_ACCOUNT);
                }
                setIsSample((prev) => !prev);
              }}
              size="small"
              sx={{ color: 'text.disabled', flexShrink: 0 }}
            >
              {isSample ? 'Remove Sample Data' : 'Fill with Sample Data'}
            </Button>
          </Stack>

          <Form methods={methods} onSubmit={onSubmit}>
            <Stack spacing={2} sx={{ mt: 3.5 }}>
              {loginError && <Alert severity="error">{loginError}</Alert>}

              <Box>
                <Typography sx={authFieldLabelSx}>Email address</Typography>
                <Field.Text name="email" placeholder="juan@email.com" sx={authFieldSx} />
              </Box>

              <Box>
                <Typography sx={authFieldLabelSx}>Password</Typography>
                <Field.Text
                  name="password"
                  placeholder="Enter your password"
                  type={password.value ? 'text' : 'password'}
                  sx={authFieldSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={password.onToggle} edge="end" size="small">
                          <Iconify
                            icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                            width={18}
                            sx={{ color: '#8891A6' }}
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Link
                  sx={{
                    display: 'block',
                    textAlign: 'right',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#4361EE',
                    mt: 1,
                    cursor: 'pointer',
                  }}
                >
                  Forgot password?
                </Link>
              </Box>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{ ...authPrimaryButtonSx, mt: 1 }}
              >
                {isSubmitting ? 'Logging in...' : 'Log in'}
              </Button>

              <Typography sx={{ textAlign: 'center', fontSize: 12, color: '#9AA1B2' }}>
                This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of
                Service apply.
              </Typography>
            </Stack>
          </Form>
        </Box>
      </Box>
    </Stack>
  );
}
