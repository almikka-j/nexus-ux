'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, StatusBadge, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { CollapsibleSection, CollapsibleSectionBadge } from 'src/components/collapsible-section';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { RequirementDocRow } from './requirement-doc-row';
import { RequestDocumentsDrawer } from './request-documents-drawer';
import { RequirementChecklistSectionNav, useActiveSection } from './requirement-checklist-section-nav';
import { buildRequirementChecklistSummary } from './requirement-checklist-risk';
import {
  REQUIREMENT_DOC_META,
  APPRAISAL_DOC_META,
  REQUIREMENT_TAB_LABELS,
  REQUIREMENT_SUBGROUP_LABELS,
  REQUIREMENT_SUBGROUP_ORDER,
  CREDIT_INVESTIGATION_DOC_META,
  FINANCIAL_EVALUATION_DOC_META,
} from './requirement-checklist-docs';

import type { RequirementDoc, OutreachChannel, AppraisalCollateralType } from 'src/auth/admin-context';
import type { AppraisalDocMeta, RequirementDocMeta, RequirementDocStatus } from './requirement-checklist-docs';
import type { RequirementChecklistRiskLevel } from './requirement-checklist-risk';

// ----------------------------------------------------------------------

const RISK_STYLES: Record<
  RequirementChecklistRiskLevel,
  { bg: string; color: string; icon: string; label: string }
> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Ready' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Almost ready' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'Not ready' },
};

// Same Real Estate/Chattel labels as the Appraiser workspace's own "Add
// Collateral" control (appraisal-tct-table.tsx) — kept in sync manually,
// same convention as every other small constant duplicated across admin
// files in this app.
const COLLATERAL_TYPE_LABEL: Record<AppraisalCollateralType, string> = {
  'real-estate': 'Real Estate',
  chattel: 'Chattel',
};

// Same reason set as Initial Credit Checking's and Call Report's Sales
// Reject dialogs — kept as a local copy since the three screens don't
// currently share a constants module for this.
const SALES_REJECT_REASONS = [
  'Insufficient income',
  'Poor credit history',
  'Incomplete documents',
  'Employment not verifiable',
  'Requested amount too high',
  'Other',
];

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
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
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
        sx={{ ...adminCardSx, p: { xs: 4, md: 6 } }}
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
          href={paths.admin.accountSolicitation}
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

// Same 5 sample TCT numbers seeded in admin-context.tsx's initialState —
// kept in sync manually since "Fill Sample Data" rebuilds this array from
// scratch rather than reusing the existing appraisalGroups.
const SAMPLE_TCT_NUMBERS = [
  'TCT-2024-00981',
  'TCT-2024-00982',
  'TCT-2024-00983',
  'TCT-2024-00984',
  'TCT-2024-00985',
];

function buildSampleAppraisalGroups(
  statusFor: (meta: AppraisalDocMeta) => RequirementDocStatus,
  uploadedAt: string,
  officerName: string
) {
  return SAMPLE_TCT_NUMBERS.map((tctNumber) => ({
    id: crypto.randomUUID(),
    tctNumber,
    collateralType: 'real-estate' as const,
    documents: APPRAISAL_DOC_META.map((meta) => ({
      key: meta.key,
      status: statusFor(meta),
      aiNote: meta.freshNote,
      fileName: 'sample-local-pdf.pdf',
      fileUrl: '/assets/documents/sample-local-pdf.pdf',
      uploadedAt,
      uploadedBy: officerName,
      remarks: '',
      reviewed: true,
    })),
    reportId: null,
  }));
}

