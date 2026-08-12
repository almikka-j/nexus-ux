// src/app/admin/applications/[id]/credit-scoring/page.tsx
import type { Metadata } from 'next';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { adminCardSx } from 'src/components/admin-ui';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Credit Scoring | HHC LMS Admin',
};

export default function Page() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack
        alignItems="center"
        textAlign="center"
        spacing={2}
        sx={{ ...adminCardSx, p: { xs: 4, md: 6 } }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#EEF1FE',
          }}
        >
          <Iconify icon="solar:chart-2-bold-duotone" width={26} sx={{ color: '#1C2A6E' }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
          Credit Scoring — coming soon
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>
          This step isn&apos;t built yet. The appraisal passed and this application is ready to
          move forward once Credit Scoring is available.
        </Typography>
        <Button
          component={RouterLink}
          href={paths.admin.applications}
          variant="outlined"
          sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', mt: 0.5 }}
        >
          Back to Application List
        </Button>
      </Stack>
    </Container>
  );
}
