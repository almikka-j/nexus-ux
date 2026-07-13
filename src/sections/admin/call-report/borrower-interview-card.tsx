'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  YES_NO_OPTIONS,
  LOAN_PURPOSE_CONFIRMATION_OPTIONS,
  REPAYMENT_SOURCE_OPTIONS,
  RESIDENCE_YEARS_OPTIONS,
  MAIN_INCOME_SOURCE_OPTIONS,
  TENURE_RANGE_OPTIONS,
  INCOME_TREND_OPTIONS,
  MEMBERSHIP_STANDING_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
      {children}
    </Typography>
  );
}

export function BorrowerInterviewCard() {
  const { review, setCallReport } = useAdmin();
  const { application } = useRegistration();
  const { callReport } = review;

  // Default Final Loan Purpose from the borrower's original stated purpose,
  // once, the first time this card sees an empty value.
  useEffect(() => {
    if (!callReport.finalLoanPurpose && application.financialInfo?.loanPurpose) {
      setCallReport({ finalLoanPurpose: application.financialInfo.loanPurpose });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.financialInfo?.loanPurpose]);

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Borrower Interview
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Loan purpose, repayment, residence, employment, and organization details gathered during the call.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Loan Purpose Confirmation"
          value={callReport.loanPurposeConfirmation}
          options={LOAN_PURPOSE_CONFIRMATION_OPTIONS}
          onChange={(value) => setCallReport({ loanPurposeConfirmation: value })}
        />

        <TextField
          label="Final Loan Purpose"
          value={callReport.finalLoanPurpose}
          onChange={(event) => setCallReport({ finalLoanPurpose: event.target.value })}
          sx={fieldSx}
        />

        <TextField
          label="Specific Use of Proceeds"
          value={callReport.specificUseOfProceeds}
          onChange={(event) => setCallReport({ specificUseOfProceeds: event.target.value })}
          sx={fieldSx}
        />

        <RadioRow
          label="Primary Source of Repayment"
          value={callReport.primaryRepaymentSource}
          options={REPAYMENT_SOURCE_OPTIONS}
          onChange={(value) => setCallReport({ primaryRepaymentSource: value })}
        />

        {callReport.primaryRepaymentSource === 'other' && (
          <TextField
            label="Other Source of Repayment"
            value={callReport.otherRepaymentSource}
            onChange={(event) => setCallReport({ otherRepaymentSource: event.target.value })}
            sx={fieldSx}
          />
        )}

        <TextField
          label="Target Release Date"
          type="date"
          value={callReport.targetReleaseDate}
          onChange={(event) => setCallReport({ targetReleaseDate: event.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />

        <Divider sx={{ borderColor: '#EEF0F5' }} />
        <SubsectionLabel>Residence and family</SubsectionLabel>

        <RadioRow
          label="Years at Current Residence"
          value={callReport.yearsAtResidence}
          options={RESIDENCE_YEARS_OPTIONS}
          onChange={(value) => setCallReport({ yearsAtResidence: value })}
        />

        <TextField
          label="Number of Dependents"
          type="number"
          value={callReport.numberOfDependents}
          onChange={(event) => setCallReport({ numberOfDependents: event.target.value })}
          sx={fieldSx}
        />

        <RadioRow
          label="Supporting More Than One Family"
          value={callReport.supportingMultipleFamilies}
          options={YES_NO_OPTIONS}
          onChange={(value) => setCallReport({ supportingMultipleFamilies: value })}
        />

        <Divider sx={{ borderColor: '#EEF0F5' }} />
        <SubsectionLabel>Employment or business</SubsectionLabel>

        <RadioRow
          label="Main Source of Income"
          value={callReport.mainIncomeSource}
          options={MAIN_INCOME_SOURCE_OPTIONS}
          onChange={(value) => setCallReport({ mainIncomeSource: value })}
        />

        {callReport.mainIncomeSource === 'other' && (
          <TextField
            label="Other Income Source"
            value={callReport.otherIncomeSource}
            onChange={(event) => setCallReport({ otherIncomeSource: event.target.value })}
            sx={fieldSx}
          />
        )}

        <RadioRow
          label="Employment or Business Tenure"
          value={callReport.employmentTenure}
          options={TENURE_RANGE_OPTIONS}
          onChange={(value) => setCallReport({ employmentTenure: value })}
        />

        <RadioRow
          label="Income Trend"
          value={callReport.incomeTrend}
          options={INCOME_TREND_OPTIONS}
          onChange={(value) => setCallReport({ incomeTrend: value })}
        />

        <Divider sx={{ borderColor: '#EEF0F5' }} />
        <SubsectionLabel>Organization membership</SubsectionLabel>

        <RadioRow
          label="Member of an Organization"
          value={callReport.isOrgMember}
          options={YES_NO_OPTIONS}
          onChange={(value) => setCallReport({ isOrgMember: value })}
        />

        {callReport.isOrgMember === 'yes' && (
          <>
            <TextField
              label="Membership Type"
              value={callReport.membershipType}
              onChange={(event) => setCallReport({ membershipType: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              label="Organization Name"
              value={callReport.organizationName}
              onChange={(event) => setCallReport({ organizationName: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              label="Years of Membership"
              type="number"
              value={callReport.membershipYears}
              onChange={(event) => setCallReport({ membershipYears: event.target.value })}
              sx={fieldSx}
            />
            <RadioRow
              label="Membership Standing"
              value={callReport.membershipStanding}
              options={MEMBERSHIP_STANDING_OPTIONS}
              onChange={(value) => setCallReport({ membershipStanding: value })}
            />
          </>
        )}
      </Stack>
    </Box>
  );
}
