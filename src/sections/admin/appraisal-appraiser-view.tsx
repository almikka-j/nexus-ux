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
import { adminCardSx, StatusBadge, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATIONS } from './sample-applications';

// ----------------------------------------------------------------------
// Appraisal Officer's queue: applications with at least one pledged
// property (TCT) that has no appraiser assigned yet. Same shape as
// ci-fee-approval-view.tsx — a dedicated per-decision screen, not a reuse
// of application-list-view.tsx's ?step= queue, since "needs an appraiser"
// isn't a ReviewStep, it's a derived condition on
// review.requirementChecklist.appraisalGroups. The live application is the
// only row with a working action (a link into the Appraisal page itself,
// where the actual Collateral titles table/Assign Appraiser modal live);
// sample rows are read-only filler, same convention as every other queue
// in this app.
// ----------------------------------------------------------------------

function QueueRow({
  name,
  email,
  tctNumbers,
  isSample,
}: {
  name: string;
  email: string;
  tctNumbers: string[];
  isSample: boolean;
}) {
  const row = (
    <Box sx={{ ...adminCardSx, p: { xs: 2.5, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
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
            <Iconify icon="solar:home-2-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
          </Box>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.75}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                {name}
              </Typography>
              {isSample && <StatusBadge tone="neutral" label="Sample" />}
            </Stack>
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              App No. {getLoanNumber(email)} · {tctNumbers.join(', ')}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.25} alignItems="center" flexShrink={0}>
          <StatusBadge tone="warning" label="Needs appraiser" />
          {!isSample && (
            <Iconify icon="eva:arrow-ios-forward-fill" width={20} sx={{ color: '#8891A6' }} />
          )}
        </Stack>
      </Stack>
    </Box>
  );

  if (isSample) return row;

  return (
    <RouterLink href={paths.admin.appraisal(encodeURIComponent(email))} style={{ textDecoration: 'none' }}>
      {row}
    </RouterLink>
  );
}

export function AppraisalAppraiserView() {
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;

  const liveUnassignedTcts = appraisalGroups.filter((group) => group.reportId === null);
  const isLivePending = !!signUpData && !appraisalNotApplicable && liveUnassignedTcts.length > 0;

  const sampleRows = SAMPLE_APPLICATIONS.filter((entry) => !!entry.appraisalNeedsAppraiser);
  const hasAnyRow = isLivePending || sampleRows.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Appraisal Appraiser
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Applications with pledged properties awaiting appraiser assignment.
          </Typography>
        </Box>

        {!signUpData && sampleRows.length === 0 ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:home-2-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No application in progress
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
        ) : hasAnyRow ? (
          <Stack spacing={1.5}>
            {isLivePending && signUpData && (
              <QueueRow
                name={`${signUpData.firstName} ${signUpData.lastName}`}
                email={signUpData.email}
                tctNumbers={liveUnassignedTcts.map((group) => group.tctNumber)}
                isSample={false}
              />
            )}
            {sampleRows.map((entry) => {
              const { signUpData: sampleSignUp } = entry.registration;
              if (!sampleSignUp || !entry.appraisalNeedsAppraiser) return null;
              return (
                <QueueRow
                  key={sampleSignUp.email}
                  name={`${sampleSignUp.firstName} ${sampleSignUp.lastName}`}
                  email={sampleSignUp.email}
                  tctNumbers={entry.appraisalNeedsAppraiser.tctNumbers}
                  isSample
                />
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:home-2-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No properties awaiting an appraiser
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
              Every pledged property on the current application already has a report bundle and
              appraiser assigned.
            </Typography>
            {signUpData && (
              <Button
                component={RouterLink}
                href={paths.admin.appraisal(encodeURIComponent(signUpData.email))}
                variant="outlined"
                sx={{ ...outlinedNavyButtonSx, px: 2.5 }}
              >
                Go to Appraisal
              </Button>
            )}
          </Box>
        )}
      </Stack>
    </Container>
  );
}
