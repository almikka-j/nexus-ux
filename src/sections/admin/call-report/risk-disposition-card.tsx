'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { cardSx, fieldSx, RadioRow, ChipToggleGroup, RISK_DRIVER_OPTIONS, CALL_DISPOSITION_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 7: AO Preliminary Risk & Call Disposition. Primary Risk
// Driver is multi-select (more than one driver can genuinely apply, e.g.
// both Capacity and Collateral); Call Disposition is single-select even
// though the PDF renders both with the same checkbox glyph — the five
// disposition outcomes are mutually exclusive results of one call. See
// the design spec's own note on this interpretive call.
// ----------------------------------------------------------------------

export function RiskDispositionCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const toggleRiskDriver = (value: (typeof RISK_DRIVER_OPTIONS)[number]['value']) => {
    const next = callReport.primaryRiskDrivers.includes(value)
      ? callReport.primaryRiskDrivers.filter((entry) => entry !== value)
      : [...callReport.primaryRiskDrivers, value];
    setCallReport({ primaryRiskDrivers: next });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        AO Preliminary Risk &amp; Call Disposition
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        The officer&apos;s own preliminary read on this application, based on the call.
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
            Primary Risk Driver
          </Typography>
          <ChipToggleGroup options={RISK_DRIVER_OPTIONS} selected={callReport.primaryRiskDrivers} onToggle={toggleRiskDriver} />
        </Box>

        <RadioRow
          label="Call Disposition"
          value={callReport.callDisposition}
          options={CALL_DISPOSITION_OPTIONS}
          onChange={(value) => setCallReport({ callDisposition: value })}
        />

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Reason / Key Condition"
          value={callReport.reasonKeyCondition}
          onChange={(event) => setCallReport({ reasonKeyCondition: event.target.value })}
          sx={fieldSx}
        />
      </Stack>
    </Box>
  );
}
