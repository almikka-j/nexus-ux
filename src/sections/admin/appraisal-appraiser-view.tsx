'use client';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, TONE_COLORS, outlinedNavyButtonSx, type SemanticTone } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

// ----------------------------------------------------------------------
// This is the Appraiser's own workspace — framed as personal work ("My
// Assignments"), not an admin-facing approval queue. Unlike the other
// three Approval-role screens, this one only shows the signed-in
// appraiser's own work: no read-only sample filler rows
// (SAMPLE_APPLICATIONS entries belong to other applications this
// appraiser isn't assigned to), and no "isSample" framing anywhere. If
// there's no live application in the session, or nothing currently needs
// this appraiser's attention, that section simply reads as empty — same
// as a real appraiser's inbox with nothing pending.
//
// The table is one row per report bundle assigned to this appraiser,
// showing its TCT number(s), a per-bundle "Fee" status pill, and an
// overall progress status pill — list-only, nothing expands inline.
// Clicking a row navigates to that bundle's own detail page
// (appraisal-appraiser-bundle-view.tsx, at
// paths.admin.appraisalAppraiserBundle(bundleId)), where the fee-decision
// fields and the report form actually live. (An earlier version made each
// row expand inline via a Collapse, showing the fee fields + report form
// directly in the table; that was replaced with real navigation to a
// dedicated page per bundle instead of an in-place toggle.)
//
// The batch-level "Submit Fees for Approval" / "Advise Client" / "Payment
// Received" actions stay on this list page below the table, since they're
// single actions covering every bundle at once, not something that
// belongs on one bundle's own detail page.
//
// (Removed: an "Available for Assignment" section used to sit above this
// table, listing every pledged property not yet claimed by any appraiser
// with a "Claim" button that routed to the Officer's Collateral titles
// table/Assign Appraiser modal — claiming/assigning is the Officer's
// action there, not something this page needs to offer a shortcut into.)
// ----------------------------------------------------------------------

const STATUS_COPY: Record<'on-process' | 'for-approval' | 'for-report' | 'reported', { label: string; tone: SemanticTone }> = {
  'on-process': { label: 'On Process', tone: 'neutral' },
  'for-approval': { label: 'For Approval', tone: 'warning' },
  'for-report': { label: 'For Report', tone: 'info' },
  reported: { label: 'Reported', tone: 'success' },
};

const FEE_STATUS_COPY: Record<'no-fee' | 'not-submitted' | 'pending-approval' | 'approved' | 'settled', { label: string; tone: SemanticTone }> = {
  'no-fee': { label: 'No Fee', tone: 'neutral' },
  'not-submitted': { label: 'Draft', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'info' },
  settled: { label: 'Settled', tone: 'success' },
};

