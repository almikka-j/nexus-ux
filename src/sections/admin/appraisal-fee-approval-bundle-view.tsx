'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { FeeApprovalStatus } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, type SemanticTone } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { fCurrency } from 'src/utils/format-number';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { APPRAISAL_DOC_META } from './requirement-checklist-docs';
import { ReadOnlyRequirementDocRow } from './credit-investigation/credit-investigation-doc-row';

// ----------------------------------------------------------------------
// Detail page for the Appraisal Fee Approver — reached by clicking one
// Appraisal Fee row on the merged "Fee Approvals" list
// (fee-approvals-view.tsx), at
// paths.admin.feeApprovalsDetail('appraisal-fee', bundleId). Fee approval
// moved from one whole-application batch status to one status PER bundle
// (see docs/superpowers/specs/2026-09-14-per-bundle-appraisal-fee-approval-design.md),
// so this page now looks up ONE bundle by `bundleId` — same convention
// appraisal-appraiser-bundle-view.tsx already uses for its own per-bundle
// lookup — instead of reading review.appraisal's old batch fields
// directly. Rendered by the `/admin/fee-approvals/[kind]/[[...bundleId]]`
// route.
//
// Header card matches the system's standard summary-card shape (same as
// appraisal-appraiser-bundle-view.tsx's own header) — a 42px icon-avatar +
// applicant name as the title (15px/800) + "App No. … · email" subtitle, a
// StatusBadge top-right (derived from this bundle's own feeApprovalStatus),
// then a bordered/tinted FactChip strip below (local copy of
// appraisal-appraiser-bundle-view.tsx's own unexported FactChip — same
// 11px uppercase label / 13.5px bold value shape, kept in sync manually
// rather than sharing a module, matching this codebase's convention for
// this exact component) for Properties (this bundle's own TCT count),
// Appraisal Fee, and Requested On.
//
// Below the FactChip strip, a `Divider` then a **"View Appraisal
// Documents"** button — matching the Call Report page's own collapsible
// summary card (`ApplicationDetailsCard`, `application-details-card.tsx`,
// rendered on `call-report-view.tsx`): header row, then the
// bordered/tinted FactChip strip, then a `Divider`, then a row of compact
// outlined navy buttons sitting left-aligned at the bottom, NOT one
// full-width button. The header card's own outer padding also matches
// that reference exactly — `p: { xs: 2.5, md: 3 }`. This button opens a
// read-only Dialog listing every APPRAISAL_DOC_META document for this
// one bundle's TCT groups (same `ReadOnlyRequirementDocRow` component
// appraisal-appraiser-bundle-view.tsx's own Appraisal Documents section
// uses).
//
// Below that, an "Appraisal Fee Details" card holds this one bundle's own
// TCT numbers, appraiser (bold navy, `#1C2A6E`), and fee amount/
// description — this is the same content the old view rendered for every
// bundle in a loop; now there's exactly one bundle per detail page, so no
// loop or running total is needed. Approve/Decline live at the bottom of
// this same card, calling the per-bundle
// approveAppraisalBundleFee(bundleId)/declineAppraisalBundleFee(bundleId,
// reason) context methods — each applies to only this one bundle, not
// every bundle on the application.
// ----------------------------------------------------------------------

