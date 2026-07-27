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

import { Iconify } from 'src/components/iconify';

import {
  labelFor,
  CALL_TYPE_OPTIONS,
  PLACE_OF_CALL_OPTIONS,
  CALL_STATUS_OPTIONS,
  IDENTITY_CONFIRMED_OPTIONS,
  LOAN_PURPOSE_CONFIRMATION_OPTIONS,
  REPAYMENT_SOURCE_OPTIONS,
  CLIENT_UNDERSTANDING_OPTIONS,
  CLIENT_CONCERN_OPTIONS,
  RESIDENCE_YEARS_OPTIONS,
  RESIDENCE_STATUS_OPTIONS,
  MAIN_INCOME_SOURCE_OPTIONS,
  TENURE_RANGE_OPTIONS,
  INCOME_STABILITY_OPTIONS,
  INCOME_TREND_OPTIONS,
  MEMBERSHIP_TYPE_OPTIONS,
  MEMBERSHIP_STANDING_OPTIONS,
  SUPPORTING_DOC_OPTIONS,
  ELECTRICITY_PAYMENT_OPTIONS,
  CREDIT_CARD_PAYMENT_OPTIONS,
  OTHER_LOAN_REPAYMENT_OPTIONS,
  YES_NO_VERIFY_OPTIONS,
  OFFICER_OBSERVATION_POSITIVE_OPTIONS,
  OFFICER_OBSERVATION_ATTENTION_OPTIONS,
  COLLATERAL_OFFERED_OPTIONS,
  NEXT_STEP_OPTIONS,
  RESPONSIBLE_PARTY_OPTIONS,
  INTEREST_RATE_BASIS_OPTIONS,
  COMPUTATION_TYPE_OPTIONS,
  PAYMENT_FREQUENCY_OPTIONS,
  COLLATERAL_ASSESSMENT_OPTIONS,
  REQUIRED_DOC_OPTIONS,
  CONDITION_OPTIONS,
  PRELIMINARY_RECOMMENDATION_OPTIONS,
} from './call-report-types';
import {
  computeTotalMonthlyIncome,
  computeTotalMonthlyObligations,
  computeDisposableIncome,
  computeDti,
} from './call-report-computations';

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
  const { callReport } = review;

  const allObservationOptions = [
    ...OFFICER_OBSERVATION_POSITIVE_OPTIONS,
    ...OFFICER_OBSERVATION_ATTENTION_OPTIONS,
  ];
  const observationLabels = callReport.officerObservations
    .map((value) => labelFor(allObservationOptions, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const supportingDocLabels = callReport.supportingDocsAvailable
    .map((value) => labelFor(SUPPORTING_DOC_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const nextStepLabels = callReport.nextSteps
    .map((value) => labelFor(NEXT_STEP_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const requiredDocLabels = callReport.requiredDocuments
    .map((value) => labelFor(REQUIRED_DOC_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const conditionLabels = callReport.conditionsBeforeProceeding
    .map((value) => labelFor(CONDITION_OPTIONS, value))
    .filter((label): label is string => !!label)
    .join(', ');

  const totalIncome = computeTotalMonthlyIncome(callReport);
  const totalObligations = computeTotalMonthlyObligations(callReport);
  const disposableIncome = computeDisposableIncome(callReport);
  const dti = computeDti(callReport);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ px: 2.5, py: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>Call report</Typography>
            <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
              Read-only record of the structured call report interview and loan package proposal.
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
            <SectionHeading>1. Call Details</SectionHeading>
            <FieldGrid columns={4}>
              <ResultField label="Call Date" value={callReport.callDate} />
              <ResultField label="Call Time" value={callReport.callTime} />
              <ResultField label="Call Type" value={labelFor(CALL_TYPE_OPTIONS, callReport.callType)} />
              <ResultField
                label="Place of Call"
                value={
                  callReport.placeOfCall === 'other'
                    ? callReport.placeOfCallOther
                    : labelFor(PLACE_OF_CALL_OPTIONS, callReport.placeOfCall)
                }
              />
              <ResultField label="Client Representative" value={callReport.clientRepresentative} />
              <ResultField label="PG Finance Representative" value={callReport.pgRepresentative} />
              <ResultField label="Call Status" value={labelFor(CALL_STATUS_OPTIONS, callReport.callStatus)} />
              <ResultField
                label="Identity Confirmed"
                value={labelFor(IDENTITY_CONFIRMED_OPTIONS, callReport.identityConfirmed)}
              />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>2. Loan Discussion</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField
                label="Loan Purpose Confirmation"
                value={labelFor(LOAN_PURPOSE_CONFIRMATION_OPTIONS, callReport.loanPurposeConfirmation)}
              />
              <ResultField label="Final Loan Purpose" value={callReport.finalLoanPurpose} />
              <ResultField label="Target Release Date" value={callReport.targetReleaseDate} />
              <ResultField
                label="Primary Source of Repayment"
                value={
                  callReport.primaryRepaymentSource === 'other'
                    ? callReport.otherRepaymentSource
                    : labelFor(REPAYMENT_SOURCE_OPTIONS, callReport.primaryRepaymentSource)
                }
              />
              <ResultField
                label="Client Understanding"
                value={
                  callReport.clientUnderstanding
                    .map((value) => labelFor(CLIENT_UNDERSTANDING_OPTIONS, value))
                    .filter((label): label is string => !!label)
                    .join(', ') || null
                }
              />
              <ResultField
                label="Client Concerns"
                value={
                  callReport.clientConcerns
                    .map((value) => labelFor(CLIENT_CONCERN_OPTIONS, value))
                    .filter((label): label is string => !!label)
                    .join(', ') || null
                }
              />
            </FieldGrid>
            {(callReport.specificUseOfProceeds || callReport.concernNotes) && (
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {callReport.specificUseOfProceeds && (
                  <NarrativeBlock label="SPECIFIC USE OF PROCEEDS" value={callReport.specificUseOfProceeds} />
                )}
                {callReport.concernNotes && (
                  <NarrativeBlock label="CONCERN NOTES" value={callReport.concernNotes} />
                )}
              </Stack>
            )}
          </Box>

          <Box>
            <SectionHeading>3. Residence and Household Information</SectionHeading>
            <FieldGrid columns={4}>
              <ResultField
                label="Years at Residence"
                value={labelFor(RESIDENCE_YEARS_OPTIONS, callReport.yearsAtResidence)}
              />
              <ResultField
                label="Residence Status"
                value={
                  callReport.residenceStatus === 'other'
                    ? callReport.residenceStatusOther
                    : labelFor(RESIDENCE_STATUS_OPTIONS, callReport.residenceStatus)
                }
              />
              <ResultField label="Number of Dependents" value={callReport.numberOfDependents} />
              <ResultField label="Household Income Earners" value={callReport.numberOfIncomeEarners} />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>4. Employment or Business Information</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField
                label="Main Source of Income"
                value={
                  callReport.mainIncomeSource === 'other'
                    ? callReport.otherIncomeSource
                    : labelFor(MAIN_INCOME_SOURCE_OPTIONS, callReport.mainIncomeSource)
                }
              />
              <ResultField
                label="Employment/Business Tenure"
                value={labelFor(TENURE_RANGE_OPTIONS, callReport.employmentTenure)}
              />
              <ResultField
                label="Income Stability"
                value={labelFor(INCOME_STABILITY_OPTIONS, callReport.incomeStability)}
              />
              <ResultField label="Income Trend" value={labelFor(INCOME_TREND_OPTIONS, callReport.incomeTrend)} />
              <ResultField label="Loan Renewal" value={callReport.isRenewal === 'yes' ? 'Yes' : callReport.isRenewal === 'no' ? 'No' : ''} />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>5. Organization Membership</SectionHeading>
            <FieldGrid columns={4}>
              <ResultField label="Member of an Organization" value={callReport.isOrgMember === 'yes' ? 'Yes' : callReport.isOrgMember === 'no' ? 'No' : ''} />
              {callReport.isOrgMember === 'yes' && (
                <>
                  <ResultField
                    label="Membership Type"
                    value={labelFor(MEMBERSHIP_TYPE_OPTIONS, callReport.membershipType)}
                  />
                  <ResultField label="Organization Name" value={callReport.organizationName} />
                  <ResultField
                    label="Membership Standing"
                    value={labelFor(MEMBERSHIP_STANDING_OPTIONS, callReport.membershipStanding)}
                  />
                </>
              )}
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>6. Quick Financial Information</SectionHeading>
            <FieldGrid columns={4}>
              <ResultField label="Declared Gross Monthly Income" value={formatCurrency(callReport.declaredGrossMonthlyIncome)} />
              <ResultField label="Declared Net Monthly Income" value={formatCurrency(callReport.declaredNetMonthlyIncome)} />
              <ResultField label="Total Monthly Income" value={formatCurrency(String(totalIncome))} />
              <ResultField label="Total Monthly Obligations" value={formatCurrency(String(totalObligations))} />
              <ResultField label="Preliminary Disposable Income" value={formatCurrency(String(disposableIncome))} />
              <ResultField label="Estimated DTI" value={`${dti.toFixed(1)}%`} />
              <ResultField label="Supporting Documents Available" value={supportingDocLabels} />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>7. Payment Behavior</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField
                label="Electricity Bill Payment"
                value={labelFor(ELECTRICITY_PAYMENT_OPTIONS, callReport.electricityPayment)}
              />
              <ResultField
                label="Credit-card Payment"
                value={labelFor(CREDIT_CARD_PAYMENT_OPTIONS, callReport.creditCardPayment)}
              />
              <ResultField
                label="Other Loan Repayment"
                value={labelFor(OTHER_LOAN_REPAYMENT_OPTIONS, callReport.otherLoanRepayment)}
              />
              <ResultField label="Returned Checks" value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.hasReturnedChecks)} />
              <ResultField
                label="Past-due Obligations"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.hasPastDueObligations)}
              />
              <ResultField
                label="Pending Financial/Court Cases"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.hasPendingCases)}
              />
            </FieldGrid>
          </Box>

          <Box>
            <SectionHeading>8. Officer Observation</SectionHeading>
            <NarrativeBlock label="OBSERVATIONS" value={observationLabels} />
            {callReport.observationNotes && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="OBSERVATION NOTES" value={callReport.observationNotes} />
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#8891A6', mb: 1 }}>
              9. COLLATERAL INFORMATION
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1 }}>
              Collateral Offered: {labelFor(COLLATERAL_OFFERED_OPTIONS, callReport.collateralOffered) || '—'}
            </Typography>
            {callReport.collateralEntries.length > 0 ? (
              <Stack spacing={0.75}>
                {callReport.collateralEntries.map((entry) => (
                  <Typography key={entry.id} sx={{ fontSize: 13.5, color: '#3B4256' }}>
                    • {entry.description}
                    {entry.estimatedValue ? ` — ₱${Number(entry.estimatedValue).toLocaleString()}` : ''}
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>No collateral recorded.</Typography>
            )}
          </Box>

          <Box>
            <SectionHeading>10. Agreed Next Steps</SectionHeading>
            <FieldGrid columns={2}>
              <ResultField label="Next Steps" value={nextStepLabels} />
              <ResultField
                label="Responsible Party"
                value={labelFor(RESPONSIBLE_PARTY_OPTIONS, callReport.responsibleParty)}
              />
              <ResultField label="Due Date" value={callReport.nextStepsDueDate} />
              <ResultField label="Follow-up Date" value={callReport.followUpDate} />
            </FieldGrid>
            {callReport.nextStepsInstructions && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="SHORT INSTRUCTIONS" value={callReport.nextStepsInstructions} />
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Box>
            <SectionHeading>11. Loan Package Proposal</SectionHeading>
            <FieldGrid columns={3}>
              <ResultField label="Proposed Loan Amount" value={formatCurrency(callReport.proposedLoanAmount)} />
              <ResultField label="Proposed Loan Term" value={callReport.proposedLoanTerm ? `${callReport.proposedLoanTerm} months` : ''} />
              <ResultField label="Proposed Loan Facility" value={callReport.proposedLoanFacility} />
              <ResultField label="Proposed Interest Rate" value={callReport.proposedInterestRate ? `${callReport.proposedInterestRate}%` : ''} />
              <ResultField
                label="Interest-rate Basis"
                value={labelFor(INTEREST_RATE_BASIS_OPTIONS, callReport.interestRateBasis)}
              />
              <ResultField
                label="Computation Type"
                value={
                  callReport.computationType === 'other'
                    ? callReport.computationTypeOther
                    : labelFor(COMPUTATION_TYPE_OPTIONS, callReport.computationType)
                }
              />
              <ResultField
                label="Payment Frequency"
                value={
                  callReport.paymentFrequency === 'other'
                    ? callReport.paymentFrequencyOther
                    : labelFor(PAYMENT_FREQUENCY_OPTIONS, callReport.paymentFrequency)
                }
              />
              <ResultField label="Number of Payments" value={callReport.numberOfPayments} />
              <ResultField label="First Payment Date" value={callReport.firstPaymentDate} />
              <ResultField label="Proposed Release Date" value={callReport.proposedReleaseDate} />
              <ResultField label="Grace Period" value={callReport.gracePeriod} />
              <ResultField label="Final Use of Proceeds" value={callReport.finalUseOfProceeds} />
              <ResultField
                label="Primary Source of Repayment"
                value={labelFor(REPAYMENT_SOURCE_OPTIONS, callReport.proposalPrimaryRepaymentSource)}
              />
              <ResultField label="Secondary Source of Repayment" value={callReport.secondaryRepaymentSource} />
              <ResultField label="Estimated Amortization" value={formatCurrency(callReport.estimatedAmortization)} />
              <ResultField label="Estimated Total Interest" value={formatCurrency(callReport.estimatedTotalInterest)} />
              <ResultField label="Estimated Total Repayment" value={formatCurrency(callReport.estimatedTotalRepayment)} />
              <ResultField label="Estimated Maturity Value" value={formatCurrency(callReport.estimatedMaturityValue)} />
              <ResultField label="Preliminary DTI" value={callReport.preliminaryDti ? `${callReport.preliminaryDti}%` : ''} />
              <ResultField
                label="Disposable Income After Amortization"
                value={formatCurrency(callReport.disposableIncomeAfterAmortization)}
              />
              <ResultField
                label="Collateral Assessment"
                value={labelFor(COLLATERAL_ASSESSMENT_OPTIONS, callReport.collateralAssessment)}
              />
              <ResultField
                label="Preliminary Recommendation"
                value={labelFor(PRELIMINARY_RECOMMENDATION_OPTIONS, callReport.preliminaryRecommendation)}
              />
            </FieldGrid>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <ResultField label="Required Documents" value={requiredDocLabels} />
              <ResultField label="Conditions Before Proceeding" value={conditionLabels} />
              {callReport.recommendationReason && (
                <NarrativeBlock label="RECOMMENDATION REASON" value={callReport.recommendationReason} />
              )}
              {callReport.loanPackageNotes && (
                <NarrativeBlock label="LOAN PACKAGE NOTES" value={callReport.loanPackageNotes} />
              )}
            </Stack>
          </Box>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <NarrativeBlock label="12. CALL SUMMARY" value={callReport.callSummary} />
          <NarrativeBlock label="13. ADDITIONAL REMARKS" value={callReport.additionalRemarks} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
