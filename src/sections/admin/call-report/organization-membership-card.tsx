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
  MEMBERSHIP_TYPE_OPTIONS,
  MEMBERSHIP_STANDING_OPTIONS,
} from './call-report-types';

// ----------------------------------------------------------------------

const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function OrganizationMembershipCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        5. Organization Membership
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Civic, professional, or community affiliations.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Member of an Organization"
          value={callReport.isOrgMember}
          options={YES_NO_OPTIONS}
          onChange={(value) => setCallReport({ isOrgMember: value })}
        />

        {callReport.isOrgMember === 'yes' && (
          <>
            <RadioRow
              label="Membership Type"
              value={callReport.membershipType}
              options={MEMBERSHIP_TYPE_OPTIONS}
              onChange={(value) => setCallReport({ membershipType: value })}
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
