'use client';

import { useMemo, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { fCurrency } from 'src/utils/format-number';
import { Iconify } from 'src/components/iconify';
import { fileToDataUrl } from 'src/utils/file-to-data-url';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { OfficerNotesDialog, buildOfficerNoteEntry } from './officer-notes-history';
import { computeInstallment } from './cibi-form-card';
import { BureauReportsCard } from './bureau-reports-card';
import { NegativeCreditReportCard } from './negative-credit-report-card';
import { CreditCheckingResultModal } from './call-report/credit-checking-result-modal';
import { simulateBureauFinding } from './simulate-bureau-finding';
import { buildInitialAiRecommendation } from './initial-credit-checking-risk';
import type { InitialRiskLevel } from './initial-credit-checking-risk';

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

// AI summary/recommendation are computed directly from Application details,
// and additionally from the uploaded Bureau Reports once those are on file —
// no manual "run analysis" step, no gating on bureau uploads before showing
// anything. Purely derived (not stored), same pattern as the Call Report
// financial ratios. Before bureau reports are uploaded, both fall back to a
// read based on application details alone (this is what used to be a
// separate "Initial AI Recommendation" card — merged in here so there's one
// AI-output card instead of two, always populated).
function buildAiSummary(
  firstName: string,
  loanAmount: number,
  employmentStatus: string,
  allBureauReportsUploaded: boolean
) {
  if (allBureauReportsUploaded) {
    return `${firstName}'s bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP) are on file and consistent with the application details submitted. Stated employment status is "${employmentStatus}" with a requested loan amount of ${fCurrency(loanAmount)}. No mismatches were found between the bureau reports and the application form.`;
  }
  return `${firstName} has requested ${fCurrency(loanAmount)} with stated employment status "${employmentStatus}". Bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP) haven't been uploaded yet, so this summary is based on application details only.`;
}

function buildAiRecommendation(
  loanAmount: number,
  monthlyIncome: number,
  allBureauReportsUploaded: boolean
) {
  const ratio = monthlyIncome > 0 ? loanAmount / (monthlyIncome * 12) : null;
  const withinRange = ratio !== null && ratio <= 0.5;

  if (allBureauReportsUploaded) {
    return withinRange
      ? 'Debt-to-income indicators are within an acceptable range. Recommend proceeding to Call Report preparation.'
      : 'Requested amount is high relative to stated monthly income. Recommend proceeding with added scrutiny during Call Report review.';
  }
  return withinRange
    ? 'Debt-to-income indicators are within an acceptable range based on application details alone. Upload the bureau reports above to confirm before proceeding to Call Report.'
    : 'Requested amount is high relative to stated monthly income, based on application details alone. Upload the bureau reports above for a fuller picture before proceeding.';
}

const INITIAL_RISK_STYLES: Record<InitialRiskLevel, { bg: string; color: string; icon: string; label: string }> = {
  good: { bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold', label: 'Low risk' },
  watch: { bg: '#FEF0D6', color: '#B36A05', icon: 'solar:danger-triangle-bold', label: 'Needs a closer look' },
  high: { bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold', label: 'High risk' },
};

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

  const { creditChecking, cibiForm, loandexUpload, cicUpload, cmapUpload, nfisBapUpload } = review;
  const allBureauReportsUploaded =
    !!cibiForm.reportFileName &&
    !!loandexUpload.fileName &&
    !!cicUpload.fileName &&
    !!cmapUpload.fileName &&
    !!nfisBapUpload.fileName;

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

  const initialAiRecommendation = buildInitialAiRecommendation(
    application.financialInfo?.desiredLoanAmount ?? 0,
    application.financialInfo?.monthlyIncome ?? 0,
    application.financialInfo?.employmentStatus ?? 'Unknown'
  );
  const initialRiskStyle = INITIAL_RISK_STYLES[initialAiRecommendation.level];
  const aiSummary = buildAiSummary(
    signUpData.firstName,
    application.financialInfo?.desiredLoanAmount ?? 0,
    application.financialInfo?.employmentStatus ?? 'Unknown',
    allBureauReportsUploaded
  );
  const aiRecommendation = buildAiRecommendation(
    application.financialInfo?.desiredLoanAmount ?? 0,
    application.financialInfo?.monthlyIncome ?? 0,
    allBureauReportsUploaded
  );

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
              : 'Based on application details — upload the CIBI, LOANDEX, CIC, CMAP, and NFIS/BAP reports above to confirm with the full bureau review.'}
          </Typography>

          <Button
            onClick={() => setResultModalOpen(true)}
            variant="outlined"
            startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
            sx={{ ...outlinedNavyButtonSx, mb: 2.5, px: 2 }}
          >
            View Initial Credit Checking Result
          </Button>

          <Stack spacing={2}>
            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon="solar:document-text-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273' }}>
                  AI Summary
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>
                {aiSummary}
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: '11px', bgcolor: initialRiskStyle.bg }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Iconify icon={initialRiskStyle.icon} width={16} sx={{ color: initialRiskStyle.color }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: initialRiskStyle.color }}>
                  AI Recommendation · {initialRiskStyle.label}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 13.5, color: initialRiskStyle.color, lineHeight: 1.6 }}>
                {aiRecommendation}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {allBureauReportsUploaded && creditChecking.bureauFindingStatus === 'negative' && (
          <NegativeCreditReportCard />
        )}

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
    <Container maxWidth={isSplitLayout ? 'xl' : 'md'} sx={{ py: { xs: 4, md: 6 } }}>
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
