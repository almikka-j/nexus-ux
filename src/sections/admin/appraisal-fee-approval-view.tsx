'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { fCurrency } from 'src/utils/format-number';
import { getLoanNumber } from 'src/utils/get-loan-number';

// ----------------------------------------------------------------------
// Personal workspace for the Appraisal Fee Approver — framed as "My
// Approvals," their own inbox of Appraisal Fee requests waiting on a
// decision, not a generic admin-facing queue. Same role-workspace
// treatment as appraisal-appraiser-view.tsx's "My Assignments" and
// ci-fee-approval-view.tsx's "My Approvals": an "APPRAISAL FEE APPROVER"
// eyebrow label, first-person copy, and no sample filler rows — a real
// approver's inbox would never show other people's unrelated requests.
//
// Each pledged property proposes its own fee decision (Yes/No + amount)
// inline in the Assign Appraiser modal on the Appraisal page — this page
// never approves one property's fee in isolation. It reviews the whole
// batch (`review.appraisal.reportBundles`, each with its own
// feeNeeded/feeAmount/feeDescription/feeRemarks) as one request once the
// officer has submitted it (`feeApprovalStatus === 'pending-approval'`),
// and approves or declines all of it in a single action.
// ----------------------------------------------------------------------

export function AppraisalFeeApprovalView() {
  const { signUpData } = useRegistration();
  const { review, approveAppraisalFees, declineAppraisalFees } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { feeApprovalStatus, reportBundles } = review.appraisal;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const isPending = !!signUpData && feeApprovalStatus === 'pending-approval';

  const feeBundles = reportBundles.filter((bundle) => bundle.feeNeeded === 'yes');
  const totalFeeAmount = feeBundles.reduce((sum, bundle) => sum + (Number(bundle.feeAmount) || 0), 0);

  const confirmApprove = () => {
    setConfirmOpen(false);
    approveAppraisalFees();
    setJustApproved(true);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setDeclineReason('');
  };

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    declineAppraisalFees(declineReason.trim());
    setDeclineOpen(false);
    setDeclineReason('');
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box sx={{ px: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3448B0', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
            Appraisal Fee Approver
          </Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
            My Approvals
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#667085', mt: 0.5 }}>
            Appraisal fee requests from the officer, waiting on your decision.
          </Typography>
        </Box>

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
          <Box sx={{ ...adminCardSx, p: { xs: 3, md: 4 } }}>
            <Stack spacing={0.5} sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#14172A' }}>
                {applicantName}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                App No. {getLoanNumber(signUpData.email)} · {signUpData.email}
              </Typography>
            </Stack>

            <Stack spacing={1}>
              {reportBundles.map((bundle) => {
                const bundleTctNumbers = appraisalGroups
                  .filter((group) => bundle.tctGroupIds.includes(group.id))
                  .map((group) => group.tctNumber);
                return (
                  <Stack
                    key={bundle.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: '#F9FAFC' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                        {bundleTctNumbers.join(', ')}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
                        {bundle.appraiserName ?? 'No appraiser assigned'}
                      </Typography>
                      {bundle.feeNeeded === 'yes' && bundle.feeDescription && (
                        <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.25 }}>
                          {bundle.feeDescription}
                        </Typography>
                      )}
                    </Box>
                    {bundle.feeNeeded === 'yes' ? (
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1C2A6E', flexShrink: 0 }}>
                        {fCurrency(bundle.feeAmount)}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#8891A6', flexShrink: 0 }}>
                        No fee needed
                      </Typography>
                    )}
                  </Stack>
                );
              })}

              {feeBundles.length > 0 && (
                <>
                  <Divider sx={{ borderColor: '#EEF0F5' }} />
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, py: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#5A6273' }}>
                      Total Appraisal Fees
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1C2A6E' }}>
                      {fCurrency(totalFeeAmount)}
                    </Typography>
                  </Stack>
                </>
              )}
            </Stack>

            <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 2.5 }}>
              This request is waiting on your decision before the officer can advise the client to
              settle.
            </Typography>

            <Stack spacing={1} sx={{ mt: 2.5 }}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
                >
                  Approve Appraisal Fees
                </Button>
                <Button
                  onClick={() => setDeclineOpen(true)}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
                >
                  Decline Appraisal Fees
                </Button>
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
                There’s no real Head login in this prototype — approving or declining here
                simulates your review.
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Iconify icon="solar:check-circle-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Nothing waiting on you right now
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
              {justApproved
                ? `You already approved the Appraisal Fees for ${applicantName}.`
                : 'No officer has submitted Appraisal Fees for the current application yet.'}
            </Typography>
          </Box>
        )}
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve Appraisal Fees?"
        content={
          <>
            Approving lets the officer advise the client to settle the fees for{' '}
            <strong>{applicantName}</strong>
            {feeBundles.length > 0 ? <> ({fCurrency(totalFeeAmount)} total)</> : null}. This can’t be
            undone from here.
          </>
        }
        action={
          <Button variant="contained" onClick={confirmApprove} sx={confirmDialogActionToneSx.default}>
            Approve
          </Button>
        }
      />

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
            placeholder="Explain why this Appraisal Fee request is being declined…"
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
