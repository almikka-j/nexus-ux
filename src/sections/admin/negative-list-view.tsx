'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function NegativeListView() {
  const { negativeList } = useAdmin();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Negative List
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Applicants notified after not being approved on reconsideration are recorded here.
          </Typography>
        </Box>

        {negativeList.length > 0 ? (
          <Stack spacing={1.5}>
            {negativeList.map((entry) => (
              <Box
                key={entry.email}
                sx={{
                  p: { xs: 2.5, md: 3 },
                  borderRadius: '16px',
                  bgcolor: 'common.white',
                  border: '1px solid #EBEDF3',
                  boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
                }}
              >
                <Stack direction="row" spacing={1.75} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      flexShrink: 0,
                      borderRadius: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#FDE2DF',
                    }}
                  >
                    <Iconify icon="solar:shield-cross-bold-duotone" width={20} sx={{ color: '#B32C22' }} />
                  </Box>
                  <Stack spacing={0.5} sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                      {entry.name}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#8891A6' }}>{entry.email}</Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#3B4256', mt: 0.5 }}>
                      {entry.reason}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.5 }}>
                      Recorded {new Date(entry.recordedAt).toLocaleString()}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: '16px',
              bgcolor: 'common.white',
              border: '1px solid #EBEDF3',
              textAlign: 'center',
            }}
          >
            <Iconify
              icon="solar:shield-check-bold-duotone"
              width={48}
              sx={{ color: '#C7CCDA', mb: 2 }}
            />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No records yet
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              Applicants not approved on reconsideration will be listed here.
            </Typography>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
