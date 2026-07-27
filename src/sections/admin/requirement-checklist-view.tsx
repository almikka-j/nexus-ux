'use client';

import { useRef, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { RequirementDocRow } from './requirement-doc-row';
import { RequestDocumentsDrawer } from './request-documents-drawer';
import { buildRequirementChecklistSummary } from './requirement-checklist-risk';
import {
  REQUIREMENT_DOC_META,
  APPRAISAL_DOC_META,
  REQUIREMENT_TAB_LABELS,
  REQUIREMENT_SUBGROUP_LABELS,
} from './requirement-checklist-docs';

import type { RequirementDoc, OutreachChannel } from 'src/auth/admin-context';
import type { AppraisalDocMeta, RequirementDocMeta, RequirementDocSubgroup } from './requirement-checklist-docs';
import type { RequirementChecklistRiskLevel } from './requirement-checklist-risk';

// ----------------------------------------------------------------------

// Credit Investigation is the only card with a further nested grouping —
// this fixed order matches the two sub-groups' presentation order in the
// design reference (Loan Credit Checking Documents above Loan Requirements).
const SUBGROUP_ORDER: RequirementDocSubgroup[] = ['loanCreditChecking', 'loanRequirements'];

const RISK_STYLES: Record<
  RequirementChecklistRiskLevel,
  { bg: string; color: string; icon: string; label: string }
> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Ready' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Almost ready' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'Not ready' },
};

// A document "needs attention" whenever it isn't fully verified — this
// covers both `'missing'` (nothing on file yet) and `'needs-review'`
// (uploaded, but the AI flagged it) alike, since both are things an officer
// still has to act on. Used to decide sort order (outstanding-first within
// each card) and whether a card auto-collapses.
function needsAttention(doc: RequirementDoc) {
  return doc.status !== 'verified';
}

// Stable sort: needs-attention docs first (in their original relative
// order), fully-verified docs after (also in original relative order) — so
// outstanding work always surfaces at the top of a card without documents
// jumping around unpredictably as their status changes mid-session.
function sortByAttentionFirst<T extends { doc: RequirementDoc }>(entries: T[]): T[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aNeedsAttention = needsAttention(a.entry.doc);
      const bNeedsAttention = needsAttention(b.entry.doc);
      if (aNeedsAttention === bNeedsAttention) return a.index - b.index;
      return aNeedsAttention ? -1 : 1;
    })
    .map(({ entry }) => entry);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}
    >
      {children}
    </Typography>
  );
}

function DocumentCountBadge({ received, total }: { received: number; total: number }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: '999px',
        bgcolor: '#F5F6FA',
        color: '#667085',
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {received}/{total} documents
    </Box>
  );
}

function SuccessState({
  icon,
  iconBg,
  iconColor,
  heading,
  body,
  stepLabel,
  forwardHref,
  forwardLabel,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  heading: string;
  body: string;
  stepLabel: string;
  forwardHref?: string;
  forwardLabel?: string;
}) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
        step={stepLabel}
        reviewStep="requirementChecklist"
        hideApplicationCard
      />

      <Box sx={{ mb: 2.5 }}>
        <ApplicationDetailsCard
          collapsible
          showCreditCheckingResultAction
          showCallReportAction
          officerNotesProcess="Requirement Checklist"
        />
      </Box>

      <Stack
        alignItems="center"
        textAlign="center"
        spacing={2}
        sx={{ p: { xs: 4, md: 6 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3' }}
      >
        <Box
          sx={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: iconBg }}
        >
          <Iconify icon={icon} width={26} sx={{ color: iconColor }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>{heading}</Typography>
        <Typography sx={{ fontSize: 14, color: '#8891A6', maxWidth: 420 }}>{body}</Typography>
        {forwardHref && (
          <Button
            component="a"
            href={forwardHref}
            variant="contained"
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }}
          >
            {forwardLabel}
          </Button>
        )}
        <Button
          component="a"
          href={paths.admin.applications}
          variant={forwardHref ? 'outlined' : 'contained'}
          sx={
            forwardHref
              ? { color: '#5A6273', borderColor: '#C7CCDA', borderRadius: '10px', mt: 0.5 }
              : { bgcolor: '#1C2A6E', borderRadius: '10px', mt: 1, '&:hover': { bgcolor: '#14205A' } }
          }
        >
          Back to Application List
        </Button>
      </Stack>
    </Container>
  );
}

