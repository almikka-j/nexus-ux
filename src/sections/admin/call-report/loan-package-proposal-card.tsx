'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { RequiredDocItem, ConditionItem } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import { ChipToggleGroup } from './loan-discussion-card';
import { compareAmount, compareTerm, computeDisposableIncome, toNumber } from './call-report-computations';
import {
  cardSx,
  fieldSx,
  REPAYMENT_SOURCE_OPTIONS,
  INTEREST_RATE_BASIS_OPTIONS,
  COMPUTATION_TYPE_OPTIONS,
  PAYMENT_FREQUENCY_OPTIONS,
  ADJUSTMENT_REASON_OPTIONS,
  COLLATERAL_REQUIREMENT_OPTIONS,
  REQUIRED_DOC_OPTIONS,
  CONDITION_OPTIONS,
  PRELIMINARY_RECOMMENDATION_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.4}>
      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Stack>
  );
}

function ComparisonChip({ label }: { label: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700, fontSize: 12 }}
    />
  );
}

const COMPARE_AMOUNT_LABEL: Record<'same' | 'lower' | 'higher', string> = {
  same: 'Same as Requested',
  lower: 'Lower Amount',
  higher: 'Higher Amount',
};
const COMPARE_TERM_LABEL: Record<'same' | 'shorter' | 'longer', string> = {
  same: 'Same as Requested',
  shorter: 'Shorter Term',
  longer: 'Longer Term',
};

