'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

import type { CollateralPhoto, AppraisalReportLandTitle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only rendering of a submitted in-house Appraisal Report
// (AppraiserAssignmentCard's form) — rendered inline by the Appraisal
// Officer's `AssignedAppraiserCard` (a collapsible panel per reported
// bundle) and by the Head/Approver's "My Approvals" detail page
// (appraisal-approver-bundle-view.tsx), both of which need to see what the
// appraiser actually submitted, not just a "submitted" boolean.
//
// Restructured around an "At a Glance" summary instead of a scroll-through
// document. Earlier passes fixed the document's internal problems (dead
// space beside photos, broken-looking muted text, per-section collapse)
// but the information architecture itself was still "one long form read
// top to bottom, with pieces individually tucked away" — a reviewer still
// had to open several separate CollapsibleSections just to build a full
// picture, one field at a time. This version inverts that: everything a
// reviewer actually needs to decide (owner, location, appraised value,
// loanable amount, highest & best use, every property's own photo) sits
// in one always-visible summary at the top, and the ENTIRE itemized
// report — every section this file used to open individually — sits
// behind a single "View Full Report" toggle below it. No tabs or
// multi-column layout was introduced for this — this app has neither
// anywhere else, so a single expand/collapse toggle (the same
// chevron+Collapse shell `CollapsibleSection` already standardizes) was
// the restructure that stayed inside the existing pattern language
// instead of importing one.
// ----------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box>
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
      <Divider sx={{ mt: 0.75, borderColor: '#EEF0F5' }} />
    </Box>
  );
}

