import { buildCallSummary, buildCallReportAiExceptions } from './call-report-summary';
import { buildCallReportAiRecommendation, buildCallReportVariance } from './call-report-risk';

import type { CallReport, CallReportComakerChange, ExistingLoanRow } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Shared between Call Report's own "Fill with Sample Data" page action
// (call-report-view.tsx) and the Call Report Approval list page's
// auto-seed effect (call-report-approval-view.tsx) — both need the exact
// same "filled-in, complete-looking" 8-section Call Report, so this is
// the one place those sample values live (same
// buildSampleAppraisalReport()-style cross-file-reuse convention as
// src/sections/admin/appraisal/sample-appraisal-report.ts).
//
// Returns every CallReport field EXCEPT the approval-status fields
// (callReportApprovalStatus/callReportSubmittedAt/callReportApprovedAt/
// callReportApprovedBy) and decisionReason — callers decide those
// themselves, since call-report-view.tsx's own sample-fill leaves the
// report un-submitted while the approval list's auto-seed immediately
// submits it.
// ----------------------------------------------------------------------

type SampleCallReportFields = Omit<
  CallReport,
  'callReportApprovalStatus' | 'callReportSubmittedAt' | 'callReportApprovedAt' | 'callReportApprovedBy' | 'decisionReason'
>;

export function buildSampleCallReportFields(params: {
  firstName: string;
  assignedOfficer: string | null;
  desiredLoanAmount?: number;
  loanTermMonths?: number;
}): SampleCallReportFields {
  // Falls back to a non-zero sample amount/term when the application has
  // none on file — otherwise Original Requested Amount and every
  // amount/term derived from it would sample-fill as "₱0"/"0 months",
  // which reads as empty even though the field is technically populated.
  const loanAmount = params.desiredLoanAmount || 150000;
  const loanTerm = params.loanTermMonths || 24;

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

  const fields: Omit<SampleCallReportFields, 'aiSummary' | 'aiExceptions' | 'aiRecommendation' | 'aoVsSystemVariance' | 'varianceExplanation'> = {
    interactionType: 'phone',
    callVisitDate: new Date().toISOString().slice(0, 10),
    callTime: '14:30',
    interviewedPerson: params.firstName,
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
    proposedFacilityProduct: 'clean-loan',
    proposalComputationType: 'diminishing-balance',
    proposalComputationTypeOther: '',
    proposedLoanAmount: String(loanAmount),
    estimatedMonthlyAmortization: loanTerm ? String(Math.round(loanAmount / loanTerm)) : '',
    proposedLoanTermMonths: String(loanTerm),
    otherRequest: '',
    preliminaryRiskLevel: 'low',
    primaryRiskDrivers: ['character'],
    callDisposition: 'proceed-to-next-process',
    reasonKeyCondition: 'Client cooperative, consistent answers, no major exceptions noted.',
    accountOfficerName: params.assignedOfficer ?? 'Ramon Cruz',
    accountOfficerDateTime: new Date().toISOString().slice(0, 16),
  };

  // Compute the AI review fields from the sample data itself, same
  // builders "Refresh AI Review" uses, so the AI card (and the Call
  // Report Result modal) show real content immediately instead of the
  // "click Refresh AI Review" empty state. All four builders below
  // require the full CallReport type (they don't accept this file's
  // narrower SampleCallReportFields), but none of them read the
  // approval-status fields this function intentionally doesn't own — so
  // a real, fully-typed CallReport is built here with placeholder
  // ('not-submitted'/null) values for exactly those fields, purely to
  // satisfy the builders' parameter type. Callers of
  // buildSampleCallReportFields() never see this placeholder object —
  // only its returned aiSummary/aiExceptions/aiRecommendation/
  // aoVsSystemVariance/varianceExplanation strings.
  const draftForAi: CallReport = {
    ...fields,
    callReportApprovalStatus: 'not-submitted',
    callReportSubmittedAt: null,
    callReportApprovedAt: null,
    callReportApprovedBy: null,
    decisionReason: '',
    aiSummary: '',
    aiExceptions: '',
    aiRecommendation: '',
    aoVsSystemVariance: '',
    varianceExplanation: '',
  };
  const variance = buildCallReportVariance(draftForAi);

  return {
    ...fields,
    aiSummary: buildCallSummary(draftForAi, { firstName: params.firstName, lastName: '' }),
    aiExceptions: buildCallReportAiExceptions(draftForAi),
    aiRecommendation: buildCallReportAiRecommendation(draftForAi).text,
    aoVsSystemVariance: variance.status,
    varianceExplanation: variance.explanation,
  };
}
