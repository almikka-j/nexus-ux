'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useAdmin, getBundleCollateralType } from 'src/auth/admin-context';

import { adminCardSx } from 'src/components/admin-ui';

import { ResultPageHeader } from '../result-page-header';
import { AppraisalReportView } from './appraisal-report-view';
import { AppraisalReportPreview } from './appraisal-report-preview';

// ----------------------------------------------------------------------
// Read-only Appraisal Report page for one bundle — opened in a new tab
// (window.open) from "View Appraisal Report" buttons (e.g.
// AssignedAppraiserCard) instead of a Dialog, matching the
// creditCheckingResult/callReportResult "result page in its own tab"
// convention — including the same ResultPageHeader banner (Back button,
// PG Finance branding, applicant name/App No.) those pages use.
//
// Per explicit user request, Real Estate bundles render the exact same
// content as the "Preview Appraisal Report" button inside the appraiser's
// own form (AppraisalReportPreview) — not AppraisalReportView's own
// summary. AppraisalReportPreview only supports Real Estate's
// AppraisalReport shape, so Chattel/Machineries bundles still fall back
// to AppraisalReportView (which already covers all 3 kinds) until an
// equivalent preview exists for those two kinds.
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

  const titleGroups = appraisalGroups.filter((group) => bundle.tctGroupIds.includes(group.id));
  const tctNumbers = titleGroups.map((group) => group.tctNumber);
  const realCollateralType = getBundleCollateralType(bundle, appraisalGroups);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <ResultPageHeader title="Appraisal Report" meta={`Covers ${tctNumbers.join(', ')}`} />
      <Box
        sx={{
          ...adminCardSx,
          p: { xs: 2.5, sm: 3.5, md: 4.5 },
          borderRadius: '0 0 16px 16px',
          borderTop: 'none',
          mb: 4,
        }}
      >
        {realCollateralType === 'real-estate' ? (
          <AppraisalReportPreview report={bundle.realEstateReport} titleGroups={titleGroups} />
        ) : (
          <AppraisalReportView bundleId={bundleId} tctNumbers={tctNumbers} />
        )}
      </Box>
    </Container>
  );
}
