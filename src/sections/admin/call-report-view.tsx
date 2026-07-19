'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { CollateralEntry } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { OfficerNotesCard } from './call-report/officer-notes-card';
import { CreditCheckingResultModal } from './call-report/credit-checking-result-modal';
import { CallDetailsCard } from './call-report/call-details-card';
import { BorrowerInterviewCard } from './call-report/borrower-interview-card';
import { FinancialDeclarationCard } from './call-report/financial-declaration-card';
import { OfficerObservationCard } from './call-report/officer-observation-card';
import { CollateralInformationCard } from './call-report/collateral-information-card';
import { LoanPackageProposalCard } from './call-report/loan-package-proposal-card';
import { AgreedNextStepsCard } from './call-report/agreed-next-steps-card';
import { CallSummaryCard } from './call-report/call-summary-card';
import { cardSx } from './call-report/call-report-types';

// ----------------------------------------------------------------------

export function CallReportView() {
  const router = useRouter();
  const { signUpData, application } = useRegistration();
  const { review, setCallReport } = useAdmin();
  const [resultModalOpen, setResultModalOpen] = useState(false);

  if (!signUpData || !application.financialInfo || !application.personalInfo) return null;

  const { callReport } = review;

  const canProceed =
    !!callReport.callStatus &&
    !!callReport.identityConfirmed &&
    !!callReport.preliminaryRecommendation &&
    (callReport.followUpRequired !== 'yes' || !!callReport.followUpDate);

  const handleProceed = (proceed: boolean) => {
    setCallReport({ approved: true });

    if (proceed) {
      router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
    } else {
      router.push(paths.admin.applications);
    }
  };

  // Fills every section of the call report with representative sample data
  // in one click, mirroring Initial Credit Checking's toggle — same button
  // relabels to "Remove Sample Data" and clears back to blank once the
  // report is filled (`canProceed` also gates the toggle direction there).
  const handleFillSampleData = () => {
    const loanAmount = application.financialInfo?.desiredLoanAmount ?? 0;
    const loanTerm = application.financialInfo?.loanTermMonths ?? 0;
    const loanPurpose = application.financialInfo?.loanPurpose ?? '';

    const sampleCollateral: CollateralEntry = {
      id: crypto.randomUUID(),
      type: 'real-estate',
      description: 'Residential lot with bungalow',
      registeredOwner: `${signUpData.firstName} ${signUpData.lastName}`,
      estimatedValue: String(loanAmount * 2),
      requiresAppraisal: 'yes',
    };

    setCallReport({
      clientType: 'new',
      callDate: new Date().toISOString().slice(0, 10),
      callTime: '14:30',
      callType: 'phone',
      placeOfCall: 'branch',
      placeOfCallOther: '',
      clientRepresentative: signUpData.firstName,
      pgRepresentative: application.assignedOfficer ?? 'Ramon Cruz',
      callStatus: 'completed',
      identityConfirmed: 'yes',
      loanPurposeConfirmation: 'confirmed',
      finalLoanPurpose: loanPurpose,
      specificUseOfProceeds: 'Home repairs and minor renovation',
      primaryRepaymentSource: 'salary',
      otherRepaymentSource: '',
      targetReleaseDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      yearsAtResidence: '3-5',
      numberOfDependents: '2',
      supportingMultipleFamilies: 'no',
      mainIncomeSource: 'employment',
      otherIncomeSource: '',
      employmentTenure: '3-5',
      incomeTrend: 'stable',
      isOrgMember: 'no',
      membershipType: '',
      organizationName: '',
      membershipYears: '',
      membershipStanding: '',
      declaredNetMonthlyIncome: '45000',
      otherMonthlyIncome: '0',
      estimatedMonthlyHouseholdExpenses: '15000',
      existingMonthlyLoanPayments: '3000',
      monthlyCreditCardPayments: '2000',
      otherMonthlyObligations: '0',
      officerObservations: ['cooperative', 'transparent', 'answers-consistent'],
      observationNotes: '',
      collateralOffered: 'yes',
      collateralEntries: [sampleCollateral],
      proposedLoanAmount: String(loanAmount),
      proposedLoanTerm: String(loanTerm),
      proposedLoanFacility: '',
      proposedInterestRate: '1.5',
      interestRateBasis: 'monthly',
      computationType: 'diminishing-balance',
      computationTypeOther: '',
      paymentFrequency: 'Monthly',
      estimatedAmortization: loanTerm ? String(Math.round(loanAmount / loanTerm)) : '',
      estimatedMaturityValue: String(loanAmount),
      proposedReleaseDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      finalUseOfProceeds: 'Home repairs and minor renovation',
      proposalPrimaryRepaymentSource: 'salary',
      collateralAssessment: 'sufficient',
      conditionsBeforeProceeding: ['income-verification', 'residence-verification'],
      preliminaryRecommendation: 'proceed-as-requested',
      recommendationReason: '',
      loanPackageNotes: '',
      followUpRequired: 'yes',
      followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      nextAction: 'verify-information',
      nextActionOther: '',
      nextStepsInstructions: 'Client to submit latest payslip within the week.',
      additionalRemarks: '',
    });
  };

  const handleClearSampleData = () => {
    setCallReport({
      clientType: '',
      callDate: '',
      callTime: '',
      callType: '',
      placeOfCall: '',
      placeOfCallOther: '',
      clientRepresentative: '',
      pgRepresentative: '',
      callStatus: '',
      identityConfirmed: '',
      loanPurposeConfirmation: '',
      finalLoanPurpose: '',
      specificUseOfProceeds: '',
      primaryRepaymentSource: '',
      otherRepaymentSource: '',
      targetReleaseDate: '',
      yearsAtResidence: '',
      numberOfDependents: '',
      supportingMultipleFamilies: '',
      mainIncomeSource: '',
      otherIncomeSource: '',
      employmentTenure: '',
      incomeTrend: '',
      isOrgMember: '',
      membershipType: '',
      organizationName: '',
      membershipYears: '',
      membershipStanding: '',
      declaredNetMonthlyIncome: '',
      otherMonthlyIncome: '',
      estimatedMonthlyHouseholdExpenses: '',
      existingMonthlyLoanPayments: '',
      monthlyCreditCardPayments: '',
      otherMonthlyObligations: '',
      officerObservations: [],
      observationNotes: '',
      collateralOffered: '',
      collateralEntries: [],
      proposedLoanAmount: '',
      proposedLoanTerm: '',
      proposedLoanFacility: '',
      proposedInterestRate: '',
      interestRateBasis: '',
      computationType: '',
      computationTypeOther: '',
      paymentFrequency: '',
      estimatedAmortization: '',
      estimatedMaturityValue: '',
      proposedReleaseDate: '',
      finalUseOfProceeds: '',
      proposalPrimaryRepaymentSource: '',
      collateralAssessment: '',
      conditionsBeforeProceeding: [],
      preliminaryRecommendation: '',
      recommendationReason: '',
      loanPackageNotes: '',
      followUpRequired: '',
      followUpDate: '',
      nextAction: '',
      nextActionOther: '',
      nextStepsInstructions: '',
      callSummary: '',
      callSummaryEdited: false,
      additionalRemarks: '',
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 2 · Call Report" reviewStep="callReport" />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard collapsible />
        <OfficerNotesCard />

        <Button
          onClick={() => setResultModalOpen(true)}
          variant="outlined"
          startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
          sx={{
            alignSelf: 'flex-start',
            color: '#1C2A6E',
            borderColor: '#C7CEEA',
            borderRadius: '10px',
            px: 2,
            '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
          }}
        >
          View Initial Credit Checking Result
        </Button>

        <CallDetailsCard />
        <BorrowerInterviewCard />
        <FinancialDeclarationCard />
        <OfficerObservationCard />
        <CollateralInformationCard />
        <LoanPackageProposalCard />
        <AgreedNextStepsCard />
        <CallSummaryCard />

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

      <Button
        onClick={canProceed ? handleClearSampleData : handleFillSampleData}
        variant="contained"
        startIcon={<Iconify icon="solar:magic-stick-3-bold-duotone" width={18} />}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
          bgcolor: '#1C2A6E',
          borderRadius: '999px',
          px: 2.5,
          py: 1.25,
          boxShadow: '0 8px 24px -8px rgba(20,23,42,0.4)',
          '&:hover': { bgcolor: '#14205A' },
        }}
      >
        {canProceed ? 'Remove Sample Data' : 'Fill with Sample Data'}
      </Button>

      <CreditCheckingResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
      />
    </Container>
  );
}
