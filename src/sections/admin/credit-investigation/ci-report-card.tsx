// src/sections/admin/credit-investigation/ci-report-card.tsx
'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAdmin } from 'src/auth/admin-context';
import { useRegistration } from 'src/auth/registration-context';
import type { FinancialInfo } from 'src/auth/registration-context';
import type {
  CiReport,
  CiChildEntry,
  CiTradeEntry,
  CiIncomeSourceEntry,
  CiBankAccountEntry,
  CiComakerEntry,
} from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { RichTextField } from 'src/components/rich-text-field';
import { CollapsibleSection } from 'src/components/collapsible-section/collapsible-section';

import { buildTranscriptAutoFill } from '../credit-investigation-transcript';
import { RadioRow } from '../call-report/call-report-types';

import {
  CommercialReportSections,
  COMMERCIAL_SECTION_NAV_ITEMS,
  type CommercialSectionKey,
} from './ci-report-commercial-sections';

// ----------------------------------------------------------------------
// The ~15-section CI Report. Replaces the old 5-section version
// (Site Visit Details, Borrower/Residence Verification, Neighborhood
// Check, Findings & Assessment, Recommendation) with the fuller
// structure below. See docs/superpowers/specs/2026-08-06-ci-report-
// redesign-design.md for the full rationale.
//
// Three kinds of fields:
// - Read-only, pre-filled from application/Call Report data (header
//   block, Employment Status, Loan Purpose default, Comaker) — never
//   edited here.
// - Rich-text narrative fields (Subject As Of, Spouse, Assets, Negative
//   Record remarks, Health and Habits, Comments) via RichTextField.
// - Structured fields and array-entry sections, editable directly.
//
// Uploading a transcript auto-fills only the fields a transcript could
// plausibly attest to (see credit-investigation-transcript.ts) — it
// never touches the header block, Loan Purpose, or Comaker.
// ----------------------------------------------------------------------

export const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } };

// Same look as fieldSx, but forces a white fill on a read-only field so
// it renders identically to every editable field around it instead of
// MUI's default readOnly/outlined styling, which otherwise reads as
// grayed-out/disabled even though the field isn't actually disabled.
const readOnlyFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' },
};

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#5A6273', letterSpacing: '0.02em' }}>
      {children}
    </Typography>
  );
}

// Slim sticky jump-nav for the CI Report's section groups (both report
// types) — same scroll-jump + active-highlight mechanics as
// RequirementChecklistSectionNav (requirement-checklist-section-nav.tsx),
// but without that component's document-count/progress-bar styling,
// since there's nothing to count here — just form fields. Lives outside
// ConsumerReportSections/CommercialReportSections (sibling to them, both
// inside CiReportCard), mirroring how Requirement Checklist's own nav
// sits outside the cards it jumps between rather than nested inside one
// of them. Shared by both report types — only the `items`/`activeKey`
// passed in differ.
function CiSectionNav<K extends string>({
  items,
  activeKey,
  onJump,
}: {
  items: { key: K; label: string }[];
  activeKey: string | null;
  onJump: (key: K) => void;
}) {
  return (
    <Box
      sx={{
        borderRadius: '14px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: '0 1px 2px rgba(20,23,42,0.04)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2, pt: 1.75, pb: 1 }}>
        <Typography
          sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8891A6' }}
        >
          Sections
        </Typography>
      </Box>
      <Stack sx={{ px: 1, pb: 1 }} spacing={0.25}>
        {items.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <ButtonBase
              key={item.key}
              onClick={() => onJump(item.key)}
              sx={{
                position: 'relative',
                justifyContent: 'flex-start',
                textAlign: 'left',
                pl: 1.75,
                pr: 1.25,
                py: 0.85,
                borderRadius: '9px',
                bgcolor: isActive ? '#F5F7FF' : 'transparent',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: isActive ? '#F5F7FF' : '#FAFBFD' },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  bottom: 6,
                  width: 3,
                  borderRadius: 999,
                  bgcolor: isActive ? '#1C2A6E' : 'transparent',
                  transition: 'background-color 0.15s ease',
                },
              }}
            >
              <Typography
                noWrap
                sx={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#1C2A6E' : '#14172A',
                }}
              >
                {item.label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Stack>
    </Box>
  );
}

type ConsumerSectionKey =
  | 'family'
  | 'residenceNeighborhood'
  | 'employment'
  | 'tradeChecking'
  | 'financialInformation'
  | 'loanPurpose'
  | 'comaker'
  | 'investigationFindings';

const CONSUMER_SECTION_NAV_ITEMS: { key: ConsumerSectionKey; label: string }[] = [
  { key: 'family', label: 'Family' },
  { key: 'residenceNeighborhood', label: 'Residence/Neighborhood' },
  { key: 'employment', label: 'Employment' },
  { key: 'tradeChecking', label: 'Trade Checking' },
  { key: 'financialInformation', label: 'Financial Information' },
  { key: 'loanPurpose', label: 'Loan Purpose' },
  { key: 'comaker', label: 'Comaker' },
  { key: 'investigationFindings', label: 'Investigation Findings / Observations' },
];

