'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

import { cardSx, fieldSx } from './call-report-types';

// ----------------------------------------------------------------------
// Section 12: Comaker. Same repeatable-entry pattern as Collateral
// Information (section 9) — no gating radio (unlike Collateral's
// collateralOffered), since having zero comakers is a normal end state.
// Credit Investigation's CI Report reads review.callReport.comakers
// read-only from this same array (see ci-report-card.tsx).
// ----------------------------------------------------------------------

export function ComakerInformationCard() {
  const { review, addComakerEntry, updateComakerEntry, removeComakerEntry } = useAdmin();
  const { comakers } = review.callReport;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Comaker
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Anyone co-signing this loan alongside the borrower. Read by Credit Investigation&apos;s CI Report.
      </Typography>

      <Stack spacing={2}>
        {comakers.map((entry, index) => (
          <Box
            key={entry.id}
            sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Chip
                label={`Comaker ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => removeComakerEntry(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove Comaker
              </Button>
            </Stack>

            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Full Name"
                  value={entry.name}
                  onChange={(event) => updateComakerEntry(entry.id, { name: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Relationship to Borrower"
                  value={entry.relationshipToBorrower}
                  onChange={(event) =>
                    updateComakerEntry(entry.id, { relationshipToBorrower: event.target.value })
                  }
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>

              <TextField
                label="Address"
                value={entry.address}
                onChange={(event) => updateComakerEntry(entry.id, { address: event.target.value })}
                sx={fieldSx}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Contact Number"
                  value={entry.contactNumber}
                  onChange={(event) =>
                    updateComakerEntry(entry.id, { contactNumber: event.target.value })
                  }
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Occupation"
                  value={entry.occupation}
                  onChange={(event) => updateComakerEntry(entry.id, { occupation: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Monthly Income"
                  type="number"
                  value={entry.monthlyIncome}
                  onChange={(event) =>
                    updateComakerEntry(entry.id, { monthlyIncome: event.target.value })
                  }
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
            </Stack>
          </Box>
        ))}

        <Button
          onClick={addComakerEntry}
          variant="outlined"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          sx={{ borderRadius: '10px', alignSelf: 'flex-start' }}
        >
          Add Another Comaker
        </Button>
      </Stack>
    </Box>
  );
}
