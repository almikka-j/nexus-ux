'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';

import { RadioRow } from './call-details-card';
import { CollateralEntryFields } from './collateral-entry-fields';
import { cardSx, COLLATERAL_OFFERED_OPTIONS } from './call-report-types';

// ----------------------------------------------------------------------

export function CollateralInformationCard() {
  const {
    review,
    setCallReport,
    addCollateralEntry,
    updateCollateralEntry,
    removeCollateralEntry,
  } = useAdmin();
  const { callReport } = review;

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        9. Collateral Information
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Whether collateral is offered, and details for each item.
      </Typography>

      <Stack spacing={2.5}>
        <RadioRow
          label="Collateral Offered"
          value={callReport.collateralOffered}
          options={COLLATERAL_OFFERED_OPTIONS}
          onChange={(value) => setCallReport({ collateralOffered: value })}
        />

        {callReport.collateralOffered === 'yes' && (
          <Stack spacing={2}>
            {callReport.collateralEntries.map((entry, index) => (
              <Box
                key={entry.id}
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  border: '1px solid #EEF0F5',
                  bgcolor: '#FAFBFD',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Chip
                    label={`Collateral ${index + 1}`}
                    size="small"
                    sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
                  />
                  <Button
                    onClick={() => removeCollateralEntry(entry.id)}
                    size="small"
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                    sx={{ color: '#F04438' }}
                  >
                    Remove Collateral
                  </Button>
                </Stack>
                <CollateralEntryFields
                  entry={entry}
                  onChange={(data) => updateCollateralEntry(entry.id, data)}
                />
              </Box>
            ))}

            <Button
              onClick={addCollateralEntry}
              variant="outlined"
              startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
              sx={{ borderRadius: '10px', alignSelf: 'flex-start' }}
            >
              Add Another Collateral
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