export function LoanPackageProposalCard() {
  const { review, setCallReport } = useAdmin();
  const { application } = useRegistration();
  const { callReport } = review;

  const requestedAmount = application.financialInfo?.desiredLoanAmount ?? 0;
  const requestedTerm = application.financialInfo?.loanTermMonths ?? 0;

  // Default Proposed Loan Amount/Term from the original request, once.
  useEffect(() => {
    if (!callReport.proposedLoanAmount && requestedAmount) {
      setCallReport({ proposedLoanAmount: String(requestedAmount) });
    }
    if (!callReport.proposedLoanTerm && requestedTerm) {
      setCallReport({ proposedLoanTerm: String(requestedTerm) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedAmount, requestedTerm]);

  // Default Final Use of Proceeds / proposal repayment source from section 2,
  // once, so the officer doesn't retype what they already said in Loan Discussion.
  useEffect(() => {
    if (!callReport.finalUseOfProceeds && callReport.specificUseOfProceeds) {
      setCallReport({ finalUseOfProceeds: callReport.specificUseOfProceeds });
    }
    if (!callReport.proposalPrimaryRepaymentSource && callReport.primaryRepaymentSource) {
      setCallReport({ proposalPrimaryRepaymentSource: callReport.primaryRepaymentSource });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callReport.specificUseOfProceeds, callReport.primaryRepaymentSource]);

  const proposedAmount = toNumber(callReport.proposedLoanAmount);
  const proposedTerm = toNumber(callReport.proposedLoanTerm);
  const amountComparison = compareAmount(requestedAmount, proposedAmount);
  const termComparison = compareTerm(requestedTerm, proposedTerm);
  const amountOrTermChanged = amountComparison !== 'same' || termComparison !== 'same';

  const disposableBefore = computeDisposableIncome(callReport);
  const disposableAfter = Math.max(
    0,
    disposableBefore - toNumber(callReport.estimatedAmortization)
  );

  const toggleRequiredDoc = (value: RequiredDocItem) => {
    const has = callReport.requiredDocuments.includes(value);
    setCallReport({
      requiredDocuments: has
        ? callReport.requiredDocuments.filter((item) => item !== value)
        : [...callReport.requiredDocuments, value],
    });
  };

  const toggleCondition = (value: ConditionItem) => {
    const has = callReport.conditionsBeforeProceeding.includes(value);
    setCallReport({
      conditionsBeforeProceeding: has
        ? callReport.conditionsBeforeProceeding.filter((item) => item !== value)
        : [...callReport.conditionsBeforeProceeding, value],
    });
  };

  const showRecommendationReason =
    !!callReport.preliminaryRecommendation &&
    callReport.preliminaryRecommendation !== 'proceed-as-requested';

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        11. Loan Package Proposal
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        This is only a preliminary recommendation and must not be treated as the final Credit
        Scoring or Credit Approval decision.
      </Typography>

      <Stack spacing={3}>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1.5 }}>
            Original Loan Request
          </Typography>
          <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={2}>
            <ReadOnlyField label="Requested Loan Amount" value={requestedAmount ? `₱${requestedAmount.toLocaleString()}` : ''} />
            <ReadOnlyField label="Requested Loan Term" value={requestedTerm ? `${requestedTerm} months` : ''} />
            <ReadOnlyField label="Original Loan Purpose" value={application.financialInfo?.loanPurpose ?? ''} />
            <ReadOnlyField label="Primary Source of Repayment" value={callReport.primaryRepaymentSource} />
            <ReadOnlyField label="Collateral Offered" value={callReport.collateralOffered} />
          </Stack>
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1.5 }}>
            Proposed Loan Terms
          </Typography>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Proposed Loan Amount"
                type="number"
                value={callReport.proposedLoanAmount}
                onChange={(event) => setCallReport({ proposedLoanAmount: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Proposed Loan Term (months)"
                type="number"
                value={callReport.proposedLoanTerm}
                onChange={(event) => setCallReport({ proposedLoanTerm: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>

            <TextField
              label="Proposed Loan Facility"
              value={callReport.proposedLoanFacility}
              onChange={(event) => setCallReport({ proposedLoanFacility: event.target.value })}
              sx={fieldSx}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Proposed Interest Rate"
                type="number"
                value={callReport.proposedInterestRate}
                onChange={(event) => setCallReport({ proposedInterestRate: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <Box sx={{ flex: 1 }}>
                <RadioRow
                  label="Interest-rate Basis"
                  value={callReport.interestRateBasis}
                  options={INTEREST_RATE_BASIS_OPTIONS}
                  onChange={(value) => setCallReport({ interestRateBasis: value })}
                />
              </Box>
            </Stack>

            <RadioRow
              label="Computation Type"
              value={callReport.computationType}
              options={COMPUTATION_TYPE_OPTIONS}
              onChange={(value) => setCallReport({ computationType: value })}
            />
            {callReport.computationType === 'other' && (
              <TextField
                label="Specify Computation Type"
                value={callReport.computationTypeOther}
                onChange={(event) => setCallReport({ computationTypeOther: event.target.value })}
                sx={fieldSx}
              />
            )}

            <RadioRow
              label="Payment Frequency"
              value={callReport.paymentFrequency}
              options={PAYMENT_FREQUENCY_OPTIONS}
              onChange={(value) => setCallReport({ paymentFrequency: value })}
            />
            {callReport.paymentFrequency === 'other' && (
              <TextField
                label="Specify Payment Frequency"
                value={callReport.paymentFrequencyOther}
                onChange={(event) => setCallReport({ paymentFrequencyOther: event.target.value })}
                sx={fieldSx}
              />
            )}

            <Stack direction="row" spacing={2}>
              <TextField
                label="Number of Payments"
                type="number"
                value={callReport.numberOfPayments}
                onChange={(event) => setCallReport({ numberOfPayments: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="First Payment Date"
                type="date"
                value={callReport.firstPaymentDate}
                onChange={(event) => setCallReport({ firstPaymentDate: event.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Proposed Release Date"
                type="date"
                value={callReport.proposedReleaseDate}
                onChange={(event) => setCallReport({ proposedReleaseDate: event.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Grace Period"
                value={callReport.gracePeriod}
                onChange={(event) => setCallReport({ gracePeriod: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>

            <TextField
              label="Final Use of Proceeds"
              value={callReport.finalUseOfProceeds}
              onChange={(event) => setCallReport({ finalUseOfProceeds: event.target.value })}
              sx={fieldSx}
            />

            <RadioRow
              label="Primary Source of Repayment"
              value={callReport.proposalPrimaryRepaymentSource}
              options={REPAYMENT_SOURCE_OPTIONS}
              onChange={(value) => setCallReport({ proposalPrimaryRepaymentSource: value })}
            />

            <TextField
              label="Secondary Source of Repayment"
              value={callReport.secondaryRepaymentSource}
              onChange={(event) => setCallReport({ secondaryRepaymentSource: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1.5 }}>
            Loan Computation
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1.5 }}>
            Manual entry — no formula is applied automatically.
          </Typography>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Estimated Amortization"
                type="number"
                value={callReport.estimatedAmortization}
                onChange={(event) => setCallReport({ estimatedAmortization: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Estimated Total Interest"
                type="number"
                value={callReport.estimatedTotalInterest}
                onChange={(event) => setCallReport({ estimatedTotalInterest: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Estimated Total Repayment"
                type="number"
                value={callReport.estimatedTotalRepayment}
                onChange={(event) => setCallReport({ estimatedTotalRepayment: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Estimated Maturity Value"
                type="number"
                value={callReport.estimatedMaturityValue}
                onChange={(event) => setCallReport({ estimatedMaturityValue: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Preliminary Debt-to-Income Ratio (%)"
                type="number"
                value={callReport.preliminaryDti}
                onChange={(event) => setCallReport({ preliminaryDti: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Disposable Income After Proposed Amortization"
                type="number"
                value={callReport.disposableIncomeAfterAmortization}
                onChange={(event) =>
                  setCallReport({ disposableIncomeAfterAmortization: event.target.value })
                }
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1.5 }}>
            Requested vs. Proposed
          </Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 13, color: '#667085', minWidth: 160 }}>Amount</Typography>
              <ComparisonChip label={COMPARE_AMOUNT_LABEL[amountComparison]} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 13, color: '#667085', minWidth: 160 }}>Term</Typography>
              <ComparisonChip label={COMPARE_TERM_LABEL[termComparison]} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={1}>
              <ReadOnlyField
                label="Disposable Income Before Amortization"
                value={`₱${disposableBefore.toLocaleString()}`}
              />
              <ReadOnlyField
                label="Disposable Income After Amortization"
                value={`₱${disposableAfter.toLocaleString()}`}
              />
            </Stack>
          </Stack>

          {amountOrTermChanged && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <RadioRow
                label="Adjustment Reason"
                value={callReport.adjustmentReason}
                options={ADJUSTMENT_REASON_OPTIONS}
                onChange={(value) => setCallReport({ adjustmentReason: value })}
              />
              {callReport.adjustmentReason === 'other' && (
                <TextField
                  label="Specify Adjustment Reason"
                  value={callReport.adjustmentReasonOther}
                  onChange={(event) => setCallReport({ adjustmentReasonOther: event.target.value })}
                  sx={fieldSx}
                />
              )}
            </Stack>
          )}
        </Box>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <RadioRow
          label="Collateral Requirement"
          value={callReport.collateralRequirement}
          options={COLLATERAL_REQUIREMENT_OPTIONS}
          onChange={(value) => setCallReport({ collateralRequirement: value })}
        />

        {callReport.collateralEntries.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
              Collateral entries (from section 9, read-only here)
            </Typography>
            <Stack spacing={2}>
              {callReport.collateralEntries.map((entry, index) => (
                <Box
                  key={entry.id}
                  sx={{ p: 2, borderRadius: '10px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}
                >
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#8891A6', mb: 1 }}>
                    Collateral {index + 1}
                  </Typography>
                  <CollateralEntryFieldsReadOnly entry={entry} />
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Required Documents
          </Typography>
          <ChipToggleGroup
            options={REQUIRED_DOC_OPTIONS}
            selected={callReport.requiredDocuments}
            onToggle={toggleRequiredDoc}
          />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1 }}>
            Conditions Before Proceeding
          </Typography>
          <ChipToggleGroup
            options={CONDITION_OPTIONS}
            selected={callReport.conditionsBeforeProceeding}
            onToggle={toggleCondition}
          />
        </Box>

        <RadioRow
          label="Preliminary Recommendation"
          value={callReport.preliminaryRecommendation}
          options={PRELIMINARY_RECOMMENDATION_OPTIONS}
          onChange={(value) => setCallReport({ preliminaryRecommendation: value })}
        />

        {showRecommendationReason && (
          <TextField
            label="Recommendation Reason"
            multiline
            minRows={2}
            required
            value={callReport.recommendationReason}
            onChange={(event) => setCallReport({ recommendationReason: event.target.value })}
            sx={fieldSx}
          />
        )}

        <TextField
          label="Loan Package Notes"
          multiline
          minRows={2}
          value={callReport.loanPackageNotes}
          onChange={(event) => setCallReport({ loanPackageNotes: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}

// Small read-only renderer for reused collateral entries — deliberately not
// importing CollateralEntryFields' interactive RadioRow version here, since
// this needs to render plain text, not disabled radio buttons, to look
// clearly like a summary rather than a second edit surface.
function CollateralEntryFieldsReadOnly({ entry }: { entry: import('src/auth/admin-context').CollateralEntry }) {
  return (
    <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={1}>
      <ReadOnlyField label="Type" value={entry.type} />
      <ReadOnlyField label="Description" value={entry.description} />
      <ReadOnlyField label="Estimated Value" value={entry.estimatedValue ? `₱${Number(entry.estimatedValue).toLocaleString()}` : ''} />
      <ReadOnlyField label="Registered Owner" value={entry.registeredOwner} />
    </Stack>
  );
}
