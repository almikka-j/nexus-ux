// src/sections/admin/credit-investigation/ci-report-card.tsx
'use client';

import { useRef } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { buildTranscriptAutoFill } from '../credit-investigation-transcript';

// ----------------------------------------------------------------------
// Structured CI Report: Site Visit Details, Borrower/Residence
// Verification, Neighborhood Check, Findings & Assessment, Recommendation.
// Every field is directly editable regardless of transcript state.
// Uploading a transcript file only stores its filename (never reads
// contents) and triggers a deterministic auto-fill of every field below
// plus a read-only AI Summary — see credit-investigation-transcript.ts.
// Re-uploading overwrites current field values; the officer can edit again
// afterward.
// ----------------------------------------------------------------------

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } };

export function CiReportCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { signUpData } = useRegistration();
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;

  if (!signUpData) return null;

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;

  const handleTranscriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const autoFill = buildTranscriptAutoFill([signUpData.email, file.name], applicantName);
    setCiReport({
      transcriptFileName: file.name,
      transcriptUploadedAt: new Date().toISOString(),
      visitLocation: autoFill.visitLocation,
      identityConfirmed: autoFill.identityConfirmed,
      residenceConfirmed: autoFill.residenceConfirmed,
      businessConfirmed: autoFill.businessConfirmed,
      neighborhoodFeedback: autoFill.neighborhoodFeedback,
      neighborhoodStanding: autoFill.neighborhoodStanding,
      findings: autoFill.findings,
      recommendation: autoFill.recommendation,
      recommendationNotes: autoFill.recommendationNotes,
    });
    event.target.value = '';
  };

  const aiSummary = report.transcriptFileName
    ? buildTranscriptAutoFill([signUpData.email, report.transcriptFileName], applicantName).aiSummary
    : null;

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Report</Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the site-visit transcript to auto-fill this report, or type directly into any
        field below.
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ p: 2, mb: 2.5, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
      >
        <input ref={inputRef} type="file" accept=".txt,.doc,.docx,.pdf" hidden onChange={handleTranscriptUpload} />
        <Iconify icon="solar:mic-bold-duotone" width={20} sx={{ color: '#5A6273', flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
            {report.transcriptFileName ?? 'No transcript uploaded'}
          </Typography>
          {report.transcriptFileName && (
            <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
              Uploaded {new Date(report.transcriptUploadedAt!).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Typography>
          )}
        </Box>
        <Button
          onClick={() => inputRef.current?.click()}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:upload-bold-duotone" width={16} />}
          sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', flexShrink: 0 }}
        >
          {report.transcriptFileName ? 'Replace transcript' : 'Upload transcript'}
        </Button>
      </Stack>

      {aiSummary && (
        <Box sx={{ p: 2, mb: 2.5, borderRadius: '11px', bgcolor: '#EEF1FE', border: '1px solid #DCE1F7' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#3448B0', mb: 0.75 }}>
            AI Summary
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{aiSummary}</Typography>
        </Box>
      )}

      <Stack spacing={2.5}>
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Site Visit Details
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Visit date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={report.visitDate}
              onChange={(event) => setCiReport({ visitDate: event.target.value })}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Visit time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={report.visitTime}
              onChange={(event) => setCiReport({ visitTime: event.target.value })}
              sx={fieldSx}
            />
          </Stack>
          <TextField
            fullWidth
            label="Location visited"
            value={report.visitLocation}
            onChange={(event) => setCiReport({ visitLocation: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Visiting officer"
            value={report.visitingOfficer}
            onChange={(event) => setCiReport({ visitingOfficer: event.target.value })}
            sx={fieldSx}
          />
        </Stack>

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Borrower/Residence Verification
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              select
              label="Identity confirmed"
              value={report.identityConfirmed}
              onChange={(event) =>
                setCiReport({ identityConfirmed: event.target.value as typeof report.identityConfirmed })
              }
              sx={fieldSx}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="for-verification">For verification</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Residence confirmed"
              value={report.residenceConfirmed}
              onChange={(event) =>
                setCiReport({ residenceConfirmed: event.target.value as typeof report.residenceConfirmed })
              }
              sx={fieldSx}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="for-verification">For verification</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Business confirmed"
              value={report.businessConfirmed}
              onChange={(event) =>
                setCiReport({ businessConfirmed: event.target.value as typeof report.businessConfirmed })
              }
              sx={fieldSx}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="not-applicable">Not applicable</MenuItem>
            </TextField>
          </Stack>
        </Stack>

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Neighborhood Check
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Neighbor/community feedback"
            value={report.neighborhoodFeedback}
            onChange={(event) => setCiReport({ neighborhoodFeedback: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            select
            label="Standing"
            value={report.neighborhoodStanding}
            onChange={(event) =>
              setCiReport({ neighborhoodStanding: event.target.value as typeof report.neighborhoodStanding })
            }
            sx={fieldSx}
          >
            <MenuItem value="good-standing">Good standing</MenuItem>
            <MenuItem value="with-concern">With concern</MenuItem>
            <MenuItem value="not-verified">Not verified</MenuItem>
          </TextField>
        </Stack>

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Findings &amp; Assessment
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={report.findings}
            onChange={(event) => setCiReport({ findings: event.target.value })}
            sx={fieldSx}
          />
        </Stack>

        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
            Recommendation
          </Typography>
          <TextField
            fullWidth
            select
            label="Preliminary recommendation"
            value={report.recommendation}
            onChange={(event) =>
              setCiReport({ recommendation: event.target.value as typeof report.recommendation })
            }
            sx={fieldSx}
          >
            <MenuItem value="proceed-as-requested">Proceed as requested</MenuItem>
            <MenuItem value="proceed-with-conditions">Proceed with conditions</MenuItem>
            <MenuItem value="needs-additional-verification">Needs additional verification</MenuItem>
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Notes"
            value={report.recommendationNotes}
            onChange={(event) => setCiReport({ recommendationNotes: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
