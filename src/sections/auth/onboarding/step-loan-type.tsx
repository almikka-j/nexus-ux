import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { LoanTypeCard } from './loan-type-card';

import type { LoanType } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

type StepLoanTypeProps = {
  firstName: string;
  value: LoanType | null;
  onChange: (loanType: LoanType | null) => void;
  onContinue: () => void;
};

// The "Fill with Sample Data" button always selects 'personal' — if that's
// already the current value, treat a click as "undo the sample fill" instead
// of a no-op re-selection, so the button can double as a toggle.
const SAMPLE_LOAN_TYPE: LoanType = 'personal';

export function StepLoanType({ firstName, value, onChange, onContinue }: StepLoanTypeProps) {
  const isSample = value === SAMPLE_LOAN_TYPE;
  return (
    <Box sx={{ width: 1, maxWidth: 760, textAlign: 'center' }}>
      <Typography
        sx={{
          display: 'inline-block',
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#8891A6',
          mb: 1.75,
        }}
      >
        Step 1 · Loan type
      </Typography>
      <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em', mb: 1 }}>
        What type of loan do you need, {firstName}?
      </Typography>
      <Typography sx={{ fontSize: 15, color: '#667085', lineHeight: 1.6, mb: 5 }}>
        Tell us what you&apos;re looking for, and we&apos;ll guide you through the next steps.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button
          onClick={() => onChange(isSample ? null : SAMPLE_LOAN_TYPE)}
          size="small"
          sx={{ color: 'text.disabled' }}
        >
          {isSample ? 'Remove Sample Data' : 'Fill with Sample Data'}
        </Button>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ mb: 4.5, textAlign: 'left' }}>
        <LoanTypeCard
          icon="solar:user-heart-bold-duotone"
          title="Personal Loan"
          description="For your goals — education, travel, home needs, or life's milestones."
          selected={value === 'personal'}
          onClick={() => onChange('personal')}
        />
        <LoanTypeCard
          icon="solar:buildings-2-bold-duotone"
          title="Business Loan"
          description="For building or growing your business — capital, expansion, and more."
          selected={value === 'business'}
          onClick={() => onChange('business')}
        />
      </Stack>

      <Button
        variant="contained"
        disabled={!value}
        onClick={onContinue}
        sx={{
          height: 52,
          px: 5,
          borderRadius: '12px',
          bgcolor: '#1C2A6E',
          fontSize: 15,
          fontWeight: 700,
          boxShadow: '0 12px 24px -10px rgba(28,42,110,0.6)',
          '&:hover': { bgcolor: '#14205A' },
        }}
      >
        Continue →
      </Button>
    </Box>
  );
}
