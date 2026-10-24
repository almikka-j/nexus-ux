'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { StatusBadge, FieldTable, FieldTableRow, adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { getLoanNumber } from 'src/utils/get-loan-number';

import { OfficerNotesDialog } from './officer-notes-history';

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

// Compact label-over-value chip used in the collapsible summary header —
// a bordered strip of these replaces the old fixed 6-column grid so long
// free-text values (e.g. Purpose) don't fight fixed column widths and the
// strip wraps cleanly at any width.
function FactChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack
      spacing={0.35}
      sx={{
        px: 1.75,
        py: 1,
        minWidth: 0,
        flex: '1 1 128px',
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#9AA2B4',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={typeof value === 'string' ? value : undefined}
      >
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

// Icon-headed sub-card used to group each section of the full (non-collapsible)
// Application details card, so a reviewer scanning a long sidebar can jump
// between "Applicant" / "Loan request" / "Personal & ID" etc. by shape and
// icon instead of reading through one continuous label/value scroll.
function DetailSection({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ px: 2, py: 1.25, borderRadius: '10px', bgcolor: '#EEF1FE' }}
      >
        <Iconify icon={icon} width={16} sx={{ color: '#1C2A6E' }} />
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#1C2A6E',
          }}
        >
          {title}
        </Typography>
      </Stack>
      {children}
    </Stack>
  );
}

/**
 * The borrower's full submission (Applicant, Loan request, Personal & ID
 * information, Spouse information, Uploaded documents) — shared between
 * ApplicationDetailsCard's inline expansion and the standalone Full
 * Application page reached via router navigation.
 */
