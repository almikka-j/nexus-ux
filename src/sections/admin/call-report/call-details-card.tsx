'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

import { useAdmin } from 'src/auth/admin-context';

import {
  cardSx,
  fieldSx,
  CALL_TYPE_OPTIONS,
  PLACE_OF_CALL_OPTIONS,
  CALL_STATUS_OPTIONS,
  IDENTITY_CONFIRMED_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

function RadioRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <FormControl>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
        {label}
      </Typography>
      <RadioGroup
        row
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: 13.5 }}>{option.label}</Typography>}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

export function CallDetailsCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        1. Call Details
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Basic details about this call.
      </Typography>

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Call Date"
            type="date"
            value={callReport.callDate}
            onChange={(event) => setCallReport({ callDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Call Time"
            type="time"
            value={callReport.callTime}
            onChange={(event) => setCallReport({ callTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <RadioRow
          label="Call Type"
          value={callReport.callType}
          options={CALL_TYPE_OPTIONS}
          onChange={(value) => setCallReport({ callType: value })}
        />

        <RadioRow
          label="Place of Call"
          value={callReport.placeOfCall}
          options={PLACE_OF_CALL_OPTIONS}
          onChange={(value) => setCallReport({ placeOfCall: value })}
        />

        {callReport.placeOfCall === 'other' && (
          <TextField
            label="Specify Place of Call"
            value={callReport.placeOfCallOther}
            onChange={(event) => setCallReport({ placeOfCallOther: event.target.value })}
            sx={fieldSx}
          />
        )}

        <Stack direction="row" spacing={2}>
          <TextField
            label="Client Representative"
            value={callReport.clientRepresentative}
            onChange={(event) => setCallReport({ clientRepresentative: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="PG Finance Representative"
            value={callReport.pgRepresentative}
            onChange={(event) => setCallReport({ pgRepresentative: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <RadioRow
          label="Call Status"
          value={callReport.callStatus}
          options={CALL_STATUS_OPTIONS}
          onChange={(value) => setCallReport({ callStatus: value })}
        />

        <RadioRow
          label="Identity Confirmed"
          value={callReport.identityConfirmed}
          options={IDENTITY_CONFIRMED_OPTIONS}
          onChange={(value) => setCallReport({ identityConfirmed: value })}
        />
      </Stack>
    </Box>
  );
}

export { RadioRow };
