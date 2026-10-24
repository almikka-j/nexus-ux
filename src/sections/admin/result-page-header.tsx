'use client';

import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { getLoanNumber } from 'src/utils/get-loan-number';

// ----------------------------------------------------------------------

/**
 * Shared header for the dedicated result pages (Call Report result, Initial
 * Credit Checking result, Full Application) reached from ApplicationDetailsCard's
 * action buttons across many different parent pages — "Back" returns via
 * browser history rather than a fixed destination, since there's no single
 * parent page to link back to.
 */
export function ResultPageHeader({
  title,
  meta,
  action,
}: {
  title: string;
  /** Optional extra detail shown after App No. in the banner, e.g. "Report generated Oct 20, 2026 · 12:50 AM". */
  meta?: string;
  /** Optional trailing control (e.g. a PDF export button), right-aligned in the banner's title row. */
  action?: ReactNode;
}) {
  const router = useRouter();
  const { signUpData } = useRegistration();

  if (!signUpData) return null;

  const fullName = `${signUpData.prefix ? `${signUpData.prefix} ` : ''}${signUpData.firstName}${signUpData.middleName ? ` ${signUpData.middleName}` : ''} ${signUpData.lastName}${signUpData.extensionName ? ` ${signUpData.extensionName}` : ''}`;

  return (
    <Stack spacing={1.25}>
      <Button
        onClick={() => router.back()}
        startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
        sx={{
          alignSelf: 'flex-start',
          fontSize: 13,
          fontWeight: 600,
          color: '#667085',
          px: 0,
          minHeight: 'auto',
          py: 0.25,
          '&:hover': { color: '#1C2A6E', bgcolor: 'transparent' },
        }}
      >
        Back
      </Button>

      <Box
        sx={{
          borderRadius: '16px 16px 0 0',
          bgcolor: '#1C2A6E',
          px: { xs: 2, sm: 3 },
          py: { xs: 1.75, sm: 2 },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={{ xs: 0.75, sm: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 24,
                height: 24,
                flexShrink: 0,
                borderRadius: '7px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'common.white' }}>PG</Typography>
            </Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'common.white' }}>
              PG Finance · Credit and Collection
            </Typography>
          </Stack>
          {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
        </Stack>

        <Box sx={{ mt: 1.25 }}>
          <Typography sx={{ fontSize: { xs: 19, sm: 22 }, fontWeight: 800, color: 'common.white', lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Stack
            direction="row"
            flexWrap="wrap"
            alignItems="center"
            sx={{ rowGap: 0.25, columnGap: 1, mt: 0.5 }}
          >
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'common.white' }}>{fullName}</Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>
              App No. <Box component="span" sx={{ fontWeight: 700, color: 'common.white' }}>{getLoanNumber(signUpData.email)}</Box>
            </Typography>
            {meta && (
              <>
                <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
                <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>{meta}</Typography>
              </>
            )}
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}
