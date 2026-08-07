// src/sections/admin/credit-investigation/ci-report-card.tsx
'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { CiChildEntry, CiTradeEntry, CiIncomeSourceEntry, CiBankAccountEntry } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';

import { buildTranscriptAutoFill } from '../credit-investigation-transcript';

// ----------------------------------------------------------------------
// The ~15-section CI Report. Replaces the old 5-section version
// (Site Visit Details, Borrower/Residence Verification, Neighborhood
// Check, Findings & Assessment, Recommendation) with the fuller
// structure below. See docs/superpowers/specs/2026-08-06-ci-report-
// redesign-design.md for the full rationale.
//
// Three kinds of fields:
// - Read-only, pre-filled from application/Call Report data (header
//   block, Employment Status, Loan Purpose default, Comaker) — never
//   edited here.
// - Rich-text narrative fields (Subject As Of, Spouse, Assets, Negative
//   Record remarks, Health and Habits, Comments) via RichTextField.
// - Structured fields and array-entry sections, editable directly.
//
// Uploading a transcript auto-fills only the fields a transcript could
// plausibly attest to (see credit-investigation-transcript.ts) — it
// never touches the header block, Loan Purpose, or Comaker.
// ----------------------------------------------------------------------

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', letterSpacing: '0.02em' }}>
      {children}
    </Typography>
  );
}

export function CiReportCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { signUpData, application } = useRegistration();
  const { review, setCiReport } = useAdmin();
  const { report } = review.creditInvestigation;
  const { personalInfo, financialInfo } = application;

  const isMarried = personalInfo?.civilStatus === 'Married';

  // One-time pre-fill from application/Call Report data — fires only while
  // the target field is still at its untouched default, so it can never
  // clobber an officer's own edit on a later render. Mirrors the
  // established "default once" convention already used elsewhere in this
  // app (e.g. loan-discussion-card.tsx's Final Loan Purpose default).
  useEffect(() => {
    const patch: Record<string, string> = {};
    if (!report.residencePermanentAddress && personalInfo) {
      const parts = [personalInfo.address, personalInfo.barangay, personalInfo.city, personalInfo.province]
        .filter(Boolean)
        .join(', ');
      if (parts) patch.residencePermanentAddress = parts;
    }
    if (!report.employmentStatus && financialInfo?.employmentStatus) {
      patch.employmentStatus = financialInfo.employmentStatus;
    }
    if (!report.loanPurposeNotes && financialInfo?.loanPurpose) {
      patch.loanPurposeNotes = `<p>${financialInfo.loanPurpose}</p>`;
    }
    if (!report.spouseNotes && isMarried && personalInfo) {
      const spouseName = [personalInfo.spouseFirstName, personalInfo.spouseMiddleName, personalInfo.spouseLastName]
        .filter(Boolean)
        .join(' ');
      const spouseBits = [
        spouseName,
        personalInfo.spouseBirthday ? `Born on ${personalInfo.spouseBirthday}` : '',
      ]
        .filter(Boolean)
        .join(' — ');
      if (spouseBits) patch.spouseNotes = `<p>${spouseBits}</p>`;
    }
    if (Object.keys(patch).length > 0) setCiReport(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!signUpData) return null;

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const isBusinessOwner = financialInfo?.employmentStatus === 'Business Owner';

  const handleTranscriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const autoFill = buildTranscriptAutoFill([signUpData.email, file.name], applicantName);
    setCiReport({
      transcriptFileName: file.name,
      transcriptUploadedAt: new Date().toISOString(),
      residenceLeasedType: autoFill.residenceLeasedType,
      residenceLengthOfStay: autoFill.residenceLengthOfStay,
      presentAddress: autoFill.presentAddressSameAsPermanent ? report.residencePermanentAddress : report.presentAddress,
      employmentType: autoFill.employmentType,
      lengthOfService: autoFill.lengthOfService,
      negativeRecordFinding: autoFill.negativeRecordFinding,
      subjectAsOf: autoFill.findingsNarrativeHtml,
    });
    event.target.value = '';
  };

  const aiSummary = report.transcriptFileName
    ? buildTranscriptAutoFill([signUpData.email, report.transcriptFileName], applicantName).aiSummary
    : null;

  return (
    <Box sx={adminCardSx}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Report</Typography>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Upload the site-visit transcript to auto-fill applicable fields, or type directly into any field below.
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
          sx={{ ...outlinedNavyButtonSx, flexShrink: 0 }}
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

      {/* Header: read-only Residence + Business/Work address, from application data */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <Box sx={{ flex: 1, p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <SectionLabel>Residence Address</SectionLabel>
          <Typography sx={{ fontSize: 13.5, color: '#14172A', mt: 0.75 }}>
            {report.residencePermanentAddress || 'Not on file'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
          <SectionLabel>Business/Work Address</SectionLabel>
          <Typography sx={{ fontSize: 13.5, color: '#14172A', mt: 0.75 }}>
            {isBusinessOwner ? report.employerAddress || 'Not yet entered below' : 'Not applicable'}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        <TextField
          label="Date Inspected"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={report.visitDate}
          onChange={(event) => setCiReport({ visitDate: event.target.value })}
          sx={{ ...fieldSx, maxWidth: { sm: 260 } }}
        />

        <RichTextField
          label="Subject As Of"
          value={report.subjectAsOf}
          onChange={(html) => setCiReport({ subjectAsOf: html })}
          placeholder="Summary of the investigation as of the visit date…"
        />

        <RichTextField
          label="Spouse"
          value={report.spouseNotes}
          onChange={(html) => setCiReport({ spouseNotes: html })}
          placeholder="Spouse name, citizenship, and any relevant notes…"
        />

        <ChildrenSection
          entries={report.children}
          onChange={(children) => setCiReport({ children })}
        />
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------
// Array-entry sub-sections. Each owns its own add/remove/update via one
// setCiReport({ <arrayField>: nextArray }) call — CiReport has no
// per-array context methods (unlike Call Report's Comaker/Collateral),
// since CiReportCard already has direct setCiReport access and there's
// only ever one CI Report per application, not a shared cross-page array.
// ----------------------------------------------------------------------

function ChildrenSection({
  entries,
  onChange,
}: {
  entries: CiChildEntry[];
  onChange: (next: CiChildEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiChildEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([...entries, { id: crypto.randomUUID(), name: '', age: '', occupationOrSchool: '' }]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Children</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Child ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Name"
                value={entry.name}
                onChange={(event) => update(entry.id, { name: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
              <TextField
                label="Age"
                type="number"
                value={entry.age}
                onChange={(event) => update(entry.id, { age: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Occupation/School"
                value={entry.occupationOrSchool}
                onChange={(event) => update(entry.id, { occupationOrSchool: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Children
        </Button>
      </Stack>
    </Stack>
  );
}
