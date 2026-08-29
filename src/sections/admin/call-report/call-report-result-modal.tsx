'use client';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import {
  labelFor,
  INTERACTION_TYPE_OPTIONS,
  IDENTITY_STATUS_OPTIONS,
  IDENTITY_BASIS_OPTIONS,
  LOAN_FACILITY_OPTIONS,
  LOAN_PURPOSE_OPTIONS,
  REPAYMENT_SOURCE_TYPE_OPTIONS,
  YES_NO_VERIFY_OPTIONS,
  PAYMENT_HISTORY_DESCRIPTOR_OPTIONS,
  UNDERSTANDING_LEVEL_OPTIONS,
  LOAN_TERM_ITEM_OPTIONS,
  PROPOSAL_INTEREST_RATE_BASIS_OPTIONS,
  PROPOSAL_COMPUTATION_TYPE_OPTIONS,
  RISK_DRIVER_OPTIONS,
  CALL_DISPOSITION_OPTIONS,
  AO_PRELIMINARY_RISK_LEVEL_OPTIONS,
} from './call-report-types';
import { buildCallSummary, buildCallReportAiExceptions } from './call-report-summary';
import { buildCallReportAiRecommendation, buildCallReportVariance } from './call-report-risk';

// ----------------------------------------------------------------------

function ResultField({ label, value }: { label: string; value: string | null }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6', mb: 0.4 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Box>
  );
}

function NarrativeBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#8891A6', mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#14172A', mb: 1.5 }}>
      {children}
    </Typography>
  );
}

function FieldGrid({ children, columns = 3 }: { children: React.ReactNode; columns?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: `repeat(${columns}, minmax(0, 1fr))` },
        gap: 2,
        p: 2,
        borderRadius: '12px',
        bgcolor: '#F9FAFC',
        border: '1px solid #EEF0F5',
      }}
    >
      {children}
    </Box>
  );
}

function formatCurrency(value: string): string {
  if (!value) return '';
  return `₱${Number(value).toLocaleString()}`;
}

