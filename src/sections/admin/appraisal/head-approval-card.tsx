'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, outlinedNavyButtonSx, TONE_COLORS } from 'src/components/admin-ui';

// ----------------------------------------------------------------------
// Simulated head-officer review of the submitted appraisal report/file —
// renders directly once reportSubmitted (see appraisal-view.tsx) — same
// "no real second login" convention as CI Fee approval. Declining
// requires a typed reason and clears every bundle's submitted report/file
// (clearAllAppraisalBundleReports) so the assigned appraiser (in-house or
// external) resubmits; each bundle's appraiserType and TCT membership are
// preserved — only report contents are cleared.
// ----------------------------------------------------------------------

export function HeadApprovalCard() {
  const { review, setAppraisal, clearAllAppraisalBundleReports } = useAdmin();
  const { headApprovalStatus, headApprovalDeclineReason } = review.appraisal;
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const approve = () => setAppraisal({ headApprovalStatus: 'approved' });

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setAppraisal({ headApprovalStatus: 'pending', headApprovalDeclineReason: declineReason.trim() });
    clearAllAppraisalBundleReports();
    setDeclineOpen(false);
    setDeclineReason('');
  };

  const tone = headApprovalStatus === 'approved' ? TONE_COLORS.success : TONE_COLORS.warning;

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Head Approval
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
        Reviewed and noted by the department head before the Pass/Fail decision below.
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ p: 2, borderRadius: '12px', bgcolor: tone.bg }}
      >
        <Iconify
          icon={headApprovalStatus === 'approved' ? 'solar:check-circle-bold' : 'solar:hourglass-bold-duotone'}
          width={20}
          sx={{ color: tone.text, flexShrink: 0 }}
        />
        <Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: tone.text }}>
            {headApprovalStatus === 'approved' ? 'Approved — reviewed and noted' : 'Awaiting Head Approval'}
          </Typography>
          {headApprovalDeclineReason && headApprovalStatus === 'pending' && (
            <Typography sx={{ fontSize: 12, color: '#5A6273', mt: 0.25 }}>
              Last decline reason: {headApprovalDeclineReason}
            </Typography>
          )}
        </Box>
      </Stack>

      {headApprovalStatus === 'pending' && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
              onClick={approve}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#0C8A4F', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0A7042' } }}
            >
              Simulate: Head Approves
            </Button>
            <Button
              onClick={() => setDeclineOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{ color: '#B32C22', borderColor: '#F3C4BE', borderRadius: '10px', px: 2.5, '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(179,44,34,0.04)' } }}
            >
              Simulate: Head Declines
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
            There’s no real Head login in this prototype — approving or declining here simulates
            your review.
          </Typography>
        </Stack>
      )}

      <ConfirmDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Reason for declining"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what needs revision…"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineReason.trim()}
            onClick={confirmDecline}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />
    </Box>
  );
}
