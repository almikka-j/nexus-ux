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
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';
import { useRegistration } from 'src/auth/registration-context';

import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { AuthBrandPanel } from './auth-brand-panel';
import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from './auth-input-styles';

// ----------------------------------------------------------------------

export type SignUpSchemaType = zod.infer<typeof SignUpSchema>;

export const SignUpSchema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required.' }),
  middleName: zod.string().optional(),
  lastName: zod.string().min(1, { message: 'Last name is required.' }),
  extensionName: zod.string().optional(),
  email: zod
    .string()
    .min(1, { message: 'Email address is required.' })
    .email({ message: 'Enter a valid email address.' }),
  mobile: zod
    .string()
    .min(1, { message: 'Mobile number is required.' })
    .regex(/^9\d{9}$/, { message: 'Enter a valid mobile number (e.g. 9171234567).' }),
  password: zod
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/\d/, { message: 'Password must contain at least one number.' }),
  confirmPassword: zod.string().min(1, { message: 'Please confirm your password.' }),
  marketingConsent: zod.boolean(),
  termsAccepted: zod.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms & Conditions and Privacy Policy.',
  }),
});

const SAMPLE_SIGN_UP: SignUpSchemaType = {
  firstName: 'Juan',
  middleName: 'Santos',
  lastName: 'Dela Cruz',
  extensionName: '',
  email: 'juan.delacruz@example.com',
  mobile: '9171234567',
  password: 'Password123',
  confirmPassword: 'Password123',
  marketingConsent: true,
  termsAccepted: true,
};

const BLANK_SIGN_UP: SignUpSchemaType = {
  firstName: '',
  middleName: '',
  lastName: '',
  extensionName: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  marketingConsent: false,
  termsAccepted: false,
};

// ----------------------------------------------------------------------

export function SignUpView() {
  const router = useRouter();
  const password = useBoolean();
  const { setSignUpData } = useRegistration();

  const methods = useForm<SignUpSchemaType>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: BLANK_SIGN_UP,
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;
  const [isSample, setIsSample] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSignUpData(data);
    router.push(paths.auth.verify);
  });

  return (
    <Stack direction="row" sx={{ minHeight: '100vh', bgcolor: 'common.white' }}>
      <AuthBrandPanel
        title="Financing that moves at your pace."
        description="Create your account to apply for a loan, track approvals, and manage payments — all in one place."
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
        <Box sx={{ width: 1, maxWidth: 540 }}>
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
                Create your account
              </Typography>
              <Typography sx={{ fontSize: 14.5, color: '#667085', mt: 0.5 }}>
                Let&apos;s get you started on your financing journey.
              </Typography>
            </Box>

            <Button
              onClick={() => {
                reset(isSample ? BLANK_SIGN_UP : SAMPLE_SIGN_UP);
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
              <Stack direction="row" spacing={1.75}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>First name</Typography>
                  <Field.Text name="firstName" placeholder="Juan" sx={authFieldSx} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Middle name</Typography>
                  <Field.Text name="middleName" placeholder="Optional" sx={authFieldSx} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Last name</Typography>
                  <Field.Text name="lastName" placeholder="Dela Cruz" sx={authFieldSx} />
                </Box>
              </Stack>

              <Box>
                <Typography sx={authFieldLabelSx}>Email address</Typography>
                <Field.Text name="email" placeholder="juan@email.com" sx={authFieldSx} />
              </Box>

              <Box>
                <Typography sx={authFieldLabelSx}>Mobile number</Typography>
                <Field.Text
                  name="mobile"
                  placeholder="912 345 6789"
                  sx={authFieldSx}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+63</InputAdornment>,
                  }}
                />
              </Box>

              <Stack direction="row" spacing={1.75}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Password</Typography>
                  <Field.Text
                    name="password"
                    placeholder="Create password"
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
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={authFieldLabelSx}>Confirm password</Typography>
                  <Field.Text
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    type={password.value ? 'text' : 'password'}
                    sx={authFieldSx}
                  />
                </Box>
              </Stack>

              <Stack spacing={1} sx={{ pt: 0.5 }}>
                <Field.Checkbox
                  name="marketingConsent"
                  label={
                    <Typography sx={{ fontSize: 13, color: '#5A6273', lineHeight: 1.5 }}>
                      I&apos;d like to receive updates about products and promotions from PG
                      Finance.
                    </Typography>
                  }
                />
                <Field.Checkbox
                  name="termsAccepted"
                  label={
                    <Typography sx={{ fontSize: 13, color: '#5A6273', lineHeight: 1.5 }}>
                      I have read and accepted the PG Finance{' '}
                      <Link component={RouterLink} href={paths.privacyPolicy} sx={{ color: '#4361EE', fontWeight: 600 }}>
                        Privacy Policy
                      </Link>{' '}
                      and{' '}
                      <Link component={RouterLink} href={paths.terms} sx={{ color: '#4361EE', fontWeight: 600 }}>
                        Terms &amp; Conditions
                      </Link>
                      .
                    </Typography>
                  }
                />
              </Stack>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={authPrimaryButtonSx}
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>

              <Typography sx={{ textAlign: 'center', fontSize: 13.5, color: '#667085' }}>
                Already have an account?{' '}
                <Link component={RouterLink} href={paths.auth.login} sx={{ fontWeight: 700 }}>
                  Log in
                </Link>
              </Typography>
            </Stack>
          </Form>
        </Box>
      </Box>
    </Stack>
  );
}
