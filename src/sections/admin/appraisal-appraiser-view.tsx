'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { AppraisalFeeCard } from './appraisal/appraisal-fee-card';
import { AppraiserAssignmentCard } from './appraisal/appraiser-assignment-card';
import { SAMPLE_APPLICATIONS } from './sample-applications';

// ----------------------------------------------------------------------
// Appraiser's workspace, in two parts:
//
// 1. "Needs Appraiser" — applications with at least one pledged property
//    (TCT) that has no appraiser assigned yet. Same table styling as
//    application-list-view.tsx's main queue. The live application's row
//    links into the Appraisal page itself, where the actual Collateral
//    titles table/Assign Appraiser modal live — assignment isn't
//    duplicated here.
// 2. "Appraiser Action Needed" — applications that DO have an appraiser
//    assigned (reportBundles.length > 0) but still need the appraiser to
//    request the fee, wait for it to clear, or submit the report once the
//    client has paid. Clicking the live application's row here expands an
//    inline detail panel reusing AppraisalFeeCard (request fee / advise
//    client / simulate payment received) and, once paid, one
//    AppraiserAssignmentCard per bundle (create/upload report) — the same
//    components appraisal-view.tsx used to render directly, now scoped to
//    this role's page instead.
//
// Neither section is application-list-view.tsx's ?step= queue — "needs an
// appraiser"/"appraiser has outstanding work" aren't ReviewSteps, they're
// derived conditions on review.requirementChecklist/review.appraisal.
// Sample rows in both sections are read-only filler, same convention as
// every other queue in this app.
// ----------------------------------------------------------------------

// Same deterministic per-borrower avatar palette as
// application-list-view.tsx's getAvatarPalette — not shared/exported from
// there, so duplicated locally.
const AVATAR_PALETTES = [
  { bg: '#EEF1FE', text: '#3448B0' },
  { bg: '#E7F8F0', text: '#0C8A4F' },
  { bg: '#FEF0D6', text: '#B36A05' },
  { bg: '#FDE2DF', text: '#B32C22' },
  { bg: '#F3E8FD', text: '#7C3AED' },
  { bg: '#E0F7FA', text: '#0E7490' },
];

function getAvatarPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function BorrowerCell({ name, email, isSample }: { name: string; email: string; isSample: boolean }) {
  const avatarPalette = getAvatarPalette(email);
  const initial = name[0]?.toUpperCase() ?? '?';
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: avatarPalette.bg,
          color: avatarPalette.text,
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        {initial}
      </Box>
      <Stack spacing={0.15} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
          <Typography
            title={name}
            sx={{
              fontSize: 13.5,
              fontWeight: 600,
              color: '#14172A',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 200,
            }}
          >
            {name}
          </Typography>
          {isSample && (
            <Box
              sx={{
                px: 0.75,
                py: 0.1,
                borderRadius: '5px',
                bgcolor: '#F5F6FA',
                color: '#8891A6',
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}
            >
              Sample
            </Box>
          )}
        </Stack>
        <Typography sx={{ fontSize: 11.5, color: '#98A1B3', fontVariantNumeric: 'tabular-nums' }}>
          {getLoanNumber(email)}
        </Typography>
      </Stack>
    </Stack>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'warning' | 'info' | 'success' }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{
        display: 'inline-flex',
        pl: 0.85,
        pr: 1.1,
        py: 0.45,
        borderRadius: '999px',
        bgcolor: TONE_COLORS[tone].bg,
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: TONE_COLORS[tone].solid, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: TONE_COLORS[tone].text, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
    </Stack>
  );
}

type NeedsAppraiserRow = {
  key: string;
  name: string;
  email: string;
  tctNumbers: string[];
  isSample: boolean;
};

type ActionNeededRow = {
  key: string;
  name: string;
  email: string;
  statusLabel: string;
  statusTone: 'warning' | 'info' | 'success';
  isSample: boolean;
  isLive: boolean;
};

