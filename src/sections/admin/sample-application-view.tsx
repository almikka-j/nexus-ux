'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { formatAging } from 'src/utils/format-aging';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { SAMPLE_APPLICATIONS } from './sample-applications';

import type { ReviewStep } from 'src/auth/admin-context';

// ----------------------------------------------------------------------

const STEP_LABELS: Record<ReviewStep, string> = {
  creditChecking: 'Initial Credit Checking',
  reconsideration: 'Reconsideration',
  callReport: 'Call Report',
  requirementChecklist: 'Requirement Checklist',
};

function DocumentPreview({
  label,
  src,
  aspectRatio,
}: {
  label: string;
  src: string | null;
  aspectRatio: string;
}) {
  return (
    <Stack spacing={1} sx={{ flex: 1, minWidth: 200, maxWidth: 280 }}>
      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{label}</Typography>
      {src ? (
        <Box
          sx={{
            width: 1,
            aspectRatio,
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
          spacing={0.5}
          sx={{
            width: 1,
            aspectRatio,
            borderRadius: '10px',
            border: '1.5px dashed #E1E4ED',
            bgcolor: '#FAFBFD',
          }}
        >
          <Iconify icon="solar:gallery-remove-bold-duotone" width={26} sx={{ color: '#C7CCDA' }} />
          <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Not provided</Typography>
        </Stack>
      )}
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

type SampleApplicationViewProps = {
  email: string;
};

export function SampleApplicationView({ email }: SampleApplicationViewProps) {
  const entry = SAMPLE_APPLICATIONS.find((item) => item.registration.signUpData?.email === email);

  if (!entry) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography sx={{ fontSize: 16, color: '#8891A6' }}>Sample application not found.</Typography>
      </Container>
    );
  }

  const { signUpData, application } = entry.registration;
  const { loanType, financialInfo, personalInfo } = application;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2.5} sx={{ mb: 4 }}>
        <Link
          component={RouterLink}
          href={paths.admin.applications}
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

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: '16px',
            bgcolor: 'common.white',
            border: '1px solid #EBEDF3',
            boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
          }}
        >
          <Stack direction="row" spacing={1.75} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#EEF1FE',
              }}
            >
              <Iconify icon="solar:document-text-bold-duotone" width={20} sx={{ color: '#1C2A6E' }} />
            </Box>
            <Stack spacing={0.25}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#14172A' }}>
                  {signUpData!.firstName} {signUpData!.lastName}
                </Typography>
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
              </Stack>
              <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
                Loan No. {getLoanNumber(signUpData!.email)} ·{' '}
                {loanType === 'business' ? 'Business Loan' : 'Personal Loan'}
                {application.assignedOfficer && ` · Officer: ${application.assignedOfficer}`}
              </Typography>
            </Stack>
          </Stack>

          <Box
            sx={{
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#3448B0',
              bgcolor: '#EEF1FE',
              borderRadius: '999px',
              px: 1.75,
              py: 0.75,
            }}
          >
            {STEP_LABELS[entry.step]}
          </Box>
        </Stack>

        {application.submittedAt && (
          <Typography sx={{ fontSize: 12.5, color: '#667085', px: 0.5 }}>
            In review for <strong>{formatAging(application.submittedAt)}</strong>
          </Typography>
        )}

        <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={20} />} sx={{ borderRadius: '12px' }}>
          This is a sample application for demo purposes — it isn&apos;t connected to a real
          review workflow, so there&apos;s nothing to approve or submit here.
        </Alert>
      </Stack>

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
          Application details
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 3 }}>
          Everything the borrower submitted, for reference.
        </Typography>

        <Stack spacing={2.5}>
          <Stack spacing={1.5}>
            <SectionLabel>Applicant</SectionLabel>
            <Stack direction="row" flexWrap="wrap" spacing={3.5} rowGap={2}>
              <DetailField
                label="Full name"
                value={`${signUpData!.firstName}${signUpData!.middleName ? ` ${signUpData!.middleName}` : ''} ${signUpData!.lastName}${signUpData!.extensionName ? ` ${signUpData!.extensionName}` : ''}`}
              />
              <DetailField label="Email address" value={signUpData!.email} />
              <DetailField label="Mobile number" value={signUpData!.mobile ? `+63 ${signUpData!.mobile}` : ''} />
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: '#EEF0F5' }} />

          <Stack spacing={1.5}>
            <SectionLabel>Loan request</SectionLabel>
            <Stack direction="row" flexWrap="wrap" spacing={3.5} rowGap={2}>
              <DetailField
                label="Loan type"
                value={loanType === 'business' ? 'Business Loan' : loanType === 'personal' ? 'Personal Loan' : ''}
              />
              {financialInfo && (
                <>
                  <DetailField
                    label="Desired loan amount"
                    value={`₱${Number(financialInfo.desiredLoanAmount).toLocaleString()}`}
                  />
                  <DetailField label="Loan term" value={`${financialInfo.loanTermMonths} months`} />
                  <DetailField label="Purpose of loan" value={financialInfo.loanPurpose} />
                  <DetailField label="Employment status" value={financialInfo.employmentStatus} />
                  <DetailField
                    label="Monthly income"
                    value={`₱${Number(financialInfo.monthlyIncome).toLocaleString()}`}
                  />
                </>
              )}
            </Stack>
          </Stack>

          {personalInfo && (
            <>
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
                </Stack>
              </Stack>

              <Divider sx={{ borderColor: '#EEF0F5' }} />

              <Stack spacing={1.5}>
                <SectionLabel>Uploaded documents</SectionLabel>
                <Stack direction="row" flexWrap="wrap" spacing={3}>
                  <DocumentPreview
                    label="Uploaded ID"
                    src={typeof personalInfo.idFile === 'string' ? personalInfo.idFile : null}
                    aspectRatio="1.586 / 1"
                  />
                  <DocumentPreview label="Selfie with ID" src={application.selfiePhoto} aspectRatio="3 / 4" />
                </Stack>
              </Stack>
            </>
          )}
        </Stack>
      </Box>
    </Container>
  );
}
