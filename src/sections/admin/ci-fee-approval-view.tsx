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
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATION } from './sample-application';

// ----------------------------------------------------------------------
// Personal workspace for the CI Head/Approver — framed as "Fee Approvals,"
// same list -> detail split as appraisal-fee-approval-view.tsx ->
// appraisal-fee-approval-bundle-view.tsx. This page is now ONLY the list:
// one row per pending CI Fee request, styled as a table matching the
// Appraisal Fee Approvals list's own shape (Applicant/Amount/Status
// columns — no Appraisal No./Properties/Appraiser columns since CI Fee is
// a single flat per-application request, not a multi-property bundle: see
// CreditInvestigation.ciFeeStatus/ciFeeAmount on AdminContext, which has no
// bundle concept at all). Clicking the row navigates to
// ci-fee-approval-bundle-view.tsx (paths.admin.ciFeeApprovalBundle()) — the
// actual request detail, StatusBadge/FactChip header card, and
// Approve/Decline actions all live there now, not here.
//
// Since there's no real multi-application backend in this prototype, this
// list only ever has at most one real row (the current live application's
// request, if pending) — same as every other list page here.
//
// Same auto-load-and-seed convention appraisal-fee-approval-view.tsx uses:
// if the session hydrates with no live application, load the shared sample
// dataset so `signUpData` becomes real session state instead of a disabled
// placeholder, then — since this page needs an actual PENDING request to
// show anything — seed one directly into `pending-approval` so there's
// always one real, active, clickable request to look at on a fresh
// session, not an empty list.
// ----------------------------------------------------------------------

export function CiFeeApprovalView() {
  const router = useRouter();
  const { signUpData, application, hydrated, loadSample } = useRegistration();
  const { review, setCreditInvestigation } = useAdmin();
  const { ciFeeStatus, ciFeeAmount, ciFeeAmountDescription, ciFeeDeclineReason } =
    review.creditInvestigation;

  const hasApplication = !!signUpData && !!application.personalInfo;

  // Same auto-load-and-seed convention appraisal-fee-approval-view.tsx
  // uses: if the session hydrates with no live application, load the
  // shared sample dataset; then, since this page needs an actual PENDING
  // fee request to show anything, seed one directly into that state if
  // none exists yet — this mirrors the Appraisal Fee Approvals list's own
  // "always show one real, active example" convention rather than leaving
  // a fresh session's CI Fee Approvals list empty until someone manually
  // drives the Credit Investigation flow first.
  //
  // Guarded on `!ciFeeDeclineReason`, not just `ciFeeStatus ===
  // 'not-requested'` alone: declining a request (see
  // ci-fee-approval-bundle-view.tsx) also resets ciFeeStatus back to
  // 'not-requested' — the same re-entry point a genuinely-never-requested
  // application starts at, since CiFeeStatus has no separate 'declined'
  // value. `ciFeeDeclineReason` is the one field decline sets that a
  // fresh/never-requested application never has, so it's what
  // distinguishes "never asked yet" (seed a sample) from "the approver
  // just declined this one" (leave it alone) — without it, returning to
  // the list right after a decline would immediately regenerate another
  // pending request every render, making the "nothing waiting" empty
  // state unreachable.
  const didSeedApplication = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!hasApplication) {
      if (didSeedApplication.current) return;
      didSeedApplication.current = true;
      loadSample(SAMPLE_APPLICATION);
      return;
    }
    if (ciFeeStatus === 'not-requested' && !ciFeeDeclineReason) {
      setCreditInvestigation({
        ciFeeStatus: 'pending-approval',
        ciFeeAmount: '3500',
        ciFeeAmountDescription: 'Field verification + report preparation fee',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasApplication, ciFeeStatus, ciFeeDeclineReason]);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const isPending = !!signUpData && ciFeeStatus === 'pending-approval';

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
              Fee Approvals
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Credit Investigation fee requests from the officer, waiting on a decision.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            CI Head / Approver
          </Typography>
        </Stack>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:wallet-money-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
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
        ) : isPending ? (
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
                    <TableCell sx={{ width: '30%' }}>Applicant</TableCell>
                    <TableCell sx={{ width: '35%' }}>Description</TableCell>
                    <TableCell sx={{ width: '18%' }}>CI Fee Amount</TableCell>
                    <TableCell sx={{ width: '17%' }}>Status</TableCell>
                    <TableCell sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow
                    hover
                    onClick={() => router.push(paths.admin.ciFeeApprovalBundle())}
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
                      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }} noWrap title={ciFeeAmountDescription}>
                        {ciFeeAmountDescription || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1C2A6E' }}>
                        {fCurrency(ciFeeAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone="warning" label="For Approval" />
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
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:check-circle-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              No requests waiting on a decision
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              {ciFeeStatus === 'approved'
                ? `You already approved the CI Fee for ${applicantName}.`
                : ciFeeStatus === 'not-applicable'
                  ? `This application doesn't require a CI Fee.`
                  : `No officer has submitted a CI Fee for the current application yet.`}
            </Typography>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
