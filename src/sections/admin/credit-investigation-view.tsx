// src/sections/admin/credit-investigation-view.tsx
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { CreditInvestigationDoc, RequirementDoc } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { CollapsibleSection, CollapsibleSectionBadge } from 'src/components/collapsible-section';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { RequirementDocRow } from './requirement-doc-row';
import { RequestDocumentsDrawer } from './request-documents-drawer';
import { CiFeeCard } from './credit-investigation/ci-fee-card';
import { CiReportCard } from './credit-investigation/ci-report-card';
import { ReadOnlyRequirementDocRow } from './credit-investigation/credit-investigation-doc-row';
import { buildCreditInvestigationSummary } from './credit-investigation-risk';
import { buildTranscriptAutoFill } from './credit-investigation-transcript';
import {
  REQUIREMENT_DOC_META,
  REQUIREMENT_SUBGROUP_LABELS,
  REQUIREMENT_SUBGROUP_ORDER,
} from './requirement-checklist-docs';

import type { OutreachChannel } from 'src/auth/admin-context';
import type { RequirementDocMeta } from './requirement-checklist-docs';

// ----------------------------------------------------------------------

const RISK_STYLES = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Ready' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Almost ready' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'Not ready' },
} as const;

// The Document Checklist's fixed document set — every REQUIREMENT_DOC_META
// entry tagged for the creditInvestigation tab, including the 3 bureau
// checks (CIC/CMAP/NFIS-BAP). All of it is collected one step earlier, in
// Requirement Checklist, and displayed here read-only from
// review.requirementChecklist.documents — this page never owns or edits
// these rows (see ReadOnlyRequirementDocRow).
const CI_FIXED_DOC_META = REQUIREMENT_DOC_META.filter((meta) => meta.tabs.includes('creditInvestigation'));

function needsAttention(doc: RequirementDoc | CreditInvestigationDoc) {
  return doc.status !== 'verified';
}

function sortByAttentionFirst<T extends { doc: RequirementDoc | CreditInvestigationDoc }>(entries: T[]): T[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aNeeds = needsAttention(a.entry.doc);
      const bNeeds = needsAttention(b.entry.doc);
      if (aNeeds === bNeeds) return a.index - b.index;
      return aNeeds ? -1 : 1;
    })
    .map(({ entry }) => entry);
}

// Same slim single-line dropzone as preliminary-application-view.tsx's
// private CompactDropzone (used there for "Upload your business document")
// — a self-contained dashed box that reads "Choose a file — {label}" while
// empty and swaps to a thumbnail + filename + remove (×) button once a file
// is picked, rather than a separate label/button pair beside a status row.
function AddDocFileDropzone({ value, onChange }: { value: File | null; onChange: (file: File | null) => void }) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: { 'image/*': [], 'application/pdf': [] },
    onDrop: (acceptedFiles) => onChange(acceptedFiles[0] ?? null),
  });

  return (
    <Box
      {...(value ? {} : getRootProps())}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minHeight: 40,
        px: 1.25,
        py: value ? 0.75 : 0,
        borderRadius: '10px',
        cursor: value ? 'default' : 'pointer',
        border: '1.5px dashed',
        borderColor: '#B0B8CC',
        bgcolor: 'common.white',
        '&:hover': value ? undefined : { borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
      }}
    >
      {!value && <input {...getInputProps()} />}

      {value ? (
        <>
          <FileThumbnail file={value} sx={{ width: 28, height: 28 }} />
          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: '#344054', flex: 1, minWidth: 0 }}>
            {value.name}
          </Typography>
          <IconButton size="small" onClick={() => onChange(null)}>
            <Iconify icon="mingcute:close-line" width={16} />
          </IconButton>
        </>
      ) : (
        <>
          <Iconify icon="solar:upload-minimalistic-bold-duotone" width={18} sx={{ color: '#1C2A6E' }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1C2A6E' }}>
            Choose a file — document to attach
          </Typography>
        </>
      )}
    </Box>
  );
}

