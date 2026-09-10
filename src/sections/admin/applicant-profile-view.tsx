'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import ButtonBase from '@mui/material/ButtonBase';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import { TONE_COLORS, adminCardSx } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';
import { FileThumbnail } from 'src/components/file-thumbnail';

import { SAMPLE_APPLICATIONS } from './sample-applications';

import type { ReviewStep } from 'src/auth/admin-context';
import type { RegistrationState } from 'src/auth/registration-context';

// ----------------------------------------------------------------------
// Read-only borrower profile — "who is this person and what loans have
// they applied for" — reachable by clicking an applicant's name in the
// Application List / Account Solicitation table (see
// application-list-view.tsx's handleNameClick), for both the one live
// application this prototype tracks and any of the static sample rows used
// to fill out the list. Was sample-only (SampleApplicationView,
// sample-application-view.tsx) before being generalized to cover the live
// applicant too.
// ----------------------------------------------------------------------

const STEP_LABELS: Record<ReviewStep, string> = {
  creditChecking: 'Initial Credit Checking',
  reconsideration: 'Reconsideration',
  callReport: 'Call Report',
  requirementChecklist: 'Requirement Checklist',
  creditInvestigation: 'Credit Investigation',
  appraisal: 'Appraisal',
  financialEvaluation: 'Financial Evaluation',
};

// This prototype tracks exactly one application per borrower — there's no
// real "multiple loans over time" data model anywhere in RegistrationContext
// or AdminContext. Loan History is genuinely a per-loan record though (not
// a per-review-step one), so past loans are deterministically fabricated
// per email — same hash technique as getLoanNumber()/simulateBureauFinding,
// not Math.random(), so a given borrower always shows the same fake history
// on every reload rather than a new one each visit.
type PastLoan = {
  loanNumber: string;
  loanType: 'personal' | 'business';
  purpose: string;
  amount: number;
  status: 'Paid Off' | 'Cancelled';
  closedYearsAgo: number;
};

const PAST_LOAN_PURPOSES = ['Working Capital', 'Home Improvement', 'Debt Consolidation', 'Education', 'Business Expansion'];

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildPastLoans(email: string): PastLoan[] {
  const baseHash = hashSeed(email);
  const count = baseHash % 3; // 0, 1, or 2 past loans

  return Array.from({ length: count }, (_, index): PastLoan => {
    const entryHash = hashSeed(`${email}:${index}`);
    return {
      loanNumber: `PGFC-${(entryHash % 1000000).toString().padStart(6, '0')}`,
      loanType: entryHash % 2 === 0 ? 'personal' : 'business',
      purpose: PAST_LOAN_PURPOSES[entryHash % PAST_LOAN_PURPOSES.length],
      amount: 50000 + (entryHash % 40) * 10000,
      status: entryHash % 5 === 0 ? 'Cancelled' : 'Paid Off',
      closedYearsAgo: 1 + (entryHash % 3),
    };
  }).sort((a, b) => a.closedYearsAgo - b.closedYearsAgo);
}

// Same deterministic per-borrower avatar color as application-list-view.tsx's
// getAvatarPalette — kept as a local copy (small, unrelated files) rather
// than shared, matching this codebase's convention elsewhere.
const AVATAR_PALETTES = [
  { bg: '#EEF1FE', text: '#3448B0' },
  { bg: '#E7F8F0', text: '#0C8A4F' },
  { bg: '#FEF0D6', text: '#B36A05' },
  { bg: '#FDE2DF', text: '#B32C22' },
  { bg: '#F3E8FD', text: '#7C3AED' },
  { bg: '#E0F7FA', text: '#0E7490' },
];

function getAvatarPalette(email: string) {
  return AVATAR_PALETTES[hashSeed(email) % AVATAR_PALETTES.length];
}

const SAMPLE_CHIP = (
  <Chip
    size="small"
    label="Sample"
    sx={{
      height: 18,
      fontSize: 10,
      fontWeight: 700,
      bgcolor: '#F5F6FA',
      color: '#8891A6',
      '& .MuiChip-label': { px: 0.75 },
    }}
  />
);

const DOCUMENT_THUMB_SIZE = 76;

