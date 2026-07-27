'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// CI Fee request/approval gate. There's no real approver role/login in
// this prototype — "Mark CI Fee as Approved" is a simulated second step the
// same officer triggers, same convention as "Force Clean/Negative Bureau
// Finding" elsewhere in the admin app. Approval unlocks the CI Report card.
// ----------------------------------------------------------------------

const STATUS_COPY: Record<
  'not-requested' | 'pending-approval' | 'approved',
  { icon: string; iconColor: string; bg: string; title: string; body: string }
> = {
  'not-requested': {
    icon: 'solar:wallet-money-bold-duotone',
    iconColor: '#8891A6',
    bg: '#F9FAFC',
    title: 'CI Fee not yet requested',
    body: 'Request the Credit Investigation fee before scheduling the site visit and preparing the CI Report.',
  },
  'pending-approval': {
    icon: 'solar:hourglass-bold-duotone',
    iconColor: '#B36A05',
    bg: '#FEF0D6',
    title: 'CI Fee pending approval',
    body: 'The CI Fee request has been sent and is awaiting approval before the CI Report can be prepared.',
  },
  approved: {
    icon: 'solar:check-circle-bold',
    iconColor: '#0C8A4F',
    bg: '#E7F8F0',
    title: 'CI Fee approved',
    body: 'The CI Report below is now unlocked.',
  },
};

export function CiFeeCard() {
  const { review, setCreditInvestigation } = useAdmin();
  const { ciFeeStatus } = review.creditInvestigation;
  const copy = STATUS_COPY[ciFeeStatus];

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:wallet-money-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Fee</Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        The Credit Investigation fee must be requested and approved before the CI Report can be
        prepared.
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ p: 2, borderRadius: '11px', bgcolor: copy.bg }}
      >
        <Iconify icon={copy.icon} width={22} sx={{ color: copy.iconColor, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: copy.iconColor }}>
            {copy.title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>{copy.body}</Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
        {ciFeeStatus === 'not-requested' && (
          <Button
            onClick={() => setCreditInvestigation({ ciFeeStatus: 'pending-approval' })}
            variant="contained"
            startIcon={<Iconify icon="solar:send-square-bold" width={18} />}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
          >
            Request CI Fee
          </Button>
        )}
        {ciFeeStatus === 'pending-approval' && (
          <Button
            onClick={() => setCreditInvestigation({ ciFeeStatus: 'approved' })}
            variant="contained"
            startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
            sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
          >
            Mark CI Fee as Approved
          </Button>
        )}
      </Stack>
    </Box>
  );
}
