// src/sections/admin/credit-investigation-view.tsx
'use client';

import { useMemo, useState } from 'react';
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
import type { CreditInvestigationDoc } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { RequirementDocRow } from './requirement-doc-row';
import { RequestDocumentsDrawer } from './request-documents-drawer';
import { CiFeeCard } from './credit-investigation/ci-fee-card';
import { CiReportCard } from './credit-investigation/ci-report-card';
import { ReadOnlyBureauCheckRow } from './credit-investigation/credit-investigation-doc-row';
import { buildCreditInvestigationSummary } from './credit-investigation-risk';
import {
  CREDIT_INVESTIGATION_DOC_META,
  CI_SUBGROUP_LABELS,
  CI_SUBGROUP_ORDER,
} from './credit-investigation-docs';

import type { OutreachChannel } from 'src/auth/admin-context';
import type { CreditInvestigationDocMeta } from './credit-investigation-docs';

// ----------------------------------------------------------------------

const RISK_STYLES = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Ready' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Almost ready' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'Not ready' },
} as const;

const BUREAU_CHECKS: { key: string; label: string }[] = [
  { key: 'cicCheck', label: 'CIC Check' },
  { key: 'cmapCheck', label: 'CMAP Check' },
  { key: 'nfisBapCheck', label: 'NFIS/BAP Check' },
];

function needsAttention(doc: CreditInvestigationDoc) {
  return doc.status !== 'verified';
}

