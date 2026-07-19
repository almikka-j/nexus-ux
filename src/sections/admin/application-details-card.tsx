'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';

// ----------------------------------------------------------------------

const THUMB_SIZE = 76;

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
            width: THUMB_SIZE,
            height: THUMB_SIZE,
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
            width: THUMB_SIZE,
            height: THUMB_SIZE,
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
          sx={{ width: THUMB_SIZE, height: THUMB_SIZE, flexShrink: 0 }}
          slotProps={{ img: { borderRadius: '10px' } }}
        />
      ) : (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
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
    <Stack spacing={0.4} sx={{ minWidth: 120 }}>
      <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
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

export function ApplicationDetailsCard({ collapsible = false }: { collapsible?: boolean }) {
  const { signUpData, application } = useRegistration();
  const { review } = useAdmin();
  // Only relevant when collapsible — defaults collapsed to save vertical
  // space on pages (like Call Report) that already show a lot of other
  // structured content below this card. Initial Credit Checking doesn't
  // pass `collapsible`, so it never mounts this state and stays always
  // expanded, since the officer needs the full detail there before deciding.
  const [expanded, setExpanded] = useState(false);

  if (!signUpData) return null;

  const creditCheckingNotes = review.creditChecking.notes;

  const { loanType, financialInfo, personalInfo } = application;

  // application.loanType stays null for every new sign-up (the primary flow
  // never collects a dedicated Loan Type step — see
  // docs/BORROWER_SIGNUP_FLOW.md's "Loan Type removed from the primary flow")
  // — so fall back to the Business Owner income-source signal instead of
  // always reading as "Personal Loan" regardless of what the borrower
  // actually told us.
  const isBusinessLoan =
    loanType === 'business' || financialInfo?.employmentStatus === 'Business Owner';
  const loanTypeLabel = isBusinessLoan ? 'Business Loan' : 'Personal Loan';
  const fullName = `${signUpData.prefix ? `${signUpData.prefix} ` : ''}${signUpData.firstName}${signUpData.middleName ? ` ${signUpData.middleName}` : ''} ${signUpData.lastName}${signUpData.extensionName ? ` ${signUpData.extensionName}` : ''}`;
  const applicationDate = application.submittedAt
    ? new Date(application.submittedAt).toLocaleDateString()
    : '—';
  const desiredAmount = financialInfo
    ? `₱${Number(financialInfo.desiredLoanAmount).toLocaleString()}`
    : '—';

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
      }}
    >
      {collapsible ? (
        <ButtonBase
          onClick={() => setExpanded((prev) => !prev)}
          sx={{
            width: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left',
            borderRadius: '10px',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 1 }}>
              Application details
            </Typography>
            <Stack direction="row" flexWrap="wrap" spacing={3} rowGap={1}>
              <DetailField label="Client name" value={fullName} />
              <DetailField label="Loan type" value={loanTypeLabel} />
              <DetailField label="Application date" value={applicationDate} />
              <DetailField label="Desired loan amount" value={desiredAmount} />
            </Stack>
          </Box>
          <Iconify
            icon={expanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
            width={20}
            sx={{ color: '#8891A6', flexShrink: 0, ml: 2 }}
          />
        </ButtonBase>
      ) : (
        <>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
            Application details
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 3 }}>
            Everything the borrower submitted, for review before deciding.
          </Typography>
        </>
      )}

      <Collapse in={!collapsible || expanded}>
      <Stack spacing={2.5} sx={{ pt: collapsible ? 3 : 0 }}>
        <Stack spacing={1.5}>
          <SectionLabel>Applicant</SectionLabel>
          <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
            <DetailField label="Full name" value={fullName} />
            <DetailField label="Email address" value={signUpData.email} />
            <DetailField label="Mobile number" value={signUpData.mobile ? `+63 ${signUpData.mobile}` : ''} />
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: '#EEF0F5' }} />

        <Stack spacing={1.5}>
          <SectionLabel>Loan request</SectionLabel>
          <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
            <DetailField label="Loan type" value={loanTypeLabel} />
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
          {financialInfo?.employmentStatus === 'Business Owner' && (
            <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
              <DetailField label="Business type" value={financialInfo.businessType} />
            </Stack>
          )}
        </Stack>

        {personalInfo && (
          <>
            <Divider sx={{ borderColor: '#EEF0F5' }} />

            <Stack spacing={1.5}>
              <SectionLabel>Personal &amp; ID information</SectionLabel>
              <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
                <DetailField label="Birthday" value={personalInfo.birthday} />
                <DetailField label="Gender" value={personalInfo.gender} />
                <DetailField label="Civil status" value={personalInfo.civilStatus} />
                <DetailField label="ID type" value={personalInfo.idType} />
                <DetailField label="ID number" value={personalInfo.idNumber} />
                <DetailField label="TIN number" value={personalInfo.tinNumber} />
              </Stack>
              <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
                <DetailField label="Address" value={personalInfo.address} />
                <DetailField label="Barangay" value={personalInfo.barangay} />
                <DetailField label="City" value={personalInfo.city} />
                <DetailField label="Province" value={personalInfo.province} />
                <DetailField label="Zip code" value={personalInfo.zipCode} />
              </Stack>
              <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
                <DetailField label="Referral source" value={personalInfo.referralSource} />
              </Stack>

              {personalInfo.civilStatus === 'Married' && (
                <>
                  <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
                    <DetailField
                      label="Spouse's name"
                      value={`${personalInfo.spouseFirstName ?? ''}${personalInfo.spouseMiddleName ? ` ${personalInfo.spouseMiddleName}` : ''} ${personalInfo.spouseLastName ?? ''}${personalInfo.spouseExtensionName ? ` ${personalInfo.spouseExtensionName}` : ''}`.trim()}
                    />
                    <DetailField label="Spouse's birthday" value={personalInfo.spouseBirthday} />
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
                    <DetailField label="Spouse's address" value={personalInfo.spouseAddress} />
                    <DetailField label="Spouse's barangay" value={personalInfo.spouseBarangay} />
                    <DetailField label="Spouse's city" value={personalInfo.spouseCity} />
                    <DetailField label="Spouse's province" value={personalInfo.spouseProvince} />
                    <DetailField label="Spouse's zip code" value={personalInfo.spouseZipCode} />
                  </Stack>
                </>
              )}
            </Stack>

            <Divider sx={{ borderColor: '#EEF0F5' }} />

            <Stack spacing={1.5}>
              <SectionLabel>Uploaded documents</SectionLabel>
              <Stack direction="row" flexWrap="wrap" spacing={2.5} rowGap={1.75}>
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
          </>
        )}

        {!collapsible && creditCheckingNotes && (
          <>
            <Divider sx={{ borderColor: '#EEF0F5' }} />

            <Stack spacing={1.5}>
              <SectionLabel>Notes from initial credit checking</SectionLabel>
              <Typography sx={{ fontSize: 14, color: '#3B4256', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {creditCheckingNotes}
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
      </Collapse>
    </Box>
  );
}
