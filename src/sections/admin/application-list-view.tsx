'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { AGING_LEVEL_COLORS, formatAging, getAgingLevel } from 'src/utils/format-aging';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATION } from './sample-application';
import { SAMPLE_APPLICATIONS } from './sample-applications';

import type { ReviewStep } from 'src/auth/admin-context';
import type { RegistrationState } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

const DECISION_LABEL: Record<string, { label: string; color: 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pending Review', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
};

const STEP_ORDER: ReviewStep[] = [
  'creditChecking',
  'reconsideration',
  'callReport',
  'transactionType',
  'requirementChecklist',
];

const STEP_LABELS: Record<ReviewStep, string> = {
  creditChecking: 'Initial Credit Checking',
  reconsideration: 'Reconsideration',
  callReport: 'Call Report',
  transactionType: 'Transaction Type',
  requirementChecklist: 'Requirement Checklist',
};

type ListRow = {
  key: string;
  isLive: boolean;
  registration: RegistrationState;
  step: ReviewStep;
  statusLabel: string;
  statusColor: 'warning' | 'success' | 'error';
  /** Only the row matching the application's actual current step is clickable. */
  isActionable: boolean;
};

export function ApplicationListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUpData, application, hydrated, loadSample, reset } = useRegistration();
  const { review, resetReview } = useAdmin();

  const hasApplication = !!signUpData && !!application.personalInfo;

  // Auto-load the sample "live" application once localStorage has hydrated,
  // if the session is still empty, so the list isn't empty by default. Gating
  // on `hydrated` avoids clobbering a real application that just hasn't loaded
  // from localStorage yet. Also re-fires whenever `hasApplication` flips
  // back to false (e.g. after "Clear Sample Data" calls `reset()`) — the
  // dependency array used to be just `[hydrated]`, which only ever fires once
  // on mount, so clearing the sample never actually reloaded a fresh one;
  // the list just sat empty until a manual navigate-away-and-back.
  useEffect(() => {
    if (hydrated && !hasApplication) {
      loadSample(SAMPLE_APPLICATION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication]);

  const liveDecision = DECISION_LABEL[review.creditChecking.decision];

  // The live application shows up on EVERY step's list, not just its current
  // one — so a step she's already passed (e.g. Initial Credit Checking, after
  // being approved into Call Report) still always has content instead of
  // going empty. Every one of her rows is clickable (isActionable: true),
  // regardless of step — the goal is letting an admin inspect her
  // application's state at any step at will, not gating access to only her
  // "true current" step.
  const liveRows: ListRow[] = hasApplication
    ? STEP_ORDER.map((step) => ({
        key: `${signUpData!.email}-${step}`,
        isLive: true,
        registration: { signUpData, verified: true, application } as RegistrationState,
        step,
        statusLabel: liveDecision.label,
        statusColor: liveDecision.color,
        isActionable: true,
      }))
    : [];

  // Sample applications don't have a real decision — they're all just
  // "Pending Review" (same status the live application starts with), since
  // repeating the step name as a second "status" chip is redundant and
  // confusing (e.g. a "Call Report" step chip next to a "Call Report" status
  // chip that says nothing new). Samples are never clickable — they're
  // historical/demo filler, not something an admin can actually act on.
  const sampleRows: ListRow[] = SAMPLE_APPLICATIONS.map((entry) => ({
    key: entry.registration.signUpData!.email,
    isLive: false,
    registration: entry.registration,
    step: entry.step,
    statusLabel: DECISION_LABEL.pending.label,
    statusColor: DECISION_LABEL.pending.color,
    isActionable: false,
  }));

  const rows: ListRow[] = [...liveRows, ...sampleRows];

  // No `?step=` param means we're on the Initial Credit Checking landing view
  // (step 1) — that should filter to creditChecking, not show every step.
  const stepFilter: ReviewStep = (searchParams.get('step') as ReviewStep | null) ?? 'creditChecking';
  // Live application always sorts first on every step's list (she's the
  // "real" one; samples are just filler), regardless of whether she's
  // actionable on this particular step.
  const filteredRows = rows
    .filter((row) => row.step === stepFilter)
    .sort((a, b) => Number(b.isLive) - Number(a.isLive));

  // Next.js `metadata` is static per-route and can't see this client-side query
  // param, so the browser tab title is kept in sync here instead of always
  // reading "Initial Credit Checking" regardless of which step is being viewed.
  useEffect(() => {
    document.title = `${STEP_LABELS[stepFilter]} | HHC LMS Admin`;
  }, [stepFilter]);

  const STEP_TO_PATH: Record<ReviewStep, (id: string) => string> = {
    creditChecking: paths.admin.creditChecking,
    reconsideration: paths.admin.reconsideration,
    callReport: paths.admin.callReport,
    transactionType: paths.admin.transactionType,
    requirementChecklist: paths.admin.requirementChecklist,
  };

  const handleRowClick = (row: ListRow) => {
    if (row.isLive) {
      // Route to whichever step the live application is actually at — not
      // always Initial Credit Checking — so clicking its row from a Call
      // Report/Reconsideration/etc. filtered list opens the right screen.
      const id = encodeURIComponent(row.registration.signUpData!.email);
      router.push(STEP_TO_PATH[row.step](id));
    } else {
      router.push(paths.admin.sampleApplication(encodeURIComponent(row.registration.signUpData!.email)));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ px: 1 }}>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              {STEP_LABELS[stepFilter]}
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Applications currently at {STEP_LABELS[stepFilter]}.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {hasApplication && (
              <Button
                onClick={() => {
                  // Clearing the sample data used to only reset who the live
                  // applicant is (RegistrationContext) while leaving all of
                  // her review progress — CIBI form, bureau uploads, AI
                  // analysis, decisions, step timestamps — sitting in
                  // AdminContext untouched. That meant every screen kept
                  // showing old filled-in data from whatever was last tested,
                  // never actually resetting to a blank slate. Both must
                  // clear together.
                  reset();
                  resetReview();
                }}
                size="small"
                sx={{ color: 'text.disabled', flexShrink: 0 }}
              >
                Clear Sample Data
              </Button>
            )}
          </Stack>
        </Stack>

        {filteredRows.length > 0 ? (
          <Stack spacing={1.5}>
            {filteredRows.map((row) => {
              const { signUpData: rowSignUp } = row.registration;
              const rowApplication = row.registration.application;
              const agingLevel = getAgingLevel(rowApplication.submittedAt);
              const agingColors = AGING_LEVEL_COLORS[agingLevel];
              const isActionable = row.isActionable;

              const rowContent = (
                <>
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
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                          {rowSignUp!.firstName} {rowSignUp!.lastName}
                        </Typography>
                        {!row.isLive && (
                          <Chip
                            size="small"
                            label="Sample"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: '#F5F6FA',
                              color: '#8891A6',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        )}
                      </Stack>
                      <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                        Loan No. {getLoanNumber(rowSignUp!.email)} ·{' '}
                        {rowApplication.loanType === 'business' ? 'Business Loan' : 'Personal Loan'}
                        {rowApplication.assignedOfficer && ` · Officer: ${rowApplication.assignedOfficer}`}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Chip
                      size="small"
                      variant="soft"
                      label={STEP_LABELS[row.step]}
                      sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
                    />
                    {rowApplication.submittedAt && (
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
                            fontSize: 12.5,
                            color: agingColors.text,
                            fontWeight: agingLevel === 'normal' ? 400 : 700,
                          }}
                        >
                          {formatAging(rowApplication.submittedAt)}
                        </Typography>
                      </Stack>
                    )}
                    <Chip size="small" color={row.statusColor} variant="soft" label={row.statusLabel} />
                    {isActionable && (
                      <Iconify icon="eva:arrow-ios-forward-fill" width={20} sx={{ color: '#8891A6' }} />
                    )}
                  </Stack>
                </>
              );

              return (
                <Box
                  key={row.key}
                  sx={{
                    borderRadius: '16px',
                    bgcolor: 'common.white',
                    border: '1px solid #EBEDF3',
                    boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
                    overflow: 'hidden',
                  }}
                >
                  {isActionable ? (
                    <ButtonBase
                      onClick={() => handleRowClick(row)}
                      sx={{
                        width: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: { xs: 2.5, md: 3 },
                        textAlign: 'left',
                        '&:hover': { bgcolor: '#F9FAFC' },
                      }}
                    >
                      {rowContent}
                    </ButtonBase>
                  ) : (
                    <Box
                      sx={{
                        width: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: { xs: 2.5, md: 3 },
                        textAlign: 'left',
                      }}
                    >
                      {rowContent}
                    </Box>
                  )}
                </Box>
              );
            })}
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
              icon="solar:inbox-line-bold-duotone"
              width={48}
              sx={{ color: '#C7CCDA', mb: 2 }}
            />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No applications yet
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              No applications are currently at {STEP_LABELS[stepFilter]}.
            </Typography>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