function sortByAttentionFirst(entries: { meta: CreditInvestigationDocMeta; doc: CreditInvestigationDoc }[]) {
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

  const { documents, ciFeeStatus } = review.creditInvestigation;
  const officerName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
  const applicantName = signUpData ? `${signUpData.firstName} ${signUpData.lastName}` : '';
  const docsByKey = new Map(documents.map((doc) => [doc.key, doc]));
  const customDocs = documents.filter((doc) => doc.isCustom);

  const bureauDocsByKey = new Map(
    review.requirementChecklist.documents.map((doc) => [doc.key, doc])
  );
  const bureauChecksComplete = BUREAU_CHECKS.every(
    (check) => bureauDocsByKey.get(check.key)?.status !== 'missing'
  );

  const patchDoc = (key: string, data: Partial<CreditInvestigationDoc>) => {
    setCreditInvestigation({
      documents: documents.map((doc) => (doc.key === key ? { ...doc, ...data } : doc)),
    });
  };

  const handleUploadDoc = (key: string) => (data: Partial<CreditInvestigationDoc>) => {
    patchDoc(key, { ...data, uploadedBy: officerName, reviewed: false });
  };

  const handleRemoveDoc = (key: string) => () => {
    patchDoc(key, {
      status: 'missing',
      aiNote: '',
      fileName: null,
      fileUrl: null,
      uploadedAt: null,
      uploadedBy: null,
      remarks: '',
      reviewed: false,
    });
  };

  const handleToggleReviewed = (key: string) => (reviewed: boolean) => patchDoc(key, { reviewed });
  const handleRemarksChange = (key: string) => (remarks: string) => patchDoc(key, { remarks });

  const handleAddDoc = () => {
    const label = newDocLabel.trim();
    if (!label) return;
    addCreditInvestigationDocument(label);
    setNewDocLabel('');
    setAddDocOpen(false);
  };

  const missingDocLabels = [
    ...CREDIT_INVESTIGATION_DOC_META.filter((meta) => docsByKey.get(meta.key)?.status === 'missing').map(
      (meta) => meta.label
    ),
    ...customDocs.filter((doc) => doc.status === 'missing').map((doc) => doc.label ?? 'Custom document'),
  ];

  const handleSendOutreachMessage = (message: { channel: OutreachChannel; text: string }) => {
    addCiOutreachMessage(message);
  };

  const { level, summary, recommendation } = buildCreditInvestigationSummary(
    documents,
    CREDIT_INVESTIGATION_DOC_META,
    bureauChecksComplete
  );
  const riskStyle = RISK_STYLES[level];

  const handleFillSampleData = () => {
    const uploadedAt = new Date().toISOString();
    setCreditInvestigation({
      documents: documents.map((doc) => {
        if (doc.isCustom) return doc;
        const meta = CREDIT_INVESTIGATION_DOC_META.find((entry) => entry.key === doc.key);
        if (!meta) return doc;
        return {
          ...doc,
          status: meta.freshStatus,
          aiNote: meta.freshNote,
          fileName: 'sample-local-pdf.pdf',
          fileUrl: '/assets/documents/sample-local-pdf.pdf',
          uploadedAt,
          uploadedBy: officerName,
          reviewed: false,
        };
      }),
    });
  };

  const allFixedReceived = CREDIT_INVESTIGATION_DOC_META.every(
    (meta) => docsByKey.get(meta.key)?.status !== 'missing'
  );

  const handleClearSampleData = () => {
    setCreditInvestigation({
      documents: documents.map((doc) =>
        doc.isCustom
          ? doc
          : {
              ...doc,
              status: 'missing',
              aiNote: '',
              fileName: null,
              fileUrl: null,
              uploadedAt: null,
              uploadedBy: null,
              remarks: '',
              reviewed: false,
            }
      ),
    });
  };

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'sample-data',
          label: allFixedReceived ? 'Remove Sample Data' : 'Fill with Sample Data',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: allFixedReceived ? handleClearSampleData : handleFillSampleData,
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [allFixedReceived, documents]
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

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              Document Checklist
            </Typography>
            <Button
              onClick={() => setRequestDrawerOpen(true)}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:letter-bold-duotone" width={16} />}
              sx={{ color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '9px', px: 2 }}
            >
              Request Documents
            </Button>
          </Stack>

          <Stack spacing={3}>
            {CI_SUBGROUP_ORDER.map((subgroup) => {
              const entries = sortByAttentionFirst(
                CREDIT_INVESTIGATION_DOC_META.filter((meta) => meta.subgroup === subgroup)
                  .map((meta) => ({ meta, doc: docsByKey.get(meta.key) }))
                  .filter(
                    (entry): entry is { meta: CreditInvestigationDocMeta; doc: CreditInvestigationDoc } =>
                      !!entry.doc
                  )
              );
              if (entries.length === 0) return null;
              return (
                <Stack key={subgroup} spacing={1.25}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                    {CI_SUBGROUP_LABELS[subgroup]}
                  </Typography>
                  <Stack spacing={1.25}>
                    {entries.map(({ meta, doc }) => (
                      <RequirementDocRow
                        key={meta.key}
                        meta={meta}
                        doc={doc}
                        applicantName={applicantName}
                        onUpload={handleUploadDoc(meta.key)}
                        onRemove={handleRemoveDoc(meta.key)}
                        onToggleReviewed={handleToggleReviewed(meta.key)}
                        onRemarksChange={handleRemarksChange(meta.key)}
                      />
                    ))}
                  </Stack>
                </Stack>
              );
            })}

            <Stack spacing={1.25}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
                Bureau &amp; Verification Checks
              </Typography>
              <Stack spacing={1.25}>
                {BUREAU_CHECKS.map((check) => (
                  <ReadOnlyBureauCheckRow key={check.key} label={check.label} doc={bureauDocsByKey.get(check.key)} />
                ))}
              </Stack>
            </Stack>

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
                startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
                sx={{ alignSelf: 'flex-start', color: '#1C2A6E' }}
              >
                Add document
              </Button>
            )}
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Automatically checks each uploaded document for completeness against the checklist above.
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', mb: 1 }}>AI Summary</Typography>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{summary}</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color, mb: 1 }}>
                AI Recommendation · {riskStyle.label}
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>{recommendation}</Typography>
            </Box>
          </Stack>
        </Box>

        <CiFeeCard />

        {ciFeeStatus === 'approved' ? (
          <CiReportCard />
        ) : (
          <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: '#F9FAFC', border: '1px dashed #E1E4ED', textAlign: 'center' }}>
            <Iconify icon="solar:lock-keyhole-bold-duotone" width={26} sx={{ color: '#C7CCDA', mb: 1 }} />
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Approve the CI Fee above to unlock the CI Report.
            </Typography>
          </Box>
        )}

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
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
            sx={{ bgcolor: '#F04438', '&:hover': { bgcolor: '#B32C22' } }}
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
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}
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
