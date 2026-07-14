'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useBoolean } from 'src/hooks/use-boolean';
import { mockAdminLogin, ADMIN_DEMO_ACCOUNT } from 'src/auth/mock-login';

import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';
import { LogoFull } from 'src/components/logo/logo-full';
import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from 'src/sections/auth/auth-input-styles';

// ----------------------------------------------------------------------

export type AdminLoginSchemaType = zod.infer<typeof AdminLoginSchema>;

export const AdminLoginSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email address is required.' })
    .email({ message: 'Enter a valid email address.' }),
  password: zod.string().min(1, { message: 'Password is required.' }),
});

// ----------------------------------------------------------------------

export function AdminLoginView() {
  const router = useRouter();
  const password = useBoolean();
  const { setAdminUser } = useAdmin();
  const [loginError, setLoginError] = useState<string | null>(null);

  const methods = useForm<AdminLoginSchemaType>({
    resolver: zodResolver(AdminLoginSchema),
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
      const account = await mockAdminLogin(data.email, data.password);
      setAdminUser(account);
      router.push(paths.admin.dashboard);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  });

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        bgcolor: '#132155',
        px: 3,
        py: 6,
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
          top: -110,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 460,
          height: 460,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.05)',
          animation: 'pgAdminFloatA 8s ease-in-out infinite',
          '@keyframes pgAdminFloatA': {
            '0%, 100%': { transform: 'translate(-50%, 0)' },
            '50%': { transform: 'translate(-50%, -16px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          zIndex: 0,
          bottom: -140,
          right: -100,
          width: 340,
          height: 340,
          borderRadius: '50%',
          bgcolor: 'rgba(67,97,238,0.3)',
          filter: 'blur(10px)',
          animation: 'pgAdminFloatB 9s ease-in-out infinite',
          '@keyframes pgAdminFloatB': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(14px)' },
          },
        }}
      />

      <Stack alignItems="center" sx={{ position: 'relative', zIndex: 1, width: 1, maxWidth: 440 }}>
        <Box sx={{ mb: 4, filter: 'brightness(0) invert(1)' }}>
          <LogoFull width={140} height={27} />
        </Box>

        <Box
          sx={{
            width: 1,
            bgcolor: 'common.white',
            borderRadius: '20px',
            boxShadow: '0 24px 60px -20px rgba(0,0,0,0.45)',
            p: { xs: 3, sm: 4.5 },
          }}
        >
          <Stack alignItems="center" textAlign="center" spacing={1} sx={{ mb: 3.5 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '14px',
                bgcolor: '#EEF1FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
              }}
            >
              <Iconify icon="solar:shield-user-bold" width={26} sx={{ color: '#1C2A6E' }} />
            </Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              Admin Portal
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#667085' }}>
              Sign in to access the LMS admin portal.
            </Typography>
          </Stack>

          <Stack alignItems="center" sx={{ mb: 2 }}>
            <Button
              onClick={() => {
                if (isSample) {
                  reset({ email: '', password: '' });
                } else {
                  reset(ADMIN_DEMO_ACCOUNT);
                }
                setIsSample((prev) => !prev);
              }}
              size="small"
              sx={{ color: 'text.disabled' }}
            >
              {isSample ? 'Remove Sample Data' : 'Fill with Sample Data'}
            </Button>
          </Stack>

          <Form methods={methods} onSubmit={onSubmit}>
            <Stack spacing={2}>
              {loginError && <Alert severity="error">{loginError}</Alert>}

              <Box>
                <Typography sx={authFieldLabelSx}>Email address</Typography>
                <Field.Text name="email" placeholder="admin@pgfinance.com.ph" sx={authFieldSx} />
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
            </Stack>
          </Form>
        </Box>

        <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', mt: 3 }}>
          Restricted access — for authorized LMS staff only.
        </Typography>
      </Stack>
    </Box>
  );
}