export function ApplicationFullDetails() {
  const { signUpData, application } = useRegistration();

  if (!signUpData) return null;

  const { financialInfo, personalInfo, loanType } = application;
  const isBusinessLoan =
    loanType === 'business' || financialInfo?.employmentStatus === 'Business Owner';
  const loanTypeLabel = isBusinessLoan ? 'Business Loan' : 'Personal Loan';
  const fullName = `${signUpData.prefix ? `${signUpData.prefix} ` : ''}${signUpData.firstName}${signUpData.middleName ? ` ${signUpData.middleName}` : ''} ${signUpData.lastName}${signUpData.extensionName ? ` ${signUpData.extensionName}` : ''}`;
  const desiredAmount = financialInfo
    ? `₱${Number(financialInfo.desiredLoanAmount).toLocaleString()}`
    : '—';

  // FieldTableRow takes up to 2 pairs per row (label-left/value-right,
  // matching Initial Credit Checking Result's own Memorandum table) — a
  // trailing odd field renders alone on its own full-width row.
  const rowsOf2 = (pairs: [label: string, value: React.ReactNode][]) => {
    const rows: [label: string, value: React.ReactNode][][] = [];
    for (let i = 0; i < pairs.length; i += 2) rows.push(pairs.slice(i, i + 2));
    return rows;
  };

  const applicantPairs: [string, React.ReactNode][] = [
    ['Full name', fullName],
    ['Email address', signUpData.email],
    ['Mobile number', signUpData.mobile ? `+63 ${signUpData.mobile}` : '—'],
  ];

  const loanRequestPairs: [string, React.ReactNode][] = [['Loan type', loanTypeLabel]];
  if (financialInfo) {
    loanRequestPairs.push(
      ['Desired loan amount', desiredAmount],
      ['Loan term', `${financialInfo.loanTermMonths} months`],
      ['Purpose of loan', financialInfo.loanPurpose],
      ['Employment status', financialInfo.employmentStatus],
      ['Gross Monthly Income', `₱${Number(financialInfo.monthlyIncome).toLocaleString()}`],
      ['Has collateral', financialInfo.hasCollateral === 'yes' ? 'Yes' : 'No']
    );
    if (financialInfo.employmentStatus === 'Business Owner') {
      loanRequestPairs.push(['Business type', financialInfo.businessType]);
    }
  }

  const personalPairsA: [string, React.ReactNode][] = personalInfo
    ? [
        ['Birthday', personalInfo.birthday],
        ['Gender', personalInfo.gender],
        ['Civil status', personalInfo.civilStatus],
        ['ID type', personalInfo.idType],
        ['ID number', personalInfo.idNumber],
      ]
    : [];
  const personalPairsB: [string, React.ReactNode][] = personalInfo
    ? [
        ['Address', personalInfo.address],
        ['Barangay', personalInfo.barangay],
        ['City', personalInfo.city],
        ['Province', personalInfo.province],
        ['Zip code', personalInfo.zipCode],
        ['TIN number', personalInfo.tinNumber],
        ['Referral source', personalInfo.referralSource],
        ...(personalInfo.referralSource === 'Agent'
          ? ([['Agent code', personalInfo.agentCode]] as [string, React.ReactNode][])
          : []),
      ]
    : [];

  const spousePairs: [string, React.ReactNode][] = personalInfo
    ? [
        [
          'Name',
          `${personalInfo.spouseFirstName ?? ''}${personalInfo.spouseMiddleName ? ` ${personalInfo.spouseMiddleName}` : ''} ${personalInfo.spouseLastName ?? ''}${personalInfo.spouseExtensionName ? ` ${personalInfo.spouseExtensionName}` : ''}`.trim(),
        ],
        ['Birthday', personalInfo.spouseBirthday],
        ['Address', personalInfo.spouseAddress],
        ['Barangay', personalInfo.spouseBarangay],
        ['City', personalInfo.spouseCity],
        ['Province', personalInfo.spouseProvince],
        ['Zip code', personalInfo.spouseZipCode],
      ]
    : [];

  return (
    <Stack spacing={2}>
      <DetailSection icon="solar:user-bold-duotone" title="Applicant">
        <FieldTable>
          {rowsOf2(applicantPairs).map((pairs, index) => (
            <FieldTableRow key={index} pairs={pairs} />
          ))}
        </FieldTable>
      </DetailSection>

      <DetailSection icon="solar:document-text-bold-duotone" title="Loan request">
        <FieldTable>
          {rowsOf2(loanRequestPairs).map((pairs, index) => (
            <FieldTableRow key={index} pairs={pairs} />
          ))}
        </FieldTable>
      </DetailSection>

      {personalInfo && (
        <>
          <DetailSection icon="solar:user-id-bold-duotone" title="Personal & ID information">
            <FieldTable>
              {rowsOf2(personalPairsA).map((pairs, index) => (
                <FieldTableRow key={`a-${index}`} pairs={pairs} />
              ))}
              {rowsOf2(personalPairsB).map((pairs, index) => (
                <FieldTableRow key={`b-${index}`} pairs={pairs} />
              ))}
            </FieldTable>
          </DetailSection>

          {personalInfo.civilStatus === 'Married' && (
            <DetailSection icon="solar:heart-bold-duotone" title="Spouse information">
              <FieldTable>
                {rowsOf2(spousePairs).map((pairs, index) => (
                  <FieldTableRow key={index} pairs={pairs} />
                ))}
              </FieldTable>
            </DetailSection>
          )}

          <DetailSection icon="solar:gallery-bold-duotone" title="Uploaded documents">
            <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
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
          </DetailSection>
        </>
      )}
    </Stack>
  );
}