// Tracks which registered section is closest to the top of the viewport
// — same IntersectionObserver mechanics as
// requirement-checklist-section-nav.tsx's own useActiveSection, but that
// one's effect only re-runs when `keys.length` changes (a constant for a
// given report type), which is fine there since its 3 cards are always
// mounted from page load. Here, every section box mounts for the first
// time only once the officer picks a Report Type (report.type goes from
// '' to 'commercial'/'consumer'), so the observer must be re-attached
// when that happens too — otherwise it permanently observes zero
// elements, set up once while report.type is still '' and the section
// boxes don't exist yet, and the nav never highlights anything no matter
// what the officer clicks. Adding `remountKey` (the report type) as an
// extra effect dependency is the one change needed to re-attach once the
// real elements exist.
function useCiActiveSection(
  sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>,
  keys: string[],
  remountKey: string
) {
  const [activeKey, setActiveKey] = useState<string | null>(keys[0] ?? null);

  useEffect(() => {
    const entries = keys
      .map((key) => [key, sectionRefs.current.get(key)] as const)
      .filter((entry): entry is [string, HTMLDivElement] => !!entry[1]);
    if (entries.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (observedEntries) => {
        const visible = observedEntries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const key = entries.find(([, el]) => el === visible[0].target)?.[0];
          if (key) setActiveKey(key);
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );

    entries.forEach(([, el]) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.length, remountKey]);

  return activeKey;
}

// FactChip / FactChipRow — this app's existing label-over-value
// quick-read summary strip (see docs/225-admin-design-system.md §6 and
// the live showcase on /admin/design-system). Not a shared component
// yet — reimplemented locally per screen (application-details-card.tsx,
// appraisal-report-preview.tsx, cash-flow-statement-card.tsx, etc.), same
// convention followed here rather than inventing a new vertical
// "LABEL : value" layout. Used for the 12 read-only Commercial info
// fields below; the 6 fillable fields that follow stay in their own
// label-above-input layout, since FactChip has no input variant.
//
// Laid out as a CSS grid (3 columns on sm+, 1 on xs) rather than a
// flex-wrap row — flex-wrap has no way to know which cells start a new
// visual line, so a per-cell divider either doubles up or is missing
// depending on wrap position. Each cell draws only its own right+bottom
// edge (inset box-shadow, not border, so it doesn't consume grid track
// space); two adjacent cells never both draw the same shared edge, so no
// line is ever doubled. `wide` (gridColumn: '1 / -1') gives a chip the
// entire row to itself instead of sharing a row with 1-2 others — used
// for every chip whose neighbours don't divide evenly into groups of 3
// (Company Name, Registration Date, Negative Records), not just long
// values (Business Address) — an incomplete row (e.g. 1 or 2 filled
// cells out of 3 grid columns) left a stray vertical divider floating in
// empty space, since the divider belongs to the cell, not to the row.
// The call site below is ordered so every non-`wide` run is exactly a
// multiple of 3; changing the field list must preserve that, or mark the
// new odd-one-out `wide` too.
function FactChip({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <Box
      sx={{
        gridColumn: wide ? '1 / -1' : 'span 1',
        minWidth: 0,
        px: 1.75,
        py: 1,
        bgcolor: 'common.white',
        // Only right + bottom edges draw a divider (inset box-shadow, so
        // it doesn't consume grid track space like a border would) — the
        // container's own top+left border supplies the other two edges
        // of the overall strip. Every internal line is then drawn once,
        // by exactly one cell, instead of two adjacent cells each
        // outlining their shared edge and doubling it up.
        boxShadow: 'inset -1px -1px 0 0 #EEF0F5',
      }}
    >
      <Typography
        sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9AA2B4' }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#14172A',
          mt: 0.25,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function FactChipRow({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        borderRadius: '12px',
        border: '1px solid #EEF0F5',
        bgcolor: 'common.white',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

// Read-only "LABEL : value" row — label left, colon, value right, one
// per line. Used for Line of Business, the one read-only row interleaved
// among the fillable fields below (FactChip isn't used here since this
// section is a vertical label-above-input list, not a wrapping strip).
function InfoChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 0.4 }}>
      <Typography
        sx={{ width: 190, flexShrink: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: '#14172A' }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>:</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}

// Same row shape, but for a fillable field below the read-only list —
// label gets a red required asterisk when `required`, value column holds
// an actual input instead of static text.
function InfoChipFieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 0.4 }} alignItems="flex-start">
      <Typography
        sx={{ width: 190, flexShrink: 0, pt: 1, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: '#14172A' }}
      >
        {label}
        {required && <Box component="span" sx={{ color: '#F04438' }}> *</Box>}
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#5A6273', pt: 1 }}>:</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}

// Deterministic sample data for the read-only info chips — this app has
// no real company-profile backend, same "fabricated but consistent"
// convention as every other AI/derived value (credit-investigation-
// transcript.ts, bureau-reports-card.tsx). Not tied to the applicant's
// own data, since nothing in the data model captures most of these
// fields (Company Name, Contact No., Email, Website, TIN, Registration
// Number/Date) at the business-application level.
const COMMERCIAL_SAMPLE_INFO = {
  companyName: 'GTWO LOGISTIC SERVICES',
  businessAddress: '24 25 Santol St Town and Country Exec Vill Mayamot City of Antipolo Rizal',
  contactNo: '09090013618',
  emailAddress: 'gtwologistics@gmail.com',
  website: '',
  tinNo: '738016023000',
  loanPurpose: 'For additional working capital',
  organizationType: 'Cooperative',
  registrationNumber: '5916457',
  registrationDate: 'Mar 08, 2024',
};

function CommercialInfoChips({
  report,
  financialInfo,
  loanType,
  applicantEmail,
  onChange,
}: {
  report: CiReport;
  financialInfo: FinancialInfo | null;
  loanType: 'personal' | 'business' | null;
  applicantEmail: string;
  onChange: (data: Partial<CiReport>) => void;
}) {
  const loanTypeLabel =
    loanType === 'business' ? 'Business Loan' : loanType === 'personal' ? 'Personal Loan' : 'Business Loan';
  const amountAppliedLabel = financialInfo?.desiredLoanAmount
    ? `Php ${Number(financialInfo.desiredLoanAmount).toLocaleString()}.00`
    : 'Php 7,000,000.00';
  const loanPurposeLabel = financialInfo?.loanPurpose || COMMERCIAL_SAMPLE_INFO.loanPurpose;

  return (
    <Box sx={{ mb: 2.5 }}>
      <FactChipRow>
        <FactChip label="Company Name" value={COMMERCIAL_SAMPLE_INFO.companyName} wide />
        <FactChip label="Business Address" value={COMMERCIAL_SAMPLE_INFO.businessAddress} wide />
        <FactChip label="Contact No." value={COMMERCIAL_SAMPLE_INFO.contactNo} />
        <FactChip label="Email Address" value={COMMERCIAL_SAMPLE_INFO.emailAddress} />
        <FactChip label="Website" value={COMMERCIAL_SAMPLE_INFO.website || '—'} />
        <FactChip label="TIN No." value={COMMERCIAL_SAMPLE_INFO.tinNo} />
        <FactChip label="Loan Type" value={loanTypeLabel} />
        <FactChip label="Amount Applied" value={amountAppliedLabel} />
        <FactChip label="Loan Purpose" value={loanPurposeLabel} />
        <FactChip label="Organization Type" value={COMMERCIAL_SAMPLE_INFO.organizationType} />
        <FactChip label="Registration Number" value={COMMERCIAL_SAMPLE_INFO.registrationNumber} />
        <FactChip label="Registration Date" value={COMMERCIAL_SAMPLE_INFO.registrationDate} wide />
        <FactChip
          label="Negative Records"
          wide
          value={
            <Link
              component={RouterLink}
              href={paths.admin.creditChecking(encodeURIComponent(applicantEmail))}
              sx={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              See report
            </Link>
          }
        />
      </FactChipRow>

      <Box sx={{ p: 2.5, mt: 2.5, borderRadius: '13px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
      <Stack spacing={0}>
        <InfoChipFieldRow label="AUTHORIZED CAPITAL STOCK" required>
          <TextField
            value={report.businessAuthorizedCapitalStock}
            onChange={(event) => onChange({ businessAuthorizedCapitalStock: event.target.value })}
            placeholder="Capital Stock"
            fullWidth
            size="small"
            sx={fieldSx}
          />
        </InfoChipFieldRow>
        <InfoChipRow label="LINE OF BUSINESS">
          <Typography sx={{ fontSize: 13.5, color: '#5A6273' }}>
            {report.businessLineOfBusiness || 'Transportation and Storage'}
          </Typography>
        </InfoChipRow>
        <InfoChipFieldRow label="TERRITORY" required>
          <TextField
            value={report.businessTerritory}
            onChange={(event) => onChange({ businessTerritory: event.target.value })}
            placeholder="Territory"
            fullWidth
            size="small"
            sx={fieldSx}
          />
        </InfoChipFieldRow>
        <InfoChipFieldRow label="REGULAR EMPLOYEES">
          <TextField
            value={report.businessRegularEmployees}
            onChange={(event) => onChange({ businessRegularEmployees: event.target.value })}
            placeholder="0"
            fullWidth
            size="small"
            sx={fieldSx}
          />
        </InfoChipFieldRow>
        <InfoChipFieldRow label="CONTRACTUAL EMPLOYEES">
          <TextField
            value={report.businessContractualEmployees}
            onChange={(event) => onChange({ businessContractualEmployees: event.target.value })}
            placeholder="0"
            fullWidth
            size="small"
            sx={fieldSx}
          />
        </InfoChipFieldRow>
        <InfoChipFieldRow label="OWNER" required>
          <TextField
            value={report.businessOwner}
            onChange={(event) => onChange({ businessOwner: event.target.value })}
            placeholder="Owner"
            fullWidth
            size="small"
            sx={fieldSx}
          />
        </InfoChipFieldRow>
        <InfoChipFieldRow label="DATE INSPECTED" required>
          <TextField
            type="date"
            InputLabelProps={{ shrink: true }}
            value={report.visitDate}
            onChange={(event) => onChange({ visitDate: event.target.value })}
            fullWidth
            size="small"
            sx={fieldSx}
          />
        </InfoChipFieldRow>
      </Stack>
      </Box>
    </Box>
  );
}

export function CiReportCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { signUpData, application } = useRegistration();
  const { review, setCiReport } = useAdmin();
  const comakers = review.callReport.comakers;
  const { report } = review.creditInvestigation;
  const { personalInfo, financialInfo } = application;

  const isMarried = personalInfo?.civilStatus === 'Married';

  const [commercialExpanded, setCommercialExpanded] = useState<Record<CommercialSectionKey, boolean>>({
    fieldInvestigation: true,
    tradeChecking: true,
    managementAndOwnership: true,
    comments: true,
  });
  const commercialSectionRefs = useRef(new Map<string, HTMLDivElement | null>());
  const commercialActiveKey = useCiActiveSection(
    commercialSectionRefs,
    COMMERCIAL_SECTION_NAV_ITEMS.map((item) => item.key),
    report.type
  );
  const handleToggleCommercialSection = (key: CommercialSectionKey) =>
    setCommercialExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleJumpToCommercialSection = (key: CommercialSectionKey) => {
    setCommercialExpanded((prev) => ({ ...prev, [key]: true }));
    requestAnimationFrame(() => {
      commercialSectionRefs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const [consumerExpanded, setConsumerExpanded] = useState<Record<ConsumerSectionKey, boolean>>({
    family: true,
    residenceNeighborhood: true,
    employment: true,
    tradeChecking: true,
    financialInformation: true,
    loanPurpose: true,
    comaker: true,
    investigationFindings: true,
  });
  const consumerSectionRefs = useRef(new Map<string, HTMLDivElement | null>());
  const consumerActiveKey = useCiActiveSection(
    consumerSectionRefs,
    CONSUMER_SECTION_NAV_ITEMS.map((item) => item.key),
    report.type
  );
  const handleToggleConsumerSection = (key: ConsumerSectionKey) =>
    setConsumerExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleJumpToConsumerSection = (key: ConsumerSectionKey) => {
    setConsumerExpanded((prev) => ({ ...prev, [key]: true }));
    requestAnimationFrame(() => {
      consumerSectionRefs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // One-time pre-fill from application/Call Report data — fires only while
  // the target field is still at its untouched default, so it can never
  // clobber an officer's own edit on a later render. Mirrors the
  // established "default once" convention already used elsewhere in this
  // app (e.g. loan-discussion-card.tsx's Final Loan Purpose default).
  useEffect(() => {
    const patch: Record<string, string> = {};
    if (!report.residencePermanentAddress && personalInfo) {
      const parts = [personalInfo.address, personalInfo.barangay, personalInfo.city, personalInfo.province]
        .filter(Boolean)
        .join(', ');
      if (parts) patch.residencePermanentAddress = parts;
    }
    if (!report.employmentStatus && financialInfo?.employmentStatus) {
      patch.employmentStatus = financialInfo.employmentStatus;
    }
    if (!report.loanPurposeNotes && financialInfo?.loanPurpose) {
      patch.loanPurposeNotes = `<p>${financialInfo.loanPurpose}</p>`;
    }
    if (!report.spouseNotes && isMarried && personalInfo) {
      const spouseName = [personalInfo.spouseFirstName, personalInfo.spouseMiddleName, personalInfo.spouseLastName]
        .filter(Boolean)
        .join(' ');
      const spouseBits = [
        spouseName,
        personalInfo.spouseBirthday ? `Born on ${personalInfo.spouseBirthday}` : '',
      ]
        .filter(Boolean)
        .join(' — ');
      if (spouseBits) patch.spouseNotes = `<p>${spouseBits}</p>`;
    }
    if (Object.keys(patch).length > 0) setCiReport(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalInfo, financialInfo?.employmentStatus, financialInfo?.loanPurpose, isMarried]);

  if (!signUpData) return null;

  const applicantName = `${signUpData.firstName} ${signUpData.lastName}`;
  const isBusinessOwner = financialInfo?.employmentStatus === 'Business Owner';

  const handleTranscriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const autoFill = buildTranscriptAutoFill([signUpData.email, file.name], applicantName);
    setCiReport({
      transcriptFileName: file.name,
      transcriptUploadedAt: new Date().toISOString(),
      residenceLeasedType: autoFill.residenceLeasedType,
      residenceLengthOfStay: autoFill.residenceLengthOfStay,
      presentAddress: autoFill.presentAddressSameAsPermanent ? report.residencePermanentAddress : report.presentAddress,
      employmentType: autoFill.employmentType,
      lengthOfService: autoFill.lengthOfService,
      negativeRecordFinding: autoFill.negativeRecordFinding,
      subjectAsOf: autoFill.findingsNarrativeHtml,
    });
    event.target.value = '';
  };

  const aiSummary = report.transcriptFileName
    ? buildTranscriptAutoFill([signUpData.email, report.transcriptFileName], applicantName).aiSummary
    : null;

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
      {report.type === 'commercial' && (
        <Box
          sx={{
            width: { xs: 1, md: 220 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 92 },
            order: { xs: -1, md: 0 },
          }}
        >
          <CiSectionNav
            items={COMMERCIAL_SECTION_NAV_ITEMS}
            activeKey={commercialActiveKey}
            onJump={handleJumpToCommercialSection}
          />
        </Box>
      )}
      {report.type === 'consumer' && (
        <Box
          sx={{
            width: { xs: 1, md: 220 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 92 },
            order: { xs: -1, md: 0 },
          }}
        >
          <CiSectionNav
            items={CONSUMER_SECTION_NAV_ITEMS}
            activeKey={consumerActiveKey}
            onJump={handleJumpToConsumerSection}
          />
        </Box>
      )}
      <Box sx={{ ...adminCardSx, flex: 1, minWidth: 0, width: 1 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: report.type ? 2.5 : 1.5 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="solar:document-text-bold-duotone" width={18} sx={{ color: '#8891A6' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>CI Report</Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: '#8891A6', mt: 0.5 }}>
            Upload the site-visit transcript to auto-fill applicable fields, or type directly into any field below.
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={report.type || null}
          exclusive
          size="small"
          onChange={(_event, value) => {
            if (value) setCiReport({ type: value });
          }}
          sx={{
            flexShrink: 0,
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 700,
              px: 2,
              borderColor: '#DDE1EA',
              color: '#5A6273',
              '&.Mui-selected': {
                bgcolor: '#1C2A6E',
                color: 'common.white',
                '&:hover': { bgcolor: '#14205A' },
              },
            },
          }}
        >
          <ToggleButton value="commercial">Commercial</ToggleButton>
          <ToggleButton value="consumer">Consumer</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {!report.type && (
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', fontStyle: 'italic' }}>
          Select a report type to continue.
        </Typography>
      )}

      {report.type !== '' && (
        <>
          {report.type === 'commercial' && (
            <CommercialInfoChips
              report={report}
              financialInfo={financialInfo}
              loanType={application.loanType}
              applicantEmail={signUpData.email}
              onChange={setCiReport}
            />
          )}

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ p: 2, mb: 2.5, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
          >
            <input ref={inputRef} type="file" accept=".txt,.doc,.docx,.pdf" hidden onChange={handleTranscriptUpload} />
            <Iconify icon="solar:mic-bold-duotone" width={20} sx={{ color: '#5A6273', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                {report.transcriptFileName ?? 'No transcript uploaded'}
              </Typography>
              {report.transcriptFileName && (
                <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
                  Uploaded {new Date(report.transcriptUploadedAt!).toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Typography>
              )}
            </Box>
            <Button
              onClick={() => inputRef.current?.click()}
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:upload-bold-duotone" width={16} />}
              sx={{ ...outlinedNavyButtonSx, flexShrink: 0 }}
            >
              {report.transcriptFileName ? 'Replace transcript' : 'Upload transcript'}
            </Button>
          </Stack>

          {aiSummary && (
            <Box sx={{ p: 2, mb: 2.5, borderRadius: '11px', bgcolor: '#EEF1FE', border: '1px solid #DCE1F7' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#3448B0', mb: 0.75 }}>
                AI Summary
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{aiSummary}</Typography>
            </Box>
          )}

          {report.type === 'consumer' && (
            <Stack spacing={1.5} sx={{ mb: 2.5 }}>
              <SectionLabel>Inspection</SectionLabel>
              <TextField
                label="Date Inspected"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={report.visitDate}
                onChange={(event) => setCiReport({ visitDate: event.target.value })}
                sx={{ ...fieldSx, maxWidth: { sm: 260 } }}
              />
            </Stack>
          )}

          {report.type === 'consumer' && (
            <>
              {/* Header: read-only Residence + Business/Work address, from application data */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
                <Box sx={{ flex: 1, p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
                  <SectionLabel>Residence Address</SectionLabel>
                  <Typography sx={{ fontSize: 13.5, color: '#14172A', mt: 0.75 }}>
                    {report.residencePermanentAddress || 'Not on file'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
                  <SectionLabel>Business/Work Address</SectionLabel>
                  <Typography sx={{ fontSize: 13.5, color: '#14172A', mt: 0.75 }}>
                    {isBusinessOwner ? report.employerAddress || 'Not yet entered below' : 'Not applicable'}
                  </Typography>
                </Box>
              </Stack>

              <ConsumerReportSections
                report={report}
                onChange={setCiReport}
                comakers={comakers}
                isBusinessOwner={isBusinessOwner}
                sectionRefs={consumerSectionRefs}
                expandedSections={consumerExpanded}
                onToggleSection={handleToggleConsumerSection}
              />
            </>
          )}
          {report.type === 'commercial' && (
            <CommercialReportSections
              report={report}
              onChange={setCiReport}
              sectionRefs={commercialSectionRefs}
              expandedSections={commercialExpanded}
              onToggleSection={handleToggleCommercialSection}
            />
          )}
        </>
      )}
      </Box>
    </Stack>
  );
}

function ConsumerReportSections({
  report,
  onChange,
  comakers,
  isBusinessOwner,
  sectionRefs,
  expandedSections,
  onToggleSection,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
  comakers: CiComakerEntry[];
  isBusinessOwner: boolean;
  sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
  expandedSections: Record<ConsumerSectionKey, boolean>;
  onToggleSection: (key: ConsumerSectionKey) => void;
}) {
  return (
    <Stack spacing={2.5}>
      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('family', el); }}
        sx={adminCardSx}
      >
        <CollapsibleSection
          title="Family"
          subtitle="The applicant's spouse and children."
          expanded={expandedSections.family}
          onToggle={() => onToggleSection('family')}
        >
          <Stack spacing={2.5}>
            <RichTextField
              label="Spouse"
              value={report.spouseNotes}
              onChange={(html) => onChange({ spouseNotes: html })}
              placeholder="Spouse name, citizenship, and any relevant notes…"
            />
            <ChildrenSection
              entries={report.children}
              onChange={(children) => onChange({ children })}
            />
          </Stack>
        </CollapsibleSection>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('residenceNeighborhood', el); }}
        sx={adminCardSx}
      >
        <CollapsibleSection
          title="Residence/Neighborhood"
          subtitle="The permanent address on file, and the present address if the applicant lives elsewhere."
          expanded={expandedSections.residenceNeighborhood}
          onToggle={() => onToggleSection('residenceNeighborhood')}
        >
          <ResidenceNeighborhoodSection report={report} onChange={onChange} />
        </CollapsibleSection>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('employment', el); }}
        sx={adminCardSx}
      >
        <CollapsibleSection
          title="Employment"
          subtitle="Employer or business, income, workforce and registration details."
          expanded={expandedSections.employment}
          onToggle={() => onToggleSection('employment')}
        >
          <EmploymentSection report={report} onChange={onChange} isBusinessOwner={isBusinessOwner} />
        </CollapsibleSection>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('tradeChecking', el); }}
        sx={adminCardSx}
      >
        <CollapsibleSection
          title="Trade Checking"
          subtitle="Customers and suppliers verified during the visit."
          expanded={expandedSections.tradeChecking}
          onToggle={() => onToggleSection('tradeChecking')}
        >
          <Stack spacing={2.5}>
            <TradeCheckingSection
              title="Customers"
              entries={report.customers}
              onChange={(customers) => onChange({ customers })}
            />
            <TradeCheckingSection
              title="Suppliers"
              entries={report.suppliers}
              onChange={(suppliers) => onChange({ suppliers })}
            />
          </Stack>
        </CollapsibleSection>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('financialInformation', el); }}
        sx={adminCardSx}
      >
        <CollapsibleSection
          title="Financial Information"
          subtitle="Assets, other sources of income and bank accounts."
          expanded={expandedSections.financialInformation}
          onToggle={() => onToggleSection('financialInformation')}
        >
          <Stack spacing={2.5}>
            <RichTextField
              label="Assets"
              value={report.assetsNotes}
              onChange={(html) => onChange({ assetsNotes: html })}
              placeholder="Real property, vehicles, and other notable assets…"
            />
            <OtherIncomeSection
              entries={report.otherIncomeSources}
              onChange={(otherIncomeSources) => onChange({ otherIncomeSources })}
            />
            <BankVerificationSection
              entries={report.bankAccounts}
              onChange={(bankAccounts) => onChange({ bankAccounts })}
            />
          </Stack>
        </CollapsibleSection>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('loanPurpose', el); }}
        sx={adminCardSx}
      >
        <CollapsibleSection
          title="Loan Purpose"
          subtitle="Required. What the loan proceeds will be used for."
          expanded={expandedSections.loanPurpose}
          onToggle={() => onToggleSection('loanPurpose')}
        >
          <RichTextField
            label="Loan Purpose"
            value={report.loanPurposeNotes}
            onChange={(html) => onChange({ loanPurposeNotes: html })}
            placeholder="What the loan proceeds will be used for…"
          />
        </CollapsibleSection>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('comaker', el); }}
        sx={adminCardSx}
      >
        <CollapsibleSection
          title="Comaker"
          subtitle="The comakers backing this loan."
          expanded={expandedSections.comaker}
          onToggle={() => onToggleSection('comaker')}
        >
          <ComakerSection comakers={comakers} />
        </CollapsibleSection>
      </Box>

      <Box
        ref={(el: HTMLDivElement | null) => { sectionRefs.current.set('investigationFindings', el); }}
        sx={adminCardSx}
      >
        <CollapsibleSection
          title="Investigation Findings / Observations"
          subtitle="The officer's assessment from the field visit, document review, and the preliminary recommendation."
          expanded={expandedSections.investigationFindings}
          onToggle={() => onToggleSection('investigationFindings')}
        >
          <Stack spacing={2.5}>
            <RichTextField
              label="Subject As Of"
              value={report.subjectAsOf}
              onChange={(html) => onChange({ subjectAsOf: html })}
              placeholder="Summary of the investigation as of the visit date…"
            />

            <RichTextField
              label="Health and Habits"
              value={report.healthAndHabitsNotes}
              onChange={(html) => onChange({ healthAndHabitsNotes: html })}
              placeholder="Lifestyle, health, or habit observations relevant to the investigation…"
            />

            <RichTextField
              label="Comments"
              value={report.commentsNotes}
              onChange={(html) => onChange({ commentsNotes: html })}
              placeholder="Any additional remarks…"
            />

            <Stack spacing={1.25}>
              <SectionLabel>Recommendation</SectionLabel>
              <TextField
                fullWidth
                select
                label="Preliminary recommendation"
                value={report.recommendation}
                onChange={(event) =>
                  onChange({ recommendation: event.target.value as typeof report.recommendation })
                }
                sx={fieldSx}
              >
                <MenuItem value="proceed-as-requested">Proceed as requested</MenuItem>
                <MenuItem value="proceed-with-conditions">Proceed with conditions</MenuItem>
                <MenuItem value="needs-additional-verification">Needs additional verification</MenuItem>
              </TextField>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Notes"
                value={report.recommendationNotes}
                onChange={(event) => onChange({ recommendationNotes: event.target.value })}
                sx={fieldSx}
              />
            </Stack>
          </Stack>
        </CollapsibleSection>
      </Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------
// Array-entry sub-sections. Each owns its own add/remove/update via one
// setCiReport({ <arrayField>: nextArray }) call — CiReport has no
// per-array context methods (unlike Call Report's Comaker/Collateral),
// since CiReportCard already has direct setCiReport access and there's
// only ever one CI Report per application, not a shared cross-page array.
// ----------------------------------------------------------------------

function ChildrenSection({
  entries,
  onChange,
}: {
  entries: CiChildEntry[];
  onChange: (next: CiChildEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiChildEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([...entries, { id: crypto.randomUUID(), name: '', age: '', occupationOrSchool: '' }]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Children</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Child ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Name"
                value={entry.name}
                onChange={(event) => update(entry.id, { name: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
              <TextField
                label="Age"
                type="number"
                value={entry.age}
                onChange={(event) => update(entry.id, { age: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Occupation/School"
                value={entry.occupationOrSchool}
                onChange={(event) => update(entry.id, { occupationOrSchool: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Children
        </Button>
      </Stack>
    </Stack>
  );
}

const LEASED_TYPE_OPTIONS: { value: 'owned' | 'leased' | 'rent-free'; label: string }[] = [
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'rent-free', label: 'Rent-free' },
];

function ResidenceNeighborhoodSection({
  report,
  onChange,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
}) {
  return (
    <Stack spacing={2}>
      <TextField
        label="Permanent address"
        value={report.residencePermanentAddress}
        InputProps={{ readOnly: true }}
        sx={readOnlyFieldSx}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <RadioRow
          label="Leased type"
          value={report.residenceLeasedType}
          options={LEASED_TYPE_OPTIONS}
          onChange={(value) => onChange({ residenceLeasedType: value })}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="Length of stay"
          value={report.residenceLengthOfStay}
          onChange={(event) => onChange({ residenceLengthOfStay: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Landmark"
          value={report.residenceLandmark}
          onChange={(event) => onChange({ residenceLandmark: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <TextField
        label="Remarks"
        value={report.residenceRemarks}
        onChange={(event) => onChange({ residenceRemarks: event.target.value })}
        sx={fieldSx}
      />

      <Stack sx={{ pt: 1, mt: 1, borderTop: '1px solid #EEF0F5' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#8891A6', mb: 1.5 }}>
          PRESENT ADDRESS (if different)
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Present address"
            value={report.presentAddress}
            onChange={(event) => onChange({ presentAddress: event.target.value })}
            sx={fieldSx}
          />
          <RadioRow
            label="Leased type"
            value={report.presentLeasedType}
            options={LEASED_TYPE_OPTIONS}
            onChange={(value) => onChange({ presentLeasedType: value })}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Length of stay"
              value={report.presentLengthOfStay}
              onChange={(event) => onChange({ presentLengthOfStay: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              label="Landmark"
              value={report.presentLandmark}
              onChange={(event) => onChange({ presentLandmark: event.target.value })}
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Stack>
          <TextField
            label="Remarks"
            value={report.presentRemarks}
            onChange={(event) => onChange({ presentRemarks: event.target.value })}
            sx={fieldSx}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}

const EMPLOYMENT_TYPE_OPTIONS: { value: 'direct' | 'agency' | 'self-employed'; label: string }[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'agency', label: 'Agency' },
  { value: 'self-employed', label: 'Self-Employed' },
];

export const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

function EmploymentSection({
  report,
  onChange,
  isBusinessOwner,
}: {
  report: CiReport;
  onChange: (data: Partial<CiReport>) => void;
  isBusinessOwner: boolean;
}) {
  return (
    <Stack spacing={2}>
      <TextField
        label="Employment Status"
        value={report.employmentStatus}
        InputProps={{ readOnly: true }}
        sx={readOnlyFieldSx}
      />
      <RadioRow
        label="Employment Type"
        value={report.employmentType}
        options={EMPLOYMENT_TYPE_OPTIONS}
        onChange={(value) => onChange({ employmentType: value })}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label={isBusinessOwner ? 'Business Name' : 'Employer Name'}
          value={report.employerName}
          onChange={(event) => onChange({ employerName: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Position"
          value={report.position}
          onChange={(event) => onChange({ position: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <TextField
        label={isBusinessOwner ? 'Business Address' : 'Employer Address'}
        value={report.employerAddress}
        onChange={(event) => onChange({ employerAddress: event.target.value })}
        sx={fieldSx}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="Tel. No."
          value={report.employerTelNo}
          onChange={(event) => onChange({ employerTelNo: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Email Address"
          value={report.employerEmail}
          onChange={(event) => onChange({ employerEmail: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="Salary"
          type="number"
          value={report.salary}
          onChange={(event) => onChange({ salary: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Annual Income"
          type="number"
          value={report.annualIncome}
          onChange={(event) => onChange({ annualIncome: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="Length of Service"
          value={report.lengthOfService}
          onChange={(event) => onChange({ lengthOfService: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="No. Reg. Employees"
          type="number"
          value={report.numberOfRegEmployees}
          onChange={(event) => onChange({ numberOfRegEmployees: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="No. Contr. Employees"
          type="number"
          value={report.numberOfContrEmployees}
          onChange={(event) => onChange({ numberOfContrEmployees: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <RadioRow
        label="Unionized?"
        value={report.isUnionized}
        options={YES_NO_OPTIONS}
        onChange={(value) => onChange({ isUnionized: value })}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          label="SEC/DTI Reg. No."
          value={report.secDtiRegNo}
          onChange={(event) => onChange({ secDtiRegNo: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="SEC/DTI Reg. Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={report.secDtiRegDate}
          onChange={(event) => onChange({ secDtiRegDate: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
        <TextField
          label="SEC/DTI Exp. Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={report.secDtiExpDate}
          onChange={(event) => onChange({ secDtiExpDate: event.target.value })}
          sx={{ ...fieldSx, flex: 1 }}
        />
      </Stack>
      <TextField
        label="Remarks"
        value={report.employmentRemarks}
        onChange={(event) => onChange({ employmentRemarks: event.target.value })}
        sx={fieldSx}
      />
    </Stack>
  );
}

function TradeCheckingSection({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: CiTradeEntry[];
  onChange: (next: CiTradeEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiTradeEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([
      ...entries,
      { id: crypto.randomUUID(), name: '', address: '', contactNumber: '', natureOfDealing: '', yearsOfDealing: '' },
    ]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Trade Checking — {title}</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`${title.slice(0, -1)} ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Name"
                  value={entry.name}
                  onChange={(event) => update(entry.id, { name: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Contact Number"
                  value={entry.contactNumber}
                  onChange={(event) => update(entry.id, { contactNumber: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
              <TextField
                label="Address"
                value={entry.address}
                onChange={(event) => update(entry.id, { address: event.target.value })}
                sx={fieldSx}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Nature of Dealing"
                  value={entry.natureOfDealing}
                  onChange={(event) => update(entry.id, { natureOfDealing: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
                <TextField
                  label="Years of Dealing"
                  value={entry.yearsOfDealing}
                  onChange={(event) => update(entry.id, { yearsOfDealing: event.target.value })}
                  sx={{ ...fieldSx, flex: 1 }}
                />
              </Stack>
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add {title.slice(0, -1)}
        </Button>
      </Stack>
    </Stack>
  );
}

function OtherIncomeSection({
  entries,
  onChange,
}: {
  entries: CiIncomeSourceEntry[];
  onChange: (next: CiIncomeSourceEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiIncomeSourceEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([...entries, { id: crypto.randomUUID(), source: '', monthlyAmount: '', remarks: '' }]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Other Source of Income</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Source ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Source"
                value={entry.source}
                onChange={(event) => update(entry.id, { source: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
              <TextField
                label="Monthly Amount"
                type="number"
                value={entry.monthlyAmount}
                onChange={(event) => update(entry.id, { monthlyAmount: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Remarks"
                value={entry.remarks}
                onChange={(event) => update(entry.id, { remarks: event.target.value })}
                sx={{ ...fieldSx, flex: 2 }}
              />
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Source
        </Button>
      </Stack>
    </Stack>
  );
}

function BankVerificationSection({
  entries,
  onChange,
}: {
  entries: CiBankAccountEntry[];
  onChange: (next: CiBankAccountEntry[]) => void;
}) {
  const update = (id: string, data: Partial<CiBankAccountEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...data } : entry)));
  const remove = (id: string) => onChange(entries.filter((entry) => entry.id !== id));
  const add = () =>
    onChange([
      ...entries,
      { id: crypto.randomUUID(), bankName: '', accountType: '', accountNumber: '', averageMonthlyBalance: '' },
    ]);

  return (
    <Stack spacing={1.5}>
      <SectionLabel>Bank Verification</SectionLabel>
      <Stack spacing={1.5}>
        {entries.map((entry, index) => (
          <Box key={entry.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Chip
                label={`Account ${index + 1}`}
                size="small"
                sx={{ bgcolor: '#EEF1FE', color: '#3448B0', fontWeight: 700 }}
              />
              <Button
                onClick={() => remove(entry.id)}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438' }}
              >
                Remove
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Bank Name"
                value={entry.bankName}
                onChange={(event) => update(entry.id, { bankName: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Account Type"
                value={entry.accountType}
                onChange={(event) => update(entry.id, { accountType: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
              <TextField
                label="Account Number"
                value={entry.accountNumber}
                onChange={(event) => update(entry.id, { accountNumber: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
              <TextField
                label="Average Monthly Balance"
                type="number"
                value={entry.averageMonthlyBalance}
                onChange={(event) => update(entry.id, { averageMonthlyBalance: event.target.value })}
                sx={{ ...fieldSx, flex: 1 }}
              />
            </Stack>
          </Box>
        ))}
        <Button
          onClick={add}
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
          sx={{ ...outlinedNavyButtonSx, alignSelf: 'flex-start' }}
        >
          Add Bank Account
        </Button>
      </Stack>
    </Stack>
  );
}

function ComakerSection({ comakers }: { comakers: CiComakerEntry[] }) {
  return (
    <Stack spacing={1.5}>
      <SectionLabel>Comaker</SectionLabel>
      {comakers.length === 0 ? (
        <Box sx={{ p: 2, borderRadius: '11px', border: '1px dashed #DDE1EA', bgcolor: '#FAFBFD' }}>
          <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
            No data found. Please add comaker information on Call Report.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {comakers.map((comaker) => (
            <Box key={comaker.id} sx={{ p: 2, borderRadius: '11px', border: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
                {comaker.name || 'Unnamed comaker'}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>
                {comaker.relationshipToBorrower && `${comaker.relationshipToBorrower} · `}
                {comaker.address}
                {comaker.contactNumber && ` · ${comaker.contactNumber}`}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