export function CallReportResultModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { review } = useAdmin();
  const { application, signUpData } = useRegistration();
  const { callReport } = review;

  // Account Officer and Date/Time are read-only, derived the same way
  // EndorsementDeclarationCard displays them — not officer-entered fields on
  // CallReport (accountOfficerName/accountOfficerDateTime are unused now).
  const accountOfficer = application.assignedOfficer || '—';
  const accountOfficerDateTime = review.stepTimestamps.callReport
    ? new Date(review.stepTimestamps.callReport).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

  const identityBasisLabels = callReport.identityBasis
    .map((value) => labelFor(IDENTITY_BASIS_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const termsUnderstoodLabels = callReport.termsUnderstood
    .map((value) => labelFor(LOAN_TERM_ITEM_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const riskDriverLabels = callReport.primaryRiskDrivers
    .map((value) => labelFor(RISK_DRIVER_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const currentVariance = buildCallReportVariance(callReport);
  // Computed live rather than read from callReport.aiSummary/aiExceptions/
  // aiRecommendation — those stored fields only update when the officer
  // clicks "Refresh AI Review" on SystemValidationCard, so reading them
  // directly here would show stale text after any later edit to the report.
  // This modal has no refresh button of its own, so it always recomputes.
  const currentAiSummary = buildCallSummary(callReport, signUpData);
  const currentAiExceptions = buildCallReportAiExceptions(callReport);
  const currentAiRecommendation = buildCallReportAiRecommendation(callReport).text;

  const validationLabels: Record<string, string> = {
    confirmed: 'Confirmed',
    changed: 'Changed',
    'unable-to-verify': 'Unable to Verify',
    '': '—',
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ px: 2.5, py: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>Call report</Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Read-only record of the NEXUS Customer KYC &amp; Call Validation Report.
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close call report">
            <Iconify icon="mingcute:close-line" width={22} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={2.5}>
          <Box>
            <SectionHeading>Interaction Record</SectionHeading>
            <FieldGrid columns={4}>
              <ResultField label="Call / Visit Date" value={callReport.callVisitDate} />
              <ResultField label="Time" value={callReport.callTime} />
              <ResultField label="Interviewed Person" value={callReport.interviewedPerson} />
              <ResultField label="Relationship to Borrower" value={callReport.relationshipToBorrower} />
              <ResultField label="Interaction Type" value={labelFor(INTERACTION_TYPE_OPTIONS, callReport.interactionType)} />
              <ResultField label="Identity Status" value={labelFor(IDENTITY_STATUS_OPTIONS, callReport.identityStatus)} />
              <ResultField label="Basis of Identity Confirmation" value={identityBasisLabels} />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>Application Validation</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField label="Identity / Authorized Representative" value={validationLabels[callReport.validation.identityAuthorizedRep]} />
              <ResultField label="Loan Facility" value={validationLabels[callReport.validation.loanFacility]} />
              <ResultField label="Loan Purpose" value={validationLabels[callReport.validation.loanPurpose]} />
              <ResultField label="Primary Source of Repayment" value={validationLabels[callReport.validation.primaryRepaymentSource]} />
              <ResultField label="Business / Employment Info" value={validationLabels[callReport.validation.businessEmploymentInfo]} />
              <ResultField label="Existing Loans / Obligations" value={validationLabels[callReport.validation.existingLoansObligations]} />
              <ResultField label="Residence / Business Address" value={validationLabels[callReport.validation.residenceBusinessAddress]} />
              <ResultField label="Collateral / Security Declaration" value={validationLabels[callReport.validation.collateralSecurityDeclaration]} />
              <ResultField label="Co-maker/Guarantee" value={validationLabels[callReport.validation.comakerGuarantee]} />
            </FieldGrid>
            {callReport.validation.identityAuthorizedRep === 'changed' && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="IDENTITY / AUTHORIZED REPRESENTATIVE CHANGED TO"
                  value={`${callReport.identityAuthorizedRepChangedTo} — ${callReport.identityAuthorizedRepChangeReason}`}
                />
              </Box>
            )}
            {callReport.validation.loanFacility === 'changed' && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="LOAN FACILITY CHANGED TO"
                  value={`${labelFor(LOAN_FACILITY_OPTIONS, callReport.loanFacilityChangedTo) || ''} — ${callReport.loanFacilityChangeReason}`}
                />
              </Box>
            )}
            {callReport.validation.loanPurpose === 'changed' && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="LOAN PURPOSE CHANGED TO"
                  value={labelFor(LOAN_PURPOSE_OPTIONS, callReport.loanPurposeChangedTo) || ''}
                />
              </Box>
            )}
            {callReport.validation.primaryRepaymentSource === 'changed' && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="PRIMARY REPAYMENT SOURCE CHANGED TO"
                  value={labelFor(REPAYMENT_SOURCE_TYPE_OPTIONS, callReport.primaryRepaymentSourceChangedTo) || ''}
                />
              </Box>
            )}
            {callReport.existingLoanRows.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="EXISTING LOANS DECLARED"
                  value={callReport.existingLoanRows
                    .map((row) => `${row.lender} (${row.loanType}) — ${formatCurrency(row.outstandingBalance)}`)
                    .join('\n')}
                />
              </Box>
            )}
            {callReport.comakerChange.completeName && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock
                  label="CO-MAKER/GUARANTOR"
                  value={`${callReport.comakerChange.completeName} — ${callReport.comakerChange.relationshipToBorrower}`}
                />
              </Box>
            )}
            {callReport.materialChangesNotes && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="MATERIAL CHANGES / CLARIFICATIONS" value={callReport.materialChangesNotes} />
              </Box>
            )}
          </Box>

          <Box>
            <SectionHeading>AML / KYC Questions</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField label="Politically Exposed Person" value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlIsPep)} />
              <ResultField
                label="PGFC-related Party"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlIsPgfcRelatedParty)}
              />
              <ResultField
                label="Has Existing Loans"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasExistingLoans)}
              />
              <ResultField
                label="Payment History"
                value={labelFor(PAYMENT_HISTORY_DESCRIPTOR_OPTIONS, callReport.amlPaymentHistory)}
              />
              <ResultField
                label="Returned Checks"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasReturnedChecks)}
              />
              <ResultField
                label="Past Due Obligations"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasPastDueObligations)}
              />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>Customer Understanding</SectionHeading>
            <FieldGrid columns={2}>
              <ResultField
                label="Level of Understanding"
                value={labelFor(UNDERSTANDING_LEVEL_OPTIONS, callReport.understandingLevel)}
              />
              <ResultField label="Terms Understood" value={termsUnderstoodLabels} />
            </FieldGrid>
            {callReport.concernsClarifications && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="CONCERNS / CLARIFICATIONS" value={callReport.concernsClarifications} />
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Box>
            <SectionHeading>Proposed Loan Package</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField label="Original Requested Amount" value={formatCurrency(callReport.originalRequestedAmount)} />
              <ResultField
                label="Interest Rate"
                value={callReport.proposalInterestRate ? `${callReport.proposalInterestRate}%` : ''}
              />
              <ResultField
                label="Interest Rate Basis"
                value={labelFor(PROPOSAL_INTEREST_RATE_BASIS_OPTIONS, callReport.proposalInterestRateBasis)}
              />
              <ResultField
                label="Proposed Facility / Product"
                value={labelFor(LOAN_FACILITY_OPTIONS, callReport.proposedFacilityProduct)}
              />
              <ResultField
                label="Computation Type"
                value={
                  callReport.proposalComputationType === 'other'
                    ? callReport.proposalComputationTypeOther
                    : labelFor(PROPOSAL_COMPUTATION_TYPE_OPTIONS, callReport.proposalComputationType)
                }
              />
              <ResultField label="Proposed Loan Amount" value={formatCurrency(callReport.proposedLoanAmount)} />
              <ResultField
                label="Estimated Monthly Amortization"
                value={formatCurrency(callReport.estimatedMonthlyAmortization)}
              />
              <ResultField
                label="Proposed Loan Term"
                value={callReport.proposedLoanTermMonths ? `${callReport.proposedLoanTermMonths} months` : ''}
              />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>AO Preliminary Risk &amp; Call Disposition</SectionHeading>
            <FieldGrid columns={2}>
              <ResultField
                label="AO Preliminary Risk"
                value={labelFor(AO_PRELIMINARY_RISK_LEVEL_OPTIONS, callReport.preliminaryRiskLevel)}
              />
              <ResultField label="Primary Risk Driver" value={riskDriverLabels} />
              <ResultField label="Call Disposition" value={labelFor(CALL_DISPOSITION_OPTIONS, callReport.callDisposition)} />
            </FieldGrid>
            {callReport.reasonKeyCondition && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="REASON / KEY CONDITION" value={callReport.reasonKeyCondition} />
              </Box>
            )}
          </Box>

          <Box>
            <SectionHeading>AI review, summary &amp; recommendation</SectionHeading>
            <Stack spacing={1.5}>
              <NarrativeBlock label="AI SUMMARY" value={currentAiSummary} />
              <NarrativeBlock label="AI EXCEPTIONS / INCONSISTENCIES" value={currentAiExceptions} />
              <NarrativeBlock label="AI RECOMMENDATION / RISK LEVEL" value={currentAiRecommendation} />
              <ResultField
                label="AO vs. System Assessment Variance"
                value={
                  currentVariance.status === ''
                    ? null
                    : currentVariance.status === 'noted'
                      ? `Variance Noted — ${callReport.varianceExplanation || currentVariance.explanation}`
                      : 'None — the AO Preliminary Risk rating matches the system assessment.'
                }
              />
            </Stack>
          </Box>

          <Box>
            <SectionHeading>Account Officer Endorsement Declaration</SectionHeading>
            <FieldGrid columns={2}>
              <ResultField label="Account Officer" value={accountOfficer} />
              <ResultField label="Date / Time" value={accountOfficerDateTime} />
            </FieldGrid>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
