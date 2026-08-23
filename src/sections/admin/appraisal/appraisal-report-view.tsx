'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';

import type { AppraisalReportLandTitle } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Read-only rendering of a submitted in-house Appraisal Report
// (AppraiserAssignmentCard's form) — used by the Appraisal Officer's own
// "View Report" dialog (assigned-appraiser-card.tsx) and the Head/Approver's
// "My Approvals" detail page (appraisal-approver-bundle-view.tsx), both of
// which need to see what the appraiser actually submitted, not just a
// "submitted" boolean.
//
// Reads like the printed Appraisal Report (REM) document — a centered
// title, small-caps section labels with a full-width rule beneath each
// (SectionLabel), and every value sitting on its own hairline field rule
// instead of floating in a loose paragraph — while still built entirely
// from this app's own tokens (`adminCardSx`'s 16px/#EBEDF3 card shell,
// `TONE_COLORS.info` for the one navy accent, the same 10-12px inner
// radii `LandTitleFields`/`FactChip` use elsewhere), not a one-off visual
// language. (Two earlier versions overshot this: the first was
// indistinguishable from any other rounded app card — functionally
// read-only but with no sense that this is a formal document people sign
// off on; the second corrected that but went too far the other way —
// sharp 4-6px corners, a monospace font nothing else in the app uses, and
// hand-picked ink/border hex values instead of this app's own
// palette — which read as a foreign component bolted onto the page
// rather than this app's own take on a document layout. This version
// keeps the document *structure* — letterhead title, field rules, section
// rules — but renders it with the app's actual card chrome and colors.)
//
// Visual hierarchy pass: this is a long document (a full REM has ~15
// sections plus one land-title card per pledged property), and a flat
// wall of equally-weighted label/value pairs made every field compete for
// the same amount of attention regardless of whether it's the number a
// reviewer is scanning for or routine boilerplate. Fixes: (1) the
// Appraised Value — the one figure everyone reads this document for —
// now ALSO appears as a hero right under the letterhead
// (`AppraisedValueHero`), not only buried at the end of the Valuation
// section (which still keeps its own full copy for completeness/audit,
// since that section's the literal source of truth); (2) `Field` takes an
// optional `muted` flag that renders routine, rarely-differentiating
// per-title paperwork (Survey No., Book/Page No., Boundaries, Technical
// Specification — the same values across every TCT in this sample data)
// at a visibly lower weight than figures that actually move the appraisal
// (Zonal Value, Area Size, the owner/location identity fields up top),
// instead of every field defaulting to the same 600-weight dark text
// regardless of how load-bearing it is.
// External appraiser bundles instead show the uploaded file for download.
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
// `muted` lowers a routine/boilerplate value's weight (regular instead of
// 600, lighter ink) so it visually recedes next to the figures that
// actually matter to a reviewer — see the header comment's "Visual
// hierarchy pass" note.
function Field({
  label,
  value,
  span = 1,
  muted = false,
}: {
  label: string;
  value: string;
  span?: number;
  muted?: boolean;
}) {
  if (!value) return null;
  return (
    <Box sx={{ minWidth: 0, gridColumn: `span ${span}` }}>
      <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>{label}</Typography>
      <Typography
        sx={{
          mt: 0.25,
          pb: 0.6,
          fontSize: 13.5,
          fontWeight: muted ? 500 : 600,
          color: muted ? '#5A6273' : '#14172A',
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
// after scrolling through ~15 sections to reach Valuation. Visually
// identical to the tinted callout the Valuation section keeps further
// down (same TONE_COLORS.info treatment, same icon-avatar shape) — this
// is a second appearance of the same figure, not a competing style.
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

function LandTitleSummary({ title, tctNumber }: { title: AppraisalReportLandTitle; tctNumber: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: '10px', border: '1px solid #EBEDF3', bgcolor: '#FAFBFD' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
        TCT No. {tctNumber}
      </Typography>

      {title.photoFileUrl && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11.5, color: '#8891A6', mb: 0.75 }}>Collateral Photo</Typography>
          <Box
            component="a"
            href={title.photoFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'block',
              width: '100%',
              maxWidth: 320,
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
        </Box>
      )}

      <FieldGrid>
        <Field label="Area Size (sq.m.)" value={title.areaSize} />
        <Field label="Zonal Value" value={title.zonalValue} />
        <Field label="Lot No." value={title.lotNo} muted />
        <Field label="Survey No." value={title.surveyNo} muted />
        <Field label="Book No. / Page No." value={title.bookPageNo} muted />
        <Field label="Title Registration Date" value={title.titleRegistrationDate} muted />
        <Field label="Title Registration Place" value={title.titleRegistrationPlace} muted span={2} />
      </FieldGrid>

      {(title.boundaries || title.technicalSpecification) && (
        <Stack spacing={1.25} sx={{ mt: 1.75 }}>
          {title.boundaries && (
            <Box>
              <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Boundaries</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#8891A6', whiteSpace: 'pre-wrap', mt: 0.25 }}>
                {title.boundaries}
              </Typography>
            </Box>
          )}
          {title.technicalSpecification && (
            <Box>
              <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Technical Specification</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#8891A6', whiteSpace: 'pre-wrap', mt: 0.25 }}>
                {title.technicalSpecification}
              </Typography>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}

export function AppraisalReportView({ bundleId, tctNumbers }: { bundleId: string; tctNumbers: string[] }) {
  const { review } = useAdmin();
  const bundle = review.appraisal.reportBundles.find((entry) => entry.id === bundleId);
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
          <Field label="Date Report" value={report.dateReport} muted />
          <Field label="Date Inspected" value={report.dateInspected} muted />
          <Field label="Requesting Officer" value={report.requestingOfficer} muted />
          <Field label="Branch" value={report.branch} muted />
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

        <Stack spacing={1.5}>
          <SectionLabel>Technical specification</SectionLabel>
          <FieldGrid>
            <Field label="Highest and Best Use" value={report.highestAndBestUse} span={2} />
            <Field label="Present Use" value={report.presentUse} span={2} />
            <Field label="Street Frontage (metres)" value={report.streetFrontage} muted />
            <Field label="Street Width (metres)" value={report.streetWidth} muted />
            <Field label="Surfacing (Concrete/Asphalt)" value={report.surfacing} muted />
            <Field label="Average Depth" value={report.averageDepth} muted />
            <Field label="Approx. Shape" value={report.approxShape} muted />
            <Field label="Topography" value={report.topography} muted />
            <Field label="Neighborhood (Res'l/Comm'l/Ind'l.)" value={report.neighborhood} muted />
          </FieldGrid>
        </Stack>

        <Stack spacing={1.5}>
          <SectionLabel>Source or kind of utilities</SectionLabel>
          <FieldGrid>
            <Field label="Public Conveyance Line" value={report.utilityPublicConveyance} muted />
            <Field label="Electricity" value={report.utilityElectricity} muted />
            <Field label="Water" value={report.utilityWater} muted />
            <Field label="Telephone" value={report.utilityTelephone} muted />
          </FieldGrid>
        </Stack>

        <Stack spacing={1.5}>
          <SectionLabel>Improvement — general construction features</SectionLabel>
          <Field label="General Construction Features" value={report.generalConstructionFeatures} span={4} />
          <FieldGrid>
            <Field label="Floor Level" value={report.floorLevel} muted />
            <Field label="External Walls" value={report.externalWalls} muted />
            <Field label="Interior Walls & Partitions" value={report.interiorWallsPartitions} muted />
            <Field label="Flooring" value={report.flooring} muted />
            <Field label="Doors & Windows" value={report.doorsWindows} muted />
            <Field label="Ceiling & Roofing" value={report.ceilingRoofing} muted />
          </FieldGrid>
        </Stack>

        <Stack spacing={1.5}>
          <SectionLabel>Basis of valuation (land)</SectionLabel>
          <FieldGrid>
            <Field label="Fair Market Value as per square meter" value={report.fairMarketValuePerSqm} span={2} />
            <Field label="Selling Price" value={report.basisSellingPrice} />
            <Field label="Area Size" value={report.basisAreaSize} muted />
            <Field label="Source" value={report.basisSource} muted />
            <Field label="Location" value={report.basisLocation} muted />
            <Field label="Price Type" value={report.basisPriceType} muted />
          </FieldGrid>
        </Stack>

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
            <Field label="Item of Property" value={report.itemOfProperty} span={2} muted />
            <Field label="FMV / RCN (PHP)" value={report.fmvRcn} muted />
            <Field label="Construction Status %" value={report.constructionStatusPercent} muted />
            <Field label="Depreciated Value" value={report.depreciatedValue} muted span={4} />
          </FieldGrid>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EEF0F5' }}
          >
            <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
              This figure carries through as the report&apos;s Appraised Value, shown above.
            </Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1C2A6E', flexShrink: 0 }}>
              {fCurrency(report.appraisedValue)}
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={1.5}>
          <SectionLabel>Prepared / reviewed / endorsed / noted by</SectionLabel>
          <FieldGrid>
            <Field label="Prepared by" value={report.preparedBy} />
            <Field label="Reviewed by" value={report.reviewedBy} />
            <Field label="Endorsed by" value={report.endorsedBy} />
            <Field label="Noted by" value={report.notedBy} />
          </FieldGrid>
        </Stack>

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
