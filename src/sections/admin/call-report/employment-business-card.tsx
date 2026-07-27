'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { RadioRow } from './call-details-card';
import {
  cardSx,
  fieldSx,
  MAIN_INCOME_SOURCE_OPTIONS,
  TENURE_RANGE_OPTIONS,
  INCOME_STABILITY_OPTIONS,
  INCOME_TREND_OPTIONS,
  INCOME_CHANGE_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function EmploymentBusinessCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        4. Employment or Business Information
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Income source, stability, and trend.
      </Typography>

      <Stack spacing={2.5}>
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
          label="Income Stability"
          value={callReport.incomeStability}
          options={INCOME_STABILITY_OPTIONS}
          onChange={(value) => setCallReport({ incomeStability: value })}
        />

        <RadioRow
          label="Income Trend"
          value={callReport.incomeTrend}
          options={INCOME_TREND_OPTIONS}
          onChange={(value) => setCallReport({ incomeTrend: value })}
        />

        <RadioRow
          label="Is this a loan renewal?"
          value={callReport.isRenewal}
          options={YES_NO_OPTIONS}
          onChange={(value) => setCallReport({ isRenewal: value })}
        />

        {callReport.isRenewal === 'yes' && (
          <>
            <RadioRow
              label="Income Change Since Previous Loan"
              value={callReport.incomeChangeSincePrevious}
              options={INCOME_CHANGE_OPTIONS}
              onChange={(value) => setCallReport({ incomeChangeSincePrevious: value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Previous Monthly Income"
                type="number"
                value={callReport.previousMonthlyIncome}
                onChange={(event) => setCallReport({ previousMonthlyIncome: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Current Monthly Income"
                type="number"
                value={callReport.currentMonthlyIncome}
                onChange={(event) => setCallReport({ currentMonthlyIncome: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
            <TextField
              label="Effective Date of Income Change"
              type="date"
              value={callReport.incomeChangeEffectiveDate}
              onChange={(event) => setCallReport({ incomeChangeEffectiveDate: event.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
          </>
        )}
      </Stack>
    </Box>
  );
}