// A single "form line" — label in small-caps above, value sitting directly
// on a hairline rule below, the way a filled-in printed form reads.
function Field({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  if (!value) return null;
  return (
    <Box sx={{ minWidth: 0, gridColumn: `span ${span}` }}>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>{label}</Typography>
      <Typography
        sx={{
          mt: 0.25,
          pb: 0.6,
          fontSize: 13.5,
          fontWeight: 600,
          color: '#14172A',
          wordBreak: 'break-word',
          borderBottom: '1px solid #EEF0F5',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// One signature entry — eyebrow label + bold name, in its own bordered
// box. Same pattern credit-checking-result-modal.tsx's own "Prepared by"
// block uses (Box/p:2/borderRadius:12px/border:1px solid #EEF0F5, an
// eyebrow SectionLabel, then the name in bold dark text), applied here to
// all four Prepared/Reviewed/Endorsed/Noted By entries instead of the
// hairline-underline Field style every other value on this card uses.
// `stampedAt` shows the sequential sign-off chain's own timestamp
// underneath the name, when that step has actually been stamped.
function SignatureBlock({ label, name, stampedAt }: { label: string; name: string; stampedAt?: string | null }) {
  if (!name) return null;
  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A', mt: 1 }}>{name}</Typography>
      {stampedAt && (
        <Typography sx={{ fontSize: 11, color: '#0C8A4F', mt: 0.5 }}>
          {new Date(stampedAt).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}

// A bundle-wide supporting document link (Subdivision Plan, Tax Map) —
// distinct from each title's own Collateral Photos gallery and Lot Plot
// image, since these two are per-report, not per-TCT. Read-only "View"
// link, same convention the external-appraiser report file uses.
function FileAttachmentLink({ label, fileName, fileUrl }: { label: string; fileName: string | null; fileUrl: string }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', flex: 1, minWidth: 0 }}
    >
      <Iconify icon="solar:file-check-bold-duotone" width={20} sx={{ color: '#1C2A6E', flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>{label}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#344054' }} noWrap>
          {fileName ?? label}
        </Typography>
      </Box>
      <Box
        component="a"
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          ...outlinedNavyButtonSx,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.25,
          py: 0.5,
          borderRadius: '8px',
          border: '1px solid',
          fontSize: 12.5,
          fontWeight: 700,
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        View
      </Box>
    </Stack>
  );
}

// Responsive field grid — 2 columns on mobile, 4 on desktop, matching a
// typical printed form's row-of-boxes layout. `Field` itself returns null
// for an empty value, so an all-empty row collapses to nothing.
function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        columnGap: 2.5,
        rowGap: 1.75,
      }}
    >
      {children}
    </Box>
  );
}

// The hero — the one number this whole document exists to produce, first
// thing in the At a Glance summary.
function AppraisedValueHero({ appraisedValue, amountInWords }: { appraisedValue: string; amountInWords: string }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1.5}
      sx={{ p: 2.25, borderRadius: '12px', bgcolor: TONE_COLORS.info.bg }}
    >
      <Box sx={{ width: 48, height: 48, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: '#1C2A6E' }}>
        <Iconify icon="solar:banknote-2-bold-duotone" width={26} sx={{ color: 'common.white' }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', color: '#8891A6' }}>
          APPRAISED VALUE
        </Typography>
        <Typography sx={{ mt: 0.25, fontSize: 26, fontWeight: 800, color: '#1C2A6E', lineHeight: 1.1 }}>
          {fCurrency(appraisedValue)}
        </Typography>
        {amountInWords && (
          <Typography sx={{ fontSize: 12.5, color: '#5A6273', mt: 0.25 }}>{amountInWords}</Typography>
        )}
      </Box>
    </Stack>
  );
}

// A row of small photo chips, one per pledged property, in the At a
// Glance summary — the fastest way to see every property's own
// collateral photo without opening the full report. Purely a preview:
// clicking opens the full photo, same as the full report's own photo
// blocks. A title with multiple photos shows its first one here — the
// full gallery lives on LandTitlePhotoGallery inside the full report.
function PhotoChipRow({ titles }: { titles: { tctNumber: string; photoFileUrl: string | null }[] }) {
  const withPhotos = titles.filter((title) => title.photoFileUrl);
  if (withPhotos.length === 0) return null;
  return (
    <Stack direction="row" spacing={1.25} flexWrap="wrap" rowGap={1.25}>
      {withPhotos.map((title) => (
        <Box
          key={title.tctNumber}
          component="a"
          href={title.photoFileUrl!}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'block',
            width: 72,
            flexShrink: 0,
            position: 'relative',
            '&:hover .chip-zoom': { opacity: 1 },
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 54,
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #EBEDF3',
              position: 'relative',
            }}
          >
            <Box
              component="img"
              src={title.photoFileUrl!}
              alt={`Collateral photo — TCT No. ${title.tctNumber}`}
              sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
            />
            <Box
              className="chip-zoom"
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(20,23,42,0.35)',
                opacity: 0,
                transition: 'opacity 0.15s ease',
              }}
            >
              <Iconify icon="solar:magnifer-bold" width={14} sx={{ color: 'common.white' }} />
            </Box>
          </Box>
          <Typography sx={{ fontSize: 10.5, color: '#8891A6', mt: 0.4, textAlign: 'center' }} noWrap>
            {title.tctNumber}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

// Every Collateral Photo uploaded for a title, as a wrapping grid of
// square thumbnails — replaces the old single hero photo now that a
// title can have more than one. Each thumbnail opens its own full photo
// in a new tab, same "click to view full size" convention the old single
// photo used.
function LandTitlePhotoGallery({ photos, tctNumber }: { photos: CollateralPhoto[]; tctNumber: string }) {
  if (photos.length === 0) return null;
  return (
    <Stack direction="row" spacing={1.25} flexWrap="wrap" rowGap={1.25} sx={{ width: { xs: '100%', sm: 200 }, flexShrink: 0 }}>
      {photos.map((photo, index) => (
        <Box
          key={`${photo.fileUrl}-${index}`}
          component="a"
          href={photo.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'block',
            width: 92,
            aspectRatio: '4 / 3',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #EBEDF3',
            position: 'relative',
            '&:hover .exhibit-zoom': { opacity: 1 },
          }}
        >
          <Box
            component="img"
            src={photo.fileUrl}
            alt={`Collateral photo ${index + 1} — TCT No. ${tctNumber}`}
            sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
          />
          <Box
            className="exhibit-zoom"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(20,23,42,0.4)',
              opacity: 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            <Iconify icon="solar:magnifer-bold" width={16} sx={{ color: 'common.white' }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

// Inside the full report, a bundle covering several pledged properties
// still collapses each title to a compact row by default (photo
// thumbnail + TCT No. + Zonal Value), expandable to the full detail —
// same fix appraisal-appraiser-bundle-view.tsx applies to its own per-TCT
// document lists. A bundle covering only one title skips the toggle
// entirely and renders the full detail directly.
function LandTitleSummary({
  title,
  tctNumber,
  expanded,
  onToggle,
  showToggle,
}: {
  title: AppraisalReportLandTitle;
  tctNumber: string;
  expanded: boolean;
  onToggle: () => void;
  showToggle: boolean;
}) {
  const detail = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: showToggle ? 2 : 0 }}>
      {!showToggle && <LandTitlePhotoGallery photos={title.collateralPhotos} tctNumber={tctNumber} />}

      <Stack spacing={1.75} sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 2.5, rowGap: 1.75 }}>
          <Field label="File Type" value={title.fileType} />
          <Field label="Title No." value={title.titleNo} />
          <Field label="Area Size (sq.m.)" value={title.areaSize} />
          <Field label="Zonal Value" value={title.zonalValue} />
          <Field label="Lot No." value={title.lotNo} />
          <Field label="Survey No." value={title.surveyNo} />
          <Field label="Book No. / Page No." value={title.bookPageNo} />
          <Field label="Title Registration Date" value={title.titleRegistrationDate} />
          <Field label="Title Registration Place" value={title.titleRegistrationPlace} span={2} />
          <Field label="FMV / RCN (PHP)" value={title.fmvRcn} />
          <Field label="Construction Status %" value={title.constructionStatusPercent} />
          <Field label="Depreciated Value" value={title.depreciatedValue} />
          <Field label="Appraised Value (P)" value={title.appraisedValueP} />
        </Box>

        {(title.boundaries || title.technicalSpecification) && (
          <Stack spacing={1.25}>
            {title.boundaries && (
              <Box>
                <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Boundaries</Typography>
                <Typography sx={{ fontSize: 13, color: '#3B4256', whiteSpace: 'pre-wrap', mt: 0.25 }}>
                  {title.boundaries}
                </Typography>
              </Box>
            )}
            {title.technicalSpecification && (
              <Box>
                <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Technical Specification</Typography>
                <Typography sx={{ fontSize: 13, color: '#3B4256', whiteSpace: 'pre-wrap', mt: 0.25 }}>
                  {title.technicalSpecification}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {(title.latitude || title.longitude || title.lotPlotFileUrl) && (
          <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #E3E7F5', bgcolor: '#F7F8FE' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
              <Iconify icon="solar:map-point-bold-duotone" width={16} sx={{ color: '#1C2A6E' }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1C2A6E' }}>
                Lot Plotting
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 2.5, rowGap: 1.75, flex: 1, minWidth: 0 }}>
                <Field label="Latitude" value={title.latitude} />
                <Field label="Longitude" value={title.longitude} />
              </Box>
              {title.lotPlotFileUrl && (
                <Box sx={{ width: { xs: '100%', sm: 200 }, flexShrink: 0 }}>
                  <Box
                    component="img"
                    src={title.lotPlotFileUrl}
                    alt={`Lot plot — TCT No. ${tctNumber}`}
                    sx={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'contain', bgcolor: '#EEF1FE', borderRadius: '10px', border: '1px solid #DDE3F5', display: 'block' }}
                  />
                  <Typography sx={{ fontSize: 10.5, color: '#8891A6', mt: 0.75, textAlign: 'center' }}>
                    Simulated preview
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </Stack>
    </Stack>
  );

  if (!showToggle) {
    return (
      <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
          TCT No. {tctNumber}
        </Typography>
        {detail}
      </Box>
    );
  }

  return (
    <Box sx={{ borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD', overflow: 'hidden' }}>
      <Stack
        component={ButtonBase}
        onClick={onToggle}
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ width: 1, p: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}
      >
        <Iconify
          icon="eva:chevron-down-fill"
          width={18}
          sx={{ color: '#8891A6', flexShrink: 0, transition: 'transform 0.15s ease', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        {title.collateralPhotos[0] && (
          <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #EBEDF3' }}>
            <Box component="img" src={title.collateralPhotos[0].fileUrl} alt="" sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }} />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }} noWrap>
            TCT No. {tctNumber}
          </Typography>
        </Box>
        {title.zonalValue && (
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 10.5, color: '#8891A6' }}>Zonal Value</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>{title.zonalValue}</Typography>
          </Box>
        )}
      </Stack>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
          {title.collateralPhotos.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <LandTitlePhotoGallery photos={title.collateralPhotos} tctNumber={tctNumber} />
            </Box>
          )}
          {detail}
        </Box>
      </Collapse>
    </Box>
  );
}

export function AppraisalReportView({ bundleId, tctNumbers }: { bundleId: string; tctNumbers: string[] }) {
  const { review } = useAdmin();
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);

  // The entire itemized report sits behind this one toggle, collapsed by
  // default — the At a Glance summary above it is meant to answer most
  // reviews on its own.
  const [fullReportOpen, setFullReportOpen] = useState(false);

  // Every section inside the full report still collapses independently
  // once it's open — one shared expand state per section, keyed by name.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Per-title expand state for a multi-property bundle's collapsed rows
  // inside the full report — same "present in the set means expanded"
  // convention appraisal-appraiser-bundle-view.tsx uses for its own
  // per-TCT document lists.
  const [expandedTitleIds, setExpandedTitleIds] = useState<Set<string>>(new Set());
  const toggleTitle = (groupId: string) =>
    setExpandedTitleIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

  if (!bundle || !bundle.report.uploadedAt) return null;
  const { appraiserType, appraiserName, report } = bundle;
  const uploadedAt = bundle.report.uploadedAt;

  const titleGroups = review.requirementChecklist.appraisalGroups.filter((group) =>
    bundle.tctGroupIds.includes(group.id)
  );

  if (appraiserType === 'external') {
    return (
      <Box sx={adminCardSx}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
          Appraisal Report
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2 }}>
          Covers {tctNumbers.join(', ')}. Submitted by {appraiserName ?? 'the assigned appraiser'} on{' '}
          {new Date(uploadedAt).toLocaleString()}.
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}
        >
          <Iconify icon="solar:file-check-bold-duotone" width={22} sx={{ color: '#1C2A6E' }} />
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#344054', flex: 1, minWidth: 0 }} noWrap>
            {report.fileName}
          </Typography>
          {report.fileUrl && (
            <Box
              component="a"
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                ...outlinedNavyButtonSx,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                borderRadius: '9px',
                border: '1px solid',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              <Iconify icon="solar:eye-bold" width={16} />
              View
            </Box>
          )}
        </Stack>
      </Box>
    );
  }

  const propertyCount = titleGroups.length;

  return (
    <Box sx={adminCardSx}>
      <Stack alignItems="center" spacing={0.5} sx={{ textAlign: 'center', mb: 3 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>Appraisal Report</Typography>
        <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>Covers {tctNumbers.join(', ')}</Typography>
        <Typography sx={{ fontSize: 12, color: '#8891A6' }}>
          Submitted by {appraiserName ?? 'the assigned appraiser'} on {new Date(uploadedAt).toLocaleString()}
        </Typography>
      </Stack>
      <Divider sx={{ borderColor: '#EEF0F5', mb: 3 }} />

      {/* At a Glance — everything a reviewer needs, with nothing to expand */}
      <Stack spacing={2.5}>
        <AppraisedValueHero appraisedValue={report.appraisedValue} amountInWords={report.amountInWords} />

        <FieldGrid>
          <Field label="Registered Owner" value={report.registeredOwner} span={2} />
          <Field label="Loanable Amount" value={report.loanableAmount} span={2} />
          <Field label="Location of Property" value={report.locationOfProperty} span={2} />
          <Field label="Highest and Best Use" value={report.highestAndBestUse} />
          <Field label="Properties Covered" value={String(propertyCount)} />
        </FieldGrid>

        <PhotoChipRow
          titles={titleGroups.map((group) => ({
            tctNumber: group.tctNumber,
            photoFileUrl: report.landTitles.find((entry) => entry.tctGroupId === group.id)?.collateralPhotos[0]?.fileUrl ?? null,
          }))}
        />
      </Stack>

      <Divider sx={{ borderColor: '#EEF0F5', my: 2.5 }} />

      <Button
        onClick={() => setFullReportOpen((prev) => !prev)}
        fullWidth
        variant="outlined"
        endIcon={
          <Iconify
            icon="eva:chevron-down-fill"
            width={18}
            sx={{ transition: 'transform 0.15s ease', transform: fullReportOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        }
        sx={{ ...outlinedNavyButtonSx, borderRadius: '10px', py: 1.1 }}
      >
        {fullReportOpen ? 'Hide Full Report' : 'View Full Report'}
      </Button>

      <Collapse in={fullReportOpen}>
        <Stack spacing={3} sx={{ mt: 3 }}>
          <FieldGrid>
            <Field label="Date Report" value={report.dateReport} />
            <Field label="Date Inspected" value={report.dateInspected} />
            <Field label="Requesting Officer" value={report.requestingOfficer} />
            <Field label="Branch" value={report.branch} />
            <Field label="Account Name" value={report.accountName} span={2} />
            <Field label="Address" value={report.accountAddress} span={2} />
          </FieldGrid>

          <Stack spacing={1.5}>
            <SectionLabel>Land</SectionLabel>
            <Stack spacing={1.5}>
              {titleGroups.map((group) => {
                const title = report.landTitles.find((entry) => entry.tctGroupId === group.id);
                if (!title) return null;
                return (
                  <LandTitleSummary
                    key={group.id}
                    title={title}
                    tctNumber={group.tctNumber}
                    showToggle={titleGroups.length > 1}
                    expanded={expandedTitleIds.has(group.id)}
                    onToggle={() => toggleTitle(group.id)}
                  />
                );
              })}
            </Stack>
            <Field label="Encumbrances / Remarks" value={report.encumbrancesRemarks} span={4} />
          </Stack>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Technical Specification"
              expanded={!!expanded.technical}
              onToggle={() => toggle('technical')}
            >
              <FieldGrid>
                <Field label="Highest and Best Use" value={report.highestAndBestUse} span={2} />
                <Field label="Present Use" value={report.presentUse} span={2} />
                <Field label="Street Frontage (metres)" value={report.streetFrontage} />
                <Field label="Street Width (metres)" value={report.streetWidth} />
                <Field label="Surfacing (Concrete/Asphalt)" value={report.surfacing} />
                <Field label="Average Depth" value={report.averageDepth} />
                <Field label="Approx. Shape" value={report.approxShape} />
                <Field label="Topography" value={report.topography} />
                <Field label="Neighborhood (Res'l/Comm'l/Ind'l.)" value={report.neighborhood} />
              </FieldGrid>
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Source or Kind of Utilities"
              expanded={!!expanded.utilities}
              onToggle={() => toggle('utilities')}
            >
              <FieldGrid>
                <Field label="Public Conveyance Line" value={report.utilityPublicConveyance} />
                <Field label="Electricity" value={report.utilityElectricity} />
                <Field label="Water" value={report.utilityWater} />
                <Field label="Gas / Others" value={report.utilityGasOthers} />
              </FieldGrid>
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Improvement"
              expanded={!!expanded.construction}
              onToggle={() => toggle('construction')}
            >
              <Stack spacing={1.5}>
                {report.improvements.map((improvement) => (
                  <Box key={improvement.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Year Constructed" value={improvement.yearConstructed} />
                      <Field label="Construction" value={improvement.construction} />
                      <Field label="Condition" value={improvement.condition} />
                      <Field label="Est. Floor Area (sq.m.)" value={improvement.estFloorArea} />
                    </FieldGrid>
                  </Box>
                ))}
              </Stack>
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="General Construction Features"
              expanded={!!expanded.construction}
              onToggle={() => toggle('construction')}
            >
              <Field label="General Construction Features" value={report.generalConstructionFeatures} span={4} />
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Particular Description"
              expanded={!!expanded.construction}
              onToggle={() => toggle('construction')}
            >
              <Stack spacing={1.5}>
                {report.particularDescriptions.map((particular) => (
                  <Box key={particular.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Floor Level" value={particular.floorLevel} />
                      <Field label="Interior Walls & Partitions" value={particular.interiorWallsPartitions} />
                      <Field label="Flooring" value={particular.flooring} />
                      <Field label="Doors & Windows" value={particular.doorsWindows} />
                      <Field label="Ceiling & Roofing" value={particular.ceilingRoofing} />
                    </FieldGrid>
                  </Box>
                ))}
              </Stack>
            </CollapsibleSection>
          </Box>

          <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
            <CollapsibleSection
              title="Basis of Valuation (Land)"
              expanded={!!expanded.basis}
              onToggle={() => toggle('basis')}
            >
              <Stack spacing={1.5}>
                {report.basisOfValuationComparables.map((comparable) => (
                  <Box key={comparable.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Source" value={comparable.source} />
                      <Field label="Location" value={comparable.location} />
                      <Field label="Area Size" value={comparable.areaSize} />
                      <Field label="Price Type" value={comparable.priceType} />
                      <Field label="Zonal Value" value={comparable.zonalValue} />
                      <Field label="Value" value={comparable.value} />
                    </FieldGrid>
                  </Box>
                ))}
                <Field label="Fair Market Value Per Square Meter" value={report.fairMarketValuePerSqm} span={2} />
                <Field label="Fair Market Value Total (PHP)" value={report.fairMarketValueTotal} span={2} />
                {report.valuationRemarks && (
                  <Field label="Valuation Remarks" value={report.valuationRemarks} span={4} />
                )}
              </Stack>
            </CollapsibleSection>
          </Box>

          {report.remarksAdditionalInfo && (
            <Stack spacing={1.5}>
              <SectionLabel>Remarks / additional information</SectionLabel>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
                {report.remarksAdditionalInfo}
              </Typography>
            </Stack>
          )}

          {report.conditionsForAcceptance.length > 0 && (
            <Stack spacing={1.5}>
              <SectionLabel>Conditions for acceptance of collateral</SectionLabel>
              <Stack spacing={1.5}>
                {report.conditionsForAcceptance.map((condition) => (
                  <Box key={condition.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
                    <FieldGrid>
                      <Field label="Item of Property" value={condition.itemOfProperty} />
                      <Field label="Ref" value={condition.ref} />
                      <Field label="Marketable" value={condition.marketable} />
                      <Field label="Construction (%)" value={condition.constructionStatusPercent} />
                      <Field label="Depreciated Value" value={condition.depreciatedValue} />
                      <Field label="Appraised Value" value={condition.appraisedValue} />
                    </FieldGrid>
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}

          <Stack spacing={1.5}>
            <SectionLabel>Appraisal summary</SectionLabel>
            <FieldGrid>
              <Field label="Loanable Amount" value={report.loanableAmount} span={2} />
              <Field label="Rounded Figures" value={report.roundedFigures} span={2} />
              <Field label="Leasable Percent (%)" value={report.leasablePercent} span={2} />
              <Field label="Leasable Amount (PHP)" value={report.leasableAmount} span={2} />
            </FieldGrid>
          </Stack>

          {report.feeAttachments.length > 0 && (
            <Stack spacing={1.5}>
              <SectionLabel>Fee attachment</SectionLabel>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {report.feeAttachments.map((photo, index) => (
                  <Box
                    key={`${photo.fileUrl}-${index}`}
                    component="img"
                    src={photo.fileUrl}
                    alt={photo.fileName}
                    sx={{ width: 88, height: 66, objectFit: 'cover', borderRadius: '8px', border: '1px solid #EEF0F5' }}
                  />
                ))}
              </Stack>
            </Stack>
          )}

          <Stack spacing={1.5}>
            <SectionLabel>Prepared / Reviewed / Endorsed / Noted By</SectionLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
              <SignatureBlock label="Prepared by" name={report.preparedBy} stampedAt={report.preparedAt} />
              <SignatureBlock label="Reviewed by" name={report.reviewedBy} stampedAt={report.reviewedAt} />
              <SignatureBlock label="Endorsed by" name={report.endorsedBy} stampedAt={report.endorsedAt} />
              <SignatureBlock label="Noted by" name={report.notedBy} stampedAt={report.notedAt} />
            </Box>
          </Stack>

          {report.recommendation && (
            <Stack spacing={1.5}>
              <SectionLabel>Recommendation</SectionLabel>
              <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
                {report.recommendation}
              </Typography>
            </Stack>
          )}

          {(report.subdivisionPlanFileUrl || report.taxMapFileUrl) && (
            <Stack spacing={1.5}>
              <SectionLabel>File Attachment</SectionLabel>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                {report.subdivisionPlanFileUrl && (
                  <FileAttachmentLink label="Subdivision Plan" fileName={report.subdivisionPlanFileName} fileUrl={report.subdivisionPlanFileUrl} />
                )}
                {report.taxMapFileUrl && (
                  <FileAttachmentLink label="Tax Map" fileName={report.taxMapFileName} fileUrl={report.taxMapFileUrl} />
                )}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
