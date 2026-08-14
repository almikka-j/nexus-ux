'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
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
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATIONS } from './sample-applications';

// ----------------------------------------------------------------------
// Head/Approver's queue for the "reviewed and noted" Head Approval step —
// every pledged property's appraisal report bundle has been submitted
// (same reportSubmitted condition appraisal-view.tsx computes to unlock
// its own Head Approval card) and headApprovalStatus === 'pending'. Table
// styling matches application-list-view.tsx's main queue (avatar +
// name/App No. cell, uppercase muted column headers, status pill with dot
// indicator) rather than stacked cards, same as
// appraisal-appraiser-view.tsx/appraisal-fee-approval-view.tsx. Only the
// live application has working Approve/Decline, rendered as a detail card
// below the table when its row is present, reusing the same
// setAppraisal/clearAllAppraisalBundleReports setters
// head-approval-card.tsx already uses.
// ----------------------------------------------------------------------

// Same deterministic per-borrower avatar palette as
// application-list-view.tsx's getAvatarPalette — not shared/exported from
// there, so duplicated locally (same copy used by the other two
// Approval-role table views).
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
  appraiserName: string;
  isSample: boolean;
};

export function AppraisalApproverView() {
  const { signUpData } = useRegistration();
  const { review, setAppraisal, clearAllAppraisalBundleReports } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { headApprovalStatus, headApprovalDeclineReason, reportBundles } = review.appraisal;

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  const allGroupsAssigned = appraisalGroups.every((group) => group.reportId !== null);
  const allBundlesSubmitted = reportBundles.every((bundle) => !!bundle.report.uploadedAt);
  const reportSubmitted =
    appraisalNotApplicable || (allGroupsAssigned && reportBundles.length > 0 && allBundlesSubmitted);
  const isLivePending = !!signUpData && reportSubmitted && headApprovalStatus === 'pending';

  const rows: Row[] = [];
  if (isLivePending && signUpData) {
    rows.push({
      key: signUpData.email,
      name: applicantName,
      email: signUpData.email,
      appraiserName:
        reportBundles.map((bundle) => bundle.appraiserName).filter(Boolean).join(', ') || 'Appraiser',
      isSample: false,
    });
  }
  SAMPLE_APPLICATIONS.forEach((entry) => {
    const { signUpData: sampleSignUp } = entry.registration;
    if (!sampleSignUp || !entry.appraisalAwaitingHeadApproval) return;
    rows.push({
      key: sampleSignUp.email,
      name: `${sampleSignUp.firstName} ${sampleSignUp.lastName}`,
      email: sampleSignUp.email,
      appraiserName: entry.appraisalAwaitingHeadApproval.appraiserName,
      isSample: true,
    });
  });

  const approve = () => {
    setAppraisal({ headApprovalStatus: 'approved' });
    setJustApproved(true);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setDeclineReason('');
  };

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setAppraisal({ headApprovalStatus: 'pending', headApprovalDeclineReason: declineReason.trim() });
    clearAllAppraisalBundleReports();
    setDeclineOpen(false);
    setDeclineReason('');
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            Appraisal Approver
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Applications with every appraisal report submitted, awaiting Head Approval.
          </Typography>
        </Box>

        {!signUpData && rows.length === 0 ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:clipboard-check-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
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
                  <TableCell sx={{ width: '38%' }}>Borrower</TableCell>
                  <TableCell sx={{ width: '38%' }}>Appraiser</TableCell>
                  <TableCell sx={{ width: '24%' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const avatarPalette = getAvatarPalette(row.email);
                  const initial = row.name[0]?.toUpperCase() ?? '?';

                  return (
                    <TableRow
                      key={row.key}
                      sx={{
                        '&:last-of-type td': { borderBottom: 0 },
                        '& td': { borderColor: '#EEF0F5', py: 1.375, px: 2 },
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
                          title={row.appraiserName}
                        >
                          {row.appraiserName}
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
                            Pending approval
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:clipboard-check-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No appraisal pending Head Approval
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              {justApproved
                ? `The appraisal for ${applicantName} has been reviewed and noted.`
                : 'No application currently has every appraisal report submitted and awaiting Head Approval.'}
            </Typography>
          </Box>
        )}

        {isLivePending && signUpData && (
          <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 } }}>
            <Stack spacing={0.5} sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#14172A' }}>
                {applicantName}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                App No. {getLoanNumber(signUpData.email)} · {signUpData.email}
              </Typography>
            </Stack>

            {headApprovalDeclineReason && (
              <Typography sx={{ fontSize: 12.5, color: '#5A6273', mb: 1.5 }}>
                Last decline reason: {headApprovalDeclineReason}
              </Typography>
            )}

            <Typography sx={{ fontSize: 12.5, color: '#5A6273', mb: 2.5 }}>
              Every pledged property&apos;s appraisal report has been submitted. Review and note the
              appraisal before it proceeds to Credit Scoring.
            </Typography>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  onClick={approve}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#0C8A4F', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0A7042' } }}
                >
                  Approve (Reviewed and Noted)
                </Button>
                <Button
                  onClick={() => setDeclineOpen(true)}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
                >
                  Decline
                </Button>
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
                There’s no real Head login in this prototype — approving or declining here
                simulates that step.
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>

      <ConfirmDialog
        open={declineOpen}
        onClose={closeDecline}
        title="Reason for declining"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what needs revision…"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineReason.trim()}
            onClick={confirmDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
