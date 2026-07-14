'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { AGING_LEVEL_COLORS, formatAging, getAgingLevel } from 'src/utils/format-aging';
import { getLoanNumber } from 'src/utils/get-loan-number';

import type { ReviewStep } from 'src/auth/admin-context';

// ----------------------------------------------------------------------

type ApplicationReviewHeaderProps = {
  step: string;
  reviewStep?: ReviewStep;
};

export function ApplicationReviewHeader({ step, reviewStep }: ApplicationReviewHeaderProps) {
  const { signUpData, application } = useRegistration();
  const { review, markStepEntered } = useAdmin();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (reviewStep) markStepEntered(reviewStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewStep]);

  if (!signUpData) return null;

  const stepEnteredAt = reviewStep ? review.stepTimestamps[reviewStep] : null;
  const agingLevel = getAgingLevel(application.submittedAt);
  const agingColors = AGING_LEVEL_COLORS[agingLevel];
  const stepAgingLevel = getAgingLevel(stepEnteredAt);

  return (
    <Stack spacing={2.5} sx={{ mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        flexWrap="wrap"
      >
        <Link
          component={RouterLink}
          href={paths.admin.applications}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: 13.5,
            fontWeight: 600,
            color: '#667085',
            width: 'fit-content',
            '&:hover': { color: '#1C2A6E' },
          }}
        >
          <Iconify icon="eva:arrow-ios-back-fill" width={16} />
          Application List
        </Link>

        {application.submittedAt && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip
              title={
                agingLevel === 'overdue'
                  ? `Overdue — submitted ${new Date(application.submittedAt).toLocaleString()}`
                  : agingLevel === 'warning'
                    ? `Aging — submitted ${new Date(application.submittedAt).toLocaleString()}`
                    : `Submitted ${new Date(application.submittedAt).toLocaleString()}`
              }
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Iconify
                  icon={
                    agingLevel === 'overdue'
                      ? 'solar:danger-triangle-bold'
                      : 'solar:hourglass-bold-duotone'
                  }
                  width={14}
                  sx={{ color: agingColors.icon }}
                />
                <Typography
                  sx={{
                    fontSize: 12,
                    color: agingColors.text,
                    fontWeight: agingLevel === 'normal' ? 400 : 700,
                  }}
                >
                  In review for <strong>{formatAging(application.submittedAt)}</strong>
                </Typography>
              </Stack>
            </Tooltip>

            {stepEnteredAt && (
              <>
                <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#D2D6E0' }} />
                <Typography sx={{ fontSize: 12, color: '#667085' }}>
                  On this step: <strong>{formatAging(stepEnteredAt)}</strong>
                </Typography>
              </>
            )}
          </Stack>
        )}
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: '16px',
          bgcolor: 'common.white',
          border: '1px solid #EBEDF3',
          boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
        }}
      >
        <Stack direction="row" spacing={1.75} alignItems="center">
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
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
              {signUpData.firstName} {signUpData.lastName}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              Loan No. {getLoanNumber(signUpData.email)} ·{' '}
              {application.loanType === 'business' ? 'Business Loan' : 'Personal Loan'}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2}>
          {application.assignedOfficer && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Iconify icon="solar:user-id-bold-duotone" width={15} sx={{ color: '#8891A6' }} />
              <Typography sx={{ fontSize: 12.5, color: '#667085' }}>
                Officer: <strong>{application.assignedOfficer}</strong>
              </Typography>
            </Stack>
          )}

          <Box
            sx={{
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#3448B0',
              bgcolor: '#EEF1FE',
              borderRadius: '999px',
              px: 1.75,
              py: 0.75,
            }}
          >
            {step}
          </Box>
        </Stack>
      </Stack>

      {stepAgingLevel !== 'normal' && !bannerDismissed && (
        <Alert
          severity={stepAgingLevel === 'overdue' ? 'error' : 'warning'}
          onClose={() => setBannerDismissed(true)}
          icon={<Iconify icon="solar:danger-triangle-bold" width={20} />}
          sx={{ borderRadius: '12px' }}
        >
          This application has been on <strong>{step}</strong> for{' '}
          <strong>{formatAging(stepEnteredAt)}</strong>
          {stepAgingLevel === 'overdue' ? ' — it needs attention.' : '.'}
        </Alert>
      )}
    </Stack>
  );
}
