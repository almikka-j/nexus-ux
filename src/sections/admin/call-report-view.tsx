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

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

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
import { SALES_REJECT_REASONS, buildDecisionReason } from './call-report/call-report-decline';
import { buildSampleCallReportFields } from './call-report/sample-call-report';

// ----------------------------------------------------------------------

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

  const handleSubmitForApproval = () => {
    if (!signUpData) return;
    setCallReport({
      callReportApprovalStatus: 'pending-approval',
      callReportSubmittedAt: new Date().toISOString(),
    });
  };

  const handleContinueToRequirementChecklist = () => {
    if (!signUpData) return;
    router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
  };

  const closeReasonDialog = () => {
    setDisapproveDialogOpen(false);
    setReasonCategory('');
    setReasonRemarks('');
  };

  const confirmReasonDialog = () => {
    if (!signUpData || !reasonCategory) return;
    const decisionReason = buildDecisionReason(reasonCategory, reasonRemarks);
    setCallReport({ decisionReason });
    closeReasonDialog();
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  const handleFillSampleData = () => {
    if (!signUpData) return;
    // Sample-fill leaves the report NOT submitted — the officer/tester
    // still clicks "Submit for Approval" themselves to see the full
    // approval flow, matching this app's convention of sample data
    // filling fields, not skipping decision steps.
    setCallReport({
      ...buildSampleCallReportFields({
        firstName: signUpData.firstName,
        assignedOfficer: application.assignedOfficer,
        desiredLoanAmount: application.financialInfo?.desiredLoanAmount,
        loanTermMonths: application.financialInfo?.loanTermMonths,
      }),
      callReportApprovalStatus: 'not-submitted',
      callReportSubmittedAt: null,
      callReportApprovedAt: null,
      callReportApprovedBy: null,
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
      preliminaryRiskLevel: '',
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
      callReportApprovalStatus: 'not-submitted',
      callReportSubmittedAt: null,
      callReportApprovedAt: null,
      callReportApprovedBy: null,
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
        <SystemValidationCard onViewResult={() => setCallReportResultModalOpen(true)} />
        <EndorsementDeclarationCard />

        <Box sx={cardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {callReport.callReportApprovalStatus === 'approved'
              ? 'This call report has been approved.'
              : callReport.callReportApprovalStatus === 'pending-approval'
                ? 'This call report is awaiting a decision from the Call Report Approver.'
                : canProceed
                  ? 'Submit the call report for approval, or sales reject this application.'
                  : 'Complete Interaction Type, Identity Status, and Call Disposition before submitting.'}
          </Typography>

          {callReport.callReportApprovalStatus === 'approved' ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Iconify icon="solar:check-circle-bold-duotone" width={20} sx={{ color: '#0C8A4F' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                  Approved by {callReport.callReportApprovedBy || 'the approver'}.
                </Typography>
              </Stack>
              <Button
                onClick={handleContinueToRequirementChecklist}
                variant="contained"
                startIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} />}
                sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, alignSelf: 'flex-start', '&:hover': { bgcolor: '#0C8A4F' } }}
              >
                Continue to Requirement Checklist
              </Button>
            </Stack>
          ) : callReport.callReportApprovalStatus === 'pending-approval' ? (
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Iconify icon="solar:clock-circle-bold-duotone" width={20} sx={{ color: '#B36A05' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#14172A' }}>
                Submitted for approval — waiting on the Call Report Approver.
              </Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
              <Button
                onClick={handleSubmitForApproval}
                disabled={!canProceed}
                variant="contained"
                startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
                sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
              >
                Submit for Approval
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
          )}
        </Box>
      </Stack>

      <CreditCheckingResultModal
        open={creditCheckingResultModalOpen}
        onClose={() => setCreditCheckingResultModalOpen(false)}
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
