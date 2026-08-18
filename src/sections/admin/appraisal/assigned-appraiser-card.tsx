'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx, TONE_COLORS, type SemanticTone } from 'src/components/admin-ui';

import { AppraisalReportView } from './appraisal-report-view';

import type { AppraisalReportBundle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only summary of every report bundle's assigned appraiser, for the
// Appraisal Officer's own page — a quick "who's doing what" glance
// without needing to open the Collateral table's per-row Appraiser
// column or the Assign Appraiser modal. Renders the same bordered-row
// list convention used for the per-bundle fee rows on the Appraiser's own
// page (appraisal-appraiser-view.tsx), plus a per-bundle status derived
// from the batch feeApprovalStatus + that
// bundle's own report.uploadedAt: On Process / For Approval / For Report
// render as a static pill, but once the report is actually submitted
// there's no more "status" to show — that slot becomes a "View Report"
// button instead, opening that bundle's AppraisalReportView inside a
// Dialog. This page never renders the report inline — this modal is the
// only place the Officer sees a submitted report's contents. Nothing
// else on this card is editable — reassigning still only happens via the
// Collateral table's Assign Appraiser modal.
// ----------------------------------------------------------------------

const STATUS_COPY: Record<'on-process' | 'for-approval' | 'for-report', { label: string; tone: SemanticTone }> = {
  'on-process': { label: 'On Process', tone: 'neutral' },
  'for-approval': { label: 'For Approval', tone: 'warning' },
  'for-report': { label: 'For Report', tone: 'info' },
};

// null means "reported" — the report is submitted, so there's no more
// status to show; the caller renders a "View Report" button instead.
function bundleStatus(
  bundle: AppraisalReportBundle,
  feeApprovalStatus: string,
  feeSettled: boolean
): keyof typeof STATUS_COPY | null {
  if (bundle.report.uploadedAt) return null;
  if (feeApprovalStatus === 'approved' && feeSettled) return 'for-report';
  if (feeApprovalStatus === 'pending-approval') return 'for-approval';
  return 'on-process';
}

export function AssignedAppraiserCard() {
  const { review } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { reportBundles, feeApprovalStatus, paymentReceivedAt } = review.appraisal;
  const feeSettled = feeApprovalStatus === 'approved' && !!paymentReceivedAt;

  const [viewReportBundleId, setViewReportBundleId] = useState<string | null>(null);
  const viewReportBundle = reportBundles.find((bundle) => bundle.id === viewReportBundleId) ?? null;
  const viewReportTctNumbers = viewReportBundle
    ? appraisalGroups
        .filter((group) => viewReportBundle.tctGroupIds.includes(group.id))
        .map((group) => group.tctNumber)
    : [];

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Assigned Appraiser
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Every property&apos;s assigned appraiser at a glance.
      </Typography>

      <Stack spacing={1}>
        {reportBundles.map((bundle) => {
          const bundleTctNumbers = appraisalGroups
            .filter((group) => bundle.tctGroupIds.includes(group.id))
            .map((group) => group.tctNumber);
          const status = bundleStatus(bundle, feeApprovalStatus, feeSettled);
          const copy = status ? STATUS_COPY[status] : null;
          const toneColors = copy ? TONE_COLORS[copy.tone] : null;

          return (
            <Stack
              key={bundle.id}
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
              sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                  {bundleTctNumbers.join(', ')}
                </Typography>
                <Typography
                  sx={{ fontSize: 12, color: bundle.appraiserName ? '#5A6273' : '#8891A6' }}
                >
                  {bundle.appraiserName ?? 'No appraiser assigned'}
                </Typography>
                {bundle.targetCompletionDate && (
                  <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
                    Target completion: {new Date(bundle.targetCompletionDate).toLocaleDateString()}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flexShrink: 0 }}>
                {copy && toneColors ? (
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
                ) : (
                  <Button
                    onClick={() => setViewReportBundleId(bundle.id)}
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:eye-bold" width={16} />}
                    sx={{ ...outlinedNavyButtonSx, whiteSpace: 'nowrap' }}
                  >
                    View Report
                  </Button>
                )}
              </Stack>
            </Stack>
          );
        })}
      </Stack>

      <Dialog
        open={!!viewReportBundle}
        onClose={() => setViewReportBundleId(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>
              Appraisal Report
            </Typography>
            <IconButton size="small" onClick={() => setViewReportBundleId(null)} sx={{ mt: -0.5 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {viewReportBundle && (
            <AppraisalReportView bundleId={viewReportBundle.id} tctNumbers={viewReportTctNumbers} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
