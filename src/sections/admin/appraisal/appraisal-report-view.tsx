'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

import type { AppraisalReportLandTitle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only rendering of a submitted in-house Appraisal Report
// (AppraiserAssignmentCard's form) — used by the Appraisal Officer's own
// "View Report" dialog (assigned-appraiser-card.tsx) and the Head/Approver's
// "My Approvals" detail page (appraisal-approver-bundle-view.tsx), both of
// which need to see what the appraiser actually submitted, not just a
// "submitted" boolean.
//
// Third rebuild of this view's layout, after two passes that tweaked
// spacing/weight without fixing the actual problem: a long, flat wall of
// small gray text. What was wrong, specifically: (1) each land title card
// stacked its photo above a field grid that only ever filled part of the
// row, leaving a large dead gap of empty white space beside the photo —
// this version puts the photo and its fields side-by-side in one row
// instead; (2) a `muted` treatment on "routine" fields (lighter weight,
// lighter gray) was meant to de-emphasize them but read as disabled/broken
// text rather than an intentional choice — removed entirely, every field
// now renders at the same normal, readable weight; (3) the page was long
// because every section rendered fully open at once — this version wraps
// every section AFTER Land (Technical Specification, Utilities,
// Construction Features, Basis of Valuation, Signatures) in the shared
// `CollapsibleSection` component (the same chevron+Collapse shell
// Document Checklist and Requirement Checklist already use elsewhere in
// this app), collapsed by default, so the page opens short — header,
// Appraised Value, Land — with the rest available a click away instead of
// a mandatory scroll. Land stays open by default since the pledged
// property details and photos are the actual substance of the review.
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
// on a hairline rule below, the way a filled-in printed form reads. Every
// field renders at the same normal weight — an earlier version muted
// "routine" fields to a lighter gray, which read as disabled/broken text
// rather than intentional hierarchy, so that distinction was removed.
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

// The hero — the one number this whole document exists to produce,
// surfaced immediately under the letterhead instead of only appearing
// after scrolling through every section to reach Valuation.
function AppraisedValueHero({ appraisedValue, amountInWords }: { appraisedValue: string; amountInWords: string }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1.5}
      sx={{ p: 2.25, borderRadius: '12px', bgcolor: TONE_COLORS.info.bg, mb: 3 }}
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

// Photo sits beside its fields in one row instead of stacked above a grid
// that only fills part of the row — the earlier stacked layout left a
// large empty gap next to the photo whenever there were fewer than 4
// fields on a line. A fixed-width photo column keeps every title's photo
// the same size regardless of how much text sits beside it.
function LandTitleSummary({ title, tctNumber }: { title: AppraisalReportLandTitle; tctNumber: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
        TCT No. {tctNumber}
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {title.photoFileUrl && (
          <Box
            component="a"
            href={title.photoFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'block',
              width: { xs: '100%', sm: 200 },
              flexShrink: 0,
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
              src={title.photoFileUrl}
              alt={`Collateral photo — TCT No. ${tctNumber}`}
              sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
            />
            <Stack
              className="exhibit-zoom"
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{
                position: 'absolute',
                inset: 0,
                justifyContent: 'center',
                bgcolor: 'rgba(20,23,42,0.4)',
                opacity: 0,
                transition: 'opacity 0.15s ease',
              }}
            >
              <Iconify icon="solar:magnifer-bold" width={18} sx={{ color: 'common.white' }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'common.white' }}>View full photo</Typography>
            </Stack>
          </Box>
        )}

        <Stack spacing={1.75} sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              columnGap: 2.5,
              rowGap: 1.75,
            }}
          >
            <Field label="Area Size (sq.m.)" value={title.areaSize} />
            <Field label="Zonal Value" value={title.zonalValue} />
            <Field label="Lot No." value={title.lotNo} />
            <Field label="Survey No." value={title.surveyNo} />
            <Field label="Book No. / Page No." value={title.bookPageNo} />
            <Field label="Title Registration Date" value={title.titleRegistrationDate} />
            <Field label="Title Registration Place" value={title.titleRegistrationPlace} span={2} />
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
        </Stack>
      </Stack>
    </Box>
  );
}