export function RequirementChecklistView() {
  const router = useRouter();
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
  // Sales Reject requires the officer to pick a reason (and optionally add
  // remarks) before the application is routed to the Reconsideration screen
  // — same pattern as Initial Credit Checking's and Call Report's Sales
  // Reject dialogs. Replaces the previous "Return to Applicant" action.
  const [disapproveDialogOpen, setDisapproveDialogOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonRemarks, setReasonRemarks] = useState('');
  const [appraisalNotApplicableConfirmOpen, setAppraisalNotApplicableConfirmOpen] = useState(false);
  const [newTctNumber, setNewTctNumber] = useState('');
  const [newCollateralType, setNewCollateralType] = useState<AppraisalCollateralType>('real-estate');
  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false);

  // Each document card can be collapsed independently, manually via its own
  // chevron — always starts expanded, then auto-collapses the moment its
  // documents become fully verified (creditInvestigationFullyVerified /
  // appraisalFullyVerified / financialEvaluationFullyVerified below). A
  // naive "if fully verified, collapsed=true" render-time assignment was
  // tried and reverted: a card's "fully verified" boolean can flip back and
  // forth (e.g. appraisalFullyVerified toggles with appraisalNotApplicable),
  // so that approach fought the officer's own re-expand click on every
  // render, and toggling Appraisal from Not Applicable back to Applicable
  // could leave it stuck collapsed. The effect below fixes both: it only
  // sets collapsed=true on the false→true transition (edge-triggered via a
  // prev-value ref, same pattern as Credit Investigation's
  // prevCiFeeStatusRef), never on every render, so a manual re-expand always
  // sticks until the card goes incomplete and becomes complete again.
  const [creditInvestigationCollapsed, setCreditInvestigationCollapsed] = useState(false);
  const [financialEvaluationCollapsed, setFinancialEvaluationCollapsed] = useState(false);
  const [appraisalCollapsed, setAppraisalCollapsed] = useState(false);
  const [collapsedAppraisalGroups, setCollapsedAppraisalGroups] = useState<Record<string, boolean>>({});

  // Scroll targets for "Jump to next outstanding item" in the sticky summary
  // bar — one ref per document row, keyed by a unique row id (fixed doc key,
  // or `${groupId}:${docKey}` for Appraisal rows since the same doc key
  // repeats across groups).
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Scroll targets for the sticky section nav — one ref per card, keyed by
  // the same ids the nav items use.
  const sectionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const {
    documents,
    appraisalGroups,
    appraisalNotApplicable,
    outreachMessages,
    endorsed,
    rejected,
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

  // Bulk "Mark all as reviewed" for a whole section — only touches docs
  // that are actually on file (status !== 'missing'); a document that was
  // never uploaded has nothing to review.
  const handleMarkAllReviewed = (keys: string[]) => () => {
    setRequirementChecklist({
      documents: documents.map((doc) =>
        keys.includes(doc.key) && doc.status !== 'missing' ? { ...doc, reviewed: true } : doc
      ),
    });
  };

  const handleRemarksChange = (key: string) => (remarks: string) => {
    patchDoc(key, { remarks });
  };

  const handleAddTctGroup = () => {
    const trimmed = newTctNumber.trim();
    if (!trimmed || isDuplicateTctNumber) return;
    addAppraisalGroup(trimmed, newCollateralType);
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

  const handleMarkAllAppraisalDocsReviewed = (groupId: string, docs: RequirementDoc[]) => () => {
    docs.forEach((doc) => {
      if (doc.status !== 'missing') updateAppraisalGroupDoc(groupId, doc.key, { reviewed: true });
    });
  };

  const handleAppraisalDocRemarksChange = (groupId: string, key: string) => (remarks: string) => {
    updateAppraisalGroupDoc(groupId, key, { remarks });
  };

  // Fills every fixed document plus 5 fresh Appraisal groups (matching the
  // sample TCTs seeded in admin-context.tsx) with representative sample
  // data in one click, mirroring Initial Credit Checking's/Call Report's
  // floating-button-turned-page-action toggle — same button relabels to
  // "Remove Sample Data" and clears everything back to blank (including
  // clearing appraisalGroups entirely, not just resetting their documents)
  // once filled.
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
          reviewed: true,
        };
      }),
      appraisalGroups: buildSampleAppraisalGroups((meta) => meta.freshStatus, uploadedAt, officerName),
      appraisalNotApplicable: false,
    });
  };

  // Same shape as handleFillSampleData, but every document (fixed list and
  // all 5 fresh Appraisal groups) is forced to 'verified' regardless of its
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
          reviewed: true,
        };
      }),
      appraisalGroups: buildSampleAppraisalGroups(() => 'verified', uploadedAt, officerName),
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
  const creditInvestigationDocs = CREDIT_INVESTIGATION_DOC_META
    .map((meta) => requiredDocsByKey.get(meta.key))
    .filter((doc): doc is RequirementDoc => !!doc);
  const creditInvestigationFullyVerified = creditInvestigationDocs.every(
    (doc) => doc.status === 'verified'
  );

  const financialEvaluationDocs = FINANCIAL_EVALUATION_DOC_META
    .map((meta) => requiredDocsByKey.get(meta.key))
    .filter((doc): doc is RequirementDoc => !!doc);
  const financialEvaluationFullyVerified = financialEvaluationDocs.every(
    (doc) => doc.status === 'verified'
  );

  const appraisalFullyVerified =
    appraisalNotApplicable ||
    (hasAppraisalGroups &&
      appraisalGroups.every((group) => group.documents.every((doc) => doc.status === 'verified')));

  // Edge-triggered auto-collapse: fires only on the false→true transition of
  // each card's "fully verified" boolean, via a prev-value ref, so it never
  // re-fires (and never fights a manual re-expand) on renders where the
  // boolean stays true — see the collapsed-state comment above for why a
  // render-time assignment doesn't work here.
  const prevCreditInvestigationFullyVerifiedRef = useRef(creditInvestigationFullyVerified);
  const prevFinancialEvaluationFullyVerifiedRef = useRef(financialEvaluationFullyVerified);
  const prevAppraisalFullyVerifiedRef = useRef(appraisalFullyVerified);
  useEffect(() => {
    if (creditInvestigationFullyVerified && !prevCreditInvestigationFullyVerifiedRef.current) {
      setCreditInvestigationCollapsed(true);
    }
    prevCreditInvestigationFullyVerifiedRef.current = creditInvestigationFullyVerified;
  }, [creditInvestigationFullyVerified]);
  useEffect(() => {
    if (financialEvaluationFullyVerified && !prevFinancialEvaluationFullyVerifiedRef.current) {
      setFinancialEvaluationCollapsed(true);
    }
    prevFinancialEvaluationFullyVerifiedRef.current = financialEvaluationFullyVerified;
  }, [financialEvaluationFullyVerified]);
  useEffect(() => {
    if (appraisalFullyVerified && !prevAppraisalFullyVerifiedRef.current) {
      setAppraisalCollapsed(true);
    }
    prevAppraisalFullyVerifiedRef.current = appraisalFullyVerified;
  }, [appraisalFullyVerified]);

  const appraisalReceivedCount = appraisalNotApplicable
    ? 0
    : appraisalGroups.flatMap((group) => group.documents).filter((doc) => doc.status !== 'missing').length;
  const appraisalTotalCount = appraisalNotApplicable
    ? 0
    : appraisalGroups.reduce((total, group) => total + group.documents.length, 0);

  const sectionNavItems = [
    {
      key: 'creditInvestigation',
      label: REQUIREMENT_TAB_LABELS.creditInvestigation,
      icon: 'solar:shield-check-bold-duotone',
      received: creditInvestigationDocs.filter((doc) => doc.status !== 'missing').length,
      total: creditInvestigationDocs.length,
      collapsed: creditInvestigationCollapsed,
    },
    {
      key: 'appraisal',
      label: 'Appraisal',
      icon: 'solar:home-2-bold-duotone',
      received: appraisalReceivedCount,
      total: appraisalTotalCount,
      collapsed: appraisalCollapsed,
    },
    {
      key: 'financialEvaluation',
      label: REQUIREMENT_TAB_LABELS.financialEvaluation,
      icon: 'solar:wallet-money-bold-duotone',
      received: financialEvaluationDocs.filter((doc) => doc.status !== 'missing').length,
      total: financialEvaluationDocs.length,
      collapsed: financialEvaluationCollapsed,
    },
  ];

  const activeSectionKey = useActiveSection(
    sectionRefs,
    sectionNavItems.map((item) => item.key)
  );

  const handleJumpToSection = (key: string) => {
    if (key === 'creditInvestigation') setCreditInvestigationCollapsed(false);
    if (key === 'appraisal') setAppraisalCollapsed(false);
    if (key === 'financialEvaluation') setFinancialEvaluationCollapsed(false);
    requestAnimationFrame(() => {
      sectionRefs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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
    ...CREDIT_INVESTIGATION_DOC_META
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
    ...FINANCIAL_EVALUATION_DOC_META
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
    if (CREDIT_INVESTIGATION_DOC_META.some((meta) => meta.key === rowId)) {
      setCreditInvestigationCollapsed(false);
    } else if (FINANCIAL_EVALUATION_DOC_META.some((meta) => meta.key === rowId)) {
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

  const closeReasonDialog = () => {
    setDisapproveDialogOpen(false);
    setReasonCategory('');
    setReasonRemarks('');
  };

  const confirmReasonDialog = () => {
    if (!signUpData || !reasonCategory) return;

    const decisionReason = reasonRemarks.trim()
      ? `${reasonCategory} — ${reasonRemarks.trim()}`
      : reasonCategory;

    setRequirementChecklist({ rejected: true, decisionReason });
    closeReasonDialog();
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
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

  return (
    <Box sx={{ px: { xs: 2, md: 5 }, py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
        step="Step 3 · Requirement Checklist"
        reviewStep="requirementChecklist"
        hideApplicationCard
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
        <Box
          sx={{
            width: { xs: 1, md: 240 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 92 },
            zIndex: (theme) => theme.zIndex.appBar - 1,
            order: { xs: -1, md: 0 },
          }}
        >
          <RequirementChecklistSectionNav
            items={sectionNavItems}
            activeKey={activeSectionKey}
            onJump={handleJumpToSection}
          />
        </Box>

        <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0, width: 1 }}>
        <ApplicationDetailsCard
          collapsible
          showCreditCheckingResultAction
          showCallReportAction
          officerNotesProcess="Requirement Checklist"
        />

        <Box sx={adminCardSx}>
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
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
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
                ...outlinedNavyButtonSx,
                minHeight: 38,
                px: 2,
                boxShadow: 'none',
                flexShrink: 0,
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

        <Box
          sx={adminCardSx}
          ref={(el: HTMLDivElement | null) => {
            sectionRefs.current.set('creditInvestigation', el);
          }}
        >
          <CollapsibleSection
            title={REQUIREMENT_TAB_LABELS.creditInvestigation}
            expanded={!creditInvestigationCollapsed}
            onToggle={() => setCreditInvestigationCollapsed((prev) => !prev)}
            badge={
              <CollapsibleSectionBadge
                received={creditInvestigationDocs.filter((doc) => doc.status !== 'missing').length}
                total={creditInvestigationDocs.length}
              />
            }
            completeIcon={
              creditInvestigationFullyVerified && (
                <Iconify icon="solar:check-circle-bold" width={17} sx={{ color: '#0C8A4F' }} />
              )
            }
            headerAction={
              <Button
                onClick={handleMarkAllReviewed(creditInvestigationDocs.map((doc) => doc.key))}
                disabled={creditInvestigationDocs.every((doc) => doc.status === 'missing' || doc.reviewed)}
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:check-read-bold" width={16} />}
                sx={{
                  ...outlinedNavyButtonSx,
                  borderRadius: '10px',
                  px: 1.75,
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                }}
              >
                Mark All as Reviewed
              </Button>
            }
          >
            <Stack spacing={3}>
              {REQUIREMENT_SUBGROUP_ORDER.map((subgroup) => {
                const subgroupEntries: { meta: RequirementDocMeta; doc: RequirementDoc }[] =
                  CREDIT_INVESTIGATION_DOC_META.filter((meta) => meta.subgroup === subgroup)
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
                            removeMeansMissing
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </CollapsibleSection>
        </Box>

        <Box
          sx={adminCardSx}
          ref={(el: HTMLDivElement | null) => {
            sectionRefs.current.set('appraisal', el);
          }}
        >
          <CollapsibleSection
            title="Appraisal"
            expanded={!appraisalCollapsed}
            onToggle={() => setAppraisalCollapsed((prev) => !prev)}
            badge={
              <>
                <CollapsibleSectionBadge
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
                {!appraisalNotApplicable && appraisalGroups.length > 0 && (
                  <StatusBadge
                    tone={appraisalGroupsComplete ? 'success' : 'warning'}
                    label={`${appraisalGroups.length} ${appraisalGroups.length === 1 ? 'property' : 'properties'}`}
                  />
                )}
              </>
            }
            completeIcon={
              appraisalFullyVerified && (
                <Iconify icon="solar:check-circle-bold" width={17} sx={{ color: '#0C8A4F' }} />
              )
            }
            headerAction={
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
                  ...outlinedNavyButtonSx,
                  borderRadius: '10px',
                  px: 1.75,
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                }}
              >
                {appraisalNotApplicable ? 'Mark as Applicable' : 'Set as Not Applicable'}
              </Button>
            }
          >
          {appraisalNotApplicable ? (
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
                      Add Collateral
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
                      Select the collateral type and enter its number to create a separate appraisal checklist.
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                  spacing={{ xs: 1, sm: 1.25 }}
                >
                  <FormControl size="small" sx={{ flexShrink: 0, width: { xs: '100%', sm: 170 } }}>
                    <Select
                      value={newCollateralType}
                      onChange={(event) => setNewCollateralType(event.target.value as AppraisalCollateralType)}
                      sx={{ minHeight: 42, borderRadius: '10px', bgcolor: 'common.white', fontSize: 14 }}
                    >
                      {(Object.keys(COLLATERAL_TYPE_LABEL) as AppraisalCollateralType[]).map((key) => (
                        <MenuItem key={key} value={key}>
                          {COLLATERAL_TYPE_LABEL[key]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    size="small"
                    label="Collateral No."
                    placeholder={newCollateralType === 'chattel' ? 'e.g. Plate/Serial No.' : 'e.g. TCT-2024-00981'}
                    value={newTctNumber}
                    onChange={(event) => setNewTctNumber(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleAddTctGroup();
                    }}
                    error={isDuplicateTctNumber}
                    helperText={isDuplicateTctNumber ? 'This collateral is already included.' : undefined}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:document-text-bold-duotone" width={17} sx={{ color: '#8891A6' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      flex: 1,
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
                    Add Collateral
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
                    No collateral added yet.
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: '#B0B6C3' }}>
                    Add a collateral above, or mark this application as not applicable if there
                    is no collateral.
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
                            <StatusBadge
                              tone={groupComplete ? 'success' : 'warning'}
                              label={`${groupReceivedDocuments}/${group.documents.length} documents`}
                            />
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Tooltip title="Mark all documents in this property as reviewed">
                              <span>
                                <IconButton
                                  onClick={handleMarkAllAppraisalDocsReviewed(group.id, group.documents)}
                                  disabled={group.documents.every((doc) => doc.status === 'missing' || doc.reviewed)}
                                  aria-label={`Mark all documents in ${group.tctNumber} as reviewed`}
                                  size="small"
                                  sx={{ color: '#8891A6' }}
                                >
                                  <Iconify icon="solar:check-read-bold" width={18} />
                                </IconButton>
                              </span>
                            </Tooltip>
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
                                removeMeansMissing
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
          </CollapsibleSection>
        </Box>

        <Box
          sx={adminCardSx}
          ref={(el: HTMLDivElement | null) => {
            sectionRefs.current.set('financialEvaluation', el);
          }}
        >
          <CollapsibleSection
            title={REQUIREMENT_TAB_LABELS.financialEvaluation}
            expanded={!financialEvaluationCollapsed}
            onToggle={() => setFinancialEvaluationCollapsed((prev) => !prev)}
            badge={
              <CollapsibleSectionBadge
                received={financialEvaluationDocs.filter((doc) => doc.status !== 'missing').length}
                total={financialEvaluationDocs.length}
              />
            }
            completeIcon={
              financialEvaluationFullyVerified && (
                <Iconify icon="solar:check-circle-bold" width={17} sx={{ color: '#0C8A4F' }} />
              )
            }
            headerAction={
              <Button
                onClick={handleMarkAllReviewed(financialEvaluationDocs.map((doc) => doc.key))}
                disabled={financialEvaluationDocs.every((doc) => doc.status === 'missing' || doc.reviewed)}
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:check-read-bold" width={16} />}
                sx={{
                  ...outlinedNavyButtonSx,
                  borderRadius: '10px',
                  px: 1.75,
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                }}
              >
                Mark All as Reviewed
              </Button>
            }
          >
            <Stack spacing={1.25}>
              {sortByAttentionFirst(
                FINANCIAL_EVALUATION_DOC_META
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
                    removeMeansMissing
                  />
                </Box>
              ))}
            </Stack>
          </CollapsibleSection>
        </Box>

        <Box sx={adminCardSx}>
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

        <Box sx={adminCardSx}>
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
              onClick={() => setDisapproveDialogOpen(true)}
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
              Sales Reject
            </Button>
          </Stack>
        </Box>
        </Stack>
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
            sx={confirmDialogActionToneSx.default}
          >
            Mark as Not Applicable
          </Button>
        }
      />

      <ConfirmDialog
        open={disapproveDialogOpen}
        onClose={closeReasonDialog}
        title="Reason for sales reject"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              autoFocus
              fullWidth
              label="Reason"
              value={reasonCategory}
              onChange={(event) => setReasonCategory(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            >
              {SALES_REJECT_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Remarks"
              placeholder="Add any additional details…"
              value={reasonRemarks}
              onChange={(event) => setReasonRemarks(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!reasonCategory}
            onClick={confirmReasonDialog}
            sx={{ ...confirmDialogActionToneSx.destructive, borderRadius: '10px' }}
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
    </Box>
  );
}
