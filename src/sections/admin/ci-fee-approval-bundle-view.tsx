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
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, type SemanticTone } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { getLoanNumber } from 'src/utils/get-loan-number';

import type { CiFeeStatus } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Detail page for the CI Fee Approver — reached by clicking the one row on
// the "Fee Approvals" list (ci-fee-approval-view.tsx), at
// paths.admin.ciFeeApprovalBundle(). Same list -> detail split as
// appraisal-fee-approval-view.tsx -> appraisal-fee-approval-bundle-view.tsx,
// adapted for CI Fee's flat per-application shape: `ciFeeStatus` lives on a
// single flat review.creditInvestigation object (no bundles/multi-property
// concept, unlike Appraisal), so there's no bundle ID to look up either —
// the `[bundleId]` route segment exists purely so this page's URL shape
// matches the other fee-approval flows' list -> detail split; it's a fixed
// placeholder ("current"), not a real ID, and this component ignores it.
//
// Header card matches the same standard summary-card shape as
// appraisal-fee-approval-bundle-view.tsx's own header — a 42px icon-avatar +
// applicant name as the title (15px/800) + "App No. … · email" subtitle, a
// StatusBadge top-right (derived from ciFeeStatus), then a bordered/tinted
// FactChip strip below for Description and CI Fee Amount. No "Properties"
// or "Requested On" chip here (unlike Appraisal's): CI Fee has no
// multi-property concept, and there's no dedicated CI-fee-request
// timestamp field in AdminContext to show one honestly. No "View
// Documents" button either — Appraisal's fee approval gates on
// per-property document completeness before approving; CI Fee is a flat
// fee amount/description with no equivalent document-completeness concept
// tied to the decision itself.
//
// Below the header, a "CI Fee Details" card holds the amount/description/
// remarks — same content ci-fee-approval-view.tsx used to render inline
// before this list -> detail split, just relocated onto its own card here.
// Approve/Decline live at the bottom of this same card: both still call
// plain setCreditInvestigation({ ciFeeStatus: ... }) (CI Fee has no
// dedicated approveCiFee()/declineCiFee() context methods the way Appraisal
// does — this mirrors the flat setter ci-fee-approval-view.tsx already used
// before this split).
// ----------------------------------------------------------------------

const CI_FEE_STATUS_COPY: Record<Exclude<CiFeeStatus, 'not-requested'>, { label: string; tone: SemanticTone }> = {
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  'not-applicable': { label: 'Not Applicable', tone: 'info' },
};

// Same label-over-value chip convention as appraisal-fee-approval-bundle-view.tsx's
// own FactChip (not exported from there — kept in sync manually rather
// than sharing a module, same as every other admin file that reimplements
// this exact shape).
function FactChip({ label, value }: { label: string; value?: string }) {
  return (
    <Stack spacing={0.35} sx={{ px: 1.75, py: 1, minWidth: 0, flex: '1 1 128px' }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#9AA2B4',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={value}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

export function CiFeeApprovalBundleView() {
  const { signUpData } = useRegistration();
  const { review, setCreditInvestigation } = useAdmin();
  const { ciFeeStatus, ciFeeAmount, ciFeeAmountDescription, ciFeeRemarks } = review.creditInvestigation;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  if (!signUpData || ciFeeStatus === 'not-requested') {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <Iconify icon="solar:wallet-money-bold-duotone" width={48} sx={{ color: '#C7CCDA', mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Request not found
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', mb: 2.5 }}>
            This request isn&apos;t in your current session.
          </Typography>
          <Button component={RouterLink} href={paths.admin.ciFeeApproval} variant="outlined">
            Back to Fee Approvals
          </Button>
        </Box>
      </Container>
    );
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const copy = CI_FEE_STATUS_COPY[ciFeeStatus];
  const isPending = ciFeeStatus === 'pending-approval';

  const confirmApprove = () => {
    setConfirmOpen(false);
    setCreditInvestigation({ ciFeeStatus: 'approved' });
    setJustApproved(true);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setDeclineReason('');
  };

  // A typed reason is required, then the request is reset back to
  // 'not-requested' (same re-entry point as an application that never
  // requested a fee) — the officer can re-request from the Credit
  // Investigation page with corrected terms.
  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setCreditInvestigation({
      ciFeeStatus: 'not-requested',
      ciFeeAmount: '',
      ciFeeAmountDescription: '',
      ciFeeRemarks: '',
      ciFeeDeclineReason: declineReason.trim(),
    });
    setDeclineOpen(false);
    setDeclineReason('');
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={RouterLink}
            href={paths.admin.ciFeeApproval}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
            sx={{ color: '#5A6273', fontWeight: 600, fontSize: 13, px: 0.5 }}
          >
            Back to Fee Approvals
          </Button>
        </Box>

        <Box sx={{ ...adminCardSx, p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" spacing={1.75} alignItems="center">
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
                <Iconify icon="solar:wallet-money-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                  {applicantName}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                  App No. {getLoanNumber(signUpData.email)} · {signUpData.email}
                </Typography>
              </Box>
            </Stack>
            <StatusBadge tone={copy.tone} label={copy.label} />
          </Stack>

          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              mt: 2.5,
              border: '1px solid #EEF0F5',
              borderRadius: '12px',
              bgcolor: '#FAFBFD',
              '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
            }}
          >
            <FactChip label="Description" value={ciFeeAmountDescription} />
            <FactChip label="CI Fee Amount" value={fCurrency(ciFeeAmount)} />
          </Stack>
        </Box>

        <Box sx={{ ...adminCardSx }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 2.5 }}>
            CI Fee Details
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ p: 1.75, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: '#F9FAFC' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                {applicantName}
              </Typography>
              {ciFeeAmountDescription && (
                <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.5 }}>
                  {ciFeeAmountDescription}
                </Typography>
              )}
              {ciFeeRemarks && (
                <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.5 }}>
                  Remarks: {ciFeeRemarks}
                </Typography>
              )}
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1C2A6E', flexShrink: 0 }}>
              {fCurrency(ciFeeAmount)}
            </Typography>
          </Stack>

          <Divider sx={{ my: 1.5, borderColor: '#EEF0F5' }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, py: 0.75 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#5A6273' }}>
              Total CI Fee
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1C2A6E' }}>
              {fCurrency(ciFeeAmount)}
            </Typography>
          </Stack>

          {isPending && !justApproved ? (
            <Stack spacing={1.25} sx={{ mt: 3 }}>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                This request is waiting on your decision before the CI Report can be prepared.
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
                >
                  Approve CI Fee
                </Button>
                <Button
                  onClick={() => setDeclineOpen(true)}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
                >
                  Decline CI Fee
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 3 }}>
              <Iconify icon="solar:check-circle-bold-duotone" width={20} sx={{ color: '#0C8A4F' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                {ciFeeStatus === 'approved'
                  ? `You already approved the CI Fee for ${applicantName}.`
                  : `Approved the CI Fee for ${applicantName}.`}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve CI Fee?"
        content={
          <>
            Approving unlocks the CI Report for <strong>{applicantName}</strong>
            {ciFeeAmount ? <> ({fCurrency(ciFeeAmount)})</> : null}. This can’t be undone from
            here.
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
            placeholder="Explain why this CI Fee request is being declined…"
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
