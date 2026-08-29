'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import {
  cardSx,
  fieldSx,
  RadioRow,
  ChipToggleGroup,
  INTERACTION_TYPE_OPTIONS,
  IDENTITY_STATUS_OPTIONS,
  IDENTITY_BASIS_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 1: Interaction Record. Application No./Customer Name are
// omitted here — already shown on the enclosing application card
// (ApplicationDetailsCard), so repeating them on every Call Report card
// would be redundant.
// ----------------------------------------------------------------------

export function InteractionRecordCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  const toggleIdentityBasis = (value: (typeof IDENTITY_BASIS_OPTIONS)[number]['value']) => {
    const next = callReport.identityBasis.includes(value)
      ? callReport.identityBasis.filter((entry) => entry !== value)
      : [...callReport.identityBasis, value];
    setCallReport({ identityBasis: next });
  };

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Interaction Record
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Basic details about this call or visit.
      </Typography>

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Call / Visit Date"
            type="date"
            value={callReport.callVisitDate}
            onChange={(event) => setCallReport({ callVisitDate: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Time"
            type="time"
            value={callReport.callTime}
            onChange={(event) => setCallReport({ callTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField
            label="Interviewed Person"
            value={callReport.interviewedPerson}
            onChange={(event) => setCallReport({ interviewedPerson: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
          <TextField
            label="Relationship to Borrower"
            value={callReport.relationshipToBorrower}
            onChange={(event) => setCallReport({ relationshipToBorrower: event.target.value })}
            sx={{ ...fieldSx, flex: 1 }}
          />
        </Stack>

        <RadioRow
          label="Interaction Type"
          value={callReport.interactionType}
          options={INTERACTION_TYPE_OPTIONS}
          onChange={(value) => setCallReport({ interactionType: value })}
        />

        <RadioRow
          label="Identity Status"
          value={callReport.identityStatus}
          options={IDENTITY_STATUS_OPTIONS}
          onChange={(value) => setCallReport({ identityStatus: value })}
        />

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
            Basis of Identity Confirmation
          </Typography>
          <ChipToggleGroup
            options={IDENTITY_BASIS_OPTIONS}
            selected={callReport.identityBasis}
            onToggle={toggleIdentityBasis}
          />
          {callReport.identityBasis.includes('other') && (
            <TextField
              fullWidth
              label="Other"
              value={callReport.identityBasisOther}
              onChange={(event) => setCallReport({ identityBasisOther: event.target.value })}
              sx={{ ...fieldSx, mt: 1.5 }}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );
}
