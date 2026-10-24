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
import type { CiReport } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { RichTextField } from 'src/components/rich-text-field';
import { adminCardSx, outlinedNavyButtonSx } from 'src/components/admin-ui';

import { buildTranscriptAutoFill } from '../credit-investigation-transcript';

import {
  CommercialReportSections,
  COMMERCIAL_SECTION_NAV_ITEMS,
  type CommercialSectionKey,
} from './ci-report-commercial-sections';
import {
  ConsumerReportSections,
  ConsumerInfoHeader,
  CONSUMER_SECTION_NAV_ITEMS,
  type ConsumerSectionKey,
} from './ci-report-consumer-sections';

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

export const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

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
// Laid out as a CSS grid (`cols` columns on sm+, 1 on xs) rather than a
// flex-wrap row — flex-wrap has no way to know which cells start a new
// visual line, so a per-cell divider either doubles up or is missing
// depending on wrap position. Each cell draws only its own right+bottom
// edge (inset box-shadow, not border, so it doesn't consume grid track
// space); two adjacent cells never both draw the same shared edge, so no
// line is ever doubled. `wide` (gridColumn: '1 / -1') gives a chip the
// entire row to itself instead of sharing a row with others that don't
// divide evenly — used for Company Name and Business Address below
// (long value, or alone before a wide neighbour breaks the row). Every
// `FactChipRow`'s own chip count must either be a multiple of its `cols`
// or use `wide` on the leftover chips — a row left with 1 or 2 filled
// cells out of N columns leaves a stray divider floating in otherwise-
// empty space, since the divider belongs to the cell, not the row.
// Registration Date + Negative Records are exactly 2 chips, so they get
// their own 2-column `FactChipRow` instead of being `wide` individually
// (which would stack them as two separate full-width lines) or sharing
// the main 3-column grid (which would leave 1 empty, stray-divider cell).
// `position="first"`/`"last"` on the two segments makes them read as one
// continuous strip instead of two stacked cards — only the very top and
// very bottom corners round, and the second segment has no top border of
// its own (flush against the first segment's bottom edge).
export function FactChip({
  label,
  value,
  wide,
  edge = {},
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
  // Mark true for a cell that sits on the strip's own outer right/bottom
  // edge — its divider is skipped on that side so it doesn't double up
  // against the container's own border (every non-wide chip's right
  // edge is "outer" when it's the last column in its row; every chip's
  // bottom edge is "outer" when it's in the segment's last row). Fixed,
  // hand-placed layout below, so these are set explicitly per chip
  // rather than computed — a grid of opaque `children` can't introspect
  // its own row/column position from inside `FactChipRow`.
  edge?: { right?: boolean; bottom?: boolean };
}) {
  const shadowParts = [
    !edge.right && 'inset -1px 0 0 0 #EEF0F5',
    !edge.bottom && 'inset 0 -1px 0 0 #EEF0F5',
  ].filter(Boolean);
  return (
    <Box
      sx={{
        gridColumn: wide ? '1 / -1' : 'span 1',
        minWidth: 0,
        px: 1.75,
        py: 1,
        bgcolor: 'common.white',
        // Divider box-shadows instead of borders (doesn't consume grid
        // track space) — only on the right/bottom edges that are
        // genuinely internal (shared with another cell), never on an
        // edge that's actually the strip's own outer border, which would
        // otherwise double up with FactChipRow's border on that side.
        ...(shadowParts.length > 0 ? { boxShadow: shadowParts.join(', ') } : {}),
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

// A multi-segment strip (segments with different column counts, e.g.
// a 3-column main grid followed by a 2-column trailing pair that
// doesn't divide evenly into 3) reads as one strip, not stacked cards:
// pass `position="first"`/`"last"` on the two segments so only the very
// top and very bottom corners round, and the shared edge between them
// has no doubled border.
export function FactChipRow({
  children,
  cols = 3,
  position = 'only',
}: {
  children: React.ReactNode;
  cols?: number;
  position?: 'only' | 'first' | 'last';
}) {
  const topRadius = position === 'last' ? 0 : 12;
  const bottomRadius = position === 'first' ? 0 : 12;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${cols}, 1fr)` },
        borderRadius: `${topRadius}px ${topRadius}px ${bottomRadius}px ${bottomRadius}px`,
        border: '1px solid #EEF0F5',
        borderTop: position === 'last' ? 'none' : '1px solid #EEF0F5',
        bgcolor: 'common.white',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

// Builds a TextField `label` with this app's standard red required
// asterisk (see docs/225-admin-design-system.md §4 — a manual red `*`
// span, not MUI's own `required` prop, which renders an unstyled default
// asterisk inconsistent with the rest of this app).
export function requiredLabel(label: string): React.ReactNode {
  return (
    <>
      {label}
      <Box component="span" sx={{ color: '#F04438' }}> *</Box>
    </>
  );
}

// Deterministic sample data for the read-only info chips — this app has
// no real company-profile backend, same "fabricated but consistent"
// convention as every other AI/derived value (credit-investigation-
// transcript.ts, bureau-reports-card.tsx). Not tied to the applicant's
// own data, since nothing in the data model captures most of these
// fields (Company Name, Contact No., Email, Website, TIN, Registration
// Number/Date) at the business-application level. Exported so
// ci-report-preview.tsx shows the exact same header values.
export const COMMERCIAL_SAMPLE_INFO = {
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
      <FactChipRow position="first">
        <FactChip label="Company Name" value={COMMERCIAL_SAMPLE_INFO.companyName} wide edge={{ right: true }} />
        <FactChip label="Business Address" value={COMMERCIAL_SAMPLE_INFO.businessAddress} wide edge={{ right: true }} />
        <FactChip label="Contact No." value={COMMERCIAL_SAMPLE_INFO.contactNo} />
        <FactChip label="Email Address" value={COMMERCIAL_SAMPLE_INFO.emailAddress} />
        <FactChip label="Website" value={COMMERCIAL_SAMPLE_INFO.website || '—'} edge={{ right: true }} />
        <FactChip label="TIN No." value={COMMERCIAL_SAMPLE_INFO.tinNo} />
        <FactChip label="Loan Type" value={loanTypeLabel} />
        <FactChip label="Amount Applied" value={amountAppliedLabel} edge={{ right: true }} />
        <FactChip label="Loan Purpose" value={loanPurposeLabel} edge={{ bottom: true }} />
        <FactChip label="Organization Type" value={COMMERCIAL_SAMPLE_INFO.organizationType} edge={{ bottom: true }} />
        <FactChip
          label="Registration Number"
          value={COMMERCIAL_SAMPLE_INFO.registrationNumber}
          edge={{ right: true, bottom: true }}
        />
      </FactChipRow>
      <FactChipRow position="last">
        <FactChip
          label="Registration Date"
          value={COMMERCIAL_SAMPLE_INFO.registrationDate}
          edge={{ bottom: true }}
        />
        <FactChip
          label="Negative Records"
          edge={{ bottom: true }}
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
        <FactChip
          label="Line of Business"
          value={report.businessLineOfBusiness || 'Transportation and Storage'}
          edge={{ right: true, bottom: true }}
        />
      </FactChipRow>

      <Stack spacing={2} sx={{ mt: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label={requiredLabel('Authorized Capital Stock')}
            value={report.businessAuthorizedCapitalStock}
            onChange={(event) => onChange({ businessAuthorizedCapitalStock: event.target.value })}
            placeholder="Capital Stock"
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label={requiredLabel('Territory')}
            value={report.businessTerritory}
            onChange={(event) => onChange({ businessTerritory: event.target.value })}
            placeholder="Territory"
            fullWidth
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Regular Employees"
            value={report.businessRegularEmployees}
            onChange={(event) => onChange({ businessRegularEmployees: event.target.value })}
            placeholder="0"
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label="Contractual Employees"
            value={report.businessContractualEmployees}
            onChange={(event) => onChange({ businessContractualEmployees: event.target.value })}
            placeholder="0"
            fullWidth
            sx={fieldSx}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label={requiredLabel('Owner')}
            value={report.businessOwner}
            onChange={(event) => onChange({ businessOwner: event.target.value })}
            placeholder="Owner"
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label={requiredLabel('Date Inspected')}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={report.visitDate}
            onChange={(event) => onChange({ visitDate: event.target.value })}
            fullWidth
            sx={fieldSx}
          />
        </Stack>
      </Stack>
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
    locationFacilities: true,
    tradeChecking: true,
    managementAndOwnership: true,
    bankVerification: true,
    comments: true,
    additionalDocuments: true,
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

  const consumerSectionRefs = useRef(new Map<string, HTMLDivElement | null>());
  const consumerActiveKey = useCiActiveSection(
    consumerSectionRefs,
    CONSUMER_SECTION_NAV_ITEMS.map((item) => item.key),
    report.type
  );
  const handleJumpToConsumerSection = (key: ConsumerSectionKey) => {
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
      residenceAddressType: autoFill.residenceAddressType,
      residenceLengthOfStay: autoFill.residenceLengthOfStay,
      presentSameAsPermanent: autoFill.presentSameAsPermanent,
      employmentType: autoFill.employmentType,
      lengthOfService: autoFill.lengthOfService,
      negativeRecordFinding: autoFill.negativeRecordFinding,
      subjectAsOf: autoFill.findingsNarrativeHtml,
    });
    event.target.value = '';
  };

  // Clears the transcript record only (filename + uploaded timestamp) —
  // does not revert the fields auto-fill already wrote, since those are
  // now just regular editable fields the officer may have built on. If a
  // transcript is uploaded again later, auto-fill overwrites them afresh.
  const handleRemoveTranscript = () => {
    setCiReport({ transcriptFileName: null, transcriptUploadedAt: null });
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
            {report.transcriptFileName && (
              <Button
                onClick={handleRemoveTranscript}
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                sx={{ color: '#F04438', flexShrink: 0 }}
              >
                Remove
              </Button>
            )}
          </Stack>

          {aiSummary && (
            <Box sx={{ p: 2, mb: 2.5, borderRadius: '11px', bgcolor: '#EEF1FE', border: '1px solid #DCE1F7' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#3448B0', mb: 0.75 }}>
                AI Summary
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.6 }}>{aiSummary}</Typography>
            </Box>
          )}

          {report.type === 'commercial' && (
            <>
              <CommercialInfoChips
                report={report}
                financialInfo={financialInfo}
                loanType={application.loanType}
                applicantEmail={signUpData.email}
                onChange={setCiReport}
              />
              <CommercialReportSections
                report={report}
                onChange={setCiReport}
                sectionRefs={commercialSectionRefs}
                expandedSections={commercialExpanded}
                onToggleSection={handleToggleCommercialSection}
                applicationBusinessType={financialInfo?.businessType}
              />
            </>
          )}

          {report.type === 'consumer' && (
            <>
              <ConsumerInfoHeader
                applicantName={applicantName}
                report={report}
                isBusinessOwner={isBusinessOwner}
              />

              <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                <TextField
                  label="Date Inspected"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={report.visitDate}
                  onChange={(event) => setCiReport({ visitDate: event.target.value })}
                  sx={{ ...fieldSx, maxWidth: { sm: 260 } }}
                />
                <RichTextField
                  label="Subject As Of"
                  value={report.subjectAsOf}
                  onChange={(html) => setCiReport({ subjectAsOf: html })}
                  placeholder="Summary of the investigation as of the visit date…"
                />
              </Stack>

              <ConsumerReportSections
                report={report}
                onChange={setCiReport}
                comakers={comakers}
                isBusinessOwner={isBusinessOwner}
                sectionRefs={consumerSectionRefs}
              />
            </>
          )}
        </>
      )}
      </Box>
    </Stack>
  );
}

