'use client';

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

import { SAMPLE_APPLICATIONS } from './sample-applications';

// ----------------------------------------------------------------------
// Appraisal Officer's queue: applications with at least one pledged
// property (TCT) that has no appraiser assigned yet. Same table styling
// as application-list-view.tsx's main queue (avatar + name/App No. cell,
// uppercase muted column headers, hover row) rather than
// ci-fee-approval-view.tsx's stacked-card rows — this queue is a real
// per-application list, so it reads as one. "Needs an appraiser" isn't a
// ReviewStep, so this is still its own dedicated view/route rather than a
// reuse of application-list-view.tsx's ?step= queue. The live application
// is the only clickable row (into the Appraisal page itself, where the
// actual Collateral titles table/Assign Appraiser modal live); sample rows
// are read-only filler, same convention as every other queue in this app.
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

type Row = {
  key: string;
  name: string;
  email: string;
  tctNumbers: string[];
  isSample: boolean;
};

export function AppraisalAppraiserView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;

  const liveUnassignedTcts = appraisalGroups.filter((group) => group.reportId === null);
  const isLivePending = !!signUpData && !appraisalNotApplicable && liveUnassignedTcts.length > 0;

  const rows: Row[] = [];
  if (isLivePending && signUpData) {
    rows.push({
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
    rows.push({
      key: sampleSignUp.email,
      name: `${sampleSignUp.firstName} ${sampleSignUp.lastName}`,
      email: sampleSignUp.email,
      tctNumbers: entry.appraisalNeedsAppraiser.tctNumbers,
      isSample: true,
    });
  });

  const handleRowClick = (row: Row) => {
    if (row.isSample) return;
    router.push(paths.admin.appraisal(encodeURIComponent(row.email)));
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Appraisal Appraiser
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Applications with pledged properties awaiting appraiser assignment.
          </Typography>
        </Box>

        {!signUpData && rows.length === 0 ? (
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
        ) : rows.length > 0 ? (
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
                {rows.map((row) => {
                  const avatarPalette = getAvatarPalette(row.email);
                  const initial = row.name[0]?.toUpperCase() ?? '?';
                  const isActionable = !row.isSample;

                  return (
                    <TableRow
                      key={row.key}
                      hover={isActionable}
                      onClick={isActionable ? () => handleRowClick(row) : undefined}
                      sx={{
                        cursor: isActionable ? 'pointer' : 'default',
                        transition: 'background-color 0.12s ease',
                        '&:last-of-type td': { borderBottom: 0 },
                        '& td': { borderColor: '#EEF0F5', py: 1.375, px: 2 },
                        '&:hover': isActionable ? { bgcolor: '#FAFBFF' } : undefined,
                      }}
                    >
                      <TableCell>
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
                                title={row.name}
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
                                {row.name}
                              </Typography>
                              {row.isSample && (
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
                              {getLoanNumber(row.email)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            color: '#5A6273',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={row.tctNumbers.join(', ')}
                        >
                          {row.tctNumbers.join(', ')}
                        </Typography>
                      </TableCell>

                      <TableCell>
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
                            bgcolor: TONE_COLORS.warning.bg,
                          }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: TONE_COLORS.warning.solid,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: TONE_COLORS.warning.text,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Needs appraiser
                          </Typography>
                        </Stack>
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
