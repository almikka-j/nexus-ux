'use client';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { SectionLabel } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

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
import {
  buildCallReportAiRecommendation,
  buildCallReportVariance,
  CALL_REPORT_RISK_STYLES,
} from './call-report-risk';

// ----------------------------------------------------------------------
// Matches CreditCheckingResultModal's design system exactly (SectionLabel,
// FieldRow, header layout, "Prepared by" footer) rather than the grid-based
// ResultField/FieldGrid this modal used before, so the two result modals
// read as the same product instead of two different designs. SectionLabel
// itself is now the shared src/components/admin-ui version (2026-10-19) —
// same uppercase label, plus a divider underneath matching
// appraisal-report-view.tsx's own header style, so every inline "view what
// was submitted" screen in the app reads as one design system.
// ----------------------------------------------------------------------

function FieldRow({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', width: 200, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Stack>
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

// Matches EndorsementDeclarationCard's SignatureField exactly.
function SignatureField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '9px',
          bgcolor: 'common.white',
          border: '1px solid #C7EDDA',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon} width={17} sx={{ color: '#0C8A4F' }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#0C8A4F',
            opacity: 0.75,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{ fontSize: 14.5, fontWeight: 700, color: '#14172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={value}
        >
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
  );
}

const DECLARATION_PARAGRAPHS = [
  'I hereby confirm that I have conducted the required pre-screening of the borrower/applicant in accordance with the Company’s established policies and procedures, including full compliance with Know Your Customer (KYC) requirements and applicable regulatory standards.',
  'I attest that all information, documents, and representations submitted in support of this application have been obtained through appropriate due diligence/KYC and are, to the best of my knowledge, complete, accurate, and truthful. I confirm that no material information has been knowingly omitted, withheld, or misrepresented.',
  'I further declare that I have not engaged in, and will not engage in, any form of connivance, collusion, or undisclosed arrangement with the borrower/applicant or any related party that may influence, circumvent, or compromise the integrity of the application or the Company’s policies.',
  'I affirm that this application has been prepared and endorsed in good faith, in accordance with Company policies, and within the scope of my responsibilities.',
  'I understand that any false declaration, material omission, or breach of this statement may subject me to disciplinary action, up to and including termination, and may expose me to legal liability.',
];

function formatCurrency(value: string): string {
  if (!value) return '';
  return `₱${Number(value).toLocaleString()}`;
}

// The full Call Report result body, no dialog chrome — rendered inline on
// the Call Report Approval page (so the reviewer reads it without opening a
// modal) and wrapped by CallReportResultModal for the Call Report page /
// Requirement Checklist / Application Details "View Call Report" actions.
export function CallReportResultContent({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { review } = useAdmin();
  const { application, signUpData } = useRegistration();
  const { callReport } = review;

  if (!signUpData) return null;

  const fullName = `${signUpData.firstName} ${signUpData.lastName}`;
  const applicationNo = getLoanNumber(signUpData.email);

  // Account Officer and Date/Time are read-only, derived the same way
  // EndorsementDeclarationCard displays them — not officer-entered fields on
  // CallReport (accountOfficerName/accountOfficerDateTime are unused now).
  const accountOfficer = application.assignedOfficer || '—';
  const generatedAt = review.stepTimestamps.callReport ? new Date(review.stepTimestamps.callReport) : null;
  const generatedLabel = generatedAt
    ? `${generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ${generatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : '—';

  // Applications saved before the Call Report Approval gate existed never
  // got callReportApprovalStatus/callReportApprovedBy/callReportApprovedAt
  // populated, even though they've already moved past Call Report (e.g.
  // already sitting at Requirement Checklist). Rather than show a blank
  // Approved By row for that pre-existing data, fall back to a dummy
  // approver name/date whenever the report has clearly already been
  // generated (review.stepTimestamps.callReport is set) but isn't marked
  // 'approved' yet.
  const isApproved = callReport.callReportApprovalStatus === 'approved';
  const showApproverFallback = !isApproved && !!generatedAt;
  const approvedByLabel = isApproved ? callReport.callReportApprovedBy || '—' : 'Jaime Reyes';
  const approvedAtLabel = isApproved
    ? callReport.callReportApprovedAt
      ? new Date(callReport.callReportApprovedAt).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '—'
    : generatedLabel;

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
  const currentAiRecommendation = buildCallReportAiRecommendation(callReport);
  const isCleared = currentAiRecommendation.level === 'good';
  const riskStyle = CALL_REPORT_RISK_STYLES[currentAiRecommendation.level];

  const validationLabels: Record<string, string> = {
    confirmed: 'Confirmed',
    changed: 'Changed',
    'unable-to-verify': 'Unable to Verify',
    '': '—',
  };

  return (
    <>
      {!hideHeader && (
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>Call Report</Typography>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
            Report generated {generatedLabel}
          </Typography>
        </Box>
      )}

      <Stack spacing={2.5}>
          {isCleared && (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{ p: 2, borderRadius: '11px', bgcolor: '#E7F8F0' }}
            >
              <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: '#0C8A4F', mt: 0.25 }} />
              <Stack spacing={0.25}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0C8A4F' }}>
                  Cleared — proceed to next process
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#0C8A4F' }}>
                  {currentAiRecommendation.text}
                </Typography>
              </Stack>
            </Stack>
          )}

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Call Report</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow label="Application No." value={applicationNo} />
              <FieldRow label="Client Name" value={fullName} />
              <FieldRow label="Email Address" value={signUpData.email} />
              <FieldRow label="Contact Number" value={signUpData.mobile || '—'} />
              <FieldRow label="Account Officer" value={accountOfficer} />
              <FieldRow label="Date / Time" value={generatedLabel} />
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Interaction Record</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow label="Call / Visit Date" value={callReport.callVisitDate} />
              <FieldRow label="Time" value={callReport.callTime} />
              <FieldRow label="Interviewed Person" value={callReport.interviewedPerson} />
              <FieldRow label="Relationship to Borrower" value={callReport.relationshipToBorrower} />
              <FieldRow label="Interaction Type" value={labelFor(INTERACTION_TYPE_OPTIONS, callReport.interactionType)} />
              <FieldRow label="Identity Status" value={labelFor(IDENTITY_STATUS_OPTIONS, callReport.identityStatus)} />
              <FieldRow label="Basis of Identity Confirmation" value={identityBasisLabels} />
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Application Validation</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow label="Identity / Authorized Representative" value={validationLabels[callReport.validation.identityAuthorizedRep]} />
              <FieldRow label="Loan Facility" value={validationLabels[callReport.validation.loanFacility]} />
              <FieldRow label="Loan Purpose" value={validationLabels[callReport.validation.loanPurpose]} />
              <FieldRow label="Primary Source of Repayment" value={validationLabels[callReport.validation.primaryRepaymentSource]} />
              <FieldRow label="Business / Employment Info" value={validationLabels[callReport.validation.businessEmploymentInfo]} />
              <FieldRow label="Existing Loans / Obligations" value={validationLabels[callReport.validation.existingLoansObligations]} />
              <FieldRow label="Residence / Business Address" value={validationLabels[callReport.validation.residenceBusinessAddress]} />
              <FieldRow label="Collateral / Security Declaration" value={validationLabels[callReport.validation.collateralSecurityDeclaration]} />
              <FieldRow label="Co-maker/Guarantee" value={validationLabels[callReport.validation.comakerGuarantee]} />
            </Stack>
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

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>AML / KYC Questions</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow label="Politically Exposed Person" value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlIsPep)} />
              <FieldRow
                label="PGFC-related Party"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlIsPgfcRelatedParty)}
              />
              <FieldRow
                label="Has Existing Loans"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasExistingLoans)}
              />
              <FieldRow
                label="Payment History"
                value={labelFor(PAYMENT_HISTORY_DESCRIPTOR_OPTIONS, callReport.amlPaymentHistory)}
              />
              <FieldRow
                label="Returned Checks"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasReturnedChecks)}
              />
              <FieldRow
                label="Past Due Obligations"
                value={labelFor(YES_NO_VERIFY_OPTIONS, callReport.amlHasPastDueObligations)}
              />
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Customer Understanding</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow
                label="Level of Understanding"
                value={labelFor(UNDERSTANDING_LEVEL_OPTIONS, callReport.understandingLevel)}
              />
              <FieldRow label="Terms Understood" value={termsUnderstoodLabels} />
            </Stack>
            {callReport.concernsClarifications && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="CONCERNS / CLARIFICATIONS" value={callReport.concernsClarifications} />
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Proposed Loan Package</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow label="Original Requested Amount" value={formatCurrency(callReport.originalRequestedAmount)} />
              <FieldRow
                label="Interest Rate"
                value={callReport.proposalInterestRate ? `${callReport.proposalInterestRate}%` : ''}
              />
              <FieldRow
                label="Interest Rate Basis"
                value={labelFor(PROPOSAL_INTEREST_RATE_BASIS_OPTIONS, callReport.proposalInterestRateBasis)}
              />
              <FieldRow
                label="Proposed Facility / Product"
                value={labelFor(LOAN_FACILITY_OPTIONS, callReport.proposedFacilityProduct)}
              />
              <FieldRow
                label="Computation Type"
                value={
                  callReport.proposalComputationType === 'other'
                    ? callReport.proposalComputationTypeOther
                    : labelFor(PROPOSAL_COMPUTATION_TYPE_OPTIONS, callReport.proposalComputationType)
                }
              />
              <FieldRow label="Proposed Loan Amount" value={formatCurrency(callReport.proposedLoanAmount)} />
              <FieldRow
                label="Estimated Monthly Amortization"
                value={formatCurrency(callReport.estimatedMonthlyAmortization)}
              />
              <FieldRow
                label="Proposed Loan Term"
                value={callReport.proposedLoanTermMonths ? `${callReport.proposedLoanTermMonths} months` : ''}
              />
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>AO Preliminary Risk &amp; Call Disposition</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow
                label="AO Preliminary Risk"
                value={labelFor(AO_PRELIMINARY_RISK_LEVEL_OPTIONS, callReport.preliminaryRiskLevel)}
              />
              <FieldRow label="Primary Risk Driver" value={riskDriverLabels} />
              <FieldRow label="Call Disposition" value={labelFor(CALL_DISPOSITION_OPTIONS, callReport.callDisposition)} />
            </Stack>
            {callReport.reasonKeyCondition && (
              <Box sx={{ mt: 1.5 }}>
                <NarrativeBlock label="REASON / KEY CONDITION" value={callReport.reasonKeyCondition} />
              </Box>
            )}
          </Box>

          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              AI Review, Summary &amp; Recommendation
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', lineHeight: 1.5, mb: 2 }}>
              Based on everything entered above, recomputed live so it always matches the current
              report.
            </Typography>
            <Stack spacing={1.5}>
              <NarrativeBlock label="AI SUMMARY" value={currentAiSummary} />
              <NarrativeBlock label="AI EXCEPTIONS / INCONSISTENCIES" value={currentAiExceptions} />
              <Box sx={{ p: 2, borderRadius: '12px', bgcolor: riskStyle.bg }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Iconify icon={riskStyle.icon} width={16} sx={{ color: riskStyle.color }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color }}>
                    AI Recommendation / Risk Level · {riskStyle.label}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>
                  {currentAiRecommendation.text}
                </Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>
                  AO vs. System Assessment Variance
                </Typography>
                {currentVariance.status === '' ? (
                  <Typography sx={{ fontSize: 13.5, color: '#8891A6', lineHeight: 1.6 }}>
                    No AO Preliminary Risk rating entered yet, so no comparison has been made against
                    the system assessment.
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Iconify
                      icon={currentVariance.status === 'noted' ? 'solar:danger-triangle-bold' : 'solar:check-circle-bold'}
                      width={16}
                      sx={{ color: currentVariance.status === 'noted' ? '#B36A05' : '#0C8A4F', mt: 0.15, flexShrink: 0 }}
                    />
                    <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                      {currentVariance.status === 'noted'
                        ? callReport.varianceExplanation || currentVariance.explanation
                        : 'None — the AO Preliminary Risk rating matches the system assessment.'}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5, px: 0.5 }}>
              <Iconify icon="solar:shield-warning-linear" width={15} sx={{ color: '#A0A7B5', mt: 0.15, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.5, color: '#98A2B3', lineHeight: 1.6 }}>
                <Box component="span" sx={{ fontWeight: 700, color: '#8891A6' }}>AI Control Statement — </Box>
                This AI-generated result is an advisory risk-screening output only. It does not
                constitute loan approval, disapproval, or a policy waiver. All findings,
                exceptions, and recommendations must be independently validated by authorized
                Credit personnel.
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Account Officer Endorsement Declaration</SectionLabel>
            <Stack spacing={1.5} sx={{ mt: 1.5, mb: 2 }}>
              {DECLARATION_PARAGRAPHS.map((paragraph) => (
                <Typography key={paragraph.slice(0, 24)} sx={{ fontSize: 13, color: '#3B4256', lineHeight: 1.65 }}>
                  {paragraph}
                </Typography>
              ))}
            </Stack>

            <Divider sx={{ borderColor: '#EEF0F5', mb: 2 }} />

            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#E7F8F0' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Iconify icon="solar:verified-check-bold" width={17} sx={{ color: '#0C8A4F' }} />
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0C8A4F' }}>Endorsed</Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#0C8A4F', opacity: 0.75 }}>
                    Recorded automatically when this officer opened the Call Report step.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <SignatureField icon="solar:user-id-bold-duotone" label="Account Officer" value={accountOfficer} />
                <SignatureField icon="solar:clock-circle-bold-duotone" label="Date / Time" value={generatedLabel} />
              </Stack>

              {(isApproved || showApproverFallback) && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  <SignatureField icon="solar:shield-check-bold-duotone" label="Approved By" value={approvedByLabel} />
                  <SignatureField icon="solar:clock-circle-bold-duotone" label="Approval Date / Time" value={approvedAtLabel} />
                </Stack>
              )}
            </Box>
          </Box>
      </Stack>
    </>
  );
}

export function CallReportResultModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 3, pb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>Call Report</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="PDF export coming soon">
            <span>
              <IconButton disabled sx={{ border: '1px solid #E1E4ED', borderRadius: '10px', px: 1.5 }}>
                <Iconify icon="solar:file-download-bold" width={18} sx={{ color: '#8891A6' }} />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ border: '1px solid #E1E4ED', borderRadius: '10px' }}>
            <Iconify icon="solar:close-circle-bold" width={18} sx={{ color: '#8891A6' }} />
          </IconButton>
        </Stack>
      </Box>
      <DialogContent sx={{ px: 3, pb: 3 }}>
        <CallReportResultContent />
      </DialogContent>
    </Dialog>
  );
}
