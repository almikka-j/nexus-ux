'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { buildInitialCreditCheckingResult } from '../initial-credit-checking-risk';
import {
  CmapCasesTable,
  BapNfisRecordsTable,
  CibiResultsTable,
  CicContractsTable,
  LoandexRecordsTable,
  PgfcExposureTable,
} from '../bureau-results-tables';

// ----------------------------------------------------------------------
// Entirely computed at render time from existing state — no new fields are
// stored on CreditChecking. Same "pure computation, never stored" pattern as
// the Initial Credit Checking AI review and the Call Report summary/ratios.
// Applicant only; no co-maker section (that concept doesn't exist elsewhere
// in this app yet).
//
// Opened from two places: Initial Credit Checking (decision is still
// 'pending' at that point — the officer hasn't clicked Approve/No yet) and
// Call Report (decision has already been made). Because of that, "cleared"
// can't be keyed off `decision === 'approved'` — it's keyed off the same
// risk level (`buildInitialCreditCheckingResult`) shown in the Initial
// Credit Checking AI review card, so the two screens never disagree.
// ----------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#8891A6',
      }}
    >
      {children}
    </Typography>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', width: 110, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value}</Typography>
    </Stack>
  );
}

// Header (bureau name, uploaded file, status chip) matches the old
// BureauResultRow's exactly — only the body changed, from a canned summary
// sentence to the real fact-chip table for that bureau (children).
function BureauResultSection({
  title,
  fileName,
  uploadedAt,
  needsReview,
  reviewNote,
  children,
}: {
  title: string;
  fileName: string | null;
  uploadedAt: string | null;
  needsReview?: boolean;
  reviewNote?: string;
  children: React.ReactNode;
}) {
  const tone = !fileName ? 'pending' : needsReview ? 'review' : 'clear';
  const toneStyle = {
    clear: { label: 'Clear', bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold' },
    review: { label: 'Needs review', bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold' },
    pending: { label: 'Not uploaded', bg: '#F5F6FA', color: '#667085', icon: 'solar:file-remove-bold' },
  }[tone];
  const uploadedLabel = uploadedAt
    ? new Date(uploadedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Stack
      spacing={1.25}
      sx={{ p: 1.5, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 0.75 }}>
            <Typography noWrap sx={{ fontSize: 11.5, color: '#8891A6', maxWidth: 220 }}>
              {fileName ?? 'No report uploaded'}
            </Typography>
            {fileName && (
              <Typography sx={{ fontSize: 11.5, color: '#8891A6', whiteSpace: 'nowrap' }}>
                · {uploadedLabel ? `Uploaded ${uploadedLabel}` : 'Upload date unavailable'}
              </Typography>
            )}
          </Stack>
        </Box>
        <Chip
          size="small"
          icon={<Iconify icon={toneStyle.icon} width={13} />}
          label={toneStyle.label}
          sx={{ bgcolor: toneStyle.bg, color: toneStyle.color, fontWeight: 700, fontSize: 11.5 }}
        />
      </Stack>
      {needsReview && reviewNote && (
        <Typography sx={{ fontSize: 13, color: '#B32C22', lineHeight: 1.55 }}>{reviewNote}</Typography>
      )}
      {fileName && children}
    </Stack>
  );
}

function FindingBullet({ children }: { children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#C1C7D6', mt: 0.9, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{children}</Typography>
    </Stack>
  );
}

type CreditCheckingResultModalProps = {
  open: boolean;
  onClose: () => void;
  recommendationEditable?: boolean;
};

const NEGATIVE_SECTION_TITLES: Record<
  'cancelledCreditCards' | 'adverseClassifiedLoans' | 'closedCurrentAccounts',
  string
> = {
  cancelledCreditCards: 'Cancelled Credit Cards File',
  adverseClassifiedLoans: 'Adversely Classified Loan File',
  closedCurrentAccounts: 'Closed Current Account',
};

export function CreditCheckingResultModal({
  open,
  onClose,
  recommendationEditable = true,
}: CreditCheckingResultModalProps) {
  const { signUpData, application } = useRegistration();
  const { review, setCreditChecking } = useAdmin();
  const [isRemarksSaving, setIsRemarksSaving] = useState(false);
  const remarksSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    creditChecking,
    negativeCreditReport,
    cibiForm,
    loandexUpload,
    cicUpload,
    cmapUpload,
    nfisBapUpload,
    pgfcExposureUpload,
  } = review;

  useEffect(
    () => () => {
      if (remarksSaveTimerRef.current) clearTimeout(remarksSaveTimerRef.current);
    },
    []
  );

  if (!signUpData) return null;

  const fullName = `${signUpData.firstName} ${signUpData.lastName}`;
  const applicationNo = getLoanNumber(signUpData.email);
  const generatedAt = review.stepTimestamps.creditChecking
    ? new Date(review.stepTimestamps.creditChecking)
    : null;
  const generatedLabel = generatedAt
    ? `${generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ${generatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : '—';
  const applicationDateLabel = application.submittedAt
    ? new Date(application.submittedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  const allBureauReportsUploaded =
    !!cibiForm.reportFileName &&
    !!loandexUpload.fileName &&
    !!cicUpload.fileName &&
    !!cmapUpload.fileName &&
    !!nfisBapUpload.fileName &&
    !!pgfcExposureUpload.fileName;

  const { riskLevel } = buildInitialCreditCheckingResult({
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

  const isCleared = riskLevel === 'low' && allBureauReportsUploaded;

  // Only when the simulated bureau review actually came back negative AND
  // the officer has submitted the manual report do we show real data here —
  // otherwise (clean, or negative-but-not-yet-submitted) this falls back to
  // the hardcoded all-clear content below, unchanged.
  const showNegativeReport =
    creditChecking.bureauFindingStatus === 'negative' && negativeCreditReport.submitted;
  const hasNegativeBureauFinding = creditChecking.bureauFindingStatus === 'negative';
  const negativeFindingBureau = creditChecking.bureauFindingBureau;
  const negativeFindingReason = creditChecking.bureauFindingReason;
  const recommendationStyle = hasNegativeBureauFinding
    ? { background: '#FDE2DF', color: '#B32C22' }
    : isCleared
      ? { background: '#E7F8F0', color: '#0C8A4F' }
      : { background: '#FEF0D6', color: '#B36A05' };

  const recommendationLines = negativeCreditReport.recommendationRemarks
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const [recommendationLead, ...recommendationBullets] = recommendationLines;

  const handleRecommendationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCreditChecking({ officerRecommendation: event.target.value });
    setIsRemarksSaving(true);

    if (remarksSaveTimerRef.current) clearTimeout(remarksSaveTimerRef.current);
    remarksSaveTimerRef.current = setTimeout(() => {
      setIsRemarksSaving(false);
      remarksSaveTimerRef.current = null;
    }, 600);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 3, pb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>
            Initial Credit Checking Result
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
            Report generated {generatedLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="PDF export coming soon">
            <span>
              <IconButton
                disabled
                sx={{ border: '1px solid #E1E4ED', borderRadius: '10px', px: 1.5 }}
              >
                <Iconify icon="solar:file-download-bold" width={18} sx={{ color: '#8891A6' }} />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ border: '1px solid #E1E4ED', borderRadius: '10px' }}>
            <Iconify icon="solar:close-circle-bold" width={18} sx={{ color: '#8891A6' }} />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        <Stack spacing={2.5}>
          {isCleared && (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{ p: 2, borderRadius: '11px', bgcolor: '#E7F8F0' }}
            >
              <Iconify
                icon="solar:check-circle-bold"
                width={20}
                sx={{ color: '#0C8A4F', mt: 0.25 }}
              />
              <Stack spacing={0.25}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0C8A4F' }}>
                  Cleared — no negative records
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#0C8A4F' }}>
                  Recommending the loan application to proceed.
                </Typography>
              </Stack>
            </Stack>
          )}

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Credit Checking Report</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <FieldRow label="Application No." value={applicationNo} />
              <FieldRow label="Client Name" value={fullName} />
              <FieldRow label="Email Address" value={signUpData.email} />
              <FieldRow label="Contact Number" value={signUpData.mobile || '—'} />
              <FieldRow label="Date of Application" value={applicationDateLabel} />
              <FieldRow label="To" value="Credit Committee" />
              <FieldRow label="Thru" value={application.assignedOfficer ?? '—'} />
              <FieldRow label="From" value="Credit and Collection Department" />
              <FieldRow label="Date" value={generatedAt ? generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'} />
              <FieldRow label="Subject" value={`${fullName} — LOANDEX / BAP NFIS / CMAP / CIC`} />
            </Stack>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              Bureau Reports Result
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', lineHeight: 1.5, mb: 2 }}>
              Summary of the information extracted from each uploaded bureau report. Validate each
              finding against the source document before making a credit decision.
            </Typography>

            <Stack spacing={2}>
              <BureauResultSection title="CIBI" fileName={cibiForm.reportFileName} uploadedAt={cibiForm.reportUploadedAt}>
                <CibiResultsTable rows={creditChecking.cibiResults} />
              </BureauResultSection>
              <BureauResultSection title="LOANDEX" fileName={loandexUpload.fileName} uploadedAt={loandexUpload.uploadedAt}>
                <LoandexRecordsTable rows={creditChecking.loandexRecords} />
              </BureauResultSection>
              <BureauResultSection title="CIC" fileName={cicUpload.fileName} uploadedAt={cicUpload.uploadedAt}>
                <CicContractsTable rows={creditChecking.cicContracts} />
              </BureauResultSection>
              <BureauResultSection
                title="CMAP"
                fileName={cmapUpload.fileName}
                uploadedAt={cmapUpload.uploadedAt}
                needsReview={hasNegativeBureauFinding && negativeFindingBureau === 'CMAP'}
                reviewNote={`Flagged: ${negativeFindingReason}. Requires officer validation.`}
              >
                <CmapCasesTable rows={creditChecking.cmapCases} />
              </BureauResultSection>
              <BureauResultSection
                title="NFIS / BAP"
                fileName={nfisBapUpload.fileName}
                uploadedAt={nfisBapUpload.uploadedAt}
                needsReview={hasNegativeBureauFinding && negativeFindingBureau === 'NFIS'}
                reviewNote={`Flagged: ${negativeFindingReason}. Requires officer validation.`}
              >
                <BapNfisRecordsTable rows={creditChecking.bapNfisRecords} />
              </BureauResultSection>
              <BureauResultSection title="PGFC Existing Exposure" fileName={pgfcExposureUpload.fileName} uploadedAt={pgfcExposureUpload.uploadedAt}>
                <PgfcExposureTable rows={creditChecking.pgfcExposureRecords} />
              </BureauResultSection>
            </Stack>

            {showNegativeReport && (
              <Stack spacing={1.25} sx={{ mt: 2, pt: 2, borderTop: '1px solid #EEF0F5' }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#B32C22' }}>
                  Consolidated finding for officer review
                </Typography>
                <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {negativeCreditReport.negativeRecordText}
                </Typography>
                {negativeCreditReport.accountFindings.map((entry) => (
                  <Typography key={entry.id} sx={{ fontSize: 13.5, color: '#3B4256' }}>
                    {entry.label} : {entry.findings}
                  </Typography>
                ))}
                {(['cancelledCreditCards', 'adverseClassifiedLoans', 'closedCurrentAccounts'] as const).map(
                  (listKey) => {
                    const entries = negativeCreditReport[listKey];
                    return entries.length === 0 ? (
                      <Typography
                        key={listKey}
                        sx={{ fontSize: 13.5, fontWeight: 700, textAlign: 'center', color: '#3B4256' }}
                      >
                        No {NEGATIVE_SECTION_TITLES[listKey]}
                      </Typography>
                    ) : (
                      entries.map((entry) => (
                        <Typography key={entry.id} sx={{ fontSize: 13.5, color: '#3B4256' }}>
                          {entry.label} : {entry.findings}
                        </Typography>
                      ))
                    );
                  }
                )}
              </Stack>
            )}
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', bgcolor: recommendationStyle.background }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify
                  icon="solar:magic-stick-3-bold-duotone"
                  width={18}
                  sx={{ color: recommendationStyle.color }}
                />
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: recommendationStyle.color }}>
                  AI Recommendation
                </Typography>
              </Stack>
            </Stack>
            {showNegativeReport ? (
              <Stack spacing={1}>
                {recommendationLead && (
                  <Typography sx={{ fontSize: 13.5, color: recommendationStyle.color, lineHeight: 1.6 }}>
                    {recommendationLead}
                  </Typography>
                )}
                {recommendationBullets.map((line, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <FindingBullet key={index}>{line}</FindingBullet>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: 13.5, color: recommendationStyle.color, lineHeight: 1.6 }}>
                {isCleared
                  ? 'In view of the foregoing, the Credit Department is hereby recommending the said loan application to proceed.'
                  : 'In view of the foregoing, the Credit Department will issue a recommendation once the credit checking review is complete.'}
              </Typography>
            )}
          </Box>

          <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A' }}>
              Recommendation &amp; Remarks
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', lineHeight: 1.5, mt: 0.5, mb: 1.5 }}>
              The department&apos;s written finding, forwarded to the Credit Committee.
            </Typography>
            {recommendationEditable ? (
              <TextField
                fullWidth
                multiline
                minRows={4}
                value={creditChecking.officerRecommendation ?? ''}
                onChange={handleRecommendationChange}
                placeholder="Enter the department's recommendation and supporting remarks"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '11px', alignItems: 'flex-start' },
                  '& textarea::placeholder': { color: '#98A2B3', opacity: 1 },
                }}
              />
            ) : (
              <Typography sx={{ fontSize: 14, color: '#3B4256', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {creditChecking.officerRecommendation?.trim() || 'No recommendation or remarks recorded.'}
              </Typography>
            )}
            {recommendationEditable && !!creditChecking.officerRecommendation?.trim() && (
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                justifyContent="flex-end"
                aria-live="polite"
                sx={{ mt: 1, minHeight: 18 }}
              >
                <Iconify
                  icon={isRemarksSaving ? 'solar:clock-circle-linear' : 'solar:check-circle-bold'}
                  width={15}
                  sx={{ color: isRemarksSaving ? '#8891A6' : '#0C8A4F' }}
                />
                <Typography
                  sx={{ fontSize: 12, fontWeight: 600, color: isRemarksSaving ? '#8891A6' : '#0C8A4F' }}
                >
                  {isRemarksSaving ? 'Saving…' : 'Saved locally'}
                </Typography>
              </Stack>
            )}
          </Box>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
            <SectionLabel>Prepared by</SectionLabel>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mt: 1 }}>
              {application.assignedOfficer ?? '—'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
              Credit Officer · {generatedLabel}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
