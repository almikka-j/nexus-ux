'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import type {
  BureauReportFile,
  CmapCase,
  BapNfisRecord,
  CibiResult,
  CicContract,
  LoandexRecord,
  PgfcExposureRecord,
} from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { AiRecommendationSummary } from 'src/components/admin-ui/ai-recommendation-summary';

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

// Header (bureau name, status chip) matches the old BureauResultRow's — the
// body now renders one block per uploaded file (each bureau can hold several)
// with that file's own name, upload date, and results table.
function BureauResultSection({
  title,
  files,
  needsReview,
  reviewNote,
  renderTable,
}: {
  title: string;
  files: BureauReportFile[];
  needsReview?: boolean;
  reviewNote?: string;
  renderTable: (file: BureauReportFile) => React.ReactNode;
}) {
  const hasFiles = files.length > 0;
  const tone = !hasFiles ? 'pending' : needsReview ? 'review' : 'clear';
  const toneStyle = {
    clear: { label: 'Clear', bg: '#E7F8F0', color: '#0C8A4F', icon: 'solar:check-circle-bold' },
    review: { label: 'Needs review', bg: '#FDE2DF', color: '#B32C22', icon: 'solar:danger-triangle-bold' },
    pending: { label: 'Not uploaded', bg: '#F5F6FA', color: '#667085', icon: 'solar:file-remove-bold' },
  }[tone];
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Stack
      spacing={1.25}
      sx={{ p: 1.5, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{title}</Typography>
          <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>
            {hasFiles
              ? `${files.length} ${files.length === 1 ? 'file' : 'files'} uploaded`
              : 'No report uploaded'}
          </Typography>
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
      {files.map((file) => (
        <Stack key={file.id} spacing={0.75}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 0.75 }}>
            <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: '#5b6270', maxWidth: 260 }}>
              {file.fileName}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#8891A6', whiteSpace: 'nowrap' }}>
              · Uploaded {fmtDate(file.uploadedAt)}
            </Typography>
          </Stack>
          {renderTable(file)}
        </Stack>
      ))}
    </Stack>
  );
}

const NEGATIVE_SECTION_TITLES: Record<
  'cancelledCreditCards' | 'adverseClassifiedLoans' | 'closedCurrentAccounts',
  string
> = {
  cancelledCreditCards: 'Cancelled Credit Cards File',
  adverseClassifiedLoans: 'Adversely Classified Loan File',
  closedCurrentAccounts: 'Closed Current Account',
};

