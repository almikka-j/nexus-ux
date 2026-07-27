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
  RESIDENCE_YEARS_OPTIONS,
  RESIDENCE_STATUS_OPTIONS,
  YES_NO_PREFER_NOT_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

export function ResidenceHouseholdCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        3. Residence and Household Information
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Living situation and household composition.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Years Living at Current Residence"
          value={callReport.yearsAtResidence}
          options={RESIDENCE_YEARS_OPTIONS}
          onChange={(value) => setCallReport({ yearsAtResidence: value })}
        />

        <RadioRow
          label="Residence Status"
          value={callReport.residenceStatus}
          options={RESIDENCE_STATUS_OPTIONS}
          onChange={(value) => setCallReport({ residenceStatus: value })}
        />

        {callReport.residenceStatus === 'other' && (
          <TextField
            label="Other Residence Status"
            value={callReport.residenceStatusOther}
            onChange={(event) => setCallReport({ residenceStatusOther: event.target.value })}
            sx={fieldSx}
          />
        )}

        <Stack direction="row" spacing={2}>
          <TextField
            label="Number of Dependents"
            type="number"
            value={callReport.numberOfDependents}
            onChange={(event) => setCallReport({ numberOfDependents: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Number of Household Income Earners"
            type="number"
            value={callReport.numberOfIncomeEarners}
            onChange={(event) => setCallReport({ numberOfIncomeEarners: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <RadioRow
          label="Supporting More Than One Family"
          value={callReport.supportingMultipleFamilies}
          options={YES_NO_PREFER_NOT_OPTIONS}
          onChange={(value) => setCallReport({ supportingMultipleFamilies: value })}
        />
      </Stack>
    </Box>
  );
}
