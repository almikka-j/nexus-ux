'use client';

import { useMemo, useState } from 'react';
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

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { CreditCheckingResultModal } from './call-report/credit-checking-result-modal';
import { CallReportResultModal } from './call-report/call-report-result-modal';
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
import { buildCallSummary } from './call-report/call-report-summary';
import { buildCallReportAiRecommendation } from './call-report/call-report-risk';
import { cardSx } from './call-report/call-report-types';
import type { CallReportRiskLevel } from './call-report/call-report-risk';

// ----------------------------------------------------------------------

const CALL_REPORT_RISK_STYLES: Record<
  CallReportRiskLevel,
  { bg: string; color: string; icon: string; label: string }
> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low risk' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Needs a closer look' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High risk' },
};

export function CallReportView() {
  const router = useRouter();
  const { signUpData, application } = useRegistration();
  const { review, setCallReport } = useAdmin();
  const [creditCheckingResultModalOpen, setCreditCheckingResultModalOpen] = useState(false);
  const [callReportResultModalOpen, setCallReportResultModalOpen] = useState(false);

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
    if (!signUpData) return;
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
    if (!signUpData) return;
    const loanAmount = application.financialInfo?.desiredLoanAmount ?? 0;
    const loanTerm = application.financialInfo?.loanTermMonths ?? 0;
    const loanPurpose = application.financialInfo?.loanPurpose ?? '';

    const sampleCollateral: CollateralEntry = {
      id: crypto.randomUUID(),
      type: 'real-estate',
      description: 'Residential lot with bungalow',
      quantity: '1',
      registeredOwner: `${signUpData.firstName} ${signUpData.lastName}`,
      ownerRelationship: 'Self',
      location: 'Quezon City, Metro Manila',
      estimatedValue: String(loanAmount * 2),
      ownershipDocsAvailable: 'yes',
      existingLien: 'no',
      requiresAppraisal: 'yes',
    };

    setCallReport({
      clientType: 'new',
      callDate: new Date().toISOString().slice(0, 10),
      callTime: '14:30',
      callType: 'phone',
      placeOfCall: 'other',
      placeOfCallOther: 'PG Finance office – conference room',
      clientRepresentative: signUpData.firstName,
      pgRepresentative: application.assignedOfficer ?? 'Ramon Cruz',
      callStatus: 'completed',
      identityConfirmed: 'yes',
      loanPurposeConfirmation: 'confirmed',
      finalLoanPurpose: loanPurpose,
      specificUseOfProceeds: 'Home repairs and minor renovation',
      targetReleaseDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      primaryRepaymentSource: 'salary',
      otherRepaymentSource: '',
      clientUnderstanding: ['interest-rate', 'monthly-amortization', 'loan-term'],
      clientConcerns: ['processing-time'],
      concernNotes: 'Client asked about how quickly the loan can be released.',
      yearsAtResidence: '3-5',
      residenceStatus: 'owned',
      residenceStatusOther: '',
      numberOfDependents: '2',
      numberOfIncomeEarners: '2',
      supportingMultipleFamilies: 'no',
      mainIncomeSource: 'employment',
      otherIncomeSource: '',
      employmentTenure: '3-5',
      incomeStability: 'stable',
      incomeTrend: 'stable',
      isRenewal: 'no',
      incomeChangeSincePrevious: 'not-verified',
      previousMonthlyIncome: '',
      currentMonthlyIncome: '',
      incomeChangeEffectiveDate: '',
      isOrgMember: 'no',
      membershipType: '',
      organizationName: '',
      membershipYears: '',
      membershipStanding: '',
      declaredGrossMonthlyIncome: '52000',
      declaredNetMonthlyIncome: '45000',
      otherRecurringMonthlyIncome: '0',
      estimatedMonthlyHouseholdExpenses: '15000',
      existingMonthlyLoanPayments: '3000',
      monthlyCreditCardPayments: '2000',
      otherRecurringMonthlyObligations: '0',
      supportingDocsAvailable: ['payslip', 'coe', 'bank-statement'],
      electricityPayment: 'fully-paid-on-time',
      creditCardPayment: 'pays-more-than-minimum',
      otherLoanRepayment: 'on-time',
      hasReturnedChecks: 'no',
      hasPastDueObligations: 'no',
      hasPendingCases: 'no',
      paymentBehaviorExplanation: '',
      officerObservations: ['cooperative', 'transparent', 'answers-consistent'],
      observationNotes: '',
      collateralOffered: 'yes',
      collateralEntries: [sampleCollateral],
      nextSteps: ['submit-proof-of-income', 'proceed-to-next-process'],
      responsibleParty: 'borrower',
      nextStepsDueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      followUpDate: '',
      nextStepsInstructions: 'Client to submit latest payslip within the week.',
      proposedLoanAmount: String(loanAmount),
      proposedLoanTerm: String(loanTerm),
      proposedLoanFacility: 'Personal Loan',
      proposedInterestRate: '1.5',
      interestRateBasis: 'monthly',
      computationType: 'diminishing-balance',
      computationTypeOther: '',
      paymentFrequency: 'monthly',
      paymentFrequencyOther: '',
      numberOfPayments: String(loanTerm),
      firstPaymentDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      proposedReleaseDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      gracePeriod: '0',
      finalUseOfProceeds: 'Regular',
      proposalPrimaryRepaymentSource: 'salary',
      secondaryRepaymentSource: '',
      estimatedAmortization: loanTerm ? String(Math.round(loanAmount / loanTerm)) : '',
      estimatedTotalInterest: loanAmount ? String(Math.round(loanAmount * 0.15)) : '',
      estimatedTotalRepayment: loanAmount ? String(Math.round(loanAmount * 1.15)) : '',
      estimatedMaturityValue: String(loanAmount),
      preliminaryDti: '35',
      disposableIncomeAfterAmortization: '10000',
      adjustmentReason: '',
      adjustmentReasonOther: '',
      collateralAssessment: 'sufficient',
      requiredDocuments: ['latest-payslip', 'coe', 'bank-statements'],
      conditionsBeforeProceeding: ['income-verification', 'residence-verification'],
      preliminaryRecommendation: 'proceed-as-requested',
      recommendationReason: '',
      loanPackageNotes: '',
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
      targetReleaseDate: '',
      primaryRepaymentSource: '',
      otherRepaymentSource: '',
      clientUnderstanding: [],
      clientConcerns: [],
      concernNotes: '',
      yearsAtResidence: '',
      residenceStatus: '',
      residenceStatusOther: '',
      numberOfDependents: '',
      numberOfIncomeEarners: '',
      supportingMultipleFamilies: '',
      mainIncomeSource: '',
      otherIncomeSource: '',
      employmentTenure: '',
      incomeStability: '',
      incomeTrend: '',
      isRenewal: '',
      incomeChangeSincePrevious: '',
      previousMonthlyIncome: '',
      currentMonthlyIncome: '',
      incomeChangeEffectiveDate: '',
      isOrgMember: '',
      membershipType: '',
      organizationName: '',
      membershipYears: '',
      membershipStanding: '',
      declaredGrossMonthlyIncome: '',
      declaredNetMonthlyIncome: '',
      otherRecurringMonthlyIncome: '',
      estimatedMonthlyHouseholdExpenses: '',
      existingMonthlyLoanPayments: '',
      monthlyCreditCardPayments: '',
      otherRecurringMonthlyObligations: '',
      supportingDocsAvailable: [],
      electricityPayment: '',
      creditCardPayment: '',
      otherLoanRepayment: '',
      hasReturnedChecks: '',
      hasPastDueObligations: '',
      hasPendingCases: '',
      paymentBehaviorExplanation: '',
      officerObservations: [],
      observationNotes: '',
      collateralOffered: '',
      collateralEntries: [],
      nextSteps: [],
      responsibleParty: '',
      nextStepsDueDate: '',
      followUpDate: '',
      nextStepsInstructions: '',
      proposedLoanAmount: '',
      proposedLoanTerm: '',
      proposedLoanFacility: '',
      proposedInterestRate: '',
      interestRateBasis: '',
      computationType: '',
      computationTypeOther: '',
      paymentFrequency: '',
      paymentFrequencyOther: '',
      numberOfPayments: '',
      firstPaymentDate: '',
      proposedReleaseDate: '',
      gracePeriod: '',
      finalUseOfProceeds: '',
      proposalPrimaryRepaymentSource: '',
      secondaryRepaymentSource: '',
      estimatedAmortization: '',
      estimatedTotalInterest: '',
      estimatedTotalRepayment: '',
      estimatedMaturityValue: '',
      preliminaryDti: '',
      disposableIncomeAfterAmortization: '',
      adjustmentReason: '',
      adjustmentReasonOther: '',
      collateralAssessment: '',
      requiredDocuments: [],
      conditionsBeforeProceeding: [],
      preliminaryRecommendation: '',
      recommendationReason: '',
      loanPackageNotes: '',
    });
  };

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'sample-data',
          label: canProceed ? 'Remove Sample Data' : 'Fill with Sample Data',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: canProceed ? handleClearSampleData : handleFillSampleData,
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [canProceed]
    )
  );

  if (!signUpData || !application.financialInfo || !application.personalInfo) return null;

  const aiSummary = buildCallSummary(callReport, signUpData);
  const aiRecommendation = buildCallReportAiRecommendation(callReport);
  const callReportRiskStyle = CALL_REPORT_RISK_STYLES[aiRecommendation.level];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
        step="Step 2 · Call Report"
        reviewStep="callReport"
        hideApplicationCard
      />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard
          collapsible
          onViewCreditCheckingResult={() => setCreditCheckingResultModalOpen(true)}
          officerNotesProcess="Call Report"
        />

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

        <Box sx={cardSx}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Based on the structured call report answers above.
          </Typography>

          <Button
            onClick={() => setCallReportResultModalOpen(true)}
            variant="outlined"
            startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
            sx={{
              mb: 2.5,
              color: '#1C2A6E',
              borderColor: '#C7CEEA',
              borderRadius: '10px',
              px: 2,
              '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
            }}
          >
            View Call Report Result
          </Button>

          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon="solar:document-text-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  AI Summary
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                {aiSummary || 'Complete the call report above to generate a summary.'}
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: callReportRiskStyle.bg }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon={callReportRiskStyle.icon} width={16} sx={{ color: callReportRiskStyle.color }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: callReportRiskStyle.color }}>
                  AI Recommendation · {callReportRiskStyle.label}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: callReportRiskStyle.color, lineHeight: 1.6 }}>
                {aiRecommendation.text}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {canProceed
              ? 'Approve the call report and decide whether to continue this application.'
              : 'Complete Call Status, Identity Confirmed, Preliminary Recommendation (and Follow-up Date if applicable) before proceeding.'}
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={() => handleProceed(true)}
              disabled={!canProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{
                bgcolor: '#12B76A',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { bgcolor: '#0C8A4F' },
              }}
            >
              Proceed
            </Button>
            <Button
              onClick={() => handleProceed(false)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{
                color: '#5A6273',
                borderColor: '#C7CCDA',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': {
                  color: '#1C2A6E',
                  borderColor: '#1C2A6E',
                  bgcolor: '#F5F7FF',
                },
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

      <CreditCheckingResultModal
        open={creditCheckingResultModalOpen}
        onClose={() => setCreditCheckingResultModalOpen(false)}
        recommendationEditable={false}
      />
      <CallReportResultModal
        open={callReportResultModalOpen}
        onClose={() => setCallReportResultModalOpen(false)}
      />
    </Container>
  );
}
