'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { ApplicationReviewHeader } from './application-review-header';

// ----------------------------------------------------------------------

const REQUIREMENT_ITEMS = [
  'Valid government ID verified',
  'Proof of income / financial documents verified',
  'Credit report reviewed (CIBI)',
  'Call report and loan package proposal approved',
  'Collateral details confirmed (if applicable)',
  'Transaction type classification confirmed',
];

export function RequirementChecklistView() {
  const { signUpData } = useRegistration();
  const { review, setRequirementChecklist } = useAdmin();
  const [checkedItems, setCheckedItems] = useState<string[]>(review.requirementChecklist.checkedItems);
  const [collateralNotes, setCollateralNotes] = useState(review.requirementChecklist.collateralNotes);

  if (!signUpData) return null;

  const toggleItem = (item: string) => {
    setCheckedItems((prev) =>
      prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]
    );
  };

  const allChecked = checkedItems.length === REQUIREMENT_ITEMS.length;

  const handleEndorse = () => {
    setRequirementChecklist({ checkedItems, collateralNotes, endorsed: true });
  };

  if (review.requirementChecklist.endorsed) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <ApplicationReviewHeader
          step="Requirement Checklist · Endorsed"
          reviewStep="requirementChecklist"
        />

        <Stack
          alignItems="center"
          textAlign="center"
          spacing={2}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: '16px',
            bgcolor: 'common.white',
            border: '1px solid #EBEDF3',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#E7F8F0',
            }}
          >
            <Iconify icon="solar:check-circle-bold" width={26} sx={{ color: '#12B76A' }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
            Endorsed for comprehensive process
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>
            This application has been endorsed with its requirement checklist and collateral
            details for the next stage of processing.
          </Typography>
          <Button
            component="a"
            href={paths.admin.applications}
            variant="contained"
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }}
          >
            Back to Application List
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 4 · Requirement Checklist" reviewStep="requirementChecklist" />

      <Stack spacing={2.5}>
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            bgcolor: 'common.white',
            border: '1px solid #EBEDF3',
            boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Requirement checklist
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Confirm each requirement before endorsing this application for comprehensive
            processing.
          </Typography>

          <Stack spacing={0.5}>
            {REQUIREMENT_ITEMS.map((item) => (
              <FormControlLabel
                key={item}
                control={
                  <Checkbox
                    checked={checkedItems.includes(item)}
                    onChange={() => toggleItem(item)}
                    sx={{ color: '#C7CCDA', '&.Mui-checked': { color: '#1C2A6E' } }}
                  />
                }
                label={<Typography sx={{ fontSize: 14, color: '#3B4256' }}>{item}</Typography>}
              />
            ))}
          </Stack>
        </Box>

        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            bgcolor: 'common.white',
            border: '1px solid #EBEDF3',
            boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Collateral
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Request or adjust collateral details for this application, if applicable.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="e.g. Request updated collateral appraisal for the pledged property…"
            value={collateralNotes}
            onChange={(event) => setCollateralNotes(event.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        </Box>

        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            bgcolor: 'common.white',
            border: '1px solid #EBEDF3',
            boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                Endorse document
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                {allChecked
                  ? 'All requirements confirmed — ready to endorse.'
                  : `${checkedItems.length}/${REQUIREMENT_ITEMS.length} requirements confirmed.`}
              </Typography>
            </Box>
            <Button
              onClick={handleEndorse}
              disabled={!allChecked}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
            >
              Endorse
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