export function AppraisalAppraiserView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { feeStatus, paymentReceivedAt, reportBundles } = review.appraisal;

  const [liveExpanded, setLiveExpanded] = useState(false);

  // --- Section 1: Needs Appraiser ---
  const liveUnassignedTcts = appraisalGroups.filter((group) => group.reportId === null);
  const isLiveNeedsAppraiser = !!signUpData && !appraisalNotApplicable && liveUnassignedTcts.length > 0;

  const needsAppraiserRows: NeedsAppraiserRow[] = [];
  if (isLiveNeedsAppraiser && signUpData) {
    needsAppraiserRows.push({
      key: signUpData.email,
      name: `${signUpData.firstName} ${signUpData.lastName}`,
      email: signUpData.email,
      tctNumbers: liveUnassignedTcts.map((group) => group.tctNumber),
      isSample: false,
    });
  }
  SAMPLE_APPLICATIONS.forEach((entry) => {
    const { signUpData: sampleSignUp } = entry.registration;
    if (!sampleSignUp || !entry.appraisalNeedsAppraiser) return;
    needsAppraiserRows.push({
      key: sampleSignUp.email,
      name: `${sampleSignUp.firstName} ${sampleSignUp.lastName}`,
      email: sampleSignUp.email,
      tctNumbers: entry.appraisalNeedsAppraiser.tctNumbers,
      isSample: true,
    });
  });

  const handleNeedsAppraiserRowClick = (row: NeedsAppraiserRow) => {
    if (row.isSample) return;
    router.push(paths.admin.appraisal(encodeURIComponent(row.email)));
  };

  // --- Section 2: Appraiser Action Needed ---
  const feeSettled = feeStatus === 'not-applicable' || (feeStatus === 'approved' && !!paymentReceivedAt);
  const allBundlesSubmitted = reportBundles.every((bundle) => !!bundle.report.uploadedAt);
  const isLiveActionNeeded = !!signUpData && reportBundles.length > 0 && !(feeSettled && allBundlesSubmitted);

  const liveStatus = (): { label: string; tone: 'warning' | 'info' | 'success' } => {
    if (feeStatus === 'not-requested') return { label: 'Request fee', tone: 'warning' };
    if (feeStatus === 'pending-approval') return { label: 'Awaiting fee approval', tone: 'info' };
    if (feeStatus === 'approved' && !paymentReceivedAt) return { label: 'Awaiting client payment', tone: 'info' };
    return { label: 'Report pending', tone: 'warning' };
  };

  const actionNeededRows: ActionNeededRow[] = [];
  if (isLiveActionNeeded && signUpData) {
    const status = liveStatus();
    actionNeededRows.push({
      key: signUpData.email,
      name: `${signUpData.firstName} ${signUpData.lastName}`,
      email: signUpData.email,
      statusLabel: status.label,
      statusTone: status.tone,
      isSample: false,
      isLive: true,
    });
  }
  SAMPLE_APPLICATIONS.forEach((entry) => {
    const { signUpData: sampleSignUp } = entry.registration;
    if (!sampleSignUp || !entry.appraisalFeePending) return;
    actionNeededRows.push({
      key: sampleSignUp.email,
      name: `${sampleSignUp.firstName} ${sampleSignUp.lastName}`,
      email: sampleSignUp.email,
      statusLabel: 'Awaiting fee approval',
      statusTone: 'info',
      isSample: true,
      isLive: false,
    });
  });

  const noRowsAtAll = needsAppraiserRows.length === 0 && actionNeededRows.length === 0;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={5}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Appraisal Appraiser
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Assign appraisers to pledged properties, then request the Appraisal fee and submit
            the report once the client has paid.
          </Typography>
        </Box>

        {!signUpData && noRowsAtAll ? (
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
        ) : (
          <>
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                Needs Appraiser
              </Typography>
              {needsAppraiserRows.length > 0 ? (
                <TableContainer sx={{ ...adminCardSx, p: 0, overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 720, tableLayout: 'fixed', borderCollapse: 'separate' }}>
                    <TableHead>
                      <TableRow
                        sx={{
                          '& th': {
                            bgcolor: '#FBFBFD',
                            borderBottom: '1px solid #E1E4ED',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#8891A6',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            py: 1.5,
                            px: 2,
                          },
                        }}
                      >
                        <TableCell sx={{ width: '32%' }}>Borrower</TableCell>
                        <TableCell sx={{ width: '38%' }}>Pledged Properties</TableCell>
                        <TableCell sx={{ width: '18%' }}>Status</TableCell>
                        <TableCell align="right" sx={{ width: '12%' }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {needsAppraiserRows.map((row) => {
                        const isActionable = !row.isSample;
                        return (
                          <TableRow
                            key={row.key}
                            hover={isActionable}
                            onClick={isActionable ? () => handleNeedsAppraiserRowClick(row) : undefined}
                            sx={{
                              cursor: isActionable ? 'pointer' : 'default',
                              transition: 'background-color 0.12s ease',
                              '&:last-of-type td': { borderBottom: 0 },
                              '& td': { borderColor: '#EEF0F5', py: 1.375, px: 2 },
                              '&:hover': isActionable ? { bgcolor: '#FAFBFF' } : undefined,
                            }}
                          >
                            <TableCell>
                              <BorrowerCell name={row.name} email={row.email} isSample={row.isSample} />
                            </TableCell>
                            <TableCell>
                              <Typography
                                sx={{ fontSize: 12.5, color: '#5A6273', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={row.tctNumbers.join(', ')}
                              >
                                {row.tctNumbers.join(', ')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <StatusPill label="Needs appraiser" tone="warning" />
                            </TableCell>
                            <TableCell align="right">
                              {isActionable && (
                                <Iconify icon="eva:arrow-ios-forward-fill" width={20} sx={{ color: '#8891A6' }} />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                    No properties currently need an appraiser assigned.
                  </Typography>
                </Box>
              )}
            </Stack>

            <Stack spacing={2}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                Appraiser Action Needed
              </Typography>
              {actionNeededRows.length > 0 ? (
                <TableContainer sx={{ ...adminCardSx, p: 0, overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 720, tableLayout: 'fixed', borderCollapse: 'separate' }}>
                    <TableHead>
                      <TableRow
                        sx={{
                          '& th': {
                            bgcolor: '#FBFBFD',
                            borderBottom: '1px solid #E1E4ED',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#8891A6',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            py: 1.5,
                            px: 2,
                          },
                        }}
                      >
                        <TableCell sx={{ width: '38%' }}>Borrower</TableCell>
                        <TableCell sx={{ width: '38%' }}>Status</TableCell>
                        <TableCell align="right" sx={{ width: '24%' }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {actionNeededRows.map((row) => {
                        const expanded = row.isLive && liveExpanded;
                        return (
                          <TableRow
                            key={row.key}
                            hover={row.isLive}
                            onClick={row.isLive ? () => setLiveExpanded((open) => !open) : undefined}
                            sx={{
                              cursor: row.isLive ? 'pointer' : 'default',
                              transition: 'background-color 0.12s ease',
                              '&:last-of-type td': { borderBottom: 0 },
                              '& td': { borderColor: '#EEF0F5', py: 1.375, px: 2 },
                              '&:hover': row.isLive ? { bgcolor: '#FAFBFF' } : undefined,
                            }}
                          >
                            <TableCell>
                              <BorrowerCell name={row.name} email={row.email} isSample={row.isSample} />
                            </TableCell>
                            <TableCell>
                              <StatusPill label={row.statusLabel} tone={row.statusTone} />
                            </TableCell>
                            <TableCell align="right">
                              {row.isLive && (
                                <Iconify
                                  icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                                  width={20}
                                  sx={{ color: '#8891A6' }}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                    No assigned appraisers currently have outstanding fee or report work.
                  </Typography>
                </Box>
              )}
            </Stack>

            {liveExpanded && isLiveActionNeeded && signUpData && (
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
