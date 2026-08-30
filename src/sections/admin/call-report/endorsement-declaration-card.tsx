'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { cardSx } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 8 (second occurrence — the source PDF numbers both this
// and NEXUS System Validation as "8"): Account Officer Endorsement
// Declaration. The declaration paragraphs are the PDF's own fixed
// attestation text, rendered read-only — not something an officer edits.
// Account Officer and Date/Time are plain read-only display, not
// TextFields — Account Officer is whoever's assigned to the application
// (application.assignedOfficer), and Date/Time is when this officer
// entered the Call Report step (review.stepTimestamps.callReport, set by
// ApplicationReviewHeader's markStepEntered). Neither is something the
// officer should be able to edit after the fact.
//
// Once callReportApprovalStatus === 'approved' (see
// call-report-approval-bundle-view.tsx), a second signature row appears
// below the Account Officer row in the same green box — Approved By
// (callReportApprovedBy) and Approval Date/Time (callReportApprovedAt),
// both stamped by the Approve action on the Call Report Approval screen.
// Hidden entirely before approval.
// ----------------------------------------------------------------------

function SignatureField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '9px',
          bgcolor: 'common.white',
          border: '1px solid #C7EDDA',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon} width={17} sx={{ color: '#0C8A4F' }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#0C8A4F',
            opacity: 0.75,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{ fontSize: 14.5, fontWeight: 700, color: '#14172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={value}
        >
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
  );
}

const DECLARATION_PARAGRAPHS = [
  'I hereby confirm that I have conducted the required pre-screening of the borrower/applicant in accordance with the Company’s established policies and procedures, including full compliance with Know Your Customer (KYC) requirements and applicable regulatory standards.',
  'I attest that all information, documents, and representations submitted in support of this application have been obtained through appropriate due diligence/KYC and are, to the best of my knowledge, complete, accurate, and truthful. I confirm that no material information has been knowingly omitted, withheld, or misrepresented.',
  'I further declare that I have not engaged in, and will not engage in, any form of connivance, collusion, or undisclosed arrangement with the borrower/applicant or any related party that may influence, circumvent, or compromise the integrity of the application or the Company’s policies.',
  'I affirm that this application has been prepared and endorsed in good faith, in accordance with Company policies, and within the scope of my responsibilities.',
  'I understand that any false declaration, material omission, or breach of this statement may subject me to disciplinary action, up to and including termination, and may expose me to legal liability.',
];

export function EndorsementDeclarationCard() {
  const { review } = useAdmin();
  const { application } = useRegistration();

  const accountOfficer = application.assignedOfficer || '—';
  const dateTimeLabel = review.stepTimestamps.callReport
    ? new Date(review.stepTimestamps.callReport).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

  return (
    <Box sx={cardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 2 }}>
        Account Officer Endorsement Declaration
      </Typography>

      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
        {DECLARATION_PARAGRAPHS.map((paragraph) => (
          <Typography key={paragraph.slice(0, 24)} sx={{ fontSize: 13, color: '#3B4256', lineHeight: 1.65 }}>
            {paragraph}
          </Typography>
        ))}
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5', mb: 2 }} />

      <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#E7F8F0' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Iconify icon="solar:verified-check-bold" width={17} sx={{ color: '#0C8A4F' }} />
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0C8A4F' }}>
              Endorsed
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#0C8A4F', opacity: 0.75 }}>
              Recorded automatically when this officer opened the Call Report step.
            </Typography>
          </Box>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SignatureField icon="solar:user-id-bold-duotone" label="Account Officer" value={accountOfficer} />
          <SignatureField icon="solar:clock-circle-bold-duotone" label="Date / Time" value={dateTimeLabel} />
        </Stack>

        {review.callReport.callReportApprovalStatus === 'approved' && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <SignatureField
              icon="solar:shield-check-bold-duotone"
              label="Approved By"
              value={review.callReport.callReportApprovedBy || '—'}
            />
            <SignatureField
              icon="solar:clock-circle-bold-duotone"
              label="Approval Date / Time"
              value={
                review.callReport.callReportApprovedAt
                  ? new Date(review.callReport.callReportApprovedAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '—'
              }
            />
          </Stack>
        )}
      </Box>
    </Box>
  );
}
