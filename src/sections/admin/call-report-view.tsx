'use client';

import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { CallDetailsCard } from './call-report/call-details-card';
import { LoanDiscussionCard } from './call-report/loan-discussion-card';
import { ResidenceHouseholdCard } from './call-report/residence-household-card';
import { EmploymentBusinessCard } from './call-report/employment-business-card';
import { OrganizationMembershipCard } from './call-report/organization-membership-card';
import { QuickFinancialInfoCard } from './call-report/quick-financial-info-card';
import { PaymentBehaviorCard } from './call-report/payment-behavior-card';
import { OfficerObservationCard } from './call-report/officer-observation-card';
import { CollateralInformationCard } from './call-report/collateral-information-card';
import { AgreedNextStepsCard } from './call-report/agreed-next-steps-card';
import { LoanPackageProposalCard } from './call-report/loan-package-proposal-card';
import { CallSummaryCard } from './call-report/call-summary-card';
import { AdditionalRemarksCard } from './call-report/additional-remarks-card';
import { cardSx } from './call-report/call-report-types';

// ----------------------------------------------------------------------

export function CallReportView() {
  const router = useRouter();
  const { signUpData, application } = useRegistration();
  const { review, setCallReport } = useAdmin();

  if (!signUpData || !application.financialInfo || !application.personalInfo) return null;

  const { callReport } = review;

  const followUpRequired =
    callReport.callStatus === 'follow-up-needed' ||
    callReport.nextSteps.includes('schedule-follow-up-call');

  const canProceed =
    !!callReport.callStatus &&
    !!callReport.identityConfirmed &&
    !!callReport.preliminaryRecommendation &&
    (!followUpRequired || !!callReport.followUpDate);

  const handleProceed = (proceed: boolean) => {
    setCallReport({ approved: true });

    if (proceed) {
      router.push(paths.admin.transactionType(encodeURIComponent(signUpData.email)));
    } else {
      router.push(paths.admin.applications);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 2 · Call Report" reviewStep="callReport" />

      <Stack spacing={2.5}>
        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Call Report &amp; Loan Package Proposal
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
            Complete this structured interview live while on the call with the borrower.
          </Typography>
        </Box>

        <ApplicationDetailsCard />

        <CallDetailsCard />
        <LoanDiscussionCard />
        <ResidenceHouseholdCard />
        <EmploymentBusinessCard />
        <OrganizationMembershipCard />
        <QuickFinancialInfoCard />
        <PaymentBehaviorCard />
        <OfficerObservationCard />
        <CollateralInformationCard />
        <AgreedNextStepsCard />
        <LoanPackageProposalCard />
        <CallSummaryCard />
        <AdditionalRemarksCard />

        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {canProceed
              ? 'Approve the call report and decide whether to continue this application.'
              : 'Complete Call Status, Identity Confirmed, Preliminary Recommendation (and Follow-up Date if applicable) before proceeding.'}
          </Typography>

          <Stack direction="row" spacing={1.5}>
            <Button
              onClick={() => handleProceed(true)}
              disabled={!canProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{
                bgcolor: '#1C2A6E',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { bgcolor: '#14205A' },
              }}
            >
              Proceed
            </Button>
            <Button
              onClick={() => handleProceed(false)}
              variant="outlined"
              sx={{
                color: '#667085',
                borderColor: '#E1E4ED',
                borderRadius: '10px',
                px: 2.5,
              }}
            >
              Do Not Proceed
            </Button>
          </Stack>

          {review.callReport.approved && (
            <Typography sx={{ fontSize: 12.5, color: '#12B76A', fontWeight: 600, mt: 2 }}>
              Call report approved.
            </Typography>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
