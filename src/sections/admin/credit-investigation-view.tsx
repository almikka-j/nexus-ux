// src/sections/admin/credit-investigation-view.tsx
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { CreditInvestigationDoc, RequirementDoc } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
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

export function CreditInvestigationView() {
  const router = useRouter();
  const { signUpData } = useRegistration();
  const {
    review,
    adminUser,
    setCreditInvestigation,
    addCreditInvestigationDocument,
    removeCreditInvestigationDocument,
    addCiOutreachMessage,
  } = useAdmin();

  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState('');
  const [disapproveOpen, setDisapproveOpen] = useState(false);
  const [disapproveReason, setDisapproveReason] = useState('');
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
    if (!label) return;
    addCreditInvestigationDocument(label, officerName);
    setNewDocLabel('');
    setAddDocOpen(false);
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

  useRegisterPageActions(
    useMemo(
      () => [
        // The officer who requests the CI Fee can't also approve it — there's no
        // real second-officer login in this prototype, so approval is simulated
        // here as an explicit "as another officer" dev shortcut, same convention
        // as "Force Clean/Negative Bureau Finding" on Initial Credit Checking.
        ...(ciFeeStatus === 'pending-approval'
          ? [
              {
                key: 'simulate-ci-fee-approval',
                label: 'Simulate: Another Officer Approves CI Fee',
                icon: 'solar:user-check-bold-duotone',
                color: '#0C8A4F',
                onClick: () => setCreditInvestigation({ ciFeeStatus: 'approved' }),
              },
            ]
          : []),
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [ciFeeStatus]
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
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  fullWidth
                  size="small"
                  autoFocus
                  label="Document label"
                  value={newDocLabel}
                  onChange={(event) => setNewDocLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleAddDoc();
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                <Button onClick={handleAddDoc} disabled={!newDocLabel.trim()} variant="contained" sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}>
                  Add
                </Button>
                <Button onClick={() => setAddDocOpen(false)} sx={{ color: '#5A6273' }}>
                  Cancel
                </Button>
              </Stack>
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
