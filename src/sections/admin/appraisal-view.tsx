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
import { AppraisalFeeCard } from './appraisal/appraisal-fee-card';
import { HeadApprovalCard } from './appraisal/head-approval-card';
import { PassFailCard } from './appraisal/pass-fail-card';
import { AppraiserAssignmentCard } from './appraisal/appraiser-assignment-card';
import { ReadOnlyRequirementDocRow } from './credit-investigation/credit-investigation-doc-row';

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
  const { feeStatus, paymentReceivedAt, headApprovalStatus, report, passed, failReason } =
    review.appraisal;

  if (!signUpData) return null;

  if (passed === false) {
    return <FailedOutcome reason={failReason} />;
  }

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;

  const feeResolved = feeStatus === 'not-applicable' || (feeStatus === 'approved' && !!paymentReceivedAt);
  const reportSubmitted = !!report.uploadedAt;
  const headApproved = headApprovalStatus === 'approved';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 5 · Appraisal" reviewStep="appraisal" hideApplicationCard />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard collapsible officerNotesProcess="Appraisal" />

        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Pledged Properties
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Endorsed documents collected during Requirement Checklist, for reference during
            appraisal.
          </Typography>

          {appraisalNotApplicable ? (
            <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
              This application has no pledged real-estate collateral.
            </Typography>
          ) : (
            <Stack spacing={3}>
              {appraisalGroups.map((group) => (
                <Stack key={group.id} spacing={1.25}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                    {group.tctNumber}
                  </Typography>
                  <Stack spacing={1.25}>
                    {group.documents.map((doc) => (
                      <ReadOnlyRequirementDocRow
                        key={doc.key}
                        label={doc.key}
                        doc={doc}
                        applicantName={applicantName}
                      />
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>

        <AppraisalFeeCard />

        {feeResolved ? (
          <AppraiserAssignmentCard />
        ) : (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Resolve the Appraisal Fee above to unlock appraiser assignment.
            </Typography>
          </Box>
        )}

        {feeResolved && reportSubmitted ? (
          <HeadApprovalCard />
        ) : feeResolved ? (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Submit the appraisal report above to unlock Head Approval.
            </Typography>
          </Box>
        ) : null}

        {headApproved ? (
          <PassFailCard onFailed={() => {}} />
        ) : feeResolved && reportSubmitted ? (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Head Approval must approve the report above to unlock the Pass/Fail decision.
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Container>
  );
}