// Small thumbnail + label/status row — the established document-preview
// pattern across the admin app (application-details-card.tsx,
// bureau-reports-card.tsx, requirement-doc-row.tsx), not a large aspect-ratio
// photo card.
function DocumentPreview({
  label,
  src,
  placeholderIcon,
}: {
  label: string;
  src: string | null;
  placeholderIcon: string;
}) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      {src ? (
        <Box
          sx={{
            width: DOCUMENT_THUMB_SIZE,
            height: DOCUMENT_THUMB_SIZE,
            flexShrink: 0,
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #E1E4ED',
            bgcolor: '#F5F6FA',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      ) : (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            width: DOCUMENT_THUMB_SIZE,
            height: DOCUMENT_THUMB_SIZE,
            flexShrink: 0,
            borderRadius: '10px',
            border: '1.5px dashed #E1E4ED',
            bgcolor: '#FAFBFD',
          }}
        >
          <Iconify icon={placeholderIcon} width={30} sx={{ color: '#C7CCDA' }} />
        </Stack>
      )}
      <Stack spacing={0.25}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A' }}>{label}</Typography>
        <Typography sx={{ fontSize: 11.5, color: src ? '#12B76A' : '#8891A6' }}>
          {src ? 'Provided' : 'Not provided'}
        </Typography>
      </Stack>
    </Stack>
  );
}

// Separate from DocumentPreview (which assumes an image) since the business
// registration document can be a PDF — see CompactDropzone's
// `accept: { 'image/*': [], 'application/pdf': [] }` on Preliminary
// Application. FileThumbnail already handles the image-or-non-image case.
function BusinessDocumentPreview({ label, src }: { label: string; src: string | null }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      {src ? (
        <FileThumbnail
          file={src}
          sx={{ width: DOCUMENT_THUMB_SIZE, height: DOCUMENT_THUMB_SIZE, flexShrink: 0 }}
          slotProps={{ img: { borderRadius: '10px' } }}
        />
      ) : (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            width: DOCUMENT_THUMB_SIZE,
            height: DOCUMENT_THUMB_SIZE,
            flexShrink: 0,
            borderRadius: '10px',
            border: '1.5px dashed #E1E4ED',
            bgcolor: '#FAFBFD',
          }}
        >
          <Iconify icon="solar:document-bold-duotone" width={30} sx={{ color: '#C7CCDA' }} />
        </Stack>
      )}
      <Stack spacing={0.25}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A' }}>{label}</Typography>
        <Typography sx={{ fontSize: 11.5, color: src ? '#12B76A' : '#8891A6' }}>
          {src ? 'Provided' : 'Not provided'}
        </Typography>
      </Stack>
    </Stack>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack spacing={0.4} sx={{ minWidth: 140 }}>
      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Stack>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 12,
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

type LoanHistoryRow = {
  loanNumber: string;
  loanType: 'personal' | 'business';
  purpose: string;
  amount: number;
  statusLabel: string;
  statusTone: 'success' | 'info' | 'neutral' | 'warning';
  dateLabel: string;
};