export function CreditInvestigationView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const {
    review,
    adminUser,
    setCreditInvestigation,
    setCiReport,
    addCreditInvestigationDocument,
    removeCreditInvestigationDocument,
    addCiOutreachMessage,
  } = useAdmin();

  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [disapproveOpen, setDisapproveOpen] = useState(false);
  const [disapproveReason, setDisapproveReason] = useState('');
  const [declineCiFeeOpen, setDeclineCiFeeOpen] = useState(false);
  const [declineCiFeeReason, setDeclineCiFeeReason] = useState('');
  const [returnToAmdOpen, setReturnToAmdOpen] = useState(false);
  const [returnToAmdReason, setReturnToAmdReason] = useState('');
  const { documents: customDocuments, ciFeeStatus } = review.creditInvestigation;

  // Document Checklist and the AI review card start collapsed whenever the
  // application is already past their gate on open (ciFeeStatus already
  // 'pending-approval'/'approved') — not just when the status transitions
  // while the page is mounted. That covers opening an application that was
  // already at that stage in an earlier session, not only moving through it
  // live in this one.
  const [checklistExpanded, setChecklistExpanded] = useState(
    () => ciFeeStatus !== 'pending-approval' && ciFeeStatus !== 'approved'
  );
  const [aiReviewExpanded, setAiReviewExpanded] = useState(() => ciFeeStatus !== 'approved');

  // Also collapses both live, the moment the status transitions during this
  // session (e.g. right after "Yes, Request CI Fee" or the simulated
  // approval action) — re-fires Document Checklist's collapse on 'approved'
  // too, in case the officer had manually reopened it while waiting. Only
  // fires on the transition itself, not every render, so the officer's own
  // toggle afterward is never fought.
  const prevCiFeeStatusRef = useRef(ciFeeStatus);
  useEffect(() => {
    const justReachedGate =
      (ciFeeStatus === 'pending-approval' || ciFeeStatus === 'approved') &&
      prevCiFeeStatusRef.current !== ciFeeStatus &&
      prevCiFeeStatusRef.current !== 'approved';
    if (justReachedGate) {
      setChecklistExpanded(false);
    }
    if (ciFeeStatus === 'approved' && prevCiFeeStatusRef.current !== 'approved') {
      setAiReviewExpanded(false);
    }
    prevCiFeeStatusRef.current = ciFeeStatus;
  }, [ciFeeStatus]);
  const officerName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const customDocs = customDocuments.filter((doc) => doc.isCustom);

  // Every fixed document on this page is collected earlier, in Requirement
  // Checklist — this page reads that state directly and displays it
  // read-only (see ReadOnlyRequirementDocRow) instead of keeping its own
  // separate, editable copy.
  const fixedDocsByKey = new Map(review.requirementChecklist.documents.map((doc) => [doc.key, doc]));
  const fixedDocs = CI_FIXED_DOC_META.map((meta) => fixedDocsByKey.get(meta.key)).filter(
    (doc): doc is RequirementDoc => !!doc
  );

  const patchCustomDoc = (key: string, data: Partial<CreditInvestigationDoc>) => {
    setCreditInvestigation({
      documents: customDocuments.map((doc) => (doc.key === key ? { ...doc, ...data } : doc)),
    });
  };

  const handleUploadDoc = (key: string) => (data: Partial<CreditInvestigationDoc>) => {
    patchCustomDoc(key, { ...data, uploadedBy: officerName, reviewed: false });
  };

  const handleToggleReviewed = (key: string) => (reviewed: boolean) => patchCustomDoc(key, { reviewed });
  const handleRemarksChange = (key: string) => (remarks: string) => patchCustomDoc(key, { remarks });

  const handleAddDoc = () => {
    const label = newDocLabel.trim();
    if (!label || !newDocFile) return;
    addCreditInvestigationDocument(label, officerName, {
      fileName: newDocFile.name,
      fileUrl: URL.createObjectURL(newDocFile),
    });
    setNewDocLabel('');
    setNewDocFile(null);
    setAddDocOpen(false);
  };

  // Fills only what this page actually owns — CI Fee and the CI Report.
  // The Document Checklist above is read-only here (collected one step
  // earlier, in Requirement Checklist, and displayed via
  // ReadOnlyRequirementDocRow — see the CI_FIXED_DOC_META comment), so
  // there's nothing to sample-fill for it from this page; officers who want
  // that pre-filled use Requirement Checklist's own Fill Sample Data first.
  const handleFillSampleData = () => {
    setCreditInvestigation({
      ciFeeStatus: 'approved',
      ciFeeAmount: '2500',
      ciFeeAmountDescription: 'Site visit + verification fee',
      ciFeeRemarks: '',
    });
    const autoFill = buildTranscriptAutoFill(
      [signUpData?.email ?? '', 'sample-transcript.pdf'],
      applicantName
    );
    setCiReport({
      visitDate: new Date().toISOString().slice(0, 10),
      visitTime: '10:30',
      visitLocation: autoFill.visitLocation,
      visitingOfficer: officerName,
      identityConfirmed: autoFill.identityConfirmed,
      residenceConfirmed: autoFill.residenceConfirmed,
      businessConfirmed: autoFill.businessConfirmed,
      neighborhoodFeedback: autoFill.neighborhoodFeedback,
      neighborhoodStanding: autoFill.neighborhoodStanding,
      findings: autoFill.findings,
      recommendation: autoFill.recommendation,
      recommendationNotes: autoFill.recommendationNotes,
      transcriptFileName: 'sample-transcript.pdf',
      transcriptUploadedAt: new Date().toISOString(),
    });
  };

  // Undoes exactly what handleFillSampleData sets, scoped to CI Fee and CI
  // Report only — same convention as every other Remove Sample Data action
  // in this app (never a full resetReview(), which would wipe unrelated
  // steps this button has no business touching).
  const handleClearSampleData = () => {
    setCreditInvestigation({
      ciFeeStatus: 'not-requested',
      ciFeeAmount: '',
      ciFeeAmountDescription: '',
      ciFeeRemarks: '',
    });
    setCiReport({
      visitDate: '',
      visitTime: '',
      visitLocation: '',
      visitingOfficer: '',
      identityConfirmed: '',
      residenceConfirmed: '',
      businessConfirmed: '',
      neighborhoodFeedback: '',
      neighborhoodStanding: '',
      findings: '',
      recommendation: '',
      recommendationNotes: '',
      transcriptFileName: null,
      transcriptUploadedAt: null,
    });
  };

  const missingDocLabels = [
    ...CI_FIXED_DOC_META.filter((meta) => fixedDocsByKey.get(meta.key)?.status === 'missing').map(
      (meta) => meta.label
    ),
    ...customDocs.filter((doc) => doc.status === 'missing').map((doc) => doc.label ?? 'Custom document'),
  ];

  const handleSendOutreachMessage = (message: { channel: OutreachChannel; text: string }) => {
    addCiOutreachMessage(message);
  };

  const { level, summary, recommendation } = buildCreditInvestigationSummary(fixedDocs, CI_FIXED_DOC_META);
  const riskStyle = RISK_STYLES[level];

  const allFixedReceived = CI_FIXED_DOC_META.every(
    (meta) => fixedDocsByKey.get(meta.key)?.status !== 'missing'
  );

  // "Filled" for this button's purposes means CI Fee has moved off its
  // default 'not-requested' state — same single boolean gates both the CI
  // Fee section and the CI Report having sample content, since
  // handleFillSampleData/handleClearSampleData always set both together.
  const isSampleFilled = ciFeeStatus !== 'not-requested';

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'sample-data',
          label: isSampleFilled ? 'Remove Sample Data' : 'Fill with Sample Data',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: isSampleFilled ? handleClearSampleData : handleFillSampleData,
        },
        // The officer who requests the CI Fee can't also approve/decline it —
        // there's no real second-officer login in this prototype, so both
        // outcomes are simulated here as explicit "as another officer" dev
        // shortcuts, same convention as "Force Clean/Negative Bureau
        // Finding" on Initial Credit Checking. A dedicated CI Fee Approval
        // screen offers the same two actions with a fuller review UI; these
        // stay available inline so an officer never has to leave this page
        // just to accept or decline.
        ...(ciFeeStatus === 'pending-approval'
          ? [
              {
                key: 'simulate-ci-fee-approval',
                label: 'Simulate: Another Officer Approves CI Fee',
                icon: 'solar:user-check-bold-duotone',
                color: '#0C8A4F',
                onClick: () => setCreditInvestigation({ ciFeeStatus: 'approved' }),
              },
              {
                key: 'simulate-ci-fee-decline',
                label: 'Simulate: Another Officer Declines CI Fee',
                icon: 'solar:user-cross-bold-duotone',
                color: '#B32C22',
                onClick: () => setDeclineCiFeeOpen(true),
              },
            ]
          : []),
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [ciFeeStatus, isSampleFilled]
    )
  );

  if (!signUpData) return null;

  const handleProceed = () => {
    setCreditInvestigation({ decision: 'approved' });
    router.push(paths.admin.applications);
  };

  const closeDisapprove = () => {
    setDisapproveOpen(false);
    setDisapproveReason('');
  };

  const confirmDisapprove = () => {
    if (!disapproveReason.trim()) return;
    setCreditInvestigation({ decision: 'rejected', decisionReason: disapproveReason.trim() });
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  const closeDeclineCiFee = () => {
    setDeclineCiFeeOpen(false);
    setDeclineCiFeeReason('');
  };

  // Mirrors ci-fee-approval-view.tsx's confirmDecline: a typed reason is
  // required, then the request resets back to 'not-requested' (same
  // re-entry point as an application that never requested a fee) so the
  // officer can re-request from the CI Fee card with corrected terms.
  const confirmDeclineCiFee = () => {
    if (!declineCiFeeReason.trim()) return;
    setCreditInvestigation({
      ciFeeStatus: 'not-requested',
      ciFeeAmount: '',
      ciFeeAmountDescription: '',
      ciFeeRemarks: '',
      ciFeeDeclineReason: declineCiFeeReason.trim(),
    });
    setDeclineCiFeeOpen(false);
    setDeclineCiFeeReason('');
  };

  const closeReturnToAmd = () => {
    setReturnToAmdOpen(false);
    setReturnToAmdReason('');
  };

  const confirmReturnToAmd = () => {
    if (!returnToAmdReason.trim()) return;
    setCreditInvestigation({ returnedToAmd: true, returnToAmdReason: returnToAmdReason.trim() });
    router.push(paths.admin.requirementChecklist(encodeURIComponent(signUpData.email)));
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
        step="Step 4 · Credit Investigation"
        reviewStep="creditInvestigation"
        hideApplicationCard
      />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard
          collapsible
          showCreditCheckingResultAction
          showCallReportAction
          officerNotesProcess="Credit Investigation"
        />

        <Box sx={adminCardSx}>
          <CollapsibleSection
            title="Document Checklist"
            expanded={checklistExpanded}
            onToggle={() => setChecklistExpanded((prev) => !prev)}
            badge={
              <CollapsibleSectionBadge
                received={CI_FIXED_DOC_META.filter((meta) => fixedDocsByKey.get(meta.key)?.status !== 'missing').length}
                total={CI_FIXED_DOC_META.length}
              />
            }
            completeIcon={
              allFixedReceived && (
                <Iconify icon="solar:check-circle-bold" width={17} sx={{ color: '#0C8A4F' }} />
              )
            }
            headerAction={
              <Button
                onClick={() => setRequestDrawerOpen(true)}
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:letter-bold-duotone" width={16} />}
                sx={{ ...outlinedNavyButtonSx, px: 2 }}
              >
                Request Documents
              </Button>
            }
          >
          <Stack spacing={3}>
            {REQUIREMENT_SUBGROUP_ORDER.map((subgroup) => {
              const entries = sortByAttentionFirst(
                CI_FIXED_DOC_META.filter((meta) => meta.subgroup === subgroup)
                  .map((meta) => ({ meta, doc: fixedDocsByKey.get(meta.key) }))
                  .filter(
                    (entry): entry is { meta: RequirementDocMeta; doc: RequirementDoc } => !!entry.doc
                  )
              );
              if (entries.length === 0) return null;
              return (
                <Stack key={subgroup} spacing={1.25}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                    {REQUIREMENT_SUBGROUP_LABELS[subgroup]}
                  </Typography>
                  <Stack spacing={1.25}>
                    {entries.map(({ meta, doc }) => (
                      <ReadOnlyRequirementDocRow
                        key={meta.key}
                        label={meta.label}
                        doc={doc}
                        applicantName={applicantName}
                      />
                    ))}
                  </Stack>
                </Stack>
              );
            })}

            {customDocs.length > 0 && (
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                  Additional Documents
                </Typography>
                <Stack spacing={1.25}>
                  {customDocs.map((doc) => (
                    <RequirementDocRow
                      key={doc.key}
                      meta={{ label: doc.label ?? 'Custom document', required: false, freshStatus: 'verified', freshNote: 'Reviewed, no issues found.' }}
                      doc={doc}
                      applicantName={applicantName}
                      onUpload={handleUploadDoc(doc.key)}
                      onRemove={() => removeCreditInvestigationDocument(doc.key)}
                      onToggleReviewed={handleToggleReviewed(doc.key)}
                      onRemarksChange={handleRemarksChange(doc.key)}
                      hideReviewedCheckbox
                    />
                  ))}
                </Stack>
              </Stack>
            )}

            {addDocOpen ? (
              <Box
                sx={{
                  borderRadius: '13px',
                  p: 2,
                  bgcolor: '#F9FAFC',
                  border: '1px solid #EEF0F5',
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mb: 0.25 }}>
                  Add document
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#8891A6', mb: 1.75 }}>
                  Attach a document that isn&apos;t part of the standard checklist above.
                </Typography>

                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
                        Document label
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        autoFocus
                        placeholder="e.g. Barangay Clearance"
                        value={newDocLabel}
                        onChange={(event) => setNewDocLabel(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && newDocFile) handleAddDoc();
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'common.white' } }}
                      />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
                        File
                      </Typography>
                      <AddDocFileDropzone value={newDocFile} onChange={setNewDocFile} />
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      onClick={() => {
                        setAddDocOpen(false);
                        setNewDocLabel('');
                        setNewDocFile(null);
                      }}
                      sx={{ color: '#5A6273' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      onClick={handleAddDoc}
                      disabled={!newDocLabel.trim() || !newDocFile}
                      variant="contained"
                      sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', fontWeight: 700, '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
                    >
                      Add
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : (
              <Button
                onClick={() => setAddDocOpen(true)}
                variant="outlined"
                startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
                sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
              >
                Add document
              </Button>
            )}
          </Stack>
          </CollapsibleSection>
        </Box>

        <Box sx={adminCardSx}>
          <CollapsibleSection
            title="AI review, summary & recommendation"
            expanded={aiReviewExpanded}
            onToggle={() => setAiReviewExpanded((prev) => !prev)}
          >
            <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
              Automatically checks each uploaded document for completeness against the checklist above.
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>AI Summary</Typography>
                <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{summary}</Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Iconify icon={riskStyle.icon} width={16} sx={{ color: riskStyle.color }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color }}>
                    AI Recommendation · {riskStyle.label}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>{recommendation}</Typography>
              </Box>
            </Stack>
          </CollapsibleSection>
        </Box>

        <CiFeeCard />

        {ciFeeStatus === 'approved' || ciFeeStatus === 'not-applicable' ? (
          <CiReportCard />
        ) : (
          <Box sx={{ ...adminCardSx, bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', boxShadow: 'none', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Resolve the CI Fee above — approve the request or mark it as not applicable — to unlock the CI Report.
            </Typography>
          </Box>
        )}

        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Proceed application?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Decide whether to proceed, disapprove, or return this application to AMD for
            reconsideration.
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleProceed}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Proceed
            </Button>
            <Button
              onClick={() => setDisapproveOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
            >
              Disapprove
            </Button>
            <Button
              onClick={() => setReturnToAmdOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:undo-left-round-bold" width={18} />}
              sx={{ color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', px: 2.5, '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' } }}
            >
              Return to AMD
            </Button>
          </Stack>
        </Box>
      </Stack>

      <ConfirmDialog
        open={disapproveOpen}
        onClose={closeDisapprove}
        title="Reason for disapproval"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={disapproveReason}
            onChange={(event) => setDisapproveReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!disapproveReason.trim()}
            onClick={confirmDisapprove}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />

      <ConfirmDialog
        open={declineCiFeeOpen}
        onClose={closeDeclineCiFee}
        title="Reason for declining CI Fee"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why this CI Fee request is being declined…"
            value={declineCiFeeReason}
            onChange={(event) => setDeclineCiFeeReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!declineCiFeeReason.trim()}
            onClick={confirmDeclineCiFee}
            sx={confirmDialogActionToneSx.destructive}
          >
            Confirm
          </Button>
        }
      />

      <ConfirmDialog
        open={returnToAmdOpen}
        onClose={closeReturnToAmd}
        title="Reason for returning to AMD"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what needs reconsideration…"
            value={returnToAmdReason}
            onChange={(event) => setReturnToAmdReason(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!returnToAmdReason.trim()}
            onClick={confirmReturnToAmd}
            sx={{ ...confirmDialogActionToneSx.default, borderRadius: '10px' }}
          >
            Confirm
          </Button>
        }
      />

      <RequestDocumentsDrawer
        open={requestDrawerOpen}
        onClose={() => setRequestDrawerOpen(false)}
        applicantName={applicantName}
        missingDocLabels={missingDocLabels}
        history={review.creditInvestigation.outreachMessages}
        onSend={handleSendOutreachMessage}
      />
    </Container>
  );
}
