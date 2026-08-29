'use client';

import { useMemo, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { fileToDataUrl } from 'src/utils/file-to-data-url';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { adminCardSx, outlinedNavyButtonSx, StatusBadge, TONE_COLORS } from 'src/components/admin-ui';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { OfficerNotesDialog, buildOfficerNoteEntry } from './officer-notes-history';
import { computeInstallment } from './cibi-form-card';
import { BureauReportsCard } from './bureau-reports-card';
import { CreditCheckingResultModal } from './call-report/credit-checking-result-modal';
import { simulateBureauFinding } from './simulate-bureau-finding';
import {
  buildInitialCreditCheckingResult,
  REVIEW_BASIS_LABELS,
  RECOMMENDED_ACTION_LABELS,
} from './initial-credit-checking-risk';
import type { InitialCreditCheckingRiskLevel, RecommendedActionCode } from './initial-credit-checking-risk';

// ----------------------------------------------------------------------

const SALES_REJECT_REASONS = [
  'Insufficient income',
  'Poor credit history',
  'Incomplete documents',
  'Employment not verifiable',
  'Requested amount too high',
  'Other',
];

// Same compact drag-and-drop file row used for the business document upload
// on the borrower sign-up flow (see CompactDropzone in
// preliminary-application-view.tsx) — kept as a local copy rather than a
// shared export since the two live in unrelated sections (borrower auth vs.
// admin) and this is currently the only admin-side consumer.
function JustificationDropzone({
  value,
  onChange,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
}) {
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
        minHeight: 44,
        px: 1.25,
        py: value ? 0.75 : 0,
        borderRadius: '10px',
        cursor: value ? 'default' : 'pointer',
        border: '1.5px dashed',
        borderColor: '#B0B8CC',
        bgcolor: value ? '#F9FAFC' : '#EEF1FE',
        '&:hover': value ? undefined : { borderColor: '#1C2A6E', bgcolor: '#E4E9FD' },
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
            Choose a file — supporting document
          </Typography>
        </>
      )}
    </Box>
  );
}

const RISK_LEVEL_STYLES: Record<InitialCreditCheckingRiskLevel, { bg: string; color: string; icon: string; label: string }> = {
  low: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low' },
  moderate: { bg: '#EEF1FE', color: '#3448B0', icon: 'solar:info-circle-bold', label: 'Moderate' },
  elevated: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Elevated' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High' },
  'unable-to-determine': { bg: '#F5F6FA', color: '#8891A6', icon: 'solar:question-circle-bold', label: 'Unable to Determine' },
};

const NO_ADDITIONAL_VERIFICATION_LABEL = 'No additional verification identified during initial screening.';

// Each AI Recommended Action code maps to the same success/warning/error
// semantic tones as the rest of the admin app (TONE_COLORS), rather than
// reusing the risk-level color — the action is a distinct verdict from the
// risk level (e.g. "elevated" risk can still resolve to "for further
// review", a warning tone, not the risk level's own color).
const RECOMMENDED_ACTION_TONES: Record<
  RecommendedActionCode,
  { tone: keyof typeof TONE_COLORS; icon: string }
> = {
  'clear-to-proceed': { tone: 'success', icon: 'solar:check-circle-bold' },
  'proceed-subject-to-verification': { tone: 'info', icon: 'solar:shield-check-bold' },
  'for-further-credit-review': { tone: 'warning', icon: 'solar:magnifer-bold' },
  'on-hold': { tone: 'neutral', icon: 'solar:pause-circle-bold' },
  'policy-exception': { tone: 'warning', icon: 'solar:danger-triangle-bold' },
  'does-not-meet-initial-rac': { tone: 'error', icon: 'solar:close-circle-bold' },
};

// Each AI Summary sub-section gets its own icon/color instead of inheriting
// the risk banner's single color, so a reviewer can tell "favorable" from
// "adverse" from "missing" at a glance instead of reading every line.
const SUMMARY_GROUP_STYLES: Record<string, { icon: string; color: string }> = {
  favorable: { icon: 'solar:check-circle-bold', color: TONE_COLORS.success.text },
  adverse: { icon: 'solar:danger-triangle-bold', color: TONE_COLORS.error.text },
  discrepancy: { icon: 'solar:question-circle-bold', color: TONE_COLORS.warning.text },
  missing: { icon: 'solar:file-remove-bold', color: TONE_COLORS.neutral.text },
};