export function AppraisalAppraiserView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const {
    review,
    setAppraisal,
    setCreditInvestigation,
    submitAppraisalFeesForApproval,
    approveAppraisalFees,
    declineAppraisalFees,
  } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { feeApprovalStatus, clientNotifiedAt, paymentReceivedAt, reportBundles } = review.appraisal;
  const { ciFeeStatus } = review.creditInvestigation;

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReasonDraft, setDeclineReasonDraft] = useState('');
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [adviseClientOpen, setAdviseClientOpen] = useState(false);

  const feeSettled = feeApprovalStatus === 'approved' && !!paymentReceivedAt;
  const hasActiveAssignments = !!signUpData && reportBundles.length > 0;

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';

  const allGroupsAssigned = appraisalGroups.length > 0 && appraisalGroups.every((group) => group.reportId !== null);
  const allBundlesHaveFeeDecision =
    reportBundles.length > 0 &&
    reportBundles.every(
      (bundle) =>
        bundle.feeNeeded === 'no' ||
        (bundle.feeNeeded === 'yes' && Number(bundle.feeAmount) > 0 && !!bundle.feeDescription.trim())
    );
  const canSubmit = feeApprovalStatus === 'not-submitted' && allGroupsAssigned && allBundlesHaveFeeDecision;

  const feeBundles = reportBundles.filter((bundle) => bundle.feeNeeded === 'yes');
  const totalFeeAmount = feeBundles.reduce((sum, bundle) => sum + (Number(bundle.feeAmount) || 0), 0);

  const confirmFeeDecline = () => {
    if (!declineReasonDraft.trim()) return;
    declineAppraisalFees(declineReasonDraft.trim());
    setDeclineOpen(false);
    setDeclineReasonDraft('');
  };

  const confirmSubmitForApproval = () => {
    submitAppraisalFeesForApproval();
    setSubmitConfirmOpen(false);
  };

  const confirmAdviseClient = () => {
    const now = new Date().toISOString();
    setAppraisal({ clientNotifiedAt: now, sentToOdooAt: now });
  };

  // Simulated second-officer approval/decline, same convention as
  // credit-investigation-view.tsx's CI Fee page actions.
  useRegisterPageActions(
    useMemo(
      () =>
        feeApprovalStatus === 'pending-approval'
          ? [
              {
                key: 'simulate-appraisal-fee-approval',
                label: 'Simulate: Another Officer Approves Appraisal Fees',
                icon: 'solar:user-check-bold-duotone',
                color: '#0C8A4F',
                onClick: () => approveAppraisalFees(),
              },
              {
                key: 'simulate-appraisal-fee-decline',
                label: 'Simulate: Another Officer Declines Appraisal Fees',
                icon: 'solar:user-cross-bold-duotone',
                color: '#B32C22',
                onClick: () => setDeclineOpen(true),
              },
            ]
          : [],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [feeApprovalStatus]
    )
  );

  // Dev/testing shortcut: lets a tester who's already on the Appraiser
  // page fast-forward straight into the very first step of the whole
  // pipeline (Credit Investigation's CI Fee request) without navigating
  // back there — same simulated-request convention CiFeeCard's own "Yes,
  // Request CI Fee" uses, just with fixed sample values instead of a
  // typed-in amount/description. Only offered while it hasn't already
  // been requested, so it can't be used to stomp on further-along state
  // (pending-approval/approved/not-applicable).
  useRegisterPageActions(
    useMemo(
      () =>
        ciFeeStatus === 'not-requested'
          ? [
              {
                key: 'simulate-request-ci-fee',
                label: 'Simulate: Request CI Fee',
                icon: 'solar:wallet-money-bold-duotone',
                color: '#1C2A6E',
                onClick: () =>
                  setCreditInvestigation({
                    ciFeeStatus: 'pending-approval',
                    ciFeeAmount: '2500',
                    ciFeeAmountDescription: 'Credit investigation fee',
                    ciFeeRemarks: '',
                  }),
              },
            ]
          : [],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [ciFeeStatus]
    )
  );

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
              My Assignments
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
              Request your fee and submit the report for each property assigned to you, once the
              client has paid.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Appraiser Workspace
          </Typography>
        </Stack>

        {!signUpData ? (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:home-2-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing to work on yet
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
              There&apos;s no live application in this session yet. Start one from the Application List.
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
              {hasActiveAssignments ? (
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
                          <TableCell sx={{ width: '27%' }}>Collateral No.</TableCell>
                          <TableCell sx={{ width: '27%' }}>Applicant</TableCell>
                          <TableCell sx={{ width: '20%' }}>Appraisal Fee</TableCell>
                          <TableCell sx={{ width: '20%' }}>Status</TableCell>
                          <TableCell sx={{ width: 44 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportBundles.map((bundle) => {
                          const bundleTctNumbers = appraisalGroups
                            .filter((group) => bundle.tctGroupIds.includes(group.id))
                            .map((group) => group.tctNumber);
                          const status = bundle.report.uploadedAt
                            ? 'reported'
                            : feeApprovalStatus === 'approved' && feeSettled
                              ? 'for-report'
                              : feeApprovalStatus === 'pending-approval'
                                ? 'for-approval'
                                : 'on-process';
                          const copy = STATUS_COPY[status];
                          const toneColors = TONE_COLORS[copy.tone];

                          const feeStatusKey =
                            bundle.feeNeeded === 'no'
                              ? 'no-fee'
                              : feeSettled
                                ? 'settled'
                                : feeApprovalStatus === 'approved'
                                  ? 'approved'
                                  : feeApprovalStatus === 'pending-approval'
                                    ? 'pending-approval'
                                    : 'not-submitted';
                          const feeCopy = FEE_STATUS_COPY[feeStatusKey];
                          const feeToneColors = TONE_COLORS[feeCopy.tone];

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
                                  {bundleTctNumbers.join(', ')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
                                  {applicantName}
                                </Typography>
                                <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
                                  App No. {getLoanNumber(signUpData.email)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    px: 1.1,
                                    py: 0.4,
                                    borderRadius: '999px',
                                    bgcolor: feeToneColors.bg,
                                    color: feeToneColors.text,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {feeCopy.label}
                                </Box>
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
                    No active assignments right now — check back once a property is assigned to
                    you.
                  </Typography>
                </Box>
              )}
            </Stack>

            {hasActiveAssignments && feeApprovalStatus === 'not-submitted' && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1.5}
                sx={{ ...adminCardSx }}
              >
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                    Submit fees for approval
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
                    Decide each property&apos;s fee above, then submit the whole batch at once.
                  </Typography>
                </Box>
                <Button
                  onClick={() => setSubmitConfirmOpen(true)}
                  disabled={!canSubmit}
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="solar:send-square-bold" width={16} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', flexShrink: 0, '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
                >
                  Submit Fees for Approval
                </Button>
              </Stack>
            )}

            {hasActiveAssignments && feeApprovalStatus === 'approved' && !feeSettled && (
              <Stack spacing={1.25} sx={{ ...adminCardSx }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1.5}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                      Advise client to settle the Appraisal fees
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
                      {clientNotifiedAt
                        ? `Sent ${new Date(clientNotifiedAt).toLocaleString()} — request details sent to Odoo, payment link sent via Sendit.`
                        : 'Sends a payment link (Sendit) and notifies Odoo — both simulated.'}
                    </Typography>
                  </Box>
                  {!clientNotifiedAt && (
                    <Button
                      onClick={() => setAdviseClientOpen(true)}
                      variant="contained"
                      size="small"
                      sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
                    >
                      Advise Client
                    </Button>
                  )}
                </Stack>
                {clientNotifiedAt && !paymentReceivedAt && (
                  <Button
                    onClick={() => setAppraisal({ paymentReceivedAt: new Date().toISOString() })}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:card-recive-bold-duotone" width={16} />}
                    sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start', bgcolor: 'common.white' }}
                  >
                    Simulate: Payment Received (Sendit)
                  </Button>
                )}
              </Stack>
            )}
          </>
        )}
      </Stack>

      <ConfirmDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Reason for declining Appraisal Fees"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={declineReasonDraft}
            onChange={(event) => setDeclineReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineReasonDraft.trim()}
            onClick={confirmFeeDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />

      <ConfirmDialog
        open={submitConfirmOpen}
        onClose={() => setSubmitConfirmOpen(false)}
        title="Send Appraisal Fees for Approval?"
        content={
          <>
            This sends all {reportBundles.length} propert
            {reportBundles.length === 1 ? 'y' : 'ies'}&apos; appraiser assignment and fee decision to
            the Appraisal Fee Approver as one request
            {feeBundles.length > 0 ? (
              <>
                {' '}
                — total <strong>{fCurrency(totalFeeAmount)}</strong> across {feeBundles.length}{' '}
                propert{feeBundles.length === 1 ? 'y' : 'ies'} needing a fee
              </>
            ) : null}
            . You won&apos;t be able to change any bundle&apos;s appraiser or fee decision while
            it&apos;s pending approval.
          </>
        }
        action={
          <Button variant="contained" onClick={confirmSubmitForApproval} sx={confirmDialogActionToneSx.default}>
            Send for Approval
          </Button>
        }
      />

      <Dialog
        open={adviseClientOpen}
        onClose={() => setAdviseClientOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>
                Advise Client to Settle
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                Sends a payment link (Sendit) and notifies Odoo — both simulated.
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setAdviseClientOpen(false)} sx={{ mt: -0.5 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {clientNotifiedAt ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 3 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: TONE_COLORS.success.bg }}>
                <Iconify icon="solar:check-circle-bold" width={26} sx={{ color: TONE_COLORS.success.solid }} />
              </Box>
              <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#14172A' }}>
                Client advised to settle
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', textAlign: 'center' }}>
                Sent {new Date(clientNotifiedAt).toLocaleString()} — request details sent to Odoo,
                payment link sent via Sendit.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: 13, color: '#5A6273' }}>
                This will notify the client that their Appraisal Fees are ready to be settled, for{' '}
                {feeBundles.length} propert{feeBundles.length === 1 ? 'y' : 'ies'} needing a fee.
              </Typography>
              <Stack spacing={1}>
                {feeBundles.map((bundle) => {
                  const bundleTctNumbers = appraisalGroups
                    .filter((group) => bundle.tctGroupIds.includes(group.id))
                    .map((group) => group.tctNumber);
                  return (
                    <Stack
                      key={bundle.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #EEF0F5' }}
                    >
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A' }}>
                        {bundleTctNumbers.join(', ')}
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1C2A6E' }}>
                        {fCurrency(bundle.feeAmount)}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
              <Divider sx={{ borderColor: '#EEF0F5' }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  Total Appraisal Fees
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1C2A6E' }}>
                  {fCurrency(totalFeeAmount)}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <Stack direction="row" spacing={1.25} sx={{ p: 2.5, pt: 1.5 }}>
          {clientNotifiedAt ? (
            <Button
              onClick={() => setAdviseClientOpen(false)}
              fullWidth
              variant="contained"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                onClick={confirmAdviseClient}
                fullWidth
                variant="contained"
                sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
              >
                Send
              </Button>
              <Button onClick={() => setAdviseClientOpen(false)} variant="outlined" sx={outlinedNavyButtonSx}>
                Cancel
              </Button>
            </>
          )}
        </Stack>
      </Dialog>
    </Container>
  );
}