function LoanHistoryTable({ rows }: { rows: LoanHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
        No loan applications on file.
      </Typography>
    );
  }

  return (
    <TableContainer sx={{ border: '1px solid #EEF0F5', borderRadius: '12px', overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { bgcolor: '#FBFBFD', borderColor: '#EEF0F5', fontSize: 11, fontWeight: 700, color: '#8891A6', textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
            <TableCell>Loan No.</TableCell>
            <TableCell>Type &amp; Purpose</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const colors = TONE_COLORS[row.statusTone];
            return (
              <TableRow key={row.loanNumber} sx={{ '&:last-of-type td': { borderBottom: 0 }, '& td': { borderColor: '#EEF0F5' } }}>
                <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', fontVariantNumeric: 'tabular-nums' }}>
                  {row.loanNumber}
                </TableCell>
                <TableCell sx={{ fontSize: 13, color: '#5A6273' }}>
                  {row.loanType === 'business' ? 'Business Loan' : 'Personal Loan'} · {row.purpose}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', fontVariantNumeric: 'tabular-nums' }}>
                  {fCurrency(row.amount)}
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: 'inline-block',
                      px: 1,
                      py: 0.3,
                      borderRadius: '999px',
                      bgcolor: colors.bg,
                      color: colors.text,
                      fontSize: 11.5,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.statusLabel}
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12.5, color: '#8891A6', whiteSpace: 'nowrap' }}>
                  {row.dateLabel}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

type ApplicantProfileViewProps = {
  email: string;
};

export function ApplicantProfileView({ email }: ApplicantProfileViewProps) {
  const { signUpData: liveSignUpData, application: liveApplication } = useRegistration();
  const { review } = useAdmin();
  // Only the Personal & ID information / Uploaded documents sections
  // collapse — the avatar/name/contact header stays visible either way,
  // since that's the card's identity, not detail to hide.
  const [detailsExpanded, setDetailsExpanded] = useState(true);

  const isLive = liveSignUpData?.email === email;
  const sampleEntry = isLive
    ? undefined
    : SAMPLE_APPLICATIONS.find((item) => item.registration.signUpData?.email === email);

  const registration: RegistrationState | undefined = isLive
    ? { signUpData: liveSignUpData, verified: true, application: liveApplication } as RegistrationState
    : sampleEntry?.registration;

  if (!registration?.signUpData) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography sx={{ fontSize: 16, color: '#8891A6' }}>Application not found.</Typography>
      </Container>
    );
  }

  const { signUpData, application } = registration;
  const { loanType, financialInfo, personalInfo } = application;

  // Current step badge: for the live applicant, the most recently entered
  // step per review.stepTimestamps (accumulated in pipeline order as she
  // actually passes through screens — see ApplicationReviewHeader's
  // markStepEntered call); for a sample row, just its fixed parked step.
  const PIPELINE_STEP_ORDER: ReviewStep[] = [
    'creditChecking',
    'reconsideration',
    'callReport',
    'requirementChecklist',
    'creditInvestigation',
    'appraisal',
    'financialEvaluation',
  ];
  const enteredSteps = isLive ? PIPELINE_STEP_ORDER.filter((step) => review.stepTimestamps[step]) : [];
  const currentStep = isLive ? (enteredSteps[enteredSteps.length - 1] ?? 'creditChecking') : sampleEntry!.step;
  const avatarPalette = getAvatarPalette(signUpData.email);

  // Loan History: this borrower's current (in-progress) loan plus any
  // fabricated past loans (see buildPastLoans) — a real per-loan record,
  // not a per-review-step one, since this prototype has no actual
  // "multiple loans over time" data to draw from otherwise.
  const currentLoanRow: LoanHistoryRow = {
    loanNumber: getLoanNumber(signUpData.email),
    loanType: loanType === 'business' ? 'business' : 'personal',
    purpose: financialInfo?.loanPurpose || '—',
    amount: financialInfo?.desiredLoanAmount ?? 0,
    statusLabel: isLive ? STEP_LABELS[currentStep] : STEP_LABELS[sampleEntry!.step],
    statusTone: 'info',
    dateLabel: application.submittedAt
      ? new Date(application.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : '—',
  };

  const pastLoanRows: LoanHistoryRow[] = buildPastLoans(signUpData.email).map((loan) => ({
    loanNumber: loan.loanNumber,
    loanType: loan.loanType,
    purpose: loan.purpose,
    amount: loan.amount,
    statusLabel: loan.status,
    statusTone: loan.status === 'Paid Off' ? 'success' : 'neutral',
    dateLabel: `${loan.closedYearsAgo} year${loan.closedYearsAgo > 1 ? 's' : ''} ago`,
  }));

  const loanHistoryRows: LoanHistoryRow[] = [currentLoanRow, ...pastLoanRows];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2.5} sx={{ mb: 4 }}>
        <Link
          component={RouterLink}
          href={paths.admin.accountSolicitation}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: 13.5,
            fontWeight: 600,
            color: '#667085',
            width: 'fit-content',
            '&:hover': { color: '#1C2A6E' },
          }}
        >
          <Iconify icon="eva:arrow-ios-back-fill" width={16} />
          Application List
        </Link>

        {!isLive && (
          <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={20} />} sx={{ borderRadius: '12px' }}>
            This is a sample application for demo purposes — it isn&apos;t connected to a real
            review workflow, so there&apos;s nothing to approve or submit here.
          </Alert>
        )}
      </Stack>

      <Stack spacing={2.5}>
        <Box sx={adminCardSx}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2.25}
            sx={{ mb: 3 }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                flexShrink: 0,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: avatarPalette.bg,
                color: avatarPalette.text,
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {signUpData.firstName?.[0]?.toUpperCase() ?? '?'}
            </Box>

            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
                <Typography sx={{ fontSize: 19, fontWeight: 800, color: '#14172A' }}>
                  {signUpData.firstName}
                  {signUpData.middleName ? ` ${signUpData.middleName}` : ''} {signUpData.lastName}
                  {signUpData.extensionName ? ` ${signUpData.extensionName}` : ''}
                </Typography>
                {!isLive && SAMPLE_CHIP}
              </Stack>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.5}>
                <Stack direction="row" spacing={0.6} alignItems="center">
                  <Iconify icon="solar:letter-bold" width={14} sx={{ color: '#8891A6' }} />
                  <Typography sx={{ fontSize: 13, color: '#5A6273' }}>{signUpData.email}</Typography>
                </Stack>
                {signUpData.mobile && (
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Iconify icon="solar:phone-bold" width={14} sx={{ color: '#8891A6' }} />
                    <Typography sx={{ fontSize: 13, color: '#5A6273' }}>+63 {signUpData.mobile}</Typography>
                  </Stack>
                )}
              </Stack>
            </Stack>

            {personalInfo && (
              <ButtonBase
                onClick={() => setDetailsExpanded((prev) => !prev)}
                aria-label={detailsExpanded ? 'Collapse details' : 'Expand details'}
                sx={{
                  flexShrink: 0,
                  alignSelf: { xs: 'flex-end', sm: 'center' },
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  color: '#8891A6',
                  '&:hover': { bgcolor: '#F5F6FA', color: '#1C2A6E' },
                }}
              >
                <Iconify
                  icon="eva:chevron-down-fill"
                  width={20}
                  sx={{
                    transition: 'transform 0.15s ease',
                    transform: detailsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                />
              </ButtonBase>
            )}
          </Stack>

          {personalInfo && (
            <Collapse in={detailsExpanded}>
              <Stack spacing={2.5}>
                <Divider sx={{ borderColor: '#EEF0F5' }} />

                <Stack spacing={1.5}>
                  <SectionLabel>Personal &amp; ID information</SectionLabel>
                  <Stack direction="row" flexWrap="wrap" spacing={3.5} rowGap={2}>
                    <DetailField label="Gender" value={personalInfo.gender} />
                    <DetailField label="Civil status" value={personalInfo.civilStatus} />
                    <DetailField label="ID type" value={personalInfo.idType} />
                    <DetailField label="ID number" value={personalInfo.idNumber} />
                    <DetailField label="TIN number" value={personalInfo.tinNumber} />
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" spacing={3.5} rowGap={2}>
                    <DetailField label="Address" value={personalInfo.address} />
                    <DetailField label="Barangay" value={personalInfo.barangay} />
                    <DetailField label="City" value={personalInfo.city} />
                    <DetailField label="Province" value={personalInfo.province} />
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" spacing={3.5} rowGap={2}>
                    <DetailField label="Referral source" value={personalInfo.referralSource} />
                    {personalInfo.referralSource === 'Agent' && (
                      <DetailField label="Agent code" value={personalInfo.agentCode} />
                    )}
                  </Stack>
                </Stack>

                <Divider sx={{ borderColor: '#EEF0F5' }} />

                <Stack spacing={1.5}>
                  <SectionLabel>Uploaded documents</SectionLabel>
                  <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={2}>
                    <DocumentPreview
                      label={personalInfo.idFileBack ? 'Uploaded ID — Front' : 'Uploaded ID'}
                      src={typeof personalInfo.idFile === 'string' ? personalInfo.idFile : null}
                      placeholderIcon="solar:card-2-bold-duotone"
                    />
                    {!!personalInfo.idFileBack && (
                      <DocumentPreview
                        label="Uploaded ID — Back"
                        src={typeof personalInfo.idFileBack === 'string' ? personalInfo.idFileBack : null}
                        placeholderIcon="solar:card-2-bold-duotone"
                      />
                    )}
                    <DocumentPreview
                      label="Selfie with ID"
                      src={application.selfiePhoto}
                      placeholderIcon="solar:user-rounded-bold-duotone"
                    />
                    {financialInfo?.employmentStatus === 'Business Owner' && (
                      <BusinessDocumentPreview
                        label={financialInfo.businessType ? `${financialInfo.businessType} document` : 'Business document'}
                        src={financialInfo.businessDocument ?? null}
                      />
                    )}
                  </Stack>
                </Stack>
              </Stack>
            </Collapse>
          )}
        </Box>

        <Box sx={adminCardSx}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Loan history
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
            Every loan this borrower has applied for, current and past.
          </Typography>

          <LoanHistoryTable rows={loanHistoryRows} />
        </Box>
      </Stack>
    </Container>
  );
}
