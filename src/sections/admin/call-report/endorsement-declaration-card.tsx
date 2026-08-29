'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

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
// ----------------------------------------------------------------------

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6', mb: 0.4 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Box>
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

      <Stack direction="row" spacing={2}>
        <ReadOnlyField label="Account Officer" value={accountOfficer} />
        <ReadOnlyField label="Date / Time" value={dateTimeLabel} />
      </Stack>
    </Box>
  );
}
