'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { cardSx, fieldSx, RadioRow, PROPOSAL_INTEREST_RATE_BASIS_OPTIONS, PROPOSAL_COMPUTATION_TYPE_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 6 (the PDF's own section number): Proposed Loan Package.
// Original Requested Amount defaults once from the application's own
// desired loan amount, same "default once, never overwrite an edit"
// convention this codebase already uses elsewhere for prefilled fields.
//
// Redesigned from a single flat stack of 10 fields into: a live summary
// strip up top (the 3 numbers a reviewer scans for first — proposed
// amount/term/amortization), then icon-headed subsections grouping fields
// by what they describe (the pricing terms vs. the facility/structure vs.
// the final proposed numbers), matching the DetailSection convention from
// application-details-card.tsx.
// ----------------------------------------------------------------------

function formatPeso(value: string): string {
  const numeric = Number(value.replace(/[^0-9.]/g, ''));
  if (!value.trim() || Number.isNaN(numeric)) return '—';
  return `₱${numeric.toLocaleString()}`;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.35} sx={{ px: 1.75, py: 1.25, flex: 1, minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#9AA2B4',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{ fontSize: 17, fontWeight: 800, color: '#14172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        title={value}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: '8px',
          bgcolor: '#EEF1FE',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon} width={14} sx={{ color: '#3448B0' }} />
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
    </Stack>
  );
}

export function ProposedLoanPackageCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;
  const { application } = useRegistration();

  const didDefault = useRef(false);
  useEffect(() => {
    if (didDefault.current) return;
    if (callReport.originalRequestedAmount) {
      didDefault.current = true;
      return;
    }
    const desired = application.financialInfo?.desiredLoanAmount;
    if (desired) {
      didDefault.current = true;
      setCallReport({ originalRequestedAmount: String(desired) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.financialInfo?.desiredLoanAmount]);

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        6. Proposed Loan Package
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        The preliminary package the officer is proposing based on this call.
      </Typography>

      <Stack
        direction="row"
        flexWrap="wrap"
        sx={{
          mb: 2.5,
          border: '1px solid #EEF0F5',
          borderRadius: '12px',
          bgcolor: '#FAFBFD',
          '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
        }}
      >
        <SummaryStat label="Proposed Amount" value={formatPeso(callReport.proposedLoanAmount)} />
        <SummaryStat
          label="Term"
          value={callReport.proposedLoanTermMonths ? `${callReport.proposedLoanTermMonths} months` : '—'}
        />
        <SummaryStat label="Monthly Amortization" value={formatPeso(callReport.estimatedMonthlyAmortization)} />
      </Stack>

      <Stack spacing={2.5}>
        <Stack spacing={1.5}>
          <SectionHeading icon="solar:tag-price-bold-duotone" title="Pricing" />
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Original Requested Amount"
              value={callReport.originalRequestedAmount}
              onChange={(event) => setCallReport({ originalRequestedAmount: event.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Interest Rate"
              value={callReport.proposalInterestRate}
              onChange={(event) => setCallReport({ proposalInterestRate: event.target.value })}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              sx={fieldSx}
            />
          </Stack>
          <RadioRow
            label="Interest Rate Basis"
            value={callReport.proposalInterestRateBasis}
            options={PROPOSAL_INTEREST_RATE_BASIS_OPTIONS}
            onChange={(value) => setCallReport({ proposalInterestRateBasis: value })}
          />
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionHeading icon="solar:document-text-bold-duotone" title="Facility & Structure" />
          <TextField
            fullWidth
            label="Proposed Facility / Product"
            value={callReport.proposedFacilityProduct}
            onChange={(event) => setCallReport({ proposedFacilityProduct: event.target.value })}
            sx={fieldSx}
          />
          <Box>
            <RadioRow
              label="Computation Type"
              value={callReport.proposalComputationType}
              options={PROPOSAL_COMPUTATION_TYPE_OPTIONS}
              onChange={(value) => setCallReport({ proposalComputationType: value })}
            />
            {callReport.proposalComputationType === 'other' && (
              <TextField
                fullWidth
                label="Other"
                value={callReport.proposalComputationTypeOther}
                onChange={(event) => setCallReport({ proposalComputationTypeOther: event.target.value })}
                sx={{ ...fieldSx, mt: 1.5 }}
              />
            )}
          </Box>
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionHeading icon="solar:calculator-bold-duotone" title="Proposed Terms" />
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Proposed Loan Amount"
              value={callReport.proposedLoanAmount}
              onChange={(event) => setCallReport({ proposedLoanAmount: event.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Estimated Monthly Amortization"
              value={callReport.estimatedMonthlyAmortization}
              onChange={(event) => setCallReport({ estimatedMonthlyAmortization: event.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
              sx={fieldSx}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Proposed Loan Term"
              value={callReport.proposedLoanTermMonths}
              onChange={(event) => setCallReport({ proposedLoanTermMonths: event.target.value })}
              InputProps={{ endAdornment: <InputAdornment position="end">months</InputAdornment> }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Other Request"
              value={callReport.otherRequest}
              onChange={(event) => setCallReport({ otherRequest: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
