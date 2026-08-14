'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
import { adminCardSx, TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { AppraisalFeeCard } from './appraisal/appraisal-fee-card';
import { AppraiserAssignmentCard } from './appraisal/appraiser-assignment-card';

// ----------------------------------------------------------------------
// This is the Appraiser's own workspace — framed as personal work ("My
// Available Properties" / "My Active Assignments"), not an admin-facing
// approval queue. Unlike the other three Approval-role screens, this one
// only shows the signed-in appraiser's own work: no read-only sample
// filler rows (SAMPLE_APPLICATIONS entries belong to other applications
// this appraiser isn't assigned to), and no "isSample" framing anywhere.
// If there's no live application in the session, or nothing currently
// needs this appraiser's attention, that section simply reads as empty —
// same as a real appraiser's inbox with nothing pending.
//
// Two sections:
// 1. "Available for Assignment" — pledged properties (TCTs) not yet
//    claimed by any appraiser. Claiming one still routes into the
//    Appraisal page's Collateral titles table/Assign Appraiser modal — the
//    actual selection/bundling UI isn't duplicated here — but the framing
//    is "claim this work," not "review this application."
// 2. "My Active Assignments" — bundles already assigned to an appraiser
//    that still need the fee requested, cleared, or the report submitted
//    once the client has paid. Each assignment expands in place into the
//    same AppraisalFeeCard/AppraiserAssignmentCard flow
//    appraisal-view.tsx used to render directly, framed as "your
//    assignment," with a progress tracker instead of a generic status
//    pill.
// ----------------------------------------------------------------------

const PROGRESS_STEPS = ['Assigned', 'Fee requested', 'Fee approved', 'Client paid', 'Report submitted'];

function ProgressTracker({ activeIndex }: { activeIndex: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0}>
      {PROGRESS_STEPS.map((label, index) => {
        const done = index <= activeIndex;
        const isLast = index === PROGRESS_STEPS.length - 1;
        return (
          <Stack key={label} direction="row" alignItems="center" sx={{ flex: isLast ? 'none' : 1 }}>
            <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: done ? '#1C2A6E' : '#EEF0F5',
                  color: done ? 'common.white' : '#98A1B3',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {done ? <Iconify icon="mingcute:check-fill" width={13} /> : index + 1}
              </Box>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: done ? 700 : 500,
                  color: done ? '#14172A' : '#98A1B3',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Typography>
            </Stack>
            {!isLast && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  minWidth: 16,
                  mx: 0.75,
                  mb: 2,
                  bgcolor: index < activeIndex ? '#1C2A6E' : '#EEF0F5',
                }}
              />
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

type AvailableProperty = {
  key: string;
  tctNumber: string;
  address?: string;
};

export function AppraisalAppraiserView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { feeStatus, paymentReceivedAt, reportBundles } = review.appraisal;

  const [assignmentExpanded, setAssignmentExpanded] = useState(true);

  // --- Available for Assignment ---
  const availableProperties: AvailableProperty[] = signUpData && !appraisalNotApplicable
    ? appraisalGroups
        .filter((group) => group.reportId === null)
        .map((group) => ({ key: group.id, tctNumber: group.tctNumber }))
    : [];

  const handleClaim = () => {
    if (!signUpData) return;
    router.push(paths.admin.appraisal(encodeURIComponent(signUpData.email)));
  };

  // --- My Active Assignments ---
  const feeSettled = feeStatus === 'not-applicable' || (feeStatus === 'approved' && !!paymentReceivedAt);
  const allBundlesSubmitted = reportBundles.every((bundle) => !!bundle.report.uploadedAt);
  const hasActiveAssignment = !!signUpData && reportBundles.length > 0 && !(feeSettled && allBundlesSubmitted);

  const progressIndex = (() => {
    if (feeStatus === 'not-requested') return 0;
    if (feeStatus === 'pending-approval') return 1;
    if (feeStatus === 'approved' && !paymentReceivedAt) return 2;
    if (feeSettled && !allBundlesSubmitted) return 3;
    return 4;
  })();

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={5}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            Appraiser Workspace
          </Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            My Assignments
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Claim pledged properties awaiting an appraiser, then request your fee and submit the
            report once the client has paid.
          </Typography>
        </Box>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:home-2-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing to work on yet
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
              There’s no live application in this session yet. Start one from the Application List.
            </Typography>
            <Button
              component={RouterLink}
              href={paths.admin.accountSolicitation}
              variant="outlined"
              sx={{ ...outlinedNavyButtonSx, px: 2.5 }}
            >
              Go to Application List
            </Button>
          </Box>
        ) : (
          <>
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                Available for Assignment
              </Typography>
              {availableProperties.length > 0 ? (
                <Box sx={{ ...adminCardSx, p: 0, overflow: 'hidden' }}>
                  {availableProperties.map((property, index) => (
                    <Stack
                      key={property.key}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={2}
                      sx={{
                        p: { xs: 2, md: 2.5 },
                        borderBottom: index < availableProperties.length - 1 ? '1px solid #EEF0F5' : 'none',
                      }}
                    >
                      <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            borderRadius: '11px',
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: '#EEF1FE',
                          }}
                        >
                          <Iconify icon="solar:home-2-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                            {property.tctNumber}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
                            {applicantName} · App No. {getLoanNumber(signUpData.email)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button
                        onClick={handleClaim}
                        variant="outlined"
                        size="small"
                        endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
                        sx={{ ...outlinedNavyButtonSx, flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        Claim
                      </Button>
                    </Stack>
                  ))}
                </Box>
              ) : (
                <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                    Nothing available right now — check back once a new property is pledged.
                  </Typography>
                </Box>
              )}
            </Stack>

            <Stack spacing={2}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                My Active Assignments
              </Typography>
              {hasActiveAssignment ? (
                <Box sx={adminCardSx}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                    spacing={2}
                    onClick={() => setAssignmentExpanded((open) => !open)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          flexShrink: 0,
                          borderRadius: '11px',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: TONE_COLORS.info.bg,
                        }}
                      >
                        <Iconify icon="solar:clipboard-list-bold-duotone" width={21} sx={{ color: TONE_COLORS.info.text }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A' }}>
                          {applicantName}
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                          App No. {getLoanNumber(signUpData.email)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
                      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <ProgressTracker activeIndex={progressIndex} />
                      </Box>
                      <Iconify
                        icon={assignmentExpanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                        width={20}
                        sx={{ color: '#8891A6' }}
                      />
                    </Stack>
                  </Stack>
                  <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 2 }}>
                    <ProgressTracker activeIndex={progressIndex} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                    No active assignments right now — claim a property above to get started.
                  </Typography>
                </Box>
              )}
            </Stack>

            {assignmentExpanded && hasActiveAssignment && signUpData && (
              <Stack spacing={2.5}>
                <AppraisalFeeCard />
                {feeSettled &&
                  reportBundles.map((bundle) => (
                    <AppraiserAssignmentCard
                      key={bundle.id}
                      bundleId={bundle.id}
                      tctNumbers={appraisalGroups
                        .filter((group) => bundle.tctGroupIds.includes(group.id))
                        .map((group) => group.tctNumber)}
                    />
                  ))}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
