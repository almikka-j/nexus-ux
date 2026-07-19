'use client';

import { useState, useEffect } from 'react';
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

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { ApplicationReviewHeader } from './application-review-header';
import { ApplicationDetailsCard } from './application-details-card';
import { computeInstallment } from './cibi-form-card';
import { BureauReportsCard } from './bureau-reports-card';
import { CreditCheckingResultModal } from './call-report/credit-checking-result-modal';
import { NegativeCreditReportCard } from './negative-credit-report-card';
import { simulateBureauFinding } from './simulate-bureau-finding';
import { buildInitialAiRecommendation } from './initial-credit-checking-risk';
import type { InitialRiskLevel } from './initial-credit-checking-risk';

// ----------------------------------------------------------------------

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
    return `${firstName}'s bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP) are on file and consistent with the application details submitted. Stated employment status is "${employmentStatus}" with a requested loan amount of ₱${loanAmount.toLocaleString()}. No mismatches were found between the bureau reports and the application form.`;
  }
  return `${firstName} has requested ₱${loanAmount.toLocaleString()} with stated employment status "${employmentStatus}". Bureau reports (CIBI, LOANDEX, CIC, CMAP, NFIS/BAP) haven't been uploaded yet, so this summary is based on application details only.`;
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
    setCreditChecking,
    setCibiForm,
    setLoandexUpload,
    setCicUpload,
    setCmapUpload,
    setNfisBapUpload,
    resetNegativeCreditReport,
  } = useAdmin();
  // "No" and "For Reconsideration" both require the officer to type a reason
  // in a confirmation dialog before proceeding — captured separately from the
  // general Officer Notes field above, since this reason is specific to the
  // decision being made right now. Distinct from each other: "No" records a
  // hard rejection (`decision: 'rejected'`), "For Reconsideration" leaves the
  // decision at 'pending' — both land on the same Reconsideration screen.
  const [pendingAction, setPendingAction] = useState<'rejected' | 'reconsideration' | null>(null);
  const [reasonDraft, setReasonDraft] = useState('');
  // Pure display preference, not persisted — resets to the stacked layout on
  // navigation/refresh, since it's how this admin wants to view *this*
  // session, not application data that should carry forward.
  const [isSplitLayout, setIsSplitLayout] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);

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
  // being 'pending'); the result is then sticky, read directly by this page
  // (to decide whether NegativeCreditReportCard should render) and by
  // CreditCheckingResultModal (to decide which content to show) — neither
  // ever re-derives it independently.
  useEffect(() => {
    if (!signUpData) return;
    if (!allBureauReportsUploaded) return;
    if (creditChecking.bureauFindingStatus !== 'pending') return;

    const result = simulateBureauFinding([
      signUpData.email,
      cibiForm.reportFileName ?? '',
      loandexUpload.fileName ?? '',
      cicUpload.fileName ?? '',
      cmapUpload.fileName ?? '',
      nfisBapUpload.fileName ?? '',
    ]);
    setCreditChecking({ bureauFindingStatus: result });
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

  if (!signUpData || !application.personalInfo) return null;
  const initialAiRecommendation = buildInitialAiRecommendation(
    application.financialInfo?.desiredLoanAmount ?? 0,
    application.financialInfo?.monthlyIncome ?? 0,
    application.financialInfo?.employmentStatus ?? 'Unknown'
  );
  const initialRiskStyle = INITIAL_RISK_STYLES[initialAiRecommendation.level];
  const showNegativeReportCard =
    allBureauReportsUploaded && creditChecking.bureauFindingStatus === 'negative';

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

  const handleFillSampleData = () => {
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
      reportFile: null,
      reportFileName: 'cibi-report-sample.pdf',
    });

    setLoandexUpload({ fileName: 'loandex-report-sample.pdf' });
    setCicUpload({ fileName: 'cic-report-sample.pdf' });
    setCmapUpload({ fileName: 'cmap-report-sample.pdf' });
    setNfisBapUpload({ fileName: 'nfis-bap-report-sample.pdf' });
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
    });

    setLoandexUpload({ fileName: null });
    setCicUpload({ fileName: null });
    setCmapUpload({ fileName: null });
    setNfisBapUpload({ fileName: null });
  };

  const handleApprove = () => {
    setCreditChecking({ decision: 'approved' });
    router.push(paths.admin.callReport(encodeURIComponent(signUpData.email)));
  };

  const closeReasonDialog = () => {
    setPendingAction(null);
    setReasonDraft('');
  };

  const confirmReasonDialog = () => {
    if (!pendingAction || !reasonDraft.trim()) return;

    setCreditChecking({
      decision: pendingAction === 'rejected' ? 'rejected' : 'pending',
      decisionReason: reasonDraft.trim(),
    });
    router.push(paths.admin.reconsideration(encodeURIComponent(signUpData.email)));
  };

  const rightColumnCards = (
    <Stack spacing={2.5}>
        <BureauReportsCard />

        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            bgcolor: 'common.white',
            border: '1px solid #EBEDF3',
            boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Officer notes
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Add any observations about this application — carries forward, read-only, to Call
            Report and Reconsideration.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="e.g. Borrower's stated employer could not be verified by phone…"
            value={creditChecking.notes}
            onChange={(event) => setCreditChecking({ notes: event.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 },
            }}
          />
        </Box>

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
            sx={{
              mb: 2.5,
              color: '#1C2A6E',
              borderColor: '#C7CEEA',
              borderRadius: '10px',
              px: 2,
              '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
            }}
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

        {showNegativeReportCard && <NegativeCreditReportCard />}

        <Box
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            bgcolor: 'common.white',
            border: '1px solid #EBEDF3',
            boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Approved?
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
            Based on the AI review above, decide whether this application proceeds. Bureau
            reports are supporting evidence, not required to make a decision.
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
            <Button
              onClick={handleApprove}
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{
                bgcolor: '#12B76A',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { bgcolor: '#0C8A4F' },
              }}
            >
              Approve
            </Button>
            <Button
              onClick={() => setPendingAction('rejected')}
              variant="outlined"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              sx={{
                color: '#F04438',
                borderColor: '#F04438',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { borderColor: '#B32C22', bgcolor: 'rgba(240,68,56,0.04)' },
              }}
            >
              No
            </Button>
            <Button
              onClick={() => setPendingAction('reconsideration')}
              variant="outlined"
              startIcon={<Iconify icon="solar:refresh-circle-bold" width={18} />}
              sx={{
                color: '#B36A05',
                borderColor: '#B36A05',
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { borderColor: '#8A5204', bgcolor: 'rgba(179,106,5,0.04)' },
              }}
            >
              For Reconsideration
            </Button>
          </Stack>
        </Box>
    </Stack>
  );

  return (
    <Container maxWidth={isSplitLayout ? 'xl' : 'md'} sx={{ py: { xs: 4, md: 6 } }}>
      <ApplicationReviewHeader step="Step 1 · Initial Credit Checking" reviewStep="creditChecking" />

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
        open={!!pendingAction}
        onClose={closeReasonDialog}
        title={pendingAction === 'rejected' ? 'Reason for declining' : 'Reason for reconsideration'}
        content={
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Explain why…"
            value={reasonDraft}
            onChange={(event) => setReasonDraft(event.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
          />
        }
        action={
          <Button
            variant="contained"
            disabled={!reasonDraft.trim()}
            onClick={confirmReasonDialog}
            sx={{
              bgcolor: pendingAction === 'rejected' ? '#F04438' : '#B36A05',
              '&:hover': { bgcolor: pendingAction === 'rejected' ? '#B32C22' : '#8A5204' },
            }}
          >
            Confirm
          </Button>
        }
      />

      <CreditCheckingResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
      />

      <Button
        onClick={allBureauReportsUploaded ? handleClearSampleData : handleFillSampleData}
        variant="contained"
        startIcon={<Iconify icon="solar:magic-stick-3-bold-duotone" width={18} />}
        sx={{
          position: 'fixed',
          bottom: 84,
          right: 24,
          zIndex: 1200,
          bgcolor: '#1C2A6E',
          borderRadius: '999px',
          px: 2.5,
          py: 1.25,
          boxShadow: '0 8px 24px -8px rgba(20,23,42,0.4)',
          '&:hover': { bgcolor: '#14205A' },
        }}
      >
        {allBureauReportsUploaded ? 'Remove Sample Data' : 'Fill with Sample Data'}
      </Button>

      <Button
        onClick={() => setIsSplitLayout((prev) => !prev)}
        variant="contained"
        startIcon={<Iconify icon="solar:widget-5-bold-duotone" width={18} />}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
          display: { xs: 'none', md: 'inline-flex' },
          bgcolor: '#5A6273',
          borderRadius: '999px',
          px: 2.5,
          py: 1.25,
          boxShadow: '0 8px 24px -8px rgba(20,23,42,0.4)',
          '&:hover': { bgcolor: '#40465A' },
        }}
      >
        {isSplitLayout ? 'Switch to 1-Column Layout' : 'Switch to 2-Column Layout'}
      </Button>

      {allBureauReportsUploaded && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: 'fixed', bottom: 144, right: 24, zIndex: 1200 }}
        >
          <Button
            onClick={() => setCreditChecking({ bureauFindingStatus: 'clean' })}
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#0C8A4F',
              borderRadius: '999px',
              px: 2,
              boxShadow: '0 8px 24px -8px rgba(20,23,42,0.4)',
              '&:hover': { bgcolor: '#0A6E40' },
            }}
          >
            Force Clean
          </Button>
          <Button
            onClick={() => setCreditChecking({ bureauFindingStatus: 'negative' })}
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#B32C22',
              borderRadius: '999px',
              px: 2,
              boxShadow: '0 8px 24px -8px rgba(20,23,42,0.4)',
              '&:hover': { bgcolor: '#8F231A' },
            }}
          >
            Force Negative
          </Button>
        </Stack>
      )}
    </Container>
  );
}
