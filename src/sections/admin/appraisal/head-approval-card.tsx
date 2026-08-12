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
// same "no real second login" convention as CI Fee approval. Declining
// requires a typed reason and clears the submitted report/file so the
// assigned appraiser (in-house or external) resubmits; the appraiserType
// choice itself is preserved.
// ----------------------------------------------------------------------

export function HeadApprovalCard() {
  const { review, setAppraisal, setAppraisalReport } = useAdmin();
  const { headApprovalStatus, headApprovalDeclineReason } = review.appraisal;
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const approve = () => setAppraisal({ headApprovalStatus: 'approved' });

  const confirmDecline = () => {
    if (!declineReason.trim()) return;
    setAppraisal({ headApprovalStatus: 'pending', headApprovalDeclineReason: declineReason.trim() });
    setAppraisalReport({ uploadedAt: null, fileName: null, fileUrl: null });
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
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ p: 2, borderRadius: '12px', bgcolor: tone.bg }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify
            icon={headApprovalStatus === 'approved' ? 'solar:check-circle-bold' : 'solar:hourglass-bold-duotone'}
            width={20}
            sx={{ color: tone.text }}
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
          <Stack direction="row" spacing={1.25} flexShrink={0}>
            <Button
              onClick={approve}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#0C8A4F', borderRadius: '10px', px: 2, '&:hover': { bgcolor: '#0A7042' } }}
            >
              Simulate: Head Approves
            </Button>
            <Button
              onClick={() => setDeclineOpen(true)}
              variant="outlined"
              size="small"
              sx={{ ...outlinedNavyButtonSx, px: 2, bgcolor: 'common.white' }}
            >
              Simulate: Head Declines
            </Button>
          </Stack>
        )}
      </Stack>

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