// The full Initial Credit Checking result body, no dialog chrome —
// rendered inline on the Initial Credit Checking page (so the officer
// reads it without opening a modal) and wrapped by
// CreditCheckingResultModal for Call Report / Application Details' own
// "View credit checking result" actions, same split as
// CallReportResultContent/CallReportResultModal.
export function CreditCheckingResultContent({ hideHeader }: { hideHeader?: boolean } = {}) {
  const { signUpData, application } = useRegistration();
  const { review, bureauResultRows } = useAdmin();
  const {
    creditChecking,
    negativeCreditReport,
    cibiForm,
    loandexFiles,
    cicFiles,
    cmapFiles,
    nfisBapFiles,
    pgfcExposureFiles,
  } = review;

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
    cibiForm.reportFiles.length > 0 &&
    loandexFiles.length > 0 &&
    cicFiles.length > 0 &&
    cmapFiles.length > 0 &&
    nfisBapFiles.length > 0 &&
    pgfcExposureFiles.length > 0;

  const creditCheckingResult = buildInitialCreditCheckingResult({
    cmapCases: bureauResultRows.cmapCases,
    bapNfisRecords: bureauResultRows.bapNfisRecords,
    cibiResults: bureauResultRows.cibiResults,
    cicContracts: bureauResultRows.cicContracts,
    loandexRecords: bureauResultRows.loandexRecords,
    pgfcExposureRecords: bureauResultRows.pgfcExposureRecords,
    allBureauReportsUploaded,
    desiredLoanAmount: application.financialInfo?.desiredLoanAmount ?? 0,
    monthlyIncome: application.financialInfo?.monthlyIncome ?? 0,
    employmentStatus: application.financialInfo?.employmentStatus ?? 'Unknown',
    bureauFindingStatus: creditChecking.bureauFindingStatus,
    bureauFindingBureau: creditChecking.bureauFindingBureau,
    bureauFindingReason: creditChecking.bureauFindingReason,
  });
  const { riskLevel } = creditCheckingResult;

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

  return (
    <Stack spacing={2.5}>
      {!hideHeader && (
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>
            Initial Credit Checking Result
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
            Report generated {generatedLabel}
          </Typography>
        </Box>
      )}
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
              <BureauResultSection
                title="CIBI"
                files={cibiForm.reportFiles}
                renderTable={(file) => <CibiResultsTable rows={file.rows as CibiResult[]} />}
              />
              <BureauResultSection
                title="LOANDEX"
                files={loandexFiles}
                renderTable={(file) => <LoandexRecordsTable rows={file.rows as LoandexRecord[]} />}
              />
              <BureauResultSection
                title="CIC"
                files={cicFiles}
                renderTable={(file) => <CicContractsTable rows={file.rows as CicContract[]} />}
              />
              <BureauResultSection
                title="CMAP"
                files={cmapFiles}
                needsReview={hasNegativeBureauFinding && negativeFindingBureau === 'CMAP'}
                reviewNote={`Flagged: ${negativeFindingReason}. Requires officer validation.`}
                renderTable={(file) => <CmapCasesTable rows={file.rows as CmapCase[]} />}
              />
              <BureauResultSection
                title="NFIS / BAP"
                files={nfisBapFiles}
                needsReview={hasNegativeBureauFinding && negativeFindingBureau === 'NFIS'}
                reviewNote={`Flagged: ${negativeFindingReason}. Requires officer validation.`}
                renderTable={(file) => <BapNfisRecordsTable rows={file.rows as BapNfisRecord[]} />}
              />
              <BureauResultSection
                title="PGFC Existing Exposure"
                files={pgfcExposureFiles}
                renderTable={(file) => <PgfcExposureTable rows={file.rows as PgfcExposureRecord[]} />}
              />
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

          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
              AI Review, Summary &amp; Recommendation
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', lineHeight: 1.5, mb: 2 }}>
              Based on the uploaded bureau reports and application details.
            </Typography>
            <AiRecommendationSummary result={creditCheckingResult} />
          </Box>

          {(!!creditChecking.justificationText.trim() || !!creditChecking.justificationDocument) && (
            <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
                Remarks
              </Typography>
              <Stack
                spacing={1}
                sx={{ p: 1.75, borderRadius: '11px', bgcolor: '#FEF0D6' }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Iconify icon="solar:shield-warning-bold" width={16} sx={{ color: '#B36A05' }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#B36A05' }}>
                    Proceed with Justification
                  </Typography>
                </Stack>
                {!!creditChecking.justificationText.trim() && (
                  <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {creditChecking.justificationText}
                  </Typography>
                )}
                {creditChecking.justificationDocument && (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    component="button"
                    onClick={() =>
                      window.open(
                        creditChecking.justificationDocument!.fileData,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                    sx={{
                      alignSelf: 'flex-start',
                      p: 0,
                      border: 'none',
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <Iconify icon="solar:paperclip-bold" width={15} sx={{ color: '#B36A05' }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#B36A05', textDecoration: 'underline' }}>
                      {creditChecking.justificationDocument.fileName}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
          )}

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
  );
}

export function CreditCheckingResultModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 3, pb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#14172A' }}>
            Initial Credit Checking Result
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="PDF export coming soon">
            <span>
              <IconButton disabled sx={{ border: '1px solid #E1E4ED', borderRadius: '10px', px: 1.5 }}>
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
        <CreditCheckingResultContent />
      </DialogContent>
    </Dialog>
  );
}