export function AppraisalReportView({ bundleId, tctNumbers }: { bundleId: string; tctNumbers: string[] }) {
  const { review } = useAdmin();
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);

  // Every section after Land is collapsed by default so the page opens
  // short — one shared expand state per section, keyed by section name.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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

      <AppraisedValueHero appraisedValue={report.appraisedValue} amountInWords={report.amountInWords} />

      <Stack spacing={3}>
        <FieldGrid>
          <Field label="Date Report" value={report.dateReport} />
          <Field label="Date Inspected" value={report.dateInspected} />
          <Field label="Requesting Officer" value={report.requestingOfficer} />
          <Field label="Branch" value={report.branch} />
        </FieldGrid>

        <Stack spacing={1.5}>
          <SectionLabel>Land</SectionLabel>
          <FieldGrid>
            <Field label="Registered Owner" value={report.registeredOwner} span={2} />
            <Field label="Location of Property" value={report.locationOfProperty} span={2} />
          </FieldGrid>
          <Stack spacing={1.5}>
            {titleGroups.map((group) => {
              const title = report.landTitles.find((entry) => entry.tctGroupId === group.id);
              if (!title) return null;
              return <LandTitleSummary key={group.id} title={title} tctNumber={group.tctNumber} />;
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
              <Field label="Telephone" value={report.utilityTelephone} />
            </FieldGrid>
          </CollapsibleSection>
        </Box>

        <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
          <CollapsibleSection
            title="Improvement — General Construction Features"
            expanded={!!expanded.construction}
            onToggle={() => toggle('construction')}
          >
            <Stack spacing={1.75}>
              <Field label="General Construction Features" value={report.generalConstructionFeatures} span={4} />
              <FieldGrid>
                <Field label="Floor Level" value={report.floorLevel} />
                <Field label="External Walls" value={report.externalWalls} />
                <Field label="Interior Walls & Partitions" value={report.interiorWallsPartitions} />
                <Field label="Flooring" value={report.flooring} />
                <Field label="Doors & Windows" value={report.doorsWindows} />
                <Field label="Ceiling & Roofing" value={report.ceilingRoofing} />
              </FieldGrid>
            </Stack>
          </CollapsibleSection>
        </Box>

        <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
          <CollapsibleSection
            title="Basis of Valuation (Land)"
            expanded={!!expanded.basis}
            onToggle={() => toggle('basis')}
          >
            <FieldGrid>
              <Field label="Fair Market Value as per square meter" value={report.fairMarketValuePerSqm} span={2} />
              <Field label="Selling Price" value={report.basisSellingPrice} />
              <Field label="Area Size" value={report.basisAreaSize} />
              <Field label="Source" value={report.basisSource} />
              <Field label="Location" value={report.basisLocation} />
              <Field label="Price Type" value={report.basisPriceType} />
            </FieldGrid>
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

        <Stack spacing={1.5}>
          <SectionLabel>Valuation</SectionLabel>
          <FieldGrid>
            <Field label="Loanable Amount" value={report.loanableAmount} span={2} />
            <Field label="Rounded Figures" value={report.roundedFigures} />
            <Field label="Appraised Value (P)" value={report.appraisedValueP} />
          </FieldGrid>
          <FieldGrid>
            <Field label="Item of Property" value={report.itemOfProperty} span={2} />
            <Field label="FMV / RCN (PHP)" value={report.fmvRcn} />
            <Field label="Construction Status %" value={report.constructionStatusPercent} />
            <Field label="Depreciated Value" value={report.depreciatedValue} span={4} />
          </FieldGrid>
        </Stack>

        <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3' }}>
          <CollapsibleSection
            title="Prepared / Reviewed / Endorsed / Noted By"
            expanded={!!expanded.signoff}
            onToggle={() => toggle('signoff')}
          >
            <FieldGrid>
              <Field label="Prepared by" value={report.preparedBy} />
              <Field label="Reviewed by" value={report.reviewedBy} />
              <Field label="Endorsed by" value={report.endorsedBy} />
              <Field label="Noted by" value={report.notedBy} />
            </FieldGrid>
          </CollapsibleSection>
        </Box>

        {report.recommendation && (
          <Stack spacing={1.5}>
            <SectionLabel>Recommendation</SectionLabel>
            <Typography sx={{ fontSize: 13.5, color: '#3B4256', whiteSpace: 'pre-wrap' }}>
              {report.recommendation}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