export function ApplicationDetailsCard({
  collapsible = false,
  showCreditCheckingResultAction = false,
  showCallReportAction = false,
  officerNotesProcess,
}: {
  collapsible?: boolean;
  showCreditCheckingResultAction?: boolean;
  showCallReportAction?: boolean;
  officerNotesProcess?: string;
}) {
  const { signUpData, application } = useRegistration();
  const { review } = useAdmin();
  // "View full application", "Initial credit checking result", and "View
  // call report" each open their own dedicated page in a new tab (so the
  // reviewer doesn't lose their place on this page) rather than expanding
  // inline or opening a Dialog — see
  // paths.admin.fullApplication/callReportResult/creditCheckingResult.
  const [notesOpen, setNotesOpen] = useState(false);
  const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);

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
  const applicationNumber = getLoanNumber(signUpData.email);
  const hasCreditCheckingAction = showCreditCheckingResultAction;
  const overflowOnly = showCreditCheckingResultAction && showCallReportAction;
  const handleViewCreditChecking = () => {
    setActionsAnchor(null);
    window.open(paths.admin.creditCheckingResult(encodeURIComponent(signUpData.email)), '_blank', 'noopener,noreferrer');
  };

  if (collapsible) {
    return (
      <>
        <Box sx={{ ...adminCardSx, p: { xs: 2.5, md: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '14px',
                bgcolor: '#EEF1FE',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify
                icon="solar:clipboard-list-bold-duotone"
                width={25}
                sx={{ color: '#3448B0' }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 16.5, fontWeight: 700, color: '#14172A' }}>{fullName}</Typography>
              <Typography sx={{ fontSize: 13.5, color: '#8891A6', wordBreak: 'break-word', mt: 0.25 }}>
                {signUpData.email}{signUpData.mobile ? ` · +63 ${signUpData.mobile}` : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
              {application.assignedOfficer && (
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{ flexShrink: 0, px: 1.25, py: 0.75, borderRadius: '10px', bgcolor: '#F5F6FA' }}
                >
                  <Iconify icon="solar:user-id-bold-duotone" width={15} sx={{ color: '#8891A6' }} />
                  <Typography sx={{ fontSize: 12.5, color: '#667085', whiteSpace: 'nowrap' }}>
                    Officer: <strong>{application.assignedOfficer}</strong>
                  </Typography>
                </Stack>
              )}
              <StatusBadge tone="info" label={`App No. ${applicationNumber}`} />
            </Stack>
          </Stack>

          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              mt: 2.5,
              border: '1px solid #EEF0F5',
              borderRadius: '12px',
              bgcolor: '#FAFBFD',
              '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
            }}
          >
            <FactChip label="Loan type" value={loanTypeLabel} />
            <FactChip label="Amount" value={desiredAmount} />
            <FactChip label="Term" value={financialInfo ? `${financialInfo.loanTermMonths} months` : '—'} />
            <FactChip label="Purpose" value={financialInfo?.loanPurpose} />
            <FactChip label="Gross monthly income" value={financialInfo ? `₱${Number(financialInfo.monthlyIncome).toLocaleString()}` : '—'} />
            <FactChip label="Date filed" value={applicationDate} />
          </Stack>

          <Divider sx={{ my: 2.5, borderColor: '#EEF0F5' }} />

          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: 1, minWidth: 0 }}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:document-text-bold-duotone" width={18} />}
              onClick={() => window.open(paths.admin.fullApplication(encodeURIComponent(signUpData.email)), '_blank', 'noopener,noreferrer')}
              sx={{
                color: '#1C2A6E',
                borderColor: '#C7CEEA',
                borderRadius: '10px',
                px: 2.25,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
              }}
            >
              View full application
            </Button>
            {hasCreditCheckingAction && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:clipboard-check-bold-duotone" width={18} />}
                onClick={handleViewCreditChecking}
                sx={{ display: { xs: 'none', sm: overflowOnly ? 'inline-flex' : 'none', md: 'inline-flex' }, color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '10px', px: { sm: 1.5, md: 2 }, whiteSpace: 'nowrap', fontSize: 13, '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' } }}
              >
                Initial credit checking result
              </Button>
            )}
            {showCallReportAction && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:phone-calling-rounded-bold-duotone" width={18} />}
                onClick={() => window.open(paths.admin.callReportResult(encodeURIComponent(signUpData.email)), '_blank', 'noopener,noreferrer')}
                sx={{ display: { xs: 'none', md: overflowOnly ? 'none' : 'inline-flex', lg: 'inline-flex' }, color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '10px', px: { md: 1.5, lg: 2 }, whiteSpace: 'nowrap', fontSize: 13, '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' } }}
              >
                View call report
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:notes-bold-duotone" width={18} />}
              onClick={() => setNotesOpen(true)}
              sx={{ display: { xs: 'none', md: overflowOnly ? 'none' : 'inline-flex', lg: 'inline-flex' }, color: '#1C2A6E', borderColor: '#C7CEEA', borderRadius: '10px', px: { md: 1.5, lg: 2 }, whiteSpace: 'nowrap', fontSize: 13, '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' } }}
            >
              View all officer notes
            </Button>
            {(hasCreditCheckingAction || showCallReportAction || overflowOnly) && (
              <IconButton
                onClick={(event) => setActionsAnchor(event.currentTarget)}
                aria-label="More application actions"
                aria-controls={actionsAnchor ? 'application-actions-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={actionsAnchor ? 'true' : undefined}
                sx={{
                  width: 40,
                  height: 40,
                  color: '#1C2A6E',
                  border: '1px solid #C7CEEA',
                  borderRadius: '10px',
                  display: { xs: 'inline-flex', md: overflowOnly ? 'inline-flex' : 'none', lg: 'none' },
                  flexShrink: 0,
                  '&:hover': { borderColor: '#1C2A6E', bgcolor: 'rgba(28,42,110,0.04)' },
                }}
              >
                <Iconify icon="solar:menu-dots-bold" width={20} />
              </IconButton>
            )}
          </Stack>

          <Menu
            id="application-actions-menu"
            anchorEl={actionsAnchor}
            open={Boolean(actionsAnchor)}
            onClose={() => setActionsAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { mt: 0.75, minWidth: 250, borderRadius: '10px' } } }}
          >
            {hasCreditCheckingAction && (
              <MenuItem
                onClick={handleViewCreditChecking}
                sx={{ gap: 1.25, display: { xs: 'flex', sm: overflowOnly ? 'none' : 'flex', md: 'none' } }}
              >
                <Iconify icon="solar:clipboard-check-bold-duotone" width={18} sx={{ color: '#1C2A6E' }} />
                Initial credit checking result
              </MenuItem>
            )}
            {showCallReportAction && (
              <MenuItem
                onClick={() => { setActionsAnchor(null); window.open(paths.admin.callReportResult(encodeURIComponent(signUpData.email)), '_blank', 'noopener,noreferrer'); }}
                sx={{ gap: 1.25, display: { xs: 'flex', md: overflowOnly ? 'flex' : 'none', lg: 'none' } }}
              >
                <Iconify icon="solar:phone-calling-rounded-bold-duotone" width={18} sx={{ color: '#1C2A6E' }} />
                View call report
              </MenuItem>
            )}
            <MenuItem
              onClick={() => { setActionsAnchor(null); setNotesOpen(true); }}
              sx={{ gap: 1.25, display: { xs: 'flex', md: overflowOnly ? 'flex' : 'none', lg: 'none' } }}
            >
              <Iconify icon="solar:notes-bold-duotone" width={18} sx={{ color: '#1C2A6E' }} />
              View all officer notes
            </MenuItem>
          </Menu>
        </Box>

        <OfficerNotesDialog
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          notes={creditCheckingNotes}
          process={officerNotesProcess}
        />
      </>
    );
  }

  return (
    <Box sx={adminCardSx}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            bgcolor: '#EEF1FE',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Iconify icon="solar:clipboard-list-bold-duotone" width={20} sx={{ color: '#3448B0' }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
            Application details
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
            Everything the borrower submitted, for review before deciding.
          </Typography>
        </Box>
      </Stack>
      <ApplicationFullDetails />
    </Box>
  );
}