// One AI Summary sub-section ("Key favorable findings", "Key adverse
// findings", etc.) — hidden entirely when empty, so a clean result doesn't
// show three empty "adverse/discrepancy/missing" headings with nothing
// under them.
function AiSummaryGroup({
  label,
  items,
  kind,
}: {
  label: string;
  items: string[];
  kind: keyof typeof SUMMARY_GROUP_STYLES;
}) {
  if (items.length === 0) return null;
  const { icon, color } = SUMMARY_GROUP_STYLES[kind];
  return (
    <Box>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
        <Iconify icon={icon} width={14} sx={{ color }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{label}</Typography>
      </Stack>
      <Stack spacing={0.4} sx={{ pl: 2.75 }}>
        {items.map((item) => (
          <Typography key={item} sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
            {item}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

export function InitialCreditCheckingView() {
  const router = useRouter();
  const { signUpData, application } = useRegistration();
  const {
    review,
    adminUser,
    setCreditChecking,
    setCibiForm,
    setLoandexUpload,
    setCicUpload,
    setCmapUpload,
    setNfisBapUpload,
    setPgfcExposureUpload,
    resetNegativeCreditReport,
  } = useAdmin();
  // Sales Reject requires the officer to pick a reason (and optionally add
  // remarks) before the application is routed to the Reconsideration screen.
  const [disapproveDialogOpen, setDisapproveDialogOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonRemarks, setReasonRemarks] = useState('');
  // When the bureau finding came back negative, proceeding still requires a
  // written justification (and optionally a supporting document) — captured
  // here, appended to Officer Notes, and stored on
  // review.creditChecking.justificationDocument (see confirmJustifyDialog)
  // rather than blocking the officer from proceeding outright.
  const [justifyDialogOpen, setJustifyDialogOpen] = useState(false);
  const [justificationDraft, setJustificationDraft] = useState('');
  const [justificationFile, setJustificationFile] = useState<File | null>(null);
  // Pure display preference, not persisted — resets to the stacked layout on
  // navigation/refresh, since it's how this admin wants to view *this*
  // session, not application data that should carry forward.
  const [isSplitLayout, setIsSplitLayout] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const { creditChecking, cibiForm, loandexUpload, cicUpload, cmapUpload, nfisBapUpload, pgfcExposureUpload } =
    review;
  const allBureauReportsUploaded =
    !!cibiForm.reportFileName &&
    !!loandexUpload.fileName &&
    !!cicUpload.fileName &&
    !!cmapUpload.fileName &&
    !!nfisBapUpload.fileName &&
    !!pgfcExposureUpload.fileName;

  // Simulated AI review of the bureau uploads — see simulate-bureau-finding.ts
  // for why this is a deterministic hash rather than Math.random(). Runs
  // exactly once per upload session (guarded by bureauFindingStatus still
  // being 'pending'); the result is then sticky and read by
  // CreditCheckingResultModal to decide which bureau-result content to show.
  useEffect(() => {
    if (!signUpData) return;
    if (!allBureauReportsUploaded) return;
    if (creditChecking.bureauFindingStatus !== 'pending') return;

    const finding = simulateBureauFinding([
      signUpData.email,
      cibiForm.reportFileName ?? '',
      loandexUpload.fileName ?? '',
      cicUpload.fileName ?? '',
      cmapUpload.fileName ?? '',
      nfisBapUpload.fileName ?? '',
    ]);
    setCreditChecking({
      bureauFindingStatus: finding.status,
      bureauFindingBureau: finding.bureau,
      bureauFindingReason: finding.reason,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allBureauReportsUploaded,
    creditChecking.bureauFindingStatus,
    cibiForm.reportFileName,
    loandexUpload.fileName,
    cicUpload.fileName,
    cmapUpload.fileName,
    nfisBapUpload.fileName,
  ]);

  const handleFillSampleData = () => {
    if (!signUpData) return;
    const uploadedAt = new Date().toISOString();
    const loanAmount = application.financialInfo?.desiredLoanAmount ?? 0;
    const loanTermMonths = application.financialInfo?.loanTermMonths ?? 0;
    const amount = loanAmount ? String(loanAmount) : '';
    const terms = loanTermMonths ? String(loanTermMonths) : '';

    setCreditChecking({
      documentUploaded: true,
      documentName: 'valid-id-scan.jpg',
    });

    setCibiForm({
      firstName: signUpData.firstName || '',
      middleName: signUpData.middleName || '',
      lastName: signUpData.lastName || '',
      dateOfBirth: '1990-01-01',
      gender: application.personalInfo?.gender || 'Female',
      contactNumber: signUpData.mobile || '',
      addressRegion: 'NCR',
      addressProvince: application.personalInfo?.province || '',
      addressCity: application.personalInfo?.city || '',
      addressStreet: application.personalInfo?.address || '',
      idType: application.personalInfo?.idType || '',
      idNumber: application.personalInfo?.idNumber || '',
      creditPurpose: application.financialInfo?.loanPurpose || '',
      creditType:
        application.loanType === 'business'
          ? 'Business Loan'
          : application.loanType === 'personal'
            ? 'Personal Loan'
            : '',
      financedAmount: amount,
      terms,
      installment: computeInstallment(amount, terms),
      submitted: true,
      reportFile: '/assets/documents/sample-local-pdf.pdf',
      reportFileName: 'sample-local-pdf.pdf',
      reportUploadedAt: uploadedAt,
    });

    const sampleReport = {
      fileName: 'sample-local-pdf.pdf',
      fileData: '/assets/documents/sample-local-pdf.pdf',
      uploadedAt,
    };
    setLoandexUpload(sampleReport);
    setCicUpload(sampleReport);
    setCmapUpload(sampleReport);
    setNfisBapUpload(sampleReport);
    setPgfcExposureUpload(sampleReport);
  };

  // Undoes exactly what handleFillSampleData sets — scoped to only the
  // document/AI/CIBI/bureau-upload fields it touches, NOT a full
  // `resetReview()` (which would also wipe unrelated steps like
  // Reconsideration, Call Report, and Requirement Checklist that this
  // button has no business touching).
  const handleClearSampleData = () => {
    setCreditChecking({
      documentUploaded: false,
      documentName: null,
      bureauFindingStatus: 'pending',
      bureauFindingBureau: null,
      bureauFindingReason: null,
    });
    resetNegativeCreditReport();

    setCibiForm({
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      contactType: 'Mobile',
      contactNumber: '',
      addressRegion: '',
      addressProvince: '',
      addressCity: '',
      addressStreet: '',
      idType: '',
      idNumber: '',
      creditPurpose: '',
      creditType: '',
      financedAmount: '',
      terms: '',
      installment: '',
      submitted: false,
      reportFile: null,
      reportFileName: null,
      reportUploadedAt: null,
    });

    setLoandexUpload({ fileName: null, fileData: null, uploadedAt: null });
    setCicUpload({ fileName: null, fileData: null, uploadedAt: null });
    setCmapUpload({ fileName: null, fileData: null, uploadedAt: null });
    setNfisBapUpload({ fileName: null, fileData: null, uploadedAt: null });
    setPgfcExposureUpload({ fileName: null, fileData: null, uploadedAt: null });
  };

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'sample-data',
          label: allBureauReportsUploaded ? 'Remove Sample Data' : 'Fill with Sample Data',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: allBureauReportsUploaded ? handleClearSampleData : handleFillSampleData,
        },
        {
          key: 'split-layout',
          label: isSplitLayout ? 'Switch to 1-Column Layout' : 'Switch to 2-Column Layout',
          icon: 'solar:widget-5-bold-duotone',
          onClick: () => setIsSplitLayout((prev) => !prev),
        },
        ...(allBureauReportsUploaded
          ? [
              {
                key: 'force-clean',
                label: 'Force Clean Bureau Finding',
                icon: 'solar:check-circle-bold',
                color: '#0C8A4F',
                onClick: () =>
                  setCreditChecking({
                    bureauFindingStatus: 'clean',
                    bureauFindingBureau: null,
                    bureauFindingReason: null,
                  }),
              },
              {
                key: 'force-negative',
                label: 'Force Negative Bureau Finding',
                icon: 'solar:danger-triangle-bold',
                color: '#B32C22',
                onClick: () =>
                  setCreditChecking({
                    bureauFindingStatus: 'negative',
                    bureauFindingBureau: 'CMAP',
                    bureauFindingReason: 'Court Case due to Estafa',
                  }),
              },
            ]
          : []),
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [allBureauReportsUploaded, isSplitLayout]
    )
  );

  if (!signUpData || !application.personalInfo) return null;

  const creditCheckingResult = buildInitialCreditCheckingResult({
    cmapCases: creditChecking.cmapCases,
    bapNfisRecords: creditChecking.bapNfisRecords,
    cibiResults: creditChecking.cibiResults,
    cicContracts: creditChecking.cicContracts,
    loandexRecords: creditChecking.loandexRecords,
    pgfcExposureRecords: creditChecking.pgfcExposureRecords,
    allBureauReportsUploaded,
    desiredLoanAmount: application.financialInfo?.desiredLoanAmount ?? 0,
    monthlyIncome: application.financialInfo?.monthlyIncome ?? 0,
    employmentStatus: application.financialInfo?.employmentStatus ?? 'Unknown',
    bureauFindingStatus: creditChecking.bureauFindingStatus,
    bureauFindingBureau: creditChecking.bureauFindingBureau,
    bureauFindingReason: creditChecking.bureauFindingReason,
  });
  const riskStyle = RISK_LEVEL_STYLES[creditCheckingResult.riskLevel];

  const handleApprove = () => {
    setCreditChecking({ decision: 'approved' });
    router.push(paths.admin.callReport(encodeURIComponent(signUpData.email)));
  };

  const closeJustifyDialog = () => {
    setJustifyDialogOpen(false);
    setJustificationDraft('');
    setJustificationFile(null);
  };

  const confirmJustifyDialog = async () => {
    const justification = justificationDraft.trim();
    if (!justification) return;

    const author = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
    const entry = buildOfficerNoteEntry({
      officer: author,
      process: 'Initial Credit Checking — Proceed with Justification (negative bureau finding)',
      note: justificationFile ? `${justification}\n\nAttached document: ${justificationFile.name}` : justification,
    });

    setCreditChecking({
      notes: creditChecking.notes ? `${creditChecking.notes}\n\n---\n\n${entry}` : entry,
      justificationDocument: justificationFile
        ? { fileName: justificationFile.name, fileData: await fileToDataUrl(justificationFile) }
        : null,
    });
    closeJustifyDialog();
    handleApprove();
  };

  const closeReasonDialog = () => {
    setDisapproveDialogOpen(false);
    setReasonCategory('');
    setReasonRemarks('');
  };

  const confirmReasonDialog = () => {
    if (!reasonCategory) return;

    const decisionReason = reasonRemarks.trim()
      ? `${reasonCategory} — ${reasonRemarks.trim()}`
      : reasonCategory;

    setCreditChecking({
      decision: 'rejected',
      decisionReason,
    });
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  const handleAddNote = () => {
    const note = noteDraft.trim();
    if (!note) return;

    const author = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Credit Officer';
    const entry = buildOfficerNoteEntry({
      officer: author,
      process: 'Initial Credit Checking',
      note,
    });
    setCreditChecking({
      notes: creditChecking.notes ? `${creditChecking.notes}\n\n---\n\n${entry}` : entry,
    });
    setNoteDraft('');
  };

  const rightColumnCards = (
    <Stack spacing={2.5}>
        <BureauReportsCard />

        <Box sx={adminCardSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="solar:notes-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                Officer notes
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setNotesModalOpen(true)}
              startIcon={<Iconify icon="solar:notes-bold-duotone" width={16} />}
              sx={{ ...outlinedNavyButtonSx, px: 1.75, fontWeight: 700, flexShrink: 0 }}
            >
              View all officer notes
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Add observations about this application. These notes carry forward to Call Report
            and Reconsideration as read-only context.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="e.g. Borrower's stated employer could not be verified by phone…"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
              disabled={!noteDraft.trim()}
              onClick={handleAddNote}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2.25, '&:hover': { bgcolor: '#14205A' } }}
            >
              Add note
            </Button>
          </Stack>
        </Box>

        <Box sx={adminCardSx}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
              AI review, summary &amp; recommendation
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            {allBureauReportsUploaded
              ? 'Based on the uploaded bureau reports and application details.'
              : 'Based on application details — upload the CIBI, LOANDEX, CIC, CMAP, NFIS/BAP, and PGFC Existing Exposure reports above to confirm with the full bureau review.'}
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ p: 2.25, borderRadius: '14px', bgcolor: riskStyle.bg }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ mb: 1.25 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: riskStyle.color }}>
                  Overall Assessment
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{ px: 1.5, py: 0.5, borderRadius: '999px', bgcolor: 'common.white', flexShrink: 0 }}
                >
                  <Iconify icon={riskStyle.icon} width={15} sx={{ color: riskStyle.color }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: riskStyle.color, whiteSpace: 'nowrap' }}>
                    {riskStyle.label} risk
                  </Typography>
                </Stack>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: '#14172A', lineHeight: 1.65, mb: 1.75 }}>
                {creditCheckingResult.overallAssessment}
              </Typography>

              <Divider sx={{ borderColor: riskStyle.color, opacity: 0.15, mb: 1.75 }} />

              <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: riskStyle.color, mb: 1.25 }}>
                AI Summary
              </Typography>
              <Stack spacing={1.5}>
                <AiSummaryGroup label="Key favorable findings" items={creditCheckingResult.favorableFindings} kind="favorable" />
                <AiSummaryGroup label="Key adverse findings" items={creditCheckingResult.adverseFindings} kind="adverse" />
                <AiSummaryGroup
                  label="Discrepancies or items requiring verification"
                  items={creditCheckingResult.discrepancies}
                  kind="discrepancy"
                />
                <AiSummaryGroup label="Missing information" items={creditCheckingResult.missingInformation} kind="missing" />
              </Stack>
            </Box>

            <Box sx={{ p: 2.25, borderRadius: '14px', bgcolor: 'common.white', border: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#8891A6', mb: 1.25 }}>
                AI Recommended Action
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  display: 'inline-flex',
                  px: 1.75,
                  py: 0.85,
                  borderRadius: '10px',
                  bgcolor: TONE_COLORS[RECOMMENDED_ACTION_TONES[creditCheckingResult.recommendedAction].tone].bg,
                  mb: 1.5,
                }}
              >
                <Iconify
                  icon={RECOMMENDED_ACTION_TONES[creditCheckingResult.recommendedAction].icon}
                  width={17}
                  sx={{ color: TONE_COLORS[RECOMMENDED_ACTION_TONES[creditCheckingResult.recommendedAction].tone].text }}
                />
                <Typography
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    letterSpacing: '0.01em',
                    color: TONE_COLORS[RECOMMENDED_ACTION_TONES[creditCheckingResult.recommendedAction].tone].text,
                  }}
                >
                  {RECOMMENDED_ACTION_LABELS[creditCheckingResult.recommendedAction]}
                </Typography>
              </Stack>

              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5A6273', mb: 0.5 }}>
                Reason for Recommendation
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6, mb: 1.75 }}>
                {creditCheckingResult.reasonForRecommendation}
              </Typography>

              <Divider sx={{ borderColor: '#EEF0F5', mb: 1.75 }} />

              <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#8891A6', mb: 1 }}>
                AI Review Basis
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {creditCheckingResult.reviewBasis.map((tag) => (
                  <StatusBadge key={tag} tone="neutral" label={REVIEW_BASIS_LABELS[tag]} />
                ))}
              </Stack>
            </Box>

            <Box sx={{ p: 2.25, borderRadius: '14px', bgcolor: 'common.white', border: '1px solid #EEF0F5' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
                <Iconify icon="solar:checklist-minimalistic-bold-duotone" width={16} sx={{ color: '#8891A6' }} />
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#8891A6' }}>
                  Required Verification or Next Steps
                </Typography>
              </Stack>
              {creditCheckingResult.requiredVerification.length === 0 ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Iconify icon="solar:check-circle-bold" width={16} sx={{ color: TONE_COLORS.success.text }} />
                  <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                    {NO_ADDITIONAL_VERIFICATION_LABEL}
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={0.75}>
                  {creditCheckingResult.requiredVerification.map((item) => (
                    <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                      <Iconify icon="solar:round-arrow-right-bold" width={14} sx={{ color: '#B0B8CC', mt: 0.25, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{item}</Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <Stack direction="row" spacing={1} sx={{ px: 0.5 }}>
              <Iconify icon="solar:shield-warning-linear" width={15} sx={{ color: '#A0A7B5', mt: 0.15, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.5, color: '#98A2B3', lineHeight: 1.6 }}>
                <Box component="span" sx={{ fontWeight: 700, color: '#8891A6' }}>AI Control Statement — </Box>
                This AI-generated result is an advisory risk-screening output only. It does not
                constitute loan approval, disapproval, or a policy waiver. All findings,
                exceptions, and recommendations must be independently validated by authorized
                Credit personnel.
              </Typography>
            </Stack>

            <Divider sx={{ borderColor: '#EEF0F5' }} />

            <Button
              onClick={() => setResultModalOpen(true)}
              variant="outlined"
              startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
              sx={{ ...outlinedNavyButtonSx, px: 2, alignSelf: 'flex-start' }}
            >
              View Initial Credit Checking Result
            </Button>
          </Stack>
        </Box>

        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Approved?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Based on the AI review above, decide whether this application proceeds. Bureau
            reports are supporting evidence, not required to make a decision.
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={
                creditChecking.bureauFindingStatus === 'negative'
                  ? () => setJustifyDialogOpen(true)
                  : handleApprove
              }
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{
                bgcolor: '#12B76A',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { bgcolor: '#0C8A4F' },
              }}
            >
              {creditChecking.bureauFindingStatus === 'negative'
                ? 'Proceed with Justification'
                : 'Proceed to Call Report'}
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
                '&:hover': {
                  color: '#1C2A6E',
                  borderColor: '#1C2A6E',
                  bgcolor: '#F5F7FF',
                },
              }}
            >
              Sales Reject
            </Button>
          </Stack>
        </Box>
    </Stack>
  );

  return (
    <Container maxWidth={isSplitLayout ? 'xl' : 'lg'} sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader
        step="Step 1 · Initial Credit Checking"
        reviewStep="creditChecking"
        applicationSummaryStyle
      />

      {isSplitLayout ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
          <Box sx={{ width: { xs: 1, md: 440 }, flexShrink: 0, position: { md: 'sticky' }, top: { md: 24 } }}>
            <ApplicationDetailsCard />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, width: 1 }}>{rightColumnCards}</Box>
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <ApplicationDetailsCard />
          {rightColumnCards}
        </Stack>
      )}

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
            sx={{
              bgcolor: '#F04438',
              '&:hover': { bgcolor: '#B32C22' },
            }}
          >
            Confirm
          </Button>
        }
      />

      <ConfirmDialog
        open={justifyDialogOpen}
        onClose={closeJustifyDialog}
        title="Justification for proceeding"
        content={
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256', mb: 0.75 }}>
                Supporting document (optional)
              </Typography>
              <JustificationDropzone value={justificationFile} onChange={setJustificationFile} />
            </Box>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Remarks"
              placeholder="Explain why this application should proceed despite the negative bureau finding…"
              value={justificationDraft}
              onChange={(event) => setJustificationDraft(event.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        }
        action={
          <Button
            variant="contained"
            disabled={!justificationDraft.trim()}
            onClick={confirmJustifyDialog}
            sx={{
              bgcolor: '#12B76A',
              '&:hover': { bgcolor: '#0C8A4F' },
            }}
          >
            Confirm &amp; Proceed
          </Button>
        }
      />

      <OfficerNotesDialog
        open={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        notes={creditChecking.notes}
        process="Initial Credit Checking"
      />

      <CreditCheckingResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
      />
    </Container>
  );
}
