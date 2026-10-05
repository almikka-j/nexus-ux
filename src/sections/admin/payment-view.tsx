'use client';

import { useMemo } from 'react';

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
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import type { PaymentDetails } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// A single unified queue of every *approved* fee request — CI Fee and
// Appraisal Fee alike — so an officer sees what still needs to be paid
// out without checking two different screens. See docs/210-request-payments.md.
//
// Row source: a CI Fee row exists whenever ciFeeStatus === 'approved'
// (still one flat row — CI Fee has no bundle concept). An Appraisal Fee
// row exists PER BUNDLE whose own feeApprovalStatus === 'approved' —
// since fee approval moved from one whole-application batch status down
// onto each bundle (see
// docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md),
// Payment follows the same per-bundle shape: two bundles on the same
// application can each be paid independently, on their own schedule. A
// `feeNeeded !== 'yes'` bundle never gets a row (nothing to pay).
//
// Rows are never hidden once paid — sorted unpaid-first, paid rows sink
// to the bottom of the same table (an explicit design decision, not the
// "settled rows disappear" pattern some other pages use), so there's
// always a visible record of what was already paid.
//
// Clicking a row navigates to a real detail page
// (paths.admin.paymentDetail(kind, bundleId), payment-detail-view.tsx) —
// same list -> detail split every other fee flow in this app uses. An
// earlier version opened a Dialog here instead; that was replaced with a
// full page so the full CI Fee / Appraisal Fee request details render
// alongside the payment form, matching how every other approval flow in
// this app shows its request.
// ----------------------------------------------------------------------

type PaymentRow =
  | {
      kind: 'ci-fee';
      amount: number;
      approvedAt: string | null;
      payment: PaymentDetails;
    }
  | {
      kind: 'appraisal-fee';
      bundleId: string;
      amount: number;
      approvedAt: string | null;
      payment: PaymentDetails;
    };

export function PaymentView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { ciFeeStatus, ciFeeAmount, ciFeeApprovedAt, ciFeePayment } = review.creditInvestigation;
  const { reportBundles } = review.appraisal;

  const approvedFeeBundles = reportBundles.filter(
    (bundle) => bundle.feeNeeded === 'yes' && bundle.feeApprovalStatus === 'approved'
  );

  const rows: PaymentRow[] = useMemo(() => {
    const result: PaymentRow[] = [];
    if (signUpData && ciFeeStatus === 'approved') {
      result.push({
        kind: 'ci-fee',
        amount: Number(ciFeeAmount) || 0,
        approvedAt: ciFeeApprovedAt,
        payment: ciFeePayment,
      });
    }
    if (signUpData) {
      approvedFeeBundles.forEach((bundle) => {
        result.push({
          kind: 'appraisal-fee',
          bundleId: bundle.id,
          amount: Number(bundle.feeAmount) || 0,
          approvedAt: bundle.feeApprovedAt,
          payment: bundle.feePayment,
        });
      });
    }
    // Unpaid rows first, paid rows sink to the bottom — nothing is ever
    // hidden once paid.
    return result.sort((a, b) => Number(!!a.payment.paidAt) - Number(!!b.payment.paidAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signUpData, ciFeeStatus, ciFeeAmount, ciFeeApprovedAt, ciFeePayment, approvedFeeBundles]);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const applicantAppNo = signUpData ? getLoanNumber(signUpData.email) : '';

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
              Payment
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Every approved CI Fee and Appraisal Fee request, in one place, ready to be paid.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Appraisal Officer
          </Typography>
        </Stack>

        <Stack spacing={2}>
          {rows.length > 0 ? (
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
                      <TableCell sx={{ width: '16%' }}>Type</TableCell>
                      <TableCell sx={{ width: '24%' }}>Applicant</TableCell>
                      <TableCell sx={{ width: '18%' }}>Amount</TableCell>
                      <TableCell sx={{ width: '18%' }}>Approved On</TableCell>
                      <TableCell sx={{ width: '18%' }}>Status</TableCell>
                      <TableCell sx={{ width: 44 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.kind === 'appraisal-fee' ? row.bundleId : row.kind}
                        hover
                        onClick={() =>
                          router.push(
                            row.kind === 'appraisal-fee'
                              ? paths.admin.paymentDetail('appraisal-fee', row.bundleId)
                              : paths.admin.paymentDetail('ci-fee')
                          )
                        }
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
                            {row.kind === 'ci-fee' ? 'CI Fee' : 'Appraisal Fee'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>{applicantName}</Typography>
                          <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>App No. {applicantAppNo}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1C2A6E' }}>
                            {fCurrency(row.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
                            {row.approvedAt ? new Date(row.approvedAt).toLocaleDateString() : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={row.payment.paidAt ? 'success' : 'warning'} label={row.payment.paidAt ? 'Paid' : 'For Payment'} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small">
                            <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 }, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                No fee requests are ready for payment yet.
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
