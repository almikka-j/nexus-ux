'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { TONE_COLORS, adminCardSx } from 'src/components/admin-ui';

import { ApplicationReviewHeader } from './application-review-header';
import { OfficerNotesHistory } from './officer-notes-history';

// ----------------------------------------------------------------------

export function ReconsiderationView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review, setReconsideration, addToNegativeList } = useAdmin();
  const [notes, setNotes] = useState(review.reconsideration.notes);
  const [notified, setNotified] = useState(false);

  if (!signUpData) return null;

  const handleDecision = (decision: 'approved' | 'rejected') => {
    setReconsideration({ notes, decision });

    if (decision === 'approved') {
      router.push(paths.admin.callReport(encodeURIComponent(signUpData.email)));
    } else {
      addToNegativeList({
        email: signUpData.email,
        name: `${signUpData.firstName} ${signUpData.lastName}`,
        reason: notes || 'Not approved on reconsideration',
      });
      setNotified(true);
    }
  };

  if (notified) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <ApplicationReviewHeader step="Reconsideration · Client Notified" reviewStep="reconsideration" />

        <Stack
          alignItems="center"
          textAlign="center"
          spacing={2}
          sx={{
            ...adminCardSx,
            p: { xs: 4, md: 6 },
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
              bgcolor: TONE_COLORS.error.bg,
            }}
          >
            <Iconify icon="solar:letter-bold" width={26} sx={{ color: TONE_COLORS.error.solid }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
            Client has been notified
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>
            This application was not approved on reconsideration. The client has been notified of
            the outcome.
          </Typography>
          <Button
            component="a"
            href={paths.admin.applications}
            variant="outlined"
            sx={{ borderRadius: '10px', mt: 1 }}
          >
            Back to Application List
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Reconsideration" reviewStep="reconsideration" />

      <Stack spacing={2.5}>
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            bgcolor: TONE_COLORS.error.bg,
            border: `1px solid ${TONE_COLORS.error.border}`,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Iconify icon="solar:danger-triangle-bold" width={20} sx={{ color: TONE_COLORS.error.text, mt: 0.25 }} />
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.error.text }}>
                Not approved on initial credit checking
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#7A1D17', mt: 0.5 }}>
                Review the notes below and decide whether this application should be reconsidered.
              </Typography>
              {review.creditChecking.decisionReason && (
                <Typography sx={{ fontSize: 13, color: '#7A1D17', mt: 1, fontStyle: 'italic' }}>
                  &quot;{review.creditChecking.decisionReason}&quot;
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>

        {review.creditChecking.notes && (
          <Box sx={adminCardSx}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Notes from initial credit checking
            </Typography>
            <Box sx={{ mt: 2 }}>
              <OfficerNotesHistory notes={review.creditChecking.notes} />
            </Box>
          </Box>
        )}

        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Reconsideration notes
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Document any adjustments, additional information, or context for this reconsideration.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={4}
            placeholder="e.g. Borrower provided updated proof of income showing sufficient debt-to-income ratio…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
            }}
          />
        </Box>

        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Approved?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Decide whether this application is approved on reconsideration.
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={() => handleDecision('approved')}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{
                bgcolor: '#12B76A',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { bgcolor: '#0C8A4F' },
              }}
            >
              Approve
            </Button>
            <Button
              onClick={() => handleDecision('rejected')}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{
                color: '#5A6273',
                borderColor: '#C7CCDA',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': {
                  color: '#1C2A6E',
                  borderColor: '#1C2A6E',
                  bgcolor: '#F5F7FF',
                },
              }}
            >
              No — Notify Client
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
