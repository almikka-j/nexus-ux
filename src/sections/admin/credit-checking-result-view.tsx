'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx } from 'src/components/admin-ui';

import { ResultPageHeader } from './result-page-header';
import { CreditCheckingResultContent } from './call-report/credit-checking-result-modal';

// ----------------------------------------------------------------------

export function CreditCheckingResultView() {
  const { review } = useAdmin();
  const generatedAt = review.stepTimestamps.creditChecking
    ? new Date(review.stepTimestamps.creditChecking)
    : null;
  const generatedLabel = generatedAt
    ? `Report generated ${generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ${generatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : undefined;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <ResultPageHeader
        title="Initial Credit Checking Result"
        meta={generatedLabel}
        action={
          <Tooltip title="PDF export coming soon">
            <span>
              <IconButton
                disabled
                sx={{
                  px: 1.5,
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '10px',
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.15)' },
                }}
              >
                <Iconify icon="solar:file-download-bold" width={17} />
              </IconButton>
            </span>
          </Tooltip>
        }
      />
      <Box
        sx={{
          ...adminCardSx,
          p: { xs: 2.5, sm: 3.5, md: 4.5 },
          borderRadius: '0 0 16px 16px',
          borderTop: 'none',
          mb: 4,
        }}
      >
        <CreditCheckingResultContent hideHeader />
      </Box>
    </Container>
  );
}
