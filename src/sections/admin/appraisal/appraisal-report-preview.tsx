'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import type { AppraisalReport, AppraisalReportLandTitle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Plain, always-expanded read-only preview of the report the appraiser is
// currently filling in — opened from AppraiserAssignmentCard's own
// "Preview Appraisal Report" button, before the report is even submitted.
// Matches the Call Report modal's design system exactly (SectionLabel,
// FieldRow, NarrativeBlock, SignatureField, section-as-bordered-card),
// per explicit direction, rather than the grid-based Field/FieldGrid
// this preview used before — the Officer/Approver's own AppraisalReportView
// keeps its distinct printed-form styling (hairline-underline Field,
// "At a Glance" hero, per-section collapse); this preview is a separate,
// deliberately plain component, not that one.
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

// One report section as its own bordered card — same shape
// call-report-result-modal.tsx uses for each of its sections — separation
// between sections comes from spacing between cards, not Dividers.
function SectionCard({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #EEF0F5' }}>
      <Stack spacing={1.5}>
        {label && <SectionLabel>{label}</SectionLabel>}
        {children}
      </Stack>
    </Box>
  );
}

// Label/value side-by-side row — same shape call-report-result-modal.tsx's
// own FieldRow uses (fixed 200px label column, no grid, no hairline
// underline) — replaces the old grid-based Field/FieldGrid.
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', width: 200, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>{value || '—'}</Typography>
    </Stack>
  );
}

// Free-text value in its own bordered box — same shape
// call-report-result-modal.tsx's own NarrativeBlock uses. Used for General
// Construction Features, Remarks/Additional Information, and
// Recommendation — Boundaries, Technical Specification, and
// Encumbrances/Remarks stay plain label+text with no border, per explicit
// direction.
function NarrativeBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #EEF0F5' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#8891A6', mb: 0.75 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {value}
      </Typography>
    </Box>
  );
}