const FEE_APPROVAL_STATUS_COPY: Record<FeeApprovalStatus, { label: string; tone: SemanticTone }> = {
  'not-submitted': { label: 'Not Submitted', tone: 'neutral' },
  'pending-approval': { label: 'For Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  declined: { label: 'Declined', tone: 'error' },
};

// Same label-over-value chip convention as appraisal-appraiser-bundle-view.tsx's
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

export function AppraisalFeeApprovalBundleView({ bundleId }: { bundleId: string }) {
  const { signUpData } = useRegistration();
  const { review, approveAppraisalBundleFee, declineAppraisalBundleFee } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { reportBundles } = review.appraisal;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [docsOpen, setDocsOpen] = useState(false);

  const bundle = reportBundles.find((b) => b.id === bundleId);

  if (!signUpData || !bundle) {
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
          <Button component={RouterLink} href={paths.admin.feeApprovals} variant="outlined">
            Back to Fee Approvals
          </Button>
        </Box>
      </Container>
    );
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const propertyCount = bundle.tctGroupIds.length;
  const bundleTctNumbers = appraisalGroups
    .filter((group) => bundle.tctGroupIds.includes(group.id))
    .map((group) => group.tctNumber);
  const copy = FEE_APPROVAL_STATUS_COPY[bundle.feeApprovalStatus];
  const isPending = bundle.feeApprovalStatus === 'pending-approval';

  const confirmApprove = () => {
    setConfirmOpen(false);
    approveAppraisalBundleFee(bundle.id);
  };

  const closeDecline = () => {
    setDeclineOpen(false);
    setDeclineReason('');
  };

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    declineAppraisalBundleFee(bundle.id, declineReason.trim());
    setDeclineOpen(false);
    setDeclineReason('');
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={RouterLink}
            href={paths.admin.feeApprovals}
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
            <FactChip label="Properties" value={String(propertyCount)} />
            <FactChip label="Appraisal Fee" value={fCurrency(bundle.feeAmount)} />
            <FactChip
              label="Requested On"
              value={bundle.feeSubmittedAt ? new Date(bundle.feeSubmittedAt).toLocaleDateString() : undefined}
            />
          </Stack>

          <Divider sx={{ my: 2.5, borderColor: '#EEF0F5' }} />

          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: 1, minWidth: 0 }}>
            <Button
              onClick={() => setDocsOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
              sx={{
                color: '#1C2A6E',
                borderColor: '#C7CEEA',
                borderRadius: '10px',
                px: 2.25,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
              }}
            >
              View Appraisal Documents
            </Button>
          </Stack>
        </Box>

        <Box sx={{ ...adminCardSx }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 2.5 }}>
            Appraisal Fee Details
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
                {bundleTctNumbers.join(', ')}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1C2A6E', mt: 0.5 }}>
                {bundle.appraiserName ?? 'No appraiser assigned'}
              </Typography>
              {bundle.feeDescription && (
                <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.5 }}>{bundle.feeDescription}</Typography>
              )}
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1C2A6E', flexShrink: 0 }}>
              {fCurrency(bundle.feeAmount)}
            </Typography>
          </Stack>

          {isPending ? (
            <Stack spacing={1.25} sx={{ mt: 3 }}>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                This request is waiting on your decision before the officer can advise the client to
                settle.
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  variant="contained"
                  startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                  sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
                >
                  Approve Appraisal Fee
                </Button>
                <Button
                  onClick={() => setDeclineOpen(true)}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
                  sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
                >
                  Decline Appraisal Fee
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 3 }}>
              <Iconify
                icon={
                  bundle.feeApprovalStatus === 'approved'
                    ? 'solar:check-circle-bold-duotone'
                    : 'solar:info-circle-bold-duotone'
                }
                width={20}
                sx={{ color: bundle.feeApprovalStatus === 'approved' ? '#0C8A4F' : '#8891A6' }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                {bundle.feeApprovalStatus === 'approved'
                  ? `Approved the Appraisal Fee for ${applicantName}.`
                  : bundle.feeApprovalStatus === 'declined'
                    ? 'This request was declined — the appraiser has been asked to revise it.'
                    : `No Appraisal Fee has been submitted for ${applicantName} yet.`}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve Appraisal Fee?"
        content={
          <>
            Approving lets the officer advise the client to settle this fee for{' '}
            <strong>{applicantName}</strong> ({fCurrency(bundle.feeAmount)}). This can’t be undone from
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

      <Dialog
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>
                Appraisal Documents
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.5 }}>
                Every document submitted for this request, read-only.
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setDocsOpen(false)} sx={{ mt: -0.5, mr: -0.5 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 0.5, pb: 3 }}>
          <Stack spacing={2.5}>
            {appraisalGroups
              .filter((group) => bundle.tctGroupIds.includes(group.id))
              .map((group) => (
                <Box key={group.id} sx={{ border: '1px solid #EEF0F5', borderRadius: '12px', p: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.25 }}>
                    {group.tctNumber}
                  </Typography>
                  <Stack spacing={1.25}>
                    {APPRAISAL_DOC_META.map((meta) => {
                      const doc = group.documents.find((groupDoc) => groupDoc.key === meta.key);
                      if (!doc) return null;
                      return (
                        <ReadOnlyRequirementDocRow
                          key={meta.key}
                          label={meta.label}
                          doc={doc}
                          applicantName={applicantName}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
