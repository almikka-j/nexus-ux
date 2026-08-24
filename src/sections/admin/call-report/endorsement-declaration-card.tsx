'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { cardSx, fieldSx } from './call-report-types';

// ----------------------------------------------------------------------
// PDF section 8 (second occurrence — the source PDF numbers both this
// and NEXUS System Validation as "8"): Account Officer Endorsement
// Declaration. The declaration paragraphs are the PDF's own fixed
// attestation text, rendered read-only — not something an officer edits.
// Account Officer name defaults once from the assigned officer, same
// "default once" convention every other prefilled field on this page
// follows.
// ----------------------------------------------------------------------

const DECLARATION_PARAGRAPHS = [
  'I hereby confirm that I have conducted the required pre-screening of the borrower/applicant in accordance with the Company’s established policies and procedures, including full compliance with Know Your Customer (KYC) requirements and applicable regulatory standards.',
  'I attest that all information, documents, and representations submitted in support of this application have been obtained through appropriate due diligence/KYC and are, to the best of my knowledge, complete, accurate, and truthful. I confirm that no material information has been knowingly omitted, withheld, or misrepresented.',
  'I further declare that I have not engaged in, and will not engage in, any form of connivance, collusion, or undisclosed arrangement with the borrower/applicant or any related party that may influence, circumvent, or compromise the integrity of the application or the Company’s policies.',
  'I affirm that this application has been prepared and endorsed in good faith, in accordance with Company policies, and within the scope of my responsibilities.',
  'I understand that any false declaration, material omission, or breach of this statement may subject me to disciplinary action, up to and including termination, and may expose me to legal liability.',
];

export function EndorsementDeclarationCard() {
  const { review, setCallReport } = useAdmin();
  const { callReport } = review;
  const { application } = useRegistration();

  const didDefault = useRef(false);
  useEffect(() => {
    if (didDefault.current || callReport.accountOfficerName) return;
    if (application.assignedOfficer) {
      didDefault.current = true;
      setCallReport({ accountOfficerName: application.assignedOfficer });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.assignedOfficer]);

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

      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Account Officer"
            value={callReport.accountOfficerName}
            onChange={(event) => setCallReport({ accountOfficerName: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Date / Time"
            type="datetime-local"
            value={callReport.accountOfficerDateTime}
            onChange={(event) => setCallReport({ accountOfficerDateTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Reviewed by Head"
            value={callReport.reviewedByHeadName}
            onChange={(event) => setCallReport({ reviewedByHeadName: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Date / Time"
            type="datetime-local"
            value={callReport.reviewedByHeadDateTime}
            onChange={(event) => setCallReport({ reviewedByHeadDateTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
