'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin, SUPPORTED_TRANSACTION_TYPES } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { ApplicationReviewHeader } from './application-review-header';

import type { TransactionType } from 'src/auth/admin-context';

// ----------------------------------------------------------------------

const ALL_TRANSACTION_TYPES: { type: TransactionType; number: number }[] = [
  { type: 'New', number: 1 },
  { type: 'Renew', number: 2 },
  { type: 'Additional/Increase', number: 3 },
  { type: 'Compromised', number: 4 },
  { type: 'Restructured', number: 5 },
  { type: 'Rollover', number: 6 },
  { type: 'Extension', number: 7 },
  { type: 'Repricing', number: 8 },
  { type: 'Others', number: 9 },
];

export function TransactionTypeView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review, setTransactionType } = useAdmin();
  const [selected, setSelected] = useState<TransactionType | null>(review.transactionType);
  const [showUnsupported, setShowUnsupported] = useState(false);

  if (!signUpData) return null;

  const handleContinue = () => {
    if (!selected) return;

    setTransactionType(selected);

    if (SUPPORTED_TRANSACTION_TYPES.includes(selected)) {
      router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
    } else {
      setShowUnsupported(true);
    }
  };

  if (showUnsupported) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <ApplicationReviewHeader step="Transaction Type" reviewStep="transactionType" />

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
              bgcolor: '#FEF0D6',
            }}
          >
            <Iconify icon="solar:hourglass-line-bold-duotone" width={26} sx={{ color: '#B36A05' }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
            &quot;{selected}&quot; workflow coming soon
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>
            This transaction type is not yet supported in the credit checking workflow. Only New,
            Renew, Additional/Increase, and Others continue to the Requirement Checklist today.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
            <Button onClick={() => setShowUnsupported(false)} variant="outlined" sx={{ borderRadius: '10px' }}>
              Choose a Different Type
            </Button>
            <Button
              component="a"
              href={paths.admin.applications}
              variant="contained"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}
            >
              Back to Application List
            </Button>
          </Stack>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 3 · Transaction Type" reviewStep="transactionType" />

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
          Select transaction type
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 3 }}>
          Classify this application before proceeding to the requirement checklist.
        </Typography>

        <Stack spacing={1.25} sx={{ mb: 3 }}>
          {ALL_TRANSACTION_TYPES.map(({ type, number }) => {
            const isSelected = selected === type;
            const isSupported = SUPPORTED_TRANSACTION_TYPES.includes(type);

            return (
              <ButtonBase
                key={type}
                onClick={() => setSelected(type)}
                sx={{
                  width: 1,
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: isSelected ? '#1C2A6E' : '#E1E4ED',
                  bgcolor: isSelected ? '#EEF1FE' : 'common.white',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: isSelected ? '#1C2A6E' : '#D2D6E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#1C2A6E' }} />}
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#14172A', flex: 1, textAlign: 'left' }}>
                  {number}. {type}
                </Typography>
                {!isSupported && (
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#B36A05' }}>
                    Coming soon
                  </Typography>
                )}
              </ButtonBase>
            );
          })}
        </Stack>

        <Button
          onClick={handleContinue}
          disabled={!selected}
          variant="contained"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
          sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 3, '&:hover': { bgcolor: '#14205A' } }}
        >
          Continue
        </Button>
      </Box>
    </Container>
  );
}
