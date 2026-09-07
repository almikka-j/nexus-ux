// src/sections/admin/appraisal-view.tsx
'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx } from 'src/components/admin-ui';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { PassFailCard } from './appraisal/pass-fail-card';
import { AppraisalTctTable } from './appraisal/appraisal-tct-table';
import { AssignedAppraiserCard } from './appraisal/assigned-appraiser-card';

// ----------------------------------------------------------------------

function FailedOutcome({ reason }: { reason: string }) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack
        alignItems="center"
        textAlign="center"
        spacing={2}
        sx={{ ...adminCardSx, p: { xs: 4, md: 6 } }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#FDE2DF',
          }}
        >
          <Iconify icon="solar:close-circle-bold" width={26} sx={{ color: '#B32C22' }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
          Process stopped
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 460 }}>
          The appraisal failed: {reason}. Credit Investigation and Financial Evaluation have been
          halted, and the client has been notified by email.
        </Typography>
        <Button
          component={RouterLink}
          href={paths.admin.applications}
          variant="outlined"
          sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', mt: 0.5 }}
        >
          Back to Application List
        </Button>
      </Stack>
    </Container>
  );
}

export function AppraisalView() {
  const { signUpData } = useRegistration();
  const { review } = useAdmin();
  const { appraisalGroups, appraisalNotApplicable } = review.requirementChecklist;
  const { headApprovalStatus, reportBundles, passed, failReason } = review.appraisal;

  if (!signUpData) return null;

  if (passed === false) {
    return <FailedOutcome reason={failReason} />;
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;

  // The Appraisal Officer proposes each bundle's fee decision inline in
  // the Assign Appraiser modal, but deciding/submitting the batch fee
  // request lives entirely on the Appraisal Appraiser page
  // (appraisal-appraiser-view.tsx) now — it's the Appraiser's job to
  // actually request the fee, not the Officer's, so this page never
  // renders that UI. Report creation/upload is on the same Appraiser page
  // too; a submitted report's contents are shown inline by
  // AssignedAppraiserCard (a collapsible panel per reported bundle — see
  // assigned-appraiser-card.tsx), no modal.
  //
  // Head Approval of the submitted report is likewise not this page's
  // job anymore — that decision is made entirely on the "Appraisal -
  // Approver Report" page (appraisal-approver-view.tsx, under the
  // "Request" nav dropdown), so this page never renders HeadApprovalCard.
  // It still reads headApprovalStatus directly off review.appraisal to
  // gate Pass/Fail, since both pages share the same underlying state —
  // once the Approver approves the report there, the Pass/Fail decision
  // unlocks here immediately with no extra step in between.
  const allGroupsAssigned = appraisalGroups.every((group) => group.reportId !== null);
  const allBundlesSubmitted = reportBundles.every((bundle) => !!bundle.report.uploadedAt);
  const reportSubmitted =
    appraisalNotApplicable || (allGroupsAssigned && reportBundles.length > 0 && allBundlesSubmitted);
  const headApproved = headApprovalStatus === 'approved';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 5 · Appraisal" reviewStep="appraisal" hideApplicationCard />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard collapsible officerNotesProcess="Appraisal" />

        {appraisalNotApplicable ? (
          <Box sx={adminCardSx}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Pledged Properties
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
              This application has no pledged real-estate collateral.
            </Typography>
          </Box>
        ) : (
          <AppraisalTctTable applicantName={applicantName} />
        )}

        {!appraisalNotApplicable && reportBundles.length > 0 && <AssignedAppraiserCard />}

        {headApproved && reportSubmitted && <PassFailCard onFailed={() => {}} />}
      </Stack>
    </Container>
  );
}
