'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { buildInitialAiRecommendation } from '../initial-credit-checking-risk';

// ----------------------------------------------------------------------
// Entirely computed at render time from existing state — no new fields are
// stored on CreditChecking. Same "pure computation, never stored" pattern as
// the Initial Credit Checking AI review and the Call Report summary/ratios.
// Applicant only; no co-maker section (that concept doesn't exist elsewhere
// in this app yet).
//
// Opened from two places: Initial Credit Checking (decision is still
// 'pending' at that point — the officer hasn't clicked Approve/No yet) and
// Call Report (decision has already been made). Because of that, "cleared"
// can't be keyed off `decision === 'approved'` — it's keyed off the same
// debt-to-income risk level (`buildInitialAiRecommendation`) shown in the
// Initial AI Recommendation callout, so the two screens never disagree.
// ----------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#8891A6',
      }}
    >
      {children}
    </Typography>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', width: 110, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value}</Typography>
    </Stack>
  );
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#E7F8F0', border: '1px solid #C7EDDA' }}
    >
      <Iconify icon="solar:check-circle-bold" width={16} sx={{ color: '#0C8A4F', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#0C8A4F' }}>{children}</Typography>
    </Stack>
  );
}

function FindingBullet({ children }: { children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#C1C7D6', mt: 0.9, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{children}</Typography>
    </Stack>
  );
}

type CreditCheckingResultModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreditCheckingResultModal({ open, onClose }: CreditCheckingResultModalProps) {
  const { signUpData, application } = useRegistration();
  const { review } = useAdmin();
  const { cibiForm, loandexUpload, cicUpload, cmapUpload, nfisBapUpload } = review;

  if (!signUpData) return null;

  const fullName = `${signUpData.firstName} ${signUpData.lastName}`;
  const applicationNo = getLoanNumber(signUpData.email);
  const generatedAt = review.stepTimestamps.creditChecking
    ? new Date(review.stepTimestamps.creditChecking)
    : null;
  const generatedLabel = generatedAt
    ? `${generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ${generatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : '—';

  const allBureauReportsUploaded =
    !!cibiForm.reportFileName &&
    !!loandexUpload.fileName &&
    !!cicUpload.fileName &&
    !!cmapUpload.fileName &&
    !!nfisBapUpload.fileName;

  const initialRiskLevel = buildInitialAiRecommendation(
    application.financialInfo?.desiredLoanAmount ?? 0,
    application.financialInfo?.monthlyIncome ?? 0,
    application.financialInfo?.employmentStatus ?? 'Unknown'
  ).level;

  const isCleared = initialRiskLevel === 'good' && allBureauReportsUploaded;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 3, pb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>
            Initial Credit Checking Result
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
            Report generated {generatedLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="PDF export coming soon">
            <span>
              <IconButton
                disabled
                sx={{ border: '1px solid #E1E4ED', borderRadius: '10px', px: 1.5 }}
              >
                <Iconify icon="solar:file-download-bold" width={18} sx={{ color: '#8891A6' }} />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ border: '1px solid #E1E4ED', borderRadius: '10px' }}>
            <Iconify icon="solar:close-circle-bold" width={18} sx={{ color: '#8891A6' }} />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        <Stack spacing={2.5}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="flex-start"
            sx={{
              p: 2,
              borderRadius: '11px',
              bgcolor: isCleared ? '#E7F8F0' : '#FEF0D6',
            }}
          >
            <Iconify
              icon={isCleared ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'}
              width={20}
              sx={{ color: isCleared ? '#0C8A4F' : '#B36A05', mt: 0.25 }}
            />
            <Stack spacing={0.25}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: isCleared ? '#0C8A4F' : '#B36A05' }}>
                {isCleared ? 'Cleared — no negative records' : 'Pending — awaiting full review'}
              </Typography>
              <Typography sx={{ fontSize: 13, color: isCleared ? '#0C8A4F' : '#B36A05' }}>
                {isCleared
                  ? 'Recommending the loan application to proceed.'
                  : 'Complete the bureau report uploads and decision before this can be marked cleared.'}
              </Typography>
            </Stack>
          </Stack>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Credit Checking Report</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow label="Application No." value={applicationNo} />
              <FieldRow label="Applicant" value={fullName} />
              <FieldRow label="To" value="Credit Committee" />
              <FieldRow label="Thru" value={application.assignedOfficer ?? '—'} />
              <FieldRow label="From" value="Credit and Collection Department" />
              <FieldRow label="Date" value={generatedAt ? generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'} />
              <FieldRow label="Subject" value={`${fullName} — LOANDEX / BAP NFIS / CMAP / CIC`} />
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Negative Record
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 2 }}>
              Source: BAP Credit Bureau / CMAP report on accounts under watch lists, cancelled
              credit cards, adversely classified loan files, closed current accounts and court
              case files.
            </Typography>
            <Stack spacing={1}>
              <CheckRow>No negative findings on both CMAP &amp; NFIS</CheckRow>
              <CheckRow>No cancelled credit cards on file</CheckRow>
              <CheckRow>No adversely classified loan file</CheckRow>
              <CheckRow>No closed current account</CheckRow>
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
              Findings by Name
            </Typography>
            <Stack spacing={1}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1C2A6E' }}>
                {fullName}
              </Typography>
              <FindingBullet>No negative findings on both CMAP &amp; NFIS</FindingBullet>
              <FindingBullet>CIC: No match</FindingBullet>
              <FindingBullet>No current exposure loan in Loandex</FindingBullet>
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', bgcolor: '#EEF1FE' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:lightbulb-bold-duotone" width={18} sx={{ color: '#3448B0' }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                  Recommendation
                </Typography>
              </Stack>
              <Chip
                size="small"
                label={isCleared ? 'Proceed' : 'Pending'}
                sx={{
                  bgcolor: isCleared ? '#D8F4E6' : '#FEF0D6',
                  color: isCleared ? '#0C8A4F' : '#B36A05',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              />
            </Stack>
            <Typography sx={{ fontSize: 13.5, color: '#3448B0', lineHeight: 1.6 }}>
              {isCleared
                ? 'In view of the foregoing, the Credit Department is hereby recommending the said loan application to proceed.'
                : 'In view of the foregoing, the Credit Department will issue a recommendation once the credit checking review is complete.'}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
              <SectionLabel>Prepared by</SectionLabel>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mt: 1 }}>
                {application.assignedOfficer ?? '—'}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                Credit Officer · {generatedLabel}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
              <SectionLabel>Noted by</SectionLabel>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#8891A6', mt: 1 }}>
                Pending signature
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                Awaiting Credit Committee
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
