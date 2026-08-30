'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
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
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATION } from './sample-application';
import { buildSampleCallReportFields } from './call-report/sample-call-report';

import type { CallReportApprovalStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Personal workspace for the Call Report Approver — "Call Report -
// Approval" in the Request nav dropdown, same list -> detail split as
// ci-fee-approval-view.tsx -> ci-fee-approval-bundle-view.tsx (the
// closest existing analog: a flat, single-application approval, not a
// multi-bundle one like Appraisal). This page is ONLY the list; the
// actual header card, the "View Call Report Result" button, and
// Approve/Decline all live on call-report-approval-bundle-view.tsx.
//
// The live application's row ALWAYS shows whenever a live application
// exists in the session, same convention every other approval list here
// follows — only the StatusBadge tone/label varies by status; the row
// itself never disappears.
//
// Same auto-load-and-seed convention as ci-fee-approval-view.tsx: if the
// session hydrates with no live application, load the shared sample
// dataset. Then, only when the Call Report is genuinely EMPTY (none of
// the 3 canProceed fields — interactionType/identityStatus/
// callDisposition — are set) and isn't already 'pending-approval', seed
// a fresh submitted Call Report — the FULL 8 sections, via the same
// buildSampleCallReportFields() builder call-report-view.tsx's own
// "Fill with Sample Data" uses (see sample-call-report.ts) — so "View
// Call Report Result" on the detail page shows a real, complete-looking
// report immediately, not a mostly-empty one. If the report already has
// real content (hand-filled or sample-filled) but hasn't been submitted,
// only the status fields are stamped — the officer's actual field
// values are never touched. Deliberately excludes 'approved': that's a
// real terminal decision and must stick, not get silently undone the
// moment the approver navigates back to this list. Also never resurrects
// a just-Declined application: a non-empty decisionReason alongside
// 'not-submitted' means Decline ran, and per
// docs/160-request-call-report-approval.md decline leaves nothing to
// re-arm.
// ----------------------------------------------------------------------

const CALL_REPORT_ROW_STATUS_COPY: Record<CallReportApprovalStatus, { label: string; tone: SemanticTone }> = {
  'not-submitted': { label: 'Not Submitted', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
};

export function CallReportApprovalView() {
  const router = useRouter();
  const { signUpData, application, hydrated, loadSample } = useRegistration();
  const { review, setCallReport } = useAdmin();
  const { callReportApprovalStatus, callReportSubmittedAt } = review.callReport;
  const isCallReportEmpty =
    !review.callReport.interactionType &&
    !review.callReport.identityStatus &&
    !review.callReport.callDisposition;

  const hasApplication = !!signUpData && !!application.personalInfo;

  const didSeedApplication = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!hasApplication) {
      if (didSeedApplication.current) return;
      didSeedApplication.current = true;
      loadSample(SAMPLE_APPLICATION);
      return;
    }
    if (callReportApprovalStatus === 'pending-approval') return;
    // Never overwrite a declined-but-untouched report — see Finding 2 below,
    // this guard also covers Finding 1: don't resurrect after Decline.
    if (callReportApprovalStatus === 'not-submitted' && review.callReport.decisionReason) return;
    if (isCallReportEmpty) {
      setCallReport({
        ...buildSampleCallReportFields({
          firstName: signUpData?.firstName ?? '',
          assignedOfficer: application.assignedOfficer,
          desiredLoanAmount: application.financialInfo?.desiredLoanAmount,
          loanTermMonths: application.financialInfo?.loanTermMonths,
        }),
        callReportApprovalStatus: 'pending-approval',
        callReportSubmittedAt: new Date().toISOString(),
      });
    } else {
      // Report has real content (hand-filled or sample-filled) but hasn't
      // been submitted yet — only stamp the status fields, never touch the
      // officer's actual field values.
      setCallReport({
        callReportApprovalStatus: 'pending-approval',
        callReportSubmittedAt: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, callReportApprovalStatus, isCallReportEmpty]);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const rowStatusCopy = CALL_REPORT_ROW_STATUS_COPY[callReportApprovalStatus];
  const submittedOnLabel = callReportSubmittedAt ? new Date(callReportSubmittedAt).toLocaleDateString() : '—';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 1 }}
        >
          <Box>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
              Call Report Approvals
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Call Report submissions from the officer, past and present.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Call Report Approver
          </Typography>
        </Stack>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing waiting on you yet
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
                    <TableCell sx={{ width: '40%' }}>Applicant</TableCell>
                    <TableCell sx={{ width: '25%' }}>Submitted On</TableCell>
                    <TableCell sx={{ width: '25%' }}>Status</TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow
                    hover
                    onClick={() => router.push(paths.admin.callReportApprovalBundle())}
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
                        {applicantName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
                        App No. {getLoanNumber(signUpData.email)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>{submittedOnLabel}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={rowStatusCopy.tone} label={rowStatusCopy.label} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: '#8891A6' }}>
                        <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
