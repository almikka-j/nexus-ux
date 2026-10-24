'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

import { adminCardSx } from 'src/components/admin-ui';

import { ResultPageHeader } from './result-page-header';
import { ApplicationFullDetails } from './application-details-card';

// ----------------------------------------------------------------------

export function FullApplicationView() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <ResultPageHeader title="Full Application" />
      <Box
        sx={{
          ...adminCardSx,
          p: { xs: 2.5, md: 3 },
          borderRadius: '0 0 16px 16px',
          borderTop: 'none',
          mb: 4,
        }}
      >
        <ApplicationFullDetails />
      </Box>
    </Container>
  );
}
