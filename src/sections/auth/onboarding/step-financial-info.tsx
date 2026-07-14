'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { authFieldSx, authFieldLabelSx, authPrimaryButtonSx } from '../auth-input-styles';

import type { FinancialInfo } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

const LOAN_TERMS = [6, 12, 18, 24, 36];

const EMPLOYMENT_STATUSES = ['Employed', 'Self-Employed', 'Business Owner', 'OFW', 'Unemployed'];

const LOAN_PURPOSES = [
  'Working Capital',
  'Business Expansion',
  'Education',
  'Home Improvement',
  'Debt Consolidation',
  'Other',
];

export type FinancialInfoSchemaType = zod.infer<typeof FinancialInfoSchema>;

export const FinancialInfoSchema = zod.object({
  desiredLoanAmount: zod.coerce.number().min(1, { message: 'Enter your desired loan amount.' }),
  loanTermMonths: zod.coerce.number().min(1, { message: 'Select a loan term.' }),
  employmentStatus: zod.string().min(1, { message: 'Select your employment status.' }),
  monthlyIncome: zod.coerce.number().min(1, { message: 'Enter your monthly income.' }),
  loanPurpose: zod.string().min(1, { message: 'Select the purpose of your loan.' }),
});

const SAMPLE_FINANCIAL_INFO: FinancialInfoSchemaType = {
  desiredLoanAmount: 50000,
  loanTermMonths: 12,
  employmentStatus: 'Employed',
  monthlyIncome: 30000,
  loanPurpose: 'Working Capital',
};

// ----------------------------------------------------------------------

type StepFinancialInfoProps = {
  defaultValues: Partial<FinancialInfo>;
  onContinue: (data: FinancialInfo) => void;
};

export function StepFinancialInfo({ defaultValues, onContinue }: StepFinancialInfoProps) {
  const initialValues: FinancialInfoSchemaType = {
    desiredLoanAmount: defaultValues.desiredLoanAmount ?? ('' as unknown as number),
    loanTermMonths: defaultValues.loanTermMonths ?? 12,
    employmentStatus: defaultValues.employmentStatus || '',
    monthlyIncome: defaultValues.monthlyIncome ?? ('' as unknown as number),
    loanPurpose: (defaultValues as Partial<FinancialInfoSchemaType>).loanPurpose || '',
  };

  const methods = useForm<FinancialInfoSchemaType>({
    resolver: zodResolver(FinancialInfoSchema),
    defaultValues: initialValues,
  });

  const { handleSubmit, reset } = methods;
  const [isSample, setIsSample] = useState(false);

  const onSubmit = handleSubmit((data) => onContinue(data as unknown as FinancialInfo));

  return (
    <Box
      sx={{
        width: 1,
        maxWidth: 600,
        bgcolor: 'common.white',
        borderRadius: '18px',
        boxShadow: '0 22px 60px -30px rgba(20,23,42,0.28)',
        p: { xs: 3, md: 5 },
      }}
    >
      <Stack alignItems="center" textAlign="center" spacing={0.75} sx={{ mb: 3.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8891A6' }}>
          Step 2 · Preliminary
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
          Preliminary application
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
          Let&apos;s check if you qualify for a loan. Fill out the form below to get started.
        </Typography>

        <Button
          onClick={() => {
            reset(isSample ? initialValues : SAMPLE_FINANCIAL_INFO);
            setIsSample((prev) => !prev);
          }}
          size="small"
          sx={{ color: 'text.disabled' }}
        >
          {isSample ? 'Remove Sample Data' : 'Fill with Sample Data'}
        </Button>
      </Stack>

      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Desired loan amount</Typography>
              <Field.Text
                name="desiredLoanAmount"
                type="number"
                placeholder="100,000"
                sx={authFieldSx}
                InputProps={{
                  startAdornment: <InputAdornment position="start">PHP</InputAdornment>,
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Loan term</Typography>
              <Field.Select name="loanTermMonths" sx={authFieldSx}>
                {LOAN_TERMS.map((term) => (
                  <MenuItem key={term} value={term}>
                    {term} months
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Employment status</Typography>
              <Field.Select name="employmentStatus" sx={authFieldSx}>
                {EMPLOYMENT_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Field.Select>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={authFieldLabelSx}>Monthly income</Typography>
              <Field.Text
                name="monthlyIncome"
                type="number"
                placeholder="35,000"
                sx={authFieldSx}
                InputProps={{
                  startAdornment: <InputAdornment position="start">PHP</InputAdornment>,
                }}
              />
            </Box>
          </Stack>

          <Box>
            <Typography sx={authFieldLabelSx}>Purpose of loan</Typography>
            <Field.Select name="loanPurpose" sx={authFieldSx}>
              {LOAN_PURPOSES.map((purpose) => (
                <MenuItem key={purpose} value={purpose}>
                  {purpose}
                </MenuItem>
              ))}
            </Field.Select>
          </Box>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ bgcolor: '#EEF1FE', borderRadius: '11px', p: 2 }}
          >
            <Iconify icon="solar:info-circle-bold" width={17} sx={{ color: '#3448B0', flexShrink: 0, mt: 0.25 }} />
            <Typography sx={{ fontSize: 12.5, color: '#3448B0', lineHeight: 1.55 }}>
              This is a quick pre-check — no impact on your credit score. You&apos;ll get an
              instant estimate before formally applying.
            </Typography>
          </Stack>

          <Button fullWidth type="submit" variant="contained" sx={authPrimaryButtonSx}>
            Continue →
          </Button>
        </Stack>
      </Form>
    </Box>
  );
}