export function RequirementChecklistView() {
  const { signUpData, application } = useRegistration();
  const {
    review,
    adminUser,
    setRequirementChecklist,
    addAppraisalGroup,
    removeAppraisalGroup,
    updateAppraisalGroupDoc,
    addOutreachMessage,
  } = useAdmin();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReasonDraft, setReturnReasonDraft] = useState('');
  const [appraisalNotApplicableConfirmOpen, setAppraisalNotApplicableConfirmOpen] = useState(false);
  const [newTctNumber, setNewTctNumber] = useState('');
  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false);

  // Each document card can be collapsed independently, manually via its own
  // chevron — always starts expanded. Auto-collapsing on completion was
  // tried and removed: a card's "fully verified" boolean can flip back and
  // forth (e.g. appraisalFullyVerified toggles with appraisalNotApplicable),
  // and an effect that only ever sets collapsed=true had no way to
  // re-expand the card when that boolean went false again — toggling
  // Appraisal from Not Applicable back to Applicable left the card stuck
  // collapsed with no visible way back in except the header itself.
  const [creditInvestigationCollapsed, setCreditInvestigationCollapsed] = useState(false);
  const [financialEvaluationCollapsed, setFinancialEvaluationCollapsed] = useState(false);
  const [appraisalCollapsed, setAppraisalCollapsed] = useState(false);
  const [collapsedAppraisalGroups, setCollapsedAppraisalGroups] = useState<Record<string, boolean>>({});

  // Scroll targets for "Jump to next outstanding item" in the sticky summary
  // bar — one ref per document row, keyed by a unique row id (fixed doc key,
  // or `${groupId}:${docKey}` for Appraisal rows since the same doc key
  // repeats across groups).
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const {
    documents,
    appraisalGroups,
    appraisalNotApplicable,
    outreachMessages,
    endorsed,
    returnedToApplicant,
  } = review.requirementChecklist;
  const officerName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
  const applicantName = [signUpData?.firstName, signUpData?.middleName, signUpData?.lastName]
    .filter(Boolean)
    .join(' ');
  const normalizedNewTctNumber = newTctNumber.trim().toLocaleLowerCase();
  const isDuplicateTctNumber =
    normalizedNewTctNumber.length > 0 &&
    appraisalGroups.some(
      (group) => group.tctNumber.trim().toLocaleLowerCase() === normalizedNewTctNumber
    );

  const handleToggleAppraisalNotApplicable = () => {
    if (appraisalNotApplicable) {
      setRequirementChecklist({ appraisalNotApplicable: false });
      return;
    }
    if (hasAppraisalGroups) {
      setAppraisalNotApplicableConfirmOpen(true);
      return;
    }
    setRequirementChecklist({ appraisalNotApplicable: true });
  };

  const patchDoc = (key: string, data: Partial<RequirementDoc>) => {
    setRequirementChecklist({
      documents: documents.map((doc) => (doc.key === key ? { ...doc, ...data } : doc)),
    });
  };

  const handleUploadDoc = (key: string) => (data: Partial<RequirementDoc>) => {
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

  const handleToggleReviewed = (key: string) => (reviewed: boolean) => {
    patchDoc(key, { reviewed });
  };

  const handleRemarksChange = (key: string) => (remarks: string) => {
    patchDoc(key, { remarks });
  };

  const handleAddTctGroup = () => {
    const trimmed = newTctNumber.trim();
    if (!trimmed || isDuplicateTctNumber) return;
    addAppraisalGroup(trimmed);
    setNewTctNumber('');
  };

  // Prunes that group's entries out of rowRefs before removing it — without
  // this, the Map keeps a reference to every detached row element from every
  // property ever added and removed in the session, growing unbounded.
  const handleRemoveAppraisalGroup = (groupId: string) => {
    APPRAISAL_DOC_META.forEach((meta) => rowRefs.current.delete(`${groupId}:${meta.key}`));
    setCollapsedAppraisalGroups((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
    removeAppraisalGroup(groupId);
  };

  const handleUploadAppraisalDoc = (groupId: string, key: string) => (data: Partial<RequirementDoc>) => {
    updateAppraisalGroupDoc(groupId, key, { ...data, uploadedBy: officerName, reviewed: false });
  };

  const handleRemoveAppraisalDoc = (groupId: string, key: string) => () => {
    updateAppraisalGroupDoc(groupId, key, {
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

  const handleToggleAppraisalDocReviewed = (groupId: string, key: string) => (reviewed: boolean) => {
    updateAppraisalGroupDoc(groupId, key, { reviewed });
  };

  const handleAppraisalDocRemarksChange = (groupId: string, key: string) => (remarks: string) => {
    updateAppraisalGroupDoc(groupId, key, { remarks });
  };

  // Fills every fixed document plus a single fresh Appraisal group with
  // representative sample data in one click, mirroring Initial Credit
  // Checking's/Call Report's floating-button-turned-page-action toggle —
  // same button relabels to "Remove Sample Data" and clears everything back
  // to blank (including clearing appraisalGroups entirely, not just
  // resetting their documents) once filled.
  const handleFillSampleData = () => {
    const uploadedAt = new Date().toISOString();
    setRequirementChecklist({
      documents: documents.map((doc) => {
        const meta = REQUIREMENT_DOC_META.find((entry) => entry.key === doc.key);
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
      appraisalGroups: [
        {
          id: crypto.randomUUID(),
          tctNumber: 'TCT-2024-00981',
          documents: APPRAISAL_DOC_META.map((meta) => ({
            key: meta.key,
            status: meta.freshStatus,
            aiNote: meta.freshNote,
            fileName: 'sample-local-pdf.pdf',
            fileUrl: '/assets/documents/sample-local-pdf.pdf',
            uploadedAt,
            uploadedBy: officerName,
            remarks: '',
            reviewed: false,
          })),
        },
      ],
      appraisalNotApplicable: false,
    });
  };

  // Same shape as handleFillSampleData, but every document (fixed list and
  // the one fresh Appraisal group) is forced to 'verified' regardless of its
  // meta.freshStatus — unlike the realistic-mix "Fill with Sample Data"
  // above, this leaves nothing at 'needs-review' or 'missing', so a single
  // click reaches an immediately-endorsable state.
  const handleFillSampleDataAllCorrect = () => {
    const uploadedAt = new Date().toISOString();
    setRequirementChecklist({
      documents: documents.map((doc) => {
        const meta = REQUIREMENT_DOC_META.find((entry) => entry.key === doc.key);
        if (!meta) return doc;
        return {
          ...doc,
          status: 'verified',
          aiNote: meta.freshNote,
          fileName: 'sample-local-pdf.pdf',
          fileUrl: '/assets/documents/sample-local-pdf.pdf',
          uploadedAt,
          uploadedBy: officerName,
          reviewed: false,
        };
      }),
      appraisalGroups: [
        {
          id: crypto.randomUUID(),
          tctNumber: 'TCT-2024-00981',
          documents: APPRAISAL_DOC_META.map((meta) => ({
            key: meta.key,
            status: 'verified',
            aiNote: meta.freshNote,
            fileName: 'sample-local-pdf.pdf',
            fileUrl: '/assets/documents/sample-local-pdf.pdf',
            uploadedAt,
            uploadedBy: officerName,
            remarks: '',
            reviewed: false,
          })),
        },
      ],
      appraisalNotApplicable: false,
    });
  };

  const handleClearSampleData = () => {
    setRequirementChecklist({
      documents: documents.map((doc) => ({
        ...doc,
        status: 'missing',
        aiNote: '',
        fileName: null,
        fileUrl: null,
        uploadedAt: null,
        uploadedBy: null,
        remarks: '',
        reviewed: false,
      })),
      appraisalNotApplicable: false,
      appraisalGroups: [],
    });
  };

  const requiredMeta = REQUIREMENT_DOC_META.filter((meta) => meta.required);
  const requiredDocsByKey = new Map(documents.map((doc) => [doc.key, doc]));
  const hasAppraisalGroups = appraisalGroups.length > 0;

  // Every group's required docs must be complete — one incomplete property
  // is enough to withhold that "required received" credit, matching "at
  // least one complete TCT group is always required" (see
  // requirement-checklist-risk.ts's buildRequirementChecklistSummary) —
  // unless the officer has declared Appraisal not applicable, in which case
  // it's excluded from this gate entirely (see totalRequiredCount below).
  const appraisalRequiredMeta = APPRAISAL_DOC_META.filter((meta) => meta.required);
  const appraisalGroupsComplete =
    hasAppraisalGroups &&
    appraisalGroups.every((group) => {
      const docsByKey = new Map(group.documents.map((doc) => [doc.key, doc]));
      return appraisalRequiredMeta.every((meta) => docsByKey.get(meta.key)?.status !== 'missing');
    });

  const receivedRequiredCount =
    requiredMeta.filter((meta) => requiredDocsByKey.get(meta.key)?.status !== 'missing').length +
    (!appraisalNotApplicable && appraisalGroupsComplete ? appraisalRequiredMeta.length : 0);
  const totalRequiredCount =
    requiredMeta.length + (appraisalNotApplicable ? 0 : appraisalRequiredMeta.length);
  const allRequiredReceived = receivedRequiredCount === totalRequiredCount;
  const progressFraction = totalRequiredCount > 0 ? receivedRequiredCount / totalRequiredCount : 0;

  // Stricter than the required-received gate above — every document in the
  // card must be 'verified' (not just "not missing") before that card
  // auto-collapses, so a card with a lingering 'needs-review' item never
  // hides itself.
  const creditInvestigationDocs = REQUIREMENT_DOC_META.filter((meta) =>
    meta.tabs.includes('creditInvestigation')
  )
    .map((meta) => requiredDocsByKey.get(meta.key))
    .filter((doc): doc is RequirementDoc => !!doc);
  const creditInvestigationFullyVerified = creditInvestigationDocs.every(
    (doc) => doc.status === 'verified'
  );

  const financialEvaluationDocs = REQUIREMENT_DOC_META.filter((meta) =>
    meta.tabs.includes('financialEvaluation')
  )
    .map((meta) => requiredDocsByKey.get(meta.key))
    .filter((doc): doc is RequirementDoc => !!doc);
  const financialEvaluationFullyVerified = financialEvaluationDocs.every(
    (doc) => doc.status === 'verified'
  );

  const appraisalFullyVerified =
    appraisalNotApplicable ||
    (hasAppraisalGroups &&
      appraisalGroups.every((group) => group.documents.every((doc) => doc.status === 'verified')));

  // Every currently-missing document's label, across the fixed list and
  // every Appraisal group — not just required ones, since a missing
  // supporting document is still worth asking the applicant for. Appraisal
  // is skipped entirely when marked Not Applicable, matching that state's
  // exclusion everywhere else on this screen.
  const missingDocLabels = [
    ...documents
      .filter((doc) => doc.status === 'missing')
      .map((doc) => REQUIREMENT_DOC_META.find((meta) => meta.key === doc.key)?.label)
      .filter((label): label is string => !!label),
    ...(appraisalNotApplicable
      ? []
      : appraisalGroups.flatMap((group) =>
          group.documents
            .filter((doc) => doc.status === 'missing')
            .map((doc) => APPRAISAL_DOC_META.find((meta) => meta.key === doc.key)?.label)
            .filter((label): label is string => !!label)
        )),
  ];

  const handleSendOutreachMessage = (message: { channel: OutreachChannel; text: string }) => {
    addOutreachMessage(message);
  };

  const lastOutreachMessage = outreachMessages[outreachMessages.length - 1] ?? null;

  // Row ids in on-page visual order (Credit Investigation, every Appraisal
  // group, then Financial Evaluation) — drives both
  // "Jump to next outstanding item" cycling and the ref map rows register
  // themselves under. Appraisal rows are namespaced by group id since the
  // same document key (e.g. 'tctCctCopy') repeats across groups.
  const outstandingRowIds = [
    ...REQUIREMENT_DOC_META.filter((meta) => meta.tabs.includes('creditInvestigation'))
      .filter((meta) => needsAttention(requiredDocsByKey.get(meta.key)!))
      .map((meta) => meta.key),
    ...(appraisalNotApplicable
      ? []
      : appraisalGroups.flatMap((group) => {
          const groupDocsByKey = new Map(group.documents.map((doc) => [doc.key, doc]));
          return APPRAISAL_DOC_META.filter((meta) => needsAttention(groupDocsByKey.get(meta.key)!)).map(
            (meta) => `${group.id}:${meta.key}`
          );
        })),
    ...REQUIREMENT_DOC_META.filter((meta) => meta.tabs.includes('financialEvaluation'))
      .filter((meta) => needsAttention(requiredDocsByKey.get(meta.key)!))
      .map((meta) => meta.key),
  ];

  const [jumpCursor, setJumpCursor] = useState(0);

  const handleJumpToOutstanding = () => {
    if (outstandingRowIds.length === 0) return;
    const rowId = outstandingRowIds[jumpCursor % outstandingRowIds.length];
    setJumpCursor((prev) => prev + 1);

    // Expand whichever card owns this row before scrolling, so the target
    // is actually visible rather than hidden behind a collapsed section.
    if (REQUIREMENT_DOC_META.some((meta) => meta.tabs.includes('creditInvestigation') && meta.key === rowId)) {
      setCreditInvestigationCollapsed(false);
    } else if (REQUIREMENT_DOC_META.some((meta) => meta.tabs.includes('financialEvaluation') && meta.key === rowId)) {
      setFinancialEvaluationCollapsed(false);
    } else {
      setAppraisalCollapsed(false);
    }

    requestAnimationFrame(() => {
      rowRefs.current.get(rowId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'sample-data',
          label: allRequiredReceived ? 'Remove Sample Data' : 'Fill with Sample Data',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: allRequiredReceived ? handleClearSampleData : handleFillSampleData,
        },
        {
          key: 'sample-data-all-correct',
          label: 'Fill Sample Data (All Correct)',
          icon: 'solar:check-circle-bold',
          color: '#0C8A4F',
          onClick: handleFillSampleDataAllCorrect,
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [allRequiredReceived]
    )
  );

  if (!signUpData) return null;

  const allAppraisalDocs = appraisalGroups.flatMap((group) => group.documents);
  const { level, summary, recommendation } = buildRequirementChecklistSummary(
    documents,
    REQUIREMENT_DOC_META,
    application.financialInfo?.monthlyIncome ?? 0,
    application.financialInfo?.desiredLoanAmount ?? 0,
    allAppraisalDocs,
    APPRAISAL_DOC_META,
    hasAppraisalGroups,
    appraisalNotApplicable
  );
  const riskStyle = RISK_STYLES[level];

  const handleEndorse = () => {
    setRequirementChecklist({ endorsed: true });
  };

  const closeReturnDialog = () => {
    setReturnDialogOpen(false);
    setReturnReasonDraft('');
  };

  const confirmReturn = () => {
    if (!returnReasonDraft.trim()) return;
    setRequirementChecklist({
      returnedToApplicant: true,
      returnReason: returnReasonDraft.trim(),
    });
    closeReturnDialog();
  };

  if (endorsed) {
    return (
      <SuccessState
        icon="solar:check-circle-bold"
        iconBg="#E7F8F0"
        iconColor="#12B76A"
        heading="Endorsed for comprehensive process"
        body="This application has been endorsed with its requirement checklist and collateral details for the next stage of processing."
        stepLabel="Requirement Checklist · Endorsed"
        forwardHref={signUpData ? paths.admin.creditInvestigation(encodeURIComponent(signUpData.email)) : undefined}
        forwardLabel="Continue to Credit Investigation"
      />
    );
  }

  if (returnedToApplicant) {
    return (
      <SuccessState
        icon="solar:undo-left-round-bold"
        iconBg="#FEF0D6"
        iconColor="#B36A05"
        heading="Returned to applicant"
        body="This application has been sent back with the outstanding requirements noted. The officer's reason has been recorded on file."
        stepLabel="Requirement Checklist · Returned"
      />
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
        step="Step 3 · Requirement Checklist"
        reviewStep="requirementChecklist"
        hideApplicationCard
      />

      <Stack spacing={2.5}>
        <ApplicationDetailsCard
          collapsible
          showCreditCheckingResultAction
          showCallReportAction
          officerNotesProcess="Requirement Checklist"
        />

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #E3E7F0', boxShadow: '0 3px 12px rgba(20,23,42,0.05)' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#EEF1FE',
                  flexShrink: 0,
                }}
              >
                <Iconify icon="solar:checklist-minimalistic-bold-duotone" width={21} sx={{ color: '#1C2A6E' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#14172A' }}>
                  Requirement Checklist
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
                  Track required documents and officer acceptance.
                </Typography>
              </Box>
            </Stack>
            <Button
              onClick={() => setRequestDrawerOpen(true)}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:letter-bold-duotone" width={16} />}
              sx={{
                minHeight: 38,
                color: '#1C2A6E',
                borderColor: '#C7CEEA',
                borderRadius: '9px',
                px: 2,
                boxShadow: 'none',
                flexShrink: 0,
                '&:hover': {
                  borderColor: '#1C2A6E',
                  bgcolor: 'rgba(28,42,110,0.04)',
                  boxShadow: 'none',
                },
              }}
            >
              Request Documents
            </Button>
          </Stack>

          <Box sx={{ mt: 3, p: 2.25, borderRadius: '13px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
            <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={2}>
              <Box>
                <Stack direction="row" alignItems="baseline" spacing={0.75}>
                  <Typography sx={{ fontSize: 28, lineHeight: 1, fontWeight: 800, color: '#14172A' }}>
                    {receivedRequiredCount}
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#8891A6' }}>
                    of {totalRequiredCount}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 12, color: '#667085', mt: 0.75 }}>
                  Required documents received
                </Typography>
              </Box>
              <Stack alignItems="flex-end">
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#1C2A6E' }}>
                  {Math.round(progressFraction * 100)}%
                </Typography>
              </Stack>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 999, bgcolor: '#E3E7EF', overflow: 'hidden', mt: 2 }}>
              <Box
                sx={{
                  width: `${progressFraction * 100}%`,
                  height: '100%',
                  borderRadius: 999,
                  bgcolor: allRequiredReceived ? '#12B76A' : '#1C2A6E',
                  transition: 'width 0.2s ease',
                }}
              />
            </Box>
          </Box>

          <Stack
            direction="row"
            alignItems="flex-start"
            spacing={1.25}
            sx={{ mt: 2, p: 1.5, borderRadius: '10px', bgcolor: '#F5F7FF' }}
          >
            <Iconify icon="solar:info-circle-bold-duotone" width={18} sx={{ color: '#1C2A6E', flexShrink: 0, mt: 0.1 }} />
            <Typography sx={{ fontSize: 12.5, color: '#5A6273', lineHeight: 1.55 }}>
              Check a document after review and acceptance. Add optional remarks from its
              three-dot menu when supporting notes are needed.
            </Typography>
          </Stack>

          {lastOutreachMessage && (
            <Stack
              component={ButtonBase}
              onClick={() => setRequestDrawerOpen(true)}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                mt: 1.5,
                px: 0.5,
                width: '100%',
                justifyContent: 'flex-start',
                textAlign: 'left',
                color: '#667085',
                '&:hover': { color: '#1C2A6E' },
              }}
            >
              <Iconify icon="solar:history-bold-duotone" width={16} sx={{ flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.5 }}>
                Last request:{' '}
                {new Date(lastOutreachMessage.sentAt).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                via {lastOutreachMessage.channel} · {outreachMessages.length} sent
              </Typography>
            </Stack>
          )}
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack
            component={ButtonBase}
            onClick={() => setCreditInvestigationCollapsed((prev) => !prev)}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: '100%', mb: creditInvestigationCollapsed ? 0 : 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                {REQUIREMENT_TAB_LABELS.creditInvestigation}
              </Typography>
              <DocumentCountBadge
                received={creditInvestigationDocs.filter((doc) => doc.status !== 'missing').length}
                total={creditInvestigationDocs.length}
              />
              {creditInvestigationFullyVerified && (
                <Iconify icon="solar:check-circle-bold" width={17} sx={{ color: '#0C8A4F' }} />
              )}
            </Stack>
            <Iconify
              icon="eva:chevron-down-fill"
              width={20}
              sx={{
                color: '#8891A6',
                transition: 'transform 0.15s ease',
                transform: creditInvestigationCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }}
            />
          </Stack>

          {!creditInvestigationCollapsed && (
            <Stack spacing={3}>
              {SUBGROUP_ORDER.map((subgroup) => {
                const subgroupEntries: { meta: RequirementDocMeta; doc: RequirementDoc }[] =
                  REQUIREMENT_DOC_META.filter(
                    (meta) => meta.tabs.includes('creditInvestigation') && meta.subgroup === subgroup
                  )
                    .map((meta) => ({ meta, doc: requiredDocsByKey.get(meta.key) }))
                    .filter((entry): entry is { meta: RequirementDocMeta; doc: RequirementDoc } => !!entry.doc);
                const sortedEntries = sortByAttentionFirst(subgroupEntries);
                return (
                  <Stack key={subgroup} spacing={1.25}>
                    <SectionLabel>{REQUIREMENT_SUBGROUP_LABELS[subgroup]}</SectionLabel>
                    <Stack spacing={1.25}>
                      {sortedEntries.map(({ meta, doc }) => (
                        <Box
                          key={meta.key}
                          ref={(el: HTMLDivElement | null) => {
                            rowRefs.current.set(meta.key, el);
                          }}
                        >
                          <RequirementDocRow
                            meta={meta}
                            doc={doc}
                            applicantName={applicantName}
                            onUpload={handleUploadDoc(meta.key)}
                            onRemove={handleRemoveDoc(meta.key)}
                            onToggleReviewed={handleToggleReviewed(meta.key)}
                            onRemarksChange={handleRemarksChange(meta.key)}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          )}

        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: appraisalCollapsed ? 0 : 2.5 }}
          >
            <Stack
              component={ButtonBase}
              onClick={() => setAppraisalCollapsed((prev) => !prev)}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ borderRadius: '8px', px: 0.5, mx: -0.5 }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                Appraisal
              </Typography>
              <DocumentCountBadge
                received={
                  appraisalNotApplicable
                    ? 0
                    : appraisalGroups
                        .flatMap((group) => group.documents)
                        .filter((doc) => doc.status !== 'missing').length
                }
                total={
                  appraisalNotApplicable
                    ? 0
                    : appraisalGroups.reduce((total, group) => total + group.documents.length, 0)
                }
              />
              {appraisalFullyVerified && (
                <Iconify icon="solar:check-circle-bold" width={17} sx={{ color: '#0C8A4F' }} />
              )}
              {!appraisalNotApplicable && appraisalGroups.length > 0 && (
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: '999px',
                    bgcolor: appraisalGroupsComplete ? '#E7F8F0' : '#FEF0D6',
                    color: appraisalGroupsComplete ? '#0C8A4F' : '#B36A05',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  {appraisalGroups.length} {appraisalGroups.length === 1 ? 'property' : 'properties'}
                </Box>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button
                onClick={handleToggleAppraisalNotApplicable}
                size="small"
                variant="outlined"
                startIcon={
                  <Iconify
                    icon={appraisalNotApplicable ? 'solar:restart-bold' : 'solar:minus-circle-bold'}
                    width={16}
                  />
                }
                sx={{
                  color: '#1C2A6E',
                  borderColor: '#C7CEEA',
                  borderRadius: '10px',
                  px: 1.75,
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                  '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
                }}
              >
                {appraisalNotApplicable ? 'Mark as Applicable' : 'Set as Not Applicable'}
              </Button>
              <IconButton
                onClick={() => setAppraisalCollapsed((prev) => !prev)}
                aria-label={appraisalCollapsed ? 'Expand Appraisal' : 'Collapse Appraisal'}
                size="small"
                sx={{ color: '#8891A6', flexShrink: 0 }}
              >
                <Iconify
                  icon="eva:chevron-down-fill"
                  width={20}
                  sx={{
                    transition: 'transform 0.15s ease',
                    transform: appraisalCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  }}
                />
              </IconButton>
            </Stack>
          </Stack>

          {appraisalCollapsed ? null : appraisalNotApplicable ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ p: 2, borderRadius: '11px', bgcolor: '#F5F6FA', border: '1px solid #EEF0F5' }}
            >
              <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: '#8891A6', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
                Marked as not applicable. Existing property records are preserved and will return
                when Appraisal is marked applicable again.
              </Typography>
            </Stack>
          ) : (
            <>
              <Box
                sx={{
                  mb: 2.5,
                  p: 2,
                  borderRadius: '13px',
                  bgcolor: '#F8F9FC',
                  border: '1px solid #E3E7F0',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#EEF1FE',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="solar:home-add-bold-duotone" width={19} sx={{ color: '#1C2A6E' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                      Add collateral property
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
                      Enter the title number to create a separate appraisal checklist.
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                  spacing={{ xs: 1, sm: 1.25 }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    label="TCT/CCT number"
                    placeholder="e.g. TCT-2024-00981"
                    value={newTctNumber}
                    onChange={(event) => setNewTctNumber(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleAddTctGroup();
                    }}
                    error={isDuplicateTctNumber}
                    helperText={
                      isDuplicateTctNumber
                        ? 'This property is already included.'
                        : 'Use the exact number shown on the property title.'
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:document-text-bold-duotone" width={17} sx={{ color: '#8891A6' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      flex: 1,
                      maxWidth: { sm: 460 },
                      '& .MuiOutlinedInput-root': {
                        minHeight: 42,
                        borderRadius: '10px',
                        bgcolor: 'common.white',
                        fontSize: 14,
                      },
                      '& .MuiFormHelperText-root': { mx: 0, fontSize: 11.5 },
                    }}
                  />
                  <Button
                    onClick={handleAddTctGroup}
                    disabled={!newTctNumber.trim() || isDuplicateTctNumber}
                    variant="contained"
                    startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
                    sx={{
                      minHeight: 42,
                      minWidth: { sm: 148 },
                      borderRadius: '10px',
                      px: 2.25,
                      flexShrink: 0,
                      bgcolor: '#1C2A6E',
                      boxShadow: 'none',
                      fontWeight: 700,
                      '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
                    }}
                  >
                    Add Property
                  </Button>
                </Stack>

              </Box>

              {appraisalGroups.length === 0 ? (
                <Stack
                  alignItems="center"
                  textAlign="center"
                  spacing={1}
                  sx={{ py: 4, borderRadius: '11px', border: '1px dashed #E1E4ED' }}
                >
                  <Iconify icon="solar:home-2-bold-duotone" width={26} sx={{ color: '#C7CCDA' }} />
                  <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
                    No properties added yet.
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: '#B0B6C3' }}>
                    Add a TCT/CCT number above, or mark this application as not applicable if there
                    is no real-estate collateral.
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={3}>
                  {appraisalGroups.map((group) => {
                    const groupDocsByKey = new Map(group.documents.map((doc) => [doc.key, doc]));
                    const groupCollapsed = collapsedAppraisalGroups[group.id] ?? false;
                    const groupReceivedDocuments = group.documents.filter(
                      (doc) => doc.status !== 'missing'
                    ).length;
                    const groupComplete = groupReceivedDocuments === group.documents.length;
                    return (
                      <Box
                        key={group.id}
                        sx={{
                          p: 2.5,
                          borderRadius: '13px',
                          bgcolor: 'common.white',
                          border: '1px solid #DDE2EE',
                          boxShadow: '0 2px 8px rgba(20,23,42,0.05)',
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={2}
                          sx={{ mb: groupCollapsed ? 0 : 1.5 }}
                        >
                          <Stack
                            component={ButtonBase}
                            onClick={() =>
                              setCollapsedAppraisalGroups((current) => ({
                                ...current,
                                [group.id]: !groupCollapsed,
                              }))
                            }
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{
                              flex: 1,
                              justifyContent: 'flex-start',
                              borderRadius: '8px',
                              textAlign: 'left',
                            }}
                          >
                            <Iconify icon="solar:home-2-bold-duotone" width={18} sx={{ color: '#5A6273' }} />
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
                              {group.tctNumber}
                            </Typography>
                            <Box
                              sx={{
                                px: 1,
                                py: 0.15,
                                borderRadius: '999px',
                                bgcolor: groupComplete ? '#E7F8F0' : '#FEF0D6',
                                color: groupComplete ? '#0C8A4F' : '#B36A05',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {groupReceivedDocuments}/{group.documents.length} documents
                            </Box>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <IconButton
                              onClick={() =>
                                setCollapsedAppraisalGroups((current) => ({
                                  ...current,
                                  [group.id]: !groupCollapsed,
                                }))
                              }
                              aria-label={groupCollapsed ? `Expand ${group.tctNumber}` : `Collapse ${group.tctNumber}`}
                              size="small"
                              sx={{ color: '#8891A6' }}
                            >
                              <Iconify
                                icon="eva:chevron-down-fill"
                                width={19}
                                sx={{
                                  transition: 'transform 0.15s ease',
                                  transform: groupCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                }}
                              />
                            </IconButton>
                            <IconButton
                              onClick={() => handleRemoveAppraisalGroup(group.id)}
                              aria-label={`Remove property ${group.tctNumber}`}
                              size="small"
                              sx={{ color: '#B0B6C3', '&:hover': { color: '#F04438', bgcolor: 'rgba(240,68,56,0.06)' } }}
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                            </IconButton>
                          </Stack>
                        </Stack>
                        {!groupCollapsed && <Stack spacing={1.25}>
                          {sortByAttentionFirst(
                            APPRAISAL_DOC_META
                              .map((meta) => ({ meta, doc: groupDocsByKey.get(meta.key) }))
                              .filter(
                                (entry): entry is { meta: AppraisalDocMeta; doc: RequirementDoc } => !!entry.doc
                              )
                          ).map(({ meta, doc }) => (
                            <Box
                              key={meta.key}
                              ref={(el: HTMLDivElement | null) => {
                                rowRefs.current.set(`${group.id}:${meta.key}`, el);
                              }}
                            >
                              <RequirementDocRow
                                meta={meta}
                                doc={doc}
                                applicantName={applicantName}
                                onUpload={handleUploadAppraisalDoc(group.id, meta.key)}
                                onRemove={handleRemoveAppraisalDoc(group.id, meta.key)}
                                onToggleReviewed={handleToggleAppraisalDocReviewed(group.id, meta.key)}
                                onRemarksChange={handleAppraisalDocRemarksChange(group.id, meta.key)}
                              />
                            </Box>
                          ))}
                        </Stack>}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </>
          )}
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack
            component={ButtonBase}
            onClick={() => setFinancialEvaluationCollapsed((prev) => !prev)}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: '100%', mb: financialEvaluationCollapsed ? 0 : 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                {REQUIREMENT_TAB_LABELS.financialEvaluation}
              </Typography>
              <DocumentCountBadge
                received={financialEvaluationDocs.filter((doc) => doc.status !== 'missing').length}
                total={financialEvaluationDocs.length}
              />
              {financialEvaluationFullyVerified && (
                <Iconify icon="solar:check-circle-bold" width={17} sx={{ color: '#0C8A4F' }} />
              )}
            </Stack>
            <Iconify
              icon="eva:chevron-down-fill"
              width={20}
              sx={{
                color: '#8891A6',
                transition: 'transform 0.15s ease',
                transform: financialEvaluationCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }}
            />
          </Stack>

          {!financialEvaluationCollapsed && (
            <Stack spacing={1.25}>
              {sortByAttentionFirst(
                REQUIREMENT_DOC_META.filter((meta) => meta.tabs.includes('financialEvaluation'))
                  .map((meta) => ({ meta, doc: requiredDocsByKey.get(meta.key) }))
                  .filter(
                    (entry): entry is { meta: RequirementDocMeta; doc: RequirementDoc } => !!entry.doc
                  )
              ).map(({ meta, doc }) => (
                <Box
                  key={meta.key}
                  ref={(el: HTMLDivElement | null) => {
                    rowRefs.current.set(meta.key, el);
                  }}
                >
                  <RequirementDocRow
                    meta={meta}
                    doc={doc}
                    applicantName={applicantName}
                    onUpload={handleUploadDoc(meta.key)}
                    onRemove={handleRemoveDoc(meta.key)}
                    onToggleReviewed={handleToggleReviewed(meta.key)}
                    onRemarksChange={handleRemarksChange(meta.key)}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Automatically checks each uploaded document for completeness, validity and consistency
            with the application.
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon="solar:document-text-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  AI Summary
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{summary}</Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: riskStyle.bg }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon={riskStyle.icon} width={16} sx={{ color: riskStyle.color }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: riskStyle.color }}>
                  AI Recommendation · {riskStyle.label}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: riskStyle.color, lineHeight: 1.6 }}>
                {recommendation}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', bgcolor: 'common.white', border: '1px solid #EBEDF3', boxShadow: '0 1px 2px rgba(20,23,42,0.04)' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Ready to endorse?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {allRequiredReceived
              ? 'All required documents are on file — ready to endorse to the next step.'
              : `Clear the ${totalRequiredCount - receivedRequiredCount} outstanding item(s) above, then endorse this application to the next step.`}
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleEndorse}
              disabled={!allRequiredReceived}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{ bgcolor: '#12B76A', borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#0C8A4F' } }}
            >
              Endorse
            </Button>
            <Button
              onClick={() => setReturnDialogOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{
                color: '#5A6273',
                borderColor: '#C7CCDA',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { color: '#1C2A6E', borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
              }}
            >
              Return to Applicant
            </Button>
          </Stack>
        </Box>
      </Stack>

      <ConfirmDialog
        open={appraisalNotApplicableConfirmOpen}
        onClose={() => setAppraisalNotApplicableConfirmOpen(false)}
        title="Mark Appraisal as not applicable?"
        content={
          <Typography sx={{ fontSize: 13.5, color: '#667085', lineHeight: 1.6 }}>
            The current property records and uploaded documents will be preserved. They will appear
            again if Appraisal is marked applicable later.
          </Typography>
        }
        action={
          <Button
            variant="contained"
            onClick={() => {
              setRequirementChecklist({ appraisalNotApplicable: true });
              setAppraisalNotApplicableConfirmOpen(false);
            }}
            sx={{ bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } }}
          >
            Mark as Not Applicable
          </Button>
        }
      />

      <ConfirmDialog
        open={returnDialogOpen}
        onClose={closeReturnDialog}
        title="Reason for returning to applicant"
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain what's missing or needs correction…"
            value={returnReasonDraft}
            onChange={(event) => setReturnReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!returnReasonDraft.trim()}
            onClick={confirmReturn}
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', '&:hover': { bgcolor: '#14205A' } }}
          >
            Confirm
          </Button>
        }
      />

      <RequestDocumentsDrawer
        open={requestDrawerOpen}
        onClose={() => setRequestDrawerOpen(false)}
        applicantName={`${signUpData.firstName} ${signUpData.lastName}`}
        missingDocLabels={missingDocLabels}
        history={outreachMessages}
        onSend={handleSendOutreachMessage}
      />
    </Container>
  );
}
