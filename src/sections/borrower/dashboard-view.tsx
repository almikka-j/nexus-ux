'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { bgGradient } from 'src/theme/styles';
import { getLoanNumber } from 'src/utils/get-loan-number';

// ----------------------------------------------------------------------

function LoanStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack spacing={0.4}>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>{value}</Typography>
      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{label}</Typography>
    </Stack>
  );
}

const REQUIREMENTS = [
  'A valid government ID',
  'Proof of income',
  'Bank account details',
  "The amount you'd like to borrow",
];

function EmptyDashboardState() {
  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Box
            sx={{
              ...bgGradient({
                color: '135deg, #1C2A6E 0%, #141F52 100%',
              }),
              height: 1,
              p: { xs: 3, md: 5 },
              borderRadius: 2,
              color: 'common.white',
              position: 'relative',
              overflow: 'hidden',
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
                top: -80,
                right: -60,
                width: 220,
                height: 220,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.05)',
                animation: 'pgDashFloatA 8s ease-in-out infinite',
                '@keyframes pgDashFloatA': {
                  '0%, 100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(-14px)' },
                },
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                zIndex: 0,
                bottom: -70,
                left: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                bgcolor: 'rgba(67,97,238,0.28)',
                filter: 'blur(10px)',
                animation: 'pgDashFloatB 9s ease-in-out infinite',
                '@keyframes pgDashFloatB': {
                  '0%, 100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(12px)' },
                },
              }}
            />

            <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.12)',
                }}
              >
                <Iconify icon="solar:document-add-bold-duotone" width={24} />
              </Box>

              <Stack spacing={1}>
                <Typography variant="h6">You don&apos;t have any loans yet</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                  Start a loan application and your loan summary, approval status and upcoming
                  payments will appear right here.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  component={RouterLink}
                  href={paths.borrower.apply}
                  variant="contained"
                  size="large"
                  startIcon={<Iconify icon="solar:document-add-bold-duotone" />}
                  sx={{
                    bgcolor: 'common.white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' },
                  }}
                >
                  Apply for Loan
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.32)',
                    '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  Estimate my payment
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack
            justifyContent="space-between"
            sx={{
              height: 1,
              p: { xs: 3, md: 4 },
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.customShadows.card,
            }}
          >
            <Stack spacing={2.5}>
              <Stack spacing={0.5}>
                <Typography variant="h6">What you&apos;ll need</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Have these ready to breeze through your application.
                </Typography>
              </Stack>

              <Stack spacing={2}>
                {REQUIREMENTS.map((item) => (
                  <Stack key={item} direction="row" alignItems="center" spacing={1.5}>
                    <Iconify
                      icon="solar:check-circle-bold"
                      width={20}
                      sx={{ color: 'success.main', flexShrink: 0 }}
                    />
                    <Typography variant="body2">{item}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{ mt: 3, p: 2, borderRadius: 1.5, bgcolor: 'grey.100' }}
            >
              <Iconify
                icon="solar:info-circle-bold"
                width={20}
                sx={{ color: 'primary.main', flexShrink: 0 }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Most applications take about <strong>5 minutes</strong> to complete.
              </Typography>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

export function BorrowerDashboardView() {
  const { signUpData, application, reset } = useRegistration();

  const hasApplication = !!signUpData && !!application.personalInfo;
  const firstName = signUpData?.firstName || 'Guest';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box sx={{ px: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Welcome back
          </Typography>
          <Typography
            variant="h4"
            sx={{ mt: 0.25, fontFamily: (theme) => theme.typography.fontSecondaryFamily }}
          >
            Hi, {firstName} 👋
          </Typography>
        </Box>

        {hasApplication ? (
          <Box
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: '16px',
              bgcolor: 'common.white',
              border: '1px solid #EBEDF3',
              boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
              sx={{ mb: 2.75 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    borderRadius: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#EEF1FE',
                  }}
                >
                  <Iconify icon="solar:document-text-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
                </Box>
                <Stack spacing={0.25}>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1C2A6E' }}>
                    Loan No. {getLoanNumber(signUpData!.email)}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                    {application.loanType === 'business' ? 'Business Loan' : 'Personal Loan'}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip size="small" color="warning" variant="soft" label="Under Review" />
                <Button size="small" sx={{ color: 'text.disabled' }} onClick={reset}>
                  Reset Application
                </Button>
              </Stack>
            </Stack>

            {application.financialInfo && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, borderColor: '#EEF0F5' }} />}
                spacing={{ xs: 2, sm: 4 }}
                sx={{ pl: { sm: 7 } }}
              >
                <LoanStat
                  label="Total Loan Amount"
                  value={`₱${Number(application.financialInfo.desiredLoanAmount).toLocaleString()}`}
                />
                <LoanStat
                  label="Loan Term"
                  value={`${application.financialInfo.loanTermMonths} months`}
                />
                <LoanStat label="Application Status" value="Under Review" />
              </Stack>
            )}
          </Box>
        ) : (
          <EmptyDashboardState />
        )}
      </Stack>
    </Container>
  );
}
