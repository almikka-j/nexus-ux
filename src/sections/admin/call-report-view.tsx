'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { CallReportComakerChange, ExistingLoanRow } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { outlinedNavyButtonSx } from 'src/components/admin-ui';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { CreditCheckingResultModal } from './call-report/credit-checking-result-modal';
import { CallReportResultModal } from './call-report/call-report-result-modal';
import { InteractionRecordCard } from './call-report/interaction-record-card';
import { ApplicationValidationCard } from './call-report/application-validation-card';
import { AmlKycCard } from './call-report/aml-kyc-card';
import { CustomerUnderstandingCard } from './call-report/customer-understanding-card';
import { ProposedLoanPackageCard } from './call-report/proposed-loan-package-card';
import { RiskDispositionCard } from './call-report/risk-disposition-card';
import { SystemValidationCard } from './call-report/system-validation-card';
import { EndorsementDeclarationCard } from './call-report/endorsement-declaration-card';
import { cardSx } from './call-report/call-report-types';

// ----------------------------------------------------------------------

const SALES_REJECT_REASONS = [
  'Insufficient income',
  'Poor credit history',
  'Incomplete documents',
  'Employment not verifiable',
  'Requested amount too high',
  'Other',
];

export function CallReportView() {
  const router = useRouter();
  const { signUpData, application } = useRegistration();
  const { review, setCallReport } = useAdmin();
  const [creditCheckingResultModalOpen, setCreditCheckingResultModalOpen] = useState(false);
  const [callReportResultModalOpen, setCallReportResultModalOpen] = useState(false);
  const [disapproveDialogOpen, setDisapproveDialogOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonRemarks, setReasonRemarks] = useState('');

  const { callReport } = review;

  const canProceed = !!callReport.interactionType && !!callReport.identityStatus && !!callReport.callDisposition;

  const handleProceed = () => {
    if (!signUpData) return;
    setCallReport({ approved: true });
    router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
  };

  const closeReasonDialog = () => {
    setDisapproveDialogOpen(false);
    setReasonCategory('');
    setReasonRemarks('');
  };

  const confirmReasonDialog = () => {
    if (!signUpData || !reasonCategory) return;
    const decisionReason = reasonRemarks.trim() ? `${reasonCategory} — ${reasonRemarks.trim()}` : reasonCategory;
    setCallReport({ approved: false, decisionReason });
    closeReasonDialog();
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  const handleFillSampleData = () => {
    if (!signUpData) return;
    const loanAmount = application.financialInfo?.desiredLoanAmount ?? 0;
    const loanTerm = application.financialInfo?.loanTermMonths ?? 0;

    const sampleExistingLoan: ExistingLoanRow = {
      id: crypto.randomUUID(),
      lender: 'BDO Unibank',
      loanType: 'Personal Loan',
      outstandingBalance: '50000',
      monthlyPayment: '5000',
    };

    const sampleComakerChange: CallReportComakerChange = {
      completeName: 'Juan Dela Cruz',
      completeAddress: 'Quezon City, Metro Manila',
      contactNumber: '09171234567',
      relationshipToBorrower: 'Sibling',
      occupationEmployerName: 'ABC Corporation',
      yearsInEmploymentBusiness: '5',
      primaryIdTypeAndNumber: "Driver's License — N01-23-456789",
      secondaryIdTypeAndNumber: 'UMID — 1234-5678901-2',
      remarks: '',
    };

    setCallReport({
      interactionType: 'phone',
      callVisitDate: new Date().toISOString().slice(0, 10),
      callTime: '14:30',
      interviewedPerson: signUpData.firstName,
      relationshipToBorrower: 'Self',
      identityStatus: 'confirmed',
      identityBasis: ['app-data-matched', 'valid-government-id'],
      identityBasisOther: '',
      validation: {
        identityAuthorizedRep: 'confirmed',
        loanFacility: 'confirmed',
        loanPurpose: 'changed',
        primaryRepaymentSource: 'confirmed',
        businessEmploymentInfo: 'confirmed',
        existingLoansObligations: 'changed',
        residenceBusinessAddress: 'confirmed',
        collateralSecurityDeclaration: 'confirmed',
        comakerGuarantee: 'changed',
      },
      materialChangesNotes: 'Client clarified the loan purpose and confirmed one existing loan not previously on file.',
      identityAuthorizedRepChangedTo: '',
      identityAuthorizedRepChangeReason: '',
      loanFacilityChangedTo: '',
      loanFacilityChangeReason: '',
      loanPurposeChangedTo: 'home-renovation-construction',
      loanPurposeOtherText: '',
      workingCapitalUse: '',
      workingCapitalUseOtherText: '',
      loanTakeOutInfo: {
        currentLender: '',
        outstandingBalance: '',
        estimatedPayoffAmount: '',
        remainingLoanTerm: '',
        reasonForTakeOut: '',
        status: '',
      },
      primaryRepaymentSourceChangedTo: '',
      repaymentSourceOtherText: '',
      employerBusinessNameChanged: '',
      employmentBusinessAddressChanged: '',
      declaredMonthlyIncomeChanged: '',
      employmentBusinessTenureChanged: '',
      businessEmploymentOtherChange: '',
      existingLoanRows: [sampleExistingLoan],
      residenceBusinessAddressChangedTo: '',
      residenceBusinessAddressChangeReason: '',
      collateralDeclarationChangedTo: [],
      collateralDeclarationOtherText: '',
      comakerChange: sampleComakerChange,
      comakers: [
        {
          id: crypto.randomUUID(),
          name: sampleComakerChange.completeName,
          relationshipToBorrower: sampleComakerChange.relationshipToBorrower,
          address: sampleComakerChange.completeAddress,
          contactNumber: sampleComakerChange.contactNumber,
          occupation: sampleComakerChange.occupationEmployerName,
          monthlyIncome: '',
        },
      ],
      amlIsPep: 'no',
      amlIsPgfcRelatedParty: 'no',
      amlHasExistingLoans: 'yes',
      amlPaymentHistory: 'on-time',
      amlHasReturnedChecks: 'no',
      amlHasPastDueObligations: 'no',
      understandingLevel: 'fully-understood',
      termsUnderstood: [
        'interest-rate',
        'loan-amount',
        'loan-term',
        'monthly-amortization',
        'documentary-requirements',
        'collateral-requirements',
      ],
      concernsClarifications: '',
      originalRequestedAmount: String(loanAmount),
      proposalInterestRate: '1.5',
      proposalInterestRateBasis: 'monthly',
      proposedFacilityProduct: 'Clean Loan',
      proposalComputationType: 'diminishing-balance',
      proposalComputationTypeOther: '',
      proposedLoanAmount: String(loanAmount),
      estimatedMonthlyAmortization: loanTerm ? String(Math.round(loanAmount / loanTerm)) : '',
      proposedLoanTermMonths: String(loanTerm),
      otherRequest: '',
      primaryRiskDrivers: ['character'],
      callDisposition: 'proceed-to-next-process',
      reasonKeyCondition: 'Client cooperative, consistent answers, no major exceptions noted.',
      aiSummary: '',
      aiExceptions: '',
      aiRecommendation: '',
      aoVsSystemVariance: 'none',
      varianceExplanation: '',
      accountOfficerName: application.assignedOfficer ?? 'Ramon Cruz',
      accountOfficerDateTime: new Date().toISOString().slice(0, 16),
    });
  };

  const handleClearSampleData = () => {
    setCallReport({
      interactionType: '',
      callVisitDate: '',
      callTime: '',
      interviewedPerson: '',
      relationshipToBorrower: '',
      identityStatus: '',
      identityBasis: [],
      identityBasisOther: '',
      validation: {
        identityAuthorizedRep: '',
        loanFacility: '',
        loanPurpose: '',
        primaryRepaymentSource: '',
        businessEmploymentInfo: '',
        existingLoansObligations: '',
        residenceBusinessAddress: '',
        collateralSecurityDeclaration: '',
        comakerGuarantee: '',
      },
      materialChangesNotes: '',
      identityAuthorizedRepChangedTo: '',
      identityAuthorizedRepChangeReason: '',
      loanFacilityChangedTo: '',
      loanFacilityChangeReason: '',
      loanPurposeChangedTo: '',
      loanPurposeOtherText: '',
      workingCapitalUse: '',
      workingCapitalUseOtherText: '',
      loanTakeOutInfo: {
        currentLender: '',
        outstandingBalance: '',
        estimatedPayoffAmount: '',
        remainingLoanTerm: '',
        reasonForTakeOut: '',
        status: '',
      },
      primaryRepaymentSourceChangedTo: '',
      repaymentSourceOtherText: '',
      employerBusinessNameChanged: '',
      employmentBusinessAddressChanged: '',
      declaredMonthlyIncomeChanged: '',
      employmentBusinessTenureChanged: '',
      businessEmploymentOtherChange: '',
      existingLoanRows: [],
      residenceBusinessAddressChangedTo: '',
      residenceBusinessAddressChangeReason: '',
      collateralDeclarationChangedTo: [],
      collateralDeclarationOtherText: '',
      comakerChange: {
        completeName: '',
        completeAddress: '',
        contactNumber: '',
        relationshipToBorrower: '',
        occupationEmployerName: '',
        yearsInEmploymentBusiness: '',
        primaryIdTypeAndNumber: '',
        secondaryIdTypeAndNumber: '',
        remarks: '',
      },
      comakers: [],
      amlIsPep: '',
      amlIsPgfcRelatedParty: '',
      amlHasExistingLoans: '',
      amlPaymentHistory: '',
      amlHasReturnedChecks: '',
      amlHasPastDueObligations: '',
      understandingLevel: '',
      termsUnderstood: [],
      concernsClarifications: '',
      originalRequestedAmount: '',
      proposalInterestRate: '',
      proposalInterestRateBasis: '',
      proposedFacilityProduct: '',
      proposalComputationType: '',
      proposalComputationTypeOther: '',
      proposedLoanAmount: '',
      estimatedMonthlyAmortization: '',
      proposedLoanTermMonths: '',
      otherRequest: '',
      primaryRiskDrivers: [],
      callDisposition: '',
      reasonKeyCondition: '',
      aiSummary: '',
      aiExceptions: '',
      aiRecommendation: '',
      aoVsSystemVariance: '',
      varianceExplanation: '',
      accountOfficerName: '',
      accountOfficerDateTime: '',
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

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 2 · Call Report" reviewStep="callReport" hideApplicationCard />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard
          collapsible
          onViewCreditCheckingResult={() => setCreditCheckingResultModalOpen(true)}
          officerNotesProcess="Call Report"
        />

        <InteractionRecordCard />
        <ApplicationValidationCard />
        <AmlKycCard />
        <CustomerUnderstandingCard />
        <ProposedLoanPackageCard />
        <RiskDispositionCard />
        <SystemValidationCard />
        <EndorsementDeclarationCard />

        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Call Report Result
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            View the full formatted report generated from everything entered above.
          </Typography>
          <Button
            onClick={() => setCallReportResultModalOpen(true)}
            variant="outlined"
            startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
            sx={{ ...outlinedNavyButtonSx, px: 2 }}
          >
            View Call Report Result
          </Button>
        </Box>

        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {canProceed
              ? 'Approve the call report and decide whether to continue this application.'
              : 'Complete Interaction Type, Identity Status, and Call Disposition before proceeding.'}
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleProceed}
              disabled={!canProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Proceed to Requirement Checklist
            </Button>
            <Button
              onClick={() => setDisapproveDialogOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{
                color: '#5A6273',
                borderColor: '#C7CCDA',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
              }}
            >
              Sales Reject
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
      <CallReportResultModal open={callReportResultModalOpen} onClose={() => setCallReportResultModalOpen(false)} />

      <ConfirmDialog
        open={disapproveDialogOpen}
        onClose={closeReasonDialog}
        title="Reason for sales reject"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              autoFocus
              fullWidth
              label="Reason"
              value={reasonCategory}
              onChange={(event) => setReasonCategory(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            >
              {SALES_REJECT_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Remarks"
              placeholder="Add any additional details…"
              value={reasonRemarks}
              onChange={(event) => setReasonRemarks(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!reasonCategory}
            onClick={confirmReasonDialog}
            sx={{ bgcolor: '#F04438', '&:hover': { bgcolor: '#B32C22' } }}
          >
            Confirm
          </Button>
        }
      />
    </Container>
  );
}
