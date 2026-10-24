'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { adminCardSx } from 'src/components/admin-ui';

import { AppraiserAssignmentCard, AppraisalReportSubmitCard } from './appraiser-assignment-card';

// ----------------------------------------------------------------------
// Read-only-by-locking Appraisal Report page for one bundle — opened in a
// new tab (window.open) from "View Appraisal Report" buttons (e.g.
// AssignedAppraiserCard) instead of a Dialog, matching the
// creditCheckingResult/callReportResult "result page in its own tab"
// convention. Deliberately renders the SAME AppraiserAssignmentCard /
// AppraisalReportSubmitCard pair the appraiser's own
// /admin/appraisal-appraiser/[bundleId] page renders (not
// AppraisalReportView's own "At a Glance" summary shell) — per explicit
// user request: this page must show exactly what the appraiser's own
// page shows, not a differently-formatted summary. Once a report is
// actually submitted, AppraiserAssignmentCard's own `editable`/`locked`
// logic (getBundleUploadedAt) already renders every field read-only, so
// this page is naturally read-only without needing its own locking.
// ----------------------------------------------------------------------

export function AppraisalReportResultView({ bundleId }: { bundleId: string }) {
  const { review } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);

  if (!bundle) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ ...adminCardSx, p: { xs: 4, md: 6 }, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Assignment not found
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6' }}>
            This appraisal assignment isn&apos;t in your current session.
          </Typography>
        </Box>
      </Container>
    );
  }

  const tctNumbers = appraisalGroups
    .filter((group) => bundle.tctGroupIds.includes(group.id))
    .map((group) => group.tctNumber);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, maxWidth: '1040px !important' }}>
      <Stack spacing={2.5}>
        <AppraiserAssignmentCard bundleId={bundleId} tctNumbers={tctNumbers} />
        <AppraisalReportSubmitCard bundleId={bundleId} />
      </Stack>
    </Container>
  );
}
