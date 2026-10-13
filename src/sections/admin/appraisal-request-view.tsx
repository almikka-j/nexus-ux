'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { getAppraisalNumber } from 'src/utils/get-appraisal-number';

// ----------------------------------------------------------------------

const COLLATERAL_TYPE_LABEL: Record<string, string> = {
  'real-estate': 'Real Estate',
  chattel: 'Chattel',
};

const STATUS_COPY: Record<'on-process' | 'for-approval' | 'for-report' | 'reported', { label: string; tone: SemanticTone }> = {
  'on-process': { label: 'On Process', tone: 'neutral' },
  'for-approval': { label: 'For Approval', tone: 'warning' },
  'for-report': { label: 'For Report', tone: 'info' },
  reported: { label: 'Reported', tone: 'success' },
};

export function AppraisalRequestView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { feeApprovalStatus, paymentReceivedAt, reportBundles } = review.appraisal;

  const feeSettled = feeApprovalStatus === 'approved' && !!paymentReceivedAt;
  const hasRequests = !!signUpData && reportBundles.length > 0;
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 1 }}
        >
          <Box>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              Appraisal - Request
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Every property assigned to an appraiser, and where each one currently stands.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Appraisal Officer
          </Typography>
        </Stack>

        <Stack spacing={2}>
          {hasRequests ? (
            <Box sx={{ ...adminCardSx, p: 0, overflow: 'hidden' }}>
              <TableContainer>
                <Table sx={{ tableLayout: 'fixed' }}>
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
                      <TableCell sx={{ width: '13%' }}>Appraisal No.</TableCell>
                      <TableCell sx={{ width: '26%' }}>Collateral No.</TableCell>
                      <TableCell sx={{ width: '14%' }}>Appraisal Type</TableCell>
                      <TableCell sx={{ width: '18%' }}>Applicant</TableCell>
                      <TableCell sx={{ width: '15%' }}>Appraiser</TableCell>
                      <TableCell sx={{ width: '14%' }}>Status</TableCell>
                      <TableCell sx={{ width: 44 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportBundles.map((bundle) => {
                      const bundleGroups = appraisalGroups.filter((group) => bundle.tctGroupIds.includes(group.id));
                      const bundleTctNumbers = bundleGroups.map((group) => group.tctNumber);
                      const appraisalTypeName = Array.from(new Set(bundleGroups.map((group) => COLLATERAL_TYPE_LABEL[group.collateralType] ?? group.collateralType))).join(', ');

                      const status = bundle.report.uploadedAt
                        ? 'reported'
                        : bundle.feeNeeded === 'no' || (feeApprovalStatus === 'approved' && feeSettled)
                          ? 'for-report'
                          : feeApprovalStatus === 'pending-approval'
                            ? 'for-approval'
                            : 'on-process';
                      const copy = STATUS_COPY[status];
                      const toneColors = TONE_COLORS[copy.tone];

                      return (
                        <TableRow
                          key={bundle.id}
                          hover
                          onClick={() => router.push(paths.admin.appraisalAppraiserBundle(bundle.id))}
                          sx={{
                            cursor: 'pointer',
                            '& td': {
                              borderColor: '#EEF0F5',
                              py: 1.375,
                              px: 2,
                            },
                          }}
                        >
                          <TableCell>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A' }}>
                              {getAppraisalNumber(bundle.id)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: '#14172A',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {bundleTctNumbers.join(', ')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
                              {appraisalTypeName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
                              {applicantName}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
                              App No. {getLoanNumber(signUpData!.email)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              noWrap
                              sx={{ fontSize: 13.5, color: bundle.appraiserName ? '#14172A' : '#8891A6', fontWeight: bundle.appraiserName ? 600 : 400 }}
                            >
                              {bundle.appraiserName ?? 'Not yet assigned'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                px: 1.1,
                                py: 0.4,
                                borderRadius: '999px',
                                bgcolor: toneColors.bg,
                                color: toneColors.text,
                                fontSize: 11.5,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {copy.label}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small">
                              <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 }, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                No appraisal requests yet — assign an appraiser from the Appraisal step&apos;s
                Collateral titles table to see it here.
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