// One fact chip — label above, bold value below, in a shared bordered
// strip with vertical dividers between chips. Same shape
// appraisal-appraiser-bundle-view.tsx's own FactChip uses for its header
// row, applied here to the Report details card.
function FactChip({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.35} sx={{ px: 1.75, py: 1, minWidth: 0, flex: '1 1 128px' }}>
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
        title={value}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

function FactChipRow({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      sx={{
        border: '1px solid #EEF0F5',
        borderRadius: '12px',
        bgcolor: '#FAFBFD',
        '& > div:not(:last-of-type)': { borderRight: { xs: 'none', sm: '1px solid #EEF0F5' } },
      }}
    >
      {children}
    </Stack>
  );
}

function LandTitlePreview({ title, tctNumber }: { title: AppraisalReportLandTitle; tctNumber: string }) {
  return (
    <SectionCard label={`TCT No. ${tctNumber}`}>
      <Stack spacing={1.5}>
        <FieldRow label="File Type" value={title.fileType} />
        <FieldRow label="Title No." value={title.titleNo} />
        <FieldRow label="Area Size (sq.m.)" value={title.areaSize} />
        <FieldRow label="Zonal Value" value={title.zonalValue} />
        <FieldRow label="Lot No." value={title.lotNo} />
        <FieldRow label="Survey No." value={title.surveyNo} />
        <FieldRow label="Book No. / Page No." value={title.bookPageNo} />
        <FieldRow label="Title Registration Date" value={title.titleRegistrationDate} />
        <FieldRow label="Title Registration Place" value={title.titleRegistrationPlace} />

        {title.boundaries && (
          <Box>
            <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Boundaries</Typography>
            <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.65, whiteSpace: 'pre-wrap', mt: 0.25 }}>
              {title.boundaries}
            </Typography>
          </Box>
        )}
        {title.technicalSpecification && (
          <Box>
            <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Technical Specification</Typography>
            <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.65, whiteSpace: 'pre-wrap', mt: 0.25 }}>
              {title.technicalSpecification}
            </Typography>
          </Box>
        )}

        {title.lotPlotPhotos.length > 0 && (
          <Box sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#F9FAFC' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Iconify icon="solar:map-point-bold-duotone" width={16} sx={{ color: '#5A6273' }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A6273' }}>
                Lot Plot Image
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.25} flexWrap="wrap" rowGap={1.25}>
              {title.lotPlotPhotos.map((photo, index) => (
                <Box
                  key={`${photo.fileUrl}-${index}`}
                  sx={{
                    width: 56,
                    height: 56,
                    flexShrink: 0,
                    borderRadius: '8px',
                    border: '1px solid #EBEDF3',
                    bgcolor: '#F5F6FA',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="img"
                    src={photo.fileUrl}
                    alt={`Lot plot image ${index + 1} — TCT No. ${tctNumber}`}
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        )}

      </Stack>
    </SectionCard>
  );
}

export function AppraisalReportPreview({
  report,
  titleGroups,
}: {
  report: AppraisalReport;
  titleGroups: { id: string; tctNumber: string }[];
}) {
  return (
    <Stack spacing={2.5}>
      <FactChipRow>
        <FactChip label="Date Report" value={report.dateReport} />
        <FactChip label="Date Inspected" value={report.dateInspected} />
        <FactChip label="Requesting Officer" value={report.requestingOfficer} />
        <FactChip label="Branch" value={report.branch} />
        <FactChip label="Account Name" value={report.accountName} />
        <FactChip label="Address" value={report.accountAddress} />
      </FactChipRow>

      <SectionCard label="Land">
        <FieldRow label="Registered Owner" value={report.registeredOwner} />
        <FieldRow label="Location of Property" value={report.locationOfProperty} />
        {report.encumbrancesRemarks && (
          <Box>
            <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Encumbrances / Remarks</Typography>
            <Typography sx={{ fontSize: 13.5, color: '#3B4256', lineHeight: 1.65, whiteSpace: 'pre-wrap', mt: 0.25 }}>
              {report.encumbrancesRemarks}
            </Typography>
          </Box>
        )}
      </SectionCard>

      {titleGroups.map((group) => {
        const title = report.landTitles.find((entry) => entry.tctGroupId === group.id);
        if (!title) return null;
        return <LandTitlePreview key={group.id} title={title} tctNumber={group.tctNumber} />;
      })}

      <SectionCard label="Technical Specification">
        <FieldRow label="Present Use" value={report.presentUse} />
        <FieldRow label="Street Frontage (metres)" value={report.streetFrontage} />
        <FieldRow label="Street Width (metres)" value={report.streetWidth} />
        <FieldRow label="Surfacing (Concrete/Asphalt)" value={report.surfacing} />
        <FieldRow label="Average Depth" value={report.averageDepth} />
        <FieldRow label="Approx. Shape" value={report.approxShape} />
        <FieldRow label="Topography" value={report.topography} />
        <FieldRow label="Neighborhood (Res'l/Comm'l/Ind'l.)" value={report.neighborhood} />
      </SectionCard>

      <SectionCard label="Source or Kind of Utilities">
        <FieldRow label="Public Conveyance Line" value={report.utilityPublicConveyance} />
        <FieldRow label="Electricity" value={report.utilityElectricity} />
        <FieldRow label="Water" value={report.utilityWater} />
        <FieldRow label="Gas / Others" value={report.utilityGasOthers} />
      </SectionCard>

      <SectionCard label="Improvement">
        {report.improvements.map((improvement) => (
          <Box key={improvement.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}>
            <Stack spacing={1}>
              <FieldRow label="Year Constructed" value={improvement.yearConstructed} />
              <FieldRow label="Construction" value={improvement.construction} />
              <FieldRow label="Condition" value={improvement.condition} />
              <FieldRow label="Est. Floor Area (sq.m.)" value={improvement.estFloorArea} />
            </Stack>
          </Box>
        ))}
      </SectionCard>

      <NarrativeBlock label="General Construction Features" value={report.generalConstructionFeatures} />

      <SectionCard label="Particular Description">
        {report.particularDescriptions.map((particular) => (
          <Box key={particular.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}>
            <Stack spacing={1}>
              <FieldRow label="Floor Level" value={particular.floorLevel} />
              <FieldRow label="Interior Walls & Partitions" value={particular.interiorWallsPartitions} />
              <FieldRow label="Flooring" value={particular.flooring} />
              <FieldRow label="Doors & Windows" value={particular.doorsWindows} />
              <FieldRow label="Ceiling & Roofing" value={particular.ceilingRoofing} />
            </Stack>
          </Box>
        ))}
      </SectionCard>

      <SectionCard label="Basis of Valuation (Land)">
        {report.basisOfValuationComparables.map((comparable) => (
          <Box key={comparable.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}>
            <Stack spacing={1}>
              <FieldRow label="Source" value={comparable.source} />
              <FieldRow label="Location" value={comparable.location} />
              <FieldRow label="Area Size" value={comparable.areaSize} />
              <FieldRow label="Price Type" value={comparable.priceType} />
              <FieldRow label="Zonal Value" value={comparable.zonalValue} />
              <FieldRow label="Value" value={comparable.value} />
            </Stack>
          </Box>
        ))}
        <FieldRow label="Fair Market Value Per Square Meter" value={report.fairMarketValuePerSqm} />
        <FieldRow label="Fair Market Value Total (PHP)" value={report.fairMarketValueTotal} />
        <NarrativeBlock label="Valuation Remarks" value={report.valuationRemarks} />
      </SectionCard>

      <NarrativeBlock label="Remarks / Additional Information" value={report.remarksAdditionalInfo} />

      <SectionCard label="Conditions for Acceptance of Collateral">
        {report.conditionsForAcceptance.map((condition) => (
          <Box key={condition.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}>
            <Stack spacing={1}>
              <FieldRow label="Item of Property" value={condition.itemOfProperty} />
              <FieldRow label="Ref" value={condition.ref} />
              <FieldRow label="Marketable" value={condition.marketable} />
              <FieldRow label="Construction (%)" value={condition.constructionStatusPercent} />
              <FieldRow label="Depreciated Value" value={condition.depreciatedValue} />
              <FieldRow label="Appraised Value" value={condition.appraisedValue} />
            </Stack>
          </Box>
        ))}
      </SectionCard>

      <SectionCard label="Appraisal Summary">
        <FieldRow label="Appraised Value" value={report.appraisedValue} />
        <FieldRow label="Rounded Figures" value={report.roundedFigures} />
        <FieldRow label="Amount in Words" value={report.amountInWords} />
        <FieldRow label="Leasable Percent (%)" value={report.leasablePercent} />
        <FieldRow label="Leasable Amount (PHP)" value={report.leasableAmount} />
      </SectionCard>

      {report.feeAttachments.length > 0 && (
        <SectionCard label="Fee Attachment">
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
        </SectionCard>
      )}
    </Stack>
  );
}
