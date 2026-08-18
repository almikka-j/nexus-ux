'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

// ----------------------------------------------------------------------
// Manual Pass/Fail judgment call, gated on Head Approval
// (`headApprovalStatus === 'approved'`, decided entirely on the
// "Appraisal - Approver Report" page now — this card's parent view
// doesn't render any Head Approval UI of its own). Pass routes forward
// to the Credit Scoring stub, which is effectively where this
// appraisal's own page ends — Pass is the terminal action; Fail requires
// a typed reason and calls `onFailed` so the parent view swaps to a
// terminal outcome screen instead — this app has no automated
// appraised-value-vs-loan-amount comparison.
// ----------------------------------------------------------------------

export function PassFailCard({ onFailed }: { onFailed: (reason: string) => void }) {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const { review, setAppraisal } = useAdmin();
  const { passed } = review.appraisal;

  const [failOpen, setFailOpen] = useState(false);
  const [failReasonDraft, setFailReasonDraft] = useState('');

  const confirmFail = () => {
    if (!failReasonDraft.trim()) return;
    setAppraisal({ passed: false, failReason: failReasonDraft.trim() });
    setFailOpen(false);
    onFailed(failReasonDraft.trim());
  };

  const markPassed = () => setAppraisal({ passed: true });

  const proceedToCreditScoring = () => {
    if (!signUpData) return;
    router.push(paths.admin.creditScoring(encodeURIComponent(signUpData.email)));
  };

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Passed?
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Decide whether this appraisal passes or fails.
      </Typography>

      {passed === null && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
          <Button
            onClick={markPassed}
            variant="contained"
            startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
            sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
          >
            Pass
          </Button>
          <Button
            onClick={() => setFailOpen(true)}
            variant="outlined"
            startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
            sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
          >
            Fail
          </Button>
        </Stack>
      )}

      {passed === true && (
        <Button
          onClick={proceedToCreditScoring}
          variant="contained"
          startIcon={<Iconify icon="solar:arrow-right-bold" width={18} />}
          sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#14205A' } }}
        >
          Proceed to Credit Scoring
        </Button>
      )}

      <ConfirmDialog
        open={failOpen}
        onClose={() => setFailOpen(false)}
        title="Reason for failing this appraisal"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={failReasonDraft}
            onChange={(event) => setFailReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!failReasonDraft.trim()}
            onClick={confirmFail}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Box>
  );
}
