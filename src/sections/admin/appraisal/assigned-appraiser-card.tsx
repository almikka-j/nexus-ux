'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useAdmin, getBundleUploadedAt, getBundleCollateralType } from 'src/auth/admin-context';
import type { AppraisalCollateralType } from 'src/auth/admin-context';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS, outlinedNavyButtonSx, StatusBadge } from 'src/components/admin-ui';

import { getAppraisalBundleStatus, APPRAISAL_BUNDLE_STATUS_COPY } from './appraisal-bundle-status';

const COLLATERAL_TYPE_LABEL: Record<AppraisalCollateralType, string> = {
  'real-estate': 'Real Estate',
  chattel: 'Chattel',
  machineries: 'Machineries',
};

// ----------------------------------------------------------------------
// Read-only summary of every report bundle's assigned appraiser, for the
// Appraisal Officer's own page — a quick "who's doing what" glance
// without needing to open the Collateral table's per-row Appraiser
// column or the Assign Appraiser modal. Renders the same bordered-row
// list convention used for the per-bundle fee rows on the Appraiser's own
// page (appraisal-appraiser-view.tsx), plus a per-bundle status from the
// shared getAppraisalBundleStatus() helper: On Process / For Approval /
// For Report render as a static pill. Once the report is actually
// submitted ('reported'), the row instead shows a "View Appraisal
// Report" button that opens the standalone read-only report page
// (appraisalReportResult) in a new tab via window.open — same
// new-tab convention as Application Details' own "View" actions —
// instead of expanding inline or opening a Dialog. Nothing else on this
// card is editable — reassigning still only happens via the Collateral
// table's Assign Appraiser modal.
// ----------------------------------------------------------------------

export function AssignedAppraiserCard() {
  const { review } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { reportBundles, paymentReceivedAt } = review.appraisal;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Assigned Appraiser
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Every property&apos;s assigned appraiser — submitted reports are shown in full below.
      </Typography>

      <Stack spacing={1.5}>
        {reportBundles.map((bundle) => {
          const bundleTctNumbers = appraisalGroups
            .filter((group) => bundle.tctGroupIds.includes(group.id))
            .map((group) => group.tctNumber);
          const bundleCollateralType = getBundleCollateralType(bundle, appraisalGroups);
          const feeSettled = bundle.feeApprovalStatus === 'approved' && !!paymentReceivedAt;
          const status = getAppraisalBundleStatus(bundle, feeSettled);
          const copy = status === 'reported' ? null : APPRAISAL_BUNDLE_STATUS_COPY[status];
          const toneColors = copy ? TONE_COLORS[copy.tone] : null;
          const isReported = status === 'reported';

          return (
            <Box
              key={bundle.id}
              sx={{ borderRadius: '10px', border: '1px solid #EEF0F5', overflow: 'hidden' }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
                sx={{ p: 1.5 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: bundle.appraiserName ? '#14172A' : '#8891A6',
                      }}
                    >
                      {bundle.appraiserName ?? 'No appraiser assigned'}
                    </Typography>
                    <StatusBadge tone="info" label={COLLATERAL_TYPE_LABEL[bundleCollateralType]} />
                  </Stack>
                  <Typography sx={{ fontSize: 12, color: '#5A6273' }}>
                    {bundleTctNumbers.join(', ')}
                  </Typography>
                  {bundle.targetCompletionDate && (
                    <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
                      Target completion: {new Date(bundle.targetCompletionDate).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>

                <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5} sx={{ flexShrink: 0 }}>
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
                      onClick={() =>
                        window.open(paths.admin.appraisalReportResult(bundle.id), '_blank', 'noopener,noreferrer')
                      }
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="solar:document-text-bold-duotone" width={16} />}
                      sx={{ ...outlinedNavyButtonSx, px: 1.5, flexShrink: 0 }}
                    >
                      View Appraisal Report
                    </Button>
                  )}
                  {isReported && getBundleUploadedAt(bundle) && (
                    <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
                      Submitted on {new Date(getBundleUploadedAt(bundle)!).toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
