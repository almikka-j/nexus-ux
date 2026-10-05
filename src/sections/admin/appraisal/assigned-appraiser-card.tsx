'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS } from 'src/components/admin-ui';

import { AppraisalReportView } from './appraisal-report-view';
import { getAppraisalBundleStatus, APPRAISAL_BUNDLE_STATUS_COPY } from './appraisal-bundle-status';

// ----------------------------------------------------------------------
// Read-only summary of every report bundle's assigned appraiser, for the
// Appraisal Officer's own page — a quick "who's doing what" glance
// without needing to open the Collateral table's per-row Appraiser
// column or the Assign Appraiser modal. Renders the same bordered-row
// list convention used for the per-bundle fee rows on the Appraiser's own
// page (appraisal-appraiser-view.tsx), plus a per-bundle status from the
// shared getAppraisalBundleStatus() helper: On Process / For Approval /
// For Report render as a static pill. Once the report is actually
// submitted ('reported'), the row instead shows the full
// `AppraisalReportView` **inline** (a collapsible panel, expanded by
// default) so the Officer reviews it right here — there is no "View
// Report" button/modal anymore. Nothing else on this card is editable —
// reassigning still only happens via the Collateral table's Assign
// Appraiser modal.
// ----------------------------------------------------------------------

export function AssignedAppraiserCard() {
  const { review } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { reportBundles, paymentReceivedAt } = review.appraisal;

  // Which reported bundles are collapsed (default: all expanded).
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
          const feeSettled = bundle.feeApprovalStatus === 'approved' && !!paymentReceivedAt;
          const status = getAppraisalBundleStatus(bundle, feeSettled);
          const copy = status === 'reported' ? null : APPRAISAL_BUNDLE_STATUS_COPY[status];
          const toneColors = copy ? TONE_COLORS[copy.tone] : null;
          const isReported = status === 'reported';
          const collapsed = collapsedIds.has(bundle.id);

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
                sx={{ p: 1.5, cursor: isReported ? 'pointer' : 'default' }}
                onClick={isReported ? () => toggle(bundle.id) : undefined}
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
                    <>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          px: 1.1,
                          py: 0.4,
                          borderRadius: '999px',
                          bgcolor: TONE_COLORS.success.bg,
                          color: TONE_COLORS.success.text,
                          fontSize: 11.5,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Report submitted
                      </Box>
                      <IconButton
                        size="small"
                        aria-label={collapsed ? 'Show report' : 'Hide report'}
                        sx={{ color: '#8891A6' }}
                      >
                        <Iconify
                          icon="eva:chevron-down-fill"
                          width={18}
                          sx={{
                            transition: 'transform 0.15s ease',
                            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                          }}
                        />
                      </IconButton>
                    </>
                  )}
                </Stack>
              </Stack>

              {isReported && (
                <Collapse in={!collapsed} timeout="auto" unmountOnExit>
                  <Divider />
                  <Box sx={{ p: 2 }}>
                    <AppraisalReportView bundleId={bundle.id} tctNumbers={bundleTctNumbers} />
                  </Box>
                </Collapse>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
