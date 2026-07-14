'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { getAgingLevel } from 'src/utils/format-aging';

// ----------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 200,
        p: 2.75,
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}14`,
          }}
        >
          <Iconify icon={icon} width={20} sx={{ color }} />
        </Box>
        <Typography sx={{ fontSize: 13, color: '#8891A6' }}>{label}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#14172A' }}>{value}</Typography>
    </Box>
  );
}

export function AdminDashboardView() {
  const { adminUser } = useAdmin();
  const { signUpData, application } = useRegistration();

  const firstName = adminUser?.firstName || 'Admin';
  const hasApplication = !!signUpData && !!application.personalInfo;
  const isOverdue = hasApplication && getAgingLevel(application.submittedAt) === 'overdue';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 15, color: '#667085' }}>Welcome back</Typography>
          <Typography
            sx={{
              fontSize: 30,
              fontWeight: 800,
              color: '#14172A',
              letterSpacing: '-0.02em',
              mt: 0.25,
            }}
          >
            Hi, {firstName} 👋
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <StatCard
            icon="solar:document-text-bold-duotone"
            label="Total Applications"
            value={hasApplication ? 1 : 0}
            color="#1C2A6E"
          />
          <StatCard
            icon="solar:clock-circle-bold-duotone"
            label="Pending Review"
            value={hasApplication ? 1 : 0}
            color="#F79009"
          />
          <StatCard
            icon="solar:check-circle-bold-duotone"
            label="Approved"
            value={0}
            color="#12B76A"
          />
          <StatCard
            icon="solar:danger-triangle-bold-duotone"
            label="Overdue (3d+)"
            value={isOverdue ? 1 : 0}
            color="#B32C22"
          />
        </Stack>

        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            bgcolor: 'common.white',
            border: '1px solid #EBEDF3',
            boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                Applications awaiting review
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                Start initial credit checking for newly submitted applications.
              </Typography>
            </Stack>

            <Button
              component={RouterLink}
              href={paths.admin.applications}
              variant="contained"
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
              sx={{
                bgcolor: '#1C2A6E',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { bgcolor: '#14205A' },
              }}
            >
              View Application List
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
